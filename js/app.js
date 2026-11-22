import { STRETCHES, CATEGORIES, FOCUS, ROUTINES, routineSeconds, buildTimeline, sideLabel, holdSecs } from './data.js';
import { Figure } from './figure.js';
import { unlockAudio, sfx, fx, voiceGuide, haptics } from './audio.js';
import { wakeLock } from './wakelock.js';
import { Session } from './session.js';
import { loadProfile, saveProfile, computeReward, applyReward, todaysCats, counts, levelProgress, fmtBig, QUESTS, dailyBonus } from './rewards.js';
import { fibbie, groups, parseKey, keyOf, countOf, mergeFibbies, discovered, MAX_STAGE, FIBBIES } from './fibbies.js';
import { FLEX_TESTS, WEEK_DAYS, loadFlex, saveFlex, scoreOf, levelOf, cleanAnswer, imbalances, daysSinceLast, fmtDay, flexChartSVG, chartPoints } from './flex.js';
import { critterSVG, chestSVG, esc, stars } from './critter.js';
import { playReward } from './reward-screen.js';
import { createFx } from './fx-canvas.js';
import { playMerge } from './merge-fx.js';
import { native, isNative } from './native.js';
import { t, LANGS, getLang, setLang, onLangChange, translateDom, numLocale } from './i18n.js';
import { readJSON, writeJSON, onSaveFail, requestPersistence, makeBackupCode, readBackupCode, replaceProgress, xpOf } from './storage.js';
import { localizeContent } from './localize.js';
import { setupInstallPrompt } from './install.js';

const $ = (s, r = document) => r.querySelector(s);
setupInstallPrompt();

// ---------- Storage ----------
// All reads and writes go through js/storage.js (unreadable data is rescued, failed writes reported).
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const readSettings = () => { const v = readJSON('limber.settings', {}); return isObj(v) ? v : {}; };
const settings = Object.assign({ voice: true, scale: 1, lang: getLang() }, readSettings());
// Sound cues and vibration are always on, and the look follows the phone (light/dark) in the app's
// own colour: these were settings once, so drop any saved choice.
for (const k of ['sound', 'haptics', 'mode', 'hue']) delete settings[k];
// Session history. Streaks are counted from it, so keep plenty: 3000 entries is years of use (~250 KB).
const HISTORY_MAX = 3000;
const readLog = () => { const v = readJSON('limber.history', []); return Array.isArray(v) ? v.filter((h) => h && typeof h.day === 'string') : []; };
let log = readLog();
const saveSettings = () => writeJSON('limber.settings', settings);

function applySettings() {
  voiceGuide.enabled = settings.voice;
  requestAnimationFrame(updateThemeColor);
}

const darkScheme = matchMedia('(prefers-color-scheme: dark)');
function updateThemeColor() {
  const theme = $(darkScheme.matches ? 'meta[name="theme-color"][media]' : 'meta[name="theme-color"]:not([media])');
  // Resolve the surface color to rgb for <meta name="theme-color">
  const view = $('.view.active');
  if (view && view.id === 'view-done') {
    theme.setAttribute('content', '#140e26');
    native.statusBar(true);
    return;
  }
  const opaque = (c) => c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c) && !/\/\s*0\)$/.test(c);
  let c = view ? getComputedStyle(view).backgroundColor : '';
  if (!opaque(c)) c = getComputedStyle(document.body).backgroundColor;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const x = cv.getContext('2d');
  x.fillStyle = '#000';
  x.fillStyle = c;
  x.fillRect(0, 0, 1, 1);
  const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
  theme.setAttribute('content', `rgb(${r},${g},${b})`);
  native.statusBar((r * 299 + g * 587 + b * 114) / 1000 < 128);
}
darkScheme.addEventListener?.('change', () => requestAnimationFrame(updateThemeColor));

// ---------- Helpers ----------
const catOf = (id) => CATEGORIES.find((c) => c.id === id);
const routineById = (id) => ROUTINES.find((r) => r.id === id);
/** "5 stretches", or "5 exercises" for a strength routine. */
const movesText = (r, n = r.items.length) => t(r.cat === 'strength' ? 'exercises' : 'stretches', { n });
const minutes = (r) => Math.max(1, Math.round(routineSeconds(r, settings.scale) / 60));
const fmtTime = (s) => {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
// A day runs until 2 AM: a late-night session still counts for that day's bonus and streak,
// and everything starts fresh after that.
const DAY_ENDS_AT = 2; // hours after midnight
const dayKey = (at = new Date()) => {
  const d = new Date(at.getTime() - DAY_ENDS_AT * 3600e3);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const firstStretch = (r) => STRETCHES[r.items[0][0]];
const heroStretch = (r) => STRETCHES[r.hero || r.items[0][0]];

function staticFig(stretch, t = 0.5, opts) {
  const f = new Figure(stretch, opts);
  f.draw(t, Math.PI * t);
  f.fit();
  return f.svg;
}

// Animated figures registry (single rAF loop)
const animated = new Set();
let lastFrame = performance.now();
function frame(ts) {
  const dt = Math.min(0.1, (ts - lastFrame) / 1000);
  lastFrame = ts;
  for (const a of animated) {
    if (!a.fig.svg.isConnected) { animated.delete(a); continue; }
    if (a.paused?.() || a.fig.svg.closest('.view:not(.active)')) continue;
    a.time += dt * (a.speed || 1);
    a.fig.animate(a.time);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
function animate(fig, opts = {}) {
  const a = { fig, time: opts.offset || 0, ...opts };
  animated.add(a);
  return a;
}

function streak() {
  const days = new Set(log.filter(counts).map((h) => h.day));
  let n = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function snackbar(msg) {
  const el = $('#snackbar');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(snackbar.t);
  snackbar.t = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------- Ripple ----------
document.addEventListener('pointerdown', (e) => {
  const host = e.target.closest('.ripple');
  if (!host) return;
  const r = host.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;
  const w = document.createElement('span');
  w.className = 'ripple-wave';
  w.style.width = w.style.height = `${size}px`;
  w.style.left = `${e.clientX - r.left - size / 2}px`;
  w.style.top = `${e.clientY - r.top - size / 2}px`;
  host.appendChild(w);
  setTimeout(() => w.remove(), 600);
});

// ---------- Views ----------
let currentView = null;
let pendingReload = false; // a new app version is waiting for a safe moment to load
// Nothing in progress that a reload would lose: a session, the chest show, or any open sheet or dialog.
const safeToReload = () => !session && !rewardPlayer && !document.querySelector('dialog[open]');
// Scroll position of each screen (by URL), so Back returns to where you were instead of the top.
// New screens opened by a tap still start at the top.
const scrollMemory = new Map();
let shownHash = null;
let backNav = false; // set while handling a Back (popstate) navigation
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
function show(name) {
  if (shownHash != null && currentView && currentView !== 'player') scrollMemory.set(shownHash, window.scrollY);
  const target = location.hash || '#/';
  const restoreTo = backNav ? scrollMemory.get(target) : target === shownHash ? window.scrollY : undefined;
  shownHash = target;
  const swap = () => {
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === name));
    currentView = name;
    if (restoreTo != null) window.scrollTo(0, restoreTo);
    else if (name !== 'player') window.scrollTo(0, 0);
    updateThemeColor();
  };
  if (document.startViewTransition && currentView && currentView !== name && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const vt = document.startViewTransition(swap);
    vt.ready?.catch(() => {});
    vt.finished?.catch(() => {});
    vt.updateCallbackDone?.catch(() => {});
  } else swap();
}

// ---------- Home ----------
// Filters start empty each time the app opens: each section then shows a few routines picked for
// today. Picking a filter shows its list; tapping it again goes back to today's picks.
let activeCat = null; // stretching filter
let activeFocus = null; // strength filter
const FEATURED = 3;
/** `n` routines from `list`, the same all day and different the next (a shuffle seeded by the day). */
function picksForToday(list, salt) {
  let h = 2166136261;
  for (const ch of dayKey() + salt) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, FEATURED);
}
const STRETCH_CATS = () => CATEGORIES.filter((c) => c.id !== 'strength');
const chipHTML = (key, id, on, icon, label) => `
    <button class="chip ripple" role="tab" aria-selected="${on}" data-${key}="${id}">
      <span aria-hidden="true" class="ms">${on ? 'check' : icon}</span>${esc(label)}
    </button>`;

let homeDay = null; // the day the home screen was drawn for
// Back after 2 AM (an app or sheet left open overnight): yesterday's bonus tiles, streak and picks go.
const refreshIfNewDay = () => { if (currentView === 'home' && homeDay !== dayKey() && !document.querySelector('dialog[open]')) renderHome(); };
function renderHome() {
  homeDay = dayKey();
  renderProgress();
  renderQuickStarts();
  renderCollection();
  renderFlexCard();

  // Two sections, each with its own filters: stretching by when, strength by body area.
  $('#chips').innerHTML = STRETCH_CATS().map((c) => chipHTML('cat', c.id, c.id === activeCat, c.icon, c.label)).join('');
  const sc = catOf('strength');
  $('#strength-title').textContent = sc.label;
  document.documentElement.style.setProperty('--picked', JSON.stringify(t('pickedToday')));
  $('#chips-strength').setAttribute('aria-label', sc.label);
  $('#chips-strength').innerHTML = FOCUS.map((f) => chipHTML('focus', f.id, f.id === activeFocus, f.icon, t(`focus.${f.id}`))).join('');

  renderList();
}

/** Days with a session this week (Monday first). */
function daysThisWeek() {
  const days = new Set(log.filter(counts).map((x) => x.day));
  const monday = new Date(Date.now() - DAY_ENDS_AT * 3600e3); // today, by the 2 AM rule
  monday.setHours(12, 0, 0, 0); // noon + the shift in dayKey() stays on the same date
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (days.has(dayKey(d))) n++;
  }
  return n;
}

// One tap to start: the Top 5 routine of each kind (the same kinds as today's bonus tiles).
function renderQuickStarts() {
  const box = $('#quick-starts');
  box.innerHTML = '';
  for (const q of QUESTS) {
    const r = ROUTINES.find((x) => x.cat === q.cat && x.top);
    if (!r) continue;
    const b = document.createElement('button');
    b.className = 'qs ripple';
    b.dataset.hue = '';
    b.style.setProperty('--h', r.hue);
    b.dataset.play = r.id;
    b.setAttribute('aria-label', `${t('start')}: ${r.title}, ${minutes(r)} min`);
    b.innerHTML = `
      <span class="qs-text"><b>${esc(catOf(r.cat).label)}</b><small>${minutes(r)} min</small></span>
      <span class="qs-play" aria-hidden="true"><span class="ms filled">play_arrow</span></span>
      <span class="qs-fig" aria-hidden="true"></span>`;
    b.querySelector('.qs-fig').appendChild(staticFig(heroStretch(r), 0.55));
    box.appendChild(b);
  }
}

function renderProgress() {
  const p = loadProfile();
  const lp = levelProgress(p.xp);
  const done = todaysCats(log, dayKey());
  const order = [...done].filter((c) => QUESTS.some((q) => q.cat === c)); // in the order they were done today
  const st = streak();
  const streakPill = st ? `<span class="pc-streak" role="img" aria-label="${esc(`${t('days', { n: st })}, ${t('thisWeek', { n: daysThisWeek() })}`)}"><span aria-hidden="true" class="ms filled">local_fire_department</span>${st}</span>` : '';
  $('#progress-card').innerHTML = `
    <div class="pc-top">
      <img class="pc-icon" src="icons/icon.svg" width="52" height="52" alt="">
      <div class="pc-main">
        <div class="pc-head"><b>${t('level', { n: lp.level })}</b>${streakPill}
          <button class="icon-btn ripple" id="btn-settings" aria-label="${esc(t('settings'))}"><span aria-hidden="true" class="ms">tune</span></button></div>
        <div class="pc-line"><small>${t('fibersStretched', { x: fmtBig(p.fibers) })}</small></div>
        <div class="pc-bar"><i style="width:${(lp.frac * 100).toFixed(1)}%"></i></div>
        <div class="pc-line" style="margin-top:4px"><small>${fmtBig(lp.into)} / ${fmtBig(lp.need)} XP</small></div>
      </div>
    </div>
    <div class="quests" style="--n:${QUESTS.length}" role="group" aria-label="${esc(`${t('todayBonus')} ×${fmtX(dailyBonus(done))}${order.length ? `: ${order.map((c) => catOf(c).label).join(', ')}` : ''}`)}">
      ${QUESTS.map((q) => questTile(q, celebrating(done, q.cat) ? 0 : order.indexOf(q.cat) + 1)).join('')}
    </div>`;
  celebrateBonus(done);
}

/** A bonus tile. `lv` = its place in today's order (0 = not done yet). The day builds up: the 1st
 *  lights up plainly, the 2nd already shines, the 3rd turns gold, the 4th gets the full show. */
function questTile(q, lv) {
  const sparks = lv >= 3 ? '<i class="q-spark" aria-hidden="true"></i>'.repeat(lv === 4 ? 5 : 3) : '';
  return `<button class="quest ripple${lv ? ` done lv${lv}` : ''}" data-cat="${q.cat}" data-lv="${lv}" aria-label="${esc(lv ? `${catOf(q.cat).label}, ${t('doneToday')}` : catOf(q.cat).label)}"><span aria-hidden="true" class="ms ${lv ? 'filled' : ''}">${lv ? 'check_circle' : q.icon}</span><span aria-hidden="true">${esc(t(`q.${q.cat}`))}</span>${sparks}</button>`;
}

// The daily bonus grows with each kind of routine done today. When it has grown since the home
// screen was last seen, the number counts up and the new tile lights up: a small, happy moment.
let xFmt = null;
const fmtX = (x) => (xFmt ||= new Intl.NumberFormat(numLocale(), { maximumFractionDigits: 2 })).format(x);
onLangChange(() => { xFmt = null; });
const BONUS_SEEN = 'fibbies.bonus-seen';
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Categories already celebrated today. */
function bonusSeen() {
  const v = readJSON(BONUS_SEEN, null);
  return new Set(v && v.day === dayKey() && Array.isArray(v.cats) ? v.cats : []);
}
const freshCats = (done, seen) => [...done].filter((c) => !seen.has(c) && QUESTS.some((q) => q.cat === c));
/** True while a tile done since the home screen was last seen waits to light up in front of you. */
const celebrating = (done, cat) => !reduceMotion() && freshCats(done, bonusSeen()).includes(cat);
let bonusTimer = 0;
function celebrateBonus(done) {
  clearTimeout(bonusTimer); // the card was redrawn: only the latest one celebrates
  const day = dayKey();
  // Wait until the home screen is actually on screen, so the moment isn't spent unseen.
  bonusTimer = setTimeout(() => {
    if (currentView !== 'home') return; // the next home screen draws (and celebrates) again
    if (document.hidden) { document.addEventListener('visibilitychange', () => celebrateBonus(todaysCats(log, dayKey())), { once: true }); return; }
    const seen = bonusSeen();
    const fresh = freshCats(done, seen);
    if (!fresh.length) return;
    writeJSON(BONUS_SEEN, { day, cats: [...done] });
    if (reduceMotion()) return;
    const order = [...done].filter((c) => QUESTS.some((q) => q.cat === c));
    const box = $('.quests');
    if (!box) return;
    for (const c of fresh) {
      const old = box.querySelector(`.quest[data-cat="${c}"]`);
      if (!old) continue;
      const lv = order.indexOf(c) + 1;
      const tmp = document.createElement('div');
      tmp.innerHTML = questTile(QUESTS.find((q) => q.cat === c), lv);
      const tile = tmp.firstElementChild;
      old.replaceWith(tile);
      // It pops in a little bigger the higher it is, and throws out a ring of sparks.
      tile.animate([{ transform: 'scale(.82)', filter: 'brightness(1.8)' }, { transform: `scale(${1.04 + lv * 0.03})`, filter: 'brightness(1.25)', offset: 0.45 }, { transform: 'scale(1)', filter: 'none' }], { duration: 650 + lv * 80, easing: 'ease-out' });
      const cx = tile.offsetLeft + tile.offsetWidth / 2, cy = tile.offsetTop + tile.offsetHeight / 2;
      const n = 4 + lv * 3;
      for (let i = 0; i < n; i++) {
        const sp = document.createElement('i');
        sp.className = `bonus-spark${lv >= 3 ? ' gold' : ''}`;
        sp.style.left = `${cx}px`; sp.style.top = `${cy}px`;
        sp.style.setProperty('--a', `${(360 / n) * i + Math.random() * 20}deg`);
        sp.style.setProperty('--d', `${30 + lv * 9 + Math.random() * 10}px`);
        sp.style.animationDelay = `${120 + i * 18}ms`;
        box.appendChild(sp);
        setTimeout(() => sp.remove(), 1600);
      }
    }
    haptics.buzz(20);
  }, 450);
}

function renderCollection() {
  const p = loadProfile();
  const gs = groups(p);
  const items = gs.map((g) => `
    <button class="col-item owned${g.canMerge ? ' can-merge' : ''}" data-fib="${esc(g.key)}">
      ${g.count > 1 ? `<span class="col-count">×${g.count}</span>` : ''}
      <span class="col-spin">${critterSVG(g.fib)}</span><span class="col-name">${esc(g.fib.name)}</span>${stars(g.fib.stage)}
    </button>`).join('');
  $('#collection').innerHTML = `
    <div class="col-head"><h2>${t('fibbieFriends')}</h2>
      <button class="col-album ripple" id="btn-album"><span aria-hidden="true" class="ms">auto_stories</span>${t('discovered', { n: discovered(p) })}<span aria-hidden="true" class="ms">chevron_right</span></button></div>
    ${gs.length ? `<div class="col-row">${items}</div>` : `<div class="col-empty">${critterSVG(null, { locked: true })}<span>${t('moreToFind')}</span></div>`}`;
}

// Every 25-50 s, one Fibbie friend on the home screen rolls a 360: just one at a time, only while
// the home screen is in view, and never with reduced motion. Merge-ready ones keep their ring still.
(function twirlSomeone() {
  setTimeout(() => {
    if (currentView === 'home' && !document.hidden && !reduceMotion()) {
      // The roll is on a wrapper, so the critter's own bobbing is never restarted (that made it jump).
      const all = [...document.querySelectorAll('.col-item.owned:not(.can-merge) .col-spin')];
      const c = all[Math.floor(Math.random() * all.length)];
      if (c) {
        c.classList.add('twirl');
        c.addEventListener('animationend', (e) => { if (e.animationName === 'col-twirl') c.classList.remove('twirl'); }, { once: true }); // bob never ends, so this is the roll
      }
    }
    twirlSomeone();
  }, 25000 + Math.random() * 25000);
})();

// ---------- Fibbie sheet: details + merging ----------
const fibSheet = $('#sheet-fib');
let fibKey = null;
let merging = false;
function openFib(key) {
  fibKey = key;
  renderFib();
  if (!fibSheet.open) { fibSheet.showModal(); hopLater(1200 + Math.random() * 1300); }
}
function renderFib(born = false) {
  const p = loadProfile();
  const { sp, stage } = parseKey(fibKey);
  const f = fibbie(sp, stage);
  const n = countOf(p, fibKey);
  const next = stage < MAX_STAGE ? fibbie(sp, stage + 1) : null;
  const knowNext = next && p.dex[next.key];
  $('#fib-body').innerHTML = `
    <div class="fs-stage" data-glow="${f.glow}"><div class="fs-critter${born ? ' born' : ''}">${critterSVG(f)}</div><div class="fs-fx" aria-hidden="true"></div></div>
    <h2 class="fs-name">${esc(f.name)}</h2>
    <div class="fs-chips"><span class="rar-chip" data-r="${f.rarity}">${t('rarity')[f.rarity]}</span>${stars(stage)}</div>
    <p class="fs-blurb">${esc(f.blurb)}</p>
    ${next ? `<div class="fs-evo">
      <div class="fs-mini">${critterSVG(f)}<b>×2</b></div><span aria-hidden="true" class="ms">arrow_forward</span>
      <div class="fs-mini">${critterSVG(next, { className: knowNext ? '' : 'sil' })}<b>${knowNext ? esc(next.name) : '?'}</b></div>
    </div>` : ''}
    <div class="fs-owned">${t('owned', { n })}</div>
    ${next ? `<button class="btn filled ripple fs-merge" id="fs-merge" ${n >= 2 ? '' : 'disabled'}><span aria-hidden="true" class="ms filled">auto_awesome</span>${n >= 2 ? t('merge') : t('needOne')}</button>`
    : `<div class="fs-max"><span aria-hidden="true" class="ms filled">workspace_premium</span>${t('maxEvo')}</div>`}`;
  const mb = $('#fs-merge');
  if (mb) mb.onclick = doMerge;
}
async function doMerge() {
  if (merging) return;
  const key = fibKey;
  const { sp, stage } = parseKey(key);
  if (countOf(loadProfile(), key) < 2 || stage >= MAX_STAGE) return;
  merging = true;
  try {
    await runMerge(key, sp, stage);
  } finally {
    merging = false;
  }
}
async function runMerge(key, sp, stage) {
  unlockAudio();
  const f = fibbie(sp, stage);
  $('#fs-merge').disabled = true;
  // Save first, so closing the app mid-show never loses the evolution.
  const p = loadProfile();
  const res = mergeFibbies(p, key);
  if (!res) { renderFib(); return; }
  saveProfile(p);
  fibKey = res.key;
  const nf = fibbie(sp, stage + 1);
  await playMerge($('#merge-fx'), f, nf);
  renderFib(true);
  const fxl = $('#fib-body .fs-fx');
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('i');
    const ang = (i / 22) * Math.PI * 2;
    const d = 70 + Math.random() * 50;
    el.style.setProperty('--tx', `${Math.cos(ang) * d}px`);
    el.style.setProperty('--ty', `${Math.sin(ang) * d}px`);
    el.style.background = `oklch(0.85 0.17 ${Math.floor(Math.random() * 360)})`;
    fxl.appendChild(el);
  }
  if (albumSheet.open) renderAlbum();
  if (currentView === 'home') { renderCollection(); renderProgress(); }
}
$('#fib-close').onclick = () => { if (!merging) fibSheet.close(); };
// While a Fibbie's sheet is open it jumps now and then: soon after opening, then every 6-12 s.
let hopTimer = 0;
function hopLater(ms) {
  clearTimeout(hopTimer);
  hopTimer = setTimeout(() => {
    if (!fibSheet.open) return;
    const c = $('#fib-body .fs-critter');
    if (c && !merging && !document.hidden && !reduceMotion()) {
      c.classList.add('hop');
      // (the critter's own "born" pop also ends here, bubbling up, so wait for the hop itself)
      c.addEventListener('animationend', function done(e) { if (e.animationName === 'fs-hop') { c.classList.remove('hop'); c.removeEventListener('animationend', done); } });
    }
    hopLater(6000 + Math.random() * 6000);
  }, ms);
}
fibSheet.addEventListener('close', () => clearTimeout(hopTimer));
fibSheet.addEventListener('cancel', (e) => { if (merging) e.preventDefault(); });

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-fib]');
  if (b) openFib(b.dataset.fib);
});

// ---------- Fibbie album ----------
// Every species you have discovered, plus shadows of the 12 originals still out there.
const albumSheet = $('#sheet-album');
function albumCell(sp, stages) {
  const best = stages.length ? Math.max(...stages) : 0;
  const f = fibbie(sp, best || 1);
  const pips = Array.from({ length: MAX_STAGE }, (_, i) => `<i class="${stages.includes(i + 1) ? 'on' : ''}"></i>`).join('');
  return best
    ? `<button class="al-cell ripple" data-fib="${esc(keyOf(sp, best))}">${critterSVG(f)}<span class="al-name">${esc(f.name)}</span><span class="al-pips" aria-label="${esc(t('stageN', { n: best }))}">${pips}</span></button>`
    : `<div class="al-cell unknown">${critterSVG(f, { className: 'sil' })}<span class="al-name">???</span><span class="al-pips">${pips}</span></div>`;
}
function renderAlbum() {
  const p = loadProfile();
  const found = new Map(); // sp -> { stages, first }
  for (const [k, at] of Object.entries(p.dex || {})) {
    const { sp, stage } = parseKey(k);
    const e = found.get(sp) || { stages: [], first: Infinity };
    e.stages.push(stage);
    e.first = Math.min(e.first, Number(at) || 0);
    found.set(sp, e);
  }
  const classicIds = new Set(FIBBIES.map((f) => f.id));
  const originals = FIBBIES.map((f) => albumCell(f.id, found.get(f.id)?.stages || []));
  const nOrig = FIBBIES.filter((f) => found.has(f.id)).length;
  const wild = [...found].filter(([sp]) => !classicIds.has(sp)).sort((a, b) => a[1].first - b[1].first);
  $('#album-body').innerHTML = `
    <p class="al-hint">${t('albumHint')}</p>
    <div class="al-sub">${t('albumEvos', { n: Object.keys(p.dex || {}).length })}</div>
    <h3 class="al-head">${t('albumOriginals', { n: nOrig, of: FIBBIES.length })}</h3>
    <div class="al-grid">${originals.join('')}</div>
    <h3 class="al-head">${t('albumWild', { n: wild.length })}</h3>
    ${wild.length ? `<div class="al-grid">${wild.map(([sp, e]) => albumCell(sp, e.stages)).join('')}</div>` : ''}
    <div class="al-empty">${critterSVG(null, { locked: true })}<span>${t('albumWildEmpty')}</span></div>`;
}
function openAlbum() {
  renderAlbum();
  albumSheet.showModal();
  albumSheet.scrollTop = 0;
}
$('#album-close').onclick = () => albumSheet.close();
document.addEventListener('click', (e) => { if (e.target.closest('#btn-album')) openAlbum(); });
// Merging inside the details sheet changes what the album shows.
fibSheet.addEventListener('close', () => { if (albumSheet.open) renderAlbum(); });

// ---------- Weekly flexibility check ----------
const flexSheet = $('#sheet-flex');
let flexPick = {}; // test id -> level, or [left, right] (either may still be null) for two-sided tests
const answered = (x) => (x.side ? Array.isArray(flexPick[x.id]) && flexPick[x.id].every((v) => v != null) : flexPick[x.id] != null);
let flexNote = null;
function renderFlexCard() {
  const list = loadFlex();
  const since = daysSinceLast(list, dayKey());
  const due = since == null || since >= WEEK_DAYS;
  const last = list[list.length - 1];
  const sub = since == null ? t('flexFirst') : due ? t('flexDue') : t('flexNext', { n: WEEK_DAYS - since });
  $('#flex-card').classList.toggle('due', due);
  $('#flex-card').innerHTML = `
    <span class="fx-icon"><span aria-hidden="true" class="ms filled">accessibility_new</span></span>
    <span class="fx-text"><b>${t('flexTitle')}</b><small>${esc(sub)}</small></span>
    ${last ? `<span class="fx-score"><b>${scoreOf(last)}</b>${list.length > 1 ? flexChartSVG(list, { w: 96, h: 40, mini: true }) : ''}</span>` : ''}
    <span aria-hidden="true" class="ms fx-go">chevron_right</span>`;
  $('#flex-card').setAttribute('aria-label', `${t('flexTitle')}. ${sub} ${due ? t('flexStart') : t('flexView')}`);
}
function renderFlex() {
  const list = loadFlex();
  const pts = chartPoints(list);
  const first = list[0];
  const last = list[list.length - 1];
  const fmtLv = (n) => (Number.isInteger(n) ? String(n) : n.toLocaleString(numLocale(), { maximumFractionDigits: 1 }));
  const rows = FLEX_TESTS.map((x) => {
    const T = t('flexTests')[x.id];
    const pick = flexPick[x.id];
    let opts;
    if (x.side) {
      // Two-sided tests: one row per level, with a left and a right choice.
      const sides = [t('flexLeft'), t('flexRight')];
      opts = `<div class="fo2-head"><span></span><b>${esc(sides[0])}</b><b>${esc(sides[1])}</b></div>` + T.levels.map((lab, i) => `
        <div class="fo2"><span class="fo2-lab">${esc(lab)}</span>${[0, 1].map((s) => `<button class="fs ripple" data-t="${x.id}" data-s="${s}" data-v="${i}" aria-pressed="${!!pick && pick[s] === i}" aria-label="${esc(`${sides[s]}: ${lab}`)}">${i}</button>`).join('')}</div>`).join('');
    } else {
      opts = T.levels.map((lab, i) => `<button class="fo ripple" role="radio" data-t="${x.id}" data-v="${i}" aria-checked="${pick === i}"><i>${i}</i>${esc(lab)}</button>`).join('');
    }
    const delta = first && last && list.length > 1 ? levelOf(last, x) - levelOf(first, x) : 0;
    const lastV = last && last.r[x.id];
    const prevText = !last ? '' : x.side ? `${t('flexLeft')} ${lastV[0]} · ${t('flexRight')} ${lastV[1]}` : T.levels[lastV];
    const prev = last ? `<span class="ft-prev">${esc(prevText)}${delta > 0 ? ` <b class="up">▲${fmtLv(delta)}</b>` : ''}</span>` : '';
    return `<section class="ft" data-t="${x.id}">
      <div class="ft-head"><div class="ft-fig"></div><div><h3>${esc(T.name)}</h3>${prev}</div></div>
      <p class="ft-how">${esc(T.how)}</p>
      <div class="ft-opts${x.side ? ' two' : ''}" role="${x.side ? 'group' : 'radiogroup'}" aria-label="${esc(T.name)}">${opts}</div>
    </section>`;
  }).join('');
  const done = FLEX_TESTS.every(answered);
  const tight = last ? imbalances(last).map(({ test, side }) => t(side === 'L' ? 'flexTightL' : 'flexTightR', { test: t('flexTests')[test.id].name })) : [];
  const since = first && list.length > 1 ? scoreOf(last) - scoreOf(first) : null;
  $('#flex-body').innerHTML = `
    ${flexNote ? `<div class="flex-note"><span aria-hidden="true" class="ms filled">check_circle</span>${esc(flexNote)}</div>` : ''}
    ${list.length ? `<div class="flex-chart-box">
      <div class="fcb-head"><b>${t('flexScore')}</b>${since != null ? `<small>${esc(t('flexSince', { n: since }))}</small>` : ''}</div>
      ${flexChartSVG(list)}
      <div class="fcb-read" id="flex-read">${esc(list.length > 1 ? t('flexTapPoint') : t('flexOnePoint'))}</div>
      ${tight.map((s) => `<div class="flex-tight"><span aria-hidden="true" class="ms">balance</span><span>${esc(s)}</span></div>`).join('')}
    </div>` : ''}
    <p class="flex-intro">${t('flexIntro')}</p>
    ${rows}
    <button class="btn filled ripple flex-save" id="flex-save" ${done ? '' : 'aria-disabled="true"'}><span aria-hidden="true" class="ms filled">save</span>${t('flexSave')}</button>
    <p class="flex-need" id="flex-need" hidden>${t('flexPickAll')}</p>`;
  for (const x of FLEX_TESTS) {
    const box = $(`#flex-body .ft[data-t="${x.id}"] .ft-fig`);
    const f = new Figure(STRETCHES[x.fig]);
    f.fit();
    box.appendChild(f.svg);
    animate(f, { paused: () => !flexSheet.open }); // a closed dialog stays in the DOM
  }
  $('#flex-body .flex-chart:not(.mini)')?.addEventListener('click', (e) => {
    const hit = e.target.closest('.fc-hit');
    if (!hit) return;
    const p = pts[Number(hit.dataset.i)];
    $('#flex-read').textContent = `${fmtDay(p.day, { day: 'numeric', month: 'long', year: 'numeric' })}: ${scoreOf(p)} / 100`;
  });
}
function openFlex() {
  const list = loadFlex();
  const today = list.find((e) => e.day === dayKey());
  flexPick = today ? Object.fromEntries(Object.entries(today.r).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])) : {};
  flexNote = null;
  renderFlex();
  flexSheet.showModal();
  flexSheet.scrollTop = 0;
}
$('#flex-card').onclick = openFlex;
$('#flex-close').onclick = () => flexSheet.close();
$('#flex-body').addEventListener('click', (e) => {
  const o = e.target.closest('.fo, .fs');
  if (o) {
    const id = o.dataset.t, v = Number(o.dataset.v);
    if (o.classList.contains('fs')) {
      const s = Number(o.dataset.s);
      const cur = Array.isArray(flexPick[id]) ? flexPick[id] : [null, null];
      cur[s] = v;
      flexPick[id] = cur;
      o.closest('.ft-opts').querySelectorAll(`.fs[data-s="${s}"]`).forEach((b) => b.setAttribute('aria-pressed', b === o));
    } else {
      flexPick[id] = v;
      o.parentElement.querySelectorAll('.fo').forEach((b) => b.setAttribute('aria-checked', b === o));
    }
    if (FLEX_TESTS.every(answered)) { $('#flex-save').removeAttribute('aria-disabled'); $('#flex-need').hidden = true; }
    haptics.buzz(10);
    return;
  }
  if (e.target.closest('#flex-save')) {
    if (!FLEX_TESTS.every(answered)) {
      $('#flex-need').hidden = false;
      const miss = FLEX_TESTS.find((x) => !answered(x));
      $(`#flex-body .ft[data-t="${miss.id}"]`).scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const r = Object.fromEntries(FLEX_TESTS.map((x) => [x.id, cleanAnswer(x, flexPick[x.id])]));
    saveFlex(dayKey(), r);
    flexNote = t('flexSaved');
    unlockAudio();
    sfx.go?.();
    haptics.buzz([20, 40, 20]);
    renderFlex();
    flexSheet.scrollTo({ top: 0, behavior: 'smooth' });
    renderFlexCard();
  }
});

function routineCard(r) {
  const b = document.createElement('button');
  b.className = 'routine-card ripple';
  b.dataset.hue = '';
  b.style.setProperty('--h', r.hue);
  b.dataset.open = r.id;
  const tag = r.top ? '<span class="top-badge"><span aria-hidden="true" class="ms filled">workspace_premium</span>Top 5</span>'
    : `<span class="rc-cat">${esc(r.focus ? t(`focus.${r.focus}`) : catOf(r.cat).label)}</span>`;
  b.innerHTML = `
    <div class="rc-thumb"></div>
    <div>
      <div class="rc-title">${esc(r.title)}</div>
      <div class="rc-meta">${tag} <span class="rc-n">${movesText(r)}</span></div>
    </div>
    <div class="rc-dur">${minutes(r)}<small>min</small></div>`;
  b.querySelector('.rc-thumb').appendChild(staticFig(heroStretch(r), 0.6));
  return b;
}
function renderList() {
  // The Top 5s already have their quick starts above, so today's picks come from the rest.
  const stretching = ROUTINES.filter((r) => r.cat !== 'strength');
  const strength = ROUTINES.filter((r) => r.cat === 'strength');
  // Today's picks favour kinds that still give a chest today (not Quick, not done yet).
  const doneToday = todaysCats(log, dayKey());
  const fresh = stretching.filter((r) => !r.top && QUESTS.some((q) => q.cat === r.cat) && !doneToday.has(r.cat));
  const pool = fresh.length >= FEATURED ? fresh : stretching.filter((r) => !r.top && r.cat !== 'quick');
  const s1 = activeCat ? stretching.filter((r) => activeCat === 'all' || r.cat === activeCat) : picksForToday(pool, 'stretch');
  const s2 = activeFocus ? strength.filter((r) => activeFocus === 'all' || r.focus === activeFocus) : picksForToday(strength.filter((r) => !r.top), 'strength');
  $('#routine-list').replaceChildren(...s1.map(routineCard));
  $('#routine-list-strength').replaceChildren(...s2.map(routineCard));
  $('#routine-list').dataset.featured = String(!activeCat);
  $('#routine-list-strength').dataset.featured = String(!activeFocus);
}

function markChips(box, key, value, iconOf) {
  box.querySelectorAll('.chip').forEach((ch) => {
    const on = ch.dataset[key] === value;
    ch.setAttribute('aria-selected', on);
    ch.querySelector('.ms').textContent = on ? 'check' : iconOf(ch.dataset[key]);
  });
}
function setCat(cat) {
  activeCat = cat;
  markChips($('#chips'), 'cat', activeCat, (id) => catOf(id).icon);
  renderList();
}
function setFocus(focus) {
  activeFocus = focus;
  markChips($('#chips-strength'), 'focus', activeFocus, (id) => FOCUS.find((f) => f.id === id).icon);
  renderList();
}
$('#chips').addEventListener('click', (e) => {
  const c = e.target.closest('[data-cat]');
  if (c) setCat(c.dataset.cat === activeCat ? null : c.dataset.cat); // a second tap: back to today's picks
});
$('#chips-strength').addEventListener('click', (e) => {
  const c = e.target.closest('[data-focus]');
  if (c) setFocus(c.dataset.focus === activeFocus ? null : c.dataset.focus);
});
// A bonus tile takes you down to that kind of routine, already filtered.
$('#progress-card').addEventListener('click', (e) => {
  const q = e.target.closest('.quest[data-cat]');
  if (!q) return;
  const strength = q.dataset.cat === 'strength';
  if (strength) setFocus('all'); else setCat(q.dataset.cat);
  const chips = strength ? $('#strength-title') : $('#stretching-title');
  const smooth = reduceMotion() ? 'auto' : 'smooth';
  chips.scrollIntoView({ behavior: smooth, block: 'start' });
  const row = strength ? $('#chips-strength') : $('#chips');
  const chip = row.querySelector('[aria-selected="true"]');
  if (chip) row.scrollLeft = chip.offsetLeft - 16;
});

document.addEventListener('click', (e) => {
  const pl = e.target.closest('[data-play]');
  if (pl) { startRoutine(pl.dataset.play); return; }
  const o = e.target.closest('[data-open]');
  if (o) go(`#/r/${o.dataset.open}`);
});

// ---------- Detail ----------
function renderDetail(r) {
  const v = $('#view-detail');
  const { moves } = buildTimeline(r, settings.scale);
  const total = routineSeconds(r, settings.scale);
  v.dataset.hue = '';
  v.style.setProperty('--h', r.hue);
  v.innerHTML = `
    <div class="detail-top">
      <button class="icon-btn ripple" id="dt-back" aria-label="${t('back')}"><span aria-hidden="true" class="ms">arrow_back</span></button>
      <button class="icon-btn ripple" id="dt-settings" aria-label="${t('settings')}"><span aria-hidden="true" class="ms">tune</span></button>
    </div>
    <div class="detail-hero">
      <div class="kicker"><span aria-hidden="true" class="ms filled">${r.icon}</span>${catOf(r.cat).label}</div>
      <h1>${esc(r.title)}</h1>
      <p>${esc(r.blurb)}</p>
      <div class="detail-stats">
        <span class="stat-pill"><span aria-hidden="true" class="ms">schedule</span>${fmtTime(total)}</span>
        <span class="stat-pill"><span aria-hidden="true" class="ms">format_list_bulleted</span>${movesText(r)}</span>
        ${moves.some((m) => m.side) ? `<span class="stat-pill"><span aria-hidden="true" class="ms">swap_horiz</span>${t('bothSides')}</span>` : ''}
        ${settings.scale === 'flex' ? `<span class="stat-pill"><span aria-hidden="true" class="ms">self_improvement</span>${t('flexHolds')}</span>` : ''}
      </div>
      <div class="detail-fig"></div>
    </div>
    <div class="detail-tip"><span aria-hidden="true" class="ms">volume_up</span><span>${t('soundTip')}</span></div>
    <div class="move-list"><h3>${t('whatYoullDo')}</h3></div>
    <div class="start-bar">
      <button class="fab-ext ripple" id="dt-start"><span aria-hidden="true" class="ms filled">play_arrow</span>${t('startMin', { m: minutes(r) })}</button>
    </div>`;
  const df = new Figure(firstStretch(r));
  v.querySelector('.detail-fig').appendChild(df.svg);
  animate(df);
  const ml = v.querySelector('.move-list');
  for (const [id, secs] of r.items) {
    const s = STRETCHES[id];
    const d = holdSecs(s, secs, settings.scale, r.cat === 'strength');
    const row = document.createElement('div');
    row.className = 'move-row';
    row.innerHTML = `
      <div class="mr-thumb"></div>
      <div><div class="mr-name">${esc(s.name)}</div><div class="mr-target">${esc(s.target)}</div></div>
      <div class="mr-time">${d}${t('sec')}<small>${t(s.sided ? 'eachSide' : s.dynamic ? 'moving' : 'holdShort')}</small></div>`;
    row.querySelector('.mr-thumb').appendChild(staticFig(s, 0.5));
    ml.appendChild(row);
  }
  $('#dt-back').onclick = () => back();
  $('#dt-settings').onclick = openSettings;
  $('#dt-start').onclick = () => startRoutine(r.id);
}

// ---------- Player ----------
let session = null;
let stageFig = null;
let stageAnim = null;
let nextFig = null;
const RING = 2 * Math.PI * 52;

function startRoutine(id) {
  unlockAudio();
  wakeLock.on();
  pendingStart = id;
  go(`#/play/${id}`);
}
let pendingStart = null;

function openPlayer(r) {
  session?.destroy();
  const pl = $('#player');
  $('#pl-routine').textContent = r.title;
  pl.dataset.hue = '';
  pl.style.setProperty('--h', r.hue);
  session = new Session(r, {
    scale: settings.scale,
    onStep: renderStep,
    onTick: renderTick,
    onDone: finish,
  });
  // segments: one per hold
  $('#pl-segments').innerHTML = session.moves.map(() => '<div class="seg"><i></i></div>').join('');
  if (!stageFig) {
    stageFig = new Figure(STRETCHES.stand);
    $('#pl-fig').appendChild(stageFig.svg);
    stageAnim = animate(stageFig, { paused: () => !session || session.paused });
  }
  wakeLock.on();
  session.start();
  setPausedUI(false);
}

function renderStep(s) {
  const st = s.step;
  const pl = $('#player');
  pl.dataset.kind = st.kind;
  const move = st.kind === 'hold' ? st.move : st.next;
  const stretch = move.stretch;
  stageFig.set(stretch, move.side === 'R');
  stageAnim.time = 0;
  const badge = $('#pl-badge');
  if (st.kind === 'prep') badge.textContent = t('getReady');
  else if (st.kind === 'rest') badge.textContent = t(st.switchSides ? 'switchSides' : 'upNext');
  else badge.textContent = t(stretch.dynamic ? 'keepMoving' : 'hold');
  const side = $('#pl-side');
  if (move.side) {
    side.hidden = false;
    side.innerHTML = `<span aria-hidden="true" class="ms">${move.side === 'L' ? 'west' : 'east'}</span>${sideLabel(move)}`;
  } else side.hidden = true;
  $('#pl-target').textContent = st.kind === 'hold' ? stretch.target : t(st.kind === 'prep' ? 'firstUp' : st.switchSides ? 'otherSide' : 'nextUp');
  $('#pl-name').textContent = stretch.name;
  $('#pl-cue').textContent = stretch.cues[0];

  // up next card
  let nextMove = null;
  for (let k = s.i + 1; k < s.steps.length; k++) {
    const x = s.steps[k];
    if (x.kind === 'hold' && x.move !== move) { nextMove = x.move; break; }
  }
  const un = $('#pl-upnext');
  if (st.kind === 'hold' && nextMove) {
    un.innerHTML = `<div class="un-thumb"></div><span>${t('nextLabel')} <b>${esc(nextMove.stretch.name)}</b>${nextMove.side ? ' · ' + sideLabel(nextMove) : ''}</span><span class="un-time">${nextMove.secs}${t('sec')}</span>`;
    nextFig = staticFig(nextMove.stretch, 0.5, { mirror: nextMove.side === 'R' });
    un.querySelector('.un-thumb').appendChild(nextFig);
  } else if (st.kind === 'hold') {
    un.innerHTML = '<span aria-hidden="true" class="ms filled" style="color:var(--primary);margin-left:8px">flag</span><span>' + t('lastOne') + '</span>';
  } else {
    un.innerHTML = `<span aria-hidden="true" class="ms" style="margin-left:8px">timer</span><span>${esc(move.stretch.target)}</span><span class="un-time">${move.secs}${t('sec')}</span>`;
  }
  // segments
  const segs = $('#pl-segments').children;
  const curIdx = st.kind === 'hold' ? st.index : s.moves.indexOf(st.next);
  for (let k = 0; k < segs.length; k++) {
    segs[k].classList.toggle('done', k < curIdx);
    if (k >= curIdx) segs[k].firstChild.style.width = '0';
  }
  renderTick(s);
}

function renderTick(s) {
  const st = s.step;
  const rem = s.remaining();
  $('#pl-time').textContent = fmtTime(rem);
  const frac = st.secs ? rem / st.secs : 0;
  $('#pl-ring').style.strokeDashoffset = String(RING * (1 - frac));
  $('#pl-time').parentElement.classList.toggle('warn', rem <= 3.05 && rem > 0 && !s.paused);
  if (st.kind === 'hold') {
    const seg = $('#pl-segments').children[st.index];
    if (seg) seg.firstChild.style.width = `${(1 - frac) * 100}%`;
    // rotate cues
    const cues = st.move.stretch.cues;
    const ci = Math.min(cues.length - 1, Math.floor(((1 - frac) * cues.length)));
    const cueEl = $('#pl-cue');
    if (cueEl.textContent !== cues[ci]) cueEl.textContent = cues[ci];
  }
}

function setPausedUI(p) {
  $('#player').classList.toggle('paused', p);
  $('#pl-play-icon').textContent = p ? 'play_arrow' : 'pause';
  $('#pl-play').setAttribute('aria-label', t(p ? 'resume' : 'pause'));
}

$('#pl-play').onclick = () => {
  if (!session || session.finished) return;
  unlockAudio();
  session.toggle();
  setPausedUI(session.paused);
  if (session.paused) wakeLock.off(); else wakeLock.on();
};
$('#pl-stage').addEventListener('click', () => $('#pl-play').click());
$('#pl-next').onclick = () => session?.next();
$('#pl-prev').onclick = () => session?.prev();
$('#pl-close').onclick = () => confirmEnd();
$('#pl-sound').onclick = openSettings;


function setSoundIcon() {
  $('#pl-sound .ms').textContent = settings.voice ? 'record_voice_over' : 'volume_up';
}

const dlgEnd = $('#dlg-end');
function confirmEnd() {
  if (dlgEnd.open) return;
  if (!session || session.finished) { leavePlayer(); return; }
  const wasPaused = session.paused;
  session.pause();
  setPausedUI(true);
  wakeLock.off();
  dlgEnd.showModal();
  dlgEnd.onclose = () => {
    if (dlgEnd.returnValue === 'end') leavePlayer();
    else if (!wasPaused) { session.resume(); setPausedUI(false); wakeLock.on(); }
    dlgEnd.returnValue = '';
  };
}
$('#dlg-keep').onclick = () => dlgEnd.close('keep');
$('#dlg-end-ok').onclick = () => dlgEnd.close('end');

// A finished session left before the chest screen: say what was banked.
function announceBanked() {
  clearTimeout(doneTimer);
  if (!lastResult || lastResult.shown || !lastResult.reward) return false;
  lastResult.shown = true;
  const rw = lastResult.reward;
  const msg = !rw.chest ? t('fibersStretched', { x: `+${fmtBig(rw.total)}` })
    : rw.ranAway ? t('chestBankedRan', { f: fmtBig(rw.total) }) : t('chestBanked', { f: fmtBig(rw.total), name: rw.fibbie.name });
  setTimeout(() => snackbar(msg), 400);
  return true;
}
/** Ends the current session. Returns true when a "chest banked" message was queued. */
function endSession() {
  if (!session) return false;
  const banked = session.finished && announceBanked();
  session.destroy();
  session = null;
  wakeLock.off();
  return banked;
}
function leavePlayer() {
  if (!session?.finished) announceBanked();
  endSession();
  allowLeave = true;
  back();
}
let allowLeave = false;

// Keyboard shortcuts in player
document.addEventListener('keydown', (e) => {
  if (currentView !== 'player' || document.querySelector('dialog[open]')) return;
  if (e.target.closest?.('button, input, select, textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); $('#pl-play').click(); }
  else if (e.code === 'ArrowRight') session?.next();
  else if (e.code === 'ArrowLeft') session?.prev();
  else if (e.code === 'Escape') confirmEnd();
});

// ---------- Done: rewards ----------
let lastResult = null;
let doneTimer = null;
let rewardPlayer = null;
function finish(s) {
  log = readLog(); // re-read, so another open copy of the app (tab, installed app) can't be overwritten
  const secs = Math.round(s.activeSeconds());
  const day = dayKey();
  const ratio = Math.max(0, Math.min(1, s.activeSeconds() / Math.max(1, s.total * 0.9)));
  const priorToday = todaysCats(log, day);
  const firstToday = !log.some((h) => h.day === day && counts(h));
  log.push({ day, id: s.routine.id, cat: s.routine.cat, secs, ratio: Math.round(ratio * 100) / 100, at: Date.now() });
  log = log.slice(-HISTORY_MAX);
  writeJSON('limber.history', log);
  const profile = loadProfile();
  const reward = ratio < 0.5 ? null : computeReward({
    routine: s.routine,
    holdSecs: s.moves.reduce((acc, m) => acc + m.secs, 0),
    ratio, skips: s.skips, scale: s.scale, priorToday, firstToday,
    streak: streak(), profile,
  });
  if (reward) {
    applyReward(profile, reward);
    saveProfile(profile);
  }
  lastResult = { routine: s.routine, secs, moves: s.routine.items.length, reward, shown: false };
  wakeLock.off();
  clearTimeout(doneTimer);
  doneTimer = setTimeout(() => {
    doneTimer = null;
    if (currentView !== 'player' || session !== s) return;
    session = null;
    allowLeave = true;
    replace(`#/done/${s.routine.id}`);
  }, 900);
}

function renderDone() {
  const v = $('#view-done');
  const res = lastResult;
  if (!res || res.shown) { replace('#/'); return; }
  res.shown = true;
  const r = res.routine;
  const again = () => { unlockAudio(); wakeLock.on(); pendingStart = r.id; replace(`#/play/${r.id}`); };
  rewardPlayer?.stop();
  if (!res.reward) {
    v.innerHTML = `
      <div class="reward" data-tier="0"><div class="rw-inner rw-nochest">
        <div class="rw-chest">${chestSVG(0)}</div>
        <h1>${t('soClose')}</h1>
        <p>${t('soCloseBody')}</p>
        <div class="rw-actions">
          <button class="rw-btn primary ripple" id="rw-again"><span aria-hidden="true" class="ms filled">replay</span>${t('tryAgain')}</button>
          <button class="rw-btn ripple" id="rw-home" aria-label="${t('home')}"><span aria-hidden="true" class="ms">home</span></button>
        </div>
      </div></div>`;
    $('#rw-again').onclick = again;
    $('#rw-home').onclick = () => replace('#/');
    return;
  }
  if (!res.reward.chest) {
    // Fibers and XP without a chest: a kind already done today, a Quick routine, or all four opened.
    const rw = res.reward;
    const left = rw.kindsLeft.map((c) => catOf(c).label).join(', ');
    v.innerHTML = `
      <div class="reward" data-tier="0"><div class="rw-inner rw-nochest rw-earned${reduceMotion() ? '' : ' waiting'}">
        <div class="rw-knot-box">
          <button class="rw-knot" aria-label="${esc(t('tapKnot'))}">${KNOT_SVG}</button>
          <span aria-hidden="true" class="ms filled rw-done-icon">check_circle</span>
        </div>
        <div class="rw-tap"><span aria-hidden="true" class="ms filled">touch_app</span><span class="rw-tap-txt">${t('tapKnot')}</span><span class="rw-dots" aria-hidden="true">${'<i></i>'.repeat(3)}</span></div>
        <h1>${t('wellDone')}</h1>
        <p class="rw-earned-n">${esc(t('fibersStretched', { x: `+${fmtBig(rw.total)}` }))}</p>
        <p>${esc(left ? t('noChestNext', { kinds: left }) : t('noChestToday'))}</p>
        <div class="rw-actions">
          <button class="rw-btn primary ripple" id="rw-home"><span aria-hidden="true" class="ms filled">check</span>${t('collect')}</button>
          <button class="rw-btn ripple" id="rw-again"><span aria-hidden="true" class="ms">replay</span>${t('again')}</button>
        </div>
      </div></div>`;
    $('#rw-again').onclick = again;
    $('#rw-home').onclick = () => replace('#/');
    loosenKnot(v, rw.total);
    return;
  }
  const st = streak();
  rewardPlayer = playReward(v, res.reward, {
    stats: [[fmtTime(res.secs), t('statActive')], [String(res.moves), t(r.cat === 'strength' ? 'exercisesWord' : 'stretchesWord', { n: res.moves })], [String(st), t('statStreak', { n: st })]],
    onHome: () => replace('#/'),
    onAgain: again,
  });
}

// A knot of muscle fibers with a face, like the chest's. It starts tense; each of three taps loosens it
// and cheers it up a little more, and the third sets the fibers free: it beams and thanks you with hearts.
// It waits for you, so the moment isn't spent while the screen slides in.
// The face shows one look per stage: s0 tense, s1 relieved, s2 smiling, s3 (opened) beaming.
const KNOT_INK = '#2b2233';
const KNOT_SVG = `<svg viewBox="-80 -80 160 160" aria-hidden="true">
  <defs>
    <radialGradient id="kn-g"><stop offset="0" stop-color="#ffb3c1" stop-opacity=".5"/><stop offset="1" stop-color="#ff5d73" stop-opacity="0"/></radialGradient>
    <radialGradient id="kn-body" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffc2cc"/><stop offset=".55" stop-color="#ff8798"/><stop offset="1" stop-color="#e2475f"/></radialGradient>
  </defs>
  <circle class="kn-glow" r="78" fill="url(#kn-g)"/>
  <g class="kn" style="--a:0deg;--d:14deg"><ellipse cx="-3" cy="2" rx="62" ry="16" stroke="#ff5d73"/><ellipse class="kn-hi" cx="-3" cy="2" rx="62" ry="16" stroke="#ffb3c1"/></g>
  <g class="kn" style="--a:27deg;--d:-16deg"><ellipse cx="4" cy="-2" rx="57" ry="21" stroke="#ff7b54"/><ellipse class="kn-hi" cx="4" cy="-2" rx="57" ry="21" stroke="#ffd3a8"/></g>
  <g class="kn" style="--a:64deg;--d:12deg"><ellipse cx="-2" cy="-4" rx="60" ry="14" stroke="#ff5d73"/><ellipse class="kn-hi" cx="-2" cy="-4" rx="60" ry="14" stroke="#ffb3c1"/></g>
  <g class="kn" style="--a:98deg;--d:-14deg"><ellipse cx="3" cy="3" rx="55" ry="22" stroke="#ff7b54"/><ellipse class="kn-hi" cx="3" cy="3" rx="55" ry="22" stroke="#ffd3a8"/></g>
  <g class="kn" style="--a:131deg;--d:16deg"><ellipse cx="-4" cy="1" rx="61" ry="17" stroke="#ff5d73"/><ellipse class="kn-hi" cx="-4" cy="1" rx="61" ry="17" stroke="#ffb3c1"/></g>
  <g class="kn" style="--a:158deg;--d:-12deg"><ellipse cx="2" cy="-3" rx="56" ry="19" stroke="#ff7b54"/><ellipse class="kn-hi" cx="2" cy="-3" rx="56" ry="19" stroke="#ffd3a8"/></g>
  <g class="kn-body">
    <circle r="40" fill="url(#kn-body)" stroke="#c93a52" stroke-width="2.5"/>
    <path d="M-26 -30 C-6 -14 -30 10 -8 38 M-4 -40 C16 -20 -10 8 14 37 M18 -35 C36 -14 12 10 30 26 M-38 -8 C-24 4 -40 18 -26 30" stroke="#fff" stroke-opacity=".28" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <g stroke="${KNOT_INK}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path class="kf s0" d="M-20 -10 l7 4 l-7 4 M20 -10 l-7 4 l7 4"/>
      <path class="kf s0" d="M-9 14 q3 -4 6 0 q3 4 6 0 q3 -4 6 0"/>
      <path class="kf s1" d="M-6 13 q6 3 12 0"/>
      <path class="kf s2" d="M-8 10 q8 9 16 0"/>
      <path class="kf s3" d="M-17 -4 q5 -7 10 0 M7 -4 q5 -7 10 0"/>
    </g>
    <g class="kf s1 s2" fill="${KNOT_INK}"><circle cx="-12" cy="-5" r="5"/><circle cx="12" cy="-5" r="5"/><circle cx="-10.4" cy="-6.8" r="1.8" fill="#fff"/><circle cx="13.6" cy="-6.8" r="1.8" fill="#fff"/></g>
    <g class="kf s3"><path d="M-10 8 q10 15 20 0 z" fill="${KNOT_INK}"/><ellipse cx="0" cy="13.2" rx="4.4" ry="2.4" fill="#ff8fab"/></g>
    <path class="kf s0" d="M27 -24 q4 7 0 10 q-4 -3 0 -10z" fill="#bfe8ff" stroke="#6bb8e6" stroke-width="1.2"/>
    <g class="kf s2 s3" fill="#ff5d73" opacity=".7"><ellipse cx="-24" cy="6" rx="6.5" ry="3.8"/><ellipse cx="24" cy="6" rx="6.5" ry="3.8"/></g>
  </g>
  <g transform="translate(-30 -50) scale(1.1)"><path class="kn-heart" style="--hd:0s" d="M0 4 C-9 -3 -6 -11 0 -6 C6 -11 9 -3 0 4Z" fill="#ff5d73"/></g><g transform="translate(28 -56) scale(1.4)"><path class="kn-heart" style="--hd:0.15s" d="M0 4 C-9 -3 -6 -11 0 -6 C6 -11 9 -3 0 4Z" fill="#ff5d73"/></g><g transform="translate(2 -66) scale(0.9)"><path class="kn-heart" style="--hd:0.3s" d="M0 4 C-9 -3 -6 -11 0 -6 C6 -11 9 -3 0 4Z" fill="#ff5d73"/></g>
</svg>`;
function loosenKnot(v, total) {
  const wrap = v.querySelector('.reward');
  const box = v.querySelector('.rw-earned');
  const knot = v.querySelector('.rw-knot');
  if (reduceMotion()) { box.classList.add('open'); return; }
  box.classList.add('waiting');
  wrap.classList.add('ready'); // the same tap line as a chest: "Loosen the knot!", then a dot per tap
  const fxs = createFx(wrap, { colors: ['#ff5d73', '#ffd166'], reduce: false });
  const timers = [];
  rewardPlayer = { stop() { timers.forEach(clearTimeout); fxs.stop(); } };
  const centre = () => { const r = knot.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  let hits = 0;
  knot.focus({ preventScroll: true });
  knot.addEventListener('click', function onTap() {
    hits++;
    wrap.dataset.hits = String(hits);
    const [x, y] = centre();
    if (hits < 3) {
      // A jolt, the loops turn apart and a few sparks.
      knot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12, .9) rotate(-5deg)', offset: 0.3 }, { transform: 'scale(.95, 1.06) rotate(4deg)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.3,1.8,.5,1)' });
      fxs.burst(x, y, 6 + hits * 5, ['spark', 'star', 'band'], 0.55);
      fx.rattle(); fx.pop();
      haptics.buzz(25 + hits * 20);
      v.querySelector('.rw-tap-txt').textContent = t('tapCalls')[hits] || '';
      return;
    }
    knot.removeEventListener('click', onTap);
    // The third tap: the fibers spring free, the check pops out, the text rises in and the fibers count up.
    box.classList.remove('waiting');
    box.classList.add('open');
    fxs.ring(x, y, { color: '#ffffff', speed: 700, width: 8, life: 0.45 });
    fxs.ring(x, y, { color: '#ff7b54', speed: 440, width: 5, life: 0.6 });
    fxs.burst(x, y, 30, ['fiber', 'fiber', 'spark', 'star'], 0.9);
    fxs.twinkles(6, 0.7);
    fx.pop();
    haptics.buzz(60);
    v.querySelector('.rw-done-icon').animate([
      { transform: 'scale(.3) rotate(-40deg)', opacity: 0 },
      { transform: 'scale(1.25) rotate(8deg)', opacity: 1, offset: 0.55 },
      { transform: 'scale(1) rotate(0)', opacity: 1 },
    ], { duration: 650, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    const num = v.querySelector('.rw-earned-n');
    let t0 = null;
    const step = (now) => {
      t0 ??= now + 200;
      const k = Math.max(0, Math.min(1, (now - t0) / 900));
      num.textContent = t('fibersStretched', { x: `+${fmtBig(Math.round(total * (1 - (1 - k) ** 3)))}` });
      if (k < 1 && num.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    timers.push(setTimeout(() => v.querySelector('#rw-home')?.focus({ preventScroll: true }), 700));
  });
}

// ---------- Settings sheet ----------
const sheet = $('#sheet-settings');
function openSettings() {
  $('#set-voice').checked = settings.voice;
  syncSeg('#set-scale', String(settings.scale));
  setScaleNote();
  $('#set-lang').innerHTML = LANGS.map((l) => `<button class="m3-item ripple" data-v="${l.id}" role="radio" lang="${l.id}" aria-checked="${l.id === settings.lang}"><span class="li-text"><b>${l.label}</b></span><span class="m3-radio" aria-hidden="true"></span></button>`).join('');
  checkVoice();
  sheet.showModal();
}
function setScaleNote() {
  const k = ['0.8', '1', '1.25', 'flex'].includes(String(settings.scale)) ? String(settings.scale) : '1';
  $('#set-scale-note').textContent = t(`scale.${k}`);
}
// Show a hint (and on Android an install button) when the device has no voice for the language.
let voiceCheck = 0;
async function checkVoice() {
  const id = ++voiceCheck;
  const note = $('#set-lang-note');
  note.hidden = true;
  if (getLang() === 'en') return;
  const ok = await voiceGuide.hasVoice();
  if (id !== voiceCheck) return;
  note.hidden = ok !== false;
  $('#set-lang-install').hidden = !native.canInstallVoice;
}
$('#set-lang-install').onclick = () => native.openTtsInstall();
$('#set-lang').onclick = (e) => {
  const b = e.target.closest('button'); if (!b || b.dataset.v === settings.lang) return;
  settings.lang = b.dataset.v; saveSettings();
  syncSeg('#set-lang', b.dataset.v);
  setLang(b.dataset.v);
};
onLangChange(() => {
  localizeContent();
  translateDom();
  setScaleNote();
  checkVoice();
  if (session && !session.finished) { $('#pl-routine').textContent = session.routine.title; renderStep(session); setPausedUI(session.paused); }
});
function syncSeg(sel, val) {
  document.querySelectorAll(`${sel} button`).forEach((b) => b.setAttribute('aria-checked', b.dataset.v === val));
}
document.addEventListener('click', (e) => { if (e.target.closest('#btn-settings')) openSettings(); }); // the button is redrawn with the level card
$('#set-close').onclick = () => sheet.close();
sheet.addEventListener('close', () => {
  setSoundIcon();
  if (currentView === 'home') {
    renderHome();
    // The Settings button was redrawn with the level card: give it back the focus closing moved to it.
    if (document.activeElement === document.body) $('#btn-settings')?.focus({ preventScroll: true });
  }
  else if (currentView === 'detail') route();
});
$('#set-voice').onchange = (e) => {
  settings.voice = e.target.checked; saveSettings(); applySettings();
  if (settings.voice) { unlockAudio(); voiceGuide.say(t('say.voiceOn')); } else voiceGuide.stop();
};
$('#set-scale').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return;
  settings.scale = b.dataset.v === 'flex' ? 'flex' : Number(b.dataset.v); saveSettings(); syncSeg('#set-scale', b.dataset.v);
  setScaleNote();
  if (session && !session.finished) snackbar(t('holdNextSession'));
};

// ---------- Router ----------
// pushState-based navigation; state.d is our depth so in-app "back" can pop real history.
const depth = () => (window.history.state && window.history.state.d) || 0;
function go(hash) {
  window.history.pushState({ d: depth() + 1 }, '', hash);
  route();
}
function replace(hash) {
  window.history.replaceState({ d: depth() }, '', hash);
  route();
}
function back() {
  if (depth() > 0) window.history.back();
  else replace('#/');
}
window.addEventListener('popstate', () => {
  backNav = true;
  try { route(); } finally { backNav = false; }
});
// Only for manually edited URLs (pushState/popstate entries already carry state).
window.addEventListener('hashchange', () => {
  if (window.history.state) return;
  window.history.replaceState({ d: 0 }, '', location.hash);
  route();
});

function route() {
  const hash = location.hash || '#/';
  const [, view, id] = hash.split('/');

  // Leaving a running session via the back button: confirm first.
  if (currentView === 'player' && session && !session.finished && view !== 'play' && !allowLeave) {
    window.history.pushState({ d: depth() + 1 }, '', `#/play/${session.routine.id}`);
    confirmEnd();
    return;
  }
  allowLeave = false;
  if (view !== 'done' && rewardPlayer) { rewardPlayer.stop(); rewardPlayer = null; voiceGuide.stop(); haptics.stop(); }

  if (view === 'r' && routineById(id)) {
    endSession();
    renderDetail(routineById(id));
    show('detail');
  } else if (view === 'play' && routineById(id)) {
    if (pendingStart === id || (session && session.routine.id === id && !session.finished)) {
      if (pendingStart === id) {
        pendingStart = null;
        show('player');
        openPlayer(routineById(id));
      } else show('player');
    } else {
      // reload on player URL: go to the routine page instead (needs a tap to start audio)
      replace(`#/r/${id}`);
    }
  } else if (view === 'done') {
    show('done');
    renderDone();
  } else {
    const banked = endSession();
    if (pendingReload && !banked && safeToReload()) { location.reload(); return; }
    renderHome();
    show('home');
  }
}

// ---------- Bottom sheets: pull down to close ----------
// Dragging down from the handle, or anywhere while the sheet is scrolled to the top, moves the
// sheet with the finger; letting go far enough (or with a quick flick) closes it.
function dragToClose(dlg, canClose = () => true) {
  // A tap on the dimmed area around the sheet (the dialog itself, outside its box) closes it too.
  dlg.addEventListener('click', (e) => {
    if (e.target !== dlg || !canClose()) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });
  let x0 = 0, y0 = 0, t0 = 0, dy = 0, active = false, dragging = false, pointer = null;
  const reset = () => { dlg.style.transition = ''; dlg.style.translate = ''; };
  const onHandle = (e) => !!e.target.closest('.sheet-handle, .sheet-title');
  const start = ({ clientX, clientY }) => {
    x0 = clientX; y0 = clientY; t0 = performance.now(); dy = 0; active = true; dragging = false;
  };
  dlg.addEventListener('touchstart', (e) => {
    if (pointer !== null || onHandle(e) || e.touches.length !== 1 || !canClose() || dlg.scrollTop > 0) return;
    start(e.touches[0]);
  }, { passive: true });
  const move = ({ clientX, clientY }, e) => {
    if (!active) return;
    dy = clientY - y0;
    if (!dragging) {
      if (dy < 0 || Math.abs(clientX - x0) > Math.max(dy, 8)) { active = false; return; }
      // Claim a downward pull at scrollTop 0 before the browser starts a native scroll.
      if (dy > 0 && e.cancelable) e.preventDefault();
      if (dy < 8) return; // a tap that wobbles a little is still a tap
      dragging = true;
    }
    if (e.cancelable) e.preventDefault();
    dlg.style.transition = 'none';
    dlg.style.translate = `0 ${Math.max(0, dy - 8)}px`;
  };
  dlg.addEventListener('touchmove', (e) => {
    if (pointer === null && e.touches.length === 1) move(e.touches[0], e);
  }, { passive: false });
  const end = () => {
    if (!active) return;
    active = false;
    if (!dragging) return;
    dragging = false;
    const fast = dy / Math.max(1, performance.now() - t0) > 0.6;
    dlg.style.transition = 'translate .22s cubic-bezier(.2,0,0,1)';
    if ((dy > 110 || (fast && dy > 40)) && canClose()) {
      dlg.style.translate = '0 100%';
      setTimeout(() => { dlg.close(); reset(); }, 200);
    } else {
      dlg.style.translate = '';
      setTimeout(reset, 230);
    }
  };
  const cancel = () => { active = dragging = false; reset(); };
  dlg.addEventListener('touchend', () => { if (pointer === null) end(); });
  dlg.addEventListener('touchcancel', () => { if (pointer === null) cancel(); });
  // The handle owns its pointer so a mouse or finger can keep dragging outside the sheet.
  dlg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !e.isPrimary || !onHandle(e) || !canClose()) return;
    pointer = e.pointerId;
    dlg.setPointerCapture(pointer);
    start(e);
  });
  dlg.addEventListener('pointermove', (e) => { if (pointer === e.pointerId) move(e, e); });
  dlg.addEventListener('pointerup', (e) => {
    if (pointer !== e.pointerId) return;
    pointer = null;
    end();
  });
  dlg.addEventListener('lostpointercapture', (e) => {
    if (pointer !== e.pointerId) return;
    pointer = null;
    cancel();
  });
}
for (const s of [sheet, flexSheet, albumSheet]) dragToClose(s);
dragToClose(fibSheet, () => !merging);

// ---------- Safety note ----------
// Shown once on first launch (and any time from the link at the bottom of home).
const dlgSafety = $('#dlg-safety');
const SAFETY_ICONS = ['local_fire_department', 'warning', 'air', 'medical_services'];
function openSafety() {
  $('#safety-list').innerHTML = t('safetyItems').map((s, i) => `<li><span aria-hidden="true" class="ms">${SAFETY_ICONS[i] || 'check'}</span><span>${esc(s)}</span></li>`).join('');
  if (!dlgSafety.open) dlgSafety.showModal();
}
$('#btn-safety').onclick = openSafety;
$('#dlg-safety-ok').onclick = () => dlgSafety.close();
// Per device (outside "limber." so a backup code neither carries nor removes it).
const SAFETY_KEY = 'fibbies.safety-seen';
dlgSafety.addEventListener('close', () => {
  try { localStorage.setItem(SAFETY_KEY, '1'); } catch { /* ignore */ }
});
function maybeShowSafety() {
  let seen = false;
  try { seen = !!localStorage.getItem(SAFETY_KEY); } catch { /* ignore */ }
  if (!seen && currentView === 'home' && !document.querySelector('dialog[open]')) openSafety();
}

// Number dialogs in the order they open, so Back can close the one on top.
let dialogSeq = 0;
const dialogWatch = new MutationObserver((ms) => ms.forEach((m) => { if (m.target.open) m.target.dataset.seq = String(++dialogSeq); }));
document.querySelectorAll('dialog').forEach((d) => {
  dialogWatch.observe(d, { attributes: true, attributeFilter: ['open'] });
  d.addEventListener('close', refreshIfNewDay);
});

// ---------- Keeping data safe ----------
// Another open copy of the app (a browser tab next to the installed app) changed the saved data.
window.addEventListener('storage', (e) => {
  if (e.storageArea !== localStorage) return;
  if (e.key === null || e.key === 'limber.history') log = readLog();
  if (e.key === null || e.key === 'limber.settings') {
    Object.assign(settings, readSettings());
    applySettings();
    if (settings.lang && settings.lang !== getLang()) setLang(settings.lang);
  }
  if (!session && currentView === 'home' && !document.querySelector('dialog[open]')) renderHome();
});
onSaveFail(() => setTimeout(() => snackbar(t('saveFailed')), 300));

// Backup code: copy all progress as text, or restore it on this phone.
const dlgBackup = $('#dlg-backup');
$('#set-backup-copy').onclick = async () => {
  const code = makeBackupCode();
  let copied = false;
  try { await navigator.clipboard.writeText(code); copied = true; } catch { /* fall back to showing it */ }
  if (copied) { backupNote(t('backupCopied')); return; }
  openBackup(code); // no clipboard access: show the code selected so it can be copied by hand
};
$('#set-backup-restore').onclick = () => openBackup('');
function openBackup(code) {
  const ta = $('#backup-text');
  ta.value = code;
  ta.readOnly = !!code;
  $('#backup-msg').textContent = code ? t('backupCopyHand') : '';
  $('#dlg-backup-ok').hidden = !!code;
  $('#dlg-backup-ok').textContent = t('backupRestoreBtn');
  backupPending = null;
  dlgBackup.showModal();
  if (code) { ta.focus(); ta.select(); } else ta.focus();
}
$('#dlg-backup-cancel').onclick = () => dlgBackup.close();
let backupPending = null; // a valid code waiting for the second tap ("Replace")
$('#backup-text').addEventListener('input', () => { backupPending = null; $('#dlg-backup-ok').textContent = t('backupRestoreBtn'); });
$('#dlg-backup-ok').onclick = () => {
  if (!backupPending) {
    const b = readBackupCode($('#backup-text').value);
    if (!b) { $('#backup-msg').textContent = t('backupInvalid'); return; }
    backupPending = b;
    const lvl = levelProgress(xpOf(b.data)).level;
    $('#backup-msg').textContent = t('backupConfirm', { level: lvl, here: levelProgress(loadProfile().xp).level });
    $('#dlg-backup-ok').textContent = t('backupReplace');
    return;
  }
  const b = backupPending;
  try { replaceProgress(b.data); } catch { $('#backup-msg').textContent = t('saveFailed'); return; }
  try { sessionStorage.setItem('fibbies.restored-backup', '1'); } catch { /* ignore */ }
  location.reload();
};
// A short note in place of the backup row's subtitle (snackbars sit behind the open sheet).
function backupNote(text) {
  const el = $('#set-backup-copy small');
  el.textContent = text;
  clearTimeout(backupNote.t);
  backupNote.t = setTimeout(() => { el.textContent = t('backupCopySub'); }, 3500);
}

// ---------- Boot ----------
// iOS Safari ignores user-scalable=no in the viewport tag: stop its pinch gesture here.
document.addEventListener('gesturestart', (e) => e.preventDefault());
if (isNative) document.documentElement.classList.add('native');
else requestPersistence(); // ask the browser not to clear the site's data when space runs low
if (!history.state) history.replaceState({ d: 0 }, '', location.href);
if (settings.lang !== getLang()) setLang(settings.lang);
localizeContent();
translateDom();
applySettings();
// One-time notice: the level curve got steeper, so existing players may see a lower level.
try {
  if (!localStorage.getItem('limber.levels-v2')) {
    localStorage.setItem('limber.levels-v2', '1');
    if (loadProfile().xp > 0) setTimeout(() => snackbar(t('levelsRebalanced')), 1200);
  }
} catch { /* ignore */ }
setSoundIcon();
route();
window.__booted = true;
native.hideSplash();
try {
  if (sessionStorage.getItem('fibbies.restored-backup')) { sessionStorage.removeItem('fibbies.restored-backup'); setTimeout(() => snackbar(t('backupDone')), 600); }
} catch { /* ignore */ }
setTimeout(maybeShowSafety, 700);
// Left over from older versions: the cloud save, and saved filters (they now start empty each launch).
try { for (const k of ['fibbies.cloud', 'limber.cat', 'limber.focus']) localStorage.removeItem(k); } catch { /* ignore */ }
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { refreshIfNewDay(); return; }
  if (session && !session.finished && !session.paused) { session.pause(); setPausedUI(true); wakeLock.off(); }
  if (pendingReload && safeToReload()) location.reload(); // apply a waiting update while nobody is looking
});

// Android hardware back: close dialogs first, confirm before leaving a session, exit from home.
native.onBackButton(() => {
  // The most recently opened dialog is the one on top (DOM order says nothing about that).
  const open = [...document.querySelectorAll('dialog[open]')].sort((a, b) => (Number(a.dataset.seq) || 0) - (Number(b.dataset.seq) || 0)).pop();
  if (open) { if (!(open === fibSheet && merging)) open.close(); return; }
  if (currentView === 'player' && session && !session.finished) { confirmEnd(); return; }
  if (currentView === 'home') { native.exit(); return; }
  if (currentView === 'done') { replace('#/'); return; }
  back();
});
$('#boot-fail').hidden = true; // in case the safety net fired during a slow load

// Service worker: offline + atomic updates. When a new version takes over, reload once
// so the page never runs a mix of old and new files. Skipped on localhost for development.
// The native app ships its files inside the APK, so it needs no service worker.
if (!isNative && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (local) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
  } else {
    // On a first visit the initial claim is not an update, so skip exactly that one.
    let skipNext = !navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (skipNext) { skipNext = false; return; }
      if (reloaded) return;
      if (!safeToReload() || currentView !== 'home') { pendingReload = true; return; }
      reloaded = true;
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        // Installed apps can stay open for days: check for a new version when brought back.
        document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
      }).catch(() => {});
    });
  }
}
