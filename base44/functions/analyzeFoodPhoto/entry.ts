import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const schema={type:'object',properties:{kind:{type:'string',enum:['nutrition_label','package','meal','unknown']},title:{type:'string'},brand:{type:'string'},variant:{type:'string'},packageSize:{type:'string'},reliable:{type:'boolean'},servingSize:{type:'string'},servingsPerContainer:{type:'number'},message:{type:'string'},clarifyingQuestion:{type:'string'},possibleAllergens:{type:'array',items:{type:'string'}},nutrients:{type:'object',properties:{calories:{type:'number'},protein:{type:'number'},carbs:{type:'number'},fat:{type:'number'},fiber:{type:'number'},sugar:{type:'number'},sodium:{type:'number'}}},items:{type:'array',items:{type:'object',properties:{name:{type:'string'},amount:{type:'number'},unit:{type:'string'},calories:{type:'number'},protein:{type:'number'},carbs:{type:'number'},fat:{type:'number'},fiber:{type:'number'},sugar:{type:'number'},sodium:{type:'number'}}}}},required:['kind','title','reliable','possibleAllergens','nutrients','items']};

export default async function(req) {
  try {
    const base44=createClientFromRequest(req),user=await base44.auth.me();
    if(!user)return Response.json({error:'Unauthorized'},{status:401});
    const input=await req.json();
    if(typeof input?.fileUri!=='string'||input.fileUri.length>2048||!['food','meal'].includes(input.scanMode))return Response.json({error:'Invalid food scan request.'},{status:400});
    const clarification=typeof input.clarification==='string'?input.clarification.slice(0,500):'';
    const allergies=Array.isArray(input.allergies)?input.allergies.slice(0,30).map(value=>String(value).slice(0,80)):[];
    const meal=input.scanMode==='meal';
    const signed=await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:input.fileUri,expires_in:900});
    const result=await base44.asServiceRole.integrations.Core.InvokeLLM({file_urls:[signed.signed_url],response_json_schema:schema,prompt:`Analyze this food image for the Limit nutrition tracker. Requested mode: ${meal?'actual plated meal':'packaged food or Nutrition Facts label'}. First classify it as nutrition_label, package, meal, or unknown. ${meal?'Identify each visible food, estimate its US customary portion, estimate calories, protein, carbs, and fat for each item, and sum nothing outside the items. Estimates must be conservative. Ask at most one short clarifying question only if the answer materially changes the estimate.':'If a readable Nutrition Facts label is visible, transcribe per-serving values exactly and set reliable true. Extract serving size, servings per container, calories, protein, total carbs, fat, fiber, sugar, and sodium. If only the package front is visible, identify the product but set reliable false and leave unknown nutrient numbers as 0.'} Flag possible allergens without claiming certainty. Saved allergies: ${JSON.stringify(allergies)}. ${clarification?`The user answered the clarification: ${clarification}. Return a revised final analysis and no further question.`:''}`});
    return Response.json(result);
  }catch(error){return Response.json({error:error.message||'Food analysis failed.'},{status:500});}
}