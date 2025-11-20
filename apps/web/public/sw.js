// sw.js
const CACHE_NAME = "outgunned-cache-v3"; // bump the version to drop old entries
const OFFLINE_URL = "/";

// Install: cache a basic offline shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL]))
  );
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
// - Ignore cross-origin requests (like workers.dev API) → let browser handle them
// - HTML / navigations (same-origin) → NETWORK FIRST
// - Other same-origin assets → cache-first with background refresh
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only touch GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 🔴 IMPORTANT: do NOT intercept cross-origin requests (e.g. action-thread-api.workers.dev)
  if (url.origin !== self.location.origin) {
    return; // just let the browser go to the network
  }

  // Navigations → network first, fallback to offline shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Other same-origin stuff (JS, CSS, images) → cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        // Update cache in the background
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });

      return cached || networkFetch;
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
