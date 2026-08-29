/**
 * Service worker de Isekai World.
 *
 * PROBLEMA QUE RESUELVE: la versión anterior guardaba las páginas en una caché
 * de nombre fijo y las devolvía tal cual. Cuando se publicaba un cambio, el
 * navegador seguía mostrando la versión vieja indefinidamente — pasó con las
 * políticas y con el texto de envío gratis, que quedaron invisibles pese a
 * estar desplegados.
 *
 * ESTRATEGIA:
 *  - Los documentos HTML se piden SIEMPRE a la red primero. Si no hay señal,
 *    se usa la copia guardada. Así una web actualizada se ve al instante y
 *    una sin conexión sigue abriendo.
 *  - Los archivos con huella en el nombre (imágenes, JS, CSS) sí se sirven
 *    desde la caché: su nombre cambia cuando cambia su contenido.
 *  - El nombre de la caché lleva versión: al subirlo se borran las anteriores.
 */

const VERSION = 'v3';
const CACHE_PAGINAS = `isekai-paginas-${VERSION}`;
const CACHE_RECURSOS = `isekai-recursos-${VERSION}`;

self.addEventListener('install', () => {
  // Sin precarga: se guarda lo que el visitante realmente use
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(
        claves
          .filter((k) => k !== CACHE_PAGINAS && k !== CACHE_RECURSOS)
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

/** Los archivos con huella en el nombre nunca cambian de contenido */
function tieneHuella(ruta) {
  return /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|jpg|jpeg|webp|svg)$/.test(ruta);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin !== self.location.origin) return;

  // ── Recursos con huella: primero la caché, que es más rápida ──
  if (tieneHuella(url.pathname)) {
    event.respondWith(
      caches.match(req).then((guardado) => {
        if (guardado) return guardado;
        return fetch(req).then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE_RECURSOS).then((c) => c.put(req, copia));
          }
          return resp;
        });
      }),
    );
    return;
  }

  // ── Páginas: primero la red, para no servir versiones viejas ──
  const esDocumento = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (esDocumento) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE_PAGINAS).then((c) => c.put(req, copia));
          }
          return resp;
        })
        .catch(() =>
          caches.match(req).then((guardado) => guardado || caches.match('/')),
        ),
    );
    return;
  }

  // ── Lo demás: red con respaldo en caché ──
  event.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE_RECURSOS).then((c) => c.put(req, copia));
        }
        return resp;
      })
      .catch(() => caches.match(req)),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'saltar-espera') self.skipWaiting();
});
