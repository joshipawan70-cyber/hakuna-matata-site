/* Basic cache with safe defaults */
const CACHE = 'hm-v1';
const ASSETS = [
  '/', '/index.html',
  '/gaming.html',
  '/styles.css', '/script.js',
  '/icons/icon-192.png', '/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Network-first for navigation (keeps content fresh)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('/', copy));
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
