import { addDays, format, isValid, parseISO, startOfWeek } from "date-fns";

interface ActivitySession {
  id?: string;
  date?: string;
  status?: string;
  durationMinutes?: number;
}

/** Calendar dates stay local so a late-night workout does not move to another day. */
export function weeklyActivity(sessions: ActivitySession[], today: string) {
  const current = parseISO(today);
  if (!isValid(current)) throw new Error("A valid local date is required.");
  const start = startOfWeek(current, { weekStartsOn: 1 });
  const firstDay = format(start, "yyyy-MM-dd");
  const seen = new Set<string>();
  const completed = sessions.filter((session) => {
    if (
      session.status !== "completed" ||
      !session.date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(session.date) ||
      !isValid(parseISO(session.date)) ||
      session.date < firstDay ||
      session.date > today ||
      (session.id && seen.has(session.id))
    )
      return false;
    if (session.id) seen.add(session.id);
    return true;
  });
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(start, index);
    const date = format(day, "yyyy-MM-dd");
    return {
      date,
      label: format(day, "EEE"),
      day: format(day, "d"),
      fullLabel: format(day, "EEEE, MMMM d"),
      isToday: date === today,
      future: date > today,
      count: completed.filter((session) => session.date === date).length,
    };
  });
  return {
    days,
    count: completed.length,
    activeDays: days.filter((day) => day.count > 0).length,
    minutes: Math.round(
      completed.reduce(
        (total, session) =>
          total +
          (Number.isFinite(session.durationMinutes) && Number(session.durationMinutes) > 0
            ? Number(session.durationMinutes)
            : 0),
        0
      )
    ),
    dateRange: `${format(start, "MMM d")} – ${format(addDays(start, 6), "MMM d")}`,
  };
}
