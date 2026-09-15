import { format, parseISO, subDays } from "date-fns";

export interface HistorySession {
  id: string;
  name?: string;
  date?: string;
  startedAt?: string;
  durationMinutes?: number;
  setCount?: number;
  totalVolume?: number;
  prCount?: number;
  [key: string]: any;
}

export function sessionDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parseISO(value);
  return Number.isFinite(date.getTime()) && format(date, "yyyy-MM-dd") === value ? value : null;
}

export function uniqueHistory(pages: Record<string, any>[][]): HistorySession[] {
  const found = new Map<string, HistorySession>();
  for (const row of pages.flat())
    if (typeof row?.id === "string" && !found.has(row.id)) found.set(row.id, row as HistorySession);
  return [...found.values()].sort(
    (a, b) =>
      (sessionDate(b.date) || "").localeCompare(sessionDate(a.date) || "") ||
      (b.startedAt || "").localeCompare(a.startedAt || "") ||
      b.id.localeCompare(a.id)
  );
}

export function filterHistory(
  rows: HistorySession[],
  search: string,
  range: string,
  today: string
) {
  const cutoff =
    range === "all" ? "" : format(subDays(parseISO(today), Number(range)), "yyyy-MM-dd");
  const query = search.trim().toLocaleLowerCase();
  return rows.filter(
    (row) =>
      (!query || (row.name || "Workout").toLocaleLowerCase().includes(query)) &&
      (!cutoff || (!!sessionDate(row.date) && row.date! >= cutoff && row.date! <= today))
  );
}

export function groupHistory(rows: HistorySession[]) {
  const groups = new Map<string, { label: string; sessions: HistorySession[] }>();
  for (const row of rows) {
    const date = sessionDate(row.date),
      key = date?.slice(0, 7) || "undated";
    if (!groups.has(key))
      groups.set(key, {
        label: date ? format(parseISO(date), "MMMM yyyy") : "Date unavailable",
        sessions: [],
      });
    groups.get(key)!.sessions.push(row);
  }
  return [...groups.values()];
}
