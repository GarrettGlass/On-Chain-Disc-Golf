const CACHE_NAME = 'on-chain-v7';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.jpg'
];

// Domains that should NEVER be cached or intercepted
// These are used for real-time streaming connections (gRPC, WebSockets, etc.)
const EXCLUDED_DOMAINS = [
  'breez.technology',
  'breez.tips',
  'spark.lightspark.com',
  'datasync.breez.technology',
  'relay.nostr.net',
  'relay.damus.io',
  'nos.lol',
  'relay.primal.net',
  'npub.cash',
  'minibits.cash',
  'wallet.minibits.cash'
];

// Check if a URL should be excluded from service worker handling
function shouldExclude(url) {
  try {
    const urlObj = new URL(url);
    return EXCLUDED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;

  // Skip service worker entirely for excluded domains
  // Let these requests go directly to the network
  if (shouldExclude(requestUrl)) {
    return; // Don't call event.respondWith - let browser handle normally
  }

  // Network-First strategy for HTML navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-First strategy for local assets only
  // Skip caching for external requests
  try {
    const url = new URL(requestUrl);
    if (url.origin !== self.location.origin) {
      // External request - network only, no caching
      event.respondWith(fetch(event.request));
      return;
    }
  } catch {
    // Invalid URL, let it pass through
  }

  // Cache-First for same-origin assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all clients immediately
  );
});
