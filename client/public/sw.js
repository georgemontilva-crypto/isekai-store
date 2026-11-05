/**
 * Service worker de Isekai World: solo notificaciones push y el número rojo
 * sobre el ícono de la app. No intercepta páginas ni guarda la web en caché.
 */
const CACHE_OFFLINE = 'iw-offline-v1';
const VERSION_SW = 3; // subir al cambiar este archivo
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
    // Sin «navigation preload»: en algunos Android y navegadores dentro de
    // apps (Instagram, WhatsApp) falla sin motivo y mostraba «sin conexión»
    if (self.registration.navigationPreload) await self.registration.navigationPreload.disable().catch(() => {});
    await self.clients.claim();
  })());
});

/**
 * El service worker YA NO intercepta la apertura de páginas.
 *
 * Antes, si al abrir la web la petición fallaba dentro del service worker,
 * se mostraba la pantalla «Te quedaste sin conexión» aunque hubiera internet:
 * en algunos teléfonos (sobre todo iPhone) esa petición falla por motivos del
 * navegador y no de la red, y la persona quedaba atrapada en esa pantalla.
 * Ahora el navegador abre la web directamente, como cualquier página: si de
 * verdad no hay internet, muestra su propio aviso.
 *
 * Este service worker solo queda para las notificaciones push.
 */

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
