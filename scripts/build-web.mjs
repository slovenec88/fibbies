// Copies the static web app into www/ for Capacitor or Cloudflare.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'www';
// FIBBIES_NO_VOICE=1 leaves the recorded voice out (a quick test build while recordings are being made).
const FILES = ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js', 'js', 'icons', 'fonts', ...(process.env.FIBBIES_NO_VOICE ? [] : ['voice'])];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const f of FILES) cpSync(f, `${OUT}/${f}`, { recursive: true });
console.log(`Copied ${FILES.length} entries to ${OUT}/`);

if (process.argv.includes('--cloudflare')) {
  for (const file of ['LICENSE', 'NOTICE']) cpSync(file, `${OUT}/${file}.txt`);

  // Each deployed commit gets a new offline cache without a manual version bump.
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const worker = readFileSync(`${OUT}/sw.js`, 'utf8');
  writeFileSync(`${OUT}/sw.js`, worker.replace(/^const VERSION = .*;$/m, `const VERSION = 'fibbies-${revision}';`));

  const html = readFileSync(`${OUT}/index.html`, 'utf8').replace(/\r\n/g, '\n');
  const scriptHashes = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g), ([, script]) =>
    `'sha256-${createHash('sha256').update(script).digest('base64')}'`
  ).join(' ');

  writeFileSync(`${OUT}/_headers`, `/*
  Content-Security-Policy: default-src 'none'; script-src 'self' ${scriptHashes}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  X-Frame-Options: DENY

/sw.js
  Cache-Control: no-cache
`);
}
