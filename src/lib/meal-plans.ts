import { addDays, format } from "date-fns";
import { base44 } from "@/api/base44Client";
import {
  safeMeals,
  sumMacros,
  weekStart,
  type DietaryProfile,
  type PlannedMeal,
} from "@/components/limit/data";

export async function loadSavedMealWeek(diet: DietaryProfile) {
  const start = weekStart();
  const plans = await base44.entities.WeeklyMealPlan.filter(
    { weekStart: format(start, "yyyy-MM-dd") },
    "-created_date",
    1
  );
  const plan = plans[0];
  if (!plan) return null;
  const ids = plan.mealIds || [];
  const meals = ids.length
    ? await base44.entities.MealRecommendation.filter({ id: { $in: ids } }, "generatedForDate", 100)
    : [];
  if (meals.length !== new Set(ids).size) throw new Error("Some saved meals could not be loaded.");
  // Previously saved suggestions must still respect the CURRENT exclusions.
  const allowed = new Set(safeMeals(diet).map((meal) => meal.name));
  const week: PlannedMeal[][] = Array.from({ length: 7 }, (_, index) => {
    const date = format(addDays(start, index), "yyyy-MM-dd");
    return meals
      .filter((meal) => meal.generatedForDate === date && allowed.has(meal.name))
      .map((meal) => ({ ...meal, key: meal.id }) as PlannedMeal);
  });
  return { id: plan.id, week };
}

export async function saveMealWeek(week: PlannedMeal[][], existingId?: string) {
  const fields = new Set([
    "name",
    "mealType",
    "ingredients",
    "servingSize",
    "servings",
    "calories",
    "protein",
    "carbs",
    "fat",
    "instructions",
    "prepMinutes",
    "estimatedNutrition",
    "generatedForDate",
  ]);
  const meals = week
    .flat()
    .map((meal) => Object.fromEntries(Object.entries(meal).filter(([key]) => fields.has(key))));
  if (!meals.length) throw new Error("Choose at least one meal before saving.");
  const records = await base44.entities.MealRecommendation.bulkCreate(meals);
  if (records.length !== meals.length)
    throw new Error("The complete week did not save. Your previous plan is unchanged.");
  const payload = {
    weekStart: format(weekStart(), "yyyy-MM-dd"),
    mealIds: records.map((meal) => meal.id),
    calorieTotalsByDay: Object.fromEntries(
      week.map((day, index) => [index, sumMacros(day).calories])
    ),
    macroTotalsByDay: Object.fromEntries(week.map((day, index) => [index, sumMacros(day)])),
  };
  // Change the visible weekly plan only after ALL its meal records are saved.
  return existingId
    ? base44.entities.WeeklyMealPlan.update(existingId, payload)
    : base44.entities.WeeklyMealPlan.create(payload);
}
