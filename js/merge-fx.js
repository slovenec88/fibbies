// The evolution show: two identical Fibbies spin into each other and burst into the next stage.
// Plays full screen in its own <dialog> (top layer, above any open sheet). Resolves when closed.
import { critterSVG } from './critter.js';
import { fx, haptics, voiceGuide } from './audio.js';
import { t } from './i18n.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Glow colour per stage reached: 2 = teal, 3 = violet, 4 = gold.
const HUE = { 2: 170, 3: 285, 4: 75 };

export function playMerge(dlg, from, to) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timers = new Set();
  let alive = true;
  const later = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); };
  const hue = HUE[to.stage] ?? 170;
  dlg.style.setProperty('--mh', hue);
  dlg.innerHTML = `
    <div class="mx" data-stage="${to.stage}">
      <div class="mx-glow"></div>
      <div class="mx-rays"></div>
      <div class="mx-rings"><i></i><i></i><i></i></div>
      <div class="mx-orbit">
        <div class="mx-twin a"><div class="mx-spin">${critterSVG(from)}</div></div>
        <div class="mx-twin b"><div class="mx-spin">${critterSVG(from)}</div></div>
      </div>
      <div class="mx-core"></div>
      <div class="mx-wave"></div>
      <div class="mx-born">${critterSVG(to)}</div>
      <div class="mx-fx"></div>
      <div class="mx-flash"></div>
      <div class="mx-text">
        <div class="mx-kicker">${esc(t('evolvedKicker'))}</div>
        <div class="mx-name">${esc(to.name)}</div>
        <div class="mx-stars">${Array.from({ length: 4 }, (_, i) => `<i class="${i < to.stage ? 'on' : ''}">★</i>`).join('')}</div>
        <div class="mx-tap">${esc(t('tapToContinue'))}</div>
      </div>
    </div>`;
  const root = dlg.querySelector('.mx');
  const fxLayer = dlg.querySelector('.mx-fx');

  // Sparks thrown off the spinning pair, and the big burst when they fuse.
  function sparks(n, { dist = 160, spread = 1, size = 1, life = 1100 } = {}) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      const ang = Math.random() * Math.PI * 2;
      const d = dist * (0.5 + Math.random() * spread);
      p.style.setProperty('--tx', `${Math.cos(ang) * d}px`);
      p.style.setProperty('--ty', `${Math.sin(ang) * d}px`);
      p.style.setProperty('--s', String(size * (0.5 + Math.random())));
      p.style.background = `oklch(0.88 0.17 ${hue + (Math.random() * 120 - 60)})`;
      p.style.animationDuration = `${life * (0.7 + Math.random() * 0.6)}ms`;
      if (Math.random() < 0.3) p.className = 'star';
      fxLayer.appendChild(p);
      setTimeout(() => p.remove(), life * 1.4);
    }
  }

  return new Promise((resolve) => {
    let canClose = false;
    const finish = () => {
      if (!alive) return;
      alive = false;
      for (const id of timers) clearTimeout(id);
      dlg.removeEventListener('click', onTap);
      dlg.removeEventListener('cancel', onCancel);
      if (dlg.open) dlg.close();
      dlg.innerHTML = '';
      resolve();
    };
    const onTap = () => { if (canClose) finish(); };
    const onCancel = (e) => { if (!canClose) e.preventDefault(); };
    dlg.addEventListener('click', onTap);
    dlg.addEventListener('cancel', onCancel);
    dlg.addEventListener('close', finish, { once: true }); // Android back closes it too
    dlg.showModal();

    const reveal = () => {
      root.classList.add('born');
      fx.evolve();
      haptics.buzz([80, 40, 200]);
      sparks(46, { dist: 190, spread: 1.2, size: 1.3, life: 1300 });
      later(350, () => sparks(24, { dist: 260, spread: 0.6, life: 1500 }));
      // Stars light up one by one.
      const st = dlg.querySelectorAll('.mx-stars i.on');
      st.forEach((s, i) => later(650 + i * 230, () => { s.classList.add('lit'); fx.star(i + 1); haptics.buzz(25); }));
      later(700, () => voiceGuide.say(t('evolved', { name: to.name })));
      later(900 + st.length * 230, () => { canClose = true; root.classList.add('can-close'); });
    };

    if (reduce) { root.classList.add('reduced'); reveal(); return; }
    // 1. the twins slide in from the sides
    requestAnimationFrame(() => root.classList.add('enter'));
    later(450, () => {
      // 2. they spin around each other, faster and closer, while energy builds
      root.classList.add('spin');
      fx.evolveCharge();
      haptics.buzz([20, 120, 20, 100, 20, 80, 25, 60, 30, 40, 35, 25, 40, 15, 60]);
      for (let k = 0; k < 10; k++) later(200 + k * 210, () => sparks(3 + k, { dist: 90 + k * 8, life: 700 }));
    });
    later(2700, () => {
      // 3. flash, shockwave, and the evolved Fibbie appears
      root.classList.add('flash');
      reveal();
    });
  });
}
