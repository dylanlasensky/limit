import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const schema={type:'object',properties:{name:{type:'string'},notes:{type:'string'},days:{type:'array',items:{type:'object',properties:{name:{type:'string'},weekday:{type:'number'},coachMandated:{type:'boolean'},fixedSchedule:{type:'boolean'},exercises:{type:'array',items:{type:'object',properties:{name:{type:'string'},sets:{type:'number'},repMin:{type:'number'},repMax:{type:'number'},restSeconds:{type:'number'},notes:{type:'string'},progressionNotes:{type:'string'},coachMandated:{type:'boolean'}}}}}}}}};

export default async function(req) {
  try{
    const base44=createClientFromRequest(req),user=await base44.auth.me();
    if(!user)return Response.json({error:'Unauthorized'},{status:401});
    const input=await req.json(),text=typeof input?.text==='string'?input.text.trim():'';
    if(text.length>50000)return Response.json({error:'Workout text is too long.'},{status:400});
    if(!text&&typeof input?.fileUri!=='string')return Response.json({error:'Add workout text or a file.'},{status:400});
    let fileUrls;
    if(input.fileUri){
      if(typeof input.fileUri!=='string'||input.fileUri.length>2048)return Response.json({error:'Invalid workout file.'},{status:400});
      const signed=await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:input.fileUri,expires_in:900});
      fileUrls=[signed.signed_url];
    }
    const prompt=`Parse the supplied workout regimen into a faithful structured plan. Preserve coach intent and day order. Extract day names, weekday where explicit (Monday=0), exercise names, sets, minimum and maximum reps, rest in seconds, notes, and progression instructions. Never invent missing exercises. Use 3 sets, 8-12 reps, and 120 seconds only when a field is genuinely absent. Mark fixed or coach-mandated work when the source says so. ${text?`SOURCE TEXT:\n${text}`:'Read the attached regimen file.'}`;
    const parsed=await base44.asServiceRole.integrations.Core.InvokeLLM({prompt,file_urls:fileUrls,response_json_schema:schema});
    return Response.json(parsed);
  }catch(error){return Response.json({error:error.message||'Workout import failed.'},{status:500});}
}