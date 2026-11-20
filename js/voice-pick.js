// Picks the nicest voice a device has for the app language: natural/neural voices first, then
// gentle female voices, never a voice for another language.
// Works on Web Speech voices ({ name, lang, localService }) and on Android TTS voices
// (names like "en-us-x-tpf-local", which say nothing about gender, so known female ones are listed).

// Female voices across vendors (Microsoft natural and desktop, Google, Apple, Samsung, Amazon).
const FEMALE = /\b(aria|jenny|ava|emma|michelle|sonia|libby|maisie|natasha|clara|amber|ashley|cora|elizabeth|jane|nancy|sara|zira|hazel|susan|heera|katja|amala|seraphina|louisa|tanja|gisela|hedda|elke|klarissa|maja|elvira|ximena|abril|esperanza|irene|laura|lucia|helena|monica|paulina|paloma|dalia|denise|vivienne|eloise|brigitte|celeste|coralie|jacqueline|josephine|yvette|julie|hortense|elsa|isabella|fiammetta|fabiola|imelda|palmira|pierina|federica|alice|paola|francisca|raquel|fernanda|leticia|manuela|thalita|yara|brenda|giovanna|leila|joana|catarina|ines|petra|samantha|karen|moira|tessa|serena|veena|fiona|victoria|allison|susan|kate|anna|marie|amelie|audrey|aurelie|carmit|luciana|ellen|marisol|nora|joanna|kendra|kimberly|salli|ivy|ruth|olivia|vicki|marlene|celine|lea|conchita|lupe|lotte|carla|bianca|ines|vitoria|camila)\b/i;
const MALE = /\b(david|mark|guy|ryan|brian|andrew|christopher|eric|roger|steffan|thomas|william|liam|conrad|killian|kasper|ralf|bernd|christoph|alvaro|arnau|dario|elias|saul|teo|tomas|jorge|juan|henri|remy|alain|claude|jerome|maurice|yves|diego|giuseppe|benigno|calimero|cataldo|gianni|lisandro|rinaldo|antonio|duarte|fabio|humberto|julio|nicolau|valerio|rok|lado|daniel|alex|fred|luca|paolo|felipe|stefan|rocko|grandpa|eddy|reed|ralph|albert|bruce|junior|matthew|justin|joey|russell|geraint|hans|enrique|miguel|mathieu|giorgio|cristiano|ricardo|carlos|jacques|xander|aaron|arthur|oliver|gordon|lee)\b/i;
// Google's Android voices by code. Female: en-us sfg/tpf/iob/iog/tpc, en-gb gba/gbc/gbg, de dea/deb,
// es eea/eec, es-us sfb, fr fra/frc/vlf, it itb, pt-br afs/pte, pt-pt jfb.
const GOOGLE_FEMALE = /-x-(sfg|tpf|iob|iog|tpc|gba|gbc|gbg|dea|deb|eea|eec|sfb|fra|frc|vlf|itb|afs|pte|jfb)-/i;
const GOOGLE_MALE = /-x-(iol|iom|tpd|gbb|gbd|rjs|deg|ded|eef|eed|frb|frd|itc|itd|ptd|jmn)-/i;

const norm = (l) => String(l || '').replace('_', '-').toLowerCase();

/** Higher is better; -Infinity for a voice that can't speak the language. */
export function scoreVoice(v, want) {
  const lang = norm(v.lang), w = norm(want), base = w.split('-')[0];
  if (!(lang === w || lang.split('-')[0] === base)) return -Infinity;
  const name = `${v.name || ''} ${v.voiceURI || ''}`;
  // The right region first (pt-BR vs pt-PT, es-ES vs es-MX): a nicer voice with the wrong accent loses.
  let s = lang === w ? 100 : 0;
  if (/natural|neural|online|premium|enhanced|wavenet|studio/i.test(name)) s += 60;
  else if (/^google\b/i.test(v.name || '')) s += 40; // Chrome's Google voices: smooth, and female
  if (FEMALE.test(name) || GOOGLE_FEMALE.test(name) || /female|frau|femme|donna|mujer|mulher|ženski/i.test(name)) s += 35;
  if (MALE.test(name) || GOOGLE_MALE.test(name) || /(^|[^a-z])male(?![a-z])/i.test(name)) s -= 45; // also "#male_1-local"
  if (/compact|eloquence|novelty|whisper|bad news|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|zarvox|albert|bahh/i.test(name)) s -= 80; // Apple's joke and low-quality voices
  if (/-network$/i.test(name)) s -= 5; // Android: local voices start instantly and work offline
  if (v.default) s += 2;
  return s;
}

/**
 * Best voice from a list (or null when none speaks the language).
 * `needSignal`: also null when nothing marks any voice as good (natural or female), so the
 * caller keeps the engine's own default instead of whichever voice sorts first.
 */
export function bestVoice(voices, want, { needSignal = false } = {}) {
  let best = null, top = -Infinity;
  voices.forEach((v, i) => {
    const s = scoreVoice(v, want) - (norm(v.lang) === norm(want) ? 100 : 0); // compare quality within the region
    const full = scoreVoice(v, want);
    if (full > top) { top = full; best = { voice: v, index: i, quality: s }; }
  });
  if (needSignal && best && best.quality < 30) return null;
  return best;
}

// Calm, unhurried delivery: a little slower than normal, natural pitch.
export const PACE = { rate: 0.9, pitch: 1.0 };
