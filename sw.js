// Offline support with atomic updates.
// Every deploy bumps VERSION. A new worker downloads the whole app shell fresh
// (bypassing the HTTP cache) before it takes over, and pages are always served
// from one consistent cache, so old and new files can never be mixed.
const VERSION = 'fibbies-v83';
const SHELL = [
  './', 'styles.css', 'manifest.webmanifest', 'js/install.js',
  'js/app.js', 'js/data.js', 'js/figure.js', 'js/audio.js', 'js/session.js', 'js/wakelock.js',
  'js/rewards.js', 'js/critter.js', 'js/reward-screen.js', 'js/native.js', 'js/i18n.js', 'js/localize.js', 'js/fibbies.js', 'js/flex.js', 'js/merge-fx.js', 'js/fx-canvas.js', 'js/fx-engine.js', 'js/fx-worker.js', 'js/storage.js', 'js/voice-pick.js', 'js/voice-clips.js',
  'js/lang/de.js', 'js/lang/es.js', 'js/lang/fr.js', 'js/lang/it.js', 'js/lang/pt.js', 'js/lang/sl.js',
  'fonts/fonts.css', 'fonts/material-symbols-rounded-fallback.woff2', 'fonts/atkinson-hyperlegible-next-latin.woff2', 'fonts/atkinson-hyperlegible-next-latin-ext.woff2',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting()),
  );
});

// Recorded voice lines are named by their content, so a file never changes: they live in their own
// cache that survives app updates (js/voice-clips.js removes ones the index no longer lists).
const VOICE = 'fibbies-voice';

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== VOICE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin !== location.origin) return;

  if (/\/voice\/[a-z]{2}\//.test(url.pathname)) {
    e.respondWith(caches.open(VOICE).then(async (c) => {
      const isIndex = url.pathname.endsWith('/index.json');
      // The index can change with an update: network first. Recordings never change: cache first.
      if (!isIndex) { const hit = await c.match(req); if (hit) return hit; }
      try {
        const res = await fetch(req, isIndex ? { cache: 'no-cache' } : undefined);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch {
        return (await c.match(req)) || Response.error();
      }
    }));
    return;
  }

  // App shell: serve from this version's cache; fall back to the network for anything else.
  e.respondWith(
    caches.open(VERSION).then(async (c) => {
      const key = req.mode === 'navigate' && url.pathname.endsWith('/') ? './' : req;
      const hit = await c.match(key, { ignoreSearch: true });
      if (hit) return hit;
      try {
        return await fetch(req);
      } catch {
        if (req.mode === 'navigate') return (await c.match('./')) || Response.error();
        return Response.error();
      }
    }),
  );
});
