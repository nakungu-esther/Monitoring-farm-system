/* importScripts: Web Push + notification click. Loaded by Workbox-generated SW. */
self.addEventListener('push', (event) => {
  let data = { title: 'AgriTrack', body: '' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      const t = event.data.text();
      data = { title: 'AgriTrack', body: typeof t === 'string' ? t : '' };
    }
  }
  const title = data.title || 'AgriTrack';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/logo.png',
      badge: '/logo.png',
      data: data.data || {},
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url && 'focus' in c) {
          c.navigate(self.location.origin + path);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(self.location.origin + path);
    }),
  );
});
