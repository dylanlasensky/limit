"""Original parametric 2-D teaching schematics. Never mark human fitness review automatically."""
import argparse, csv, hashlib, json, math, os, pathlib, subprocess, textwrap
from PIL import Image, ImageDraw, ImageFont
parser=argparse.ArgumentParser();parser.add_argument('--output',default='media-output');parser.add_argument('--ffmpeg',default=os.getenv('FFMPEG','ffmpeg'));parser.add_argument('--only');args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[2];out=pathlib.Path(args.output);out.mkdir(parents=True,exist_ok=True)
catalog=json.loads((out/'catalog.json').read_text());W,H,FPS,DURATION=960,540,24,8
# Pillow's bundled font makes rendering independent of installed system fonts.
font=lambda size:ImageFont.load_default(size=size)
FONTS={n:font(n) for n in [14,16,18,22,26,30]}
# Explicit exact-key allowlist: no fuzzy substitution of similar but different exercises.
TEMPLATES={
 'bodyweight-squat':('squat',False), 'squat-to-bench':('squat',True),
 'bodyweight-calf-raise':('calf',False), 'dumbbell-standing-calf-raise':('calf',True),
 'dumbbell-curl':('curl',False),'hammer-curl':('curl',True),
 'seated-dumbbell-curl':('seated-curl',False),
 'dumbbell-front-raise':('front-raise',False),
 'glute-bridge':('bridge',False),'dumbbell-glute-bridge':('bridge',True),
}
BG='#080d18';CARD='#131e30';INK='#eaf1fc';MUTED='#aab9d0';BLUE='#73acff';FAR='#425873'
def xy(p):return tuple(round(v) for v in p)
def add(a,b):return(a[0]+b[0],a[1]+b[1])
def polar(p,length,angle):return add(p,(length*math.cos(angle),length*math.sin(angle)))
def ik(a,b,l1,l2,side=1):
 dx,dy=b[0]-a[0],b[1]-a[1];dist=math.hypot(dx,dy)
 if not abs(l1-l2)<dist<l1+l2:raise ValueError('Unreachable joint pose')
 along=(l1*l1-l2*l2+dist*dist)/(2*dist);height=math.sqrt(max(0,l1*l1-along*along))
 return(a[0]+along*dx/dist+side*height*dy/dist,a[1]+along*dy/dist-side*height*dx/dist)
def line(d,a,b,color=BLUE,width=15):
 d.line([xy(a),xy(b)],fill=color,width=width)
 for p in [a,b]:d.ellipse((p[0]-width/2,p[1]-width/2,p[0]+width/2,p[1]+width/2),fill=color)
def limb(d,points,color=BLUE,width=15):
 for a,b in zip(points,points[1:]):line(d,a,b,color,width)
def weight(d,p,hammer=False):
 x,y=p
 if hammer:d.rectangle((x-5,y-18,x+5,y+18),fill=INK);d.rounded_rectangle((x-12,y-25,x+12,y-13),4,fill='#8a9bb6');d.rounded_rectangle((x-12,y+13,x+12,y+25),4,fill='#8a9bb6')
 else:d.rectangle((x-22,y-4,x+22,y+4),fill=INK);d.rounded_rectangle((x-28,y-13,x-16,y+13),4,fill='#8a9bb6');d.rounded_rectangle((x+16,y-13,x+28,y+13),4,fill='#8a9bb6')
def body(d,hip,shoulder,head):
 line(d,hip,shoulder,BLUE,29);line(d,shoulder,head,BLUE,15)
 d.ellipse((head[0]-17,head[1]-26,head[0]+17,head[1]+8),fill=INK)
 d.line((head[0]+12,head[1]-13,head[0]+21,head[1]-10),fill=INK,width=4)
def phase(t):
 # Rest -> two seconds controlled action -> hold -> two seconds return -> rest.
 p=t%8
 if p<1:return 0,'Set up'
 if p<3:return (1-math.cos(math.pi*(p-1)/2))/2,'Move with control'
 if p<4:return 1,'Pause comfortably'
 if p<6:return (1+math.cos(math.pi*(p-4)/2))/2,'Return with control'
 return 0,'Reset'
def draw_pose(d,kind,option,u):
 ankle=(310,447);hip=(302,294);shoulder=(296,168);head=(296,135)
 if kind=='squat':
  hip=(302-72*u,294+68*u);shoulder=polar(hip,126,-math.pi/2+.32*u);head=polar(shoulder,33,-math.pi/2+.15*u)
  if option:d.rounded_rectangle((130,378,245,399),7,fill=FAR);d.line((150,399,150,452),fill=FAR,width=9);d.line((225,399,225,452),fill=FAR,width=9)
  knee=ik(hip,ankle,79,78);limb(d,[hip,knee,ankle]);line(d,ankle,(347,450),INK,10)
  elbow=polar(shoulder,60,-.1);hand=polar(elbow,57,-.1);limb(d,[shoulder,elbow,hand]);body(d,hip,shoulder,head)
 elif kind=='bridge':
  shoulder=(170,435);hip=polar(shoulder,135,-.31*u);foot=(408,447);knee=ik(hip,foot,85,85,side=1)
  # Knee stays above the supported foot; shoulders and foot remain on the floor.
  limb(d,[hip,knee,foot]);line(d,foot,(438,450),INK,10);body(d,hip,shoulder,(140,447));limb(d,[shoulder,ik(shoulder,(hip[0]-10,hip[1]-18),76,68,side=-1),(hip[0]-10,hip[1]-18)] if option else [shoulder,(220,443),(272,447)],FAR,12)
  if option:weight(d,(hip[0],hip[1]-18));line(d,(hip[0]-25,hip[1]-15),(hip[0]+25,hip[1]-15),INK,4)
 else:
  lift=18*u if kind=='calf' else 0
  hip=add(hip,(0,-lift));shoulder=add(shoulder,(0,-lift));head=add(head,(0,-lift));ankle=add(ankle,(0,-lift))
  if kind=='seated-curl':
   hip=(282,320);shoulder=(278,194);head=(278,161);ankle=(377,447)
   d.rounded_rectangle((250,186,266,341),6,fill=FAR);d.rounded_rectangle((234,326,319,343),6,fill=FAR);d.line((250,341,250,450),fill=FAR,width=8)
   knee=(369,326);limb(d,[hip,knee,ankle])
  else:limb(d,[hip,((hip[0]+ankle[0])/2+6,(hip[1]+ankle[1])/2),ankle])
  line(d,ankle,(344 if kind=='calf' else ankle[0]+34,450),INK,10);body(d,hip,shoulder,head)
  if kind=='calf' and option:
   d.line((430,215,430,455),fill=FAR,width=7);d.line((418,215,460,215),fill=FAR,width=7);limb(d,[shoulder,ik(shoulder,(424,215),76,68),(424,215)],FAR,11)
  elbow=add(shoulder,(8,76));angle=math.pi/2-u*2.5 if 'curl' in kind else math.pi/2
  if kind=='front-raise':
   elbow=polar(shoulder,76,math.pi/2-u*math.pi/2);hand=polar(elbow,68,math.pi/2-u*math.pi/2)
  else:hand=polar(elbow,68,angle)
  limb(d,[shoulder,elbow,hand]);
  if 'curl' in kind or kind=='front-raise' or option:weight(d,hand,option if kind=='curl' else False)
 # All joints drawn inside the actor frame; ground is a fixed reference.
 d.line((100,460,485,460),fill=FAR,width=2)
def wrap(d,text,x,y,width=39,size=18,color=MUTED):
 for ln in textwrap.wrap(text,width):d.text((x,y),ln,font=FONTS[size],fill=color);y+=size+9
 return y
logo=Image.open(root/'public/brand/limit-logo.png').convert('RGBA');logo.thumbnail((110,50))
def frame(e,t,template=None):
 im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im);d.rounded_rectangle((30,85,520,480),24,fill=CARD)
 d.text((32,22),'LIMIT  /  MOVEMENT GUIDE',font=FONTS[18],fill=BLUE)
 wrap(d,e['name'],555,90,24,26,INK)
 y=max(180,90+len(textwrap.wrap(e['name'],24))*35+15)
 for i,cue in enumerate(e.get('instructions',[])[:3]):
  short=textwrap.shorten(cue,width=95,placeholder='…')
  y=wrap(d,f'{i+1}. {short}',555,y,36,16)+13
 if template:
  u,label=phase(t);draw_pose(d,*template,u);d.text((55,105),label,font=FONTS[22],fill=INK)
  d.rounded_rectangle((55,485,55+int(440*t/8),490),2,fill=BLUE)
 else:
  d.text((70,220),'Written guide',font=FONTS[30],fill=INK)
  wrap(d,'Movement rendering blocked until the exact setup and motion can be represented reliably.',70,270,34,18)
 im.paste(logo,(W-logo.width-30,20),logo)
 d.text((32,508),'Original generated schematic • Not human fitness-reviewed' if template else 'Written instructions remain available • No substitute animation',font=FONTS[16],fill=MUTED)
 return im
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
previous={r["catalogKey"]:r for r in json.loads((root/"media/manifest.json").read_text())} if (root/"media/manifest.json").exists() else {}
manifest=[]
for e in catalog:
 key=e['catalogKey'];template=TEMPLATES.get(key);folder=out/key;folder.mkdir(exist_ok=True)
 poster=folder/'poster.png';video=folder/'movement.mp4'
 if not args.only or key==args.only or not poster.exists():frame(e,0,template).save(poster,optimize=True)
 if template and (not args.only or key==args.only):
  command=[args.ffmpeg,'-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{W}x{H}','-framerate',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','27','-pix_fmt','yuv420p','-movflags','+faststart',str(video)]
  process=subprocess.Popen(command,stdin=subprocess.PIPE)
  for n in range(FPS*DURATION):process.stdin.write(frame(e,n/FPS,template).tobytes())
  process.stdin.close()
  if process.wait()!=0:raise RuntimeError('Encoding failed: '+key)
  subprocess.run([args.ffmpeg,'-v','error','-i',str(video),'-f','null','-'],check=True)
  print('Rendered and decoded',key,flush=True)
 complete=bool(template and video.exists())
 reason='' if complete else f"{e['name']}: no exact verified motion template for {e.get('equipment','this setup')}. Rendering must preserve the catalog's setup, grip, support and joint path; an approximate animation is not substituted."
 caption=' '.join(e.get('instructions',[])[:3])
 version=int(hashlib.sha256((sha(poster)+(sha(video) if complete else '')).encode()).hexdigest()[:12],16) or 1
 record={'catalogKey':key,'name':e['name'],'poster':f'exercises/{key}/v{version}/{sha(poster)}.png','source':f'exercises/{key}/v{version}/{sha(video)}.mp4' if complete else None,'format':'mp4' if complete else None,'caption':caption,'angle':'side' if complete else 'unspecified','duration':DURATION if complete else 0,'version':version,'reviewStatus':'technical' if complete else 'blocked','reviewer':None,'safetyClassification':'coaching-recommended' if e.get('coachingRecommended') else 'general','textFallback':e.get('instructions',[]),'license':'Original LIMIT-generated schematic; no third-party footage','generated':True,'width':W,'height':H,'fps':FPS if complete else 0,'posterSha256':sha(poster),'videoSha256':sha(video) if complete else None,'bytes':poster.stat().st_size+(video.stat().st_size if complete else 0),'blockReason':reason,'template':template[0] if template else None,'technicalChecks':['exact-catalog-key','fixed-framing','silent','h264-yuv420p','full-decode'] if complete else ['exact-catalog-key','written-fallback']}
 old=previous.get(key,{})
 if complete and old.get('videoSha256')==record['videoSha256'] and old.get('posterSha256')==record['posterSha256'] and old.get('reviewStatus') in ['approved','draft']:
  for field in ['reviewStatus','reviewer','reviewEvidence']:record[field]=old[field]
 manifest.append(record)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(root/'media/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
with (root/'docs/exercise-media-checklist.csv').open('w') as f:
 writer=csv.writer(f,lineterminator="\n");writer.writerow(['catalog_key','name','equipment','media_status','license','reviewer','review_evidence','block_reason'])
 for e,r in zip(catalog,manifest):writer.writerow([r['catalogKey'],r['name'],e['equipment'],r['reviewStatus'],r['license'],r.get('reviewer') or '',r.get('reviewEvidence') or '',r['blockReason']])
print(json.dumps({'catalog':len(manifest),'technical':sum(r['reviewStatus']=='technical' for r in manifest),'blocked':sum(r['reviewStatus']=='blocked' for r in manifest),'bytes':sum(r['bytes'] for r in manifest)}))
