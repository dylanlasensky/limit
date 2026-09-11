import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function WorkoutComplete({ summary, onDone }) {
  useEffect(() => {
    if (summary.prs?.length) confetti({ particleCount: 48, spread: 55, origin: { y: .35 }, colors: ['#2563EB', '#F8FAFC'] });
  }, []);
  const mm = Math.floor(summary.durationMinutes / 60), rem = summary.durationMinutes % 60;
  return (
    <motion.main initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex min-h-screen max-w-md flex-col bg-[#09090B] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-white">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-500">Workout complete</p>
      <h1 className="mt-2 text-4xl font-black uppercase tracking-tight">{summary.name}</h1>
      <p className="mt-1 font-mono text-lg tabular-nums text-zinc-400">{mm > 0 ? `${mm}h ${String(rem).padStart(2, '0')}m` : `${rem} min`}</p>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[[summary.workingSets, 'WORKING SETS'], [`${summary.volume.toLocaleString()}`, 'LB VOLUME'], [summary.prs?.length||0, 'PRs']].map(([v, l]) => (
          <div key={l} className="rounded-2xl border border-zinc-800 bg-[#121217] p-4 text-center">
            <p className="text-2xl font-black tabular-nums">{v}</p>
            <p className="mt-1 text-[10px] font-bold tracking-widest text-zinc-500">{l}</p>
          </div>
        ))}
      </div>
      {summary.prs?.length > 0 && (
        <section className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Personal records</p>
          {summary.prs.map((pr, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .3 + i * .15 }}
              className="mt-2 rounded-2xl border border-blue-900/60 bg-blue-950/20 p-4">
              <p className="font-black uppercase">{pr.exerciseName}</p>
              <p className="mt-1 text-sm tabular-nums text-blue-300">
                {pr.type === 'e1rm' ? `e1RM ${pr.value} lb` : `${pr.value} lb`} · {pr.weight} × {pr.reps}
                {pr.previous ? <span className="ml-2 text-zinc-500">was {pr.previous}</span> : null}
              </p>
            </motion.div>
          ))}
        </section>
      )}
      {summary.ratingChanges?.length > 0 && (
        <section className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Muscle rating</p>
          <div className="mt-2 space-y-1.5">
            {summary.ratingChanges.map(([muscle, from, to]) => (
              <div key={muscle} className="flex items-center justify-between rounded-xl bg-[#121217] px-4 py-3 text-sm">
                <span className="font-bold">{muscle}</span>
                <span className="tabular-nums text-blue-400">{from} → {to}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {summary.bestLift&&<section className="mt-6 rounded-2xl border border-zinc-800 bg-[#121217] p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Best lift</p><p className="mt-2 font-bold">{summary.bestLift.name}</p><p className="text-sm text-zinc-400">{summary.bestLift.weight} lb × {summary.bestLift.reps}</p>{summary.previousVolume!=null&&<p className="mt-2 text-xs text-blue-400">{summary.volume>=summary.previousVolume?'+':''}{Math.round(summary.volume-summary.previousVolume).toLocaleString()} lb vs previous session</p>}</section>}{summary.analyticsPending&&<p className="mt-5 text-xs text-zinc-500">Workout saved. PR and Muscle Rating analysis will retry when this summary is opened again.</p>}<div className="mt-auto pt-8">
        <button onClick={onDone} className="h-14 w-full rounded-2xl bg-blue-600 font-bold text-white">DONE</button>
      </div>
    </motion.main>
  );
}