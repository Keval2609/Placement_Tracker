/* Push Notification Service Worker Handler */

self.addEventListener('push', function (event) {
  if (!event.data) return;

  var data = {};
  try {
    data = event.data.json();
  } catch (err) {
    data = { title: 'Placement Drive Alert', body: event.data.text() };
  }

  var title = data.title || 'Placement Drive Alert';
  var options = {
    body: data.body || 'Tap to view placement drive details.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    data: data.data || {},
    vibrate: [200, 100, 200],
    tag: (data.data && data.data.alert_id) || 'placement-alert',
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(function () {
      var alertId = data.data && data.data.alert_id;
      if (alertId) {
        fetch('/push/ack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alert_id: alertId }),
        }).catch(function (e) {
          console.warn('Push ACK fetch failed:', e);
        });
      }
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl =
    (event.notification.data && event.notification.data.target_url) ||
    (event.notification.data && event.notification.data.drive_id
      ? '/drives/' + event.notification.data.drive_id
      : '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
