// Native bridge for the Android/iOS app (Capacitor). Every call is a safe no-op on the web,
// and the plugins are reached through Capacitor's global, so the web app needs no bundler.
import { bestVoice, PACE } from './voice-pick.js';
const Cap = window.Capacitor;
export const isNative = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform());
const plugin = (name) => (isNative && Cap.Plugins && Cap.Plugins[name]) || null;
const quiet = (p) => { if (p && typeof p.catch === 'function') p.catch(() => {}); };

// Chosen Android voice (its index in getSupportedVoices) per language; null = the engine's default.
// The index only means something for the current voice list, so both are forgotten whenever the
// list may have changed (voice data installed, app back from the background).
const nativeVoice = new Map();
let voiceList = null;
const forgetVoices = () => { nativeVoice.clear(); voiceList = null; };
globalThis.document?.addEventListener('visibilitychange', () => { if (!document.hidden) forgetVoices(); });
async function pickNativeVoice(T, lang) {
  try {
    const list = voiceList || (await T.getSupportedVoices()).voices || [];
    if (!list.length) return null; // engine not ready yet: try again next time
    voiceList = list;
    // Only a voice we know to be good; otherwise the engine's own default for the language.
    const best = bestVoice(list, lang, { needSignal: true });
    nativeVoice.set(lang, best ? best.index : null);
    return nativeVoice.get(lang);
  } catch { return null; }
}
let speechEpoch = 0; // bumped by stopSpeaking(), so a line still waiting for the voice lookup is dropped
let hapticTimers = [];

export const native = {
  isNative,

  /** Vibration pattern [on, off, on, ...] mapped to crisp native haptic taps. Returns true if handled. */
  haptic(pattern) {
    const H = plugin('Haptics');
    if (!H) return false;
    native.cancelHaptics(); // a new pattern replaces any still-running one
    const steps = Array.isArray(pattern) ? pattern : [pattern];
    let t = 0;
    steps.forEach((ms, i) => {
      if (i % 2 === 0) {
        // Short pulses become crisp taps; long ones stay real buzzes.
        const fire = ms >= 100
          ? () => quiet(H.vibrate({ duration: ms }))
          : () => quiet(H.impact({ style: ms >= 60 ? 'HEAVY' : ms >= 30 ? 'MEDIUM' : 'LIGHT' }));
        if (t === 0) fire(); else hapticTimers.push(setTimeout(fire, t));
      }
      t += ms;
    });
    return true;
  },
  cancelHaptics() { hapticTimers.forEach(clearTimeout); hapticTimers = []; },

  /** Android WebView has no reliable speechSynthesis, so voice goes through native text-to-speech,
   *  with the nicest gentle female voice the phone has for the language (see voice-pick.js). */
  speak(text, interrupt = true, lang = 'en-US') {
    const T = plugin('TextToSpeech');
    if (!T) return false;
    const go = (voice) => quiet(T.speak({
      text, lang, rate: PACE.rate, pitch: PACE.pitch, volume: 1.0,
      ...(voice != null ? { voice } : {}),
      queueStrategy: interrupt ? 0 : 1, // 0 = flush (interrupts current speech), 1 = add to the queue
    }));
    const known = nativeVoice.get(lang);
    if (known !== undefined) { go(known); return true; }
    // First line in this language: look the voices up once, then speak.
    const epoch = speechEpoch;
    pickNativeVoice(T, lang).then((v) => { if (epoch === speechEpoch) go(v); });
    return true;
  },
  /** true if the device's speech engine lists this language (e.g. 'sl-SI'), null if unknown. */
  async ttsSupports(lang) {
    const T = plugin('TextToSpeech');
    if (!T) return null;
    try {
      // Same check speak() uses on Android, so the hint matches what will actually be spoken.
      const { supported } = await T.isLanguageSupported({ lang });
      return !!supported;
    } catch { return null; }
  },
  /** Opens Android's "install voice data" screen. */
  canInstallVoice: isNative && typeof Cap.getPlatform === 'function' && Cap.getPlatform() === 'android',
  openTtsInstall() { forgetVoices(); const T = plugin('TextToSpeech'); if (T) quiet(T.openInstall()); },
  stopSpeaking() { speechEpoch++; const T = plugin('TextToSpeech'); if (T) quiet(T.stop()); },

  /** Keep the screen on during a session. Returns true if handled natively. */
  keepAwake(on) {
    const K = plugin('KeepAwake');
    if (!K) return false;
    quiet(on ? K.keepAwake() : K.allowSleep());
    return true;
  },

  /** The app draws edge-to-edge, so the page shows through the system bars; we only flip the
   *  bar icon colour to stay readable. dark = dark background, so light icons. */
  statusBar(dark) {
    const S = plugin('SystemBars');
    if (!S) return;
    quiet(S.setStyle({ style: dark ? 'DARK' : 'LIGHT' }));
  },

  /** Google Play Games saved games (our own plugin, android/.../PlayGamesPlugin.java). null on the web. */
  playGames: plugin('PlayGames'),

  onBackButton(handler) { const A = plugin('App'); if (A) A.addListener('backButton', handler); },
  onResume(handler) { const A = plugin('App'); if (A) A.addListener('resume', handler); },
  exit() { const A = plugin('App'); if (A) quiet(A.exitApp()); },
  hideSplash() { const S = plugin('SplashScreen'); if (S) quiet(S.hide({ fadeOutDuration: 300 })); },
};
