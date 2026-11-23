// Your Fibbie on the home card, beside Level / XP: the app's own logo come alive. It sways and
// breathes, waves its arms, blinks and smiles now and then, and sometimes says something on its own.
// A tap gets a stretch, a soft sound (played by the caller) and a note: thanks and encouragement
// early in the day, praise and thanks once you've done a lot.
// (The knot that used to live here waits on the maybe-someday/knot branch.)
import { getLang, t } from './i18n.js';
import { fmtBig } from './rewards.js';
import { esc } from './critter.js';

const INK = '#2b2233';
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// The same drawing as icons/icon.svg: big and low in its tile, the body running off the bottom edge.
// Arms, eyes and mouth are their own groups so they can move.
const ART = `<defs><radialGradient id="pal-bg" cx="50%" cy="42%" r="72%"><stop offset="0" stop-color="#2fbf98"/><stop offset="1" stop-color="#00594a"/></radialGradient>
  <clipPath id="pal-clip"><rect width="120" height="120" rx="26"/></clipPath></defs>
  <g clip-path="url(#pal-clip)"><rect width="120" height="120" fill="url(#pal-bg)"/>
  <g transform="translate(-7.2 -6) scale(1.12)"><g class="pal-body">
    <g class="pal-arm pal-arm-l"><path d="M36 64 Q22 48 18 36" stroke="#3fa65a" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="18" cy="36" r="6.5" fill="#93df9f"/></g>
    <g class="pal-arm pal-arm-r"><path d="M84 64 Q98 48 102 36" stroke="#3fa65a" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="102" cy="36" r="6.5" fill="#93df9f"/></g>
    <rect x="26" y="34" width="68" height="110" rx="34" fill="#93df9f"/>
    <ellipse cx="60" cy="82" rx="23" ry="19" fill="#fff" opacity=".28"/>
    <g class="pal-eyes"><ellipse cx="47" cy="64" rx="9" ry="10.5" fill="#fff"/><ellipse cx="73" cy="64" rx="9" ry="10.5" fill="#fff"/>
      <circle cx="48" cy="66" r="6.4" fill="${INK}"/><circle cx="74" cy="66" r="6.4" fill="${INK}"/>
      <circle cx="50.5" cy="62.5" r="2.6" fill="#fff"/><circle cx="76.5" cy="62.5" r="2.6" fill="#fff"/></g>
    <path class="pal-happy" d="M39 66 q8 -8 16 0 M65 66 q8 -8 16 0" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="35" cy="77" rx="6.5" ry="3.8" fill="#ff8fab" opacity=".75"/><ellipse cx="85" cy="77" rx="6.5" ry="3.8" fill="#ff8fab" opacity=".75"/>
    <path class="pal-mouth" d="M53.5 76 q3.25 4.2 6.5 0 q3.25 4.2 6.5 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path class="pal-grin" d="M51 75 q9 11 18 0 z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <rect x="27" y="42" width="66" height="9" rx="4.5" fill="#ff5d73"/>
    <path d="M92 46 l12 -6 l-2 10 z M92 47 l13 4 l-8 7 z" fill="#ff5d73"/>
  </g></g></g>`;

/** Your Fibbie on the home card. */
export function palHTML(lp) {
  startLife();
  return `<div class="pal-wrap">
    <button class="pal" aria-label="${esc(toGo(lp))}"><svg viewBox="0 0 120 120" aria-hidden="true">${ART}</svg></button>
    <span class="pal-note" role="status"></span></div>`;
}

const toGo = (lp) => t('knotToGo', { x: fmtBig(lp.need - lp.into), n: lp.level + 1 });
const current = () => document.querySelector('.view.active .pal svg');

/** Adds a class for a moment (a blink, a smile, a stretch), unless one is already running. */
function moment(svg, cls, ms) {
  if (!svg || reduceMotion() || svg.classList.contains(cls)) return;
  svg.classList.add(cls);
  setTimeout(() => svg.classList.remove(cls), ms);
}

// Its little life: blinks every few seconds, a smile now and then, a stretch every so often, and once
// in a while a note on its own. Only while the home screen is in view.
let alive = false;
let kindsToday = null;
let welcomed = false;
function startLife() {
  if (alive) return;
  alive = true;
  const every = (min, max, fn) => {
    const go = () => setTimeout(() => { const svg = current(); if (svg && !document.hidden) fn(svg); go(); }, min + Math.random() * (max - min));
    go();
  };
  every(2500, 6000, (svg) => { moment(svg, 'pal-blink', 180); if (Math.random() < 0.2) setTimeout(() => moment(svg, 'pal-blink', 180), 260); });
  every(9000, 16000, (svg) => moment(svg, 'pal-smile', 1800));
  every(11000, 18000, (svg) => moment(svg, 'pal-stretch', 2200));
  every(40000, 75000, (svg) => { if (kindsToday !== null && !reduceMotion() && !document.querySelector('dialog[open]')) say(svg.closest('.pal-wrap'), false); });
}

/** Remembers what its notes need, so it can speak up on its own too. Call on every draw. */
export function palContext(kinds) { kindsToday = kinds; }

// A note: which ones depend on how many kinds of routine you've done today: none yet (thanks +
// encouragement), one or two (encouragement + thanks), three or four (praise + thanks). The very
// first tap introduces it.
let lastQuote;
let hideT = 0;
function say(wrap, tapped, greeting = false) {
  if (!wrap) return;
  welcomed = true;
  const svg = wrap.querySelector('svg');
  moment(svg, 'pal-stretch', 2200);
  moment(svg, 'pal-smile', 1800);
  let msg;
  let met = true;
  try { met = !!localStorage.getItem('fibbies.pal-met'); if (tapped) localStorage.setItem('fibbies.pal-met', '1'); } catch { /* ignore */ }
  const key = 'fibbies.pal-last.' + getLang();
  try { lastQuote = localStorage.getItem(key) ?? lastQuote; } catch { /* storage can be blocked */ }
  if (!met && tapped) msg = t('knotIntro');
  else {
    // The welcome is always a calm thought. Later notes can also reflect today's routines.
    const tier = kindsToday === 0 ? 0 : kindsToday <= 2 ? 1 : 2;
    const notes = greeting || Math.random() < 0.4 ? t('palCalm') : t('knotNotes')[tier];
    const choices = notes.filter(line => line !== lastQuote);
    msg = choices[Math.floor(Math.random() * choices.length)];
  }
  lastQuote = msg;
  try { localStorage.setItem(key, msg); } catch { /* keep the in-page value */ }
  // Just the kind words (the XP is right beside it already); a quote's teacher goes on a line of its own.
  const [text, who] = msg.split(' — ');
  const note = wrap.querySelector('.pal-note');
  note.innerHTML = `<b>${esc(text)}</b>${who ? `<small>${esc(who)}</small>` : ''}`;
  note.classList.remove('show');
  void note.offsetWidth;
  note.classList.add('show');
  clearTimeout(hideT);
  hideT = setTimeout(() => note.classList.remove('show'), 4800);
}

/** A tap: it stretches, smiles and says something. */
export function palTap(wrap, kinds) {
  palContext(kinds);
  say(wrap, true);
}

export function palWelcome() {
  if (welcomed || document.hidden || document.querySelector('dialog[open]')) return;
  say(current()?.closest('.pal-wrap'), false, true);
}
