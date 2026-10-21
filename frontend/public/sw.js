// Service Worker for Student Deadline Radar
// Handles native background push notifications and notification click focusing.
// The notification-click navigation target is restricted to http(s) URLs:
// javascript:/data: and other schemes from notification data can never be opened.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function resolveSafeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl || '/', self.registration.scope);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch (_) {}
  return null;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = resolveSafeUrl(event.notification.data?.url) || self.registration.scope;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (urlToOpen && client.url.includes(urlToOpen)) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
      return undefined;
    })
  );
});
