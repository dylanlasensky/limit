import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { calculateMuscleRating, emptyRating } from '@/components/limit/muscleRating';
import MuscleRatingPanel from '@/components/limit/MuscleRatingPanel';
import ProgressOverview from '@/components/limit/ProgressOverview';
import WeightProgress from '@/components/limit/WeightProgress';
import SegmentedTabs from '@/components/limit/SegmentedTabs';
import ScreenState from '@/components/limit/ScreenState';
import PullToRefresh from '@/components/limit/PullToRefresh';
import { profileWeightLb } from '@/components/limit/nutritionTargets';

const ranges = { 1: 30, 3: 90, 6: 180, 12: 365, ALL: Infinity };
const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function Progress() {
  const [tab, setTab] = useState('Muscle Rating');
  const [range, setRange] = useState('3');
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['progressData'],
    queryFn: async () => {
      const [weights, profiles, sets, exercises, sessions, snapshots, records] = await Promise.all([
        base44.entities.WeightEntry.list('date', 500),
        base44.entities.UserProfile.list(),
        base44.entities.ExerciseSet.list('-timestamp', 2000),
        base44.entities.Exercise.list(null, 500),
        base44.entities.WorkoutSession.filter({ status: 'completed' }, '-date', 500),
        base44.entities.MuscleRatingSnapshot.list('-date', 100),
        base44.entities.PersonalRecord.list('-date', 500)
      ]);
      return { weights, profile: profiles[0] || {}, sets, exercises, sessions, snapshots, records };
    }
  });
  const addWeight = useMutation({
    mutationFn: weight => base44.entities.WeightEntry.create({ date: localDate(), weight, unit: 'lb' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['progressData'] })
  });

  if (query.isLoading) return <ScreenState loading />;
  if (query.error) return <ScreenState title="Couldn’t load progress" description="Your history is safe. Try loading it again." onAction={() => query.refetch()} />;

  const data = query.data;
  const cutoff = ranges[range] === Infinity ? '0000-00-00' : new Date(Date.now() - ranges[range] * 86400000).toISOString().slice(0, 10);
  const sessions = data.sessions.filter(item => item.date >= cutoff);
  const records = data.records.filter(item => item.date >= cutoff);
  const sets = data.sets.filter(item => sessions.some(session => session.id === item.workoutSessionId));
  const weights = data.weights.filter(item => item.date >= cutoff).map(item => ({
    ...item,
    weight: item.unit === 'kg' ? Math.round(item.weight * 2.20462 * 10) / 10 : item.weight,
    unit: 'lb'
  }));
  const rating = calculateMuscleRating({ ...data, profile: data.profile });
  const current = weights.at(-1)?.weight || Math.round(profileWeightLb(data.profile) * 10) / 10 || null;
  const average = weights.length ? weights.slice(-7).reduce((sum, item) => sum + item.weight, 0) / Math.min(7, weights.length) : 0;

  return (
    <PullToRefresh onRefresh={() => query.refetch()}>
      <div>
        <header className="limit-hero rounded-[2rem] p-5">
          <div className="relative z-10"><p className="limit-kicker">Evolution log</p><h1 className="mt-2 text-4xl font-black italic tracking-[-.04em]">PROGRESS</h1><p className="mt-2 text-sm text-muted-foreground">Proof of the work, signal by signal.</p></div>
        </header>
        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
          {Object.keys(ranges).map(option => (
            <button key={option} onClick={() => setRange(option)} className={`min-h-10 min-w-12 rounded-full px-3 text-xs font-bold ${range === option ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              {option === 'ALL' ? 'ALL' : `${option}M`}
            </button>
          ))}
        </div>
        <SegmentedTabs options={['Overview', 'Muscle Rating', 'Strength', 'Weight']} value={tab} onChange={setTab} label="Progress sections" />

        {tab === 'Overview' && (
          <>
            {sessions.length ? <ProgressOverview sessions={sessions} records={records} sets={sets} /> : <ScreenState title="Your progress starts with one workout" description="Complete your first session and LIMIT will begin tracking consistency, volume, strength, and records." />}
            <h2 className="mb-3 mt-7 text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent records</h2>
            {records.length ? records.slice(0, 5).map(record => (
              <div key={record.id} className="mb-2 flex justify-between rounded-2xl border border-border bg-card p-4 text-sm">
                <div><b>{record.exerciseName}</b><p className="mt-1 text-xs text-muted-foreground">{record.date}</p></div>
                <b className="text-primary">{record.type === 'e1rm' ? `${record.value} lb e1RM` : `${record.value} lb`}</b>
              </div>
            )) : <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">PRs appear after completed working sets beat your previous best.</p>}
          </>
        )}
        {tab === 'Muscle Rating' && <MuscleRatingPanel rating={rating || emptyRating()} snapshots={data.snapshots} />}
        {tab === 'Strength' && (records.length ? (
          <div className="space-y-2">
            {records.map(record => <div key={record.id} className="rounded-2xl border border-border bg-card p-4"><b>{record.exerciseName}</b><p className="mt-1 text-sm text-muted-foreground">{record.type === 'e1rm' ? 'Estimated max' : 'Heaviest set'} · {record.value} lb · {record.date}</p></div>)}
          </div>
        ) : <ScreenState title="No strength trend yet" description="Complete working sets in Live Workout. LIMIT uses valid logged lifts—not random estimates—to build this view." />)}
        {tab === 'Weight' && <WeightProgress weights={weights} current={current} average={average} goal={data.profile.goalWeight} saving={addWeight.isPending} onLog={value => addWeight.mutate(value)} />}
      </div>
    </PullToRefresh>
  );
}