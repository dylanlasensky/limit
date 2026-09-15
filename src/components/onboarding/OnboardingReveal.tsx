import React, { useMemo } from "react";
import { scoreProgramStructures, WEEKDAYS } from "@/lib/training/programEngine";
import { calcTargets } from "@/components/limit/nutritionTargets";
interface OnboardingRevealProps {
  data: Record<string, any>;
}
export default function OnboardingReveal({ data }: OnboardingRevealProps) {
  const rec = useMemo(() => scoreProgramStructures(data).best, [data]);
  const targets = useMemo(() => calcTargets({ ...data, days: data.availableDays?.length }), [data]);
  if (!rec) return null;
  const chosen = WEEKDAYS.filter((day) => data.availableDays?.includes(day));
  return (
    <div>
      <section className="rounded-2xl border border-primary/30 bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Your LIMIT plan</p>
        <h2 className="mt-2 text-3xl font-black">{rec.name}</h2>
        <p className="mt-1 text-sm font-bold text-muted-foreground">
          {rec.dayNames.length} DAYS / WEEK
        </p>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Why this fits you
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{rec.why}</p>
      </section>
      <section className="mt-3 rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Your week
        </p>
        <div className="mt-3 space-y-1.5">
          {WEEKDAYS.map((d) => {
            const idx = chosen.indexOf(d);
            const name = idx >= 0 ? rec.dayNames[idx] : "Rest";
            return (
              <div
                key={d}
                className="flex items-center justify-between gap-3 border-b border-border pb-1.5 text-sm last:border-0"
              >
                <span className="w-12 shrink-0 font-bold text-muted-foreground">
                  {d.slice(0, 3).toUpperCase()}
                </span>
                <span className={idx >= 0 ? "text-right font-bold" : "text-muted-foreground"}>
                  {name}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="mt-3 rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Daily nutrition targets
        </p>
        {targets.calorieTarget > 0 && (
          <>
            <p className="mt-2 text-3xl font-black">
              {targets.calorieTarget}{" "}
              <span className="text-base font-bold text-muted-foreground">CAL</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold text-muted-foreground">
              <span>{targets.proteinTarget}g protein</span>
              <span>{targets.carbTarget}g carbs</span>
              <span>{targets.fatTarget}g fat</span>
            </div>
          </>
        )}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {targets.targetExplanation}
        </p>
      </section>
    </div>
  );
}
