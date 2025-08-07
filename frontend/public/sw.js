// 🔥 COMPLETE SERVICE WORKER FIX - NO MORE CACHE ERRORS!
console.log('Service Worker: FIXED VERSION Loading');

const CACHE_NAME = 'poker-tracker-v100'; // 🚨 HIGH VERSION TO FORCE UPDATE
const STATIC_CACHE = 'poker-static-v100';

// Only cache these specific files
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('🔥 Service Worker: INSTALLING FIXED VERSION');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('✅ Service Worker: Caching basic files only');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('🚀 Service Worker: FORCING IMMEDIATE ACTIVATION');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: ACTIVATED - CLEARING ALL OLD CACHES');
  
  event.waitUntil(
    Promise.all([
      // 🔥 DELETE ALL OLD CACHES
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('🗑️ Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Take control immediately
      self.clients.claim()
    ])
  );
});

// 🚨 CRITICAL FIX: DO NOT INTERCEPT ANY API CALLS!
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 🔥 NEVER TOUCH API CALLS - LET THEM GO DIRECTLY TO NETWORK
  if (url.pathname.startsWith('/api/') || 
      url.pathname.includes('cashout') || 
      url.pathname.includes('payment') ||
      request.method !== 'GET') {
    console.log('🚫 Service Worker: IGNORING API CALL:', url.pathname);
    return; // Let it go directly to network - NO CACHING!
  }
  
  // Only handle basic navigation (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/');
      })
    );
  }
  
  // For everything else, just let it pass through
});

console.log('✅ Service Worker: FIXED VERSION LOADED - NO MORE CACHE ERRORS!');