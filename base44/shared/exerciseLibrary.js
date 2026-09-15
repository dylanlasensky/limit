import { exerciseCatalog, normalizeExerciseName } from "./exerciseCatalog.js";

const powerNames = new Set(
  exerciseCatalog
    .filter((x) => x.category === "Power")
    .flatMap((x) => [x.name, ...x.aliases])
    .map(normalizeExerciseName)
);
export const isPowerExercise = (row) =>
  row?.category === "Power" ||
  row?.trainingFocus === "Athletic power" ||
  powerNames.has(normalizeExerciseName(row?.exerciseName || row?.name || ""));

// Never truncate a user's library at the SDK's default page size.
export async function readExercisePages(entity) {
  const rows = new Map();
  const pageSize = 500;
  for (let skip = 0; skip < 50000; skip += pageSize) {
    const page = await entity.list("created_date", pageSize, skip);
    if (!Array.isArray(page)) throw new Error("The exercise library could not be loaded.");
    let added = 0;
    for (const row of page) {
      if (!row.id) throw new Error("An exercise is missing its saved identifier.");
      if (!rows.has(row.id)) added++;
      rows.set(row.id, row);
    }
    if (page.length < pageSize) return [...rows.values()];
    if (!added) throw new Error("The exercise library returned a repeated page. Please retry.");
  }
  throw new Error("The exercise library is too large to load safely.");
}

export function catalogMatch(row, catalog = exerciseCatalog) {
  if (row.catalogKey) return catalog.find((x) => x.catalogKey === row.catalogKey);
  const name = normalizeExerciseName(row.name);
  return catalog.find(
    (x) =>
      x.equipment.toLowerCase() === String(row.equipment || "").toLowerCase() &&
      [x.name, ...x.aliases].some((alias) => normalizeExerciseName(alias) === name)
  );
}

// Enrich legacy rows without fabricating database IDs or renaming saved exercises.
export function enrichExercise(row) {
  const match = catalogMatch(row);
  return match
    ? {
        ...match,
        ...row,
        aliases: [...new Set([...match.aliases, ...(row.aliases || []), match.name])],
      }
    : row;
}

export function exerciseSearch(exercise, query = "") {
  const tokens = normalizeExerciseName(query).split(" ").filter(Boolean);
  const searchable = normalizeExerciseName(
    [
      exercise.name,
      ...(exercise.aliases || []),
      exercise.primaryMuscle,
      ...(exercise.secondaryMuscles || []),
      exercise.equipment,
      exercise.movementPattern,
    ]
      .filter(Boolean)
      .join(" ")
  );
  return tokens.every((token) => searchable.includes(token));
}

// Additive and restartable. Existing IDs, names, muscle attribution and rep ranges stay intact.
// No user programs, histories, custom exercises or other entities are changed.
export async function syncExerciseCatalog(entity, catalog, existing) {
  const result = { before: existing.length, created: 0, enriched: 0, unchanged: 0 };
  const pending = [];
  const metadata = [
    "catalogKey",
    "catalogVersion",
    "aliases",
    "movementPattern",
    "difficulty",
    "trainingFocus",
    "programEligible",
    "selectionPriority",
    "instructions",
    "coachingRecommended",
  ];
  for (const item of catalog) {
    const saved =
      existing.find((row) => row.catalogKey === item.catalogKey) ||
      existing.find((row) => {
        if (
          row.catalogKey ||
          String(row.equipment || "").toLowerCase() !== item.equipment.toLowerCase()
        )
          return false;
        return [item.name, ...item.aliases].some(
          (name) => normalizeExerciseName(name) === normalizeExerciseName(row.name)
        );
      });
    if (!saved) {
      pending.push(item);
      continue;
    }
    if (saved.catalogVersion >= item.catalogVersion) {
      result.unchanged++;
      continue;
    }
    const patch = Object.fromEntries(metadata.map((key) => [key, item[key]]));
    patch.aliases = [...new Set([...item.aliases, ...(saved.aliases || []), item.name])];
    await entity.update(saved.id, patch);
    Object.assign(saved, patch);
    result.enriched++;
  }
  for (let i = 0; i < pending.length; i += 50) {
    const batch = pending.slice(i, i + 50);
    const saved = await entity.bulkCreate(batch);
    if (!Array.isArray(saved) || saved.length !== batch.length)
      throw new Error("Exercise seed was incomplete; rerun to recover.");
    result.created += saved.length;
  }
  return result;
}
