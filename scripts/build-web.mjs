// Copies the static web app into www/ for Capacitor. No bundling: the web app is plain ES modules.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const OUT = 'www';
const FILES = ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js', 'js', 'icons'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const f of FILES) cpSync(f, `${OUT}/${f}`, { recursive: true });
console.log(`Copied ${FILES.length} entries to ${OUT}/`);
