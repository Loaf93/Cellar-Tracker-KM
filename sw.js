// Kiran's Cellar Tracker — service worker.
// Lets the tracker open offline and load instantly. Your cellar data is NOT stored here
// (it lives in the browser's storage and, if switched on, your private GitHub repo).
const VERSION = 'cellar-app-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never intercept GitHub sync or anything external

  // Network first (so updates you upload appear straight away); fall back to the saved copy when
  // offline, or after 3.5 seconds on a very slow connection.
  const network = fetch(req).then((res) => {
    if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  });
  const cached = () => caches.match(req, { ignoreSearch: true })
    .then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
  const slow = new Promise((resolve) => setTimeout(resolve, 3500)).then(cached);
  event.respondWith(
    Promise.race([network, slow.then((r) => r || network)])
      .catch(() => cached().then((r) => r || Response.error()))
  );
});
