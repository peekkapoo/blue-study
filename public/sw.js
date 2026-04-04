self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Blue Study';
  const options = {
    body: data.body || 'You have a new study reminder.',
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const normalizedTarget = new URL(targetUrl, self.location.origin).href;
      for (const client of clientList) {
        if (client.url === normalizedTarget && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(normalizedTarget);
      }
      return undefined;
    }),
  );
});
