import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
const origin=process.env.LIMIT_API_URL;assert.ok(origin?.startsWith('https://'));
const rows=JSON.parse(readFileSync('media/manifest.json'));
for(const row of rows.filter(r=>r.source)) {
 const response=await fetch(`${origin}/api/media/${row.catalogKey}`);assert.equal(response.status,200);const info=await response.json();assert.equal(info.videoSha256,row.videoSha256);
 const url=`${origin}/api/media/${row.catalogKey}/${row.version}/video`;
 const full=await fetch(url);assert.equal(full.status,200);assert.equal(createHash('sha256').update(new Uint8Array(await full.arrayBuffer())).digest('hex'),row.videoSha256);
 const range=await fetch(url,{headers:{range:'bytes=0-63'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,64);assert.match(range.headers.get('content-range'),/^bytes 0-63\//);
}
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['/privacy','/terms','/support','/data-export','/account-deletion','/ai-disclosure']){const r=await page.goto(origin+route);assert.equal(r.status(),200);assert.ok(await page.locator('h1').textContent());}
 await page.goto(origin+'/exercises');await page.getByRole('textbox',{name:'Search exercises',exact:true}).fill('Bodyweight Squat');await page.getByRole('button',{name:/^Bodyweight Squat /}).click();
 const video=page.locator('video');await video.waitFor();assert.equal(await video.evaluate(v=>v.paused&&!v.autoplay),true);await video.evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0);await video.evaluate(v=>v.pause());
 const playback=[];
 for(const row of rows.filter(r=>r.source)){
  const result=await page.evaluate(async ({url})=>{
   const v=document.createElement('video');v.controls=true;v.muted=true;v.playsInline=true;v.style.width='320px';document.body.appendChild(v);v.src=url;
   try{
    await v.play();
    await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Video did not finish within 20 seconds')),20000);v.addEventListener('ended',()=>{clearTimeout(timeout);resolve()},{once:true});v.addEventListener('error',()=>{clearTimeout(timeout);reject(new Error('Video playback error'))},{once:true});});
    return {duration:v.duration,currentTime:v.currentTime,frames:v.getVideoPlaybackQuality().totalVideoFrames,width:v.videoWidth,height:v.videoHeight};
   }finally{v.remove();}
  },{url:`${origin}/api/media/${row.catalogKey}/${row.version}/video`});
  assert.equal(result.duration,row.duration,`${row.catalogKey}: duration`);
  assert.equal(result.currentTime,row.duration,`${row.catalogKey}: incomplete playback`);
  assert.equal(result.width,row.width,`${row.catalogKey}: width`);
  assert.equal(result.height,row.height,`${row.catalogKey}: height`);
  assert.ok(result.frames>=100,`${row.catalogKey}: too few decoded frames (${result.frames})`);
  playback.push({catalogKey:row.catalogKey,frames:result.frames});
 }
 assert.equal(errors.length,0,errors.join('\n'));console.log(JSON.stringify({mediaChecksums:rows.filter(r=>r.source).length,rangeRequests:'passed',browserPlayback:playback,publicPages:6}));
}finally{await browser.close();}
