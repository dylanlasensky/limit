import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  mealEntry,
  portionedItem,
  saveMealShortcut,
  shortcutItemFromFood,
} from "@/lib/meal-shortcuts";

const api = vi.hoisted(() => ({ me: vi.fn(), create: vi.fn() }));
vi.mock("@/api/client", () => ({
  limitApi: {
    auth: { me: api.me },
    entities: { FoodEntry: {}, MealShortcut: { create: api.create } },
  },
}));

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

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

  it("reuses the owner-scoped create ID after a lost response and page reload", async () => {
    let owner = "account-a";
    api.me.mockImplementation(async () => ({ id: owner }));
    const persisted = new Map<string, any>();
    let loseResponse = true;
    api.create.mockImplementation(async (body) => {
      if (!persisted.has(`${owner}:${body.createOperationId}`))
        persisted.set(`${owner}:${body.createOperationId}`, { ...body, id: crypto.randomUUID() });
      if (loseResponse) {
        loseResponse = false;
        throw new Error("Connection lost");
      }
      return persisted.get(`${owner}:${body.createOperationId}`);
    });
    await expect(saveMealShortcut("Usual breakfast", [eggs, toast])).rejects.toThrow(
      "Connection lost"
    );
    const firstId = api.create.mock.calls[0][0].createOperationId;
    expect(sessionStorage.getItem("limit:pending-meal-shortcut:account-a")).toContain(firstId);
    owner = "account-b";
    await saveMealShortcut("Usual breakfast", [eggs, toast]);
    expect(api.create.mock.calls[1][0].createOperationId).not.toBe(firstId);
    expect(sessionStorage.getItem("limit:pending-meal-shortcut:account-a")).toContain(firstId);
    owner = "account-a";
    // A fresh invocation models the component remount after page reload.
    const saved = await saveMealShortcut("Usual breakfast", [eggs, toast]);
    expect(api.create.mock.calls[2][0].createOperationId).toBe(firstId);
    expect(saved.id).toBe(persisted.get(`account-a:${firstId}`).id);
    expect(persisted.size).toBe(2);
    expect(sessionStorage.getItem("limit:pending-meal-shortcut:account-a")).toBeNull();
    await saveMealShortcut("Usual breakfast", [eggs, toast]);
    expect(api.create.mock.calls[3][0].createOperationId).not.toBe(firstId);
  });
});
