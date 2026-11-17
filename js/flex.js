// Weekly flexibility self-check: four tests rated on a 0-4 scale, no tools needed.
// History lives in localStorage under "limber.flex" (so it also goes into cloud save).
import { t, numLocale } from './i18n.js';
import { cloud } from './cloud.js';

export const FLEX_TESTS = [
  { id: 'toe', fig: 'fold' },
  { id: 'quad', fig: 'quad', side: true },
  { id: 'squat', fig: 'squat' },
  { id: 'shoulder', fig: 'tricep', side: true },
];
export const FLEX_MAX = 4;
export const WEEK_DAYS = 7;
const KEY = 'limber.flex';

/** [{ day: 'YYYY-MM-DD', r: { toe: 0-4, ... } }], oldest first, one entry per day. */
export function loadFlex() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(v)) return [];
    // Clamp every answer, so a damaged save can never push the score past 100 or show a missing label.
    return v.filter((e) => e && typeof e.day === 'string' && /^\d{4}-\d\d-\d\d$/.test(e.day) && e.r && typeof e.r === 'object')
      .map((e) => ({ day: e.day, r: Object.fromEntries(FLEX_TESTS.map((x) => [x.id, Math.max(0, Math.min(FLEX_MAX, Math.round(Number(e.r[x.id]) || 0)))])) }));
  } catch { return []; }
}
export function saveFlex(day, r) {
  const list = loadFlex().filter((e) => e.day !== day);
  list.push({ day, r });
  list.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-200))); } catch { /* ignore */ }
  cloud.touch();
}

/** 0-100 score for one check. */
export const scoreOf = (e) => Math.round((FLEX_TESTS.reduce((a, x) => a + (Number(e.r[x.id]) || 0), 0) / (FLEX_TESTS.length * FLEX_MAX)) * 100);

const parseDay = (day) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d); };
/** Whole days from the last check to today (null when never checked). */
export function daysSinceLast(list, today) {
  if (!list.length) return null;
  // A check dated in the future (clock changed, other time zone) counts as done today.
  return Math.max(0, Math.round((parseDay(today) - parseDay(list[list.length - 1].day)) / 864e5));
}
export const fmtDay = (day, opts = { day: 'numeric', month: 'short' }) => parseDay(day).toLocaleDateString(numLocale(), opts);

/**
 * Line chart of the score over time. One series in the theme colour, so no legend; the title names it.
 * Points are evenly spaced by check (not by date) so weekly gaps never squash the line.
 */
export function flexChartSVG(list, { w = 320, h = 150, mini = false } = {}) {
  const pts = list.slice(-12);
  const padL = mini ? 6 : 30, padR = mini ? 6 : 22, padT = mini ? 8 : 14, padB = mini ? 6 : 24;
  const iw = w - padL - padR, ih = h - padT - padB;
  const x = (i) => padL + (pts.length < 2 ? iw / 2 : (i / (pts.length - 1)) * iw);
  // The full chart keeps the honest 0-100 scale; the sparkline zooms in so small gains are visible.
  const all = pts.map(scoreOf);
  const lo = mini ? Math.max(0, Math.min(...all) - 8) : 0;
  const hi = mini ? Math.min(100, Math.max(...all) + 8) : 100;
  const y = (v) => padT + ih - ((v - lo) / Math.max(1, hi - lo)) * ih;
  let g = '';
  if (!mini) {
    for (const v of [0, 50, 100]) {
      g += `<line class="fc-grid" x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}"/>`;
      g += `<text class="fc-tick" x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    if (pts.length) {
      g += `<text class="fc-tick" x="${x(0)}" y="${h - 6}" text-anchor="${pts.length < 2 ? 'middle' : 'start'}">${fmtDay(pts[0].day)}</text>`;
      if (pts.length > 1) g += `<text class="fc-tick" x="${x(pts.length - 1)}" y="${h - 6}" text-anchor="end">${fmtDay(pts[pts.length - 1].day)}</text>`;
    }
  }
  const s = pts.map(scoreOf);
  const hitR = pts.length < 2 ? 16 : Math.min(16, iw / (pts.length - 1) / 2); // no overlapping tap targets
  if (s.length > 1) {
    const d = s.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
    g += `<path class="fc-area" d="${d}L${x(s.length - 1).toFixed(1)} ${y(lo)}L${x(0).toFixed(1)} ${y(lo)}Z"/>`;
    g += `<path class="fc-line" d="${d}"/>`;
  }
  s.forEach((v, i) => {
    const last = i === s.length - 1;
    g += `<circle class="fc-dot${last ? ' last' : ''}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${mini ? (last ? 3.5 : 0) : 4}"/>`;
    if (!mini) {
      g += `<circle class="fc-hit" data-i="${i}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${hitR.toFixed(1)}"><title>${fmtDay(pts[i].day)}: ${v}</title></circle>`;
      if (last) g += `<text class="fc-val" x="${x(i).toFixed(1)}" y="${(y(v) - 10).toFixed(1)}" text-anchor="${s.length < 2 ? 'middle' : 'end'}">${v}</text>`;
    }
  });
  return `<svg class="flex-chart${mini ? ' mini' : ''}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${t('flexScore')}">${g}</svg>`;
}
export const chartPoints = (list) => list.slice(-12);
