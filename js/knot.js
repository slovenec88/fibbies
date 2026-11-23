// Your knot: the picture beside Level / XP on the home card. It stands for you, the one doing the
// stretches ("Room to move"). Every day it starts as a lively tangle of fibers round a little face;
// each kind of routine done today (each bonus tile) gives the fibers more rhythm: the tangle loosens,
// settles into a mandala, and opens into a bloom with wide loops and room between them. Each of those
// routines also gives the loops its colour (warm-up peach, cooldown mint, winding down lilac, strength
// gold). Tomorrow it starts again as a knot. A tap gets a stretch, a soft sound and a note: thanks and
// encouragement early in the day, praise and thanks once you've done a lot.
import { t } from './i18n.js';
import { fmtBig } from './rewards.js';
import { esc } from './critter.js';

const INK = '#2b2233';
const R = 40; // body radius
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// [core, edge] colours. Untouched loops keep the knot's own coral; today's routines add theirs.
const BASE = [['#ff6b8e', '#e4466c'], ['#ff4f86', '#d63369'], ['#ff8f4f', '#e26a2e'], ['#ff6b8e', '#e4466c'], ['#ff7aa0', '#e0527a']];
export const KIND_COLOURS = { before: ['#ffa463', '#e57e3a'], after: ['#86e0bd', '#3a9c7c'], evening: ['#b9a4f8', '#8c74e0'], strength: ['#ffd25a', '#dea72a'] };
// Loop layouts by how many kinds of routine are done today. Each layout is a list of layers drawn back
// to front; each loop is [angle, r0, r1, w, tilt, stroke, shape]. For an 'ellipse' loop r0 is how far
// out its centre sits, r1 and w its two radii; for a petal they run from r0 out to r1, w wide.
const ring = (n, start, r0, r1, w, sw, shape, tilt = 0) => Array.from({ length: n }, (_, i) => [start + i * 360 / n, r0, r1, w, i % 2 ? -tilt : tilt, sw, shape]);
const LAYOUT = [
  // 0: the starting knot, a lively ring of long loops crossing each other at all angles
  [ring(22, 0, 51, 20, 9.5, 3.8, 'ellipse', 26)],
  // 1: a little untangled: fewer loops, crossing much less
  [ring(16, 0, 52, 20, 10, 4, 'ellipse', 16)],
  // 2: the loops line up into an even ring
  [ring(12, 0, 53, 21, 11.5, 4.4, 'ellipse')],
  // 3: finding a rhythm, a mandala: nine lotus petals with rounded ones in the gaps (nine, so three colours share out evenly)
  [ring(9, 0, 32, 74, 14, 5, 'point'), ring(9, 20, 34, 58, 14, 5, 'round')],
  // 4: the full mandala: each lotus petal holds a slim one, and all four of today's colours
  [ring(8, 0, 32, 74, 15, 5, 'point'), ring(8, 0, 40, 60, 7, 3, 'point'), ring(8, 22.5, 34, 58, 15, 5, 'round')],
];
// Drawn by hand, not by a machine: every loop is a little different and a little lopsided. How much
// depends on the stage: the morning knot is messy, the mandala only slightly uneven.
const MESS = [1, 0.8, 0.55, 0.32, 0.26];
const seeded = (seed) => () => { // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const f1 = (n) => n.toFixed(1);
/** An egg-ish ellipse: each quarter has its own radius. */
const blob = (cx, [ra, rb, rc, rd]) => {
  const k = 0.5523;
  return `M${f1(cx + ra)} 0C${f1(cx + ra)} ${f1(rb * k)} ${f1(cx + ra * k)} ${f1(rb)} ${f1(cx)} ${f1(rb)}C${f1(cx - rc * k)} ${f1(rb)} ${f1(cx - rc)} ${f1(rb * k)} ${f1(cx - rc)} 0`
    + `C${f1(cx - rc)} ${f1(-rd * k)} ${f1(cx - rc * k)} ${f1(-rd)} ${f1(cx)} ${f1(-rd)}C${f1(cx + ra * k)} ${f1(-rd)} ${f1(cx + ra)} ${f1(-rd * k)} ${f1(cx + ra)} 0Z`;
};
const petal = (r0, r1, wl, wr, tip, shape) => {
  const l0 = wl * 0.35;
  const r0w = wr * 0.35;
  if (shape === 'point') {
    const rm = r0 + (r1 - r0) * 0.5;
    return `M${f1(r0)} ${f1(-l0)}C${f1(rm)} ${f1(-wl * 1.25)} ${f1(r1 - 12)} ${f1(-wl * 0.6 + tip)} ${f1(r1)} ${f1(tip)}C${f1(r1 - 12)} ${f1(wr * 0.6 + tip)} ${f1(rm)} ${f1(wr * 1.25)} ${f1(r0)} ${f1(r0w)}Z`;
  }
  const rm = r0 + (r1 - r0) * 0.45;
  return `M${f1(r0)} ${f1(-l0)}C${f1(rm)} ${f1(-wl * 1.25)} ${f1(r1)} ${f1(-wl + tip)} ${f1(r1)} ${f1(tip)}C${f1(r1)} ${f1(wr + tip)} ${f1(rm)} ${f1(wr * 1.25)} ${f1(r0)} ${f1(r0w)}Z`;
};
/** One cord loop, nudged by hand: a darker edge, its colour, and a stitched light line along the middle. */
const loop = ([a, r0, r1, w, tilt, sw, shape], [core, edge], rnd, mess) => {
  const j = (amount) => (rnd() - 0.5) * 2 * amount * mess;
  a += j(shape === 'ellipse' ? 9 : 4);
  r0 += j(shape === 'ellipse' ? 5 : 2);
  r1 *= 1 + j(shape === 'ellipse' ? 0.28 : 0.07);
  w *= 1 + j(0.3);
  tilt += j(shape === 'ellipse' ? 26 : 6);
  sw *= 1 + j(0.22);
  const d = shape === 'ellipse'
    ? blob(r0, [r1 * (1 + j(0.16)), w * (1 + j(0.22)), r1 * (1 + j(0.16)), w * (1 + j(0.22))])
    : petal(r0, r1, w * (1 + j(0.18)), w * (1 + j(0.18)), j(w * 0.25), shape);
  const tf = `rotate(${f1(a)})${tilt ? ` rotate(${f1(tilt)} ${f1(r0)} 0)` : ''}`;
  const dash = `${f1(3 + rnd() * 2)} ${f1(3 + rnd() * 1.4)}`;
  return `<g transform="${tf}"><path d="${d}" stroke="${edge}" stroke-width="${f1(sw + 1.4)}"/><path d="${d}" stroke="${core}" stroke-width="${f1(sw)}"/><path d="${d}" stroke="#fff" stroke-width="${(sw * 0.32).toFixed(2)}" stroke-dasharray="${dash}" stroke-dashoffset="${f1(rnd() * 6)}" opacity=".9"/></g>`;
};
const eyes = `<g fill="#fff"><ellipse cx="-13" cy="0" rx="7.6" ry="8.6"/><ellipse cx="13" cy="0" rx="7.6" ry="8.6"/></g><g fill="${INK}"><circle cx="-12" cy="1.4" r="5.6"/><circle cx="14" cy="1.4" r="5.6"/></g><g fill="#fff"><circle cx="-9.8" cy="-1.2" r="2.4"/><circle cx="16.2" cy="-1.2" r="2.4"/></g>`;
const cheeks = '<g fill="#ff4f78" opacity=".45"><ellipse cx="-25" cy="9" rx="7" ry="4"/><ellipse cx="25" cy="9" rx="7" ry="4"/></g>';
const FACE = `${eyes}${cheeks}<path d="M-6.5 12 q3.25 4 6.5 0 q3.25 4 6.5 0" stroke="${INK}" stroke-width="3"/>`;
// Mid-stretch: eyes shut in bliss, a little "o".
const STRETCH_FACE = `${cheeks}<path d="M-18 0 q5 5 10 0 M8 0 q5 5 10 0" stroke="${INK}"/><ellipse cx="0" cy="12" rx="3.4" ry="4.2" fill="${INK}"/>`;

/** The knot's picture (inner SVG, viewBox -80 -80 160 160). `kinds`: today's kinds of routine, in the order done. */
export function knotArt(kinds = [], id = 'kn', seed = 7) {
  const palette = kinds.length ? [BASE[0], ...kinds.map((k) => KIND_COLOURS[k]).filter(Boolean)] : BASE;
  const stage = Math.min(kinds.length, LAYOUT.length - 1);
  const layout = LAYOUT[stage];
  const rnd = seeded(seed * 31 + stage);
  // A ring takes today's colours in a mixed order (each still turns up as often as the others).
  const mixed = layout[0].map((_, i) => palette[i % palette.length]).sort(() => rnd() - 0.5);
  const rest = palette.length > 1 ? palette.slice(1) : palette;
  // Mandala: the lotus petals keep the knot's own pink; the rounded petals between them share out all of
  // today's colours evenly, and the slim petals inside the lotus ones take them too, shifted along.
  const colour = (n, i) => {
    if (layout.length === 1) return mixed[i];
    if (n === 0) return palette[0];
    if (n < layout.length - 1) return rest[(i + 2) % rest.length];
    return rest[i % rest.length];
  };
  const layers = layout.map((layer, n) => layer.map((l, i) => loop(l, colour(n, i), rnd, MESS[stage])).join(''));
  const loops = layers.join('');
  return `<defs><radialGradient id="${id}-b" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffc2cc"/><stop offset=".55" stop-color="#ff8798"/><stop offset="1" stop-color="#e2475f"/></radialGradient></defs>
    <g class="kn-all">
      <g class="kn-tie"><g class="kn-loops" fill="none" stroke-linecap="round" stroke-linejoin="round">${loops}</g></g>
      <g transform="scale(1.14)">
      <circle r="${R}" fill="url(#${id}-b)" stroke="#c93a52" stroke-width="2.5"/>
      <path d="M-26 -30 C-6 -14 -30 10 -8 38 M-4 -40 C16 -20 -10 8 14 37 M18 -35 C36 -14 12 10 30 26" stroke="#fff" stroke-opacity=".28" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <g stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><g class="kf-norm">${FACE}</g><g class="kf-str">${STRETCH_FACE}</g></g></g>
    </g>`;
}

/** The knot on the home card. */
export function knotHTML(lp, kinds = [], day = '') {
  let seed = 7;
  for (const ch of day) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  startIdle();
  return `<div class="knot-wrap">
    <button class="knot" aria-label="${esc(toGo(lp))}"><svg viewBox="-80 -80 160 160" aria-hidden="true">${knotArt(kinds, 'kn', seed)}</svg></button>
    <span class="knot-note" role="status"></span></div>`;
}

const toGo = (lp) => t('knotToGo', { x: fmtBig(lp.need - lp.into), n: lp.level + 1 });

/** One stretch: the loops breathe out wide and settle, the knot leans side to side. */
function stretch(svg) {
  if (!svg || reduceMotion() || svg.classList.contains('stretching')) return;
  svg.classList.add('stretching');
  setTimeout(() => svg.classList.remove('stretching'), 2300);
}

// Now and then, on its own, the knot stretches (only while the home screen is in view).
let idle = null;
function startIdle() {
  if (idle) return;
  const loop = () => {
    idle = setTimeout(() => {
      const svg = document.querySelector('.view.active .knot svg');
      if (svg && !document.hidden) stretch(svg);
      loop();
    }, 7000 + Math.random() * 5000);
  };
  loop();
}

/** After drawing: when today's routines have opened the knot up since it was last seen, it bursts
 *  its loops and ties them anew in the new shape. A new day starts quietly as a knot again. */
export function knotGrowthCheck(day, kinds) {
  let prev = null;
  try { prev = JSON.parse(localStorage.getItem('fibbies.knot-seen') || 'null'); localStorage.setItem('fibbies.knot-seen', JSON.stringify({ day, n: kinds })); } catch { /* ignore */ }
  const svg = document.querySelector('#progress-card .knot svg');
  if (!svg || !prev || prev.day !== day || kinds <= prev.n || reduceMotion()) return false;
  setTimeout(() => svg.classList.add('kn-burst'), 400);
  setTimeout(() => svg.classList.remove('kn-burst'), 2100);
  return true;
}

// A tap: the knot stretches and says something. Which notes depend on how many kinds of routine
// you've done today: none yet (thanks + encouragement), one or two (encouragement + thanks),
// three or four (praise + thanks). The very first tap introduces the knot.
const next = {};
let hideT = 0;
export function knotTap(wrap, lp, kindsToday) {
  stretch(wrap.querySelector('svg'));
  let msg;
  let met = true;
  try { met = !!localStorage.getItem('fibbies.knot-met'); localStorage.setItem('fibbies.knot-met', '1'); } catch { /* ignore */ }
  if (!met) msg = t('knotIntro');
  else {
    const tier = kindsToday === 0 ? 0 : kindsToday <= 2 ? 1 : 2;
    const notes = t('knotNotes')[tier];
    next[tier] ??= Math.floor(Math.random() * notes.length);
    msg = notes[next[tier]++ % notes.length];
  }
  const note = wrap.querySelector('.knot-note');
  note.innerHTML = `<b>${esc(msg)}</b><small>${esc(toGo(lp))}</small>`;
  note.classList.remove('show');
  void note.offsetWidth;
  note.classList.add('show');
  clearTimeout(hideT);
  hideT = setTimeout(() => note.classList.remove('show'), 4800);
}
