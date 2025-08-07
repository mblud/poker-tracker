// Replace your sw.js with this version:

const SW_VERSION = 'v2025-08-06-2'; // INCREMENT THIS VERSION
const STATIC_CACHE = `static-${SW_VERSION}`;

// Immediately take control on update
self.addEventListener('install', (event) => {
  console.log('SW: Installing new version', SW_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activating new version', SW_VERSION);
  event.waitUntil(
    caches.keys().then((keys) => {
      console.log('SW: Cleaning up old caches');
      return Promise.all(
        keys.filter(k => k !== STATIC_CACHE).map(k => {
          console.log('SW: Deleting cache', k);
          return caches.delete(k);
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 🔥 NEVER CACHE API REQUESTS - Let them always go to network
  const isAPI = 
    url.pathname.startsWith('/api') ||
    url.origin.includes('railway.app') ||
    url.origin.includes('localhost:8000') ||
    request.url.includes('/api/');

  if (request.method !== 'GET' || isAPI) {
    console.log('SW: Bypassing cache for API request:', request.url);
    return; // Let the network handle it directly
  }

  // Only cache static assets (HTML, CSS, JS, images)
  const isStaticAsset = 
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname === '/' ||
    url.pathname === '/index.html';

  if (!isStaticAsset) {
    console.log('SW: Not caching non-static asset:', request.url);
    return; // Don't cache
  }

  // Cache static assets only
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      console.log('SW: Handling static asset:', request.url);
      const cached = await cache.match(request);
      const network = fetch(request).then((response) => {
        if (response.ok && response.type !== 'opaque') {
          console.log('SW: Caching new version of:', request.url);
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => {
        console.log('SW: Network failed, serving cached version:', request.url);
        return cached;
      });
      
      return cached || network;
    })
  );
});