// Synthesized sound cues (Web Audio) + spoken guidance (Speech Synthesis).
let ctx = null;
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
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* ignore */ }
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
let voice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
  const prefs = [/Google US English/i, /Samantha/i, /Ava/i, /Aria/i, /Jenny/i, /Natural/i, /Google UK English Female/i, /en-US/i];
  for (const re of prefs) {
    const v = vs.find((x) => re.test(x.name) || re.test(x.lang));
    if (v) { voice = v; return; }
  }
  voice = vs[0] || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

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
  say(text, { interrupt = true } = {}) {
    if (!this.enabled || !('speechSynthesis' in window) || !text) return;
    try {
      if (interrupt) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || 'en-US';
      u.rate = 1.0;
      u.pitch = 1.0;
      u.volume = 1;
      speechSynthesis.speak(u);
    } catch { /* ignore */ }
  },
  stop() {
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch { /* ignore */ }
  },
};

export const haptics = {
  enabled: true,
  buzz(pattern) {
    if (this.enabled && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch { /* ignore */ }
    }
  },
};
