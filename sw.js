// Offline cache for the app shell. Bump VERSION when files change.
const VERSION = "macropal-v21";
const SHELL = ["./", "index.html", "styles.css", "app.js", "ai.js", "manifest.json", "icons/icon.svg", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "mealplan.js", "coaches.js", "coaches/whiskers.js", "coaches/bestie.js", "coaches/dj.js", "coaches/drill.js", "coaches/surfer.js", "coaches/ricky.js", "coaches/dad.js", "planner.js", "triggers.js", "vendor/anthropic-sdk.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin) return; // never touch API calls
  // Network first (skipping the browser's HTTP cache) so updates show up
  // all at once; fall back to the offline cache.
  e.respondWith(
    fetch(new Request(e.request, { cache: "no-cache" }))
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
