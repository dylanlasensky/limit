import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useLiveWorkout from '@/hooks/use-live-workout';
import ExerciseCard from '@/components/workout/ExerciseCard';
import RestTimer from '@/components/workout/RestTimer';
import WorkoutComplete from '@/components/workout/WorkoutComplete';
import { detectPRs } from '@/lib/training/e1rm';
import { calculateMuscleRating, snapshotPayload } from '@/components/limit/muscleRating';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const Elapsed = ({ startedAt }) => {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((Date.now() - new Date(startedAt)) / 1000));
  return <span className="font-mono tabular-nums">{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>;
};

export default function LiveWorkout() {
  const { workoutDayId } = useParams();
  const nav = useNavigate();
  const live = useLiveWorkout(workoutDayId);
  const [rest, setRest] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [summary, setSummary] = useState(null);

  if (live.loading) return (
    <main className="mx-auto min-h-screen max-w-md bg-[#09090B] px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-900" />
      {[0, 1, 2].map(i => <div key={i} className="mt-5 h-44 animate-pulse rounded-2xl bg-zinc-900/70" />)}
    </main>
  );
  if (live.error || !live.workoutExercises.length) return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-[#09090B] px-6 text-center text-white">
      <p className="text-lg font-black">{live.error || 'This workout has no exercises yet.'}</p>
      <p className="mt-2 text-sm text-zinc-500">{live.error ? 'Check your connection and try again.' : 'Rebuild your program from Profile to populate it.'}</p>
      <button onClick={() => nav('/workout')} className="mt-6 h-12 rounded-xl bg-blue-600 px-6 font-bold text-white">BACK TO WORKOUT</button>
    </main>
  );
  if (summary) return <WorkoutComplete summary={summary} onDone={() => nav('/workout')} />;

  const doneExercises = live.workoutExercises.filter(we => live.rows.some(r => r.workoutExerciseId === we.id && r.completed)).length;

  const handleToggle = async key => {
    const row = live.rows.find(r => r.key === key);
    const wasCompleted = row?.completed;
    const err = await live.toggle(key);
    setInlineError(err || '');
    if (!err && !wasCompleted) {
      const we = live.workoutExercises.find(x => x.id === row.workoutExerciseId);
      setRest(Date.now() + (we?.restSeconds || 120) * 1000);
    }
  };

  const finish = async () => {
    if (finishing) return;
    setFinishing(true); setFinishError(false);
    try {
      const completedRows = live.rows.filter(r => r.completed && r.savedId);
      const volume = Math.round(completedRows.reduce((a, r) => a + (+r.weight || 0) * (+r.reps || 0), 0));
      const durationMinutes = Math.max(1, Math.round((Date.now() - new Date(live.session.startedAt)) / 60000));
      // core save — this must succeed
      let prs = [];
      try {
        const records = await base44.entities.PersonalRecord.list(null, 500);
        prs = detectPRs(completedRows, records);
      } catch { /* PRs optional */ }
      await base44.entities.WorkoutSession.update(live.session.id, {
        status: 'completed', completedAt: new Date().toISOString(), durationMinutes,
        totalVolume: volume, setCount: completedRows.length, prCount: prs.length
      });
      // optional post-processing — never lose the workout over these
      let ratingChanges = [];
      try {
        const date = new Date().toISOString().slice(0, 10);
        await Promise.all(prs.map(pr => pr.existingId
          ? base44.entities.PersonalRecord.update(pr.existingId, { value: pr.value, weight: pr.weight, reps: pr.reps, date, exerciseId: pr.exerciseId })
          : base44.entities.PersonalRecord.create({ exerciseId: pr.exerciseId, exerciseName: pr.exerciseName, type: pr.type, value: pr.value, weight: pr.weight, reps: pr.reps, date })));
        const [allSets, exercises, sessions, profiles, weights, previous] = await Promise.all([
          base44.entities.ExerciseSet.list('-timestamp', 500), base44.entities.Exercise.list(null, 500),
          base44.entities.WorkoutSession.list('-date', 100), base44.entities.UserProfile.list(),
          base44.entities.WeightEntry.list('-date', 30), base44.entities.MuscleRatingSnapshot.list('-date', 1)
        ]);
        const rating = calculateMuscleRating({ sets: allSets, exercises, sessions, profile: profiles[0] || {}, weights });
        await base44.entities.MuscleRatingSnapshot.create(snapshotPayload(rating, live.session.id));
        ratingChanges = Object.entries(rating.muscles)
          .map(([name, m]) => [name, previous[0]?.muscleScores?.[name], m.score])
          .filter(([, from, to]) => from != null && to > from).slice(0, 4);
      } catch { /* rating optional */ }
      live.clearDraft();
      live.invalidateAll();
      setSummary({ name: live.day.name, durationMinutes, workingSets: completedRows.length, volume, prs: prs.filter(p => p.type === 'e1rm' || !prs.some(x => x.exerciseName === p.exerciseName && x.type === 'e1rm')), ratingChanges });
    } catch {
      setFinishing(false);
      setFinishError(true);
    }
  };

  const discard = async () => {
    live.clearDraft();
    await base44.entities.WorkoutSession.update(live.session.id, { status: 'skipped', completedAt: new Date().toISOString() });
    live.invalidateAll();
    nav('/workout');
  };

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#09090B] px-4 pb-36 pt-[max(1rem,env(safe-area-inset-top))] text-white">
      <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between gap-3 bg-[#09090B]/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={() => setCancelOpen(true)} aria-label="Cancel workout" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-900"><X className="h-5 w-5" /></button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-500">Live workout · <Elapsed startedAt={live.session.startedAt} /></p>
            <h1 className="truncate text-xl font-black uppercase">{live.day.name}</h1>
          </div>
        </div>
        <button onClick={finish} disabled={finishing}
          className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition-transform active:scale-[.98] disabled:opacity-60">
          {finishing ? 'FINISHING…' : 'Finish'}
        </button>
      </header>
      <p className="mt-1 text-xs font-bold text-zinc-500">{doneExercises} / {live.workoutExercises.length} EXERCISES</p>
      {inlineError && <p className="mt-3 rounded-xl border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-300">{inlineError}</p>}
      {finishError && (
        <div className="mt-3 rounded-xl border border-red-900 bg-red-950/40 p-4">
          <p className="text-sm font-bold text-red-300">Workout couldn’t be saved.</p>
          <p className="mt-1 text-xs text-red-400/80">Your sets are still safe.</p>
          <button onClick={finish} className="mt-3 h-10 rounded-lg bg-red-600 px-4 text-sm font-bold text-white">TRY AGAIN</button>
        </div>
      )}
      {live.workoutExercises.map(we => (
        <ExerciseCard key={we.id} workoutExercise={we} exercise={live.exercisesById[we.exerciseId]}
          rows={live.rows.filter(r => r.workoutExerciseId === we.id)}
          previousSets={live.previousByExercise[we.exerciseName]}
          savingIds={live.savingIds}
          onEdit={live.edit} onToggle={handleToggle} onAddSet={() => live.addSet(we.id)} />
      ))}
      {rest && <RestTimer endsAt={rest} onAdjust={d => setRest(r => r + d * 1000)} onSkip={() => setRest(null)} />}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="max-w-sm rounded-2xl border-zinc-800 bg-zinc-900 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this workout?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">Sets you already checked off stay saved, but this workout won’t count as completed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white">Keep training</AlertDialogCancel>
            <AlertDialogAction onClick={discard} className="bg-red-600 text-white hover:bg-red-700">Discard workout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}