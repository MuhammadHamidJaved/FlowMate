const STATIC_CACHE = 'flowmate-static-v3';
const RUNTIME_CACHE = 'flowmate-runtime-v3';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  // CSS
  '/css/main.css',
  '/css/notes.css',
  // JS (add/remove to match your project)
  '/js/firebase-config.js',
  '/js/navigation.js',
  '/js/calculators.js',
  '/js/schedule.js',
  '/js/notes.js',
  '/js/home.js',
  '/js/user.js',
  '/js/settings.js',
  '/js/image-viewer.js',
  '/js/main.js',
  // Icons & offline page
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.protocol.startsWith('chrome')) return;
  if (url.pathname.startsWith('/.netlify/functions')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          // Clone response before any other operations
          const responseClone = resp.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put('/index.html', responseClone));
          return resp;
        })
        .catch(async () => (await caches.match('/index.html')) || new Response('', { status: 504 }))
    );
    return;
  }

  if (url.origin === self.location.origin &&
      ['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((resp) => {
          // Clone response before any other operations
          const responseClone = resp.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          return resp;
        });
      })
    );
    return;
  }

  const cdnHosts = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.tailwindcss.com'];
  if (cdnHosts.includes(url.hostname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((resp) => {
          // Clone response before any other operations
          const responseClone = resp.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          return resp;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((resp) => {
        // Clone response before any other operations
        const responseClone = resp.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
        return resp;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
