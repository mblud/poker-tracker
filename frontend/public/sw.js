// public/sw.js
const SW_VERSION = 'v2025-08-06';
const STATIC_CACHE = `static-${SW_VERSION}`;

// Immediately take control on update
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache non-GET requests or any API calls
  const isAPI =
    url.pathname.startsWith('/api') ||
    url.origin.includes('up.railway.app'); // your FastAPI origin
  if (request.method !== 'GET' || isAPI) {
    return; // Let the network handle it
  }

  // Stale-while-revalidate for static assets only
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request).then((response) => {
        if (response.ok && response.type !== 'opaque') {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
