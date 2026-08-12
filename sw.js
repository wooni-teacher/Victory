const CACHE_NAME = "kinball-checkboard-v11";
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./images/splash1.png",
  "./images/splash2.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// App shell: cache-first (fast + offline load).
// Firebase Realtime Database / SDK requests are left to the network entirely (not intercepted),
// so live data always comes fresh when online.
self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  if (
    url.includes("firebaseio.com") ||
    url.includes("firebasedatabase.app") ||
    url.includes("gstatic.com/firebasejs") ||
    url.includes("googleapis.com")
  ) {
    return; // let Firebase handle its own networking
  }
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => cached);
    })
  );
});
