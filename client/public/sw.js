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

/**
 * Número rojo sobre el ícono de la app (como las demás apps).
 * Cada aviso que llega suma 1, aunque la app esté cerrada. Al abrirla, la web
 * lo pone en el número real de notificaciones sin leer. Se guarda en la caché
 * de «sin conexión» para no perder la cuenta entre avisos.
 */
const CLAVE_CONTADOR = '/__contador-insignia';
async function leerContador() {
  try {
    const c = await caches.open(CACHE_OFFLINE);
    const r = await c.match(CLAVE_CONTADOR);
    return r ? (parseInt(await r.text(), 10) || 0) : 0;
  } catch { return 0; }
}
async function ponerContador(n) {
  const valor = Math.max(0, Math.min(999, n | 0));
  try {
    const c = await caches.open(CACHE_OFFLINE);
    await c.put(CLAVE_CONTADOR, new Response(String(valor)));
  } catch { /* sin caché */ }
  try {
    if (valor > 0 && self.navigator.setAppBadge) await self.navigator.setAppBadge(valor);
    else if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge();
  } catch { /* el sistema no lo permite */ }
}

// La web avisa el número real al abrirse o al leer notificaciones
self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.tipo === 'insignia') event.waitUntil(ponerContador(d.n));
});

// Llega una notificación (aunque la app esté cerrada)
self.addEventListener('push', (event) => {
  let datos = {};
  try { datos = event.data ? event.data.json() : {}; } catch { datos = { body: event.data && event.data.text() }; }
  const titulo = datos.title || 'Isekai World';
  event.waitUntil(Promise.all([
    self.registration.showNotification(titulo, {
      body: datos.body || '',
      icon: '/apple-touch-icon.png',
      badge: '/icons/icon-192.png',
      tag: datos.tag || undefined,
      renotify: !!datos.tag,
      data: { url: datos.url || '/' },
    }),
    (async () => {
      const n = typeof datos.badge === 'number' ? datos.badge : (await leerContador()) + 1;
      await ponerContador(n);
    })(),
  ]));
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
