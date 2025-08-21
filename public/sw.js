// sw.js — Hakuna Matata Gaming Cafe
// Strategy:
// - Network-first for navigations (HTML) so users see fresh content
// - Stale-while-revalidate for same-origin static assets (CSS/JS/images)
// - Versioned cache; old caches cleaned on activate

const CACHE_VERSION = 'hm-cache-v1';
const PRECACHE = [
  '/',                   // root
  '/index.html',         // main page
  '/manifest.webmanifest',
  // Icons (keep minimal; browser will fetch others as needed)
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // We only want to handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin requests for caching logic
  const isSameOrigin = url.origin === self.location.origin;

  // Network-first for navigations (keeps HTML fresh)
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }

  // For same-origin static assets, use stale-while-revalidate
  if (isSameOrigin) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_VERSION);
    cache.put('/', fresh.clone()); // keep a fresh copy of the shell
    return fresh;
  } catch (err) {
    // Offline fallback to cached index
    const cached = await caches.match('/index.html');
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then(response => {
    // Avoid caching opaque responses from cross-origin and non-OK responses
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  return cached || networkFetch;
}
