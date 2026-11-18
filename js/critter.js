// Cute collectible "Fibbie" critters, drawn as inline SVG strings from a genome (see fibbies.js).
// Everything is plain shapes: no images. The 12 originals use the 'bean' body and classic face.
const INK = '#2b2233';
let uidN = 0;

// ---------- Body ----------
const SHAPE = {
  bean: { W: 68, H: 72, rect: true },
  tall: { W: 68, H: 90, rect: true },
  wide: { W: 88, H: 62, rect: true },
  round: { W: 78, H: 74, tw: 52, bw: 62, m: 0.5 },
  pear: { W: 80, H: 74, tw: 40, bw: 84, m: 0.64 },
  drop: { W: 72, H: 80, tw: 6, bw: 76, m: 0.64 },
};
const YB = 106; // body bottom

function bodyPath(s) {
  const yT = YB - s.H;
  if (s.rect) {
    const r = Math.min(s.W, s.H) / 2;
    return { d: null, rect: `x="${60 - s.W / 2}" y="${yT}" width="${s.W}" height="${s.H}" rx="${r}"`, yT };
  }
  const R = 60 + s.W / 2;
  const L = 60 - s.W / 2;
  const yM = yT + s.H * s.m;
  const d = `M60 ${yT} C${60 + s.tw / 2} ${yT} ${R} ${yT + s.H * 0.12} ${R} ${yM} C${R} ${YB - s.H * 0.02} ${60 + s.bw / 2} ${YB} 60 ${YB}`
    + ` C${60 - s.bw / 2} ${YB} ${L} ${YB - s.H * 0.02} ${L} ${yM} C${L} ${yT + s.H * 0.12} ${60 - s.tw / 2} ${yT} 60 ${yT}Z`;
  return { d, rect: null, yT };
}

// ---------- Face ----------
function eye(cx, cy, k, pupil) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${9 * k}" ry="${10.5 * k}" fill="#fff"/>
    <circle cx="${cx + k}" cy="${cy + 2 * k}" r="${6.4 * k}" fill="${pupil}"/>
    <circle cx="${cx + 3.5 * k}" cy="${cy - 1.5 * k}" r="${2.6 * k}" fill="#fff"/>
    <circle cx="${cx - 1.4 * k}" cy="${cy + 5 * k}" r="${1.3 * k}" fill="#fff"/>`;
}
const closedEye = (cx, cy) => `<path d="M${cx - 7} ${cy + 1} q7 6 14 0" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
const star = (x, y, r, fill) => `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3}Z" fill="${fill}"/>`;

function face(g, fy, W, pupil) {
  let eyes;
  switch (g.eyes) {
    case 'big': eyes = eye(46, fy, 1.2, pupil) + eye(74, fy, 1.2, pupil); break;
    case 'sparkle': eyes = eye(47, fy, 1, pupil) + eye(73, fy, 1, pupil) + star(51, fy - 3, 3.6, '#fff') + star(77, fy - 3, 3.6, '#fff'); break;
    case 'sleepy': eyes = closedEye(47, fy) + closedEye(73, fy); break;
    case 'wink': eyes = eye(47, fy, 1, pupil) + closedEye(73, fy); break;
    case 'cyclops': eyes = eye(60, fy - 1, 1.45, pupil); break;
    case 'three': eyes = eye(43, fy + 1, 0.72, pupil) + eye(60, fy - 4, 0.8, pupil) + eye(77, fy + 1, 0.72, pupil); break;
    default: eyes = eye(47, fy, 1, pupil) + eye(73, fy, 1, pupil);
  }
  const my = fy + 12;
  let mouth;
  const w = `<path d="M53.5 ${my} q3.25 4.2 6.5 0 q3.25 4.2 6.5 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  switch (g.mouth) {
    case 'smile': mouth = `<path d="M53 ${my} q7 7 14 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`; break;
    case 'open': mouth = `<path d="M53.5 ${my} q6.5 11 13 0 z" fill="${INK}"/><ellipse cx="60" cy="${my + 4.6}" rx="3.4" ry="2" fill="#ff8fab"/>`; break;
    case 'tongue': mouth = `${w}<path d="M57.5 ${my + 2.2} q2.5 6 5 0 z" fill="#ff6f91"/>`; break;
    case 'fang': mouth = `${w}<path d="M56 ${my + 1.4} l1.6 3.6 l1.6 -3.2 z" fill="#fff" stroke="${INK}" stroke-width=".6"/>`; break;
    case 'cat': mouth = `<path d="M51 ${my - 1} q4.5 5 9 0 q4.5 5 9 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`; break;
    default: mouth = w;
  }
  const cx = Math.min(25, W / 2 - 9);
  const cheeks = g.cheeks === false ? '' : `<ellipse cx="${60 - cx}" cy="${fy + 13}" rx="6.5" ry="3.8" fill="#ff8fab" opacity=".75"/>
    <ellipse cx="${60 + cx}" cy="${fy + 13}" rx="6.5" ry="3.8" fill="#ff8fab" opacity=".75"/>`;
  const glasses = g.acc === 'glasses' && !['cyclops', 'three'].includes(g.eyes)
    ? `<circle cx="47" cy="${fy}" r="12" fill="#fff" fill-opacity=".15" stroke="${INK}" stroke-width="2.6"/><circle cx="73" cy="${fy}" r="12" fill="#fff" fill-opacity=".15" stroke="${INK}" stroke-width="2.6"/><path d="M59 ${fy - 1} q1 -2 2 0" stroke="${INK}" stroke-width="2.6" fill="none"/>`
    : '';
  return `${eyes}${cheeks}${mouth}${glasses}`;
}

// ---------- Classic accessories (drawn for a 68-wide body; scaled for other widths) ----------
function accessory(acc, top) {
  switch (acc) {
    case 'headband':
      return `<rect x="27" y="${top + 8}" width="66" height="9" rx="4.5" fill="#ff5d73"/>
        <path d="M92 ${top + 12} l12 -6 l-2 10 z M92 ${top + 13} l13 4 l-8 7 z" fill="#ff5d73"/>`;
    case 'ears':
      return `<circle cx="37" cy="${top + 4}" r="11" fill="oklch(0.72 0.13 25)"/><circle cx="83" cy="${top + 4}" r="11" fill="oklch(0.72 0.13 25)"/>
        <circle cx="37" cy="${top + 5}" r="6" fill="#ffb3c6"/><circle cx="83" cy="${top + 5}" r="6" fill="#ffb3c6"/>`;
    case 'bow':
      return `<g transform="translate(80 ${top + 4}) rotate(18)"><path d="M0 0 L-15 -9 L-15 9 Z M0 0 L15 -9 L15 9 Z" fill="#ff4f8b"/><circle r="4.5" fill="#ff7aa8"/></g>`;
    case 'flowers':
      return [26, 41, 60, 79, 94].map((x, i) => `<circle cx="${x}" cy="${top + 6 - (i === 2 ? 4 : i % 2 ? 2 : 0)}" r="6.5" fill="${['#ff8fab', '#ffd166', '#c77dff', '#ffd166', '#ff8fab'][i]}"/><circle cx="${x}" cy="${top + 6 - (i === 2 ? 4 : i % 2 ? 2 : 0)}" r="2.2" fill="#fff"/>`).join('');
    case 'leaf':
      return `<path d="M60 ${top + 2} q-2 -16 14 -20 q2 16 -14 20 z" fill="#52b788"/><path d="M60 ${top + 2} q5 -8 12 -16" stroke="#2d6a4f" stroke-width="1.5" fill="none"/>`;
    case 'nightcap':
      return `<path d="M30 ${top + 12} Q46 ${top - 26} 96 ${top - 10} Q86 ${top + 2} 90 ${top + 12} Z" fill="#5a4fcf"/>
        <rect x="28" y="${top + 8}" width="64" height="8" rx="4" fill="#fff"/><circle cx="98" cy="${top - 10}" r="6" fill="#fff"/>`;
    case 'crown':
      return `<path d="M36 ${top + 8} L36 ${top - 10} L48 ${top} L60 ${top - 16} L72 ${top} L84 ${top - 10} L84 ${top + 8} Z" fill="#ffd60a" stroke="#f4a100" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="60" cy="${top - 1}" r="3" fill="#ff4f8b"/><circle cx="45" cy="${top + 3}" r="2.2" fill="#4cc9f0"/><circle cx="75" cy="${top + 3}" r="2.2" fill="#4cc9f0"/>`;
    case 'tall':
      return `<rect x="27" y="${top + 10}" width="66" height="7" rx="3.5" fill="#ffd166"/>`;
    default:
      return '';
  }
}
function lowerAccessory(acc) {
  if (acc === 'bolt') return `<path d="M63 82 L54 96 L61 96 L57 108 L69 92 L62 92 L66 82 Z" fill="#ffd60a" stroke="#f4a100" stroke-width="1.5" stroke-linejoin="round"/>`;
  if (acc === 'medal') return `<path d="M52 80 L60 94 L68 80" stroke="#4361ee" stroke-width="5" fill="none"/><circle cx="60" cy="98" r="8" fill="#ffd166" stroke="#f4a100" stroke-width="2"/><path d="M60 93.5 l1.5 3 3.2 .4 -2.4 2.2 .6 3.2 -2.9 -1.6 -2.9 1.6 .6 -3.2 -2.4 -2.2 3.2 -.4z" fill="#fff"/>`;
  return '';
}

// ---------- Head features (behind the body) ----------
function headBehind(g, W, yT, body, dark) {
  const ex = W * 0.3;
  switch (g.head) {
    case 'pointy':
      return [-1, 1].map((s) => `<path d="M${60 + s * (ex - 11)} ${yT + 10} L${60 + s * (ex + 5)} ${yT - 15} L${60 + s * (ex + 12)} ${yT + 12}Z" fill="${body}" stroke="${dark}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M${60 + s * (ex - 4)} ${yT + 6} L${60 + s * (ex + 5)} ${yT - 8} L${60 + s * (ex + 8)} ${yT + 7}Z" fill="#ffb3c6"/>`).join('');
    case 'bunny':
      return [-1, 1].map((s) => `<g transform="rotate(${s * 12} ${60 + s * 13} ${yT + 4})"><ellipse cx="${60 + s * 13}" cy="${yT - 12}" rx="7.5" ry="19" fill="${body}"/><ellipse cx="${60 + s * 13}" cy="${yT - 11}" rx="3.4" ry="13" fill="#ffb3c6"/></g>`).join('');
    case 'antenna':
    case 'antenna2': {
      const xs = g.head === 'antenna' ? [0] : [-12, 12];
      return xs.map((x) => `<path d="M${60 + x} ${yT + 4} q${x ? x * 0.4 : 2} -12 ${x ? x * 0.6 : 7} -20" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="${60 + x + (x ? x * 0.6 : 7)}" cy="${yT - 16}" r="5" fill="oklch(0.8 0.16 ${g.hue2})"/><circle cx="${60 + x + (x ? x * 0.6 : 7) - 1.5}" cy="${yT - 17.5}" r="1.6" fill="#fff"/>`).join('');
    }
    case 'horns':
      return [-1, 1].map((s) => `<path d="M${60 + s * (ex - 6)} ${yT + 8} q${s * 2} -16 ${s * 12} -18 q${s * -6} 8 ${s * -2} 20Z" fill="#fff3d6" stroke="#d9b98a" stroke-width="1.5" stroke-linejoin="round"/>`).join('');
    default:
      return '';
  }
}
function headFront(g, yT) {
  switch (g.head) {
    case 'ears':
      return [-1, 1].map((s) => `<circle cx="${60 + s * 23}" cy="${yT + 4}" r="10" fill="oklch(0.72 0.13 ${g.hue})"/><circle cx="${60 + s * 23}" cy="${yT + 5}" r="5.4" fill="#ffb3c6"/>`).join('');
    case 'sprout':
      return accessory('leaf', yT);
    case 'tuft':
      return `<path d="M53 ${yT + 3} q-3 -10 5 -11 M60 ${yT + 1} q-1 -13 8 -13 M67 ${yT + 3} q2 -9 9 -8" stroke="oklch(0.66 0.15 ${g.hue})" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
    default:
      return '';
  }
}

// ---------- Patterns (clipped to the body) ----------
function pattern(g, s, yT, fy) {
  const L = 60 - s.W / 2;
  const R = 60 + s.W / 2;
  const light = `oklch(0.93 0.07 ${g.hue2})`;
  const mid = `oklch(0.74 0.14 ${g.hue2})`;
  switch (g.pattern) {
    case 'spots':
      return [[L + 9, yT + s.H * 0.72, 6], [R - 11, yT + s.H * 0.28, 5], [R - 7, yT + s.H * 0.8, 7], [L + 6, yT + s.H * 0.3, 4], [L + 18, yT + 6, 3.5]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${light}" opacity=".85"/>`).join('');
    case 'stripes':
      return [0, 9, 18].map((d) => `<rect x="${L}" y="${yT + 3 + d}" width="${s.W}" height="4.5" fill="oklch(0.66 0.15 ${g.hue})" opacity=".45"/>`).join('');
    case 'belly':
      return `<ellipse cx="60" cy="${YB - s.H * 0.24}" rx="${s.W * 0.33}" ry="${s.H * 0.24}" fill="${light}"/>`;
    case 'freckles':
      return [[38, 0], [42, 3], [35, 4], [82, 0], [78, 3], [85, 4]].map(([x, y]) => `<circle cx="${x}" cy="${fy + 19 + y}" r="1.3" fill="oklch(0.6 0.12 ${g.hue})"/>`).join('');
    case 'heart':
      return `<path d="M60 ${YB - 7} l-7 -7 a4 4 0 0 1 7 -5 a4 4 0 0 1 7 5 z" fill="${mid}"/>`;
    case 'patch':
      return `<circle cx="73" cy="${fy}" r="14" fill="${mid}" opacity=".6"/>`;
    default:
      return '';
  }
}

// ---------- Wings and aura ----------
function wings(kind, W, yT, H, hue2) {
  const y = yT + H * 0.62;
  const x = W / 2 + 2;
  if (kind === 'fairy') {
    return [-1, 1].map((sd) => `<g transform="rotate(${sd * -28} ${60 + sd * x} ${y})"><ellipse cx="${60 + sd * (x + 10)}" cy="${y - 8}" rx="17" ry="10" fill="oklch(0.9 0.08 ${hue2})" fill-opacity=".75" stroke="oklch(0.75 0.12 ${hue2})" stroke-width="1.5"/>
      <ellipse cx="${60 + sd * (x + 6)}" cy="${y + 8}" rx="11" ry="6.5" fill="oklch(0.9 0.08 ${hue2})" fill-opacity=".75" stroke="oklch(0.75 0.12 ${hue2})" stroke-width="1.5"/></g>`).join('');
  }
  if (kind === 'bat') {
    return [-1, 1].map((sd) => `<path d="M${60 + sd * (x - 6)} ${y - 6} L${60 + sd * (x + 22)} ${y - 18} L${60 + sd * (x + 18)} ${y - 4} L${60 + sd * (x + 24)} ${y + 2} L${60 + sd * (x + 12)} ${y + 2} L${60 + sd * (x + 12)} ${y + 10} L${60 + sd * (x - 4)} ${y + 6}Z" fill="oklch(0.45 0.1 ${hue2})" stroke-linejoin="round"/>`).join('');
  }
  return [-1, 1].map((sd) => `<ellipse cx="${60 + sd * (x + 2)}" cy="${y}" rx="14" ry="9" fill="#fff" stroke="#c9d6ff" stroke-width="2" transform="rotate(${sd * 25} ${60 + sd * (x + 2)} ${y})"/>`).join('');
}

/**
 * SVG string for a Fibbie (from fibbie() in fibbies.js).
 * opts.locked draws a "?" placeholder; opts.className adds classes (e.g. 'sil' for a silhouette).
 */
export function critterSVG(f, { locked = false, className = '' } = {}) {
  if (locked || !f) {
    return `<svg viewBox="-10 -14 140 140" class="critter ${className}" aria-hidden="true">
      <ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".1"/>
      <rect x="26" y="34" width="68" height="72" rx="34" fill="var(--surface-container-highest)"/>
      <text x="60" y="80" text-anchor="middle" font-size="30" font-weight="800" fill="var(--outline)" font-family="system-ui">?</text></svg>`;
  }
  const g = f.genome;
  const s = SHAPE[g.shape] || SHAPE.bean;
  const { d, rect, yT } = bodyPath(s);
  const W = s.W;
  const chroma = f.stage >= 4 ? 0.16 : 0.13;
  const body = `oklch(0.84 ${chroma} ${g.hue})`;
  const dark = `oklch(0.66 0.15 ${g.hue})`;
  const pupil = f.glow >= 2 && !f.classic ? `oklch(0.42 0.16 ${g.hue2})` : INK;
  const fy = yT + s.H * (g.shape === 'drop' || g.shape === 'pear' ? 0.5 : 0.42);
  const id = `fb${uidN++}`;
  const shapeEl = (attrs) => (rect ? `<rect ${rect} ${attrs}/>` : `<path d="${d}" ${attrs}/>`);

  // Arms: shoulder -> hand, hands are body-coloured balls.
  const sy = yT + Math.min(30, s.H * 0.42);
  const hx = W / 2 + 8;
  const hands = {
    up: [[-hx, yT + 2, -(W / 2 + 4), yT + 14], [hx, yT + 2, W / 2 + 4, yT + 14]],
    wave: [[-hx, yT + 2, -(W / 2 + 4), yT + 14], [W / 2 + 14, yT + s.H * 0.66, W / 2 + 12, yT + s.H * 0.46]],
    out: [[-(W / 2 + 18), yT + s.H * 0.36, -(W / 2 + 10), sy + 6], [W / 2 + 18, yT + s.H * 0.36, W / 2 + 10, sy + 6]],
  }[g.arms || 'up'] || [];
  const arms = hands.map(([x, y, cx, cy], i) => {
    const sx = 60 + (i ? 1 : -1) * (W / 2 - 8);
    return `<path d="M${sx} ${sy} Q${60 + cx} ${cy} ${60 + x} ${y}" stroke="${dark}" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="${60 + x}" cy="${y}" r="6.5" fill="${body}"/>`
      + (g.acc === 'wristbands' ? `<circle cx="${60 + x + (i ? 1 : -1)}" cy="${y + 4}" r="7" fill="#fff" fill-opacity="0" stroke="#4cc9f0" stroke-width="3"/>` : '');
  }).join('');

  const scaleX = W / 68;
  const topAcc = ['headband', 'ears', 'bow', 'flowers', 'leaf', 'nightcap', 'crown', 'tall'].includes(g.acc)
    ? `<g transform="translate(60 0) scale(${scaleX} 1) translate(-60 0)">${accessory(g.acc, yT)}</g>` : '';
  const scarf = g.acc === 'scarf'
    ? `<rect x="${60 - W / 2}" y="${fy + 20}" width="${W}" height="8" fill="oklch(0.65 0.18 ${g.hue2})"/><rect x="${60 + W * 0.18}" y="${fy + 24}" width="9" height="16" rx="3" fill="oklch(0.6 0.18 ${g.hue2})"/>` : '';

  const wingKind = g.wing || (g.acc === 'wings' ? 'wings' : null);
  const aura = g.aura || f.glow >= 3
    ? `<defs><radialGradient id="${id}g"><stop offset="0" stop-color="${g.aura ? `oklch(0.95 0.08 ${g.hue2})` : '#fff3b0'}" stop-opacity=".95"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient></defs>
       <circle cx="60" cy="66" r="60" fill="url(#${id}g)"/>` : '';
  const halo = g.aura ? `<ellipse cx="60" cy="${yT - 12}" rx="20" ry="5" fill="none" stroke="#ffd60a" stroke-width="3.5"/>` : '';
  const sparkles = f.glow >= 1
    ? [[12, 20, 5], [108, 12, 4], [112, 70, 3.5]].slice(0, f.glow).map(([x, y, r]) => star(x, y, r, '#ffd60a')).join('') : '';
  const scale = [1, 1, 1.04, 1.08, 1.1][f.stage] || 1;

  return `<svg viewBox="-10 -14 140 140" class="critter ${className}" aria-hidden="true">
    ${aura}
    <ellipse cx="60" cy="112" rx="${W * 0.45}" ry="5" fill="#000" opacity=".1"/>
    <g transform="translate(60 110) scale(${scale}) translate(-60 -110)">
    ${wingKind ? wings(wingKind, W, yT, s.H, g.hue2) : ''}
    ${halo}
    ${headBehind(g, W, yT, body, dark)}
    ${arms}
    <ellipse cx="${60 - Math.min(14, W * 0.2)}" cy="106" rx="10" ry="6" fill="${dark}"/><ellipse cx="${60 + Math.min(14, W * 0.2)}" cy="106" rx="10" ry="6" fill="${dark}"/>
    ${shapeEl(`fill="${body}"`)}
    <clipPath id="${id}c">${shapeEl('')}</clipPath>
    <g clip-path="url(#${id}c)">${pattern(g, s, yT, fy)}${scarf}</g>
    <ellipse cx="60" cy="${yT + s.H * 0.62}" rx="${W * 0.32}" ry="${s.H * 0.24}" fill="#fff" opacity=".28"/>
    <path d="M${60 - W * 0.32} ${yT + 12} q6 -5 13 -3 M${60 - W * 0.35} ${yT + 22} q4 -3 8 -2" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${face(g, fy, W, pupil)}
    ${headFront(g, yT)}
    ${topAcc}
    ${lowerAccessory(g.acc)}
    </g>
    ${sparkles}
  </svg>`;
}

/** Chest SVG. tier 0..3 */
const CHEST = [
  { body: '#c98a4b', dark: '#7a4b22', band: '#f2c14e' },
  { body: '#5aa9e6', dark: '#24588a', band: '#e8f1fb' },
  { body: '#9b6bf2', dark: '#4b2a9a', band: '#ffd166' },
  { body: '#ffcf3f', dark: '#b06a00', band: '#ff5fa2' },
];
export function chestSVG(tier) {
  const c = CHEST[tier];
  return `<svg viewBox="0 0 160 150" class="chest-svg" aria-hidden="true">
    <ellipse cx="80" cy="140" rx="62" ry="8" fill="#000" opacity=".25"/>
    <defs><radialGradient id="chest-glow-g"><stop offset="0" stop-color="#fffbe0"/><stop offset=".6" stop-color="#fffbe0" stop-opacity=".85"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></radialGradient></defs>
    <ellipse class="chest-glow" cx="80" cy="74" rx="60" ry="22" fill="url(#chest-glow-g)"/>
    <g class="chest-base">
      <rect x="20" y="70" width="120" height="66" rx="14" fill="${c.body}" stroke="${c.dark}" stroke-width="4"/>
      <rect x="38" y="70" width="13" height="66" fill="${c.band}" stroke="${c.dark}" stroke-width="2"/>
      <rect x="109" y="70" width="13" height="66" fill="${c.band}" stroke="${c.dark}" stroke-width="2"/>
      <g class="chest-face">
        <path class="cf-closed" d="M64 101 q5 -6 10 0 M86 101 q5 -6 10 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <g class="cf-open"><circle cx="69" cy="100" r="5" fill="${INK}"/><circle cx="91" cy="100" r="5" fill="${INK}"/><circle cx="70.6" cy="98.3" r="1.8" fill="#fff"/><circle cx="92.6" cy="98.3" r="1.8" fill="#fff"/></g>
        <ellipse cx="60" cy="110" rx="5" ry="3" fill="#ff8fab" opacity=".8"/><ellipse cx="100" cy="110" rx="5" ry="3" fill="#ff8fab" opacity=".8"/>
        <path class="cf-mouth" d="M75 110 q5 5 10 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      </g>
      <g class="chest-cracks" stroke="#fffbe0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path class="ck1" d="M62 70 l4 10 -5 8 4 9"/>
        <path class="ck2" d="M100 70 l-3 9 5 7 -4 10 M128 84 l-8 6 4 8"/>
      </g>
    </g>
    <g class="chest-lid">
      <path d="M20 74 L20 54 Q20 26 80 26 Q140 26 140 54 L140 74 Z" fill="${c.body}" stroke="${c.dark}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M38 33 L38 74 L51 74 L51 29 Z M109 29 L109 74 L122 74 L122 33 Z" fill="${c.band}" stroke="${c.dark}" stroke-width="2"/>
      <rect x="69" y="60" width="22" height="20" rx="5" fill="${c.band}" stroke="${c.dark}" stroke-width="2.5"/>
      <path d="M80 66 l2 4 -4 0z" fill="${c.dark}"/>
    </g>
  </svg>`;
}
