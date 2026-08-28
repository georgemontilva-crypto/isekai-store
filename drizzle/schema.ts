import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  longtext,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "store", "gate"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Categories ───────────────────────────────────────────────────────────────
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal("compareAtPrice", { precision: 10, scale: 2 }),
  categoryId: int("categoryId").references(() => categories.id),
  stock: int("stock").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  featured: boolean("featured").default(false).notNull(),
  tags: json("tags").$type<string[]>(),
  installmentsEnabled: boolean("installmentsEnabled").default(false).notNull(),
  initialPayment: decimal("initialPayment", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── Product Images ───────────────────────────────────────────────────────────
export const productImages = mysqlTable("productImages", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id),
  url: text("url").notNull(),
  fileKey: text("fileKey"),
  altText: varchar("altText", { length: 256 }),
  position: int("position").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = typeof productImages.$inferInsert;

// ─── Product Variants ─────────────────────────────────────────────────────────
export const productVariants = mysqlTable("productVariants", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id),
  name: varchar("name", { length: 128 }).notNull(), // e.g. "Talla M / Rojo"
  options: json("options").$type<Record<string, string>>(), // { size: "M", color: "Red" }
  price: decimal("price", { precision: 10, scale: 2 }),
  stock: int("stock").default(0).notNull(),
  sku: varchar("sku", { length: 128 }),
  image: varchar("image", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = typeof productVariants.$inferInsert;

// ─── Cart Items ───────────────────────────────────────────────────────────────
export const cartItems = mysqlTable("cartItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  sessionId: varchar("sessionId", { length: 128 }), // for guest carts
  productId: int("productId").notNull().references(() => products.id),
  variantId: int("variantId").references(() => productVariants.id),
  quantity: int("quantity").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  userId: int("userId").references(() => users.id),
  customerName: varchar("customerName", { length: 256 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }),
  shippingAddress: json("shippingAddress").$type<{
    street: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  }>(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "preparing",
    "printing",
    "post_printing",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  trackingNumber: varchar("trackingNumber", { length: 255 }),
  trackingCarrier: varchar("trackingCarrier", { length: 100 }),
  notes: text("notes"),
  paymentMethod: varchar("paymentMethod", { length: 64 }),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "verifying", "approved", "rejected", "partial"]).default("pending").notNull(),
  amountPaid: decimal("amountPaid", { precision: 12, scale: 2 }).default("0.00"),
  paymentReference: varchar("paymentReference", { length: 256 }),
  receiptUrl: text("receiptUrl"),
  receiptHolder: varchar("receiptHolder", { length: 256 }),
  country: varchar("country", { length: 64 }),
  referralCode: varchar("referralCode", { length: 50 }),
  referralCosplayerId: int("referralCosplayerId"),
  hasSecretGift: boolean("hasSecretGift").default(false),
  giftCardCode: varchar("giftCardCode", { length: 50 }),
  giftCardDiscount: decimal("giftCardDiscount", { precision: 10, scale: 2 }).default("0.00"),
  // Archivado: saca el pedido de la bandeja activa sin borrarlo
  archived: boolean("archived").default(false).notNull(),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── Eventos y boletería ──────────────────────────────────────────────────────
// Todo queda agrupado por evento para conservar el historial de cada edición.
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  /** Fechas del evento: definen los días válidos para ingresar */
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  location: varchar("location", { length: 300 }),
  /** Solo un evento activo a la vez es lo normal, pero se permite más */
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Tipos de boleto configurables por evento, con su precio y qué incluye */
export const ticketTypes = mysqlTable("ticketTypes", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  priceUsd: decimal("priceUsd", { precision: 10, scale: 2 }).notNull(),
  /** 1 = un día, 2 = ambos días */
  days: int("days").notNull().default(1),
  perks: text("perks"),
  active: boolean("active").notNull().default(true),
  sortOrder: int("sortOrder").notNull().default(0),
});

/** Tiendas autorizadas a vender. Cada una tiene su usuario con rol `store`. */
export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  userId: int("userId"),
  contactName: varchar("contactName", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Boletos. Se generan EN BLANCO (solo token) y la tienda los activa al
 * venderlos, eligiendo el tipo y registrando al comprador.
 * Estados: blank (sin vender) | sold (vendido) | void (anulado)
 */
export const eventTickets = mysqlTable("eventTickets", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  /** Lo que lleva el QR: aleatorio y no secuencial */
  token: varchar("token", { length: 64 }).notNull().unique(),
  /** Código corto legible, para buscarlo a mano */
  code: varchar("code", { length: 20 }).notNull().unique(),

  status: varchar("status", { length: 20 }).notNull().default("blank"),

  /** Se rellenan al venderlo */
  ticketTypeId: int("ticketTypeId"),
  storeId: int("storeId"),
  buyerName: varchar("buyerName", { length: 200 }),
  buyerLastName: varchar("buyerLastName", { length: 200 }),
  buyerPhone: varchar("buyerPhone", { length: 50 }),
  /** Precio y tasa congelados en el momento de la venta */
  priceUsd: decimal("priceUsd", { precision: 10, scale: 2 }),
  rateBs: decimal("rateBs", { precision: 12, scale: 2 }),
  priceBs: decimal("priceBs", { precision: 14, scale: 2 }),
  soldAt: timestamp("soldAt"),
  soldByUserId: int("soldByUserId"),

  batch: varchar("batch", { length: 40 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Un registro por cada ingreso: permite bloquear el reingreso por día */
export const ticketCheckins = mysqlTable("ticketCheckins", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  /** Día del evento: 1 o 2 */
  eventDay: int("eventDay").notNull(),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
  checkedByUserId: int("checkedByUserId"),
  /** Se registró sin conexión y se sincronizó después */
  offline: boolean("offline").notNull().default(false),
});

/** Porteros autorizados a validar entradas */
export const gateUsers = mysqlTable("gateUsers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }),
  userId: int("userId"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventRow = typeof events.$inferSelect;
export type TicketType = typeof ticketTypes.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type EventTicket = typeof eventTickets.$inferSelect;

// ─── Abonos ───────────────────────────────────────────────────────────────────
// Cada pago parcial de un pedido, con su comprobante. Antes solo se guardaba
// el acumulado en orders.amountPaid, sin rastro de cada abono ni su captura.
export const orderPayments = mysqlTable("orderPayments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: varchar("method", { length: 50 }),
  reference: varchar("reference", { length: 256 }),
  holder: varchar("holder", { length: 256 }),
  receiptUrl: text("receiptUrl"),
  /** pending | approved | rejected */
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  /** Quién lo registró: "cliente" o "admin" */
  source: varchar("source", { length: 20 }).notNull().default("cliente"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderPayment = typeof orderPayments.$inferSelect;

// ─── Cotizaciones ─────────────────────────────────────────────────────────────
// Piezas encargadas a medida: el admin arma la cotización y comparte un enlace
// único. El cliente la abre sin iniciar sesión, la paga y sube su comprobante,
// y a partir de ahí el pedido vive dentro del sistema como cualquier otro.
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  /** Token del enlace público. Largo y aleatorio: es la única llave. */
  token: varchar("token", { length: 64 }).notNull().unique(),
  quoteNumber: varchar("quoteNumber", { length: 32 }).notNull().unique(),

  customerName: varchar("customerName", { length: 200 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 50 }),

  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  /** Líneas de la cotización: [{ concepto, cantidad, precio }] */
  items: json("items"),
  referenceImages: json("referenceImages"),

  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),

  /** Porcentaje mínimo a abonar (se conserva por compatibilidad) */
  depositPercent: int("depositPercent").notNull().default(100),
  /** Monto fijo del abono en USD. Si es null, se cobra el total. */
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),
  /** draft | sent | paid | cancelled | expired */
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  /** Pedido generado cuando el cliente paga */
  orderId: int("orderId"),

  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;

// ─── Suscriptores ─────────────────────────────────────────────────────────────
// Registro propio de los correos que deja la gente. Antes solo iban a Mailchimp
// y al correo del dueño, así que no había forma de consultarlos desde el panel.
export const subscribers = mysqlTable("subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  // "worldfest" o "newsletter"
  source: varchar("source", { length: 32 }).notNull().default("newsletter"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Subscriber = typeof subscribers.$inferSelect;

// ─── Media Library ────────────────────────────────────────────────────────────
// Depósito central de archivos subidos a R2. Subir aquí NO publica nada:
// después hay que asignar el archivo a su espacio desde el gestor de imágenes.
export const mediaAssets = mysqlTable("mediaAssets", {
  id: int("id").autoincrement().primaryKey(),
  url: text("url").notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 256 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  sizeBytes: int("sizeBytes").notNull().default(0),
  altText: varchar("altText", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MediaAsset = typeof mediaAssets.$inferSelect;

// ─── Order Items ──────────────────────────────────────────────────────────────
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  productId: int("productId").references(() => products.id),
  variantId: int("variantId").references(() => productVariants.id),
  productName: varchar("productName", { length: 256 }).notNull(),
  variantName: varchar("variantName", { length: 128 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity").notNull(),
  imageUrl: text("imageUrl"),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── Site Settings ─────────────────────────────────────────────────────────────────────────────────
export const siteSettings = mysqlTable("siteSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;

// ─── Auth Tokens (Magic Link / Verificación de email) ─────────────────────────
export const authTokens = mysqlTable("authTokens", {
  id:        int("id").autoincrement().primaryKey(),
  token:     varchar("token", { length: 128 }).notNull().unique(),
  email:     varchar("email", { length: 320 }).notNull(),
  type:      mysqlEnum("type", ["magic_link", "email_verify"]).notNull(),
  used:      boolean("used").default(false).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuthToken = typeof authTokens.$inferSelect;
export type InsertAuthToken = typeof authTokens.$inferInsert;

// ─── Admin Notifications ───────────────────────────────────────────────────────
export const adminNotifications = mysqlTable("adminNotifications", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["new_order", "new_subscriber", "new_user"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: varchar("body", { length: 500 }).notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminNotification = typeof adminNotifications.$inferSelect;
export type InsertAdminNotification = typeof adminNotifications.$inferInsert;

// ─── Order Notifications (customer) ──────────────────────────────────────────
export const orderNotifications = mysqlTable("orderNotifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId").notNull(),
  orderNumber: varchar("orderNumber", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: varchar("body", { length: 500 }).notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type OrderNotification = typeof orderNotifications.$inferSelect;
export type InsertOrderNotification = typeof orderNotifications.$inferInsert;

// ─── Wishlist ──────────────────────────────────────────────────────────────────
export const wishlist = mysqlTable("wishlist", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  productId: int("productId").notNull().references(() => products.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── FAQ Items ────────────────────────────────────────────────────────────────
export const faqItems = mysqlTable("faqItems", {
  id: int("id").autoincrement().primaryKey(),
  question: varchar("question", { length: 500 }).notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 100 }).default("General"),
  position: int("position").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type FaqItem = typeof faqItems.$inferSelect;
export type InsertFaqItem = typeof faqItems.$inferInsert;

// ─── Installment Plans ────────────────────────────────────────────────────────
export const installmentPlans = mysqlTable("installmentPlans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  productId: int("productId").notNull().references(() => products.id),
  productName: varchar("productName", { length: 256 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }).default("0").notNull(),
  installments: int("installments").default(3).notNull(),
  status: mysqlEnum("status", ["active", "completed", "cancelled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InstallmentPlan = typeof installmentPlans.$inferSelect;
export type InsertInstallmentPlan = typeof installmentPlans.$inferInsert;

// ─── Installment Payments ─────────────────────────────────────────────────────
export const installmentPayments = mysqlTable("installmentPayments", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull().references(() => installmentPlans.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentReference: varchar("paymentReference", { length: 256 }),
  receiptUrl: text("receiptUrl"),
  receiptHolder: varchar("receiptHolder", { length: 256 }),
  paymentMethod: varchar("paymentMethod", { length: 64 }),
  status: mysqlEnum("status", ["pending", "verifying", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InstallmentPayment = typeof installmentPayments.$inferSelect;
export type InsertInstallmentPayment = typeof installmentPayments.$inferInsert;

// ─── LinkBio Items ────────────────────────────────────────────────────────────
export const linkBioItems = mysqlTable("linkBioItems", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 200 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  position: int("position").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type LinkBioItem = typeof linkBioItems.$inferSelect;
export type InsertLinkBioItem = typeof linkBioItems.$inferInsert;

// ─── Popups ───────────────────────────────────────────────────────────────────
export const popups = mysqlTable('popups', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  active: boolean('active').default(false),
  title: varchar('title', { length: 300 }),
  subtitle: varchar('subtitle', { length: 500 }),
  bodyText: text('bodyText'),
  buttonText: varchar('buttonText', { length: 200 }),
  buttonUrl: varchar('buttonUrl', { length: 500 }),
  image: varchar('image', { length: 500 }),
  showEmail: boolean('showEmail').default(false),
  couponCode: varchar('couponCode', { length: 100 }),
  triggerType: varchar('triggerType', { length: 50 }).default('time'),
  triggerDelay: int('triggerDelay').default(3),
  triggerPage: varchar('triggerPage', { length: 200 }),
  triggerProductId: int('triggerProductId'),
  showOnce: boolean('showOnce').default(true),
  startDate: timestamp('startDate'),
  endDate: timestamp('endDate'),
  position: varchar('position', { length: 50 }).default('center'),
  audience: varchar('audience', { length: 20 }).default('all'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export type Popup = typeof popups.$inferSelect;
export type InsertPopup = typeof popups.$inferInsert;

// ─── Cosplay Guild ────────────────────────────────────────────────────────────
export const cosplayApplications = mysqlTable('cosplayApplications', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId'),
  artisticName: varchar('artisticName', { length: 200 }),
  photo: varchar('photo', { length: 500 }),
  bannerImage: varchar('bannerImage', { length: 500 }),
  gallery: json('gallery'),
  bio: text('bio'),
  fullName: varchar('fullName', { length: 200 }).notNull(),
  lastName: varchar('lastName', { length: 200 }).notNull(),
  age: int('age').notNull(),
  city: varchar('city', { length: 200 }).notNull(),
  country: varchar('country', { length: 200 }).notNull(),
  address: text('address').notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  email: varchar('email', { length: 200 }).notNull(),
  experience: int('experience').notNull(),
  instagram: varchar('instagram', { length: 200 }),
  tiktok: varchar('tiktok', { length: 200 }),
  youtube: varchar('youtube', { length: 200 }),
  facebook: varchar('facebook', { length: 200 }),
  twitter: varchar('twitter', { length: 200 }),
  whyIsekai: text('whyIsekai').notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  rejectionReason: text('rejectionReason'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const cosplayers = mysqlTable('cosplayers', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId'),
  applicationId: int('applicationId').notNull(),
  artisticName: varchar('artisticName', { length: 200 }).notNull(),
  bio: text('bio'),
  photo: varchar('photo', { length: 500 }),
  bannerImage: varchar('bannerImage', { length: 500 }),
  gallery: json('gallery').$type<string[]>(),
  tier: varchar('tier', { length: 20 }).default('bronce'),
  totalFollowers: int('totalFollowers').default(0),
  ticketBalance: int('ticketBalance').default(0),
  cashBalance: decimal('cashBalance', { precision: 10, scale: 2 }).default('0.00'),
  referralCode: varchar('referralCode', { length: 50 }),
  username: varchar('username', { length: 100 }),
  kitOrderId: int('kitOrderId'),
  isActive: boolean('isActive').default(true),
  instagram: varchar('instagram', { length: 200 }),
  tiktok: varchar('tiktok', { length: 200 }),
  youtube: varchar('youtube', { length: 200 }),
  facebook: varchar('facebook', { length: 200 }),
  twitter: varchar('twitter', { length: 200 }),
  approvedAt: timestamp('approvedAt').defaultNow(),
});

export const cosplayActivities = mysqlTable('cosplayActivities', {
  id: int('id').autoincrement().primaryKey(),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  basePoints: int('basePoints').notNull(),
  type: varchar('type', { length: 50 }).default('post'),
  // Fecha límite opcional: null = la misión no caduca
  deadline: timestamp('deadline'),
  // Cuántas entregas hacen falta para completarla (1 = misión simple)
  phases: int('phases').notNull().default(1),
  active: boolean('active').default(true),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const cosplaySubmissions = mysqlTable('cosplaySubmissions', {
  id: int('id').autoincrement().primaryKey(),
  cosplayerId: int('cosplayerId').notNull(),
  activityId: int('activityId').notNull(),
  evidenceUrl: varchar('evidenceUrl', { length: 500 }).notNull(),
  // Qué fase de la misión cubre esta entrega (1 en misiones simples)
  phase: int('phase').notNull().default(1),
  status: varchar('status', { length: 20 }).default('pending'),
  pointsAwarded: int('pointsAwarded'),
  evaluationDeadline: timestamp('evaluationDeadline'),
  evaluatedAt: timestamp('evaluatedAt'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const cosplayTicketLedger = mysqlTable('cosplayTicketLedger', {
  id: int('id').autoincrement().primaryKey(),
  cosplayerId: int('cosplayerId').notNull(),
  amount: int('amount').notNull(),
  cashAmount: decimal('cashAmount', { precision: 10, scale: 2 }),
  type: varchar('type', { length: 20 }).notNull(),
  ledgerType: varchar('ledgerType', { length: 20 }).default('ticket'),
  description: varchar('description', { length: 500 }),
  submissionId: int('submissionId'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const cosplayDiscountCodes = mysqlTable('cosplayDiscountCodes', {
  id: int('id').autoincrement().primaryKey(),
  cosplayerId: int('cosplayerId').notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  discountPercent: int('discountPercent').notNull(),
  ticketCost: int('ticketCost').notNull(),
  used: boolean('used').default(false),
  usedAt: timestamp('usedAt'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const cosplayCashWithdrawals = mysqlTable('cosplayCashWithdrawals', {
  id: int('id').autoincrement().primaryKey(),
  cosplayerId: int('cosplayerId').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  paymentMethod: varchar('paymentMethod', { length: 100 }),
  paymentDetails: text('paymentDetails'),
  notes: text('notes'),
  processedAt: timestamp('processedAt'),
  createdAt: timestamp('createdAt').defaultNow(),
});

// ─── Blog ─────────────────────────────────────────────────────────────────────
export const blogPosts = mysqlTable('blogPosts', {
  id: int('id').autoincrement().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 500 }).notNull(),
  excerpt: text('excerpt'),
  content: longtext('content'),
  coverImage: varchar('coverImage', { length: 500 }),
  category: varchar('category', { length: 100 }),
  tags: json('tags').$type<string[]>(),
  status: varchar('status', { length: 20 }).default('draft'),
  authorName: varchar('authorName', { length: 200 }).default('Isekai World'),
  metaTitle: varchar('metaTitle', { length: 500 }),
  metaDescription: text('metaDescription'),
  metaKeywords: text('metaKeywords'),
  views: int('views').default(0),
  publishedAt: timestamp('publishedAt'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
});

export const blogCategories = mysqlTable('blogCategories', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 200 }).notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const blogComments = mysqlTable('blogComments', {
  id: int('id').autoincrement().primaryKey(),
  postId: int('postId').notNull(),
  userId: int('userId'),
  guestName: varchar('guestName', { length: 200 }),
  guestEmail: varchar('guestEmail', { length: 200 }),
  content: text('content').notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('createdAt').defaultNow(),
});

// ─── Gift Cards ───────────────────────────────────────────────────────────────
export const giftCards = mysqlTable('giftCards', {
  id: int('id').autoincrement().primaryKey(),
  code: varchar('code', { length: 50 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('USD'),
  status: varchar('status', { length: 20 }).default('active'),
  discountType: varchar('discountType', { length: 20 }).default('fixed'),
  discountPercent: decimal('discountPercent', { precision: 5, scale: 2 }).default('0'),
  maxUses: int('maxUses').default(1),
  currentUses: int('currentUses').default(0),
  minOrderAmount: decimal('minOrderAmount', { precision: 10, scale: 2 }).default('0'),
  expiresAt: timestamp('expiresAt'),
  onlyNewUsers: boolean('onlyNewUsers').default(false),
  oncePerUser: boolean('oncePerUser').default(false),
  usedBy: int('usedBy'),
  usedAt: timestamp('usedAt'),
  orderId: int('orderId'),
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export type GiftCard = typeof giftCards.$inferSelect;
export type InsertGiftCard = typeof giftCards.$inferInsert;

// ─── Gift Card Usages ─────────────────────────────────────────────────────────
export const giftCardUsages = mysqlTable('giftCardUsages', {
  id: int('id').autoincrement().primaryKey(),
  giftCardId: int('giftCardId').notNull(),
  userId: int('userId').notNull(),
  orderId: int('orderId'),
  usedAt: timestamp('usedAt').defaultNow(),
});
