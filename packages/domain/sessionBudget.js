import { estimateMinutes } from "./sessionEstimate.js";

// A session-only snapshot. Keep the first two movements and every prescribed
// rest interval; reduce accessory volume from the end of the day first.
export function previewSessionBudget(rows, minutes) {
  const original = rows.map((row) => ({ ...row, sets: Math.max(1, Number(row.sets) || 3) }));
  const originalMinutes = estimateMinutes(original);
  if (!Number.isInteger(minutes) || minutes < 20 || minutes > 120)
    return { available: false, reason: "Choose a budget from 20 to 120 minutes." };
  if (!original.length || originalMinutes <= minutes)
    return { available: false, reason: "This workout already fits the selected time." };
  const selected = original.map((row) => ({ ...row }));
  for (let i = selected.length - 1; i >= 2 && estimateMinutes(selected) > minutes; i--) {
    if (selected[i].coachMandated) continue;
    while (selected[i].sets > 1 && estimateMinutes(selected) > minutes) selected[i].sets--;
    if (estimateMinutes(selected) > minutes) selected.splice(i, 1);
  }
  if (estimateMinutes(selected) > minutes)
    return { available: false, reason: "The key movements and their rest need more time." };
  return {
    available: true,
    originalMinutes,
    estimatedMinutes: estimateMinutes(selected),
    selected,
    removed: original.filter((row) => !selected.some((item) => item.id === row.id)),
  };
}
