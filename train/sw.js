// Offline cache for the Training Coach. Bump VERSION when files change.
const VERSION = "train-v3";
const SHELL = [
  "./", "index.html", "app.js", "train.css", "store.js", "manifest.json",
  "ui/core.js", "ui/onboard.js", "ui/today.js", "ui/workout.js", "ui/plan.js", "ui/library.js", "ui/progress.js", "ui/settings.js",
  "domain/vocab.js", "domain/exercises.js", "domain/exercises-more.js", "domain/loads.js", "domain/prescribe.js", "domain/generate.js", "domain/progression.js", "domain/schedule.js", "domain/history.js",
  "../styles.css", "../icons/icon.svg", "../icons/apple-touch-icon.png", "../icons/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("train-") && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first so updates arrive together; offline falls back to the cache
// (the gym basement case). Never touches cross-origin requests.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(new Request(e.request, { cache: "no-cache" }))
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
