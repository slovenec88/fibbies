// One place for everything the app saves on the device (localStorage).
//
// - Progress lives under "limber." keys. Those keys are what cloud save and backup codes carry,
//   except DEVICE_KEYS (language, theme, last category), which stay on each phone.
// - A value that can't be read is copied to "fibbies.rescue.<key>" before the app falls back to
//   an empty value, so the next save never destroys the only copy.
// - Failed writes (storage full, private mode) are reported once, so progress is never lost silently.

const PREFIX = 'limber.';
export const DEVICE_KEYS = new Set(['limber.settings', 'limber.cat', 'limber.levels-v2']);
const RESCUE = 'fibbies.rescue.';

let onFail = null;
let failReported = false;
export const onSaveFail = (fn) => { onFail = fn; };

/** Parsed JSON for `key`, or `fallback` when missing. Unreadable data is rescued, never dropped. */
export function readJSON(key, fallback) {
  let raw = null;
  try { raw = localStorage.getItem(key); } catch { return fallback; }
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch (e) {
    try { if (!localStorage.getItem(RESCUE + key)) localStorage.setItem(RESCUE + key, raw); } catch { /* ignore */ }
    console.warn(`Unreadable saved data in ${key}; a copy was kept in ${RESCUE + key}.`, e);
    return fallback;
  }
}

/** Saves `value` as JSON. Returns false (and tells listeners once) when the write fails. */
export function writeJSON(key, value) {
  return writeRaw(key, JSON.stringify(value));
}
function writeRaw(key, str) {
  try {
    localStorage.setItem(key, str);
    return true;
  } catch (e) {
    if (!failReported) { failReported = true; onFail?.(e); }
    return false;
  }
}

const synced = (k) => k && k.startsWith(PREFIX) && !DEVICE_KEYS.has(k);

/** All progress keys as raw strings (what cloud save and backups carry). */
export function snapshotProgress() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (synced(k)) data[k] = localStorage.getItem(k);
    }
  } catch { /* ignore */ }
  return data;
}

/** Replaces all progress keys with `data` (device keys are left alone). All or nothing: if a write
 *  fails, the previous progress is put back and the error is rethrown. */
export function replaceProgress(data) {
  const before = snapshotProgress();
  try {
    for (const [k, v] of Object.entries(data)) if (synced(k) && typeof v === 'string') localStorage.setItem(k, v);
  } catch (e) {
    for (const k of Object.keys(snapshotProgress())) if (!(k in before)) localStorage.removeItem(k);
    for (const [k, v] of Object.entries(before)) writeRaw(k, v);
    throw e;
  }
  for (const k of Object.keys(before)) if (!(k in data)) localStorage.removeItem(k);
}

/** XP stored in a progress snapshot (0 when missing or unreadable). */
export const xpOf = (data) => { try { return JSON.parse(data['limber.profile']).xp || 0; } catch { return 0; } };

/** Asks the browser not to evict the site's storage under pressure (web only; harmless elsewhere). */
export function requestPersistence() {
  try { navigator.storage?.persist?.().catch(() => {}); } catch { /* ignore */ }
}

// ---------- Backup codes ----------
// "FIBBIES1:" + base64 of UTF-8 JSON { v: 1, at, data: { "limber.x": "<raw string>" } }.
const TAG = 'FIBBIES1:';
const toB64 = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromB64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

export function makeBackupCode() {
  return TAG + toB64(JSON.stringify({ v: 1, at: Date.now(), data: snapshotProgress() }));
}

/** Parses a backup code. Returns { at, data } or null if it isn't a valid Fibbies backup. */
export function readBackupCode(text) {
  try {
    const s = String(text || '').replace(/\s+/g, '');
    const i = s.indexOf(TAG);
    if (i < 0) return null;
    const obj = JSON.parse(fromB64(s.slice(i + TAG.length)));
    if (!obj || obj.v !== 1 || !obj.data || typeof obj.data !== 'object') return null;
    const data = {};
    for (const [k, v] of Object.entries(obj.data)) if (synced(k) && typeof v === 'string') data[k] = v;
    if (!data['limber.profile']) return null;
    JSON.parse(data['limber.profile']); // must be readable
    return { at: Number(obj.at) || 0, data };
  } catch { return null; }
}
