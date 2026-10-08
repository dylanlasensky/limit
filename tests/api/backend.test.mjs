import { readFileSync } from "node:fs";
import test from 'node:test';
import assert from 'node:assert/strict';
import { previewSessionBudget } from '../../packages/domain/sessionBudget.js';
const base=process.env.LIMIT_API_URL||'http://localhost:8787';
const password='Local-test-password-123!';
async function call(path,{cookie='',method='GET',body,origin=base}={}) {
 const r=await fetch(base+'/api'+path,{method,headers:{cookie,origin,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const data=await r.json();return {status:r.status,data,cookie:r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ')};
}
const config=await call('/config');
assert.equal(config.status,200);
const emailEnabled=config.data.emailEnabled===true;
if(emailEnabled){
 assert.equal(process.env.LIMIT_TEST_ACCOUNTS_DISPOSABLE,'true','Email-enabled acceptance deletes its accounts; explicitly mark the supplied verified mailboxes disposable');
 const emails=['A','B','BROWSER'].map(suffix=>process.env[`LIMIT_TEST_EMAIL_${suffix}`]?.toLowerCase());
 assert.ok(emails.every(Boolean)&&new Set(emails).size===3,'Three distinct verified disposable mailboxes are required');
}
async function account(label){
 const suffix=label==='api-a'?'A':'B';
 const email=emailEnabled?process.env[`LIMIT_TEST_EMAIL_${suffix}`]:`${label}-${crypto.randomUUID()}@example.invalid`;
 const accountPassword=emailEnabled?process.env[`LIMIT_TEST_PASSWORD_${suffix}`]:password;
 assert.ok(email&&accountPassword,`Verified disposable test account ${suffix} is required when email is enabled`);
 const result=await call(emailEnabled?'/auth/sign-in/email':'/auth/sign-up/email',{method:'POST',body:emailEnabled?{email,password:accountPassword}:{name:label,email,password:accountPassword}});
 assert.equal(result.status,200,`Cannot authenticate disposable account ${suffix}`);assert.ok(result.cookie);return result;
}
test('real Worker / D1 lifecycle and adversarial ownership checks',async t=>{
 const a=await account('api-a'),b=await account('api-b'),cookie=a.cookie;
 let profile,plan,days,exercise,session,set;
 await t.test('login, logout and invalid credentials enforce sessions',async()=>{
  const signed=await call('/auth/sign-in/email',{method:'POST',body:{email:a.data.user.email,password:emailEnabled?process.env.LIMIT_TEST_PASSWORD_A:password}});assert.equal(signed.status,200);assert.equal((await call('/me',{cookie:signed.cookie})).status,200);
  assert.equal((await call('/auth/sign-out',{cookie:signed.cookie,method:'POST',body:{}})).status,200);assert.equal((await call('/me',{cookie:signed.cookie})).status,401);
  const wrong=await call('/auth/sign-in/email',{method:'POST',body:{email:a.data.user.email,password:'wrong-password-12345'}});assert.equal(wrong.status,401);
  const absent=await call('/me',{cookie:'better-auth.session_token=invalid'});assert.equal(absent.status,401);
  if(!emailEnabled){const reset=await call('/auth/request-password-reset',{method:'POST',body:{email:a.data.user.email,redirectTo:base+'/reset-password'}});assert.equal(reset.status,503);}
 });
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
  const media=await call('/media/'+exercise.id);assert.equal(media.status,200);const expected=base.startsWith('http://localhost')?null:JSON.parse(readFileSync('media/manifest.json')).find(row=>row.catalogKey===exercise.id);assert.equal(media.data.reviewStatus,expected?.reviewStatus||'missing');assert.equal(media.data.source,expected?.source||null);assert.equal(media.data.reviewer,null);assert.deepEqual(media.data.textFallback,exercise.instructions);
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
 await t.test('selects owned session equipment and persists it',async()=>{
  const otherProfile=await call('/entities/UserProfile',{cookie:b.cookie,method:'POST',body:{name:'Other API account',equipment:['Bodyweight'],experienceLevel:'beginner',availableDays:['Monday','Thursday'],sessionLength:30}});
  assert.equal(otherProfile.status,200,JSON.stringify(otherProfile.data));
  const updatedProfile=await call('/entities/UserProfile/'+profile.id,{cookie,method:'PATCH',body:{equipmentProfiles:[{id:'home',name:'Home',equipment:['Bodyweight']}]}});
  assert.equal(updatedProfile.status,200,JSON.stringify(updatedProfile.data));
  const selected=await call('/functions/workoutCommand',{cookie,method:'POST',body:{action:'selectEquipmentProfile',sessionId:session.id,equipmentProfileId:'home'}});
  assert.equal(selected.status,200,JSON.stringify(selected.data));
  assert.equal(selected.data.session.equipmentProfileId,'home');
  const saved=await call('/entities/WorkoutSession/'+session.id,{cookie});
  assert.equal(saved.status,200);
  assert.equal(saved.data.equipmentProfileId,'home');
  assert.equal((await call('/functions/workoutCommand',{cookie:b.cookie,method:'POST',body:{action:'selectEquipmentProfile',sessionId:session.id,equipmentProfileId:'home'}})).status,404);
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
 await t.test('explicit extra warmup and working sets extend only the shortened session',async()=>{
  for(let order=2;order<=4;order++){
   const added=await call('/entities/WorkoutExercise',{cookie,method:'POST',body:{workoutDayId:days[3].id,exerciseId:exercise.id,exerciseName:exercise.name+' '+order,primaryMuscle:exercise.primaryMuscle,order,sets:4,repMin:8,repMax:12,restSeconds:180}});
   assert.equal(added.status,200,JSON.stringify(added.data));
  }
  const templates=(await call('/entities/WorkoutExercise?filter='+encodeURIComponent(JSON.stringify({workoutDayId:days[3].id})),{cookie})).data.sort((x,y)=>x.order-y.order);
  const preview=previewSessionBudget(templates,40);
  assert.equal(preview.available,true,JSON.stringify(preview));
  const begun=await call('/functions/workoutCommand',{cookie,method:'POST',body:{action:'start',workoutDayId:days[3].id,timezone:'America/New_York',timeBudgetMinutes:40,timeBudgetPreview:preview.selected.map(row=>({id:row.id,sets:row.sets}))}});
  assert.equal(begun.status,200,JSON.stringify(begun.data));
  const shorter=begun.data.session;
  const first=preview.selected[0];
  const extra={action:'saveSet',sessionId:shorter.id,row:{workoutExerciseId:first.id,exerciseId:exercise.id,setNumber:first.sets+1,operationId:crypto.randomUUID(),revision:'',weight:'0',reps:'5',setType:'warmup',completed:true}};
  assert.equal((await call('/functions/workoutCommand',{cookie,method:'POST',body:extra})).status,409);
  const warmup=await call('/functions/workoutCommand',{cookie,method:'POST',body:{...extra,row:{...extra.row,budgetExtension:true}}});
  assert.equal(warmup.status,200,JSON.stringify(warmup.data));
  assert.equal(warmup.data.set.setType,'warmup');
  const retry=await call('/functions/workoutCommand',{cookie,method:'POST',body:{...extra,row:{...extra.row,budgetExtension:true}}});
  assert.equal(retry.status,200,JSON.stringify(retry.data));
  assert.equal(retry.data.set.id,warmup.data.set.id);
  const working=await call('/functions/workoutCommand',{cookie,method:'POST',body:{...extra,row:{...extra.row,setNumber:first.sets+2,operationId:crypto.randomUUID(),reps:'8',setType:'working',budgetExtension:true}}});
  assert.equal(working.status,200,JSON.stringify(working.data));
  const savedSession=await call('/entities/WorkoutSession/'+shorter.id,{cookie});
  assert.equal(savedSession.data.timeBudget.exercises.find(item=>item.id===first.id).sets,first.sets+2);
  assert.equal(savedSession.data.timeBudget.manualExtensionSets,2);
  const finished=await call('/functions/workoutCommand',{cookie,method:'POST',body:{action:'finish',sessionId:shorter.id,expectedSets:[{id:warmup.data.set.id,revision:warmup.data.set.revision},{id:working.data.set.id,revision:working.data.set.revision}]}});
  assert.equal(finished.status,200,JSON.stringify(finished.data));
  assert.equal((await call('/entities/WorkoutExercise/'+first.id,{cookie})).data.sets,first.sets);
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
 await t.test('moves this week only, protects ownership, and supports undo',async()=>{
  const scheduleCookie=b.cookie;
  assert.equal((await call('/entities/UserProfile',{cookie:scheduleCookie,method:'POST',body:{name:'Schedule test'}})).status,200);
  const check=await call('/functions/workoutCommand',{cookie:scheduleCookie,method:'POST',body:{action:'check',timezone:'UTC'}});
  assert.equal(check.status,200);
  const today=check.data.localDate;
  const weekday=(new Date(today+'T12:00:00Z').getUTCDay()+6)%7;
  if(weekday===6) return; // Sunday has no second date left in this week.
  const tomorrow=new Date(today+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
  const toDate=tomorrow.toISOString().slice(0,10);
  const p=await call('/entities/WorkoutPlan',{cookie:scheduleCookie,method:'POST',body:{name:'One-week adjustment',daysPerWeek:6,active:false}});
  assert.equal(p.status,200);
  const schedule=Array.from({length:7},(_,i)=>({planId:p.data.id,weekday:i,name:i===weekday?'Today session':i===weekday+1?'Recovery':'Training',isRest:i===weekday+1}));
  const created=await call('/entities/WorkoutDay/bulkCreate',{cookie:scheduleCookie,method:'POST',body:schedule});
  assert.equal(created.status,200);
  for(const day of created.data.filter(d=>!d.isRest))
   assert.equal((await call('/entities/WorkoutExercise',{cookie:scheduleCookie,method:'POST',body:{workoutDayId:day.id,exerciseId:exercise.id,exerciseName:exercise.name,order:1,sets:2,repMin:8,repMax:12}})).status,200);
  assert.equal((await call('/functions/workoutCommand',{cookie:scheduleCookie,method:'POST',body:{action:'activatePlan',planId:p.data.id}})).status,200);
  const body={action:'changeSchedule',planId:p.data.id,fromDate:today,toDate,mode:'move',timezone:'UTC'};
  const changed=await call('/functions/workoutCommand',{cookie:scheduleCookie,method:'POST',body});
  assert.equal(changed.status,200,JSON.stringify(changed.data));
  assert.equal(changed.data.change.fromDayId,created.data[weekday].id);
  assert.equal((await call('/entities/WorkoutScheduleChange',{cookie:scheduleCookie,method:'POST',body:changed.data.change})).status,403);
  assert.equal((await call('/entities/WorkoutScheduleChange/'+changed.data.change.id,{cookie})).status,404);
  assert.equal((await call('/functions/workoutCommand',{cookie:scheduleCookie,method:'POST',body})).status,409);
  assert.equal((await call('/entities/WorkoutDay/'+created.data[weekday].id,{cookie:scheduleCookie})).data.weekday,weekday);
  const undone=await call('/functions/workoutCommand',{cookie:scheduleCookie,method:'POST',body:{action:'undoScheduleChange',changeId:changed.data.change.id,timezone:'UTC'}});
  assert.equal(undone.status,200,JSON.stringify(undone.data));
  assert.equal(undone.data.change.active,false);
  const priorClientStart=await call('/functions/workoutCommand',{cookie:scheduleCookie,method:'POST',body:{action:'start',workoutDayId:created.data[weekday].id,timezone:'UTC'}});
  assert.equal(priorClientStart.status,200,JSON.stringify(priorClientStart.data));
  assert.equal(priorClientStart.data.session.workoutDayId,created.data[weekday].id);
  assert.equal((await call('/functions/workoutCommand',{cookie:scheduleCookie,method:'POST',body:{action:'discard',sessionId:priorClientStart.data.session.id}})).status,200);
 });
 await t.test('stores private meal shortcuts and deduplicates a retried meal log',async()=>{
  const item=(foodName,calories)=>({foodName,quantity:1,unit:'serving',calories,estimated:true,ingredients:[foodName],possibleAllergens:['wheat']});
  const createOperationId=crypto.randomUUID();
  const shortcutBody={name:'Usual breakfast',items:[item('Toast',80),item('Yogurt',100)],createOperationId};
  const shortcut=await call('/entities/MealShortcut',{cookie,method:'POST',body:shortcutBody});
  assert.equal(shortcut.status,200,JSON.stringify(shortcut.data));
  // Simulate a committed create whose response was lost: retry must return the same row.
  const shortcutRetry=await call('/entities/MealShortcut',{cookie,method:'POST',body:shortcutBody});
  assert.equal(shortcutRetry.status,200,JSON.stringify(shortcutRetry.data));
  assert.equal(shortcutRetry.data.id,shortcut.data.id);
  const ownShortcuts=await call('/entities/MealShortcut?filter='+encodeURIComponent(JSON.stringify({createOperationId})),{cookie});
  assert.equal(ownShortcuts.data.length,1);
  assert.equal((await call('/entities/MealShortcut/'+shortcut.data.id,{cookie:b.cookie})).status,404);
  assert.deepEqual((await call('/entities/MealShortcut',{cookie:b.cookie})).data,[]);
  const otherOwner=await call('/entities/MealShortcut',{cookie:b.cookie,method:'POST',body:shortcutBody});
  assert.equal(otherOwner.status,200,JSON.stringify(otherOwner.data));
  assert.notEqual(otherOwner.data.id,shortcut.data.id);
  const body={date:'2020-06-01',mealType:'Breakfast',foodName:shortcut.data.name,quantity:1,unit:'meal',calories:180,estimated:true,ingredients:['Toast','Yogurt'],possibleAllergens:['wheat'],entryMethod:'meal_shortcut',shortcutLogId:crypto.randomUUID()};
  const first=await call('/entities/FoodEntry',{cookie,method:'POST',body});assert.equal(first.status,200,JSON.stringify(first.data));
  const retry=await call('/entities/FoodEntry',{cookie,method:'POST',body});assert.equal(retry.status,200,JSON.stringify(retry.data));
  assert.equal(retry.data.id,first.data.id);
  const rows=await call('/entities/FoodEntry?filter='+encodeURIComponent(JSON.stringify({shortcutLogId:body.shortcutLogId})),{cookie});
  assert.equal(rows.data.length,1);
  assert.deepEqual(first.data.ingredients,['Toast','Yogurt']);
 });
 await t.test('exports only current account and deletes uploads, records and identity',async()=>{
  const exported=await call('/functions/exportAccount',{cookie,method:'POST',body:{}});assert.equal(exported.status,200);assert.equal(exported.data.account.id,a.data.user.id);
  const deleted=await call('/functions/deleteAccount',{cookie,method:'POST',body:{confirm:true}});assert.equal(deleted.status,200,JSON.stringify(deleted.data));assert.equal(deleted.data.success,true);
  assert.equal((await call('/me',{cookie})).status,401);
  assert.equal((await call('/me',{cookie:b.cookie})).status,200);
  assert.equal((await call('/functions/deleteAccount',{cookie:b.cookie,method:'POST',body:{confirm:true}})).status,200);
 });
});
