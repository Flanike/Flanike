/* eslint-disable no-restricted-globals */
// PNCD D1 — Service Worker (offline-first com fallback à rede)
const CACHE_VERSION = "pncd-d1-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const API_CACHE = `${CACHE_VERSION}-api`;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

const isApiRequest = (url) => url.pathname.includes("/api/");
const isCatalogGet = (url, request) =>
  request.method === "GET" &&
  isApiRequest(url) &&
  (url.pathname.endsWith("/api/localidade") ||
    url.pathname.endsWith("/api/quarteiroes") ||
    url.pathname.includes("/api/imoveis"));
const isFormsGet = (url, request) =>
  request.method === "GET" && isApiRequest(url) && url.pathname.includes("/api/forms");

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-http
  if (!url.protocol.startsWith("http")) return;

  // API: catalog → cache-first (raramente muda)
  if (isCatalogGet(url, request)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request).then((resp) => {
          if (resp && resp.ok) cache.put(request, resp.clone());
          return resp;
        }).catch(() => null);
        return cached || (await network) || new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
      })
    );
    return;
  }

  // API: forms GET → network-first, fallback ao cache
  if (isFormsGet(url, request)) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(API_CACHE).then((c) => c.put(request, copy));
          }
          return resp;
        })
        .catch(() => caches.match(request).then((c) => c || new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } })))
    );
    return;
  }

  // Mutações em /api/ → tenta rede; se falhar, retorna erro (frontend faz queue local)
  if (isApiRequest(url) && request.method !== "GET") {
    return; // deixa o browser tratar; frontend lida com falha
  }

  // App shell e estáticos → stale-while-revalidate
  if (request.method === "GET") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((resp) => {
            if (resp && resp.ok && resp.type === "basic") {
              const copy = resp.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
            }
            return resp;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
