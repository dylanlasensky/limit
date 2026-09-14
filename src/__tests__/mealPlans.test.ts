import { beforeEach, describe, expect, it, vi } from "vitest";
import { format } from "date-fns";
import { buildWeek, weekStart } from "@/components/limit/data";
const db = vi.hoisted(() => ({
  WeeklyMealPlan: { filter: vi.fn(), create: vi.fn(), update: vi.fn() },
  MealRecommendation: { filter: vi.fn(), bulkCreate: vi.fn() },
}));
vi.mock("@/api/base44Client", () => ({ base44: { entities: db } }));
import { loadSavedMealWeek, saveMealWeek } from "@/lib/meal-plans";

beforeEach(() => vi.resetAllMocks());
describe("saved meal plans", () => {
  it("reloads the saved week rather than silently replacing it with generated ideas", async () => {
    const meal = buildWeek({}, {})[0][1];
    db.WeeklyMealPlan.filter.mockResolvedValue([{ id: "week", mealIds: ["meal"] }]);
    db.MealRecommendation.filter.mockResolvedValue([
      {
        ...meal,
        id: "meal",
        name: "Tuna potato salad",
        generatedForDate: format(weekStart(), "yyyy-MM-dd"),
      },
    ]);
    const result = await loadSavedMealWeek({});
    expect(result?.id).toBe("week");
    expect(result?.week[0][0].name).toBe("Tuna potato salad");
    expect(result?.week[0][0].key).toBe("meal");
  });
  it("does not reintroduce a newly excluded saved meal", async () => {
    db.WeeklyMealPlan.filter.mockResolvedValue([{ id: "week", mealIds: ["meal"] }]);
    db.MealRecommendation.filter.mockResolvedValue([
      {
        id: "meal",
        name: "Tuna potato salad",
        generatedForDate: format(weekStart(), "yyyy-MM-dd"),
      },
    ]);
    expect((await loadSavedMealWeek({ allergies: ["Fish"] }))?.week.flat()).toEqual([]);
  });
  it("does not overwrite the saved week after partial meal persistence", async () => {
    db.MealRecommendation.bulkCreate.mockResolvedValue([]);
    await expect(saveMealWeek(buildWeek({}, {}), "existing")).rejects.toThrow("complete week");
    expect(db.WeeklyMealPlan.update).not.toHaveBeenCalled();
  });
  it("updates the existing weekly plan only after every meal has saved", async () => {
    const week = buildWeek({}, {});
    db.MealRecommendation.bulkCreate.mockResolvedValue(
      week.flat().map((meal, i) => ({ ...meal, id: String(i) }))
    );
    db.WeeklyMealPlan.update.mockResolvedValue({ id: "existing" });
    await saveMealWeek(week, "existing");
    expect(db.WeeklyMealPlan.create).not.toHaveBeenCalled();
    expect(db.WeeklyMealPlan.update).toHaveBeenCalledWith(
      "existing",
      expect.objectContaining({ mealIds: expect.any(Array) })
    );
    expect(db.MealRecommendation.bulkCreate.mock.calls[0][0][0]).not.toHaveProperty("key");
  });
});
