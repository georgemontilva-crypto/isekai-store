export const es = {
  // ── Navbar ──────────────────────────────────────────────────────────────
  nav: {
    announcements: [
      "Envío gratis en pedidos +$150.000 · Código FREESHIP",
      "Nuevos drops cada semana — ¡No te los pierdas!",
      "20% off en tu primer pedido · Únete ahora",
    ],
    shop: "Tienda",
    collections: "Colecciones",
    explore: "Explorar",
    compare: "Comparar",
    account: "Mi Cuenta",
    signIn: "Iniciar Sesión",
    searchPlaceholder: "Buscar productos...",
    search: "Buscar",
    searchTitle: "Buscar productos",
    exploreMenu: {
      about: "Sobre Nosotros",
      faq: "Preguntas Frecuentes",
      legal: "Políticas Legales",
    },
    mobileMenu: [
      { href: "/", label: "Inicio" },
      { href: "/catalog", label: "Tienda" },
      { href: "/catalog", label: "Colecciones" },
      { href: "/nosotros", label: "Nosotros" },
      { href: "/faq", label: "Preguntas Frecuentes" },
    ],
    collectionsMenu: {
      headphones: { label: "Audifonos", desc: "Sumérgete en el sonido." },
      earphones:  { label: "Auriculares", desc: "Diseño compacto, gran sonido." },
      speakers:   { label: "Parlantes", desc: "El sonido más inmersivo." },
      accessories: { label: "Accesorios", desc: "Calidad que dura años." },
      all:         { label: "Todas las Colecciones", desc: "Explora todo el catálogo." },
    },
  },

  // ── Home ────────────────────────────────────────────────────────────────
  home: {
    hero: [
      { tag: "Nueva Colección", title: "Experiencia\nAudio\nSin Igual", cta: "Ver Audifonos" },
      { tag: "Edición Limitada", title: "Sonido.\nEsculpido.\nPerfecto.", cta: "Explorar" },
      { tag: "Más Vendidos",    title: "Audio\nPremium\nGear",           cta: "Ver Colección" },
    ],
    collections: [
      { name: "Todo el Catálogo",  desc: "Explora toda la tienda" },
      { name: "Audifonos",          desc: "Sumérgete en el sonido" },
      { name: "Auriculares",        desc: "Diseño compacto, gran sonido" },
      { name: "Parlantes",          desc: "El sonido más inmersivo del mundo" },
      { name: "Accesorios",         desc: "Calidad que dura años" },
    ],
    brandStory: {
      label: "Nuestra Filosofía",
      heading: "Creemos en el",
      highlight: "poder del oficio",
      body: "Cada figura es una obra de arte impresa en 3D, diseñada para coleccionistas que viven el anime y los videojuegos.",
    },
    videoBanner: {
      title: "Sonido. Esculpido.",
      subtitle: "Un sonido que emociona desde cada ángulo.",
      cta: "Ver Colección",
    },
    sale: [
      { label: "Oferta por Tiempo Limitado", title: "Hasta un", highlight: "50% off", subtitle: "En parlantes y audifonos premium", cta: "Ver Ofertas" },
      { label: "Oferta Relámpago",           title: "Hasta",    highlight: "40% off", subtitle: "En audifonos premium — stock limitado", cta: "Ver Audifonos" },
      { label: "Oferta del Fin de Semana",     title: "Ahorra",   highlight: "30%",     subtitle: "En parlantes Bluetooth portátiles, solo este fin de semana", cta: "Ver Parlantes" },
    ],
    countdown: { days: "Días", hours: "Horas", mins: "Mins", secs: "Segs" },
    tabs: ["Todo", "Audifonos", "Auriculares", "Parlantes", "Accesorios"],
    bestSellers: "Más Vendidos",
    addToCart: "Agregar al carrito",
    soldOut: "Agotado",
    chooseOptions: "Ver opciones",
    noProducts: "Sin productos aún",
    noProductsDesc: "Agrega productos desde el panel admin",
    specs: { driver: "Controlador", weight: "Peso", battery: "Batería" },
    instagram: { title: "Ve el Feed", cta: "Seguirnos en Instagram" },
    marquee: ["Figuras Anime 3D", "★", "Ediciones Limitadas", "★", "Gaming Culture", "★", "Envío Gratis +$150.000", "★", "Coleccionables Premium", "★", "Nuevos Drops Semanales", "★", "ISEKAI WORLD", "★"],
  },

  // ── Cart ────────────────────────────────────────────────────────────────
  cart: {
    title: "Mi Carrito",
    empty: "Vacío",
    items: "artículo",
    itemsPlural: "artículos",
    freeShipping: "¡Tienes envío gratis!",
    freeShippingLeft: "más para envío gratis",
    add: "Agrega",
    emptyTitle: "Tu carrito está vacío",
    emptyDesc: "Explora el catálogo y encuentra algo que te encante",
    explore: "Explorar tienda",
    subtotal: "Subtotal",
    shipping: "Envío",
    free: "Gratis",
    total: "Total",
    checkout: "Ir al Checkout",
    secureBadge: "Pago seguro",
    returnBadge: "Devolución fácil",
  },

  // ── Catalog ─────────────────────────────────────────────────────────────
  catalog: {
    store: "Tienda",
    all: "Todo",
    catalog: "el catálogo",
    loading: "Cargando...",
    products: "producto",
    productsPlural: "productos",
    found: "encontrado",
    foundPlural: "encontrados",
    sort: {
      newest: "Más recientes",
      priceAsc: "Precio: menor a mayor",
      priceDesc: "Precio: mayor a menor",
      name: "Nombre A-Z",
    },
    filters: "Filtros",
    clearFilters: "Limpiar filtros",
    noResults: "Sin resultados",
    noResultsDesc: "Intenta con otros filtros o palabras clave",
    viewGrid: "Vista cuadrícula",
    viewList: "Vista lista",
    addToCart: "Agregar",
    soldOut: "Agotado",
    available: "disponibles",
  },

  // ── Product Detail ───────────────────────────────────────────────────────
  product: {
    addToCart: "Agregar al carrito",
    soldOut: "Producto agotado",
    outOfStock: "Agotado",
    inStock: "disponibles",
    addedToWishlist: "¡Favorito agregado!",
    removedFromWishlist: "Eliminado de favoritos",
    addToCartError: "No se pudo agregar al carrito",
    secure: "Pago seguro",
    shipping: "Envío rápido",
    returns: "Cambios fáciles",
    relatedTitle: "También te puede gustar",
    imageOf: "Imagen de",
    low: "¡Últimas",
  },

  // ── Checkout ────────────────────────────────────────────────────────────
  checkout: {
    title: "Finalizar Compra",
    back: "Volver al carrito",
    info: "Información de envío",
    name: "Nombre completo",
    email: "Correo electrónico",
    phone: "Teléfono (opcional)",
    address: "Dirección",
    city: "Ciudad",
    state: "Departamento",
    country: "País",
    zip: "Código postal",
    notes: "Notas del pedido (opcional)",
    summary: "Resumen del pedido",
    subtotal: "Subtotal",
    shipping: "Envío",
    free: "Gratis",
    total: "Total",
    confirm: "Confirmar pedido",
    processing: "Procesando...",
    errors: {
      name: "Nombre requerido",
      email: "Email inválido",
      address: "Dirección requerida",
      city: "Ciudad requerida",
      state: "Departamento requerido",
      error: "Error al procesar el pedido. Intenta de nuevo.",
    },
    success: {
      title: "¡Pedido confirmado!",
      subtitle: "Tu pedido ha sido recibido",
      order: "Número de pedido",
      message: "Te enviaremos un email con los detalles de tu pedido y la información de seguimiento.",
      continueShopping: "Seguir comprando",
      viewAccount: "Ver mis pedidos",
    },
    empty: "Tu carrito está vacío",
    emptyDesc: "Agrega productos para continuar",
    goShop: "Ir a la tienda",
  },

  // ── Account ─────────────────────────────────────────────────────────────
  account: {
    title: "Mi Cuenta",
    orders: "Mis Pedidos",
    noOrders: "No tienes pedidos aún",
    noOrdersDesc: "Cuando realices tu primera compra aparecerá aquí",
    shop: "Ir a la tienda",
    logout: "Cerrar sesión",
    loginTitle: "Inicia sesión para ver tu cuenta",
    loginBtn: "Iniciar sesión",
    status: {
      pending: "Pendiente",
      processing: "Procesando",
      shipped: "Enviado",
      delivered: "Entregado",
      cancelled: "Cancelado",
    },
    orderNumber: "Pedido",
    orderDate: "Fecha",
    orderTotal: "Total",
  },

  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    tagline: "Tu destino para merch premium de anime y gaming. Calidad para verdaderos fans.",
    trust: [
      { title: "Atención al Cliente", desc: "Estamos aquí para ayudarte con cualquier pregunta" },
      { title: "Envío Gratis", desc: "Pedidos desde $150.000 COP" },
      { title: "Referidos", desc: "Refiere un amigo y ambos ganan 15% off" },
      { title: "Pago Seguro", desc: "Tu información está protegida al 100%" },
    ],
    collections: "Colecciones",
    collectionsLinks: ["Todos los Productos", "Audifonos", "Auriculares", "Parlantes", "Accesorios"],
    info: "Legal / Info",
    infoLinks: [
      { label: "Sobre Nosotros", href: "/nosotros" },
      { label: "FAQ", href: "/faq" },
      { label: "Devoluciones", href: "/politicas" },
      { label: "Privacidad", href: "/politicas" },
      { label: "Cookies", href: "/politicas" },
      { label: "Mi Cuenta", href: "/account" },
    ],
    newsletter: "Únete a nuestra newsletter semanal",
    newsletterPlaceholder: "Tu email",
    copyright: "Todos los derechos reservados",
    policies: "Políticas",
  },

  // ── Pages ────────────────────────────────────────────────────────────────
  about: {
    label: "Nuestra Historia",
    title: "Isekai World",
    subtitle: "Nacimos de la pasión por el anime, el gaming y la cultura pop.",
    who: { title: "¿Quiénes somos?", body: "Somos una tienda colombiana especializada en figuras coleccionables, ropa y accesorios de anime y videojuegos. Cada producto es seleccionado a mano para garantizar la más alta calidad para nuestra comunidad de fans." },
    mission: { title: "Nuestra misión", body: "Acercar la cultura del anime y los videojuegos a Colombia y Latinoamérica con productos premium, auténticos y accesibles. Creemos que cada fan merece tener en sus manos una pieza que represente lo que ama." },
    why: { title: "¿Por qué Isekai?", body: '"Isekai" en japonés significa ser transportado a otro mundo. Eso es exactamente lo que queremos que sientas cuando recibes nuestros productos: que entras en el universo de tus personajes favoritos.' },
    contact: { title: "Contacto", schedule: "Lunes a Viernes · 9am – 6pm COT" },
  },

  faq: {
    label: "Preguntas Frecuentes",
    title: "¿En qué podemos ayudarte?",
    stillQuestion: "¿Tienes más preguntas?",
    stillDesc: "Escríbenos y te respondemos pronto",
  },

  policies: {
    label: "Legal",
    title: "Políticas",
    tabs: [
      { id: "devoluciones", label: "Devoluciones" },
      { id: "privacidad",   label: "Privacidad" },
      { id: "cookies",      label: "Cookies" },
    ],
    viewMore: "Ver",
  },

  // ── Floating Bar ─────────────────────────────────────────────────────────
  floatingBar: {
    promoLabel: "OBTÉN",
  },

  // ── Common ───────────────────────────────────────────────────────────────
  common: {
    loading: "Cargando...",
    error: "Ocurrió un error",
    notFound: "Página no encontrada",
    backHome: "Volver al inicio",
    new: "Nuevo",
  },
};

export type Translations = typeof es;
