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
  });
  return set;
};

// variant 0 picks the top-ranked exercise, variant 1 prefers the runner-up ("B" days vary from "A" days).
export const selectExercise = (
  slot: Slot,
  exercises: any[],
  usedIds: Set<string>,
  allowed: Set<string> | null,
  variant = 0
): any => {
  const pool = exercises.filter(
    (e) =>
      slot.muscles.includes(e.primaryMuscle) &&
      !usedIds.has(e.id) &&
      (!allowed || allowed.has(e.equipment))
  );
  if (!pool.length) return null;
  const rank = (e: any) => {
    let r = 0;
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
