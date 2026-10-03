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
 if kind=='overhead-triceps':
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
 record={'catalogKey':key,'name':e['name'],'poster':f'exercises/{key}/v{version}/{sha(poster)}.png','source':f'exercises/{key}/v{version}/{sha(video)}.mp4' if complete else None,'format':'mp4' if complete else None,'caption':caption,'angle':('front' if key in ('side-lying-hip-abduction','side-lying-hip-adduction','dumbbell-shrug','dumbbell-lateral-raise','seated-dumbbell-lateral-raise') else 'side') if complete else 'unspecified','duration':DURATION if complete else 0,'version':version,'reviewStatus':'technical' if complete else 'blocked','reviewer':None,'safetyClassification':'coaching-recommended' if e.get('coachingRecommended') else 'general','textFallback':e.get('instructions',[]),'license':'Original LIMIT-generated schematic; no third-party footage','generated':True,'width':W,'height':H,'fps':FPS if complete else 0,'posterSha256':sha(poster),'videoSha256':sha(video) if complete else None,'bytes':poster.stat().st_size+(video.stat().st_size if complete else 0),'blockReason':reason,'template':template[0] if template else None,'technicalChecks':['exact-catalog-key','fixed-framing','silent','h264-yuv420p','full-decode'] if complete else ['exact-catalog-key','written-fallback']}
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
