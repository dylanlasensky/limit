import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { fail, owned, ownerFilter, localDate, withWorkoutLock } from '../../shared/workoutAccess.js';
import { validSet, personalBests, finishAnalytics } from '../../shared/workoutAnalytics.js';

export default async function(req) {
  try {
    const client = createClientFromRequest(req), user = await client.auth.me();
    if (!user) return Response.json({ error:'Sign in to continue.' },{status:401});
    const input = await req.json();
    if (!['start','saveSet','finish','discard','check'].includes(input?.action)) fail('Unknown workout action.');
    if (input.action === 'check') return Response.json({ ok:true, localDate:localDate(input.timezone), authenticated:true });
    const result = await withWorkoutLock(client,user,async (assertLock,profile) => {
      const db = client.asServiceRole.entities, filter = ownerFilter(user.id);
      if (input.action === 'start') {
        if (typeof input.workoutDayId !== 'string') fail('Choose a workout.');
        const day = await db.WorkoutDay.get(input.workoutDayId);
        if (!owned(day,user.id)) fail('Workout not found.',404);
        if (day.isRest) fail('This is a recovery day.');
        const plan = await db.WorkoutPlan.get(day.planId);
        if (!owned(plan,user.id)) fail('Workout not found.',404);
        const date = localDate(input.timezone);
        const active = await db.WorkoutSession.filter({...filter,status:'active'},'created_date',100);
        if (active.length) return { session:active[0], ...(active[0].workoutDayId !== day.id ? { redirectWorkoutDayId:active[0].workoutDayId } : {}) };
        const finished = await db.WorkoutSession.filter({...filter,workoutDayId:day.id,date,status:'completed'},'created_date',1);
        if (finished.length) return { session:finished[0] };
        if (!plan.active) fail('This program is no longer active. Open your current schedule.',409);
        const exercises = await db.WorkoutExercise.filter({created_by_id:user.id,workoutDayId:day.id},'order',100);
        if (!exercises.length) fail('This workout has no exercises. Rebuild your plan in Profile.',409);
        await assertLock();
        const session = await db.WorkoutSession.create({ownerId:user.id,workoutDayId:day.id,planId:day.planId,name:day.name,date,timezone:input.timezone,startedAt:new Date().toISOString(),status:'active',targetMuscles:day.targetMuscles||[]});
        return { session };
      }
      if (typeof input.sessionId !== 'string') fail('A workout session is required.');
      const session = await db.WorkoutSession.get(input.sessionId);
      if (!owned(session,user.id)) fail('Workout not found.',404);
      if (input.action === 'saveSet') {
        if (session.status !== 'active') fail('This workout is no longer active. Your local changes have been kept.',409);
        const row = input.row;
        if (!row || typeof row.workoutExerciseId !== 'string' || !Number.isInteger(row.setNumber) || row.setNumber < 1 || row.setNumber > 30 || typeof row.operationId !== 'string' || row.operationId.length > 100) fail('Invalid set.');
        const we = await db.WorkoutExercise.get(row.workoutExerciseId);
        if (!owned(we,user.id) || we.workoutDayId !== session.workoutDayId) fail('Exercise does not belong to this workout.',403);
        const exercise = await db.Exercise.get(row.exerciseId || we.exerciseId);
        const original = await db.Exercise.get(we.exerciseId);
        if (exercise.id !== original.id && (exercise.primaryMuscle !== original.primaryMuscle || exercise.category !== original.category)) fail('Choose a replacement with the same muscle and movement category.');
        if (exercise.id !== original.id && profile.equipment?.length && !profile.equipment.some(e=>/full|commercial|gym/i.test(e)) && exercise.equipment !== 'Bodyweight' && !profile.equipment.some(e=>e.toLowerCase().includes(exercise.equipment.toLowerCase()))) fail('This replacement requires equipment outside your profile.');
        if (typeof row.completed !== 'boolean' || !validSet({...row,completed:true})) fail('Use a weight from 0–2,500 lb and whole reps from 1–100.');
        if (row.rir !== '' && row.rir != null && (!Number.isInteger(+row.rir) || +row.rir < 0 || +row.rir > 10)) fail('RIR must be from 0–10.');
        const rowKey = `${we.id}:${row.setNumber}`;
        const all = await db.ExerciseSet.filter({...filter,workoutSessionId:session.id},'created_date',1000);
        const existing = all.find(s=>s.rowKey===rowKey || (!s.rowKey && s.exerciseName===we.exerciseName && s.setNumber===row.setNumber));
        if (existing?.revision === row.operationId) return { set:existing };
        if (existing && (existing.revision || '') !== (row.revision || '')) fail('This set changed on another screen. Refresh to load the saved version before editing it.',409);
        const payload = {ownerId:user.id,workoutSessionId:session.id,workoutExerciseId:we.id,rowKey,revision:row.operationId,exerciseId:exercise.id,exerciseName:exercise.name,primaryMuscle:exercise.primaryMuscle,setNumber:row.setNumber,setType:'working',weight:+row.weight,reps:+row.reps,completed:row.completed,timestamp:new Date().toISOString(),...(row.rir === '' || row.rir == null ? {} : {rir:+row.rir})};
        await assertLock();
        const saved = existing ? await db.ExerciseSet.update(existing.id,payload) : await db.ExerciseSet.create(payload);
        return { set:saved };
      }
      if (input.action === 'discard') {
        if (session.status === 'completed') fail('Completed workouts cannot be discarded here.',409);
        await assertLock();
        await db.WorkoutSession.update(session.id,{status:'skipped',completedAt:session.completedAt || new Date().toISOString()});
        return {ok:true};
      }
      if (session.status === 'skipped') fail('This workout was discarded.',409);
      let finished = session;
      if (session.status !== 'completed') {
        const sets = (await db.ExerciseSet.filter({...filter,workoutSessionId:session.id,completed:true},'setNumber',1000)).filter(validSet);
        if (!sets.length) fail('Complete and sync at least one set before finishing.');
        if (!Array.isArray(input.expectedSets) || sets.length !== input.expectedSets.length || sets.some(s=>!input.expectedSets.some(e=>e.id===s.id && (e.revision||'')===(s.revision||'')))) fail('Your workout changed on another screen. Refresh before finishing.',409);
        const records = await db.PersonalRecord.filter(filter,'-date',1000);
        const prs = personalBests(sets,records);
        const previous = (await db.WorkoutSession.filter({...filter,workoutDayId:session.workoutDayId,status:'completed'},'-completedAt',1))[0];
        const volume = Math.round(sets.reduce((a,r)=>a+(+r.weight)*(+r.reps),0)), completedAt = new Date().toISOString();
        const durationMinutes = Math.max(1,Math.round((Date.now()-new Date(session.startedAt).getTime())/60000));
        const best = [...sets].sort((a,b)=>b.weight-a.weight)[0];
        const summary = {name:session.name,durationMinutes,workingSets:sets.length,completedExercises:new Set(sets.map(s=>s.workoutExerciseId||s.exerciseName)).size,volume,prs,ratingChanges:[],analyticsPending:true,bestLift:best?{name:best.exerciseName,weight:best.weight,reps:best.reps}:null,previousVolume:previous?.totalVolume ?? null};
        await assertLock();
        finished = await db.WorkoutSession.update(session.id,{status:'completed',completedAt,durationMinutes,totalVolume:volume,setCount:sets.length,prCount:prs.length,completionSummary:summary,analyticsStatus:'pending'});
      }
      if (!finished.completionSummary) return {summary:{name:finished.name,durationMinutes:finished.durationMinutes||0,workingSets:finished.setCount||0,volume:finished.totalVolume||0,prs:[],ratingChanges:[],analyticsPending:false}};
      if (finished.analyticsStatus === 'complete') return {summary:finished.completionSummary};
      try { return {summary:await finishAnalytics(client,user,finished,profile,assertLock)}; }
      catch { return {summary:{...finished.completionSummary,analyticsPending:true}}; }
    });
    return Response.json(result);
  } catch (error) {
    const status = error.status || 500;
    return Response.json({error:status < 500 ? error.message : 'Could not sync this workout. Your draft is kept; please retry.'},{status});
  }
}