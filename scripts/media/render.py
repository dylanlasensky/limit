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
 'quadruped-hip-extension':('quadruped-hip-extension',None),
 'crunch':('crunch',None),
 'reverse-crunch':('reverse-crunch',None),
 'lying-leg-raise':('lying-leg-raise',None),
 'side-lying-hip-abduction':('side-lying-hip-abduction',None),
 'side-lying-hip-adduction':('side-lying-hip-adduction',None),
 'wall-tibialis-raise':('wall-tibialis-raise',None),
 'dumbbell-shrug':('dumbbell-shrug',None),
 'dumbbell-lateral-raise':('dumbbell-lateral-raise',False),
 'seated-dumbbell-lateral-raise':('dumbbell-lateral-raise',True),
 'dumbbell-overhead-triceps-extension':('overhead-triceps',2),
 'single-arm-dumbbell-triceps-extension':('overhead-triceps',1),
 'dumbbell-skull-crusher':('skull-crusher',None),
 'dumbbell-triceps-kickback':('triceps-kickback',None),
 'dumbbell-pullover':('dumbbell-pullover',None),
 'single-arm-dumbbell-row':('dumbbell-row','bench-supported'),
 'dumbbell-bent-over-row':('dumbbell-row','unsupported'),
 'goblet-squat':('loaded-squat','goblet'),
 'dumbbell-front-squat':('loaded-squat','front-rack'),
 'heel-elevated-goblet-squat':('loaded-squat','heel-wedge'),
 'dumbbell-shoulder-press':('dumbbell-overhead-press','seated'),
 'standing-dumbbell-press':('dumbbell-overhead-press','standing'),
 'neutral-grip-dumbbell-shoulder-press':('dumbbell-overhead-press','neutral'),
 'single-arm-dumbbell-overhead-press':('dumbbell-overhead-press','single'),
 'dumbbell-bench-press':('dumbbell-horizontal-press','bench'),
 'incline-dumbbell-bench-press':('dumbbell-horizontal-press','incline'),
 'dumbbell-floor-press':('dumbbell-horizontal-press','floor'),
 'decline-dumbbell-bench-press':('dumbbell-horizontal-press','decline'),
 'chest-supported-dumbbell-row':('chest-supported-row','incline'),
 'dumbbell-seal-row':('chest-supported-row','seal'),
 'side-plank-hip-lift':('side-plank-hip-lift',None),
 'dumbbell-wrist-curl':('wrist-curl','palm-up'),
 'dumbbell-reverse-wrist-curl':('wrist-curl','palm-down'),
 'alternating-dumbbell-curl':('alternating-curl',None),
 'cross-body-hammer-curl':('cross-body-curl',None),
 'incline-dumbbell-curl':('supported-curl','incline'),
 'concentration-curl':('supported-curl','thigh'),
 'dumbbell-preacher-curl':('supported-curl','preacher'),
 'spider-curl':('spider-curl',None),
 'side-lying-dumbbell-external-rotation':('side-lying-external-rotation',None),
 'dumbbell-side-bend':('dumbbell-side-bend',None),
 'reverse-nordic-curl':('reverse-nordic-curl',None),
 'pistol-squat':('pistol-squat',None),
 'bodyweight-lateral-lunge':('lateral-lunge','bodyweight'),
 'dumbbell-lateral-lunge':('lateral-lunge','dumbbell'),
 'cossack-squat':('cossack-squat',None),
 'plate-front-raise':('plate-front-raise',None),
 'weighted-crunch':('crunch','plate'),
 'hand-gripper-close':('hand-gripper-close',None),
 'slider-leg-curl':('slider-leg-curl',None),
 'stability-ball-leg-curl':('stability-ball-leg-curl',None),
 'resistance-band-pull-apart':('band-pull-apart',None),
 'resistance-band-lateral-raise':('band-lateral-raise',None),
 'resistance-band-front-raise':('band-front-raise',None),
 'resistance-band-curl':('band-curl',None),
 'resistance-band-triceps-pushdown':('band-triceps-pushdown',None),
 'resistance-band-row':('band-row',None),
 'resistance-band-overhead-press':('band-overhead-press',None),
 'resistance-band-pulldown':('band-straight-arm-pulldown',None),
 'resistance-band-chest-press':('band-chest-press',None),
 'kettlebell-row':('kettlebell-row',None),
 'resistance-band-overhead-triceps-extension':('band-overhead-triceps',None),
 'resistance-band-leg-curl':('band-leg-curl',None),
 'band-ankle-dorsiflexion':('band-ankle-dorsiflexion',None),
 'stability-ball-crunch':('stability-ball-crunch',None),
 'decline-crunch':('decline-crunch',None),
 'inverted-row':('inverted-row',None),
 'seated-cable-row':('seated-cable-row',None),
 'single-arm-cable-row':('single-arm-cable-row',None),
 'standing-cable-row':('standing-cable-row',None),
 'half-kneeling-cable-row':('half-kneeling-cable-row',None),
 'cable-triceps-pushdown':('cable-triceps-pushdown',None),
 'overhead-cable-triceps-extension':('cable-overhead-triceps',None),
 'cable-triceps-kickback':('cable-triceps-kickback',None),
 'leg-extension':('machine-leg-extension',None),
 'single-leg-extension':('machine-single-leg-extension',None),
 'resistance-band-leg-extension':('band-leg-extension',None),
 'seated-leg-curl':('machine-seated-leg-curl',None),
 'lying-leg-curl':('machine-lying-leg-curl',None),
 'standing-leg-curl':('machine-standing-leg-curl',None),
 'standing-calf-raise':('machine-standing-calf',None),
 'seated-calf-raise':('machine-seated-calf',None),
 'cable-curl':('low-cable-curl','bilateral'),
 'single-arm-cable-curl':('low-cable-curl','unilateral'),
 'bayesian-cable-curl':('low-cable-curl','behind-body'),
 'straight-arm-cable-pulldown':('cable-straight-arm','bilateral'),
 'single-arm-cable-pullover':('cable-straight-arm','unilateral'),
 'glute-bridge':('bridge',False),'dumbbell-glute-bridge':('bridge',True),
 'push-up':('push-up','floor'),
 'kneeling-push-up':('push-up','knees'),
 'incline-push-up':('push-up','incline-bench'),
 'decline-push-up':('push-up','decline-bench'),
 'single-leg-calf-raise':('single-calf',None),
 'dumbbell-seated-calf-raise':('seated-calf',None),
 'bodyweight-split-squat':('split-squat','floor'),
 'bodyweight-bulgarian-split-squat':('split-squat','rear-bench'),
 'bodyweight-reverse-lunge':('reverse-lunge',None),
 'dumbbell-split-squat':('split-squat','floor-dumbbell'),
 'bulgarian-split-squat':('split-squat','rear-bench-dumbbell'),
 'dumbbell-reverse-lunge':('reverse-lunge','dumbbell'),
 'bodyweight-step-up':('step-up','bodyweight'),
 'dumbbell-step-up':('step-up','dumbbell'),
}
BLOCK_REASONS={
 'dumbbell-romanian-deadlift':'the current side-view draft over-bends the knee at the bottom of the hinge; keep this blocked until fixed foot contact, near-straight knee travel, hip displacement and two close dumbbell paths are jointly constrained',
 'deficit-push-up':'needs both parallettes at a fixed stable height and a shoulder path below hand level without clipping the supports',
 'close-grip-push-up':'needs a front or oblique view that shows narrow hand placement and elbow tracking; the side view hides grip width',
 'weighted-push-up':'needs a secure, visible external load on the torso that remains stable during the entire descent and return',
 'suspension-push-up':'needs suspended handles, anchor lines and changing strap angles while preserving a stable body line',
 'pike-push-up':'needs the inverted hip setup and near-vertical shoulder press path rather than a horizontal push-up path',
 'wall-handstand-push-up':'needs a wall, inverted body support and vertical pressing path with a controlled head clearance',
 'plank-shoulder-tap':'needs a unilateral hand transfer and visible anti-rotation control while the support hand remains planted',
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
def alternating_phase(t):
 p=t%4
 if p<.5:return 0,'Set up right' if t<4 else 'Set up left'
 if p<1.5:return (1-math.cos(math.pi*(p-.5)))/2,'Curl right' if t<4 else 'Curl left'
 if p<2:return 1,'Pause comfortably'
 if p<3:return (1+math.cos(math.pi*(p-2)))/2,'Lower with control'
 return 0,'Switch sides' if t<4 else 'Reset'
def draw_pose(d,kind,option,u):
 ankle=(310,447);hip=(302,294);shoulder=(296,168);head=(296,135)
 if kind=='cable-straight-arm':
  # A high pulley and fixed near-straight arms create shoulder extension;
  # the unilateral version leaves one arm at rest.
  single=option=='unilateral';anchor=(443,111)
  d.line((463,86,463,456),fill=FAR,width=7)
  d.rounded_rectangle((446,337,479,421),5,fill=FAR,outline=INK,width=2)
  for y in (352,371,390,409):d.line((449,y,476,y),fill=INK,width=2)
  d.ellipse((anchor[0]-12,anchor[1]-12,anchor[0]+12,anchor[1]+12),fill=FAR,outline=INK,width=3)
  hip=(301,334);shoulder=(300,212);head=(298,173)
  limb(d,[hip,(280,388),(267,444)],FAR,16);line(d,(267,444),(246,448),INK,8)
  limb(d,[hip,(321,388),(341,444)],BLUE,17);line(d,(341,444),(363,448),INK,8)
  body(d,hip,shoulder,head)
  if single:limb(d,[shoulder,(281,291),(287,350)],FAR,10)
  angle=-.8+2.25*u
  hand_center=polar(polar(shoulder,73,angle),63,angle+.06)
  d.line([xy(anchor),xy(add(hand_center,(9,0)) if single else hand_center)],fill=INK,width=3)
  for offset,color in (((9,INK),) if single else ((-9,FAR),(9,INK))):
   start=(shoulder[0]+offset,shoulder[1]);elbow=polar(start,73,angle);hand=polar(elbow,63,angle+.06)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((start,elbow,73),(elbow,hand,63))):raise ValueError('Cable straight-arm length changed')
   if hand[1]<108 or hand[1]>355:raise ValueError('Cable straight-arm path changed')
   limb(d,[start,elbow,hand],color,11)
  h=add(hand_center,(9,0)) if single else hand_center
  d.rounded_rectangle((h[0]-15,h[1]-5,h[0]+15,h[1]+5),3,fill=FAR,outline=INK,width=2)
 elif kind=='low-cable-curl':
  # Low pulley, taut cable and elbow hinge are shared; the Bayesian variant
  # anchors behind the body with a fixed, gently extended upper arm.
  behind=option=='behind-body';single=option!='bilateral'
  anchor=(144,416) if behind else (462,416)
  tower_x=126 if behind else 480
  d.line((tower_x,95,tower_x,456),fill=FAR,width=7)
  d.rounded_rectangle((tower_x-17,330,tower_x+18,422),5,fill=FAR,outline=INK,width=2)
  for y in (348,368,388,408):d.line((tower_x-13,y,tower_x+14,y),fill=INK,width=2)
  d.ellipse((anchor[0]-12,anchor[1]-12,anchor[0]+12,anchor[1]+12),fill=FAR,outline=INK,width=3)
  hip=(302,332);shoulder=(298,211);head=(296,174)
  limb(d,[hip,(282,388),(269,445)],FAR,16);line(d,(269,445),(248,448),INK,8)
  limb(d,[hip,(320,387),(341,445)],BLUE,17);line(d,(341,445),(363,448),INK,8)
  body(d,hip,shoulder,head)
  if single:limb(d,[shoulder,(287,291),(292,354)],FAR,10)
  if not single:
   shared_hand=polar((321,294),66,math.pi/2-2.24*u)
   d.line([xy(anchor),xy(shared_hand)],fill=INK,width=3)
  for offset,color in (((9,INK),) if single else ((-9,FAR),(9,INK))):
   start=(shoulder[0]+offset,shoulder[1]);elbow=((272 if behind else 321)+offset,294)
   angle=math.pi/2-2.24*u
   hand=polar(elbow,66,angle)
   if abs(math.dist(elbow,hand)-66)>1e-6 or elbow[1]!=294:raise ValueError('Cable curl elbow or forearm changed')
   if single:d.line([xy(anchor),xy(hand)],fill=INK,width=3)
   limb(d,[start,elbow,hand],color,11)
   if single:d.rounded_rectangle((hand[0]-7,hand[1]-5,hand[0]+7,hand[1]+5),3,fill=FAR,outline=INK,width=2)
  if not single:d.rounded_rectangle((shared_hand[0]-15,shared_hand[1]-5,shared_hand[0]+15,shared_hand[1]+5),3,fill=FAR,outline=INK,width=2)
 elif kind=='machine-standing-calf':
  # The toe stays on a fixed raised step; the heel and carriage rise together
  # with a constant foot length and an unchanged long-leg/trunk silhouette.
  toe=(365,443);start_ankle_y=432;ankle_y=start_ankle_y-18*u
  ankle=(toe[0]-math.sqrt(48**2-(toe[1]-ankle_y)**2),ankle_y)
  dx=ankle[0]-(toe[0]-math.sqrt(48**2-(toe[1]-start_ankle_y)**2));dy=ankle_y-start_ankle_y
  hip=(301+dx,290+dy);shoulder=(296+dx,169+dy);head=(296+dx,135+dy)
  if abs(math.dist(ankle,toe)-48)>1e-6 or toe!=(365,443):raise ValueError('Standing machine calf foot support changed')
  d.rounded_rectangle((345,446,400,457),4,fill=FAR)
  d.line((245,95,245,456),fill=FAR,width=7)
  d.line((383,95,383,456),fill=FAR,width=7)
  d.rounded_rectangle((130,337,165,422),5,fill=FAR,outline=INK,width=2)
  for y in (353,372,391,410):d.line((134,y,161,y),fill=INK,width=2)
  d.line((163,185+dy,245,185+dy),fill=FAR,width=5)
  limb(d,[hip,(305+dx,361+dy),ankle],BLUE,18)
  line(d,ankle,toe,INK,10)
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+19),fill=INK)
  d.rounded_rectangle((shoulder[0]-23,shoulder[1]+9,shoulder[0]+33,shoulder[1]+23),4,fill=FAR,outline=INK,width=2)
  limb(d,[shoulder,(350+dx,244+dy),(383,251+dy)],INK,10)
 elif kind=='machine-seated-calf':
  # Hip/seat and forefoot remain fixed. A constant-length thigh and shin
  # make the knee rise under the machine's thigh pad when the heel lifts.
  toe=(430,450);ankle_y=440-16*u
  ankle=(toe[0]-math.sqrt(48**2-(toe[1]-ankle_y)**2),ankle_y)
  hip=(296,320);shoulder=(291,196);head=(291,162)
  knee=ik(hip,ankle,80,110,side=1)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((hip,knee,80),(knee,ankle,110),(ankle,toe,48))):raise ValueError('Seated machine calf segment changed length')
  d.rounded_rectangle((243,323,330,340),5,fill=FAR)
  d.rounded_rectangle((244,205,260,338),5,fill=FAR)
  d.line((260,340,260,459),fill=FAR,width=8)
  d.rounded_rectangle((414,451,453,460),3,fill=FAR)
  d.line((456,255,456,460),fill=FAR,width=7)
  d.rounded_rectangle((126,341,160,421),5,fill=FAR,outline=INK,width=2)
  for y in (356,375,394,413):d.line((130,y,156,y),fill=INK,width=2)
  d.line((160,291,knee[0]-22,knee[1]-16),fill=FAR,width=5)
  limb(d,[hip,knee,ankle],BLUE,16);line(d,ankle,toe,INK,10)
  line(d,hip,shoulder,BLUE,26);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+19),fill=INK)
  d.rounded_rectangle((knee[0]-22,knee[1]-22,knee[0]+17,knee[1]-9),4,fill=FAR,outline=INK,width=2)
  limb(d,[shoulder,(320,262),(knee[0]-5,knee[1]-21)],INK,10)
 elif kind=='machine-standing-leg-curl':
  # A fixed working thigh, knee pivot, shin roller, hand rail and planted
  # opposite foot distinguish the unilateral standing machine from a band.
  hip=(310,312);shoulder=(299,209);head=(296,173);knee=(288,365)
  d.line((466,85,466,456),fill=FAR,width=8)
  d.line((466,274,445,274),fill=INK,width=8)
  d.rounded_rectangle((135,344,168,422),5,fill=FAR,outline=INK,width=2)
  for y in (360,379,398,415):d.line((138,y,165,y),fill=INK,width=2)
  d.line((167,365,knee[0],365),fill=FAR,width=5)
  d.ellipse((knee[0]-11,knee[1]-11,knee[0]+11,knee[1]+11),fill=FAR,outline=INK,width=3)
  limb(d,[hip,(337,380),(345,445)],BLUE,18)
  line(d,(345,445),(367,448),INK,9)
  line(d,hip,shoulder,BLUE,28);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+19),fill=INK)
  limb(d,[shoulder,(358,256),(466,274)],INK,11)
  working_ankle=polar(knee,70,1.1+1.5*u)
  if abs(math.dist(knee,working_ankle)-70)>1e-6 or working_ankle[1]>=443:raise ValueError('Standing curl knee or clearance changed')
  limb(d,[hip,knee,working_ankle],FAR,16)
  d.ellipse((working_ankle[0]-13,working_ankle[1]-13,working_ankle[0]+13,working_ankle[1]+13),fill=FAR,outline=INK,width=3)
  line(d,working_ankle,(working_ankle[0]-18,working_ankle[1]+4),INK,8)
 elif kind=='machine-seated-leg-curl':
  # A fixed seat, thigh restraint and knee pivot constrain the seated curl.
  hip=(301,333);shoulder=(301,214);head=(300,176);knee=(374,325)
  d.rounded_rectangle((253,337,341,352),5,fill=FAR)
  d.rounded_rectangle((250,210,266,350),5,fill=FAR)
  for x in (269,330):d.line((x,352,x,456),fill=FAR,width=8)
  d.rounded_rectangle((135,342,168,421),5,fill=FAR,outline=INK,width=2)
  for y in (358,377,396,414):d.line((138,y,165,y),fill=INK,width=2)
  d.line((165,325,374,325),fill=FAR,width=5)
  d.ellipse((knee[0]-13,knee[1]-13,knee[0]+13,knee[1]+13),fill=FAR,outline=INK,width=3)
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+19),fill=INK)
  limb(d,[shoulder,(309,283),(300,333)],INK,10)
  line(d,hip,knee,BLUE,18)
  d.rounded_rectangle((333,297,385,309),4,fill=FAR,outline=INK,width=2)
  angle=1.8*u;foot=polar(knee,79,angle);roller=polar(knee,62,angle)
  if abs(math.dist(knee,foot)-79)>1e-6 or foot[1]>405:raise ValueError('Seated curl knee or clearance changed')
  line(d,knee,foot,BLUE,18)
  d.ellipse((roller[0]-13,roller[1]-13,roller[0]+13,roller[1]+13),fill=FAR,outline=INK,width=3)
  line(d,foot,(foot[0]+19,foot[1]+4),INK,8)
 elif kind=='machine-lying-leg-curl':
  # Prone trunk/hip contact and a knee pivot stay fixed as the heel rises.
  hip=(286,286);shoulder=(211,286);head=(176,276);knee=(388,288)
  d.rounded_rectangle((175,307,411,323),5,fill=FAR)
  for x in (198,385):d.line((x,323,x,456),fill=FAR,width=9)
  d.rounded_rectangle((100,352,133,426),5,fill=FAR,outline=INK,width=2)
  for y in (367,386,405,419):d.line((103,y,130,y),fill=INK,width=2)
  d.line((132,288,388,288),fill=FAR,width=5)
  d.ellipse((knee[0]-12,knee[1]-12,knee[0]+12,knee[1]+12),fill=FAR,outline=INK,width=3)
  line(d,shoulder,hip,BLUE,24)
  d.ellipse((head[0]-18,head[1]-16,head[0]+18,head[1]+16),fill=INK)
  limb(d,[shoulder,(207,319),(226,323)],INK,10)
  line(d,hip,knee,BLUE,18)
  angle=-1.7*u;foot=polar(knee,79,angle);roller=polar(knee,62,angle)
  if abs(math.dist(knee,foot)-79)>1e-6 or foot[1]>370:raise ValueError('Lying curl knee or clearance changed')
  line(d,knee,foot,BLUE,18)
  d.ellipse((roller[0]-13,roller[1]-13,roller[0]+13,roller[1]+13),fill=FAR,outline=INK,width=3)
  line(d,foot,(foot[0]+18,foot[1]+3),INK,8)
 elif kind in ('machine-leg-extension','machine-single-leg-extension','band-leg-extension'):
  # The seat/back and machine knee pivot remain fixed; a roller contacts the
  # lower shin above the ankle while the shin extends without hip movement.
  hip=(301,333);shoulder=(301,214);head=(300,176);knee=(374,325)
  d.rounded_rectangle((253,337,341,352),5,fill=FAR)
  d.rounded_rectangle((250,210,266,350),5,fill=FAR)
  for x in (269,330):d.line((x,352,x,456),fill=FAR,width=8)
  if kind!='band-leg-extension':
   d.rounded_rectangle((135,342,168,421),5,fill=FAR,outline=INK,width=2)
   for y in (358,377,396,414):d.line((138,y,165,y),fill=INK,width=2)
   d.line((165,325,374,325),fill=FAR,width=5)
   d.ellipse((knee[0]-13,knee[1]-13,knee[0]+13,knee[1]+13),fill=FAR,outline=INK,width=3)
  line(d,hip,shoulder,BLUE,27)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+19),fill=INK)
  limb(d,[shoulder,(309,283),(300,333)],INK,10)
  if kind=='machine-single-leg-extension':
   # The opposite leg rests vertically and does not follow the working lever.
   rest_knee=(358,313);rest_foot=(358,394)
   line(d,hip,rest_knee,FAR,14)
   line(d,rest_knee,rest_foot,FAR,14)
   line(d,rest_foot,(rest_foot[0]+20,rest_foot[1]+3),FAR,7)
  line(d,hip,knee,BLUE,18)
  angle=math.pi/2-1.53*u
  foot=polar(knee,79,angle)
  roller=polar(knee,60,angle)
  if abs(math.dist(knee,foot)-79)>1e-6 or abs(math.dist(knee,roller)-60)>1e-6:raise ValueError('Leg extension shin length changed')
  if knee!=(374,325) or foot[1]>405:raise ValueError('Leg extension pivot or clearance changed')
  line(d,knee,foot,BLUE,18)
  if kind=='band-leg-extension':
   anchor=(178,432)
   if math.dist(anchor,foot)<math.dist(anchor,(374,404))-1e-6:raise ValueError('Band tension must rise through extension')
   d.line((anchor[0],anchor[1],anchor[0],455),fill=FAR,width=8)
   d.line((anchor[0]-20,455,anchor[0]+20,455),fill=FAR,width=8)
   d.line((anchor[0],anchor[1],foot[0],foot[1]),fill=FAR,width=5)
   d.ellipse((anchor[0]-8,anchor[1]-8,anchor[0]+8,anchor[1]+8),fill=FAR,outline=INK,width=2)
   d.ellipse((foot[0]-10,foot[1]-10,foot[0]+10,foot[1]+10),outline=INK,width=4)
  else:
   d.ellipse((roller[0]-14,roller[1]-14,roller[0]+14,roller[1]+14),fill=FAR,outline=INK,width=3)
  line(d,foot,(foot[0]+20,foot[1]+3),INK,8)
 elif kind in ('seated-cable-row','single-arm-cable-row'):
  # Fixed seat and footplate brace the athlete while a handle moves along a
  # visible pulley cable. The torso stays upright; elbows travel behind it.
  single=kind=='single-arm-cable-row'
  pulley=(155,312);hip=(346,339);shoulder=(346,216);head=(345,176)
  d.line((127,122,127,456),fill=FAR,width=7)
  d.rounded_rectangle((110,334,143,420),5,fill=FAR,outline=INK,width=2)
  for y in (351,370,389,408):d.line((113,y,140,y),fill=INK,width=2)
  d.ellipse((pulley[0]-13,pulley[1]-13,pulley[0]+13,pulley[1]+13),fill=FAR,outline=INK,width=3)
  d.rounded_rectangle((321,352,380,365),5,fill=FAR)
  for x in (331,368):d.line((x,365,x,455),fill=FAR,width=7)
  d.line((238,365,238,442),fill=FAR,width=11)
  d.line((238,365,260,365),fill=INK,width=7)
  limb(d,[hip,(296,382),(253,368)],BLUE,17)
  line(d,(253,368),(239,361),INK,9)
  line(d,hip,shoulder,BLUE,27)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+19),fill=INK)
  if single:limb(d,[(shoulder[0]-9,shoulder[1]),(329,285),(335,342)],FAR,10)
  for offset,color in (((9,INK),) if single else ((-9,FAR),(9,INK))):
   start=(shoulder[0]+offset,shoulder[1]);hand=(263+79*u+offset,306)
   elbow=ik(start,hand,78,72,side=1)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((start,elbow,78),(elbow,hand,72))):raise ValueError('Seated cable row arm length changed')
   if hip!=(346,339) or pulley!=(155,312):raise ValueError('Seated cable row support changed')
   d.line([xy(pulley),xy(hand)],fill=INK,width=3)
   limb(d,[start,elbow,hand],color,11)
   d.rounded_rectangle((hand[0]-6,hand[1]-7,hand[0]+6,hand[1]+7),3,fill=FAR,outline=INK,width=2)
 elif kind=='inverted-row':
  # Bar, both grips and heels remain fixed. A straight head-to-heel chain
  # rotates about the heels as the chest approaches the securely racked bar.
  foot=(440,440);bar_y=270
  for x in (187,320):d.line((x,bar_y,x,457),fill=FAR,width=9)
  d.line((174,bar_y,333,bar_y),fill=INK,width=12)
  angle=math.pi+.3+.5*u
  shoulder=polar(foot,210,angle);hip=polar(foot,105,angle)
  head=polar(shoulder,34,angle)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((foot,hip,105),(hip,shoulder,105),(shoulder,head,34))):raise ValueError('Inverted row body line changed')
  if foot!=(440,440):raise ValueError('Inverted row heel moved')
  limb(d,[shoulder,hip,foot],BLUE,25)
  line(d,foot,(468,444),INK,9)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  for offset,color in ((-10,FAR),(10,INK)):
   start=(shoulder[0]+offset,shoulder[1]);hand=(250+offset,bar_y)
   elbow=ik(start,hand,75,65,side=1)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((start,elbow,75),(elbow,hand,65))):raise ValueError('Inverted row arm length changed')
   limb(d,[start,elbow,hand],color,10)
   d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=BLUE)
 elif kind=='decline-crunch':
  # Sloped bench supports the pelvis and back with the head below the hips;
  # a fixed paired ankle restraint holds the raised legs as the trunk curls.
  hip=(315,318);knee=(366,272);ankle=(409,264)
  d.line((166,422,368,296),fill=FAR,width=18)
  for x,y in ((205,408),(344,310)):d.line((x,y,x,456),fill=FAR,width=7)
  limb(d,[hip,knee,ankle],BLUE,17)
  line(d,ankle,(439,268),INK,9)
  d.line((360,300,454,313),fill=FAR,width=7)
  d.line((454,313,454,236),fill=FAR,width=7)
  d.rounded_rectangle((393,239,426,254),7,fill=INK,outline=BLUE,width=2)
  d.rounded_rectangle((393,282,426,297),7,fill=INK,outline=BLUE,width=2)
  d.text((383,329),'ANKLE LOCK',font=FONTS[14],fill=MUTED)
  angle=2.58+.52*u
  shoulder=polar(hip,100,angle);head=polar(shoulder,39,angle)
  if abs(math.dist(hip,shoulder)-100)>1e-6 or abs(math.dist(shoulder,head)-39)>1e-6:raise ValueError('Decline crunch trunk length changed')
  if hip!=(315,318) or ankle!=(409,264):raise ValueError('Decline crunch support changed')
  line(d,hip,shoulder,BLUE,25)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-17,head[0]+18,head[1]+17),fill=INK)
  limb(d,[shoulder,(shoulder[0]+31,shoulder[1]-27),(shoulder[0]+61,shoulder[1]-12)],INK,10)
 elif kind=='stability-ball-crunch':
  # A stationary ball supports the pelvis and back while two planted feet
  # remain fixed; only the upper trunk curls through a short range.
  center=(285,390);radius=70;hip=(330,352);knee=(376,366);foot=(427,444)
  d.ellipse((center[0]-radius,center[1]-radius,center[0]+radius,center[1]+radius),fill=FAR,outline=INK,width=3)
  d.arc((center[0]-43,center[1]-43,center[0]+43,center[1]+43),25,150,fill=INK,width=2)
  limb(d,[hip,knee,foot],BLUE,17)
  line(d,foot,(453,448),INK,9)
  angle=math.pi+.44*u
  shoulder=polar(hip,95,angle);head=polar(shoulder,39,angle)
  if abs(math.dist(hip,shoulder)-95)>1e-6 or abs(math.dist(shoulder,head)-39)>1e-6:raise ValueError('Ball crunch trunk length changed')
  if center!=(285,390) or foot!=(427,444):raise ValueError('Ball crunch support changed')
  line(d,hip,shoulder,BLUE,25)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-17,head[0]+18,head[1]+17),fill=INK)
  limb(d,[shoulder,(shoulder[0]+30,shoulder[1]-30),(shoulder[0]+60,shoulder[1]-15)],INK,10)
 elif kind=='band-ankle-dorsiflexion':
  # Seated heel rests on a fixed low pad. A band anchored in front of the
  # toes resists their upward rotation about a stationary ankle joint.
  anchor=(473,390);hip=(278,337);shoulder=(271,213);head=(270,175)
  d.rounded_rectangle((235,344,311,356),5,fill=FAR)
  for x in (248,298):d.line((x,356,x,456),fill=FAR,width=7)
  d.line((492,83,492,456),fill=FAR,width=5)
  d.line((492,390,anchor[0],anchor[1]),fill=INK,width=8)
  d.ellipse((anchor[0]-6,anchor[1]-6,anchor[0]+6,anchor[1]+6),fill=INK)
  limb(d,[hip,(258,387),(247,444)],FAR,15)
  line(d,(247,444),(224,448),INK,8)
  line(d,hip,shoulder,BLUE,27)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+19),fill=INK)
  limb(d,[shoulder,(300,278),(285,336)],INK,10)
  knee=(324,365);heel=(370,390)
  limb(d,[hip,knee,heel],BLUE,17)
  d.rounded_rectangle((345,399,397,408),4,fill=FAR)
  for x in (352,388):d.line((x,408,x,455),fill=FAR,width=7)
  toe=polar(heel,45,-.68*u)
  if abs(math.dist(heel,toe)-45)>1e-6 or heel!=(370,390) or toe[1]>390:raise ValueError('Band dorsiflexion heel changed')
  d.line([xy(toe),xy(anchor)],fill=FAR,width=5)
  line(d,heel,toe,INK,11)
  d.rounded_rectangle((toe[0]-5,toe[1]-5,toe[0]+5,toe[1]+5),2,outline=BLUE,width=2)
 elif kind=='band-leg-curl':
  # Fixed standing knee and stable wall hand; a low anchor tensions the band
  # attached at the working ankle as the heel curls backward.
  anchor=(445,430);hip=(310,312);shoulder=(299,209);head=(296,173)
  d.line((466,85,466,456),fill=FAR,width=5)
  d.line((466,430,anchor[0],anchor[1]),fill=INK,width=8)
  d.ellipse((anchor[0]-6,anchor[1]-6,anchor[0]+6,anchor[1]+6),fill=INK)
  limb(d,[hip,(337,380),(345,445)],BLUE,18)
  line(d,(345,445),(367,448),INK,9)
  line(d,hip,shoulder,BLUE,28)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+19),fill=INK)
  limb(d,[shoulder,(358,256),(466,274)],INK,11)
  knee=(288,365);working_ankle=polar(knee,70,1.1+1.5*u)
  if abs(math.dist(knee,working_ankle)-70)>1e-6 or knee!=(288,365):raise ValueError('Band leg curl knee changed')
  if working_ankle[1]>=443:raise ValueError('Band leg curl foot lost clearance')
  d.line([xy(anchor),xy(working_ankle)],fill=FAR,width=5)
  limb(d,[hip,knee,working_ankle],FAR,16)
  line(d,working_ankle,(working_ankle[0]-18,working_ankle[1]+4),INK,8)
  d.rounded_rectangle((working_ankle[0]-9,working_ankle[1]-8,working_ankle[0]+9,working_ankle[1]+8),3,outline=INK,width=2)
 elif kind in ('band-overhead-triceps','cable-overhead-triceps'):
  # A low anchor behind the athlete tensions two band strands or cable lines.
  # Upper arms stay near the head while only forearms extend overhead.
  cable=kind=='cable-overhead-triceps'
  anchor=(140,435);hip=(303,331);shoulder=(300,209);head=(300,170)
  d.line((118,84,118,456),fill=FAR,width=5)
  if cable:
   d.rounded_rectangle((92,308,126,395),5,fill=FAR,outline=INK,width=2)
   for y in (326,345,364,383):d.line((95,y,123,y),fill=INK,width=2)
   d.ellipse((anchor[0]-12,anchor[1]-12,anchor[0]+12,anchor[1]+12),fill=FAR,outline=INK,width=3)
  else:
   d.line((118,435,anchor[0],anchor[1]),fill=INK,width=8)
   d.ellipse((anchor[0]-6,anchor[1]-6,anchor[0]+6,anchor[1]+6),fill=INK)
  limb(d,[hip,(280,388),(267,445)],FAR,16)
  line(d,(267,445),(246,448),INK,8)
  limb(d,[hip,(325,387),(345,445)],BLUE,17)
  line(d,(345,445),(365,448),INK,8)
  body(d,hip,shoulder,head)
  for offset,color in ((-10,FAR),(10,INK)):
   start=(shoulder[0]+offset,shoulder[1]);elbow=(320+offset,157)
   hand=polar(elbow,69,2.2-3.32*u)
   if abs(math.dist(elbow,hand)-69)>1e-6 or elbow[1]!=157:raise ValueError('Band overhead triceps elbow changed')
   if hand[1]<87 or hand[1]>227:raise ValueError('Band overhead triceps path changed')
   d.line([xy(anchor),xy(hand)],fill=INK if cable else FAR,width=3 if cable else 4)
   limb(d,[start,elbow,hand],color,11)
   if cable:d.rounded_rectangle((hand[0]-6,hand[1]-7,hand[0]+6,hand[1]+7),3,fill=FAR,outline=INK,width=2)
   else:d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=BLUE)
 elif kind=='band-chest-press':
  # Behind-the-body chest-height anchor, planted staggered stance and two
  # separately tensioned arms pressing forward without trunk lean.
  anchor=(148,248);hip=(300,334);shoulder=(300,212);head=(297,174)
  d.line((127,87,127,456),fill=FAR,width=5)
  d.line((127,248,anchor[0],anchor[1]),fill=INK,width=8)
  d.ellipse((anchor[0]-6,anchor[1]-6,anchor[0]+6,anchor[1]+6),fill=INK)
  limb(d,[hip,(277,388),(264,445)],FAR,16)
  line(d,(264,445),(244,448),INK,8)
  limb(d,[hip,(333,388),(351,445)],BLUE,17)
  line(d,(351,445),(373,448),INK,8)
  body(d,hip,shoulder,head)
  for offset,color in ((-9,FAR),(9,INK)):
   start=(shoulder[0]+offset,shoulder[1]);hand=(335+96*u+offset,254)
   elbow=ik(start,hand,75,68,side=-1)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((start,elbow,75),(elbow,hand,68))):raise ValueError('Band chest press arm length changed')
   if hand[1]!=254 or anchor!=(148,248):raise ValueError('Band chest press support changed')
   d.line([xy(anchor),xy(hand)],fill=FAR,width=4)
   limb(d,[start,elbow,hand],color,11)
   d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=BLUE)
 elif kind=='band-straight-arm-pulldown':
  # A high fixed anchor and near-straight arms distinguish the shoulder
  # pulldown from an elbow-driven triceps pushdown.
  anchor=(443,111);hip=(301,334);shoulder=(300,212);head=(298,173)
  d.line((463,86,463,456),fill=FAR,width=5)
  d.line((463,111,anchor[0],anchor[1]),fill=INK,width=8)
  d.ellipse((anchor[0]-6,anchor[1]-6,anchor[0]+6,anchor[1]+6),fill=INK)
  limb(d,[hip,(280,388),(267,444)],FAR,16)
  line(d,(267,444),(246,448),INK,8)
  limb(d,[hip,(321,388),(341,444)],BLUE,17)
  line(d,(341,444),(363,448),INK,8)
  body(d,hip,shoulder,head)
  angle=-.8+1.6*u
  for offset,color in ((-9,FAR),(9,INK)):
   start=(shoulder[0]+offset,shoulder[1]);elbow=polar(start,73,angle)
   hand=polar(elbow,63,angle+.06)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((start,elbow,73),(elbow,hand,63))):raise ValueError('Band pulldown arm length changed')
   if hand[1]<108 or hand[1]>320:raise ValueError('Band pulldown shoulder path changed')
   d.line([xy(anchor),xy(hand)],fill=FAR,width=4)
   limb(d,[start,elbow,hand],color,11)
   d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=BLUE)
 elif kind in ('band-row','standing-cable-row','half-kneeling-cable-row'):
  # A fixed chest-height anchor tensions two band strands or a cable pulley.
  # A staggered stance or half-kneeling support stays put as elbows travel.
  cable=kind!='band-row';half=kind=='half-kneeling-cable-row'
  anchor=(132,273);hip=(340,332);shoulder=(340,213) if half else (315,213);head=(340,174) if half else (302,174)
  d.line((113,88,113,456),fill=FAR,width=5)
  if cable:
   d.rounded_rectangle((92,332,124,420),5,fill=FAR,outline=INK,width=2)
   for y in (349,368,387,406):d.line((95,y,121,y),fill=INK,width=2)
   d.ellipse((anchor[0]-12,anchor[1]-12,anchor[0]+12,anchor[1]+12),fill=FAR,outline=INK,width=3)
  else:
   d.line((113,273,anchor[0],anchor[1]),fill=INK,width=8)
   d.ellipse((anchor[0]-6,anchor[1]-6,anchor[0]+6,anchor[1]+6),fill=INK)
  if half:
   d.rounded_rectangle((243,442,315,454),5,fill=FAR)
   limb(d,[hip,(296,438),(259,443)],FAR,17)
   line(d,(259,443),(241,447),INK,8)
   limb(d,[hip,(377,389),(391,444)],BLUE,17)
   line(d,(391,444),(413,448),INK,8)
  else:
   limb(d,[hip,(307,386),(292,445)],FAR,16)
   line(d,(292,445),(269,448),INK,8)
   limb(d,[hip,(373,386),(389,445)],BLUE,17)
   line(d,(389,445),(410,448),INK,8)
  body(d,hip,shoulder,head)
  for offset,color in ((-9,FAR),(9,INK)):
   start=(shoulder[0]+offset,shoulder[1]);hand=(219+80*u+offset,276)
   elbow=ik(start,hand,77,69,side=1)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((start,elbow,77),(elbow,hand,69))):raise ValueError('Band row arm length changed')
   if hand[1]!=276 or anchor!=(132,273):raise ValueError('Band row support changed')
   d.line([xy(anchor),xy(hand)],fill=INK if cable else FAR,width=3 if cable else 4)
   limb(d,[start,elbow,hand],color,11)
   if cable:d.rounded_rectangle((hand[0]-6,hand[1]-7,hand[0]+6,hand[1]+7),3,fill=FAR,outline=INK,width=2)
   else:d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=BLUE)
 elif kind in ('band-triceps-pushdown','cable-triceps-pushdown'):
  # Side view: a high band anchor or cable pulley tensions the load while
  # both elbows remain beside the ribs and only the forearms extend.
  cable=kind=='cable-triceps-pushdown'
  anchor=(438,123);hip=(302,333);shoulder=(298,213);head=(296,174)
  d.line((457,91,457,456),fill=FAR,width=5)
  if cable:
   d.rounded_rectangle((441,334,476,420),5,fill=FAR,outline=INK,width=2)
   for y in (352,371,390,409):d.line((444,y,473,y),fill=INK,width=2)
   d.ellipse((anchor[0]-12,anchor[1]-12,anchor[0]+12,anchor[1]+12),fill=FAR,outline=INK,width=3)
  else:
   d.line((457,123,anchor[0],anchor[1]),fill=INK,width=8)
   d.ellipse((anchor[0]-6,anchor[1]-6,anchor[0]+6,anchor[1]+6),fill=INK)
  limb(d,[hip,(285,389),(274,444)],FAR,16)
  line(d,(274,444),(253,448),INK,8)
  limb(d,[hip,(319,388),(340,444)],BLUE,17)
  line(d,(340,444),(362,448),INK,8)
  body(d,hip,shoulder,head)
  for offset,color in ((-10,FAR),(10,INK)):
   start=(shoulder[0]+offset,shoulder[1]);elbow=(321+offset,294)
   angle=-1.1+2.4*u
   hand=polar(elbow,69,angle)
   if abs(math.dist(elbow,hand)-69)>1e-6 or elbow[1]!=294:raise ValueError('Band pushdown elbow path changed')
   d.line([xy(anchor),xy(hand)],fill=INK if cable else FAR,width=3 if cable else 4)
   limb(d,[start,elbow,hand],color,11)
   if cable:d.rounded_rectangle((hand[0]-6,hand[1]-7,hand[0]+6,hand[1]+7),3,fill=FAR,outline=INK,width=2)
   else:d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=BLUE)
 elif kind=='band-curl':
  # Front view: the under-foot band lengthens as each forearm rotates about
  # a fixed elbow; shoulders, torso and feet do not swing or lift.
  hip=(300,336);head=(300,171)
  for side in (-1,1):
   knee=(300+side*28,389);foot=(300+side*43,445)
   limb(d,[hip,knee,foot],BLUE,17);line(d,foot,(foot[0]+side*18,448),INK,8)
  line(d,hip,(300,221),BLUE,29);line(d,(270,208),(330,208),BLUE,24)
  line(d,(300,220),head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+19),fill=INK)
  for side,color in ((-1,FAR),(1,INK)):
   shoulder=(300+side*30,208);elbow=(300+side*40,290);anchor=(300+side*43,445)
   angle=math.pi/2+side*2.6*u
   hand=polar(elbow,63,angle)
   if abs(math.dist(elbow,hand)-63)>1e-6 or elbow[1]!=290 or anchor[1]!=445:raise ValueError('Band curl arm or support changed')
   d.line([xy(anchor),xy(hand)],fill=FAR,width=5)
   limb(d,[shoulder,elbow,hand],color,11)
   d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=BLUE)
 elif kind=='band-front-raise':
  # Side view shows a secured under-foot band and two fixed-length arms
  # lifting forward without a trunk swing or overhead motion.
  hip=(300,333);shoulder=(300,210);head=(300,173);anchor=(341,445)
  limb(d,[hip,(282,388),(270,445)],FAR,16)
  line(d,(270,445),(250,448),INK,8)
  limb(d,[hip,(315,387),anchor],BLUE,17)
  line(d,anchor,(363,449),INK,9)
  body(d,hip,shoulder,head)
  angle=math.pi/2-1.38*u
  for dx,color in ((-11,FAR),(9,INK)):
   start=(shoulder[0]+dx,shoulder[1])
   elbow=polar(start,73,angle)
   hand=polar(elbow,62,angle+.06)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((start,elbow,73),(elbow,hand,62))):raise ValueError('Band front raise arm length changed')
   if hand[1]<208 or anchor[1]!=445:raise ValueError('Band front raise support or height changed')
   d.line([xy(anchor),xy(hand)],fill=FAR,width=4)
   limb(d,[start,elbow,hand],color,10)
   d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=BLUE)
 elif kind=='band-lateral-raise':
  # Each band is secured under its own fixed foot and extends to a hand.
  # Fixed arm segments raise laterally to at most shoulder height.
  hip=(300,335);head=(300,171)
  for side in (-1,1):
   knee=(300+side*27,389);foot=(300+side*43,445)
   limb(d,[hip,knee,foot],BLUE,17)
   line(d,foot,(foot[0]+side*18,449),INK,8)
  line(d,hip,(300,218),BLUE,29);line(d,(269,209),(331,209),BLUE,24)
  line(d,(300,218),head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+19),fill=INK)
  for side,color in ((-1,FAR),(1,INK)):
   start=(300+side*31,209);anchor=(300+side*43,445)
   angle=math.pi/2-side*1.3*u
   elbow=polar(start,72,angle);hand=polar(elbow,64,angle+side*.08)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((start,elbow,72),(elbow,hand,64))):raise ValueError('Band lateral arm length changed')
   if hand[1]<207 or anchor[1]!=445:raise ValueError('Band lateral support or height changed')
   d.line([xy(anchor),xy(hand)],fill=FAR,width=5)
   limb(d,[start,elbow,hand],color,11)
   d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=BLUE)
 elif kind=='band-pull-apart':
  # Front view: pelvis, head, shoulders and feet stay fixed. Hands move apart
  # at chest height while an elastic band stretches between secure grips.
  left_shoulder=(270,209);right_shoulder=(330,209);hip=(300,336);head=(300,172)
  for side in (-1,1):
   knee=(300+side*27,389);foot=(300+side*44,446)
   limb(d,[hip,knee,foot],BLUE,17);line(d,foot,(foot[0]+side*17,448),INK,8)
  line(d,hip,(300,222),BLUE,29);line(d,left_shoulder,right_shoulder,BLUE,24)
  line(d,(300,220),head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+19),fill=INK)
  hands=[]
  for side,start in ((-1,left_shoulder),(1,right_shoulder)):
   hand=(300+side*(51+74*u),234)
   elbow=((start[0]+hand[0])/2,226)
   if hand[1]!=234 or abs(hand[0]-300)>126:raise ValueError('Band pull-apart hand path changed')
   limb(d,[start,elbow,hand],INK,12);hands.append(hand)
  d.line([xy(hands[0]),xy(hands[1])],fill=FAR,width=6)
  for hand in hands:d.ellipse((hand[0]-7,hand[1]-7,hand[0]+7,hand[1]+7),fill=BLUE)
 elif kind in ('slider-leg-curl','stability-ball-leg-curl'):
  # Supine bridge stays supported at the shoulder; both heels slide together
  # toward the pelvis on visible low-friction pads and then return.
  shoulder=(237,421);hip=(315,348);head=(201,422)
  ball=kind=='stability-ball-leg-curl'
  heel=(488-92*u,401 if ball else 439)
  knee=ik(hip,heel,101,101,side=1)
  if any(abs(math.dist(a,b)-101)>1e-6 for a,b in ((hip,knee),(knee,heel))):raise ValueError('Slider curl leg lengths changed')
  if heel[1]!=(401 if ball else 439) or hip!=(315,348):raise ValueError('Leg curl support changed')
  d.line((165,455,510,455),fill=FAR,width=3)
  if ball:
   center=(heel[0],430)
   d.ellipse((center[0]-29,center[1]-29,center[0]+29,center[1]+29),fill=FAR,outline=INK,width=3)
   d.arc((center[0]-18,center[1]-18,center[0]+18,center[1]+18),30,150,fill=INK,width=2)
  else:d.rounded_rectangle((heel[0]-28,443,heel[0]+27,449),3,fill=INK)
  limb(d,[heel,knee,hip],FAR,18)
  limb(d,[heel,(knee[0]-5,knee[1]-8),hip],BLUE,19)
  line(d,hip,shoulder,BLUE,27)
  line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-17,head[0]+18,head[1]+17),fill=INK)
  limb(d,[shoulder,(265,438),(296,441)],INK,10)
  line(d,heel,(heel[0]+18,heel[1]),INK,8)
 elif kind=='hand-gripper-close':
  # Close-up: a supported forearm and palm stay steady while the fingers
  # compress one spring gripper. Each rigid handle pivots about the spring.
  d.rounded_rectangle((150,313,290,334),6,fill=FAR)
  for x in (170,275):d.line((x,334,x,455),fill=FAR,width=8)
  line(d,(175,299),(290,299),BLUE,28)
  d.rounded_rectangle((278,277,328,321),10,fill=INK)
  spring=(370,260)
  d.ellipse((spring[0]-15,spring[1]-15,spring[0]+15,spring[1]+15),outline=FAR,width=7)
  fixed=polar(spring,89,2.0)
  moving=polar(spring,89,1.1+.82*u)
  if abs(math.dist(spring,fixed)-89)>1e-6 or abs(math.dist(spring,moving)-89)>1e-6:raise ValueError('Gripper handle length changed')
  line(d,spring,fixed,INK,11)
  line(d,spring,moving,INK,11)
  d.rounded_rectangle((fixed[0]-8,fixed[1]-15,fixed[0]+8,fixed[1]+15),4,fill=FAR)
  d.rounded_rectangle((moving[0]-8,moving[1]-15,moving[0]+8,moving[1]+15),4,fill=FAR)
  for n in range(3):
   x=315+8*n
   d.line((x,300,x+7,320),fill=BLUE,width=7)
 elif kind=='plate-front-raise':
  # A stable standing torso holds one plate with two hands. Both shoulders
  # flex together to a comfortable shoulder-height limit with soft elbows.
  hip=(300,329);shoulder=(300,205);head=(300,170)
  for direction in (-1,1):
   knee=(300+direction*24,386);foot=(300+direction*43,445)
   limb(d,[hip,knee,foot],BLUE,17);line(d,foot,(foot[0]+direction*17,448),INK,8)
  body(d,hip,shoulder,head)
  angle=math.pi/2-1.47*u
  hands=[]
  for offset,color in ((-9,FAR),(9,INK)):
   start=(shoulder[0]+offset,shoulder[1])
   elbow=polar(start,73,angle)
   hand=polar(elbow,64,angle+.08);hands.append(hand)
   if abs(math.dist(start,elbow)-73)>1e-6 or abs(math.dist(elbow,hand)-64)>1e-6 or hand[1]<195:raise ValueError('Plate raise arm path changed')
   limb(d,[start,elbow,hand],color,11)
  center=((hands[0][0]+hands[1][0])/2,(hands[0][1]+hands[1][1])/2)
  d.ellipse((center[0]-21,center[1]-21,center[0]+21,center[1]+21),fill=FAR,outline=INK,width=3)
  d.ellipse((center[0]-8,center[1]-8,center[0]+8,center[1]+8),fill=BG)
 elif kind=='cossack-squat':
  # Stationary wide stance: one planted working foot flexes under the hip,
  # while the other leg stays straight and its forefoot lifts on a fixed heel.
  left_ankle=(170,440);right_ankle=(450,440)
  reach=math.hypot(130,160)
  hip_x=300+50*u
  hip=(hip_x,440-math.sqrt(reach*reach-(hip_x-left_ankle[0])**2))
  left_knee=((hip[0]+left_ankle[0])/2,(hip[1]+left_ankle[1])/2)
  right_knee=ik(hip,right_ankle,110,110,side=1)
  if abs(math.dist(hip,left_ankle)-reach)>1e-6 or any(abs(math.dist(a,b)-110)>1e-6 for a,b in ((hip,right_knee),(right_knee,right_ankle))):raise ValueError('Cossack leg length changed')
  limb(d,[hip,left_knee,left_ankle],FAR,17)
  limb(d,[hip,right_knee,right_ankle],BLUE,19)
  line(d,left_ankle,(147,420),INK,9)
  line(d,right_ankle,(477,447),INK,9)
  shoulder=(hip[0],hip[1]-120);head=(hip[0],hip[1]-154)
  body(d,hip,shoulder,head)
  limb(d,[shoulder,(shoulder[0]+37,shoulder[1]+48),(shoulder[0]+8,shoulder[1]+70)],INK,10)
 elif kind=='lateral-lunge':
  # A visible sideways foot transfer precedes the descent. The opposite leg
  # stays long about a fixed foot while the working knee bends over its heel.
  left_ankle=(190,440)
  step=min(1,2*u);lower=max(0,min(1,2*u-1))
  right_ankle=(360+90*step,440-22*math.sin(math.pi*step))
  reach=math.hypot(110,160)
  hip_x=300+45*lower
  hip=(hip_x,440-math.sqrt(reach*reach-(hip_x-left_ankle[0])**2))
  left_knee=((hip[0]+left_ankle[0])/2,(hip[1]+left_ankle[1])/2)
  right_knee=ik(hip,right_ankle,112,112,side=1)
  if abs(math.dist(hip,left_ankle)-reach)>1e-6 or any(abs(math.dist(a,b)-112)>1e-6 for a,b in ((hip,right_knee),(right_knee,right_ankle))):raise ValueError('Lateral lunge leg length changed')
  if lower>0 and right_ankle!=(450,440):raise ValueError('Lateral lunge moving foot failed to plant')
  limb(d,[hip,left_knee,left_ankle],FAR,17)
  limb(d,[hip,right_knee,right_ankle],BLUE,19)
  line(d,left_ankle,(164,447),INK,9)
  line(d,right_ankle,(right_ankle[0]+25,right_ankle[1]+5),INK,9)
  shoulder=(hip[0],hip[1]-120);head=(hip[0],hip[1]-154)
  body(d,hip,shoulder,head)
  if option=='dumbbell':
   for offset,color in ((-31,FAR),(31,INK)):
    elbow=(shoulder[0]+offset,shoulder[1]+62)
    hand=(elbow[0],elbow[1]+54)
    limb(d,[shoulder,elbow,hand],color,10)
    weight(d,hand,hammer=True)
  else:
   limb(d,[shoulder,(shoulder[0]+32,shoulder[1]+55),(shoulder[0]+7,shoulder[1]+75)],INK,10)
 elif kind=='pistol-squat':
  # One foot stays planted. Fixed support-leg lengths allow knee flexion as
  # the hip descends, while the free straight leg remains clear of the floor.
  ankle=(330,441);toe=(365,449)
  hip=(311-48*u,296+70*u)
  knee=ik(hip,ankle,75,75,side=1)
  if abs(math.dist(hip,knee)-75)>1e-6 or abs(math.dist(knee,ankle)-75)>1e-6:raise ValueError('Pistol support leg changed length')
  limb(d,[hip,knee,ankle],BLUE,18)
  line(d,ankle,toe,INK,10)
  free_knee=add(hip,(75,-20));free_foot=add(free_knee,(75,5))
  if free_foot[1]>=430 or any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((hip,free_knee,math.hypot(75,20)),(free_knee,free_foot,math.hypot(75,5)))):raise ValueError('Pistol free leg changed support')
  limb(d,[hip,free_knee,free_foot],FAR,15)
  line(d,free_foot,(free_foot[0]+16,free_foot[1]+3),INK,8)
  shoulder=polar(hip,125,-math.pi/2+.22*u)
  head=polar(shoulder,34,-math.pi/2+.12*u)
  if abs(math.dist(hip,shoulder)-125)>1e-6:raise ValueError('Pistol torso length changed')
  body(d,hip,shoulder,head)
  limb(d,[shoulder,(shoulder[0]+48,shoulder[1]+44),(shoulder[0]+94,shoulder[1]+48)],INK,10)
 elif kind=='reverse-nordic-curl':
  # Padded knees and tucked feet stay fixed; the whole thigh/trunk chain
  # leans back a small amount about the knees with no lumbar hinge.
  d.rounded_rectangle((254,438,359,453),5,fill=FAR)
  knee=(310,431);ankle=(286,445)
  line(d,knee,ankle,FAR,15)
  line(d,ankle,(266,447),INK,9)
  lean=.35*u
  hip=(knee[0]-90*math.sin(lean),knee[1]-90*math.cos(lean))
  shoulder=(hip[0]-120*math.sin(lean),hip[1]-120*math.cos(lean))
  head=(shoulder[0]-35*math.sin(lean),shoulder[1]-35*math.cos(lean))
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((knee,hip,90),(hip,shoulder,120),(shoulder,head,35))):raise ValueError('Reverse Nordic body segment changed length')
  limb(d,[knee,hip,shoulder],BLUE,25)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-20,head[0]+18,head[1]+14),fill=INK)
  limb(d,[shoulder,(shoulder[0]+27,shoulder[1]+48),(shoulder[0]+5,shoulder[1]+72)],INK,10)
 elif kind=='side-lying-external-rotation':
  # Side-lying torso and upper arm are fixed. A very light dumbbell follows
  # forearm rotation about the elbow at the side without trunk movement.
  shoulder=(242,385);hip=(340,389);head=(198,382)
  line(d,hip,shoulder,BLUE,27)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  limb(d,[hip,(382,425),(432,428)],FAR,16)
  limb(d,[shoulder,(225,420),(192,427)],INK,11)
  elbow=(300,389)
  line(d,shoulder,elbow,INK,13)
  hand=polar(elbow,63,-1.28*u)
  if abs(math.dist(elbow,hand)-63)>1e-6 or elbow!=(300,389):raise ValueError('External rotation elbow support changed')
  line(d,elbow,hand,INK,11)
  weight(d,hand,hammer=True)
 elif kind=='dumbbell-side-bend':
  # Front view: the feet and pelvis stay fixed, the trunk bends only slightly
  # in the frontal plane, and one dumbbell hangs from the loaded shoulder.
  hip=(300,326);feet=((257,446),(343,446))
  for direction,foot in ((-1,feet[0]),(1,feet[1])):
   knee=(300+direction*24,385)
   limb(d,[hip,knee,foot],BLUE,16)
   line(d,foot,(foot[0]+direction*17,448),INK,8)
  angle=-math.pi/2+.23*u
  neck=polar(hip,119,angle)
  head=polar(neck,35,angle)
  if abs(math.dist(hip,neck)-119)>1e-6 or abs(math.dist(neck,head)-35)>1e-6:raise ValueError('Side bend trunk length changed')
  line(d,hip,neck,BLUE,29)
  line(d,neck,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-20,head[0]+18,head[1]+14),fill=INK)
  for direction in (-1,1):
   shoulder=add(neck,(direction*34,26))
   line(d,neck,shoulder,BLUE,13)
   elbow=add(shoulder,(direction*10,67));hand=add(elbow,(direction*5,57))
   limb(d,[shoulder,elbow,hand],INK if direction==1 else FAR,11)
   if direction==1:weight(d,hand,hammer=True)
 elif kind=='spider-curl':
  # Chest stays against an incline bench. Both upper arms hang fixed in front
  # of the bench while forearms curl two separate dumbbells upward.
  d.line((185,346,344,252),fill=FAR,width=18)
  for x in (204,331):d.line((x,354,x,457),fill=FAR,width=7)
  shoulder=(222,302);hip=(315,248);head=(181,315)
  limb(d,[hip,(355,353),(376,443)],BLUE,17)
  line(d,(376,443),(404,447),INK,9)
  line(d,hip,shoulder,BLUE,27)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-17,head[0]+18,head[1]+17),fill=INK)
  for offset,color in ((-12,FAR),(12,INK)):
   elbow=(230+offset,357);arm_start=(shoulder[0]+offset,shoulder[1])
   line(d,arm_start,elbow,color,12)
   hand=polar(elbow,70,1.35-2.55*u)
   if abs(math.dist(elbow,hand)-70)>1e-6 or hand[1]>430:raise ValueError('Spider curl arm or floor clearance changed')
   line(d,elbow,hand,INK,11)
   weight(d,hand,hammer=True)
 elif kind=='supported-curl':
  # The shoulder/upper arm remains fixed on each distinct support while the
  # hand rotates around the elbow with a constant forearm length.
  if option=='incline':
   d.line((234,202,327,352),fill=FAR,width=18)
   d.rounded_rectangle((281,337,350,351),5,fill=FAR)
   for x in (295,335):d.line((x,351,x,455),fill=FAR,width=7)
   shoulder=(251,218);hip=(310,327);head=(240,180)
   limb(d,[hip,(360,365),(388,445)],BLUE,17)
   line(d,(388,445),(416,448),INK,8)
  else:
   d.rounded_rectangle((245,339,341,353),5,fill=FAR)
   for x in (258,327):d.line((x,353,x,456),fill=FAR,width=7)
   shoulder=(263,218);hip=(289,327);head=(259,181)
   limb(d,[hip,(365,354),(386,445)],BLUE,17)
   line(d,(386,445),(415,448),INK,8)
   if option=='preacher':
    d.line((300,266,393,352),fill=FAR,width=20)
    d.line((375,351,375,456),fill=FAR,width=8)
  line(d,hip,shoulder,BLUE,27)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+15),fill=INK)
  elbows=[(197,283),(219,283)] if option=='incline' else ([(337,330)] if option=='thigh' else [(375,330)])
  for i,elbow in enumerate(elbows):
   line(d,shoulder,elbow,INK if i else FAR,12)
   angle=(1.25-2.55*u) if option=='incline' else (1.3-2.9*u if option=='thigh' else 1.35-3.55*u)
   hand=polar(elbow,70,angle)
   if abs(math.dist(elbow,hand)-70)>1e-6 or elbow[1]!=(283 if option=='incline' else 330):raise ValueError('Supported curl elbow changed')
   line(d,elbow,hand,INK,11)
   weight(d,hand,hammer=True)
 elif kind in ('alternating-curl','cross-body-curl'):
  # Front view separates both limbs. Alternating-curl runs a full right and
  # left repetition in sequence; cross-body uses a neutral grip and draws a
  # loaded hand toward the opposite shoulder without torso movement.
  hip=(300,329);neck=(300,210);head=(300,174)
  for direction in (-1,1):
   knee=(300+direction*25,384);foot=(300+direction*44,445)
   limb(d,[hip,knee,foot],BLUE,17);line(d,foot,(foot[0]+direction*18,448),INK,8)
  line(d,hip,neck,BLUE,30)
  line(d,neck,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-21,head[0]+18,head[1]+13),fill=INK)
  for direction in (-1,1):
   shoulder=(300+direction*35,205)
   elbow=(300+direction*50,283)
   line(d,neck,shoulder,BLUE,14)
   line(d,shoulder,elbow,INK,13)
   if kind=='alternating-curl':
    active=(direction==1 and option==0) or (direction==-1 and option==1)
    angle=math.pi/2+direction*(-3.35*u if active else 0)
    hand=polar(elbow,70,angle)
    weight(d,hand)
   elif direction==1:
    hand=polar(elbow,76,math.pi/2+2.23*u)
    weight(d,hand,hammer=True)
   else:
    hand=polar(elbow,76,math.pi/2)
    weight(d,hand,hammer=True)
   if abs(math.dist(elbow,hand)-(70 if kind=='alternating-curl' else 76))>1e-6:raise ValueError('Curl forearm length changed')
   line(d,elbow,hand,INK,11)
 elif kind=='wrist-curl':
  # Close-up keeps the forearm planted on a padded bench. Only the hand and
  # light dumbbell rotate at the wrist. Thumb side and label encode grip.
  d.rounded_rectangle((145,313,362,333),6,fill=FAR)
  for x in (167,340):d.line((x,333,x,456),fill=FAR,width=8)
  elbow=(178,297);wrist=(353,297)
  line(d,elbow,wrist,BLUE,24)
  angle=.55-.98*u
  hand=polar(wrist,49,angle)
  if abs(math.dist(wrist,hand)-49)>1e-6 or wrist!=(353,297):raise ValueError('Wrist support changed')
  line(d,wrist,hand,INK,17)
  midpoint=((wrist[0]+hand[0])/2,(wrist[1]+hand[1])/2)
  thumb=add(midpoint,(0,-14 if option=='palm-up' else 14))
  d.ellipse((thumb[0]-6,thumb[1]-6,thumb[0]+6,thumb[1]+6),fill=BLUE)
  weight(d,hand,hammer=True)
  d.text((160,235),'PALM UP' if option=='palm-up' else 'PALM DOWN',font=FONTS[18],fill=MUTED)
 elif kind=='side-plank-hip-lift':
  # The forearm and lower foot remain planted. The shoulder rotates about the
  # elbow and a fixed-length trunk/leg chain lifts the pelvis without twisting.
  elbow=(220,430);foot=(450,430)
  shoulder=(elbow[0]+80*math.sin(.32*u),elbow[1]-80*math.cos(.32*u))
  hip=ik(shoulder,foot,125,125,side=1)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((elbow,shoulder,80),(shoulder,hip,125),(hip,foot,125))):raise ValueError('Side plank segment changed length')
  if foot!=(450,430) or elbow!=(220,430):raise ValueError('Side plank support changed')
  limb(d,[shoulder,hip,foot],BLUE,25)
  limb(d,[shoulder,elbow,(270,430)],INK,13)
  line(d,foot,(478,433),INK,9)
  head=(shoulder[0]-32,shoulder[1]-10)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  limb(d,[shoulder,(hip[0]-20,hip[1]-35),(hip[0]+2,hip[1]-18)],FAR,9)
 elif kind=='chest-supported-row':
  # Chest contact and bench geometry are distinct from an unsupported hinge.
  # Both loaded elbows row toward the trunk while the support remains fixed.
  if option=='incline':
   d.line((185,346,344,252),fill=FAR,width=18)
   for x in (204,331):d.line((x,354,x,457),fill=FAR,width=7)
   shoulder=(222,302);hip=(315,248);head=(181,315)
   limb(d,[hip,(355,353),(376,443)],BLUE,17)
   line(d,(376,443),(404,447),INK,9)
  else:
   d.rounded_rectangle((175,280,402,297),5,fill=FAR)
   for x in (193,384):d.line((x,297,x,457),fill=FAR,width=8)
   shoulder=(230,261);hip=(330,261);head=(185,261)
   limb(d,[hip,(368,336),(393,443)],BLUE,17)
   line(d,(393,443),(422,447),INK,9)
  line(d,hip,shoulder,BLUE,27)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-17,head[0]+18,head[1]+17),fill=INK)
  for offset,color in ((-15,FAR),(15,INK)):
   start=(shoulder[0]+offset,shoulder[1])
   elbow=polar(start,70,1.4-1.15*u)
   hand=polar(elbow,60,math.pi/2)
   if abs(math.dist(start,elbow)-70)>1e-6 or abs(math.dist(elbow,hand)-60)>1e-6 or hand[1]>440:raise ValueError('Supported row arm or floor clearance changed')
   limb(d,[start,elbow,hand],color,11)
   weight(d,hand,hammer=True)
 elif kind=='dumbbell-horizontal-press':
  # Distinct supine bench, incline bench, and floor supports. Two separate
  # dumbbells rise above fixed shoulders; the floor version stops when the
  # upper arms gently meet the floor.
  floor=option=='floor';incline=option=='incline';decline=option=='decline'
  if floor:
   shoulder=(230,420);hip=(330,420);head=(185,417)
   limb(d,[hip,(361,350),(401,437)],BLUE,16)
   line(d,(401,437),(427,445),INK,9)
   d.line((155,450,445,450),fill=FAR,width=3)
   low_y,high_y=390,300
  elif decline:
   shoulder=(235,358);hip=(325,302);head=(205,376)
   d.line((185,405,355,300),fill=FAR,width=18)
   for x in (209,338):d.line((x,405,x,458),fill=FAR,width=7)
   limb(d,[hip,(362,270),(402,286)],BLUE,16)
   line(d,(402,286),(431,291),INK,9)
   # A paired ankle lock visibly traps the lower legs at the raised end of
   # the decline bench; its fixed post is attached to the bench frame.
   d.line((344,306,450,316),fill=FAR,width=8)
   d.line((450,316,450,261),fill=FAR,width=8)
   d.rounded_rectangle((383,263,416,277),7,fill=INK,outline=BLUE,width=2)
   d.rounded_rectangle((383,302,416,316),7,fill=INK,outline=BLUE,width=2)
   d.text((365,335),'ANKLE LOCK',font=FONTS[14],fill=MUTED)
   low_y,high_y=310,225
  elif incline:
   shoulder=(245,295);hip=(330,350);head=(215,265)
   d.line((189,270,352,374),fill=FAR,width=18)
   for x in (211,334):d.line((x,365,x,457),fill=FAR,width=7)
   limb(d,[hip,(365,366),(386,442)],BLUE,16)
   line(d,(386,442),(414,446),INK,9)
   low_y,high_y=250,160
  else:
   shoulder=(230,345);hip=(330,345);head=(185,340)
   d.rounded_rectangle((160,360,405,376),5,fill=FAR)
   for x in (185,390):d.line((x,376,x,455),fill=FAR,width=7)
   limb(d,[hip,(360,318),(394,347)],BLUE,16)
   line(d,(394,347),(420,350),INK,9)
   low_y,high_y=300,210
  line(d,hip,shoulder,BLUE,26)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  for offset,color in ((-15,FAR),(15,INK)):
   arm_start=(shoulder[0]+offset,shoulder[1])
   hand=(arm_start[0]+30,low_y+(high_y-low_y)*u)
   elbow=ik(arm_start,hand,75,65,side=-1)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((arm_start,elbow,75),(elbow,hand,65))):raise ValueError('Dumbbell press arm length changed')
   if floor and u<.001 and abs(elbow[1]-439)>2:raise ValueError('Floor press elbow missed floor')
   limb(d,[arm_start,elbow,hand],color,12)
   weight(d,hand,hammer=True)
 elif kind in ('dumbbell-overhead-press','band-overhead-press'):
  # Front view keeps the trunk vertical and wrists over forearms. Seat, two
  # loaded arms, neutral grips, one-arm anti-lean, and under-foot band anchors
  # are distinct options.
  band=kind=='band-overhead-press'
  seated=option=='seated';single=option=='single';neutral=option=='neutral'
  hip=(300,332);neck=(300,218);head=(300,181)
  if seated:
   d.rounded_rectangle((251,335,349,350),5,fill=FAR)
   d.rounded_rectangle((253,210,265,348),5,fill=FAR)
   for x in (262,338):d.line((x,350,x,455),fill=FAR,width=7)
   for direction in (-1,1):
    knee=(300+direction*67,366);foot=(300+direction*91,446)
    limb(d,[hip,knee,foot],FAR,15);line(d,foot,(foot[0]+direction*18,448),INK,8)
  else:
   for direction in (-1,1):
    knee=(300+direction*25,386);foot=(300+direction*43,445)
    limb(d,[hip,knee,foot],BLUE,17);line(d,foot,(foot[0]+direction*18,448),INK,9)
  line(d,hip,neck,BLUE,30)
  line(d,neck,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-21,head[0]+18,head[1]+13),fill=INK)
  directions=(1,) if single else (-1,1)
  for direction in directions:
   shoulder=(300+direction*35,245)
   line(d,neck,shoulder,BLUE,14)
   angle=(.45-1.65*u) if direction==1 else (math.pi-.45+1.65*u)
   elbow=polar(shoulder,65,angle)
   hand=add(elbow,(0,-70))
   if abs(math.dist(shoulder,elbow)-65)>1e-6 or abs(math.dist(elbow,hand)-70)>1e-6 or hand[1]<110:raise ValueError('Overhead press arm path changed')
   if band:
    anchor=(300+direction*43,445)
    d.line([xy(anchor),xy(hand)],fill=FAR,width=5)
   limb(d,[shoulder,elbow,hand],INK,12)
   if band:d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=BLUE)
   else:weight(d,hand,hammer=neutral)
  if single:
   shoulder=(265,245);line(d,neck,shoulder,BLUE,14)
   limb(d,[shoulder,(251,317),(253,369)],FAR,11)
 elif kind=='loaded-squat':
  # Fixed foot and leg lengths follow the established squat path. Equipment
  # differs exactly: one chest-held bell, two front-rack bells, or a heel wedge.
  wedge=option=='heel-wedge'
  ankle=(310,430 if wedge else 447)
  if wedge:
   d.polygon([(278,450),(326,450),(326,436)],fill=FAR)
   line(d,ankle,(347,450),INK,10)
  else:line(d,ankle,(347,450),INK,10)
  hip=(302-72*u,294+68*u)
  shoulder=polar(hip,126,-math.pi/2+.32*u)
  head=polar(shoulder,33,-math.pi/2+.15*u)
  knee=ik(hip,ankle,79,78)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((hip,knee,79),(knee,ankle,78),(hip,shoulder,126))):raise ValueError('Loaded squat segment changed length')
  limb(d,[hip,knee,ankle],BLUE,18)
  body(d,hip,shoulder,head)
  if option=='front-rack':
   for offset,color in ((-20,FAR),(20,INK)):
    hand=(shoulder[0]+offset+18,shoulder[1]+27)
    elbow=(shoulder[0]+offset+40,shoulder[1]+53)
    limb(d,[shoulder,elbow,hand],color,10)
    weight(d,hand,hammer=True)
  else:
   hand=(shoulder[0]+43,shoulder[1]+50)
   for offset,color in ((-12,FAR),(12,INK)):
    elbow=(shoulder[0]+offset+42,shoulder[1]+64)
    limb(d,[shoulder,elbow,hand],color,10)
   weight(d,hand,hammer=True)
 elif kind in ('dumbbell-row','kettlebell-row'):
  # Both rows keep the trunk steady while the elbow travels toward the hip.
  # The unilateral key fixes a separate bench hand; the bilateral key uses
  # two dumbbells and both feet with no bench contact.
  supported=option=='bench-supported' or kind=='kettlebell-row'
  if supported:
   d.rounded_rectangle((174,387,268,401),5,fill=FAR)
   for x in (190,252):d.line((x,401,x,456),fill=FAR,width=7)
   shoulder=(302,273);hip=(390,300);head=(268,265)
   support_hand=(229,383)
   support_elbow=ik(shoulder,support_hand,75,70,side=-1)
   limb(d,[shoulder,support_elbow,support_hand],FAR,12)
   limb(d,[hip,(391,383),(399,444)],BLUE,18)
   line(d,(399,444),(428,447),INK,9)
  else:
   shoulder=(272,270);hip=(360,305);head=(236,260)
   for direction in (-1,1):
    knee=(360+direction*26,386);foot=(360+direction*53,445)
    limb(d,[hip,knee,foot],BLUE,16)
    line(d,foot,(foot[0]+direction*18,448),INK,8)
  line(d,hip,shoulder,BLUE,27)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-17,head[0]+18,head[1]+17),fill=INK)
  starts=[shoulder] if supported else [(shoulder[0]-18,shoulder[1]),(shoulder[0]+18,shoulder[1])]
  for i,start in enumerate(starts):
   elbow=polar(start,70,1.35-1.15*u)
   hand=polar(elbow,60,math.pi/2)
   if abs(math.dist(start,elbow)-70)>1e-6 or abs(math.dist(elbow,hand)-60)>1e-6:raise ValueError('Row arm length changed')
   limb(d,[start,elbow,hand],INK if i else FAR,12)
   if kind=='kettlebell-row':
    x,y=hand
    d.rounded_rectangle((x-10,y-8,x+10,y+12),5,outline=INK,width=4)
    d.ellipse((x-16,y+8,x+16,y+38),fill=FAR,outline=INK,width=3)
   else:weight(d,hand,hammer=True)
 elif kind=='dumbbell-pullover':
  # Head and upper back stay on the bench. Two hands keep one dumbbell secure;
  # almost-straight arms pivot around the shoulders without moving the trunk.
  d.rounded_rectangle((160,360,405,376),5,fill=FAR)
  for x in (185,390):d.line((x,376,x,455),fill=FAR,width=7)
  hip=(330,349);shoulder=(225,349);head=(180,344)
  line(d,hip,shoulder,BLUE,26)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  limb(d,[hip,(360,319),(394,348)],BLUE,16)
  line(d,(394,348),(418,352),INK,9)
  angle=-1.2-1.1*u
  hands=[]
  for offset,color in ((-10,FAR),(10,INK)):
   arm_start=(shoulder[0]+offset,shoulder[1])
   elbow=polar(arm_start,68,angle)
   hand=polar(elbow,66,angle-.12);hands.append(hand)
   if abs(math.dist(arm_start,elbow)-68)>1e-6 or abs(math.dist(elbow,hand)-66)>1e-6 or math.dist(hand,head)<50:raise ValueError('Pullover arm or head clearance changed')
   limb(d,[arm_start,elbow,hand],color,11)
  center=((hands[0][0]+hands[1][0])/2,(hands[0][1]+hands[1][1])/2)
  line(d,hands[0],hands[1],INK,6);weight(d,center)
 elif kind=='skull-crusher':
  # Supine on a bench; upper arms and elbows stay fixed while separate
  # dumbbells lower beside the head and return without crossing the face.
  d.rounded_rectangle((170,360,405,376),5,fill=FAR)
  for x in (190,390):d.line((x,376,x,455),fill=FAR,width=7)
  hip=(329,350);shoulder=(234,350);head=(187,343)
  line(d,hip,shoulder,BLUE,26)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  limb(d,[hip,(358,318),(396,347)],BLUE,16)
  line(d,(396,347),(421,352),INK,9)
  for offset,color in ((-13,FAR),(13,INK)):
   elbow=(290+offset,263);arm_start=(shoulder[0]+offset,shoulder[1])
   angle=2.85-u*4.25
   hand=polar(elbow,72,angle)
   if abs(math.dist(elbow,hand)-72)>1e-6 or math.dist(hand,head)<46:raise ValueError('Skull crusher face clearance changed')
   limb(d,[arm_start,elbow,hand],color,11)
   weight(d,hand,hammer=True)
 elif kind in ('triceps-kickback','cable-triceps-kickback'):
  # One hand braces on a stable bench and one foot remains planted. The
  # loaded upper arm stays alongside the trunk; only the elbow extends.
  cable=kind=='cable-triceps-kickback'
  if cable:
   anchor=(142,340)
   d.line((116,90,116,456),fill=FAR,width=5)
   d.rounded_rectangle((93,362,125,421),5,fill=FAR,outline=INK,width=2)
   for y in (378,397,415):d.line((96,y,122,y),fill=INK,width=2)
   d.ellipse((anchor[0]-12,anchor[1]-12,anchor[0]+12,anchor[1]+12),fill=FAR,outline=INK,width=3)
  d.rounded_rectangle((170,395,260,410),5,fill=FAR)
  for x in (186,245):d.line((x,410,x,458),fill=FAR,width=7)
  hip=(340,278);shoulder=(238,300);head=(196,297)
  line(d,hip,shoulder,BLUE,26)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-17,head[0]+18,head[1]+17),fill=INK)
  limb(d,[shoulder,(219,351),(218,394)],FAR,12)
  limb(d,[hip,(365,371),(380,443)],BLUE,17)
  line(d,(380,443),(410,447),INK,9)
  elbow=(318,288)
  line(d,shoulder,elbow,INK,13)
  angle=1.24-u*1.15
  hand=polar(elbow,70,angle)
  if abs(math.dist(elbow,hand)-70)>1e-6 or elbow!=(318,288):raise ValueError('Kickback upper arm changed')
  if cable:d.line([xy(anchor),xy(hand)],fill=INK,width=3)
  line(d,elbow,hand,INK,11)
  if cable:d.rounded_rectangle((hand[0]-6,hand[1]-7,hand[0]+6,hand[1]+7),3,fill=FAR,outline=INK,width=2)
  else:weight(d,hand,hammer=True)
 elif kind=='overhead-triceps':
  # Side view: elbows and upper arms stay anchored as forearms extend.
  # The two-hand key grips one shared dumbbell; the one-arm key uses one.
  hip=(300,346);shoulder=(300,246);head=(282,210)
  limb(d,[hip,(305,392),(320,445)],BLUE,18)
  line(d,(320,445),(351,448),INK,9)
  line(d,hip,shoulder,BLUE,28)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-21,head[0]+18,head[1]+13),fill=INK)
  angle=.9-u*(.9+math.pi/2)
  elbows=[(318,190),(342,190)] if option==2 else [(330,190)]
  hands=[]
  for i,elbow in enumerate(elbows):
   arm_start=(shoulder[0]+(i*12 if option==2 else 12),shoulder[1]-4)
   hand=polar(elbow,70,angle);hands.append(hand)
   if abs(math.dist(elbow,hand)-70)>1e-6 or elbow[1]!=190:raise ValueError('Triceps upper-arm support changed')
   limb(d,[arm_start,elbow,hand],INK if i else FAR,11)
  if option==2:
   center=((hands[0][0]+hands[1][0])/2,(hands[0][1]+hands[1][1])/2)
   line(d,hands[0],hands[1],INK,6);weight(d,center)
  else:
   limb(d,[shoulder,(275,302),(280,354)],FAR,10)
   weight(d,hands[0],hammer=True)
 elif kind in ('dumbbell-shrug','dumbbell-lateral-raise'):
  # Front view exposes both dumbbells and the shoulder-height limit. The
  # seated variant uses a fixed bench and still torso rather than leg drive.
  seated=bool(option) if kind=='dumbbell-lateral-raise' else False
  hip=(300,332);neck=(300,204);head=(300,169)
  if seated:
   d.rounded_rectangle((245,338,355,351),5,fill=FAR)
   for x in (257,343):d.line((x,351,x,455),fill=FAR,width=7)
   for direction in (-1,1):
    knee=(300+direction*68,366);foot=(300+direction*93,446)
    limb(d,[hip,knee,foot],FAR,15);line(d,foot,(foot[0]+direction*18,448),INK,8)
  else:
   for direction in (-1,1):
    knee=(300+direction*25,386);foot=(300+direction*44,445)
    limb(d,[hip,knee,foot],BLUE,17);line(d,foot,(foot[0]+direction*19,449),INK,9)
  line(d,hip,neck,BLUE,30)
  line(d,neck,head,BLUE,12)
  d.ellipse((head[0]-18,head[1]-22,head[0]+18,head[1]+13),fill=INK)
  for direction in (-1,1):
   shoulder=(300+direction*35,205-(14*u if kind=='dumbbell-shrug' else 0))
   line(d,neck,shoulder,BLUE,14)
   if kind=='dumbbell-shrug':
    arm_angle=math.pi/2-direction*.1
    elbow=polar(shoulder,73,arm_angle);hand=polar(elbow,70,arm_angle)
   else:
    arm_angle=math.pi/2+direction*(-.19-1.30*u)
    elbow=polar(shoulder,73,arm_angle)
    hand=polar(elbow,66,arm_angle+direction*.11)
    if hand[1]<195:raise ValueError('Lateral raise exceeds shoulder height')
   if abs(math.dist(shoulder,elbow)-73)>1e-6 or abs(math.dist(elbow,hand)-(70 if kind=='dumbbell-shrug' else 66))>1e-6:raise ValueError('Arm length changed')
   limb(d,[shoulder,elbow,hand],INK,12)
   weight(d,hand,hammer=True)
 elif kind=='side-lying-hip-adduction':
  # Frontal-plane view: the top knee is bent and its foot supports the body;
  # the straight lower leg lifts inward without the pelvis rolling.
  shoulder=(235,383);hip=(330,390);head=(194,379)
  top_knee=(367,333);top_foot=(400,428)
  line(d,shoulder,hip,BLUE,26)
  limb(d,[hip,top_knee,top_foot],FAR,16)
  line(d,top_foot,(420,429),FAR,8)
  limb(d,[shoulder,(232,421),(193,426)],INK,11)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  angle=.25-.38*u
  knee=polar(hip,70,angle);foot=polar(knee,70,angle)
  if any(abs(math.dist(a,b)-70)>1e-6 for a,b in ((hip,knee),(knee,foot))):raise ValueError('Hip adduction leg length changed')
  if foot[1]>429 or hip!=(330,390):raise ValueError('Hip adduction support changed')
  limb(d,[hip,knee,foot],BLUE,18)
  line(d,foot,(foot[0]+13,foot[1]+2),INK,8)
 elif kind=='wall-tibialis-raise':
  # Upper back touches a stable wall, heels remain planted, and the toes
  # rotate up about the heel. The knee, hip and trunk remain fixed.
  d.line((206,105,206,460),fill=FAR,width=9)
  shoulder=(211,213);hip=(270,327);knee=(307,385);heel=(330,447)
  head=(229,180)
  limb(d,[shoulder,hip,knee,heel],BLUE,19)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-16,head[1]-23,head[0]+16,head[1]+10),fill=INK)
  limb(d,[shoulder,(263,270),(281,310)],INK,10)
  toe=polar(heel,45,-.5*u)
  if abs(math.dist(heel,toe)-45)>1e-6 or heel!=(330,447) or toe[1]>447:raise ValueError('Tibialis heel support changed')
  line(d,heel,toe,INK,12)
 elif kind=='side-lying-hip-abduction':
  # Frontal-plane view of a side-lying setup: the pelvis and support leg are
  # fixed, while one straight working leg abducts without trunk rotation.
  shoulder=(235,385);hip=(330,393);head=(194,380)
  support_knee=(380,428);support_foot=(430,430)
  line(d,shoulder,hip,BLUE,26)
  limb(d,[hip,support_knee,support_foot],FAR,16)
  line(d,support_foot,(450,430),FAR,8)
  limb(d,[shoulder,(232,421),(193,426)],INK,11)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  angle=-.12-.57*u
  knee=polar(hip,72,angle);foot=polar(knee,72,angle)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((hip,knee,72),(knee,foot,72))):raise ValueError('Hip abduction leg length changed')
  if foot[1]>393 or hip!=(330,393):raise ValueError('Hip abduction support changed')
  limb(d,[hip,knee,foot],BLUE,18)
  line(d,foot,(foot[0]+15,foot[1]+2),INK,8)
 elif kind=='reverse-crunch':
  # Upper back stays supported. The pelvis rolls gently toward the ribs while
  # both bent legs follow; neither foot swings from a floor contact.
  shoulder=(205,420);head=(165,420)
  hip=polar(shoulder,95,-0.23*u)
  knee=polar(hip,90,-.95-.25*u)
  shin_angle=.76+.13*u
  foot=polar(knee,78,shin_angle)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((shoulder,hip,95),(hip,knee,90),(knee,foot,78))):raise ValueError('Reverse crunch segment changed length')
  if foot[1]>425 or head[1]!=420:raise ValueError('Reverse crunch support changed')
  line(d,shoulder,hip,BLUE,25)
  limb(d,[hip,knee,foot],BLUE,17)
  line(d,foot,(foot[0]+19,foot[1]+2),INK,9)
  line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-17,head[1]-17,head[0]+17,head[1]+17),fill=INK)
  limb(d,[shoulder,(240,437),(266,438)],INK,10)
 elif kind=='lying-leg-raise':
  # The back and pelvis stay supported while straight legs pivot as one unit
  # around the hips; the low point stays above the floor.
  shoulder=(205,420);head=(165,420);hip=(300,420)
  angle=-.22-1.14*u
  knee=polar(hip,76,angle)
  foot=polar(knee,76,angle)
  if abs(math.dist(hip,knee)-76)>1e-6 or abs(math.dist(knee,foot)-76)>1e-6:raise ValueError('Leg raise segment changed length')
  if foot[1]>405 or hip[1]!=420:raise ValueError('Leg raise floor clearance changed')
  line(d,shoulder,hip,BLUE,25)
  limb(d,[hip,knee,foot],BLUE,18)
  line(d,foot,(foot[0]+13,foot[1]-7),INK,8)
  line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-17,head[1]-17,head[0]+17,head[1]+17),fill=INK)
  limb(d,[shoulder,(237,439),(265,441)],INK,10)
 elif kind=='crunch':
  # Pelvis and both feet remain on the floor. The upper trunk curls through a
  # short range; the head follows the shoulder without a neck-pulling hand.
  hip=(300,425);knee=(352,352);foot=(410,425)
  angle=.43*u
  shoulder=polar(hip,95,math.pi+angle)
  head=polar(shoulder,40,math.pi+angle)
  if abs(math.dist(hip,shoulder)-95)>1e-6 or abs(math.dist(shoulder,head)-40)>1e-6:raise ValueError('Crunch trunk length changed')
  if hip!=(300,425) or knee!=(352,352) or foot!=(410,425):raise ValueError('Crunch floor contact changed')
  limb(d,[hip,knee,foot],FAR,17)
  line(d,foot,(435,428),INK,9)
  line(d,hip,shoulder,BLUE,25)
  line(d,shoulder,head,BLUE,11)
  if option=='plate':
   plate=(shoulder[0]+38,shoulder[1]-8)
   d.ellipse((plate[0]-19,plate[1]-19,plate[0]+19,plate[1]+19),fill=FAR,outline=INK,width=3)
   d.ellipse((plate[0]-7,plate[1]-7,plate[0]+7,plate[1]+7),fill=BG)
   line(d,shoulder,plate,INK,8)
  elbow=add(shoulder,(48,-41));hand=add(elbow,(37,30))
  limb(d,[shoulder,elbow,hand],INK,11)
  d.ellipse((head[0]-18,head[1]-17,head[0]+18,head[1]+17),fill=INK)
  d.line((head[0]-14,head[1]+7,head[0]-5,head[1]+8),fill=BG,width=3)
 elif kind=='quadruped-hip-extension':
  # Hands and support knee stay planted. The trunk and pelvis remain level;
  # only the working hip extends, with fixed thigh and shin lengths.
  hip=(350,302);shoulder=(238,293);head=(196,288)
  hand=(230,435);support_knee=(358,437)
  limb(d,[hip,shoulder],BLUE,26)
  limb(d,[shoulder,(240,361),hand],INK,14)
  limb(d,[hip,(360,362),support_knee],FAR,16)
  line(d,support_knee,(388,439),FAR,10)
  angle=1.4-u*0.85
  working_knee=polar(hip,76,angle)
  working_foot=polar(working_knee,64,angle+0.17)
  if abs(math.dist(hip,working_knee)-76)>1e-6 or abs(math.dist(working_knee,working_foot)-64)>1e-6:raise ValueError('Working leg length changed')
  if working_foot[1]>452:raise ValueError('Working foot crosses ground')
  limb(d,[hip,working_knee,working_foot],BLUE,17)
  d.ellipse((head[0]-20,head[1]-17,head[0]+17,head[1]+17),fill=INK)
  d.line((head[0]-14,head[1]+9,head[0]-4,head[1]+9),fill=BG,width=3)
  d.line((215,435,248,435),fill=INK,width=9)
 elif kind=='step-up':
  # The lead foot stays on the platform. The trailing foot lifts outside the
  # box, clears its edge, and only then lands on top; neither leg stretches.
  d.rounded_rectangle((340,395,480,460),5,fill=FAR)
  d.line((340,395,480,395),fill=INK,width=7)
  lead_ankle=(390,389)
  hip=(280+85*u,295-70*u)
  if u<.5:
   q=u/.5;trail_ankle=(245+35*q,445-95*q)
  elif u<.7:
   q=(u-.5)/.2;trail_ankle=(280+60*q,350+5*q)
  else:
   q=(u-.7)/.3;trail_ankle=(340+100*q,355+34*q)
  lead_knee=ik(hip,lead_ankle,100,100,side=1)
  trail_knee=ik(hip,trail_ankle,100,100,side=1)
  if any(abs(math.dist(a,b)-100)>1e-6 for a,b in ((hip,lead_knee),(lead_knee,lead_ankle),(hip,trail_knee),(trail_knee,trail_ankle))):raise ValueError('Step-up leg segment changed length')
  if .5<=u<=1 and trail_ankle[0]>=340 and trail_ankle[1]>395:raise ValueError('Trailing foot intersects step')
  limb(d,[hip,trail_knee,trail_ankle],FAR,17)
  limb(d,[hip,lead_knee,lead_ankle],BLUE,19)
  line(d,lead_ankle,(420,390),INK,10)
  line(d,trail_ankle,(trail_ankle[0]+24,trail_ankle[1]+2),INK,9)
  shoulder=(hip[0]-6,hip[1]-90);head=(shoulder[0],shoulder[1]-27)
  body(d,hip,shoulder,head)
  for offset,color in ((-35,FAR),(35,INK)):
   elbow=(shoulder[0]+offset,shoulder[1]+61)
   hand=(elbow[0]+5,elbow[1]+48)
   limb(d,[shoulder,elbow,hand],color,10)
   if option=='dumbbell':weight(d,hand)
 elif kind in ('split-squat','reverse-lunge'):
  front_ankle=(393,440);front_toe=(432,450)
  if kind=='reverse-lunge':
   # Step back first while the moving foot is clear of the floor; only then
   # descend. The return reverses these phases as phase() reduces u.
   step=min(1,2*u);lower=max(0,min(1,2*u-1))
   rear_ankle=(355-120*step,440-22*math.sin(math.pi*step))
   hip=(320,280+50*lower)
  else:
   rear_ankle=(235,365) if option in ('rear-bench','rear-bench-dumbbell') else (238,440)
   hip=(320,(270 if option in ('rear-bench','rear-bench-dumbbell') else 280)+50*u)
  if option in ('rear-bench','rear-bench-dumbbell'):
   d.rounded_rectangle((193,370,277,385),5,fill=FAR)
   for x in (208,265):d.line((x,385,x,459),fill=FAR,width=8)
  front_knee=ik(hip,front_ankle,100,100,side=1)
  rear_knee=ik(hip,rear_ankle,100,100,side=1)
  if any(abs(math.dist(a,b)-100)>1e-6 for a,b in ((hip,front_knee),(front_knee,front_ankle),(hip,rear_knee),(rear_knee,rear_ankle))):raise ValueError('Lunge leg segment changed length')
  limb(d,[hip,rear_knee,rear_ankle],FAR,17)
  limb(d,[hip,front_knee,front_ankle],BLUE,19)
  line(d,front_ankle,front_toe,INK,10)
  rear_toe=(rear_ankle[0]-20,rear_ankle[1]+9)
  line(d,rear_ankle,rear_toe,INK,9)
  shoulder=(316,hip[1]-112);head=(316,hip[1]-145)
  body(d,hip,shoulder,head)
  if option in ('floor-dumbbell','rear-bench-dumbbell','dumbbell'):
   # Two independently visible carried dumbbells stay below straight arms as
   # the torso lowers or the trailing foot steps back. Neither is a barbell.
   for offset,color in ((-34,FAR),(34,INK)):
    elbow=(shoulder[0]+offset,shoulder[1]+58)
    hand=(elbow[0]+3,elbow[1]+47)
    limb(d,[shoulder,elbow,hand],color,10)
    weight(d,hand,hammer=True)
  else:limb(d,[shoulder,(346,shoulder[1]+54),(362,shoulder[1]+85)],INK,11)
 elif kind=='single-calf':
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
  if template[0]=='alternating-curl':
   u,label=alternating_phase(t);draw_pose(d,'alternating-curl',0 if t<4 else 1,u)
  else:
   u,label=phase(t);draw_pose(d,*template,u)
  d.text((55,105),label,font=FONTS[22],fill=INK)
  d.rounded_rectangle((55,485,55+int(440*t/8),490),2,fill=BLUE)
 else:
  d.text((70,220),'Written guide',font=FONTS[30],fill=INK)
  wrap(d,'Movement rendering blocked until the exact setup and motion can be represented reliably.',70,270,34,18)
 im.paste(logo,(W-logo.width-30,20),logo)
 d.text((32,508),'Original generated schematic | Not human fitness-reviewed' if template else 'Written instructions remain available | No substitute animation',font=FONTS[16],fill=MUTED)
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
 record={'catalogKey':key,'name':e['name'],'poster':f'exercises/{key}/v{version}/{sha(poster)}.png','source':f'exercises/{key}/v{version}/{sha(video)}.mp4' if complete else None,'format':'mp4' if complete else None,'caption':caption,'angle':('front' if key in ('side-lying-hip-abduction','side-lying-hip-adduction','dumbbell-shrug','dumbbell-lateral-raise','seated-dumbbell-lateral-raise','dumbbell-shoulder-press','standing-dumbbell-press','neutral-grip-dumbbell-shoulder-press','single-arm-dumbbell-overhead-press','alternating-dumbbell-curl','cross-body-hammer-curl','side-lying-dumbbell-external-rotation','dumbbell-side-bend','bodyweight-lateral-lunge','dumbbell-lateral-lunge','cossack-squat','resistance-band-pull-apart','resistance-band-lateral-raise','resistance-band-curl','resistance-band-overhead-press') else 'side') if complete else 'unspecified','duration':DURATION if complete else 0,'version':version,'reviewStatus':'technical' if complete else 'blocked','reviewer':None,'safetyClassification':'coaching-recommended' if e.get('coachingRecommended') else 'general','textFallback':e.get('instructions',[]),'license':'Original LIMIT-generated schematic; no third-party footage','generated':True,'width':W,'height':H,'fps':FPS if complete else 0,'posterSha256':sha(poster),'videoSha256':sha(video) if complete else None,'bytes':poster.stat().st_size+(video.stat().st_size if complete else 0),'blockReason':reason,'template':template[0] if template else None,'technicalChecks':['exact-catalog-key','fixed-framing','silent','h264-yuv420p','full-decode'] if complete else ['exact-catalog-key','written-fallback']}
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
