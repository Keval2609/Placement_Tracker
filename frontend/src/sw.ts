/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

self.skipWaiting();
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://placement-tracker-yzdq.onrender.com";

// Web Push Notification Event Handler (Desktop + Mobile Android / iOS PWA)
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
  } = {};

  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Placement Drive Alert", body: event.data.text() };
  }

  const title = payload.title || "Placement Drive Alert";
  const options: NotificationOptions & { vibrate?: number[] } = {
    body: payload.body || "Tap to view placement drive details.",
    icon: payload.icon || "/pwa-192x192.png",
    badge: payload.badge || "/pwa-192x192.png",
    data: payload.data || {},
    vibrate: [200, 100, 200],
    tag: (payload.data?.alert_id as string) || "placement-alert",
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Auto-send receipt acknowledgment to backend if alert_id is present
      const alertId = payload.data?.alert_id as string | undefined;
      if (alertId) {
        // Send ACK
        fetch(`${API_BASE}/push/ack`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alert_id: alertId }),
        }).catch((e) => {
          console.warn("Push ACK fetch failed:", e);
        });
      }
    })
  );
});

// Notification Click Handler: focuses existing window or opens drive detail
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data?.target_url as string) ||
    (event.notification.data?.drive_id ? `/?drive=${event.notification.data.drive_id}` : "/");

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        try {
          if (new URL(client.url).origin === self.location.origin && "focus" in client) {
            await client.focus();
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        } catch {
          // Ignore malformed client URLs
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
