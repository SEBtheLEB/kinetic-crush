const CACHE = 'kinetic-crush-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-placeholder.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then((response) => {
    if (!response || response.status === 404) {
      const accept = event.request.headers.get('accept') || '';
      if (event.request.mode === 'navigate' || accept.includes('text/html')) {
        return caches.match('./index.html');
      }
    }
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => {
    const accept = event.request.headers.get('accept') || '';
    if (event.request.mode === 'navigate' || accept.includes('text/html')) {
      return caches.match('./index.html');
    }
    return caches.match(event.request);
  }));
});
