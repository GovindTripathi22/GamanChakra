// Voyage Service Worker — Safe Offline Mode
// Principle P5: Restricts caching strictly to static assets and public emergency passes.
// Strictly prevents caching of authenticated API responses, payments, or private traveler data.

const CACHE_NAME = "voyage-offline-v2";
const OFFLINE_STATIC_URLS = [
  "/favicon.ico",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_STATIC_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // STRICT BLOCKLIST: Never cache sensitive, private, or transactional routes
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/my-trips") ||
    url.pathname.startsWith("/checkout") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/sign-up") ||
    url.pathname.startsWith("/payment") ||
    url.pathname.includes("/room")
  ) {
    return; // Pass through to network directly without caching
  }

  // ALLOWLIST 1: Static assets (scripts, styles, fonts)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2)$/i)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // ALLOWLIST 2: Public emergency pass for traveler safety in offline remote areas
  if (url.pathname.includes("/emergency")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => cached || new Response("Offline Emergency Pass unavailable. Please reconnect.", { status: 503 }));
      })
    );
    return;
  }
});
