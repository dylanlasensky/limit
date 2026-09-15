import { bodyInputErrors } from "@/lib/profile-inputs";
import { WEEKDAYS } from "@/lib/training/programEngine";

// Never send a stale copy of server-owned metadata/locks with a settings edit.
const profileFields = new Set([
  "name",
  "birthDate",
  "sex",
  "heightCm",
  "heightFeet",
  "heightInches",
  "currentWeight",
  "goalWeight",
  "activityLevel",
  "fitnessGoal",
  "experienceLevel",
  "trainingDays",
  "availableDays",
  "sessionLength",
  "priorityMuscles",
  "equipment",
  "workoutSplit",
  "calorieTarget",
  "proteinTarget",
  "carbTarget",
  "fatTarget",
  "targetsCustomized",
  "targetExplanation",
  "measurementSystemVersion",
  "units",
  "onboardingComplete",
]);
export function profilePayload(profile: Record<string, any>) {
  const result = Object.fromEntries(
    Object.entries(profile).filter(([key]) => profileFields.has(key))
  );
  const errors = bodyInputErrors(result);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  result.name = result.name.trim();
  if (result.goalWeight === "") result.goalWeight = +result.currentWeight;
  const days = result.availableDays?.length
    ? result.availableDays
    : (result.trainingDays ?? result.availableDays);
  if (days != null) {
    if (
      !Array.isArray(days) ||
      days.length < 2 ||
      days.length > 6 ||
      new Set(days).size !== days.length ||
      days.some((day) => !WEEKDAYS.includes(day))
    )
      throw new Error("Choose between 2 and 6 different training days.");
    result.availableDays = WEEKDAYS.filter((day) => days.includes(day));
    result.trainingDays = result.availableDays;
  }
  if (Array.isArray(result.equipment) && !result.equipment.length)
    throw new Error(
      "Choose your available equipment, including Bodyweight if you train without equipment."
    );
  for (const key of ["calorieTarget", "proteinTarget", "carbTarget", "fatTarget"]) {
    if (
      result[key] != null &&
      (!Number.isFinite(+result[key]) || +result[key] < 0 || +result[key] > 10000)
    ) {
      throw new Error("Nutrition targets must be valid, non-negative numbers.");
    }
  }
  for (const key of [
    "currentWeight",
    "goalWeight",
    "heightFeet",
    "heightInches",
    "heightCm",
    "sessionLength",
    "calorieTarget",
    "proteinTarget",
    "carbTarget",
    "fatTarget",
  ]) {
    if (result[key] != null) result[key] = Number(result[key]);
  }
  return result;
}
