import { describe, expect, it, vi } from "vitest";
import { validateFoodEntry } from "@/lib/food-entry";
import { buildWeek } from "@/components/limit/data";
vi.mock("@/api/base44Client", () => ({ base44: {} }));
const valid = {
  foodName: " Rice ",
  mealType: "Lunch",
  quantity: 1,
  calories: 200,
  protein: 4,
  carbs: 40,
  fat: 1,
};
describe("food entry validation", () => {
  it("trims names while preserving entered portion totals", () => {
    expect(validateFoodEntry({ ...valid, quantity: 2 })).toMatchObject({
      foodName: "Rice",
      quantity: 2,
      calories: 200,
    });
  });
  it.each([
    { foodName: " " },
    { quantity: 0 },
    { quantity: -1 },
    { quantity: Infinity },
    { calories: "" },
    { calories: undefined },
    { protein: -2 },
    { carbs: NaN },
    { mealType: "wrong" },
  ])("rejects invalid food values %j", (change) => {
    expect(() => validateFoodEntry({ ...valid, ...change })).toThrow();
  });
  it("does not create undefined meals when dietary exclusions leave no options", () => {
    const week = buildWeek(
      {},
      {
        foodsToAvoid: [
          "Oats",
          "Eggs",
          "Tofu",
          "Chicken",
          "Lentils",
          "Tuna",
          "Beef",
          "Salmon",
          "Yogurt",
          "Hummus",
          "Milk",
        ],
      }
    );
    expect(week).toHaveLength(7);
    expect(week.flat()).toEqual([]);
  });
});
