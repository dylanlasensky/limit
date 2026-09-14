import React from "react";
import NativeSelect from "@/components/limit/NativeSelect";
const input = "mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-transparent px-3 text-base";
interface ProfileBasicsProps {
  profile: Record<string, any>;
  onChange: (profile: Record<string, any>) => void;
}
export default function ProfileBasics({ profile, onChange }: ProfileBasicsProps) {
  const set = (k: string, v: unknown) => onChange({ ...profile, [k]: v });
  return (
    <section className="limit-surface mt-5 rounded-3xl p-5">
      <p className="limit-kicker text-muted-foreground">Foundation</p>
      <h2 className="mt-2 text-xl font-black">Body & goal</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-zinc-400">
          Date of birth
          <input
            type="date"
            value={profile.birthDate || ""}
            onChange={(e) => set("birthDate", e.target.value)}
            className={input}
          />
        </label>
        <label className="text-xs text-zinc-400">
          Sex
          <NativeSelect
            className="mt-1"
            value={profile.sex || "female"}
            onChange={(value) => set("sex", value)}
            options={[
              { value: "female", label: "Female" },
              { value: "male", label: "Male" },
              { value: "other", label: "Other" },
            ]}
            label="Sex"
          />
        </label>
        <label className="text-xs text-zinc-400">
          Current weight (lb)
          <input
            type="number"
            value={profile.currentWeight || ""}
            onChange={(e) => set("currentWeight", +e.target.value)}
            className={input}
          />
        </label>
        <label className="text-xs text-zinc-400">
          Goal weight (lb)
          <input
            type="number"
            value={profile.goalWeight || ""}
            onChange={(e) => set("goalWeight", +e.target.value)}
            className={input}
          />
        </label>
        <label className="text-xs text-zinc-400">
          Height feet
          <input
            type="number"
            min="3"
            max="8"
            value={profile.heightFeet || ""}
            onChange={(e) => set("heightFeet", +e.target.value)}
            className={input}
          />
        </label>
        <label className="text-xs text-zinc-400">
          Height inches
          <input
            type="number"
            min="0"
            max="11"
            value={profile.heightInches ?? ""}
            onChange={(e) => set("heightInches", +e.target.value)}
            className={input}
          />
        </label>
      </div>
      <label className="mt-3 block text-xs text-zinc-400">
        Goal
        <NativeSelect
          className="mt-1"
          value={profile.fitnessGoal || "general fitness"}
          onChange={(value) => set("fitnessGoal", value)}
          options={[
            "gain muscle",
            "lose weight",
            "maintain weight",
            "increase strength",
            "general fitness",
          ]}
          label="Goal"
        />
      </label>
      <label className="mt-3 block text-xs text-zinc-400">
        Activity
        <NativeSelect
          className="mt-1"
          value={profile.activityLevel || "moderate"}
          onChange={(value) => set("activityLevel", value)}
          options={[
            { value: "low", label: "Mostly seated" },
            { value: "moderate", label: "Moderately active" },
            { value: "high", label: "Very active" },
          ]}
          label="Activity"
        />
      </label>
      <label className="mt-3 block text-xs text-zinc-400">
        Training days per week
        <input
          type="range"
          min="2"
          max="6"
          value={profile.trainingDays?.length || 3}
          onChange={(e) =>
            set(
              "trainingDays",
              Array.from(
                { length: +e.target.value },
                (_, i) => ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]
              )
            )
          }
          className="mt-2 w-full accent-blue-600"
        />
        <span className="block text-center text-xl font-black">
          {profile.trainingDays?.length || 3}
        </span>
      </label>
    </section>
  );
}
