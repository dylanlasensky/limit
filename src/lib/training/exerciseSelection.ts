// Deterministic exercise selection from the Exercise library.
import type { Slot } from "@/lib/training/programEngine";

export const equipmentPool = (profile: any): Set<string> | null => {
  const eq = profile.equipment || [];
  if (!eq.length || eq.some((x) => /full|commercial|gym/i.test(x))) return null; // null = everything available
  const set = new Set<string>(["Bodyweight"]);
  eq.forEach((x: string) => {
    if (/barbell/i.test(x)) set.add("Barbell");
    if (/dumbbell/i.test(x)) set.add("Dumbbell");
    if (/cable/i.test(x)) set.add("Cable");
    if (/machine/i.test(x)) set.add("Machine");
    for (const equipment of [
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
    ]) {
      if (x.toLowerCase() === equipment.toLowerCase()) set.add(equipment);
    }
  });
  return set;
};

// variant 0 picks the top-ranked exercise, variant 1 prefers the runner-up ("B" days vary from "A" days).
export const selectExercise = (
  slot: Slot,
  exercises: any[],
  usedIds: Set<string>,
  allowed: Set<string> | null,
  variant = 0,
  experience = "beginner"
): any => {
  const pool = exercises.filter(
    (e) =>
      slot.muscles.includes(e.primaryMuscle) &&
      e.programEligible !== false &&
      e.category !== "Power" &&
      (experience !== "beginner" || e.difficulty !== "Advanced") &&
      (!slot.type || e.category === slot.type) &&
      !usedIds.has(e.id) &&
      (!allowed || allowed.has(e.equipment))
  );
  if (!pool.length) return null;
  const rank = (e: any) => {
    let r = (e.selectionPriority || 0) / 2;
    if (slot.type && e.category === slot.type) r += 4;
    if (slot.role !== "iso" && e.category === "Compound") r += 3;
    if (slot.role === "iso" && e.category === "Isolation") r += 3;
    if ((slot.role === "main" || slot.role === "main_strength") && e.equipment === "Barbell")
      r += 2;
    if (slot.role === "secondary" && ["Dumbbell", "Machine", "Cable"].includes(e.equipment)) r += 1;
    return r;
  };
  const ranked = [...pool].sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
  return ranked[Math.min(variant, ranked.length - 1)];
};

export function suitableReplacement(original: any, candidate: any, profile: any) {
  const allowed = equipmentPool(profile || {});
  return (
    candidate.id !== original?.id &&
    candidate.primaryMuscle === original?.primaryMuscle &&
    candidate.category === original?.category &&
    (!original?.movementPattern || candidate.movementPattern === original.movementPattern) &&
    (!allowed || allowed.has(candidate.equipment)) &&
    (original?.difficulty === "Advanced" || candidate.difficulty !== "Advanced") &&
    (original?.category === "Power" || candidate.programEligible !== false)
  );
}
