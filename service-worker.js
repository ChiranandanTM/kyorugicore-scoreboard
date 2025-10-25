const CACHE_NAME = 'tkd-scoreboard-v1';
const urlsToCache = [
    './',
    './index.html',
    './scoreboard.js',
    '../icons/icon-192x192.png',
    '../icons/icon-512x512.png',
    'https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.9.0/firebase-database-compat.js',
    'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});