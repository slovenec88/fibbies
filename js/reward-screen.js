// The end-of-session payoff: chest drop, open, count-up, multipliers, loot, XP.
import { TIERS, levelProgress, fmtBig } from './rewards.js';
import { critterSVG, chestSVG } from './critter.js';
import { fx, voiceGuide, haptics } from './audio.js';

const RARITY = ['Common', 'Rare', 'Epic', 'Legendary'];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Math.round(n).toLocaleString('en-US');

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
      <div class="rw-inner">
        <div class="rw-tier">${TIERS[rw.tier].label}</div>
        <button class="rw-chest" aria-label="Open chest">${chestSVG(rw.tier)}</button>
        <div class="rw-tap">Tap to open!</div>
        <div class="rw-count">
          <div class="rw-label">Muscle fibers stretched</div>
          <div class="rw-big" aria-live="polite">0</div>
          <div class="rw-mults"></div>
        </div>
        <div class="rw-loot"></div>
        <div class="rw-level">
          <div class="rw-lv-row">
            <span class="rw-lv" id="rw-lv">Lv ${rw.levelBefore}</span>
            <div class="rw-bar"><i id="rw-fill"></i></div>
            <span class="rw-lv next" id="rw-lv-next">Lv ${rw.levelBefore + 1}</span>
          </div>
          <div class="rw-xp" id="rw-xp"></div>
        </div>
        <div class="rw-stats">${stats.map(([v, l]) => `<span><b>${esc(v)}</b>${esc(l)}</span>`).join('')}</div>
        <div class="rw-actions">
          <button class="rw-btn primary" id="rw-home"><span class="ms filled">savings</span>Collect</button>
          <button class="rw-btn" id="rw-again"><span class="ms">replay</span>Again</button>
        </div>
      </div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const wrap = $('.reward');
  const big = $('.rw-big');
  const fxLayer = $('.rw-fx');
  $('#rw-home').onclick = () => { stop(); onHome(); };
  $('#rw-again').onclick = () => { stop(); onAgain(); };

  function stop() {
    alive = false;
    for (const id of timers) clearTimeout(id);
  }

  // ---- particles ----
  function burst(fromEl, n, kinds = ['coin', 'star', 'spark']) {
    if (reduce) return;
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
        if (now - lastTick > 55 && p < 1) { lastTick = now; fx.count(p); haptics.buzz(5); }
        if (p >= 1 || fast) { big.textContent = fmt(to); res(); } else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  async function run() {
    // 1. drop in
    wrap.classList.add('dropping');
    await sleep(420);
    if (!alive) return;
    fx.chestLand();
    haptics.buzz(40);
    await sleep(300);
    if (!alive) return;
    wrap.classList.add('ready');

    // 2. wait for tap (auto-open after a moment)
    await new Promise((res) => {
      const chest = $('.rw-chest');
      const go = () => { chest.removeEventListener('click', go); res(); };
      chest.addEventListener('click', go);
      const id = setTimeout(go, fast ? 0 : 3200);
      timers.add(id);
    });
    if (!alive) return;

    // 3. open
    wrap.classList.add('opening');
    fx.rattle();
    haptics.buzz([20, 40, 20, 40, 20]);
    await sleep(480);
    if (!alive) return;
    wrap.classList.add('opened', 'collapse');
    fx.open();
    haptics.buzz(120);
    shake();
    burst($('.rw-chest'), rw.tier >= 2 ? 46 : 30);
    voiceGuide.say(`${TIERS[rw.tier].name} chest!`);

    // fast-forward on any tap from here on
    wrap.addEventListener('pointerdown', (e) => { if (!e.target.closest('.rw-actions')) fast = true; });

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
      haptics.buzz(60);
      shake();
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
    fx.coins();
    burst(big, 24, ['coin', 'spark']);
    haptics.buzz([30, 30, 60]);

    // 6. loot
    await sleep(650);
    if (!alive) return;
    const f = rw.fibbie;
    const loot = $('.rw-loot');
    loot.innerHTML = `
      <div class="rw-card" data-rarity="${f.rarity}">
        <div class="rw-critter">${critterSVG(f)}</div>
        <div class="rw-card-text">
          <span class="rw-new">${rw.isNew ? 'NEW FRIEND!' : `LEVEL ${rw.fibLevel}!`}</span>
          <b>${esc(f.name)}</b>
          <span class="rw-rarity">${RARITY[f.rarity]}</span>
          <small>${esc(f.blurb)}</small>
        </div>
      </div>`;
    wrap.classList.add('show-loot');
    fx.boing();
    haptics.buzz(50);
    burst(loot, 16, ['heart', 'star', 'spark']);
    voiceGuide.say(rw.isNew ? `New friend: ${f.name}!` : `${f.name} leveled up!`, { interrupt: false });

    // 7. XP bar (can cross several levels)
    await sleep(700);
    if (!alive) return;
    wrap.classList.add('show-level');
    await animateXP();
    if (!alive) return;

    await sleep(200);
    if (!alive) return;
    wrap.classList.add('done');
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
      $('#rw-lv').textContent = `Lv ${p.level}`;
      $('#rw-lv-next').textContent = `Lv ${p.level + 1}`;
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
        voiceGuide.say(`Level up! Level ${levelProgress(xp).level}`, { interrupt: false });
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
