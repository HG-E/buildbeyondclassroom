/* Offline copy for hubs with poor connections.
   build.js fills in the version, the small first-visit list (PRECACHE) and the full list of pages and files
   that are saved as they are opened (KEEP). A first visit does not download pages the visitor has not opened. */
const VERSION = '__VERSION__';
const CACHE = 'bbc-' + VERSION;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('bbc-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first so people see fresh content when online; fall back to the saved copy.
// Only the pages and small files listed in PRECACHE are ever kept. The optional 3D scene
// (Three.js, tour.js, the poster) is never stored, so the offline copy stays small.
const KEEP = new Set(__KEEP__);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const keep = KEEP.has(url.pathname);
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Keep only complete, successful responses, so an error page is never served offline.
        if (keep && res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
  );
});
