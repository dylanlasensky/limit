import { describe, expect, it } from "vitest";
import { weeklyActivity } from "@/lib/training/weeklyActivity";

describe("weekly activity", () => {
  it("uses a Monday-first local calendar and handles month boundaries", () => {
    const result = weeklyActivity([], "2026-10-01");
    expect(result.days[0].date).toBe("2026-09-28");
    expect(result.days[6].date).toBe("2026-10-04");
    expect(result.days.find((day) => day.isToday)?.date).toBe("2026-10-01");
    expect(result.days.filter((day) => day.future)).toHaveLength(3);
    expect(result.count).toBe(0);
  });

  it("counts completed workouts once, not active, skipped, old, invalid or future rows", () => {
    const result = weeklyActivity(
      [
        { id: "one", date: "2026-09-28", status: "completed", durationMinutes: 30.4 },
        { id: "one", date: "2026-09-28", status: "completed", durationMinutes: 30.4 },
        { id: "two", date: "2026-09-28", status: "completed", durationMinutes: 15.4 },
        { id: "three", date: "2026-10-01", status: "completed", durationMinutes: -40 },
        { date: "2026-10-01", status: "active" },
        { date: "2026-09-29", status: "skipped" },
        { date: "2026-09-27", status: "completed" },
        { date: "2026-10-03", status: "completed" },
        { date: "2026-09-31", status: "completed" },
        { status: "completed" },
      ],
      "2026-10-01"
    );
    expect(result.count).toBe(3);
    expect(result.activeDays).toBe(2);
    expect(result.minutes).toBe(46);
    expect(result.days[0].count).toBe(2);
  });

  it("keeps Sunday in the current week and resets on Monday", () => {
    const sessions = [{ id: "one", date: "2026-09-13", status: "completed" }];
    expect(weeklyActivity(sessions, "2026-09-13").count).toBe(1);
    expect(weeklyActivity(sessions, "2026-09-14").count).toBe(0);
  });
});
