import React from "react";
import NativeSelect from "@/components/limit/NativeSelect";
import EquipmentPicker from "@/components/limit/EquipmentPicker";
import OnboardingPriorities from "@/components/onboarding/OnboardingPriorities";
import { normalizeEquipmentPreferences } from "@/lib/training/equipmentPreferences";
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
      <div className="mt-5 rounded-2xl border border-border p-4">
        <p className="text-sm font-bold">Your gyms</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Save the gear available at Campus, Home or Travel. Choosing one during a workout only
          changes that session; you review each replacement.
        </p>
        {(profile.equipmentProfiles || []).map((gym: any, index: number) => (
          <div key={gym.id} className="mt-4 rounded-xl border border-border p-3">
            <label className="block text-xs font-semibold">
              Gym name
              <input
                aria-label={`Gym ${index + 1} name`}
                className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3 text-base"
                maxLength={40}
                value={gym.name}
                onChange={(event) =>
                  set(
                    "equipmentProfiles",
                    profile.equipmentProfiles.map((item: any) =>
                      item.id === gym.id ? { ...item, name: event.target.value } : item
                    )
                  )
                }
              />
            </label>
            <div className="mt-3">
              <EquipmentPicker
                value={gym.equipment}
                onChange={(equipment) =>
                  set(
                    "equipmentProfiles",
                    profile.equipmentProfiles.map((item: any) =>
                      item.id === gym.id ? { ...item, equipment } : item
                    )
                  )
                }
              />
            </div>
            <button
              type="button"
              className="mt-2 min-h-11 text-xs font-bold text-destructive"
              onClick={() =>
                set(
                  "equipmentProfiles",
                  profile.equipmentProfiles.filter((item: any) => item.id !== gym.id)
                )
              }
            >
              Remove {gym.name || "gym"}
            </button>
          </div>
        ))}
        {(profile.equipmentProfiles || []).length < 10 && (
          <button
            type="button"
            className="mt-3 min-h-11 rounded-xl bg-secondary px-4 text-sm font-bold"
            onClick={() =>
              set("equipmentProfiles", [
                ...(profile.equipmentProfiles || []),
                {
                  id: crypto.randomUUID(),
                  name: "",
                  equipment: normalizeEquipmentPreferences(profile.equipment).length
                    ? normalizeEquipmentPreferences(profile.equipment)
                    : ["Bodyweight only"],
                },
              ])
            }
          >
            Add a gym
          </button>
        )}
      </div>
      <label className="mt-5 block text-sm font-medium">
        Movement limitations · optional
        <input
          className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-3 text-base"
          maxLength={200}
          value={(profile.injuries || []).join(", ")}
          onChange={(e) => set("injuries", e.target.value ? [e.target.value] : [])}
          placeholder="For example, a movement you were told to avoid"
        />
        <span className="mt-2 block text-xs font-normal text-muted-foreground">
          The coach will pause automatic new plans while limitations are listed.
        </span>
      </label>
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
