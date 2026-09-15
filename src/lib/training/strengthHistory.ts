import { exerciseCatalog, normalizeExerciseName } from "../../../base44/shared/exerciseCatalog.js";
import { catalogMatch, isPowerExercise } from "../../../base44/shared/exerciseLibrary.js";
import { epley } from "@/lib/training/e1rm";

export const POUNDS_PER_KILOGRAM = 2.20462;
export type StrengthMetric = "heaviest" | "estimatedMax" | "volume" | "totalReps";
export type StrengthUnit = "lb" | "kg";
export interface StrengthSet {
  id: string;
  setNumber: number;
  weightLb: number;
  reps: number;
  setType: string;
}
export interface StrengthSession {
  sessionId: string;
  name: string;
  date: string;
  completedAt: string;
  heaviest: number;
  estimatedMax: number | null;
  volume: number;
  totalReps: number;
  sets: StrengthSet[];
}
export interface StrengthExercise {
  key: string;
  name: string;
  equipment: string;
  primaryMuscle: string;
  power: boolean;
  sessions: StrengthSession[];
}

export function strengthDisplayValue(value: number, metric: StrengthMetric, unit: StrengthUnit) {
  return metric === "totalReps" || unit === "lb" ? value : value / POUNDS_PER_KILOGRAM;
}

// Page existing SDK reads without silently labelling a truncated response "All time".
export async function readProgressPages<T extends { id?: string }>(
  fetchPage: (limit: number, skip: number) => Promise<T[]>,
  { pageSize = 500, maxRows = 20000 } = {}
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows = new Map<string, T>();
  for (let skip = 0; skip < maxRows; skip += pageSize) {
    const limit = Math.min(pageSize, maxRows - skip);
    const page = await fetchPage(limit, skip);
    if (!Array.isArray(page)) throw new Error("Progress history could not be loaded.");
    for (const row of page) {
      if (!row.id) throw new Error("A history record is missing its identifier.");
      // Offset shifts can also skip unseen records; de-duplicating an overlap
      // would hide that uncertainty and understate totals.
      if (rows.has(row.id))
        throw new Error(
          "History changed while loading and returned duplicate records. Please retry."
        );
      rows.set(row.id, row);
    }
    if (page.length < limit) return { rows: [...rows.values()], truncated: false };
  }
  const remaining = await fetchPage(1, maxRows);
  if (!Array.isArray(remaining)) throw new Error("Progress history could not be loaded.");
  const remainingIds = new Set<string>();
  for (const row of remaining) {
    if (!row.id) throw new Error("A history record is missing its identifier.");
    if (rows.has(row.id) || remainingIds.has(row.id))
      throw new Error(
        "History changed while loading and returned duplicate records. Please retry."
      );
    remainingIds.add(row.id);
  }
  return { rows: [...rows.values()], truncated: remaining.length > 0 };
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function buildStrengthHistory({
  sets,
  sessions,
  exercises,
  throughDate,
}: {
  sets: Record<string, any>[];
  sessions: Record<string, any>[];
  exercises: Record<string, any>[];
  throughDate?: string;
}): StrengthExercise[] {
  type Identity = Omit<StrengthExercise, "sessions">;
  const identities = new Map<string, Identity>();
  const byId = new Map<string, Identity>();
  const aliases = new Map<string, Map<string, Identity>>();
  const addAlias = (name: string, identity: Identity) => {
    const key = normalizeExerciseName(name);
    if (!key) return;
    if (!aliases.has(key)) aliases.set(key, new Map());
    aliases.get(key)!.set(identity.key, identity);
  };
  for (const exercise of [...exerciseCatalog, ...exercises]) {
    const catalog = catalogMatch(exercise);
    const key = catalog?.catalogKey
      ? `catalog:${catalog.catalogKey}`
      : exercise.id
        ? `saved:${exercise.id}`
        : `name:${normalizeExerciseName(exercise.name)}`;
    const identity: Identity = {
      key,
      name: catalog?.name || exercise.name || "Unnamed exercise",
      equipment: catalog?.equipment || exercise.equipment || "",
      primaryMuscle: exercise.primaryMuscle || catalog?.primaryMuscle || "",
      power: isPowerExercise(exercise) || isPowerExercise(catalog),
    };
    identities.set(key, identity);
    if (exercise.id) byId.set(String(exercise.id), identity);
    for (const name of [
      exercise.name,
      ...(exercise.aliases || []),
      catalog?.name,
      ...(catalog?.aliases || []),
    ]) {
      if (name) addAlias(name, identity);
    }
  }
  const resolve = (row: Record<string, any>): Identity => {
    if (row.exerciseId && byId.has(String(row.exerciseId)))
      return byId.get(String(row.exerciseId))!;
    const catalog = catalogMatch({ ...row, name: row.exerciseName });
    if (catalog) return identities.get(`catalog:${catalog.catalogKey}`)!;
    // Unknown saved IDs remain separate: matching names alone must not merge
    // distinct custom movements or equipment variants.
    if (!row.exerciseId) {
      const candidates = [
        ...(aliases.get(normalizeExerciseName(row.exerciseName || ""))?.values() || []),
      ].filter(
        (entry) =>
          !row.equipment ||
          normalizeExerciseName(entry.equipment) === normalizeExerciseName(row.equipment)
      );
      if (candidates.length === 1) return candidates[0];
    }
    return {
      key: row.exerciseId
        ? `saved:${row.exerciseId}`
        : `legacy:${normalizeExerciseName(row.exerciseName || "Unnamed exercise")}:${normalizeExerciseName(row.equipment || "")}`,
      name: row.exerciseName || "Unnamed exercise",
      equipment: row.equipment || "",
      primaryMuscle: row.primaryMuscle || "",
      power: isPowerExercise(row),
    };
  };
  const completed = new Map(
    sessions
      .filter(
        (session) =>
          session.id &&
          session.status === "completed" &&
          validDate(session.date) &&
          (!throughDate || session.date <= throughDate)
      )
      .map((session) => [String(session.id), session])
  );
  const groups = new Map<string, StrengthExercise>();
  const points = new Map<string, StrengthSession>();
  const seen = new Set<string>();
  for (const [index, row] of sets.entries()) {
    const session = completed.get(String(row.workoutSessionId));
    const setType = row.setType || "working";
    if (
      !session ||
      row.completed !== true ||
      !["working", "drop", "failure"].includes(setType) ||
      row.removed
    )
      continue;
    if (row.weight == null || String(row.weight).trim() === "" || row.reps == null) continue;
    const unit = String(row.weightUnit || row.unit || "lb").toLowerCase();
    if (!["lb", "lbs", "pound", "pounds", "kg", "kgs", "kilogram", "kilograms"].includes(unit))
      continue;
    const weightLb =
      Number(row.weight) *
      (["kg", "kgs", "kilogram", "kilograms"].includes(unit) ? POUNDS_PER_KILOGRAM : 1);
    const reps = Number(row.reps);
    if (
      !Number.isFinite(weightLb) ||
      weightLb < 0 ||
      weightLb > 2500 ||
      !Number.isInteger(reps) ||
      reps < 1 ||
      reps > 100
    )
      continue;
    const rowKey = row.id
      ? `id:${row.id}`
      : row.rowKey
        ? `row:${session.id}:${row.rowKey}`
        : `index:${index}`;
    if (seen.has(rowKey)) continue;
    seen.add(rowKey);
    const identity = resolve(row);
    if (!groups.has(identity.key)) groups.set(identity.key, { ...identity, sessions: [] });
    const group = groups.get(identity.key)!;
    group.power ||= isPowerExercise(row);
    const pointKey = JSON.stringify([identity.key, session.id]);
    if (!points.has(pointKey)) {
      const point: StrengthSession = {
        sessionId: session.id,
        name: session.name || "Workout",
        date: session.date,
        completedAt: session.completedAt || session.startedAt || session.date,
        heaviest: 0,
        estimatedMax: null,
        volume: 0,
        totalReps: 0,
        sets: [],
      };
      points.set(pointKey, point);
      group.sessions.push(point);
    }
    const point = points.get(pointKey)!;
    point.heaviest = Math.max(point.heaviest, weightLb);
    point.volume += weightLb * reps;
    point.totalReps += reps;
    point.sets.push({
      id: rowKey,
      setNumber: Number(row.setNumber) || point.sets.length + 1,
      weightLb,
      reps,
      setType,
    });
  }
  for (const group of groups.values()) {
    group.sessions.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.completedAt.localeCompare(b.completedAt) ||
        a.sessionId.localeCompare(b.sessionId)
    );
    for (const point of group.sessions) {
      point.sets.sort((a, b) => a.setNumber - b.setNumber);
      const estimate = group.power
        ? 0
        : Math.max(...point.sets.map((row) => epley(row.weightLb, row.reps)));
      point.estimatedMax = estimate > 0 ? Math.round(estimate) : null;
    }
  }
  return [...groups.values()].sort(
    (a, b) =>
      (b.sessions.at(-1)?.date || "").localeCompare(a.sessions.at(-1)?.date || "") ||
      a.name.localeCompare(b.name)
  );
}
