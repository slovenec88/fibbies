// Stretch library + routines for runners.
// Poses use a 200x200 canvas, figure faces right, ground at y=180.
// h = hip, t = torso angle (deg, 0 = right, 90 = down), n = head angle,
// hN/hF = near/far hand targets, fN/fF = near/far ankle targets (solved with IK),
// s = spine curve, ft = foot angles [near, far].

export const STRETCHES = {
  stand: {
    name: 'Stand tall', target: 'Get ready', view: 'side', period: 6,
    a: { h: [100, 104], t: -90, n: -90, hN: [104, 156], hF: [96, 156], fN: [104, 180], fF: [96, 180] },
    b: { h: [100, 103], t: -89, n: -89, hN: [105, 155], hF: [95, 155], fN: [104, 180], fF: [96, 180] },
    cues: ['Stand tall and take a deep breath.'],
  },

  quad: {
    name: 'Standing Quad Stretch', target: 'Quads · Hip flexors', view: 'side', sided: true, limb: 'leg', period: 6,
    a: { h: [100, 104], t: -88, n: -90, hN: [88, 112], hF: [150, 50], fN: [86, 110], fF: [100, 180], ft: [-60, 0] },
    b: { h: [100, 104], t: -90, n: -88, hN: [90, 108], hF: [152, 46], fN: [89, 106], fF: [100, 180], ft: [-70, 0] },
    cues: [
      'Hold your ankle and draw your heel toward your glute.',
      'Keep your knees together and squeeze your glute.',
      'Stand tall, hips pressed slightly forward.',
    ],
  },

  calf: {
    name: 'Wall Calf Stretch', target: 'Calves · Achilles', view: 'side', sided: true, limb: 'leg', period: 7,
    props: [{ wall: 188 }],
    a: { h: [104, 112], t: -55, n: -50, hN: [184, 58], hF: [184, 66], fN: [70, 180], fF: [120, 180] },
    b: { h: [110, 114], t: -50, n: -45, hN: [184, 58], hF: [184, 66], fN: [70, 180], fF: [120, 180] },
    cues: [
      'Hands on the wall, back leg straight, heel pressed down.',
      'Lean in slowly until the calf opens up.',
      'Keep your back heel heavy and toes pointing forward.',
    ],
  },

  fold: {
    name: 'Standing Forward Fold', target: 'Hamstrings · Lower back', view: 'side', period: 8,
    a: { h: [96, 104], t: 22, n: 45, hN: [140, 150], hF: [136, 150], fN: [104, 180], fF: [98, 180] },
    b: { h: [90, 102], t: 56, n: 80, hN: [130, 180], hF: [126, 180], fN: [104, 180], fF: [98, 180] },
    cues: [
      'Feet hip-width apart. Hinge at the hips and let your upper body hang.',
      'Soften your knees if you need to. Let your head be heavy.',
      'Breathe out and sink a little deeper.',
    ],
  },

  lunge: {
    name: 'Low Lunge', target: 'Hip flexors · Quads', view: 'side', sided: true, limb: 'leg', period: 8,
    a: { h: [100, 140], t: -85, n: -88, hN: [134, 138], hF: [130, 136], fN: [44, 180], fF: [140, 180], ft: [180, 0] },
    b: { h: [108, 148], t: -92, n: -94, hN: [114, 40], hF: [106, 40], fN: [44, 180], fF: [140, 180], ft: [180, 0] },
    cues: [
      'Back knee down, front knee stacked over your ankle.',
      'Tuck your pelvis and shift your hips gently forward.',
      'Reach both arms up tall to deepen the stretch.',
    ],
  },

  pigeon: {
    name: 'Pigeon Pose', target: 'Glutes · Piriformis', view: 'side', sided: true, limb: 'leg', period: 9,
    a: { h: [100, 158], t: -70, n: -76, hN: [128, 164], hF: [124, 164], fN: [26, 178], fF: [96, 178], ft: [180, 180] },
    b: { h: [100, 160], t: -30, n: -12, hN: [172, 178], hF: [168, 178], fN: [26, 178], fF: [96, 178], ft: [180, 180] },
    cues: [
      'Front shin across your mat, back leg long behind you.',
      'Square your hips and slowly walk your hands forward.',
      'Breathe into the outside of your hip.',
    ],
  },

  seatedFold: {
    name: 'Seated Hamstring Fold', target: 'Hamstrings · Calves', view: 'side', period: 9,
    a: { h: [70, 170], t: -70, n: -60, hN: [110, 164], hF: [106, 164], fN: [146, 176], fF: [146, 178] },
    b: { h: [70, 170], t: -22, n: -8, hN: [146, 170], hF: [142, 170], fN: [146, 176], fF: [146, 178] },
    cues: [
      'Sit tall with legs long, then fold forward from your hips.',
      'Reach toward your toes. No need to touch them.',
      'Keep your chest open and breathe slowly.',
    ],
  },

  butterfly: {
    name: 'Butterfly', target: 'Inner thighs · Hips', view: 'front', period: 3.2,
    a: { h: [100, 160], t: -90, n: -90, hN: [120, 160], hF: [80, 160], fN: [103, 176], fF: [97, 176] },
    b: { h: [100, 160], t: -90, n: -90, hN: [121, 157], hF: [79, 157], fN: [104, 172], fF: [96, 172] },
    cues: [
      'Soles of your feet together, let your knees fall open.',
      'Hold your ankles and sit up tall.',
      'Gently flutter your knees, then let them settle.',
    ],
  },

  itband: {
    name: 'Standing IT Band Stretch', target: 'Outer hip · IT band', view: 'front', sided: true, limb: 'side', period: 8,
    a: { h: [98, 104], t: -88, n: -88, hN: [108, 6], hF: [96, 6], fN: [88, 180], fF: [104, 180] },
    b: { h: [96, 108], t: -68, n: -62, hN: [150, 18], hF: [144, 12], fN: [88, 180], fF: [104, 180] },
    cues: [
      'Cross one foot behind the other and reach both arms overhead.',
      'Lean away from the back leg and feel the outer hip open.',
      'Keep both feet planted and breathe into your side.',
    ],
  },

  child: {
    name: "Child's Pose", target: 'Back · Hips · Ankles', view: 'side', period: 8,
    a: { h: [70, 154], t: 10, n: 25, hN: [176, 176], hF: [172, 178], fN: [62, 178], fF: [64, 178], ft: [180, 180] },
    b: { h: [67, 152], t: 8, n: 22, hN: [176, 176], hF: [172, 178], fN: [62, 178], fF: [64, 178], ft: [180, 180] },
    cues: [
      'Sit back toward your heels and walk your hands forward.',
      'Rest your forehead down and let your back widen.',
      'Breathe slowly into your lower back.',
    ],
  },

  catcow: {
    name: 'Cat-Cow', target: 'Spine · Core', view: 'side', period: 8,
    a: { h: [70, 140], t: -15, n: -55, s: 9, hN: [122, 180], hF: [118, 180], fN: [34, 178], fF: [38, 178], ft: [180, 180] },
    b: { h: [70, 138], t: -15, n: 50, s: -14, hN: [122, 180], hF: [118, 180], fN: [34, 178], fF: [38, 178], ft: [180, 180] },
    cues: [
      'On hands and knees. Inhale, drop your belly and lift your gaze.',
      'Exhale, round your spine toward the ceiling.',
      'Move slowly with your breath.',
    ],
  },

  downdog: {
    name: 'Downward Dog', target: 'Calves · Hamstrings · Shoulders', view: 'side', period: 4,
    a: { h: [92, 112], t: 25, n: 70, hN: [168, 180], hF: [164, 180], fN: [60, 180], fF: [64, 180] },
    b: { h: [90, 110], t: 27, n: 72, hN: [168, 180], hF: [164, 180], fN: [62, 172], fF: [64, 180], ft: [50, 25] },
    cues: [
      'Hands and feet down. Lift your hips up and back.',
      'Pedal your feet, pressing one heel down, then the other.',
      'Lengthen your spine and relax your neck.',
    ],
  },

  twist: {
    name: 'Lying Spinal Twist', target: 'Spine · Glutes', view: 'top', sided: true, limb: 'side', period: 9,
    props: [{ mat: true }],
    a: { h: [112, 108], t: 180, n: 180, hN: [64, 42], hF: [64, 174], fN: [150, 118], fF: [186, 116], kb: [1, -1] },
    b: { h: [112, 108], t: 180, n: 180, hN: [62, 40], hF: [62, 176], fN: [146, 128], fF: [186, 116], kb: [1, -1] },
    cues: [
      'Lie on your back and draw one knee across your body.',
      'Open your arms wide and keep both shoulders down.',
      'Let gravity do the work. Breathe and soften.',
    ],
  },

  lyingHam: {
    name: 'Lying Hamstring Stretch', target: 'Hamstrings', view: 'side', sided: true, limb: 'leg', period: 8,
    props: [{ strap: true }],
    a: { h: [104, 172], t: 180, n: 180, hN: [88, 140], hF: [86, 142], fN: [122, 98], fF: [180, 176] },
    b: { h: [104, 172], t: 180, n: 180, hN: [92, 136], hF: [90, 138], fN: [108, 97], fF: [180, 176] },
    cues: [
      'On your back, loop a towel or strap around one foot.',
      'Straighten the leg toward the ceiling with a gentle pull.',
      'Keep the other leg long on the floor.',
    ],
  },

  swingFront: {
    name: 'Leg Swings · Front to Back', target: 'Hips · Hamstrings', view: 'side', sided: true, limb: 'leg', period: 1.8, dynamic: true,
    a: { h: [100, 104], t: -92, n: -92, hN: [74, 140], hF: [126, 140], fN: [160, 140], fF: [100, 180] },
    b: { h: [100, 104], t: -86, n: -88, hN: [128, 140], hF: [72, 140], fN: [56, 166], fF: [100, 180] },
    cues: [
      'Hold on for balance and swing your leg forward and back.',
      'Keep your torso tall. Let the hip do the work.',
      'Smooth and relaxed, a little higher each swing.',
    ],
  },

  swingSide: {
    name: 'Leg Swings · Side to Side', target: 'Adductors · Hips', view: 'front', sided: true, limb: 'leg', period: 1.8, dynamic: true,
    a: { h: [100, 104], t: -92, n: -90, hN: [124, 100], hF: [76, 100], fN: [160, 160], fF: [94, 180] },
    b: { h: [102, 104], t: -88, n: -90, hN: [124, 100], hF: [76, 100], fN: [82, 176], fF: [94, 180] },
    cues: [
      'Face a wall for balance and swing your leg side to side.',
      'Cross in front of your body, then out wide.',
      'Stay tall and keep your hips square.',
    ],
  },

  hipCircles: {
    name: 'Hip Circles', target: 'Hips · Lower back', view: 'front', period: 3.2, dynamic: true,
    orbit: { parts: ['h', 'hN', 'hF'], r: [12, 4] },
    a: { h: [100, 106], t: -90, n: -90, hN: [118, 104], hF: [82, 104], fN: [114, 180], fF: [86, 180] },
    b: { h: [100, 106], t: -90, n: -90, hN: [118, 104], hF: [82, 104], fN: [114, 180], fF: [86, 180] },
    cues: [
      'Hands on hips, feet wide. Draw big slow circles with your hips.',
      'Switch direction whenever you like.',
      'Loose knees, relaxed shoulders.',
    ],
  },

  buttKicks: {
    name: 'Butt Kicks', target: 'Quads · Warm-up', view: 'side', period: 0.9, dynamic: true,
    a: { h: [100, 102], t: -84, n: -86, hN: [124, 80], hF: [86, 92], fN: [84, 118], fF: [100, 180], ft: [-60, 0] },
    b: { h: [100, 102], t: -84, n: -86, hN: [86, 92], hF: [124, 80], fN: [100, 180], fF: [84, 118], ft: [0, -60] },
    cues: [
      'Jog in place, kicking your heels up toward your glutes.',
      'Quick, light feet. Stay on the balls of your feet.',
      'Pump your arms and keep breathing.',
    ],
  },

  highKnees: {
    name: 'High Knees', target: 'Hip flexors · Warm-up', view: 'side', period: 1, dynamic: true,
    a: { h: [100, 102], t: -88, n: -88, hN: [86, 92], hF: [124, 80], fN: [114, 140], fF: [100, 180] },
    b: { h: [100, 102], t: -88, n: -88, hN: [124, 80], hF: [86, 92], fN: [100, 180], fF: [114, 140] },
    cues: [
      'Drive your knees up to hip height, one at a time.',
      'Land softly and stay tall through your chest.',
      'Swing your arms in rhythm.',
    ],
  },

  calfRaises: {
    name: 'Calf Raises', target: 'Calves · Ankles', view: 'side', period: 2.4, dynamic: true,
    a: { h: [100, 104], t: -90, n: -90, hN: [104, 156], hF: [96, 156], fN: [104, 180], fF: [98, 180], ft: [0, 0] },
    b: { h: [100, 94], t: -90, n: -90, hN: [104, 146], hF: [96, 146], fN: [106, 170], fF: [100, 170], ft: [58, 58] },
    cues: [
      'Rise onto the balls of your feet, then lower slowly.',
      'Control the way down. About two seconds.',
      'Stand tall with your core lightly engaged.',
    ],
  },

  armCircles: {
    name: 'Arm Circles', target: 'Shoulders · Upper back', view: 'front', period: 1.3, dynamic: true,
    orbit: { parts: ['hN', 'hF'], r: [8, 8], mirrorF: true },
    a: { h: [100, 104], t: -90, n: -90, hN: [164, 52], hF: [36, 52], fN: [110, 180], fF: [90, 180] },
    b: { h: [100, 104], t: -90, n: -90, hN: [164, 52], hF: [36, 52], fN: [110, 180], fF: [90, 180] },
    cues: [
      'Arms out wide. Make small, controlled circles.',
      'Gradually make them bigger.',
      'Now reverse the direction.',
    ],
  },

  worlds: {
    name: "World's Greatest Stretch", target: 'Hips · Spine · Hamstrings', view: 'side', sided: true, limb: 'leg', period: 6,
    a: { h: [96, 134], t: 10, n: 20, hN: [150, 180], hF: [146, 172], fN: [34, 180], fF: [140, 180], ft: [160, 0] },
    b: { h: [98, 134], t: -10, n: -60, hN: [150, 180], hF: [150, 74], fN: [34, 180], fF: [140, 180], ft: [160, 0] },
    cues: [
      'Step into a deep lunge, both hands inside your front foot.',
      'Rotate open and reach your top arm to the sky.',
      'Follow your hand with your eyes, then return.',
    ],
  },

  lungeReach: {
    name: 'Reverse Lunge + Reach', target: 'Hip flexors · Glutes', view: 'side', period: 5, dynamic: true,
    a: { h: [104, 104], t: -90, n: -92, hN: [110, 0], hF: [104, 0], fN: [108, 180], fF: [102, 180] },
    b: { h: [98, 142], t: -92, n: -94, hN: [102, 40], hF: [96, 40], fN: [36, 180], fF: [136, 180], ft: [160, 0] },
    cues: [
      'Step back into a lunge and reach both arms overhead.',
      'Drive through your front heel to stand back up.',
      'Alternate legs each rep.',
    ],
  },

  squat: {
    name: 'Deep Squat Hold', target: 'Hips · Ankles · Groin', view: 'side', period: 7,
    a: { h: [100, 160], t: -78, n: -80, hN: [128, 124], hF: [126, 122], fN: [118, 180], fF: [114, 180], ft: [0, 0] },
    b: { h: [100, 164], t: -80, n: -82, hN: [127, 126], hF: [125, 124], fN: [118, 180], fF: [114, 180], ft: [0, 0] },
    cues: [
      'Feet wider than hips, sink your hips into a deep squat.',
      'Press your elbows gently against your inner knees.',
      'Heels down if you can. Rest on a cushion if not.',
    ],
  },

  cobra: {
    name: 'Cobra', target: 'Hip flexors · Abs · Spine', view: 'side', period: 7,
    a: { h: [86, 172], t: -18, n: -30, hN: [132, 180], hF: [128, 180], fN: [10, 176], fF: [12, 178], ft: [180, 180] },
    b: { h: [86, 174], t: -36, n: -50, hN: [132, 180], hF: [128, 180], fN: [10, 176], fF: [12, 178], ft: [180, 180] },
    cues: [
      'Lie face down with your hands under your shoulders.',
      'Press up gently and lift your chest. Hips stay down.',
      'Relax your shoulders away from your ears.',
    ],
  },

  sideBend: {
    name: 'Standing Side Bend', target: 'Obliques · Lats', view: 'front', period: 7,
    a: { h: [100, 104], t: -74, n: -70, hN: [140, 8], hF: [128, 4], fN: [110, 180], fF: [90, 180] },
    b: { h: [100, 104], t: -106, n: -110, hN: [72, 4], hF: [60, 8], fN: [110, 180], fF: [90, 180] },
    cues: [
      'Feet planted, reach both arms overhead.',
      'Lean slowly to one side, then the other.',
      'Stay long through both sides of your waist.',
    ],
  },

  happyBaby: {
    name: 'Happy Baby', target: 'Hips · Groin · Lower back', view: 'side', period: 5,
    a: { h: [110, 172], t: 190, n: 185, hN: [98, 122], hF: [100, 124], fN: [100, 118], fF: [104, 120], ft: [-90, -90] },
    b: { h: [108, 172], t: 190, n: 185, hN: [94, 118], hF: [96, 120], fN: [96, 114], fF: [100, 116], ft: [-90, -90] },
    cues: [
      'On your back, hold the outsides of your feet, knees toward your armpits.',
      'Let your lower back sink into the floor.',
      'Rock gently from side to side.',
    ],
  },

  legsUpWall: {
    name: 'Legs Up the Wall', target: 'Recovery · Circulation', view: 'side', period: 9,
    props: [{ wall: 162 }],
    a: { h: [150, 172], t: 180, n: 180, hN: [70, 178], hF: [66, 176], fN: [152, 96], fF: [154, 98] },
    b: { h: [150, 171], t: 181, n: 181, hN: [70, 178], hF: [66, 176], fN: [152, 95], fF: [154, 97] },
    cues: [
      'Scoot your hips close to a wall and rest your legs up it.',
      'Arms relaxed, palms up. Just breathe.',
      'Let your legs feel light. Perfect for tired runner legs.',
    ],
  },

  bridge: {
    name: 'Glute Bridge', target: 'Glutes · Hamstrings', view: 'side', period: 3.5, dynamic: true,
    a: { h: [110, 170], t: 180, n: 180, hN: [90, 178], hF: [88, 178], fN: [138, 180], fF: [140, 180] },
    b: { h: [114, 142], t: 152, n: 175, hN: [90, 178], hF: [88, 178], fN: [138, 180], fF: [140, 180] },
    cues: [
      'On your back, knees bent, feet flat.',
      'Squeeze your glutes and lift your hips, then lower slowly.',
      'Ribs down, push through your heels.',
    ],
  },

  inchworm: {
    name: 'Inchworm', target: 'Hamstrings · Core · Shoulders', view: 'side', period: 7, dynamic: true,
    a: { h: [90, 102], t: 58, n: 82, hN: [132, 180], hF: [128, 180], fN: [100, 180], fF: [96, 180] },
    b: { h: [94, 150], t: -14, n: -10, hN: [146, 180], hF: [142, 180], fN: [22, 180], fF: [24, 180], ft: [70, 70] },
    cues: [
      'Fold forward and walk your hands out to a plank.',
      'Hold for a breath, then walk your feet toward your hands.',
      'Keep your legs as straight as feels good.',
    ],
  },

  soleus: {
    name: 'Bent-Knee Calf Stretch', target: 'Soleus · Achilles', view: 'side', sided: true, limb: 'leg', period: 7,
    props: [{ wall: 188 }],
    a: { h: [100, 118], t: -54, n: -48, hN: [184, 62], hF: [184, 70], fN: [74, 180], fF: [120, 180] },
    b: { h: [102, 125], t: -52, n: -46, hN: [184, 62], hF: [184, 70], fN: [74, 180], fF: [120, 180] },
    cues: [
      'Hands on the wall. Step one foot back and bend that back knee.',
      'Keep the back heel down and sink your hips. You will feel it low in the calf.',
      "This one targets the soleus and Achilles, the runner's workhorse.",
    ],
  },

  kneeToChest: {
    name: 'Knee to Chest', target: 'Glutes · Lower back', view: 'side', sided: true, limb: 'leg', period: 8,
    a: { h: [104, 172], t: 182, n: 184, hN: [86, 128], hF: [84, 130], fN: [90, 110], fF: [180, 176], ft: [-60, 0] },
    b: { h: [104, 172], t: 184, n: 188, hN: [82, 124], hF: [80, 126], fN: [86, 106], fF: [180, 176], ft: [-60, 0] },
    cues: [
      'Lie on your back and hug one knee toward your chest.',
      'Keep the other leg long and relaxed on the floor.',
      'Let your lower back melt into the floor as you breathe out.',
    ],
  },

  figureFour: {
    name: 'Lying Figure Four', target: 'Glutes · Piriformis', view: 'side', sided: true, limb: 'leg', period: 8,
    a: { h: [104, 172], t: 186, n: 184, hN: [110, 150], hF: [112, 152], fN: [124, 142], fF: [138, 180], kb: [-1, -1] },
    b: { h: [104, 172], t: 188, n: 186, hN: [104, 140], hF: [106, 142], fN: [116, 128], fF: [128, 158], kb: [-1, -1] },
    cues: [
      'On your back, cross one ankle over the opposite knee.',
      'Draw the bottom leg toward you until you feel the outer hip open.',
      'A gentler pigeon. Perfect for sore glutes and bedtime.',
    ],
  },
};

export const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'after', label: 'After run', icon: 'directions_run', hue: 165 },
  { id: 'before', label: 'Before run', icon: 'bolt', hue: 45 },
  { id: 'evening', label: 'Evening', icon: 'bedtime', hue: 290 },
  { id: 'quick', label: 'Quick', icon: 'timer', hue: 235 },
];

// Research-based rankings: effectiveness for runners weighed against simplicity
// (no equipment, easy to learn, safe to do alone). Sources are listed in RANKINGS.md.
export const RANKINGS = {
  after: [
    ['quad', 'Quads take a beating on every stride. Standing, no gear, and every physio list includes it.'],
    ['calf', 'Calves and Achilles absorb each landing. A wall is all you need.'],
    ['lunge', 'Undoes tight hip flexors from running and sitting. PTs call this one out every time.'],
    ['fold', 'Hamstrings and lower back in one simple standing move.'],
    ['pigeon', 'The physio favourite for glutes and outer hips, key for stability.'],
    ['soleus', 'Bent-knee version reaches the deep calf that a straight-leg stretch misses.'],
    ['downdog', 'Calves, hamstrings and shoulders together. Great if you can get on the floor.'],
    ['butterfly', 'Opens the groin and inner thighs, with easy control over the intensity.'],
    ['itband', 'Outer hip and IT band relief, standing, anywhere.'],
    ['child', 'A calm finish for the back and hips that brings your breathing down.'],
  ],
  before: [
    ['swingFront', 'Most-recommended pre-run drill. Opens the hips through the exact running motion.'],
    ['lungeReach', 'Fires the glutes and stretches the hip flexors while teaching knee tracking.'],
    ['swingSide', 'Wakes up the adductors and hip stabilisers that keep you running straight.'],
    ['highKnees', 'Raises your heart rate and grooves a strong knee drive.'],
    ['buttKicks', 'Dynamic quad stretch that warms the hamstrings too.'],
    ['worlds', 'Hits hips, hamstrings and the upper back in one flowing move.'],
    ['hipCircles', 'Loosens the hip joint gently. Zero learning curve.'],
    ['calfRaises', 'Primes the calves and Achilles for impact.'],
    ['inchworm', 'Full-body warm-up for hamstrings, core and shoulders.'],
    ['bridge', 'Switches the glutes on so they share the load.'],
  ],
  evening: [
    ['child', 'The classic wind-down for the back, glutes and hips. Breathe slow and let go.'],
    ['lyingHam', 'Long hamstring stretch you can do lying down. A bedtime staple.'],
    ['twist', 'Releases the spine and glutes and helps the whole body relax.'],
    ['kneeToChest', 'Simple, gentle release for the lower back and glutes.'],
    ['catcow', 'Moves the spine with your breath to settle the nervous system.'],
    ['figureFour', 'A gentler pigeon on your back. Ideal for sore glutes at night.'],
    ['legsUpWall', 'Rests tired legs and helps you calm down before sleep.'],
    ['butterfly', 'Easy inner-hip opener you can do sitting on the bed.'],
    ['happyBaby', 'Opens the hips and groin while easing the lower back.'],
    ['pigeon', 'A deeper glute release when you have a little more time.'],
  ],
  quick: [
    ['lunge', 'Biggest payoff in the least time for runners who also sit a lot.'],
    ['calf', 'The fastest relief for tight calves and Achilles.'],
    ['quad', 'Standing, anywhere, in 30 seconds a side.'],
    ['downdog', 'Calves, hamstrings and back all at once.'],
    ['worlds', 'Hips, hamstrings and spine in one move. Maximum coverage.'],
    ['fold', 'Quick hamstring and back release with no setup.'],
    ['soleus', 'Gets the deep calf that runners often miss.'],
    ['itband', 'Outer hip relief, standing.'],
    ['squat', 'Opens the hips and ankles together.'],
    ['sideBend', 'Lengthens the side body after hunching over a desk.'],
  ],
};

export const topFive = (cat) => RANKINGS[cat].slice(0, 5).map(([id]) => id);

// items: [stretchId, seconds per side]
export const ROUTINES = [
  {
    id: 'top5-after', hero: 'quad', title: 'Top 5 After Run', cat: 'after', hue: 165, icon: 'workspace_premium', top: true,
    blurb: 'The five most effective, simplest post-run stretches, as ranked from physical therapist and coaching advice. Hold each about 30 seconds while your muscles are still warm.',
    items: [['quad', 30], ['calf', 30], ['lunge', 30], ['fold', 40], ['pigeon', 35]],
  },
  {
    id: 'post-run-reset', hero: 'lunge', title: 'Post-Run Reset', cat: 'after', hue: 165, icon: 'directions_run',
    blurb: 'The full cooldown: the Top 5, then the deep calf, down dog and a calm finish.',
    items: [['quad', 30], ['calf', 30], ['lunge', 35], ['fold', 40], ['pigeon', 40], ['soleus', 30], ['downdog', 30], ['child', 40]],
  },
  {
    id: 'long-run-recovery', hero: 'lyingHam', title: 'Long Run Recovery', cat: 'after', hue: 140, icon: 'landscape',
    blurb: 'Long, slow floor stretches for big-mileage days. Grab a mat and a towel.',
    items: [['legsUpWall', 60], ['lyingHam', 40], ['bridge', 30], ['happyBaby', 40], ['pigeon', 45], ['itband', 25], ['cobra', 30], ['child', 45], ['twist', 35]],
  },
  {
    id: 'top5-before', hero: 'swingFront', title: 'Top 5 Before Run', cat: 'before', hue: 45, icon: 'workspace_premium', top: true,
    blurb: 'Moving stretches only. Research shows long static holds before a run can slightly reduce performance, while dynamic moves warm you up without that cost.',
    items: [['swingFront', 30], ['lungeReach', 60], ['swingSide', 30], ['highKnees', 45], ['buttKicks', 45]],
  },
  {
    id: 'dynamic-warmup', hero: 'highKnees', title: 'Dynamic Warm-Up', cat: 'before', hue: 30, icon: 'bolt',
    blurb: 'The Top 5 warm-up, plus hips, calves and a full-body inchworm. Do this right before you head out the door.',
    items: [['swingFront', 20], ['lungeReach', 40], ['swingSide', 20], ['highKnees', 30], ['buttKicks', 30], ['worlds', 30], ['hipCircles', 30], ['calfRaises', 30], ['inchworm', 40]],
  },
  {
    id: 'race-day-primer', hero: 'worlds', title: 'Race Day Primer', cat: 'before', hue: 15, icon: 'flag',
    blurb: 'A sharp five minutes for the start corral. Gets you loose without tiring you out.',
    items: [['highKnees', 30], ['swingFront', 20], ['swingSide', 20], ['buttKicks', 30], ['worlds', 30], ['calfRaises', 30], ['armCircles', 20]],
  },
  {
    id: 'top5-evening', hero: 'child', title: 'Top 5 Evening', cat: 'evening', hue: 290, icon: 'workspace_premium', top: true,
    blurb: 'The five gentlest, most effective wind-down stretches. All on the floor, all easy. Do them half an hour before bed.',
    items: [['child', 50], ['lyingHam', 40], ['twist', 40], ['kneeToChest', 35], ['catcow', 45]],
  },
  {
    id: 'evening-unwind', hero: 'pigeon', title: 'Evening Unwind', cat: 'evening', hue: 270, icon: 'bedtime',
    blurb: 'Ten slow minutes on the floor: the Top 5 evening stretches, then glutes, hips and tired legs.',
    items: [['child', 45], ['lyingHam', 35], ['twist', 35], ['kneeToChest', 30], ['catcow', 40], ['figureFour', 35], ['butterfly', 40], ['legsUpWall', 50]],
  },
  {
    id: 'bedtime-hips', hero: 'butterfly', title: 'Bedtime Hips', cat: 'evening', hue: 320, icon: 'nights_stay',
    blurb: 'Gentle hip openers to undo hours of sitting and running. Great right before bed.',
    items: [['squat', 40], ['butterfly', 45], ['figureFour', 40], ['happyBaby', 45], ['twist', 40], ['child', 45], ['legsUpWall', 60]],
  },
  {
    id: 'five-minute-fix', hero: 'calf', title: 'Top 5 Quick Fix', cat: 'quick', hue: 235, icon: 'workspace_premium', top: true,
    blurb: 'Short on time? The five stretches with the biggest payoff for runners, in about five minutes.',
    items: [['lunge', 30], ['calf', 25], ['quad', 25], ['downdog', 40], ['worlds', 30]],
  },
  {
    id: 'calf-sos', hero: 'downdog', title: 'Tight Calves SOS', cat: 'quick', hue: 100, icon: 'healing',
    blurb: 'Calves and Achilles feeling cranky? A focused lower-leg session.',
    items: [['calfRaises', 30], ['calf', 30], ['downdog', 40], ['squat', 30], ['fold', 30], ['inchworm', 40], ['lyingHam', 25]],
  },
  {
    id: 'desk-reset', hero: 'catcow', title: 'Desk Day Reset', cat: 'quick', hue: 70, icon: 'chair',
    blurb: 'Sat all day? Open your hips and wake up your spine before your evening run.',
    items: [['cobra', 30], ['catcow', 40], ['lunge', 30], ['sideBend', 30], ['squat', 40], ['fold', 30], ['bridge', 30]],
  },
];

export const PREP_SECS = 8;
export const SWITCH_SECS = 4;
export const REST_SECS = 6;

export function getStretch(id) {
  return STRETCHES[id];
}

/** Expand a routine into a playable timeline of steps. */
export function buildTimeline(routine, scale = 1) {
  const moves = [];
  routine.items.forEach(([id, secs]) => {
    const s = STRETCHES[id];
    const dur = Math.max(10, Math.round(secs * scale));
    if (s.sided) {
      moves.push({ id, stretch: s, side: 'L', secs: dur });
      moves.push({ id, stretch: s, side: 'R', secs: dur });
    } else {
      moves.push({ id, stretch: s, side: null, secs: dur });
    }
  });
  const steps = [{ kind: 'prep', secs: PREP_SECS, next: moves[0] }];
  moves.forEach((m, i) => {
    steps.push({ kind: 'hold', secs: m.secs, move: m, index: i });
    const nx = moves[i + 1];
    if (nx) {
      const sw = nx.id === m.id;
      steps.push({ kind: 'rest', secs: sw ? SWITCH_SECS : REST_SECS, next: nx, switchSides: sw });
    }
  });
  return { steps, moves };
}

export function routineSeconds(routine, scale = 1) {
  return buildTimeline(routine, scale).steps.reduce((a, s) => a + s.secs, 0);
}

export function sideLabel(move) {
  if (!move.side) return '';
  const word = move.side === 'L' ? 'Left' : 'Right';
  const limb = move.stretch.limb === 'side' ? 'side' : 'leg';
  return `${word} ${limb}`;
}
