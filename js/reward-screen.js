// The end-of-session payoff: chest drop, open, count-up, multipliers, loot, XP.
import { TIERS, levelProgress, fmtBig } from './rewards.js';
import { critterSVG, chestSVG, esc, stars } from './critter.js';
import { fx, voiceGuide, haptics } from './audio.js';
import { t, getLang, numLocale } from './i18n.js';
import { createFx, raysCanvas, pillarCanvas, coreCanvas, flareCanvas } from './fx-canvas.js';

let numFmt = null; // one formatter per show (creating one every frame is slow)
const fmt = (n) => (numFmt || (numFmt = new Intl.NumberFormat(numLocale(), { maximumFractionDigits: 0 }))).format(Math.round(n));
const fmtX = (x) => new Intl.NumberFormat(numLocale(), { maximumFractionDigits: 2 }).format(x); // ×1,25 in most languages

// Taps to break the chest open: legendary holds out for one more.
const tapsFor = (tier) => (tier === 3 ? 4 : 3);

// Chest colours (the same as --tc / --tc2 in styles.css) and how big the show gets:
// each tier a clear step up: a gentle wooden show, then rare, epic, and legendary at full force.
const TIER_COLORS = [['#f2c14e', '#ff9f1c'], ['#5aa9e6', '#4cc9f0'], ['#b388ff', '#ff5fa2'], ['#ffd60a', '#ff5fa2']];
const POWER = [0.7, 1.7, 2.4, 3]; // wooden subtle ... legendary the full show
const RAINBOW = ['#ff5fa2', '#ffd60a', '#4cc9f0', '#5ee38f', '#b388ff'];

export function playReward(root, rw, { stats, onHome, onAgain }) {
  numFmt = null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fast = reduce;
  let alive = true;
  const timers = new Set();
  const waits = new Map(); // pending sleeps: Skip ends them at once
  // Once stopped, sleep never resolves, so the sequence halts at the next await.
  const sleep = (ms) => new Promise((res) => {
    if (!alive) return;
    const id = setTimeout(() => { timers.delete(id); waits.delete(id); res(); }, fast ? Math.min(ms, 30) : ms);
    timers.add(id);
    waits.set(id, res);
  });

  const TAPS = tapsFor(rw.tier);
  // The three tap calls ("Tap!", "Again!", "One more!") spread over however many taps it takes.
  const tapCall = (hits) => t('tapCalls')[TAPS === 4 ? [0, 1, 1, 2][hits] : hits] || '';
  root.innerHTML = `
    <div class="reward" data-tier="${rw.tier}">
      <div class="rw-bright" aria-hidden="true"></div>
      <div class="rw-light" aria-hidden="true"><div class="rw-beams"></div></div>
      <div class="rw-flash" aria-hidden="true"></div>
      <div class="rw-banner" aria-hidden="true"></div>
      <button class="rw-skip ripple" id="rw-skip"><span>${t('skip')}</span><span aria-hidden="true" class="ms">fast_forward</span></button>
      <div class="rw-inner">
        <div class="rw-tier">${TIERS[rw.tier].label}</div>
        <button class="rw-chest" aria-label="${t('openChest')}"><span class="rw-pillar" aria-hidden="true"></span>${chestSVG(rw.tier)}</button>
        <div class="rw-tap"><span aria-hidden="true" class="ms filled">touch_app</span><span class="rw-tap-txt">${tapCall(0)}</span><span class="rw-dots" aria-hidden="true">${'<i></i>'.repeat(TAPS)}</span></div>
        <div class="rw-count">
          <div class="rw-label">${t('fibersLabel')}</div>
          <div class="rw-big-wrap"><div class="rw-big">0</div></div>
          <div class="rw-mults"></div>
        </div>
        <div class="rw-loot"></div>
        <div class="rw-level">
          <div class="rw-lv-row">
            <span class="rw-lv" id="rw-lv">${t('lv', { n: rw.levelBefore })}</span>
            <div class="rw-bar"><i id="rw-fill"></i></div>
            <span class="rw-lv next" id="rw-lv-next">${t('lv', { n: rw.levelBefore + 1 })}</span>
          </div>
          <div class="rw-xp" id="rw-xp"></div>
        </div>
        <div class="rw-stats">${stats.map(([v, l]) => `<span><b>${esc(v)}</b>${esc(l)}</span>`).join('')}</div>
        <div class="rw-actions">
          <button class="rw-btn primary ripple" id="rw-home"><span aria-hidden="true" class="ms filled">check</span>${t('collect')}</button>
          <button class="rw-btn ripple" id="rw-again"><span aria-hidden="true" class="ms">replay</span>${t('again')}</button>
        </div>
      </div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const wrap = $('.reward');
  wrap.style.setProperty('--levelup-text', JSON.stringify(t('levelUp')));
  const big = $('.rw-big');
  const bigWrap = big.parentElement;
  const inner = $('.rw-inner');
  const P = POWER[rw.tier];
  /** A size for this chest from the [small, medium, big] it has at power 1, 2 and 3 (wooden goes below small). */
  const lv = (a, b, c) => Math.round(P <= 1 ? a * P : P <= 2 ? a + (b - a) * (P - 1) : b + (c - b) * (P - 2));
  const [tc, tc2] = TIER_COLORS[rw.tier];
  const legendary = rw.tier === 3;
  const fxAll = createFx(wrap, { colors: [tc, tc2], reduce });
  // After Skip the show races to the end: effects stay quiet instead of all firing at once.
  const vfx = Object.fromEntries(Object.entries(fxAll).map(([k, f]) => [k, k === 'stop' ? f : (...a) => { if (!fast) f(...a); }]));
  // Lighting: god rays (two layers turning opposite ways), a white-hot core behind the chest and a
  // lens-flare streak. All are small pre-drawn canvases that the graphics chip scales, spins and fades.
  const rayCount = Math.max(8, lv(14, 18, 22));
  const raysA = raysCanvas(legendary ? RAINBOW : [tc, tc, tc2], rayCount, { seed: rw.tier + 1 });
  const raysB = raysCanvas(legendary ? [...RAINBOW].reverse() : [tc2, '#ffffff', tc], Math.round(rayCount * 0.6), { soft: 1.6, seed: rw.tier + 7 });
  raysA.className = 'ray-a'; raysB.className = 'ray-b';
  $('.rw-beams').append(raysA, raysB);
  const core = coreCanvas(tc); core.className = 'rw-core';
  const flare = flareCanvas(legendary ? '#ffe680' : tc2); flare.className = 'rw-flare';
  $('.rw-light').append(core, flare);
  $('.rw-pillar').append(pillarCanvas(tc));
  wrap.dataset.power = ['0', '2', '3', '3'][rw.tier]; // light, rays and glow: wooden gentle, rare bright, epic and legendary full
  $('#rw-home').onclick = () => { stop(); onHome(); };
  // Taps never cut the show short; only this small Skip button does.
  let releaseTaps = null;
  let skipped = false;
  $('#rw-skip').onclick = () => {
    fast = true;
    skipped = true;
    $('#rw-skip').hidden = true;
    // Jump any one-off animation (shake, punch, glide, flare) to its end, so nothing is left
    // half-way; the endless ones (rays turning, glow breathing) keep going.
    for (const a of wrap.getAnimations({ subtree: true })) {
      if (a.effect?.getComputedTiming().iterations !== Infinity) { try { a.finish(); } catch {} }
    }
    // A wait already running (the burst playing out, say) ends now instead of finishing its time.
    for (const [id, res] of waits) { clearTimeout(id); timers.delete(id); res(); }
    waits.clear();
    releaseTaps?.();
  };
  // Start with the chest in the middle of the screen; it moves up once it opens.
  const tierEl = $('.rw-tier');
  const centerChest = (animate = true) => {
    if (wrap.classList.contains('collapse')) return;
    const wr = wrap.getBoundingClientRect();
    if (!wr.height) return;
    // Measure with transitions off, so the current margin is the one actually laid out.
    tierEl.style.transition = 'none';
    const cur = parseFloat(tierEl.style.marginTop) || 0;
    const c = $('.rw-chest').getBoundingClientRect();
    const mid = Math.max(0, wr.top) + Math.min(innerHeight, wr.height) / 2;
    tierEl.style.marginTop = `${Math.max(0, cur + mid - (c.top + c.height / 2) - 10)}px`;
    void tierEl.offsetWidth;
    if (animate) tierEl.style.transition = '';
    else requestAnimationFrame(() => { tierEl.style.transition = ''; });
  };
  const onResize = () => { centerChest(); chestAt = null; placeLight(); };
  addEventListener('resize', onResize);
  $('#rw-again').onclick = () => { stop(); onAgain(); };

  // Pause the jingle when the app goes to the background; resume if still counting.
  let musicWanted = false;
  const onVis = () => {
    if (document.hidden) fx.musicStop();
    else if (alive && musicWanted) fx.musicStart(rw.tier);
  };
  document.addEventListener('visibilitychange', onVis);

  function stop() {
    alive = false;
    musicWanted = false;
    document.removeEventListener('visibilitychange', onVis);
    removeEventListener('resize', onResize);
    releaseTaps?.();
    fx.musicStop();
    clearInterval(ambient);
    clearTimeout(snaps);
    for (const id of timers) clearTimeout(id);
    vfx.stop();
  }

  let ambient = null;
  let snaps = null;
  const PRAISE = t('praise');

  // Flash, shake and bump run as Web Animations on one element each: toggling classes on the
  // screen made the browser re-style everything under it on every hit.
  // Legendary: the whole screen gets brighter and brighter, step by step, from the charge to the loot,
  // the way the screen floods with light as a big chest opens in Vampire Survivors.
  let brightNow = 0;
  function brighten(to, ms) {
    if (!legendary || reduce || fast || to <= brightNow) return;
    $('.rw-bright').animate([{ opacity: brightNow }, { opacity: to }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    brightNow = to;
  }
  // Each multiplier makes it a little brighter still.
  const brightStep = () => brighten(Math.min(0.65, brightNow + 0.07), 500);

  function flash(strong = true) {
    if (reduce || fast) return;
    $('.rw-flash').animate([{ opacity: strong ? 0.95 : 0.35 }, { opacity: 0 }], { duration: strong ? 500 + P * 120 : 250, easing: 'ease-out' });
  }
  function shake(power = P) {
    if (reduce || fast) return;
    const a = 3 + power * 3;
    inner.animate([
      { transform: 'none' }, { transform: `translate(${-a}px, ${a / 2}px)` }, { transform: `translate(${a}px, ${-a * 0.6}px)` },
      { transform: `translate(${-a * 0.7}px, ${a * 0.6}px)` }, { transform: `translate(${a * 0.5}px, ${-a / 4}px)` }, { transform: 'none' },
    ], { duration: 220 + power * 70, easing: 'linear' });
  }
  /** Zoom punch for the big chests: the whole screen kicks toward you and settles. */
  function punch() {
    if (reduce || fast) return;
    inner.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)', offset: 0.25 }, { transform: 'scale(1)' }], { duration: 520, easing: 'ease-out', composite: 'add' });
  }
  /** The light reacts to a hit: the core flares up and the rays swell for a moment. */
  function lightPulse(k = 1) {
    if (reduce || fast) return;
    core.animate([{ transform: 'scale(1)' }, { transform: `scale(${1 + 0.25 * k})`, offset: 0.3 }, { transform: 'scale(1)' }], { duration: 450, easing: 'ease-out' });
    $('.rw-beams').animate([{ transform: 'scale(1)' }, { transform: `scale(${1 + 0.08 * k})`, offset: 0.3 }, { transform: 'scale(1)' }], { duration: 450, easing: 'ease-out' });
    if (P >= 1.5) flare.animate([{ opacity: 0.45 }, { opacity: 1, offset: 0.25 }, { opacity: 0.45 }], { duration: 450, easing: 'ease-out' });
  }
  /** Moves the light so it sits right behind the chest (after the chest shrinks). */
  function placeLight() {
    const c = chestPos();
    $('.rw-light').style.top = `${c.y - wrap.getBoundingClientRect().top}px`;
  }
  function bump() {
    if (reduce || fast) return;
    bigWrap.animate([{ transform: 'scale(1)' }, { transform: `scale(${1.12 + P * 0.05})`, offset: 0.4 }, { transform: 'scale(1)' }], { duration: 350, easing: 'ease-out' });
  }
  /** After the opening burst the chest glides up and shrinks, making room for the payout below.
   *  The layout changes in one step; a transform animation then slides it from where it was. */
  function moveUp() {
    const chest = $('.rw-chest');
    const light = $('.rw-light');
    const els = [tierEl, chest];
    const before = els.map((e) => e.getBoundingClientRect());
    const lightBefore = parseFloat(light.style.top) || 0;
    wrap.classList.add('collapse');
    tierEl.style.marginTop = '';
    chestAt = null;
    placeLight();
    if (fast || reduce) return;
    gliding = true; // the chest is measured with the glide included until it has landed
    const opts = { duration: 700, easing: 'cubic-bezier(.3,0,0,1)' };
    els.forEach((e, i) => {
      const b = before[i], a = e.getBoundingClientRect();
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      e.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${b.width / a.width})` }, { transform: 'none' }], opts);
    });
    const anim = light.animate([{ transform: `translateY(${lightBefore - (parseFloat(light.style.top) || 0)}px)` }, { transform: 'none' }], opts);
    anim.finished.catch(() => {}).finally(() => { gliding = false; chestAt = null; });
  }
  function stamp(text) {
    if (fast) return; // after Skip the praise banner would only cover the payout
    const b = $('.rw-banner');
    b.textContent = text;
    b.classList.remove('go');
    void b.offsetWidth;
    b.classList.add('go');
  }

  /** Centre of an element in viewport pixels (the effects canvas covers the viewport). */
  const centerOf = (el, dy = 0.5) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * dy }; };
  // Measuring forces a layout, so positions are cached while numbers count.
  let chestAt = null;
  let gliding = false;
  const chestPos = () => (gliding ? centerOf($('.rw-chest'), 0.45) : (chestAt ||= centerOf($('.rw-chest'), 0.45)));

  function setBig(v) { big.textContent = fmt(v); }
  function countTo(from, to, ms) {
    chestAt = null; // re-measure once per count, not on every particle
    return new Promise((res) => {
      if (fast || ms <= 0) { setBig(to); res(); return; }
      let t0 = null;
      let lastTick = 0;
      const step = (now) => {
        if (!alive) return res();
        if (t0 === null) t0 = now;
        const p = Math.max(0, Math.min(1, (now - t0) / ms));
        const e = 1 - Math.pow(1 - p, 3);
        setBig(from + (to - from) * e);
        if (now - lastTick > 55 && p < 1) {
          lastTick = now; fx.count(p); haptics.buzz(5);
          const c = chestPos();
          vfx.fountain(c.x, c.y, P + 1, P >= 1.5);
          if (P >= 1.5) vfx.twinkles(P - 1, 0.7);
        }
        if (p >= 1 || fast) { setBig(to); res(); } else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  async function run() {
    // The view may still be swapping in (view transition): wait until it has a size, then center.
    while (alive && !wrap.getBoundingClientRect().height) await new Promise((r) => requestAnimationFrame(r));
    if (!alive) return;
    centerChest(false);
    placeLight(); // the light sits behind the chest, also for the glow on each tap
    // 1. drop in
    wrap.classList.add('dropping');
    await sleep(420);
    if (!alive) return;
    fx.chestLand();
    haptics.buzz(40);
    await sleep(300);
    if (!alive) return;
    wrap.classList.remove('dropping'); // otherwise the drop animation replays when the halo stops
    wrap.classList.add('ready');

    // 2. the chest waits for a few taps: it jolts, cracks and the lid lifts a little each time.
    // A legendary chest can hardly hold itself together: rubber bands keep bursting above it,
    // quicker with every tap, until the last tap breaks it open.
    let hits = 0;
    const snapLoop = () => {
      if (!alive || fast) return;
      if (!document.hidden) {
        const c = $('.rw-chest').getBoundingClientRect();
        const top = Math.max(0, wrap.getBoundingClientRect().top) + 40;
        const bottom = Math.max(top + 40, c.top - 30);
        const w = Math.min(innerWidth, 520);
        const x = innerWidth / 2 + (Math.random() - 0.5) * w * 0.75;
        // The same rubber-band explosions as when a chest bursts open, only smaller.
        vfx.burst(x, top + Math.random() * (bottom - top), 14 + hits * 4, ['band', 'band', 'spark', 'star'], 0.8 + hits * 0.1);
      }
      snaps = setTimeout(snapLoop, Math.max(260, 620 - hits * 110) + Math.random() * 260);
    };
    if (legendary && !reduce) snapLoop();
    await new Promise((res) => {
      const chest = $('.rw-chest');
      const done = () => { chest.removeEventListener('click', onTap); releaseTaps = null; res(); };
      releaseTaps = done;
      if (skipped) { done(); return; }
      function onTap() {
        hits++;
        wrap.dataset.hits = String(hits);
        fx.knotTap(hits - 1); // the same "bloop" as tapping your Fibbie, a note higher each tap
        if (!reduce) core.animate([{ opacity: 0 }, { opacity: 0.25 + hits * 0.15, offset: 0.2 }, { opacity: 0 }], { duration: 500 });
        if (hits >= TAPS) { done(); return; }
        chest.classList.remove('hit');
        void chest.offsetWidth;
        chest.classList.add('hit');
        chest.addEventListener('animationend', () => chest.classList.remove('hit'), { once: true });
        haptics.buzz(30 + hits * 25);
        const c = centerOf(chest);
        vfx.burst(c.x, c.y, 5 + hits * 4 * P, ['spark', 'star', 'band'], 0.7);
        if (P >= 1.5) vfx.ring(c.x, c.y, { color: tc, speed: 500, width: 6, life: 0.35 });
        shake(1);
        $('.rw-tap-txt').textContent = tapCall(hits);
      }
      chest.addEventListener('click', onTap);
    });
    clearTimeout(snaps);
    if (!alive) return;

    // 3. charge up... then BOOM
    wrap.classList.add('opening');
    fx.charge();
    haptics.buzz([15, 40, 15, 40, 15, 30, 15, 20, 15, 15, 40]);
    // Light swirls in and gets sucked into the chest: longer and denser for better chests.
    const chargeMs = lv(950, 1150, 1400);
    brighten(0.22, chargeMs);
    { const c = centerOf($('.rw-chest')); vfx.implode(c.x, c.y, lv(18, 45, 90), chargeMs); }
    await sleep(chargeMs);
    if (!alive) return;
    flash();
    brighten(0.38, 400);
    // The chest bursts open where it stands, in the middle of the screen; it moves up afterwards.
    wrap.classList.add('opened', 'party');
    fx.boom();
    fx.open();
    haptics.buzz(160);
    shake();
    if (P >= 2.2) punch();
    if (P >= 1.5 && !reduce) {
      // Lens flare: a streak that shoots out sideways and then glows on, dimmer.
      flare.animate([
        { transform: 'scaleX(0)', opacity: 1 }, { transform: `scaleX(${P >= 2.2 ? 1.5 : 1.15})`, opacity: 1, offset: 0.35 }, { transform: 'scaleX(1)', opacity: 0.45 },
      ], { duration: 700, easing: 'ease-out', fill: 'forwards' });
    }
    {
      const c = chestPos();
      vfx.ring(c.x, c.y, { color: '#fff', speed: 1100, width: 12 + P * 4, life: 0.5 + P * 0.08 });
      if (P >= 1.5) vfx.ring(c.x, c.y, { color: tc, speed: 750, width: 10, life: 0.75 });
      if (P >= 2.2) vfx.ring(c.x, c.y, { color: tc2, speed: 450, width: 8, life: 1 });
      vfx.burst(c.x, c.y, lv(40, 80, 130), P >= 1.5 ? ['band', 'star', 'spark', 'fiber', 'gem'] : ['band', 'star', 'spark', 'fiber'], 0.9 + P * 0.15);
      vfx.fountain(c.x, c.y, lv(16, 28, 45), P >= 1.5);
      if (P >= 2.2) {
        // Epic and legendary: a second blast a moment later.
        const id = setTimeout(() => {
          timers.delete(id);
          if (!alive || fast) return;
          flash(false); shake(2); fx.pop(); lightPulse(1.4);
          vfx.ring(c.x, c.y, { color: '#fff', speed: 1300, width: 10, life: 0.6 });
          vfx.burst(c.x, c.y, 70, ['band', 'fiber', 'gem', 'spark'], 1.3);
        }, 320);
        timers.add(id);
      }
    }
    voiceGuide.say(t('say.chest', { name: getLang() === 'en' ? TIERS[rw.tier].name : TIERS[rw.tier].label }));
    musicWanted = true;
    fx.musicStart(rw.tier);

    // Let the burst play out in the middle, then glide up to make room for the payout.
    await sleep(lv(1000, 1200, 1400));
    if (!alive) return;
    moveUp();
    await sleep(380);
    if (!alive) return;
    wrap.classList.add('show-count');
    brighten(0.45, 1500);
    await countTo(0, rw.base, 1500);
    if (!alive) return;

    // 4. multipliers
    const ml = $('.rw-mults');
    for (let i = 0; i < rw.mults.length; i++) {
      if (!alive) return;
      const m = rw.mults[i];
      await sleep(260);
      if (!alive) return;
      const pill = document.createElement('div');
      pill.className = `rw-mult${m.hot ? ' hot' : ''}`;
      pill.innerHTML = `<span aria-hidden="true" class="ms filled">${m.icon}</span>${esc(m.label)}<b>×${fmtX(m.x)}</b>`;
      ml.appendChild(pill);
      brightStep();
      fx.slam(m.hot);
      haptics.buzz(m.hot ? [40, 30, 80] : 60);
      shake(m.hot ? P + 1 : P);
      flash(false);
      bump();
      lightPulse(m.hot ? 1.2 : 0.7);
      {
        const b = centerOf(pill);
        vfx.ring(b.x, b.y, { color: m.hot ? '#ff9f1c' : tc, speed: 420 + P * 120, width: 6, life: 0.4 });
        vfx.burst(b.x, b.y, (m.hot ? 14 : 8) * P, ['spark', 'star', 'band'], 0.6);
        const c = chestPos();
        vfx.fountain(c.x, c.y, (m.hot ? 10 : 5) * P, P >= 1.5);
      }
      await countTo(rw.steps[i], rw.steps[i + 1], 650);
      if (!alive) return;
    }

    // 5. total
    await sleep(200);
    if (!alive) return;
    big.parentElement.classList.add('final');
    brighten(0.7, 900);
    musicWanted = false;
    fx.musicStop();
    fx.fanfare();
    fx.coins();
    flash();
    lightPulse(1.5);
    {
      const b = centerOf(bigWrap);
      vfx.ring(b.x, b.y, { color: '#fff', speed: 900, width: 10 + P * 3, life: 0.5 });
      vfx.burst(b.x, b.y, lv(30, 55, 90), ['band', 'spark', 'star', 'fiber'], 1);
      // Loot from all around flies into the total, some pieces landing with a little spark.
      vfx.magnet(b.x, b.y, lv(10, 26, 44));
      const c = chestPos();
      vfx.fountain(c.x, c.y, lv(20, 26, 30), P >= 1.5);
      if (P >= 1.5) vfx.rain(lv(0, 24, 40));
      vfx.rockets(lv(2, 4, 7));
      vfx.twinkles(P * 6);
      if (P >= 2.2) {
        punch();
        const id = setTimeout(() => { timers.delete(id); if (alive && !fast) { vfx.rockets(5); vfx.twinkles(20); } }, 1300);
        timers.add(id);
      }
    }
    stamp(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    haptics.buzz([30, 30, 60, 30, 120]);
    await sleep(900);
    if (!alive) return;

    // 6. loot
    await sleep(650);
    if (!alive) return;
    const f = rw.fibbie;
    const loot = $('.rw-loot');
    // A shy Fibbie arrives like any other, with its name and everything; only then does it look
    // around and bolt off the screen so fast that rubber bands pop up in its wake.
    const ran = rw.ranAway;
    const copies = rw.copies + (ran ? 1 : 0); // as it would have been, had it stayed
    loot.innerHTML = `
      <div class="rw-card${ran ? ' runaway' : ''}" data-rarity="${f.rarity}">
        <div class="rw-critter">${ran ? `<div class="rw-runner">${critterSVG(f)}</div>` : critterSVG(f)}</div>
        <div class="rw-card-text">
          <span class="rw-new">${rw.isNew ? t('newFriend') : t('dupe', { n: copies })}</span>
          <b>${esc(f.name)}</b>
          <span class="rw-rarity">${t('rarity')[f.rarity]}</span>${stars(f.stage, false)}
          <small${!ran && copies >= 2 ? ' class="rw-merge"' : ''}>${esc(!ran && copies >= 2 ? t('mergeHint') : f.blurb)}</small>
        </div>
      </div>`;
    wrap.classList.add('show-loot');
    brighten(0.85, 1200);
    fx.boing();
    haptics.buzz(50);
    { const l = centerOf(loot.querySelector('.rw-critter') || loot); vfx.burst(l.x, l.y, 10 + P * 6, ['heart', 'star', 'spark'], 0.6); }
    if (!ran) {
      voiceGuide.say(rw.isNew ? t('say.newFriend', { name: f.name }) : t('say.copy', { name: f.name }), { interrupt: false, alt: t(rw.isNew ? 'say.newFriendAny' : 'say.copyAny') });
    } else {
      const card = loot.querySelector('.rw-card');
      const runner = loot.querySelector('.rw-runner');
      await sleep(1200);
      if (!alive) return;
      if (!fast) {
        runner.classList.add('look'); // glances left, right, then crouches
        await sleep(1000);
        if (!alive) return;
      }
      if (!fast) { // Skip may have come during the look: then it is simply gone
        const from = centerOf(runner, 0.6);
        runner.classList.add('dash');
        fx.runAway();
        haptics.buzz([20, 30, 20, 30, 60]);
        // Rubber bands spring up along its path as it accelerates away.
        const to = innerWidth + 60;
        for (let i = 0; i <= 9; i++) {
          const id = setTimeout(() => {
            timers.delete(id);
            if (!alive) return;
            const k = i / 9;
            vfx.burst(from.x + (to - from.x) * k * k, from.y + (Math.random() - 0.5) * 18, i < 2 ? 4 : 2, ['band', 'band', 'spark'], 0.35);
          }, 120 + i * 40);
          timers.add(id);
        }
        await sleep(700);
        if (!alive) return;
      }
      card.classList.add('gone');
      voiceGuide.say(t('say.ranAway', { name: f.name }), { interrupt: false, alt: t('say.ranAwayAny') });
    }

    // 7. XP bar (can cross several levels)
    await sleep(700);
    if (!alive) return;
    wrap.classList.add('show-level');
    await animateXP();
    if (!alive) return;

    await sleep(200);
    if (!alive) return;
    wrap.classList.add('done');
    $('#rw-skip').hidden = true;
    chestAt = null; placeLight(); // in case anything moved while the show raced through
    if (!reduce) ambient = setInterval(() => { if (alive && !document.hidden) { vfx.embers(1); if (P >= 2.2) vfx.twinkles(1, 0.6); } }, 450);
    const act = $('.rw-actions');
    if (act.getBoundingClientRect().bottom > innerHeight) act.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }

  async function animateXP() {
    const fill = $('#rw-fill');
    let xp = rw.xpBefore;
    const end = rw.xpAfter;
    const show = (v) => {
      const p = levelProgress(v);
      fill.style.transform = `scaleX(${Math.min(1, p.frac)})`;
      $('#rw-lv').textContent = t('lv', { n: p.level });
      $('#rw-lv-next').textContent = t('lv', { n: p.level + 1 });
      $('#rw-xp').textContent = `${fmtBig(p.into)} / ${fmtBig(p.need)} XP`;
    };
    show(xp);
    let guard = 0;
    while (xp < end && alive && guard++ < 50) {
      const p = levelProgress(xp);
      const levelEnd = xp - p.into + p.need;
      const target = Math.min(end, levelEnd);
      await tween(xp, target, fast ? 0 : 700, show);
      if (!alive) return;
      xp = target;
      if (xp >= levelEnd) {
        fx.levelUp();
        haptics.buzz([50, 50, 120]);
        const lv = $('.rw-level');
        lv.classList.remove('levelup');
        void lv.offsetWidth;
        lv.classList.add('levelup');
        { const l = centerOf($('#rw-lv-next')); vfx.burst(l.x, l.y, 14 + P * 6, ['star', 'spark', 'band'], 0.6); vfx.ring(l.x, l.y, { color: '#ffd60a', speed: 400, width: 6, life: 0.4 }); }
        voiceGuide.say(t('say.levelUp', { n: levelProgress(xp).level }), { interrupt: false, alt: t('say.levelUpAny') });
        show(xp);
        await sleep(650);
        if (!alive) return;
      }
    }
    show(end);
  }

  function tween(from, to, ms, cb) {
    return new Promise((res) => {
      if (ms <= 0) { cb(to); res(); return; }
      let t0 = null;
      const step = (now) => {
        if (t0 === null) t0 = now;
        const p = Math.max(0, Math.min(1, (now - t0) / ms));
        cb(from + (to - from) * (1 - Math.pow(1 - p, 2)));
        if (p >= 1 || fast || !alive) { cb(to); res(); } else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  run();
  return { stop };
}
