import React from "react";
import NativeSelect from "@/components/limit/NativeSelect";
const equipment = [
  "Full commercial gym",
  "Barbell",
  "Dumbbells",
  "Cable machine",
  "Machines",
  "Bodyweight",
];
interface TrainingPreferencesProps {
  profile: Record<string, any>;
  onChange: (profile: Record<string, any>) => void;
}
export default function TrainingPreferences({ profile, onChange }: TrainingPreferencesProps) {
  const set = (k: string, v: unknown) => onChange({ ...profile, [k]: v }),
    toggle = (x: string) =>
      set(
        "equipment",
        profile.equipment?.includes(x)
          ? profile.equipment.filter((v: string) => v !== x)
          : [...(profile.equipment || []), x]
      );
  return (
    <section className="limit-surface mt-4 rounded-3xl p-5">
      <p className="limit-kicker text-muted-foreground">Training preferences</p>
      <label className="mt-4 block text-xs text-muted-foreground">
        Experience
        <NativeSelect
          className="mt-1"
          value={profile.experienceLevel || "beginner"}
          onChange={(v) => set("experienceLevel", v)}
          options={["beginner", "intermediate", "advanced"]}
          label="Experience"
        />
      </label>
      <label className="mt-4 block text-xs text-muted-foreground">
        Workout duration
        <NativeSelect
          className="mt-1"
          value={String(profile.sessionLength || 60)}
          onChange={(v) => set("sessionLength", +v)}
          options={["30", "45", "60", "75", "90"].map((v) => ({ value: v, label: `${v} minutes` }))}
          label="Workout duration"
        />
      </label>
      <p className="mt-4 text-xs text-muted-foreground">Available equipment</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {equipment.map((x) => (
          <button
            key={x}
            onClick={() => toggle(x)}
            className={`min-h-10 rounded-full border px-3 text-xs font-bold ${profile.equipment?.includes(x) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            {x}
          </button>
        ))}
      </div>
    </section>
  );
}
