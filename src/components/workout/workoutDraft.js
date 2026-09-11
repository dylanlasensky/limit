export const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const draftKey = (userId, workoutDayId) => `limit-workout-v2:${userId}:${workoutDayId}`;
export function readDraft(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value && Array.isArray(value.rows) ? value : null; }
  catch { return null; }
}
export function writeDraft(key, state, rows) {
  localStorage.setItem(key, JSON.stringify({ day: state.day, plan: state.plan, workoutExercises: state.workoutExercises, exercisesById: state.exercisesById, previousByExercise: state.previousByExercise, session: state.session, rows }));
}
export function initialRows(workoutExercises, exercisesById, savedSets, draftRows = []) {
  const rows = [];
  for (const we of workoutExercises) {
    const saved = savedSets.filter(s => s.workoutExerciseId === we.id || (!s.workoutExerciseId && s.exerciseName === we.exerciseName));
    const drafts = draftRows.filter(r => r.workoutExerciseId === we.id);
    const count = Math.max(we.sets || 3, ...saved.map(s => s.setNumber), ...drafts.map(r => r.setNumber));
    for (let number = 1; number <= count; number++) {
      const key = `${we.id}:${number}`, record = saved.find(s => s.setNumber === number), draft = drafts.find(r => r.key === key);
      if (draft?.removed) continue;
      const row = { key, workoutExerciseId: we.id, exerciseId: we.exerciseId, exerciseName: we.exerciseName, primaryMuscle: exercisesById[we.exerciseId]?.primaryMuscle || '', setNumber: number, weight: record ? String(record.weight) : '', reps: record ? String(record.reps) : '', rir: record?.rir ?? '', completed: record?.completed === true, savedId: record?.id || null, revision: record?.revision || '', pending: false };
      rows.push(draft && (draft.pending || !record) ? { ...row, ...draft, savedId: record?.id || draft.savedId, revision: record?.revision || draft.revision || '' } : row);
    }
  }
  return rows;
}