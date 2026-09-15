import React from "react";
import { WEEKDAYS } from "@/lib/training/programEngine";
import type { OnboardingStepProps } from "@/components/limit/OnboardingDiet";
export default function OnboardingSchedule({ data, set }: OnboardingStepProps) {
  const days: string[] = data.availableDays || [];
  const toggle = (d: string) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    if (next.length > 6) return;
    set(
      "availableDays",
      next.sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
    );
  };
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Pick the exact days you can train. LIMIT builds your week around them.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2">
        {WEEKDAYS.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={days.includes(d)}
            disabled={!days.includes(d) && days.length >= 6}
            onClick={() => toggle(d)}
            className={`limit-surface flex min-h-14 w-full items-center justify-between rounded-2xl px-4 py-3 font-bold transition-all ${days.includes(d) ? "border-primary/60 bg-primary/10 text-primary shadow-[inset_3px_0_0_hsl(var(--primary))]" : ""}`}
          >
            {d}
            <span
              aria-hidden="true"
              className={`grid h-6 w-6 place-items-center rounded-full border text-xs ${days.includes(d) ? "border-blue-600 bg-blue-600 text-white" : "border-border text-transparent"}`}
            >
              ✓
            </span>
          </button>
        ))}
      </div>
      <p
        className={`mt-4 text-sm font-bold ${days.length >= 2 ? "text-blue-500" : "text-muted-foreground"}`}
      >
        {days.length} day{days.length === 1 ? "" : "s"} per week
        {days.length < 2 ? " · pick at least 2" : ""}
      </p>
    </div>
  );
}
