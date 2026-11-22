// Procedural Fibbies. Every species is a seed: the same seed always grows the same critter
// (body, face, ears, pattern, colours, name), so there is an endless supply to discover.
// Two identical Fibbies (same species, same stage) merge into the next evolution, up to stage 4.
import { STRETCHES } from './data.js';
import { t } from './i18n.js';

export const MAX_STAGE = 4;

// ---------- Seeded randomness ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const hashStr = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

// ---------- The 16 original Fibbies (hand-designed genomes) ----------
const CLASSIC = { shape: 'bean', eyes: 'round', mouth: 'w', cheeks: true, pattern: 'none', head: 'none', arms: 'up' };
export const FIBBIES = [
  { id: 'quaddy', name: 'Quaddy', rarity: 0, hue: 150, acc: 'headband', blurb: 'Never skips quad day.' },
  { id: 'hammy', name: 'Hammy', rarity: 0, hue: 25, acc: 'ears', blurb: 'A hamstring with hamster energy.' },
  { id: 'calfy', name: 'Calfy', rarity: 0, hue: 60, acc: 'wristbands', blurb: 'Bouncy, springy, a little dramatic.' },
  { id: 'glutey', name: 'Glutey', rarity: 0, hue: 0, acc: 'bow', blurb: 'Powers every step, asks for nothing.' },
  { id: 'achi', name: 'Achi', rarity: 0, hue: 230, acc: 'wings', blurb: 'Tiny wings, mighty tendon.' },
  { id: 'hippy', name: 'Hippy', rarity: 1, hue: 300, acc: 'flowers', blurb: 'Hip flexor, flower child.' },
  { id: 'sprinty', name: 'Sprinty', rarity: 1, hue: 20, acc: 'bolt', blurb: 'Fast-twitch and proud of it.' },
  { id: 'zenny', name: 'Zenny', rarity: 1, hue: 185, acc: 'leaf', blurb: 'Breathes in for four, out for eight.', eyes: 'sleepy' },
  { id: 'snoozy', name: 'Snoozy', rarity: 1, hue: 265, acc: 'nightcap', blurb: 'Best friends with Legs Up the Wall.', eyes: 'sleepy' },
  { id: 'bendy', name: 'Bendy', rarity: 2, hue: 95, acc: 'tall', blurb: 'Stretched so much it got taller.', shape: 'tall' },
  { id: 'medalia', name: 'Medalia', rarity: 2, hue: 340, acc: 'medal', blurb: 'Won a medal once. Mentions it often.' },
  { id: 'goldie', name: 'Golden Fibbie', rarity: 3, hue: 85, acc: 'crown', blurb: 'The legend. Stretches in pure gold.' },
  // Christmas
  { id: 'jingly', name: 'Jingly', rarity: 0, hue: 150, acc: 'elfhat', head: 'pointy', blurb: 'Jingles a little with every stretch.' },
  { id: 'flurry', name: 'Flurry', rarity: 1, hue: 230, acc: 'snowman', body: '#f4f8ff', dark: '#b8c6dc', blurb: 'Stays cool through every cooldown.' },
  { id: 'prancy', name: 'Prancy', rarity: 2, hue: 55, acc: 'rosynose', head: 'antlers', body: 'oklch(0.76 0.08 60)', dark: 'oklch(0.58 0.09 55)', blurb: 'Prances through every warm-up.' },
  { id: 'santy', name: 'Santy', rarity: 3, hue: 20, acc: 'santa', blurb: 'Checks the stretch list twice.' },
];
const classicById = (id) => FIBBIES.find((f) => f.id === id);

// ---------- Genome ----------
const SHAPES = ['bean', 'bean', 'round', 'pear', 'tall', 'wide', 'drop'];
const EYES = ['round', 'round', 'big', 'big', 'sparkle', 'sleepy', 'wink', 'cyclops', 'three'];
const MOUTHS = ['w', 'w', 'smile', 'open', 'tongue', 'fang', 'cat'];
const PATTERNS = ['none', 'none', 'spots', 'stripes', 'belly', 'freckles', 'heart', 'patch'];
const HEADS = ['none', 'ears', 'pointy', 'bunny', 'antenna', 'antenna2', 'horns', 'sprout', 'tuft'];
const ARMS = ['up', 'up', 'wave', 'out'];
const ACCS = ['none', 'none', 'none', 'headband', 'bow', 'wristbands', 'scarf', 'glasses', 'bolt', 'medal'];
const WINGS = ['wings', 'fairy', 'bat'];
const SYL_A = ['Quad', 'Ham', 'Calf', 'Glu', 'Achi', 'Hip', 'Flex', 'Lun', 'Twis', 'Bend', 'Zen', 'Snoo', 'Sprin', 'Pivo',
  'Tendo', 'Fib', 'Sole', 'Pira', 'Psoa', 'Limb', 'Stre', 'Wig', 'Bou', 'Hop', 'Jog', 'Strid', 'Pac', 'Loo', 'Swi', 'Mo', 'Wob', 'Nim'];
const SYL_B = ['y', 'ie', 'o', 'ix', 'kin', 'bo', 'zee', 'oo', 'ette', 'ster', 'ly', 'bug', 'pop', 'mo', 'wee', 'ling', 'bit', 'pip'];
// Frozen list: a Fibbie's favourite stretch is picked from these by index, so adding stretches
// must never change it. New stretches don't go here.
const STRETCH_IDS = ['quad', 'calf', 'fold', 'lunge', 'pigeon', 'seatedFold', 'butterfly', 'itband', 'child', 'catcow',
  'downdog', 'twist', 'lyingHam', 'swingFront', 'swingSide', 'hipCircles', 'buttKicks', 'highKnees', 'calfRaises',
  'armCircles', 'worlds', 'lungeReach', 'squat', 'cobra', 'sideBend', 'happyBaby', 'legsUpWall', 'bridge', 'inchworm',
  'soleus', 'kneeToChest', 'figureFour'];

/** Rarity is part of the seed, so a species is always the same rarity. 55/28/13/4 %. */
export function rarityOf(seed) {
  const x = rng(seed ^ 0x9e3779b9)();
  return x < 0.55 ? 0 : x < 0.83 ? 1 : x < 0.96 ? 2 : 3;
}

function genomeFromSeed(seed) {
  const r = rng(seed);
  const hue = Math.floor(r() * 360);
  return {
    hue,
    hue2: (hue + pick(r, [40, 60, 150, 180, 200, 300])) % 360,
    shape: pick(r, SHAPES),
    eyes: pick(r, EYES),
    mouth: pick(r, MOUTHS),
    cheeks: r() < 0.8,
    pattern: pick(r, PATTERNS),
    head: pick(r, HEADS),
    arms: pick(r, ARMS),
    acc: pick(r, ACCS),
    wings: pick(r, WINGS),
    name: pick(r, SYL_A) + pick(r, SYL_B),
    stretch: pick(r, STRETCH_IDS),
    quirk: Math.floor(r() * 12),
  };
}

/** Species info. sp is a classic id ('quaddy') or 'g' + base-36 seed. */
export function speciesOf(sp) {
  const c = classicById(sp);
  if (c) {
    const r = rng(hashStr(sp));
    return {
      sp, classic: true, rarity: c.rarity,
      genome: {
        ...CLASSIC, hue: c.hue, hue2: (c.hue + 180) % 360, acc: c.acc, eyes: c.eyes || 'round', shape: c.shape || 'bean', wings: pick(r, WINGS), name: c.name,
        ...(c.head && { head: c.head }), ...(c.body && { body: c.body, dark: c.dark }),
      },
    };
  }
  const seed = parseInt(sp.replace(/^g_?/, ''), 36) >>> 0;
  return { sp, classic: false, rarity: rarityOf(seed), genome: genomeFromSeed(seed) };
}
export const seedToSp = (seed) => `g_${(seed >>> 0).toString(36)}`;
export const keyOf = (sp, stage) => `${sp}@${stage}`;
export function parseKey(key) {
  const i = key.lastIndexOf('@');
  if (i < 0) return { sp: key, stage: 1 };
  return { sp: key.slice(0, i), stage: Math.min(MAX_STAGE, Math.max(1, Math.round(Number(key.slice(i + 1))) || 1)) };
}

/** A displayable Fibbie: species + evolution stage, with the genome evolved for that stage. */
export function fibbie(sp, stage = 1) {
  const s = speciesOf(sp);
  const g = { ...s.genome };
  if (stage >= 2) {
    g.hue = (g.hue + 14 * (stage - 1)) % 360;
    if (g.pattern === 'none') g.pattern = 'spots';
    if (g.head === 'none' && !['headband', 'flowers', 'nightcap', 'crown', 'tall', 'leaf', 'bow', 'ears', 'santa', 'elfhat', 'snowman'].includes(g.acc)) g.head = 'tuft';
  }
  if (stage >= 3) g.wing = g.acc === 'wings' ? 'fairy' : g.wings;
  if (stage >= 4) g.aura = true;
  const c = classicById(sp);
  const base = c ? c.name : g.name;
  const name = `${t('stagePrefix')[stage - 1] || ''}${base}`;
  let blurb;
  if (stage > 1) blurb = t('evoBlurbs')[stage - 2]({ name: base });
  else if (c) blurb = c.blurb;
  else blurb = t('fibBlurb', { stretch: STRETCHES[g.stretch].name, quirk: t('quirks')[g.quirk] });
  return {
    key: keyOf(sp, stage), sp, stage, name, blurb, genome: g, classic: s.classic,
    rarity: s.rarity, // species rarity (for drops and the rarity chip)
    glow: Math.min(3, s.rarity + stage - 1), // visual sparkle level
  };
}

// ---------- Collection ----------
// profile.fibs: [{ u: uid, k: 'sp@stage', at }]. profile.dex: { 'sp@stage': firstSeenMs }.

export function migrateProfile(p) {
  // Old saves (and any old cached app version that ran once) keep { id: { count } } in p.fibbies.
  if (!Array.isArray(p.fibs)) p.fibs = [];
  if (!p.dex || typeof p.dex !== 'object') p.dex = {};
  if (p.fibbies && typeof p.fibbies === 'object') {
    for (const [id, e] of Object.entries(p.fibbies)) {
      if (!classicById(id)) continue;
      const k = keyOf(id, 1);
      const have = p.fibs.filter((f) => f.k === k && f.at === 0).length;
      for (let i = have; i < Math.max(1, (e && e.count) || 1); i++) p.fibs.push({ u: uid(), k, at: 0 });
      p.dex[k] = p.dex[k] || 1;
    }
  }
  delete p.fibbies;
  if (p.buddy && !p.buddy.includes('@')) p.buddy = keyOf(p.buddy, 1);
  if (p.buddy && !p.fibs.some((f) => f.k === p.buddy)) p.buddy = p.fibs.length ? p.fibs[p.fibs.length - 1].k : null;
  return p;
}
let uidN = 0;
const uid = () => `${Date.now().toString(36)}${(uidN++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Owned Fibbies grouped by species+stage, sorted: merge-ready first, then evolved, then rare. */
export function groups(p) {
  const m = new Map();
  for (const f of p.fibs) {
    const g = m.get(f.k) || { key: f.k, count: 0, last: 0 };
    g.count++;
    g.last = Math.max(g.last, f.at || 0);
    m.set(f.k, g);
  }
  return [...m.values()].map((g) => {
    const { sp, stage } = parseKey(g.key);
    return { ...g, fib: fibbie(sp, stage), canMerge: g.count >= 2 && stage < MAX_STAGE };
  }).sort((a, b) => (b.canMerge - a.canMerge) || (b.fib.stage - a.fib.stage) || (b.fib.glow - a.fib.glow) || (b.last - a.last));
}
export const countOf = (p, key) => p.fibs.filter((f) => f.k === key).length;
export const discovered = (p) => Object.keys(p.dex || {}).length;

function better(p, key) {
  if (!p.buddy) return true;
  const a = parseKey(key);
  const b = parseKey(p.buddy);
  const fa = fibbie(a.sp, a.stage);
  const fb = fibbie(b.sp, b.stage);
  return fa.glow > fb.glow || (fa.glow === fb.glow && a.stage >= b.stage);
}

export function addFibbie(p, key) {
  p.fibs.push({ u: uid(), k: key, at: Date.now() });
  const isNew = !p.dex[key];
  if (isNew) p.dex[key] = Date.now();
  if (better(p, key)) p.buddy = key;
  return isNew;
}

/** Merge two identical Fibbies into the next stage. Returns the new key, or null. */
export function mergeFibbies(p, key) {
  const { sp, stage } = parseKey(key);
  if (stage >= MAX_STAGE || countOf(p, key) < 2) return null;
  let removed = 0;
  p.fibs = p.fibs.filter((f) => !(f.k === key && removed < 2 && ++removed));
  const next = keyOf(sp, stage + 1);
  const isNew = addFibbie(p, next);
  if (p.buddy === key && !countOf(p, key)) p.buddy = next;
  return { key: next, isNew };
}

// ---------- Drops ----------
// Chance of each rarity for a brand-new species, by chest tier (wooden, rare, epic, legendary).
const NEW_RARITY = [[0.78, 0.22, 0, 0], [0.45, 0.45, 0.1, 0], [0.15, 0.45, 0.35, 0.05], [0, 0.25, 0.5, 0.25]];

/** Pick the chest's Fibbie: sometimes a copy of one you own (to merge), otherwise a new species. */
export function dropFibbie(tier, p, rand = Math.random) {
  const counts = new Map();
  for (const f of p.fibs) {
    const { sp, stage } = parseKey(f.k);
    if (stage === 1) counts.set(sp, (counts.get(sp) || 0) + 1);
  }
  const singles = [...counts].filter(([sp]) => speciesOf(sp).rarity <= Math.max(1, tier));
  if (p.chests > 0 && singles.length && rand() < 0.5) {
    // Prefer completing a pair.
    const weights = singles.map(([, n]) => (n % 2 === 1 ? 3 : 1));
    let x = rand() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < singles.length; i++) { x -= weights[i]; if (x <= 0) return singles[i][0]; }
    return singles[singles.length - 1][0];
  }
  // New species of a rolled rarity.
  const odds = NEW_RARITY[tier] || NEW_RARITY[0];
  let x = rand();
  let want = 0;
  while (want < 3 && x >= odds[want]) { x -= odds[want]; want++; }
  // The originals are still out there to find.
  const classics = FIBBIES.filter((f) => f.rarity === want && !p.dex[keyOf(f.id, 1)]);
  if (classics.length && rand() < 0.35) return pick(rand, classics).id;
  for (let i = 0; i < 2000; i++) {
    const seed = Math.floor(rand() * 4294967296) >>> 0;
    if (rarityOf(seed) === want && !p.dex[keyOf(seedToSp(seed), 1)]) return seedToSp(seed);
  }
  return seedToSp(Math.floor(rand() * 4294967296));
}
