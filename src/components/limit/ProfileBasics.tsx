import React from "react";
import NativeSelect from "@/components/limit/NativeSelect";
import { localDateInput } from "@/lib/profile-inputs";
import { WEEKDAYS } from "@/lib/training/programEngine";
const input = "mt-1 h-11 w-full rounded-xl border border-border bg-transparent px-3 text-base";
interface ProfileBasicsProps {
  profile: Record<string, any>;
  onChange: (profile: Record<string, any>) => void;
}
export default function ProfileBasics({ profile, onChange }: ProfileBasicsProps) {
  const set = (k: string, v: unknown) => onChange({ ...profile, [k]: v });
  const days: string[] = profile.availableDays?.length
    ? profile.availableDays
    : profile.trainingDays || [];
  return (
    <section className="limit-surface mt-5 rounded-3xl p-5">
      <p className="limit-kicker text-muted-foreground">About you</p>
      <h2 className="mt-2 text-xl font-semibold">Body & goal</h2>
      <label className="mt-3 block text-xs text-muted-foreground">
        Name
        <input
          autoComplete="given-name"
          maxLength={100}
          value={profile.name || ""}
          onChange={(e) => set("name", e.target.value)}
          className={input}
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          Date of birth
          <input
            type="date"
            max={localDateInput()}
            autoComplete="bday"
            value={profile.birthDate || ""}
            onChange={(e) => set("birthDate", e.target.value)}
            className={input}
          />
        </label>
        <label className="text-xs text-muted-foreground">
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
        <label className="text-xs text-muted-foreground">
          Current weight (lb)
          <input
            type="number"
            min="0.1"
            max="1500"
            step="0.1"
            inputMode="decimal"
            value={profile.currentWeight || ""}
            onChange={(e) => set("currentWeight", e.target.value)}
            className={input}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Goal weight (lb)
          <input
            type="number"
            min="0.1"
            max="1500"
            step="0.1"
            inputMode="decimal"
            value={profile.goalWeight || ""}
            onChange={(e) => set("goalWeight", e.target.value)}
            className={input}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Height feet
          <input
            type="number"
            min="3"
            max="8"
            value={profile.heightFeet || ""}
            onChange={(e) => set("heightFeet", e.target.value)}
            className={input}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Height inches
          <input
            type="number"
            min="0"
            max="11"
            value={profile.heightInches ?? ""}
            onChange={(e) => set("heightInches", e.target.value)}
            className={input}
          />
        </label>
      </div>
      <label className="mt-3 block text-xs text-muted-foreground">
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
      <label className="mt-3 block text-xs text-muted-foreground">
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
      <fieldset className="mt-4">
        <legend className="text-xs text-muted-foreground">Training days</legend>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose 2–6 days. Rebuild your program below to apply the schedule.
        </p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {WEEKDAYS.map((day) => (
            <button
              type="button"
              key={day}
              aria-label={day}
              aria-pressed={days.includes(day)}
              disabled={!days.includes(day) && days.length >= 6}
              onClick={() => {
                const selected = days.includes(day)
                  ? days.filter((value) => value !== day)
                  : [...days, day];
                const next = WEEKDAYS.filter((value) => selected.includes(value));
                onChange({ ...profile, trainingDays: next, availableDays: next });
              }}
              className={`min-h-11 rounded-xl border text-sm font-medium disabled:opacity-40 ${days.includes(day) ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {days.length} days selected{days.length < 2 ? " · choose at least 2" : ""}
        </p>
      </fieldset>
    </section>
  );
}
