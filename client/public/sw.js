/**
 * Service worker de despedida.
 *
 * POR QUÉ ESTÁ VACÍO: el guardado en caché venía provocando que apareciera
 * durante un instante una versión antigua de la web —el marquee y el menú
 * originales— al recargar. El problema se repitió con las políticas, con el
 * texto de envío gratis y con el menú, y cada arreglo dejaba un resto.
 *
 * Este archivo ya no guarda nada: borra todas las cachés y se da de baja a sí
 * mismo. Se mantiene publicado porque los navegadores que tengan instalada una
 * versión anterior lo descargarán y así se limpiarán solos. No se puede
 * eliminar el archivo hasta pasado un tiempo largo.
 *
 * La contrapartida: la web ya no abre sin conexión. A cambio, siempre se ve la
 * versión actual, que para una tienda con precios y stock importa más.
 */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(claves.map((k) => caches.delete(k)));
      await self.clients.claim();
      await self.registration.unregister();

      // Se recarga cada pestaña una última vez para soltar el control
      const pestanas = await self.clients.matchAll({ type: 'window' });
      pestanas.forEach((p) => p.navigate(p.url).catch(() => {}));
    })(),
  );
});

// Sin interceptar peticiones: todo va directo a la red
