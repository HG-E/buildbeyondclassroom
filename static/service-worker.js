/* Offline copy for hubs with poor connections.
   build.js fills in three things:
     VERSION   changes only when a page or small file changes, so a deploy that changes nothing does not touch visitors;
     PRECACHE  the small first-visit list (home page and the files every page needs);
     KEEP      every page and small file that may be saved.
   A first visit downloads only PRECACHE. Other pages are saved as the visitor opens them, or all at once when the
   visitor presses "Save for offline use" in the footer (a small, chosen, one-time download). A visitor who chose that
   keeps an up-to-date copy: when the site changes, the saved pages are refreshed in the background. */
const VERSION = '__VERSION__';
const CACHE = 'bbc-' + VERSION;
const PREFS = 'bbc-prefs'; // survives updates; holds one entry that records that the visitor chose offline use
const FLAG = '/__offline-saved';
const PRECACHE = __PRECACHE__;
const KEEP_LIST = __KEEP__;
const KEEP = new Set(KEEP_LIST);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('bbc-') && k !== CACHE && k !== PREFS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => caches.open(PREFS).then((p) => p.match(FLAG)))
      // the visitor chose offline use earlier: bring the saved pages up to date, quietly
      .then((chosen) => (chosen ? saveAll(false) : null))
  );
});

// Network first so people see fresh content when online; fall back to the saved copy.
// Only the pages and small files in KEEP are ever stored. The optional 3D scene (Three.js,
// tour.js, the poster) is never stored, so the offline copy stays small.
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

function tell(message) {
  return self.clients.matchAll({ includeUncontrolled: true }).then((all) => all.forEach((c) => c.postMessage(message)));
}

// Saves every page and small file, four at a time, reporting progress. Returns true when all were saved.
function saveAll(report) {
  const total = KEEP_LIST.length;
  let done = 0;
  let failed = 0;
  let next = 0;
  return caches.open(CACHE).then((cache) => {
    const one = () => {
      if (next >= total) return Promise.resolve();
      const path = KEEP_LIST[next++];
      return cache
        .match(path)
        .then((hit) => hit || fetch(path).then((res) => (res.ok && res.status === 200 ? cache.put(path, res) : Promise.reject(new Error('bad status')))))
        .catch(() => { failed++; })
        .then(() => {
          done++;
          if (report) return tell({ type: 'offline-progress', done, total });
        })
        .then(one);
    };
    return Promise.all([one(), one(), one(), one()]).then(() => {
      const ok = failed === 0;
      const finish = ok ? caches.open(PREFS).then((p) => p.put(FLAG, new Response('1'))) : Promise.resolve();
      return finish.then(() => (report ? tell({ type: 'offline-done', ok, total }) : null)).then(() => ok);
    });
  });
}

function status() {
  return caches.open(CACHE).then((cache) =>
    Promise.all(KEEP_LIST.map((p) => cache.match(p))).then((hits) => {
      const saved = hits.filter(Boolean).length;
      return tell({ type: 'offline-status', saved: saved === KEEP_LIST.length, done: saved, total: KEEP_LIST.length });
    })
  );
}

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  if (type === 'save-offline') event.waitUntil(saveAll(true));
  else if (type === 'offline-status') event.waitUntil(status());
});
