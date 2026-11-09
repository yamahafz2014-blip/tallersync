// TallerSync Pro - service worker
// - La app: primero red (así recibís las actualizaciones); si no hay red, usa la última copia.
// - Librerías de Firebase con versión fija (gstatic): primero caché, así abre más rápido.
// - Firestore, Autenticación y todo lo demás: directo a la red, sin tocar.
const APP_CACHE = 'tallersync-app-v1';
const LIB_CACHE = 'tallersync-libs-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== APP_CACHE && k !== LIB_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.open(LIB_CACHE).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(APP_CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
  );
});
