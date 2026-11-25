// The particle engine for the chest show: elastic bands, muscle fibers, stars, sparks, rings, rockets.
//
// It needs no DOM, so it normally runs in a worker (js/fx-worker.js) drawing on an OffscreenCanvas,
// which keeps all of its work off the page's main thread. Without OffscreenCanvas it runs on the page.
// Every particle is one drawImage() of a sprite drawn once at start.
// Positions are viewport (getBoundingClientRect) pixels.

const TAU = Math.PI * 2;
const SPRITE = 64; // sprite canvas size in px; particles scale it to their own size

// ---------- sprites (drawn once, then reused) ----------
function sprite(draw, w = SPRITE, h = SPRITE) {
  let c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : null;
  if (!c?.getContext('2d')) c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  draw(c.getContext('2d'), w, h);
  return c;
}
const glow = (color) => sprite((g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, '#fff'); r.addColorStop(0.18, '#fff'); r.addColorStop(0.32, color);
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
});
const starPath = (g, cx, cy, R, r, n = 5) => {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TAU - Math.PI / 2;
    const d = i % 2 ? r : R;
    g.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
  }
  g.closePath();
};
/** A resistance band: a thick rubber loop with a shine. */
const band = (color) => sprite((g, s) => {
  const c = s / 2;
  g.lineWidth = 9; g.strokeStyle = 'rgba(0,0,0,.28)';
  g.beginPath(); g.ellipse(c, c + 2, s * 0.4, s * 0.24, 0, 0, TAU); g.stroke();
  g.strokeStyle = color;
  g.beginPath(); g.ellipse(c, c, s * 0.4, s * 0.24, 0, 0, TAU); g.stroke();
  g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,.6)';
  g.beginPath(); g.ellipse(c, c - 2, s * 0.37, s * 0.2, 0, Math.PI * 1.1, Math.PI * 1.75); g.stroke();
});
/** A muscle fiber: a wavy striped strand. */
const fiber = (a, b) => sprite((g, s) => {
  const f = g.createLinearGradient(0, 0, s, 0);
  f.addColorStop(0, a); f.addColorStop(0.5, b); f.addColorStop(1, a);
  g.lineCap = 'round'; g.lineWidth = 8; g.strokeStyle = f;
  const wave = (dy) => { g.beginPath(); for (let x = 6; x <= s - 6; x += 2) g.lineTo(x, s / 2 + dy + Math.sin((x / s) * TAU * 1.5) * 7); g.stroke(); };
  wave(0);
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.55)'; wave(-2);
});
const gem = (a, b) => sprite((g, s) => {
  const p = [[s / 2, 4], [s - 8, s * 0.36], [s / 2, s - 4], [8, s * 0.36]];
  const f = g.createLinearGradient(0, 0, s, s);
  f.addColorStop(0, '#fff'); f.addColorStop(0.3, a); f.addColorStop(1, b);
  g.fillStyle = f; g.beginPath(); p.forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.55)';
  g.beginPath(); g.moveTo(s / 2, 4); g.lineTo(s * 0.62, s * 0.36); g.lineTo(s / 2, s * 0.5); g.lineTo(s * 0.38, s * 0.36); g.closePath(); g.fill();
});
const star = (color) => sprite((g, s) => {
  g.fillStyle = color; starPath(g, s / 2, s / 2, s / 2 - 2, s / 5); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)'; starPath(g, s / 2, s / 2, s / 5, s / 12); g.fill();
});
const heart = () => sprite((g, s) => {
  g.fillStyle = '#ff5fa2';
  g.beginPath(); g.moveTo(s / 2, s - 6);
  g.bezierCurveTo(4, s * 0.55, 4, 8, s / 2, s * 0.3);
  g.bezierCurveTo(s - 4, 8, s - 4, s * 0.55, s / 2, s - 6); g.fill();
});
const twinkle = () => sprite((g, s) => { // four-point glint
  const c = s / 2;
  const r = g.createRadialGradient(c, c, 0, c, c, c);
  r.addColorStop(0, '#fff'); r.addColorStop(0.25, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.beginPath(); g.moveTo(c, 0); g.quadraticCurveTo(c, c, s, c); g.quadraticCurveTo(c, c, c, s); g.quadraticCurveTo(c, c, 0, c); g.quadraticCurveTo(c, c, c, 0); g.fill();
});

let SPR = null;
function sprites() {
  if (SPR) return SPR;
  SPR = {
    bands: ['#ff4d6d', '#ffb703', '#4cc9f0', '#5ee38f', '#b388ff', '#ff8fd0'].map(band),
    fibers: [fiber('#ff5d73', '#ffb3c1'), fiber('#ff7b54', '#ffd3a8')],
    gems: [gem('#a5f3ff', '#4c6ff7'), gem('#ffc2e2', '#d6247a'), gem('#c8ffb0', '#1fa35b')],
    hearts: [heart()],
    twinkle: twinkle(),
    glow: {},
    star: {},
  };
  return SPR;
}
const glowOf = (color) => (sprites().glow[color] ||= glow(color));
const starOf = (color) => (sprites().star[color] ||= star(color));

// ---------- the engine ----------
// Workers have requestAnimationFrame in Chrome and Firefox; elsewhere fall back to a 60 fps timer.
const nextFrame = typeof requestAnimationFrame === 'function' ? (f) => requestAnimationFrame(f) : (f) => setTimeout(() => f(performance.now()), 16);
const cancelFrame = typeof cancelAnimationFrame === 'function' ? (id) => cancelAnimationFrame(id) : (id) => clearTimeout(id);

/**
 * Runs the effects on `canvas` (a canvas or OffscreenCanvas). `colors`: [main, accent] for this chest.
 * Returns { run(name, args), resize(W, H, dpr), stop() }.
 */
export function createEngine(canvas, { colors, W: w0, H: h0, dpr: d0 }) {
  const S = sprites();
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = (w, h, d) => {
    W = w; H = h; dpr = d;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  };
  resize(w0, h0, d0);

  const [main, accent] = colors;
  const glowMain = glowOf(main), glowAccent = glowOf(accent), glowGold = glowOf('#ffb000');
  const stars = [starOf(main), starOf('#fff3a0'), starOf(accent)];

  // Particle pool: plain objects reused, so a long show allocates nothing per frame.
  const MAX = 900;
  const live = [];
  const pool = [];
  let quality = 1; // drops on slow phones (fewer new particles), recovers when frames are fast
  const spawn = () => {
    if (live.length >= MAX * quality) return null;
    const p = pool.pop() || {};
    p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.g = 0; p.drag = 1; p.t = 0; p.life = 1;
    p.size = 12; p.rot = 0; p.vr = 0; p.img = null; p.add = false;
    p.fadeIn = 0; p.bounce = 0; p.target = null; p.ring = 0; p.width = 0; p.color = '';
    p.trail = 0; p.boom = 0; p.grow = 0; p.pulse = false; p.elastic = false; p.wob = 0;
    p.home = null; p.ering = 0; p.out = -1; p.snap = false;
    live.push(p);
    return p;
  };
  const n = (count) => Math.round(count * quality);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function loot(kind) {
    if (kind === 'band') return pick(S.bands);
    if (kind === 'fiber') return pick(S.fibers);
    if (kind === 'gem') return pick(S.gems);
    if (kind === 'star') return pick(stars);
    if (kind === 'heart') return S.hearts[0];
    return null; // spark
  }
  function dress(p, kind) {
    p.img = loot(kind);
    if (!p.img) { p.img = Math.random() < 0.5 ? glowMain : glowAccent; p.add = true; p.size = rand(14, 26); return; }
    if (kind === 'band' || kind === 'fiber') { p.size = rand(24, 34); p.elastic = true; p.rot = rand(0, TAU); }
    else { p.size = rand(13, 20); p.vr = rand(-8, 8); }
  }

  // ---------- effects ----------
  /** Radial explosion of loot from a point. */
  function burst(x, y, count, kinds = ['band', 'star', 'spark', 'fiber'], power = 1) {
    for (let i = n(count); i-- > 0;) {
      const p = spawn(); if (!p) return;
      const a = rand(0, TAU), v = rand(160, 520) * power;
      p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 160 * power;
      p.g = 900; p.drag = 0.985; p.life = rand(0.8, 1.5); p.rot = rand(0, TAU);
      dress(p, kinds[i % kinds.length]);
    }
  }
  /** Bands and fibers (plus glitter, and gems from big chests) shoot up out of the chest and rain down, bouncing once. */
  function fountain(x, y, count, gems = false) {
    for (let i = n(count); i-- > 0;) {
      const p = spawn(); if (!p) return;
      p.x = x + rand(-14, 14); p.y = y;
      p.vx = rand(-1, 1) * W * 0.55; p.vy = -rand(520, 1050);
      p.g = 1500; p.life = 3; p.bounce = 1; p.rot = rand(0, TAU);
      const r = Math.random();
      dress(p, r < 0.55 ? 'band' : r < 0.8 ? 'fiber' : gems && r < 0.9 ? 'gem' : 'star');
    }
  }
  /** Expanding shockwave ring. */
  function ring(x, y, { color = '#fff', speed = 900, width = 14, life = 0.55 } = {}) {
    const p = spawn(); if (!p) return;
    p.x = x; p.y = y; p.ring = 1; p.grow = speed; p.width = width; p.color = color; p.life = life; p.add = true; p.size = 10;
  }
  /** Sparks swirl in from all around and get sucked into a point (the chest charging up). */
  function implode(x, y, count, ms) {
    for (let i = n(count); i-- > 0;) {
      const p = spawn(); if (!p) return;
      const a = rand(0, TAU), d = rand(120, Math.max(W, H) * 0.55);
      p.x = x + Math.cos(a) * d; p.y = y + Math.sin(a) * d;
      p.vx = -Math.sin(a) * rand(100, 260); p.vy = Math.cos(a) * rand(100, 260); // swirl
      p.target = { x, y, pull: rand(2200, 3600), kill: 18 };
      p.life = ms / 1000 + 0.6; p.fadeIn = 0.15; p.drag = 0.94;
      p.img = Math.random() < 0.6 ? glowMain : pick(stars); p.add = p.img === glowMain;
      p.size = p.add ? rand(16, 30) : rand(9, 15); p.vr = rand(-6, 6);
    }
  }
  /** Firework rockets fly up from the bottom with a trail and burst into colored sparks. */
  function rockets(count) {
    for (let k = 0; k < count; k++) {
      const p = spawn(); if (!p) return;
      p.x = W * rand(0.12, 0.88); p.y = H + 10;
      p.vx = rand(-60, 60); p.vy = -rand(H * 1.05, H * 1.4); p.g = 900;
      p.life = 2.2; p.boom = 1; p.trail = 1; p.t = -k * 0.32; // staggered launch
      p.img = glowGold; p.add = true; p.size = 18;
      p.color = pick([main, accent, '#ffd60a', '#7cf2ff', '#ff7ad1', '#9dff8a']);
    }
  }
  function explode(x, y, color) {
    const sparkImg = glowOf(color);
    const count = n(46);
    for (let i = 0; i < count; i++) {
      const p = spawn(); if (!p) return;
      const a = (i / count) * TAU + rand(-0.05, 0.05), v = rand(220, 420);
      p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
      p.g = 260; p.drag = 0.955; p.life = rand(0.9, 1.4); p.img = sparkImg; p.add = true; p.size = rand(10, 18);
    }
    ring(x, y, { color, speed: 520, width: 6, life: 0.4 });
  }
  /** Bands and fibers pour down from the top across the whole screen. */
  function rain(count) {
    for (let i = n(count); i-- > 0;) {
      const p = spawn(); if (!p) return;
      p.x = rand(0, W); p.y = -rand(20, H * 0.6); p.vx = rand(-40, 40); p.vy = rand(150, 420);
      p.g = 900; p.life = 3.2; p.bounce = 1; dress(p, Math.random() < 0.6 ? 'band' : Math.random() < 0.7 ? 'fiber' : 'gem');
    }
  }
  /** Bands fly in from the screen edges and get collected at a point (like picking up loot). */
  function magnet(x, y, count) {
    let hits = 0;
    const onHit = (hx, hy) => { if (hits++ % 3 === 0) burst(hx, hy, 2, ['spark'], 0.3); }; // some pieces land with a spark
    for (let i = n(count); i-- > 0;) {
      const p = spawn(); if (!p) return;
      const side = Math.random() < 0.5 ? -1 : 1;
      p.x = side < 0 ? rand(-30, W * 0.25) : rand(W * 0.75, W + 30);
      p.y = rand(H * 0.35, H + 20);
      p.vx = -side * rand(50, 200); p.vy = -rand(300, 700);
      p.target = { x, y, pull: rand(2600, 4200), kill: 22, onHit }; p.drag = 0.95;
      p.life = 2.5; p.t = -i * 0.025; dress(p, Math.random() < 0.7 ? 'band' : 'fiber');
    }
  }
  /** Little four-point glints that pop in and out around the screen. */
  function twinkles(count, area = 1) {
    for (let i = n(count); i-- > 0;) {
      const p = spawn(); if (!p) return;
      p.x = rand(0, W); p.y = rand(0, H * area); p.life = rand(0.5, 0.9); p.pulse = true;
      p.img = S.twinkle; p.add = true; p.size = rand(18, 36); p.vr = rand(-2, 2);
    }
  }
  /**
   * A rubber-band explosion: a jelly ring pops open with an elastic overshoot and a flower of bands
   * springs out of the middle, overshoots, snaps back and wobbles until it settles, then fades.
   * `r`: how far the bands spring out (px).
   */
  function snap(x, y, r = 46) {
    const ring0 = spawn(); if (!ring0) return;
    ring0.x = x; ring0.y = y; ring0.ering = r * 1.15; ring0.width = 5; ring0.color = pick([main, accent, '#fff3a0']);
    ring0.life = 0.9; ring0.add = true; ring0.size = 1; ring0.snap = true;
    const count = n(7 + ((Math.random() * 3) | 0));
    const turn = rand(0, TAU);
    for (let i = 0; i < count; i++) {
      const p = spawn(); if (!p) return;
      const a = turn + (i / count) * TAU + rand(-0.15, 0.15);
      const rest = r * rand(0.8, 1.1);
      p.x = x; p.y = y; p.home = { x: x + Math.cos(a) * rest, y: y + Math.sin(a) * rest, k: rand(230, 300) };
      const v = rand(450, 650) * (r / 46);
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.drag = 0.9;
      p.life = rand(1.05, 1.35); p.snap = true;
      dress(p, 'band'); p.size = rand(20, 28);
    }
    for (let i = n(5); i-- > 0;) { // a few sparks flicked off by the snap
      const p = spawn(); if (!p) return;
      const a = rand(0, TAU), v = rand(220, 420);
      p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.drag = 0.93; p.g = 220;
      p.life = rand(0.45, 0.7); p.img = Math.random() < 0.5 ? glowMain : glowAccent; p.add = true; p.size = rand(9, 15); p.snap = true;
    }
  }
  /** Every rubber-band explosion still on screen fades out quickly (the chest is about to open). */
  function snapFade() {
    for (const p of live) if (p.snap && p.out < 0) p.out = p.t;
  }
  /** Slow glowing embers drifting up from the bottom (calm background after the show). */
  function embers(count) {
    for (let i = n(count); i-- > 0;) {
      const p = spawn(); if (!p) return;
      p.x = rand(0, W); p.y = H + rand(0, 40); p.vx = rand(-20, 20); p.vy = -rand(40, 110);
      p.life = rand(4, 7); p.fadeIn = 0.6; p.img = Math.random() < 0.5 ? glowMain : glowAccent; p.add = true; p.size = rand(8, 16);
    }
  }

  // ---------- simulation + drawing ----------
  let raf = 0, last = 0, slow = 0, alive = true;
  function frame(now) {
    raf = 0;
    if (!alive) return;
    const dtMs = last ? now - last : 16;
    last = now;
    const dt = Math.min(dtMs, 50) / 1000;
    // Adapt to the phone: fewer new particles when frames run long, more again when they're fast.
    slow = slow * 0.9 + (dtMs > 24 ? 1 : 0) * 0.1;
    if (slow > 0.5) quality = Math.max(0.35, quality - 0.01);
    else if (slow < 0.05) quality = Math.min(1, quality + 0.005);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const floor = H - 6;
    let additive = false;
    ctx.globalCompositeOperation = 'source-over';
    // two passes: normal sprites, then glowing (additive) ones on top
    for (let pass = 0; pass < 2; pass++) {
      if (pass === 1) { ctx.globalCompositeOperation = 'lighter'; additive = true; }
      for (let i = 0; i < live.length; i++) {
        const p = live[i];
        if (p.add !== additive) continue;
        if (pass === 0 || p._stepped !== now) step(p, dt, floor, now);
        if (p.t < 0 || p.dead) continue;
        draw(p);
      }
    }
    // remove dead particles (swap-remove keeps it cheap)
    for (let i = live.length - 1; i >= 0; i--) {
      if (live[i].dead) { const p = live[i]; p.dead = false; live[i] = live[live.length - 1]; live.pop(); pool.push(p); }
    }
    if (live.length) raf = nextFrame(frame);
    else last = 0;
  }
  function step(p, dt, floor, now) {
    p._stepped = now;
    p.t += dt;
    if (p.t < 0) return;
    if (p.t >= p.life) { p.dead = true; return; }
    if (p.out >= 0 && p.t - p.out > 0.35) { p.dead = true; return; }
    if (p.home) { // a spring pulls it back to where it rests
      p.vx += (p.home.x - p.x) * p.home.k * dt; p.vy += (p.home.y - p.y) * p.home.k * dt;
    }
    if (p.target) {
      const dx = p.target.x - p.x, dy = p.target.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < p.target.kill) { p.dead = true; p.target.onHit?.(p.x, p.y); return; }
      p.vx += (dx / d) * p.target.pull * dt; p.vy += (dy / d) * p.target.pull * dt;
    }
    if (p.drag !== 1) { const k = Math.pow(p.drag, dt * 60); p.vx *= k; p.vy *= k; }
    p.vy += p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.ring) { p.size += p.grow * dt; }
    if (p.bounce && p.y > floor && p.vy > 0) {
      if (p.bounce === 1) { p.y = floor; p.vy *= -0.38; p.vx *= 0.6; p.bounce = 2; p.life = p.t + 0.7; p.wob = 1; }
    }
    if (p.trail && Math.random() < 0.45) { // rocket trail
      const s = spawn();
      if (s) { s.x = p.x + rand(-3, 3); s.y = p.y + 6; s.vx = rand(-30, 30); s.vy = rand(20, 80); s.life = rand(0.25, 0.45); s.img = glowGold; s.add = true; s.size = rand(6, 11); s._stepped = now; }
    }
    if (p.boom && p.vy > -60) { p.dead = true; explode(p.x, p.y, p.color); }
    if (p.y > H + 80 || p.x < -120 || p.x > W + 120) p.dead = true;
  }
  function draw(p) {
    const k = p.t / p.life;
    let a = k > 0.75 ? (1 - k) / 0.25 : 1;
    if (p.fadeIn && p.t < p.fadeIn) a *= p.t / p.fadeIn;
    if (p.out >= 0) a *= Math.max(0, 1 - (p.t - p.out) / 0.35);
    if (p.ering) {
      // Jelly ring: opens past its size and springs back, squashing a little side to side as it does.
      const r = p.ering * (1 - Math.exp(-5 * p.t) * Math.cos(17 * p.t));
      const sq = 0.18 * Math.exp(-4 * p.t) * Math.sin(23 * p.t);
      if (r <= 0.5) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = Math.max(0, a * (1 - k * 0.6));
      ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(0.5, p.width * (1 - k * 0.7));
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r * (1 + sq), r * (1 - sq), 0, 0, TAU); ctx.stroke();
      return;
    }
    if (p.ring) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(0.5, p.width * (1 - k));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.stroke();
      return;
    }
    let size = p.size;
    if (p.pulse) { const s = Math.sin(k * Math.PI); size *= s; a = s; }
    if (a <= 0.01 || size <= 0.5) return;
    ctx.globalAlpha = a;
    const sc = (size * dpr) / p.img.width;
    let sx = sc, sy = sc;
    if (p.elastic) {
      // Rubber: stretch along the direction of travel, and wobble after landing.
      const v = Math.hypot(p.vx, p.vy);
      if (v > 80) p.rot = Math.atan2(p.vy, p.vx);
      let st = Math.min(2.2, 1 + v / 900);
      if (p.wob > 0.02) { st *= 1 + 0.45 * p.wob * Math.sin(p.t * 38); p.wob *= 0.93; }
      sx = sc * st; sy = sc / Math.sqrt(st);
    }
    const cos = Math.cos(p.rot), sin = Math.sin(p.rot);
    ctx.setTransform(cos * sx, sin * sx, -sin * sy, cos * sy, p.x * dpr, p.y * dpr);
    ctx.drawImage(p.img, -p.img.width / 2, -p.img.height / 2);
  }
  const EFFECTS = { burst, fountain, ring, implode, rockets, rain, magnet, twinkles, embers, snap, snapFade };
  return {
    run(name, args) {
      if (!alive || !EFFECTS[name]) return;
      EFFECTS[name](...args);
      if (!raf) raf = nextFrame(frame);
    },
    resize,
    stop() {
      alive = false;
      if (raf) cancelFrame(raf);
    },
  };
}
