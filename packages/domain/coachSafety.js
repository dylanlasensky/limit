// Only an age band leaves the app; never include a raw date of birth in AI context.
export function adultNutritionAvailable(birthDate, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate || "") || !/^\d{4}-\d{2}-\d{2}$/.test(today || ""))
    return false;
  const born = new Date(`${birthDate}T12:00:00Z`);
  if (
    !Number.isFinite(born.getTime()) ||
    born.toISOString().slice(0, 10) !== birthDate ||
    birthDate > today
  )
    return false;
  const age =
    Number(today.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    (today.slice(5) < birthDate.slice(5) ? 1 : 0);
  return age >= 18 && age <= 120;
}

export const COACH_NUTRITION_SAFETY =
  "Never prescribe calorie targets, macro targets, weight-loss diets, fasting, or weight-change goals. Only describe logged nutrition and existing targets when adultNutritionAvailable is true. When it is false, do not analyze calorie totals, targets, body weight or weight change; offer general supportive training and food-logging guidance and refer nutrition planning to a qualified professional. Even for adults, logged numbers are estimates, not medical recommendations.";
