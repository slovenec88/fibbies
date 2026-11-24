// UI strings and language state. Only imports the plain dictionaries in js/lang/, so any
// module can use t() without cycles. Content (stretches, routines, Fibbies) is in localize.js.
import { UI as DE } from './lang/de.js';
import { UI as ES } from './lang/es.js';
import { UI as FR } from './lang/fr.js';
import { UI as IT } from './lang/it.js';
import { UI as PT } from './lang/pt.js';
import { UI as SL } from './lang/sl.js';

export const LANGS = [
  { id: 'en', label: 'English', speech: 'en-US', locale: 'en-US' },
  { id: 'de', label: 'Deutsch', speech: 'de-DE', locale: 'de-DE' },
  { id: 'es', label: 'Español', speech: 'es-ES', locale: 'es-ES' },
  { id: 'fr', label: 'Français', speech: 'fr-FR', locale: 'fr-FR' },
  { id: 'it', label: 'Italiano', speech: 'it-IT', locale: 'it-IT' },
  { id: 'pt', label: 'Português', speech: 'pt-BR', locale: 'pt-BR' },
  { id: 'sl', label: 'Slovenščina', speech: 'sl-SI', locale: 'sl-SI' },
];

function detect() {
  try {
    const s = JSON.parse(localStorage.getItem('limber.settings') || '{}');
    if (LANGS.some((l) => l.id === s.lang)) return s.lang;
  } catch { /* ignore */ }
  const navs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
  for (const nav of navs) {
    const id = String(nav).slice(0, 2).toLowerCase();
    if (LANGS.some((l) => l.id === id)) return id;
  }
  return 'en';
}

let cur = detect();
const listeners = new Set();
export const getLang = () => cur;
export const langInfo = () => LANGS.find((l) => l.id === cur) || LANGS[0];
export const speechLang = () => langInfo().speech;
export const numLocale = () => langInfo().locale;
export function setLang(id) {
  if (!LANGS.some((l) => l.id === id) || id === cur) return;
  cur = id;
  for (const fn of listeners) fn(cur);
}
export const onLangChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// English plurals: 1 / many.
const en = (n, one, many) => (n === 1 ? one : many);

const EN = {
  installFibbies: "Install Fibbies",
  installSub: "Works offline, on your home screen",
  installHelp: "Open Share, choose Add to Home Screen, then tap Add. Turn on Open as Web App if you see it.",
  installHelpAndroid: "Open your browser menu and choose Install app or Add to Home screen.",
  installHelpWindows: "Click the web apps icon in the Firefox address bar.",
  title: 'Fibbies · Stretch & Loot',
  // home
  footnote: 'Stretch gently. Mild tension is good, pain is not.',
  days: ({ n }) => `${n} ${en(n, 'day', 'days')}`,
  thisWeek: ({ n }) => `${n} this week`,
  stretches: ({ n }) => `${n} ${en(n, 'stretch', 'stretches')}`,
  stretchesWord: ({ n }) => en(n, 'stretch', 'stretches'),
  exercises: ({ n }) => `${n} ${en(n, 'exercise', 'exercises')}`,
  exercisesWord: ({ n }) => en(n, 'exercise', 'exercises'),
  start: 'Start',
  level: ({ n }) => `Level ${n}`,
  lv: ({ n }) => `Lv ${n}`,
  fibersStretched: ({ x }) => `${x} fibers stretched`,
  discovered: ({ n }) => `${n} discovered`,
  'todayBonus': 'Today\'s bonus',
  fibbieFriends: 'Fibbie friends',
  rarity: ['Common', 'Rare', 'Epic', 'Legendary'],
  moreToFind: 'Endless Fibbies hide in chests. Finish a routine to find your first!',
  stagePrefix: ['', 'Super ', 'Ultra ', 'Mythic '],
  stageN: ({ n }) => `Evolution ${n} of 4`,
  owned: ({ n }) => `You have ${n}`,
  merge: 'Merge 2 → Evolve',
  needOne: 'Find one more to merge',
  maxEvo: 'Fully evolved!',
  evolved: ({ name }) => `Evolved into ${name}!`,
  dupe: ({ n }) => `+1 COPY · ×${n}`,
  mergeHint: 'Two of a kind! Merge them in your collection to evolve.',
  fibBlurb: ({ stretch, quirk }) => `Favourite stretch: ${stretch}. ${quirk}`,
  quirks: ['Hums while holding a stretch.', 'Counts breaths out loud.', 'Has never missed a cooldown.', 'Naps in Child\'s Pose.',
    'Collects lost gym socks.', 'Thinks foam rollers are scary.', 'Cheers at every finish line.', 'Stretches before stretching.',
    'Claims to be very flexible. Mostly true.', 'Leaves tiny footprints on yoga mats.', 'Sneezes glitter after long workouts.', 'Loves a slow sunset walk.'],
  evoBlurbs: [
    ({ name }) => `Two ${name}s became one. Twice the stretch, twice the cuddles.`,
    ({ name }) => `${name} got so limber it learned to fly.`,
    ({ name }) => `The mythic form of ${name}. Glows after every cooldown.`,
  ],
  skip: 'Skip',
  tapCalls: ['Tap the chest!', 'Again!', 'One more!'],
  tapKnot: 'Loosen the knot!',
  knotIntro: "Hi, I'm your Fibbie! I cheer for every stretch you do. Tap me any time.",
  knotToGo: ({ x, n }) => `${x} XP to Level ${n}`,
  // Notes from your Fibbie on the home card (js/pal.js): nothing done today yet / one or two kinds / three or four
  knotNotes: [
    ["Thanks for checking in on me!", "Hi! Even five minutes today would feel great.", "Glad you're here. Ready when you are.", "Thanks for taking care of us. Shall we move a little?", "One small stretch, one big smile. Want to try?", "You opened the app. That's the hardest part done!", "Every stretch makes the next one easier.", "Let's earn a chest today. I'm cheering for you!", "A few slow breaths, one routine, and I'm all yours.", "Thanks for coming back. Let's loosen up together.", "Today is a fresh start. Pick any routine you like.", "I love it when you stop by. Stretch time?"],
    ["That felt so good. Thank you!", "Thanks! I'm looser already. One more kind?", "My shoulders noticed. Thank you!", "Nice work! Another kind makes today's chest even better.", "You're on a roll, and I can feel it.", "Thank you. Loose fibers, happy Fibbie!", "Good one! Another tile is waiting to light up.", "Every hold counts. Thanks for each one.", "I'm breathing easier. Want to keep going?", "That's how it's done! Up for one more?", "Thanks for the stretch. You're good at this.", "Halfway to a great day. Keep it up!"],
    ["What a day! Thank you, truly.", "You're amazing. I haven't felt this loose in ages.", "Look at you go! Thanks for taking such good care of me.", "Champion work today. Thank you!", "This is what consistency looks like. Bravo!", "You did the work, I feel the difference. Thank you!", "Every single fiber says thank you.", "Today you were at your best. Well done!", "Legendary day! Rest well, you've earned it.", "I didn't know I could feel this good. Thanks to you!", "Bravo! Your future self is cheering for you.", "A whole day of care. Thank you for it."],
  ],
  // Calm thoughts your Fibbie mixes in: light zen, gratitude and encouragement, written for this language
  palCalm: [
    "Breathe in. Breathe out. That's already a good start.",
    "You don't have to be perfect. Just be here.",
    "Small steps still carry you forward.",
    "Thank you for being gentle with yourself today.",
    "Slow is smooth, and smooth feels good.",
    "Your body carries you everywhere. Thank it a little.",
    "Let your shoulders drop. Ahh, better.",
    "Nothing to win, nothing to prove. Just stretch.",
    "Every day is a fresh page.",
    "Rest is part of the practice too.",
    "A little every day beats a lot once in a while.",
    "One calm breath can change a whole day.",
    "When you walk, just walk. When you stretch, just stretch.",
    "A grateful heart is a quiet heart.",
    "Be kind whenever possible. It is always possible. — Dalai Lama",
    "Breathing in, I calm body and mind. Breathing out, I smile. — Thich Nhat Hanh",
    "If you let go a little, you will have a little peace. — Ajahn Chah",
    "You are the sky. Everything else is just the weather. — Pema Chödrön",
    "In the beginner's mind there are many possibilities. — Shunryu Suzuki",
    "What grows slowly grows strong roots.",
  ],
  // Said now and then halfway through a HIIT interval: encouragement and thanks, written for this language
  hiitCheer: [
    "You've got this!",
    "Strong work. Keep it up!",
    "Every rep counts.",
    "Thank you for showing up for yourself today.",
    "Breathe. You're doing great.",
    "Almost there. Stay with it!",
    "Your heart is getting stronger right now.",
    "This effort is something to be proud of.",
    "Hard today, easier tomorrow.",
    "One last push. You can do it!",
    "Thank your body. It's working hard for you.",
    "Feel that energy? That's all you.",
    "No rush, no pressure. Just your best right now.",
    "Stay light, stay strong.",
    "Be grateful for legs that can jump and a heart that can race.",
  ],
  levelsRebalanced: 'Levels rebalanced: leveling up is slower now and worth more. Your fibers and friends are safe.',
  // detail
  back: 'Back',
  settings: 'Settings',
  bothSides: 'Both sides',
  flexHolds: "Max length",
  soundTip: "Turn your sound on. Voice cues tell you what's next and when to switch sides, so you don't need to watch the screen.",
  whatYoullDo: "What you'll do",
  startMin: ({ m }) => `Start · ${m} min`,
  eachSide: 'each side',
  moving: 'moving',
  restAfter: ({ s }) => `+${s} s rest`,
  rounds: ({ n }) => `${n} ${en(n, 'round', 'rounds')}`,
  holdShort: 'hold',
  // player
  endSession: 'End session',
  soundAndVoice: 'Sound and voice',
  prevStretch: 'Previous stretch',
  nextStretch: 'Next stretch',
  paused: 'Paused',
  pause: 'Pause',
  playAnimation: "Play animation",
  resume: 'Resume',
  getReady: 'Get ready',
  switchSides: 'Switch sides',
  upNext: 'Up next',
  keepMoving: 'Keep moving',
  hold: 'Hold',
  firstUp: 'First up',
  otherSide: 'Other side',
  nextUp: 'Next up',
  nextLabel: 'Next:',
  lastOne: '<b>Last one!</b> Finish strong.',
  leftLeg: 'Left leg', rightLeg: 'Right leg', leftSide: 'Left side', rightSide: 'Right side',
  // voice
  'say.prep': ({ name }) => `Get ready. First up: ${name}.`,
  'say.switch': ({ side }) => `Switch sides. ${side}.`,
  'say.next': ({ name }) => `Next: ${name}.`,
  'say.half': 'Halfway there.',
  'say.done': 'Great work. Routine complete.',
  'say.voiceOn': 'Voice guidance on.',
  'say.chest': ({ name }) => `${name} chest!`,
  'say.newFriend': ({ name }) => `New friend: ${name}!`,
  'say.copy': ({ name }) => `Another ${name}!`,
  'say.levelUp': ({ n }) => `Level up! Level ${n}`,
  // Name-free versions, for the recorded voice (Fibbie names are endless, so they can't be recorded).
  'say.newFriendAny': 'A new friend!',
  'say.copyAny': 'Another one for your collection!',
  'say.levelUpAny': 'Level up!',
  'say.ranAwayAny': 'Oh no, it ran away!',
  'say.evolvedAny': 'It evolved!',
  // end dialog
  endTitle: 'End this session?',
  endBody: "Your progress in this routine won't be saved.",
  keepGoing: 'Keep going',
  end: 'End',
  chestBanked: ({ f, name }) => `Chest banked: +${f} fibers and ${name}!`,
  // done / reward
  soClose: 'So close!',
  wellDone: "Well done!",
  noChestToday: "All four chests are open for today. New ones tomorrow.",
  noChestNext: ({ kinds }) => `No chest this time: chests come with a new kind of routine. Still waiting today: ${kinds}.`,
  soCloseBody: 'Finish at least half of a routine to unlock a chest, earn fibers and keep your streak alive.',
  tryAgain: 'Try again',
  home: 'Home',
  statActive: 'active',
  statStreak: 'day streak',
  sec: 's',
  categories: 'Categories',
  routine: 'Routine',
  session: 'Session',
  finished: 'Finished',
  openChest: 'Open chest',
  fibersLabel: 'Muscle fibers stretched',
  collect: 'Collect',
  again: 'Again',
  praise: ['JOB WELL DONE!', 'STRETCH LEGEND!', 'FLEXCELLENT!', 'UNSTOPPABLE!', 'LIMBER LORD!', 'LEGS OF STEEL!', 'YOU ROCK!'],
  newFriend: 'NEW FRIEND!',
  levelUp: 'LEVEL UP!',
  // multipliers
  'm.first': 'First stretch today',
  'm.streak': ({ n }) => `${n}-day streak`,
  'm.flex': "Max session",
  'm.perfect': 'Perfect session',
  'm.lucky': 'LUCKY STRETCH!',
  // today's bonus tiles: one short word per kind of routine
  'q.before': "Before",
  'q.after': "After",
  'q.evening': "Relax",
  'q.strength': "Strength",
  doneToday: "done",
  stretchingTitle: "Stretching",
  pickedToday: "Picked for today",
  'focus.all': "All",
  'focus.full': "Full body",
  'focus.back': "Back",
  'focus.legs': "Legs",
  'focus.upper': "Arms & shoulders",
  'focus.core': "Core",
  'focus.feet': "Feet",
  'focus.hiit': "HIIT",
  // settings
  'voiceSection': 'Voice',
  voiceGuidance: 'Voice guidance',
  voiceGuidanceSub: 'Spoken names, tips and side switches',
  holdLength: "Session length",
  short: 'Short', standard: 'Standard', long: 'Long', flex60: 'Max',
  language: 'Language',
  done: 'Done',
  'scale.0.8': "Shorter stretches and exercises (×0.8) for when you are in a hurry.",
  'scale.1': "Recommended. Stretches of 25–50 s and exercises of 30–40 s keep most routines at 5–10 minutes.",
  'scale.1.25': "Stretches and exercises 25% longer. Some routines go a little past 10 minutes.",
  'scale.flex': "The longest sessions: every still stretch is held at least 60 s per side, the amount guidelines suggest for getting more flexible over time, and strength exercises run 50% longer. Warm-up drills stay the same. Routines run about 5–14 minutes.",
  holdNextSession: "The new length applies from your next session",
  noVoice: 'No voice for this language was found on this device, so spoken cues may sound wrong or stay silent.',
  installVoice: 'Install voice',
  flexTitle: "Flexibility check",
  flexDue: "Your weekly check is due. It takes about a minute.",
  flexFirst: "Four quick self-tests, nothing needed. Repeat them weekly and watch yourself get bendier.",
  flexStart: "Check now",
  flexView: "Open",
  flexIntro: "Warm up a little first, then try each test gently and pick how far you got. Never push into pain.",
  flexSave: "Save results",
  flexSaved: "Saved! Check again in a week.",
  flexPickAll: "Pick an answer for every test to save.",
  flexScore: "Flexibility score",
  flexOnePoint: "Your first point! Check again next week to start the line.",
  flexTapPoint: "Tap a point to see its score.",
  albumTitle: "Fibbie album",
  albumWildEmpty: "Wild Fibbies are endless. Any chest can hold one nobody has seen before.",
  albumHint: "Tap a Fibbie you have found. The shadows are still out there, hiding in chests.",
  flexNext: ({ n }) => `Next check in ${n} ${en(n, 'day', 'days')}`,
  flexSince: ({ n }) => `${n > 0 ? '+' : ''}${n} since your first check`,
  albumOriginals: ({ n, of }) => `The originals · ${n}/${of}`,
  albumWild: ({ n }) => `Wild Fibbies · ${n} found`,
  albumEvos: ({ n }) => `${n} ${en(n, 'form', 'forms')} found, counting evolutions`,
  flexTests: {
    toe: { name: "Toe touch", how: "Stand with straight legs and fold forward. How far do your fingertips reach?", levels: ["Above the knees", "Knees", "Shins", "Toes", "Palms flat on the floor"] },
    quad: { name: "Heel to glute", how: "Stand on one leg, hold the other ankle and draw the heel back. How close does it get? Left and right mean the leg you hold.", levels: ["Can't reach the ankle", "Ankle, heel far away", "Heel a hand away", "Heel a few fingers away", "Heel touches the glute"] },
    squat: { name: "Deep squat", how: "Feet hip-width, toes slightly out. Sink as low as you comfortably can.", levels: ["Thighs above level", "Thighs level", "Below level, heels lift", "All the way, heels lift", "All the way, heels down"] },
    shoulder: { name: "Back scratch", how: "Reach one hand over your shoulder and the other up your back. How close do your fingers get? Left and right mean the hand that reaches over the shoulder.", levels: ["A hand or more apart", "A few fingers apart", "Fingertips almost touch", "Fingertips touch", "Fingers overlap"] },
  },
  flexLeft: "Left",
  flexRight: "Right",
  flexTightL: ({ test }) => `Your left side is tighter on ${test}. Give it a few extra seconds when you stretch.`,
  flexTightR: ({ test }) => `Your right side is tighter on ${test}. Give it a few extra seconds when you stretch.`,
  safetyTitle: "Stretch safely",
  safetyItems: ["Warm up first with a few minutes of walking or the moving stretches. Never push cold muscles hard.","Mild tension is good. Stop if you feel sharp pain, tingling or numbness.","Breathe slowly and never bounce in a hold.","Injured, pregnant or recovering from surgery? Check with a doctor or physio first."],
  safetyOk: "Got it",
  safetyLink: "How to stretch safely",
  "say.ranAway": ({ name }) => `Oh no, ${name} ran away!`,
  chestBankedRan: ({ f }) => `Chest banked: +${f} fibers. The Fibbie ran away!`,
  evolvedKicker: "EVOLVED!",
  tapToContinue: "Tap to continue",
  saveFailed: "Couldn't save your progress: the phone's storage is full or blocked.",
  backupSection: "Your progress",
  backupCopy: "Copy backup code",
  backupCopySub: "Keep it in a note or an email to yourself",
  backupCopied: "Backup code copied. Paste it somewhere safe.",
  backupCopyHand: "Copy this code and keep it somewhere safe.",
  backupRestore: "Restore from backup code",
  backupRestoreSub: "Replaces the progress on this phone",
  about: 'About',
  sourceCode: 'Source code',
  sourceCodeSub: 'Free and open source (AGPL-3.0), by Davor Val Vega',
  backupTitle: "Backup code",
  backupPaste: "Paste your backup code here",
  backupInvalid: "That doesn't look like a Fibbies backup code.",
  backupConfirm: ({ level, here }) => `This backup is at level ${level}. This phone is at level ${here}. Replace the progress on this phone? This can’t be undone.`,
  backupReplace: "Replace",
  backupRestoreBtn: "Restore",
  backupDone: "Backup restored.",
  close: "Close",
};

const DICTS = { en: EN, sl: SL, de: DE, es: ES, fr: FR, it: IT, pt: PT };

/** Translate a key. Function entries receive vars; arrays are returned as-is. */
export function t(key, vars = {}) {
  const v = DICTS[cur][key] ?? EN[key];
  if (v == null) return key;
  return typeof v === 'function' ? v(vars) : v;
}

/** Fill every [data-i18n] (text), [data-i18n-aria] and [data-i18n-placeholder] element in the static HTML. */
export function translateDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.documentElement.lang = cur;
  document.title = t('title');
}
