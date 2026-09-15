import React from "react";
const allergens = [
  "Eggs",
  "Peanuts",
  "Tree nuts",
  "Shellfish",
  "Fish",
  "Milk/dairy",
  "Soy",
  "Wheat/gluten",
  "Sesame",
];
const prefs = ["High protein", "Vegetarian", "Vegan", "Pescatarian", "Dairy free", "Gluten free"];
export interface OnboardingStepProps {
  data: Record<string, any>;
  set: (key: string, value: any) => void;
}
export default function OnboardingDiet({ data, set }: OnboardingStepProps) {
  const toggle = (key: string, x: string) =>
    set(
      key,
      (data[key] || []).includes(x)
        ? data[key].filter((v: string) => v !== x)
        : [...(data[key] || []), x]
    );
  return (
    <div className="space-y-5">
      <div>
        <p className="font-bold">Allergies</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {allergens.map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={(data.allergies || []).includes(x)}
              onClick={() => toggle("allergies", x)}
              className={`min-h-11 rounded-full border px-3 py-2 text-sm ${(data.allergies || []).includes(x) ? "border-destructive bg-destructive/10 text-destructive" : ""}`}
            >
              {x}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="font-bold">Preferences</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {prefs.map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={(data.dietaryPreferences || []).includes(x)}
              onClick={() => toggle("dietaryPreferences", x)}
              className={`min-h-11 rounded-full border px-3 py-2 text-sm ${(data.dietaryPreferences || []).includes(x) ? "border-primary bg-primary/10 text-primary" : ""}`}
            >
              {x}
            </button>
          ))}
        </div>
      </div>
      <input
        className="h-12 w-full rounded-xl border bg-transparent px-3"
        placeholder="Other foods to avoid, comma separated"
        aria-label="Other foods to avoid, separated by commas"
        value={data.avoidText || ""}
        onChange={(e) => set("avoidText", e.target.value)}
      />
      <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
        Limit excludes saved allergens from meal ideas. Always verify labels and cross-contact
        warnings for serious allergies.
      </p>
    </div>
  );
}
