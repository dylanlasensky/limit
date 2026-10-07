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

export async function saveMealShortcut(name: string, items: ShortcutItem[]) {
  return limitApi.entities.MealShortcut.create({ name: name.trim(), items });
}
