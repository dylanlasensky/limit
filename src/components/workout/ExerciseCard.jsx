import React from 'react';
import SetRow from '@/components/workout/SetRow';
import { suggestProgression } from '@/lib/training/e1rm';

export default function ExerciseCard({ workoutExercise, exercise, rows, previousSets, onEdit, onToggle, onAddSet, savingIds }) {
  const suggestion = suggestProgression(previousSets, workoutExercise.repMin, workoutExercise.repMax);
  const doneCount = rows.filter(r => r.completed).length;
  return (
    <section className="mt-5 rounded-2xl border border-zinc-800/80 bg-[#121217] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-black uppercase tracking-tight">{workoutExercise.exerciseName}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {exercise?.primaryMuscle || ''} · {workoutExercise.sets} × {workoutExercise.repMin}–{workoutExercise.repMax} · rest {Math.round((workoutExercise.restSeconds || 120) / 60 * 10) / 10} min
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${doneCount >= workoutExercise.sets ? 'bg-blue-600/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}>{doneCount}/{workoutExercise.sets}</span>
      </div>
      {previousSets?.length > 0 && (
        <p className="mt-2 text-xs text-zinc-500">LAST TIME <span className="ml-1 font-bold tabular-nums text-zinc-300">{previousSets.slice(0, 3).map(s => `${s.weight}×${s.reps}`).join(' · ')}</span></p>
      )}
      {suggestion && <p className="mt-1 text-xs font-semibold text-blue-400">SUGGESTED · {suggestion.weight} lb — {suggestion.note}</p>}
      <div className="mt-4 grid grid-cols-[28px_64px_1fr_1fr_44px_44px] gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-600">
        <span>Set</span><span>Prev</span><span>Lb</span><span>Reps</span><span>RIR</span><span></span>
      </div>
      {rows.map(row => (
        <SetRow key={row.key} row={row} previous={previousSets?.[row.setNumber - 1] || previousSets?.[previousSets.length - 1]}
          saving={savingIds.has(row.key)}
          onEdit={(k, v) => onEdit(row.key, k, v)} onToggle={() => onToggle(row.key)} />
      ))}
      <button onClick={onAddSet} className="mt-3 h-10 w-full rounded-xl border border-dashed border-zinc-700 text-xs font-bold text-zinc-500">+ ADD SET</button>
    </section>
  );
}