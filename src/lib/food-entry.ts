import { base44 } from "@/api/base44Client";
import { isDiaryDate } from "@/lib/food-diary";

export function validateFoodEntry(entry: Record<string, any>): Record<string, any> {
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
const editableFields = [
  "date",
  "mealType",
  "foodName",
  "quantity",
  "unit",
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sugar",
  "sodium",
];
function foodPayload(entry: Record<string, any>) {
  const valid = validateFoodEntry(entry);
  if (!isDiaryDate(valid.date)) throw new Error("Choose today or an earlier diary date.");
  const numericFields = [
    "quantity",
    "calories",
    "protein",
    "carbs",
    "fat",
    "fiber",
    "sugar",
    "sodium",
  ];
  if (valid.unit !== undefined && (typeof valid.unit !== "string" || !valid.unit.trim()))
    throw new Error("Add a portion unit, such as servings or cups.");
  return Object.fromEntries(
    [...editableFields, "entryMethod", "estimated"]
      .filter((key) => valid[key] !== undefined)
      .map((key) => [key, numericFields.includes(key) ? +valid[key] : valid[key]])
  );
}
export async function createFoodEntry(entry: Record<string, any>) {
  return base44.entities.FoodEntry.create(foodPayload(entry));
}

export async function updateFoodEntry(entry: Record<string, any>, changes: Record<string, any>) {
  if (typeof entry.id !== "string" || !entry.id || entry.id.startsWith("pending-"))
    throw new Error("Wait for this entry to finish saving before editing it.");
  const payload = foodPayload({
    ...entry,
    ...changes,
    entryMethod: entry.entryMethod,
    estimated: entry.estimated,
  });
  const result = await base44.entities.FoodEntry.update(entry.id, payload);
  if (result?.id !== entry.id)
    throw new Error("The saved change could not be confirmed. Please retry.");
  return result;
}

export async function deleteFoodEntry(id: string) {
  if (!id || id.startsWith("pending-")) throw new Error("Wait for this entry to finish saving.");
  try {
    const result = await base44.entities.FoodEntry.delete(id);
    if (result?.success !== true)
      throw new Error("The deletion could not be confirmed. Please retry.");
  } catch (error: any) {
    // A retried deletion after a lost acknowledgement can already be complete.
    if ((error?.status || error?.response?.status) !== 404) throw error;
  }
}

export async function listFoodEntries(date: string) {
  if (!isDiaryDate(date)) throw new Error("Choose today or an earlier diary date.");
  const entries = new Map<string, any>();
  for (let skip = 0; skip < 10000; skip += 500) {
    const page = await base44.entities.FoodEntry.filter({ date }, "created_date", 500, skip);
    if (!Array.isArray(page)) throw new Error("Your diary could not be loaded completely.");
    for (const entry of page) {
      if (!entry.id || entries.has(entry.id))
        throw new Error("Your diary changed while loading. Please retry.");
      entries.set(entry.id, entry);
    }
    if (page.length < 500) return [...entries.values()];
  }
  throw new Error("This diary day is too large to load completely.");
}
