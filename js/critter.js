// Cute collectible "Fibbie" critters, drawn as inline SVG strings.
const INK = '#2b2233';

function face(closed) {
  const eyes = closed
    ? `<path d="M40 65 q7 6 14 0 M66 65 q7 6 14 0" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="47" cy="64" rx="9" ry="10.5" fill="#fff"/><ellipse cx="73" cy="64" rx="9" ry="10.5" fill="#fff"/>
       <circle cx="48" cy="66" r="6.4" fill="${INK}"/><circle cx="74" cy="66" r="6.4" fill="${INK}"/>
       <circle cx="50.5" cy="62.5" r="2.6" fill="#fff"/><circle cx="76.5" cy="62.5" r="2.6" fill="#fff"/>
       <circle cx="45.6" cy="69" r="1.3" fill="#fff"/><circle cx="71.6" cy="69" r="1.3" fill="#fff"/>`;
  return `${eyes}
    <ellipse cx="35" cy="77" rx="6.5" ry="3.8" fill="#ff8fab" opacity=".75"/>
    <ellipse cx="85" cy="77" rx="6.5" ry="3.8" fill="#ff8fab" opacity=".75"/>
    <path d="M53.5 76 q3.25 4.2 6.5 0 q3.25 4.2 6.5 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function accessory(acc, top) {
  switch (acc) {
    case 'headband':
      return `<rect x="27" y="${top + 8}" width="66" height="9" rx="4.5" fill="#ff5d73"/>
        <path d="M92 ${top + 12} l12 -6 l-2 10 z M92 ${top + 13} l13 4 l-8 7 z" fill="#ff5d73"/>`;
    case 'ears':
      return `<circle cx="37" cy="${top + 4}" r="11" fill="oklch(0.72 0.13 25)"/><circle cx="83" cy="${top + 4}" r="11" fill="oklch(0.72 0.13 25)"/>
        <circle cx="37" cy="${top + 5}" r="6" fill="#ffb3c6"/><circle cx="83" cy="${top + 5}" r="6" fill="#ffb3c6"/>`;
    case 'wristbands':
      return `<circle cx="17" cy="38" r="7" fill="#fff" stroke="#4cc9f0" stroke-width="3"/><circle cx="103" cy="38" r="7" fill="#fff" stroke="#4cc9f0" stroke-width="3"/>`;
    case 'bow':
      return `<g transform="translate(80 ${top + 4}) rotate(18)"><path d="M0 0 L-15 -9 L-15 9 Z M0 0 L15 -9 L15 9 Z" fill="#ff4f8b"/><circle r="4.5" fill="#ff7aa8"/></g>`;
    case 'flowers':
      return [26, 41, 60, 79, 94].map((x, i) => `<circle cx="${x}" cy="${top + 6 - (i === 2 ? 4 : i % 2 ? 2 : 0)}" r="6.5" fill="${['#ff8fab', '#ffd166', '#c77dff', '#ffd166', '#ff8fab'][i]}"/><circle cx="${x}" cy="${top + 6 - (i === 2 ? 4 : i % 2 ? 2 : 0)}" r="2.2" fill="#fff"/>`).join('');
    case 'bolt':
      return `<path d="M63 82 L54 96 L61 96 L57 108 L69 92 L62 92 L66 82 Z" fill="#ffd60a" stroke="#f4a100" stroke-width="1.5" stroke-linejoin="round"/>`;
    case 'leaf':
      return `<path d="M60 ${top + 2} q-2 -16 14 -20 q2 16 -14 20 z" fill="#52b788"/><path d="M60 ${top + 2} q5 -8 12 -16" stroke="#2d6a4f" stroke-width="1.5" fill="none"/>`;
    case 'nightcap':
      return `<path d="M30 ${top + 12} Q46 ${top - 26} 96 ${top - 10} Q86 ${top + 2} 90 ${top + 12} Z" fill="#5a4fcf"/>
        <rect x="28" y="${top + 8}" width="64" height="8" rx="4" fill="#fff"/><circle cx="98" cy="${top - 10}" r="6" fill="#fff"/>`;
    case 'medal':
      return `<path d="M52 80 L60 94 L68 80" stroke="#4361ee" stroke-width="5" fill="none"/><circle cx="60" cy="98" r="8" fill="#ffd166" stroke="#f4a100" stroke-width="2"/><path d="M60 93.5 l1.5 3 3.2 .4 -2.4 2.2 .6 3.2 -2.9 -1.6 -2.9 1.6 .6 -3.2 -2.4 -2.2 3.2 -.4z" fill="#fff"/>`;
    case 'crown':
      return `<path d="M36 ${top + 8} L36 ${top - 10} L48 ${top} L60 ${top - 16} L72 ${top} L84 ${top - 10} L84 ${top + 8} Z" fill="#ffd60a" stroke="#f4a100" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="60" cy="${top - 1}" r="3" fill="#ff4f8b"/><circle cx="45" cy="${top + 3}" r="2.2" fill="#4cc9f0"/><circle cx="75" cy="${top + 3}" r="2.2" fill="#4cc9f0"/>
        <path d="M14 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z M104 14 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#ffd60a"/>`;
    case 'tall':
      return `<rect x="27" y="${top + 10}" width="66" height="7" rx="3.5" fill="#ffd166"/>`;
    default:
      return '';
  }
}

/** Return an SVG string for a Fibbie. */
export function critterSVG(f, { locked = false, className = '' } = {}) {
  const tall = f.acc === 'tall';
  const top = tall ? 18 : 34;
  const h = tall ? 90 : 72;
  const body = locked ? 'var(--surface-container-highest)' : `oklch(0.84 0.13 ${f.hue})`;
  const dark = locked ? 'var(--outline-variant)' : `oklch(0.66 0.15 ${f.hue})`;
  const wings = !locked && f.acc === 'wings'
    ? `<ellipse cx="22" cy="78" rx="14" ry="9" fill="#fff" stroke="#c9d6ff" stroke-width="2" transform="rotate(-25 22 78)"/>
       <ellipse cx="98" cy="78" rx="14" ry="9" fill="#fff" stroke="#c9d6ff" stroke-width="2" transform="rotate(25 98 78)"/>`
    : '';
  const glow = !locked && f.rarity >= 3 ? `<circle cx="60" cy="64" r="56" fill="url(#g-${f.id})"/>
    <defs><radialGradient id="g-${f.id}"><stop offset="0" stop-color="#fff3b0" stop-opacity=".9"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient></defs>` : '';
  const inner = locked
    ? `<text x="60" y="${top + h / 2 + 10}" text-anchor="middle" font-size="30" font-weight="800" fill="var(--outline)" font-family="system-ui">?</text>`
    : `<ellipse cx="60" cy="${top + h * 0.62}" rx="22" ry="${h * 0.24}" fill="#fff" opacity=".28"/>
       <path d="M38 ${top + 12} q6 -5 13 -3 M36 ${top + 22} q4 -3 8 -2" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/>
       ${face(['zenny', 'snoozy'].includes(f.id))}
       ${accessory(f.acc, top)}`;
  return `<svg viewBox="0 0 120 120" class="critter ${className}" aria-hidden="true">
    ${glow}
    <ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".1"/>
    ${wings}
    <path d="M36 ${top + 30} Q22 ${top + 14} 18 ${top + 2}" stroke="${dark}" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M84 ${top + 30} Q98 ${top + 14} 102 ${top + 2}" stroke="${dark}" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="18" cy="${top + 2}" r="6.5" fill="${body}"/><circle cx="102" cy="${top + 2}" r="6.5" fill="${body}"/>
    <ellipse cx="46" cy="106" rx="10" ry="6" fill="${dark}"/><ellipse cx="74" cy="106" rx="10" ry="6" fill="${dark}"/>
    <rect x="26" y="${top}" width="68" height="${h}" rx="34" fill="${body}"/>
    ${inner}
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
    <ellipse class="chest-glow" cx="80" cy="74" rx="52" ry="16" fill="#fffbe0"/>
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
    </g>
    <g class="chest-lid">
      <path d="M20 74 L20 54 Q20 26 80 26 Q140 26 140 54 L140 74 Z" fill="${c.body}" stroke="${c.dark}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M38 33 L38 74 L51 74 L51 29 Z M109 29 L109 74 L122 74 L122 33 Z" fill="${c.band}" stroke="${c.dark}" stroke-width="2"/>
      <rect x="69" y="60" width="22" height="20" rx="5" fill="${c.band}" stroke="${c.dark}" stroke-width="2.5"/>
      <path d="M80 66 l2 4 -4 0z" fill="${c.dark}"/>
    </g>
  </svg>`;
}
