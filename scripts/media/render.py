"""Original parametric 2-D teaching schematics. Never mark human fitness review automatically."""
import argparse, csv, hashlib, json, math, os, pathlib, subprocess, textwrap
from PIL import Image, ImageDraw, ImageFont
from blockers import reason_for
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
 'push-up':('push-up','floor'),
 'kneeling-push-up':('push-up','knees'),
 'incline-push-up':('push-up','incline-bench'),
 'decline-push-up':('push-up','decline-bench'),
 'single-leg-calf-raise':('single-calf',None),
 'dumbbell-seated-calf-raise':('seated-calf',None),
}
BLOCK_REASONS={
 'deficit-push-up':'needs both parallettes at a fixed stable height and a shoulder path below hand level without clipping the supports',
 'close-grip-push-up':'needs a front or oblique view that shows narrow hand placement and elbow tracking; the side view hides grip width',
 'weighted-push-up':'needs a secure, visible external load on the torso that remains stable during the entire descent and return',
 'suspension-push-up':'needs suspended handles, anchor lines and changing strap angles while preserving a stable body line',
 'pike-push-up':'needs the inverted hip setup and near-vertical shoulder press path rather than a horizontal push-up path',
 'wall-handstand-push-up':'needs a wall, inverted body support and vertical pressing path with a controlled head clearance',
 'plank-shoulder-tap':'needs a unilateral hand transfer and visible anti-rotation control while the support hand remains planted',
 'side-plank-hip-lift':'needs a lateral view of the forearm and foot support with vertical hip travel',
 'plyometric-push-up':'needs separate takeoff, unsupported flight and controlled bilateral hand landing phases',
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
 if kind=='single-calf':
  # The working forefoot and balance hand remain planted. The other foot never
  # contacts the ground; only the working heel and body rise.
  toe=(340,450);ankle=(304,441-18*u)
  hip=(302,295-18*u);shoulder=(296,169-18*u);head=(296,136-18*u)
  if abs(math.dist(hip,ankle)-math.hypot(2,146))>1e-6 or 407-18*u>=toe[1]:raise ValueError('Single-leg calf support changed')
  d.line((432,185,432,460),fill=FAR,width=8)
  d.line((420,185,455,185),fill=FAR,width=8)
  limb(d,[hip,(303,370-18*u),ankle],BLUE,17)
  line(d,ankle,toe,INK,10)
  limb(d,[hip,(251,355-18*u),(270,407-18*u)],FAR,12)
  line(d,(270,407-18*u),(286,409-18*u),INK,7)
  hand=(420,248)
  limb(d,[shoulder,ik(shoulder,hand,97,76,side=1),hand],INK,11)
  body(d,hip,shoulder,head)
 elif kind=='seated-calf':
  # Hip, seat and forefoot are fixed. Constant thigh/shin/foot lengths allow
  # the knee to rise as the loaded heel plantar-flexes around the forefoot.
  d.rounded_rectangle((243,323,330,340),5,fill=FAR)
  d.rounded_rectangle((244,205,260,338),5,fill=FAR)
  d.line((260,340,260,459),fill=FAR,width=8)
  toe=(430,450);ankle_y=440-16*u
  ankle=(toe[0]-math.sqrt(48**2-(toe[1]-ankle_y)**2),ankle_y)
  hip=(296,320);shoulder=(291,196);head=(291,162)
  knee=ik(hip,ankle,80,110,side=1)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((hip,knee,80),(knee,ankle,110),(ankle,toe,48))):raise ValueError('Seated calf segment changed length')
  limb(d,[hip,knee,ankle],BLUE,16)
  line(d,ankle,toe,INK,10)
  body(d,hip,shoulder,head)
  load=(knee[0]-11,knee[1]-20)
  limb(d,[shoulder,(320,263),load],INK,10)
  weight(d,load)
 elif kind=='push-up':
  # Side view: hand and foot/knee supports stay fixed; shoulder, hips, and
  # elbows travel together. Elevated supports are drawn at their actual ends.
  wrist=(270,442);foot=(470,442)
  if option=='incline-bench':
   wrist=(270,365)
   d.rounded_rectangle((215,372,325,387),5,fill=FAR)
   for x in (235,305):d.line((x,387,x,460),fill=FAR,width=8)
  if option=='decline-bench':
   foot=(470,336)
   d.rounded_rectangle((425,344,505,359),5,fill=FAR)
   for x in (442,490):d.line((x,359,x,460),fill=FAR,width=8)
  top={'floor':335,'knees':345,'incline-bench':265,'decline-bench':345}[option]
  support=(420,440) if option=='knees' else foot
  shoulder_y=top+49*u
  body_length=math.hypot(support[0]-270,support[1]-top)
  shoulder=(support[0]-math.sqrt(body_length**2-(support[1]-shoulder_y)**2),shoulder_y)
  hip=(shoulder[0]+.68*(support[0]-shoulder[0]),shoulder[1]+.68*(support[1]-shoulder[1]))
  if abs(math.dist(shoulder,hip)-.68*body_length)>1e-6 or abs(math.dist(hip,support)-.32*body_length)>1e-6:raise ValueError('Push-up body segment changed length')
  elbow=ik(shoulder,wrist,56,56,side=1)
  limb(d,[shoulder,hip,support],BLUE,25)
  limb(d,[shoulder,elbow,wrist],INK,13)
  line(d,wrist,(wrist[0]-18,wrist[1]+2),INK,9)
  if option=='knees':
   line(d,support,foot,BLUE,14)
   line(d,foot,(492,449),INK,9)
  else:line(d,foot,(492,foot[1]+3),INK,9)
  head=(shoulder[0]-35,shoulder[1]-8)
  d.ellipse((head[0]-23,head[1]-17,head[0]+12,head[1]+17),fill=INK)
  d.line((head[0]-14,head[1]+12,head[0]-4,head[1]+12),fill=BG,width=3)
 elif kind=='squat':
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
 reason='' if complete else (f"{e['name']}: {BLOCK_REASONS[key]}." if key in BLOCK_REASONS else reason_for(e))
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
