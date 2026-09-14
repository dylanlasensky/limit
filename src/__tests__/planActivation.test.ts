import { describe, expect, it, vi } from "vitest";
import { activatePlan } from "../../base44/shared/planActivation.js";
function fixture() {
  const plan = { id: "new", created_by_id: "u", daysPerWeek: 2, active: false };
  const days = Array.from({ length: 7 }, (_, weekday) => ({
    id: "day" + weekday,
    created_by_id: "u",
    weekday,
    isRest: weekday > 1,
  }));
  const updates: any[] = [];
  const db = {
    WorkoutPlan: {
      get: vi.fn(async () => plan),
      filter: vi.fn(async () => [{ id: "old", created_by_id: "u", active: true }]),
      update: vi.fn(async (id, data) => {
        updates.push({ id, ...data });
        return { ...plan, id, ...data };
      }),
    },
    WorkoutSession: { filter: vi.fn(async (): Promise<any[]> => []) },
    WorkoutDay: { filter: vi.fn(async () => days) },
    WorkoutExercise: {
      filter: vi.fn(async () => [
        { created_by_id: "u", exerciseName: "Squat", sets: 3, repMin: 5, repMax: 8 },
      ]),
    },
  };
  return { db, plan, days, updates, lock: vi.fn(async () => {}) };
}
describe("safe plan activation", () => {
  it("activates the complete program before retiring the previous plan", async () => {
    const f = fixture();
    await activatePlan(f.db, { id: "u" }, "new", f.lock);
    expect(f.updates).toEqual([
      { id: "new", active: true },
      { id: "old", active: false },
    ]);
  });
  it("does not deactivate the old plan if activation fails", async () => {
    const f = fixture();
    f.db.WorkoutPlan.update.mockRejectedValue(new Error("network"));
    await expect(activatePlan(f.db, { id: "u" }, "new", f.lock)).rejects.toThrow();
    expect(f.db.WorkoutPlan.update).toHaveBeenCalledTimes(1);
    expect(f.db.WorkoutPlan.update).toHaveBeenCalledWith("new", { active: true });
  });
  it.each([
    "foreign",
    "missing-day",
    "duplicate-day",
    "empty-exercises",
    "invalid-reps",
    "active-session",
  ])("rejects %s before any changes", async (reason) => {
    const f = fixture();
    if (reason === "foreign") f.plan.created_by_id = "someone-else";
    if (reason === "missing-day") f.days.pop();
    if (reason === "duplicate-day") f.days[1].weekday = 0;
    if (reason === "empty-exercises") f.db.WorkoutExercise.filter.mockResolvedValue([]);
    if (reason === "invalid-reps")
      f.db.WorkoutExercise.filter.mockResolvedValue([
        { created_by_id: "u", exerciseName: "Squat", sets: 3, repMin: 10, repMax: 5 },
      ]);
    if (reason === "active-session")
      f.db.WorkoutSession.filter.mockResolvedValue([{ id: "session" }]);
    await expect(activatePlan(f.db, { id: "u" }, "new", f.lock)).rejects.toThrow();
    expect(f.db.WorkoutPlan.update).not.toHaveBeenCalled();
  });
});
