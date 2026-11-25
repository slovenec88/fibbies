// Chest-show effects, page side.
// - The lighting (god rays, core glow, flare, light pillar) is drawn once on small canvases that the
//   graphics chip then scales, spins and fades: no per-frame work at all.
// - The particles run in js/fx-engine.js, in a worker when the browser can hand a canvas to one
//   (OffscreenCanvas), so a busy show never slows down the page itself.
import { createEngine } from './fx-engine.js';

const TAU = Math.PI * 2;
function sprite(draw, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

// ---------- light rays and the light pillar, drawn small and scaled up by CSS ----------
// A small canvas scaled up by the compositor costs a fraction of a full-screen CSS gradient with a mask.
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
/** Ray image size for this screen: the rays fill 120vmax, drawn at about two thirds of the screen's pixels
 *  (soft light needs no more), so a big monitor stays sharp and a phone stays cheap. */
const raySize = () => Math.min(1536, Math.max(512, Math.round((Math.max(innerWidth, innerHeight) * 1.2 * Math.min(devicePixelRatio || 1, 2)) / 1.5 / 64) * 64));
/**
 * God rays: shafts of light of different widths, lengths and strengths, each with soft edges
 * (a wide faint wedge under a narrow bright one) and a white-hot start near the centre.
 * Two of these turning in opposite directions make the light shimmer.
 */
export function raysCanvas(colors, count = 16, { soft = 1, seed = 1, size = raySize() } = {}) {
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  return sprite((g, s) => {
    const c = s / 2;
    g.globalCompositeOperation = 'lighter';
    const step = TAU / count;
    for (let i = 0; i < count; i++) {
      const col = colors[i % colors.length];
      const len = c * (0.6 + rnd() * 0.4);
      const width = step * (0.18 + rnd() * 0.42) * soft;
      const power = 0.45 + rnd() * 0.55;
      const mid = i * step + rnd() * step * 0.4;
      // three stacked wedges: wide and faint, medium, narrow and bright = a soft-edged shaft
      for (const [w, a] of [[1, 0.22], [0.55, 0.38], [0.2, 0.7]]) {
        const fade = g.createRadialGradient(c, c, 0, c, c, len);
        fade.addColorStop(0, rgba('#ffffff', a * power));
        fade.addColorStop(0.12, rgba(col, a * power));
        fade.addColorStop(0.55, rgba(col, a * power * 0.45));
        fade.addColorStop(1, rgba(col, 0));
        g.fillStyle = fade;
        g.beginPath(); g.moveTo(c, c);
        g.arc(c, c, len, mid - (width * w) / 2, mid + (width * w) / 2); g.closePath(); g.fill();
      }
    }
  }, size, size);
}
/** The white-hot light behind the open chest: a bright core fading through the chest colour. */
export function coreCanvas(color) {
  return sprite((g, s) => {
    const c = s / 2;
    const f = g.createRadialGradient(c, c, 0, c, c, c);
    f.addColorStop(0, 'rgba(255,255,255,1)'); f.addColorStop(0.12, 'rgba(255,255,255,.95)');
    f.addColorStop(0.3, rgba(color, 0.75)); f.addColorStop(0.6, rgba(color, 0.22)); f.addColorStop(1, rgba(color, 0));
    g.fillStyle = f; g.fillRect(0, 0, s, s);
  }, 256, 256);
}
/** A horizontal lens-flare streak: bright thin line with a soft glow around it. */
export function flareCanvas(color) {
  return sprite((g, w, h) => {
    const x = g.createLinearGradient(0, 0, w, 0);
    x.addColorStop(0, rgba(color, 0)); x.addColorStop(0.35, rgba(color, 0.5)); x.addColorStop(0.5, '#fff');
    x.addColorStop(0.65, rgba(color, 0.5)); x.addColorStop(1, rgba(color, 0));
    g.fillStyle = x; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in';
    const y = g.createLinearGradient(0, 0, 0, h);
    y.addColorStop(0, 'rgba(0,0,0,0)'); y.addColorStop(0.45, 'rgba(0,0,0,.6)'); y.addColorStop(0.5, '#000');
    y.addColorStop(0.55, 'rgba(0,0,0,.6)'); y.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = y; g.fillRect(0, 0, w, h);
  }, 256, 24);
}
export function pillarCanvas(color) {
  return sprite((g, w, h) => {
    const v = g.createLinearGradient(0, h, 0, 0);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.3, color); v.addColorStop(0.46, color);
    v.addColorStop(0.5, '#fff'); v.addColorStop(0.54, color); v.addColorStop(0.7, color); v.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = v; g.fillRect(0, 0, w, h);
    // soft sides
    g.globalCompositeOperation = 'destination-in';
    const s = g.createLinearGradient(0, 0, w, 0);
    s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(0.3, '#000'); s.addColorStop(0.7, '#000'); s.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = s; g.fillRect(0, 0, w, h);
  }, 48, 256);
}

// ---------- particles ----------
const NAMES = ['burst', 'fountain', 'ring', 'implode', 'rockets', 'rain', 'magnet', 'twinkles', 'embers'];
const NOOP = () => {};
const OFF = Object.fromEntries([...NAMES, 'stop'].map((n) => [n, NOOP]));

/**
 * Adds the particle canvas to `host` (fixed, full viewport) and returns the effects:
 * burst, fountain, ring, implode, rockets, rain, magnet, twinkles, embers, stop.
 * `colors`: [main, accent] for this chest. No-op effects when motion is reduced.
 */
export function createFx(host, { colors, reduce }) {
  if (reduce) return OFF;
  let alive = true;
  const canvas = document.createElement('canvas');
  canvas.className = 'rw-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  // Soft particles look the same at 1.5x and cost about half the pixels of 2x.
  const size = () => [innerWidth, innerHeight, Math.min(devicePixelRatio || 1, 1.5)];
  const [W, H, dpr] = size();

  let send, resize, stopEngine;
  let el = canvas;
  // On the page: the fallback when a worker can't take the canvas.
  const onPage = () => {
    const engine = createEngine(el, { colors, W, H, dpr });
    send = (fx, args) => engine.run(fx, args);
    resize = () => engine.resize(...size());
    stopEngine = () => engine.stop();
  };
  let worker = null;
  if (canvas.transferControlToOffscreen && typeof Worker === 'function') {
    try {
      // Older WebViews ignore { type: 'module' } (they never read it) and would fail on the worker's import.
      let moduleOk = false;
      worker = new Worker(new URL('./fx-worker.js', import.meta.url), { get type() { moduleOk = true; return 'module'; } });
      if (!moduleOk) throw new Error('no module workers');
      const off = canvas.transferControlToOffscreen();
      worker.postMessage({ canvas: off, init: { colors, W, H, dpr } }, [off]);
      send = (fx, args) => worker.postMessage({ fx, args });
      resize = () => worker.postMessage({ resize: size() });
      stopEngine = () => { worker.postMessage({ stop: true }); worker.terminate(); };
      // If the worker fails to load, the transferred canvas is lost: swap in a fresh one on the page.
      worker.onerror = () => {
        worker.terminate();
        if (!alive) return;
        const fresh = canvas.cloneNode();
        el.replaceWith(fresh);
        el = fresh;
        onPage();
      };
    } catch { worker?.terminate(); worker = null; }
  }
  if (!worker) onPage();
  const onResize = () => resize();
  addEventListener('resize', onResize);

  const api = Object.fromEntries(NAMES.map((n) => [n, (...args) => { if (alive) send(n, args); }]));
  api.stop = () => {
    if (!alive) return;
    alive = false;
    removeEventListener('resize', onResize);
    stopEngine();
    el.remove();
  };
  return api;
}
