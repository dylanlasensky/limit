import { base44 } from "@/api/base44Client";
import { listExercises } from "@/lib/training/exerciseLibrary";
import {
  scoreProgramStructures,
  orderedTrainingDays,
  WEEKDAYS,
  type ProgramOption,
} from "@/lib/training/programEngine";
import {
  buildDayExercises,
  routineCoverageNote,
  sessionMinutes,
} from "@/lib/training/personalizedRoutine";
export {
  buildDayExercises,
  estimateMinutes,
  type DayExercise,
} from "@/lib/training/personalizedRoutine";

const incomplete = () =>
  new Error(
    "The program did not finish saving. Your previous plan is still available. Please try again."
  );

// Build inactive, validate the entire graph, then activate on the server.
export async function createPersonalizedPlan(profile: any, recommendation?: ProgramOption | null) {
  const explicitDays = profile.availableDays?.length ? profile.availableDays : profile.trainingDays;
  if (
    explicitDays &&
    (!Array.isArray(explicitDays) ||
      explicitDays.some((day: string) => !WEEKDAYS.includes(day)) ||
      new Set(explicitDays).size < 2 ||
      new Set(explicitDays).size > 6)
  )
    throw new Error("Choose 2–6 training days in Profile before building your program.");
  const chosen = orderedTrainingDays(profile);
  const input = { ...profile, days: chosen.length, availableDays: chosen.map((i) => WEEKDAYS[i]) };
  const sessions = await base44.entities.WorkoutSession.filter(
    { status: "active" },
    "-created_date",
    1
  );
  if (sessions.length)
    throw new Error("Finish or discard your active workout before changing programs.");
  const exercises = await listExercises();
  const scored = scoreProgramStructures(input);
  // Recompute every option against current answers; never persist stale day
  // names or durations from an earlier preview or previous profile.
  const rec = scored.options.find((option) => option.key === recommendation?.key) || scored.best;
  const templates = rec.dayNames.map((name) => buildDayExercises(name, input, exercises));
  if (templates.length !== chosen.length || templates.some((rows) => !rows.length))
    throw new Error(
      "No suitable exercises were found for this split and equipment. Your current program hasn’t changed. Update your equipment in Profile and try again."
    );
  const plan = await base44.entities.WorkoutPlan.create({
    name: rec.name,
    description: [
      rec.why,
      routineCoverageNote(templates),
      "A personalized starting plan. Session times include estimated warm-ups and rests; adjust for your pace and recovery.",
    ]
      .filter(Boolean)
      .join(" "),
    goal: profile.fitnessGoal,
    daysPerWeek: rec.dayNames.length,
    programType: rec.key,
    sessionDurationTarget: sessionMinutes(input),
    priorityMuscles: profile.priorityMuscles || [],
    recommended: true,
    active: false,
  });
  if (!plan?.id) throw incomplete();
  const dayRecords = WEEKDAYS.map((_, weekday) => {
    const idx = chosen.indexOf(weekday);
    return {
      planId: plan.id,
      weekday,
      name: idx >= 0 ? rec.dayNames[idx] : "Rest",
      targetMuscles: idx >= 0 ? [...new Set(templates[idx].map((row) => row.primaryMuscle))] : [],
      isRest: idx < 0,
    };
  });
  const createdDays = await base44.entities.WorkoutDay.bulkCreate(dayRecords);
  if (
    !Array.isArray(createdDays) ||
    createdDays.length !== 7 ||
    new Set(createdDays.map((day) => day.id)).size !== 7 ||
    new Set(createdDays.map((day) => day.weekday)).size !== 7 ||
    createdDays.some((day) => {
      const expected = dayRecords[day.weekday];
      return (
        !day.id ||
        !Number.isInteger(day.weekday) ||
        !expected ||
        day.planId !== plan.id ||
        day.name !== expected.name ||
        day.isRest !== expected.isRest ||
        JSON.stringify(day.targetMuscles) !== JSON.stringify(expected.targetMuscles)
      );
    })
  )
    throw incomplete();
  // Reuse the exact templates already checked, regardless of API return order.
  const workoutExercises = createdDays.flatMap((day: any) =>
    day.isRest
      ? []
      : templates[chosen.indexOf(day.weekday)].map((row) => ({ ...row, workoutDayId: day.id }))
  );
  const savedRows = await base44.entities.WorkoutExercise.bulkCreate(workoutExercises);
  const key = (row: any) => `${row.workoutDayId}:${row.order}`;
  const expectedRows = new Map(workoutExercises.map((row) => [key(row), row]));
  if (
    !Array.isArray(savedRows) ||
    savedRows.length !== workoutExercises.length ||
    new Set(savedRows.map((row) => row.id)).size !== savedRows.length ||
    new Set(savedRows.map(key)).size !== savedRows.length ||
    savedRows.some((row) => {
      const expected = expectedRows.get(key(row));
      return (
        !row.id ||
        !expected ||
        [
          "exerciseId",
          "exerciseName",
          "primaryMuscle",
          "category",
          "equipment",
          "notes",
          "progressionNotes",
          "sets",
          "repMin",
          "repMax",
          "restSeconds",
        ].some((field) => row[field] !== expected[field])
      );
    })
  )
    throw incomplete();
  const { data } = await base44.functions.invoke("workoutCommand", {
    action: "activatePlan",
    planId: plan.id,
  });
  if (data?.plan?.id !== plan.id || data.plan.active !== true) throw incomplete();
  return data.plan;
}
