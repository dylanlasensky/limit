import { ageFromBirthDate } from "@/lib/profile-inputs";

export interface NutritionProfileInput {
  weightLb?: number | string;
  measurementSystemVersion?: string;
  currentWeight?: number | string;
  goalWeight?: number | string;
  heightFeet?: number | string;
  heightInches?: number | string;
  heightCm?: number | string;
  birthDate?: string;
  days?: number | string;
  trainingDays?: string[];
  sex?: string;
  activityLevel?: string;
  fitnessGoal?: string;
  [key: string]: any;
}

export interface NutritionTargets {
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  targetExplanation: string;
}

const round = (value: number, step = 5) => Math.round(value / step) * step;
export const profileWeightLb = (p: NutritionProfileInput): number => {
  if (Number(p.weightLb)) return Number(p.weightLb);
  if (p.measurementSystemVersion === "us_v1") return Number(p.currentWeight) || 0;
  return (Number(p.currentWeight) || 0) * 2.20462;
};
export const profileHeightInches = (p: NutritionProfileInput): number =>
  (Number(p.heightFeet) || 0) * 12 + (Number(p.heightInches) || 0) ||
  (Number(p.heightCm) || 0) / 2.54;
export const profileAge = (p: NutritionProfileInput): number | null =>
  ageFromBirthDate(p.birthDate);
export const toUSProfile = <T extends NutritionProfileInput>(p: T) => {
  const inches = Math.round(profileHeightInches(p)),
    weight = profileWeightLb(p),
    legacy = p.measurementSystemVersion !== "us_v1";
  const goal = legacy ? (Number(p.goalWeight) || 0) * 2.20462 : Number(p.goalWeight) || 0;
  return {
    ...p,
    units: "imperial",
    measurementSystemVersion: "us_v1",
    heightFeet: Math.floor(inches / 12),
    heightInches: inches % 12,
    currentWeight: Math.round(weight * 10) / 10,
    goalWeight: goal === 0 ? "" : Math.round(goal * 10) / 10,
  };
};
export const calcTargets = (p: NutritionProfileInput): NutritionTargets => {
  const age = profileAge(p);
  if (age === null || age < 18)
    return {
      calorieTarget: 0,
      proteinTarget: 0,
      carbTarget: 0,
      fatTarget: 0,
      targetExplanation:
        age === null
          ? "Add a valid date of birth to calculate an adult nutrition estimate. You can log food without a target."
          : "Automatic nutrition estimates are for adults. If you are under 18, ask a qualified health professional about nutrition goals. You can log food without a target.",
    };
  const weightLb = Math.max(90, profileWeightLb(p) || 165),
    heightIn = Math.max(48, profileHeightInches(p) || 68),
    days = Number(p.days) || p.trainingDays?.length || 3,
    kg = weightLb / 2.20462,
    cm = heightIn * 2.54;
  const sexOffset = p.sex === "male" ? 5 : p.sex === "female" ? -161 : -78;
  const bmr = 10 * kg + 6.25 * cm - 5 * age + sexOffset;
  const base =
    ({ low: 1.2, moderate: 1.4, high: 1.6 } as Record<string, number>)[p.activityLevel as string] ||
    1.4;
  const activity = Math.min(1.75, base + Math.min(days, 6) * 0.025);
  const goal = (p.fitnessGoal || "maintain weight").toLowerCase();
  const adjustment = goal.includes("gain")
    ? 250
    : goal.includes("lose") || goal.includes("fat")
      ? -350
      : goal.includes("strength")
        ? 150
        : 0;
  const floor = p.sex === "female" ? 1200 : 1500;
  const calories = round(Math.max(floor, bmr * activity + adjustment), 10);
  let proteinFactor = goal.includes("lose")
    ? 1
    : goal.includes("gain") || goal.includes("strength")
      ? 0.9
      : 0.8;
  if (days >= 4) proteinFactor += 0.05;
  const protein = round(weightLb * proteinFactor, 5);
  const fat = round(Math.max(weightLb * 0.3, (calories * 0.25) / 9), 5);
  const carbs = round(Math.max(75, (calories - protein * 4 - fat * 9) / 4), 5);
  const finalCalories = protein * 4 + carbs * 4 + fat * 9;
  const goalText = goal.includes("gain")
    ? "gaining muscle"
    : goal.includes("lose") || goal.includes("fat")
      ? "losing fat"
      : goal.includes("strength")
        ? "building strength"
        : "maintaining your weight";
  return {
    calorieTarget: round(finalCalories, 10),
    proteinTarget: protein,
    carbTarget: carbs,
    fatTarget: fat,
    targetExplanation: `Based on your current weight, activity, training schedule, and goal of ${goalText}. This is an estimate.`,
  };
};
