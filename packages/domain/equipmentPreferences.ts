export const commonEquipment = [
  "Full commercial gym",
  "Barbell + rack",
  "Dumbbells",
  "Cables",
  "Machines",
  "Bodyweight only",
];

export const additionalEquipment = [
  "Bench",
  "Pull-up bar",
  "Resistance band",
  "Kettlebell",
  "Barbell",
  "Smith machine",
  "Landmine",
  "Trap bar",
  "EZ bar",
  "Suspension trainer",
  "Plyo box",
  "Dip station",
  "Ab wheel",
];

const aliases: Record<string, string> = {
  "full gym": "Full commercial gym",
  "commercial gym": "Full commercial gym",
  bodyweight: "Bodyweight only",
  dumbbell: "Dumbbells",
  "cable machine": "Cables",
  cable: "Cables",
  machine: "Machines",
  "resistance bands": "Resistance band",
};

export function normalizeEquipmentPreferences(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const known = [...commonEquipment, ...additionalEquipment];
  const normalized = values
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .map((value) => {
      const trimmed = value.trim();
      return (
        aliases[trimmed.toLowerCase()] ||
        known.find((item) => item.toLowerCase() === trimmed.toLowerCase()) ||
        trimmed
      );
    });
  const unique = [...new Set(normalized)];
  // Earlier screens allowed the default full gym to remain selected alongside
  // limited equipment. Prefer the explicitly selected gear for those profiles.
  const specific = unique.filter(
    (value) => value !== "Full commercial gym" && value !== "Bodyweight only"
  );
  if (specific.length) return specific;
  if (unique.includes("Bodyweight only")) return ["Bodyweight only"];
  return unique;
}

export function toggleEquipmentPreference(values: unknown, option: string): string[] {
  const selected = normalizeEquipmentPreferences(values);
  if (option === "Full commercial gym" || option === "Bodyweight only") {
    return selected.includes(option) ? ["Bodyweight only"] : [option];
  }
  const limited = selected.filter(
    (value) => value !== "Full commercial gym" && value !== "Bodyweight only"
  );
  const next = limited.includes(option)
    ? limited.filter((value) => value !== option)
    : [...limited, option];
  return next.length ? next : ["Bodyweight only"];
}
