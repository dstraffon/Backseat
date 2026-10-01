/*
  Service worker: lets Backseat keep working when you lose signal on the road.
  "Network first": always tries to get the newest files, falls back to the saved copy offline.
  Only runs when the app is hosted (http/https), not when opened as a local file.
*/
const CACHE = 'backseat-v1';
const FILES = ['./', 'index.html', 'css/styles.css', 'js/data.js', 'js/shader.js', 'js/app.js', 'icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
