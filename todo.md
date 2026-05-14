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
