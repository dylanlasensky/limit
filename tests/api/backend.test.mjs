import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.LIMIT_API_URL||'http://localhost:8787';
const password='Local-test-password-123!';
async function call(path,{cookie='',method='GET',body,origin=base}={}) {
 const r=await fetch(base+'/api'+path,{method,headers:{cookie,origin,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const data=await r.json();return {status:r.status,data,cookie:r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ')};
}
async function account(label){const result=await call('/auth/sign-up/email',{method:'POST',body:{name:label,email:`${label}-${crypto.randomUUID()}@example.invalid`,password}});assert.equal(result.status,200);assert.ok(result.cookie);return result;}
test('real Worker / D1 lifecycle and adversarial ownership checks',async t=>{
 const a=await account('api-a'),b=await account('api-b'),cookie=a.cookie;
 let profile,plan,days,exercise,session,set;
 await t.test('requires a session and rejects untrusted mutation origins',async()=>{
  assert.equal((await call('/entities/UserProfile')).status,401);
  assert.equal((await call('/entities/UserProfile',{cookie,method:'POST',origin:'https://attacker.invalid',body:{name:'Injected'}})).status,403);
 });
 await t.test('creates private profile and rejects ownership and role injection',async()=>{
  assert.equal((await call('/entities/UserProfile',{cookie,method:'POST',body:{name:'Bad',ownerId:b.data.user.id}})).status,403);
  const p=await call('/entities/UserProfile',{cookie,method:'POST',body:{name:'API account',equipment:['Bodyweight'],experienceLevel:'beginner',availableDays:['Monday','Thursday'],sessionLength:30}});assert.equal(p.status,200);profile=p.data;
  assert.equal(profile.ownerId,a.data.user.id);
  assert.equal((await call('/entities/UserProfile/'+profile.id,{cookie:b.cookie})).status,404);
  assert.deepEqual((await call('/entities/UserProfile?filter='+encodeURIComponent(JSON.stringify({ownerId:a.data.user.id})),{cookie:b.cookie})).data,[]);
  assert.equal((await call('/entities/UserProfile/'+profile.id,{cookie:b.cookie,method:'PATCH',body:{name:'Stolen'}})).status,404);
  assert.equal((await call('/entities/UserProfile/'+profile.id,{cookie,method:'PATCH',body:{name:'Updated'}})).status,200);
 });
 await t.test('validates data, filters and query operators',async()=>{
  assert.equal((await call('/entities/WeightEntry',{cookie,method:'POST',body:{date:'bad',weight:-10}})).status,400);
  assert.equal((await call('/entities/UserProfile?filter='+encodeURIComponent('{"name;DROP TABLE user":1}'),{cookie})).status,400);
  assert.equal((await call('/entities/UserProfile?limit=999999',{cookie})).status,400);
  assert.equal((await call('/entities/ExerciseSet',{cookie,method:'POST',body:{}})).status,403);
 });
 await t.test('seeds all catalog keys and returns honest media fallbacks',async()=>{
  const rows=await call('/entities/Exercise');assert.equal(rows.status,200);assert.equal(rows.data.length,365);exercise=rows.data.find(e=>e.equipment==='Bodyweight'&&e.programEligible!==false);
  const media=await call('/media/'+exercise.id);assert.equal(media.status,200);assert.equal(media.data.reviewStatus,'missing');assert.equal(media.data.source,null);assert.ok(media.data.textFallback.length);
 });
 await t.test('creates a complete plan and prevents cross-account graph links',async()=>{
  const p=await call('/entities/WorkoutPlan',{cookie,method:'POST',body:{name:'API plan',daysPerWeek:2,active:false}});assert.equal(p.status,200);plan=p.data;
  assert.equal((await call('/entities/WorkoutDay',{cookie:b.cookie,method:'POST',body:{planId:plan.id,weekday:0,name:'Stolen'}})).status,404);
  days=(await call('/entities/WorkoutDay/bulkCreate',{cookie,method:'POST',body:Array.from({length:7},(_,weekday)=>({planId:plan.id,weekday,name:weekday===0||weekday===3?'Full body':'Rest',isRest:weekday!==0&&weekday!==3}))})).data;
  assert.equal(days.length,7);
  for(const day of days.filter(d=>!d.isRest))assert.equal((await call('/entities/WorkoutExercise',{cookie,method:'POST',body:{workoutDayId:day.id,exerciseId:exercise.id,exerciseName:exercise.name,primaryMuscle:exercise.primaryMuscle,order:1,sets:2,repMin:8,repMax:12,restSeconds:90}})).status,200);
  assert.equal((await call('/functions/workoutCommand',{cookie,method:'POST',body:{action:'activatePlan',planId:plan.id}})).status,200);
 });
 await t.test('deduplicates simultaneous workout starts and enforces session ownership',async()=>{
  const body={action:'start',workoutDayId:days[0].id,timezone:'America/New_York'};
  const starts=await Promise.all([call('/functions/workoutCommand',{cookie,method:'POST',body}),call('/functions/workoutCommand',{cookie,method:'POST',body})]);
  assert.equal(starts[0].status,200);assert.equal(starts[1].status,200);assert.equal(starts[0].data.session.id,starts[1].data.session.id);session=starts[0].data.session;
  assert.equal((await call('/functions/workoutCommand',{cookie:b.cookie,method:'POST',body})).status,409);
 });
 await t.test('replays set operation IDs, rejects stale revisions and completes once',async()=>{
  const rows=(await call('/entities/WorkoutExercise?filter='+encodeURIComponent(JSON.stringify({workoutDayId:days[0].id})),{cookie})).data;
  const body={action:'saveSet',sessionId:session.id,row:{workoutExerciseId:rows[0].id,exerciseId:exercise.id,setNumber:1,operationId:crypto.randomUUID(),revision:'',weight:'0',reps:'10',rir:'3',completed:true}};
  const first=await call('/functions/workoutCommand',{cookie,method:'POST',body});assert.equal(first.status,200,JSON.stringify(first.data));set=first.data.set;
  const retry=await call('/functions/workoutCommand',{cookie,method:'POST',body});assert.equal(retry.data.set.id,set.id);
  assert.equal((await call('/functions/workoutCommand',{cookie,method:'POST',body:{...body,row:{...body.row,operationId:crypto.randomUUID()}}})).status,409);
  const warmup=await call('/functions/workoutCommand',{cookie,method:'POST',body:{...body,row:{...body.row,setNumber:2,operationId:crypto.randomUUID(),weight:'50',reps:'5',setType:'warmup'}}});assert.equal(warmup.status,200);
  const finish={action:'finish',sessionId:session.id,expectedSets:[{id:set.id,revision:set.revision},{id:warmup.data.set.id,revision:warmup.data.set.revision}]};
  const done=await call('/functions/workoutCommand',{cookie,method:'POST',body:finish});assert.equal(done.status,200,JSON.stringify(done.data));assert.equal(done.data.summary.workingSets,1);assert.equal(done.data.summary.volume,0);
  const again=await call('/functions/workoutCommand',{cookie,method:'POST',body:finish});assert.deepEqual(again.data.summary,done.data.summary);
 });
 await t.test('coach fails closed on missing consent and only activates explicitly approved proposals',async()=>{
  assert.equal((await call('/functions/askLimitCoach',{cookie,method:'POST',body:{question:'Build a plan'}})).status,403);
  const answer=await call('/functions/askLimitCoach',{cookie,method:'POST',body:{question:'Build a plan',propose:true,aiConsent:'cloudflare-ai-v1'}});
  assert.equal(answer.status,200,JSON.stringify(answer.data));if(base.startsWith('http://localhost'))assert.equal(answer.data.source,'deterministic');else assert.ok(['workers-ai','deterministic'].includes(answer.data.source));assert.ok(answer.data.proposal,JSON.stringify(answer.data));t.diagnostic('Coach response source: '+answer.data.source);
  const before=(await call('/entities/WorkoutPlan?filter='+encodeURIComponent('{"active":true}'),{cookie})).data;assert.equal(before[0].id,plan.id);
  assert.equal((await call('/functions/approvePlan',{cookie,method:'POST',body:{proposalId:answer.data.proposal.id,approved:false}})).status,400);
  const approved=await call('/functions/approvePlan',{cookie,method:'POST',body:{proposalId:answer.data.proposal.id,approved:true}});assert.equal(approved.status,200,JSON.stringify(approved.data));assert.equal(approved.data.plan.active,true);
  const active=(await call('/entities/WorkoutPlan?filter='+encodeURIComponent('{"active":true}'),{cookie})).data;assert.equal(active.length,1);
 });
 await t.test('keeps uploaded files private',async()=>{
  const r=await fetch(base+'/api/uploads',{method:'POST',headers:{cookie,origin:base,'content-type':'text/plain'},body:'Disposable workout notes'});assert.equal(r.status,200);const file=await r.json();
  assert.equal((await fetch(base+'/api/uploads/'+file.id,{headers:{cookie:b.cookie}})).status,404);
  const own=await fetch(base+'/api/uploads/'+file.id,{headers:{cookie}});assert.equal(own.status,200);assert.equal(await own.text(),'Disposable workout notes');
 });
 await t.test('exports only current account and deletes uploads, records and identity',async()=>{
  const exported=await call('/functions/exportAccount',{cookie,method:'POST',body:{}});assert.equal(exported.status,200);assert.equal(exported.data.account.id,a.data.user.id);
  const deleted=await call('/functions/deleteAccount',{cookie,method:'POST',body:{confirm:true}});assert.equal(deleted.status,200,JSON.stringify(deleted.data));assert.equal(deleted.data.success,true);
  assert.equal((await call('/me',{cookie})).status,401);
  assert.equal((await call('/me',{cookie:b.cookie})).status,200);
  assert.equal((await call('/functions/deleteAccount',{cookie:b.cookie,method:'POST',body:{confirm:true}})).status,200);
 });
});
