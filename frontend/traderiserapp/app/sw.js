// app/sw.js
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.2.0/workbox-sw.js');

// Precache assets using the manifest injected by Workbox
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// Cache the offline page during precaching
workbox.precaching.precacheAndRoute([
  { url: '/offline.html', revision: '1' },
]);

// Register a route for HTTPS URLs to use StaleWhileRevalidate strategy
workbox.routing.registerRoute(
  ({ url }) => url.protocol.startsWith('https'),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'offlineCache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 200,
      }),
    ],
  })
);

// Register a route for images to use CacheFirst strategy
workbox.routing.registerRoute(
  ({ url }) => url.pathname.match(/\.(?:png|jpg|jpeg|svg|gif)$/),
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Fallback to offline page for navigation requests
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkOnly({
    plugins: [
      {
        handlerDidError: async () => {
          return caches.match('/offline.html') || new Response('You are offline. Please check your connection.', {
            headers: { 'Content-Type': 'text/html' },
          });
        },
      },
    ],
  })
);

// Handle push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Traderiser Alert', body: 'New trading opportunity available!' };
  if (event.data) {
    data = event.data.json();
  }
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/images/traderiser-logo-192.png',
    badge: '/images/traderiser-logo-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }, // Optional URL to open on click
  });
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data.url;
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Skip waiting on install to activate the service worker immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Claim clients on activation to take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});