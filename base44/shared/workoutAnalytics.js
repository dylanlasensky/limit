import { ownerFilter } from './workoutAccess.js';
const muscles = ['Chest','Shoulders','Back','Biceps','Triceps','Quads','Hamstrings','Glutes','Calves','Core'];
const aliases = { 'Front delts':'Shoulders','Side delts':'Shoulders','Rear delts':'Shoulders',Lats:'Back','Upper back':'Back','Lower back':'Back',Traps:'Back','Abs/core':'Core',Forearms:'Biceps' };
const e1rm = r => +r.weight * (+r.reps === 1 ? 1 : 1 + +r.reps / 30);
export function validSet(r) { return r.completed === true && Number.isFinite(+r.weight) && +r.weight >= 0 && +r.weight <= 2500 && Number.isInteger(+r.reps) && +r.reps > 0 && +r.reps <= 100; }
export function personalBests(sets, records) {
  const prs = [];
  for (const name of new Set(sets.filter(validSet).filter(r => r.setType !== 'warmup').map(r => r.exerciseName))) {
    const rows = sets.filter(r => validSet(r) && r.exerciseName === name && r.setType !== 'warmup');
    const heavy = rows.reduce((a,b) => +a.weight >= +b.weight ? a : b);
    const lowRep = rows.filter(r => +r.reps <= 12 && +r.weight > 0);
    const best = lowRep.length ? lowRep.reduce((a,b) => e1rm(a) >= e1rm(b) ? a : b) : null;
    for (const [type, row, value] of [['weight',heavy,+heavy.weight],['e1rm',best,best ? Math.round(e1rm(best)) : 0]]) {
      if (!row || value <= 0) continue;
      const old = records.filter(r => r.type === type && (r.exerciseId && row.exerciseId ? r.exerciseId === row.exerciseId : r.exerciseName === name)).sort((a,b) => b.value - a.value)[0];
      if (!old || value > old.value) prs.push({ exerciseName:name, exerciseId:row.exerciseId, type, value, weight:+row.weight, reps:+row.reps, previous:old?.value ?? null, existingId:old?.id ?? null });
    }
  }
  return prs;
}
const tier = (score,sessions,exercises) => score >= 85 && sessions >= 5 && exercises >= 2 ? 'Elite' : score >= 65 && sessions >= 3 && exercises >= 2 ? 'Advanced' : score >= 40 && sessions >= 2 ? 'Intermediate' : 'Beginner';
export function makeRating(sets, exercises, profile, weights) {
  const last = weights[0];
  const bw = last ? +last.weight * (last.unit === 'kg' ? 2.20462 : 1) : +profile.currentWeight * (profile.measurementSystemVersion === 'us_v1' || profile.units === 'imperial' ? 1 : 2.20462);
  const buckets = Object.fromEntries(muscles.map(m => [m, new Map()]));
  if (bw > 0) for (const row of sets.filter(validSet).filter(r => r.setType !== 'warmup' && +r.reps <= 12)) {
    const ex = exercises.find(e => e.id === row.exerciseId || e.name === row.exerciseName);
    const muscle = aliases[ex?.primaryMuscle || row.primaryMuscle] || ex?.primaryMuscle || row.primaryMuscle;
    if (!buckets[muscle]) continue;
    const name = row.exerciseName || '';
    const bodyweight = /pull-up|chin-up|push-up|dip/i.test(name);
    let elite = /deadlift/i.test(name) ? 2.3 : /squat/i.test(name) ? 2.15 : /bench/i.test(name) ? 1.75 : /hip thrust/i.test(name) ? 2.4 : /row/i.test(name) ? 1.45 : /press/i.test(name) ? 1.2 : .6;
    if (bodyweight) elite = 1.5;
    const effective = bodyweight ? (bw + +row.weight) * (1 + +row.reps / 40) : e1rm(row) * (ex?.equipment === 'Dumbbell' ? 2 : 1);
    const kind = ex?.category === 'Isolation' ? 'isolation' : ['Machine','Cable'].includes(ex?.equipment) ? 'machine' : bodyweight ? 'bodyweight' : 'compound';
    const score = Math.min(kind === 'isolation' ? 64 : kind === 'machine' ? 78 : 100, effective / bw / elite * 100);
    const key = `${row.workoutSessionId}:${row.exerciseId || name}`;
    const current = buckets[muscle].get(key);
    if (!current || score > current.score) buckets[muscle].set(key, { score, session:row.workoutSessionId, exercise:name, load:+row.weight, reps:+row.reps, e1rm:Math.round(effective), kind });
  }
  const details = {};
  for (const m of muscles) {
    const rows = [...buckets[m].values()], sessions = new Set(rows.map(r => r.session)).size, names = [...new Set(rows.map(r => r.exercise))];
    const ranked = rows.sort((a,b) => b.score - a.score), confidence = Math.min(100, sessions * 15 + names.length * 10);
    const top = ranked.slice(0,5), raw = top.length ? top.reduce((a,r) => a+r.score,0)/top.length : 0;
    const score = Math.round(raw * (.72 + .28 * confidence / 100));
    details[m] = { score, level:tier(score,sessions,names.length), confidence, sessions, exercises:names, sets:sets.filter(r => names.includes(r.exerciseName)).length, best:ranked.slice(0,3) };
  }
  const covered = Object.values(details).filter(r => r.sessions >= 2);
  const overallScore = Math.round(Object.values(details).reduce((a,r) => a+r.score,0)/muscles.length);
  const overallLevel = covered.length >= 5 ? tier(overallScore,new Set(sets.map(r => r.workoutSessionId)).size,covered.length) : overallScore >= 40 && covered.length >= 2 ? 'Intermediate' : 'Beginner';
  return { overallScore,overallLevel,details,muscleScores:Object.fromEntries(muscles.map(m => [m,details[m].score])),muscleLevels:Object.fromEntries(muscles.map(m => [m,details[m].level])),confidence:Object.fromEntries(muscles.map(m => [m,details[m].confidence])) };
}
export async function finishAnalytics(client, user, session, profile, assertLock) {
  const db = client.asServiceRole.entities, filter = ownerFilter(user.id), summary = session.completionSummary;
  for (const pr of summary.prs) {
    await assertLock();
    const records = await db.PersonalRecord.filter({ ...filter, exerciseName:pr.exerciseName, type:pr.type }, '-value', 100);
    const old = records.find(r => !r.exerciseId || r.exerciseId === pr.exerciseId);
    if (old && old.value >= pr.value) continue;
    const payload = { ownerId:user.id,workoutSessionId:session.id,exerciseId:pr.exerciseId,exerciseName:pr.exerciseName,type:pr.type,value:pr.value,weight:pr.weight,reps:pr.reps,date:session.date };
    if (old) await db.PersonalRecord.update(old.id,payload); else await db.PersonalRecord.create(payload);
  }
  const existing = await db.MuscleRatingSnapshot.filter({ ...filter, workoutSessionId:session.id }, 'created_date', 1);
  let snapshot = existing[0], changes = summary.ratingChanges || [];
  if (!snapshot) {
    const [sessions,exercises,weights,previous] = await Promise.all([db.WorkoutSession.filter({...filter,status:'completed'},'-date',100),db.Exercise.list(null,500),db.WeightEntry.filter({created_by_id:user.id},'-date',1),db.MuscleRatingSnapshot.filter(filter,'-date',1)]);
    const sets = await db.ExerciseSet.filter({...filter,workoutSessionId:{$in:sessions.map(s=>s.id)},completed:true},'-timestamp',2000);
    const rating = makeRating(sets,exercises,profile,weights);
    changes = Object.entries(rating.muscleScores).map(([name,to])=>[name,previous[0]?.muscleScores?.[name],to]).filter(([,from,to])=>from!=null&&to>from).slice(0,4);
    await assertLock();
    snapshot = await db.MuscleRatingSnapshot.create({...rating,date:session.completedAt,ownerId:user.id,workoutSessionId:session.id});
  }
  await assertLock();
  const updated = { ...summary, ratingChanges:changes, analyticsPending:false };
  await db.WorkoutSession.update(session.id,{ analyticsStatus:'complete',completionSummary:updated });
  return updated;
}