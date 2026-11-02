/* 默写挑战 — offline cache. Change VERSION whenever the files change. */
const VERSION = '2026-11-02-5';
const CORE = 'core-' + VERSION;
const EXTRA = 'extra-v1';          // characters outside HSK 1–4 and fonts, cached when first used
const CORE_FILES = [
  './', 'index.html', 'manifest.webmanifest', 'strokes.json',
  'hanzi-writer.min.js', 'jspdf.umd.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(CORE_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith('core-') && k !== CORE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // the page itself: try the network first so updates arrive, fall back to the saved copy offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(CORE).then(c => c.put('index.html', copy)); return r;
    }).catch(() => caches.match('index.html')));
    return;
  }
  // everything else: saved copy first, otherwise download and keep it
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    const keep = url.origin === location.origin || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com');
    if (keep && (r.ok || r.type === 'opaque')) {
      const copy = r.clone();
      caches.open(url.origin === location.origin && !url.pathname.includes('/full/') ? CORE : EXTRA).then(c => c.put(req, copy));
    }
    return r;
  })));
});
