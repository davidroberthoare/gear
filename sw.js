importScripts('./version.php');

const SW_VERSION = self.APP_VERSION || 'dev';
const CACHE_VERSION = 'gear-kiosk-' + SW_VERSION;
const APP_SHELL = [
    './',
    './index.php',
    './styles.css?v=' + SW_VERSION,
    './app.js?v=' + SW_VERSION,
    './site.webmanifest?v=' + SW_VERSION,
    './version.php',
    './offline.html',
    './img/apple-touch-icon.png',
    './img/favicon-96x96.png',
    './img/favicon.ico',
    './img/favicon.svg',
    './img/web-app-manifest-192x192.png',
    './img/web-app-manifest-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => key !== CACHE_VERSION)
                .map((key) => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET') {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put('./index.php', copy));
                    return response;
                })
                .catch(async () => {
                    const cachedIndex = await caches.match('./index.php');
                    if (cachedIndex) {
                        return cachedIndex;
                    }
                    return caches.match('./offline.html');
                })
        );
        return;
    }

    if (new URL(request.url).origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request)
                .then((response) => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    const responseToCache = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(request, responseToCache));
                    return response;
                })
                .catch(() => Response.error());
        })
    );
});