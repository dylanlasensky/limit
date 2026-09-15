import React, { useState } from "react";
import NativeSelect from "@/components/limit/NativeSelect";
import type { OnboardingStepProps } from "@/components/limit/OnboardingDiet";
import { bodyInputErrors, localDateInput } from "@/lib/profile-inputs";
const input = "mt-1 h-12 w-full rounded-xl border border-border bg-transparent px-3";
export default function OnboardingPersonal({ data, set }: OnboardingStepProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = bodyInputErrors(data);
  const field = (key: string) => ({
    "aria-invalid": touched[key] && !!errors[key] ? true : undefined,
    "aria-describedby": touched[key] && errors[key] ? `body-${key}-error` : undefined,
    onBlur: () => setTouched((current) => ({ ...current, [key]: true })),
  });
  const error = (key: string) =>
    touched[key] &&
    errors[key] && (
      <p id={`body-${key}-error`} className="mt-1 text-xs text-destructive">
        {errors[key]}
      </p>
    );
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="onboarding-name">Name</label>
        <input
          id="onboarding-name"
          autoComplete="given-name"
          maxLength={100}
          {...field("name")}
          className={input}
          value={data.name || ""}
          onChange={(e) => set("name", e.target.value)}
        />
        {error("name")}
      </div>
      <div>
        <label htmlFor="onboarding-birth-date">
          Date of birth <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <input
          id="onboarding-birth-date"
          type="date"
          max={localDateInput()}
          autoComplete="bday"
          {...field("birthDate")}
          className={input}
          value={data.birthDate || ""}
          onChange={(e) => set("birthDate", e.target.value)}
        />
        {error("birthDate")}
        <p className="mt-1 text-xs text-muted-foreground">
          Used for adult nutrition estimates. Without it, you can still train and log food without
          automatic targets.
        </p>
      </div>
      <div>
        <label>Sex</label>
        <NativeSelect
          className="mt-1"
          value={data.sex || "female"}
          onChange={(value) => set("sex", value)}
          options={[
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
            { value: "other", label: "Other" },
          ]}
          label="Sex"
        />
      </div>
      <div>
        <label>Height</label>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <label className="text-xs text-muted-foreground">
            <input
              type="number"
              min="3"
              max="8"
              inputMode="numeric"
              {...field("height")}
              className={input}
              value={data.heightFeet || ""}
              onChange={(e) => set("heightFeet", e.target.value)}
            />
            Feet
          </label>
          <label className="text-xs text-muted-foreground">
            <input
              type="number"
              min="0"
              max="11"
              inputMode="numeric"
              {...field("height")}
              className={input}
              value={data.heightInches ?? ""}
              onChange={(e) => set("heightInches", e.target.value)}
            />
            Inches
          </label>
        </div>
        {error("height")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="onboarding-weight">Weight (lb)</label>
          <input
            id="onboarding-weight"
            type="number"
            min="0.1"
            max="1500"
            step="0.1"
            {...field("weight")}
            inputMode="decimal"
            className={input}
            value={data.weightLb || ""}
            onChange={(e) => set("weightLb", e.target.value)}
          />
          {error("weight")}
        </div>
        <div>
          <label htmlFor="onboarding-goal-weight">Goal weight (lb)</label>
          <input
            id="onboarding-goal-weight"
            type="number"
            min="0.1"
            max="1500"
            step="0.1"
            placeholder="Optional"
            {...field("goalWeight")}
            inputMode="decimal"
            className={input}
            value={data.goalWeightLb || ""}
            onChange={(e) => set("goalWeightLb", e.target.value)}
          />
          {error("goalWeight")}
        </div>
      </div>
    </div>
  );
}
