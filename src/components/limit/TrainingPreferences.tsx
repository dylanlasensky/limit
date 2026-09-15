import React from "react";
import NativeSelect from "@/components/limit/NativeSelect";
import EquipmentPicker from "@/components/limit/EquipmentPicker";
import OnboardingPriorities from "@/components/onboarding/OnboardingPriorities";
interface TrainingPreferencesProps {
  profile: Record<string, any>;
  onChange: (profile: Record<string, any>) => void;
}
export default function TrainingPreferences({ profile, onChange }: TrainingPreferencesProps) {
  const set = (k: string, v: unknown) => onChange({ ...profile, [k]: v });
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
      <EquipmentPicker value={profile.equipment} onChange={(value) => set("equipment", value)} />
      <details className="mt-4 rounded-xl border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Muscle priorities
          {profile.priorityMuscles?.length
            ? ` · ${profile.priorityMuscles.join(", ")}`
            : " · optional"}
        </summary>
        <div className="mt-3">
          <OnboardingPriorities data={profile} set={set} />
        </div>
      </details>
    </section>
  );
}
