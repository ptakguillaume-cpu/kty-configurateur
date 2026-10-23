const CACHE_NAME = 'kty-app-v13'; // Augmentez le chiffre à chaque mise à jour pour forcer le refresh
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
  './fiche-debit/catalogue.js',
  './fiche-debit/images/angle-90.png',
  './fiche-debit/images/angle-carre.png',
  './fiche-debit/images/angle-depart-multiple.png',
  './fiche-debit/images/angle-doublage.png',
  './fiche-debit/images/angle-libre.png',
  './fiche-debit/images/capot.png',
  './fiche-debit/images/accessoires.png',
  './fiche-debit/images/clip-lisse.png',
  './fiche-debit/images/couvre-joint.png',
  './fiche-debit/images/depart-multiple-cj.png',
  './fiche-debit/images/depart.png',
  './fiche-debit/images/huisserie.png',
  './fiche-debit/images/jonc.png',
  './fiche-debit/images/lisse.png',
  './fiche-debit/images/meneau.png',
  './fiche-debit/images/montant-special.png',
  './fiche-debit/images/montant.png',
  './fiche-debit/images/omega.png',
  './fiche-debit/images/parclose-double.png',
  './fiche-debit/images/parclose-simple.png'
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