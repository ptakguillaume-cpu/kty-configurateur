const CACHE_NAME = 'kty-app-v5'; // Augmentez le chiffre à chaque mise à jour pour forcer le refresh
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './data.json',
  './manifest.json',
  './icon-512.png',
  './fiche-debit/',
  './fiche-debit/index.html',
  './fiche-debit/style.css',
  './fiche-debit/app.js',
  './fiche-debit/calcul.js',
  './fiche-debit/xlsx.js',
  './fiche-debit/donnees.js',
  './fiche-debit/catalogue.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});