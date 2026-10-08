// Shared by browser planning and Node API checks without importing TypeScript-only modules.
const unilateral = (row) =>
  /single[ -]|one[ -]arm|alternating|split squat|lunge|step[ -]up|pallof|woodchop|wood chop|bird dog|dead bug|side bend|per side|each side|both sides/i.test(
    [row.exerciseName || row.name || "", row.notes || "", ...(row.instructions || [])].join(" ")
  );

// Planning estimate, not a timer: preparation, station changes, controlled reps,
// and prescribed rest BETWEEN sets. Never shorten rest to fit more work.
export const estimateMinutes = (rows) => {
  if (!rows.length) return 0;
  return Math.ceil(
    6 +
      rows.reduce((total, row) => {
        const sets = Math.max(1, Number(row.sets) || 3);
        const work = Math.max(45, (Number(row.repMax) || 12) * 3) * (unilateral(row) ? 2 : 1);
        return total + (60 + sets * work + (sets - 1) * (row.restSeconds ?? 120)) / 60;
      }, 0)
  );
};
