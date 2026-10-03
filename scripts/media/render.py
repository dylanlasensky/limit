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
 'rope-triceps-pushdown':('cable-triceps-pushdown','rope'),
 'v-bar-triceps-pushdown':('cable-triceps-pushdown','vbar'),
 'reverse-grip-triceps-pushdown':('cable-triceps-pushdown','reverse'),
 'single-arm-cable-pushdown':('cable-triceps-pushdown','single'),
 'overhead-cable-triceps-extension':('cable-overhead-triceps',None),
 'single-arm-overhead-cable-extension':('cable-overhead-triceps','single'),
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
 'rope-hammer-curl':('low-cable-curl','rope-neutral'),
 'reverse-cable-curl':('low-cable-curl','reverse'),
 'straight-arm-cable-pulldown':('cable-straight-arm','bilateral'),
 'single-arm-cable-pullover':('cable-straight-arm','unilateral'),
 'rope-straight-arm-pulldown':('cable-straight-arm','rope'),
 'pull-up':('suspended-pull','overhand'),
 'chin-up':('suspended-pull','underhand'),
 'neutral-grip-pull-up':('suspended-pull','neutral'),
 'weighted-pull-up':('suspended-pull','weight-overhand'),
 'weighted-chin-up':('suspended-pull','weight-underhand'),
 'band-assisted-pull-up':('suspended-pull','band-assisted'),
 'hanging-knee-raise':('hanging-raise','bent-knee'),
 'hanging-leg-raise':('hanging-raise','straight-leg'),
 'bird-dog':('bird-dog',None),
 'dead-bug':('dead-bug',None),
 'ab-wheel-rollout':('kneeling-rollout','wheel'),
 'stability-ball-rollout':('kneeling-rollout','ball'),
 'body-saw':('body-saw',None),
 'plank-shoulder-tap':('plank-shoulder-tap',None),
 'single-leg-glute-bridge':('bridge-single',None),
 'frog-pump':('bridge-frog',None),
 'barbell-glute-bridge':('bridge-barbell',None),
 'barbell-curl':('bar-curl','straight-supinated'),
 'ez-bar-curl':('bar-curl','ez-supinated'),
 'reverse-barbell-curl':('bar-curl','straight-pronated'),
 'reverse-ez-bar-curl':('bar-curl','ez-pronated'),
 'ez-bar-preacher-curl':('supported-bar-curl','preacher'),
 'ez-bar-spider-curl':('supported-bar-curl','spider'),
 'barbell-wrist-curl':('bar-wrist-curl','supinated'),
 'barbell-reverse-wrist-curl':('bar-wrist-curl','pronated'),
 'cable-external-rotation':('anchored-rotation','cable-external'),
 'band-external-rotation':('anchored-rotation','band-external'),
 'cable-internal-rotation':('anchored-rotation','cable-internal'),
 'band-internal-rotation':('anchored-rotation','band-internal'),
 'cable-wrist-curl':('cable-wrist-curl',None),
 'dumbbell-forearm-pronation':('forearm-turn','pronation'),
 'dumbbell-forearm-supination':('forearm-turn','supination'),
 'zottman-curl':('zottman-curl',None),
 'barbell-back-squat':('barbell-squat','back'),
 'high-bar-back-squat':('barbell-squat','high'),
 'low-bar-back-squat':('barbell-squat','low'),
 'paused-back-squat':('barbell-squat','paused'),
 'box-squat':('barbell-squat','box'),
 'barbell-front-squat':('barbell-squat','front'),
 'zercher-squat':('barbell-squat','zercher'),
 'safety-bar-squat':('barbell-squat','safety'),
 'kettlebell-goblet-squat':('equipment-squat','goblet-kettlebell'),
 'double-kettlebell-front-squat':('equipment-squat','double-kettlebell'),
 'smith-machine-squat':('equipment-squat','smith-back'),
 'smith-machine-front-squat':('equipment-squat','smith-front'),
 'belt-squat':('equipment-squat','belt'),
 'hack-squat':('equipment-squat','hack'),
 'assisted-single-leg-squat':('assisted-single-leg-squat',None),
 'barbell-split-squat':('barbell-split-squat',None),
 'barbell-overhead-press':('overhead-press','barbell-standing'),
 'seated-barbell-shoulder-press':('overhead-press','barbell-seated'),
 'smith-machine-shoulder-press':('overhead-press','smith-seated'),
 'machine-shoulder-press':('overhead-press','machine-seated'),
 'kettlebell-strict-press':('overhead-press','kettlebell-standing'),
 'arnold-press':('overhead-press','arnold-seated'),
 'single-arm-cable-lateral-raise':('cable-shoulder-raise','lateral'),
 'cable-front-raise':('cable-shoulder-raise','front'),
 'barbell-bench-press':('barbell-horizontal-press','flat'),
 'incline-barbell-bench-press':('barbell-horizontal-press','incline'),
 'decline-barbell-bench-press':('barbell-horizontal-press','decline'),
 'close-grip-bench-press':('barbell-horizontal-press','close'),
 'paused-bench-press':('barbell-horizontal-press','paused'),
 'spoto-press':('barbell-horizontal-press','spoto'),
 'barbell-floor-press':('barbell-horizontal-press','floor'),
 'smith-machine-bench-press':('barbell-horizontal-press','smith'),
 'neutral-grip-dumbbell-bench-press':('dumbbell-bench-variant','neutral'),
 'single-arm-dumbbell-bench-press':('dumbbell-bench-variant','single'),
 'dumbbell-squeeze-press':('dumbbell-bench-variant','squeeze'),
 'machine-chest-press':('machine-horizontal-press','flat'),
 'incline-machine-chest-press':('machine-horizontal-press','incline'),
 'plate-loaded-chest-press':('machine-horizontal-press','plate-loaded'),
 'single-arm-machine-chest-press':('machine-horizontal-press','single'),
 'smith-machine-incline-press':('barbell-horizontal-press','smith-incline'),
 'leg-press':('leg-press-sled','incline'),
 'horizontal-leg-press':('leg-press-sled','horizontal'),
 'single-leg-press':('leg-press-sled','single'),
 'wide-stance-leg-press':('leg-press-sled','wide'),
 'leg-press-calf-raise':('leg-press-calf',None),
 'smith-machine-calf-raise':('smith-calf',None),
 'donkey-calf-raise':('donkey-calf',None),
 'machine-tibialis-raise':('machine-tibialis',None),
 'barbell-shrug':('loaded-shrug','barbell'),
 'trap-bar-shrug':('loaded-shrug','trap-bar'),
 'smith-machine-shrug':('loaded-shrug','smith'),
 'cable-shrug':('loaded-shrug','cable'),
 'machine-shrug':('loaded-shrug','machine'),
 'deficit-push-up':('push-up','deficit'),
 'close-grip-push-up':('push-up','close-grip'),
 'weighted-push-up':('push-up','weighted'),
 'cable-crunch':('supported-trunk-crunch','kneeling-cable'),
 'machine-abdominal-crunch':('supported-trunk-crunch','machine'),
 'captain-s-chair-knee-raise':('captain-chair-raise',None),
 'cable-pallof-press':('anti-rotation','cable'),
 'band-pallof-press':('anti-rotation','band'),
 'cable-woodchop':('diagonal-pull','high-standing'),
 'low-to-high-cable-lift':('diagonal-pull','low-standing'),
 'half-kneeling-cable-chop':('diagonal-pull','high-kneeling'),
 'half-kneeling-cable-lift':('diagonal-pull','low-kneeling'),
 'barbell-bent-over-row':('loaded-row','barbell'),
 'underhand-barbell-row':('loaded-row','underhand'),
 'pendlay-row':('loaded-row','pendlay'),
 'seal-row':('loaded-row','seal'),
 't-bar-row':('loaded-row','t-bar'),
 'meadows-row':('loaded-row','meadows'),
 'smith-machine-bent-over-row':('loaded-row','smith'),
 'suspension-row':('suspension-row',None),
 'assisted-pull-up':('suspended-pull','assisted-overhand'),
 'assisted-chin-up':('suspended-pull','assisted-underhand'),
 'machine-lat-pulldown':('machine-lever-lat',None),
 'wide-grip-cable-row':('seated-cable-row','wide'),
 'chest-supported-machine-row':('supported-machine-row','standard'),
 'plate-loaded-high-row':('supported-machine-row','high'),
 'single-arm-machine-row':('supported-machine-row','single'),
 'machine-preacher-curl':('machine-preacher-curl',None),
 'cable-glute-kickback':('supported-kickback','cable'),
 'machine-glute-kickback':('supported-kickback','machine'),
 'resistance-band-glute-kickback':('supported-kickback','band'),
 'seated-hip-abduction':('seated-hip-machine','abduction'),
 'seated-hip-adduction':('seated-hip-machine','adduction'),
 'standing-cable-hip-abduction':('standing-cable-hip','abduction'),
 'standing-cable-hip-adduction':('standing-cable-hip','adduction'),
 'band-clamshell':('band-clamshell',None),
 'single-leg-seated-curl':('machine-seated-leg-curl','single'),
 'single-leg-lying-curl':('machine-lying-leg-curl','single'),
 'cable-leg-curl':('cable-leg-curl',None),
 'nordic-hamstring-curl':('nordic-hamstring-curl',None),
 '45-degree-back-extension':('incline-back-extension','bodyweight'),
 'weighted-back-extension':('incline-back-extension','weighted'),
 'machine-back-extension':('machine-back-extension',None),
 'reverse-hyperextension':('reverse-hyperextension',None),
 'ez-bar-skull-crusher':('skull-crusher','ez'),
 'machine-triceps-extension':('machine-triceps-extension',None),
 'high-cable-curl':('high-cable-curl',None),
 'cross-body-cable-triceps-extension':('cross-body-cable-triceps',None),
 'standing-cable-chest-press':('cable-chest-press','bilateral'),
 'single-arm-cable-chest-press':('cable-chest-press','single'),
 'cable-face-pull':('anchored-face-pull','cable'),
 'resistance-band-face-pull':('anchored-face-pull','band'),
 'barbell-deadlift':('barbell-hinge','conventional'),
 'romanian-deadlift':('barbell-hinge','romanian'),
 'dumbbell-romanian-deadlift':('barbell-hinge','dumbbell-romanian'),
 'kettlebell-deadlift':('barbell-hinge','kettlebell-conventional'),
 'kettlebell-romanian-deadlift':('barbell-hinge','kettlebell-romanian'),
 'paused-deadlift':('barbell-hinge','paused'),
 'snatch-grip-deadlift':('barbell-hinge','snatch-grip'),
 'sumo-deadlift':('barbell-hinge','sumo'),
 'deficit-deadlift':('barbell-hinge','deficit'),
 'trap-bar-deadlift':('barbell-hinge','trapbar-conventional'),
 'trap-bar-romanian-deadlift':('barbell-hinge','trapbar-romanian'),
 'smith-machine-romanian-deadlift':('barbell-hinge','smith-romanian'),
 'barbell-good-morning':('barbell-hinge','good-morning'),
 'resistance-band-good-morning':('barbell-hinge','band-good-morning'),
 'dumbbell-fly':('depth-fly','flat-dumbbell'),
 'incline-dumbbell-fly':('depth-fly','incline-dumbbell'),
 'cable-chest-fly':('depth-fly','cable-chest'),
 'bench-cable-fly':('depth-fly','bench-cable'),
 'single-arm-cable-fly':('depth-fly','single-arm-cable'),
 'low-to-high-cable-fly':('depth-fly','low-to-high-cable'),
 'high-to-low-cable-fly':('depth-fly','high-to-low-cable'),
 'resistance-band-chest-fly':('depth-fly','band-chest'),
 'dumbbell-reverse-fly':('depth-fly','reverse-dumbbell'),
 'chest-supported-reverse-fly':('depth-fly','reverse-supported'),
 'cable-reverse-fly':('depth-fly','reverse-cable'),
 'single-arm-cable-rear-delt-fly':('depth-fly','reverse-single-cable'),
 'pec-deck-fly':('depth-fly','pecdeck-chest'),
 'reverse-pec-deck':('depth-fly','pecdeck-reverse'),
 'chest-dip':('chest-dip','bodyweight'),
 'assisted-chest-dip':('chest-dip','assisted'),
 'b-stance-romanian-deadlift':('barbell-hinge','b-stance-romanian'),
 'single-leg-dumbbell-romanian-deadlift':('barbell-hinge','single-leg-romanian'),
 'supported-single-leg-romanian-deadlift':('barbell-hinge','supported-single-leg-romanian'),
 'cable-pull-through':('cable-pull-through',None),
 'lat-pulldown':('machine-lat-pulldown','bilateral'),
 'close-grip-lat-pulldown':('narrow-lat-pulldown',None),
 'single-arm-lat-pulldown':('machine-lat-pulldown','unilateral'),
 'neutral-grip-lat-pulldown':('machine-lat-pulldown','neutral'),
 'underhand-lat-pulldown':('machine-lat-pulldown','underhand'),
 'half-kneeling-cable-pulldown':('half-kneeling-cable-pulldown',None),
 'glute-bridge':('bridge',False),'dumbbell-glute-bridge':('bridge',True),
 'dumbbell-hip-thrust':('bench-hip-thrust','dumbbell'),
 'barbell-hip-thrust':('bench-hip-thrust','barbell'),
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
 'barbell-reverse-lunge':('reverse-lunge','barbell'),
 'dumbbell-forward-lunge':('forward-lunge','dumbbell'),
 'smith-machine-split-squat':('split-squat','smith'),
 'bodyweight-step-up':('step-up','bodyweight'),
 'dumbbell-step-up':('step-up','dumbbell'),
 'barbell-step-up':('step-up','barbell'),
}
BLOCK_REASONS={
 'single-arm-landmine-press':'the fixed-pivot press trial folds the elbow behind the torso at the chest start; a coupled bar/shoulder/forearm rig is still needed',
 'half-kneeling-landmine-press':'the fixed-pivot press trial folds the elbow behind the torso at the chest start despite stable knee and foot contacts; a coupled bar/shoulder/forearm rig is still needed',
 'landmine-squat':'a constant-length bar from the fixed pivot currently drives the chest-held end away from the squat torso at depth; this needs a coupled pivot, torso and foot-contact rig before a video can be generated',
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
def segment_distance(p,a,b):
 dx,dy=b[0]-a[0],b[1]-a[1]
 t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)))
 return math.dist(p,(a[0]+t*dx,a[1]+t*dy))
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
def paused_squat_phase(t):
 if t<1:return 0,'Set up'
 if t<3:return (1-math.cos(math.pi*(t-1)/2))/2,'Descend with control'
 if t<5:return 1,'Hold the bottom / keep braced'
 if t<7:return (1+math.cos(math.pi*(t-5)/2))/2,'Stand with control'
 return 0,'Reset'
def paused_bench_phase(t):
 if t<1:return 1,'Set up at lockout'
 if t<3:return (1+math.cos(math.pi*(t-1)/2))/2,'Lower with control'
 if t<5:return 0,'Hold the bottom / stay braced'
 if t<7:return (1-math.cos(math.pi*(t-5)/2))/2,'Press with control'
 return 1,'Reset'
def paused_deadlift_phase(t):
 # A visible near-knee hold on the way up, followed by lockout and return.
 if t<1:return 0,'Set up at floor'
 if t<2.25:return .43*(1-math.cos(math.pi*(t-1)/1.25))/2,'Lift with control'
 if t<3.25:return .43,'Hold near knee / stay braced'
 if t<4.5:return .43+.57*(1-math.cos(math.pi*(t-3.25)/1.25))/2,'Stand tall'
 if t<5:return 1,'Pause at lockout'
 if t<6.5:return (1+math.cos(math.pi*(t-5)/1.5))/2,'Lower with control'
 return 0,'Reset at floor'
def draw_grip_inset(d,orientation,u=0):
 # A second, close camera view makes palm direction readable when the full
 # front-view pulldown cannot show depth around the overhead handle.
 d.rounded_rectangle((40,273,183,362),8,fill=BG,outline=FAR,width=2)
 d.text((49,279),'HANDLE / HANDS',font=FONTS[14],fill=MUTED)
 if orientation=='neutral':
  d.line((90,305,90,328),fill=INK,width=7);d.line((132,305,132,328),fill=INK,width=7)
  d.rounded_rectangle((79,311,101,331),4,fill=BLUE,outline=INK,width=2)
  d.rounded_rectangle((121,311,143,331),4,fill=BLUE,outline=INK,width=2)
  d.line((104,321,117,321),fill=INK,width=2)
  label='PALMS FACE IN'
 elif orientation=='underhand':
  d.line((63,314,160,314),fill=INK,width=6)
  for x in (88,135):
   d.rounded_rectangle((x-12,304,x+12,329),5,fill=BLUE,outline=INK,width=2)
   for k in (-5,0,5):d.ellipse((x+k-1,308,x+k+1,310),fill=INK)
  label='PALMS TO BODY'
 elif orientation=='reverse':
  d.line((63,314,160,314),fill=INK,width=6)
  for x in (88,135):
   d.rounded_rectangle((x-12,302,x+12,330),5,fill=BLUE,outline=INK,width=2)
   d.line((x-4,305,x-4,327),fill=INK,width=2)
   d.line((x+4,305,x+4,327),fill=INK,width=2)
  label='PALMS DOWN'
 elif orientation=='supinated':
  d.line((63,314,160,314),fill=INK,width=6)
  for x in (88,135):
   d.rounded_rectangle((x-12,302,x+12,330),5,fill=BLUE,outline=INK,width=2)
   d.line((x-6,309,x+6,309),fill=INK,width=2)
   d.line((x-5,322,x+5,322),fill=INK,width=2)
  label='PALMS UP'
 elif orientation=='vbar':
  d.line((109,303,89,329),fill=INK,width=7)
  d.line((109,303,129,329),fill=INK,width=7)
  d.rounded_rectangle((77,314,99,336),4,fill=BLUE,outline=INK,width=2)
  d.rounded_rectangle((119,314,141,336),4,fill=BLUE,outline=INK,width=2)
  label='V BAR / NEUTRAL'
 elif orientation=='pronated':
  d.line((63,314,160,314),fill=INK,width=6)
  for x in (88,135):
   d.rounded_rectangle((x-12,302,x+12,330),5,fill=BLUE,outline=INK,width=2)
   d.line((x-5,305,x-5,328),fill=INK,width=2)
   d.line((x+5,305,x+5,328),fill=INK,width=2)
  label='PALMS AWAY'
 elif orientation=='rope':
  spread=16+12*u
  d.line((109,300,109,312),fill=INK,width=4)
  for side in (-1,1):
   end=109+side*spread
   d.line((109,312,end,331),fill=INK,width=4)
   d.rounded_rectangle((end-9,323,end+9,338),4,fill=BLUE,outline=INK,width=2)
  label='ROPE / NEUTRAL'
 else:raise ValueError('Unsupported grip inset')
 d.text((50,339),label,font=FONTS[14],fill=INK)
def draw_opposite_limb_inset(d):
 # Plan view: the highlighted reaching arm and leg leave opposite sides.
 d.rounded_rectangle((40,273,183,362),8,fill=BG,outline=FAR,width=2)
 d.text((49,279),'TOP VIEW',font=FONTS[14],fill=MUTED)
 d.rounded_rectangle((102,306,121,335),5,fill=BLUE)
 d.line((103,309,73,300),fill=BLUE,width=8)
 d.ellipse((68,295,77,304),fill=INK)
 d.line((121,310,145,322),fill=FAR,width=8)
 d.ellipse((141,319,150,328),fill=FAR)
 d.line((103,334,79,345),fill=FAR,width=8)
 d.ellipse((74,342,83,351),fill=FAR)
 d.line((121,334,147,346),fill=BLUE,width=8)
 d.ellipse((143,342,152,351),fill=INK)
 d.text((49,341),'OPPOSITE SIDES',font=FONTS[14],fill=INK)
def draw_curl_bar(d,point,ez=False):
 # The bar stays in both hands and its plate centers follow the hand path.
 x,y=point
 if ez:
  pts=[(x-72,y),(x-45,y),(x-27,y-8),(x-9,y+5),(x+9,y-5),(x+27,y+8),(x+45,y),(x+72,y)]
  d.line([xy(p) for p in pts],fill=INK,width=6,joint='curve')
 else:d.line((x-72,y,x+72,y),fill=INK,width=6)
 for px in (x-61,x+61):
  d.rounded_rectangle((px-7,y-19,px+7,y+19),3,fill=FAR,outline=INK,width=2)
 for px in (x-12,x+12):d.ellipse((px-5,y-5,px+5,y+5),fill=BLUE)
def draw_curl_grip_inset(d,ez,pronated,upper=False):
 dy=-130 if upper else 0
 d.rounded_rectangle((42,272+dy,186,365+dy),7,fill=BG,outline=FAR,width=2)
 d.text((50,279+dy),'GRIP / BAR',font=FONTS[14],fill=MUTED)
 y=314+dy
 if ez:d.line([(57,y),(76,y),(92,y-8),(108,y+4),(124,y-4),(140,y+8),(169,y)],fill=INK,width=5)
 else:d.line((57,y,169,y),fill=INK,width=5)
 for x in (91,134):
  d.rounded_rectangle((x-10,304+dy,x+10,326+dy),4,fill=BLUE,outline=INK,width=2)
  if pronated:
   d.line((x-4,306+dy,x-4,322+dy),fill=INK,width=2);d.line((x+4,306+dy,x+4,322+dy),fill=INK,width=2)
  else:d.line((x-5,309+dy,x+5,309+dy),fill=INK,width=2)
 d.text((50,338+dy),'PALMS DOWN' if pronated else 'PALMS UP',font=FONTS[14],fill=INK)
def draw_zottman_grip_inset(d,turn):
 d.rounded_rectangle((42,272,186,365),7,fill=BG,outline=FAR,width=2)
 d.text((50,279),'DUMBBELL GRIP',font=FONTS[14],fill=MUTED)
 for x in (87,139):
  d.line((x-22,315,x+22,315),fill=INK,width=5)
  for px in (x-20,x+20):d.rounded_rectangle((px-5,304,px+5,326),3,fill=FAR)
  d.rounded_rectangle((x-9,303,x+9,326),4,fill=BLUE,outline=INK,width=2)
  marker=(x+7*math.cos(math.pi*turn),315+7*math.sin(math.pi*turn))
  d.ellipse((marker[0]-3,marker[1]-3,marker[0]+3,marker[1]+3),fill=INK)
 d.text((50,338),'PALMS UP' if turn<.05 else ('PALMS DOWN' if turn>.95 else 'TURN WRISTS'),font=FONTS[14],fill=INK)
def draw_kettlebell(d,center):
 x,y=center
 d.rounded_rectangle((x-12,y-18,x+12,y-3),5,outline=INK,width=4)
 d.ellipse((x-19,y-6,x+19,y+29),fill=FAR,outline=INK,width=3)
def draw_pose(d,kind,option,u):
 ankle=(310,447);hip=(302,294);shoulder=(296,168);head=(296,135)
 if kind=='chest-dip':
  hand=(300,280);shoulder=(330+40*u,150+75*u);hip=(290+40*u,288+75*u)
  head=(shoulder[0]+25,shoulder[1]-35)
  elbow=ik(shoulder,hand,75,70,side=-1)
  knee=(hip[0]-45,hip[1]+40);foot=(knee[0]-50,knee[1]+18)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((shoulder,elbow,75),(elbow,hand,70),(shoulder,hip,math.dist((330,150),(290,288))),(hip,knee,math.hypot(45,40)),(knee,foot,math.hypot(50,18)))):raise ValueError('Dip limb or torso length changed')
  # Include the shoe's half-width and ground stroke in the clearance bound.
  if foot[1]+5>=451 or head[0]>448:raise ValueError('Dip shoe touches floor or head leaves frame')
  d.line((110,454,454,454),fill=FAR,width=3)
  for rx in (191,432):
   d.line((rx,280,rx,453),fill=FAR,width=8)
   d.rounded_rectangle((rx-11,272,rx+11,286),3,fill=FAR)
  d.line((183,280,438,280),fill=FAR,width=7)
  if option=='assisted':
   d.line((132,113,132,453),fill=FAR,width=7)
   d.rounded_rectangle((118,341-40*u,147,402-40*u),3,fill=FAR,outline=INK,width=2)
   pad_y=knee[1]+6
   pad_left=knee[0]-8;pad_right=knee[0]+42
   if not (pad_left<=knee[0]<=pad_right and abs(pad_y-knee[1])<=6):raise ValueError('Assisted dip knee lost pad contact')
   d.rounded_rectangle((pad_left,pad_y,pad_right,pad_y+10),4,fill=FAR,outline=INK,width=2)
   d.line((153,pad_y+5,pad_left,pad_y+5),fill=FAR,width=5)
  limb(d,[hip,knee,foot],BLUE,13)
  d.line((foot[0]-12,foot[1],foot[0]+5,foot[1]),fill=INK,width=6)
  d.line((*hip,*shoulder),fill=BLUE,width=27)
  d.line((*shoulder,*head),fill=BLUE,width=10)
  d.ellipse((head[0]-18,head[1]-17,head[0]+18,head[1]+17),fill=INK)
  limb(d,[shoulder,elbow,hand],INK,11)
  d.rounded_rectangle((hand[0]-8,hand[1]-5,hand[0]+8,hand[1]+5),3,fill=BLUE)
  d.rounded_rectangle((45,183,210,231),4,outline=MUTED,width=2)
  d.text((51,188),'PARALLEL HANDLES',font=FONTS[14],fill=MUTED)
  for hx in (92,157):d.rounded_rectangle((hx-7,207,hx+7,225),2,fill=FAR,outline=INK,width=2)
  d.text((47,242),'KNEE PLATFORM / ASSIST' if option=='assisted' else 'AIRBORNE FEET / FORWARD LEAN',font=FONTS[14],fill=MUTED)
 elif kind=='cable-pull-through':
  ankle=(315,445);leg=77.5;hip_x=300-65*u
  reach=math.dist((300,295),ankle)
  hip=(hip_x,445-math.sqrt(reach**2-(315-hip_x)**2))
  knee=ik(hip,ankle,leg,leg,side=1)
  trunk_angle=-math.pi/2+(math.pi/2-.7)*u
  shoulder=polar(hip,120,trunk_angle);head=polar(shoulder,34,trunk_angle)
  hand_x=320-90*u;hand=(hand_x,shoulder[1]+math.sqrt(170**2-(hand_x-shoulder[0])**2))
  pulley=(91,416)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((hip,knee,leg),(knee,ankle,leg),(hip,shoulder,120),(shoulder,hand,170))):raise ValueError('Cable pull-through body or arm length changed')
  if hand[1]>=pulley[1]-15 or segment_distance(head,pulley,hand)<32:raise ValueError('Cable pull-through line crossed head or lost low pull')
  d.line((51,453,453,453),fill=FAR,width=3)
  d.line((72,192,72,452),fill=FAR,width=7)
  d.rounded_rectangle((58,349,86,407),3,fill=FAR,outline=INK,width=2)
  d.ellipse((pulley[0]-10,pulley[1]-10,pulley[0]+10,pulley[1]+10),fill=FAR,outline=INK,width=2)
  d.line((*pulley,*hand),fill=BLUE,width=4)
  limb(d,[hip,knee,ankle],BLUE,17)
  d.line((315,445,344,448),fill=INK,width=9)
  d.line((*hip,*shoulder),fill=BLUE,width=27)
  d.line((*shoulder,*head),fill=BLUE,width=10)
  d.ellipse((head[0]-18,head[1]-17,head[0]+18,head[1]+17),fill=INK)
  limb(d,[shoulder,hand],INK,10)
  d.rounded_rectangle((hand[0]-11,hand[1]-6,hand[0]+11,hand[1]+6),3,fill=FAR,outline=INK,width=2)
  d.rounded_rectangle((45,183,205,231),4,outline=MUTED,width=2)
  d.text((51,188),'ROPE BETWEEN FEET',font=FONTS[14],fill=MUTED)
  for fx in (69,169):d.rounded_rectangle((fx-9,207,fx+9,225),2,fill=BLUE)
  d.line((90,217,147,217),fill=INK,width=4)
  d.rounded_rectangle((115,211,128,223),2,fill=FAR)
  d.text((47,242),'FACE AWAY / LOW PULLEY',font=FONTS[14],fill=MUTED)
 elif kind=='depth-fly':
  # Foot-end projection plus a side inset preserve the supine bench setup.
  # Hands follow mirrored arcs at invariant reach; IK fixes the soft elbow.
  standing=option in ('cable-chest','single-arm-cable','low-to-high-cable','high-to-low-cable','band-chest','reverse-cable','reverse-single-cable')
  cable=option in ('cable-chest','bench-cable','single-arm-cable','low-to-high-cable','high-to-low-cable','reverse-cable','reverse-single-cable')
  band=option=='band-chest'
  machine=option in ('pecdeck-chest','pecdeck-reverse')
  reverse=option in ('reverse-dumbbell','reverse-supported','reverse-cable','reverse-single-cable','pecdeck-reverse')
  single=option in ('single-arm-cable','reverse-single-cable')
  if cable:
   for tower in ((511,) if option=='reverse-single-cable' else ((89,) if single else (89,511))):
    d.line((tower,205,tower,453),fill=FAR,width=6)
    pulley_y=190 if option=='high-to-low-cable' else (375 if option in ('bench-cable','low-to-high-cable') else 275)
    d.ellipse((tower-9,pulley_y-9,tower+9,pulley_y+9),fill=FAR,outline=INK,width=2)
    d.rounded_rectangle((tower-13,354 if standing else 404,tower+13,415 if standing else 443),3,fill=FAR,outline=INK,width=2)
  if machine:
   d.rounded_rectangle((264,225,336,380),9,fill=FAR)
   d.rounded_rectangle((250,373,350,393),5,fill=FAR,outline=INK,width=2)
   for bx in (267,333):d.line((bx,390,bx,453),fill=FAR,width=6)
  elif standing or option=='reverse-dumbbell':
   pass
  else:
   d.rounded_rectangle((266,188,334,425),10,fill=FAR)
   for bx in (275,325):d.line((bx,422,bx,453),fill=FAR,width=6)
  if band:
   anchor=(300,428)
   d.line((300,404,300,454),fill=FAR,width=8)
   d.ellipse((291,419,309,437),fill=FAR,outline=INK,width=2)
   fly_angle=math.pi-.12-(math.pi-.12-1.42)*u
   left_x=255+150*math.cos(fly_angle);hand_y=275-.24*150*math.sin(fly_angle)
   for target in ((left_x,hand_y),(600-left_x,hand_y)):
    if math.dist(anchor,target)<140 or segment_distance((300,174),anchor,target)<30:raise ValueError('Chest band anchor or head path changed')
    d.line((*anchor,*target),fill=FAR,width=4)
  d.rounded_rectangle((279,239,321,386),13,fill=BLUE)
  if standing or option=='reverse-dumbbell' or machine:d.line((300,191,300,246),fill=BLUE,width=13)
  d.ellipse((280,154,320,194),fill=INK)
  for hip_x,foot_x,foot_y in ((284,253,445),(316,347,427 if standing else 445)):
   limb(d,[(hip_x,379),(hip_x+(foot_x-hip_x)*.45,411),(foot_x,foot_y)],BLUE,11)
   d.line((foot_x-13,foot_y+3,foot_x+13,foot_y+3),fill=INK,width=7)
  angle=(2.05-3.47*u) if option=='high-to-low-cable' else ((1.42+(math.pi-.12-1.42)*u) if reverse else (math.pi-.12-(math.pi-.12-1.42)*u))
  for side in (-1,1):
   shoulder=(300+45*side,275)
   if single and side>0:
    limb(d,[shoulder,(360,334),(357,379)],FAR,9)
    continue
   left_hand3=(255+150*math.cos(angle),150*math.sin(angle))
   hand3=left_hand3 if side<0 else (600-left_hand3[0],left_hand3[1])
   shoulder3=(shoulder[0],0)
   elbow3=ik(shoulder3,hand3,80,75,side=-side)
   if abs(math.dist(shoulder3,elbow3)-80)>1e-6 or abs(math.dist(elbow3,hand3)-75)>1e-6 or abs(math.dist(shoulder3,hand3)-150)>1e-6:raise ValueError('Fly shoulder arc or soft elbow changed')
   elbow=(elbow3[0],275-.24*elbow3[1]);hand=(hand3[0],275-.24*hand3[1])
   if segment_distance((300,174),elbow,hand)<20:raise ValueError('Fly load crossed head')
   if cable:
    anchor=((511 if side<0 else 89) if option in ('reverse-cable','reverse-single-cable') else (89 if side<0 else 511),190 if option=='high-to-low-cable' else (375 if option in ('bench-cable','low-to-high-cable') else 275))
    if math.dist(anchor,hand)<12:raise ValueError('Fly cable lost tension')
    d.line((*anchor,*hand),fill=BLUE,width=4)
   if machine:
    d.line((*shoulder,*hand),fill=FAR,width=13)
    d.ellipse((shoulder[0]-10,shoulder[1]-10,shoulder[0]+10,shoulder[1]+10),fill=FAR,outline=INK,width=2)
   limb(d,[shoulder,elbow,hand],INK,10)
   if machine:
    d.rounded_rectangle((hand[0]-12,hand[1]-13,hand[0]+12,hand[1]+13),4,fill=FAR,outline=INK,width=2)
   elif cable or band:d.rounded_rectangle((hand[0]-9,hand[1]-6,hand[0]+9,hand[1]+6),2,fill=FAR,outline=INK,width=2)
   else:
    d.line((hand[0]-13,hand[1],hand[0]+13,hand[1]),fill=INK,width=5)
    for px in (hand[0]-12,hand[0]+12):d.rounded_rectangle((px-5,hand[1]-11,px+5,hand[1]+11),2,fill=FAR,outline=INK,width=2)
  d.rounded_rectangle((45,154,220,231),5,outline=MUTED,width=2)
  if standing:
   d.text((52,214 if option=='high-to-low-cable' else 161),'HIGH TO LOW' if option=='high-to-low-cable' else ('LOW TO HIGH' if option=='low-to-high-cable' else ('SECURE BAND' if band else 'CHEST PULLEY')),font=FONTS[14],fill=MUTED)
   side_pulley_y=179 if option=='high-to-low-cable' else (218 if option=='low-to-high-cable' else 191)
   side_hand_y=(178+30*u) if option=='high-to-low-cable' else ((206-33*u) if option=='low-to-high-cable' else 191)
   d.line((62,175 if option in ('high-to-low-cable','low-to-high-cable') else 184,62,224 if option in ('high-to-low-cable','low-to-high-cable') else 220),fill=FAR,width=5)
   d.ellipse((55,side_pulley_y-7,69,side_pulley_y+7),fill=FAR,outline=INK,width=1)
   d.line((62,side_pulley_y,175,side_hand_y),fill=BLUE,width=3)
   d.line((175,183,175,218),fill=BLUE,width=12)
   d.ellipse((167,166,183,182),fill=INK)
  elif machine:pass
  elif reverse:d.text((52,161),'CHEST PAD' if option=='reverse-supported' else 'HIP HINGE',font=FONTS[14],fill=MUTED)
  elif option=='bench-cable':d.text((181,160),'LOW',font=FONTS[14],fill=MUTED)
  elif option=='incline-dumbbell':d.text((151,160),'INCLINE',font=FONTS[14],fill=MUTED)
  else:d.text((52,161),'SIDE / HAND HEIGHT',font=FONTS[14],fill=MUTED)
  if standing:pass
  elif machine:
   d.rounded_rectangle((91,211,175,219),3,fill=FAR)
   pad_x=162 if option=='pecdeck-reverse' else 101
   d.rounded_rectangle((pad_x-5,176,pad_x+5,214),3,fill=FAR)
   d.line((125,180,125,211),fill=BLUE,width=10)
   d.ellipse((117,161,133,177),fill=INK)
   d.line((125,190,165,190),fill=INK,width=5)
  elif reverse:
   if option=='reverse-supported':
    d.line((64,215,183,181),fill=FAR,width=7)
    d.line((66,206,170,177),fill=BLUE,width=10)
   else:
    d.line((66,213,166,180),fill=BLUE,width=10)
    d.line((69,213,69,228),fill=BLUE,width=7)
   d.ellipse((164,162,185,183),fill=INK)
   d.line((146,185,146,208-19*u),fill=INK,width=5)
   d.ellipse((140,202-19*u,152,214-19*u),fill=FAR)
  elif option=='bench-cable':
   d.line((65,209,181,209),fill=FAR,width=6)
   d.line((76,190,171,190),fill=BLUE,width=10)
   d.ellipse((55,178,76,199),fill=INK)
   d.ellipse((61,215,73,227),fill=FAR,outline=INK,width=1)
   d.line((67,221,134,175-15*u),fill=BLUE,width=3)
   d.ellipse((128,169-15*u,140,181-15*u),fill=BLUE)
  elif option=='incline-dumbbell':
   d.line((66,212,181,180),fill=FAR,width=6)
   d.line((74,199,170,172),fill=BLUE,width=9)
   d.ellipse((55,188,76,209),fill=INK)
   d.line((137,181,137,178-18*u),fill=INK,width=5)
   d.ellipse((131,172-18*u,143,184-18*u),fill=BLUE)
  else:
   d.line((65,209,181,209),fill=FAR,width=6)
   d.line((76,190,171,190),fill=BLUE,width=10)
   d.ellipse((55,178,76,199),fill=INK)
   d.line((134,189,134,187-30*u),fill=INK,width=5)
   d.ellipse((128,181-30*u,140,193-30*u),fill=BLUE)
  d.text((47,405 if machine else 242),('CHEST PAD / REVERSE' if option=='pecdeck-reverse' else 'BACK PAD / CHEST') if machine else 'TOP VIEW',font=FONTS[14],fill=MUTED)
  if option=='reverse-cable':
   d.rounded_rectangle((345,307,500,366),5,fill=BG,outline=MUTED,width=2)
   d.text((352,312),'CROSSED HANDLES',font=FONTS[14],fill=MUTED)
   d.line((360,351,484,331),fill=BLUE,width=3)
   d.line((484,351,360,331),fill=FAR,width=3)
   for hx,hy in ((360,351),(484,351)):d.rounded_rectangle((hx-5,hy-5,hx+5,hy+5),2,fill=INK)
 elif kind=='barbell-hinge':
  # Side view with a fixed planted foot, invariant thigh/shin/torso/arm
  # lengths, explicit knee flexion, hip displacement and vertical bar path.
  ankle=(315,425 if option=='deficit' else 445);bar_x=365 if option=='kettlebell-conventional' else (340 if option in ('dumbbell-romanian','b-stance-romanian','single-leg-romanian','supported-single-leg-romanian') else 325);leg=77.5;torso=120;arm=180 if option=='deficit' else (175 if option=='sumo' else ((140 if option=='kettlebell-conventional' else 145) if option.startswith('kettlebell') else 160))
  if option in ('conventional','kettlebell-conventional','paused','snatch-grip','sumo','deficit','trapbar-conventional'):
   hip=((270+30*u,325-30*u) if option=='sumo' else (255+45*u,332-37*u-(20 if option=='deficit' else 0)))
   trunk_angle=(-.7-(math.pi/2-.7)*u) if option=='sumo' else (-.55-(math.pi/2-.55)*u)
  else:
   leg_reach=math.dist((300,295),ankle)
   hip_x=300-65*u
   hip=(hip_x,445-math.sqrt(leg_reach**2-(315-hip_x)**2))
   trunk_angle=-math.pi/2+(math.pi/2-.7)*u
  knee=ik(hip,ankle,leg,leg,side=1)
  shoulder=polar(hip,torso,trunk_angle)
  head=polar(shoulder,34,trunk_angle)
  bar_y=shoulder[1]+math.sqrt(arm**2-(bar_x-shoulder[0])**2)
  hand=(bar_x,bar_y)
  reach=math.dist(hip,ankle)
  knee_flex=2*math.degrees(math.acos(reach/(2*leg)))
  if option in ('romanian','dumbbell-romanian','b-stance-romanian','single-leg-romanian','supported-single-leg-romanian','kettlebell-romanian','trapbar-romanian','smith-romanian','good-morning','band-good-morning') and (knee_flex>28 or knee_flex<20 or abs(reach-math.dist((300,295),ankle))>1e-6):raise ValueError('RDL knee bend or foot reach changed')
  if option in ('conventional','kettlebell-conventional','paused','snatch-grip','sumo','deficit','trapbar-conventional') and not 25<=knee_flex<=70:raise ValueError('Deadlift knee path changed')
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((hip,knee,leg),(knee,ankle,leg),(hip,shoulder,torso),(shoulder,hand,arm))):raise ValueError('Hinge segment length changed')
  if bar_y>430 or bar_y<(290 if option.startswith('kettlebell') else 320) or head[0]>455:raise ValueError('Hinge load or head clearance changed')
  d.line((205,454,454,454),fill=FAR,width=3)
  if option in ('single-leg-romanian','supported-single-leg-romanian'):
   free_toe=polar(hip,145,1.68+1.40*u)
   free_knee=((hip[0]+free_toe[0])/2,(hip[1]+free_toe[1])/2)
   if free_toe[1]>441 or any(abs(math.dist(a,b)-72.5)>1e-6 for a,b in ((hip,free_knee),(free_knee,free_toe))):raise ValueError('Single-leg free foot or segment changed')
   limb(d,[hip,free_knee,free_toe],FAR,10)
   d.line((free_toe[0]-13,free_toe[1],free_toe[0]+8,free_toe[1]),fill=INK,width=5)
  if option=='b-stance-romanian':
   rear_toe=(245,447)
   rear_knee=ik(hip,rear_toe,85,85,side=-1)
   if abs(math.dist(hip,rear_knee)-85)>1e-6 or abs(math.dist(rear_knee,rear_toe)-85)>1e-6:raise ValueError('B-stance rear support length changed')
   limb(d,[hip,rear_knee,rear_toe],FAR,9)
   d.line((rear_toe[0]-13,rear_toe[1],rear_toe[0]+3,rear_toe[1]),fill=INK,width=5)
  if option=='deficit':
   d.rounded_rectangle((269,429,370,454),2,fill=FAR,outline=INK,width=2)
  if option in ('smith-romanian','good-morning'):
   for rx in (211,439):
    d.line((rx,105,rx,454),fill=FAR,width=6)
    for sy in (297,411):d.line((rx-10,sy,rx+10,sy),fill=INK,width=3)
  limb(d,[hip,knee,ankle],BLUE,17)
  line(d,ankle,(344,448),INK,9)
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-17,head[0]+18,head[1]+17),fill=INK)
  if option in ('single-leg-romanian','supported-single-leg-romanian'):
   if option=='supported-single-leg-romanian':
    brace=(429,265)
    d.line((brace[0],brace[1],brace[0],454),fill=FAR,width=8)
    d.rounded_rectangle((413,260,446,273),3,fill=FAR)
    support_elbow=ik(shoulder,brace,90,80,side=-1)
    if abs(math.dist(shoulder,support_elbow)-90)>1e-6 or abs(math.dist(support_elbow,brace)-80)>1e-6:raise ValueError('Single-leg fixed support hand changed')
    if min(segment_distance(head,shoulder,support_elbow),segment_distance(head,support_elbow,brace))<24:raise ValueError('Single-leg support arm crossed head')
    limb(d,[shoulder,support_elbow,brace],FAR,8)
   limb(d,[shoulder,hand],INK,10)
   d.line((hand[0]-13,hand[1],hand[0]+13,hand[1]),fill=INK,width=5)
   for px in (hand[0]-12,hand[0]+12):d.rounded_rectangle((px-5,hand[1]-11,px+5,hand[1]+11),2,fill=BLUE,outline=INK,width=2)
   d.rounded_rectangle((45,183,187,231),4,outline=MUTED,width=2)
   d.text((51,187),'LEVEL HIPS',font=FONTS[14],fill=MUTED)
   d.line((62,215,145,215),fill=BLUE,width=6)
   for px in (67,139):d.ellipse((px-6,209,px+6,221),fill=FAR)
  elif option=='band-good-morning':
   upper_back=(shoulder[0]-11,shoulder[1]+2)
   anchor_far=(304,445);anchor_near=(334,445)
   if any(segment_distance(head,anchor,upper_back)<27 for anchor in (anchor_far,anchor_near)):raise ValueError('Band crossed head or neck')
   for anchor,color in ((anchor_far,FAR),(anchor_near,BLUE)):
    d.line((*anchor,*upper_back),fill=color,width=5)
    d.ellipse((anchor[0]-5,anchor[1]-5,anchor[0]+5,anchor[1]+5),fill=INK)
   d.line((upper_back[0]-10,upper_back[1],upper_back[0]+10,upper_back[1]),fill=BLUE,width=7)
   d.rounded_rectangle((45,183,189,231),4,outline=MUTED,width=2)
   d.text((51,188),'FEET / UPPER BACK',font=FONTS[14],fill=MUTED)
   d.line((82,207,95,219),fill=BLUE,width=3);d.line((136,207,123,219),fill=BLUE,width=3)
   for fx in (84,134):d.rounded_rectangle((fx-10,216,fx+10,225),2,fill=FAR)
   d.rounded_rectangle((96,202,122,210),2,fill=BLUE)
  elif option=='good-morning':
   bar_at=(shoulder[0]-9,shoulder[1]-2)
   if bar_at[1]<129 or bar_at[1]>256:raise ValueError('Good morning shoulder bar path changed')
   d.line((211,bar_at[1],439,bar_at[1]),fill=INK,width=7)
   for px in (232,419):d.rounded_rectangle((px-11,bar_at[1]-28,px+11,bar_at[1]+28),4,fill=FAR,outline=INK,width=2)
   d.rounded_rectangle((bar_at[0]-13,bar_at[1]-7,bar_at[0]+13,bar_at[1]+7),3,fill=BLUE)
   grip=(bar_at[0]+20,bar_at[1])
   elbow=(shoulder[0]+30,shoulder[1]+35)
   limb(d,[shoulder,elbow,grip],INK,8)
   d.rounded_rectangle((45,183,183,231),4,outline=MUTED,width=2)
   d.text((51,188),'BAR ON UPPER BACK',font=FONTS[14],fill=MUTED)
   d.line((67,213,160,213),fill=INK,width=4)
   d.rounded_rectangle((93,209,122,222),3,fill=BLUE)
  elif option in ('dumbbell-romanian','b-stance-romanian'):
   # Two independent implements hang from separate fixed-length arms.
   far_hand=(bar_x-40,shoulder[1]+math.sqrt(arm**2-(bar_x-40-shoulder[0])**2))
   if abs(math.dist(shoulder,far_hand)-arm)>1e-6 or abs(far_hand[1]-hand[1])>10:raise ValueError('Dumbbell RDL arm path changed')
   limb(d,[shoulder,far_hand],FAR,9)
   for hx,hy,color in ((far_hand[0],far_hand[1],FAR),(hand[0],hand[1],BLUE)):
    d.line((hx-11,hy,hx+11,hy),fill=INK,width=5)
    for px in (hx-11,hx+11):d.rounded_rectangle((px-5,hy-13,px+5,hy+13),2,fill=color,outline=INK,width=2)
   limb(d,[shoulder,hand],INK,11)
   d.rounded_rectangle((hand[0]-5,hand[1]-5,hand[0]+5,hand[1]+5),2,fill=BLUE)
   if option=='b-stance-romanian':
    d.rounded_rectangle((45,183,224,231),4,outline=MUTED,width=2)
    d.text((51,187),'REAR TOE / FRONT FOOT',font=FONTS[14],fill=MUTED)
    d.rounded_rectangle((63,216,86,222),2,fill=FAR)
    d.rounded_rectangle((112,207,153,223),3,fill=BLUE)
   else:
    d.rounded_rectangle((45,183,133,231),4,outline=MUTED,width=2)
    d.text((51,187),'TWO BELLS',font=FONTS[14],fill=MUTED)
    for cx in (74,106):
     d.line((cx,207,cx,223),fill=INK,width=4)
     for yy in (207,223):d.rounded_rectangle((cx-9,yy-4,cx+9,yy+4),2,fill=FAR,outline=INK,width=1)
  elif option.startswith('trapbar'):
   # Side rails and a raised neutral handle distinguish a hex bar from a straight bar.
   back_y=bar_y+8
   d.line((211,back_y,439,back_y),fill=FAR,width=6)
   for px in (231,419):d.rounded_rectangle((px-11,back_y-27,px+11,back_y+27),4,fill=FAR,outline=INK,width=2)
   d.line((265,bar_y,390,bar_y),fill=INK,width=6)
   for px in (280,375):d.line((px,bar_y,px,back_y),fill=INK,width=5)
   limb(d,[shoulder,hand],INK,11)
   d.rounded_rectangle((hand[0]-8,hand[1]-6,hand[0]+8,hand[1]+6),3,fill=BLUE)
   d.rounded_rectangle((45,183,227,231),4,outline=MUTED,width=2)
   d.text((51,187),'TOP / NEUTRAL HANDLES',font=FONTS[14],fill=MUTED)
   d.polygon([(62,209),(75,202),(143,202),(156,209),(143,224),(75,224)],outline=INK,width=2)
   for fx in (99,119):d.rounded_rectangle((fx-4,209,fx+4,221),2,fill=BLUE)
   for hx in (75,143):d.line((hx,208,hx,219),fill=FAR,width=4)
  elif option.startswith('kettlebell'):
   limb(d,[shoulder,hand],INK,11)
   bell_center=(hand[0],hand[1]+(14 if option=='kettlebell-conventional' else 4))
   if bell_center[1]+29>454 or bell_center[1]-18<hand[1]-15:raise ValueError('Kettlebell floor or grip changed')
   draw_kettlebell(d,bell_center)
   d.rounded_rectangle((45,183,150,231),4,outline=MUTED,width=2)
   if option=='kettlebell-conventional':
    d.text((51,187),'FRONT / FEET',font=FONTS[14],fill=MUTED)
    for fx in (69,126):d.rounded_rectangle((fx-9,207,fx+9,225),3,fill=BLUE)
    d.ellipse((91,204,109,224),fill=FAR,outline=INK,width=2)
   else:
    d.text((51,196),'KB',font=FONTS[14],fill=MUTED)
    draw_kettlebell(d,(105,206))
  else:
   limb(d,[shoulder,hand],INK,11)
   d.line((213,bar_y,438,bar_y),fill=INK,width=7)
   for x in (232,419):d.rounded_rectangle((x-11,bar_y-28,x+11,bar_y+28),4,fill=FAR,outline=INK,width=2)
   d.rounded_rectangle((bar_x-8,bar_y-5,bar_x+8,bar_y+5),3,fill=BLUE)
   if option=='smith-romanian':
    for rx in (211,439):d.rounded_rectangle((rx-9,bar_y-7,rx+9,bar_y+7),2,fill=BLUE)
    d.rounded_rectangle((45,183,180,231),4,outline=MUTED,width=2)
    d.text((51,187),'GUIDED BAR / RAILS',font=FONTS[14],fill=MUTED)
    for rx in (65,153):d.line((rx,205,rx,224),fill=FAR,width=4)
    d.line((65,216,153,216),fill=INK,width=4)
   elif option=='snatch-grip':
    d.rounded_rectangle((45,183,179,231),4,outline=MUTED,width=2)
    d.text((51,186),'WIDE OVERHAND',font=FONTS[14],fill=MUTED)
    d.line((58,215,166,215),fill=INK,width=4)
    for gx in (73,151):d.rounded_rectangle((gx-5,207,gx+5,223),2,fill=BLUE)
   elif option=='sumo':
    d.rounded_rectangle((45,183,211,231),4,outline=MUTED,width=2)
    d.text((51,186),'WIDE FEET / HANDS IN',font=FONTS[14],fill=MUTED)
    for fx in (67,154):d.rounded_rectangle((fx-9,209,fx+9,225),2,fill=BLUE)
    d.line((84,216,137,216),fill=INK,width=4)
    for gx in (96,125):d.rounded_rectangle((gx-4,209,gx+4,223),2,fill=FAR)
   elif option=='deficit':
    d.rounded_rectangle((45,183,187,231),4,outline=MUTED,width=2)
    d.text((51,187),'SMALL PLATFORM',font=FONTS[14],fill=MUTED)
    d.rectangle((60,215,151,225),fill=FAR,outline=INK,width=1)
    d.rounded_rectangle((101,206,130,215),2,fill=BLUE)
   else:draw_curl_grip_inset(d,False,True,upper=True)
  d.text((47,242),'FLOOR START / BELL CENTER' if option=='kettlebell-conventional' else ('FLOOR START / BAR CLOSE' if option in ('conventional','paused','snatch-grip','sumo','deficit','trapbar-conventional') else ('UPPER BACK / FOOT ANCHOR' if option=='band-good-morning' else ('BACK BAR / HIP HINGE' if option=='good-morning' else 'SOFT KNEES / HIP HINGE'))),font=FONTS[14],fill=MUTED)
 elif kind=='machine-triceps-extension':
  hip=(287,335);shoulder=(281,215);head=(279,176);elbow=(354,273)
  d.rounded_rectangle((247,342,332,357),4,fill=FAR)
  for x in (259,320):line(d,(x,357),(x,455),FAR,6)
  line(d,(251,221),(251,341),FAR,12)
  limb(d,[hip,(335,391),(356,445)],BLUE,16);line(d,(356,445),(378,448),INK,8)
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  d.rounded_rectangle((305,273,369,287),4,fill=FAR)
  hand=polar(elbow,70,-2.1+2.9*u)
  if abs(math.dist(elbow,hand)-70)>1e-6:raise ValueError('Triceps machine lever radius changed')
  limb(d,[shoulder,elbow,hand],INK,11)
  d.ellipse((elbow[0]-10,elbow[1]-10,elbow[0]+10,elbow[1]+10),fill=FAR,outline=INK,width=3)
  d.rounded_rectangle((hand[0]-13,hand[1]-6,hand[0]+13,hand[1]+6),3,fill=FAR,outline=INK,width=2)
  d.rounded_rectangle((452,348,486,419),4,fill=FAR,outline=INK,width=2)
  line(d,(365,273),(459,378),FAR,3)
  d.text((45,181),'ELBOW ALIGNED / MACHINE LEVER',font=FONTS[14],fill=MUTED)
 elif kind=='high-cable-curl':
  hip=(300,333);shoulder=(300,213);head=(300,173)
  for side in (-1,1):
   tower=95 if side<0 else 485
   line(d,(tower,89),(tower,454),FAR,6)
   d.rounded_rectangle((tower-15,350,tower+15,422),4,fill=FAR,outline=INK,width=2)
   limb(d,[hip,(300+side*35,389),(300+side*55,445)],BLUE,16)
   line(d,(300+side*55,445),(300+side*74,448),INK,8)
  line(d,hip,shoulder,BLUE,29);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  for side in (-1,1):
   start=(300+side*31,213);elbow=(300+side*82,226)
   theta=(math.pi+(math.pi-.38)*u) if side<0 else (-(math.pi-.38)*u)
   hand=polar(elbow,65,theta)
   if abs(math.dist(elbow,hand)-65)>1e-6 or math.dist(hand,head)<31:raise ValueError('High curl elbow or head clearance changed')
   line(d,(95 if side<0 else 485,146),hand,FAR,3)
   limb(d,[start,elbow,hand],INK if side>0 else FAR,11)
   d.rounded_rectangle((hand[0]-8,hand[1]-6,hand[0]+8,hand[1]+6),3,fill=FAR,outline=INK,width=2)
  d.text((45,181),'TWO HIGH PULLEYS / ELBOWS FIXED',font=FONTS[14],fill=MUTED)
 elif kind=='cross-body-cable-triceps':
  hip=(300,333);shoulder=(300,211);head=(300,173);elbow=(344,238)
  line(d,(107,93),(107,454),FAR,6)
  d.rounded_rectangle((92,353,122,422),4,fill=FAR,outline=INK,width=2)
  anchor=(107,238);d.ellipse((98,229,116,247),outline=INK,width=3)
  for side in (-1,1):
   limb(d,[hip,(300+side*32,389),(300+side*55,445)],BLUE,16)
   line(d,(300+side*55,445),(300+side*74,448),INK,8)
  line(d,hip,shoulder,BLUE,29);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  limb(d,[shoulder,(283,278),(279,338)],FAR,10)
  hand=polar(elbow,70,2.8-2.3*u)
  if abs(math.dist(elbow,hand)-70)>1e-6 or hand[1]<230:raise ValueError('Cross-body extension elbow path changed')
  line(d,anchor,hand,FAR,3)
  limb(d,[shoulder,elbow,hand],INK,11)
  d.rounded_rectangle((hand[0]-9,hand[1]-6,hand[0]+9,hand[1]+6),3,fill=FAR,outline=INK,width=2)
  d.text((45,181),'SINGLE ARM / ACROSS TORSO',font=FONTS[14],fill=MUTED)
 elif kind=='cable-chest-press':
  hip=(300,334);shoulder=(300,212);head=(297,174)
  line(d,(125,88),(125,454),FAR,6)
  d.rounded_rectangle((108,354,141,423),4,fill=FAR,outline=INK,width=2)
  anchors=((145,236),(145,266))
  for anchor in anchors:d.ellipse((anchor[0]-7,anchor[1]-7,anchor[0]+7,anchor[1]+7),outline=INK,width=2)
  limb(d,[hip,(277,388),(264,445)],FAR,16);line(d,(264,445),(244,448),INK,8)
  limb(d,[hip,(333,388),(351,445)],BLUE,17);line(d,(351,445),(373,448),INK,8)
  line(d,hip,shoulder,BLUE,28);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  if option=='single':limb(d,[shoulder,(283,282),(282,344)],FAR,10)
  for offset,color,anchor in (((9,INK,anchors[1]),) if option=='single' else ((-9,FAR,anchors[0]),(9,INK,anchors[1]))):
   start=(shoulder[0]+offset,shoulder[1]);hand=(335+96*u+offset,254)
   elbow=ik(start,hand,75,68,side=-1)
   if abs(math.dist(start,elbow)-75)>1e-6 or abs(math.dist(elbow,hand)-68)>1e-6 or hand[0]>449:raise ValueError('Cable chest press arm path changed')
   line(d,anchor,hand,FAR,3)
   limb(d,[start,elbow,hand],color,11)
   d.rounded_rectangle((hand[0]-8,hand[1]-6,hand[0]+8,hand[1]+6),3,fill=FAR,outline=INK,width=2)
  d.text((45,181),'STAGGERED STANCE / TWO CABLES' if option!='single' else 'ONE CABLE / RIBS STACKED',font=FONTS[14],fill=MUTED)
 elif kind=='anchored-face-pull':
  # Oblique main view keeps the rope to the near side of the head; the front
  # inset shows bilateral elbow width lost to this depth projection.
  hip=(350,334);shoulder=(350,217);head=(356,174)
  anchor=(99,186)
  line(d,(99,90),(99,453),FAR,6)
  if option=='cable':
   d.rounded_rectangle((84,355,114,421),4,fill=FAR,outline=INK,width=2)
   d.ellipse((90,177,108,195),outline=INK,width=3)
  else:
   line(d,(99,161),(99,211),FAR,7)
  for side in (-1,1):
   limb(d,[hip,(350+side*33,391),(350+side*51,445)],BLUE,16)
   line(d,(350+side*51,445),(350+side*69,448),INK,8)
  line(d,hip,shoulder,BLUE,29);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  split=(225+36*u,195)
  far=(228+72*u,192);near=(245+72*u,218-9*u)
  segments=((anchor,split),(split,far),(split,near))
  if min(segment_distance(head,a,b) for a,b in segments)<27:raise ValueError('Face pull rope crosses face')
  for a,b in segments:line(d,a,b,FAR if option=='cable' else BLUE,3)
  for start,hand,color in (((340,218),far,FAR),((360,218),near,INK)):
   elbow=ik(start,hand,65,60,side=1)
   if math.dist(hand,head)<38 or elbow[1]<215:raise ValueError('Face pull hand or elbow path changed')
   limb(d,[start,elbow,hand],color,10)
   d.rounded_rectangle((hand[0]-7,hand[1]-5,hand[0]+7,hand[1]+5),3,fill=FAR,outline=INK,width=2)
  d.rounded_rectangle((42,287,187,362),7,fill=BG,outline=FAR,width=2)
  d.text((49,293),'FRONT / ELBOWS OUT',font=FONTS[14],fill=MUTED)
  d.ellipse((105,311,125,331),fill=INK)
  for side in (-1,1):
   line(d,(115+side*17,340),(115+side*58,328),BLUE,6)
   line(d,(115+side*58,328),(115+side*30,324),INK,5)
  d.text((49,344),'ROPE CLEAR OF FACE',font=FONTS[14],fill=INK)
 elif kind=='cable-leg-curl':
  anchor=(126,426);hip=(310,312);shoulder=(299,209);head=(296,173);knee=(288,365)
  line(d,(126,91),(126,454),FAR,6)
  d.rounded_rectangle((110,350,142,433),4,fill=FAR,outline=INK,width=2)
  d.ellipse((anchor[0]-10,anchor[1]-10,anchor[0]+10,anchor[1]+10),outline=INK,width=3)
  line(d,(466,89),(466,454),FAR,6);line(d,(440,272),(466,272),INK,7)
  limb(d,[hip,(337,380),(345,445)],BLUE,17);line(d,(345,445),(365,448),INK,8)
  line(d,hip,shoulder,BLUE,28);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  limb(d,[shoulder,(353,256),(454,272)],INK,10)
  foot=polar(knee,70,1.1+1.5*u)
  if abs(math.dist(knee,foot)-70)>1e-6 or foot[1]>=443:raise ValueError('Cable curl knee or floor clearance changed')
  limb(d,[hip,knee,foot],FAR,15)
  line(d,anchor,foot,FAR,3)
  d.ellipse((foot[0]-10,foot[1]-10,foot[0]+10,foot[1]+10),outline=INK,width=3)
  d.text((45,181),'LOW PULLEY / ANKLE CUFF',font=FONTS[14],fill=MUTED)
 elif kind=='nordic-hamstring-curl':
  knee=(250,435);heel=(199,445);angle=-math.pi/2+1.27*u
  hip=polar(knee,94,angle);shoulder=polar(hip,114,angle);head=polar(shoulder,32,angle)
  d.rounded_rectangle((171,431,220,453),4,fill=FAR,outline=INK,width=2)
  line(d,(198,453),(198,457),FAR,7)
  if abs(math.dist(knee,hip)-94)>1e-6 or abs(math.dist(hip,shoulder)-114)>1e-6 or head[0]>497:raise ValueError('Nordic knee hinge or head clearance changed')
  limb(d,[knee,hip,shoulder],BLUE,27);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-17,head[1]-17,head[0]+17,head[1]+17),fill=INK)
  line(d,knee,heel,FAR,15)
  elbow=polar(shoulder,30,1.4);hand=polar(elbow,30,1.4)
  limb(d,[shoulder,elbow,hand],INK,9)
  d.text((45,181),'ANKLES SECURED / KNEE HINGE',font=FONTS[14],fill=MUTED)
 elif kind=='incline-back-extension':
  hip=(280,285);knee=(205,350);foot=(148,410)
  d.line((224,340,265,302),fill=FAR,width=23)
  line(d,(238,337),(235,454),FAR,7)
  line(d,(148,410),(148,454),FAR,8)
  d.rounded_rectangle((121,403,165,417),4,fill=FAR)
  limb(d,[hip,knee,foot],BLUE,17);line(d,foot,(128,414),INK,8)
  angle=.06-.84*u
  shoulder=polar(hip,120,angle);head=polar(shoulder,32,angle)
  if abs(math.dist(hip,shoulder)-120)>1e-6 or angle<-.79:raise ValueError('Back extension hip hinge changed')
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-17,head[1]-17,head[0]+17,head[1]+17),fill=INK)
  chest=polar(hip,73,angle)
  if option=='weighted':
   d.ellipse((chest[0]-18,chest[1]-18,chest[0]+18,chest[1]+18),fill=FAR,outline=INK,width=3)
   d.ellipse((chest[0]-5,chest[1]-5,chest[0]+5,chest[1]+5),fill=BG)
   limb(d,[shoulder,polar(shoulder,36,2.2),chest],INK,9)
   d.text((45,181),'PLATE HELD AT CHEST',font=FONTS[14],fill=MUTED)
  else:limb(d,[shoulder,polar(shoulder,35,2.2),(chest[0],chest[1]+10)],INK,9)
  d.text((45,204),'PAD BELOW HIP CREASE / 45 DEG',font=FONTS[14],fill=MUTED)
 elif kind=='machine-back-extension':
  hip=(300,343);angle=-math.pi/2+.55*(1-u)
  d.rounded_rectangle((262,348,346,363),4,fill=FAR)
  for x in (273,335):line(d,(x,363),(x,455),FAR,6)
  limb(d,[hip,(373,371),(412,441)],BLUE,16)
  line(d,(412,441),(436,446),INK,8)
  shoulder=polar(hip,112,angle);head=polar(shoulder,33,angle)
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-17,head[1]-17,head[0]+17,head[1]+17),fill=INK)
  pad=polar(hip,90,angle)
  if abs(math.dist(hip,pad)-90)>1e-6:raise ValueError('Back extension machine lever radius changed')
  line(d,hip,pad,FAR,6)
  d.rounded_rectangle((pad[0]-13,pad[1]-8,pad[0]+13,pad[1]+8),4,fill=FAR,outline=INK,width=2)
  d.ellipse((hip[0]-10,hip[1]-10,hip[0]+10,hip[1]+10),outline=INK,width=3)
  limb(d,[shoulder,(shoulder[0]+30,shoulder[1]+45),(shoulder[0]+25,shoulder[1]+71)],INK,9)
  d.text((45,181),'SEATED HIP PIVOT / BACK PAD',font=FONTS[14],fill=MUTED)
 elif kind=='reverse-hyperextension':
  hip=(310,284);shoulder=(219,284);head=(185,277)
  d.rounded_rectangle((195,306,341,323),5,fill=FAR)
  for x in (212,326):line(d,(x,323),(x,455),FAR,7)
  d.rounded_rectangle((178,300,202,319),4,fill=FAR)
  line(d,shoulder,hip,BLUE,27);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-17,head[1]-17,head[0]+17,head[1]+17),fill=INK)
  limb(d,[shoulder,(205,319),(190,313)],INK,10)
  angle=1.17-1.10*u
  knee=polar(hip,77,angle);foot=polar(knee,69,angle)
  if abs(math.dist(hip,knee)-77)>1e-6 or abs(math.dist(knee,foot)-69)>1e-6 or foot[1]>437:raise ValueError('Reverse hyper leg or clearance changed')
  limb(d,[hip,knee,foot],BLUE,17);line(d,foot,(foot[0]+14,foot[1]+3),INK,8)
  d.text((45,181),'PELVIS ON PAD / NO SWING',font=FONTS[14],fill=MUTED)
 elif kind=='supported-kickback':
  # Side view: hand grip, torso, pelvis and support foot never travel. A
  # separate working leg extends back without tilting the lower back.
  hip=(336,304);shoulder=(250,278);head=(215,267)
  line(d,(186,248),(186,453),FAR,6)
  d.rounded_rectangle((180,264,220,276),4,fill=FAR)
  support_hand=(203,270)
  support_elbow=ik(shoulder,support_hand,37,34,side=1)
  limb(d,[shoulder,support_elbow,support_hand],INK,10)
  limb(d,[hip,(350,377),(344,443)],FAR,17)
  line(d,(344,443),(365,448),INK,8)
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  angle=1.18-.98*u
  knee=polar(hip,75,angle);foot=polar(knee,67,angle+.15)
  if abs(math.dist(hip,knee)-75)>1e-6 or abs(math.dist(knee,foot)-67)>1e-6 or foot[0]>499 or foot[1]>449:raise ValueError('Kickback working leg or clearance changed')
  limb(d,[hip,knee,foot],BLUE,17);line(d,foot,(foot[0]+9,foot[1]+2),INK,8)
  cuff=(foot[0]-3,foot[1]-8)
  d.ellipse((cuff[0]-10,cuff[1]-10,cuff[0]+10,cuff[1]+10),outline=INK,width=3)
  if option=='cable':
   anchor=(122,416)
   line(d,(122,95),(122,453),FAR,6)
   d.rounded_rectangle((106,350,138,424),5,fill=FAR,outline=INK,width=2)
   d.ellipse((anchor[0]-10,anchor[1]-10,anchor[0]+10,anchor[1]+10),outline=INK,width=3)
   line(d,anchor,cuff,FAR,3)
   d.text((45,182),'LOW PULLEY / ANKLE CUFF',font=FONTS[14],fill=MUTED)
  elif option=='band':
   anchor=(128,440)
   line(d,(128,414),(128,453),FAR,7)
   line(d,(108,453),(148,453),FAR,7)
   line(d,anchor,cuff,BLUE,4)
   d.text((45,182),'FLOOR ANCHOR / BAND LOOP',font=FONTS[14],fill=MUTED)
  else:
   pivot=hip
   pad=polar(hip,108,angle+.07)
   if abs(math.dist(pivot,pad)-108)>1e-6:raise ValueError('Kickback machine pivot changed')
   line(d,pivot,pad,FAR,6)
   d.ellipse((pivot[0]-9,pivot[1]-9,pivot[0]+9,pivot[1]+9),outline=INK,width=3)
   d.rounded_rectangle((pad[0]-14,pad[1]-9,pad[0]+14,pad[1]+9),4,fill=FAR,outline=INK,width=2)
   d.rounded_rectangle((250,299,298,311),4,fill=FAR)
   d.text((45,182),'HIP-AXIS LEVER / SHIN PAD',font=FONTS[14],fill=MUTED)
 elif kind=='seated-hip-machine':
  # Frontal view exposes hip opening versus closing. Pelvis and seat are
  # fixed; each thigh is constant length and the pads follow the knees.
  hip=(300,312);shoulder=(300,204);head=(300,167)
  d.rounded_rectangle((249,317,351,335),5,fill=FAR)
  d.rounded_rectangle((265,213,280,326),5,fill=FAR)
  for x in (264,338):line(d,(x,335),(x,455),FAR,6)
  line(d,hip,shoulder,BLUE,29);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  for side in (-1,1):
   h=(300+side*27,312)
   opening=(.24+.5*u) if option=='abduction' else (.74-.5*u)
   theta=math.pi/2-side*opening
   knee=polar(h,82,theta);foot=polar(knee,60,math.pi/2)
   if abs(math.dist(h,knee)-82)>1e-6 or abs(math.dist(knee,foot)-60)>1e-6 or foot[1]>455:raise ValueError('Seated hip machine leg or floor clearance changed')
   limb(d,[h,knee,foot],BLUE if side>0 else FAR,15)
   line(d,foot,(foot[0]+side*12,foot[1]+2),INK,7)
   pad_x=knee[0]+side*(13 if option=='abduction' else -13)
   d.rounded_rectangle((pad_x-8,knee[1]-18,pad_x+8,knee[1]+18),4,fill=FAR,outline=INK,width=2)
   pivot=(300+side*48,337)
   line(d,pivot,(pad_x,knee[1]),FAR,5)
   d.ellipse((pivot[0]-6,pivot[1]-6,pivot[0]+6,pivot[1]+6),fill=FAR,outline=INK,width=2)
  d.text((45,182),'OUTER THIGH PADS / OPEN' if option=='abduction' else 'INNER THIGH PADS / CLOSE',font=FONTS[14],fill=MUTED)
 elif kind=='standing-cable-hip':
  hip=(300,307);shoulder=(300,210);head=(300,173)
  anchor=(99,417) if option=='abduction' else (480,417)
  tower_x=99 if option=='abduction' else 480
  line(d,(tower_x,90),(tower_x,453),FAR,6)
  d.rounded_rectangle((tower_x-14,354,tower_x+14,425),4,fill=FAR,outline=INK,width=2)
  d.ellipse((anchor[0]-9,anchor[1]-9,anchor[0]+9,anchor[1]+9),outline=INK,width=3)
  line(d,(206,245),(206,453),FAR,6)
  d.rounded_rectangle((199,242,239,253),4,fill=FAR)
  support_hand=(224,247);support_elbow=ik(shoulder,support_hand,50,48,side=1)
  limb(d,[shoulder,support_elbow,support_hand],INK,10)
  line(d,hip,shoulder,BLUE,28);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  limb(d,[hip,(273,380),(251,444)],FAR,17)
  line(d,(251,444),(230,448),INK,8)
  theta=(1.45-.53*u) if option=='abduction' else (.92+.73*u)
  knee=polar(hip,72,theta);foot=polar(knee,65,theta)
  if abs(math.dist(hip,knee)-72)>1e-6 or abs(math.dist(knee,foot)-65)>1e-6 or foot[1]>450:raise ValueError('Standing cable hip leg or floor clearance changed')
  limb(d,[hip,knee,foot],BLUE,17)
  cuff=(foot[0]-3,foot[1]-6)
  d.ellipse((cuff[0]-9,cuff[1]-9,cuff[0]+9,cuff[1]+9),outline=INK,width=3)
  line(d,anchor,cuff,FAR,3)
  d.text((45,182),'OUTWARD / SIDE ANCHOR' if option=='abduction' else 'INWARD / OPPOSITE ANCHOR',font=FONTS[14],fill=MUTED)
 elif kind=='band-clamshell':
  # End-on projected view shows the top knee opening while the ankles stay
  # together. Projection shortens the visible shin as it turns in depth.
  pelvis=(271,350);feet=(396,425);lower_knee=(338,404)
  d.rounded_rectangle((184,345,284,391),18,fill=FAR)
  d.ellipse((166,353,206,389),fill=INK)
  line(d,(226,369),pelvis,BLUE,24)
  limb(d,[pelvis,lower_knee,feet],FAR,15)
  top_knee=(340+22*u,403-70*u)
  limb(d,[pelvis,top_knee,feet],BLUE,17)
  if feet!=(396,425) or top_knee[1]>403 or top_knee[1]<333:raise ValueError('Clamshell ankle or opening changed')
  line(d,(381,425),(410,425),INK,8)
  line(d,lower_knee,top_knee,BLUE,5)
  d.ellipse((lower_knee[0]-8,lower_knee[1]-8,lower_knee[0]+8,lower_knee[1]+8),outline=INK,width=3)
  d.ellipse((top_knee[0]-8,top_knee[1]-8,top_knee[0]+8,top_knee[1]+8),outline=INK,width=3)
  d.text((45,182),'OBLIQUE / FEET TOGETHER',font=FONTS[14],fill=MUTED)
  d.text((45,204),'BAND ABOVE KNEES',font=FONTS[14],fill=MUTED)
 elif kind=='loaded-row':
  seal=option=='seal';pendlay=option=='pendlay';meadows=option=='meadows'
  if seal:
   hip=(367,277);shoulder=(254,277);head=(218,269)
   d.rounded_rectangle((196,298,424,313),5,fill=FAR)
   for x in (217,405):line(d,(x,313),(x,455),FAR,6)
   limb(d,[hip,(425,285),(471,285)],BLUE,16)
   line(d,(471,285),(489,289),INK,8)
   d.text((44,181),'PRONE / HIGH BENCH',font=FONTS[14],fill=MUTED)
  else:
   hip=(369,288 if pendlay else 308)
   shoulder=(250,287 if pendlay else 265);head=(216,279 if pendlay else 257)
   for offset in (0,23):
    knee=(370+offset,381);foot=(380+offset,445)
    limb(d,[hip,knee,foot],BLUE if not offset else FAR,16)
    line(d,foot,(foot[0]+17,448),INK,8)
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-17,head[0]+18,head[1]+17),fill=INK)
  if option=='smith':
   for x in (174,430):
    line(d,(x,112),(x,455),FAR,6)
    line(d,(x-11,405),(x+11,405),INK,4)
   hand=(310,393-70*u)
  elif option in ('t-bar','meadows'):
   pivot=(480,442) if meadows else (111,442)
   radius=190 if meadows else 200
   hand=polar(pivot,radius,(math.pi+.25+.34*u) if meadows else (-.25-.34*u))
   line(d,pivot,hand,INK,7)
   d.ellipse((pivot[0]-9,pivot[1]-9,pivot[0]+9,pivot[1]+9),outline=FAR,width=4)
   if abs(math.dist(pivot,hand)-radius)>1e-6:raise ValueError('Landmine row bar radius changed')
   d.rounded_rectangle((hand[0]-27,hand[1]-12,hand[0]-14,hand[1]+12),3,fill=FAR)
   d.text((45,181),'ONE ARM / OFF-CENTER END' if meadows else 'T HANDLE / FIXED PIVOT',font=FONTS[14],fill=MUTED)
  else:
   hand=(308,435-112*u) if pendlay else ((309,413-84*u) if seal else (310,393-70*u))
  if meadows:
   brace=(205,382)
   d.rounded_rectangle((179,384,228,395),4,fill=FAR)
   for x in (184,223):line(d,(x,395),(x,455),FAR,5)
   support_elbow=ik(shoulder,brace,89,80,side=-1)
   limb(d,[shoulder,support_elbow,brace],FAR,10)
   loaded_shoulder=(shoulder[0]+25,shoulder[1]+5)
   elbow=ik(loaded_shoulder,hand,84,78,side=1)
   if hand[0]<loaded_shoulder[0] or elbow[0]<loaded_shoulder[0] or elbow[0]>hip[0]+8:raise ValueError('Meadows row arm crossed torso path')
   limb(d,[loaded_shoulder,elbow,hand],INK,11)
  else:
   starts=[(shoulder[0]-8,shoulder[1]),(shoulder[0]+8,shoulder[1])]
   for i,start in enumerate(starts):
    endpoint=(hand[0]+(-9 if i==0 else 9),hand[1])
    upper=88 if pendlay else 81;lower=83 if pendlay else 79
    elbow=ik(start,endpoint,upper,lower,side=1)
    if option=='t-bar' and (endpoint[0]<start[0] or elbow[0]<start[0] or elbow[0]>hip[0]+8):raise ValueError('T-bar row arm crossed torso path')
    limb(d,[start,elbow,endpoint],FAR if i==0 else INK,10)
  if option in ('barbell','underhand','pendlay','seal','smith'):
   y=hand[1]
   line(d,(176,y),(431,y),INK,6)
   for x in (192,415):d.rounded_rectangle((x-8,y-19,x+8,y+19),3,fill=FAR,outline=INK,width=2)
   if option=='smith':
    for x in (174,430):d.ellipse((x-6,y-6,x+6,y+6),fill=BLUE,outline=INK,width=2)
   if option=='underhand':draw_curl_grip_inset(d,False,False,upper=True)
   elif option=='barbell':draw_curl_grip_inset(d,False,True,upper=True)
   elif pendlay:
    d.text((45,181),'FLOOR RESET / TORSO FIXED',font=FONTS[14],fill=MUTED)
    if u==0 and abs(y-435)>1e-6:raise ValueError('Pendlay floor reset changed')
 elif kind=='suspension-row':
  foot=(440,445);shoulder_y=390-50*u
  shoulder=(foot[0]-math.sqrt(160**2-(foot[1]-shoulder_y)**2),shoulder_y)
  hip=(shoulder[0]+.62*(foot[0]-shoulder[0]),shoulder[1]+.62*(foot[1]-shoulder[1]))
  head=(shoulder[0]-33,shoulder[1]-11)
  anchor=(171,111);handle=(238,310)
  for dx in (-9,9):
   line(d,(anchor[0]+dx,anchor[1]),(handle[0]+dx,handle[1]),FAR,3)
   d.rounded_rectangle((handle[0]+dx-5,handle[1]-7,handle[0]+dx+5,handle[1]+7),3,fill=INK)
  line(d,shoulder,hip,BLUE,27);line(d,hip,foot,BLUE,27)
  if abs(math.dist(shoulder,foot)-160)>1e-6:raise ValueError('Suspension row body length changed')
  line(d,foot,(459,449),INK,8)
  line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-17,head[1]-17,head[0]+17,head[1]+17),fill=INK)
  for dx,color in ((-9,FAR),(9,INK)):
   start=(shoulder[0]+dx,shoulder[1]);end=(handle[0]+dx,handle[1])
   elbow=ik(start,end,60,60,side=-1)
   limb(d,[start,elbow,end],color,10)
  d.text((45,181),'FIXED ANCHOR / STRAPS / HEELS',font=FONTS[14],fill=MUTED)
 elif kind=='supported-trunk-crunch':
  # Pelvis stays fixed; the shoulder and head travel on a short trunk arc.
  hip=(284,351) if option=='machine' else (290,355)
  mid=(hip[0],hip[1]-65)
  shoulder=polar(mid,51,-math.pi/2+.83*u)
  head=polar(shoulder,32,-math.pi/2+.65*u)
  if option=='machine':
   d.rounded_rectangle((246,350,336,365),5,fill=FAR)
   d.rounded_rectangle((239,230,255,355),5,fill=FAR)
   for x in (255,328):line(d,(x,365),(x,455),FAR,6)
   limb(d,[hip,(365,364),(377,447)],BLUE,16);line(d,(377,447),(405,448),INK,8)
   pivot=(405,362);d.ellipse((pivot[0]-9,pivot[1]-9,pivot[0]+9,pivot[1]+9),outline=FAR,width=4)
   pad=(shoulder[0]+34,shoulder[1]+22)
   line(d,pivot,pad,FAR,7)
   d.rounded_rectangle((pad[0]-17,pad[1]-8,pad[0]+17,pad[1]+8),4,fill=FAR)
   d.text((45,181),'SEAT / CHEST PAD / PIVOT',font=FONTS[14],fill=MUTED)
  else:
   line(d,(423,107),(423,450),FAR,6)
   d.ellipse((410,135,436,161),outline=FAR,width=5)
   d.text((45,181),'HIGH PULLEY / KNEES FIXED',font=FONTS[14],fill=MUTED)
   limb(d,[hip,(290,435),(350,445)],BLUE,17);line(d,(350,445),(368,447),INK,8)
   line(d,(270,447),(314,447),FAR,6)
  limb(d,[hip,mid,shoulder],BLUE,28);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-17,head[1]-17,head[0]+17,head[1]+17),fill=INK)
  if option=='kneeling-cable':
   hand=(head[0]+16,head[1]+12)
   elbow=ik(shoulder,hand,36,28,side=-1)
   limb(d,[shoulder,elbow,hand],INK,9)
   line(d,(423,148),hand,FAR,3)
   d.rounded_rectangle((hand[0]-9,hand[1]-7,hand[0]+9,hand[1]+7),4,fill=FAR)
  else:limb(d,[shoulder,(shoulder[0]+31,shoulder[1]+38),(shoulder[0]+45,shoulder[1]+40)],INK,9)
 elif kind=='captain-chair-raise':
  hip=(286,337);shoulder=(284,226);head=(284,190)
  d.rounded_rectangle((247,198,264,351),4,fill=FAR)
  for x in (229,341):
   d.rounded_rectangle((x-15,278,x+15,293),4,fill=FAR)
   line(d,(x,292),(x,449),FAR,5)
  line(d,hip,shoulder,BLUE,28);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  for x in (258,312):limb(d,[(x,233),(x,276),(x,285)],INK,9)
  knee=polar(hip,78,math.pi/2-.9*u);foot=polar(knee,60,.35-.4*u)
  if abs(math.dist(hip,knee)-78)>1e-6 or abs(math.dist(knee,foot)-60)>1e-6 or foot[1]>446:raise ValueError('Captain chair leg or clearance changed')
  limb(d,[hip,knee,foot],BLUE,17);line(d,foot,(foot[0]+18,foot[1]),INK,8)
  d.text((45,181),'BACK / FOREARMS SUPPORTED',font=FONTS[14],fill=MUTED)
 elif kind in ('anti-rotation','diagonal-pull'):
  # Frontal oblique schematic: a fixed anchor pulls from the left; torso and
  # pelvis stay stacked. Diagonal options move the gripped hands across body.
  kneel=kind=='diagonal-pull' and option.endswith('kneeling')
  hip=(300,341);shoulder=(300+(14*u if kind=='diagonal-pull' else 0),218)
  head=(shoulder[0],179)
  if kneel:
   limb(d,[hip,(248,391),(240,447)],BLUE,16)
   line(d,(240,447),(215,449),INK,8)
   limb(d,[hip,(361,368),(390,446)],BLUE,16)
   line(d,(390,446),(416,448),INK,8)
  else:
   for side in (-1,1):
    knee=(300+side*37,390);foot=(300+side*63,447)
    limb(d,[hip,knee,foot],BLUE,16);line(d,foot,(foot[0]+side*18,449),INK,8)
  line(d,hip,shoulder,BLUE,29);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-19,head[0]+18,head[1]+17),fill=INK)
  if kind=='diagonal-pull':
   # The pelvis stays square while the shoulder line turns with the pull.
   # A synchronized top-view inset makes transverse rotation unambiguous.
   turn=(.52 if option.startswith('high') else -.52)*u
   left=(shoulder[0]-35*math.cos(turn),shoulder[1]-35*math.sin(turn))
   right=(shoulder[0]+35*math.cos(turn),shoulder[1]+35*math.sin(turn))
   line(d,left,shoulder,FAR,9);line(d,shoulder,right,BLUE,9)
   d.rounded_rectangle((42,277,188,362),7,fill=BG,outline=FAR,width=2)
   d.text((49,283),'TOP VIEW / TURN',font=FONTS[14],fill=MUTED)
   line(d,(79,340),(151,340),FAR,5)
   line(d,(115,335),(115,317),BLUE,7)
   a=(115-34*math.cos(turn),317-34*math.sin(turn))
   b=(115+34*math.cos(turn),317+34*math.sin(turn))
   line(d,a,b,BLUE,7)
   d.text((49,343),'PELVIS STEADY',font=FONTS[14],fill=INK)
  if kind=='anti-rotation':
   anchor=(95,259);hand=(322+68*u,270-12*u)
   label='CHEST-HEIGHT CABLE / PRESS AWAY' if option=='cable' else 'SECURE BAND ANCHOR / PRESS AWAY'
   if option=='cable':
    line(d,(95,215),(95,445),FAR,6)
    d.ellipse((83,247,107,271),outline=FAR,width=4)
    line(d,anchor,hand,FAR,3)
   else:
    line(d,(95,230),(95,295),FAR,7)
    line(d,anchor,hand,BLUE,3)
   for offset,color in ((-10,FAR),(10,INK)):
    start=(shoulder[0]+offset,shoulder[1]+8)
    elbow=ik(start,hand,72,70,side=1)
    limb(d,[start,elbow,hand],color,9)
   d.text((45,181),label,font=FONTS[14],fill=MUTED)
  else:
   high=option.startswith('high')
   anchor=(95,153 if high else 425)
   hand=(246+127*u,224+105*u) if high else (237+136*u,348-133*u)
   line(d,(95,116),(95,445),FAR,6)
   d.ellipse((anchor[0]-12,anchor[1]-12,anchor[0]+12,anchor[1]+12),outline=FAR,width=4)
   line(d,anchor,hand,FAR,3)
   for offset,color in ((-9,FAR),(9,INK)):
    start=(shoulder[0]+offset,shoulder[1]+9)
    elbow=ik(start,hand,87,82,side=1)
    limb(d,[start,elbow,hand],color,9)
   d.text((45,181),'HIGH-TO-LOW CHOP' if high else 'LOW-TO-HIGH LIFT',font=FONTS[14],fill=MUTED)
   if kneel:d.text((45,201),'HALF KNEEL / PELVIS STEADY',font=FONTS[14],fill=MUTED)
  d.rounded_rectangle((hand[0]-12,hand[1]-6,hand[0]+12,hand[1]+6),3,fill=FAR,outline=INK,width=2)
 elif kind=='loaded-shrug':
  # Front view: a level trunk and planted feet; only the shoulder girdle and
  # long arms rise. Every implement has its own fixed support or load path.
  hip=(300,335);neck=(300,207);head=(300,169)
  if option=='smith':
   for x in (184,416):
    line(d,(x,111),(x,452),FAR,6)
    line(d,(x-11,405),(x+11,405),INK,4)
  elif option=='cable':
   for x in (181,419):
    d.ellipse((x-11,427,x+11,449),outline=FAR,width=4)
   d.text((44,251),'LOW PULLEYS / TWO CABLES',font=FONTS[14],fill=MUTED)
  elif option=='machine':
   for x in (130,470):
    d.ellipse((x-9,341,x+9,359),outline=FAR,width=4)
   d.text((44,251),'PIVOTING SIDE HANDLES',font=FONTS[14],fill=MUTED)
  for direction in (-1,1):
   knee=(300+direction*27,390);foot=(300+direction*46,445)
   limb(d,[hip,knee,foot],BLUE,17);line(d,foot,(foot[0]+direction*18,448),INK,9)
  line(d,hip,neck,BLUE,29);line(d,neck,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-21,head[0]+18,head[1]+13),fill=INK)
  hands=[]
  for direction in (-1,1):
   sh=(300+direction*38,207-14*u)
   line(d,neck,sh,BLUE,13)
   if option=='machine':
    pivot=(130,350) if direction<0 else (470,350)
    target_y=346-14*u
    hand=(pivot[0]-direction*math.sqrt(128**2-(pivot[1]-target_y)**2),target_y)
    if abs(math.dist(pivot,hand)-128)>1e-6:raise ValueError('Shrug lever radius changed')
    if not 138<math.dist(sh,hand)<140:raise ValueError('Shrug straight arm path changed')
    line(d,sh,hand,INK,11)
   else:
    elbow=polar(sh,70,math.pi/2-direction*.06)
    hand=polar(elbow,69,math.pi/2-direction*.06)
    if abs(math.dist(sh,elbow)-70)>1e-6 or abs(math.dist(elbow,hand)-69)>1e-6:raise ValueError('Shrug arm length changed')
    limb(d,[sh,elbow,hand],INK,11)
   hands.append(hand)
  if option in ('barbell','smith'):
   y=sum(p[1] for p in hands)/2
   line(d,(177,y),(423,y),INK,6)
   for x in (190,410):d.rounded_rectangle((x-7,y-21,x+7,y+21),3,fill=FAR,outline=INK,width=2)
   if option=='smith':
    for x in (184,416):d.ellipse((x-7,y-7,x+7,y+7),fill=BLUE,outline=INK,width=2)
  elif option=='trap-bar':
   y=sum(p[1] for p in hands)/2
   d.line([(179,y),(215,y-22),(385,y-22),(421,y),(385,y+22),(215,y+22),(179,y)],fill=INK,width=5)
   for x in (183,417):d.rounded_rectangle((x-7,y-17,x+7,y+17),3,fill=FAR,outline=INK,width=2)
   d.text((44,251),'SIDE HANDLES / TRAP FRAME',font=FONTS[14],fill=MUTED)
  elif option=='cable':
   for hand,pivot in zip(hands,((181,438),(419,438))):
    line(d,pivot,hand,FAR,3)
    d.rounded_rectangle((hand[0]-12,hand[1]-6,hand[0]+12,hand[1]+6),3,fill=FAR,outline=INK,width=2)
  else:
   for hand,pivot in zip(hands,((130,350),(470,350))):
    line(d,pivot,hand,FAR,6)
    d.rounded_rectangle((hand[0]-12,hand[1]-6,hand[0]+12,hand[1]+6),3,fill=FAR,outline=INK,width=2)
 elif kind in ('leg-press-sled','leg-press-calf'):
  # Seat/back never move. A translating sled changes hip-to-foot reach in
  # presses; the calf guide instead fixes the sled and pivots only the heel.
  hip=(205,345);shoulder=(146,253);head=(124,222)
  d.line((125,227,220,375),fill=FAR,width=22)
  d.rounded_rectangle((175,348,258,364),5,fill=FAR)
  for x in (187,245):d.line((x,364,x,455),fill=FAR,width=7)
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  limb(d,[shoulder,(175,313),(191,361)],INK,10)
  calf=kind=='leg-press-calf';horizontal=option=='horizontal'
  if horizontal:
   d.line((286,263,492,263),fill=FAR,width=7)
   d.line((286,398,492,398),fill=FAR,width=7)
   platform=(355+85*u,325)
   d.line((platform[0],261,platform[0],399),fill=INK,width=12)
   foot=(platform[0],platform[1]);ankle=(foot[0]-25,foot[1])
   toe=(foot[0]+1,foot[1])
  else:
   d.line((323,436,500,115),fill=FAR,width=7)
   d.line((354,453,515,158),fill=FAR,width=7)
   platform=(420,265) if calf else (365+55*u,360-100*u)
   d.line((platform[0]-55,platform[1]-30,platform[0]+55,platform[1]+30),fill=INK,width=12)
   if calf:
    toe=platform;ankle_y=276-18*u
    ankle=(toe[0]-math.sqrt(48**2-(toe[1]-ankle_y)**2),ankle_y)
   else:
    ankle=(platform[0]-30,platform[1]-16)
    toe=(platform[0]+15,platform[1]+8)
  if calf:
   knee=ik(hip,ankle,100,100,side=1)
   if abs(math.dist(ankle,toe)-48)>1e-6 or toe!=(420,265):raise ValueError('Leg press calf forefoot lost contact')
   d.text((51,166),'FIXED SLED / HEEL PIVOTS',font=FONTS[14],fill=MUTED)
  else:
   knee=ik(hip,ankle,115,110,side=1)
   if option=='single':
    limb(d,[hip,(252,381),(281,425)],FAR,13)
    line(d,(281,425),(303,430),INK,7)
   if option in ('single','wide'):
    d.rounded_rectangle((40,133,190,199),7,fill=BG,outline=FAR,width=2)
    d.text((50,138),'PLATFORM VIEW',font=FONTS[14],fill=MUTED)
    positions=(98,) if option=='single' else (70,155)
    for x in positions:d.rounded_rectangle((x-10,158,x+10,180),5,fill=BLUE,outline=INK,width=2)
    d.text((50,183),'ONE FOOT' if option=='single' else 'WIDE / TOES TRACK',font=FONTS[14],fill=INK)
   if option=='horizontal':d.text((50,167),'HORIZONTAL SLED',font=FONTS[14],fill=MUTED)
   else:d.text((50,267),'INCLINED SLED',font=FONTS[14],fill=MUTED)
  lengths=(100,100) if calf else (115,110)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((hip,knee,lengths[0]),(knee,ankle,lengths[1]))):raise ValueError('Leg press segment changed length')
  limb(d,[hip,knee,ankle],BLUE,17)
  line(d,ankle,toe,INK,10)
 elif kind=='smith-calf':
  # Raised forefoot is fixed; heel, body and guided bar rise together.
  toe=(365,443);ankle_y=432-18*u
  ankle=(toe[0]-math.sqrt(48**2-(toe[1]-ankle_y)**2),ankle_y)
  dx=ankle[0]-(toe[0]-math.sqrt(48**2-(toe[1]-432)**2));dy=ankle_y-432
  hip=(301+dx,290+dy);shoulder=(296+dx,169+dy);head=(296+dx,135+dy)
  d.rounded_rectangle((345,446,400,457),4,fill=FAR)
  for x in (215,415):
   d.line((x,89,x,457),fill=FAR,width=7)
   d.line((x-15,400,x+15,400),fill=INK,width=5)
  limb(d,[hip,(305+dx,361+dy),ankle],BLUE,18)
  line(d,ankle,toe,INK,10)
  body(d,hip,shoulder,head)
  bar_y=shoulder[1]+12
  d.line((215,bar_y,415,bar_y),fill=INK,width=7)
  for x in (231,399):d.rounded_rectangle((x-8,bar_y-20,x+8,bar_y+20),4,fill=FAR,outline=INK,width=2)
  for x in (215,415):d.rounded_rectangle((x-5,bar_y-9,x+5,bar_y+9),2,fill=INK)
  limb(d,[shoulder,(shoulder[0]+37,shoulder[1]+55),(shoulder[0]+47,bar_y)],INK,10)
  d.text((52,232),'STEP / GUIDED BAR / STOPS',font=FONTS[14],fill=MUTED)
 elif kind=='donkey-calf':
  # Hip pad loads a supported, forward-bent torso; forefoot remains on step.
  toe=(365,443);ankle_y=432-18*u
  ankle=(toe[0]-math.sqrt(48**2-(toe[1]-ankle_y)**2),ankle_y)
  dx=ankle[0]-(toe[0]-math.sqrt(48**2-(toe[1]-432)**2));dy=ankle_y-432
  hip=(301+dx,300+dy);shoulder=(198+dx,292+dy);head=(161+dx,284+dy)
  d.rounded_rectangle((345,446,400,457),4,fill=FAR)
  d.line((250,88,250,456),fill=FAR,width=7)
  d.rounded_rectangle((hip[0]-28,hip[1]-33,hip[0]+31,hip[1]-17),5,fill=FAR,outline=INK,width=2)
  d.line((250,hip[1]-23,hip[0]-28,hip[1]-23),fill=FAR,width=8)
  d.line((104,370,104,457),fill=FAR,width=7)
  d.line((104,370,161,370),fill=INK,width=7)
  limb(d,[hip,(305+dx,367+dy),ankle],BLUE,18)
  line(d,ankle,toe,INK,10)
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  hand=(155,370);elbow=ik(shoulder,hand,72,69,side=-1)
  limb(d,[shoulder,elbow,hand],INK,11)
  d.text((52,226),'HIP PAD / TRUNK SUPPORTED',font=FONTS[14],fill=MUTED)
 elif kind=='machine-tibialis':
  # Seated hip/knee/heel remain fixed; toes lift against a moving foot pad.
  d.rounded_rectangle((243,329,335,346),5,fill=FAR)
  d.rounded_rectangle((244,203,261,342),5,fill=FAR)
  for x in (257,326):d.line((x,346,x,458),fill=FAR,width=7)
  hip=(292,329);shoulder=(287,205);head=(287,170)
  knee=(371,332);heel=(408,438)
  limb(d,[hip,knee,heel],BLUE,17)
  body(d,hip,shoulder,head)
  d.rounded_rectangle((391,442,423,456),4,fill=FAR)
  toe=polar(heel,48,.1-.78*u)
  if abs(math.dist(heel,toe)-48)>1e-6 or heel!=(408,438):raise ValueError('Tibialis heel support changed')
  line(d,heel,toe,INK,10)
  d.line((482,235,482,457),fill=FAR,width=7)
  d.rounded_rectangle((toe[0]-13,toe[1]-11,toe[0]+13,toe[1]-1),3,fill=FAR,outline=INK,width=2)
  d.line((482,313,toe[0]+10,toe[1]-6),fill=FAR,width=5)
  d.text((53,267),'HEEL FIXED / TOES LIFT',font=FONTS[14],fill=MUTED)
 elif kind=='dumbbell-bench-variant':
  # Separate dumbbells, neutral grip, unilateral trunk control, and a
  # continuously contacting squeeze pair are distinct flat-bench mechanics.
  shoulder=(230,345);hip=(330,345);head=(185,340)
  d.rounded_rectangle((160,360,405,376),5,fill=FAR)
  for x in (185,390):d.line((x,376,x,455),fill=FAR,width=7)
  limb(d,[hip,(360,318),(394,347)],BLUE,16)
  line(d,(394,347),(420,350),INK,9)
  line(d,hip,shoulder,BLUE,26);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  for offset,color in ((-15,FAR),(15,INK)):
   start=(shoulder[0]+offset,shoulder[1])
   if option=='single' and offset<0:
    limb(d,[start,(start[0]+7,383),(start[0]+41,398)],FAR,10)
    continue
   hand=(start[0]+30,325-115*u)
   elbow=ik(start,hand,75,65,side=-1)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((start,elbow,75),(elbow,hand,65))):raise ValueError('Dumbbell bench variant arm changed length')
   limb(d,[start,elbow,hand],color,12)
   if option=='squeeze':
    d.rounded_rectangle((hand[0]-17,hand[1]-18,hand[0]+17,hand[1]+18),5,fill=FAR,outline=INK,width=2)
    d.ellipse((hand[0]-4,hand[1]-4,hand[0]+4,hand[1]+4),fill=BLUE)
   else:weight(d,hand,hammer=option=='neutral')
  if option=='squeeze':
   d.text((49,230),'TWO BELLS TOUCH THROUGHOUT',font=FONTS[14],fill=MUTED)
  if option=='single':d.text((49,230),'ONE ARM / TORSO STAYS SQUARE',font=FONTS[14],fill=MUTED)
  if option=='neutral':
   d.rounded_rectangle((40,141,183,231),7,fill=BG,outline=FAR,width=2)
   d.text((49,148),'TOP GRIP VIEW',font=FONTS[14],fill=MUTED)
   for x in (89,136):
    d.line((x,180,x,204),fill=INK,width=7)
    d.rounded_rectangle((x-11,184,x+11,206),4,fill=BLUE,outline=INK,width=2)
   d.text((49,211),'PALMS FACE IN',font=FONTS[14],fill=INK)
 elif kind=='machine-horizontal-press':
  incline=option=='incline';single=option=='single'
  hip=(294,340) if incline else (253,340)
  shoulder=(242,218) if incline else (240,220)
  head=(shoulder[0]-5,shoulder[1]-39)
  if incline:
   d.line((222,204,309,357),fill=FAR,width=19)
   d.rounded_rectangle((258,337,333,353),5,fill=FAR)
  else:
   d.rounded_rectangle((222,211,240,352),5,fill=FAR)
   d.rounded_rectangle((221,336,322,353),5,fill=FAR)
  for x in (236,318):d.line((x,353,x,456),fill=FAR,width=7)
  limb(d,[hip,(347,379),(380,444)],BLUE,16)
  line(d,(380,444),(407,448),INK,8)
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  pivot=(450,330) if incline else (342,420)
  radius=160 if incline else 165
  angle=(3.65+.47*u) if incline else (-1.83+.52*u)
  hand=polar(pivot,radius,angle)
  if abs(math.dist(pivot,hand)-radius)>1e-6:raise ValueError('Machine press lever changed length')
  d.line((pivot[0],pivot[1],pivot[0],455),fill=FAR,width=8)
  d.ellipse((pivot[0]-12,pivot[1]-12,pivot[0]+12,pivot[1]+12),fill=INK)
  d.line([xy(pivot),xy(hand)],fill=FAR,width=8)
  if option=='plate-loaded':
   plate=polar(pivot,83,angle)
   d.ellipse((plate[0]-19,plate[1]-19,plate[0]+19,plate[1]+19),fill=FAR,outline=INK,width=3)
   d.ellipse((plate[0]-5,plate[1]-5,plate[0]+5,plate[1]+5),fill=BG)
  else:
   d.rounded_rectangle((pivot[0]-18,377,pivot[0]+19,421),4,fill=FAR,outline=INK,width=2)
  elbow=ik(shoulder,hand,82,75,side=-1)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((shoulder,elbow,82),(elbow,hand,75))):raise ValueError('Machine press arm changed length')
  limb(d,[shoulder,elbow,hand],INK,12)
  d.rounded_rectangle((hand[0]-10,hand[1]-5,hand[0]+10,hand[1]+5),3,fill=INK,outline=BLUE,width=2)
  if single:
   limb(d,[shoulder,(shoulder[0]-25,shoulder[1]+68),(shoulder[0]-20,shoulder[1]+108)],FAR,10)
   d.text((50,232),'ONE HANDLE / TORSO SQUARE',font=FONTS[14],fill=MUTED)
  else:d.text((50,232),'BACK PAD / MOVING LEVER',font=FONTS[14],fill=MUTED)
 elif kind=='barbell-horizontal-press':
  floor=option=='floor';incline=option in ('incline','smith-incline');decline=option=='decline';smith=option in ('smith','smith-incline')
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
   d.line((344,306,450,316),fill=FAR,width=8)
   d.line((450,316,450,261),fill=FAR,width=8)
   d.rounded_rectangle((383,263,416,277),7,fill=INK,outline=BLUE,width=2)
   d.rounded_rectangle((383,302,416,316),7,fill=INK,outline=BLUE,width=2)
   low_y,high_y=338,225
  elif incline:
   shoulder=(245,295);hip=(330,350);head=(215,265)
   d.line((189,270,352,374),fill=FAR,width=18)
   for x in (211,334):d.line((x,365,x,457),fill=FAR,width=7)
   limb(d,[hip,(365,366),(386,442)],BLUE,16)
   line(d,(386,442),(414,446),INK,9)
   low_y,high_y=270,160
  else:
   shoulder=(230,345);hip=(330,345);head=(185,340)
   d.rounded_rectangle((160,360,405,376),5,fill=FAR)
   for x in (185,390):d.line((x,376,x,455),fill=FAR,width=7)
   limb(d,[hip,(360,318),(394,347)],BLUE,16)
   line(d,(394,347),(420,350),INK,9)
   low_y,high_y=(295 if option=='spoto' else 325),210
  if smith:
   rail_center=shoulder[0]+30
   for x in (rail_center-110,rail_center+110):
    d.line((x,91,x,457),fill=FAR,width=7)
    d.line((x-14,389,x+14,389),fill=INK,width=5)
  else:
   for x in (103,481):d.line((x,94,x,456),fill=FAR,width=7)
   d.line((103,393,152,393),fill=FAR,width=6)
   d.line((431,393,481,393),fill=FAR,width=6)
  line(d,hip,shoulder,BLUE,26)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  hands=[]
  for offset,color in ((-8,FAR),(8,INK)) if option=='close' else ((-15,FAR),(15,INK)):
   arm_start=(shoulder[0]+offset,shoulder[1])
   hand=(arm_start[0]+30,low_y+(high_y-low_y)*u)
   elbow=ik(arm_start,hand,75,65,side=-1)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((arm_start,elbow,75),(elbow,hand,65))):raise ValueError('Barbell press arm length changed')
   if floor and u<.001 and abs(elbow[1]-439)>2:raise ValueError('Floor press elbow missed floor')
   limb(d,[arm_start,elbow,hand],color,12)
   hands.append(hand)
  center=((hands[0][0]+hands[1][0])/2,(hands[0][1]+hands[1][1])/2)
  span=110 if smith else 88
  d.line((center[0]-span,center[1],center[0]+span,center[1]),fill=INK,width=7)
  for x in (center[0]-span+17,center[0]+span-17):d.rounded_rectangle((x-8,center[1]-21,x+8,center[1]+21),4,fill=FAR,outline=INK,width=2)
  if smith:
   for x in (rail_center-110,rail_center+110):d.rounded_rectangle((x-6,center[1]-9,x+6,center[1]+9),2,fill=INK)
  if option=='close':
   d.rounded_rectangle((39,141,165,231),7,fill=BG,outline=FAR,width=2)
   d.text((48,148),'TOP GRIP VIEW',font=FONTS[14],fill=MUTED)
   d.line((53,192,151,192),fill=INK,width=6)
   for x in (87,121):d.rounded_rectangle((x-10,181,x+10,203),4,fill=BLUE,outline=INK,width=2)
   d.text((48,209),'HANDS APART',font=FONTS[14],fill=INK)
  if option=='spoto':
   chest_top=shoulder[1]-13
   if low_y>=chest_top-20:raise ValueError('Spoto bar must hover above chest')
   d.line((center[0]+31,low_y,center[0]+31,chest_top),fill=FAR,width=2)
   d.text((52,225),'HOVER ABOVE CHEST',font=FONTS[14],fill=MUTED)
  if option=='floor':d.text((52,235),'UPPER ARMS STOP ON FLOOR',font=FONTS[14],fill=MUTED)
 elif kind=='overhead-press':
  seated=option.endswith('seated');smith=option=='smith-seated';machine=option=='machine-seated'
  if seated:
   d.rounded_rectangle((243,326,331,343),5,fill=FAR)
   d.rounded_rectangle((244,205,260,341),5,fill=FAR)
   for x in (255,322):d.line((x,343,x,457),fill=FAR,width=8)
   hip=(295,326);shoulder=(294,219);head=(287,179)
   limb(d,[hip,(370,353),(389,444)],BLUE,17);line(d,(389,444),(414,448),INK,8)
  else:
   hip=(300,329);shoulder=(294,219);head=(287,179)
   for dx,color in ((-25,FAR),(25,BLUE)):
    limb(d,[hip,(300+dx,383),(300+dx*1.6,444)],color,16)
    line(d,(300+dx*1.6,444),(300+dx*1.6+20,448),INK,8)
  if smith:
   for x in (250,446):
    d.line((x,86,x,458),fill=FAR,width=7)
    d.line((x-15,398,x+15,398),fill=INK,width=5)
  if option.startswith('barbell'):
   for x in (103,485):d.line((x,96,x,458),fill=FAR,width=7)
   d.line((103,303,157,303),fill=FAR,width=6)
   d.line((434,303,485,303),fill=FAR,width=6)
  if machine:
   d.line((472,235,472,456),fill=FAR,width=8)
   d.rounded_rectangle((453,317,490,406),5,fill=FAR,outline=INK,width=2)
   d.ellipse((461,251,483,273),fill=INK)
  body(d,hip,shoulder,head)
  if machine:
   angle=3.0+1.1*u
   hand=polar((472,260),160,angle)
   elbow=ik(shoulder,hand,78,76,side=-1)
   d.line([xy((472,260)),xy(hand)],fill=FAR,width=8)
  else:
   hand=(348,245-140*u) if option in ('kettlebell-standing','arnold-seated') else (348,265-160*u)
   elbow=ik(shoulder,hand,75,70,side=-1)
  if abs(math.dist(shoulder,elbow)-(78 if machine else 75))>1e-6 or abs(math.dist(elbow,hand)-(76 if machine else 70))>1e-6:raise ValueError('Overhead press arm changed length')
  limb(d,[shoulder,elbow,hand],INK,12)
  if option.startswith('barbell') or smith:
   d.line((hand[0]-98,hand[1],hand[0]+98,hand[1]),fill=INK,width=7)
   for x in (hand[0]-82,hand[0]+82):d.rounded_rectangle((x-8,hand[1]-20,x+8,hand[1]+20),4,fill=FAR,outline=INK,width=2)
   if smith:
    for x in (250,446):d.rounded_rectangle((x-5,hand[1]-9,x+5,hand[1]+9),2,fill=INK)
  elif option=='kettlebell-standing':draw_kettlebell(d,(hand[0]-17,hand[1]+10))
  elif option=='arnold-seated':
   # Shaft and palm marker rotate while hands travel upward.
   theta=-math.pi*u/2
   a=polar(hand,22,theta);b=polar(hand,22,theta+math.pi)
   d.line([xy(a),xy(b)],fill=INK,width=7)
   for p in (a,b):d.rounded_rectangle((p[0]-7,p[1]-8,p[0]+7,p[1]+8),3,fill=FAR)
   d.ellipse((hand[0]+8*math.cos(math.pi*u)-3,hand[1]+8*math.sin(math.pi*u)-3,hand[0]+8*math.cos(math.pi*u)+3,hand[1]+8*math.sin(math.pi*u)+3),fill=BLUE)
  else:d.rounded_rectangle((hand[0]-12,hand[1]-5,hand[0]+12,hand[1]+5),3,fill=FAR,outline=INK,width=2)
  d.text((52,237),{'barbell-standing':'STRICT / LEGS STILL','barbell-seated':'SEATED / FRONT PATH','smith-seated':'GUIDED RAIL / STOPS','machine-seated':'SEAT / MOVING LEVER','kettlebell-standing':'BELL RACK TO LOCKOUT','arnold-seated':'ROTATE WHILE PRESSING'}[option],font=FONTS[14],fill=MUTED)
 elif kind=='cable-shoulder-raise':
  # Front and lateral shoulder arcs occupy different camera planes. Both
  # keep the torso and feet still under a taut low-pulley cable.
  if option=='front':
   anchor=(470,416);hip=(300,330);shoulder=(299,211);head=(297,174)
   d.line((485,90,485,456),fill=FAR,width=6)
   d.rounded_rectangle((468,347,500,421),4,fill=FAR,outline=INK,width=2)
   d.ellipse((anchor[0]-10,anchor[1]-10,anchor[0]+10,anchor[1]+10),fill=FAR,outline=INK,width=2)
   for dx,color in ((-26,FAR),(26,BLUE)):
    limb(d,[hip,(300+dx,386),(300+dx*1.5,444)],color,16)
    line(d,(300+dx*1.5,444),(320+dx*1.5,448),INK,8)
   body(d,hip,shoulder,head)
   angle=math.pi/2-math.pi*u/2
   elbow=polar(shoulder,74,angle)
   hand=polar(elbow,65,angle+.05)
   limb(d,[shoulder,elbow,hand],INK,12)
   d.text((50,230),'SIDE VIEW / FORWARD ARC',font=FONTS[14],fill=MUTED)
  else:
   anchor=(94,416);hip=(300,330);neck=(300,213);head=(300,175)
   d.line((76,90,76,456),fill=FAR,width=6)
   d.rounded_rectangle((61,349,94,421),4,fill=FAR,outline=INK,width=2)
   d.ellipse((anchor[0]-10,anchor[1]-10,anchor[0]+10,anchor[1]+10),fill=FAR,outline=INK,width=2)
   for dx,color in ((-31,FAR),(31,BLUE)):
    limb(d,[hip,(300+dx,386),(300+dx*1.45,444)],color,16)
    line(d,(300+dx*1.45,444),(300+dx*1.45+20,448),INK,8)
   line(d,hip,neck,BLUE,29);line(d,neck,head,BLUE,11)
   d.ellipse((head[0]-18,head[1]-20,head[0]+18,head[1]+14),fill=INK)
   shoulder=(337,218)
   line(d,neck,shoulder,BLUE,12)
   angle=math.pi/2-math.pi*u/2
   elbow=polar(shoulder,73,angle)
   hand=polar(elbow,65,angle+.05)
   limb(d,[shoulder,elbow,hand],INK,12)
   limb(d,[(263,218),(248,293),(259,348)],FAR,11)
   d.text((149,230),'FRONT VIEW / OUTWARD ARC',font=FONTS[14],fill=MUTED)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((shoulder,elbow,74 if option=='front' else 73),(elbow,hand,65))):raise ValueError('Cable raise arm changed length')
  d.line([xy(anchor),xy(hand)],fill=INK,width=3)
  d.rounded_rectangle((hand[0]-8,hand[1]-5,hand[0]+8,hand[1]+5),3,fill=FAR,outline=INK,width=2)
 elif kind=='equipment-squat':
  smith=option.startswith('smith');hack=option=='hack'
  if smith:
   rail_center=294 if option=='smith-back' else 332
   for x in (rail_center-85,rail_center+85):
    d.line((x,93,x,458),fill=FAR,width=8)
    d.line((x-13,420,x+13,420),fill=INK,width=6)
  if hack:
   d.line((154,407,345,109),fill=FAR,width=10)
   d.line((184,425,375,127),fill=FAR,width=10)
   d.rounded_rectangle((285,432,380,448),4,fill=FAR)
  if option=='belt':
   for x in (118,480):
    d.line((x,219,x,458),fill=FAR,width=8)
   d.line((408,219,480,219),fill=INK,width=6)
  ankle=(310,447)
  hip_y=294+68*u
  lean=.20 if option in ('smith-front','goblet-kettlebell','double-kettlebell') else (.30 if hack else .32)
  hip_x=(302-126*math.sin(lean*u)) if smith else 302-72*u
  hip=(hip_x,hip_y)
  shoulder=polar(hip,126,-math.pi/2+lean*u)
  head=polar(shoulder,33,-math.pi/2+.10*u)
  knee=ik(hip,ankle,79,78)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((hip,knee,79),(knee,ankle,78),(hip,shoulder,126))):raise ValueError('Equipment squat body segment changed length')
  limb(d,[hip,knee,ankle],BLUE,18)
  line(d,ankle,(347,450),INK,10)
  if hack:
   d.line([xy(add(hip,(-17,-4))),xy(add(shoulder,(-17,-4)))],fill=FAR,width=25)
   for side in (-1,1):
    pad=(shoulder[0]+side*19,shoulder[1]+13)
    d.rounded_rectangle((pad[0]-10,pad[1]-12,pad[0]+10,pad[1]+13),5,fill=FAR,outline=INK,width=2)
   handle=(shoulder[0]+45,shoulder[1]+26)
   limb(d,[shoulder,(shoulder[0]+35,shoulder[1]+35),handle],INK,10)
  body(d,hip,shoulder,head)
  if option=='goblet-kettlebell':
   bell=(shoulder[0]+48,shoulder[1]+54)
   for offset in (-9,9):limb(d,[(shoulder[0]+offset,shoulder[1]),(shoulder[0]+offset+38,shoulder[1]+45),(bell[0]+offset/2,bell[1]-12)],INK,10)
   draw_kettlebell(d,bell)
  elif option=='double-kettlebell':
   for dx,color in ((-17,FAR),(17,INK)):
    bell=(shoulder[0]+32+dx,shoulder[1]+35)
    limb(d,[shoulder,(shoulder[0]+38+dx,shoulder[1]+48),(bell[0],bell[1]-14)],color,10)
    draw_kettlebell(d,bell)
  elif smith:
   bar=(294,shoulder[1]+(13 if option=='smith-back' else 11)) if option=='smith-back' else (332,shoulder[1]+11)
   if abs(bar[0]-(294 if option=='smith-back' else 332))>1e-6:raise ValueError('Smith bar left rail path')
   d.line((bar[0]-85,bar[1],bar[0]+85,bar[1]),fill=INK,width=7)
   for x in (bar[0]-69,bar[0]+69):d.rounded_rectangle((x-8,bar[1]-20,x+8,bar[1]+20),4,fill=FAR,outline=INK,width=2)
   for x in (bar[0]-85,bar[0]+85):d.rounded_rectangle((x-6,bar[1]-9,x+6,bar[1]+9),3,fill=INK)
   if option=='smith-front':
    elbow=(bar[0]+34,bar[1]-11);hand=(bar[0]+8,bar[1]-5)
   else:
    elbow=(shoulder[0]+38,shoulder[1]+57);hand=(bar[0]+36,bar[1])
   limb(d,[shoulder,elbow,hand],INK,10)
  elif option=='belt':
   buckle=(hip[0],hip[1]+8);load=(hip[0],hip[1]+63)
   d.line((hip[0]-30,hip[1]+8,hip[0]+30,hip[1]+8),fill=INK,width=7)
   d.line([xy(buckle),xy((load[0],load[1]-18))],fill=INK,width=4)
   d.ellipse((load[0]-19,load[1]-18,load[0]+19,load[1]+18),fill=FAR,outline=INK,width=3)
   hand=(419,219);elbow=ik(shoulder,hand,92,80,side=1)
   limb(d,[shoulder,elbow,hand],INK,10)
  d.text((55,229),{'goblet-kettlebell':'SINGLE BELL','double-kettlebell':'TWO RACKED BELLS','smith-back':'FIXED BAR PATH','smith-front':'FIXED FRONT RACK','belt':'HIP BELT / HANDLE','hack':'BACK PAD / SLED'}[option],font=FONTS[14],fill=MUTED)
 elif kind=='assisted-single-leg-squat':
  # Single planted foot, elevated free leg, and two fixed-length straps.
  ankle=(330,441);hip=(311-48*u,296+70*u)
  knee=ik(hip,ankle,75,75,side=1)
  limb(d,[hip,knee,ankle],BLUE,18)
  line(d,ankle,(365,449),INK,10)
  free_knee=add(hip,(75,-20));free_foot=add(free_knee,(75,5))
  limb(d,[hip,free_knee,free_foot],FAR,15)
  line(d,free_foot,(free_foot[0]+16,free_foot[1]+3),INK,8)
  shoulder=polar(hip,125,-math.pi/2+.22*u)
  head=polar(shoulder,34,-math.pi/2+.12*u)
  body(d,hip,shoulder,head)
  for offset,color in ((-8,FAR),(8,INK)):
   anchor=(453+offset,92);hand=(416+offset,248)
   d.line([xy(anchor),xy(hand)],fill=FAR,width=4)
   d.line((anchor[0]-13,anchor[1],anchor[0]+13,anchor[1]),fill=INK,width=8)
   elbow=ik(shoulder,hand,100,83,side=1)
   limb(d,[shoulder,elbow,hand],color,10)
  d.text((53,233),'ONE FOOT / STRAPS FOR BALANCE',font=FONTS[14],fill=MUTED)
 elif kind=='barbell-split-squat':
  # Two planted feet and a back-racked bar descend without stepping.
  for x in (112,480):d.line((x,133,x,458),fill=FAR,width=7)
  d.line((112,415,173,415),fill=FAR,width=6)
  d.line((432,415,480,415),fill=FAR,width=6)
  front_ankle=(393,440);rear_ankle=(238,440);hip=(320,280+50*u)
  front_knee=ik(hip,front_ankle,100,100,side=1)
  rear_knee=ik(hip,rear_ankle,100,100,side=1)
  limb(d,[hip,rear_knee,rear_ankle],FAR,17)
  limb(d,[hip,front_knee,front_ankle],BLUE,19)
  line(d,front_ankle,(432,450),INK,10);line(d,rear_ankle,(218,449),INK,9)
  shoulder=(316,hip[1]-112);head=(316,hip[1]-145)
  body(d,hip,shoulder,head)
  bar=(shoulder[0]-8,shoulder[1]+12)
  d.line((bar[0]-78,bar[1],bar[0]+78,bar[1]),fill=INK,width=7)
  for x in (bar[0]-64,bar[0]+64):d.rounded_rectangle((x-8,bar[1]-21,x+8,bar[1]+21),4,fill=FAR,outline=INK,width=2)
  limb(d,[shoulder,(shoulder[0]+39,shoulder[1]+52),(bar[0]+38,bar[1])],INK,10)
  d.text((53,232),'BAR ON BACK / FEET STAY PUT',font=FONTS[14],fill=MUTED)
 elif kind=='barbell-squat':
  # Fixed feet, thigh/shin/torso lengths, and visible safeties. The bar
  # position, elbow support, and box/yoke geometry are exact to the option.
  d.line((102,123,102,458),fill=FAR,width=8)
  d.line((484,123,484,458),fill=FAR,width=8)
  d.line((102,416,176,416),fill=FAR,width=7)
  d.line((430,416,484,416),fill=FAR,width=7)
  if option=='box':
   d.rounded_rectangle((124,377,245,393),4,fill=FAR)
   for x in (144,224):d.line((x,393,x,454),fill=FAR,width=8)
  ankle=(310,447);hip=(302-72*u,294+68*u)
  lean={'back':.32,'high':.22,'low':.47,'paused':.32,'box':.36,'front':.12,'zercher':.28,'safety':.30}[option]
  shoulder=polar(hip,126,-math.pi/2+lean*u)
  head=polar(shoulder,33,-math.pi/2+.10*u)
  knee=ik(hip,ankle,79,78)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((hip,knee,79),(knee,ankle,78),(hip,shoulder,126))):raise ValueError('Bar squat body segment changed length')
  limb(d,[hip,knee,ankle],BLUE,18)
  line(d,ankle,(347,450),INK,10)
  body(d,hip,shoulder,head)
  if option=='front':bar=(shoulder[0]+32,shoulder[1]+12);label='FRONT RACK'
  elif option=='zercher':bar=(shoulder[0]+48,shoulder[1]+65);label='ELBOW CROOKS'
  elif option=='low':bar=(shoulder[0]-14,shoulder[1]+26);label='REAR SHOULDERS'
  elif option=='high':bar=(shoulder[0]-7,shoulder[1]+4);label='UPPER TRAPS'
  else:bar=(shoulder[0]-9,shoulder[1]+13);label='BACK RACK'
  if option=='safety':
   label='YOKE / FRONT HANDLES'
   d.rounded_rectangle((bar[0]-30,bar[1]-13,bar[0]+30,bar[1]+13),7,fill=FAR,outline=INK,width=2)
   d.line((bar[0]-78,bar[1]-17,bar[0]-52,bar[1]+16),fill=INK,width=7)
   d.line((bar[0]-52,bar[1]+16,bar[0]+52,bar[1]+16),fill=INK,width=7)
   d.line((bar[0]+52,bar[1]+16,bar[0]+78,bar[1]-17),fill=INK,width=7)
   handle=(bar[0]+57,bar[1]+51)
   d.line((bar[0]+24,bar[1]+9,handle[0],handle[1]),fill=INK,width=7)
   limb(d,[shoulder,(shoulder[0]+42,shoulder[1]+45),handle],INK,10)
  else:
   d.line((bar[0]-78,bar[1],bar[0]+78,bar[1]),fill=INK,width=7)
   if option=='zercher':
    elbow=(bar[0]-3,bar[1]);hand=(bar[0]+27,bar[1]-17)
    limb(d,[shoulder,elbow,hand],INK,11)
   elif option=='front':
    elbow=(bar[0]+38,bar[1]-12);hand=(bar[0]+9,bar[1]-6)
    limb(d,[shoulder,elbow,hand],INK,11)
   else:
    elbow=(shoulder[0]+38,shoulder[1]+58);hand=(bar[0]+37,bar[1])
    limb(d,[shoulder,elbow,hand],INK,10)
  for px in (bar[0]-64,bar[0]+64):
   d.rounded_rectangle((px-8,bar[1]-21,px+8,bar[1]+21),4,fill=FAR,outline=INK,width=2)
  d.text((53,236),label,font=FONTS[14],fill=MUTED)
 elif kind=='anchored-rotation':
  # Plan view makes the inward/outward forearm rotation unambiguous.
  cable=option.startswith('cable');external=option.endswith('external')
  d.rounded_rectangle((217,206,318,380),35,fill=FAR)
  d.ellipse((238,150,296,208),fill=INK)
  shoulder=(303,264);elbow=(362,282)
  line(d,shoulder,elbow,BLUE,19)
  angle=(2.65-2.35*u) if external else (.3+2.35*u)
  hand=polar(elbow,73,angle)
  if abs(math.dist(elbow,hand)-73)>1e-6 or shoulder!=(303,264):raise ValueError('Rotation support or forearm changed')
  line(d,elbow,hand,INK,14)
  anchor=(86,329) if external else (477,329)
  if cable:
   d.line((anchor[0],109,anchor[0],456),fill=FAR,width=6)
   d.rounded_rectangle((anchor[0]-16,355,anchor[0]+16,424),4,fill=FAR,outline=INK,width=2)
   d.ellipse((anchor[0]-10,anchor[1]-10,anchor[0]+10,anchor[1]+10),fill=FAR,outline=INK,width=2)
   d.line([xy(anchor),xy(hand)],fill=INK,width=3)
   d.rounded_rectangle((hand[0]-8,hand[1]-5,hand[0]+8,hand[1]+5),3,fill=FAR,outline=INK,width=2)
  else:
   d.line((anchor[0],100,anchor[0],455),fill=FAR,width=5)
   d.line((anchor[0],anchor[1],hand[0],hand[1]),fill=FAR,width=5)
   d.ellipse((anchor[0]-6,anchor[1]-6,anchor[0]+6,anchor[1]+6),fill=INK)
  d.text((350,137),'TOP VIEW',font=FONTS[14],fill=MUTED)
  d.text((350,161),'HAND AWAY' if external else 'HAND IN',font=FONTS[18],fill=INK)
 elif kind=='cable-wrist-curl':
  # Forearm stays on a pad; a low pulley tracks the wrist-driven handle.
  d.rounded_rectangle((145,313,362,333),6,fill=FAR)
  for x in (167,340):d.line((x,333,x,456),fill=FAR,width=8)
  elbow=(178,297);wrist=(353,297)
  line(d,elbow,wrist,BLUE,24)
  hand=polar(wrist,49,.55-.98*u)
  if abs(math.dist(wrist,hand)-49)>1e-6:raise ValueError('Cable wrist forearm support changed')
  line(d,wrist,hand,INK,16)
  pulley=(478,419)
  d.line((488,82,488,455),fill=FAR,width=7)
  d.rounded_rectangle((468,353,498,423),4,fill=FAR,outline=INK,width=2)
  d.ellipse((pulley[0]-11,pulley[1]-11,pulley[0]+11,pulley[1]+11),fill=FAR,outline=INK,width=3)
  d.line([xy(pulley),xy(hand)],fill=INK,width=3)
  d.rounded_rectangle((hand[0]-12,hand[1]-5,hand[0]+12,hand[1]+5),3,fill=FAR,outline=INK,width=2)
  d.text((52,173),'LOW CABLE / FOREARM SUPPORTED',font=FONTS[14],fill=MUTED)
 elif kind=='forearm-turn':
  # End-on view shows a short, light dumbbell lever rotating about the fixed
  # long axis of a supported forearm; elbow and wrist do not travel.
  d.rounded_rectangle((119,335,369,352),5,fill=FAR)
  for x in (145,344):d.line((x,352,x,456),fill=FAR,width=7)
  elbow=(157,311);wrist=(325,311)
  line(d,elbow,wrist,BLUE,25)
  d.ellipse((wrist[0]-12,wrist[1]-12,wrist[0]+12,wrist[1]+12),fill=INK)
  center=(407,303);theta=(math.pi/2-math.pi*u) if option=='pronation' else (-math.pi/2+math.pi*u)
  d.line((wrist[0],wrist[1],center[0],center[1]),fill=INK,width=7)
  d.ellipse((center[0]-6,center[1]-6,center[0]+6,center[1]+6),fill=INK)
  tip=polar(center,36,theta)
  d.line([xy(center),xy(tip)],fill=INK,width=8)
  d.rounded_rectangle((tip[0]-11,tip[1]-8,tip[0]+11,tip[1]+8),4,fill=FAR,outline=INK,width=2)
  d.text((55,179),'SUPPORTED FOREARM / AXIAL TURN',font=FONTS[14],fill=MUTED)
  d.text((55,207),'TO PALM DOWN' if option=='pronation' else 'TO PALM UP',font=FONTS[18],fill=INK)
 elif kind=='zottman-curl':
  # Curl upward supinated, rotate at the top, lower pronated, and reset.
  turn=option
  hip=(300,329);shoulder=(296,206);head=(296,171)
  for dx,color in ((-27,FAR),(27,BLUE)):
   limb(d,[hip,(300+dx,383),(300+dx*1.5,444)],color,16)
   line(d,(300+dx*1.5,444),(300+dx*1.5+22,447),INK,8)
  body(d,hip,shoulder,head)
  for offset,color in ((-10,FAR),(10,INK)):
   elbow=(304+offset,290);hand=polar(elbow,67,math.pi/2-2.55*u)
   limb(d,[(shoulder[0]+offset,shoulder[1]),elbow,hand],color,11)
   weight(d,hand,hammer=True)
  draw_zottman_grip_inset(d,turn)
  d.text((50,374),'ROTATE AT TOP / LOWER PALMS DOWN',font=FONTS[14],fill=MUTED)
 elif kind=='bar-curl':
  # Fixed shoulder and upper arm; two hands travel together with one bar.
  hip=(300,329);shoulder=(296,206);head=(296,171)
  for dx,color in ((-27,FAR),(27,BLUE)):
   limb(d,[hip,(300+dx,383),(300+dx*1.5,444)],color,16)
   line(d,(300+dx*1.5,444),(300+dx*1.5+22,447),INK,8)
  body(d,hip,shoulder,head)
  hands=[]
  for offset,color in ((-10,FAR),(10,INK)):
   start=(shoulder[0]+offset,shoulder[1]);elbow=(304+offset,290)
   hand=polar(elbow,67,math.pi/2-2.55*u)
   if abs(math.dist(elbow,hand)-67)>1e-6 or elbow[1]!=290:raise ValueError('Bar curl elbow changed')
   limb(d,[start,elbow,hand],color,11);hands.append(hand)
  center=((hands[0][0]+hands[1][0])/2,(hands[0][1]+hands[1][1])/2)
  draw_curl_bar(d,center,option.startswith('ez-'))
  draw_curl_grip_inset(d,option.startswith('ez-'),option.endswith('pronated'))
 elif kind=='machine-preacher-curl':
  # The supported upper arm and machine lever share one fixed elbow pivot.
  hip=(289,327);shoulder=(263,218);head=(259,181);elbow=(375,330)
  d.rounded_rectangle((245,339,341,353),5,fill=FAR)
  for x in (258,327):line(d,(x,353),(x,455),FAR,6)
  line(d,(300,266),(393,352),FAR,20)
  line(d,(375,351),(375,455),FAR,7)
  limb(d,[hip,(357,353),(378,444)],BLUE,16)
  line(d,(378,444),(405,448),INK,8)
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  hand=polar(elbow,70,1.35-3.55*u)
  if abs(math.dist(elbow,hand)-70)>1e-6:raise ValueError('Preacher machine lever radius changed')
  limb(d,[shoulder,elbow,hand],INK,11)
  d.ellipse((elbow[0]-12,elbow[1]-12,elbow[0]+12,elbow[1]+12),fill=FAR,outline=INK,width=3)
  d.rounded_rectangle((hand[0]-13,hand[1]-6,hand[0]+13,hand[1]+6),3,fill=FAR,outline=INK,width=2)
  d.rounded_rectangle((444,335,479,418),5,fill=FAR,outline=INK,width=2)
  line(d,(393,330),(456,374),FAR,4)
  d.text((45,181),'ELBOW / LEVER PIVOT ALIGNED',font=FONTS[14],fill=MUTED)
 elif kind=='supported-bar-curl':
  spider=option=='spider'
  if spider:
   d.line((185,346,344,252),fill=FAR,width=18)
   for x in (204,331):d.line((x,354,x,457),fill=FAR,width=7)
   shoulder=(222,302);hip=(315,248);head=(181,315);elbow=(229,357)
  else:
   d.rounded_rectangle((245,339,341,353),5,fill=FAR)
   for x in (258,327):d.line((x,353,x,456),fill=FAR,width=7)
   d.line((300,266,393,352),fill=FAR,width=20)
   d.line((375,351,375,456),fill=FAR,width=8)
   shoulder=(263,218);hip=(289,327);head=(259,181);elbow=(375,330)
  limb(d,[hip,(357,353),(378,444)],BLUE,16)
  line(d,(378,444),(405,448),INK,8)
  line(d,hip,shoulder,BLUE,27);line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  hand=polar(elbow,70,(1.35-2.55*u) if spider else (1.35-3.55*u))
  if abs(math.dist(elbow,hand)-70)>1e-6:raise ValueError('Supported bar curl forearm changed')
  limb(d,[shoulder,elbow,hand],INK,11)
  draw_curl_bar(d,hand,True)
  draw_curl_grip_inset(d,True,False,upper=spider)
 elif kind=='bar-wrist-curl':
  # Supported forearm; only the wrist turns the shared straight bar.
  d.rounded_rectangle((145,313,362,333),6,fill=FAR)
  for x in (167,340):d.line((x,333,x,456),fill=FAR,width=8)
  elbow=(178,297);wrist=(353,297)
  line(d,elbow,wrist,BLUE,24)
  hand=polar(wrist,49,.55-.98*u)
  if abs(math.dist(wrist,hand)-49)>1e-6:raise ValueError('Bar wrist support changed')
  line(d,wrist,hand,INK,16)
  draw_curl_bar(d,hand,False)
  draw_curl_grip_inset(d,False,option=='pronated',upper=True)
 elif kind=='dead-bug':
  # Floor-backed trunk remains fixed as opposite arm and leg lengthen.
  hip=(285,407);shoulder=(204,407);head=(166,409)
  line(d,hip,shoulder,BLUE,27)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  near_elbow=polar(shoulder,62,-math.pi/2-.18*u)
  near_hand=polar(near_elbow,61,-math.pi/2-.18*u)
  far_elbow=polar(shoulder,62,-math.pi/2+1.1*u)
  far_hand=polar(far_elbow,61,-math.pi/2+1.1*u)
  limb(d,[shoulder,far_elbow,far_hand],BLUE,11)
  limb(d,[shoulder,near_elbow,near_hand],INK,12)
  near_knee=polar(hip,73,-.92+.7*u)
  near_foot=polar(near_knee,67,.65-.3*u)
  far_knee=polar(hip,73,-.92)
  far_foot=polar(far_knee,67,.65)
  limb(d,[hip,far_knee,far_foot],FAR,13)
  limb(d,[hip,near_knee,near_foot],BLUE,16)
  draw_opposite_limb_inset(d)
 elif kind=='kneeling-rollout':
  # Knees remain fixed; shoulders follow a constant-length braced trunk.
  knee=(218,440);hip=(220+20*u,350+20*u)
  shoulder=polar(hip,113,-1.2+.58*u)
  head=(shoulder[0]-24,shoulder[1]-25)
  hand=(340+100*u,431) if option=='wheel' else (350+90*u,389)
  elbow=ik(shoulder,hand,110,110,side=1)
  limb(d,[hip,knee,(244,443)],FAR,17)
  line(d,hip,shoulder,BLUE,27)
  d.ellipse((head[0]-17,head[1]-17,head[0]+17,head[1]+17),fill=INK)
  limb(d,[shoulder,elbow,hand],INK,12)
  if option=='wheel':
   wheel=(hand[0]+6,hand[1])
   d.ellipse((wheel[0]-24,wheel[1]-24,wheel[0]+24,wheel[1]+24),fill=FAR,outline=INK,width=5)
   d.ellipse((wheel[0]-5,wheel[1]-5,wheel[0]+5,wheel[1]+5),fill=INK)
   d.line((wheel[0],wheel[1],wheel[0]+17*math.cos(4*u),wheel[1]+17*math.sin(4*u)),fill=INK,width=3)
   d.line((hand[0]-14,hand[1],hand[0]+25,hand[1]),fill=INK,width=6)
  else:
   center=(hand[0]+12,hand[1]+22)
   d.ellipse((center[0]-48,center[1]-48,center[0]+48,center[1]+48),fill=FAR,outline=INK,width=4)
   d.line((center[0]-17*math.cos(2*u),center[1]-17*math.sin(2*u),center[0]+17*math.cos(2*u),center[1]+17*math.sin(2*u)),fill=INK,width=3)
   d.line((hand[0]-14,hand[1],hand[0]+25,hand[1]),fill=INK,width=8)
 elif kind=='body-saw':
  # Forearms fixed, both feet on sliders; a small straight-body shift.
  elbow=(210,436);shoulder=(213+18*u,356)
  foot=(431+18*u,436);hip=(shoulder[0]+.66*(foot[0]-shoulder[0]),shoulder[1]+.66*(foot[1]-shoulder[1]))
  limb(d,[shoulder,hip,foot],BLUE,23)
  limb(d,[shoulder,elbow,(181,436)],INK,12)
  d.rounded_rectangle((foot[0]-23,442,foot[0]+28,450),3,fill=INK)
  d.rounded_rectangle((foot[0]-24,452,foot[0]+28,456),2,fill=FAR)
  d.ellipse((shoulder[0]-35,shoulder[1]-17,shoulder[0]-3,shoulder[1]+17),fill=INK)
 elif kind=='plank-shoulder-tap':
  # One fixed support hand; the other hand reaches the opposite shoulder.
  shoulder=(241,353);hip=(361,394);foot=(448,439)
  limb(d,[shoulder,hip,foot],BLUE,24)
  line(d,foot,(467,445),INK,9)
  support=(230,437);limb(d,[shoulder,(236,395),support],INK,12)
  # The lifted arm is drawn behind the near support arm.
  lifted=(247+27*u,437-79*u)
  elbow=ik(shoulder,lifted,58,58,side=-1)
  limb(d,[shoulder,elbow,lifted],FAR,11)
  d.ellipse((204,337,237,370),fill=INK)
  d.text((65,290),'ONE HAND STAYS PLANTED',font=FONTS[14],fill=MUTED)
 elif kind in ('bridge-single','bridge-frog','bridge-barbell'):
  shoulder=(170,435);hip=polar(shoulder,135,-.31*u)
  if kind=='bridge-frog':
   # Soles touch; knees open in a plan-view inset while pelvis rises.
   foot=(420,447);knee=ik(hip,foot,89,89,side=1)
   limb(d,[hip,knee,foot],BLUE,17)
   d.rounded_rectangle((42,282,181,362),7,fill=BG,outline=FAR,width=2)
   d.text((50,288),'TOP VIEW',font=FONTS[14],fill=MUTED)
   d.line((83,331,122,309),fill=BLUE,width=8);d.line((122,309,158,331),fill=BLUE,width=8)
   d.line((83,331,120,345),fill=BLUE,width=8);d.line((158,331,120,345),fill=BLUE,width=8)
   d.text((52,346),'SOLES TOGETHER',font=FONTS[14],fill=INK)
  else:
   foot=(408,447);knee=ik(hip,foot,85,85,side=1)
   limb(d,[hip,knee,foot],BLUE,17)
   if kind=='bridge-single':
    # Contralateral leg stays elevated and moves with the pelvis.
    free_knee=polar(hip,82,-.6);free_foot=polar(free_knee,78,-.6)
    limb(d,[hip,free_knee,free_foot],FAR,13)
    d.text((53,285),'OTHER LEG STAYS UP',font=FONTS[14],fill=MUTED)
  line(d,foot,(438,450),INK,10)
  body(d,hip,shoulder,(140,447))
  if kind=='bridge-barbell':
   # Padded bar remains centered over pelvis, hands secure the shaft.
   bar=(hip[0],hip[1]-19)
   d.line((bar[0]-76,bar[1],bar[0]+76,bar[1]),fill=INK,width=7)
   for x in (bar[0]-58,bar[0]+58):
    d.rounded_rectangle((x-8,bar[1]-22,x+8,bar[1]+22),4,fill=FAR,outline=INK,width=2)
   d.rounded_rectangle((bar[0]-23,bar[1]-10,bar[0]+23,bar[1]+10),4,fill=FAR)
   hand=(bar[0]-32,bar[1]);elbow=ik(shoulder,hand,75,65,side=-1)
   limb(d,[shoulder,elbow,hand],INK,10)
  else:limb(d,[shoulder,(218,443),(268,447)],FAR,11)
 elif kind=='bird-dog':
  # Pelvis/trunk, near hand and opposite knee stay planted. The far arm and
  # near leg reach with invariant segment lengths and no hip rotation.
  hip=(350,302);shoulder=(238,293);head=(196,288)
  support_hand=(230,435);support_knee=(358,437)
  far_hand=(220-105*u,435-120*u)
  far_elbow=ik(shoulder,far_hand,76,76,side=1)
  if any(abs(math.dist(a,b)-76)>1e-6 for a,b in ((shoulder,far_elbow),(far_elbow,far_hand))):raise ValueError('Bird dog reaching arm changed length')
  limb(d,[shoulder,far_elbow,far_hand],FAR,12)
  limb(d,[hip,(360,362),support_knee],FAR,16)
  line(d,support_knee,(388,439),FAR,10)
  line(d,hip,shoulder,BLUE,26)
  limb(d,[shoulder,(240,361),support_hand],INK,14)
  angle=1.4-.95*u
  working_knee=polar(hip,76,angle)
  working_foot=polar(working_knee,64,angle+.17)
  if abs(math.dist(hip,working_knee)-76)>1e-6 or abs(math.dist(working_knee,working_foot)-64)>1e-6:raise ValueError('Bird dog working leg changed length')
  if working_foot[1]>452 or working_foot[0]>485:raise ValueError('Bird dog foot lost clearance')
  limb(d,[hip,working_knee,working_foot],BLUE,17)
  d.ellipse((head[0]-20,head[1]-17,head[0]+17,head[1]+17),fill=INK)
  d.line((215,435,248,435),fill=INK,width=9)
  draw_opposite_limb_inset(d)
 elif kind=='hanging-raise':
  # Bar/hand/shoulder supports remain fixed. Pelvis rotates slightly while
  # bent knees or straight legs rise without foot-ground contact or swing.
  d.line((190,75,190,460),fill=FAR,width=8)
  d.line((410,75,410,460),fill=FAR,width=8)
  d.line((190,96,410,96),fill=INK,width=8)
  shoulder=(300,190);head=(300,155)
  hip=polar(shoulder,110,math.pi/2-.12*u)
  for offset,color in ((-8,FAR),(8,INK)):
   start=(shoulder[0]+offset,shoulder[1]);hand=(300+offset,96)
   elbow=(300+offset,143)
   if abs(math.dist(start,elbow)-47)>1e-6 or abs(math.dist(elbow,hand)-47)>1e-6:raise ValueError('Hanging raise hand support changed')
   limb(d,[start,elbow,hand],color,11)
   d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=INK)
  line(d,shoulder,hip,BLUE,28)
  line(d,shoulder,head,BLUE,11)
  d.ellipse((head[0]-19,head[1]-20,head[0]+19,head[1]+20),fill=INK)
  angle=math.pi/2-1.45*u
  for offset,color in ((-8,FAR),(8,BLUE)):
   start=(hip[0]+offset,hip[1]);knee=polar(start,70,angle)
   shin_angle=angle if option=='straight-leg' else math.pi/2+.08*u
   foot=polar(knee,65,shin_angle)
   if abs(math.dist(start,knee)-70)>1e-6 or abs(math.dist(knee,foot)-65)>1e-6:raise ValueError('Hanging raise leg changed length')
   if foot[1]>=456 or foot[0]>482:raise ValueError('Hanging raise lost clearance')
   limb(d,[start,knee,foot],color,15)
   line(d,foot,(foot[0]+17,foot[1]+2),INK,8)
 elif kind=='suspended-pull':
  # Hands and bar stay fixed; the body rises without a foot support or kip.
  rise=93*u;bar_y=130
  d.line((155,77,155,459),fill=FAR,width=8)
  d.line((445,77,445,459),fill=FAR,width=8)
  d.line((155,bar_y,445,bar_y),fill=INK,width=8)
  if option=='neutral':
   for x in (210,390):d.line((x,bar_y-10,x,bar_y+10),fill=INK,width=7)
  if option=='band-assisted':
   d.line((292,bar_y-3,309,bar_y-3),fill=FAR,width=6)
   d.line((292,bar_y,339,436-rise),fill=FAR,width=5)
   d.line((309,bar_y,367,436-rise),fill=FAR,width=5)
   d.line((339,436-rise,367,436-rise),fill=FAR,width=5)
  if option in ('assisted-overhand','assisted-underhand'):
   for x in (235,365):line(d,(x,237),(x,453),FAR,5)
   d.rounded_rectangle((243,396-rise,357,410-rise),4,fill=FAR,outline=INK,width=2)
   d.rounded_rectangle((460,316+rise*.35,492,399+rise*.35),5,fill=FAR,outline=INK,width=2)
   line(d,(365,405-rise),(474,356+rise*.35),FAR,3)
   d.text((46,285),'COUNTERWEIGHT / KNEE PAD',font=FONTS[14],fill=MUTED)
  head=(300,203-rise);shoulder_y=242-rise;hip=(300,350-rise)
  limb(d,[hip,(258,395-rise),(248,439-rise)],BLUE,17)
  line(d,(248,439-rise),(229,443-rise),INK,8)
  limb(d,[hip,(342,395-rise),(352,439-rise)],BLUE,17)
  line(d,(352,439-rise),(371,443-rise),INK,8)
  line(d,hip,(300,shoulder_y),BLUE,29)
  d.line((269,shoulder_y,331,shoulder_y),fill=BLUE,width=23)
  line(d,(300,shoulder_y),head,BLUE,11)
  d.ellipse((head[0]-19,head[1]-20,head[0]+19,head[1]+20),fill=INK)
  if option in ('weight-overhand','weight-underhand'):
   load=(300,hip[1]+35)
   d.line((276,hip[1]-3,324,hip[1]-3),fill=INK,width=5)
   d.line((300,hip[1],load[0],load[1]-18),fill=INK,width=4)
   d.ellipse((load[0]-18,load[1]-18,load[0]+18,load[1]+18),fill=FAR,outline=INK,width=3)
   d.ellipse((load[0]-5,load[1]-5,load[0]+5,load[1]+5),fill=BG)
  for side in (-1,1):
   start=(300+side*31,shoulder_y);hand=(300+side*90,bar_y)
   elbow=ik(start,hand,65,65,side=1 if side==-1 else -1)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((start,elbow,65),(elbow,hand,65))):raise ValueError('Pull-up arm changed length')
   limb(d,[start,elbow,hand],BLUE if side==1 else FAR,12)
   d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=INK)
  grip='neutral' if option=='neutral' else 'underhand' if option in ('underhand','weight-underhand','assisted-underhand') else 'pronated'
  draw_grip_inset(d,grip)
 elif kind=='half-kneeling-cable-pulldown':
  # Rear knee pad and lead foot remain fixed while one handle descends from
  # the high pulley toward the shoulder with no trunk lean.
  anchor=(132,111);hip=(340,332);shoulder=(340,213);head=(340,174)
  d.line((113,87,113,456),fill=FAR,width=7)
  d.rounded_rectangle((96,334,128,421),5,fill=FAR,outline=INK,width=2)
  for y in (350,369,388,407):d.line((99,y,125,y),fill=INK,width=2)
  d.ellipse((anchor[0]-12,anchor[1]-12,anchor[0]+12,anchor[1]+12),fill=FAR,outline=INK,width=3)
  d.rounded_rectangle((243,442,315,454),5,fill=FAR)
  limb(d,[hip,(296,438),(259,443)],FAR,17);line(d,(259,443),(241,447),INK,8)
  limb(d,[hip,(377,389),(391,444)],BLUE,17);line(d,(391,444),(413,448),INK,8)
  body(d,hip,shoulder,head)
  limb(d,[shoulder,(352,290),(350,352)],FAR,10)
  hand=(226+84*u,148+110*u)
  elbow=ik(shoulder,hand,77,69,side=1)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((shoulder,elbow,77),(elbow,hand,69))):raise ValueError('Half-kneeling pulldown arm changed length')
  if hip!=(340,332) or anchor!=(132,111):raise ValueError('Half-kneeling pulldown support changed')
  d.line([xy(anchor),xy(hand)],fill=INK,width=3)
  limb(d,[shoulder,elbow,hand],INK,11)
  d.rounded_rectangle((hand[0]-7,hand[1]-7,hand[0]+7,hand[1]+7),3,fill=FAR,outline=INK,width=2)
 elif kind=='machine-lever-lat':
  # Independent overhead levers descend on constant-radius arcs; the seated
  # trunk, thigh restraint and pivots stay fixed.
  hip=(300,337);shoulder=(300,218);head=(300,176)
  d.rounded_rectangle((255,344,345,358),4,fill=FAR)
  for x in (266,334):line(d,(x,358),(x,455),FAR,6)
  d.rounded_rectangle((234,365,366,378),4,fill=FAR)
  for side in (-1,1):
   limb(d,[hip,(300+side*47,396),(300+side*60,445)],BLUE,16)
   line(d,(300+side*60,445),(300+side*78,448),INK,8)
  line(d,hip,shoulder,BLUE,28);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  for side in (-1,1):
   pivot=(140,214) if side<0 else (460,214)
   angle=-1.0+.9*u
   hand=(pivot[0]-side*145*math.cos(angle),pivot[1]+145*math.sin(angle))
   line(d,pivot,hand,FAR,7)
   d.ellipse((pivot[0]-9,pivot[1]-9,pivot[0]+9,pivot[1]+9),outline=INK,width=3)
   d.rounded_rectangle((hand[0]-8,hand[1]-6,hand[0]+8,hand[1]+6),3,fill=FAR,outline=INK,width=2)
   start=(300+side*30,shoulder[1])
   elbow=ik(start,hand,78,75,side=1 if side<0 else -1)
   if abs(math.dist(pivot,hand)-145)>1e-6 or hand[1]>shoulder[1]+8:raise ValueError('Machine lat lever path changed')
   limb(d,[start,elbow,hand],INK if side>0 else FAR,11)
  d.text((45,181),'SEAT / THIGH PAD / TWO LEVERS',font=FONTS[14],fill=MUTED)
 elif kind=='narrow-lat-pulldown':
  # Oblique-depth arm rig: both elbows stay lateral to the seated torso.
  # The V-bar and forearms run in front of the chest rather than through it.
  pulley=(300,103);bar_y=143+96*u
  d.line((300,80,300,456),fill=FAR,width=6)
  d.line((300,100,473,100),fill=FAR,width=5)
  d.rounded_rectangle((455,338,489,421),5,fill=FAR,outline=INK,width=2)
  for y in (353,372,391,410):d.line((459,y,485,y),fill=INK,width=2)
  d.ellipse((287,90,313,116),fill=FAR,outline=INK,width=3)
  d.rounded_rectangle((253,348,347,362),4,fill=FAR)
  for x in (265,336):d.line((x,362,x,456),fill=FAR,width=7)
  hip=(300,337);neck=(300,218);head=(300,174)
  limb(d,[hip,(247,397),(232,445)],BLUE,17);line(d,(232,445),(213,448),INK,8)
  limb(d,[hip,(353,397),(368,445)],BLUE,17);line(d,(368,445),(387,448),INK,8)
  d.rounded_rectangle((237,369,363,381),4,fill=FAR,outline=INK,width=2)
  line(d,hip,neck,BLUE,29)
  d.line((269,218,331,218),fill=BLUE,width=23)
  line(d,neck,head,BLUE,11)
  d.ellipse((281,154,319,194),fill=INK)
  # Depth is solved from fixed segment lengths; projected elbows stay outside
  # the trunk at every frame, while the neutral handles remain close together.
  for side in (-1,1):
   shoulder=(300+side*31,218,0)
   elbow_x=300+side*75;elbow_y=190+44*u
   elbow_z=math.sqrt(76**2-(elbow_x-shoulder[0])**2-(elbow_y-shoulder[1])**2)
   hand_x=300+side*22;hand_y=bar_y
   projected=math.hypot(hand_x-elbow_x,hand_y-elbow_y)
   hand_z=elbow_z+math.sqrt(80**2-projected**2)
   elbow=(elbow_x,elbow_y,elbow_z);hand=(hand_x,hand_y,hand_z)
   if abs(math.dist(shoulder,elbow)-76)>1e-6 or abs(math.dist(elbow,hand)-80)>1e-6:raise ValueError('Narrow pulldown arm length changed')
   if side*(elbow_x-300)<70 or hand_z<=elbow_z:raise ValueError('Narrow pulldown elbow/depth path changed')
   limb(d,[(shoulder[0],shoulder[1]),(elbow_x,elbow_y),(hand_x,hand_y)],INK if side>0 else FAR,12)
   d.rounded_rectangle((hand_x-6,hand_y-7,hand_x+6,hand_y+7),3,fill=INK)
  d.line((300,116,300,bar_y-12),fill=INK,width=3)
  d.line((300,bar_y-12,278,bar_y+2),fill=INK,width=6)
  d.line((300,bar_y-12,322,bar_y+2),fill=INK,width=6)
  draw_grip_inset(d,'vbar')
  d.text((46,248),'ELBOWS OUTSIDE TRUNK',font=FONTS[14],fill=MUTED)
  # The side inset makes the out-of-plane cable and handle clearance explicit.
  d.rounded_rectangle((40,370,185,456),7,fill=BG,outline=FAR,width=2)
  d.text((48,375),'SIDE / CABLE IN FRONT',font=FONTS[14],fill=MUTED)
  d.ellipse((63,390,73,400),outline=INK,width=2)
  d.ellipse((137,413,153,429),fill=BLUE)
  d.line((145,430,145,448),fill=BLUE,width=9)
  side_handle=(116,401+42*u)
  d.line((68,395,side_handle[0],side_handle[1]),fill=INK,width=2)
  d.line((side_handle[0]-6,side_handle[1],side_handle[0]+6,side_handle[1]),fill=INK,width=5)
  if side_handle[0]>=137:raise ValueError('Narrow pulldown handle lost face clearance')
 elif kind=='machine-lat-pulldown':
  # Front view preserves a wide two-hand bar grip, fixed seated trunk,
  # anchored thighs, overhead pulley and bilateral elbow flexion path.
  pulley=(300,103);bar_y=139+101*u
  d.line((300,80,300,456),fill=FAR,width=6)
  d.line((300,100,473,100),fill=FAR,width=5)
  d.rounded_rectangle((455,338,489,421),5,fill=FAR,outline=INK,width=2)
  for y in (353,372,391,410):d.line((459,y,485,y),fill=INK,width=2)
  d.ellipse((pulley[0]-13,pulley[1]-13,pulley[0]+13,pulley[1]+13),fill=FAR,outline=INK,width=3)
  d.rounded_rectangle((253,348,347,362),4,fill=FAR)
  for x in (265,336):d.line((x,362,x,456),fill=FAR,width=7)
  hip=(300,337);neck=(300,218);head=(300,174)
  limb(d,[hip,(247,397),(232,445)],BLUE,17);line(d,(232,445),(213,448),INK,8)
  limb(d,[hip,(353,397),(368,445)],BLUE,17);line(d,(368,445),(387,448),INK,8)
  d.rounded_rectangle((237,369,363,381),4,fill=FAR,outline=INK,width=2)
  line(d,hip,neck,BLUE,29)
  scap_y=215-9*(1-u)
  d.line((269,scap_y,331,scap_y),fill=BLUE,width=23)
  line(d,neck,head,BLUE,11)
  d.ellipse((head[0]-19,head[1]-20,head[0]+19,head[1]+20),fill=INK)
  single=option=='unilateral'
  d.line((300,116,390 if single else 300,bar_y),fill=INK,width=3)
  if single:
   limb(d,[(269,scap_y),(253,285),(269,340)],FAR,10)
   d.rounded_rectangle((380,bar_y-6,400,bar_y+6),3,fill=FAR,outline=INK,width=2)
  else:
   d.line((181,bar_y,419,bar_y),fill=INK,width=7)
   if option=='neutral':
    for x in (210,390):d.line((x,bar_y-9,x,bar_y+9),fill=INK,width=7)
  for side in ((1,) if single else (-1,1)):
   start=(300+side*31,scap_y);hand=(300+side*90,bar_y)
   elbow=ik(start,hand,76,74,side=1 if side==-1 else -1)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((start,elbow,76),(elbow,hand,74))):raise ValueError('Lat pulldown arm changed length')
   limb(d,[start,elbow,hand],BLUE if side==1 else FAR,12)
   d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=INK)
  if option in ('neutral','underhand'):draw_grip_inset(d,option)
 elif kind=='cable-straight-arm':
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
  if option=='rope':
   split=add(hand_center,(20,-20))
   d.line([xy(anchor),xy(split)],fill=INK,width=3)
   for dx in (-9,9):d.line([xy(split),xy(add(hand_center,(dx,0)))],fill=FAR,width=4)
  else:d.line([xy(anchor),xy(add(hand_center,(9,0)) if single else hand_center)],fill=INK,width=3)
  for offset,color in (((9,INK),) if single else ((-9,FAR),(9,INK))):
   start=(shoulder[0]+offset,shoulder[1]);elbow=polar(start,73,angle);hand=polar(elbow,63,angle+.06)
   if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((start,elbow,73),(elbow,hand,63))):raise ValueError('Cable straight-arm length changed')
   if hand[1]<108 or hand[1]>355:raise ValueError('Cable straight-arm path changed')
   limb(d,[start,elbow,hand],color,11)
  h=add(hand_center,(9,0)) if single else hand_center
  if option=='rope':
   for dx in (-9,9):d.rounded_rectangle((h[0]+dx-6,h[1]-5,h[0]+dx+6,h[1]+5),3,fill=FAR,outline=INK,width=2)
   draw_grip_inset(d,'rope',.25*u)
  else:d.rounded_rectangle((h[0]-15,h[1]-5,h[0]+15,h[1]+5),3,fill=FAR,outline=INK,width=2)
 elif kind=='low-cable-curl':
  # Low pulley, taut cable and elbow hinge are shared; the Bayesian variant
  # anchors behind the body with a fixed, gently extended upper arm.
  behind=option=='behind-body';single=option in ('unilateral','behind-body')
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
   if option=='rope-neutral':
    split=add(shared_hand,(25,21))
    d.line([xy(anchor),xy(split)],fill=INK,width=3)
    for dx in (-9,9):d.line([xy(split),xy(add(shared_hand,(dx,0)))],fill=FAR,width=4)
   else:d.line([xy(anchor),xy(shared_hand)],fill=INK,width=3)
  for offset,color in (((9,INK),) if single else ((-9,FAR),(9,INK))):
   start=(shoulder[0]+offset,shoulder[1]);elbow=((272 if behind else 321)+offset,294)
   angle=math.pi/2-2.24*u
   hand=polar(elbow,66,angle)
   if abs(math.dist(elbow,hand)-66)>1e-6 or elbow[1]!=294:raise ValueError('Cable curl elbow or forearm changed')
   if single:d.line([xy(anchor),xy(hand)],fill=INK,width=3)
   limb(d,[start,elbow,hand],color,11)
   if single or option=='rope-neutral':d.rounded_rectangle((hand[0]-7,hand[1]-5,hand[0]+7,hand[1]+5),3,fill=FAR,outline=INK,width=2)
  if not single and option!='rope-neutral':d.rounded_rectangle((shared_hand[0]-15,shared_hand[1]-5,shared_hand[0]+15,shared_hand[1]+5),3,fill=FAR,outline=INK,width=2)
  if option=='rope-neutral':draw_grip_inset(d,'neutral')
  elif option=='reverse':draw_grip_inset(d,'reverse')
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
  if option=='single':
   limb(d,[hip,(358,325),(366,401)],FAR,13)
   line(d,(366,401),(385,403),FAR,7)
   d.text((45,181),'OTHER LEG RESTS / HIPS LEVEL',font=FONTS[14],fill=MUTED)
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
  if option=='single':
   limb(d,[hip,(389,302),(467,302)],FAR,13)
   line(d,(467,302),(484,304),FAR,7)
   d.text((45,181),'OTHER LEG RESTS / PELVIS LEVEL',font=FONTS[14],fill=MUTED)
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
 elif kind=='supported-machine-row':
  high=option=='high';single=option=='single'
  hip=(348,340);shoulder=(345,219);head=(345,180)
  d.rounded_rectangle((319,350,387,364),4,fill=FAR)
  for x in (330,377):line(d,(x,364),(x,455),FAR,6)
  d.rounded_rectangle((324,237,339,326),5,fill=FAR,outline=INK,width=2)
  for side in (-1,1):
   limb(d,[hip,(348+side*49,390),(348+side*64,445)],BLUE,16)
   line(d,(348+side*64,445),(348+side*83,448),INK,8)
  line(d,hip,shoulder,BLUE,28);line(d,shoulder,head,BLUE,10)
  d.ellipse((head[0]-18,head[1]-18,head[0]+18,head[1]+18),fill=INK)
  if high:
   pivot=(370,110);radius=195;angle=2.266-.488*u
   label='HIGH LEVER / PLATE LOADED'
  else:
   pivot=(300,420);radius=149;angle=-1.91+.68*u
   label='SINGLE ARM / CHEST PAD' if single else 'CHEST PAD / PIVOTING LEVER'
  hand=polar(pivot,radius,angle)
  line(d,pivot,hand,FAR,7)
  d.ellipse((pivot[0]-9,pivot[1]-9,pivot[0]+9,pivot[1]+9),outline=INK,width=3)
  if high:
   plate=(pivot[0]+.15*(hand[0]-pivot[0]),pivot[1]+.15*(hand[1]-pivot[1]))
   d.ellipse((plate[0]-16,plate[1]-16,plate[0]+16,plate[1]+16),fill=FAR,outline=INK,width=3)
   d.ellipse((plate[0]-5,plate[1]-5,plate[0]+5,plate[1]+5),fill=BG)
  if single:limb(d,[(shoulder[0]-9,shoulder[1]),(310,274),(319,315)],FAR,10)
  for offset,color in (((9,INK),) if single else ((-9,FAR),(9,INK))):
   start=(shoulder[0]+offset,shoulder[1])
   endpoint=(hand[0]+offset,hand[1])
   elbow=ik(start,endpoint,86,79,side=1)
   if abs(math.dist(pivot,hand)-radius)>1e-6 or elbow[0]>hip[0]+100:raise ValueError('Machine row lever or elbow path changed')
   limb(d,[start,elbow,endpoint],color,11)
   d.rounded_rectangle((endpoint[0]-7,endpoint[1]-7,endpoint[0]+7,endpoint[1]+7),3,fill=FAR,outline=INK,width=2)
  d.text((45,181),label,font=FONTS[14],fill=MUTED)
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
  if option=='wide':
   d.rounded_rectangle((42,153,191,240),7,fill=BG,outline=FAR,width=2)
   d.text((49,160),'FRONT / WIDE BAR',font=FONTS[14],fill=MUTED)
   line(d,(58,197),(175,197),INK,5)
   for x in (69,164):
    d.rounded_rectangle((x-7,185,x+7,209),3,fill=BLUE,outline=INK,width=2)
   d.text((49,215),'HANDS OUTSIDE SHOULDERS',font=FONTS[14],fill=INK)
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
  # A low anchor behind the athlete tensions the band or one cable handle.
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
  if cable:
   if option=='single':limb(d,[shoulder,(288,285),(289,350)],FAR,10)
   handle=polar((330 if option=='single' else 320,157),69,2.2-3.32*u)
   d.line([xy(anchor),xy(handle)],fill=INK,width=3)
  for offset,color in (((10,INK),) if cable and option=='single' else ((-10,FAR),(10,INK))):
   start=(shoulder[0]+offset,shoulder[1]);elbow=(320+offset,157)
   hand=polar(elbow,69,2.2-3.32*u)
   if abs(math.dist(elbow,hand)-69)>1e-6 or elbow[1]!=157:raise ValueError('Band overhead triceps elbow changed')
   if hand[1]<87 or hand[1]>227:raise ValueError('Band overhead triceps path changed')
   if not cable:d.line([xy(anchor),xy(hand)],fill=FAR,width=4)
   limb(d,[start,elbow,hand],color,11)
   if not cable:d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=BLUE)
  if cable:d.rounded_rectangle((handle[0]-15 if option!='single' else handle[0]-7,handle[1]-6,handle[0]+15 if option!='single' else handle[0]+7,handle[1]+6),3,fill=FAR,outline=INK,width=2)
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
  angle=-1.1+2.4*u
  if cable:
   if option=='single':
    limb(d,[shoulder,(287,290),(292,353)],FAR,10)
    cable_end=polar((331,294),69,angle)
   else:cable_end=polar((321,294),69,angle)
   if option=='rope':
    split=add(cable_end,(13,-22))
    d.line([xy(anchor),xy(split)],fill=INK,width=3)
    for dx in (-10,10):d.line([xy(split),xy(add(cable_end,(dx,0)))],fill=FAR,width=4)
   else:d.line([xy(anchor),xy(cable_end)],fill=INK,width=3)
  for offset,color in (((10,INK),) if cable and option=='single' else ((-10,FAR),(10,INK))):
   start=(shoulder[0]+offset,shoulder[1]);elbow=(321+offset,294)
   hand=polar(elbow,69,angle)
   if abs(math.dist(elbow,hand)-69)>1e-6 or elbow[1]!=294:raise ValueError('Band pushdown elbow path changed')
   if not cable:d.line([xy(anchor),xy(hand)],fill=FAR,width=4)
   limb(d,[start,elbow,hand],color,11)
   if cable and option in ('single','rope'):d.rounded_rectangle((hand[0]-6,hand[1]-7,hand[0]+6,hand[1]+7),3,fill=FAR,outline=INK,width=2)
   else:d.ellipse((hand[0]-6,hand[1]-6,hand[0]+6,hand[1]+6),fill=BLUE)
  if cable and option not in ('single','rope'):
   if option=='vbar':
    d.line((cable_end[0],cable_end[1]-6,cable_end[0]-13,cable_end[1]+8),fill=INK,width=5)
    d.line((cable_end[0],cable_end[1]-6,cable_end[0]+13,cable_end[1]+8),fill=INK,width=5)
   else:d.rounded_rectangle((cable_end[0]-16,cable_end[1]-5,cable_end[0]+16,cable_end[1]+5),3,fill=FAR,outline=INK,width=2)
  if cable and option in ('rope','vbar','reverse'):
   draw_grip_inset(d,{'rope':'rope','vbar':'vbar','reverse':'supinated'}[option],u)
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
  hands=[]
  for offset,color in ((-13,FAR),(13,INK)):
   elbow=(290+offset,263);arm_start=(shoulder[0]+offset,shoulder[1])
   angle=2.85-u*4.25
   hand=polar(elbow,72,angle)
   if abs(math.dist(elbow,hand)-72)>1e-6 or math.dist(hand,head)<46:raise ValueError('Skull crusher face clearance changed')
   limb(d,[arm_start,elbow,hand],color,11)
   hands.append(hand)
   if option!='ez':weight(d,hand,hammer=True)
  if option=='ez':
   center=((hands[0][0]+hands[1][0])/2,(hands[0][1]+hands[1][1])/2)
   draw_curl_bar(d,center,True)
   draw_curl_grip_inset(d,True,False,upper=True)
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
  if option=='barbell':
   bar_y=shoulder[1]+6
   d.line((shoulder[0]-81,bar_y,shoulder[0]+81,bar_y),fill=INK,width=6)
   for px in (shoulder[0]-71,shoulder[0]+71):d.rounded_rectangle((px-8,bar_y-23,px+8,bar_y+23),3,fill=FAR,outline=INK,width=2)
   d.rounded_rectangle((shoulder[0]-16,bar_y-7,shoulder[0]+16,bar_y+7),3,fill=BLUE,outline=INK,width=2)
   for side,color in ((-1,FAR),(1,INK)):
    grip=(shoulder[0]+side*31,bar_y)
    elbow=(shoulder[0]+side*42,shoulder[1]+42)
    limb(d,[shoulder,elbow,grip],color,9)
    d.ellipse((grip[0]-6,grip[1]-6,grip[0]+6,grip[1]+6),fill=INK)
   if abs(bar_y-(shoulder[1]+6))>1e-6 or lead_ankle!=(390,389):raise ValueError('Barbell step-up support or bar contact changed')
   d.text((45,187),'BAR / UPPER BACK',font=FONTS[14],fill=MUTED)
  else:
   for offset,color in ((-35,FAR),(35,INK)):
    elbow=(shoulder[0]+offset,shoulder[1]+61)
    hand=(elbow[0]+5,elbow[1]+48)
    limb(d,[shoulder,elbow,hand],color,10)
    if option=='dumbbell':weight(d,hand)
 elif kind in ('split-squat','reverse-lunge','forward-lunge'):
  front_ankle=(393,440);front_toe=(432,450)
  if kind=='forward-lunge':
   # Plant the rear foot, step the lead foot clear of the floor, then lower.
   step=min(1,2*u);lower=max(0,min(1,2*u-1))
   rear_ankle=(260,440)
   front_ankle=(290+105*step,440-27*math.sin(math.pi*step))
   front_toe=(front_ankle[0]+39,front_ankle[1]+8)
   hip=(290+30*step,270+45*lower)
   if (.001<u<.499 and front_ankle[1]>=440) or rear_ankle!=(260,440):raise ValueError('Forward-lunge step or planted rear foot changed')
  elif kind=='reverse-lunge':
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
  shoulder=(hip[0]-4 if kind=='forward-lunge' else 316,hip[1]-112)
  head=(shoulder[0],hip[1]-145)
  if option=='smith':
   for rx in (211,441):
    d.line((rx,102,rx,453),fill=FAR,width=7)
    for stop_y in (276,415):d.line((rx-8,stop_y,rx+8,stop_y),fill=INK,width=3)
  body(d,hip,shoulder,head)
  if option in ('barbell','smith'):
   bar_y=shoulder[1]+6
   bar_left,bar_right=(211,441) if option=='smith' else (shoulder[0]-91,shoulder[0]+91)
   d.line((bar_left,bar_y,bar_right,bar_y),fill=INK,width=6)
   for px in ((bar_left+15,bar_right-15) if option=='smith' else (bar_left+10,bar_right-10)):
    d.rounded_rectangle((px-8,bar_y-23,px+8,bar_y+23),3,fill=FAR,outline=INK,width=2)
   d.rounded_rectangle((shoulder[0]-14,bar_y-7,shoulder[0]+14,bar_y+7),3,fill=BLUE,outline=INK,width=2)
   for side,color in ((-1,FAR),(1,INK)):
    grip=(shoulder[0]+side*31,bar_y)
    elbow=(shoulder[0]+side*43,shoulder[1]+43)
    limb(d,[shoulder,elbow,grip],color,9)
    d.ellipse((grip[0]-6,grip[1]-6,grip[0]+6,grip[1]+6),fill=INK)
   if option=='smith' and (shoulder[0]!=316 or (bar_left,bar_right)!=(211,441)):raise ValueError('Smith split squat bar left fixed path')
   d.text((45,185),'SMITH / VERTICAL BAR' if option=='smith' else 'BAR / UPPER BACK',font=FONTS[14],fill=MUTED)
  elif option in ('floor-dumbbell','rear-bench-dumbbell','dumbbell'):
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
  if option=='deficit':
   wrist=(270,409)
   for x in (248,292):
    d.rounded_rectangle((x-7,405,x+7,418),3,fill=FAR)
    line(d,(x,418),(x,444),FAR,5)
   d.text((42,249),'TWO FIXED PARALLETTES',font=FONTS[14],fill=MUTED)
  if option=='incline-bench':
   wrist=(270,365)
   d.rounded_rectangle((215,372,325,387),5,fill=FAR)
   for x in (235,305):d.line((x,387,x,460),fill=FAR,width=8)
  if option=='decline-bench':
   foot=(470,336)
   d.rounded_rectangle((425,344,505,359),5,fill=FAR)
   for x in (442,490):d.line((x,359,x,460),fill=FAR,width=8)
  top={'floor':335,'knees':345,'incline-bench':265,'decline-bench':345,'deficit':300,'close-grip':335,'weighted':335}[option]
  support=(420,440) if option=='knees' else foot
  shoulder_y=top+(138 if option=='deficit' else 49)*u
  body_length=math.hypot(support[0]-270,support[1]-top)
  shoulder=(support[0]-math.sqrt(body_length**2-(support[1]-shoulder_y)**2),shoulder_y)
  hip=(shoulder[0]+.68*(support[0]-shoulder[0]),shoulder[1]+.68*(support[1]-shoulder[1]))
  if abs(math.dist(shoulder,hip)-.68*body_length)>1e-6 or abs(math.dist(hip,support)-.32*body_length)>1e-6:raise ValueError('Push-up body segment changed length')
  elbow=ik(shoulder,wrist,56,56,side=1)
  limb(d,[shoulder,hip,support],BLUE,25)
  if option=='weighted':
   plate=(shoulder[0]+.48*(hip[0]-shoulder[0]),shoulder[1]+.48*(hip[1]-shoulder[1]))
   d.ellipse((plate[0]-19,plate[1]-18,plate[0]+19,plate[1]+18),fill=FAR,outline=INK,width=4)
   d.ellipse((plate[0]-5,plate[1]-5,plate[0]+5,plate[1]+5),fill=BG)
   d.text((42,249),'SECURED MID-BACK PLATE',font=FONTS[14],fill=MUTED)
  limb(d,[shoulder,elbow,wrist],INK,13)
  line(d,wrist,(wrist[0]-18,wrist[1]+2),INK,9)
  if option=='knees':
   line(d,support,foot,BLUE,14)
   line(d,foot,(492,449),INK,9)
  else:line(d,foot,(492,foot[1]+3),INK,9)
  head=(shoulder[0]-35,shoulder[1]-8)
  d.ellipse((head[0]-23,head[1]-17,head[0]+12,head[1]+17),fill=INK)
  d.line((head[0]-14,head[1]+12,head[0]-4,head[1]+12),fill=BG,width=3)
  if option=='close-grip':
   d.rounded_rectangle((43,266,191,359),7,fill=BG,outline=FAR,width=2)
   d.text((51,273),'TOP VIEW / HANDS',font=FONTS[14],fill=MUTED)
   d.rounded_rectangle((106,297,130,334),5,fill=BLUE)
   for x in (96,140):
    line(d,(x,305),(x,328),BLUE,7)
    d.ellipse((x-5,325,x+5,335),fill=INK)
   d.text((51,338),'NARROW / ELBOWS IN',font=FONTS[14],fill=INK)
 elif kind=='squat':
  hip=(302-72*u,294+68*u);shoulder=polar(hip,126,-math.pi/2+.32*u);head=polar(shoulder,33,-math.pi/2+.15*u)
  if option:d.rounded_rectangle((130,378,245,399),7,fill=FAR);d.line((150,399,150,452),fill=FAR,width=9);d.line((225,399,225,452),fill=FAR,width=9)
  knee=ik(hip,ankle,79,78);limb(d,[hip,knee,ankle]);line(d,ankle,(347,450),INK,10)
  elbow=polar(shoulder,60,-.1);hand=polar(elbow,57,-.1);limb(d,[shoulder,elbow,hand]);body(d,hip,shoulder,head)
 elif kind=='bench-hip-thrust':
  # Adapted from the read-only local hip-thrust candidate. The shoulder
  # contact and foot stay fixed while the hip moves around a rigid torso.
  d.rounded_rectangle((130,320,235,338),5,fill=FAR)
  for x in (149,218):d.line((x,338,x,460),fill=FAR,width=8)
  shoulder=(208,315);foot=(435,444)
  hip_y=365-50*u
  hip=(shoulder[0]+math.sqrt(128**2-(hip_y-shoulder[1])**2),hip_y)
  knee=ik(hip,foot,85,85,side=1)
  if any(abs(math.dist(a,b)-length)>1e-6 for a,b,length in ((shoulder,hip,128),(hip,knee,85),(knee,foot,85))):raise ValueError('Hip-thrust segment changed length')
  limb(d,[hip,knee,foot],BLUE,18)
  line(d,foot,(467,447),INK,10)
  body(d,hip,shoulder,(170,295))
  load=(hip[0],hip[1]-22)
  elbow=ik(shoulder,load,82,77,side=-1)
  hand=load
  if abs(math.dist(elbow,hand)-77)>1e-6 or abs(hand[0]-hip[0])>1e-6 or abs(hand[1]-(hip[1]-22))>1e-6:raise ValueError('Hip-thrust hand lost load contact')
  limb(d,[shoulder,elbow,hand],INK,10)
  if option=='barbell':
   # A padded bar follows the hip, held at both sides; a top inset shows its
   # actual transverse direction, which a sagittal silhouette cannot show.
   d.rounded_rectangle((load[0]-17,load[1]-9,load[0]+17,load[1]+9),4,fill=BLUE,outline=INK,width=2)
   d.ellipse((load[0]-21,load[1]-21,load[0]+21,load[1]+21),outline=INK,width=4)
   d.rounded_rectangle((43,185,223,260),5,fill=BG,outline=FAR,width=2)
   d.text((50,190),'TOP / PADDED BAR',font=FONTS[14],fill=MUTED)
   d.line((61,231,207,231),fill=INK,width=5)
   for px in (69,199):d.rounded_rectangle((px-8,215,px+8,247),3,fill=FAR,outline=INK,width=2)
   d.rounded_rectangle((119,222,150,240),4,fill=BLUE,outline=INK,width=2)
   for px in (103,166):d.rounded_rectangle((px-6,223,px+6,239),3,fill=INK)
   if abs(load[0]-hip[0])>1e-6 or abs(load[1]-(hip[1]-22))>1e-6:raise ValueError('Hip-thrust bar lost pelvis contact')
  else:weight(d,load)
  # Draw the near gripping hand last so the load cannot hide its contact.
  d.rounded_rectangle((hand[0]-6,hand[1]-5,hand[0]+6,hand[1]+5),3,fill=INK,outline=BG,width=1)
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
  elif template[0]=='zottman-curl':
   u,label=phase(t)
   turn=0 if t<=3 else (t-3 if t<4 else (1 if t<6 else (8-t)/2))
   draw_pose(d,'zottman-curl',turn,u)
  elif template[0]=='barbell-squat' and template[1]=='paused':
   u,label=paused_squat_phase(t);draw_pose(d,*template,u)
  elif template[0]=='barbell-horizontal-press' and template[1] in ('paused','spoto'):
   u,label=paused_bench_phase(t);draw_pose(d,*template,u)
  elif template[0]=='barbell-hinge' and template[1]=='paused':
   u,label=paused_deadlift_phase(t);draw_pose(d,*template,u)
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
 if template and template[0] in ('anchored-rotation','forearm-turn'):
  # The schema has no top/end-on value; avoid mislabeling these as side views.
  record['angle']='unspecified'
 if key=='single-arm-cable-lateral-raise':record['angle']='front'
 if key in ('seated-hip-abduction','seated-hip-adduction','standing-cable-hip-abduction','standing-cable-hip-adduction'):record['angle']='front'
 if key in ('high-cable-curl','cross-body-cable-triceps-extension'):record['angle']='front'
 if key in ('cable-face-pull','resistance-band-face-pull'):record['angle']='unspecified' # oblique main view with frontal inset
 if key=='band-clamshell':record['angle']='unspecified'
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
