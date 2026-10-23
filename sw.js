// Offline support: caches every app file.
// VERSION matches js/version.js. BUILD is a fingerprint of the app files, written by `npm run stamp`;
// any code change alters it, so phones always pick up the new files (a test checks it is current).
const VERSION = 'connecta-1.0.8';
const BUILD = 'db1155083bbf';
const CACHE = `${VERSION}-${BUILD}`;
// Card-reading files (~10 MB) are cached on first use only, and kept across app updates.
// Change this name if the files in vendor/tesseract/ ever change.
const OCR_CACHE = 'connecta-ocr-tesseract-6.0.1';
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
  'js/core/cardtext.js',
  'js/core/ocr.js',
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
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== OCR_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/vendor/tesseract/')) {
    e.respondWith(caches.open(OCR_CACHE).then(cache => cache.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
