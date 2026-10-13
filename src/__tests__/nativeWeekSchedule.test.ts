import { describe, expect, it } from "vitest";
import { nativeWeekSchedule } from "../../apps/mobile/src/lib/week-schedule";
import type { SavedRecord } from "../../packages/contracts/entities";

const day = (id: string, weekday: number, isRest: boolean) =>
  ({ id, weekday, isRest, name: id }) as SavedRecord<"WorkoutDay">;

describe("native week schedule", () => {
  it("shows a web move on its actual date without changing the recurring template", () => {
    const days = [day("monday", 0, false), day("tuesday-rest", 1, true)];
    const changes = [
      {
        id: "move-1",
        active: true,
        mode: "move",
        fromDate: "2026-10-05",
        toDate: "2026-10-06",
        fromDayId: "monday",
        toDayId: "tuesday-rest",
      } as SavedRecord<"WorkoutScheduleChange">,
    ];
    const week = nativeWeekSchedule(days, changes, "2026-10-08");
    expect(week).toHaveLength(7);
    expect(week[0]).toMatchObject({ date: "2026-10-05", day: null });
    expect(week[1]).toMatchObject({ date: "2026-10-06", day: { id: "monday" } });
    expect(days[0].weekday).toBe(0);
    expect(nativeWeekSchedule(days, [], "2026-10-15")[0].day?.id).toBe("monday");
  });
});
