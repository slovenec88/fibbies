// Offline support with atomic updates.
// Every deploy bumps VERSION. A new worker downloads the whole app shell fresh
// (bypassing the HTTP cache) before it takes over, and pages are always served
// from one consistent cache, so old and new files can never be mixed.
const VERSION = 'fibbies-v18';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/data.js', 'js/figure.js', 'js/audio.js', 'js/session.js', 'js/wakelock.js',
  'js/rewards.js', 'js/critter.js', 'js/reward-screen.js', 'js/native.js', 'js/i18n.js', 'js/localize.js', 'js/fibbies.js', 'js/cloud.js',
  'js/lang/de.js', 'js/lang/es.js', 'js/lang/fr.js', 'js/lang/it.js', 'js/lang/pt.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];
const FONTS = 'fibbies-fonts';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(FONTS).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  if (url.origin !== location.origin) return;

  // App shell: serve from this version's cache; fall back to the network for anything else.
  e.respondWith(
    caches.open(VERSION).then(async (c) => {
      const key = req.mode === 'navigate' && url.pathname.endsWith('/') ? 'index.html' : req;
      const hit = await c.match(key, { ignoreSearch: true });
      if (hit) return hit;
      try {
        return await fetch(req);
      } catch {
        if (req.mode === 'navigate') return (await c.match('index.html')) || Response.error();
        return Response.error();
      }
    }),
  );
});
