// Hand-written service worker (no next-pwa) — see openspec/changes/offline-sync/design.md
// Decision 1. Responsible ONLY for the app shell (static assets + document
// navigation fallback). All application data goes through IndexedDB
// (app/_lib/offline/*), never through this cache — /api/** is always
// bypassed below.

const CACHE_VERSION = "v1";
const SHELL_CACHE = `agrisas-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `agrisas-static-${CACHE_VERSION}`;
const PRECACHE_URLS = ["/offline.html", "/manifest.json", "/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isNextStaticAsset(url) {
  // Content-hashed by Next.js build — safe to cache indefinitely, a new
  // deploy simply produces new URLs that were never in this cache.
  return url.pathname.startsWith("/_next/static/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return; // never intercept API routes — see design.md

  if (isNextStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  if (request.mode === "navigate") {
    // Network-first for documents: a fresh deploy is preferred while online;
    // offline falls back to the last cached copy of this exact route, then
    // to the generic offline shell.
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Other GET requests (fonts, non-hashed images/CSS): cache-first, best-effort.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
