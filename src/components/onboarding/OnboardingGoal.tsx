import React from "react";
import { Check, Upload } from "lucide-react";
import type { OnboardingStepProps } from "@/components/limit/OnboardingDiet";
const goals: Array<[string, string, string]> = [
  ["Build Muscle", "gain muscle", "Add size with focused hypertrophy training"],
  ["Get Stronger", "get stronger", "Push your big lifts up with strength work"],
  ["Muscle + Strength", "muscle and strength", "Heavy compounds plus growth volume"],
  ["Lose Fat", "lose fat", "Drop fat while keeping the muscle you have"],
  ["General Fitness", "general fitness", "Balanced training for overall health"],
];
export default function OnboardingGoal({ data, set }: OnboardingStepProps) {
  return (
    <div className="space-y-3">
      {goals.map(([label, value, hint]) => (
        <button
          key={value}
          type="button"
          aria-pressed={data.fitnessGoal === value}
          onClick={() => {
            set("fitnessGoal", value);
            set("importAfterOnboarding", false);
          }}
          className={`limit-surface flex w-full items-center justify-between rounded-3xl p-5 text-left transition-all ${data.fitnessGoal === value ? "border-primary/60 bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary)),0_14px_35px_hsl(var(--primary)/.08)]" : "hover:border-primary/20"}`}
        >
          <span>
            <b className="block">{label}</b>
            <span className="text-sm text-muted-foreground">{hint}</span>
          </span>
          {data.fitnessGoal === value && <Check className="h-5 w-5 shrink-0 text-blue-500" />}
        </button>
      ))}
      <div className="pt-3">
        <p className="limit-kicker mb-2">Already have a plan?</p>
        <button
          type="button"
          aria-pressed={!!data.importAfterOnboarding}
          onClick={() => {
            set("fitnessGoal", "follow existing program");
            set("importAfterOnboarding", true);
          }}
          className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 text-left ${data.importAfterOnboarding ? "border-primary/60 bg-primary/10" : "border-border/70 bg-secondary/40"}`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background">
            <Upload className="h-4 w-4 text-primary" />
          </span>
          <span>
            <b className="block text-sm">Use my own program</b>
            <span className="text-xs text-muted-foreground">Import it after setup</span>
          </span>
          {data.importAfterOnboarding && <Check className="ml-auto h-5 w-5 text-primary" />}
        </button>
      </div>
    </div>
  );
}
