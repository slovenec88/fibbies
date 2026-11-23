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

/** Two-bone IK that picks whichever of the two elbow (or knee) positions points most along `pref`. */
function ikToward(root, target, l1, l2, pref) {
  const a = ik(root, target, l1, l2, 1);
  const b = ik(root, target, l1, l2, -1);
  const score = (j) => (j[0] - root[0]) * pref[0] + (j[1] - root[1]) * pref[1];
  return score(a[0]) >= score(b[0]) ? a : b;
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

/** Shoulder points for a pose, the same way solve() places them. */
function shoulders(p, view) {
  const neck = add(p.h, dir(p.t, LEN.torso));
  const sw = view === 'side' ? 0 : 15;
  return { hN: add(neck, dir(p.t + 90, sw)), hF: add(neck, dir(p.t + 90, -sw)) };
}

const onFloor = (f) => f[1] >= 176;
/** True when the feet take turns: each one goes between the floor and the air, opposite to the other. */
function steps(s) {
  const { a, b } = s;
  return !!(a.fN && a.fF && b.fN && b.fF) && onFloor(a.fN) !== onFloor(b.fN) && onFloor(a.fF) !== onFloor(b.fF)
    && onFloor(a.fN) !== onFloor(a.fF);
}

/**
 * The pose at `t` between a and b. A hand that travels far (raising the arms, say) moves along an
 * arc around its shoulder, the way an arm swings, instead of in a straight line through the head.
 * Hands that stay put (on a wall or the floor) keep the straight blend so they don't slide off.
 */
function pose(s, t) {
  const p = blend(s.a, s.b, t);
  if (s.view === 'top') return p;
  // Running in place (one foot up, then the other): the lifted foot lands in the first half and the
  // other only leaves the floor in the second, instead of both floating halfway through each step.
  if (steps(s)) {
    for (const k of ['fN', 'fF']) {
      // Each foot eases onto and off the floor, so the step has a soft contact instead of a snap.
      const u = onFloor(s.a[k]) ? 1 - Math.cos((Math.max(0, t * 2 - 1) * Math.PI) / 2) : Math.sin((Math.min(1, t * 2) * Math.PI) / 2);
      p[k] = lerp(s.a[k], s.b[k], u);
    }
  }
  const sa = shoulders(s.a, s.view), sb = shoulders(s.b, s.view), sp = shoulders(p, s.view);
  for (const k of ['hN', 'hF']) {
    const A = s.a[k], B = s.b[k];
    if (!A || !B || Math.hypot(B[0] - A[0], B[1] - A[1]) < 24) continue;
    const ra = [A[0] - sa[k][0], A[1] - sa[k][1]], rb = [B[0] - sb[k][0], B[1] - sb[k][1]];
    const aa = Math.atan2(ra[1], ra[0]);
    let da = Math.atan2(rb[1], rb[0]) - aa;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    // Seen from the front, an arm passes in front of the body, so a far swing (a twist) goes straight.
    // Seen from the side, a big swing (floor to overhead) keeps the short way round unless that
    // sweeps the hand down through the body (past the line from shoulder to hips); then it goes the
    // other way, out in front. Small swings past the hips (walking, running arms) stay as they are.
    if (s.view !== 'side' && Math.abs(da) > rad(150)) continue;
    if (s.view === 'side' && Math.abs(da) > rad(120)) {
      let h = Math.atan2(s.a.h[1] - sa[k][1], s.a.h[0] - sa[k][0]) - aa;
      h = Math.atan2(Math.sin(h), Math.cos(h));
      if (Math.sign(h) === Math.sign(da) && Math.abs(h) < Math.abs(da)) da -= Math.sign(da) * Math.PI * 2;
    }
    const ang = aa + da * t;
    const len = Math.hypot(...ra) + (Math.hypot(...rb) - Math.hypot(...ra)) * t;
    p[k] = [sp[k][0] + Math.cos(ang) * len, sp[k][1] + Math.sin(ang) * len];
  }
  return p;
}

/**
 * In a moving exercise the arms and head trail the body a moment, the way loose limbs follow
 * through, which reads smoother than everything arriving at once. They trail in the body's own
 * frame, so hands resting on the head or hips stay there, and hands that stay put in the world
 * (on the floor, on a wall) don't trail at all, so they never slide.
 */
const LAG = 0.4; // radians of the cycle, about 6% of it
function followThrough(s, p, theta) {
  const q = pose(s, (1 - Math.cos(theta - LAG)) / 2);
  const sp = shoulders(p, s.view), sq = shoulders(q, s.view);
  const turn = rad(p.t - q.t);
  const c = Math.cos(turn), sn = Math.sin(turn);
  for (const k of ['hN', 'hF']) {
    const A = s.a[k], B = s.b[k];
    if (!A || !B || Math.hypot(B[0] - A[0], B[1] - A[1]) < 24) continue;
    const r = [q[k][0] - sq[k][0], q[k][1] - sq[k][1]];
    p[k] = [sp[k][0] + r[0] * c - r[1] * sn, sp[k][1] + r[0] * sn + r[1] * c];
  }
  if (p.n != null && q.n != null) p.n = p.t + (q.n - q.t);
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
  const kb = p.kb || (front ? [-1, 1] : [-1, -1]);
  let eN, wN, eF, wF;
  if (front && !p.eb) {
    // Elbows point away from the body and a little down, whether the hands are low or overhead
    // (a fixed bend direction turns them inward once the hands go up, and the arms cross).
    const down = dir(p.t + 180, 0.5);
    [eN, wN] = ikToward(shN, p.hN, LEN.ua, LEN.fa, add(dir(perp, 1), down));
    [eF, wF] = ikToward(shF, p.hF, LEN.ua, LEN.fa, add(dir(perp, -1), down));
  } else {
    const eb = p.eb || (front ? [-1, 1] : [1, 1]);
    [eN, wN] = ik(shN, p.hN, LEN.ua, LEN.fa, eb[0]);
    [eF, wF] = ik(shF, p.hF, LEN.ua, LEN.fa, eb[1]);
  }
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

const calmQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const calm = () => !!calmQuery?.matches;

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
      // a step [x0, x1, top], a chair seat [x0, x1, height] with a back at x0, a towel [x0, x1] on the floor
      if (pr.step) { const [x0, x1, y] = pr.step; el('rect', { x: x0, y, width: x1 - x0, height: 182 - y, rx: 3, class: 'fig-step' }, g); }
      if (pr.chair) { const [x0, x1, y] = pr.chair; el('path', { d: `M${x0} ${y - 44}V182M${x0} ${y}H${x1}V182`, class: 'fig-chair' }, g); }
      if (pr.towel) { const [x0, x1] = pr.towel; el('rect', { x: x0, y: 177, width: x1 - x0, height: 5, rx: 2.5, class: 'fig-towel' }, g); }
    }
    if (!top) {
      this.shadow = el('ellipse', { cx: 100, cy: 182, rx: 52, ry: 5, class: 'fig-shadow' }, g);
      el('line', { x1: 8, y1: 182, x2: 192, y2: 182, class: 'fig-ground' }, g);
    } else this.shadow = null;
    const side = stretch.view === 'side';
    // The figure itself sits in its own group so it can breathe (see animate) while the floor and props stay still.
    const body = this.body = el('g', {}, g);
    const mk = (cls) => el('path', { class: `fig-limb ${cls}` }, body);
    this.strap = props.some((p) => p.strap) ? el('path', { class: 'fig-strap' }) : null;
    if (side) {
      this.armF = mk('far');
      this.legF = mk('far');
      this.torso = el('path', { class: 'fig-torso' }, body);
      this.head = el('circle', { r: 11, class: 'fig-head' }, body);
      this.legN = mk('near');
      if (this.strap) body.appendChild(this.strap);
      this.armN = mk('near');
    } else {
      this.legF = mk('far');
      this.legN = mk('near');
      this.torso = el('path', { class: 'fig-torso' }, body);
      this.armF = mk('near');
      this.armN = mk('near');
      this.head = el('circle', { r: 11, class: 'fig-head' }, body);
      if (this.strap) body.appendChild(this.strap);
    }
    this.draw(0);
  }

  /** Tight square viewBox around the pose (both animation ends) for small thumbnails. */
  fit(pad = 12) {
    const s = this.stretch;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const t of [0, 0.5, 1]) {
      const j = solve(pose(s, t), s.view);
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
    this.breathe(time, theta);
  }

  /**
   * A little life, the way small game sprites bob: a held stretch breathes (a touch taller on the
   * in-breath), and a moving exercise squashes softly at each end of the move, like landing a step.
   * Scaled from the floor under the hips, so the feet stay planted.
   */
  breathe(time, theta) {
    if (this.stretch.view === 'top' || calm()) { this.body.removeAttribute('transform'); return; }
    const b = this.stretch.dynamic ? (steps(this.stretch) ? 1 : -1) * Math.cos(2 * theta) * 0.022 : Math.sin((time / 3.6) * Math.PI * 2) * 0.012;
    const x = this.hipX.toFixed(1);
    this.body.setAttribute('transform', `translate(${x} 182) scale(${(1 - b * 0.6).toFixed(4)} ${(1 + b).toFixed(4)}) translate(-${x} -182)`);
  }

  draw(t, theta = 0) {
    const s = this.stretch;
    const p = pose(s, t);
    if (s.dynamic && s.view !== 'top') followThrough(s, p, theta);
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
    this.hipX = j.hip[0];
    if (this.shadow) this.shadow.setAttribute('cx', j.hip[0].toFixed(1));
    if (this.strap) this.strap.setAttribute('d', `M${fmt(j.wN)}L${fmt(j.tN)}`);
  }
}
