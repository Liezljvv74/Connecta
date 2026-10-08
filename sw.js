// Offline support: caches every app file. Bump VERSION (with js/version.js) on every release.
const VERSION = 'connecta-1.0.0';
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
  'vendor/qrcode.js',
  'vendor/xlsx.mini.min.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
