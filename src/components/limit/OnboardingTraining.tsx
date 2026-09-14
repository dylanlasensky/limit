import React from "react";
import type { OnboardingStepProps } from "@/components/limit/OnboardingDiet";
const levels: Array<[string, string, string]> = [
  ["beginner", "Beginner", "New or returning after a long break"],
  ["intermediate", "Intermediate", "1–3 years of consistent training"],
  ["advanced", "Advanced", "3+ years, close to your potential"],
];
const lengths = [30, 45, 60, 75, 90];
const equipmentOptions = [
  "Full commercial gym",
  "Barbell + rack",
  "Dumbbells",
  "Cables",
  "Machines",
  "Bodyweight only",
];
const activities: Array<[string, string]> = [
  ["low", "Mostly sitting"],
  ["moderate", "On my feet some of the day"],
  ["high", "Active job / lots of movement"],
];
export default function OnboardingTraining({ data, set }: OnboardingStepProps) {
  const equipment: string[] = data.equipment || [];
  const toggleEq = (x: string) =>
    set("equipment", equipment.includes(x) ? equipment.filter((e) => e !== x) : [...equipment, x]);
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Experience
        </p>
        <div className="mt-2 space-y-2">
          {levels.map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => set("experienceLevel", value)}
              className={`w-full rounded-xl border p-3 text-left ${data.experienceLevel === value ? "border-blue-600 bg-blue-600/10" : "border-border"}`}
            >
              <b className="block text-sm">{label}</b>
              <span className="text-xs text-muted-foreground">{hint}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Session length
        </p>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {lengths.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => set("sessionLength", l)}
              className={`h-12 rounded-xl border text-sm font-bold ${+data.sessionLength === l ? "border-blue-600 bg-blue-600/10 text-blue-500" : "border-border"}`}
            >
              {l === 90 ? "90+" : l}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Minutes per workout</p>
      </section>
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Equipment
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {equipmentOptions.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => toggleEq(x)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${equipment.includes(x) ? "border-blue-600 bg-blue-600/10 text-blue-500" : "border-border"}`}
            >
              {x}
            </button>
          ))}
        </div>
      </section>
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Daily activity outside the gym
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {activities.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => set("activityLevel", value)}
              className={`h-12 rounded-xl border px-4 text-left text-sm font-semibold ${data.activityLevel === value ? "border-blue-600 bg-blue-600/10 text-blue-500" : "border-border"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
