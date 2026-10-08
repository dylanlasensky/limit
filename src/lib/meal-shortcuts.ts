import { limitApi } from "@/api/client";
import { createFoodEntry } from "@/lib/food-entry";

export const nutrients = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sugar",
  "sodium",
] as const;
export type ShortcutItem = {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  estimated?: boolean;
  ingredients?: string[];
  possibleAllergens?: string[];
};

export function shortcutItemFromFood(food: Record<string, any>): ShortcutItem {
  return {
    foodName: food.foodName,
    quantity: Number(food.quantity),
    unit: food.unit || "servings",
    ...Object.fromEntries(nutrients.map((key) => [key, Number(food[key] || 0)])),
    estimated: Boolean(food.estimated),
    ingredients: food.ingredients || [],
    possibleAllergens: food.possibleAllergens || [],
  } as ShortcutItem;
}

export function portionedItem(item: ShortcutItem, quantity: number): ShortcutItem {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000)
    throw new Error("Enter a positive portion for each food.");
  const ratio = quantity / item.quantity;
  return {
    ...item,
    quantity,
    ...Object.fromEntries(
      nutrients.map((key) => [key, Math.round(Number(item[key] || 0) * ratio * 10) / 10])
    ),
  };
}

export function mealEntry(
  name: string,
  items: ShortcutItem[],
  portions: number[],
  mealType: string,
  date: string,
  shortcutLogId: string
) {
  if (items.length < 2 || items.length > 20 || items.length !== portions.length)
    throw new Error("Choose at least two foods for this shortcut.");
  const adjusted = items.map((item, index) => portionedItem(item, portions[index]));
  return {
    date,
    mealType,
    foodName: name,
    quantity: 1,
    unit: "meal",
    ...Object.fromEntries(
      nutrients.map((key) => [
        key,
        Math.round(adjusted.reduce((sum, item) => sum + Number(item[key] || 0), 0) * 10) / 10,
      ])
    ),
    ingredients: [
      ...new Set(
        adjusted.flatMap((item) => (item.ingredients?.length ? item.ingredients : [item.foodName]))
      ),
    ],
    possibleAllergens: [...new Set(adjusted.flatMap((item) => item.possibleAllergens || []))],
    estimated: adjusted.some((item) => item.estimated),
    entryMethod: "meal_shortcut",
    shortcutLogId,
  };
}

export async function logMealShortcut(
  name: string,
  items: ShortcutItem[],
  portions: number[],
  mealType: string,
  date: string,
  operationId: string
) {
  return createFoodEntry(mealEntry(name, items, portions, mealType, date, operationId));
}

const pendingCreateKey = (ownerId: string) => `limit:pending-meal-shortcut:${ownerId}`;

export async function saveMealShortcut(name: string, items: ShortcutItem[]) {
  const owner = await limitApi.auth.me();
  if (!owner?.id) throw new Error("Sign in again before saving this meal.");
  const key = pendingCreateKey(owner.id);
  const fingerprint = JSON.stringify({ name: name.trim(), items });
  let stored: { fingerprint: string; operationId: string } | null = null;
  try {
    stored = JSON.parse(sessionStorage.getItem(key) || "null");
  } catch {
    // A stale or malformed pending record is discarded below.
  }
  const createOperationId =
    stored?.fingerprint === fingerprint &&
    typeof stored.operationId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stored.operationId)
      ? stored.operationId
      : crypto.randomUUID();
  try {
    sessionStorage.setItem(key, JSON.stringify({ fingerprint, operationId: createOperationId }));
  } catch {
    throw new Error("Browser session storage is needed to save this meal safely.");
  }
  const saved = await limitApi.entities.MealShortcut.create({
    name: name.trim(),
    items,
    createOperationId,
  });
  // Only an acknowledged create clears the pending retry key. A lost response
  // leaves the same operation ID available after a page reload.
  if (!saved?.id || saved.createOperationId !== createOperationId)
    throw new Error("The saved meal could not be confirmed. Please retry.");
  sessionStorage.removeItem(key);
  return saved;
}
