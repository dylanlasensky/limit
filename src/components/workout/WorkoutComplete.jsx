import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import WorkoutShare from '@/components/workout/WorkoutShare';

export default function WorkoutComplete({ summary, onDone }) {
  useEffect(() => {
    navigator.vibrate?.(summary.prs?.length ? [20, 45, 28] : 18);
    if (summary.prs?.length) confetti({ particleCount: 48, spread: 55, origin: { y: .35 }, colors: ['#0A84FF', '#64D2FF', '#F5F5F7'] });
  }, []);
  const mm = Math.floor(summary.durationMinutes / 60), rem = summary.durationMinutes % 60;
  const duration = mm > 0 ? `${mm}h ${String(rem).padStart(2, '0')}m` : `${rem} min`;
  return (
    <motion.main initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      className="limit-grid relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-foreground">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl"/>
      <p className="limit-kicker relative">Session saved</p>
      <h1 className="relative mt-3 text-5xl font-extrabold leading-[.92] tracking-[-.055em]">Workout<br/>complete.</h1>
      <p className="mt-4 text-lg font-bold">{summary.name}</p>
      <p className="mt-1 text-sm tabular-nums text-muted-foreground">{duration}</p>
      <div className="limit-surface mt-8 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl">
        {[[summary.workingSets, 'Working sets'], [`${summary.volume.toLocaleString()}`, 'Lb volume'], [summary.prs?.length||0, 'PRs']].map(([v, l]) => (
          <div key={l} className="p-4 text-center"><p className="text-2xl font-extrabold tabular-nums">{v}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{l}</p></div>
        ))}
      </div>
      {summary.prs?.length > 0 && (
        <section className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Personal records</p>
          {summary.prs.map((pr, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .3 + i * .15 }}
              className="limit-hero mt-2 rounded-2xl border-primary/40 p-4">
              <p className="font-black uppercase">{pr.exerciseName}</p>
              <p className="mt-1 text-sm tabular-nums text-accent">
                {pr.type === 'e1rm' ? `e1RM ${pr.value} lb` : `${pr.value} lb`} · {pr.weight} × {pr.reps}
                {pr.previous ? <span className="ml-2 text-muted-foreground">was {pr.previous}</span> : null}
              </p>
            </motion.div>
          ))}
        </section>
      )}
      {summary.ratingChanges?.length > 0 && (
        <section className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Muscle rating</p>
          <div className="mt-2 space-y-1.5">
            {summary.ratingChanges.map(([muscle, from, to]) => (
              <div key={muscle} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 text-sm">
                <span className="font-bold">{muscle}</span>
                <span className="tabular-nums text-primary">{from} → {to}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {summary.bestLift&&<section className="mt-6 rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Best lift</p><p className="mt-2 font-bold">{summary.bestLift.name}</p><p className="text-sm text-muted-foreground">{summary.bestLift.weight} lb × {summary.bestLift.reps}</p>{summary.previousVolume!=null&&<p className="mt-2 text-xs text-primary">{summary.volume>=summary.previousVolume?'+':''}{Math.round(summary.volume-summary.previousVolume).toLocaleString()} lb vs previous session</p>}</section>}{summary.analyticsPending&&<p className="mt-5 text-xs text-muted-foreground">Workout saved. Progress analysis will finish when this summary reopens.</p>}<div className="mt-auto space-y-2 pt-8">
        <WorkoutShare summary={summary} duration={duration}/>
        <button onClick={onDone} className="limit-button h-14 w-full rounded-2xl font-bold">DONE</button>
      </div>
    </motion.main>
  );
}