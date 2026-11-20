/* Service worker de Camino CCSE: guarda la app para usarla sin conexión.
   Estrategia: responde desde la caché al instante y la actualiza en segundo plano,
   así la versión nueva se ve en la siguiente apertura. Sube VERSION al cambiar archivos. */
const VERSION = 'camino-ccse-v2';
const ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const clave = req.mode === 'navigate' ? './' : req;
    const enCache = await cache.match(clave, { ignoreSearch: req.mode === 'navigate' });
    const deRed = fetch(req).then(res => {
      if (res.ok && !res.redirected) cache.put(clave, res.clone());
      return res;
    }).catch(() => null);
    if (enCache) { e.waitUntil(deRed); return enCache; }
    return (await deRed) || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
