// Swaps the content (stretches, routines, categories, Fibbies, chests) into the
// current language in place, so the rest of the app keeps reading s.name, r.title, etc.
// English originals are snapshotted once so switching back is lossless.
import { STRETCHES, ROUTINES, CATEGORIES } from './data.js';
import { TIERS } from './rewards.js';
import { FIBBIES } from './fibbies.js';
import { getLang } from './i18n.js';
import { CONTENT as DE, GUIDES as DE_GUIDES } from './lang/de.js';
import { CONTENT as ES, GUIDES as ES_GUIDES } from './lang/es.js';
import { CONTENT as FR, GUIDES as FR_GUIDES } from './lang/fr.js';
import { CONTENT as IT, GUIDES as IT_GUIDES } from './lang/it.js';
import { CONTENT as PT, GUIDES as PT_GUIDES } from './lang/pt.js';
import { CONTENT as SL, GUIDES as SL_GUIDES } from './lang/sl.js';
import { GUIDES as EN_GUIDES } from './lang/en-guides.js';

const snap = (o, keys) => Object.fromEntries(keys.map((k) => [k, Array.isArray(o[k]) ? [...o[k]] : o[k]]));
const EN = {
  stretches: Object.fromEntries(Object.entries(STRETCHES).map(([id, s]) => [id, snap(s, ['name', 'target', 'cues'])])),
  routines: Object.fromEntries(ROUTINES.map((r) => [r.id, snap(r, ['title', 'blurb'])])),
  categories: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])),
  fibbies: Object.fromEntries(FIBBIES.map((f) => [f.id, snap(f, ['name', 'blurb'])])),
  tiers: TIERS.map((x) => snap(x, ['label'])),
};

const CONTENT = { sl: SL, de: DE, es: ES, fr: FR, it: IT, pt: PT };
const GUIDES = { en: EN_GUIDES, sl: SL_GUIDES, de: DE_GUIDES, es: ES_GUIDES, fr: FR_GUIDES, it: IT_GUIDES, pt: PT_GUIDES };

export function exerciseGuide(id, lang = getLang()) {
  return (GUIDES[lang] || EN_GUIDES)[id] || '';
}

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
  for (const c of CATEGORIES) c.label = (L && L.categories[c.id]) || EN.categories[c.id];
  for (const f of FIBBIES) {
    const x = L && L.fibbies[f.id];
    f.name = (x && x[0]) || EN.fibbies[f.id].name;
    f.blurb = (x && x[1]) || EN.fibbies[f.id].blurb;
  }
  TIERS.forEach((tier, i) => {
    tier.label = (L && L.tiers[i]) || EN.tiers[i].label;
  });
}
