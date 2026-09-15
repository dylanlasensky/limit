// Original LIMIT reference data. Research, scope and maintenance: docs/exercise-library.md.
// Row format: name | equipment | difficulty (B/I/A) | aliases (; separated) | specific cue | priority.
// Variants are deliberately curated, not a Cartesian product of names and equipment.
const groups = [];
function group(
  primaryMuscle,
  secondaryMuscles,
  movementPattern,
  category,
  instructions,
  rows,
  focus = "Strength & muscle"
) {
  for (const line of rows.trim().split("\n")) {
    const [name, equipment, level = "I", aliases = "", cue = "", priority = "0"] = line
      .trim()
      .split("|");
    groups.push({
      catalogKey: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-$/, ""),
      catalogVersion: 1,
      name,
      primaryMuscle,
      secondaryMuscles,
      equipment,
      category,
      movementPattern,
      difficulty: { B: "Beginner", I: "Intermediate", A: "Advanced" }[level],
      aliases: aliases ? aliases.split(";") : [],
      trainingFocus: focus,
      programEligible: focus !== "Athletic power" && level !== "A",
      selectionPriority: Number(priority),
      repMin: focus === "Athletic power" ? 2 : category === "Isolation" ? 10 : 6,
      repMax: focus === "Athletic power" ? 5 : category === "Isolation" ? 15 : 12,
      instructions: cue ? [...instructions, cue] : [...instructions],
      coachingRecommended: level === "A" || focus === "Athletic power",
    });
  }
}

group(
  "Chest",
  ["Triceps", "Front delts"],
  "Horizontal press",
  "Compound",
  [
    "Set your support points before lifting and keep your wrists stacked over your forearms.",
    "Lower through a comfortable range, then press without bouncing or losing your setup.",
  ],
  `
Barbell Bench Press|Barbell|I|Bench Press;BB Bench Press|Use correctly set rack safeties or a competent spotter.|10
Incline Barbell Bench Press|Barbell|I|Incline Bench Press|Use a modest incline and keep your hips on the bench.|7
Decline Barbell Bench Press|Barbell|I|Decline Bench Press|Secure your legs and use a spotter for unracking.
Close-Grip Bench Press|Barbell|I|Close Grip Barbell Bench Press|Use a comfortable narrow grip, not hands touching.
Paused Bench Press|Barbell|I|Pause Bench Press|Pause under control without relaxing your upper back.
Spoto Press|Barbell|A||Pause just above your chest; use safeties and a spotter.
Barbell Floor Press|Barbell|I||Lower until your upper arms gently meet the floor.
Dumbbell Bench Press|Dumbbell|B|DB Bench Press;Flat Dumbbell Press|Use weights you can safely position and put down.|9
Incline Dumbbell Bench Press|Dumbbell|B|Incline DB Press;Incline Dumbbell Press|Keep your shoulder blades supported by the bench.|8
Decline Dumbbell Bench Press|Dumbbell|I|Decline Dumbbell Press|Secure your legs before positioning the weights.
Neutral-Grip Dumbbell Bench Press|Dumbbell|B||Keep your palms facing one another.
Dumbbell Floor Press|Dumbbell|B|DB Floor Press|Let your upper arms lightly meet the floor without bouncing.|5
Single-Arm Dumbbell Bench Press|Dumbbell|I||Keep your torso from rotating; log repetitions per side.
Dumbbell Squeeze Press|Dumbbell|I|Crush Press|Keep light inward pressure between the dumbbells.
Machine Chest Press|Machine|B|Seated Chest Press;Chest Press Machine|Adjust the seat so the handles sit around mid-chest.|10
Incline Machine Chest Press|Machine|B||Keep your back against the pad.
Plate-Loaded Chest Press|Machine|B||Set the seat and starting position before loading.
Single-Arm Machine Chest Press|Machine|B||Keep your torso square; log repetitions per side.
Smith Machine Bench Press|Smith machine|B|Smith Bench Press|Set safety stops and align the bench to the fixed bar path.
Smith Machine Incline Press|Smith machine|B|Incline Smith Press|Check the bar path with an empty bar and set the stops.
Standing Cable Chest Press|Cable|I||Use a staggered stance and resist arching your lower back.
Single-Arm Cable Chest Press|Cable|I||Keep your ribs stacked over your pelvis; log each side.
Resistance Band Chest Press|Resistance band|B|Band Chest Press|Use a secure anchor and inspect the band for damage.
Push-Up|Bodyweight|B|Push Up;Pushup|Keep a straight line from head to heels.|8
Incline Push-Up|Bench|B|Elevated Push-Up|Place your hands on a stable raised surface.|9
Kneeling Push-Up|Bodyweight|B|Knee Push-Up|Keep hips in line with shoulders and knees.
Decline Push-Up|Bench|I|Feet-Elevated Push-Up|Use a stable support for your feet.
Deficit Push-Up|Parallettes|I||Use stable handles and only a comfortable shoulder range.
Close-Grip Push-Up|Bodyweight|I|Diamond Push-Up|Choose a hand spacing that feels comfortable at your wrists.
Weighted Push-Up|Bodyweight|A||Use a secured weight vest rather than an unsecured plate.
Suspension Push-Up|Suspension trainer|A|TRX Push-Up|Check anchors and begin with a more upright body angle.
Chest Dip|Dip station|A|Parallel Bar Dip|Use a comfortable depth; avoid forcing the shoulders backward.
Assisted Chest Dip|Machine|B|Assisted Dip|Use enough assistance to control the bottom position.
`
);
group(
  "Chest",
  ["Front delts"],
  "Chest fly",
  "Isolation",
  [
    "Keep a soft bend in your elbows and a stable rib cage.",
    "Bring your arms together in an arc; avoid forcing a deep shoulder stretch.",
  ],
  `
Dumbbell Fly|Dumbbell|I|Flat Dumbbell Fly;DB Fly|Use a lighter load than for pressing.
Incline Dumbbell Fly|Dumbbell|I||Keep the bench at a modest incline.
Cable Chest Fly|Cable|B|Cable Fly;Cable Crossover|Keep the handles at a comfortable chest height.|8
Low-to-High Cable Fly|Cable|I|Low Cable Fly|Bring the handles upward and inward without shrugging.
High-to-Low Cable Fly|Cable|I|High Cable Fly|Move the handles down and inward without rounding your torso.
Single-Arm Cable Fly|Cable|I||Keep your torso square; log repetitions per side.
Bench Cable Fly|Cable|I|Lying Cable Fly|Position a stable bench between the cable stacks.
Pec Deck Fly|Machine|B|Pec Deck;Machine Chest Fly;Butterfly Machine|Adjust the seat and arm position to avoid overstretching.|10
Resistance Band Chest Fly|Resistance band|B|Band Fly|Secure the anchor and control the band on the return.
`
);
group(
  "Lats",
  ["Biceps", "Upper back"],
  "Vertical pull",
  "Compound",
  [
    "Set your grip and let your shoulder blades move naturally as you reach.",
    "Draw your elbows toward your sides without swinging or pulling behind your neck.",
  ],
  `
Lat Pulldown|Cable|B|Cable Lat Pulldown;Wide-Grip Lat Pulldown|Set the thigh pad snugly and pull toward your upper chest.|10
Neutral-Grip Lat Pulldown|Cable|B|Neutral Grip Pulldown|Keep your chest comfortably lifted.|8
Close-Grip Lat Pulldown|Cable|B|V-Bar Pulldown|Avoid leaning far backward.
Underhand Lat Pulldown|Cable|B|Reverse-Grip Pulldown|Keep your wrists aligned with your forearms.
Single-Arm Lat Pulldown|Cable|B|One Arm Pulldown|Keep your torso steady; log repetitions per side.
Half-Kneeling Cable Pulldown|Cable|I||Stay tall over your kneeling hip.
Machine Lat Pulldown|Machine|B|Plate-Loaded Lat Pulldown|Adjust the seat to the machine's pivot and handles.
Pull-Up|Pull-up bar|I|Pull Up;Pullup|Use a secure bar and control the descent.|8
Chin-Up|Pull-up bar|I|Chin Up;Chinup|Use an underhand grip without craning your neck.
Neutral-Grip Pull-Up|Pull-up bar|I|Hammer-Grip Pull-Up|Use parallel handles with a secure grip.
Assisted Pull-Up|Machine|B|Machine-Assisted Pull-Up|Choose assistance that allows a controlled full repetition.
Assisted Chin-Up|Machine|B||Keep the knee platform under control.
Band-Assisted Pull-Up|Pull-up bar|I||Check the band and its attachment before stepping in.
Weighted Pull-Up|Pull-up bar|A||Secure the added load and avoid kipping.
Weighted Chin-Up|Pull-up bar|A||Use a secure belt or vest and controlled repetitions.
Scapular Pull-Up|Pull-up bar|I|Scap Pull-Up|Keep your elbows straight and use a small shoulder-blade motion.
`
);
group(
  "Upper back",
  ["Lats", "Biceps", "Rear delts"],
  "Horizontal pull",
  "Compound",
  [
    "Use a stable torso position and keep your neck in line with your spine.",
    "Row your elbows back, then reach forward under control without jerking the weight.",
  ],
  `
Barbell Bent-Over Row|Barbell|I|Barbell Row;BB Row|Hinge at the hips and keep the torso angle steady.|9
Underhand Barbell Row|Barbell|I|Reverse-Grip Barbell Row|Keep your wrists comfortable and avoid jerking from the floor.
Pendlay Row|Barbell|A||Reset the bar on the floor between repetitions.
Seal Row|Barbell|I|Barbell Seal Row|Use a purpose-built stable bench with adequate bar clearance.
T-Bar Row|Landmine|I|Landmine T-Bar Row|Secure the bar in a landmine attachment.
Meadows Row|Landmine|A||Use a secure landmine and stable staggered stance; log each side.
Single-Arm Dumbbell Row|Dumbbell|B|One-Arm Dumbbell Row;DB Row|Brace against a stable support; log repetitions per side.|10
Dumbbell Bent-Over Row|Dumbbell|I||Keep your torso still as both arms row.
Chest-Supported Dumbbell Row|Dumbbell|B|Incline Dumbbell Row|Keep your chest against an incline bench.|8
Dumbbell Seal Row|Dumbbell|I||Use a stable bench with enough clearance for the weights.
Seated Cable Row|Cable|B|Cable Row;Low Cable Row|Keep your torso movement small and controlled.|10
Wide-Grip Cable Row|Cable|B||Use a comfortable wider handle and avoid shrugging.
Single-Arm Cable Row|Cable|B|One-Arm Cable Row|Resist trunk rotation; log repetitions per side.
Standing Cable Row|Cable|I||Use a stable staggered stance.
Half-Kneeling Cable Row|Cable|I||Keep your pelvis level and ribs stacked.
Chest-Supported Machine Row|Machine|B|Machine Row|Adjust the pad so you can reach without rounding excessively.|9
Plate-Loaded High Row|Machine|B|High Row Machine|Follow the machine's handle path with a stable chest.
Single-Arm Machine Row|Machine|B||Keep your chest supported and log repetitions per side.
Smith Machine Bent-Over Row|Smith machine|I|Smith Row|Check your hinge position against the fixed bar path.
Resistance Band Row|Resistance band|B|Band Row;Seated Band Row|Use a secure anchor and inspect the band.|8
Inverted Row|Smith machine|I|Body Row;Australian Pull-Up|Lock the bar securely and keep your body in a straight line.
Suspension Row|Suspension trainer|B|TRX Row|Choose a more upright angle to reduce difficulty.
Kettlebell Row|Kettlebell|I||Brace on a stable support; log repetitions per side.
`
);
group(
  "Lats",
  ["Chest", "Triceps"],
  "Shoulder extension",
  "Isolation",
  [
    "Keep your trunk steady and use a slight bend in your elbows.",
    "Move from the shoulders through a comfortable range rather than arching your lower back.",
  ],
  `
Straight-Arm Cable Pulldown|Cable|B|Cable Pullover;Straight Arm Pulldown|Sweep the handle toward your thighs.|8
Rope Straight-Arm Pulldown|Cable|B|Rope Pullover|Keep the rope close enough to maintain control.
Single-Arm Cable Pullover|Cable|I||Keep the elbow angle steady; log repetitions per side.
Dumbbell Pullover|Dumbbell|I||Support your head and upper back on the bench.
Machine Pullover|Machine|B||Adjust the seat and pad to the machine's pivot.
Resistance Band Pulldown|Resistance band|B|Band Straight-Arm Pulldown|Secure the anchor above you before pulling.
`
);
group(
  "Front delts",
  ["Triceps", "Side delts"],
  "Vertical press",
  "Compound",
  [
    "Brace your trunk and position your wrists above your forearms.",
    "Press upward through a comfortable path without leaning back to finish the repetition.",
  ],
  `
Barbell Overhead Press|Barbell|I|Overhead Press;Military Press;OHP;Strict Press|Keep your legs still for a strict press.|10
Seated Barbell Shoulder Press|Barbell|I||Set rack safeties and avoid pressing behind the neck.
Dumbbell Shoulder Press|Dumbbell|B|Seated Dumbbell Press;DB Shoulder Press|Use a supported seat and a comfortable elbow position.|10
Standing Dumbbell Press|Dumbbell|I||Keep your glutes and trunk engaged.
Arnold Press|Dumbbell|I||Rotate only through a comfortable shoulder range.
Neutral-Grip Dumbbell Shoulder Press|Dumbbell|B||Keep your palms facing inward.
Single-Arm Dumbbell Overhead Press|Dumbbell|I||Resist leaning sideways; log repetitions per side.
Machine Shoulder Press|Machine|B|Shoulder Press Machine|Adjust the seat so the starting position is comfortable.|9
Smith Machine Shoulder Press|Smith machine|I|Smith Shoulder Press|Set stops and align the bench to the fixed path.
Single-Arm Landmine Press|Landmine|B|Landmine Press|Secure the bar and press up and forward; log each side.|6
Half-Kneeling Landmine Press|Landmine|B||Keep your ribs down and pelvis level; log each side.
Kettlebell Strict Press|Kettlebell|I|Kettlebell Press|Start from a stable rack position; log each side.
Resistance Band Overhead Press|Resistance band|B|Band Shoulder Press|Inspect the band and keep it securely under your feet.
Pike Push-Up|Bodyweight|I||Lower your head between your hands with control.
Wall Handstand Push-Up|Bodyweight|A||Learn an exit with a coach and avoid loading the neck.
`
);
group(
  "Side delts",
  [],
  "Shoulder abduction",
  "Isolation",
  [
    "Use a light load, soft elbows, and a stable trunk.",
    "Raise your arms out in a comfortable plane, then lower without swinging.",
  ],
  `
Dumbbell Lateral Raise|Dumbbell|B|DB Lateral Raise;Side Raise|Stop around shoulder height or lower if more comfortable.|10
Seated Dumbbell Lateral Raise|Dumbbell|B||Keep your torso upright without bouncing.
Single-Arm Cable Lateral Raise|Cable|B|Cable Lateral Raise|Keep your shoulder relaxed; log repetitions per side.|9
Behind-the-Body Cable Lateral Raise|Cable|I||Use a comfortable starting position, not an exaggerated stretch.
Leaning Cable Lateral Raise|Cable|I||Hold a secure support and avoid twisting.
Machine Lateral Raise|Machine|B|Lateral Raise Machine|Align the pads and seat with the machine's instructions.|9
Resistance Band Lateral Raise|Resistance band|B|Band Lateral Raise|Choose a band you can control at the top.
`
);
group(
  "Front delts",
  [],
  "Shoulder flexion",
  "Isolation",
  [
    "Stand or sit tall with a soft elbow bend.",
    "Lift in front of you to a comfortable height without swinging your torso.",
  ],
  `
Dumbbell Front Raise|Dumbbell|B|DB Front Raise|Lower slowly and avoid shrugging.
Cable Front Raise|Cable|B||Keep your trunk still against the cable pull.
Plate Front Raise|Weight plate|B||Use a secure two-handed grip.
Resistance Band Front Raise|Resistance band|B|Band Front Raise|Keep the band securely anchored under your feet.
`
);
group(
  "Rear delts",
  ["Upper back"],
  "Rear-delt fly",
  "Isolation",
  [
    "Keep your torso stable and your elbows slightly bent.",
    "Open your arms without shrugging or using momentum; return under control.",
  ],
  `
Dumbbell Reverse Fly|Dumbbell|I|Bent-Over Reverse Fly;Rear Delt Fly|Maintain a steady hip hinge.
Chest-Supported Reverse Fly|Dumbbell|B|Incline Rear Delt Fly|Keep your chest on the bench.|8
Reverse Pec Deck|Machine|B|Rear Delt Machine;Reverse Fly Machine|Adjust the handles and seat for a comfortable reach.|10
Cable Reverse Fly|Cable|B|Cable Rear Delt Fly|Cross the handles and use a light load.|9
Single-Arm Cable Rear Delt Fly|Cable|B||Keep your torso square; log each side.
Resistance Band Pull-Apart|Resistance band|B|Band Pull Apart|Keep the band around chest height without arching.
`
);
group(
  "Upper back",
  ["Rear delts", "Rotator cuff"],
  "Face pull",
  "Isolation",
  [
    "Use a light load and keep your ribs stacked over your pelvis.",
    "Pull toward your face with elbows comfortably out, then return without shrugging.",
  ],
  `
Cable Face Pull|Cable|B|Face Pull;Rope Face Pull|Keep the rope clear of your face.|8
Resistance Band Face Pull|Resistance band|B|Band Face Pull|Secure the band at around face height.
`
);
group(
  "Upper back",
  ["Forearms"],
  "Scapular elevation",
  "Isolation",
  [
    "Stand tall with arms long and a secure grip.",
    "Lift your shoulders upward, then lower under control; do not roll them in circles.",
  ],
  `
Barbell Shrug|Barbell|B||Keep your neck neutral.
Dumbbell Shrug|Dumbbell|B|DB Shrug|Let the dumbbells stay beside your body.|8
Trap Bar Shrug|Trap bar|B|Hex Bar Shrug|Stand centered in the bar.
Smith Machine Shrug|Smith machine|B||Set a comfortable start height.
Cable Shrug|Cable|B||Keep your elbows straight.
Machine Shrug|Machine|B||Adjust the handles before loading.
`
);
group(
  "Rotator cuff",
  ["Rear delts"],
  "Shoulder rotation",
  "Isolation",
  [
    "Use very light resistance and keep the working elbow supported or close to your side.",
    "Rotate at the shoulder through a comfortable range without moving your torso.",
  ],
  `
Cable External Rotation|Cable|B||Rotate your hand away from your abdomen; log each side.
Band External Rotation|Resistance band|B|Resistance Band External Rotation|Keep your elbow near your ribs; log each side.
Side-Lying Dumbbell External Rotation|Dumbbell|B||Support your elbow at your side; log each side.
Cable Internal Rotation|Cable|B||Rotate your hand toward your abdomen; log each side.
Band Internal Rotation|Resistance band|B||Use a secure anchor; log each side.
`
);
group(
  "Biceps",
  ["Forearms"],
  "Elbow flexion",
  "Isolation",
  [
    "Keep your upper arms steady and wrists comfortable.",
    "Bend your elbows without swinging your torso, then lower under control.",
  ],
  `
Barbell Curl|Barbell|B|BB Curl|Use a grip that feels comfortable for your wrists.|8
EZ-Bar Curl|EZ bar|B|EZ Curl;EZ Bar Biceps Curl|Use the angled section of the bar.
Dumbbell Curl|Dumbbell|B|DB Curl;Biceps Curl|Turn your palms forward as comfortable.|10
Alternating Dumbbell Curl|Dumbbell|B|Alternating Curl|Count repetitions per arm, not the combined total.
Seated Dumbbell Curl|Dumbbell|B||Keep your back stable against the seat.
Incline Dumbbell Curl|Dumbbell|I|Incline Curl|Let the arms hang comfortably without forcing the shoulder back.
Hammer Curl|Dumbbell|B|Dumbbell Hammer Curl|Keep your palms facing each other.|8
Cross-Body Hammer Curl|Dumbbell|B||Bring the weight toward the opposite shoulder; log each side.
Concentration Curl|Dumbbell|B||Brace your upper arm gently against your inner thigh.
Dumbbell Preacher Curl|Dumbbell|B||Keep the upper arm supported; avoid bouncing at the bottom.
EZ-Bar Preacher Curl|EZ bar|B|Preacher Curl|Adjust the seat so your upper arms remain on the pad.
Machine Preacher Curl|Machine|B|Machine Biceps Curl|Align your elbows with the machine's pivot.|9
Cable Curl|Cable|B|Cable Biceps Curl|Keep a stable stance against the cable tension.|9
Rope Hammer Curl|Cable|B|Cable Hammer Curl|Keep a neutral wrist position.
Single-Arm Cable Curl|Cable|B||Keep your elbow steady; log each side.
Bayesian Cable Curl|Cable|I|Behind-the-Body Cable Curl|Use a comfortable shoulder extension, not a forced stretch.
High Cable Curl|Cable|I|Double Biceps Cable Curl|Keep your upper arms stable at a comfortable height.
Spider Curl|Dumbbell|I|Dumbbell Spider Curl|Support your chest on an incline bench.
EZ-Bar Spider Curl|EZ bar|I||Keep your chest supported throughout.
Zottman Curl|Dumbbell|I||Rotate the wrists smoothly and use a light load.
Reverse Barbell Curl|Barbell|B|Overhand Curl|Keep palms facing down and avoid wrist bending.
Reverse EZ-Bar Curl|EZ bar|B||Use a light load with an overhand grip.
Reverse Cable Curl|Cable|B||Keep your knuckles in line with your forearms.
Resistance Band Curl|Resistance band|B|Band Biceps Curl|Stand securely on the band and control its return.
`
);
group(
  "Triceps",
  [],
  "Elbow extension",
  "Isolation",
  [
    "Set a comfortable shoulder position and keep your upper arms steady.",
    "Straighten your elbows without snapping them, then return under control.",
  ],
  `
Cable Triceps Pushdown|Cable|B|Triceps Pushdown;Tricep Pushdown;Cable Pressdown|Keep your elbows beside your ribs.|10
Rope Triceps Pushdown|Cable|B|Rope Pushdown;Rope Pressdown|Separate the rope only as far as comfortable.|9
V-Bar Triceps Pushdown|Cable|B|V Bar Pushdown|Keep your wrists neutral.
Reverse-Grip Triceps Pushdown|Cable|B|Underhand Pushdown|Use a light load and a secure underhand grip.
Single-Arm Cable Pushdown|Cable|B|Single Arm Triceps Pushdown|Keep your shoulder still; log each side.
Overhead Cable Triceps Extension|Cable|I|Cable Overhead Extension|Keep your ribs down and use a comfortable shoulder angle.|8
Single-Arm Overhead Cable Extension|Cable|I||Avoid twisting; log repetitions per side.
Cross-Body Cable Triceps Extension|Cable|I|Cross Body Triceps Extension|Move from the elbow without pulling your shoulder forward.
Dumbbell Overhead Triceps Extension|Dumbbell|I|Overhead Dumbbell Extension|Secure the dumbbell with both hands.
Single-Arm Dumbbell Triceps Extension|Dumbbell|I||Use a light load and log each side.
Dumbbell Skull Crusher|Dumbbell|I|Lying Dumbbell Triceps Extension|Keep the weights clear of your face.
EZ-Bar Skull Crusher|EZ bar|I|Skull Crusher;Lying Triceps Extension|Use a controlled path and a spotter when needed.
Dumbbell Triceps Kickback|Dumbbell|B|DB Kickback|Support your torso and keep your upper arm still.
Cable Triceps Kickback|Cable|B||Keep your shoulder stable; log each side.
Machine Triceps Extension|Machine|B|Triceps Extension Machine|Align your elbows with the machine pivot.|8
Resistance Band Triceps Pushdown|Resistance band|B|Band Pushdown|Check the high anchor before starting.
Resistance Band Overhead Triceps Extension|Resistance band|I|Band Overhead Extension|Inspect the band and use a secure anchor.
`
);
group(
  "Forearms",
  [],
  "Wrist and grip",
  "Isolation",
  [
    "Use light resistance with your forearm supported where practical.",
    "Move through a comfortable range without jerking; keep the rest of your arm still.",
  ],
  `
Dumbbell Wrist Curl|Dumbbell|B||Curl your palm toward your forearm; log each side.
Barbell Wrist Curl|Barbell|B||Support your forearms with palms facing upward.
Dumbbell Reverse Wrist Curl|Dumbbell|B||Raise the back of your hand with a light load.
Barbell Reverse Wrist Curl|Barbell|B||Support your forearms with palms facing downward.
Cable Wrist Curl|Cable|B||Keep the cable aligned with your wrist.
Dumbbell Forearm Pronation|Dumbbell|B||Rotate toward palm-down using a short, light lever.
Dumbbell Forearm Supination|Dumbbell|B||Rotate toward palm-up without forcing the end range.
Hand Gripper Close|Hand gripper|B|Grip Trainer|Squeeze and release fully under control; log repetitions per hand.
`
);
group(
  "Quads",
  ["Glutes", "Abs/core"],
  "Squat",
  "Compound",
  [
    "Set a stable stance, brace your trunk, and keep pressure through your whole foot.",
    "Bend at the knees and hips to a controlled, comfortable depth, then stand without bouncing.",
  ],
  `
Barbell Back Squat|Barbell|I|Back Squat;Barbell Squat;Squat|Set rack safeties just below your lowest controlled position.|10
High-Bar Back Squat|Barbell|I|High Bar Squat|Rest the bar on your upper traps, not your neck.
Low-Bar Back Squat|Barbell|I|Low Bar Squat|Use a secure rear-shoulder bar position and safeties.
Barbell Front Squat|Barbell|I|Front Squat|Use a comfortable front rack and keep your elbows lifted.|8
Paused Back Squat|Barbell|I|Pause Squat|Pause without relaxing your brace.
Box Squat|Barbell|I|Barbell Box Squat|Use a stable box and avoid rocking backward.
Safety Bar Squat|Safety bar|I|SSB Squat|Set the rack safeties and position the pads securely.
Zercher Squat|Barbell|A||Use a secure rack setup and a load you can hold comfortably.
Goblet Squat|Dumbbell|B|Dumbbell Goblet Squat|Hold the weight close to your chest.|10
Kettlebell Goblet Squat|Kettlebell|B||Keep the bell close to your chest.|8
Double Kettlebell Front Squat|Kettlebell|I||Keep both bells secure in the rack position.
Dumbbell Front Squat|Dumbbell|B||Hold the dumbbells at your shoulders.
Heel-Elevated Goblet Squat|Dumbbell|I|Cyclist Goblet Squat|Use a stable wedge, not loose stacked objects.
Bodyweight Squat|Bodyweight|B|Air Squat|Choose a depth you can control.|9
Squat to Bench|Bench|B|Sit to Stand;Chair Squat|Use a stable seat and stand without rocking.|8
Smith Machine Squat|Smith machine|B|Smith Squat|Set stops and find a stance suited to the fixed bar path.
Smith Machine Front Squat|Smith machine|I||Check your rack position and safety stops with a light bar.
Hack Squat|Machine|B|Hack Squat Machine|Keep your back supported and learn the machine's safety handles.|9
Pendulum Squat|Machine|I||Set the safety stop before adding load.
Belt Squat|Machine|B|Belt Squat Machine|Secure the belt and hold the supports as needed.
Landmine Squat|Landmine|B||Secure the landmine and hold the bar end close to your chest.
Assisted Single-Leg Squat|Suspension trainer|I|Assisted Pistol Squat|Use the straps for balance and log each side.
Pistol Squat|Bodyweight|A||Work within controlled depth and use a support when learning.
`
);
group(
  "Quads",
  ["Glutes"],
  "Leg press",
  "Compound",
  [
    "Adjust the seat and safety stops before loading; keep your pelvis supported.",
    "Lower until just before your pelvis rolls off the pad, then press without snapping your knees.",
  ],
  `
Leg Press|Machine|B|45-Degree Leg Press;45 Degree Leg Press|Keep your heels in contact with the platform.|10
Horizontal Leg Press|Machine|B|Seated Leg Press|Follow the machine's setup instructions.
Single-Leg Press|Machine|I|Single Leg Leg Press|Keep your pelvis level; log repetitions per side.
Wide-Stance Leg Press|Machine|I||Use a comfortable stance and keep knees tracking with toes.
`
);
group(
  "Quads",
  [],
  "Knee extension",
  "Isolation",
  [
    "Align your knee with the machine pivot or set a stable supported position.",
    "Straighten your knee under control and lower without dropping the resistance.",
  ],
  `
Leg Extension|Machine|B|Machine Leg Extension|Place the lower pad above the ankle, not on the foot.|10
Single-Leg Extension|Machine|B|Unilateral Leg Extension|Keep your hips on the seat; log each side.
Resistance Band Leg Extension|Resistance band|B|Band Leg Extension|Use a secure low anchor and stable seat.
Reverse Nordic Curl|Bodyweight|A||Use a padded kneeling surface and a small controlled range.
`
);
group(
  "Glutes",
  ["Quads", "Hamstrings"],
  "Lunge and step",
  "Compound",
  [
    "Keep your working foot stable and your pelvis level.",
    "Lower with control and drive through the working leg; count repetitions per side.",
  ],
  `
Dumbbell Split Squat|Dumbbell|B|DB Split Squat|Use a stable split stance with your rear heel lifted.|9
Bodyweight Split Squat|Bodyweight|B||Hold a stable support for balance if needed.|8
Barbell Split Squat|Barbell|I||Use rack safeties and a spotter when appropriate.
Bulgarian Split Squat|Dumbbell|I|Rear-Foot-Elevated Split Squat;RFESS|Use a stable low rear-foot support.|8
Bodyweight Bulgarian Split Squat|Bench|I||Choose a support height that keeps your hips comfortable.
Smith Machine Split Squat|Smith machine|I||Check the fixed bar path and set the stops.
Dumbbell Reverse Lunge|Dumbbell|B|Reverse Lunge|Step back far enough to keep balance.|8
Bodyweight Reverse Lunge|Bodyweight|B||Start with a short, controlled step.
Barbell Reverse Lunge|Barbell|I||Keep your steps consistent and use a clear area.
Dumbbell Forward Lunge|Dumbbell|I|Forward Lunge|Control the landing of the front foot.
Walking Dumbbell Lunge|Dumbbell|I|Walking Lunge|Use a clear walking lane and count each leg separately.
Barbell Walking Lunge|Barbell|A||Use a clear lane and a load you can safely unrack and stop.
Dumbbell Lateral Lunge|Dumbbell|I|Side Lunge|Sit into the stepping hip while the other leg lengthens.
Bodyweight Lateral Lunge|Bodyweight|B||Keep the working heel down.
Cossack Squat|Bodyweight|A||Use support if needed and avoid forcing depth.
Dumbbell Step-Up|Dumbbell|B|Step Up;Step-Up|Choose a stable box height you can control.|8
Bodyweight Step-Up|Plyo box|B||Use a stable platform and avoid pushing off the trailing foot.
Barbell Step-Up|Barbell|A||Use a stable box and a safe setup for the bar.
Lateral Step-Up|Plyo box|I||Control the descent and keep the working knee aligned.
Lateral Step-Down|Plyo box|I||Use a low step and touch down gently.
Landmine Reverse Lunge|Landmine|I||Secure the attachment and keep the bar end near your chest.
`
);
group(
  "Hamstrings",
  ["Glutes", "Lower back", "Forearms"],
  "Hip hinge",
  "Compound",
  [
    "Brace your trunk and move your hips backward while keeping the load close.",
    "Use a range you can control with a steady spine; stand tall without leaning backward.",
  ],
  `
Barbell Deadlift|Barbell|I|Deadlift;Conventional Deadlift|Take slack out of the bar before lifting and reset between repetitions.|10
Sumo Deadlift|Barbell|I||Use a comfortable wide stance with knees tracking with toes.
Romanian Deadlift|Barbell|I|RDL;Barbell RDL;Barbell Romanian Deadlift|Lower only as far as your hinge stays controlled.|10
Dumbbell Romanian Deadlift|Dumbbell|B|DB RDL;Dumbbell RDL|Keep the weights beside or in front of your thighs.|9
Single-Leg Dumbbell Romanian Deadlift|Dumbbell|I|Single Leg RDL;SL RDL|Keep your pelvis square; log each side.
Supported Single-Leg Romanian Deadlift|Dumbbell|B|Supported Single Leg RDL|Hold a stable support with your free hand.
B-Stance Romanian Deadlift|Dumbbell|I|Kickstand RDL|Use the rear foot mainly for balance; log each working leg.
Kettlebell Romanian Deadlift|Kettlebell|B||Keep the bell close to your body.
Kettlebell Deadlift|Kettlebell|B||Start with the bell between your feet.|7
Trap Bar Deadlift|Trap bar|B|Hex Bar Deadlift|Stand centered and use a handle height you can control.|8
Trap Bar Romanian Deadlift|Trap bar|I||Keep a soft knee bend and hinge from the hips.
Rack Pull|Barbell|I|Block Pull|Set both supports evenly and avoid leaning back at lockout.
Deficit Deadlift|Barbell|A||Use a small stable platform only if you can keep your setup.
Paused Deadlift|Barbell|A||Pause without losing your brace or bar position.
Snatch-Grip Deadlift|Barbell|A||Use a comfortable wide grip and reduce the load.
Barbell Good Morning|Barbell|A|Good Morning|Use rack safeties and a light load while learning.
Smith Machine Romanian Deadlift|Smith machine|I|Smith RDL|Position your feet to keep the bar path close to your legs.
Cable Pull-Through|Cable|B|Cable Pull Through|Face away from the stack and drive the movement from your hips.
Resistance Band Good Morning|Resistance band|I|Band Good Morning|Keep band pressure across the upper back, never the neck.
`
);
group(
  "Hamstrings",
  ["Calves"],
  "Knee flexion",
  "Isolation",
  [
    "Set your knee alignment and keep your hips stable.",
    "Bend your knees under control and resist the return rather than letting the load drop.",
  ],
  `
Seated Leg Curl|Machine|B|Seated Hamstring Curl|Adjust the thigh pad and knee pivot before loading.|10
Lying Leg Curl|Machine|B|Prone Leg Curl;Lying Hamstring Curl|Keep your hips against the pad.|9
Standing Leg Curl|Machine|B|Standing Hamstring Curl|Keep your working thigh still; log each side.
Single-Leg Seated Curl|Machine|B|Single Leg Curl|Keep both hips supported and log each side.
Single-Leg Lying Curl|Machine|B||Control the return without rotating your pelvis.
Cable Leg Curl|Cable|I|Cable Hamstring Curl|Secure the ankle cuff and hold a stable support.
Resistance Band Leg Curl|Resistance band|B|Band Hamstring Curl|Secure the anchor and ankle attachment.
Stability Ball Leg Curl|Stability ball|I|Swiss Ball Hamstring Curl|Keep hips lifted only as far as you can control.
Slider Leg Curl|Sliders|I|Sliding Hamstring Curl|Use a surface with predictable sliding resistance.
Nordic Hamstring Curl|Nordic bench|A|Nordic Curl|Secure your ankles and use hands or band assistance to control the descent.
Glute-Ham Raise|GHD|A|GHR|Adjust the footplate and pads; learn the movement with a coach.
`
);
group(
  "Glutes",
  ["Hamstrings", "Abs/core"],
  "Hip thrust",
  "Compound",
  [
    "Set your feet and upper-body support securely, keeping your ribs stacked over your pelvis.",
    "Extend your hips and finish with your glutes rather than arching your lower back.",
  ],
  `
Barbell Hip Thrust|Barbell|I|Hip Thrust|Use a stable bench and a padded bar across the hips.|10
Dumbbell Hip Thrust|Dumbbell|B||Hold the weight securely across your hips.
Smith Machine Hip Thrust|Smith machine|I|Smith Hip Thrust|Set safety stops and align your hips to the fixed bar path.
Machine Hip Thrust|Machine|B|Hip Thrust Machine;Glute Drive|Secure the belt or pad before starting.|9
Single-Leg Hip Thrust|Bench|I||Keep your pelvis level and count repetitions per side.
Glute Bridge|Bodyweight|B|Floor Glute Bridge|Keep your head and shoulders comfortably on the floor.|8
Barbell Glute Bridge|Barbell|I||Pad the bar and keep it secure across your hips.
Dumbbell Glute Bridge|Dumbbell|B||Secure the weight with your hands.
Single-Leg Glute Bridge|Bodyweight|I||Keep the pelvis level; log each side.
Frog Pump|Bodyweight|B||Use a comfortable hip position without forcing your knees outward.
`
);
group(
  "Glutes",
  [],
  "Hip extension",
  "Isolation",
  [
    "Keep your pelvis steady and use a comfortable range at the hip.",
    "Move your thigh behind you without arching your lower back; log repetitions per side.",
  ],
  `
Cable Glute Kickback|Cable|B|Cable Kickback|Secure the ankle cuff and hold a stable support.|8
Machine Glute Kickback|Machine|B|Glute Kickback Machine|Adjust the pads before adding resistance.
Resistance Band Glute Kickback|Resistance band|B|Band Kickback|Secure the band and avoid trunk rotation.
Quadruped Hip Extension|Bodyweight|B|Donkey Kick|Keep your ribs down and pelvis level.
`
);
group(
  "Abductors",
  ["Glutes"],
  "Hip abduction",
  "Isolation",
  [
    "Keep your pelvis stable and use a comfortable hip position.",
    "Move your thigh outward without leaning or twisting, then return under control.",
  ],
  `
Seated Hip Abduction|Machine|B|Hip Abductor Machine;Abductor Machine|Keep your pelvis on the seat and avoid bouncing.|8
Standing Cable Hip Abduction|Cable|B|Cable Hip Abduction|Hold a stable support and log repetitions per side.
Side-Lying Hip Abduction|Bodyweight|B|Side Lying Leg Raise|Keep your hips stacked and lift without rolling backward.
Band Clamshell|Resistance band|B|Clamshell|Keep your feet together and avoid rotating your trunk.
Lateral Band Walk|Resistance band|B|Banded Side Steps;Monster Walk|Take controlled steps; log steps per direction, not time.
`
);
group(
  "Adductors",
  [],
  "Hip adduction",
  "Isolation",
  [
    "Set a comfortable starting width and keep your pelvis stable.",
    "Bring your working leg inward without swinging or forcing a stretch.",
  ],
  `
Seated Hip Adduction|Machine|B|Hip Adductor Machine;Adductor Machine|Control the return to the starting width.|8
Standing Cable Hip Adduction|Cable|B|Cable Hip Adduction|Use a stable support and log each side.
Side-Lying Hip Adduction|Bodyweight|B|Side Lying Inner Thigh Raise|Lift the lower leg while keeping your hips stacked.
`
);
group(
  "Calves",
  [],
  "Ankle plantar flexion",
  "Isolation",
  [
    "Keep pressure through the ball of your foot and use a stable support.",
    "Raise your heel, pause briefly, then lower under control without bouncing.",
  ],
  `
Standing Calf Raise|Machine|B|Standing Calf Raise Machine|Adjust the shoulder pads and keep knees softly extended.|10
Seated Calf Raise|Machine|B|Seated Calf Raise Machine|Keep knees bent to emphasize the soleus.|9
Leg Press Calf Raise|Machine|B|Calf Press|Keep enough of your foot on the platform to prevent slipping.
Smith Machine Calf Raise|Smith machine|I|Smith Calf Raise|Set stops and use a stable platform.
Dumbbell Standing Calf Raise|Dumbbell|B|Dumbbell Calf Raise|Hold a support with your free hand.
Single-Leg Calf Raise|Bodyweight|B|Single Leg Calf Raise|Use a stable support and log each side.
Bodyweight Calf Raise|Bodyweight|B||Start on level ground.|8
Dumbbell Seated Calf Raise|Dumbbell|B||Secure the dumbbell above the knee, not on the kneecap.
Donkey Calf Raise|Machine|I||Adjust the machine's hip pad and keep your torso supported.
`
);
group(
  "Tibialis",
  [],
  "Ankle dorsiflexion",
  "Isolation",
  [
    "Keep your heels supported and use a small, controlled ankle motion.",
    "Lift your toes toward your shins, then lower without swinging the legs.",
  ],
  `
Wall Tibialis Raise|Bodyweight|B|Tibialis Raise;Tib Raise|Lean against a stable wall and move feet only as far forward as manageable.
Machine Tibialis Raise|Machine|B|Tibialis Machine|Secure the feet according to the machine's instructions.
Band Ankle Dorsiflexion|Resistance band|B|Band Tibialis Raise|Secure the band in front of your foot; log each side.
`
);
group(
  "Lower back",
  ["Glutes", "Hamstrings"],
  "Back extension",
  "Compound",
  [
    "Adjust the support so you can move comfortably and keep your neck aligned.",
    "Return to a straight body line without extending beyond it or jerking upward.",
  ],
  `
45-Degree Back Extension|Roman chair|B|Back Extension;Hyperextension|Place the pad below the hip crease and hinge with control.|8
Weighted Back Extension|Roman chair|I||Hold a light weight close to your chest.
Machine Back Extension|Machine|B||Set the machine pivot and range to a comfortable position.
Reverse Hyperextension|Reverse hyper machine|I|Reverse Hyper|Keep your pelvis supported and avoid swinging the legs.
`
);
group(
  "Abs/core",
  [],
  "Trunk flexion",
  "Isolation",
  [
    "Move through a comfortable trunk range and keep your neck relaxed.",
    "Exhale as you shorten the front of your torso; return without using momentum.",
  ],
  `
Crunch|Bodyweight|B|Floor Crunch|Lift your shoulder blades rather than pulling your head forward.|8
Cable Crunch|Cable|B|Kneeling Cable Crunch|Curl your trunk instead of only hinging at the hips.|10
Machine Abdominal Crunch|Machine|B|Ab Crunch Machine;Machine Crunch|Adjust the pads and seat before loading.
Stability Ball Crunch|Stability ball|I|Swiss Ball Crunch|Use a stable foot position and keep the ball from rolling.
Reverse Crunch|Bodyweight|B||Roll your pelvis gently upward without swinging your legs.
Decline Crunch|Decline bench|I||Secure your legs and use a manageable bench angle.
Weighted Crunch|Weight plate|I||Hold the plate at your chest, not behind your head.
Hanging Knee Raise|Pull-up bar|I||Keep your body from swinging and curl the pelvis upward.
Captain's Chair Knee Raise|Dip station|B|Vertical Knee Raise|Keep your upper back supported and control the lowering.
Hanging Leg Raise|Pull-up bar|A||Use a secure grip and avoid swinging.
Lying Leg Raise|Bodyweight|I||Limit the lowering range before your lower back arches.
`
);
group(
  "Abs/core",
  ["Glutes"],
  "Anti-extension",
  "Isolation",
  [
    "Brace gently and keep your ribs stacked over your pelvis.",
    "Move your limbs only as far as you can keep your trunk steady; return with control.",
  ],
  `
Dead Bug|Bodyweight|B|Deadbug|Reach opposite arm and leg; count repetitions per side.|9
Bird Dog|Bodyweight|B|Bird-Dog|Reach opposite arm and leg without rotating the hips.
Ab Wheel Rollout|Ab wheel|A|Ab Rollout|Start kneeling and stop before the lower back arches.
Stability Ball Rollout|Stability ball|I||Keep a short controlled reach from a kneeling position.
Body Saw|Sliders|A||Use small forward-back movements; one cycle is one repetition.
Plank Shoulder Tap|Bodyweight|I|Shoulder Tap|Keep your hips level and count taps per side.
`
);
group(
  "Abs/core",
  [],
  "Rotation and anti-rotation",
  "Isolation",
  [
    "Set a stable stance and keep the movement controlled.",
    "Avoid forcing your lower back into a twist; use a comfortable range and log each side.",
  ],
  `
Cable Pallof Press|Cable|B|Pallof Press;Anti-Rotation Press|Press straight out while resisting the cable's sideways pull.|8
Band Pallof Press|Resistance band|B||Use a secure anchor at chest height.
Cable Woodchop|Cable|I|Cable Wood Chop;High-to-Low Cable Chop|Turn through your hips and upper back rather than only your lower back.
Low-to-High Cable Lift|Cable|I|Cable Lift|Move diagonally upward while keeping your stance controlled.
Half-Kneeling Cable Chop|Cable|I||Keep your pelvis steady throughout the diagonal pull.
Half-Kneeling Cable Lift|Cable|I||Stay tall over the kneeling hip.
Dumbbell Side Bend|Dumbbell|I||Use a modest range without rotating your trunk.
Side Plank Hip Lift|Bodyweight|I|Side Plank Dip|Lift and lower your hips; log repetitions, not hold duration.
`
);
group(
  "Glutes",
  ["Hamstrings", "Quads", "Upper back"],
  "Weightlifting pull",
  "Power",
  [
    "Learn the start position and bar path with a qualified coach before adding load.",
    "Use crisp individual repetitions with full resets; stop when speed or technique declines.",
  ],
  `
Clean Pull|Barbell|A||This is a pull without a catch; do not turn it into an arm curl.
Hang Clean Pull|Barbell|A||Establish a controlled hang position before the explosive pull.
Clean High Pull|Barbell|A||Keep the bar close and learn the elbow path with a coach.
Snatch Pull|Barbell|A||Use a coached wide-grip setup; there is no overhead catch.
Hang Snatch Pull|Barbell|A||Reset the hang position before each repetition.
Jump Shrug|Barbell|A||Use a light load, clear space and a controlled landing.
Kettlebell Swing|Kettlebell|I|Russian Kettlebell Swing;KB Swing|Use a hip hinge and let the bell float to around chest height.
Single-Arm Kettlebell Swing|Kettlebell|A||Keep your shoulders square and log each side.
`,
  "Athletic power"
);
group(
  "Quads",
  ["Glutes", "Hamstrings", "Upper back", "Front delts"],
  "Weightlifting catch",
  "Power",
  [
    "Learn the receiving position, safe release, and progression with a qualified weightlifting coach.",
    "Use an appropriate platform and bumper plates; stop a set when speed or receiving technique deteriorates.",
  ],
  `
Power Clean|Barbell|A||Receive the bar above a parallel squat with a secure front rack.
Hang Power Clean|Barbell|A||Establish the hang position and receive above a parallel squat.
Hang Clean|Barbell|A|Hang Squat Clean|Receive in a front squat from a coached hang position.
Clean|Barbell|A|Squat Clean;Full Clean|Receive in a front squat only within a coached, controlled range.
Power Snatch|Barbell|A||Receive the bar overhead above a parallel squat with a stable lockout.
Hang Power Snatch|Barbell|A||Reset the hang and secure the overhead receiving position.
Snatch|Barbell|A|Full Snatch;Squat Snatch|Use a coached overhead squat receiving position.
Dumbbell Power Snatch|Dumbbell|A|Single-Arm Dumbbell Snatch|Keep a clear overhead area and log repetitions per side.
Kettlebell Clean|Kettlebell|A||Guide the bell into the rack without letting it strike your forearm.
Kettlebell Snatch|Kettlebell|A||Learn the hand insertion and safe lowering with a coach.
`,
  "Athletic power"
);
group(
  "Front delts",
  ["Triceps", "Quads", "Glutes"],
  "Explosive press",
  "Power",
  [
    "Learn the dip, drive and receiving position with a coach; clear the overhead area.",
    "Keep the load controlled over your base of support and reset between repetitions.",
  ],
  `
Barbell Push Press|Barbell|I|Push Press|Use a short leg drive and finish standing tall.
Dumbbell Push Press|Dumbbell|I||Keep both weights controlled overhead.
Push Jerk|Barbell|A|Power Jerk|Receive with a controlled knee bend before standing.
Split Jerk|Barbell|A||Practice the split stance and recovery sequence with a coach.
Landmine Push Press|Landmine|I||Secure the attachment and drive the bar up and forward.
`,
  "Athletic power"
);
group(
  "Quads",
  ["Glutes", "Calves"],
  "Jump and landing",
  "Power",
  [
    "Use a clear non-slip area and begin with low-intensity landings before progressing.",
    "Land quietly with control; reset between repetitions and stop when landing quality declines.",
  ],
  `
Box Jump|Plyo box|I||Choose a modest stable box and step down instead of repeatedly jumping off.
Countermovement Jump|Bodyweight|I|Vertical Jump|Use a quick controlled dip before jumping straight upward.
Squat Jump|Bodyweight|I||Pause in a comfortable partial squat before jumping.
Broad Jump|Bodyweight|I|Standing Long Jump|Use a clear landing lane and hold your landing briefly.
Lateral Bound|Bodyweight|A|Skater Jump|Land on one leg under control; count landings per side.
Split Squat Jump|Bodyweight|A|Jumping Lunge|Start with low height and controlled split-stance landings.
Pogo Jump|Bodyweight|I|Ankle Hops|Use small ankle-driven bounces and stop before stiffness or pain changes your landing.
Single-Leg Hop|Bodyweight|A||Begin with small hops and stable landings; log each side.
Depth Drop|Plyo box|A|Drop Landing|Step off a low box and absorb the landing; do not add a rebound initially.
Depth Jump|Plyo box|A||Progress only with a coach after consistent drop-landing control.
`,
  "Athletic power"
);
group(
  "Abs/core",
  ["Chest", "Front delts", "Glutes"],
  "Medicine ball power",
  "Power",
  [
    "Use a ball and throwing surface designed for the drill, with a clear throwing and rebound area.",
    "Prioritize fast, controlled repetitions with full resets rather than training to exhaustion.",
  ],
  `
Medicine Ball Rotational Throw|Medicine ball|I|Rotational Med Ball Throw|Turn through your feet and hips; log throws per side.
Medicine Ball Scoop Toss|Medicine ball|I|Med Ball Scoop Toss|Use hip drive and a clear release area.
Medicine Ball Overhead Slam|Slam ball|I|Ball Slam;Med Ball Slam|Use a non-rebounding slam ball and keep your feet clear.
Medicine Ball Overhead Throw|Medicine ball|A||Use a clear release area and a ball intended for throwing.
`,
  "Athletic power"
);

group(
  "Chest",
  ["Triceps", "Front delts", "Abs/core"],
  "Explosive horizontal press",
  "Power",
  [
    "Learn controlled landing or receiving mechanics with a coach before progressing intensity.",
    "Use a clear area and full resets; stop when speed or control declines.",
  ],
  `
Medicine Ball Chest Pass|Medicine ball|I|Med Ball Chest Pass|Use a suitable wall or prepared partner and a ball designed for the drill.
Plyometric Push-Up|Bodyweight|A|Explosive Push-Up|Land with soft elbows and stop when you lose trunk control.
`,
  "Athletic power"
);

export const exerciseCatalog = groups;

export function normalizeExerciseName(value = "") {
  return value
    .toLowerCase()
    .replace(/\bdb\b/g, "dumbbell")
    .replace(/\bbb\b/g, "barbell")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
