import type { Slot } from "@/lib/training/programEngine";
import { normalizeEquipmentPreferences } from "@/lib/training/equipmentPreferences";
import { catalogMatch } from "../../../base44/shared/exerciseLibrary.js";

const catalogMatches = new WeakMap<object, { signature: string; match: any }>();
const knownExercise = (exercise: any): any => {
  const signature = JSON.stringify([exercise.catalogKey, exercise.name, exercise.equipment]);
  const cached = catalogMatches.get(exercise);
  if (cached?.signature === signature) return cached.match;
  const match = catalogMatch(exercise);
  catalogMatches.set(exercise, { signature, match });
  return match;
};
const legacyMuscles = new Set(["Back", "Shoulders", "Legs", "Core"]);
// Interpret old broad labels only while selecting a known catalog movement.
// Never rewrite saved attribution/history or override a specific/custom muscle.
const forSelection = (exercise: any): any => {
  if (!legacyMuscles.has(exercise.primaryMuscle)) return exercise;
  const known = knownExercise(exercise);
  return known ? { ...exercise, primaryMuscle: known.primaryMuscle } : exercise;
};

const ALIASES: Record<string, string[]> = {
  barbell: ["Barbell"],
  "barbell + rack": ["Barbell", "Rack"],
  "barbell and rack": ["Barbell", "Rack"],
  dumbbell: ["Dumbbell"],
  dumbbells: ["Dumbbell"],
  cable: ["Cable"],
  cables: ["Cable"],
  "cable machine": ["Cable"],
  machines: ["Machine"],
  machine: ["Machine"],
  bands: ["Resistance band"],
  "resistance bands": ["Resistance band"],
  "pull up bar": ["Pull-up bar"],
  "bodyweight only": ["Bodyweight"],
};
const EQUIPMENT = [
  "Bodyweight",
  "Barbell",
  "Dumbbell",
  "Cable",
  "Machine",
  "Rack",
  "Kettlebell",
  "Resistance band",
  "Smith machine",
  "Landmine",
  "Trap bar",
  "EZ bar",
  "Pull-up bar",
  "Bench",
  "Suspension trainer",
  "Plyo box",
  "Dip station",
  "Ab wheel",
  "Parallettes",
  "Weight plate",
  "Hand gripper",
  "Safety bar",
  "Stability ball",
  "Sliders",
  "Nordic bench",
  "GHD",
  "Roman chair",
  "Reverse hyper machine",
  "Decline bench",
  "Medicine ball",
  "Slam ball",
];

export const equipmentPool = (profile: any): Set<string> | null => {
  const equipment = normalizeEquipmentPreferences(profile.equipment);
  if (
    equipment.some((item) => /^(full commercial gym|full gym|commercial gym)$/i.test(item.trim()))
  )
    return null;
  const pool = new Set(["Bodyweight"]);
  equipment.forEach((item) => {
    const name = item.trim().toLowerCase();
    const mapped = ALIASES[name] || EQUIPMENT.filter((option) => option.toLowerCase() === name);
    mapped.forEach((option) => pool.add(option));
  });
  return pool;
};

// Primary equipment does not describe the full setup: a pair of dumbbells alone
// does not imply a bench, and owning a barbell does not imply a safety rack.
export const equipmentAvailable = (exercise: any, allowed: Set<string> | null): boolean => {
  if (!allowed) return true;
  if (!allowed.has(exercise.equipment)) return false;
  const name = String(exercise.name || "");
  const freeWeight = ["Barbell", "Dumbbell", "EZ bar", "Cable", "Smith machine"].includes(
    exercise.equipment
  );
  const needsBench =
    freeWeight &&
    (/bench|incline|decline|chest.supported|seal row|bulgarian|hip thrust|seated dumbbell/i.test(
      name
    ) ||
      (/dumbbell fly|dumbbell squeeze press|dumbbell pullover/i.test(name) &&
        !/floor/i.test(name)));
  if (needsBench && !allowed.has("Bench")) return false;
  const needsRack =
    exercise.equipment === "Barbell" && /squat|bench press|good morning|inverted row/i.test(name);
  return !needsRack || allowed.has("Rack");
};

// Generated templates currently log repetitions, not elapsed time or distance.
export const supportsRepPrescription = (exercise: any): boolean =>
  !/\bplank\b|\bcarry\b|\bcarries\b|\bfarmer.?s? walk\b|\bdead hang\b|\bflexed.arm hang\b|\bhold\b/i.test(
    String(exercise.name || "")
  );

export const selectExercise = (
  slot: Slot,
  exercises: any[],
  usedIds: Set<string>,
  allowed: Set<string> | null,
  variant = 0,
  experience = "beginner"
): any => {
  const usedCanonical = new Set(
    exercises
      .filter((exercise) => usedIds.has(exercise.id))
      .map((exercise) => knownExercise(exercise)?.catalogKey)
      .filter(Boolean)
  );
  let pool = exercises
    .map(forSelection)
    .filter(
      (exercise) =>
        exercise.id &&
        slot.muscles.includes(exercise.primaryMuscle) &&
        exercise.programEligible !== false &&
        exercise.category !== "Power" &&
        exercise.difficulty !== "Advanced" &&
        (!slot.type || exercise.category === slot.type) &&
        !usedIds.has(exercise.id) &&
        !usedCanonical.has(knownExercise(exercise)?.catalogKey) &&
        equipmentAvailable(exercise, allowed) &&
        supportsRepPrescription(exercise) &&
        (!slot.movementPatterns?.length || slot.movementPatterns.includes(exercise.movementPattern))
    );
  if (!pool.length) return null;
  const seenCanonical = new Set<string>();
  pool = pool.filter((exercise) => {
    const canonical = knownExercise(exercise)?.catalogKey;
    if (!canonical) return true;
    if (seenCanonical.has(canonical)) return false;
    seenCanonical.add(canonical);
    return true;
  });
  if (slot.movementPatterns?.length) {
    const preferred = slot.movementPatterns.find((pattern) =>
      pool.some((exercise) => exercise.movementPattern === pattern)
    );
    pool = pool.filter((exercise) => exercise.movementPattern === preferred);
  }
  const rank = (exercise: any) => {
    let score = (Number(exercise.selectionPriority) || 0) / 2;
    if (slot.type && exercise.category === slot.type) score += 4;
    if (slot.role !== "iso" && exercise.category === "Compound") score += 3;
    if (slot.role === "iso" && exercise.category === "Isolation") score += 3;
    if (experience === "beginner" && exercise.difficulty === "Beginner") score += 6;
    if (/main/.test(slot.role) && ["Dumbbell", "Machine", "Cable"].includes(exercise.equipment))
      score += 2;
    if (experience !== "beginner" && /main/.test(slot.role) && exercise.equipment === "Barbell")
      score += 2;
    if (
      slot.role === "main_strength" &&
      experience !== "beginner" &&
      exercise.equipment === "Barbell"
    )
      score += 3;
    if (slot.role === "secondary" && ["Dumbbell", "Machine", "Cable"].includes(exercise.equipment))
      score += 1;
    return score;
  };
  const ranked = [...pool].sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
  // Keep day variants among similarly suitable choices, not obscure low-ranked lifts.
  const suitable = ranked.filter((exercise) => rank(exercise) >= rank(ranked[0]) - 3);
  return suitable[Math.max(0, Math.trunc(variant)) % Math.min(suitable.length, 3)];
};

export function suitableReplacement(original: any, candidate: any, profile: any) {
  return (
    candidate.id !== original?.id &&
    candidate.primaryMuscle === original?.primaryMuscle &&
    candidate.category === original?.category &&
    (!original?.movementPattern || candidate.movementPattern === original.movementPattern) &&
    equipmentAvailable(candidate, equipmentPool(profile || {})) &&
    (original?.difficulty === "Advanced" || candidate.difficulty !== "Advanced") &&
    (original?.category === "Power" || candidate.programEligible !== false)
  );
}
