import { base44 } from "@/api/base44Client";

export function validateFoodEntry(entry: Record<string, any>) {
  if (typeof entry.foodName !== "string" || !entry.foodName.trim())
    throw new Error("Add a food name.");
  if (!["Breakfast", "Lunch", "Dinner", "Snacks"].includes(entry.mealType))
    throw new Error("Choose a meal.");
  if (!Number.isFinite(+entry.quantity) || +entry.quantity <= 0 || +entry.quantity > 10000)
    throw new Error("Enter a positive portion size.");
  if (entry.calories === "" || entry.calories == null)
    throw new Error("Enter calories for the portion you ate.");
  for (const key of ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"]) {
    if (
      entry[key] != null &&
      (!Number.isFinite(+entry[key]) || +entry[key] < 0 || +entry[key] > 100000)
    ) {
      throw new Error("Nutrition values must be valid, nonnegative numbers.");
    }
  }
  return { ...entry, foodName: entry.foodName.trim() };
}
export async function createFoodEntry(entry: Record<string, any>) {
  return base44.entities.FoodEntry.create(validateFoodEntry(entry));
}
