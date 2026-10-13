import { scheduleForDate, weekStart } from "../../../../packages/domain/workoutSchedule.js";
import type { SavedRecord } from "../../../../packages/contracts/entities";

export function localCalendarDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function nativeWeekSchedule(
  days: SavedRecord<"WorkoutDay">[],
  changes: SavedRecord<"WorkoutScheduleChange">[],
  today: string
) {
  const monday = new Date(`${weekStart(today)}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, weekday) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + weekday);
    const calendarDate = date.toISOString().slice(0, 10);
    return {
      date: calendarDate,
      weekday,
      day: scheduleForDate(days, changes, calendarDate) as SavedRecord<"WorkoutDay"> | null,
    };
  });
}
