import { STRETCHES, CATEGORIES, ROUTINES, RANKINGS, routineSeconds, buildTimeline, sideLabel, holdSecs } from './data.js';
import { Figure } from './figure.js';
import { unlockAudio, sfx, fx, voiceGuide, haptics } from './audio.js';
import { wakeLock } from './wakelock.js';
import { Session } from './session.js';
import { loadProfile, saveProfile, computeReward, applyReward, todaysCats, counts, levelProgress, fmtBig, QUESTS } from './rewards.js';
import { fibbie, groups, parseKey, keyOf, countOf, mergeFibbies, discovered, MAX_STAGE, FIBBIES } from './fibbies.js';
import { FLEX_TESTS, WEEK_DAYS, loadFlex, saveFlex, scoreOf, levelOf, cleanAnswer, imbalances, daysSinceLast, fmtDay, flexChartSVG, chartPoints } from './flex.js';
import { critterSVG, chestSVG, esc, stars } from './critter.js';
import { playReward } from './reward-screen.js';
import { playMerge } from './merge-fx.js';
import { native, isNative } from './native.js';
import { t, LANGS, getLang, setLang, onLangChange, translateDom, numLocale } from './i18n.js';
import { cloud } from './cloud.js';
import { readJSON, writeJSON, onSaveFail, requestPersistence, makeBackupCode, readBackupCode, replaceProgress, xpOf } from './storage.js';
import { localizeContent } from './localize.js';

const $ = (s, r = document) => r.querySelector(s);

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

function updateThemeColor() {
  // Resolve the surface color to rgb for <meta name="theme-color">
  const view = $('.view.active');
  if (view && view.id === 'view-done') {
    $('meta[name="theme-color"]').setAttribute('content', '#140e26');
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
  $('meta[name="theme-color"]').setAttribute('content', `rgb(${r},${g},${b})`);
  native.statusBar((r * 299 + g * 587 + b * 114) / 1000 < 128);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => requestAnimationFrame(updateThemeColor));

// ---------- Helpers ----------
const catOf = (id) => CATEGORIES.find((c) => c.id === id);
const routineById = (id) => ROUTINES.find((r) => r.id === id);
const minutes = (r) => Math.max(1, Math.round(routineSeconds(r, settings.scale) / 60));
const fmtTime = (s) => {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
let activeCat = readJSON('limber.cat', 'all');

function suggestion() {
  const h = new Date().getHours();
  const done = todaysCats(log, dayKey());
  if (done.has('before') && !done.has('after')) return { r: routineById('top5-after'), why: t('sug.sandwich') };
  if (done.has('after') && !done.has('evening') && h >= 18) return { r: routineById('top5-evening'), why: t('sug.evening') };
  if (h < 11) return { r: routineById('top5-before'), why: t('sug.morning') };
  if (h < 16) return { r: routineById('five-minute-fix'), why: t('sug.midday') };
  if (h < 20) return { r: routineById('top5-after'), why: t('sug.after') };
  return { r: routineById('top5-evening'), why: t('sug.night') };
}

function renderHome() {
  const st = streak();

  // Week strip
  const days = new Set(log.filter(counts).map((x) => x.day));
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const letters = t('weekLetters');
  let dots = '';
  let weekCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const k = dayKey(d);
    const done = days.has(k);
    if (done) weekCount++;
    dots += `<div class="wd${done ? ' done' : ''}${k === dayKey(today) ? ' today' : ''}"><span>${letters[i]}</span><i>${done ? '<span aria-hidden="true" class="ms">check</span>' : ''}</i></div>`;
  }
  $('#week-card').innerHTML = `
    <div class="streak">
      <div class="streak-icon"><span aria-hidden="true" class="ms filled">local_fire_department</span></div>
      <div><b>${t('days', { n: st })}</b><small>${t('thisWeek', { n: weekCount })}</small></div>
    </div>
    <div class="week-dots" aria-label="${t('thisWeekAria')}">${dots}</div>`;

  renderProgress();

  // Hero
  const { r, why } = suggestion();
  const hero = $('#hero');
  hero.innerHTML = `
    <button class="hero ripple" data-hue style="--h:${r.hue}" data-open="${r.id}">
      <div class="hero-body">
        <span class="hero-kicker"><span aria-hidden="true" class="ms filled">${r.icon}</span>${esc(why)}</span>
        <span class="hero-title">${esc(r.title)}</span>
        <span class="hero-meta">${minutes(r)} min · ${t('stretches', { n: r.items.length })}</span>
        <span class="hero-play"><span aria-hidden="true" class="ms filled">play_arrow</span>${t('start')}</span>
      </div>
      <div class="hero-fig"></div>
    </button>`;
  const hf = new Figure(heroStretch(r));
  hero.querySelector('.hero-fig').appendChild(hf.svg);
  animate(hf);
  hero.querySelector('.hero-play').addEventListener('click', (e) => {
    e.stopPropagation();
    startRoutine(r.id);
  });

  renderCollection();
  renderFlexCard();

  // Chips
  $('#chips').innerHTML = CATEGORIES.map((c) => `
    <button class="chip ripple" role="tab" aria-selected="${c.id === activeCat}" data-cat="${c.id}">
      <span aria-hidden="true" class="ms">${c.id === activeCat ? 'check' : c.icon}</span>${c.label}
    </button>`).join('');

  renderList();
}

function renderProgress() {
  const p = loadProfile();
  const lp = levelProgress(p.xp);
  const bk = p.buddy && parseKey(p.buddy);
  const buddy = bk ? fibbie(bk.sp, bk.stage) : null;
  const done = todaysCats(log, dayKey());
  // The top of the home screen: buddy, level and XP, with Settings in the corner (no separate app bar).
  $('#progress-card').innerHTML = `
    <div class="pc-top">
      <div class="pc-buddy">${critterSVG(buddy, { locked: !buddy })}</div>
      <div class="pc-main">
        <div class="pc-head"><b>${t('level', { n: lp.level })}</b>
          <button class="icon-btn ripple" id="btn-settings" aria-label="${esc(t('settings'))}"><span aria-hidden="true" class="ms">tune</span></button></div>
        <div class="pc-line"><small>${t('fibersStretched', { x: fmtBig(p.fibers) })}</small></div>
        <div class="pc-bar"><i style="width:${(lp.frac * 100).toFixed(1)}%"></i></div>
        <div class="pc-line" style="margin-top:4px"><small>${fmtBig(lp.into)} / ${fmtBig(lp.need)} XP</small><small>${t('chestsFriends', { c: p.chests, d: discovered(p) })}</small></div>
      </div>
    </div>
    <div class="quests" aria-label="${esc(t('questsAria'))}">
      ${QUESTS.map((q) => `<div class="quest${done.has(q.cat) ? ' done' : ''}"><span aria-hidden="true" class="ms ${done.has(q.cat) ? 'filled' : ''}">${done.has(q.cat) ? 'check_circle' : q.icon}</span>${q.label}</div>`).join('')}
    </div>
    <div class="quest-hint"><span aria-hidden="true" class="ms filled">lunch_dining</span><span>${t('sandwichHint')}</span></div>`;
}


function renderCollection() {
  const p = loadProfile();
  const gs = groups(p);
  const items = gs.map((g) => `
    <button class="col-item owned${g.canMerge ? ' can-merge' : ''}" data-fib="${esc(g.key)}">
      ${g.count > 1 ? `<span class="col-count">×${g.count}</span>` : ''}
      ${critterSVG(g.fib)}<span class="col-name">${esc(g.fib.name)}</span>${stars(g.fib.stage)}
    </button>`).join('');
  $('#collection').innerHTML = `
    <div class="col-head"><h2>${t('fibbieFriends')}</h2>
      <button class="col-album ripple" id="btn-album"><span aria-hidden="true" class="ms">auto_stories</span>${t('discovered', { n: discovered(p) })}<span aria-hidden="true" class="ms">chevron_right</span></button></div>
    ${gs.length ? `<div class="col-row">${items}</div>` : `<div class="col-empty">${critterSVG(null, { locked: true })}<span>${t('moreToFind')}</span></div>`}`;
}

// ---------- Fibbie sheet: details + merging ----------
const fibSheet = $('#sheet-fib');
let fibKey = null;
let merging = false;
function openFib(key) {
  fibKey = key;
  renderFib();
  if (!fibSheet.open) fibSheet.showModal();
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

function renderList() {
  const list = $('#routine-list');
  const items = ROUTINES.filter((r) => activeCat === 'all' || r.cat === activeCat);
  list.innerHTML = '';
  for (const r of items) {
    const b = document.createElement('button');
    b.className = 'routine-card ripple';
    b.dataset.hue = '';
    b.style.setProperty('--h', r.hue);
    b.dataset.open = r.id;
    b.innerHTML = `
      <div class="rc-thumb"></div>
      <div>
        <div class="rc-title">${esc(r.title)}</div>
        <div class="rc-meta">${r.top ? '<span class="top-badge"><span aria-hidden="true" class="ms filled">workspace_premium</span>Top 5</span>' : `<span class="rc-cat">${catOf(r.cat).label}</span>`} <span class="rc-n">${t('stretches', { n: r.items.length })}</span></div>
      </div>
      <div class="rc-dur">${minutes(r)}<small>min</small></div>`;
    b.querySelector('.rc-thumb').appendChild(staticFig(heroStretch(r), 0.6));
    list.appendChild(b);
  }
  renderRanking();
}

function renderRanking() {
  const box = $('#ranking');
  const cat = catOf(activeCat);
  if (activeCat === 'all') {
    box.innerHTML = `<div class="rank-hint"><span aria-hidden="true" class="ms">leaderboard</span><span>${t('rankHint')}</span></div>`;
    return;
  }
  const rows = RANKINGS[activeCat];
  const top = ROUTINES.find((r) => r.cat === activeCat && r.top);
  box.innerHTML = `
    <div class="rank-head" data-hue style="--h:${cat.hue}">
      <div><h2>${esc(t('rankTitle', { cat: cat.label }))}</h2><p>${t('rankSub', { title: esc(top.title) })}</p></div>
    </div>
    <ol class="rank-list" data-hue style="--h:${cat.hue}"></ol>`;
  const ol = box.querySelector('.rank-list');
  rows.forEach(([id, why], i) => {
    const s = STRETCHES[id];
    const li = document.createElement('li');
    li.className = `rank-row${i < 5 ? ' is-top' : ''}`;
    li.innerHTML = `
      <span class="rank-n">${i + 1}</span>
      <div class="rank-thumb"></div>
      <div class="rank-text"><b>${esc(s.name)}</b><small>${esc(why)}</small></div>`;
    li.querySelector('.rank-thumb').appendChild(staticFig(s, 0.5));
    ol.appendChild(li);
    if (i === 4) {
      const sep = document.createElement('li');
      sep.className = 'rank-sep';
      sep.innerHTML = `<button class="btn tonal ripple" data-play="${top.id}"><span aria-hidden="true" class="ms filled">play_arrow</span>${t('playTop5', { m: minutes(top) })}</button>`;
      ol.appendChild(sep);
    }
  });
}

$('#chips').addEventListener('click', (e) => {
  const c = e.target.closest('[data-cat]');
  if (!c) return;
  activeCat = c.dataset.cat;
  writeJSON('limber.cat', activeCat);
  document.querySelectorAll('#chips .chip').forEach((ch) => {
    const on = ch.dataset.cat === activeCat;
    ch.setAttribute('aria-selected', on);
    ch.querySelector('.ms').textContent = on ? 'check' : catOf(ch.dataset.cat).icon;
  });
  renderList();
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
        <span class="stat-pill"><span aria-hidden="true" class="ms">format_list_bulleted</span>${t('stretches', { n: r.items.length })}</span>
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
    const d = holdSecs(s, secs, settings.scale);
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

wakeLock.onChange((on) => { $('#pl-awake').hidden = !on; });

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
  setTimeout(() => snackbar(rw.ranAway ? t('chestBankedRan', { f: fmtBig(rw.total) }) : t('chestBanked', { f: fmtBig(rw.total), name: rw.fibbie.name })), 400);
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
  if (writeJSON('limber.history', log)) cloud.touch();
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
  const st = streak();
  rewardPlayer = playReward(v, res.reward, {
    stats: [[fmtTime(res.secs), t('statActive')], [String(res.moves), t('stretchesWord', { n: res.moves })], [String(st), t('statStreak', { n: st })]],
    onHome: () => replace('#/'),
    onAgain: again,
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
  renderCloud();
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
  hideLangHint(); // they found the language setting
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

// ---------- First launch: a quiet offer to change the language ----------
// The app guesses the language from the phone. The first time it opens, a small line at the top
// offers to change it; it never comes back after that first visit.
const LANG_HINT_KEY = 'fibbies.lang-hint-seen'; // per device, like the language itself
function showLangHint() {
  let seen = true;
  try { seen = !!localStorage.getItem(LANG_HINT_KEY); localStorage.setItem(LANG_HINT_KEY, '1'); } catch { /* ignore */ }
  if (seen || log.length) return; // only for someone opening the app for the very first time
  $('#lang-hint-name').textContent = LANGS.find((l) => l.id === getLang())?.label || '';
  $('#lang-hint').hidden = false;
}
const hideLangHint = () => { $('#lang-hint').hidden = true; };
$('#lang-hint-close').onclick = hideLangHint;
$('#lang-hint-pick').onclick = () => {
  hideLangHint();
  openSettings();
  $('#sec-lang').scrollIntoView({ block: 'start' });
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

// ---------- Google Play Games cloud save (Android only, optional) ----------
async function renderCloud() {
  const box = $('#set-cloud-group');
  box.hidden = !cloud.supported;
  if (!cloud.supported) return;
  const ok = await cloud.available();
  const sw = $('#set-cloud');
  sw.checked = cloud.on;
  // Never disabled: a disabled switch ignores taps, so a tap instead explains what is missing.
  sw.disabled = cloudBusy;
  const sub = $('#set-cloud-sub');
  sub.classList.toggle('warn', !!(cloudMsg && cloudMsg.warn));
  if (cloudMsg) { sub.textContent = cloudMsg.text; return; }
  const when = cloud.syncedAt ? new Date(cloud.syncedAt).toLocaleString(numLocale(), { dateStyle: 'short', timeStyle: 'short' }) : '';
  sub.textContent = !ok ? t('cloudNotSetUp')
    : cloud.signedOut ? t('cloudSignedOut')
    : cloud.on ? [cloud.name ? t('cloudSignedIn', { name: cloud.name }) : '', when ? t('cloudSynced', { when }) : ''].filter(Boolean).join(' · ') || t('cloudSub')
    : t('cloudSub');
}
cloud.onChange(() => { if (sheet.open) renderCloud(); });
let cloudBusy = false;
// A message shown in place of the status line (snackbars are hidden behind the open sheet).
let cloudMsg = null;
sheet.addEventListener('close', () => { cloudMsg = null; });
const dlgCloud = $('#dlg-cloud');
function chooseCopy(remote) {
  const lvl = levelProgress(xpOf(remote.data)).level;
  const here = levelProgress(loadProfile().xp).level;
  const fmt = (ms) => new Date(ms).toLocaleString(numLocale(), { dateStyle: 'medium', timeStyle: 'short' });
  $('#dlg-cloud-body').textContent = t('cloudChoose', { cloud: lvl, when: fmt(remote.at), here });
  return new Promise((res) => {
    // Only the two buttons are choices; any other way of closing cancels and changes nothing.
    dlgCloud.onclose = () => { const v = dlgCloud.returnValue; dlgCloud.returnValue = ''; res(v === 'local' || v === 'cloud' ? v : null); };
    dlgCloud.showModal();
  });
}
$('#dlg-cloud-use').onclick = () => dlgCloud.close('cloud');
$('#dlg-cloud-keep').onclick = () => dlgCloud.close('local');
$('#set-cloud').onchange = async (e) => {
  cloudMsg = null;
  if (!e.target.checked) { cloud.disable(); renderCloud(); return; }
  if (!(await cloud.available())) {
    e.target.checked = false;
    cloudMsg = { text: t('cloudNeedsSetup'), warn: true };
    renderCloud();
    return;
  }
  cloudBusy = true;
  cloudMsg = { text: t('cloudConnecting') };
  renderCloud();
  try {
    const r = await cloud.enable(chooseCopy);
    if (r === 'pulled') { reloadAfterPull(); return; }
    cloudMsg = r === 'off' ? { text: t('cloudSignInFailed'), warn: true }
      : r === 'cancelled' ? null
      : { text: t('cloudOnNow') };
  } catch {
    cloud.disable();
    cloudMsg = { text: t('cloudError'), warn: true };
  } finally {
    cloudBusy = false;
    renderCloud();
  }
};
// Pull a newer copy from another device when the app opens or comes back, but never mid-session.
async function cloudSync() {
  const r = await cloud.sync({
    canReplace: () => !session && !dlgEnd.open && currentView !== 'player' && !document.querySelector('dialog[open]'),
    choose: chooseCopy,
  }).catch(() => 'error');
  if (r === 'pulled') reloadAfterPull();
}
// Reload at once so nothing in memory (settings, history) can write stale data over the download.
function reloadAfterPull() {
  try { sessionStorage.setItem('fibbies.restored', '1'); } catch { /* ignore */ }
  location.reload();
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
  let y0 = 0, t0 = 0, dy = 0, active = false, dragging = false;
  const reset = () => { dlg.style.transition = ''; dlg.style.translate = ''; };
  dlg.addEventListener('touchstart', (e) => {
    active = dragging = false;
    if (e.touches.length !== 1 || !canClose()) return;
    const onHandle = !!e.target.closest('.sheet-handle, .sheet-title');
    if (!onHandle && dlg.scrollTop > 0) return;
    y0 = e.touches[0].clientY; t0 = performance.now(); dy = 0; active = true;
  }, { passive: true });
  dlg.addEventListener('touchmove', (e) => {
    if (!active) return;
    dy = e.touches[0].clientY - y0;
    if (!dragging) {
      if (dy < -8) { active = false; return; } // scrolling up: leave it to the sheet
      if (dy < 8) return; // a tap that wobbles a little is still a tap
      dragging = true;
    }
    e.preventDefault(); // the sheet follows the finger instead of scrolling
    dlg.style.transition = 'none';
    dlg.style.translate = `0 ${Math.max(0, dy - 8)}px`;
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
  dlg.addEventListener('touchend', end);
  dlg.addEventListener('touchcancel', end);
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
// Per device (outside "limber." so cloud save neither uploads nor removes it).
const SAFETY_KEY = 'fibbies.safety-seen';
dlgSafety.addEventListener('close', () => {
  try { localStorage.setItem(SAFETY_KEY, '1'); } catch { /* ignore */ }
  if (cloud.on) cloudSync(); // a startup pull waits while any dialog is open
});
function maybeShowSafety() {
  let seen = false;
  try { seen = !!localStorage.getItem(SAFETY_KEY); } catch { /* ignore */ }
  if (!seen && currentView === 'home' && !document.querySelector('dialog[open]')) openSafety();
}

// Number dialogs in the order they open, so Back can close the one on top.
let dialogSeq = 0;
const dialogWatch = new MutationObserver((ms) => ms.forEach((m) => { if (m.target.open) m.target.dataset.seq = String(++dialogSeq); }));
document.querySelectorAll('dialog').forEach((d) => dialogWatch.observe(d, { attributes: true, attributeFilter: ['open'] }));

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

// Backup code: copy all progress as text, or restore it on this phone (works without Google Play).
const dlgBackup = $('#dlg-backup');
$('#set-backup-copy').onclick = async () => {
  const code = makeBackupCode();
  let copied = false;
  try { await navigator.clipboard.writeText(code); copied = true; } catch { /* fall back to showing it */ }
  if (copied) { cloudMsgSet(t('backupCopied')); return; }
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
  cloud.touch(); // with cloud save on, the restored copy is what gets uploaded next
  try { sessionStorage.setItem('fibbies.restored-backup', '1'); } catch { /* ignore */ }
  location.reload();
};
// A short note in place of the backup row's subtitle (snackbars sit behind the open sheet).
function cloudMsgSet(text) {
  const el = $('#set-backup-copy small');
  el.textContent = text;
  clearTimeout(cloudMsgSet.t);
  cloudMsgSet.t = setTimeout(() => { el.textContent = t('backupCopySub'); }, 3500);
}

// ---------- Boot ----------
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
if (currentView === 'home') showLangHint();
window.__booted = true;
native.hideSplash();
try {
  if (sessionStorage.getItem('fibbies.restored')) { sessionStorage.removeItem('fibbies.restored'); setTimeout(() => snackbar(t('cloudRestored')), 600); }
  if (sessionStorage.getItem('fibbies.restored-backup')) { sessionStorage.removeItem('fibbies.restored-backup'); setTimeout(() => snackbar(t('backupDone')), 600); }
} catch { /* ignore */ }
if (cloud.on) cloudSync();
setTimeout(maybeShowSafety, 700);
native.onResume(() => { if (cloud.on) cloudSync(); });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (session && !session.finished && !session.paused) { session.pause(); setPausedUI(true); wakeLock.off(); }
  if (cloud.on) cloud.sync().catch(() => {});
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
