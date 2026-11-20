// Self-test for the code that can lose someone's progress: saving, backup codes, restore,
// and the cloud-save decisions. No dependencies: `node scripts/selftest.mjs` (exit code 1 on failure).
import { strict as assert } from 'node:assert';
import { pathToFileURL } from 'node:url';

// ---- In-memory browser bits: localStorage (with a "storage full" switch) and a fake Play Games plugin ----
const mem = new Map();
let full = false;
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { if (full) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
  key: (i) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};
let cloudSlot = null; // what the fake Play Games account holds
const PlayGames = {
  isAvailable: async () => ({ available: true }),
  init: async () => {},
  isSignedIn: async () => ({ signedIn: true, name: 'Test' }),
  signIn: async () => ({ signedIn: true, name: 'Test' }),
  load: async () => ({ data: cloudSlot }),
  save: async ({ data }) => { cloudSlot = data; },
};
globalThis.window = { Capacitor: { isNativePlatform: () => true, Plugins: { PlayGames } } };
console.warn = () => {};

const root = new URL('../js/', pathToFileURL(process.argv[1]));
const S = await import(new URL('storage.js', root));
const { cloud } = await import(new URL('cloud.js', root));

let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('ok  ', name); } catch (e) { failed++; console.log('FAIL', name, '\n     ', e.message); }
}
const profile = (xp) => JSON.stringify({ xp, fibers: xp, chests: 1, fibs: [], dex: {} });
const reset = (data) => { mem.clear(); for (const [k, v] of Object.entries(data)) mem.set(k, v); };
const remote = (at, xp) => JSON.stringify({ v: 1, at, data: { 'limber.profile': profile(xp) } });

// ---- storage ----
await test('unreadable data is rescued, not dropped', () => {
  reset({ 'limber.profile': '{"xp": 1' });
  assert.equal(S.readJSON('limber.profile', 'fallback'), 'fallback');
  assert.equal(mem.get('fibbies.rescue.limber.profile'), '{"xp": 1');
});
await test('a failed write reports false', () => {
  full = true;
  try { assert.equal(S.writeJSON('limber.history', []), false); } finally { full = false; }
});
await test('backup code round trip keeps progress and leaves device settings out', () => {
  reset({ 'limber.profile': profile(500), 'limber.history': '[{"day":"2026-11-20","note":"Šč 😀"}]', 'limber.settings': '{"lang":"sl"}' });
  const back = S.readBackupCode('text around it\n' + S.makeBackupCode() + '\n');
  assert.deepEqual(back.data, S.snapshotProgress());
  assert.ok(!('limber.settings' in back.data));
  assert.equal(S.readBackupCode('not a code'), null);
});
await test('restore replaces progress but keeps device settings', () => {
  reset({ 'limber.profile': profile(5), 'limber.flex': '[]', 'limber.settings': '{"lang":"sl"}' });
  S.replaceProgress({ 'limber.profile': profile(9) });
  assert.equal(JSON.parse(mem.get('limber.profile')).xp, 9);
  assert.ok(!mem.has('limber.flex'), 'stale progress key removed');
  assert.equal(mem.get('limber.settings'), '{"lang":"sl"}');
});
await test('a restore that fails half way leaves the old progress untouched', () => {
  reset({ 'limber.profile': profile(5), 'limber.history': '["old"]' });
  let writes = 0;
  const set = localStorage.setItem;
  localStorage.setItem = (k, v) => { if (++writes === 2) throw new Error('full'); set(k, v); };
  try {
    assert.throws(() => S.replaceProgress({ 'limber.history': '["new"]', 'limber.profile': profile(9), 'limber.flex': '[]' }));
  } finally { localStorage.setItem = set; }
  assert.equal(JSON.parse(mem.get('limber.profile')).xp, 5);
  assert.equal(mem.get('limber.history'), '["old"]');
  assert.ok(!mem.has('limber.flex'));
});

// ---- cloud save decisions (see the table at the top of js/cloud.js) ----
const meta = () => JSON.parse(mem.get('fibbies.cloud'));
const enable = async (local, cloudCopy, pick = () => 'local') => {
  reset(local); cloudSlot = cloudCopy;
  let asked = false;
  const r = await cloud.enable(async () => { asked = true; return pick(); });
  return { r, asked };
};
await test('turning on with an empty cloud uploads this phone', async () => {
  const { r } = await enable({ 'limber.profile': profile(100) }, null);
  assert.equal(r, 'pushed');
  assert.equal(JSON.parse(JSON.parse(cloudSlot).data['limber.profile']).xp, 100);
});
await test('turning on with a fresh phone downloads the cloud copy', async () => {
  const { r } = await enable({ 'limber.profile': profile(0) }, remote(1000, 700));
  assert.equal(r, 'pulled');
  assert.equal(JSON.parse(mem.get('limber.profile')).xp, 700);
});
await test('both have progress: the player is asked, and cancel changes nothing', async () => {
  const { r, asked } = await enable({ 'limber.profile': profile(50) }, remote(3000, 700), () => null);
  assert.ok(asked);
  assert.equal(r, 'cancelled');
  assert.equal(JSON.parse(mem.get('limber.profile')).xp, 50);
  assert.equal(JSON.parse(JSON.parse(cloudSlot).data['limber.profile']).xp, 700);
});
await test('cloud changed on another phone, this one untouched: sync downloads it', async () => {
  await enable({ 'limber.profile': profile(50) }, remote(1000, 700), () => 'local'); // in sync now
  const base = meta().base;
  cloudSlot = remote(base + 5000, 900); // another phone saved
  const r = await cloud.sync({ canReplace: () => true });
  assert.equal(r, 'pulled');
  assert.equal(JSON.parse(mem.get('limber.profile')).xp, 900);
});
await test('both changed since the last sync: sync asks instead of overwriting', async () => {
  await enable({ 'limber.profile': profile(50) }, remote(1000, 700), () => 'local');
  cloud.touch(); // this phone changed
  cloudSlot = remote(meta().base + 5000, 900); // and so did another phone
  let asked = false;
  const r = await cloud.sync({ canReplace: () => true, choose: async () => { asked = true; return null; } });
  assert.ok(asked);
  assert.equal(r, 'later');
  assert.equal(JSON.parse(mem.get('limber.profile')).xp, 50);
});
await test('mid-session the cloud copy is never applied', async () => {
  await enable({ 'limber.profile': profile(50) }, remote(1000, 700), () => 'local');
  cloudSlot = remote(meta().base + 5000, 900);
  const r = await cloud.sync({ canReplace: () => false });
  assert.equal(r, 'later');
  assert.equal(JSON.parse(mem.get('limber.profile')).xp, 50);
});

// ---- voice picking ----
const { bestVoice } = await import(new URL('voice-pick.js', root));
const V = (pairs) => pairs.map(([name, lang]) => ({ name, lang }));
await test('voice: natural female over robotic and male voices', () => {
  assert.equal(bestVoice(V([['Microsoft David - English (United States)', 'en-US'], ['Microsoft Guy Online (Natural) - English (United States)', 'en-US'], ['Microsoft Aria Online (Natural) - English (United States)', 'en-US']]), 'en-US').voice.name, 'Microsoft Aria Online (Natural) - English (United States)');
  assert.equal(bestVoice(V([['en-us-x-iol-local', 'en-US'], ['en-us-x-tpf-local', 'en-US']]), 'en-US').voice.name, 'en-us-x-tpf-local');
});
await test('voice: right accent first, and engine default when no voice is known to be good', () => {
  assert.equal(bestVoice(V([['Joana (Enhanced)', 'pt-PT'], ['Luciana', 'pt-BR']]), 'pt-BR').voice.name, 'Luciana');
  assert.equal(bestVoice(V([['sl-si-x-aaa-local', 'sl-SI'], ['sl-si-x-bbb-local', 'sl-SI']]), 'sl-SI', { needSignal: true }), null);
});
await test('voice: never a voice for another language', () => {
  assert.equal(bestVoice(V([['Google US English', 'en-US'], ['Microsoft Zira', 'en-US']]), 'sl-SI'), null);
});

// ---- recorded voice: every spoken line has a recording (re-record after changing spoken text) ----
const { missingRecordings } = await import(new URL('../scripts/check-voice.mjs', root));
await test('voice: every spoken line has a recording', async () => {
  const missing = await missingRecordings();
  const summary = Object.entries(missing).map(([l, m]) => `${l}: ${m.length} (e.g. "${m[0]}")`).join('; ');
  assert.equal(summary, '', `run: node scripts/record-voice.mjs ${Object.keys(missing).join(' ')}`);
});

cloud.disable();
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
