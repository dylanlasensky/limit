"""Movement-family capability audit for exact-key videos still awaiting rendering.

These are engineering blockers, not safety reviews. The catalog's third cue is
retained in each record so distinct variations cannot silently share a reason.
"""

MOTION_GAPS = {
    'Ankle dorsiflexion': 'the heel-supported toe lift and controlled ankle return',
    'Ankle plantar flexion': 'the exact loaded or supported heel path around a fixed forefoot',
    'Anti-extension': 'the exact hand, knee or foot support, trunk bracing and limb or rollout path',
    'Back extension': 'pelvis pad contact, hip pivot and a controlled trunk return',
    'Chest fly': 'shoulder arc, elbow angle and bilateral or unilateral hand path',
    'Elbow extension': 'fixed upper arm, elbow hinge and full load path',
    'Elbow flexion': 'fixed or supported upper arm, elbow hinge and full load path',
    'Explosive horizontal press': 'separate loading, takeoff, flight and controlled landing phases',
    'Explosive press': 'leg drive, overhead transfer, lockout and catch or reset phases',
    'Face pull': 'elbow flare, shoulder rotation and hands reaching face level',
    'Hip abduction': 'stable pelvis with the moving leg travelling outward and returning',
    'Hip adduction': 'stable pelvis with the moving leg travelling inward and returning',
    'Hip extension': 'fixed trunk support and a hip-driven leg path without lumbar extension',
    'Hip hinge': 'fixed foot pressure, hip travel, trunk angle and load path through the hinge',
    'Hip thrust': 'secure shoulder or floor contact, the working foot contact and a hip-driven ascent and return',
    'Horizontal press': 'shoulder support, grip width, elbow track and load path through the press',
    'Horizontal pull': 'torso support or hinge angle, elbow track and load path toward the trunk',
    'Jump and landing': 'distinct countermovement, flight and controlled landing mechanics',
    'Knee extension': 'fixed thigh support and knee-driven lower-leg travel',
    'Knee flexion': 'fixed thigh or torso support and heel travel toward the body',
    'Leg press': 'seat/back support, foot platform contact and sled travel',
    'Lunge and step': 'each foot or box contact, pelvis level and the specified step or descent direction',
    'Medicine ball power': 'the complete windup, release, projectile flight and safe reset',
    'Rear-delt fly': 'supported trunk angle and shoulder horizontal-abduction arc',
    'Rotation and anti-rotation': 'anchored pelvis, trunk rotation or resisted hold and return',
    'Scapular elevation': 'fixed elbows with shoulder-girdle elevation and controlled lowering',
    'Shoulder abduction': 'arm travel out to the side with stable trunk and elbow angle',
    'Shoulder extension': 'shoulder-driven arm path past the trunk without an elbow curl',
    'Shoulder flexion': 'forward shoulder arc with stable trunk and elbow angle',
    'Shoulder rotation': 'fixed upper arm and forearm rotation about the shoulder',
    'Squat': 'foot support, knee tracking, hip depth and the specified stance/load setup',
    'Trunk flexion': 'supported pelvis and a controlled rib-to-pelvis or leg-raise path',
    'Vertical press': 'grip, elbow path, overhead clearance and lockout',
    'Vertical pull': 'overhead hand anchor, scapular motion and full body or handle travel',
    'Weightlifting catch': 'floor or hang start, explosive pull, turnover, catch and reset',
    'Weightlifting pull': 'floor or hang start, bar acceleration, extension and controlled reset',
    'Wrist and grip': 'supported forearm and the exact wrist, finger or pronation/supination path',
}

EQUIPMENT_GAPS = {
    'Ab wheel': 'a rolling wheel and hand contact',
    'Barbell': 'a bar with visible plates, hand placement and rack or floor contact',
    'Bench': 'a stable bench with the specified body contact points',
    'Bodyweight': 'the required hand, foot or floor supports',
    'Cable': 'an anchored pulley, taut cable, handle and changing line of pull',
    'Decline bench': 'a secured decline bench and body restraints',
    'Dip station': 'parallel fixed handles and supported body clearance',
    'Dumbbell': 'the dumbbell grip, position and changing load path',
    'EZ bar': 'the angled bar grip and visible plates',
    'GHD': 'the foot anchors and hip pad geometry',
    'Hand gripper': 'the two handles and finger closing motion',
    'Kettlebell': 'the handle grip and bell position',
    'Landmine': 'a fixed bar pivot and its arcing load path',
    'Machine': 'the actual seat, pads, lever or sled and safe contact points',
    'Medicine ball': 'a grasped ball and any release or catch',
    'Nordic bench': 'secured ankle anchors and knee pad',
    'Parallettes': 'two fixed raised hand supports and below-hand clearance',
    'Plyo box': 'a stable box with takeoff and landing surfaces',
    'Pull-up bar': 'a fixed overhead bar and the specified hand spacing',
    'Resistance band': 'a secure anchor and a band whose tension direction changes correctly',
    'Reverse hyper machine': 'the torso pad, handles and moving pendulum',
    'Roman chair': 'hip pads and foot anchors at the required angle',
    'Safety bar': 'the cambered bar, yoke pads and front handles',
    'Slam ball': 'a grasped ball, floor impact and safe reset',
    'Sliders': 'both sliding foot contacts and their friction-limited travel',
    'Smith machine': 'a guided bar, rails, hooks and bench or foot setup',
    'Stability ball': 'a rolling support surface and changing contact points',
    'Suspension trainer': 'overhead anchors, tensioned straps and moving handles',
    'Trap bar': 'the hexagonal frame, neutral handles and plate clearance',
    'Weight plate': 'the plate grip and its center-of-mass path',
}


def reason_for(entry):
    """State the exact catalog variation and missing geometry without implying review."""
    movement = entry['movementPattern']
    equipment = entry['equipment']
    if movement not in MOTION_GAPS or equipment not in EQUIPMENT_GAPS:
        raise ValueError(f'Unassessed media capability: {entry["catalogKey"]}')
    cue = entry['instructions'][-1].rstrip('.')
    return (
        f'{entry["name"]}: current renderer lacks {MOTION_GAPS[movement]}; '
        f'it also lacks {EQUIPMENT_GAPS[equipment]}. This variation requires '
        f'"{cue}". Add exact setup and phase-specific joint/support constraints '
        'before generating a video.'
    )
