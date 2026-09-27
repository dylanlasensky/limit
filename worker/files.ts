import {storageBudget} from "./budget";
import { ApiError } from './errors';
import { mediaSchema } from '../packages/contracts/media';
import { Repository } from './repository';
export async function upload(request:Request,env:Env,userId:string) {
  if(!env.FILES)throw new ApiError('File storage is not configured yet.',503,'STORAGE_NOT_CONFIGURED');
  const type=request.headers.get('content-type')?.split(';')[0]||'';
  if(!['image/jpeg','image/png','image/webp','application/pdf','text/plain'].includes(type))throw new ApiError('Use JPG, PNG, WebP, PDF or plain text.',415);
  const limit=8*1024*1024,reader=request.body?.getReader();if(!reader)throw new ApiError('Choose a file.');
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new ApiError('Files must be under 8 MB.',413);}chunks.push(value);}
  if(!size)throw new ApiError('File is empty.');
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const head=new TextDecoder().decode(bytes.slice(0,12));
  const valid=type==='text/plain'||(type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216)||(type==='image/png'&&bytes[0]===137&&head.slice(1,4)==='PNG')||(type==='image/webp'&&head.startsWith('RIFF')&&head.slice(8)==='WEBP')||(type==='application/pdf'&&head.startsWith('%PDF-'));
  if(!valid)throw new ApiError('File content does not match its type.');
  const id=crypto.randomUUID(),key=`private/${userId}/${id}`;
  await storageBudget(env,size);
  await env.FILES.put(key,bytes,{httpMetadata:{contentType:type},customMetadata:{ownerId:userId}});
  try{await env.DB.prepare('INSERT INTO uploads (id,owner_id,object_key,content_type,size,created_at) VALUES (?,?,?,?,?,?)').bind(id,userId,key,type,size,new Date().toISOString()).run();}
  catch(error){await env.FILES.delete(key);throw error;}
  return Response.json({file_uri:key,id},{headers:{'Cache-Control':'no-store'}});
}
export async function privateFile(env:Env,userId:string,id:string) {
  const row=await env.DB.prepare('SELECT object_key,content_type FROM uploads WHERE id = ? AND owner_id = ?').bind(id,userId).first<{object_key:string;content_type:string}>();
  if(!row)throw new ApiError('File not found.',404);
  await storageBudget(env);
  const object=await env.FILES.get(row.object_key);if(!object)throw new ApiError('File not found.',404);
  return new Response(object.body,{headers:{'Content-Type':row.content_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'attachment'}});
}
export async function mediaInfo(env:Env,key:string) {
  const exercise=await new Repository(env.DB,'').entity('Exercise').get(key);
  const stored=await env.DB.prepare('SELECT data FROM exercise_media WHERE catalog_key = ?').bind(key).first<{data:string}>();
  const fallback=mediaSchema.parse({catalogKey:key,poster:null,source:null,format:null,caption:'',angle:'unspecified',duration:0,version:1,reviewStatus:'missing',reviewer:null,safetyClassification:exercise.coachingRecommended?'coaching-recommended':'general',textFallback:exercise.instructions||[],license:null});
  const parsed=stored?mediaSchema.safeParse(JSON.parse(stored.data)):null;
  return Response.json(parsed?.success&&parsed.data.reviewStatus==='approved'?parsed.data:fallback,{headers:{'Cache-Control':'public,max-age=300'}});
}
export async function mediaAsset(request:Request,env:Env,key:string,version:number,kind:string) {
  const stored=await env.DB.prepare('SELECT data FROM exercise_media WHERE catalog_key = ?').bind(key).first<{data:string}>();
  if(!stored)throw new ApiError('Media not found.',404);
  const media=mediaSchema.parse(JSON.parse(stored.data));
  const objectKey=kind==='poster'?media.poster:kind==='video'?media.source:null;
  if(media.reviewStatus!=='approved'||media.version!==version||!objectKey)throw new ApiError('Media not found.',404);
  await storageBudget(env);
  const object=await env.MEDIA.get(objectKey,{range:request.headers});if(!object)throw new ApiError('Media not found.',404);
  const headers=new Headers({'Cache-Control':'public,max-age=31536000,immutable','ETag':object.httpEtag,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'});object.writeHttpMetadata(headers);
  if(object.range&&'offset' in object.range&&'length' in object.range&&object.range.offset!==undefined&&object.range.length!==undefined){headers.set('Content-Range',`bytes ${object.range.offset}-${object.range.offset+object.range.length-1}/${object.size}`);headers.set('Content-Length',String(object.range.length));return new Response(object.body,{status:206,headers});}
  headers.set('Content-Length',String(object.size));return new Response(object.body,{headers});
}
