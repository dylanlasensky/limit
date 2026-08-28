import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const draftKey = sessionId => `limit-active-workout:${sessionId}`;
const today = () => new Date().toISOString().slice(0, 10);
const sessionStarts = new Map(); // module-level guard: one session-start per day+date, survives remounts

const startSession = (workoutDayId, day) => {
  const guard = `${workoutDayId}:${today()}`;
  if (!sessionStarts.has(guard)) sessionStarts.set(guard, (async () => {
    const active = await base44.entities.WorkoutSession.filter({ status: 'active' }, '-created_date');
    const existing = active.find(s => s.workoutDayId === workoutDayId && s.date === today());
    if (existing) return existing;
    return base44.entities.WorkoutSession.create({
      workoutDayId, planId: day.planId, name: day.name, date: today(),
      startedAt: new Date().toISOString(), status: 'active', targetMuscles: day.targetMuscles || []
    });
  })().catch(e => { sessionStarts.delete(guard); throw e; }));
  return sessionStarts.get(guard);
};

// Loads the workout day graph, safely starts/resumes ONE session, manages set rows with immediate persistence.
export default function useLiveWorkout(workoutDayId) {
  const [state, setState] = useState({ loading: true, day: null, workoutExercises: [], exercisesById: {}, previousByExercise: {}, session: null, error: null });
  const [rows, setRows] = useState([]);
  const [savingIds, setSavingIds] = useState(new Set());
  const started = useRef(false);
  const client = useQueryClient();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const [day, workoutExercises, exercises] = await Promise.all([
          base44.entities.WorkoutDay.get(workoutDayId),
          base44.entities.WorkoutExercise.filter({ workoutDayId }),
          base44.entities.Exercise.list(null, 500)
        ]);
        workoutExercises.sort((a, b) => (a.order || 0) - (b.order || 0));
        const exercisesById = Object.fromEntries(exercises.map(e => [e.id, e]));
        // resume or create exactly one session (module-level guard prevents duplicate creates)
        const session = await startSession(workoutDayId, day);
        // previous performance: last completed session's working sets per exercise
        const completedSessions = await base44.entities.WorkoutSession.filter({ status: 'completed' }, '-date', 30);
        const completedIds = completedSessions.map(s => s.id);
        const recentSets = await base44.entities.ExerciseSet.list('-timestamp', 400);
        const previousByExercise = {};
        workoutExercises.forEach(we => {
          const mine = recentSets.filter(s => s.exerciseName === we.exerciseName && completedIds.includes(s.workoutSessionId) && +s.reps > 0);
          if (!mine.length) return;
          const lastSession = mine[0].workoutSessionId;
          previousByExercise[we.exerciseName] = mine.filter(s => s.workoutSessionId === lastSession).sort((a, b) => a.setNumber - b.setNumber);
        });
        // rows: saved sets for this session + draft + template blanks
        const savedSets = recentSets.filter(s => s.workoutSessionId === session.id);
        let draft = null;
        try { draft = JSON.parse(localStorage.getItem(draftKey(session.id)) || 'null'); } catch { /* ignore */ }
        const initial = workoutExercises.flatMap(we => Array.from({ length: we.sets || 3 }, (_, i) => {
          const key = `${we.id}:${i + 1}`;
          const saved = savedSets.find(s => s.exerciseName === we.exerciseName && s.setNumber === i + 1);
          const draftRow = draft?.find(r => r.key === key);
          return {
            key, workoutExerciseId: we.id, exerciseId: we.exerciseId, exerciseName: we.exerciseName,
            primaryMuscle: exercisesById[we.exerciseId]?.primaryMuscle || '', setNumber: i + 1,
            weight: saved ? String(saved.weight) : draftRow?.weight || '', reps: saved ? String(saved.reps) : draftRow?.reps || '',
            rir: saved ? (saved.rir ?? '') : draftRow?.rir ?? '', completed: !!saved, savedId: saved?.id || null
          };
        }));
        setRows(initial);
        setState({ loading: false, day, workoutExercises, exercisesById, previousByExercise, session, error: null });
      } catch (e) {
        setState(s => ({ ...s, loading: false, error: 'Could not load this workout.' }));
      }
    })();
  }, [workoutDayId]);

  // draft persistence, session-scoped
  useEffect(() => {
    if (state.session) localStorage.setItem(draftKey(state.session.id), JSON.stringify(rows.filter(r => !r.savedId && (r.weight || r.reps))));
  }, [rows, state.session]);

  const edit = (key, field, value) => setRows(rs => rs.map(r => r.key === key ? { ...r, [field]: value } : r));

  const addSet = workoutExerciseId => setRows(rs => {
    const mine = rs.filter(r => r.workoutExerciseId === workoutExerciseId);
    const last = mine[mine.length - 1];
    return [...rs, { ...last, key: `${workoutExerciseId}:${mine.length + 1}`, setNumber: mine.length + 1, weight: last?.weight || '', reps: '', rir: '', completed: false, savedId: null }];
  });

  // ✓ persists immediately; unchecking deletes the saved set. Returns validation error string or null.
  const toggle = async key => {
    const row = rows.find(r => r.key === key);
    if (!row || !state.session) return null;
    if (row.completed) {
      setRows(rs => rs.map(r => r.key === key ? { ...r, completed: false, savedId: null } : r));
      if (row.savedId) await base44.entities.ExerciseSet.delete(row.savedId);
      return null;
    }
    const weight = +row.weight, reps = +row.reps;
    if (!(reps > 0) || !(weight >= 0) || row.weight === '') return 'Enter weight and reps first.';
    setSavingIds(s => new Set(s).add(key));
    setRows(rs => rs.map(r => r.key === key ? { ...r, completed: true } : r));
    try {
      const payload = {
        workoutSessionId: state.session.id, exerciseId: row.exerciseId, exerciseName: row.exerciseName,
        primaryMuscle: row.primaryMuscle, setNumber: row.setNumber, setType: 'working',
        weight, reps, rir: row.rir === '' ? undefined : +row.rir, completed: true, timestamp: new Date().toISOString()
      };
      const saved = row.savedId ? await base44.entities.ExerciseSet.update(row.savedId, payload) : await base44.entities.ExerciseSet.create(payload);
      setRows(rs => rs.map(r => r.key === key ? { ...r, savedId: saved?.id || row.savedId } : r));
      return null;
    } catch {
      setRows(rs => rs.map(r => r.key === key ? { ...r, completed: false } : r));
      return 'Set couldn’t be saved. Try again.';
    } finally {
      setSavingIds(s => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  const clearDraft = () => state.session && localStorage.removeItem(draftKey(state.session.id));
  const invalidateAll = () => ['activePlan', 'workoutHistory', 'activeSession', 'todaySession', 'muscleRatingData', 'progressRatingData', 'workoutExercises', 'personalRecords'].forEach(k => client.invalidateQueries({ queryKey: [k] }));

  return { ...state, rows, savingIds, edit, addSet, toggle, clearDraft, invalidateAll };
}