/**
 * Service worker de Isekai World: SOLO notificaciones push.
 *
 * No guarda nada en caché ni intercepta peticiones (no hay «fetch»): la web
 * siempre se carga fresca desde la red. Esto evita el problema de antes, en
 * el que aparecían versiones viejas de la web. Al activarse, además, borra
 * cualquier caché que haya quedado de aquella versión.
 */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Llega una notificación (aunque la app esté cerrada)
self.addEventListener('push', (event) => {
  let datos = {};
  try { datos = event.data ? event.data.json() : {}; } catch { datos = { body: event.data && event.data.text() }; }
  const titulo = datos.title || 'Isekai World';
  event.waitUntil(self.registration.showNotification(titulo, {
    body: datos.body || '',
    icon: '/apple-touch-icon.png',
    badge: '/icons/icon-192.png',
    tag: datos.tag || undefined,
    renotify: !!datos.tag,
    data: { url: datos.url || '/' },
  }));
});

// Al tocar la notificación: abre la app en la sección indicada
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const v of ventanas) {
      if (new URL(v.url).origin === self.location.origin) {
        await v.focus();
        if (v.url !== url && 'navigate' in v) await v.navigate(url).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
