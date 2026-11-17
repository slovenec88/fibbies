// UI strings and language state. No imports, so any module can use t() without cycles.
// Content (stretches, routines, Fibbies) is translated in localize.js.

export const LANGS = [
  { id: 'en', label: 'English', speech: 'en-US', locale: 'en-US' },
  { id: 'sl', label: 'Slovenščina', speech: 'sl-SI', locale: 'sl-SI' },
];

function detect() {
  try {
    const s = JSON.parse(localStorage.getItem('limber.settings') || '{}');
    if (LANGS.some((l) => l.id === s.lang)) return s.lang;
  } catch { /* ignore */ }
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return /^sl\b/i.test(nav) ? 'sl' : 'en';
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

// English: 1 / many. Slovenian has four forms: 1, 2, 3–4, 5+ (by the last two digits).
const en = (n, one, many) => (n === 1 ? one : many);
const sl = (n, one, two, few, many) => {
  const m = Math.abs(n) % 100;
  return m === 1 ? one : m === 2 ? two : m === 3 || m === 4 ? few : many;
};

const EN = {
  title: 'Fibbies · Stretch & Loot',
  // home
  suggestedNow: 'Suggested now',
  footnote: 'Stretch gently. Mild tension is good, pain is not.',
  'sug.sandwich': 'Back from your run? Run Sandwich ×2!',
  'sug.evening': 'Finish the day strong',
  'sug.morning': 'Morning run? Warm up first',
  'sug.midday': 'A quick midday reset',
  'sug.after': 'Just finished a run?',
  'sug.night': 'Wind down for the night',
  weekLetters: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  days: ({ n }) => `${n} ${en(n, 'day', 'days')}`,
  thisWeek: ({ n }) => `${n} this week`,
  thisWeekAria: 'This week',
  stretches: ({ n }) => `${n} ${en(n, 'stretch', 'stretches')}`,
  stretchesWord: ({ n }) => en(n, 'stretch', 'stretches'),
  start: 'Start',
  level: ({ n }) => `Level ${n}`,
  lv: ({ n }) => `Lv ${n}`,
  fibersStretched: ({ x }) => `${x} fibers stretched`,
  chestsFriends: ({ c, o, t }) => `${c} ${en(c, 'chest', 'chests')} · ${o}/${t} friends`,
  questsAria: "Today's quests",
  sandwichHint: 'Warm up <b>and</b> cool down on the same day for a <b>Run Sandwich ×2</b> and better chests.',
  fibbieFriends: 'Fibbie friends',
  rarity: ['Common', 'Rare', 'Epic', 'Legendary'],
  fibInfo: ({ name, rar, n, blurb }) => `${name} · ${rar} · Lv ${n}. ${blurb}`,
  fibLocked: ({ rar }) => `A ${rar.toLowerCase()} friend is hiding in a chest somewhere…`,
  rankHint: 'Pick a category above to see the <b>Top 10 stretches</b> for it, ranked by how well they work versus how simple they are.',
  rankTitle: ({ cat }) => `Top 10 · ${cat}`,
  rankSub: ({ title }) => `Ranked by effectiveness for runners versus simplicity. The top 5 make up the <b>${title}</b> routine.`,
  playTop5: ({ m }) => `Play the Top 5 · ${m} min`,
  levelsRebalanced: 'Levels rebalanced: leveling up is slower now and worth more. Your fibers and friends are safe.',
  // detail
  back: 'Back',
  settings: 'Settings',
  bothSides: 'Both sides',
  flexHolds: 'Flexibility holds',
  soundTip: "Turn your sound on. Voice cues tell you what's next and when to switch sides, so you don't need to watch the screen.",
  whatYoullDo: "What you'll do",
  startMin: ({ m }) => `Start · ${m} min`,
  eachSide: 'each side',
  moving: 'moving',
  holdShort: 'hold',
  // player
  endSession: 'End session',
  screenOn: 'Screen on',
  soundAndVoice: 'Sound and voice',
  prevStretch: 'Previous stretch',
  nextStretch: 'Next stretch',
  paused: 'Paused',
  pause: 'Pause',
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
  'say.friendUp': ({ name }) => `${name} leveled up!`,
  'say.levelUp': ({ n }) => `Level up! Level ${n}`,
  // end dialog
  endTitle: 'End this session?',
  endBody: "Your progress in this routine won't be saved.",
  keepGoing: 'Keep going',
  end: 'End',
  chestBanked: ({ f, name }) => `Chest banked: +${f} fibers and ${name}!`,
  // done / reward
  soClose: 'So close!',
  soCloseBody: 'Finish at least half of a routine to unlock a chest, earn fibers and keep your streak alive.',
  tryAgain: 'Try again',
  home: 'Home',
  statActive: 'active',
  statStreak: 'day streak',
  sec: 's',
  categories: 'Categories',
  top10: 'Top 10 stretches',
  routine: 'Routine',
  session: 'Session',
  finished: 'Finished',
  openChest: 'Open chest',
  tapChest: 'Tap the chest!',
  fibersLabel: 'Muscle fibers stretched',
  collect: 'Collect',
  again: 'Again',
  praise: ['JOB WELL DONE!', 'STRETCH LEGEND!', 'FLEXCELLENT!', 'UNSTOPPABLE!', 'LIMBER LORD!', 'LEGS OF STEEL!', 'YOU ROCK!'],
  newFriend: 'NEW FRIEND!',
  levelUp: 'LEVEL UP!',
  levelBang: ({ n }) => `LEVEL ${n}!`,
  // multipliers
  'm.first': 'First stretch today',
  'm.streak': ({ n }) => `${n}-day streak`,
  'm.sandwich': 'Run Sandwich!',
  'm.flex': 'Flex 60s',
  'm.perfect': 'Perfect session',
  'm.lucky': 'LUCKY STRETCH!',
  // settings
  voiceGuidance: 'Voice guidance',
  voiceGuidanceSub: 'Spoken names, tips and side switches',
  soundCues: 'Sound cues',
  soundCuesSub: 'Chimes and 3-2-1 countdown beeps',
  vibration: 'Vibration',
  vibrationSub: 'Haptic taps on supported phones',
  holdLength: 'Hold length',
  short: 'Short', standard: 'Standard', long: 'Long', flex60: 'Flex 60s',
  appearance: 'Appearance',
  auto: 'Auto', light: 'Light', dark: 'Dark',
  color: 'Color',
  colorN: ({ h }) => `Color ${h}`,
  language: 'Language',
  done: 'Done',
  'scale.0.8': 'Shorter holds (×0.8) for when you are in a hurry.',
  'scale.1': 'Recommended. 25–50 s holds keep every routine at 5–10 minutes.',
  'scale.1.25': 'Holds 25% longer. Some routines go a little past 10 minutes.',
  'scale.flex': 'Every static hold becomes at least 60 s per side, the amount guidelines suggest for getting more flexible over time. Warm-up drills stay the same. Routines run about 5–14 minutes.',
  holdNextSession: 'Hold length applies from your next session',
  noVoice: 'No voice for this language was found on this device, so spoken cues may sound wrong or stay silent.',
  installVoice: 'Install voice',
};

const SL = {
  title: 'Fibbies · Raztezanje in plen',
  suggestedNow: 'Predlog zate',
  footnote: 'Raztezaj se nežno. Rahla napetost je dobra, bolečina ni.',
  'sug.sandwich': 'Nazaj s teka? Tekaški sendvič ×2!',
  'sug.evening': 'Zaključi dan močno',
  'sug.morning': 'Jutranji tek? Najprej se ogrej',
  'sug.midday': 'Hiter opoldanski oddih',
  'sug.after': 'Je tek ravnokar za tabo?',
  'sug.night': 'Umiri se pred spanjem',
  weekLetters: ['P', 'T', 'S', 'Č', 'P', 'S', 'N'],
  days: ({ n }) => `${n} ${sl(n, 'dan', 'dneva', 'dnevi', 'dni')}`,
  thisWeek: ({ n }) => `${n} ta teden`,
  thisWeekAria: 'Ta teden',
  stretches: ({ n }) => `${n} ${sl(n, 'vaja', 'vaji', 'vaje', 'vaj')}`,
  stretchesWord: ({ n }) => sl(n, 'vaja', 'vaji', 'vaje', 'vaj'),
  start: 'Začni',
  level: ({ n }) => `Stopnja ${n}`,
  lv: ({ n }) => `St. ${n}`,
  fibersStretched: ({ x }) => `${x} raztegnjenih vlaken`,
  chestsFriends: ({ c, o, t }) => `${c} ${sl(c, 'skrinja', 'skrinji', 'skrinje', 'skrinj')} · ${o}/${t} prijateljev`,
  questsAria: 'Današnji izzivi',
  sandwichHint: 'Ogrej se <b>in</b> ohladi isti dan za <b>tekaški sendvič ×2</b> in boljše skrinje.',
  fibbieFriends: 'Fibbie prijatelji',
  rarity: ['Navaden', 'Redek', 'Epski', 'Legendaren'],
  fibInfo: ({ name, rar, n, blurb }) => `${name} · ${rar} · St. ${n}. ${blurb}`,
  fibLocked: ({ rar }) => `${rar} prijatelj se skriva v eni od skrinj …`,
  rankHint: 'Zgoraj izberi kategorijo in poglej <b>10 najboljših raztezanj</b>, razvrščenih po učinkovitosti glede na preprostost.',
  rankTitle: ({ cat }) => `10 najboljših · ${cat}`,
  rankSub: ({ title }) => `Razvrščeno po učinkovitosti za tekače glede na preprostost. Prvih 5 sestavlja rutino <b>${title}</b>.`,
  playTop5: ({ m }) => `Zaženi top 5 · ${m} min`,
  levelsRebalanced: 'Stopnje so prenovljene: napredovanje je zdaj počasnejše in vredno več. Tvoja vlakna in prijatelji so varni.',
  back: 'Nazaj',
  settings: 'Nastavitve',
  bothSides: 'Obe strani',
  flexHolds: 'Daljši zadržki',
  soundTip: 'Vklopi zvok. Glas ti pove, kaj sledi in kdaj zamenjati stran, zato ti ni treba gledati zaslona.',
  whatYoullDo: 'Kaj te čaka',
  startMin: ({ m }) => `Začni · ${m} min`,
  eachSide: 'na stran',
  moving: 'v gibanju',
  holdShort: 'statično',
  endSession: 'Končaj vadbo',
  screenOn: 'Zaslon ostane prižgan',
  soundAndVoice: 'Zvok in glas',
  prevStretch: 'Prejšnja vaja',
  nextStretch: 'Naslednja vaja',
  paused: 'Premor',
  pause: 'Premor',
  resume: 'Nadaljuj',
  getReady: 'Pripravi se',
  switchSides: 'Zamenjaj stran',
  upNext: 'Sledi',
  keepMoving: 'Kar naprej',
  hold: 'Zadrži',
  firstUp: 'Najprej',
  otherSide: 'Druga stran',
  nextUp: 'Naslednja',
  nextLabel: 'Naslednja:',
  lastOne: '<b>Še zadnja!</b> Zaključi močno.',
  leftLeg: 'Leva noga', rightLeg: 'Desna noga', leftSide: 'Leva stran', rightSide: 'Desna stran',
  'say.prep': ({ name }) => `Pripravi se. Najprej: ${name}.`,
  'say.switch': ({ side }) => `Zamenjaj stran. ${side}.`,
  'say.next': ({ name }) => `Naslednja: ${name}.`,
  'say.half': 'Na pol poti.',
  'say.done': 'Odlično. Rutina je končana.',
  'say.voiceOn': 'Glasovno vodenje je vklopljeno.',
  'say.chest': ({ name }) => `${name}!`,
  'say.newFriend': ({ name }) => `Nov prijatelj: ${name}!`,
  'say.friendUp': ({ name }) => `${name} je na novi stopnji!`,
  'say.levelUp': ({ n }) => `Nova stopnja! Stopnja ${n}.`,
  endTitle: 'Končam vadbo?',
  endBody: 'Napredek v tej rutini ne bo shranjen.',
  keepGoing: 'Nadaljuj',
  end: 'Končaj',
  chestBanked: ({ f, name }) => `Skrinja shranjena: +${f} vlaken in ${name}!`,
  soClose: 'Skoraj!',
  soCloseBody: 'Dokončaj vsaj polovico rutine, da odkleneš skrinjo, zaslužiš vlakna in ohraniš niz.',
  tryAgain: 'Poskusi znova',
  home: 'Domov',
  statActive: 'aktivno',
  statStreak: ({ n }) => `${sl(n, 'dan', 'dneva', 'dni', 'dni')} zapored`,
  sec: ' s',
  categories: 'Kategorije',
  top10: '10 najboljših raztezanj',
  routine: 'Rutina',
  session: 'Vadba',
  finished: 'Končano',
  openChest: 'Odpri skrinjo',
  tapChest: 'Tapni skrinjo!',
  fibersLabel: 'Raztegnjena mišična vlakna',
  collect: 'Poberi',
  again: 'Znova',
  praise: ['ODLIČNO OPRAVLJENO!', 'LEGENDA RAZTEZANJA!', 'FENOMENALNO!', 'NEUSTAVLJIVO!', 'GIBEK KOT MAČKA!', 'JEKLENE NOGE!', 'BRAVO!'],
  newFriend: 'NOV PRIJATELJ!',
  levelUp: 'NOVA STOPNJA!',
  levelBang: ({ n }) => `STOPNJA ${n}!`,
  'm.first': 'Prvo raztezanje danes',
  'm.streak': ({ n }) => `${n} ${sl(n, 'dan', 'dneva', 'dni', 'dni')} zapored`,
  'm.sandwich': 'Tekaški sendvič!',
  'm.flex': 'Gibko 60 s',
  'm.perfect': 'Popolna vadba',
  'm.lucky': 'SREČNI ZADETEK!',
  voiceGuidance: 'Glasovno vodenje',
  voiceGuidanceSub: 'Imena vaj, nasveti in menjava strani',
  soundCues: 'Zvočni signali',
  soundCuesSub: 'Zvončki in odštevanje 3-2-1',
  vibration: 'Vibriranje',
  vibrationSub: 'Tresljaji na podprtih telefonih',
  holdLength: 'Dolžina zadrževanja',
  short: 'Kratko', standard: 'Običajno', long: 'Dolgo', flex60: 'Gibko 60 s',
  appearance: 'Videz',
  auto: 'Samodejno', light: 'Svetlo', dark: 'Temno',
  color: 'Barva',
  colorN: ({ h }) => `Barva ${h}`,
  language: 'Jezik',
  done: 'Končano',
  'scale.0.8': 'Krajši zadržki (×0,8), ko se ti mudi.',
  'scale.1': 'Priporočeno. Zadržki 25–50 s, vsaka rutina traja 5–10 minut.',
  'scale.1.25': 'Zadržki so 25 % daljši. Nekatere rutine trajajo malo več kot 10 minut.',
  'scale.flex': 'Vsak statični zadržek traja vsaj 60 s na stran, kolikor priporočajo smernice za večjo gibljivost. Vaje za ogrevanje ostanejo enake. Rutine trajajo približno 5–14 minut.',
  holdNextSession: 'Dolžina zadrževanja velja od naslednje vadbe',
  noVoice: 'Na tej napravi ni slovenskega glasu, zato glasovna navodila morda ne bodo zvenela prav ali pa bodo tiho.',
  installVoice: 'Namesti glas',
};

const DICTS = { en: EN, sl: SL };

/** Translate a key. Function entries receive vars; arrays are returned as-is. */
export function t(key, vars = {}) {
  const v = DICTS[cur][key] ?? EN[key];
  if (v == null) return key;
  return typeof v === 'function' ? v(vars) : v;
}

/** Fill every [data-i18n] (text), [data-i18n-html] and [data-i18n-aria] element in the static HTML. */
export function translateDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.documentElement.lang = cur;
  document.title = t('title');
}
