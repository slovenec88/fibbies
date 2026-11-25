// Stretch library + routines for before and after exercise, evenings, short breaks and strength.
import { t } from './i18n.js';
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
    a: { h: [100, 104], t: -88, n: -90, hN: [88, 112], hF: [150, 50], fN: [86, 110], fF: [100, 180], ft: [-150, 0] },
    b: { h: [100, 104], t: -90, n: -88, hN: [90, 108], hF: [152, 46], fN: [89, 106], fF: [100, 180], ft: [-155, 0] },
    cues: [
      'Hold your ankle and draw your heel toward your glute.',
      'Keep your knees together and squeeze your glute.',
      'Stand tall, hips pressed slightly forward.',
    ],
  },

  calf: {
    name: 'Wall Calf Stretch', target: 'Calves · Achilles', view: 'side', sided: true, limb: 'leg', period: 7,
    props: [{ wall: 188 }],
    a: { h: [104, 112], t: -55, n: -50, hN: [184, 58], hF: [184, 66], fN: [70, 180], fF: [120, 180], ft: [0, 0] },
    b: { h: [110, 114], t: -50, n: -45, hN: [184, 58], hF: [184, 66], fN: [70, 180], fF: [120, 180], ft: [0, 0] },
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
    a: { h: [92, 112], t: 25, n: 70, hN: [168, 180], hF: [164, 180], fN: [60, 180], fF: [64, 180], ft: [0, 0] },
    b: { h: [90, 110], t: 27, n: 72, hN: [168, 180], hF: [164, 180], fN: [62, 172], fF: [64, 180], ft: [50, 0] },
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
    a: { h: [104, 172], t: 192, n: 188, hN: [108, 140], hF: [106, 142], fN: [120, 98], fF: [180, 176], ft: [-100, -80] },
    b: { h: [104, 172], t: 194, n: 190, hN: [104, 134], hF: [102, 136], fN: [106, 97], fF: [180, 176], ft: [-110, -80] },
    cues: [
      'On your back, lift one leg and hold behind your thigh with both hands.',
      'Gently draw the leg toward you. A soft bend in the knee is fine.',
      'Keep the other leg long on the floor and your head relaxed.',
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
    a: { h: [100, 102], t: -84, n: -86, hN: [124, 80], hF: [86, 92], fN: [84, 118], fF: [100, 180], ft: [170, 0] },
    b: { h: [100, 102], t: -84, n: -86, hN: [86, 92], hF: [124, 80], fN: [100, 180], fF: [84, 118], ft: [0, 170] },
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
    a: { h: [100, 104], t: -90, n: -90, hN: [178, 52], hF: [22, 52], fN: [110, 180], fF: [90, 180] },
    b: { h: [100, 104], t: -90, n: -90, hN: [178, 52], hF: [22, 52], fN: [110, 180], fF: [90, 180] },
    cues: [
      'Arms out wide. Make small, controlled circles.',
      'Gradually make them bigger.',
      'Now reverse the direction.',
    ],
  },

  worlds: {
    name: "World's Greatest Stretch", target: 'Hips · Spine · Hamstrings', view: 'side', sided: true, limb: 'leg', period: 6, dynamic: true,
    a: { h: [91, 137], t: -3, n: 25, hN: [133, 180], hF: [147, 180], fN: [30, 171], fF: [151, 180], ft: [70, 0] },
    b: { h: [91, 137], t: -11, n: -66, hN: [133, 180], hF: [142, 73], fN: [30, 171], fF: [151, 180], ft: [70, 0] },
    cues: [
      "Step one foot forward and put the opposite hand on the floor inside that foot. Turn your chest toward the front knee and reach the other arm up.",
      "Keep your front foot and supporting hand planted. Lower the raised hand and repeat slowly.",
      "Keep your hips steady as your chest turns.",
    ],
  },

  lungeReach: {
    name: 'Reverse Lunge + Reach', target: 'Hip flexors · Glutes', view: 'side', period: 5, dynamic: true,
    a: { h: [128, 104], t: -90, n: -92, hN: [134, 0], hF: [128, 0], fN: [132, 180], fF: [128, 180], ft: [0, 0] },
    b: { h: [98, 142], t: -92, n: -94, hN: [102, 40], hF: [96, 40], fN: [36, 171], fF: [136, 180], ft: [70, 0] },
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
      'Let your legs feel light. Perfect for tired legs.',
    ],
  },

  bridge: {
    name: 'Glute Bridge', target: 'Glutes · Hamstrings', view: 'side', period: 3.5, dynamic: true,
    a: { h: [110, 170], t: 180, n: 180, hN: [124, 179], hF: [122, 179], fN: [138, 180], fF: [140, 180], ft: [0, 0] },
    b: { h: [114, 142], t: 152, n: 175, hN: [124, 179], hF: [122, 179], fN: [138, 180], fF: [140, 180], ft: [0, 0] },
    cues: [
      'On your back, knees bent, feet flat.',
      'Squeeze your glutes and lift your hips, then lower slowly.',
      'Ribs down, push through your heels.',
    ],
  },

  inchworm: {
    name: 'Inchworm', target: 'Hamstrings · Core · Shoulders', view: 'side', period: 8.4, dynamic: true,
    // Fold, walk the hands out to a plank, walk the feet in to the hands, stand up, hop back to the start.
    seq: [
      { h: [26, 104], t: -90, n: -90, hN: [34, 104], hF: [30, 105], fN: [30, 180], fF: [24, 180], ft: [0, 0] },
      { h: [16, 100], t: 50, n: 72, hN: [56, 180], hF: [52, 180], fN: [30, 180], fF: [24, 180], ft: [0, 0] },
      { h: [99, 147], t: -24, n: -20, hN: [148, 180], hF: [144, 180], fN: [30, 171], fF: [32, 171], ft: [70, 70], eb: [1, 1] },
      { h: [108, 100], t: 50, n: 72, hN: [148, 180], hF: [144, 180], fN: [122, 180], fF: [116, 180], ft: [0, 0] },
      { h: [118, 104], t: -90, n: -90, hN: [126, 104], hF: [122, 105], fN: [122, 180], fF: [116, 180], ft: [0, 0] },
    ],
    hops: [0, 0, 4, 0, 14],
    hopsHips: [0, 0, 0, 0, 1],
    cues: [
      'Fold forward and walk your hands out to a plank.',
      'Hold for a breath, then walk your feet toward your hands.',
      'Keep your legs as straight as feels good.',
    ],
  },

  soleus: {
    name: 'Bent-Knee Calf Stretch', target: 'Soleus · Achilles', view: 'side', sided: true, limb: 'leg', period: 7,
    props: [{ wall: 188 }],
    a: { h: [102, 110], t: -54, n: -48, hN: [184, 62], hF: [184, 70], fN: [88, 180], fF: [124, 180], ft: [0, 0] },
    b: { h: [104, 116], t: -52, n: -46, hN: [184, 62], hF: [184, 70], fN: [88, 180], fF: [124, 180], ft: [0, 0] },
    cues: [
      'Hands on the wall. Step one foot back and bend that back knee.',
      'Keep the back heel down and sink your hips. You will feel it low in the calf.',
      'This one targets the soleus and Achilles, which carry you through every step.',
    ],
  },

  kneeToChest: {
    name: 'Knee to Chest', target: 'Glutes · Lower back', view: 'side', sided: true, limb: 'leg', period: 8,
    a: { h: [104, 172], t: 182, n: 184, hN: [86, 128], hF: [84, 130], fN: [90, 110], fF: [180, 176], ft: [-160, -80] },
    b: { h: [104, 172], t: 184, n: 188, hN: [82, 124], hF: [80, 126], fN: [86, 106], fF: [180, 176], ft: [-160, -80] },
    cues: [
      'Lie on your back and hug one knee toward your chest.',
      'Keep the other leg long and relaxed on the floor.',
      'Let your lower back melt into the floor as you breathe out.',
    ],
  },

  figureFour: {
    name: 'Lying Figure Four', target: 'Glutes · Piriformis', view: 'side', sided: true, limb: 'leg', period: 8,
    a: { h: [104, 172], t: 186, n: 184, hN: [110, 150], hF: [112, 152], fN: [124, 142], fF: [138, 180], ft: [null, 0], kb: [-1, -1] },
    b: { h: [104, 172], t: 188, n: 186, hN: [104, 140], hF: [106, 142], fN: [116, 128], fF: [128, 158], ft: [null, -10], kb: [-1, -1] },
    cues: [
      'On your back, cross one ankle over the opposite knee.',
      'Draw the bottom leg toward you until you feel the outer hip open.',
      'A gentler pigeon. Perfect for sore glutes and bedtime.',
    ],
  },

  // ---------- Work breaks: standing, nothing needed, no floor ----------
  neckTilt: {
    name: 'Neck Side Stretch', target: 'Neck · Upper traps', view: 'front', sided: true, limb: 'side', period: 8, work: true,
    a: { h: [100, 104], t: -90, n: -66, hN: [112, 25], hF: [76, 150], eb: [1, 1], fN: [110, 180], fF: [90, 180] },
    b: { h: [100, 104], t: -90, n: -58, hN: [116, 27], hF: [74, 154], eb: [1, 1], fN: [110, 180], fF: [90, 180] },
    cues: [
      'Tilt your ear toward your shoulder and rest your hand lightly on your head.',
      'Let the other arm hang heavy and reach your fingers toward the floor.',
      "Don't pull. The weight of your hand is enough.",
    ],
  },

  shoulderCross: {
    name: 'Cross-Body Shoulder Stretch', target: 'Shoulders · Upper back', view: 'front', sided: true, limb: 'side', period: 7, work: true,
    a: { h: [100, 104], t: -90, n: -90, hN: [64, 60], hF: [104, 62], fN: [110, 180], fF: [90, 180] },
    b: { h: [100, 104], t: -90, n: -88, hN: [60, 58], hF: [102, 60], fN: [110, 180], fF: [90, 180] },
    cues: [
      'Bring one arm straight across your chest.',
      'Hug it closer with the other hand, just above the elbow.',
      'Keep your shoulder down, away from your ear.',
    ],
  },

  tricep: {
    name: 'Overhead Triceps Stretch', target: 'Triceps · Shoulders', view: 'front', sided: true, limb: 'side', period: 7, work: true,
    a: { h: [100, 104], t: -90, n: -92, hN: [96, 48], hF: [114, 14], fN: [110, 180], fF: [90, 180], eb: [1, -1] },
    b: { h: [100, 104], t: -90, n: -94, hN: [93, 50], hF: [111, 12], fN: [110, 180], fF: [90, 180], eb: [1, -1] },
    cues: [
      'Reach one arm up, bend the elbow and let your hand drop behind your head.',
      'With the other hand, gently press the elbow back.',
      'Stand tall and keep breathing.',
    ],
  },

  chestOpener: {
    name: 'Standing Chest Opener', target: 'Chest · Front shoulders', view: 'side', period: 7, work: true,
    a: { h: [100, 104], t: -93, n: -96, hN: [70, 122], hF: [72, 120], fN: [104, 180], fF: [96, 180] },
    b: { h: [101, 104], t: -97, n: -104, hN: [62, 112], hF: [64, 110], fN: [104, 180], fF: [96, 180] },
    cues: [
      'Clasp your hands behind your back.',
      'Squeeze your shoulder blades together and lift your chest.',
      'Raise your hands a little, only as far as feels good.',
    ],
  },

  backBend: {
    name: 'Standing Back Bend', target: 'Lower back · Abs', view: 'side', period: 7, work: true,
    a: { h: [103, 104], t: -98, n: -102, hN: [88, 102], hF: [90, 100], fN: [102, 180], fF: [97, 180] },
    b: { h: [107, 104], t: -108, n: -118, hN: [86, 100], hF: [88, 98], fN: [102, 180], fF: [97, 180] },
    cues: [
      'Hands on your lower back, fingers pointing down.',
      'Push your hips gently forward and lean back a little.',
      'Look up softly. Small and easy is perfect after sitting.',
    ],
  },

  standingTwist: {
    name: 'Standing Twist', target: 'Spine · Obliques', view: 'front', period: 3, dynamic: true, work: true,
    a: { h: [100, 104], t: -88, n: -86, hN: [150, 92], hF: [124, 80], fN: [112, 180], fF: [88, 180] },
    b: { h: [100, 104], t: -92, n: -94, hN: [76, 80], hF: [50, 92], fN: [112, 180], fF: [88, 180] },
    cues: [
      'Feet hip-width apart. Turn your upper body side to side.',
      'Let your arms swing loosely and wrap around you.',
      'Keep your hips facing forward and your knees soft.',
    ],
  },

  hipFlexorStand: {
    name: 'Standing Hip Flexor Stretch', target: 'Hip flexors · Quads', view: 'side', sided: true, limb: 'leg', period: 8, work: true,
    a: { h: [98, 112], t: -90, n: -90, hN: [106, 110], hF: [102, 108], fN: [132, 180], fF: [62, 174], ft: [0, 40] },
    b: { h: [104, 116], t: -94, n: -94, hN: [110, 112], hF: [106, 110], fN: [132, 180], fF: [62, 174], ft: [0, 40] },
    cues: [
      'Step one foot back into a long stance, back heel lifted.',
      'Tuck your tailbone under and gently push your hips forward.',
      'Feel it at the front of the back hip. Stay tall, no need to lunge deep.',
    ],
  },

  hamstringStand: {
    name: 'Standing Hamstring Stretch', target: 'Hamstrings · Calves', view: 'side', sided: true, limb: 'leg', period: 8, work: true,
    a: { h: [90, 118], t: -58, n: -44, hN: [122, 142], hF: [120, 140], fN: [138, 180], fF: [86, 180], ft: [-50, 0] },
    b: { h: [86, 120], t: -44, n: -30, hN: [126, 150], hF: [124, 148], fN: [138, 180], fF: [86, 180], ft: [-55, 0] },
    cues: [
      'Put one heel forward with the toes up, and bend the back knee a little.',
      'Hinge forward from your hips with a long, flat back.',
      'Rest your hands on your thighs and feel the back of the front leg.',
    ],
  },

  wristStretch: {
    name: 'Wrist & Forearm Stretch', target: 'Forearms · Wrists', view: 'side', sided: true, limb: 'side', period: 7, work: true,
    a: { h: [100, 104], t: -90, n: -88, hN: [156, 56], hF: [148, 54], fN: [104, 180], fF: [96, 180] },
    b: { h: [100, 104], t: -90, n: -86, hN: [157, 60], hF: [147, 58], fN: [104, 180], fF: [96, 180] },
    cues: [
      'Hold one arm out straight, palm facing away, fingers pointing up.',
      'With the other hand, gently draw the fingers back toward you.',
      'Keep the elbow straight and the shoulder relaxed. Great after a lot of typing.',
    ],
  },
  // ---- Strength: simple, safe moves with the biggest payoff. `strength` makes Max lengthen them
  // like sets (×1.5) rather than like stretches (60 s holds). ----
  airSquat: {
    name: 'Bodyweight Squat', target: 'Thighs · Glutes', view: 'side', period: 3, dynamic: true, strength: true,
    a: { h: [100, 104], t: -90, n: -90, hN: [152, 60], hF: [148, 62], fN: [104, 180], fF: [98, 180], ft: [0, 0] },
    b: { h: [80, 140], t: -58, n: -70, hN: [158, 100], hF: [154, 102], fN: [104, 180], fF: [98, 180], ft: [0, 0] },
    cues: [
      'Feet shoulder-width apart. Sit your hips back and down, arms forward.',
      'Knees follow your toes, chest stays proud.',
      'Push through your whole foot to stand tall again.',
    ],
  },

  pushup: {
    name: 'Push-Up', target: 'Chest · Arms · Core', view: 'side', period: 3, dynamic: true, strength: true,
    a: { h: [93, 147], t: -24, n: -20, hN: [142, 180], hF: [138, 180], fN: [24, 171], fF: [26, 171], ft: [70, 70], eb: [1, 1] },
    b: { h: [99, 167], t: -8, n: -6, hN: [142, 180], hF: [138, 180], fN: [24, 171], fF: [26, 171], ft: [70, 70], eb: [1, 1] },
    cues: [
      'Hands under your shoulders, body in one straight line.',
      'Lower your chest toward the floor, then press back up.',
      'Too hard? Put your knees down or push against a wall.',
    ],
  },

  plank: {
    name: 'Forearm Plank', target: 'Core · Shoulders', view: 'side', period: 6, strength: true,
    a: { h: [98, 163], t: -12, n: -8, hN: [175, 179], hF: [171, 179], fN: [24, 171], fF: [26, 171], ft: [70, 70] },
    b: { h: [98, 161], t: -13, n: -9, hN: [175, 179], hF: [171, 179], fN: [24, 171], fF: [26, 171], ft: [70, 70] },
    cues: [
      'Forearms down, elbows under your shoulders, body long and straight.',
      'Squeeze your glutes and pull your belly button in.',
      "Keep breathing. Don't let your hips sag.",
    ],
  },

  birdDog: {
    name: 'Bird Dog', target: 'Lower back · Core · Glutes', view: 'side', sided: true, limb: 'side', period: 4, dynamic: true, strength: true,
    a: { h: [82, 140], t: -12, n: -20, hN: [134, 180], hF: [130, 180], fN: [46, 178], fF: [50, 178], ft: [180, 180] },
    b: { h: [82, 140], t: -12, n: -14, hN: [186, 118], hF: [130, 180], fN: [46, 178], fF: [8, 134], ft: [180, 175] },
    cues: [
      'On hands and knees. Reach one arm forward and the opposite leg back.',
      'Keep your back flat, as if balancing a glass on it.',
      'Pause at the top, then return slowly.',
    ],
  },

  superman: {
    name: 'Superman', target: 'Back · Glutes', view: 'side', period: 4, dynamic: true, strength: true,
    a: { h: [84, 174], t: 0, n: 0, hN: [190, 175], hF: [189.5, 176], fN: [8.5, 176], fF: [9.5, 176], ft: [180, 180], kb: [-1, -1] },
    b: { h: [84, 173], t: -9, n: -14, hN: [187.5, 151], hF: [187, 152], fN: [10, 158], fF: [11, 160], ft: [180, 180], kb: [-1, -1] },
    cues: [
      'Lie face down, arms reaching forward.',
      'Lift your arms, chest and legs a little off the floor.',
      'Hold for a breath, look at the floor, then lower slowly.',
    ],
  },

  deadBug: {
    name: 'Dead Bug', target: 'Core · Lower back', view: 'side', sided: true, limb: 'side', period: 4, dynamic: true, strength: true,
    a: { h: [120, 172], t: 180, n: 180, hN: [70, 120], hF: [66, 122], fN: [158, 134], fF: [156, 136] },
    b: { h: [120, 172], t: 180, n: 180, hN: [20, 166], hF: [66, 122], fN: [158, 134], fF: [194, 168] },
    cues: [
      'On your back, arms up, knees bent over your hips.',
      'Lower one arm overhead and the opposite leg toward the floor.',
      'Keep your lower back pressed down. Go only as far as you can control.',
    ],
  },

  splitSquat: {
    name: 'Split Squat', target: 'Thighs · Glutes · Knees', view: 'side', sided: true, limb: 'leg', period: 3.5, dynamic: true, strength: true,
    a: { h: [94, 116], t: -90, n: -90, hN: [104, 116], hF: [100, 118], fN: [52, 171], fF: [134, 180], ft: [65, 0] },
    b: { h: [94, 146], t: -90, n: -90, hN: [104, 146], hF: [100, 148], fN: [52, 171], fF: [134, 180], ft: [80, 0] },
    cues: [
      'One foot forward, one back. Lower your back knee toward the floor.',
      'Front knee over your ankle, torso tall.',
      'Push through your front heel to come back up.',
    ],
  },

  wallSit: {
    name: 'Wall Sit', target: 'Thighs · Knees', view: 'side', period: 6, strength: true,
    props: [{ wall: 54 }],
    a: { h: [62, 142], t: -90, n: -88, hN: [92, 140], hF: [88, 142], fN: [100, 180], fF: [96, 180], ft: [0, 0] },
    b: { h: [62, 141], t: -90, n: -86, hN: [92, 139], hF: [88, 141], fN: [100, 180], fF: [96, 180], ft: [0, 0] },
    cues: [
      'Back against a wall, slide down until your knees are bent.',
      'Knees over your ankles, weight in your heels.',
      'Too hard? Slide up a little. Keep breathing.',
    ],
  },

  // ---- Feet: the small muscles under the arch, often forgotten. Strong feet steady the ankle, knee and hip above them. ----
  bigToeLift: {
    name: 'Big Toe Lifts', target: 'Feet · Arches · Toes', view: 'side', period: 3, dynamic: true, strength: true,
    a: { h: [100, 104], t: -90, n: -90, hN: [104, 156], hF: [96, 156], fN: [104, 180], fF: [98, 180], ft: [0, 0] },
    b: { h: [100, 104], t: -90, n: -90, hN: [104, 156], hF: [96, 156], fN: [104, 180], fF: [98, 180], ft: [-26, -26] },
    cues: [
      'Stand tall, feet flat, weight even on both feet.',
      'Lift only your big toes. Keep the other four pressed down.',
      'Lower slowly. Hard at first? Do it sitting, and hold the small toes down with a finger.',
    ],
  },
  smallToeLift: {
    name: 'Small Toe Lifts', target: 'Feet · Toes', view: 'side', period: 3, dynamic: true, strength: true,
    a: { h: [100, 104], t: -90, n: -90, hN: [104, 156], hF: [96, 156], fN: [104, 180], fF: [98, 180], ft: [0, 0] },
    b: { h: [100, 104], t: -90, n: -90, hN: [104, 156], hF: [96, 156], fN: [104, 180], fF: [98, 180], ft: [-20, -20] },
    cues: [
      'Now the other way: press your big toes into the floor.',
      'Lift the four small toes, as high as they will go.',
      'Spread them wide before you set them down.',
    ],
  },
  shortFoot: {
    name: 'Short Foot', target: 'Arches · Feet', view: 'side', period: 5, dynamic: true, strength: true,
    a: { h: [100, 104], t: -90, n: -90, hN: [104, 156], hF: [96, 156], fN: [104, 180], fF: [98, 180], ft: [0, 0] },
    b: { h: [100, 103], t: -90, n: -90, hN: [104, 155], hF: [96, 155], fN: [104, 179], fF: [98, 179], ft: [10, 10] },
    cues: [
      'Feet flat, toes long and relaxed.',
      'Pull the ball of your foot toward your heel so the arch lifts. Toes stay flat, don’t curl them.',
      'Hold for five, then relax. Small and slow.',
    ],
  },
  towelScrunch: {
    name: 'Towel Scrunches', target: 'Feet · Toes · Arches', view: 'side', period: 2, dynamic: true, strength: true,
    props: [{ chair: [56, 92, 146] }, { towel: [104, 160] }],
    a: { h: [78, 142], t: -88, n: -86, hN: [104, 138], hF: [100, 139], fN: [116, 180], fF: [110, 180], ft: [-8, -8] },
    b: { h: [78, 142], t: -88, n: -86, hN: [104, 138], hF: [100, 139], fN: [116, 180], fF: [110, 180], ft: [10, 10] },
    cues: [
      'Sit with a towel flat under your feet, heels on the floor.',
      'Grip the towel with your toes and pull it toward you, bit by bit.',
      'At the end, spread it out again and go on. Keep your heels still.',
    ],
  },
  stepCalfRaise: {
    name: 'Step Calf Raises', target: 'Calves · Arches · Achilles', view: 'side', period: 4, dynamic: true, strength: true,
    props: [{ step: [100, 140, 168] }, { wall: 146 }],
    a: { h: [94, 99], t: -88, n: -88, hN: [143, 66], hF: [143, 72], fN: [95, 173], fF: [91, 173], ft: [-22, -22] },
    b: { h: [98, 84], t: -90, n: -90, hN: [143, 52], hF: [143, 58], fN: [98, 159], fF: [94, 159], ft: [58, 58] },
    cues: [
      'Balls of your feet on a stair edge, a hand on the rail. A rolled towel under your toes makes it even better.',
      'Rise all the way up onto your toes.',
      'Then lower slowly until your heels drop below the step.',
    ],
  },
  singleLegBalance: {
    name: 'Single-Leg Balance', target: 'Feet · Ankles · Balance', view: 'side', sided: true, limb: 'leg', period: 5, strength: true,
    a: { h: [100, 104], t: -90, n: -90, hN: [118, 112], hF: [84, 112], fN: [102, 180], fF: [108, 150], ft: [0, 20] },
    b: { h: [101, 104], t: -89, n: -88, hN: [119, 113], hF: [85, 111], fN: [102, 180], fF: [109, 151], ft: [0, 20] },
    cues: [
      'Stand on one foot, the knee soft. Feel your whole foot grip the floor.',
      'Keep the arch lifted and your hips level.',
      'Easy? Close your eyes, or stand on a cushion. Stay near a wall or chair.',
    ],
  },

  slowCalf: {
    name: 'Slow Calf Lowers', target: 'Calves · Achilles', view: 'side', sided: true, limb: 'leg', period: 4, dynamic: true, strength: true,
    props: [{ wall: 150 }],
    a: { h: [100, 94], t: -90, n: -90, hN: [146, 66], hF: [146, 72], fN: [106, 170], fF: [100, 170], ft: [58, 58] },
    b: { h: [100, 104], t: -90, n: -90, hN: [146, 76], hF: [146, 82], fN: [104, 180], fF: [82, 148], ft: [0, 100] },
    cues: [
      'Hand on a wall. Rise up on both feet.',
      'Lift one foot and lower slowly on the other. Count to three.',
      'A step makes it stronger: let your heel drop below it.',
    ],
  },

  goodMorning: {
    name: 'Hip Hinge', target: 'Hamstrings · Lower back · Glutes', view: 'side', period: 4, dynamic: true, strength: true,
    a: { h: [100, 104], t: -90, n: -90, hN: [112, 66], hF: [110, 68], fN: [104, 180], fF: [98, 180], ft: [0, 0] },
    b: { h: [86, 106], t: -18, n: -10, hN: [126, 100], hF: [124, 102], fN: [104, 180], fF: [98, 180], ft: [0, 0] },
    cues: [
      'Hands on your chest, knees soft.',
      'Push your hips back and tip forward with a flat back.',
      'Squeeze your glutes to stand back up.',
    ],
  },
  wallPushup: {
    name: 'Wall Push-Up', target: 'Chest · Shoulders · Arms', view: 'side', period: 3, dynamic: true, strength: true,
    props: [{ wall: 170 }],
    a: { h: [111, 108], t: -72, n: -70, hN: [168, 84], hF: [168, 90], fN: [88, 180], fF: [84, 180], ft: [0, 0] },
    b: { h: [126, 114], t: -58, n: -54, hN: [168, 84], hF: [168, 90], fN: [86, 174], fF: [82, 174], ft: [40, 40] },
    cues: [
      'Hands on a wall at chest height, step your feet back.',
      'Bend your elbows to bring your chest to the wall, then push away.',
      'Keep your body straight like a plank. The further your feet, the harder.',
    ],
  },

  shoulderTaps: {
    name: 'Plank Shoulder Taps', target: 'Shoulders · Core', view: 'side', period: 2, dynamic: true, strength: true,
    a: { h: [93, 147], t: -24, n: -20, hN: [142, 180], hF: [138, 180], fN: [24, 171], fF: [26, 171], ft: [70, 70] },
    b: { h: [93, 147], t: -24, n: -20, hN: [136, 132], hF: [138, 180], fN: [24, 171], fF: [26, 171], ft: [70, 70] },
    cues: [
      'High plank, hands under your shoulders, feet a little apart.',
      'Lift one hand to tap the opposite shoulder, then switch.',
      'Keep your hips still, as if there were a glass of water on your back.',
    ],
  },

  yRaise: {
    name: 'Prone Y Raise', target: 'Upper back · Shoulders', view: 'side', period: 3, dynamic: true, strength: true,
    a: { h: [84, 174], t: 0, n: 0, hN: [190, 175], hF: [189.5, 176], fN: [8.5, 176], fF: [9.5, 176], ft: [180, 180], kb: [-1, -1] },
    b: { h: [84, 174], t: -4, n: -8, hN: [186.5, 151.5], hF: [186, 152.5], fN: [8.5, 176], fF: [9.5, 176], ft: [180, 180], kb: [-1, -1] },
    cues: [
      'Lie face down, arms reaching forward in a Y, thumbs up.',
      'Squeeze your shoulder blades and lift your arms off the floor.',
      'Keep your neck long and look at the floor. Lower slowly.',
    ],
  },

  wallAngel: {
    name: 'Wall Angels', target: 'Upper back · Posture', view: 'front', period: 4, dynamic: true, strength: true,
    a: { h: [100, 104], t: -90, n: -90, hN: [138, 40], hF: [62, 40], fN: [110, 180], fF: [90, 180] },
    b: { h: [100, 104], t: -90, n: -90, hN: [142, 4], hF: [58, 4], fN: [110, 180], fF: [90, 180] },
    cues: [
      'Back, head and arms against a wall, elbows bent like a W.',
      'Slide your arms up into a Y, keeping them touching the wall.',
      'Slide back down and squeeze your shoulder blades together.',
    ],
  },

  singleLegBridge: {
    name: 'Single-Leg Bridge', target: 'Glutes · Hamstrings', view: 'side', sided: true, limb: 'leg', period: 3.5, dynamic: true, strength: true,
    a: { h: [110, 170], t: 180, n: 180, hN: [124, 179], hF: [122, 179], fN: [140, 180], fF: [178, 140], ft: [0, null] },
    b: { h: [114, 142], t: 152, n: 175, hN: [124, 179], hF: [122, 179], fN: [140, 180], fF: [182, 106], ft: [0, null] },
    cues: [
      'On your back, one foot flat, the other leg straight up off the floor.',
      'Push through your heel and lift your hips, then lower slowly.',
      'Keep your hips level. Two feet down makes it easier.',
    ],
  },

  sideLunge: {
    name: 'Side Lunge', target: 'Inner thighs · Glutes · Legs', view: 'front', sided: true, limb: 'leg', period: 3.5, dynamic: true, strength: true,
    a: { h: [100, 104], t: -90, n: -90, hN: [108, 96], hF: [100, 98], fN: [126, 180], fF: [74, 180] },
    b: { h: [114, 124], t: -84, n: -86, hN: [120, 116], hF: [112, 118], fN: [136, 180], fF: [56, 180] },
    cues: [
      'Feet wide, toes forward. Sit your hips back and to one side.',
      'Bend that knee, keep the other leg straight.',
      'Push back to the middle. Chest up the whole time.',
    ],
  },

  reverseCrunch: {
    name: 'Reverse Crunch', target: 'Lower abs · Core', view: 'side', period: 3, dynamic: true, strength: true,
    a: { h: [120, 172], t: 180, n: 180, hN: [120, 176], hF: [118, 177], fN: [158, 134], fF: [156, 136] },
    b: { h: [118, 164], t: 184, n: 184, hN: [120, 176], hF: [118, 177], fN: [126, 104], fF: [124, 106] },
    cues: [
      'On your back, arms by your sides, knees bent over your hips.',
      'Curl your hips off the floor, bringing your knees toward your chest.',
      'Lower slowly without swinging. Small and controlled is perfect.',
    ],
  },
  // HIIT: short, hard intervals with real rests (the routines set the rests).
  jumpingJacks: {
    name: 'Jumping Jacks', target: 'Full body · Cardio', view: 'front', period: 1, hop: 8, hopHips: true, dynamic: true, strength: true,
    a: { h: [100, 104], t: -90, n: -90, hN: [118, 104], hF: [82, 104], fN: [106, 180], fF: [94, 180], eb: [-1, 1] },
    b: { h: [100, 108], t: -90, n: -90, hN: [142, 10], hF: [58, 10], fN: [124, 180], fF: [76, 180], eb: [-1, 1] },
    cues: [
      'Jump your feet wide as your arms swing up overhead.',
      'Jump back in, arms down. Land softly on the balls of your feet.',
      'Find a steady rhythm. Too much? Step out one foot at a time.',
    ],
  },
  stepJacks: {
    name: 'Step Jacks', target: 'Full body · Cardio · No jumping', view: 'front', period: 1.6, dynamic: true, strength: true,
    a: { h: [100, 104], t: -90, n: -90, hN: [118, 104], hF: [82, 104], fN: [106, 180], fF: [94, 180], eb: [-1, 1] },
    b: { h: [106, 106], t: -90, n: -90, hN: [148, 10], hF: [64, 10], fN: [130, 180], fF: [94, 180], eb: [-1, 1] },
    cues: [
      'Step one foot out to the side as both arms sweep up overhead.',
      'Step back in, arms down, then the other side.',
      'No jumping, so it stays quiet. Move briskly and keep breathing.',
    ],
  },
  mountainClimbers: {
    name: 'Mountain Climbers', target: 'Core · Shoulders · Cardio', view: 'side', period: 0.9, dynamic: true, strength: true,
    a: { h: [94, 143], t: -22, n: -18, hN: [142, 180], hF: [138, 180], fN: [94, 166], fF: [26, 171], ft: [40, 70], eb: [1, 1] },
    b: { h: [94, 143], t: -22, n: -18, hN: [142, 180], hF: [138, 180], fN: [26, 171], fF: [94, 166], ft: [70, 40], eb: [1, 1] },
    cues: [
      'High plank, hands under your shoulders.',
      'Drive one knee toward your chest, then switch legs, fast.',
      'Keep your hips low and level. Too hard? Slow down, step them in.',
    ],
  },
  burpee: {
    name: 'Burpees', target: 'Full body · Cardio', view: 'side', period: 3.6, dynamic: true, strength: true,
    // Plank, chest down to the floor and up, feet jump in, jump up with arms overhead, land in a squat, feet jump back.
    seq: [
      { h: [93, 147], t: -24, n: -20, hN: [142, 180], hF: [138, 180], fN: [24, 171], fF: [26, 171], ft: [70, 70], eb: [1, 1] },
      { h: [99, 167], t: -8, n: -6, hN: [142, 180], hF: [138, 180], fN: [24, 171], fF: [26, 171], ft: [70, 70], eb: [1, 1] },
      { h: [93, 147], t: -24, n: -20, hN: [142, 180], hF: [138, 180], fN: [24, 171], fF: [26, 171], ft: [70, 70], eb: [1, 1] },
      { h: [88, 146], t: -22, n: -16, hN: [142, 180], hF: [138, 180], fN: [104, 177], fF: [100, 177], ft: [25, 25], eb: [1, 1] },
      { h: [100, 82], t: -90, n: -90, hN: [126, -8], hF: [120, -6], fN: [104, 158], fF: [98, 158], ft: [50, 50], eb: [1, 1] },
      { h: [86, 144], t: -24, n: -18, hN: [142, 180], hF: [138, 180], fN: [104, 177], fF: [100, 177], ft: [25, 25], eb: [1, 1] },
    ],
    hops: [0, 0, 8, 0, 0, 8],
    cues: [
      'Squat down and put your hands on the floor.',
      'Jump your feet back to a plank and do a push-up, chest to the floor. Jump your feet in, then jump up.',
      'Gentler: step back and forward one foot at a time, and skip the jump.',
    ],
  },
  squatJump: {
    name: 'Squat Jumps', target: 'Legs · Glutes · Power', view: 'side', period: 2.2, dynamic: true, strength: true,
    // Squat with the arms back, push off onto the toes, up into the air, land in a squat with the arms in front.
    seq: [
      { h: [80, 140], t: -58, n: -70, hN: [96, 140], hF: [92, 142], fN: [104, 180], fF: [98, 180], ft: [0, 0] },
      { h: [100, 100], t: -90, n: -90, hN: [120, 8], hF: [114, 10], fN: [104, 176], fF: [98, 176], ft: [40, 40] },
      { h: [100, 78], t: -90, n: -90, hN: [126, -12], hF: [120, -10], fN: [104, 154], fF: [98, 154], ft: [55, 55] },
      { h: [82, 136], t: -60, n: -72, hN: [140, 112], hF: [136, 114], fN: [104, 180], fF: [98, 180], ft: [0, 0] },
    ],
    cues: [
      'Squat down, arms back.',
      'Swing your arms up and jump as high as you can.',
      'Land softly with bent knees, straight into the next squat. No jumping? Rise onto your toes instead.',
    ],
  },
  skaters: {
    name: 'Skaters', target: 'Legs · Glutes · Balance', view: 'front', period: 1.4, dynamic: true, strength: true,
    a: { h: [116, 112], t: -84, n: -86, hN: [96, 112], hF: [70, 84], fN: [124, 180], fF: [102, 168] },
    b: { h: [84, 112], t: -96, n: -94, hN: [130, 84], hF: [104, 112], fN: [98, 168], fF: [76, 180] },
    cues: [
      'Leap sideways onto one foot, the other foot swinging behind it.',
      'Land softly with a bent knee, then bound to the other side.',
      'Swing your arms across like a speed skater. Smaller steps are fine.',
    ],
  },
  punches: {
    name: 'Speed Punches', target: 'Shoulders · Arms · Cardio', view: 'side', period: 0.7, dynamic: true, strength: true,
    a: { h: [100, 105], t: -86, n: -88, hN: [154, 58], hF: [118, 66], fN: [116, 180], fF: [84, 180], ft: [0, 0] },
    b: { h: [100, 105], t: -86, n: -88, hN: [120, 66], hF: [152, 60], fN: [116, 180], fF: [84, 180], ft: [0, 0] },
    cues: [
      'Stand with soft knees, one foot a little forward, fists up by your chin.',
      'Punch straight ahead, left and right, as fast as you can.',
      'Brace your core and stay light on your feet.',
    ],
  },
};

export const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'before', label: 'Before workout', icon: 'bolt', hue: 45 },
  { id: 'after', label: 'After workout', icon: 'fitness_center', hue: 165 },
  { id: 'evening', label: 'Relax', icon: 'self_improvement', hue: 290 },
  { id: 'quick', label: 'Quick', icon: 'timer', hue: 235 },
  { id: 'strength', label: 'Strength', icon: 'exercise', hue: 95 },
];

// The Strength section has its own filters: the whole body, or one area. Labels: t(`focus.${id}`).
export const FOCUS = [
  { id: 'all', icon: 'apps' },
  { id: 'full', icon: 'accessibility_new' },
  { id: 'back', icon: 'airline_seat_recline_extra' },
  { id: 'legs', icon: 'directions_run' },
  { id: 'upper', icon: 'fitness_center' },
  { id: 'core', icon: 'adjust' },
  { id: 'feet', icon: 'footprint' },
  { id: 'hiit', icon: 'sprint' },
];

// items: [stretchId, seconds per side, rest after (optional)]
export const ROUTINES = [
  {
    id: 'top5-after', hero: 'quad', title: 'Top After Workout', cat: 'after', icon: 'workspace_premium', top: true,
    blurb: 'The five most effective, simplest stretches after exercise, as ranked from physical therapist and coaching advice. Hold each about 30 seconds while your muscles are still warm.',
    items: [['quad', 30], ['calf', 30], ['lunge', 30], ['fold', 40], ['pigeon', 35]],
  },
  {
    id: 'post-run-reset', hero: 'lunge', title: 'Post-Workout Reset', cat: 'after', icon: 'fitness_center',
    blurb: 'The full cooldown: the Top stretches, then the deep calf, down dog and a calm finish.',
    items: [['quad', 30], ['calf', 30], ['lunge', 35], ['fold', 40], ['pigeon', 40], ['soleus', 30], ['downdog', 30], ['child', 40]],
  },
  {
    id: 'long-run-recovery', hero: 'lyingHam', title: 'Big Day Recovery', cat: 'after', icon: 'landscape',
    blurb: 'Long, slow floor stretches after a long or hard day of training. All you need is a bit of floor and a wall.',
    items: [['legsUpWall', 60], ['lyingHam', 40], ['bridge', 30], ['happyBaby', 40], ['pigeon', 45], ['itband', 25], ['cobra', 30], ['child', 45], ['twist', 35]],
  },
  {
    id: 'tight-hips', hero: 'pigeon', title: 'Tight Hips', cat: 'after', icon: 'airline_seat_legroom_extra',
    blurb: 'Hips that feel locked after running, cycling or sitting: hip flexors, glutes, groin and the outer hip.',
    items: [['lunge', 35], ['pigeon', 40], ['butterfly', 40], ['itband', 25], ['squat', 30]],
  },
  {
    id: 'lower-back-after', hero: 'child', title: 'Lower Back Release', cat: 'after', icon: 'self_improvement',
    blurb: 'After lifting, cycling or a long day bent over: take the load off your lower back.',
    items: [['catcow', 40], ['child', 45], ['cobra', 25], ['kneeToChest', 30], ['figureFour', 30], ['twist', 35]],
  },
  {
    id: 'top5-before', hero: 'swingFront', title: 'Top Before Workout', cat: 'before', icon: 'workspace_premium', top: true,
    blurb: 'Moving stretches only. Research shows long static holds right before exercise can slightly reduce power and speed, while dynamic moves warm you up without that cost.',
    items: [['swingFront', 30], ['lungeReach', 60], ['swingSide', 30], ['highKnees', 45], ['buttKicks', 45]],
  },
  {
    id: 'dynamic-warmup', hero: 'highKnees', title: 'Dynamic Warm-Up', cat: 'before', icon: 'bolt',
    blurb: 'The Top warm-up, plus hips, calves and a full-body inchworm. Do this right before you head out the door.',
    items: [['swingFront', 20], ['lungeReach', 40], ['swingSide', 20], ['highKnees', 30], ['buttKicks', 30], ['worlds', 30], ['hipCircles', 30], ['calfRaises', 30], ['inchworm', 40]],
  },
  {
    id: 'race-day-primer', hero: 'worlds', title: 'Game Day Primer', cat: 'before', icon: 'flag',
    blurb: 'A sharp five minutes before a race, match or big session. Gets you loose without tiring you out.',
    items: [['highKnees', 30], ['swingFront', 20], ['swingSide', 20], ['buttKicks', 30], ['worlds', 30], ['calfRaises', 30], ['armCircles', 20]],
  },
  {
    id: 'runner-warmup', hero: 'swingFront', title: "Runner's Warm-Up", cat: 'before', icon: 'directions_run',
    blurb: 'Calves, ankles and hips ready for the road: light, bouncy and quick. Ideal before a run or a game.',
    items: [['calfRaises', 30], ['hipCircles', 30], ['swingFront', 20], ['swingSide', 20], ['buttKicks', 30], ['highKnees', 30], ['lungeReach', 40]],
  },
  {
    id: 'upper-warmup', hero: 'armCircles', title: 'Upper Body Warm-Up', cat: 'before', icon: 'front_hand',
    blurb: 'Shoulders, upper back and spine, ready for lifting, climbing, swimming or racket sports.',
    items: [['armCircles', 30], ['catcow', 40], ['worlds', 25], ['inchworm', 40], ['standingTwist', 30]],
  },
  {
    id: 'top5-evening', hero: 'child', title: 'Top Evening', cat: 'evening', icon: 'workspace_premium', top: true,
    blurb: 'The five gentlest, most effective wind-down stretches. All on the floor, all easy. Do them half an hour before bed.',
    items: [['child', 50], ['lyingHam', 40], ['twist', 40], ['kneeToChest', 35], ['catcow', 45]],
  },
  {
    id: 'evening-unwind', hero: 'pigeon', title: 'Evening Unwind', cat: 'evening', icon: 'bedtime',
    blurb: 'Ten slow minutes on the floor: the Top evening stretches, then glutes, hips and tired legs.',
    items: [['child', 45], ['lyingHam', 35], ['twist', 35], ['kneeToChest', 30], ['catcow', 40], ['figureFour', 35], ['butterfly', 40], ['legsUpWall', 50]],
  },
  {
    id: 'bedtime-hips', hero: 'butterfly', title: 'Bedtime Hips', cat: 'evening', icon: 'nights_stay',
    blurb: 'Gentle hip openers to undo hours of sitting and training. Great right before bed.',
    items: [['squat', 40], ['butterfly', 45], ['figureFour', 40], ['happyBaby', 45], ['twist', 40], ['child', 45], ['legsUpWall', 60]],
  },
  {
    id: 'neck-shoulders', hero: 'neckTilt', title: 'Neck & Shoulders', cat: 'evening', icon: 'spa',
    blurb: 'Let go of a day of screens and stress: neck, shoulders and chest, slow and easy. You can sit on the bed.',
    items: [['neckTilt', 25], ['shoulderCross', 25], ['tricep', 20], ['chestOpener', 30], ['catcow', 40], ['child', 45]],
  },
  {
    id: 'back-relief', hero: 'kneeToChest', title: 'Back Pain Relief', cat: 'evening', icon: 'healing',
    blurb: 'Gentle floor moves for a stiff or sore lower back, the ones physios suggest first. Stop if anything hurts more.',
    items: [['kneeToChest', 35], ['catcow', 45], ['child', 50], ['twist', 40], ['bridge', 30], ['legsUpWall', 50]],
  },
  {
    id: 'five-minute-fix', hero: 'calf', title: 'Top Quick Fix', cat: 'quick', icon: 'workspace_premium', top: true,
    blurb: 'Short on time? The five stretches with the biggest payoff, in under four minutes.',
    items: [['lunge', 20], ['calf', 20], ['quad', 20], ['downdog', 25], ['worlds', 20]],
  },
  {
    id: 'calf-sos', hero: 'downdog', title: 'Tight Calves SOS', cat: 'quick', icon: 'healing',
    blurb: 'Calves and Achilles feeling cranky? A focused lower-leg session.',
    items: [['calfRaises', 25], ['calf', 25], ['soleus', 20], ['downdog', 30], ['squat', 25], ['fold', 20]],
  },
  {
    id: 'desk-reset', hero: 'catcow', title: 'Desk Day Reset', cat: 'quick', icon: 'chair',
    blurb: 'Sat all day? Open your hips and wake up your spine before your evening workout.',
    items: [['cobra', 20], ['catcow', 30], ['lunge', 25], ['sideBend', 20], ['squat', 25], ['fold', 20], ['bridge', 20]],
  },
  {
    id: 'two-minute', hero: 'standingTwist', title: '2-Minute Reset', cat: 'quick', icon: 'timer',
    blurb: 'Really short on time? Five standing moves in two minutes. No floor, no wall, nothing to change into.',
    items: [['standingTwist', 15], ['sideBend', 15], ['chestOpener', 15], ['quad', 12], ['fold', 15]],
  },
  {
    id: 'work-break', hero: 'chestOpener', title: 'Work Break', cat: 'quick', icon: 'work',
    blurb: 'Stand up from your desk for a few minutes. Neck, shoulders, wrists, chest, hips, legs and back, all standing, nothing needed.',
    items: [['neckTilt', 15], ['shoulderCross', 15], ['wristStretch', 12], ['chestOpener', 15], ['hipFlexorStand', 15], ['hamstringStand', 15], ['backBend', 12]],
  },
  {
    id: 'top5-strength', hero: 'airSquat', title: 'Top Strength', cat: 'strength', focus: 'full', icon: 'workspace_premium', top: true,
    blurb: 'Five simple moves that build the most useful strength: legs, push, hips, back and core. A short warm-up first and a calm stretch to finish. No equipment, about eight minutes. Move at a pace you can control.',
    items: [['armCircles', 35], ['hipCircles', 35], ['catcow', 35], ['airSquat', 50], ['pushup', 45], ['bridge', 50], ['birdDog', 35], ['plank', 50], ['child', 45]],
  },
  {
    id: 'full-body', hero: 'splitSquat', title: 'Full Body Builder', cat: 'strength', focus: 'full', icon: 'accessibility_new',
    blurb: 'A little longer and a little harder: legs, glutes, push, shoulders, core and back in one go. About ten minutes.',
    items: [['armCircles', 30], ['hipCircles', 30], ['inchworm', 40], ['airSquat', 50], ['pushup', 40], ['splitSquat', 30], ['singleLegBridge', 30], ['shoulderTaps', 35], ['goodMorning', 40], ['deadBug', 30], ['superman', 35], ['plank', 40]],
  },
  {
    id: 'strong-back', hero: 'birdDog', title: 'Strong Back', cat: 'strength', focus: 'back', icon: 'accessibility_new',
    blurb: 'For a back that complains: the strength moves physios give for a stronger, calmer lower back. Slow and controlled.',
    items: [['catcow', 40], ['hipCircles', 30], ['birdDog', 40], ['deadBug', 35], ['bridge', 45], ['superman', 40], ['goodMorning', 45], ['yRaise', 35], ['plank', 40], ['child', 50]],
  },
  {
    id: 'upper-back', hero: 'wallAngel', title: 'Upper Back & Posture', cat: 'strength', focus: 'back', icon: 'airline_seat_recline_extra',
    blurb: 'For rounded shoulders and a desk-shaped back: strengthen the muscles that hold you upright.',
    items: [['armCircles', 30], ['catcow', 30], ['wallAngel', 50], ['wallPushup', 40], ['yRaise', 35], ['superman', 35], ['birdDog', 35], ['shoulderTaps', 35], ['plank', 45], ['chestOpener', 30]],
  },
  {
    id: 'strong-legs', hero: 'slowCalf', title: 'Strong Legs & Calves', cat: 'strength', focus: 'legs', icon: 'directions_walk',
    blurb: 'Calves, knees and thighs for walking, running and stairs, with slow calf lowers, a physio favourite for the Achilles.',
    items: [['hipCircles', 30], ['calfRaises', 45], ['bridge', 40], ['airSquat', 50], ['splitSquat', 35], ['sideLunge', 30], ['slowCalf', 40], ['wallSit', 45], ['quad', 25]],
  },
  {
    id: 'glutes-hips', hero: 'sideLunge', title: 'Glutes & Hips', cat: 'strength', focus: 'legs', icon: 'directions_run',
    blurb: 'Strong glutes and hips protect your knees and back. Bridges, lunges and a wall sit, no equipment.',
    items: [['hipCircles', 30], ['bridge', 50], ['singleLegBridge', 35], ['sideLunge', 35], ['goodMorning', 40], ['splitSquat', 35], ['airSquat', 45], ['wallSit', 50], ['figureFour', 25]],
  },
  {
    id: 'arms-shoulders', hero: 'wallPushup', title: 'Arms & Shoulders', cat: 'strength', focus: 'upper', icon: 'fitness_center',
    blurb: 'Pushing strength and healthy shoulders, starting easy at the wall and building to the floor.',
    items: [['armCircles', 30], ['catcow', 30], ['wallAngel', 40], ['wallPushup', 50], ['pushup', 40], ['shoulderTaps', 35], ['yRaise', 35], ['superman', 35], ['plank', 45], ['chestOpener', 30], ['tricep', 20]],
  },
  {
    id: 'core-basics', hero: 'deadBug', title: 'Core Basics', cat: 'strength', focus: 'core', icon: 'adjust',
    blurb: 'A steady core without sit-ups: the slow, safe moves physios teach first.',
    items: [['catcow', 30], ['hipCircles', 30], ['deadBug', 35], ['reverseCrunch', 40], ['birdDog', 35], ['superman', 35], ['plank', 40], ['shoulderTaps', 35], ['bridge', 40], ['child', 40]],
  },
  {
    id: 'happy-feet', hero: 'towelScrunch', title: 'Happy Feet', cat: 'strength', focus: 'feet', icon: 'footprint',
    blurb: 'Five minutes for the small muscles under your arches: toe lifts, arch lifts, towel scrunches and calf raises. Strong feet steady everything above them. Barefoot, with a towel.',
    items: [['bigToeLift', 40], ['smallToeLift', 40], ['shortFoot', 45], ['towelScrunch', 60], ['calfRaises', 45]],
  },
  {
    id: 'strong-feet', hero: 'stepCalfRaise', title: 'Strong Feet & Arches', cat: 'strength', focus: 'feet', icon: 'directions_walk',
    blurb: 'Ten minutes of foot strength, then balance: toes, arches, towel scrunches, calf raises on a step and standing on one foot. Barefoot, with a towel and a stair.',
    items: [['calfRaises', 40], ['bigToeLift', 45], ['smallToeLift', 45], ['shortFoot', 50], ['towelScrunch', 60], ['stepCalfRaise', 50], ['singleLegBalance', 40], ['slowCalf', 35], ['towelScrunch', 45], ['calf', 30]],
  },
  // The long ones (about 15 minutes at the recommended length) come last, so every list ends with them.
  {
    id: 'full-warmup', hero: 'lungeReach', title: 'The Full Warm-Up', cat: 'before', icon: 'local_fire_department',
    blurb: 'Fifteen minutes from easy circles to quick feet: joints, hips, legs and a little speed. For a long run, a match or a big training day.',
    items: [['armCircles', 45], ['hipCircles', 45], ['standingTwist', 40], ['catcow', 45], ['inchworm', 60], ['worlds', 40], ['lungeReach', 60], ['sideLunge', 30], ['swingFront', 30], ['swingSide', 30], ['airSquat', 45], ['bridge', 40], ['calfRaises', 50], ['buttKicks', 50], ['highKnees', 50]],
  },
  {
    id: 'gym-warmup', hero: 'inchworm', title: 'Gym Warm-Up', cat: 'before', icon: 'sports_gymnastics',
    blurb: 'Before heavy lifting: loosen your spine, hips and shoulders, then wake up your glutes, core and upper back with light sets. About fifteen minutes.',
    items: [['catcow', 50], ['armCircles', 40], ['hipCircles', 40], ['inchworm', 55], ['worlds', 35], ['wallAngel', 45], ['bridge', 45], ['goodMorning', 40], ['birdDog', 30], ['deadBug', 30], ['airSquat', 50], ['sideLunge', 30], ['wallPushup', 40], ['shoulderTaps', 35], ['lungeReach', 55], ['calfRaises', 40]],
  },
  {
    id: 'full-cooldown', hero: 'pigeon', title: 'The Full Cooldown', cat: 'after', icon: 'hourglass_bottom',
    blurb: 'Fifteen unhurried minutes for your legs and hips after a long or hard session: standing stretches first, then down to the floor.',
    items: [['calf', 40], ['soleus', 30], ['quad', 40], ['lunge', 40], ['downdog', 35], ['pigeon', 45], ['lyingHam', 40], ['figureFour', 35], ['butterfly', 45], ['twist', 35], ['child', 50], ['legsUpWall', 55]],
  },
  {
    id: 'gym-cooldown', hero: 'chestOpener', title: 'Gym Cooldown', cat: 'after', icon: 'accessibility',
    blurb: 'After lifting: neck, shoulders, arms and chest first, then back, hips and legs. About fifteen minutes, head to toe.',
    items: [['neckTilt', 30], ['shoulderCross', 35], ['tricep', 30], ['chestOpener', 45], ['wristStretch', 25], ['sideBend', 35], ['catcow', 45], ['child', 55], ['cobra', 30], ['lunge', 35], ['pigeon', 40], ['lyingHam', 35], ['butterfly', 40], ['twist', 35]],
  },
  {
    id: 'long-wind-down', hero: 'happyBaby', title: 'Long Wind-Down', cat: 'evening', icon: 'dark_mode',
    blurb: 'A slow fifteen minutes on the floor for a really calm evening: spine, hips and legs, ending with your legs up the wall.',
    items: [['catcow', 50], ['child', 60], ['cobra', 30], ['seatedFold', 50], ['butterfly', 50], ['pigeon', 40], ['happyBaby', 50], ['kneeToChest', 35], ['figureFour', 40], ['lyingHam', 40], ['twist', 45], ['bridge', 30], ['legsUpWall', 80]],
  },
  {
    id: 'head-to-toe', hero: 'sideBend', title: 'Head to Toe', cat: 'evening', icon: 'bed',
    blurb: 'Start with your neck and shoulders, finish with your legs up the wall: a gentle fifteen minutes that lets go of the whole body.',
    items: [['neckTilt', 30], ['shoulderCross', 30], ['tricep', 25], ['chestOpener', 40], ['sideBend', 40], ['catcow', 45], ['child', 50], ['downdog', 40], ['squat', 40], ['pigeon', 45], ['seatedFold', 50], ['lyingHam', 35], ['twist', 40], ['legsUpWall', 75]],
  },
  {
    id: 'full-circuit', hero: 'airSquat', title: 'Full Body Circuit', cat: 'strength', focus: 'full', icon: 'all_inclusive',
    blurb: 'A short warm-up, then two rounds of squats, push-ups, lunges, back and core work, and a calm finish. About fifteen minutes, no equipment.',
    items: [['armCircles', 30], ['hipCircles', 30], ['inchworm', 40], ['airSquat', 50], ['pushup', 35], ['splitSquat', 35], ['superman', 35], ['shoulderTaps', 35], ['deadBug', 30], ['airSquat', 50], ['pushup', 35], ['sideLunge', 35], ['goodMorning', 40], ['birdDog', 30], ['plank', 50], ['reverseCrunch', 45], ['child', 50]],
  },
  {
    id: 'full-endurance', hero: 'wallSit', title: 'Full Body Endurance', cat: 'strength', focus: 'full', icon: 'repeat',
    blurb: 'Fifteen minutes that work every big muscle in turn: legs, push, back, hips and core. A steady pace, no equipment.',
    items: [['armCircles', 30], ['catcow', 35], ['hipCircles', 30], ['airSquat', 45], ['wallPushup', 45], ['sideLunge', 35], ['yRaise', 35], ['goodMorning', 45], ['shoulderTaps', 35], ['deadBug', 35], ['bridge', 45], ['pushup', 35], ['splitSquat', 35], ['superman', 35], ['wallSit', 45], ['plank', 45], ['fold', 30], ['child', 35]],
  },
  {
    id: 'back-builder', hero: 'goodMorning', title: 'Back Builder', cat: 'strength', focus: 'back', icon: 'airline_seat_recline_normal',
    blurb: 'The moves physios use for a strong lower back, slow and controlled, the key ones twice. With a gentle warm-up and stretches at the end. About fifteen minutes.',
    items: [['catcow', 45], ['hipCircles', 30], ['birdDog', 35], ['deadBug', 35], ['bridge', 45], ['superman', 35], ['goodMorning', 45], ['yRaise', 35], ['plank', 40], ['birdDog', 35], ['singleLegBridge', 35], ['superman', 35], ['goodMorning', 45], ['child', 55], ['cobra', 30], ['kneeToChest', 30]],
  },
  {
    id: 'posture-plus', hero: 'yRaise', title: 'Posture Workout', cat: 'strength', focus: 'back', icon: 'height',
    blurb: 'Fifteen minutes for your upper back and shoulders: open up, then two rounds of wall angels, Y raises, wall push-ups and planks.',
    items: [['armCircles', 35], ['catcow', 40], ['standingTwist', 35], ['worlds', 30], ['wallAngel', 45], ['yRaise', 35], ['wallPushup', 40], ['superman', 35], ['shoulderTaps', 35], ['plank', 40], ['wallAngel', 45], ['yRaise', 35], ['wallPushup', 40], ['birdDog', 35], ['superman', 35], ['shoulderTaps', 35], ['plank', 40], ['chestOpener', 35], ['child', 45]],
  },
  {
    id: 'leg-day', hero: 'splitSquat', title: 'Leg Day', cat: 'strength', focus: 'legs', icon: 'hiking',
    blurb: 'Two rounds of squats, split squats and wall sits, plus slow calf lowers, for strong legs. About fifteen minutes, with stretches to finish.',
    items: [['hipCircles', 30], ['swingFront', 20], ['calfRaises', 45], ['bridge', 45], ['airSquat', 50], ['splitSquat', 35], ['slowCalf', 40], ['wallSit', 50], ['sideLunge', 35], ['airSquat', 50], ['splitSquat', 35], ['wallSit', 50], ['quad', 35], ['calf', 35]],
  },
  {
    id: 'glute-builder', hero: 'singleLegBridge', title: 'Glute Builder', cat: 'strength', focus: 'legs', icon: 'sports_martial_arts',
    blurb: 'Bridges, side lunges and hip hinges, two rounds, for strong glutes and hips that look after your knees and back. About fifteen minutes.',
    items: [['hipCircles', 30], ['swingSide', 20], ['bridge', 50], ['singleLegBridge', 35], ['sideLunge', 35], ['goodMorning', 45], ['airSquat', 45], ['bridge', 50], ['singleLegBridge', 35], ['sideLunge', 35], ['splitSquat', 35], ['goodMorning', 45], ['pigeon', 35], ['figureFour', 30]],
  },
  {
    id: 'upper-builder', hero: 'pushup', title: 'Upper Body Builder', cat: 'strength', focus: 'upper', icon: 'exercise',
    blurb: 'Two rounds of push-ups from the wall to the floor, shoulder taps, Y raises and planks, then stretches for chest and arms. About fifteen minutes.',
    items: [['armCircles', 35], ['catcow', 35], ['inchworm', 40], ['wallAngel', 40], ['wallPushup', 45], ['pushup', 35], ['shoulderTaps', 35], ['yRaise', 35], ['plank', 45], ['wallPushup', 45], ['pushup', 35], ['shoulderTaps', 35], ['yRaise', 35], ['birdDog', 35], ['superman', 35], ['plank', 45], ['chestOpener', 35], ['tricep', 25], ['shoulderCross', 25]],
  },
  {
    id: 'strong-shoulders', hero: 'wallAngel', title: 'Strong Shoulders', cat: 'strength', focus: 'upper', icon: 'sports_handball',
    blurb: 'Easy on the joints, hard on the muscles: two rounds of wall angels, Y raises, wall push-ups and planks for healthy shoulders. About fifteen minutes.',
    items: [['armCircles', 45], ['catcow', 35], ['neckTilt', 20], ['wallAngel', 45], ['yRaise', 35], ['wallPushup', 45], ['shoulderTaps', 35], ['plank', 40], ['wallAngel', 45], ['yRaise', 35], ['wallPushup', 45], ['shoulderTaps', 35], ['superman', 35], ['birdDog', 35], ['plank', 40], ['chestOpener', 40], ['shoulderCross', 30], ['tricep', 25]],
  },
  {
    id: 'core-circuit', hero: 'reverseCrunch', title: 'Core Circuit', cat: 'strength', focus: 'core', icon: 'radio_button_checked',
    blurb: 'Two full rounds of dead bugs, reverse crunches, planks, bird dogs and supermans: the front, back and sides of your core. About fifteen minutes.',
    items: [['catcow', 40], ['hipCircles', 30], ['deadBug', 35], ['reverseCrunch', 40], ['plank', 45], ['birdDog', 35], ['superman', 35], ['shoulderTaps', 35], ['deadBug', 35], ['reverseCrunch', 40], ['plank', 45], ['birdDog', 35], ['superman', 35], ['shoulderTaps', 35], ['bridge', 40], ['child', 50], ['cobra', 30]],
  },
  {
    id: 'core-stability', hero: 'birdDog', title: 'Core & Balance', cat: 'strength', focus: 'core', icon: 'balance',
    blurb: 'Slow, steady moves that teach your core to hold you still, with single-leg bridges and side lunges for balance. About fifteen minutes.',
    items: [['catcow', 45], ['hipCircles', 30], ['birdDog', 35], ['deadBug', 35], ['bridge', 50], ['shoulderTaps', 35], ['plank', 50], ['singleLegBridge', 30], ['sideLunge', 30], ['birdDog', 35], ['deadBug', 35], ['superman', 35], ['reverseCrunch', 40], ['plank', 50], ['child', 50]],
  },
  // HIIT (20 to 25 minutes): a warm-up, a few moves done in rounds with real rests, and a short cooldown.
  // A block: `rounds` times through `moves`, `work` seconds on and `rest` off, `roundRest` between rounds
  // and `blockRest` after the block (both default to the one before).
  {
    id: 'hiit-starter', hero: 'stepJacks', title: 'HIIT Starter', cat: 'strength', focus: 'hiit', icon: 'directions_walk', hiit: true,
    blurb: 'Your first HIIT, with no jumping, so it is quiet enough for a flat. Four moves, three rounds: 40 seconds of work, 30 seconds of rest. Go hard enough that talking gets tricky. About twenty minutes.',
    warm: [['armCircles', 30], ['hipCircles', 30], ['stepJacks', 45], ['inchworm', 45]],
    blocks: [{ moves: ['stepJacks', 'airSquat', 'punches', 'mountainClimbers'], work: 40, rest: 30, rounds: 3, roundRest: 60 }],
    cool: [['fold', 30], ['quad', 25], ['child', 45]],
  },
  {
    id: 'hiit-classic', hero: 'squatJump', title: 'HIIT 45/15', cat: 'strength', focus: 'hiit', icon: 'local_fire_department', hiit: true,
    blurb: 'The classic: 45 seconds hard, 15 seconds rest. Three rounds of squat jumps, push-ups, mountain climbers, skaters and burpees, the moves home HIIT studies use most. Just over twenty minutes.',
    warm: [['armCircles', 30], ['hipCircles', 30], ['jumpingJacks', 45], ['airSquat', 30], ['inchworm', 45]],
    blocks: [{ moves: ['squatJump', 'pushup', 'mountainClimbers', 'skaters', 'burpee'], work: 45, rest: 15, rounds: 3, roundRest: 60 }],
    cool: [['fold', 30], ['quad', 25], ['child', 45]],
  },
  {
    id: 'hiit-tabata', hero: 'burpee', title: 'Tabata Burn', cat: 'strength', focus: 'hiit', icon: 'bolt', hiit: true,
    blurb: 'Four Tabata blocks: two moves take turns, 20 seconds all out and 10 seconds rest, four rounds, then a minute to breathe. Legs, cardio, push and the whole body. Short but tough. About twenty-five minutes.',
    warm: [['armCircles', 30], ['hipCircles', 30], ['jumpingJacks', 45], ['inchworm', 45]],
    blocks: [['squatJump', 'mountainClimbers'], ['jumpingJacks', 'pushup'], ['skaters', 'punches'], ['burpee', 'highKnees']]
      .map((moves) => ({ moves, work: 20, rest: 10, rounds: 4, blockRest: 60 })),
    cool: [['fold', 30], ['quad', 25], ['child', 45]],
  },
];
// Every routine takes its section's colour, so a section reads as one.
for (const r of ROUTINES) r.hue = CATEGORIES.find((c) => c.id === r.cat).hue;
/** A HIIT block as timeline items: [id, work, rest after]. */
// Moves in several steps keep `a` and `b` (the first two key poses) for code that looks at two ends.
for (const st of Object.values(STRETCHES)) if (st.seq) { st.a = st.seq[0]; st.b = st.seq[1]; }
export const blockItems = ({ moves, work, rest, rounds, roundRest = rest, blockRest = roundRest }) =>
  Array.from({ length: rounds }, (_, r) => moves.map((id, i) => [id, work, i < moves.length - 1 ? rest : r < rounds - 1 ? roundRest : blockRest])).flat();
for (const r of ROUTINES) if (r.blocks) r.items = [...r.warm, ...r.blocks.flatMap(blockItems), ...r.cool];

export const PREP_SECS = 8;
export const SWITCH_SECS = 4;
export const REST_SECS = 6;

/**
 * Hold length for one stretch. `scale` is a multiplier (0.8, 1, 1.25) or 'flex' (shown as "Max"):
 * the longest sessions. Every static hold comes up to 60 s per side (ACSM's ~60 s per muscle group),
 * strength sets get 50% longer, and moving warm-up drills keep their normal length.
 * `inStrength`: the move is part of a strength routine (a bridge there is a set, not a drill).
 */
export function holdSecs(stretch, secs, scale = 1, inStrength = false) {
  if (scale === 'flex') return stretch.strength || inStrength ? Math.round((secs * 1.5) / 5) * 5 : stretch.dynamic ? secs : Math.max(60, secs);
  return Math.max(10, Math.round(secs * (Number(scale) || 1)));
}

/** HIIT keeps its intervals short: "Max" works a little longer, not half again as long. */
export const routineScale = (routine, scale) => (routine.hiit && scale === 'flex' ? 1.25 : scale);

export function buildTimeline(routine, scale = 1) {
  const moves = [];
  scale = routineScale(routine, scale);
  routine.items.forEach(([id, secs, rest]) => {
    const s = STRETCHES[id];
    const dur = holdSecs(s, secs, scale, routine.cat === 'strength');
    if (s.sided) {
      moves.push({ id, stretch: s, side: 'L', secs: dur });
      moves.push({ id, stretch: s, side: 'R', secs: dur, rest });
    } else {
      moves.push({ id, stretch: s, side: null, secs: dur, rest });
    }
  });
  const steps = [{ kind: 'prep', secs: PREP_SECS, next: moves[0] }];
  moves.forEach((m, i) => {
    steps.push({ kind: 'hold', secs: m.secs, move: m, index: i });
    const nx = moves[i + 1];
    if (nx) {
      const sw = nx.id === m.id;
      // `breather`: a real rest between HIIT intervals, announced as a rest, not just a pause before the next move.
      steps.push({ kind: 'rest', secs: sw ? SWITCH_SECS : m.rest ?? REST_SECS, next: nx, switchSides: sw, breather: !sw && m.rest != null });
    }
  });
  return { steps, moves };
}

export function routineSeconds(routine, scale = 1) {
  return buildTimeline(routine, scale).steps.reduce((a, s) => a + s.secs, 0);
}

export function sideLabel(move) {
  if (!move.side) return '';
  const side = move.stretch.limb === 'side';
  if (move.side === 'L') return t(side ? 'leftSide' : 'leftLeg');
  return t(side ? 'rightSide' : 'rightLeg');
}
