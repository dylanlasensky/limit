import { beforeEach, describe, expect, it, vi } from "vitest";
import { foodSourceLabel, isDiaryDate, shiftDiaryDate } from "@/lib/food-diary";
import {
  createFoodEntry,
  deleteFoodEntry,
  listFoodEntries,
  updateFoodEntry,
} from "@/lib/food-entry";
const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  filter: vi.fn(),
}));
vi.mock("@/api/base44Client", () => ({ base44: { entities: { FoodEntry: api } } }));
const entry = {
  id: "food-1",
  date: "2020-06-01",
  mealType: "Lunch",
  foodName: "Rice",
  quantity: 1,
  unit: "cup",
  calories: 200,
  protein: 4,
  carbs: 40,
  fat: 1,
  estimated: true,
  entryMethod: "scan_meal",
};
beforeEach(() => {
  vi.resetAllMocks();
  api.create.mockImplementation(async (data) => ({ id: "new", ...data }));
  api.update.mockImplementation(async (id, data) => ({ id, ...data }));
  api.delete.mockResolvedValue({ success: true });
});
describe("food diary dates", () => {
  it("handles month, leap year and DST boundaries without shifting the local day", () => {
    expect(shiftDiaryDate("2024-03-01", -1)).toBe("2024-02-29");
    expect(shiftDiaryDate("2026-03-08", 1)).toBe("2026-03-09");
    expect(shiftDiaryDate("2026-01-01", -1)).toBe("2025-12-31");
  });
  it.each(["2026-02-30", "2026-13-01", "tomorrow", "2026-03-10", "2026-3-01"])(
    "rejects invalid or future date %s",
    (value) => {
      expect(isDiaryDate(value, "2026-03-09")).toBe(false);
    }
  );
  it("accepts today and earlier valid dates", () => {
    expect(isDiaryDate("2026-03-09", "2026-03-09")).toBe(true);
    expect(isDiaryDate("2024-02-29", "2026-03-09")).toBe(true);
  });
});
describe("food diary mutations", () => {
  it("creates on the selected date and never forwards server-owned fields", async () => {
    await createFoodEntry({ ...entry, created_by_id: "someone", ownerId: "other" });
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ date: "2020-06-01", estimated: true })
    );
    expect(api.create.mock.calls[0][0]).not.toHaveProperty("id");
    expect(api.create.mock.calls[0][0]).not.toHaveProperty("created_by_id");
    expect(api.create.mock.calls[0][0]).not.toHaveProperty("ownerId");
  });
  it("corrects an existing row without changing estimate provenance or creating a duplicate", async () => {
    const saved = await updateFoodEntry(entry, {
      date: "2020-05-31",
      mealType: "Dinner",
      calories: "180",
      estimated: false,
      entryMethod: "manual",
    });
    expect(saved).toMatchObject({
      id: "food-1",
      date: "2020-05-31",
      calories: 180,
      estimated: true,
      entryMethod: "scan_meal",
    });
    expect(api.create).not.toHaveBeenCalled();
    expect(foodSourceLabel(saved)).toBe("Meal photo · Estimated");
  });
  it("rejects future dates and pending rows before making a request", async () => {
    await expect(createFoodEntry({ ...entry, date: "2999-01-01" })).rejects.toThrow(
      "earlier diary date"
    );
    await expect(updateFoodEntry({ ...entry, id: "pending-1" }, {})).rejects.toThrow(
      "finish saving"
    );
    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
  });
  it("does not report a failed deletion as successful", async () => {
    api.delete.mockResolvedValueOnce({ success: false });
    await expect(deleteFoodEntry("food-1")).rejects.toThrow("not be confirmed");
  });
  it("handles retrying a deletion that already completed", async () => {
    api.delete.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(deleteFoodEntry("food-1")).resolves.toBeUndefined();
    api.delete.mockRejectedValueOnce({ response: { status: 403 } });
    await expect(deleteFoodEntry("food-1")).rejects.toMatchObject({ response: { status: 403 } });
  });
  it("loads every row for a diary day instead of silently applying a default limit", async () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({ ...entry, id: `food-${i}` }));
    api.filter.mockImplementation(async (_q, _sort, limit, skip) => rows.slice(skip, skip + limit));
    expect(await listFoodEntries(entry.date)).toHaveLength(501);
    expect(api.filter).toHaveBeenLastCalledWith({ date: entry.date }, "created_date", 500, 500);
  });
  it("fails visibly if pagination repeats a page", async () => {
    api.filter.mockResolvedValue(
      Array.from({ length: 500 }, (_, i) => ({ ...entry, id: `food-${i}` }))
    );
    await expect(listFoodEntries(entry.date)).rejects.toThrow("changed while loading");
  });
});
