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
  const chosen: string[] = data.availableDays || [];
  return (
    <div>
      <section className="rounded-2xl border border-blue-900/60 bg-[#121217] p-5">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-500">
          Your LIMIT plan
        </p>
        <h2 className="mt-2 text-3xl font-black">{rec.name}</h2>
        <p className="mt-1 text-sm font-bold text-zinc-400">{rec.dayNames.length} DAYS / WEEK</p>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
          Why this fits you
        </p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-300">{rec.why}</p>
      </section>
      <section className="mt-3 rounded-2xl border border-zinc-800 bg-[#121217] p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Your week</p>
        <div className="mt-3 space-y-1.5">
          {WEEKDAYS.map((d) => {
            const idx = chosen.indexOf(d);
            const name = idx >= 0 ? rec.dayNames[idx] : "Rest";
            return (
              <div
                key={d}
                className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5 text-sm last:border-0"
              >
                <span className="w-12 font-bold text-zinc-500">{d.slice(0, 3).toUpperCase()}</span>
                <span className={idx >= 0 ? "font-bold" : "text-zinc-600"}>{name}</span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="mt-3 rounded-2xl border border-zinc-800 bg-[#121217] p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Daily nutrition targets
        </p>
        <p className="mt-2 text-3xl font-black">
          {targets.calorieTarget} <span className="text-base font-bold text-zinc-400">CAL</span>
        </p>
        <div className="mt-2 flex gap-4 text-sm font-bold text-zinc-300">
          <span>{targets.proteinTarget}g protein</span>
          <span>{targets.carbTarget}g carbs</span>
          <span>{targets.fatTarget}g fat</span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Estimated from your body, activity, and goal. You can adjust anytime.
        </p>
      </section>
    </div>
  );
}
