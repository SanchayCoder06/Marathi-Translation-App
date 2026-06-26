// ============================================================
// बोला मराठी — Service Worker
// Caches app shell and lesson data for offline support
// ============================================================

const CACHE_NAME = 'bola-marathi-v14';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/progress.js',
  '/js/curriculum.js',
  '/js/audio.js',
  '/js/ai-feedback.js',
  '/js/ui.js',
  '/js/app.js',
  '/data/lessons.json',
  '/data/assessments.json',
  '/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network-first with cache fallback for app shell, cache-first for fonts/external static resources
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for Gemini API calls
  if (url.hostname === 'generativelanguage.googleapis.com') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline — AI feedback unavailable' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Network-first for Google Fonts (with cache fallback)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first with cache fallback for everything else (app shell, lesson data)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful GET responses
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
