// Reward loop: every finished session opens a chest that pays out "muscle fibers
// stretched", stacks multipliers, drops a collectible Fibbie and grants XP.

import { t, getLang, numLocale } from './i18n.js';
import { fibbie, keyOf, countOf, dropFibbie, addFibbie, migrateProfile } from './fibbies.js';
import { cloud } from './cloud.js';

export const FIBERS_PER_SEC = 1337;

export const TIERS = [
  { name: 'Common', label: 'Wooden chest' },
  { name: 'Rare', label: 'Rare chest' },
  { name: 'Epic', label: 'Epic chest' },
  { name: 'Legendary', label: 'Legendary chest' },
];

export { FIBBIES } from './fibbies.js';

// ---------- Profile storage ----------
const KEY = 'limber.profile';
export function loadProfile() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* ignore */ }
  return migrateProfile(Object.assign({ xp: 0, fibers: 0, chests: 0, buddy: null }, p || {}));
}
export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
  cloud.touch();
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
  if (getLang() !== 'en') {
    if (n < 1e4) return n.toLocaleString(numLocale());
    return new Intl.NumberFormat(numLocale(), { notation: 'compact', maximumFractionDigits: n >= 1e10 || (n < 1e9 && n >= 1e7) || n < 1e6 ? 0 : 1 }).format(n);
  }
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}K`;
  return n.toLocaleString('en-US');
}

// ---------- Quests ----------
export const QUESTS = [
  { cat: 'before', icon: 'bolt', label: 'Warm up before exercise' },
  { cat: 'after', icon: 'fitness_center', label: 'Cool down after exercise' },
  { cat: 'evening', icon: 'bedtime', label: 'Evening wind-down' },
];

/** Categories completed today, from the session log (entries count when at least half done). */
export function todaysCats(log, day) {
  return new Set(log.filter((h) => h.day === day && h.cat && (h.ratio ?? 1) >= 0.5).map((h) => h.cat));
}

// ---------- Reward computation ----------
const round2 = (x) => Math.round(x * 100) / 100;

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

  // Chest tier is a roll: wooden chests are the usual result, so a rare one feels special.
  // Luck (streaks, a stretch sandwich, Flex 60s) tilts the odds; a lucky stretch is at least rare.
  // No luck: 75 % wooden, 20 % rare, 4 % epic, 1 % legendary. All four: about 32/44/18/6 %.
  let luck = 0;
  if (streak >= 3) luck++;
  if (streak >= 7) luck++;
  if (sandwich) luck++;
  if (scale === 'flex') luck++;
  const pLeg = 0.01 + 0.012 * luck;
  const pEpic = 0.04 + 0.035 * luck;
  const pRare = 0.2 + 0.06 * luck;
  const roll = rand();
  let tier = roll < pLeg ? 3 : roll < pLeg + pEpic ? 2 : roll < pLeg + pEpic + pRare ? 1 : 0;
  if (lucky) tier = Math.max(tier, 1);
  if (!profile.chests) tier = Math.max(tier, 1); // first chest is always special
  if (ratio < 0.3) tier = 0;

  const fib = fibbie(dropFibbie(tier, profile, rand), 1);
  // Now and then a Fibbie is too shy and runs off. Never in the first few chests, never from
  // an epic or legendary chest, and never twice in a row.
  const ranAway = profile.chests >= 3 && tier <= 1 && !profile.lastRanAway && rand() < 0.08;
  const copies = countOf(profile, fib.key) + (ranAway ? 0 : 1);
  const before = levelProgress(profile.xp);
  const after = levelProgress(profile.xp + total);
  return {
    base, mults, steps, total, tier, perfect, sandwich, lucky, ranAway,
    fibbie: fib, isNew: !profile.dex[fib.key], copies,
    xpBefore: profile.xp, xpAfter: profile.xp + total,
    levelBefore: before.level, levelAfter: after.level,
  };
}

export function applyReward(profile, r) {
  profile.xp += r.total;
  profile.fibers += r.total;
  profile.chests += 1;
  profile.lastRanAway = !!r.ranAway;
  if (!r.ranAway) addFibbie(profile, keyOf(r.fibbie.sp, 1));
  return profile;
}
