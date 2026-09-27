import {z} from 'zod';
import {equipmentAvailable,equipmentPool} from './exerciseSelection';
import {estimateMinutes,buildDayExercises} from './personalizedRoutine';
import {WEEKDAYS,orderedTrainingDays,scoreProgramStructures} from './programEngine';
const row=z.object({exerciseId:z.string().min(1),exerciseName:z.string().min(1),primaryMuscle:z.string(),equipment:z.string(),category:z.string(),sets:z.number().int().min(1).max(6),repMin:z.number().int().min(1).max(30),repMax:z.number().int().min(1).max(50),restSeconds:z.number().int().min(30).max(300),order:z.number().int(),notes:z.string(),progressionNotes:z.string()});
export const proposalSchema=z.object({id:z.string(),name:z.string(),explanation:z.string(),createdAt:z.string(),profileRevision:z.string(),previousPlanId:z.string().nullable(),days:z.array(z.object({weekday:z.number().int().min(0).max(6),name:z.string(),isRest:z.boolean(),exercises:z.array(row).max(10)})).length(7)});
export type PlanProposal=z.infer<typeof proposalSchema>;
export const modelChoiceSchema=z.object({emphasis:z.enum(['consistency','technique','recovery','nutrition'])}).strict();
export function validateProposal(value:unknown,profile:Record<string,any>,catalog:Record<string,any>[]):PlanProposal {
 const plan=proposalSchema.parse(value),allowed=equipmentPool(profile),byId=new Map(catalog.map(e=>[e.id,e]));
 const selected=profile.availableDays?.length?profile.availableDays:profile.trainingDays;
 if(!profile.experienceLevel||!Array.isArray(profile.equipment)||!profile.equipment.length||!Array.isArray(selected)||selected.length<2||selected.length>6||!profile.sessionLength)throw new Error('Complete your experience, equipment, training days and session length first.');
 if(profile.injuries?.length)throw new Error('A qualified professional should help adapt your program to the limitations you listed.');
 if(new Set(plan.days.map(d=>d.weekday)).size!==7)throw new Error('A complete week is required.');
 const training=plan.days.filter(d=>!d.isRest);
 if(training.length!==selected.length||training.some(d=>!selected.includes(WEEKDAYS[d.weekday])))throw new Error('Training frequency does not match your schedule.');
 const weekly=new Map<string,number>();
 for(const day of plan.days){
  if(day.isRest){if(day.exercises.length)throw new Error('Rest days cannot contain working sets.');continue;}
  if(!day.exercises.length)throw new Error('Each training day needs exercises.');
  if(estimateMinutes(day.exercises)>Number(profile.sessionLength))throw new Error('This session exceeds your time allowance.');
  if(day.exercises.reduce((s,e)=>s+e.sets,0)>(profile.experienceLevel==='beginner'?14:22))throw new Error('Session volume is too high.');
  for(const exercise of day.exercises){const source=byId.get(exercise.exerciseId);if(!source||source.programEligible===false)throw new Error('Unknown or unsupported exercise.');if(!equipmentAvailable(source,allowed))throw new Error('Required equipment is unavailable.');if(exercise.repMax<exercise.repMin)throw new Error('Invalid repetition range.');if(source.name!==exercise.exerciseName||source.primaryMuscle!==exercise.primaryMuscle)throw new Error('Exercise metadata does not match the catalog.');weekly.set(source.primaryMuscle,(weekly.get(source.primaryMuscle)||0)+exercise.sets);}
 }
 if([...weekly.values()].some(n=>n>24))throw new Error('Weekly muscle volume is too high.');
 for(const day of training){const next=training.find(d=>d.weekday===(day.weekday+1)%7);if(!next)continue;const heavy=new Set(day.exercises.filter(e=>e.sets>=3).map(e=>e.primaryMuscle));if(next.exercises.some(e=>e.sets>=3&&heavy.has(e.primaryMuscle)))throw new Error('Add recovery time between demanding sessions for the same muscle.');}
 return plan;
}
export function proposePlan(profile:Record<string,any>,catalog:Record<string,any>[],previousPlanId:string|null):PlanProposal {
 const days=orderedTrainingDays(profile),rec=scoreProgramStructures({...profile,days:days.length}).best;
 return validateProposal({id:crypto.randomUUID(),name:rec.name,explanation:rec.why,createdAt:new Date().toISOString(),profileRevision:profile.updated_date||'',previousPlanId,days:WEEKDAYS.map((_,weekday)=>{const index=days.indexOf(weekday);return {weekday,name:index<0?'Rest':rec.dayNames[index],isRest:index<0,exercises:index<0?[]:buildDayExercises(rec.dayNames[index],profile,catalog)};})},profile,catalog);
}
export function validateNutrition(values:Record<string,number>,adult:boolean) {
 if(!adult)throw new Error('Adult eligibility is required for nutrition targets.');
 if(!Number.isFinite(values.calories)||values.calories<1200||values.calories>4500||!['protein','carbs','fat'].every(k=>Number.isFinite(values[k])&&values[k]>=0&&values[k]<=600)||Math.abs(values.protein*4+values.carbs*4+values.fat*9-values.calories)>150)throw new Error('Nutrition values are outside supported bounds.');return values;
}
