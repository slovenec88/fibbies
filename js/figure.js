// Animated stick-figure renderer with two-bone IK.
const NS = 'http://www.w3.org/2000/svg';
const LEN = { torso: 52, neck: 17, ua: 28, fa: 26, th: 38, sh: 38, foot: 11 };
const rad = (d) => (d * Math.PI) / 180;
const dir = (a, l) => [Math.cos(rad(a)) * l, Math.sin(rad(a)) * l];
const add = (p, v) => [p[0] + v[0], p[1] + v[1]];

function ik(root, target, l1, l2, bend) {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const d = Math.hypot(dx, dy) || 0.001;
  const dc = Math.min((l1 + l2) * 0.999, Math.max(Math.abs(l1 - l2) + 0.01, d));
  const a = Math.atan2(dy, dx);
  const cosA = (l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const j = [root[0] + Math.cos(a + bend * alpha) * l1, root[1] + Math.sin(a + bend * alpha) * l1];
  const ex = target[0] - j[0];
  const ey = target[1] - j[1];
  const ed = Math.hypot(ex, ey) || 1;
  return [j, [j[0] + (ex / ed) * l2, j[1] + (ey / ed) * l2]];
}

function lerp(a, b, t) {
  if (typeof a === 'number') return a + (b - a) * t;
  if (Array.isArray(a)) return a.map((v, i) => lerp(v, b[i], t));
  return a;
}

function blend(pa, pb, t) {
  const out = {};
  for (const k of Object.keys(pa)) out[k] = pb && k in pb ? lerp(pa[k], pb[k], t) : pa[k];
  return out;
}

const fmt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

function solve(p, view) {
  const front = view !== 'side';
  const hip = p.h;
  const neck = add(hip, dir(p.t, LEN.torso));
  const head = add(neck, dir(p.n ?? p.t, LEN.neck));
  const perp = p.t + 90;
  const sw = front ? 15 : 0;
  const hw = front ? 8 : 0;
  const shN = add(neck, dir(perp, sw));
  const shF = add(neck, dir(perp, -sw));
  const hpN = add(hip, dir(perp, hw));
  const hpF = add(hip, dir(perp, -hw));
  const eb = p.eb || (front ? [-1, 1] : [1, 1]);
  const kb = p.kb || (front ? [-1, 1] : [-1, -1]);
  const [eN, wN] = ik(shN, p.hN, LEN.ua, LEN.fa, eb[0]);
  const [eF, wF] = ik(shF, p.hF, LEN.ua, LEN.fa, eb[1]);
  const [kN, aN] = ik(hpN, p.fN, LEN.th, LEN.sh, kb[0]);
  const [kF, aF] = ik(hpF, p.fF, LEN.th, LEN.sh, kb[1]);
  const footAng = (k, a, i) => {
    if (p.ft) return p.ft[i];
    if (front) return i === 0 ? 0 : 180;
    return (Math.atan2(a[1] - k[1], a[0] - k[0]) * 180) / Math.PI - 90;
  };
  const fl = view === 'top' ? 0 : front ? 6 : LEN.foot;
  const tN = add(aN, dir(footAng(kN, aN, 0), fl));
  const tF = add(aF, dir(footAng(kF, aF, 1), fl));
  // spine curve control point
  const mid = [(hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2];
  const ctrl = add(mid, dir(perp, p.s || 0));
  return { hip, neck, head, shN, shF, eN, wN, eF, wF, hpN, hpF, kN, aN, kF, aF, tN, tF, ctrl };
}

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

export class Figure {
  constructor(stretch, { mirror = false, className = '' } = {}) {
    this.svg = el('svg', { viewBox: '0 0 200 200', class: `fig ${className}`, 'aria-hidden': 'true' });
    this.set(stretch, mirror);
  }

  set(stretch, mirror = false) {
    this.stretch = stretch;
    this.mirror = mirror;
    const svg = this.svg;
    svg.innerHTML = '';
    svg.dataset.view = stretch.view;
    const g = el('g', mirror ? { transform: 'translate(200 0) scale(-1 1)' } : {}, svg);
    const props = stretch.props || [];
    const top = stretch.view === 'top';
    if (top) el('rect', { x: 10, y: 22, width: 186, height: 168, rx: 26, class: 'fig-mat' }, g);
    for (const pr of props) {
      if (pr.wall) el('line', { x1: pr.wall, y1: 14, x2: pr.wall, y2: 181, class: 'fig-wall' }, g);
    }
    if (!top) {
      this.shadow = el('ellipse', { cx: 100, cy: 182, rx: 52, ry: 5, class: 'fig-shadow' }, g);
      el('line', { x1: 8, y1: 182, x2: 192, y2: 182, class: 'fig-ground' }, g);
    } else this.shadow = null;
    const side = stretch.view === 'side';
    const mk = (cls) => el('path', { class: `fig-limb ${cls}` }, g);
    this.strap = props.some((p) => p.strap) ? el('path', { class: 'fig-strap' }) : null;
    if (side) {
      this.armF = mk('far');
      this.legF = mk('far');
      this.torso = el('path', { class: 'fig-torso' }, g);
      this.head = el('circle', { r: 11, class: 'fig-head' }, g);
      this.legN = mk('near');
      if (this.strap) g.appendChild(this.strap);
      this.armN = mk('near');
    } else {
      this.legF = mk('far');
      this.legN = mk('near');
      this.torso = el('path', { class: 'fig-torso' }, g);
      this.armF = mk('near');
      this.armN = mk('near');
      this.head = el('circle', { r: 11, class: 'fig-head' }, g);
      if (this.strap) g.appendChild(this.strap);
    }
    this.draw(0);
  }

  /** Tight square viewBox around the pose (both animation ends) for small thumbnails. */
  fit(pad = 12) {
    const s = this.stretch;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const t of [0, 0.5, 1]) {
      const j = solve(blend(s.a, s.b, t), s.view);
      for (const [k, p] of Object.entries(j)) {
        if (k === 'ctrl') continue;
        const r = k === 'head' ? 11 : 5;
        x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r);
        x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r);
      }
    }
    if (this.mirror) [x0, x1] = [200 - x1, 200 - x0];
    const size = Math.max(x1 - x0, y1 - y0) + pad * 2;
    const cx = (x0 + x1) / 2;
    const bottom = s.view === 'top' ? (y0 + y1) / 2 + size / 2 : y1 + pad;
    this.svg.setAttribute('viewBox', `${(cx - size / 2).toFixed(1)} ${(bottom - size).toFixed(1)} ${size.toFixed(1)} ${size.toFixed(1)}`);
    this.svg.classList.add('fit');
    return this;
  }

  /** phase: seconds of animation time */
  animate(time) {
    const s = this.stretch;
    const period = s.period || 6;
    const theta = (time / period) * Math.PI * 2;
    const t = (1 - Math.cos(theta)) / 2;
    this.draw(t, theta);
  }

  draw(t, theta = 0) {
    const s = this.stretch;
    const p = blend(s.a, s.b, t);
    if (s.orbit) {
      const { parts, r, mirrorF } = s.orbit;
      for (const part of parts) {
        const sign = mirrorF && part === 'hF' ? -1 : 1;
        p[part] = [p[part][0] + Math.cos(theta) * r[0] * sign, p[part][1] + Math.sin(theta) * r[1]];
      }
      if (parts.includes('h')) p.t = -90 - Math.cos(theta) * 6;
    }
    const j = solve(p, s.view);
    this.armN.setAttribute('d', `M${fmt(j.shN)}L${fmt(j.eN)}L${fmt(j.wN)}`);
    this.armF.setAttribute('d', `M${fmt(j.shF)}L${fmt(j.eF)}L${fmt(j.wF)}`);
    this.legN.setAttribute('d', `M${fmt(j.hpN)}L${fmt(j.kN)}L${fmt(j.aN)}L${fmt(j.tN)}`);
    this.legF.setAttribute('d', `M${fmt(j.hpF)}L${fmt(j.kF)}L${fmt(j.aF)}L${fmt(j.tF)}`);
    this.torso.setAttribute('d', `M${fmt(j.hip)}Q${fmt(j.ctrl)} ${fmt(j.neck)}`);
    this.head.setAttribute('cx', j.head[0].toFixed(1));
    this.head.setAttribute('cy', j.head[1].toFixed(1));
    if (this.shadow) this.shadow.setAttribute('cx', j.hip[0].toFixed(1));
    if (this.strap) this.strap.setAttribute('d', `M${fmt(j.wN)}L${fmt(j.tN)}`);
  }
}
