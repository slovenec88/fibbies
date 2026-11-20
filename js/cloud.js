// Optional cloud save in the player's Google Play Games account (Android app only).
// All progress ("limber." keys, except per-device settings; see js/storage.js) goes into one saved-game slot as JSON.
//
// No clocks are compared between devices. Each device remembers the version (`base`) of the cloud
// copy it last downloaded or uploaded, and whether it changed anything since (`dirty`):
//   cloud == base, not dirty  -> nothing to do
//   cloud == base, dirty      -> upload
//   cloud != base, not dirty  -> another device saved: download
//   cloud != base, dirty      -> both changed: the player chooses which copy to keep
import { native } from './native.js';
import { snapshotProgress as snapshotLocal, replaceProgress, readJSON, writeJSON, xpOf, DEVICE_KEYS } from './storage.js';

const SLOT = 'fibbies-save';
const META = 'fibbies.cloud'; // per-device, never synced
const PG = native.playGames;
const DEFAULT = { on: false, base: null, dirty: false, seq: 0, synced: 0, name: '', signedOut: false };

let meta = Object.assign({}, DEFAULT, readJSON(META, {}));
const saveMeta = () => writeJSON(META, meta);

/** Replace local progress with the cloud copy. Writes everything first, deletes leftovers after,
 *  and only records the sync if every write succeeded. Device settings (language, theme) stay. */
function applyRemote(remote) {
  replaceProgress(remote.data);
  meta.base = remote.at;
  meta.dirty = false;
  meta.synced = Date.now();
  saveMeta();
}

let available = null;
let inited = null;
let busy = null;
let pushTimer = 0;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

async function init() {
  if (!(await cloud.available())) return false;
  if (!inited) inited = PG.init().then(() => true, () => { inited = null; return false; });
  return inited;
}
async function load() {
  const { data } = await PG.load({ name: SLOT });
  if (!data) return null;
  const r = JSON.parse(data);
  return r && r.at != null && r.data && typeof r.data === 'object' ? r : null;
}
// Older app versions delete local keys the cloud copy lacks, so uploads keep carrying the device settings
// (this version ignores them on download: see replaceProgress).
function withDeviceKeys(data) {
  for (const k of DEVICE_KEYS) { const v = localStorage.getItem(k); if (v != null) data[k] = v; }
  return data;
}
async function push(remote) {
  clearTimeout(pushTimer);
  const seq = meta.seq;
  // A fresh version id, always different from what the cloud holds now.
  let at = Date.now();
  if (remote && at <= remote.at) at = remote.at + 1;
  await PG.save({ name: SLOT, data: JSON.stringify({ v: 1, at, data: withDeviceKeys(snapshotLocal()) }), description: 'Fibbies' });
  meta.base = at;
  meta.dirty = meta.seq !== seq; // something changed while uploading: upload again later
  meta.synced = Date.now();
  saveMeta();
  emit();
  if (meta.dirty) schedule();
}
function schedule() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => cloud.sync().catch(() => {}), 4000);
}
async function signedIn(interactive) {
  let r = await PG.isSignedIn().catch(() => ({ signedIn: false }));
  if (!r.signedIn && interactive) r = await PG.signIn().catch(() => ({ signedIn: false }));
  meta.signedOut = !r.signedIn;
  if (r.name) meta.name = r.name;
  return r.signedIn;
}

export const cloud = {
  /** The Android app includes Play Games support (the web app never does). */
  get supported() { return !!PG; },
  get on() { return meta.on; },
  get name() { return meta.name; },
  get syncedAt() { return meta.synced; },
  /** Sync is on but Play Games is signed out, so nothing is being saved. */
  get signedOut() { return meta.on && meta.signedOut; },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** true once the build has a Play Games project id and Play services are present. */
  async available() {
    if (!PG) return false;
    if (available == null) {
      try { available = !!(await PG.isAvailable()).available; } catch { available = false; }
    }
    return available;
  },

  /** Call after saving progress: marks this device as changed and uploads a few seconds later. */
  touch() {
    meta.dirty = true;
    meta.seq++;
    saveMeta();
    if (meta.on) schedule();
  },

  /** Turn sync on: signs in (may show Google's sheet), then reconciles with the cloud copy.
   *  `choose(remote)` resolves to 'cloud', 'local' or null (cancel) when both have progress.
   *  Resolves to 'pulled' (local data replaced: reload), 'pushed', or 'off' (not enabled). */
  async enable(choose) {
    if (!(await init())) return 'off';
    if (!(await signedIn(true))) { saveMeta(); return 'off'; }
    const remote = await load();
    let result = 'pushed';
    if (!remote || xpOf(remote.data) === 0) await push(remote);
    else if (remote.at === meta.base && !meta.dirty) result = 'same';
    else if (remote.at === meta.base) await push(remote);
    else if (xpOf(snapshotLocal()) === 0) { applyRemote(remote); result = 'pulled'; }
    else {
      const pick = await choose(remote);
      if (pick === 'cloud') { applyRemote(remote); result = 'pulled'; }
      else if (pick === 'local') await push(remote);
      else return 'cancelled';
    }
    meta.on = true;
    saveMeta();
    emit();
    return result;
  },
  disable() {
    clearTimeout(pushTimer);
    meta.on = false;
    saveMeta();
    emit();
  },

  /** Two-way sync. `canReplace()` says whether local data may be swapped right now (not mid-session);
   *  `choose(remote)` settles a conflict like in enable(). Resolves to 'pulled' when local data was
   *  replaced and the page should reload. */
  sync(opts = {}) {
    if (!meta.on || !PG) return Promise.resolve('off');
    // Someone else's sync is running: wait for it, then run with our own options.
    if (busy) return busy.then(() => cloud.sync(opts), () => cloud.sync(opts));
    const { canReplace = () => false, choose = null } = opts;
    busy = (async () => {
      if (!(await init())) return 'off';
      const ok = await signedIn(false); // silent: never show a sign-in sheet in the background
      saveMeta();
      if (!ok) { emit(); return 'off'; }
      const remote = await load();
      if (!remote || remote.at === meta.base) {
        if (!remote || meta.dirty) await push(remote);
        else { meta.synced = Date.now(); saveMeta(); emit(); }
        return 'same';
      }
      // The cloud copy changed on another device.
      if (!canReplace()) return 'later';
      if (!meta.dirty) { applyRemote(remote); emit(); return 'pulled'; }
      const pick = choose ? await choose(remote) : null;
      if (pick === 'cloud') { applyRemote(remote); emit(); return 'pulled'; }
      if (pick === 'local') { await push(remote); return 'same'; }
      return 'later';
    })().finally(() => { busy = null; });
    return busy;
  },
};
