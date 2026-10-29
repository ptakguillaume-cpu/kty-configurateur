const CACHE_NAME = 'kty-app-v57'; // Augmentez le chiffre à chaque mise à jour pour forcer le refresh
const urlsToCache = [
  './index.html',
  './style.css',
  './script.js',
  './data.json',
  './manifest.json',
  './icon-512.png',
  './fiche-debit/',
  './fiche-debit/index.html',
  './fiche-debit/style.css',
  './fiche-debit/manifest.json',
  './fiche-debit/app.js',
  './fiche-debit/calcul.js',
  './fiche-debit/xlsx.js',
  './fiche-debit/revision.js',
  './fiche-debit/bibliotheque.js',
  './fiche-debit/donnees.js',
  './fiche-debit/donnees-rdb1.js',
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
  './fiche-debit/images/parclose-simple.png',
  './fiche-debit/images/rdb1-angle-libre.png',
  './fiche-debit/images/rdb1-angle-multiple.png',
  './fiche-debit/images/rdb1-angle90.png',
  './fiche-debit/images/rdb1-capot-classic.png',
  './fiche-debit/images/rdb1-capot-rdb1.png',
  './fiche-debit/images/rdb1-clip-lisse.png',
  './fiche-debit/images/rdb1-couvre-joint.png',
  './fiche-debit/images/rdb1-depart-multiple.png',
  './fiche-debit/images/rdb1-depart.png',
  './fiche-debit/images/rdb1-doublage.png',
  './fiche-debit/images/rdb1-huisserie-double.png',
  './fiche-debit/images/rdb1-huisserie-simple.png',
  './fiche-debit/images/rdb1-jonc.png',
  './fiche-debit/images/rdb1-lisse.png',
  './fiche-debit/images/rdb1-meneau.png',
  './fiche-debit/images/rdb1-montant-special.png',
  './fiche-debit/images/rdb1-montant.png',
  './fiche-debit/images/rdb1-mousse.png',
  './fiche-debit/images/rdb1-omega.png',
  './fiche-debit/images/rdb1-parclose.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)).then(() => self.skipWaiting())   // la nouvelle version s'applique sans attendre la fermeture de toutes les fenêtres
  );
});

self.addEventListener('fetch', event => {
  const requete = event.request, url = new URL(requete.url), racine = new URL('./', self.registration.scope);
  // L'adresse principale ouvre directement la fiche de débit (le configurateur reste sur /index.html mais n'est plus mis en avant).
  if (requete.mode === 'navigate' && url.origin === racine.origin && url.pathname === racine.pathname) {
    event.respondWith(Response.redirect(new URL('fiche-debit/', racine).href, 302));
    return;
  }
  event.respondWith(
    caches.match(requete).then(response => response || fetch(requete))
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
    }).then(() => self.clients.claim())
  );
});