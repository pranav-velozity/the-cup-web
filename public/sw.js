// TOTO service worker — enables installability now, and carries the push
// handlers so notifications light up the moment the backend starts sending.
const CACHE = "toto-shell-v1_5";
const SHELL = ["/", "/index.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for navigations (always get fresh app), cache fallback offline.
self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    e.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }
  // Don't cache API/socket calls.
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/socket")) return;
  e.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});

// Web push -> system notification.
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data && e.data.text() }; }
  const title = data.title || "TOTO";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/" },
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) { c.navigate(url); return c.focus(); } }
      return self.clients.openWindow(url);
    })
  );
});
