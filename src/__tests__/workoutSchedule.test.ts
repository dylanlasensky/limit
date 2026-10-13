import { describe, expect, it } from "vitest";
import { dateWeekday, scheduleForDate, weekStart } from "../../packages/domain/workoutSchedule.js";

const days = Array.from({ length: 7 }, (_, weekday) => ({
  id: String(weekday),
  weekday,
  isRest: weekday > 4,
}));

describe("one-week workout schedule", () => {
  it("moves a workout to a rest date without changing recurring days", () => {
    const change = {
      active: true,
      mode: "move",
      fromDate: "2026-10-07",
      toDate: "2026-10-10",
      fromDayId: "2",
      toDayId: "5",
    };
    expect(scheduleForDate(days, [change], change.fromDate)).toBeNull();
    expect(scheduleForDate(days, [change], change.toDate)?.id).toBe("2");
    expect(scheduleForDate(days, [change], "2026-10-14")?.id).toBe("2");
    expect(days[2].id).toBe("2");
  });

  it("swaps only selected dates and undo restores the recurring week", () => {
    const change = {
      active: true,
      mode: "swap",
      fromDate: "2026-10-07",
      toDate: "2026-10-08",
      fromDayId: "2",
      toDayId: "3",
    };
    expect(scheduleForDate(days, [change], change.fromDate)?.id).toBe("3");
    expect(scheduleForDate(days, [change], change.toDate)?.id).toBe("2");
    expect(scheduleForDate(days, [{ ...change, active: false }], change.fromDate)?.id).toBe("2");
  });

  it("uses date-only week math and rejects invalid dates", () => {
    expect(weekStart("2026-10-07")).toBe("2026-10-05");
    expect(dateWeekday("2026-10-11")).toBe(6);
    expect(() => dateWeekday("2026-02-30")).toThrow();
  });
});
