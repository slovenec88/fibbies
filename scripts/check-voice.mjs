// Lists spoken lines that have no recording: new or changed text since the last
// `node scripts/record-voice.mjs` run. Exit code 1 when any are missing.
//   node scripts/check-voice.mjs          check, exit 1 if lines are missing
//   node scripts/check-voice.mjs --warn   same report, always exit 0 (used by the git commit hook)
import { readFileSync, existsSync } from 'node:fs';

globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.window ??= globalThis;

const ROOT = new URL('../', import.meta.url);

/** { lang: [missing texts] } for every language that has a voice in voice/voices.json. */
export async function missingRecordings() {
  const { spokenLines } = await import(new URL('js/voice-lines.js', ROOT));
  const config = JSON.parse(readFileSync(new URL('voice/voices.json', ROOT), 'utf8'));
  const out = {};
  for (const lang of Object.keys(config)) {
    const indexUrl = new URL(`voice/${lang}/index.json`, ROOT);
    const index = existsSync(indexUrl) ? JSON.parse(readFileSync(indexUrl, 'utf8')) : {};
    const missing = spokenLines(lang).filter((text) => !index[text] || !existsSync(new URL(`voice/${lang}/${index[text]}`, ROOT)));
    if (missing.length) out[lang] = missing;
  }
  return out;
}

if (import.meta.url === new URL(process.argv[1], 'file:').href || process.argv[1]?.endsWith('check-voice.mjs')) {
  const missing = await missingRecordings();
  const langs = Object.keys(missing);
  if (!langs.length) console.log('Voice: every spoken line has a recording.');
  else {
    console.log('Voice: these spoken lines have no recording yet (they use the device voice):');
    for (const lang of langs) {
      console.log(`  ${lang}: ${missing[lang].length} line(s)`);
      for (const text of missing[lang].slice(0, 5)) console.log(`    "${text}"`);
      if (missing[lang].length > 5) console.log(`    ...and ${missing[lang].length - 5} more`);
    }
    console.log(`Record them with: node scripts/record-voice.mjs ${langs.join(' ')}`);
  }
  process.exit(langs.length && !process.argv.includes('--warn') ? 1 : 0);
}
