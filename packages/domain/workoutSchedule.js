// Calendar dates are local YYYY-MM-DD values. UTC arithmetic keeps weekday math
// stable across daylight saving transitions without converting the user's date.
export function dateWeekday(value) {
  const date = new Date(`${value}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new Error("Choose a valid calendar date.");
  return (date.getUTCDay() + 6) % 7;
}

export function weekStart(value) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - dateWeekday(value));
  return date.toISOString().slice(0, 10);
}

export function scheduleForDate(days, changes, date) {
  const recurring = days.find((day) => day.weekday === dateWeekday(date)) || null;
  const change = changes.find(
    (item) => item.active && (item.fromDate === date || item.toDate === date)
  );
  if (!change) return recurring;
  const id =
    change.fromDate === date ? (change.mode === "swap" ? change.toDayId : null) : change.fromDayId;
  return id ? days.find((day) => day.id === id) || recurring : null;
}

export function affectedDates(change) {
  return [change.fromDate, change.toDate];
}
