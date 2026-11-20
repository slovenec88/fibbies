// Records every line the voice guide can say (js/voice-lines.js) with Azure neural text-to-speech.
//
//   node scripts/record-voice.mjs --audition      one sample per candidate voice -> dist/voice-audition.html
//   node scripts/record-voice.mjs [en de ...]     record all lines (all languages, or the ones listed)
//   node scripts/record-voice.mjs --compress      re-compress recordings saved before compression existed
//
// Each recording is re-compressed with ffmpeg to 24 kbit/s Opus: Azure's own Opus is about 65 kbit/s,
// almost three times the size, and plain speech sounds the same at 24. Needs ffmpeg on PATH.
//
// The key is read from ~/.azure-speech.env (AZURE_SPEECH_KEY=..., AZURE_SPEECH_REGION=...), a file
// outside the repo, and is never printed. Recordings go to voice/<lang>/<hash>.ogg with an
// index.json that maps each exact text to its file. Already recorded lines are skipped, so the
// script can be stopped and run again; lines whose text or voice changed are re-recorded and
// files nobody uses any more are deleted.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The app modules read these at load time.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.window = globalThis;

const ROOT = new URL('../', import.meta.url);
const { spokenLines } = await import(new URL('js/voice-lines.js', ROOT));
const { LANGS } = await import(new URL('js/i18n.js', ROOT));
const CONFIG_URL = new URL('voice/voices.json', ROOT);

// ---- key ----
function readKey() {
  const file = `${homedir()}/.azure-speech.env`;
  if (!existsSync(file)) throw new Error(`Missing ${file} (see DEVELOPING.md, "Recorded voice").`);
  const env = Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
  if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) throw new Error(`${file} needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.`);
  return { key: env.AZURE_SPEECH_KEY, region: env.AZURE_SPEECH_REGION.toLowerCase() };
}

// ---- Azure ----
const FORMAT = 'ogg-24khz-16bit-mono-opus';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
function ssml(text, speechLang, v) {
  let body = `<prosody rate="${v.rate || '-8%'}" pitch="${v.pitch || '+0%'}">${esc(text)}</prosody>`;
  if (v.style) body = `<mstts:express-as style="${v.style}"${v.styledegree ? ` styledegree="${v.styledegree}"` : ''}>${body}</mstts:express-as>`;
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${speechLang}"><voice name="${v.voice}">${body}</voice></speak>`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GAP = 3200; // the free tier allows 20 requests a minute
let lastCall = 0;
async function synth(auth, text, speechLang, v) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = lastCall + GAP - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    const res = await fetch(`https://${auth.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': auth.key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': FORMAT, 'User-Agent': 'fibbies-voice-recorder' },
      body: ssml(text, speechLang, v),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 || res.status >= 500) { await sleep((Number(res.headers.get('retry-after')) || 10) * 1000); continue; }
    throw new Error(`Azure said ${res.status} for ${v.voice}: ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error(`Azure kept refusing (${v.voice}).`);
}

// ---- compression ----
const BITRATE = '24k';
function compress(ogg) {
  const out = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-c:a', 'libopus', '-b:a', BITRATE, '-vbr', 'on', '-application', 'voip', '-map_metadata', '-1', '-f', 'ogg', 'pipe:1'], { input: ogg, maxBuffer: 64 << 20 });
  if (out.status !== 0 || !out.stdout?.length) throw new Error(`ffmpeg failed: ${out.stderr?.toString().slice(0, 200) || out.error?.message}`);
  return out.stdout;
}
const bitrateOf = (file) => {
  const out = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=bit_rate', '-of', 'default=nw=1:nk=1', fileURLToPath(file)]);
  return Number(out.stdout?.toString().trim()) || 0;
};
async function recompressAll() {
  for (const lang of LANGS.map((l) => l.id)) {
    const dir = new URL(`voice/${lang}/`, ROOT);
    if (!existsSync(dir)) continue;
    let n = 0;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.ogg')) continue;
      const path = new URL(f, dir);
      if (bitrateOf(path) <= 40000) continue; // already compressed
      writeFileSync(path, compress(readFileSync(path)));
      n++;
    }
    if (n) console.log(`${lang}: compressed ${n} recordings`);
  }
}

const speechOf = (lang) => LANGS.find((l) => l.id === lang).speech;
const hash = (text, v) => createHash('sha1').update(JSON.stringify([text, v.voice, v.rate, v.pitch, v.style, v.styledegree, FORMAT])).digest('hex').slice(0, 12);

// ---- audition: one sample sentence per candidate voice ----
const CANDIDATES = {
  en: ['en-US-AvaNeural', 'en-US-JennyNeural', 'en-US-EmmaNeural', 'en-GB-SoniaNeural'],
  de: ['de-DE-SeraphinaMultilingualNeural', 'de-DE-KatjaNeural', 'de-DE-AmalaNeural'],
  es: ['es-ES-ElviraNeural', 'es-ES-XimenaNeural', 'es-ES-AbrilNeural'],
  fr: ['fr-FR-VivienneMultilingualNeural', 'fr-FR-DeniseNeural', 'fr-FR-BrigitteNeural'],
  it: ['it-IT-IsabellaNeural', 'it-IT-ElsaNeural', 'it-IT-IrmaNeural'],
  pt: ['pt-BR-ThalitaNeural', 'pt-BR-FranciscaNeural', 'pt-BR-BrendaNeural'],
  sl: ['sl-SI-PetraNeural'],
};
async function audition(auth) {
  const rows = [];
  for (const [lang, voices] of Object.entries(CANDIDATES)) {
    const lines = spokenLines(lang);
    // A "get ready" line plus a calm stretching cue (cues have no colon, unlike the announcements).
    const sample = `${lines[0]} ${lines.find((l) => l.length > 45 && !/[:：]/.test(l)) || lines[2]}`;
    for (const voice of voices) {
      try {
        const audio = await synth(auth, sample, speechOf(lang), { voice });
        rows.push({ lang, voice, sample, src: `data:audio/ogg;base64,${audio.toString('base64')}` });
        console.log('ok  ', voice);
      } catch (e) { console.log('skip', voice, '-', e.message); }
    }
  }
  const names = Object.fromEntries(LANGS.map((l) => [l.id, l.label]));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fibbies voice audition</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0 auto;max-width:720px;padding:16px;background:#f6f7f4;color:#1b1d1a}h1{font-size:22px}h2{font-size:17px;margin:24px 0 8px}
.row{background:#fff;border-radius:14px;padding:12px 14px;margin:8px 0}.row b{display:block;margin-bottom:6px}audio{width:100%}p.s{color:#555;font-size:14px;margin:4px 0 0}
@media (prefers-color-scheme:dark){body{background:#151714;color:#e6e8e3}.row{background:#22251f}p.s{color:#aab}}</style></head><body>
<h1>Fibbies voice audition</h1><p>One sample per voice, at the calm pace the app will use. Pick one voice per language.</p>
${Object.keys(CANDIDATES).map((lang) => `<h2>${names[lang]}</h2>${rows.filter((r) => r.lang === lang).map((r, i) => `<div class="row"><b>${i + 1}. ${r.voice.replace(/^[a-z]{2}-[A-Z]{2}-/, '').replace(/Neural$/, '')}</b><audio controls preload="none" src="${r.src}"></audio>${i === 0 ? `<p class="s">“${esc(r.sample)}”</p>` : ''}</div>`).join('')}`).join('')}
</body></html>`;
  mkdirSync(new URL('dist/', ROOT), { recursive: true });
  writeFileSync(new URL('dist/voice-audition.html', ROOT), html);
  console.log('\nWrote dist/voice-audition.html');
}

// ---- record everything ----
async function record(auth, langs) {
  const config = JSON.parse(readFileSync(CONFIG_URL, 'utf8'));
  for (const lang of langs) {
    const v = config[lang];
    if (!v) { console.log(`No voice chosen for ${lang} in voice/voices.json, skipping.`); continue; }
    const dir = new URL(`voice/${lang}/`, ROOT);
    mkdirSync(dir, { recursive: true });
    const lines = spokenLines(lang);
    const fileOf = new Map(lines.map((text) => [text, `${hash(text, v)}.ogg`]));
    // The index lists every line whose recording exists, so a stopped run still leaves a usable
    // language (the missing lines use the device voice until the next run).
    const saveIndex = () => {
      const index = {};
      for (const [text, file] of fileOf) if (existsSync(new URL(file, dir))) index[text] = file;
      writeFileSync(new URL('index.json', dir), JSON.stringify(index));
    };
    let made = 0;
    try {
      for (const [i, text] of lines.entries()) {
        const file = fileOf.get(text);
        if (existsSync(new URL(file, dir))) continue;
        writeFileSync(new URL(file, dir), compress(await synth(auth, text, speechOf(lang), v)));
        made++;
        if (made % 10 === 0) console.log(`${lang}: ${i + 1}/${lines.length}`);
        if (made % 25 === 0) saveIndex();
      }
    } finally {
      saveIndex();
    }
    const used = new Set(fileOf.values());
    for (const f of readdirSync(dir)) if (f.endsWith('.ogg') && !used.has(f)) unlinkSync(new URL(f, dir));
    console.log(`${lang}: done, ${lines.length} lines (${made} new)`);
  }
}

const args = process.argv.slice(2);
if (args.includes('--compress')) await recompressAll();
else {
  const auth = readKey();
  if (args.includes('--audition')) await audition(auth);
  else await record(auth, args.length ? args : LANGS.map((l) => l.id));
}
