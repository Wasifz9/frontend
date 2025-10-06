/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

import { build, files, version } from "$service-worker";

const CACHE = `cache-${version}`;
// Only cache essential files immediately
const CRITICAL_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/pwa-192x192.png'
];

// Filter out large files and non-essential assets
const DEFERRED_ASSETS = [...build, ...files].filter(file => {
  // Skip caching large images and senator images
  if (file.includes('/senator/') || file.includes('/img/')) return false;
  // Skip caching JSON data files
  if (file.endsWith('.json') && !file.includes('manifest')) return false;
  return true;
});

function getIconPath(size: string) {
  return new URL(`/pwa-${size}.png`, self.location.origin).href;
}

const ICONS = {
  DEFAULT: getIconPath('192x192'),
  SMALL: getIconPath('64x64'),
  LARGE: getIconPath('512x512')
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => {
        // Only cache critical assets during install
        console.log('[SW] Caching critical assets');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installed with critical assets');
        // Cache other assets in background after activation
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      // Cache deferred assets in background without blocking
      cacheInBackground();
      return self.clients.claim();
    })
  );
});

// Cache remaining assets in background without blocking
async function cacheInBackground() {
  try {
    const cache = await caches.open(CACHE);
    // Cache in small batches to avoid blocking
    const batchSize = 10;
    for (let i = 0; i < DEFERRED_ASSETS.length; i += batchSize) {
      const batch = DEFERRED_ASSETS.slice(i, i + batchSize);
      // Use addAll but don't wait
      cache.addAll(batch).catch(() => {
        // Ignore errors for individual assets
      });
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('[SW] Background caching complete');
  } catch (error) {
    console.log('[SW] Background caching error:', error);
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Skip caching for API requests
  const url = new URL(event.request.url);
  if (url.pathname.includes('/api/') || 
      url.hostname.includes('localhost') ||
      url.hostname.includes('127.0.0.1')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cache if available, but also fetch fresh in background
      const fetchPromise = fetch(event.request).then(response => {
        // Only cache successful responses
        if (response.ok && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // If fetch fails and we have cache, return it
        return cachedResponse;
      });

      // Return cached response immediately if available
      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let title = 'Stocknear';
  let body: string;
  let url = '/';

  try {
    const payload = event.data.text();
    try {
      const jsonData = JSON.parse(payload);
      if (jsonData.title) {
        title = jsonData.title;
        body = jsonData.body;
        url = jsonData.url || '/';
      } else {
        body = payload;
      }
    } catch {
      body = payload;
    }
  } catch {
    body = 'New notification';
  }

  const options: NotificationOptions = {
    body,
    icon: ICONS.DEFAULT,
    badge: ICONS.SMALL,
    timestamp: Date.now(),
    requireInteraction: true,
    tag: 'stocknear-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      suppressNotificationFrom: true,
      url: url
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlPath = event.notification.data.url || '/';
  const urlToOpen = new URL(urlPath, self.location.origin).href;

  event?.waitUntil(
    clients?.matchAll({ type: 'window', includeUncontrolled: true })?.then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients?.openWindow) {
        return clients?.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE)
        .then((cache) => cache.addAll(event.data.payload))
        .catch((error) => console.error('Service worker: Cache update failed:', error))
    );
  }
});