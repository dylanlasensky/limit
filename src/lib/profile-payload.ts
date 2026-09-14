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
  if (!result.name?.trim()) throw new Error("Add your name before saving.");
  for (const key of ["currentWeight", "goalWeight"]) {
    if (
      result[key] != null &&
      (!Number.isFinite(+result[key]) || +result[key] <= 0 || +result[key] > 1500)
    ) {
      throw new Error("Weight must be above 0 and up to 1,500 lb.");
    }
  }
  if (
    !Number.isInteger(+result.heightFeet) ||
    +result.heightFeet < 3 ||
    +result.heightFeet > 8 ||
    !Number.isInteger(+result.heightInches) ||
    +result.heightInches < 0 ||
    +result.heightInches > 11
  ) {
    throw new Error("Check your height: use 3–8 feet and 0–11 inches.");
  }
  for (const key of ["calorieTarget", "proteinTarget", "carbTarget", "fatTarget"]) {
    if (
      result[key] != null &&
      (!Number.isFinite(+result[key]) || +result[key] < 0 || +result[key] > 10000)
    ) {
      throw new Error("Nutrition targets must be valid, non-negative numbers.");
    }
  }
  return result;
}
