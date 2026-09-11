import { base44 } from '@/api/base44Client';

const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const clean = value => (value || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\b(barbell|dumbbell|machine|cable)\b/g, '').replace(/\s+/g, ' ').trim();
const score = (a, b) => {
  const x = clean(a), y = clean(b);
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return .88;
  const left = new Set(x.split(' ')), right = y.split(' ');
  return right.filter(word => left.has(word)).length / Math.max(left.size, right.length);
};
const shape = raw => ({
  name: raw.name || 'Imported Program', notes: raw.notes || '',
  days: (raw.days || []).slice(0, 7).map((day, index) => ({
    key: uid(), name: day.name || `Training Day ${index + 1}`, weekday: Number.isInteger(day.weekday) ? Math.min(6, Math.max(0, day.weekday)) : index,
    coachMandated: !!day.coachMandated, fixedSchedule: !!day.fixedSchedule,
    exercises: (day.exercises || []).map((exercise, order) => ({
      key: uid(), importedName: exercise.name || exercise.importedName || `Exercise ${order + 1}`, exerciseName: exercise.name || exercise.exerciseName || `Exercise ${order + 1}`,
      sets: Math.min(20, Math.max(1, +exercise.sets || 3)), repMin: Math.min(100, Math.max(1, +exercise.repMin || +exercise.reps || 8)),
      repMax: Math.min(100, Math.max(1, +exercise.repMax || +exercise.repMin || +exercise.reps || 12)), restSeconds: Math.min(900, Math.max(15, +exercise.restSeconds || 120)),
      primaryMuscle: exercise.primaryMuscle || '', category: exercise.category || '', equipment: exercise.equipment || '', notes: exercise.notes || '', progressionNotes: exercise.progressionNotes || '', coachMandated: !!exercise.coachMandated
    }))
  }))
});

export const blankRegimen = () => shape({ name: 'My Program', days: [{ name: 'Day 1', weekday: 0, exercises: [{ name: 'First exercise', sets: 3, repMin: 8, repMax: 12, restSeconds: 120 }] }] });

export function matchRegimen(raw, catalog) {
  const draft = shape(raw);
  return { ...draft, days: draft.days.map(day => ({ ...day, exercises: day.exercises.map(exercise => {
    const candidates = catalog.map(item => ({ ...item, matchScore: score(exercise.exerciseName, item.name) })).sort((a, b) => b.matchScore - a.matchScore).slice(0, 4);
    const best = candidates[0], matched = best?.matchScore >= .42;
    return { ...exercise, exerciseId: matched ? best.id : '', exerciseName: matched ? best.name : exercise.exerciseName, primaryMuscle: matched ? best.primaryMuscle : exercise.primaryMuscle || best?.primaryMuscle || '', category: matched ? best.category : exercise.category || 'Imported', equipment: matched ? best.equipment : exercise.equipment || 'Coach program', matchConfidence: Math.round((best?.matchScore || 0) * 100), candidates };
  }) })) };
}

export async function parseRegimen({ text, file }) {
  let fileUri;
  if (file) ({ file_uri: fileUri } = await base44.integrations.Core.UploadPrivateFile({ file }));
  const { data } = await base44.functions.invoke('parseWorkoutRegimen', { text, fileUri });
  return shape(data);
}

export async function loadImportedPlan(planId, catalog) {
  const plan = await base44.entities.WorkoutPlan.get(planId);
  const days = (await base44.entities.WorkoutDay.filter({ planId })).filter(day => !day.isRest).sort((a, b) => a.weekday - b.weekday);
  const rows = days.length ? await base44.entities.WorkoutExercise.filter({ workoutDayId: { $in: days.map(day => day.id) } }) : [];
  const raw = { name: plan.name, notes: plan.importNotes, days: days.map(day => ({ ...day, exercises: rows.filter(row => row.workoutDayId === day.id).sort((a, b) => a.order - b.order).map(row => ({ name: row.importedName || row.exerciseName, ...row })) })) };
  return { plan, draft: matchRegimen(raw, catalog), meta: { sport: plan.sport || '', seasonPhase: plan.seasonPhase || 'not_applicable', coachProvided: !!plan.coachProvided, athleteMode: plan.athleteMode || 'smart_progression', structureLocked: !!plan.structureLocked } };
}

export async function saveImportedRegimen(draft, meta, { sourceType = 'manual', existingId, duplicate = false } = {}) {
  if (!draft.name.trim()) throw new Error('Name your program before saving.');
  if (!draft.days.length) throw new Error('Add at least one training day.');
  if (new Set(draft.days.map(day => day.weekday)).size !== draft.days.length) throw new Error('Each training day needs a different weekday.');
  if (draft.days.some(day => !day.exercises.length)) throw new Error('Every training day needs at least one exercise.');
  if (existingId && !duplicate) {
    const active = await base44.entities.WorkoutSession.filter({ status: 'active' });
    if (active.some(session => session.planId === existingId)) throw new Error('Finish or discard the active workout before editing this plan.');
  }
  const payload = { name: duplicate ? `${draft.name.trim()} Copy` : draft.name.trim(), description: meta.coachProvided ? 'Coach-provided regimen imported into LIMIT' : 'Imported regimen', goal: 'follow existing program', daysPerWeek: draft.days.length, programType: 'imported', recommended: false, active: false, sourceType, sport: meta.sport || '', seasonPhase: meta.seasonPhase, coachProvided: meta.coachProvided, athleteMode: meta.athleteMode, structureLocked: meta.structureLocked, importNotes: draft.notes || '' };
  const plan = await base44.entities.WorkoutPlan.create(payload);
  const byWeekday = new Map(draft.days.map(day => [day.weekday, day]));
  const dayRecords = Array.from({ length: 7 }, (_, weekday) => {
    const day = byWeekday.get(weekday);
    return { planId: plan.id, weekday, name: day?.name || 'Rest', targetMuscles: [...new Set((day?.exercises || []).map(item => item.primaryMuscle).filter(Boolean))], isRest: !day, coachMandated: !!day?.coachMandated, fixedSchedule: !!day?.fixedSchedule };
  });
  const created = await base44.entities.WorkoutDay.bulkCreate(dayRecords);
  const exerciseRows = created.flatMap(day => {
    const source = byWeekday.get(day.weekday);
    return (source?.exercises || []).map((exercise, index) => ({ workoutDayId: day.id, exerciseId: exercise.exerciseId || '', exerciseName: exercise.exerciseName.trim(), order: index + 1, sets: +exercise.sets, repMin: +exercise.repMin, repMax: +exercise.repMax, restSeconds: +exercise.restSeconds, primaryMuscle: exercise.primaryMuscle || 'Other', category: exercise.category || 'Imported', equipment: exercise.equipment || 'Coach program', notes: exercise.notes || '', progressionNotes: exercise.progressionNotes || '', importedName: exercise.importedName || exercise.exerciseName, matchConfidence: +exercise.matchConfidence || 0, coachMandated: !!exercise.coachMandated }));
  });
  if (exerciseRows.length) await base44.entities.WorkoutExercise.bulkCreate(exerciseRows);
  const activePlans = await base44.entities.WorkoutPlan.filter({ active: true });
  await Promise.all(activePlans.map(activePlan => base44.entities.WorkoutPlan.update(activePlan.id, { active: false })));
  return base44.entities.WorkoutPlan.update(plan.id, { active: true });
}