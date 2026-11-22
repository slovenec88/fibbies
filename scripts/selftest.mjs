// Self-test for the code that can lose someone's progress: saving, backup codes, restore,
// No dependencies: `node scripts/selftest.mjs` (exit code 1 on failure).
import { strict as assert } from 'node:assert';
import { pathToFileURL } from 'node:url';

// ---- In-memory browser bits: localStorage (with a "storage full" switch) ----
const mem = new Map();
let full = false;
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { if (full) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
  key: (i) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};
console.warn = () => {};

const root = new URL('../js/', pathToFileURL(process.argv[1]));
const S = await import(new URL('storage.js', root));

let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('ok  ', name); } catch (e) { failed++; console.log('FAIL', name, '\n     ', e.message); }
}
const profile = (xp) => JSON.stringify({ xp, fibers: xp, chests: 1, fibs: [], dex: {} });
const reset = (data) => { mem.clear(); for (const [k, v] of Object.entries(data)) mem.set(k, v); };

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

// ---- chests come with today's bonus ----
{
  const { computeReward } = await import(new URL('rewards.js', root));
  const prof = () => ({ xp: 0, fibers: 0, chests: 5, fibs: [], dex: {} });
  const run = (cat, prior) => computeReward({ routine: { cat, items: [] }, holdSecs: 300, ratio: 1, skips: 0, scale: 1, priorToday: new Set(prior), firstToday: !prior.length, streak: 1, profile: prof() }, () => 0.99);
  await test('chests: the 1st new kind today opens a wooden chest, then rare, epic, legendary', async () => {
    assert.deepEqual([run('before', []), run('after', ['before']), run('evening', ['before', 'after']), run('strength', ['before', 'after', 'evening'])].map((r) => [r.chest, r.tier]),
      [[true, 0], [true, 1], [true, 2], [true, 3]]);
  });
  await test('chests: a kind already done today, or a Quick routine, gives fibers but no chest', async () => {
    for (const r of [run('before', ['before']), run('quick', []), run('before', ['before', 'after', 'evening', 'strength'])]) {
      assert.equal(r.chest, false); assert.equal(r.fibbie, null); assert.ok(r.total > 0);
    }
  });
  await test('chests: Fibbies run off 35/25/12/0% by tier, never from the first two chests', async () => {
    const roll = (cat, prior, x, chests = 5) => computeReward({ routine: { cat, items: [] }, holdSecs: 300, ratio: 1, skips: 0, scale: 1, priorToday: new Set(prior), firstToday: false, streak: 1, profile: { ...prof(), chests } }, () => x).ranAway;
    assert.equal(roll('before', [], 0.34), true);
    assert.equal(roll('before', [], 0.36), false);
    assert.equal(roll('after', ['before'], 0.24), true);
    assert.equal(roll('after', ['before'], 0.26), false);
    assert.equal(roll('evening', ['before', 'after'], 0.11), true);
    assert.equal(roll('evening', ['before', 'after'], 0.13), false);
    assert.equal(roll('strength', ['before', 'after', 'evening'], 0), false);
    assert.equal(roll('before', [], 0, 0), false);
    assert.equal(roll('before', [], 0, 1), false);
    assert.equal(roll('before', [], 0, 2), true);
  });
}

// ---- a Fibbie never changes its favourite stretch when stretches are added ----
{
  const { fibbie } = await import(new URL('fibbies.js', root));
  await test('fibbies: favourite stretches stay what they were when people found them', () => {
    const fav = { g_1: 'lyingHam', g_16: 'catcow', g_ll: 'lungeReach', g_2n9c: 'bridge', g_1u5hvr4: 'swingSide' };
    for (const [sp, stretch] of Object.entries(fav)) assert.equal(fibbie(sp).genome.stretch, stretch, sp);
  });
}

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
await test('voice: recorded languages have every spoken line', async () => {
  const missing = await missingRecordings();
  const summary = Object.entries(missing).map(([l, m]) => `${l}: ${m.length} (e.g. "${m[0]}")`).join('; ');
  assert.equal(summary, '', `run: node scripts/record-voice.mjs ${Object.keys(missing).join(' ')}`);
});

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
