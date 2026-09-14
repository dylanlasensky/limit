import React from "react";
import type { OnboardingStepProps } from "@/components/limit/OnboardingDiet";
const areas = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
];
export default function OnboardingPriorities({ data, set }: OnboardingStepProps) {
  const picked: string[] = data.priorityMuscles || [];
  const toggle = (m: string) => {
    if (picked.includes(m))
      return set(
        "priorityMuscles",
        picked.filter((x) => x !== m)
      );
    if (picked.length >= 3) return;
    set("priorityMuscles", [...picked, m]);
  };
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Optional. Pick up to 3 areas you want to emphasize — they'll get extra volume in your
        program.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {areas.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => toggle(m)}
            className={`min-h-11 rounded-full px-4 text-sm font-bold ${picked.includes(m) ? "limit-chip-active" : "limit-chip"}`}
          >
            {m}
          </button>
        ))}
      </div>
      {picked.length > 0 && <p className="mt-4 text-sm text-blue-500">{picked.join(" · ")}</p>}
    </div>
  );
}
