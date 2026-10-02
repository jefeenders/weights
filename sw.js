// Offline support: serve from cache, refresh the cache in the background.
// New versions show up on the next app launch.
const CACHE = 'lift-tracker-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './store.js',
  './backup.js',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached ?? refresh;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') event.respondWith(staleWhileRevalidate(event.request));
});
