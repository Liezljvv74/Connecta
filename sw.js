// Offline support: caches every app file.
// VERSION matches js/version.js. BUILD is a fingerprint of the app files, written by `npm run stamp`;
// any code change alters it, so phones always pick up the new files (a test checks it is current).
const VERSION = 'connecta-1.0.4';
const BUILD = '717dfe1871ab';
const CACHE = `${VERSION}-${BUILD}`;
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/ui.js',
  'js/version.js',
  'js/core/model.js',
  'js/core/card.js',
  'js/core/vcard.js',
  'js/core/qr.js',
  'js/core/backup.js',
  'js/core/export.js',
  'js/core/ics.js',
  'js/core/storage.js',
  'js/core/image.js',
  'js/core/share.js',
  'js/screens/about.js',
  'js/screens/profile.js',
  'js/screens/share.js',
  'js/screens/people.js',
  'js/screens/scan.js',
  'js/screens/settings.js',
  'vendor/qrcode.js',
  'vendor/qr-scanner.min.js',
  'vendor/qr-scanner-worker.min.js',
  'vendor/xlsx.mini.min.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'Public/connecta-full-logo.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
