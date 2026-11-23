// Synthesized sound cues (Web Audio) + spoken guidance (Speech Synthesis, or native TTS in the app).
import { native } from './native.js';
import { speechLang, onLangChange } from './i18n.js';
import { bestVoice, PACE } from './voice-pick.js';
import { clipFor, playClip, stopClips, hasClips, afterClips } from './voice-clips.js';
let ctx = null;
let music = null;
let master = null;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state !== 'running') ctx.resume().catch?.(() => {});
    try { if (navigator.audioSession) navigator.audioSession.type = 'transient'; } catch { /* ignore */ } // ducks other audio instead of stopping it
    // iOS needs one buffer played inside a gesture
    const b = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* audio unavailable */ }
  primeVoice();
}

function bell(freq, at = 0, dur = 0.6, gain = 0.22, type = 'sine') {
  if (!ctx) return;
  if (ctx.state !== 'running') ctx.resume().catch?.(() => {});
  const t0 = ctx.currentTime + at;
  const partials = [[1, 1], [2.01, 0.28], [3.02, 0.08]];
  for (const [mult, g] of partials) {
    const o = ctx.createOscillator();
    const v = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq * mult, t0);
    v.gain.setValueAtTime(0.0001, t0);
    v.gain.exponentialRampToValueAtTime(gain * g, t0 + 0.012);
    v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * (mult === 1 ? 1 : 0.5));
    o.connect(v).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
}

function noise(at = 0, dur = 0.5, gain = 0.25, from = 400, to = 4000) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const v = ctx.createGain();
  v.gain.setValueAtTime(0.0001, t0);
  v.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.3);
  v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(v).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

function sweep(fromF, toF, at = 0, dur = 0.3, gain = 0.2, type = 'sine') {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const v = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(fromF, t0);
  o.frequency.exponentialRampToValueAtTime(toF, t0 + dur);
  v.gain.setValueAtTime(0.0001, t0);
  v.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(v).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

/** Reward-screen sounds (slot-machine / treasure vibes). */
export const fx = {
  get on() { return sfx.enabled; },
  chestLand() { if (this.on) { sweep(180, 60, 0, 0.25, 0.35); noise(0, 0.15, 0.12, 300, 200); } },
  rattle() { if (this.on) { for (let i = 0; i < 4; i++) bell(300 + i * 40, i * 0.09, 0.08, 0.1, 'square'); } },
  open() {
    if (!this.on) return;
    noise(0, 0.7, 0.3, 300, 6000);
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => bell(f, 0.08 + i * 0.05, 0.9, 0.14));
  },
  count(p) { if (this.on) bell(500 + p * 1300, 0, 0.06, 0.07, 'triangle'); },
  slam(big) {
    if (!this.on) return;
    sweep(220, 50, 0, 0.3, 0.4);
    noise(0, 0.12, 0.15, 2000, 800);
    bell(big ? 1568 : 1175, 0.02, 0.5, 0.15);
    if (big) bell(2093, 0.1, 0.6, 0.12);
  },
  coins() { if (this.on) { for (let i = 0; i < 7; i++) bell(1800 + Math.random() * 1200, i * 0.05 + Math.random() * 0.03, 0.18, 0.07); } },
  boing() { if (this.on) { sweep(300, 900, 0, 0.18, 0.25); sweep(900, 1400, 0.16, 0.2, 0.18); bell(1760, 0.32, 0.6, 0.12); } },
  charge() {
    if (!this.on) return;
    sweep(140, 1400, 0, 0.95, 0.12, 'triangle');
    noise(0, 0.95, 0.18, 200, 5000);
    for (let i = 0; i < 9; i++) bell(330 + i * 70, i * 0.1, 0.07, 0.07, 'square');
  },
  boom() {
    if (!this.on) return;
    sweep(260, 38, 0, 0.6, 0.55);
    noise(0, 0.6, 0.35, 5000, 250);
  },
  // The knot: a soft little "bloop" when tapped, each tap the next note of a pentatonic scale.
  knotTap(step = 0) {
    if (!this.on) return;
    const f = [523.25, 587.33, 659.25, 783.99, 880][step % 5];
    sweep(f * 0.55, f, 0, 0.07, 0.085);
    bell(f * 2, 0.035, 0.2, 0.028);
  },
  // ...and a small rising chime when the day's routines open it up.
  knotOpen() { if (this.on) { bell(784, 0, 0.5, 0.07); bell(1175, 0.09, 0.6, 0.06); bell(1568, 0.18, 0.8, 0.045); } },
  pop() { if (this.on) { noise(0, 0.25, 0.18, 3000, 600); bell(1800 + Math.random() * 900, 0.02, 0.4, 0.06); } },
  /** Looping chiptune treasure jingle while the numbers roll. */
  musicStart(tier = 0) {
    if (!this.on || !ctx || music) return;
    const root = [1, 1.122, 1.26, 1.335][tier] || 1;
    const lead = [523, 659, 784, 1047, 784, 659, 587, 740, 880, 1175, 880, 740, 659, 784, 988, 1319].map((f) => f * root);
    const bass = [131, 147, 165, 147].map((f) => f * root);
    let i = 0;
    const tick = () => {
      if (!fx.on || document.hidden) { fx.musicStop(); return; }
      bell(lead[i % lead.length], 0, 0.11, 0.05, 'square');
      if (i % 2 === 0) bell(lead[(i + 2) % lead.length] * 2, 0.04, 0.06, 0.02, 'triangle');
      if (i % 4 === 0) bell(bass[(i / 4) % bass.length | 0], 0, 0.3, 0.12, 'triangle');
      i++;
    };
    tick();
    music = setInterval(tick, 105);
  },
  musicStop() { clearInterval(music); music = null; },
  fanfare() {
    if (!this.on) return;
    const chords = [[523, 659, 784], [587, 740, 880], [659, 831, 988, 1319]];
    chords.forEach((ch, k) => ch.forEach((f) => bell(f, k * 0.16, k === 2 ? 1.6 : 0.2, 0.11, k === 2 ? 'triangle' : 'square')));
    [1568, 1760, 2093, 2637].forEach((f, i) => bell(f, 0.32 + i * 0.06, 0.5, 0.07));
  },
  /** A Fibbie dashes off: quick whoosh, then a little "aww". */
  runAway() {
    if (!this.on) return;
    sweep(700, 2400, 0, 0.18, 0.12, 'triangle');
    noise(0.05, 0.35, 0.16, 4000, 900);
    bell(587, 0.55, 0.35, 0.12, 'triangle');
    bell(440, 0.8, 0.7, 0.12, 'triangle');
  },
  /** Long rising whir while two Fibbies spin into one (about 2.4 s). */
  evolveCharge() {
    if (!this.on) return;
    sweep(90, 1800, 0, 2.4, 0.14, 'sawtooth');
    sweep(180, 3600, 0, 2.4, 0.06, 'triangle');
    noise(0.3, 2.1, 0.2, 200, 7000);
    for (let i = 0; i < 18; i++) bell(262 * Math.pow(2, i / 7), i * 0.13, 0.12, 0.06, 'square');
  },
  /** The evolution lands: deep boom, bright chord and a shower of chimes. */
  evolve() {
    if (!this.on) return;
    sweep(300, 30, 0, 0.9, 0.6);
    noise(0, 0.9, 0.4, 6000, 150);
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => bell(f, 0.05 + i * 0.04, 1.8, 0.12, i % 2 ? 'triangle' : 'sine'));
    for (let i = 0; i < 12; i++) bell(2000 + Math.random() * 2500, 0.4 + i * 0.07, 0.3, 0.05);
  },
  /** One star lighting up (pitch rises with n). */
  star(n = 1) { if (this.on) { bell(988 * Math.pow(1.26, n - 1), 0, 0.5, 0.14, 'triangle'); bell(1976 * Math.pow(1.26, n - 1), 0.02, 0.4, 0.06); } },
  levelUp() {
    if (!this.on) return;
    [523, 659, 784, 1047].forEach((f, i) => bell(f, i * 0.09, 0.4, 0.18, 'triangle'));
    bell(1568, 0.38, 1.2, 0.2);
    bell(2093, 0.38, 1.2, 0.12);
  },
};

document.addEventListener('visibilitychange', () => {
  if (ctx && document.visibilityState === 'visible' && ctx.state !== 'running') ctx.resume().catch?.(() => {});
});

export const sfx = {
  enabled: true,
  tick() { if (this.enabled) bell(880, 0, 0.16, 0.16, 'triangle'); },
  go() { if (this.enabled) { bell(659, 0, 0.3, 0.2); bell(988, 0.11, 0.6, 0.22); } },
  half() { if (this.enabled) bell(1175, 0, 0.5, 0.08); },
  switchSides() { if (this.enabled) { bell(784, 0, 0.25, 0.18); bell(587, 0.13, 0.5, 0.18); } },
  holdEnd() { if (this.enabled) { bell(523, 0, 0.8, 0.16); bell(784, 0, 0.8, 0.12); } },
  complete() {
    if (!this.enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => bell(f, i * 0.12, 0.9, 0.18));
    bell(1319, 0.5, 1.4, 0.14);
  },
};

// ---- Voice ----
// Voice follows the app language: the nicest gentle female voice the device has for it (see
// voice-pick.js). With no voice for the language we stay quiet (settings shows a hint): a voice
// for another language reading the text sounds awful.
let voice = null;
let voicesKnown = false; // the browser has listed its voices (Chrome loads them lazily)
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  voicesKnown = vs.length > 0;
  voice = bestVoice(vs, speechLang())?.voice || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}
onLangChange(() => { voiceGuide.stop(); pickVoice(); });

function primeVoice() {
  if (!('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export const voiceGuide = {
  enabled: true,
  /**
   * Speaks `text`: the recorded neural voice when this line was recorded, otherwise the device voice.
   * `alt`: a name-free version of a line with a name in it (Fibbie names can't be recorded), used
   * when only that one has a recording.
   */
  say(text, { interrupt = true, alt = null } = {}) {
    if (!this.enabled || !text) return;
    const clip = ctx && (clipFor(text) || (alt && clipFor(alt)));
    if (clip) {
      if (interrupt) this.stopDevice();
      playClip(ctx, master, clip, interrupt).then((ok) => { if (!ok) this.sayDevice(text, interrupt); });
      return;
    }
    if (interrupt) { stopClips(); this.sayDevice(text, true); }
    else afterClips(() => this.sayDevice(text, false)); // after any recorded line still playing
  },
  sayDevice(text, interrupt) {
    if (native.speak(text, interrupt, speechLang())) return;
    if (!('speechSynthesis' in window)) return;
    if (!voice && voicesKnown) return; // no voice for this language on this device
    try {
      if (interrupt) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || speechLang();
      u.rate = PACE.rate;
      u.pitch = PACE.pitch;
      u.volume = 1;
      speechSynthesis.speak(u);
    } catch { /* ignore */ }
  },
  /** Resolves true/false for "this device has a voice for the app language", or null if unknown. */
  async hasVoice() {
    if (await hasClips()) return true; // recorded voice for this language
    if (native.isNative) return native.ttsSupports(speechLang());
    if (!('speechSynthesis' in window)) return false;
    let vs = speechSynthesis.getVoices();
    if (!vs.length) {
      // Chrome loads voices lazily.
      await new Promise((r) => {
        const done = () => { speechSynthesis.removeEventListener?.('voiceschanged', done); r(); };
        speechSynthesis.addEventListener?.('voiceschanged', done);
        setTimeout(done, 1500);
      });
      vs = speechSynthesis.getVoices();
      if (!vs.length) return null;
    }
    pickVoice();
    return !!voice;
  },
  stop() {
    stopClips();
    this.stopDevice();
  },
  stopDevice() {
    native.stopSpeaking();
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch { /* ignore */ }
  },
};

export const haptics = {
  enabled: true,
  stop() {
    native.cancelHaptics();
    try { if (navigator.vibrate) navigator.vibrate(0); } catch { /* ignore */ }
  },
  buzz(pattern) {
    if (!this.enabled) { this.stop(); return; }
    if (native.haptic(pattern)) return;
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch { /* ignore */ }
    }
  },
};
