# Isekai Store - TODO

## Base & Config
- [x] Inicializar proyecto web-db-user
- [x] Schema Drizzle: products, categories, orders, orderItems, cartItems, productVariants, productImages
- [x] Migración de base de datos (pnpm db:push)
- [x] Helpers de DB en server/db.ts
- [x] Routers tRPC: products, categories, orders, cart, admin

## Diseño Global
- [x] Tema oscuro premium (#171717) con acentos neón en index.css
- [x] Fuentes: Inter + tipografía anime en index.html
- [x] Componente Navbar con carrito y auth
- [x] Layout público con CartProvider
- [x] Animaciones Framer Motion globales

## Storefront
- [x] Homepage: sección hero animada
- [x] Homepage: colecciones destacadas
- [x] Homepage: productos top
- [x] Catálogo /catalog con filtros por categoría y búsqueda
- [x] Detalle de producto /product/:slug con galería e imágenes
- [x] Soporte de variantes en detalle de producto

## Carrito
- [x] Contexto de carrito con persistencia sessionId + DB
- [x] Drawer lateral deslizante (CartDrawer)
- [x] Actualización de cantidades desde el carrito
- [x] Resumen de orden en el carrito

## Checkout
- [x] Página de checkout con formulario de datos del cliente
- [x] Resumen del pedido antes de confirmar
- [x] Creación de orden en DB al confirmar
- [x] Pantalla de confirmación de pedido
- [x] Notificación al dueño por cada nuevo pedido

## Autenticación y Roles
- [x] Login/registro con Manus OAuth
- [x] Rol CUSTOMER: historial de pedidos en /account
- [x] Rol ADMIN: acceso a /admin protegido
- [x] Middleware adminProcedure de protección por rol

## Panel CMS Admin
- [x] Dashboard con métricas: ventas totales, pedidos recientes, productos más vendidos
- [x] CRUD de productos con imágenes, variantes, categoría, stock
- [x] Subida de imágenes al storage en la nube
- [x] Gestión de categorías (CRUD)
- [x] Gestión de pedidos con cambio de estado
- [x] Sidebar de navegación admin

## Tests
- [x] Tests de routers principales (products, orders, cart, categories, admin, auth) - 21 tests pasando

## Rediseño Visual (Shopify-inspired)
- [x] Homepage: marquee ticker animado
- [x] Homepage: hero cinematográfico con slides automáticos y tarjetas flotantes
- [x] Homepage: trust bar con iconos
- [x] Homepage: producto spotlight destacado
- [x] Homepage: colecciones bento grid
- [x] Homepage: productos en tabs por categoría
- [x] Homepage: banner editorial "¿Por qué elegirnos?"
- [x] Homepage: testimonios de clientes
- [x] Homepage: CTA newsletter
- [x] CartDrawer: progress bar envío gratis, trust badges, total animado
- [x] ProductCard: card-hover lift effect
- [x] CSS: utilidades card-hover, gradient-text-cyan, gradient-text-pink, shimmer, gradient-divider
- [x] Tipografía Orbitron mejorada (pesos 400-900)

## Popup Newsletter
- [x] NewsletterPopup: modal aparece suavemente, imagen entra desde la derecha 1s después (Framer Motion, dos fases)

## Carrusel de Colecciones
- [x] Carrusel horizontal scrolleable debajo del brand story: primera tarjeta grande "All products" con imagen de fondo, resto tarjetas con imagen centrada + nombre + descripción + flecha, bordes redondeados isla

## Sección Video + Producto Flotante
- [x] Sección video fullwidth: fondo imagen oscuro, título "Sound. Sculpted.", subtítulo, botón pill blanco con flecha, botón pause esquina inferior derecha
- [x] Tarjeta producto flotante superpuesta al borde inferior del video: galería miniaturas izquierda, imagen grande centro, detalles (nombre, precio, rating, variantes color, add to cart, trust badges) derecha

## Countdown Slider
- [x] Reemplazar countdown banner fullwidth por slider tipo isla con bordes redondeados, múltiples slides con countdown y CTA

## Best Sellers Rediseño
- [x] Best Sellers: cards horizontales scrolleables (5 desktop), imagen grande sin fondo gris, badge New verde, rating amarillo, nombre+precio misma línea, miniaturas variantes, specs técnicos, flechas navegación

## Correcciones UI
- [x] CartDrawer: textos invisibles (blanco sobre fondo oscuro) — corregir colores de texto en el drawer del carrito
- [x] Toast notifications: fondo oscuro visible (#1e1e1e), texto blanco (#f5f5f5), posición bottom-right, sin tapar el carrito
- [x] Checkout: banner con imagen de fondo debajo del resumen del pedido en el sidebar derecho
- [x] Reemplazar todos los emojis por iconos Lucide minimalistas en toda la web
- [x] Sección "Shop the Feed": feed de Instagram configurable desde el admin (username, access token, 4-8 fotos en grid, botón Follow us, mensaje de seguimiento)
- [x] Admin: panel de configuración de Instagram (username + access token + preview)
