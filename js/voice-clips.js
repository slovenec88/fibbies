// Recorded voice: plays the neural-voice recording of a line when there is one (voice/<lang>/,
// made by scripts/record-voice.mjs) and tells the caller to fall back to the device voice otherwise.
// The index maps each exact text to its file, so callers just pass the text they would speak.
import { getLang, onLangChange } from './i18n.js';

const indexes = new Map(); // lang -> index object, or null when this language has no recordings
const loading = new Map();
let unplayable = false; // this browser can't decode the recordings (Ogg Opus): use the device voice
function loadIndex(lang) {
  if (indexes.has(lang) || loading.has(lang)) return;
  loading.set(lang, fetch(`voice/${lang}/index.json`)
    .then(async (r) => {
      // No recordings for this language: remember. A network error: leave it, so it's tried again.
      if (r.ok) { const idx = await r.json(); indexes.set(lang, idx && typeof idx === 'object' ? idx : null); }
      else if (r.status === 404) indexes.set(lang, null);
    })
    .catch(() => {})
    .finally(() => loading.delete(lang)));
}
loadIndex(getLang());
onLangChange((lang) => loadIndex(lang));

/** true when the current language has recordings (waits for its index the first time). */
export async function hasClips() {
  const lang = getLang();
  loadIndex(lang);
  await loading.get(lang);
  return !unplayable && !!indexes.get(lang);
}

/** File for this exact text in the current language, or null. */
export function clipFor(text) {
  if (unplayable) return null;
  const lang = getLang();
  const idx = indexes.get(lang);
  if (idx === undefined) loadIndex(lang); // an earlier load failed (offline): try again
  const file = idx?.[text];
  if (file) warm(lang, idx); // first spoken line: fetch the rest of this language for offline use
  return file ? `voice/${lang}/${file}` : null;
}

// Once the voice is used, download the language's recordings in the background (about 2 MB),
// so it keeps working offline. Only with a service worker: it keeps them in a cache that outlives
// app updates (the Android app has the files built in, so it needs nothing). Files the index no
// longer lists are dropped from that cache.
const warmed = new Set();
function warm(lang, idx) {
  if (warmed.has(lang) || !('caches' in self) || !navigator.serviceWorker?.controller) return;
  warmed.add(lang);
  const files = new Set(Object.values(idx).map((f) => `voice/${lang}/${f}`));
  const idle = self.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  idle(async () => {
    try {
      const cache = await caches.open('fibbies-voice');
      const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname.replace(/^.*\/(voice\/[a-z]{2}\/)/, '$1')));
      for (const k of have) if (k.startsWith(`voice/${lang}/`) && k.endsWith('.ogg') && !files.has(k)) await cache.delete(k);
      for (const f of files) if (!have.has(f)) await fetch(f).catch(() => {});
    } catch { /* offline or storage full: they download when first played */ }
  });
}

// ---- playback (Web Audio, so it mixes with the sound effects and needs no extra unlock) ----
const buffers = new Map(); // a few decoded lines, most recent last
const MAX_BUFFERS = 8;
async function decode(ctx, src) {
  if (buffers.has(src)) { const b = buffers.get(src); buffers.delete(src); buffers.set(src, b); return b; }
  const res = await fetch(src);
  if (!res.ok) throw new Error('missing');
  const data = await res.arrayBuffer();
  let buf;
  try { buf = await new Promise((ok, bad) => ctx.decodeAudioData(data, ok, bad)); } catch (e) { unplayable = true; throw e; }
  buffers.set(src, buf);
  if (buffers.size > MAX_BUFFERS) buffers.delete(buffers.keys().next().value);
  return buf;
}

let epoch = 0; // bumped by stopClips(): queued lines from before are dropped
let current = null;
let queue = Promise.resolve();
let pending = 0; // lines playing or waiting

/**
 * Plays `src` through `ctx` -> `out`. interrupt: cut off what's playing; otherwise wait for it.
 * Resolves false if the clip couldn't be played (the caller then uses the device voice).
 */
export function playClip(ctx, out, src, interrupt) {
  if (interrupt) stopClips();
  const my = epoch;
  pending++;
  const job = queue.then(async () => {
    if (my !== epoch) return true;
    // The audio context sleeps in the background; if it won't wake, let the device voice speak.
    if (ctx.state !== 'running') { try { await ctx.resume(); } catch { /* ignore */ } }
    if (ctx.state !== 'running') return false;
    let buf;
    try { buf = await decode(ctx, src); } catch { return false; }
    if (my !== epoch) return true;
    let node = null;
    await new Promise((done) => {
      node = ctx.createBufferSource();
      node.buffer = buf;
      node.connect(out);
      // ended can be missed if the context is suspended mid-line: never let that block the queue
      const guard = setTimeout(done, (buf.duration + 1) * 1000);
      node.onended = () => { clearTimeout(guard); done(); };
      current = node;
      node.start();
    }).finally(() => { if (current === node) current = null; }); // a newer line may already be playing
    return true;
  }).finally(() => { pending--; });
  queue = job.catch(() => {});
  return job;
}
/** Runs `fn` once the recorded lines before it have finished (keeps the device voice from talking over one). */
export function afterClips(fn) {
  if (!pending) { fn(); return; }
  const my = epoch;
  queue = queue.then(() => { if (my === epoch) fn(); });
}
export function stopClips() {
  epoch++;
  try { current?.stop(); } catch { /* already stopped */ }
  current = null;
  queue = Promise.resolve();
}
