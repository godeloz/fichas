/* Fichas · service worker
   Guarda la app en el teléfono para que abra sin señal.
   Los datos (cards, catálogo, copia del Moodboard) viven en IndexedDB,
   no aquí. Las llamadas a Supabase nunca pasan por esta caché. */

var VERSION = 'fichas-1.0.0';
var ARCHIVOS = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './css/app.css',
  './js/util.js',
  './js/db.js',
  './js/fotos.js',
  './js/nube.js',
  './js/vistas.js',
  './js/anotar.js',
  './js/explorar.js',
  './js/app.js',
  './vendor/supabase.js',
  './fonts/manrope-latin-wght-normal.woff2',
  './fonts/outfit-latin-wght-normal.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(ARCHIVOS.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase y demás: directo a la red

  // Abrir la app (también cuando llega algo desde «Compartir», con ?compartir_…)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (r) {
        var copia = r.clone();
        caches.open(VERSION).then(function (c) { c.put('./index.html', copia); });
        return r;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Archivos de la app: primero la caché, y se actualiza por detrás
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (guardado) {
      var red = fetch(req).then(function (r) {
        if (r && r.ok) {
          var copia = r.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copia); });
        }
        return r;
      }).catch(function () { return guardado; });
      return guardado || red;
    })
  );
});
