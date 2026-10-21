/**
 * Service worker de Isekai World: notificaciones push y pantalla sin conexión.
 *
 * La web NO se guarda en caché: cada página se pide siempre a la red, así que
 * nunca aparece una versión vieja (el problema de antes). Lo único guardado es
 * una pantalla pequeña de «sin conexión», que solo se muestra si al abrir una
 * página no hay internet, en vez del dinosaurio o la pantalla en blanco.
 */
const CACHE_OFFLINE = 'iw-offline-v1';
const PAGINA_OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const c = await caches.open(CACHE_OFFLINE);
    await c.add(new Request(PAGINA_OFFLINE, { cache: 'reload' })).catch(() => {});
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Borra cualquier caché de versiones anteriores (menos la de sin conexión)
    const claves = await caches.keys();
    await Promise.all(claves.filter((k) => k !== CACHE_OFFLINE).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
    await self.clients.claim();
  })());
});

// Solo se intercepta la apertura de páginas, y solo para el caso sin internet
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith((async () => {
    try {
      const previa = await event.preloadResponse;
      if (previa) return previa;
      return await fetch(event.request);
    } catch {
      const c = await caches.open(CACHE_OFFLINE);
      return (await c.match(PAGINA_OFFLINE)) || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
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
