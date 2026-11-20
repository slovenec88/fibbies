// Swaps the content (stretches, routines, rankings, Fibbies, chests, quests) into the
// current language in place, so the rest of the app keeps reading s.name, r.title, etc.
// English originals are snapshotted once so switching back is lossless.
import { STRETCHES, ROUTINES, RANKINGS, CATEGORIES } from './data.js';
import { TIERS, QUESTS } from './rewards.js';
import { FIBBIES } from './fibbies.js';
import { getLang } from './i18n.js';
import { CONTENT as DE } from './lang/de.js';
import { CONTENT as ES } from './lang/es.js';
import { CONTENT as FR } from './lang/fr.js';
import { CONTENT as IT } from './lang/it.js';
import { CONTENT as PT } from './lang/pt.js';
import { CONTENT as SL } from './lang/sl.js';

const snap = (o, keys) => Object.fromEntries(keys.map((k) => [k, Array.isArray(o[k]) ? [...o[k]] : o[k]]));
const EN = {
  stretches: Object.fromEntries(Object.entries(STRETCHES).map(([id, s]) => [id, snap(s, ['name', 'target', 'cues'])])),
  routines: Object.fromEntries(ROUTINES.map((r) => [r.id, snap(r, ['title', 'blurb'])])),
  rankings: Object.fromEntries(Object.entries(RANKINGS).map(([c, rows]) => [c, rows.map(([, why]) => why)])),
  categories: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])),
  fibbies: Object.fromEntries(FIBBIES.map((f) => [f.id, snap(f, ['name', 'blurb'])])),
  tiers: TIERS.map((x) => snap(x, ['label'])),
  quests: Object.fromEntries(QUESTS.map((q) => [q.cat, q.label])),
};

const CONTENT = { sl: SL, de: DE, es: ES, fr: FR, it: IT, pt: PT };

export function localizeContent(lang = getLang()) {
  const L = CONTENT[lang] || null;
  for (const [id, s] of Object.entries(STRETCHES)) {
    const e = EN.stretches[id];
    const x = L && L.stretches[id];
    s.name = x ? x[0] : e.name;
    s.target = x ? x[1] : e.target;
    s.cues = x ? x[2] : e.cues;
  }
  for (const r of ROUTINES) {
    const x = L && L.routines[r.id];
    r.title = x ? x[0] : EN.routines[r.id].title;
    r.blurb = x ? x[1] : EN.routines[r.id].blurb;
  }
  for (const [c, rows] of Object.entries(RANKINGS)) {
    rows.forEach((row, i) => { row[1] = (L && L.rankings[c]?.[i]) || EN.rankings[c][i]; });
  }
  for (const c of CATEGORIES) c.label = (L && L.categories[c.id]) || EN.categories[c.id];
  for (const f of FIBBIES) {
    const x = L && L.fibbies[f.id];
    f.name = (x && x[0]) || EN.fibbies[f.id].name;
    f.blurb = (x && x[1]) || EN.fibbies[f.id].blurb;
  }
  TIERS.forEach((tier, i) => {
    tier.label = (L && L.tiers[i]) || EN.tiers[i].label;
  });
  for (const q of QUESTS) q.label = (L && L.quests[q.cat]) || EN.quests[q.cat];
}
