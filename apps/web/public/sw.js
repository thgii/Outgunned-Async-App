const CACHE_NAME = "outgunned-cache-v3"; // bump version
const OFFLINE_URL = "/";

// Install: cache a basic offline shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL]))
  );
  // Take over immediately
  self.skipWaiting();
});

// Activate: clean up old caches & take control of existing clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch handler:
// - BYPASS dynamic API/data requests (games, push, JSON)
// - HTML / navigations -> NETWORK FIRST
// - Static assets (css/js/images) -> cache-first
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const accept = request.headers.get("accept") || "";

  // 🚫 1) BYPASS API / dynamic JSON endpoints completely
  if (
    url.pathname.startsWith("/games/") ||
    url.pathname.startsWith("/push/") ||
    url.pathname.startsWith("/api/") ||
    accept.includes("application/json")
  ) {
    // Let the browser hit the network normally; no caching here
    return;
  }

  // ✅ 2) Navigations / HTML: NETWORK FIRST
  if (request.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update offline fallback
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(OFFLINE_URL, copy);
          });
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // ✅ 3) Static assets (css/js/images/etc): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (
            !response ||
            response.status !== 200 ||
            response.type === "opaque"
          ) {
            return response;
          }

          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });

          return response;
        })
        .catch(() => cached)
    })
  );
});

// 🔔 Handle incoming push messages
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // ignore malformed payloads
  }

  const title = data.title || "Outgunned Async";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    data: {
      url: data.clickUrl || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 🔔 Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client && client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
