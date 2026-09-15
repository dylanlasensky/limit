import { exerciseCatalog } from "../../../base44/shared/exerciseCatalog.js";
import { catalogMatch, enrichExercise } from "../../../base44/shared/exerciseLibrary.js";

// Browsing is independent of database seeding. Reference-only entries deliberately
// have NO database ID and must never be passed to logging/program APIs as records.
export function browseCatalog(saved: any[]) {
  const byKey = new Map<string, any>();
  const custom: any[] = [];
  for (const row of saved) {
    const match = catalogMatch(row);
    if (match) {
      if (!byKey.has(match.catalogKey))
        byKey.set(match.catalogKey, { ...enrichExercise(row), savedIds: [] });
      byKey.get(match.catalogKey).savedIds.push(row.id);
    } else custom.push(row);
  }
  return [
    ...exerciseCatalog.map((reference) => {
      const row = byKey.get(reference.catalogKey);
      return row
        ? {
            ...row,
            browseKey: reference.catalogKey,
            browseMuscle: reference.primaryMuscle,
            referenceOnly: false,
          }
        : {
            ...reference,
            browseKey: reference.catalogKey,
            browseMuscle: reference.primaryMuscle,
            savedIds: [],
            referenceOnly: true,
          };
    }),
    ...custom.map((row) => ({
      ...row,
      browseKey: "saved:" + row.id,
      browseMuscle: row.primaryMuscle,
      savedIds: [row.id],
      referenceOnly: false,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

export const muscleFamilies: Record<string, string[]> = {
  Chest: ["Chest"],
  Back: ["Back", "Lats", "Upper back", "Lower back"],
  Shoulders: ["Shoulders", "Front delts", "Side delts", "Rear delts", "Rotator cuff"],
  Arms: ["Biceps", "Triceps", "Forearms"],
  Legs: ["Quads", "Hamstrings", "Glutes", "Abductors", "Adductors", "Calves", "Tibialis"],
  Core: ["Core", "Abs", "Abs/core"],
};
