// The end-of-session payoff: chest drop, open, count-up, multipliers, loot, XP.
import { TIERS, levelProgress, fmtBig } from './rewards.js';
import { critterSVG, chestSVG } from './critter.js';
import { fx, voiceGuide, haptics } from './audio.js';
import { t, getLang, numLocale } from './i18n.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Math.round(n).toLocaleString(numLocale());

const TAPS = 3; // taps to break the chest open
const stars = (n) => `<span class="stars">${'★'.repeat(n)}<i>${'★'.repeat(4 - n)}</i></span>`;

export function playReward(root, rw, { stats, onHome, onAgain }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fast = reduce;
  let alive = true;
  const timers = new Set();
  // Once stopped, sleep never resolves, so the sequence halts at the next await.
  const sleep = (ms) => new Promise((res) => {
    if (!alive) return;
    const id = setTimeout(() => { timers.delete(id); res(); }, fast ? Math.min(ms, 30) : ms);
    timers.add(id);
  });

  root.innerHTML = `
    <div class="reward" data-tier="${rw.tier}">
      <div class="rw-beams" aria-hidden="true"></div>
      <div class="rw-fx" aria-hidden="true"></div>
      <div class="rw-flash" aria-hidden="true"></div>
      <div class="rw-banner" aria-hidden="true"></div>
      <button class="rw-skip" id="rw-skip"><span>${t('skip')}</span><span class="ms">fast_forward</span></button>
      <div class="rw-inner">
        <div class="rw-tier">${TIERS[rw.tier].label}</div>
        <button class="rw-chest" aria-label="${t('openChest')}"><span class="rw-pillar" aria-hidden="true"></span>${chestSVG(rw.tier)}</button>
        <div class="rw-tap"><span class="ms filled">touch_app</span><span class="rw-tap-txt">${t('tapCalls')[0]}</span><span class="rw-dots" aria-hidden="true">${'<i></i>'.repeat(TAPS)}</span></div>
        <div class="rw-count">
          <div class="rw-label">${t('fibersLabel')}</div>
          <div class="rw-big" aria-live="polite">0</div>
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
          <button class="rw-btn primary ripple" id="rw-home"><span class="ms filled">check</span>${t('collect')}</button>
          <button class="rw-btn ripple" id="rw-again"><span class="ms">replay</span>${t('again')}</button>
        </div>
      </div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const wrap = $('.reward');
  wrap.style.setProperty('--levelup-text', JSON.stringify(t('levelUp')));
  const big = $('.rw-big');
  const fxLayer = $('.rw-fx');
  $('#rw-home').onclick = () => { stop(); onHome(); };
  // Taps never cut the show short; only this small Skip button does.
  let releaseTaps = null;
  let skipped = false;
  $('#rw-skip').onclick = () => {
    fast = true;
    skipped = true;
    $('#rw-skip').hidden = true;
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
  const onResize = () => centerChest();
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
    for (const id of timers) clearTimeout(id);
  }

  let ambient = null;
  const PRAISE = t('praise');

  function flash(strong = true) {
    if (reduce) return;
    const f = $('.rw-flash');
    f.classList.remove('go', 'soft');
    void f.offsetWidth;
    f.classList.add('go');
    if (!strong) f.classList.add('soft');
  }

  /** Coins arc up out of the chest and rain down past the bottom of the screen. */
  const MAX_PARTICLES = 80; // keeps low-end phones smooth
  const room = (n) => Math.max(0, Math.min(n, MAX_PARTICLES - fxLayer.childElementCount));

  function fountain(n) {
    if (reduce) return;
    n = room(n);
    if (!n) return;
    const fr = $('.rw-chest').getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    const cx = fr.left + fr.width / 2 - wr.left;
    const cy = fr.top + fr.height * 0.45 - wr.top;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = `pt fall ${Math.random() < 0.75 ? 'coin' : Math.random() < 0.5 ? 'star' : 'gem'}`;
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.setProperty('--tx', `${(Math.random() - 0.5) * wr.width * 1.1}px`);
      p.style.setProperty('--peak', `${-60 - Math.random() * 140}px`);
      p.style.setProperty('--fall', `${wr.height - cy + 40}px`);
      p.style.setProperty('--r', `${Math.random() * 1080 - 540}deg`);
      p.style.setProperty('--s', `${0.7 + Math.random() * 0.8}`);
      p.style.animationDuration = `${1.3 + Math.random() * 0.9}s`;
      fxLayer.appendChild(p);
      setTimeout(() => p.remove(), 2400);
    }
  }

  function fireworks(count) {
    if (reduce) return;
    const wr = wrap.getBoundingClientRect();
    for (let k = 0; k < count; k++) {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!alive) return;
        const x = wr.width * (0.15 + Math.random() * 0.7);
        const y = wr.height * (0.12 + Math.random() * 0.35);
        const hue = Math.floor(Math.random() * 360);
        const sparks = Math.max(6, room(14));
        for (let i = 0; i < sparks; i++) {
          const p = document.createElement('i');
          p.className = 'pt spark fw';
          const ang = (i / sparks) * Math.PI * 2;
          const d = 70 + Math.random() * 50;
          p.style.left = `${x}px`;
          p.style.top = `${y}px`;
          p.style.background = `hsl(${hue + Math.random() * 60} 100% 65%)`;
          p.style.boxShadow = `0 0 10px hsl(${hue} 100% 65%)`;
          p.style.setProperty('--tx', `${Math.cos(ang) * d}px`);
          p.style.setProperty('--ty', `${Math.sin(ang) * d}px`);
          p.style.setProperty('--r', '0deg');
          p.style.setProperty('--s', '1');
          p.style.animationDuration = `${0.9 + Math.random() * 0.4}s`;
          fxLayer.appendChild(p);
          setTimeout(() => p.remove(), 1500);
        }
        fx.pop();
      }, k * 380);
      timers.add(id);
    }
  }

  function stamp(text) {
    const b = $('.rw-banner');
    b.textContent = text;
    b.classList.remove('go');
    void b.offsetWidth;
    b.classList.add('go');
  }

  // ---- particles ----
  function burst(fromEl, n, kinds = ['coin', 'star', 'spark']) {
    if (reduce) return;
    n = room(n);
    if (!n) return;
    const fr = fromEl.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    const cx = fr.left + fr.width / 2 - wr.left;
    const cy = fr.top + fr.height / 2 - wr.top;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = `pt ${kinds[i % kinds.length]}`;
      const ang = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 220;
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.setProperty('--tx', `${Math.cos(ang) * dist}px`);
      p.style.setProperty('--ty', `${Math.sin(ang) * dist - 60}px`);
      p.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
      p.style.setProperty('--s', `${0.6 + Math.random() * 0.9}`);
      p.style.animationDuration = `${0.8 + Math.random() * 0.7}s`;
      fxLayer.appendChild(p);
      setTimeout(() => p.remove(), 1700);
    }
  }

  function shake() {
    if (reduce) return;
    wrap.classList.remove('shake');
    void wrap.offsetWidth;
    wrap.classList.add('shake');
  }

  function countTo(from, to, ms) {
    return new Promise((res) => {
      if (fast || ms <= 0) { big.textContent = fmt(to); res(); return; }
      let t0 = null;
      let lastTick = 0;
      const step = (now) => {
        if (!alive) return res();
        if (t0 === null) t0 = now;
        const p = Math.max(0, Math.min(1, (now - t0) / ms));
        const e = 1 - Math.pow(1 - p, 3);
        big.textContent = fmt(from + (to - from) * e);
        if (now - lastTick > 55 && p < 1) { lastTick = now; fx.count(p); haptics.buzz(5); fountain(2); }
        if (p >= 1 || fast) { big.textContent = fmt(to); res(); } else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  async function run() {
    // The view may still be swapping in (view transition): wait until it has a size, then center.
    while (alive && !wrap.getBoundingClientRect().height) await new Promise((r) => requestAnimationFrame(r));
    if (!alive) return;
    centerChest(false);
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

    // 2. the chest waits for a few taps: it jolts, cracks and the lid lifts a little each time
    await new Promise((res) => {
      const chest = $('.rw-chest');
      let hits = 0;
      const done = () => { chest.removeEventListener('click', onTap); releaseTaps = null; res(); };
      releaseTaps = done;
      if (skipped) { done(); return; }
      function onTap() {
        hits++;
        wrap.dataset.hits = String(hits);
        if (hits >= TAPS) { done(); return; }
        chest.classList.remove('hit');
        void chest.offsetWidth;
        chest.classList.add('hit');
        chest.addEventListener('animationend', () => chest.classList.remove('hit'), { once: true });
        fx.rattle();
        fx.pop();
        haptics.buzz(30 + hits * 25);
        burst(chest, 6 + hits * 6, ['spark', 'star', 'coin']);
        $('.rw-tap-txt').textContent = t('tapCalls')[hits] || '';
      }
      chest.addEventListener('click', onTap);
    });
    if (!alive) return;

    // 3. charge up... then BOOM
    wrap.classList.add('opening');
    fx.charge();
    haptics.buzz([15, 40, 15, 40, 15, 30, 15, 20, 15, 15, 40]);
    await sleep(950);
    if (!alive) return;
    flash();
    wrap.classList.add('opened', 'collapse', 'party');
    tierEl.style.marginTop = '';
    fx.boom();
    fx.open();
    haptics.buzz(160);
    shake();
    burst($('.rw-chest'), rw.tier >= 2 ? 60 : 40, ['coin', 'star', 'spark', 'gem']);
    fountain(rw.tier >= 2 ? 30 : 18);
    voiceGuide.say(t('say.chest', { name: getLang() === 'en' ? TIERS[rw.tier].name : TIERS[rw.tier].label }));
    musicWanted = true;
    fx.musicStart(rw.tier);


    await sleep(550);
    if (!alive) return;
    wrap.classList.add('show-count');
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
      pill.innerHTML = `<span class="ms filled">${m.icon}</span>${esc(m.label)}<b>×${m.x}</b>`;
      ml.appendChild(pill);
      fx.slam(m.hot);
      haptics.buzz(m.hot ? [40, 30, 80] : 60);
      shake();
      flash(false);
      fountain(m.hot ? 16 : 8);
      big.classList.remove('bump');
      void big.offsetWidth;
      big.classList.add('bump');
      await countTo(rw.steps[i], rw.steps[i + 1], 650);
      if (!alive) return;
    }

    // 5. total
    await sleep(200);
    if (!alive) return;
    big.classList.add('final');
    musicWanted = false;
    fx.musicStop();
    fx.fanfare();
    fx.coins();
    flash();
    burst(big, 34, ['coin', 'spark', 'gem']);
    fountain(30);
    stamp(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    fireworks(rw.tier + 2);
    haptics.buzz([30, 30, 60, 30, 120]);
    await sleep(900);
    if (!alive) return;

    // 6. loot
    await sleep(650);
    if (!alive) return;
    const f = rw.fibbie;
    const loot = $('.rw-loot');
    if (rw.ranAway) {
      // The Fibbie peeks out, looks around, and dashes off the screen.
      loot.innerHTML = `
        <div class="rw-card runaway" data-rarity="${f.rarity}">
          <div class="rw-critter"><div class="rw-runner">${critterSVG(f)}</div><i class="rw-dust" aria-hidden="true"></i><i class="rw-dust d2" aria-hidden="true"></i></div>
          <div class="rw-card-text">
            <span class="rw-new">${esc(t('ranAway'))}</span>
            <b>${esc(f.name)}</b>
            <small>${esc(t('ranAwayBody'))}</small>
          </div>
        </div>`;
      wrap.classList.add('show-loot');
      fx.boing();
      haptics.buzz(40);
      await sleep(1300);
      if (!alive) return;
      fx.runAway();
      haptics.buzz([20, 30, 20, 30, 60]);
      voiceGuide.say(t('say.ranAway', { name: f.name }), { interrupt: false });
    } else {
    loot.innerHTML = `
      <div class="rw-card" data-rarity="${f.rarity}">
        <div class="rw-critter">${critterSVG(f)}</div>
        <div class="rw-card-text">
          <span class="rw-new">${rw.isNew ? t('newFriend') : t('dupe', { n: rw.copies })}</span>
          <b>${esc(f.name)}</b>
          <span class="rw-rarity">${t('rarity')[f.rarity]}</span>${stars(f.stage)}
          <small${rw.copies >= 2 ? ' class="rw-merge"' : ''}>${esc(rw.copies >= 2 ? t('mergeHint') : f.blurb)}</small>
        </div>
      </div>`;
    wrap.classList.add('show-loot');
    fx.boing();
    haptics.buzz(50);
    burst(loot, 16, ['heart', 'star', 'spark']);
    voiceGuide.say(rw.isNew ? t('say.newFriend', { name: f.name }) : t('say.copy', { name: f.name }), { interrupt: false });
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
    if (!reduce) ambient = setInterval(() => { if (alive && !document.hidden) fountain(1); }, 450);
    const act = $('.rw-actions');
    if (act.getBoundingClientRect().bottom > innerHeight) act.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }

  async function animateXP() {
    const fill = $('#rw-fill');
    let xp = rw.xpBefore;
    const end = rw.xpAfter;
    const show = (v) => {
      const p = levelProgress(v);
      fill.style.width = `${Math.min(100, p.frac * 100)}%`;
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
        burst($('#rw-lv-next'), 18, ['star', 'spark']);
        voiceGuide.say(t('say.levelUp', { n: levelProgress(xp).level }), { interrupt: false });
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
