import React, { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

export interface WorkoutPR {
  exerciseName: string;
  type: string;
  value: number;
  weight: number | string;
  reps: number | string;
  previous?: number | string | null;
  [key: string]: any;
}

export interface WorkoutSummary {
  name: string;
  durationMinutes: number;
  workingSets: number;
  volume: number;
  prs?: WorkoutPR[];
  ratingChanges?: Array<[string, React.ReactNode, React.ReactNode]>;
  bestLift?: { name: string; weight: number | string; reps: number | string } | null;
  previousVolume?: number | null;
  analyticsPending?: boolean;
  [key: string]: any;
}

interface WorkoutCompleteProps {
  summary: WorkoutSummary;
  onDone: () => void;
}

export default function WorkoutComplete({ summary, onDone }: WorkoutCompleteProps) {
  useEffect(() => {
    if (summary.prs?.length)
      confetti({
        particleCount: 48,
        spread: 55,
        origin: { y: 0.35 },
        colors: ["#2563EB", "#F8FAFC"],
      });
  }, []);
  const mm = Math.floor(summary.durationMinutes / 60),
    rem = summary.durationMinutes % 60;
  return (
    <motion.main
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="limit-grid relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-foreground"
    >
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
      <p className="limit-kicker relative">Workout complete</p>
      <h1 className="relative mt-3 text-5xl font-black uppercase italic leading-[.9] tracking-[-.055em]">
        {summary.name}
      </h1>
      <p className="mt-1 font-mono text-lg tabular-nums text-zinc-400">
        {mm > 0 ? `${mm}h ${String(rem).padStart(2, "0")}m` : `${rem} min`}
      </p>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {(
          [
            [summary.workingSets, "WORKING SETS"],
            [`${summary.volume.toLocaleString()}`, "LB VOLUME"],
            [summary.prs?.length || 0, "PRs"],
          ] as Array<[React.ReactNode, string]>
        ).map(([v, l]) => (
          <div key={l} className="limit-surface rounded-2xl p-4 text-center">
            <p className="text-2xl font-black tabular-nums">{v}</p>
            <p className="mt-1 text-[10px] font-bold tracking-widest text-zinc-500">{l}</p>
          </div>
        ))}
      </div>
      {(summary.prs?.length ?? 0) > 0 && (
        <section className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Personal records
          </p>
          {summary.prs!.map((pr, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className="limit-hero mt-2 rounded-2xl border-primary/40 p-4"
            >
              <p className="font-black uppercase">{pr.exerciseName}</p>
              <p className="mt-1 text-sm tabular-nums text-primary">
                {pr.type === "e1rm" ? `e1RM ${pr.value} lb` : `${pr.value} lb`} · {pr.weight} ×{" "}
                {pr.reps}
                {pr.previous ? <span className="ml-2 text-zinc-500">was {pr.previous}</span> : null}
              </p>
            </motion.div>
          ))}
        </section>
      )}
      {(summary.ratingChanges?.length ?? 0) > 0 && (
        <section className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Muscle rating</p>
          <div className="mt-2 space-y-1.5">
            {summary.ratingChanges!.map(([muscle, from, to]) => (
              <div
                key={muscle}
                className="flex items-center justify-between rounded-xl bg-[#121217] px-4 py-3 text-sm"
              >
                <span className="font-bold">{muscle}</span>
                <span className="tabular-nums text-primary">
                  {from} → {to}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      {summary.bestLift && (
        <section className="mt-6 rounded-2xl border border-zinc-800 bg-[#121217] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Best lift</p>
          <p className="mt-2 font-bold">{summary.bestLift.name}</p>
          <p className="text-sm text-zinc-400">
            {summary.bestLift.weight} lb × {summary.bestLift.reps}
          </p>
          {summary.previousVolume != null && (
            <p className="mt-2 text-xs text-primary">
              {summary.volume >= summary.previousVolume ? "+" : ""}
              {Math.round(summary.volume - summary.previousVolume).toLocaleString()} lb vs previous
              session
            </p>
          )}
        </section>
      )}
      {summary.analyticsPending && (
        <p className="mt-5 text-xs text-zinc-500">
          Workout saved. PR and Muscle Rating analysis will retry when this summary is opened again.
        </p>
      )}
      <div className="mt-auto pt-8">
        <button
          onClick={onDone}
          className="limit-button h-14 w-full rounded-2xl font-black tracking-wide"
        >
          DONE
        </button>
      </div>
    </motion.main>
  );
}
