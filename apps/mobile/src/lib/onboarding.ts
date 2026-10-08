import { enrichExercise, readExercisePages } from "../../../../packages/domain/exerciseLibrary.js";
import {
  buildDayExercises,
  routineCoverageNote,
  sessionMinutes,
} from "../../../../packages/domain/personalizedRoutine";
import {
  orderedTrainingDays,
  scoreProgramStructures,
  WEEKDAYS,
} from "../../../../packages/domain/programEngine";
import { bulkCreate, command, create, list, update } from "./api";

export interface OnboardingAnswers {
  name: string;
  fitnessGoal: string;
  experienceLevel: "beginner" | "intermediate" | "advanced";
  sessionLength: number;
  equipment: string[];
  availableDays: string[];
}

export function validateAnswers(answers: OnboardingAnswers): string | null {
  if (!answers.name.trim() || answers.name.trim().length > 100) return "Enter your name.";
  if (!answers.fitnessGoal) return "Choose a training goal.";
  if (![30, 45, 60, 75, 90].includes(answers.sessionLength)) return "Choose a session length.";
  if (!answers.equipment.length) return "Choose available equipment.";
  if (
    answers.availableDays.length < 2 ||
    answers.availableDays.length > 6 ||
    new Set(answers.availableDays).size !== answers.availableDays.length ||
    answers.availableDays.some((day) => !WEEKDAYS.includes(day))
  )
    return "Choose 2–6 different training days.";
  return null;
}

// Save a complete inactive program, then let the serialized workout command activate it.
// A failed write leaves the current active program intact and can be retried.
export async function finishNativeOnboarding(answers: OnboardingAnswers, ownerId: string) {
  const invalid = validateAnswers(answers);
  if (invalid) throw new Error(invalid);
  const active = await list("WorkoutSession", { status: "active" }, { limit: 1 });
  if (active.length)
    throw new Error("Finish or discard your active workout before changing plans.");
  const chosen = orderedTrainingDays(answers);
  const recommendation = scoreProgramStructures(answers).best;
  const profile = {
    name: answers.name.trim(),
    fitnessGoal: answers.fitnessGoal,
    experienceLevel: answers.experienceLevel,
    sessionLength: answers.sessionLength,
    equipment: answers.equipment,
    availableDays: answers.availableDays,
    trainingDays: answers.availableDays,
    priorityMuscles: [],
    workoutSplit: recommendation.name,
    units: "imperial" as const,
    measurementSystemVersion: "us_v1",
    onboardingComplete: false,
  };
  const profiles = await list("UserProfile");
  if (profiles.some((row) => row.ownerId !== ownerId))
    throw new Error("Could not verify profile ownership.");
  const saved = profiles[0]
    ? await update("UserProfile", profiles[0].id, profile)
    : await create("UserProfile", profile);
  const exerciseRows = await readExercisePages({
    list: (sort: string, limit: number, skip: number) =>
      list("Exercise", {}, { sort, limit, skip }),
  });
  const exercises = exerciseRows.map(enrichExercise).sort((a, b) => a.name.localeCompare(b.name));
  const templates = recommendation.dayNames.map((name) =>
    buildDayExercises(name, answers, exercises)
  );
  if (templates.length !== chosen.length || templates.some((rows) => !rows.length))
    throw new Error(
      "No suitable exercises were found for this equipment. Change your choices and retry."
    );
  const plan = await create("WorkoutPlan", {
    name: recommendation.name,
    description: [
      recommendation.why,
      routineCoverageNote(templates),
      "A personalized starting plan. Times include estimated warm-ups and rests.",
    ]
      .filter(Boolean)
      .join(" "),
    goal: answers.fitnessGoal,
    daysPerWeek: chosen.length,
    programType: recommendation.key,
    sessionDurationTarget: sessionMinutes(answers),
    priorityMuscles: [],
    recommended: true,
    active: false,
  });
  const days = WEEKDAYS.map((_, weekday) => {
    const index = chosen.indexOf(weekday);
    return {
      planId: plan.id,
      weekday,
      name: index < 0 ? "Rest" : recommendation.dayNames[index],
      targetMuscles:
        index < 0 ? [] : [...new Set(templates[index].map((row) => row.primaryMuscle))],
      isRest: index < 0,
    };
  });
  const savedDays = await bulkCreate("WorkoutDay", days);
  if (
    savedDays.length !== 7 ||
    savedDays.some((day) => day.ownerId !== ownerId || day.planId !== plan.id) ||
    new Set(savedDays.map((day) => day.weekday)).size !== 7
  )
    throw new Error("The program did not finish saving. Your old plan is still available. Retry.");
  const rows = savedDays.flatMap((day) =>
    day.isRest
      ? []
      : templates[chosen.indexOf(day.weekday)].map((row) => ({ ...row, workoutDayId: day.id }))
  );
  const savedRows = await bulkCreate("WorkoutExercise", rows);
  if (
    savedRows.length !== rows.length ||
    savedRows.some(
      (row) => row.ownerId !== ownerId || !savedDays.some((day) => day.id === row.workoutDayId)
    )
  )
    throw new Error("The program did not finish saving. Your old plan is still available. Retry.");
  const result = await command({ action: "activatePlan", planId: plan.id });
  if (result.plan.id !== plan.id || !result.plan.active)
    throw new Error("The program did not activate. Retry.");
  await update("UserProfile", saved.id, { onboardingComplete: true });
  return result.plan;
}
