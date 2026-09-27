import {validateProposal} from "../packages/domain/proposals";
import { DurableObject } from 'cloudflare:workers';
import { Repository } from './repository';
import { ApiError } from './errors';
import workoutCommand from './workout-command';
import { entityNames, type EntityName, type ApiUser } from '../packages/contracts/entities';
import { exportAccountData } from '../packages/domain/accountData.js';
export class AccountCoordinator extends DurableObject<Env> {
  private tail: Promise<unknown> = Promise.resolve();
  async execute(user:ApiUser,operation:{kind:string;name?:string;method?:string;id?:string;input?:any}) {
    const run=this.tail.then(()=>this.perform(user,operation));
    this.tail=run.catch(()=>{});return JSON.stringify(await run);
  }
  private async perform(user:ApiUser,op:{kind:string;name?:string;method?:string;id?:string;input?:any}):Promise<{status:number;data:unknown}> {
    try {
      const identity=await this.env.DB.prepare('SELECT id FROM user WHERE id = ?').bind(user.id).first();
      if(!identity)throw new ApiError('Sign in to continue.',401);
      const repo=new Repository(this.env.DB,user.id),internal=new Repository(this.env.DB,user.id,true);
      if(op.kind==='workout') {
        const response=await workoutCommand(new Request('https://internal/workout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(op.input)}),{auth:{me:async()=>user},entities:internal.entities,asServiceRole:{entities:internal.entities}});
        return {status:response.status,data:await response.json()};
      }
      if(op.kind==='approve') {
        if(op.input?.approved!==true||typeof op.input.proposalId!=='string')throw new ApiError('Explicit approval is required.');
        const coach=this.env.COACH.getByName(user.id);
        const proposal=JSON.parse(await coach.takeProposal(op.input.proposalId));
        const profile=(await internal.entity('UserProfile').list())[0];
        const active=(await internal.entity('WorkoutPlan').filter({active:true},'-created_date',1))[0];
        if(profile?.updated_date!==proposal.profileRevision||(active?.id||null)!==proposal.previousPlanId)throw new ApiError('Your profile or plan changed. Request a new proposal.',409);
        if((await internal.entity('WorkoutSession').filter({status:'active'})).length)throw new ApiError('Finish your active workout before changing plans.',409);
        const valid=validateProposal(proposal,profile,await internal.entity('Exercise').list());
        const plan=await internal.entity('WorkoutPlan').create({name:valid.name,description:valid.explanation,active:false,daysPerWeek:valid.days.filter(d=>!d.isRest).length});
        for(const day of valid.days){const saved=await internal.entity('WorkoutDay').create({planId:plan.id,weekday:day.weekday,name:day.name,isRest:day.isRest,targetMuscles:[...new Set(day.exercises.map(e=>e.primaryMuscle))]});for(const exercise of day.exercises)await internal.entity('WorkoutExercise').create({...exercise,workoutDayId:saved.id});}
        const statements=[this.env.DB.prepare("UPDATE workout_plan SET data=json_set(data,'$.active',json('false')) WHERE owner_id=?").bind(user.id),this.env.DB.prepare("UPDATE workout_plan SET data=json_set(data,'$.active',json('true')) WHERE id=? AND owner_id=?").bind(plan.id,user.id)];
        await this.env.DB.batch(statements);await coach.clearProposal();return {status:200,data:{plan:await internal.entity('WorkoutPlan').get(plan.id)}};
      }
      if(op.kind==='export')return {status:200,data:await exportAccountData({entities:repo.entities},user)};
      if(op.kind==='delete') {
        if(op.input?.confirm!==true)throw new ApiError('Confirm account deletion.');
        // Erase bytes first. If storage is unavailable, keep identity so the user can retry.
        if(!this.env.FILES && await this.env.DB.prepare('SELECT id FROM uploads WHERE owner_id=? LIMIT 1').bind(user.id).first())throw new ApiError('File storage is unavailable. Retry deletion when storage returns.',503);
        let cursor:string|undefined;
        if(this.env.FILES)do {const page=await this.env.FILES.list({prefix:`private/${user.id}/`,cursor});if(page.objects.length)await this.env.FILES.delete(page.objects.map(o=>o.key));cursor=page.truncated?page.cursor:undefined;}while(cursor);
        await this.env.COACH.getByName(user.id).erase();
        await this.env.DB.prepare('DELETE FROM user WHERE id = ?').bind(user.id).run();
        return {status:200,data:{success:true,deleted:true}};
      }
      if(op.kind==='entity') {
        if(!entityNames.includes(op.name as EntityName))throw new ApiError('Unknown resource.',404);
        const entity=repo.entity(op.name as EntityName);let data:unknown;
        switch(op.method) {
          case 'create':data=await entity.create(op.input);break;
          case 'update':data=await entity.update(op.id!,op.input);break;
          case 'delete':data=await entity.delete(op.id!);break;
          case 'bulkCreate':data=await entity.bulkCreate(op.input);break;
          case 'updateMany':data=await entity.updateMany(op.input.filter,op.input.update);break;
          case 'deleteMany':data=await entity.deleteMany(op.input.filter);break;
          default:throw new ApiError('Unknown operation.');
        }
        return {status:200,data};
      }
      throw new ApiError('Unknown operation.');
    }catch(error) {
      const e=error as Error&{status?:number;code?:string};
      return {status:e.status||500,data:{error:e.status?e.message:'Could not save this change. Please retry.',code:e.code||'REQUEST_FAILED'}};
    }
  }
}
