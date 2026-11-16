import { STRETCHES, CATEGORIES, ROUTINES, routineSeconds, buildTimeline, sideLabel } from './data.js';
import { Figure } from './figure.js';
import { unlockAudio, sfx, voiceGuide, haptics } from './audio.js';
import { wakeLock } from './wakelock.js';
import { Session } from './session.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Storage ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};
const settings = Object.assign(
  { voice: true, sound: true, haptics: true, scale: 1, mode: 'system', hue: 165 },
  store.get('limber.settings', {}),
);
let log = store.get('limber.history', []);
const saveSettings = () => store.set('limber.settings', settings);

function applySettings() {
  voiceGuide.enabled = settings.voice;
  sfx.enabled = settings.sound;
  haptics.enabled = settings.haptics;
  const root = document.documentElement;
  root.style.setProperty('--h', settings.hue);
  if (settings.mode === 'system') delete root.dataset.theme;
  else root.dataset.theme = settings.mode;
  requestAnimationFrame(updateThemeColor);
}

function updateThemeColor() {
  // Resolve the surface color to rgb for <meta name="theme-color">
  const view = $('.view.active');
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
let animClock = 0;
let lastFrame = performance.now();
function frame(ts) {
  const dt = Math.min(0.1, (ts - lastFrame) / 1000);
  lastFrame = ts;
  for (const a of animated) {
    if (!a.fig.svg.isConnected) { animated.delete(a); continue; }
    if (a.paused?.()) continue;
    a.time += dt * (a.speed || 1);
    a.fig.animate(a.time);
  }
  animClock += dt;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
function animate(fig, opts = {}) {
  const a = { fig, time: opts.offset || 0, ...opts };
  animated.add(a);
  return a;
}

function streak() {
  const days = new Set(log.map((h) => h.day));
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
function show(name) {
  const swap = () => {
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === name));
    currentView = name;
    if (name !== 'player') window.scrollTo(0, 0);
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
let activeCat = store.get('limber.cat', 'all');

function suggestion() {
  const h = new Date().getHours();
  if (h < 11) return { r: routineById('dynamic-warmup'), why: 'Morning run? Warm up first' };
  if (h < 16) return { r: routineById('five-minute-fix'), why: 'A quick midday reset' };
  if (h < 20) return { r: routineById('post-run-reset'), why: 'Just finished a run?' };
  return { r: routineById('evening-unwind'), why: 'Wind down for the night' };
}

function renderHome() {
  const h = new Date().getHours();
  $('#greeting').textContent = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const st = streak();
  $('#greeting-sub').textContent = st > 1 ? `${st} days in a row. Keep it going!` : 'Ready to loosen up?';

  // Week strip
  const days = new Set(log.map((x) => x.day));
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  let dots = '';
  let weekCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const k = dayKey(d);
    const done = days.has(k);
    if (done) weekCount++;
    dots += `<div class="wd${done ? ' done' : ''}${k === dayKey(today) ? ' today' : ''}"><span>${letters[i]}</span><i>${done ? '<span class="ms">check</span>' : ''}</i></div>`;
  }
  $('#week-card').innerHTML = `
    <div class="streak">
      <div class="streak-icon"><span class="ms filled">local_fire_department</span></div>
      <div><b>${st} day${st === 1 ? '' : 's'}</b><small>${weekCount} this week</small></div>
    </div>
    <div class="week-dots" aria-label="This week">${dots}</div>`;

  // Hero
  const { r, why } = suggestion();
  const hero = $('#hero');
  hero.innerHTML = `
    <button class="hero ripple" data-hue style="--h:${r.hue}" data-open="${r.id}">
      <div class="hero-body">
        <span class="hero-kicker"><span class="ms filled">${r.icon}</span>${esc(why)}</span>
        <span class="hero-title">${esc(r.title)}</span>
        <span class="hero-meta">${minutes(r)} min · ${r.items.length} stretches</span>
        <span class="hero-play"><span class="ms filled">play_arrow</span>Start</span>
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

  // Chips
  $('#chips').innerHTML = CATEGORIES.map((c) => `
    <button class="chip ripple" role="tab" aria-selected="${c.id === activeCat}" data-cat="${c.id}">
      <span class="ms">${c.id === activeCat ? 'check' : c.icon}</span>${c.label}
    </button>`).join('');

  renderList();
}

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
        <div class="rc-meta"><span class="rc-cat">${catOf(r.cat).label}</span>· ${r.items.length} stretches</div>
      </div>
      <div class="rc-dur">${minutes(r)}<small>min</small></div>`;
    b.querySelector('.rc-thumb').appendChild(staticFig(heroStretch(r), 0.6));
    list.appendChild(b);
  }
}

$('#chips').addEventListener('click', (e) => {
  const c = e.target.closest('[data-cat]');
  if (!c) return;
  activeCat = c.dataset.cat;
  store.set('limber.cat', activeCat);
  document.querySelectorAll('#chips .chip').forEach((ch) => {
    const on = ch.dataset.cat === activeCat;
    ch.setAttribute('aria-selected', on);
    ch.querySelector('.ms').textContent = on ? 'check' : catOf(ch.dataset.cat).icon;
  });
  renderList();
});

document.addEventListener('click', (e) => {
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
      <button class="icon-btn ripple" id="dt-back" aria-label="Back"><span class="ms">arrow_back</span></button>
      <button class="icon-btn ripple" id="dt-settings" aria-label="Settings"><span class="ms">tune</span></button>
    </div>
    <div class="detail-hero">
      <div class="kicker"><span class="ms filled">${r.icon}</span>${catOf(r.cat).label}</div>
      <h1>${esc(r.title)}</h1>
      <p>${esc(r.blurb)}</p>
      <div class="detail-stats">
        <span class="stat-pill"><span class="ms">schedule</span>${fmtTime(total)}</span>
        <span class="stat-pill"><span class="ms">format_list_bulleted</span>${r.items.length} stretches</span>
        ${moves.some((m) => m.side) ? '<span class="stat-pill"><span class="ms">swap_horiz</span>Both sides</span>' : ''}
      </div>
      <div class="detail-fig"></div>
    </div>
    <div class="detail-tip"><span class="ms">volume_up</span><span>Turn your sound on. Voice cues tell you what's next and when to switch sides, so you don't need to watch the screen.</span></div>
    <div class="move-list"><h3>What you'll do</h3></div>
    <div class="start-bar">
      <button class="fab-ext ripple" id="dt-start"><span class="ms filled">play_arrow</span>Start · ${minutes(r)} min</button>
    </div>`;
  const df = new Figure(firstStretch(r));
  v.querySelector('.detail-fig').appendChild(df.svg);
  animate(df);
  const ml = v.querySelector('.move-list');
  for (const [id, secs] of r.items) {
    const s = STRETCHES[id];
    const d = Math.max(10, Math.round(secs * settings.scale));
    const row = document.createElement('div');
    row.className = 'move-row';
    row.innerHTML = `
      <div class="mr-thumb"></div>
      <div><div class="mr-name">${esc(s.name)}</div><div class="mr-target">${esc(s.target)}</div></div>
      <div class="mr-time">${d}s${s.sided ? '<small>each side</small>' : s.dynamic ? '<small>moving</small>' : '<small>hold</small>'}</div>`;
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
  if (st.kind === 'prep') badge.textContent = 'Get ready';
  else if (st.kind === 'rest') badge.textContent = st.switchSides ? 'Switch sides' : 'Up next';
  else badge.textContent = stretch.dynamic ? 'Keep moving' : 'Hold';
  const side = $('#pl-side');
  if (move.side) {
    side.hidden = false;
    side.innerHTML = `<span class="ms">${move.side === 'L' ? 'west' : 'east'}</span>${sideLabel(move)}`;
  } else side.hidden = true;
  $('#pl-target').textContent = st.kind === 'hold' ? stretch.target : st.kind === 'prep' ? 'First up' : st.switchSides ? 'Other side' : 'Next up';
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
    un.innerHTML = `<div class="un-thumb"></div><span>Next: <b>${esc(nextMove.stretch.name)}</b>${nextMove.side ? ' · ' + sideLabel(nextMove) : ''}</span><span class="un-time">${nextMove.secs}s</span>`;
    nextFig = staticFig(nextMove.stretch, 0.5, { mirror: nextMove.side === 'R' });
    un.querySelector('.un-thumb').appendChild(nextFig);
  } else if (st.kind === 'hold') {
    un.innerHTML = '<span class="ms filled" style="color:var(--primary);margin-left:8px">flag</span><span><b>Last one!</b> Finish strong.</span>';
  } else {
    un.innerHTML = `<span class="ms" style="margin-left:8px">timer</span><span>${esc(move.stretch.target)}</span><span class="un-time">${move.secs}s</span>`;
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
  $('#pl-play').setAttribute('aria-label', p ? 'Resume' : 'Pause');
}

$('#pl-play').onclick = () => {
  if (!session) return;
  unlockAudio();
  session.toggle();
  setPausedUI(session.paused);
  if (!session.paused) wakeLock.on();
};
$('#pl-stage').addEventListener('click', () => $('#pl-play').click());
$('#pl-next').onclick = () => session?.next();
$('#pl-prev').onclick = () => session?.prev();
$('#pl-close').onclick = () => confirmEnd();
$('#pl-sound').onclick = openSettings;

wakeLock.onChange((on) => { $('#pl-awake').hidden = !on; });

function setSoundIcon() {
  $('#pl-sound .ms').textContent = !settings.sound && !settings.voice ? 'volume_off' : settings.voice ? 'record_voice_over' : 'volume_up';
}

const dlgEnd = $('#dlg-end');
function confirmEnd() {
  if (dlgEnd.open) return;
  if (!session || session.finished) { leavePlayer(); return; }
  const wasPaused = session.paused;
  session.pause();
  setPausedUI(true);
  dlgEnd.showModal();
  dlgEnd.onclose = () => {
    if (dlgEnd.returnValue === 'end') leavePlayer();
    else if (!wasPaused) { session.resume(); setPausedUI(false); }
    dlgEnd.returnValue = '';
  };
}
$('#dlg-keep').onclick = () => dlgEnd.close('keep');
$('#dlg-end-ok').onclick = () => dlgEnd.close('end');

function leavePlayer() {
  clearTimeout(doneTimer);
  session?.destroy();
  session = null;
  wakeLock.off();
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

// ---------- Done ----------
let lastResult = null;
let doneTimer = null;
function finish(s) {
  const secs = Math.round(s.activeSeconds());
  log.push({ day: dayKey(), id: s.routine.id, secs, at: Date.now() });
  log = log.slice(-500);
  store.set("limber.history", log);
  lastResult = { routine: s.routine, secs, moves: s.routine.items.length };
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
  if (!res) { replace('#/'); return; }
  const r = res.routine;
  v.dataset.hue = '';
  v.style.setProperty('--h', r.hue);
  const st = streak();
  const blob = 'M100 6 C116 6 124 22 138 26 C152 30 170 26 178 40 C186 54 176 70 180 84 C184 98 196 108 194 122 C192 136 176 144 170 158 C164 172 166 190 152 196 C138 202 124 190 110 192 C96 194 82 206 68 200 C54 194 50 176 38 168 C26 160 8 156 6 140 C4 124 18 112 16 98 C14 84 2 70 8 56 C14 42 32 40 44 30 C56 20 64 6 80 6 C88 6 94 6 100 6Z';
  v.innerHTML = `
    <div class="done-wrap">
      <div class="done-badge"><svg viewBox="0 0 200 200"><path d="${blob}"/></svg><span class="ms filled">check</span></div>
      <h1>Nice work!</h1>
      <p>${esc(r.title)} complete. Your legs thank you.</p>
      <div class="done-stats">
        <div class="done-stat"><b>${fmtTime(res.secs)}</b><small>active time</small></div>
        <div class="done-stat"><b>${res.moves}</b><small>stretches</small></div>
        <div class="done-stat"><b>${st}</b><small>day streak</small></div>
      </div>
      <div class="done-actions">
        <button class="btn filled ripple" id="dn-home"><span class="ms">home</span>Back home</button>
        <button class="btn tonal ripple" id="dn-again"><span class="ms">replay</span>Do it again</button>
      </div>
    </div>`;
  $('#dn-home').onclick = () => { replace('#/'); };
  $('#dn-again').onclick = () => { unlockAudio(); wakeLock.on(); pendingStart = r.id; replace(`#/play/${r.id}`); };
  confetti();
}

function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('div');
  c.className = 'confetti';
  const cs = getComputedStyle($('#view-done'));
  const colors = ['--primary', '--tertiary', '--primary-container', '--tertiary-container', '--secondary'].map((k) => cs.getPropertyValue(k));
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
    p.style.setProperty('--r', `${Math.random() * 900 - 450}deg`);
    p.style.animationDuration = `${2.2 + Math.random() * 1.8}s`;
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    if (i % 3 === 0) p.style.borderRadius = '50%';
    c.appendChild(p);
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 5000);
}

// ---------- Settings sheet ----------
const sheet = $('#sheet-settings');
const HUES = [165, 235, 290, 15, 45, 130, 200, 340];
function openSettings() {
  $('#set-voice').checked = settings.voice;
  $('#set-sound').checked = settings.sound;
  $('#set-haptics').checked = settings.haptics;
  syncSeg('#set-scale', String(settings.scale));
  syncSeg('#set-mode', settings.mode);
  $('#set-hue').innerHTML = HUES.map((h) => `<button class="swatch" data-hue style="--h:${h}" data-v="${h}" role="radio" aria-checked="${h === settings.hue}" aria-label="Color ${h}"></button>`).join('');
  sheet.showModal();
}
function syncSeg(sel, val) {
  document.querySelectorAll(`${sel} button`).forEach((b) => b.setAttribute('aria-checked', b.dataset.v === val));
}
$('#btn-settings').onclick = openSettings;
$('#set-close').onclick = () => sheet.close();
sheet.addEventListener('click', (e) => {
  if (e.target !== sheet) return;
  const r = sheet.getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (!inside) sheet.close();
});
sheet.addEventListener('close', () => {
  setSoundIcon();
  if (currentView === 'home') renderHome();
  else if (currentView === 'detail') route();
});
$('#set-voice').onchange = (e) => {
  settings.voice = e.target.checked; saveSettings(); applySettings();
  if (settings.voice) { unlockAudio(); voiceGuide.say('Voice guidance on.'); } else voiceGuide.stop();
};
$('#set-sound').onchange = (e) => { settings.sound = e.target.checked; saveSettings(); applySettings(); if (settings.sound) { unlockAudio(); sfx.go(); } };
$('#set-haptics').onchange = (e) => { settings.haptics = e.target.checked; saveSettings(); applySettings(); haptics.buzz(40); };
$('#set-scale').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return;
  settings.scale = Number(b.dataset.v); saveSettings(); syncSeg('#set-scale', b.dataset.v);
  if (session && !session.finished) snackbar('Hold length applies from your next session');
};
$('#set-mode').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return;
  settings.mode = b.dataset.v; saveSettings(); applySettings(); syncSeg('#set-mode', b.dataset.v);
};
$('#set-hue').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return;
  settings.hue = Number(b.dataset.v); saveSettings(); applySettings();
  document.querySelectorAll('#set-hue .swatch').forEach((s) => s.setAttribute('aria-checked', s === b));
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
window.addEventListener('popstate', route);
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

  if (view === 'r' && routineById(id)) {
    if (session) { session.destroy(); session = null; wakeLock.off(); }
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
    if (session) { session.destroy(); session = null; wakeLock.off(); }
    renderHome();
    show('home');
  }
}

// ---------- Boot ----------
applySettings();
setSoundIcon();
route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
