// Reward loop: every finished session opens a chest that pays out "muscle fibers
// stretched", stacks multipliers, drops a collectible Fibbie and grants XP.

import { t, getLang, numLocale } from './i18n.js';

export const FIBERS_PER_SEC = 1337;

export const TIERS = [
  { name: 'Common', label: 'Wooden chest' },
  { name: 'Rare', label: 'Rare chest' },
  { name: 'Epic', label: 'Epic chest' },
  { name: 'Legendary', label: 'Legendary chest' },
];

// hue = body color (OKLCH hue). rarity = minimum chest tier that can drop it.
export const FIBBIES = [
  { id: 'quaddy', name: 'Quaddy', rarity: 0, hue: 150, acc: 'headband', blurb: 'Never skips quad day.' },
  { id: 'hammy', name: 'Hammy', rarity: 0, hue: 25, acc: 'ears', blurb: 'A hamstring with hamster energy.' },
  { id: 'calfy', name: 'Calfy', rarity: 0, hue: 60, acc: 'wristbands', blurb: 'Bouncy, springy, a little dramatic.' },
  { id: 'glutey', name: 'Glutey', rarity: 0, hue: 0, acc: 'bow', blurb: 'Powers every stride, asks for nothing.' },
  { id: 'achi', name: 'Achi', rarity: 0, hue: 230, acc: 'wings', blurb: 'Tiny wings, mighty tendon.' },
  { id: 'hippy', name: 'Hippy', rarity: 1, hue: 300, acc: 'flowers', blurb: 'Hip flexor, flower child.' },
  { id: 'sprinty', name: 'Sprinty', rarity: 1, hue: 20, acc: 'bolt', blurb: 'Fast-twitch and proud of it.' },
  { id: 'zenny', name: 'Zenny', rarity: 1, hue: 185, acc: 'leaf', blurb: 'Breathes in for four, out for eight.' },
  { id: 'snoozy', name: 'Snoozy', rarity: 1, hue: 265, acc: 'nightcap', blurb: 'Best friends with Legs Up the Wall.' },
  { id: 'bendy', name: 'Bendy', rarity: 2, hue: 95, acc: 'tall', blurb: 'Stretched so much it got taller.' },
  { id: 'medalia', name: 'Medalia', rarity: 2, hue: 340, acc: 'medal', blurb: 'Finished a marathon. Mentions it often.' },
  { id: 'goldie', name: 'Golden Fibbie', rarity: 3, hue: 85, acc: 'crown', blurb: 'The legend. Stretches in pure gold.' },
];

// ---------- Profile storage ----------
const KEY = 'limber.profile';
export function loadProfile() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* ignore */ }
  return Object.assign({ xp: 0, fibers: 0, chests: 0, fibbies: {}, buddy: null }, p || {});
}
export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

// ---------- Levels ----------
// Cumulative XP to reach level L: 1M * (L-1)^2.2, rounded to 10k.
// L2 1M, L3 4.6M, L4 11M, L5 21M, L10 125M, L20 650M. A typical session pays 0.5-2M,
// so early levels come within days and later ones take weeks of daily stretching.
export const levelStart = (L) => (L <= 1 ? 0 : Math.round((1e6 * Math.pow(L - 1, 2.2)) / 1e4) * 1e4);
export function levelOf(xp) {
  let L = 1;
  while (xp >= levelStart(L + 1)) L++;
  return L;
}
export function levelProgress(xp) {
  const L = levelOf(xp);
  const a = levelStart(L);
  const b = levelStart(L + 1);
  return { level: L, into: xp - a, need: b - a, frac: (xp - a) / (b - a) };
}

export function fmtBig(n) {
  if (getLang() === 'sl') {
    const d = (x, big) => x.toFixed(big ? 0 : 1).replace('.', ',');
    if (n >= 1e9) return `${d(n / 1e9, n >= 1e10)} mrd.`;
    if (n >= 1e6) return `${d(n / 1e6, n >= 1e7)} mio.`;
    if (n >= 1e4) return `${Math.round(n / 1e3)} tis.`;
    return n.toLocaleString(numLocale());
  }
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}K`;
  return n.toLocaleString('en-US');
}

// ---------- Quests ----------
export const QUESTS = [
  { cat: 'before', icon: 'bolt', label: 'Warm up before a run' },
  { cat: 'after', icon: 'directions_run', label: 'Cool down after a run' },
  { cat: 'evening', icon: 'bedtime', label: 'Evening wind-down' },
];

/** Categories completed today, from the session log (entries count when at least half done). */
export function todaysCats(log, day) {
  return new Set(log.filter((h) => h.day === day && h.cat && (h.ratio ?? 1) >= 0.5).map((h) => h.cat));
}

// ---------- Reward computation ----------
const round2 = (x) => Math.round(x * 100) / 100;

function pickFibbie(tier, profile, rand) {
  // Better chests skip the lowest rarities: Legendary drops Rare or better, Epic drops Common to Epic.
  const pool = FIBBIES.filter((f) => f.rarity <= tier && f.rarity >= tier - 2);
  const unowned = pool.filter((f) => !profile.fibbies[f.id]);
  const source = unowned.length && (rand() < 0.7 || !profile.chests) ? unowned : pool;
  const weights = source.map((f) => (f.rarity === tier ? 3 : 1));
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < source.length; i++) {
    r -= weights[i];
    if (r <= 0) return source[i];
  }
  return source[source.length - 1];
}

/**
 * @param o.routine     finished routine
 * @param o.holdSecs    planned seconds of stretching (sum of holds)
 * @param o.ratio       0..1 how much of the session was actually done
 * @param o.skips       number of skipped stretches
 * @param o.scale       hold-length setting
 * @param o.priorToday  Set of categories already done today (before this session)
 * @param o.firstToday  true if this is the first session today
 * @param o.streak      streak in days, including today
 * @param o.profile     current profile (not mutated)
 */
export function computeReward(o, rand = Math.random) {
  const { routine, holdSecs, ratio, skips, scale, priorToday, firstToday, streak, profile } = o;
  const base = Math.max(1000, Math.round((holdSecs * FIBERS_PER_SEC * ratio) / 10) * 10);
  const perfect = skips === 0 && ratio >= 0.95;
  // Once per day: only the first qualifying session of this category completes the sandwich.
  const sandwich = ratio >= 0.5 && !priorToday.has(routine.cat)
    && ((routine.cat === 'after' && priorToday.has('before')) || (routine.cat === 'before' && priorToday.has('after')));
  const lucky = rand() < 0.08;

  const mults = [];
  if (firstToday) mults.push({ icon: 'wb_sunny', label: t('m.first'), x: 1.2 });
  if (streak >= 2) mults.push({ icon: 'local_fire_department', label: t('m.streak', { n: streak }), x: round2(1 + 0.1 * Math.min(streak, 20)) });
  if (sandwich) mults.push({ icon: 'lunch_dining', label: t('m.sandwich'), x: 2, hot: true });
  if (scale === 'flex') mults.push({ icon: 'self_improvement', label: t('m.flex'), x: 1.5 });
  if (perfect) mults.push({ icon: 'verified', label: t('m.perfect'), x: 1.25 });
  if (lucky) mults.push({ icon: 'casino', label: t('m.lucky'), x: 3, hot: true });

  let total = base;
  const steps = [base];
  for (const m of mults) {
    total = Math.round(total * m.x);
    steps.push(total);
  }

  let pts = 0;
  if (perfect) pts++;
  if (streak >= 3) pts++;
  if (streak >= 7) pts++;
  if (sandwich) pts++;
  if (scale === 'flex') pts++;
  if (lucky) pts++;
  if (rand() < 0.15) pts++;
  let tier = pts >= 4 ? 3 : pts === 3 ? 2 : pts >= 1 ? 1 : 0;
  if (!profile.chests) tier = Math.max(tier, 1); // first chest is always special
  if (ratio < 0.3) tier = 0;

  const fib = pickFibbie(tier, profile, rand);
  const prevCount = profile.fibbies[fib.id]?.count || 0;
  const before = levelProgress(profile.xp);
  const after = levelProgress(profile.xp + total);
  return {
    base, mults, steps, total, tier, perfect, sandwich, lucky,
    fibbie: fib, isNew: prevCount === 0, fibLevel: prevCount + 1,
    xpBefore: profile.xp, xpAfter: profile.xp + total,
    levelBefore: before.level, levelAfter: after.level,
  };
}

export function applyReward(profile, r) {
  profile.xp += r.total;
  profile.fibers += r.total;
  profile.chests += 1;
  const e = profile.fibbies[r.fibbie.id] || { count: 0 };
  e.count += 1;
  profile.fibbies[r.fibbie.id] = e;
  if (!profile.buddy || r.fibbie.rarity >= (FIBBIES.find((f) => f.id === profile.buddy)?.rarity ?? 0)) profile.buddy = r.fibbie.id;
  return profile;
}
