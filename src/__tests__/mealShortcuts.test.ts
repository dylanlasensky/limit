import { describe, expect, it, vi } from "vitest";
import { mealEntry, portionedItem, shortcutItemFromFood } from "@/lib/meal-shortcuts";

vi.mock("@/api/client", () => ({ limitApi: { entities: { FoodEntry: {}, MealShortcut: {} } } }));

const eggs = shortcutItemFromFood({
  foodName: "Eggs",
  quantity: 2,
  unit: "pieces",
  calories: 140,
  protein: 12,
  estimated: false,
  ingredients: ["egg"],
  possibleAllergens: ["egg"],
});
const toast = shortcutItemFromFood({
  foodName: "Toast",
  quantity: 1,
  unit: "slice",
  calories: 80,
  carbs: 15,
  estimated: true,
  ingredients: ["wheat"],
  possibleAllergens: ["wheat"],
});

describe("meal shortcuts", () => {
  it("scales edited portions and preserves ingredient, allergen and estimate metadata", () => {
    const entry = mealEntry(
      "Usual breakfast",
      [eggs, toast],
      [3, 2],
      "Breakfast",
      "2020-06-01",
      "bd8caad4-7d78-4f51-88fa-21e3dd63eb9a"
    );
    expect(entry).toMatchObject({
      calories: 370,
      protein: 18,
      carbs: 30,
      estimated: true,
      ingredients: ["egg", "wheat"],
      possibleAllergens: ["egg", "wheat"],
      entryMethod: "meal_shortcut",
    });
    expect(eggs.quantity).toBe(2);
  });

  it("rejects invalid portions and requires more than one food", () => {
    expect(() => portionedItem(eggs, 0)).toThrow("positive portion");
    expect(() =>
      mealEntry("Single", [eggs], [2], "Breakfast", "2020-06-01", crypto.randomUUID())
    ).toThrow("at least two");
  });
});
