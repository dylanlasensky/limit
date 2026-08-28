import { base44 } from '@/api/base44Client';
import { scoreProgramStructures, slotsFor, targetMusclesFor, scheme, goalKey, exerciseBudget, WEEKDAYS } from '@/lib/training/programEngine';
import { selectExercise, equipmentPool } from '@/lib/training/exerciseSelection';

export const buildDayExercises = (dayName, profile, exercises) => {
  const goal = goalKey(profile.fitnessGoal), allowed = equipmentPool(profile), used = new Set(), out = [];
  const budget = exerciseBudget(profile.sessionLength);
  const variant = /\bB\b|Hypertrophy/.test(dayName) ? 1 : 0;
  for (const slot of slotsFor(dayName, profile)) {
    if (out.length >= budget) break;
    const ex = selectExercise(slot, exercises, used, allowed, slot.role === 'main' || slot.role === 'main_strength' ? 0 : variant);
    if (!ex) continue;
    used.add(ex.id);
    const s = scheme(goal, slot.role, profile.experienceLevel || 'beginner');
    out.push({ exerciseId: ex.id, exerciseName: ex.name, order: out.length + 1, sets: s.sets, repMin: s.repMin, repMax: s.repMax, restSeconds: s.rest });
  }
  return out;
};

export const estimateMinutes = workoutExercises => Math.round(workoutExercises.reduce((a, x) => a + (x.sets || 3) * ((x.restSeconds || 120) + 45), 0) / 60) + 6;

// Creates the full plan → days → exercises graph. Deactivates any previous active plan. History untouched.
export async function createPersonalizedPlan(profile, recommendation) {
  const exercises = await base44.entities.Exercise.list(null, 500);
  const rec = recommendation || scoreProgramStructures(profile).best;
  const old = await base44.entities.WorkoutPlan.filter({ active: true });
  await Promise.all(old.map(p => base44.entities.WorkoutPlan.update(p.id, { active: false })));
  const plan = await base44.entities.WorkoutPlan.create({
    name: rec.name, description: rec.why, goal: profile.fitnessGoal, daysPerWeek: rec.dayNames.length,
    programType: rec.key, sessionDurationTarget: +profile.sessionLength || 60,
    priorityMuscles: profile.priorityMuscles || [], recommended: true, active: true
  });
  const chosen = (profile.availableDays?.length ? profile.availableDays : WEEKDAYS.slice(0, rec.dayNames.length))
    .map(d => WEEKDAYS.indexOf(d)).filter(i => i >= 0).sort((a, b) => a - b).slice(0, rec.dayNames.length);
  while (chosen.length < rec.dayNames.length) { chosen.push(WEEKDAYS.findIndex((_, i) => !chosen.includes(i))); chosen.sort((a, b) => a - b); }
  const dayRecords = Array.from({ length: 7 }, (_, weekday) => {
    const idx = chosen.indexOf(weekday);
    const name = idx >= 0 ? rec.dayNames[idx] : 'Rest';
    return { planId: plan.id, weekday, name, targetMuscles: idx >= 0 ? targetMusclesFor(name) : [], isRest: idx < 0 };
  });
  const createdDays = await base44.entities.WorkoutDay.bulkCreate(dayRecords);
  const workoutExercises = createdDays.flatMap(day => day.isRest ? [] : buildDayExercises(day.name, profile, exercises).map(x => ({ ...x, workoutDayId: day.id })));
  if (workoutExercises.length) await base44.entities.WorkoutExercise.bulkCreate(workoutExercises);
  return plan;
}