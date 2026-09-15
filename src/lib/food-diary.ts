import { localDay } from "@/components/workout/workoutDraft";

export function isDiaryDate(value: unknown, maximum = localDay()): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value > maximum)
    return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function shiftDiaryDate(value: string, days: number) {
  const parsed = new Date(`${value}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function foodSourceLabel(entry: Record<string, any>) {
  const source =
    {
      manual: "Manual entry",
      restaurant: "Restaurant entry",
      recent: "Reused food",
      meal_plan: "Meal idea",
      scan_food: "Nutrition-label scan",
      scan_meal: "Meal photo",
    }[entry.entryMethod as string] || "Food entry";
  return `${source}${entry.estimated ? " · Estimated" : ""}`;
}
