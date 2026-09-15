import { base44 } from "@/api/base44Client";
import { listExercises } from "@/lib/training/exerciseLibrary";
import {
  scoreProgramStructures,
  slotsFor,
  targetMusclesFor,
  scheme,
  goalKey,
  exerciseBudget,
  WEEKDAYS,
  type ProgramOption,
} from "@/lib/training/programEngine";
import { selectExercise, equipmentPool } from "@/lib/training/exerciseSelection";

export interface DayExercise {
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
}

export const buildDayExercises = (
  dayName: string,
  profile: any,
  exercises: any[]
): DayExercise[] => {
  const goal = goalKey(profile.fitnessGoal),
    allowed = equipmentPool(profile),
    used = new Set<string>(),
    out: DayExercise[] = [];
  const budget = exerciseBudget(profile.sessionLength);
  const variant = /\bB\b|Hypertrophy/.test(dayName) ? 1 : 0;
  for (const slot of slotsFor(dayName, profile)) {
    if (out.length >= budget) break;
    const ex = selectExercise(
      slot,
      exercises,
      used,
      allowed,
      slot.role === "main" || slot.role === "main_strength" ? 0 : variant,
      profile.experienceLevel || "beginner"
    );
    if (!ex) continue;
    used.add(ex.id);
    const s = scheme(goal, slot.role, profile.experienceLevel || "beginner");
    out.push({
      exerciseId: ex.id,
      exerciseName: ex.name,
      order: out.length + 1,
      sets: s.sets,
      repMin: s.repMin,
      repMax: s.repMax,
      restSeconds: s.rest,
    });
  }
  return out;
};

export const estimateMinutes = (workoutExercises: any[]): number =>
  Math.round(
    workoutExercises.reduce((a, x) => a + (x.sets || 3) * ((x.restSeconds || 120) + 45), 0) / 60
  ) + 6;

// Build inactive, validate the entire graph, then activate on the server.
export async function createPersonalizedPlan(profile: any, recommendation?: ProgramOption | null) {
  const sessions = await base44.entities.WorkoutSession.filter(
    { status: "active" },
    "-created_date",
    1
  );
  if (sessions.length)
    throw new Error("Finish or discard your active workout before changing programs.");
  const exercises = await listExercises();
  const rec: ProgramOption = recommendation || scoreProgramStructures(profile).best;
  const templates = rec.dayNames.map((name) => buildDayExercises(name, profile, exercises));
  if (!templates.length || templates.some((rows) => !rows.length)) {
    throw new Error(
      "No suitable exercises were found for your equipment. Your current program hasn’t changed."
    );
  }
  const plan = await base44.entities.WorkoutPlan.create({
    name: rec.name,
    description: rec.why,
    goal: profile.fitnessGoal,
    daysPerWeek: rec.dayNames.length,
    programType: rec.key,
    sessionDurationTarget: +profile.sessionLength || 60,
    priorityMuscles: profile.priorityMuscles || [],
    recommended: true,
    active: false,
  });
  const chosen = [
    ...new Set<number>(
      (profile.availableDays?.length
        ? profile.availableDays
        : WEEKDAYS.slice(0, rec.dayNames.length)
      )
        .map((d: string) => WEEKDAYS.indexOf(d))
        .filter((i: number) => i >= 0)
    ),
  ]
    .sort((a: number, b: number) => a - b)
    .slice(0, rec.dayNames.length);
  while (chosen.length < rec.dayNames.length) {
    chosen.push(WEEKDAYS.findIndex((_, i) => !chosen.includes(i)));
    chosen.sort((a, b) => a - b);
  }
  const dayRecords = Array.from({ length: 7 }, (_, weekday) => {
    const idx = chosen.indexOf(weekday);
    const name = idx >= 0 ? rec.dayNames[idx] : "Rest";
    return {
      planId: plan.id,
      weekday,
      name,
      targetMuscles: idx >= 0 ? targetMusclesFor(name) : [],
      isRest: idx < 0,
    };
  });
  const createdDays = await base44.entities.WorkoutDay.bulkCreate(dayRecords);
  const workoutExercises = createdDays.flatMap((day: any) =>
    day.isRest
      ? []
      : buildDayExercises(day.name, profile, exercises).map((x) => ({ ...x, workoutDayId: day.id }))
  );
  if (createdDays.length !== 7 || !workoutExercises.length)
    throw new Error("The program did not finish saving. Your previous plan is still available.");
  const savedRows = await base44.entities.WorkoutExercise.bulkCreate(workoutExercises);
  if (savedRows.length !== workoutExercises.length)
    throw new Error("Some exercises did not save. Your previous plan is still available.");
  const { data } = await base44.functions.invoke("workoutCommand", {
    action: "activatePlan",
    planId: plan.id,
  });
  return data.plan;
}
