import { and, count, desc, eq, gt, gte, ilike, inArray, isNull, like, lt, lte, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getReferralCash, getReferralTickets } from "@shared/referral";
import { notifyOwner, notifyCosplayApproved, notifyCosplayRejected, notifyCosplayActivity, sendEmail } from "./_core/notification";
import { io } from "./_core/socket";
import { storageDelete } from "./storage";
import { drizzle } from "drizzle-orm/mysql2";
import {
  CartItem,
  InsertUser,
  Order,
  cartItems,
  categories,
  orderItems,
  orders,
  productImages,
  productVariants,
  products,
  users,
  siteSettings,
  mediaAssets,
  subscribers,
  quotes,
  orderPayments,
  guildFeedback,
  authTokens,
  adminNotifications,
  AdminNotification,
  orderNotifications,
  wishlist,
  faqItems,
  InsertFaqItem,
  installmentPlans,
  installmentPayments,
  InstallmentPlan,
  linkBioItems,
  InsertLinkBioItem,
  popups,
  Popup,
  cosplayApplications,
  cosplayers,
  cosplayActivities,
  cosplaySubmissions,
  cosplayTicketLedger,
  cosplayDiscountCodes,
  cosplayCashWithdrawals,
  blogPosts,
  blogCategories,
  blogComments,
  giftCards,
  giftCardUsages,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Categories ───────────────────────────────────────────────────────────────
export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.name);
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return result[0];
}

export async function createCategory(data: { name: string; slug: string; description?: string; imageUrl?: string; featured?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(categories).values(data);
  const result = await db.select().from(categories).where(eq(categories.slug, data.slug)).limit(1);
  return result[0];
}

export async function updateCategory(id: number, data: Partial<{ name: string; slug: string; description: string; imageUrl: string; featured: boolean }>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(categories).where(eq(categories.id, id));
}

// ─── Products ─────────────────────────────────────────────────────────────────
export async function getProducts(opts: {
  categoryId?: number;
  status?: "draft" | "published";
  featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts.categoryId) conditions.push(eq(products.categoryId, opts.categoryId));
  if (opts.status) conditions.push(eq(products.status, opts.status));
  if (opts.featured !== undefined) conditions.push(eq(products.featured, opts.featured));
  if (opts.search) conditions.push(like(products.name, `%${opts.search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.position, 0)))
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(where);

  return {
    items: items.map((r) => ({ ...r.products, category: r.categories, imageUrl: r.productImages?.url ?? null })),
    total: Number(countResult?.count ?? 0),
  };
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);

  if (!result[0]) return undefined;

  const product = { ...result[0].products, category: result[0].categories };
  const images = await db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(productImages.position);
  const variants = await db.select().from(productVariants).where(eq(productVariants.productId, product.id));

  return { ...product, images, variants };
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .limit(1);

  if (!result[0]) return undefined;

  const product = { ...result[0].products, category: result[0].categories };
  const images = await db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(productImages.position);
  const variants = await db.select().from(productVariants).where(eq(productVariants.productId, product.id));

  return { ...product, images, variants };
}

export async function createProduct(data: {
  name: string;
  slug: string;
  description?: string;
  price: string;
  compareAtPrice?: string;
  categoryId?: number;
  stock?: number;
  status?: "draft" | "published";
  featured?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(products).values({
    name: data.name,
    slug: data.slug,
    description: data.description,
    price: data.price,
    compareAtPrice: data.compareAtPrice,
    categoryId: data.categoryId,
    stock: data.stock ?? 0,
    status: data.status ?? "draft",
    featured: data.featured ?? false,
    installmentsEnabled: false,
    initialPayment: null,
  });
  const result = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
  return result[0];
}

export async function updateProduct(id: number, data: Partial<{
  name: string; slug: string; description: string; price: string;
  compareAtPrice: string; categoryId: number; stock: number;
  status: "draft" | "published"; featured: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(productImages).where(eq(productImages.productId, id));
  await db.delete(productVariants).where(eq(productVariants.productId, id));
  await db.delete(products).where(eq(products.id, id));
}

export async function addProductImage(productId: number, url: string, fileKey?: string, altText?: string, position?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(productImages).values({ productId, url, fileKey, altText, position: position ?? 0 });
}

export async function getProductImage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db.select().from(productImages).where(eq(productImages.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getProductImages(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(productImages.position);
}

export async function deleteProductImage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(productImages).where(eq(productImages.id, id));
}

export async function upsertProductVariant(data: {
  id?: number;
  productId: number;
  name: string;
  options?: Record<string, string>;
  price?: string;
  stock?: number;
  sku?: string;
  image?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(productVariants).set({ name: data.name, options: data.options, price: data.price, stock: data.stock ?? 0, sku: data.sku, image: data.image }).where(eq(productVariants.id, data.id));
  } else {
    await db.insert(productVariants).values({ productId: data.productId, name: data.name, options: data.options, price: data.price, stock: data.stock ?? 0, sku: data.sku, image: data.image });
  }
}

export async function deleteProductVariant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(productVariants).where(eq(productVariants.id, id));
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export async function getCartItems(userId?: number, sessionId?: string) {
  const db = await getDb();
  if (!db) return [];

  const condition = userId
    ? eq(cartItems.userId, userId)
    : sessionId
    ? eq(cartItems.sessionId, sessionId)
    : undefined;

  if (!condition) return [];

  const items = await db
    .select()
    .from(cartItems)
    .leftJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .leftJoin(productImages, and(eq(productImages.productId, cartItems.productId), eq(productImages.position, 0)))
    .where(condition);

  return items.map((r) => ({
    ...r.cartItems,
    product: r.products,
    variant: r.productVariants,
    imageUrl: r.productImages?.url,
  }));
}

export async function upsertCartItem(data: {
  userId?: number;
  sessionId?: string;
  productId: number;
  variantId?: number;
  quantity: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const condition = data.userId
    ? and(eq(cartItems.userId, data.userId), eq(cartItems.productId, data.productId), data.variantId ? eq(cartItems.variantId, data.variantId) : sql`variantId IS NULL`)
    : and(eq(cartItems.sessionId, data.sessionId!), eq(cartItems.productId, data.productId), data.variantId ? eq(cartItems.variantId, data.variantId) : sql`variantId IS NULL`);

  const existing = await db.select().from(cartItems).where(condition).limit(1);

  if (existing[0]) {
    await db.update(cartItems).set({ quantity: data.quantity }).where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({
      userId: data.userId,
      sessionId: data.sessionId,
      productId: data.productId,
      variantId: data.variantId,
      quantity: data.quantity,
    });
  }
}

export async function getCartItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db.select().from(cartItems).where(eq(cartItems.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function removeCartItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(cartItems).where(eq(cartItems.id, id));
}

export async function clearCart(userId?: number, sessionId?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (userId) await db.delete(cartItems).where(eq(cartItems.userId, userId));
  else if (sessionId) await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function createOrder(data: {
  userId?: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: { street: string; city: string; state: string; country: string; zip: string };
  subtotal: string;
  total: string;
  notes?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  /** Abono recibido. Si es menor al total, el pedido queda como parcial. */
  amountPaid?: string;
  paymentReference?: string;
  receiptHolder?: string;
  country?: string;
  referralCode?: string;
  referralCosplayerId?: number;
  hasSecretGift?: boolean;
  giftCardCode?: string;
  giftCardDiscount?: string;
  items: Array<{
    /** Nulo en pedidos que no salen del catálogo, como las cotizaciones */
    productId?: number | null;
    variantId?: number | null;
    productName: string;
    variantName?: string;
    price: string;
    quantity: number;
    imageUrl?: string;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const orderNumber = `ISK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  await db.insert(orders).values({
    orderNumber,
    userId: data.userId,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    shippingAddress: data.shippingAddress,
    subtotal: data.subtotal,
    total: data.total,
    notes: data.notes,
    paymentMethod: data.paymentMethod,
    country: data.country,
    referralCode: data.referralCode,
    referralCosplayerId: data.referralCosplayerId,
    hasSecretGift: data.hasSecretGift ?? false,
    giftCardCode: data.giftCardCode,
    giftCardDiscount: data.giftCardDiscount ?? "0.00",
    receiptUrl: data.receiptUrl,
    paymentReference: data.paymentReference,
    receiptHolder: data.receiptHolder,
    status: "pending",
    // Si el cliente ya subió su comprobante, el pago queda en verificación
    amountPaid: data.amountPaid,
    paymentStatus: data.receiptUrl ? "verifying" : "pending",
  });

  const [orderResult] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!orderResult) throw new Error("Failed to create order");

  for (const item of data.items) {
    await db.insert(orderItems).values({
      orderId: orderResult.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      price: item.price,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
    });
  }

  return orderResult;
}

export async function getOrders(opts: { userId?: number; status?: string; limit?: number; offset?: number; archived?: boolean }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts.userId) conditions.push(eq(orders.userId, opts.userId));
  if (opts.status) conditions.push(eq(orders.status, opts.status as Order["status"]));
  // Por defecto la bandeja muestra solo los pedidos activos
  if (opts.archived !== undefined) conditions.push(eq(orders.archived, opts.archived));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(opts.limit ?? 20).offset(opts.offset ?? 0);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(where);

  return { items, total: Number(countResult?.count ?? 0) };
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return undefined;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return { ...order, items };
}

export async function getOrderByNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return undefined;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { ...order, items };
}

export async function updateOrderStatus(
  id: number,
  status: Order["status"],
  trackingNumber?: string,
  trackingCarrier?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set({
    status,
    ...(trackingNumber !== undefined ? { trackingNumber } : {}),
    ...(trackingCarrier !== undefined ? { trackingCarrier } : {}),
  }).where(eq(orders.id, id));
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────
// ─── Site Settings ─────────────────────────────────────────────────────────────────────────────────
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return row?.value ?? null;
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  if (existing[0]) {
    await db.update(siteSettings).set({ value }).where(eq(siteSettings.key, key));
  } else {
    await db.insert(siteSettings).values({ key, value });
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(siteSettings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
}

// ─── Dashboard Metrics ───────────────────────────────────────────────────────────────────────────────
export async function getDashboardMetrics() {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, totalOrders: 0, recentOrders: [], topProducts: [], revenueResetAt: null as string | null };

  // Fecha de corte del contador: si el admin lo reinició, solo se suman los
  // pedidos posteriores. No se borra ni se modifica ningún pedido.
  const [resetRow] = await db.select().from(siteSettings).where(eq(siteSettings.key, 'revenue_reset_at')).limit(1);
  const resetAt = resetRow?.value ? new Date(resetRow.value) : null;
  const desdeCorte = resetAt && !isNaN(resetAt.getTime()) ? gte(orders.createdAt, resetAt) : undefined;

  // Se cuenta el dinero REALMENTE recibido, no el importe del pedido: si hubo
  // abono, `amountPaid` manda. Solo se usa `total` cuando no se registró
  // ningún abono (pedidos pagados de una vez, donde amountPaid queda en 0).
  const [fullRevenue] = await db
    .select({ total: sql<string>`SUM(CASE WHEN amountPaid > 0 THEN amountPaid ELSE total END)` })
    .from(orders)
    .where(desdeCorte ? and(eq(orders.paymentStatus, 'approved'), desdeCorte) : eq(orders.paymentStatus, 'approved'));

  const [partialRevenue] = await db
    .select({ total: sql<string>`SUM(amountPaid)` })
    .from(orders)
    .where(desdeCorte ? and(eq(orders.paymentStatus, 'partial'), desdeCorte) : eq(orders.paymentStatus, 'partial'));

  const totalRevenue = parseFloat(fullRevenue?.total ?? '0') + parseFloat(partialRevenue?.total ?? '0');

  const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(desdeCorte);

  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);

  const topProducts = await db
    .select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      totalSold: sql<number>`SUM(${orderItems.quantity})`,
      revenue: sql<string>`SUM(${orderItems.price} * ${orderItems.quantity})`,
    })
    .from(orderItems)
    .groupBy(orderItems.productId, orderItems.productName)
    .orderBy(desc(sql`SUM(${orderItems.quantity})`))
    .limit(5);

  return {
    totalRevenue,
    totalOrders: Number(orderCount?.count ?? 0),
    recentOrders,
    topProducts,
    revenueResetAt: resetAt ? resetAt.toISOString() : null,
  };
}

// ─── Auth Tokens ──────────────────────────────────────────────────────────────
export async function createAuthToken(data: {
  token: string;
  email: string;
  type: "magic_link" | "email_verify";
  expiresAt: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(authTokens).values(data);
}

export async function getAuthToken(token: string): Promise<typeof authTokens.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(authTokens).where(eq(authTokens.token, token)).limit(1);
  return rows[0] ?? null;
}

export async function markAuthTokenUsed(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(authTokens).set({ used: true }).where(eq(authTokens.token, token));
}

export async function deleteExpiredAuthTokens(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(authTokens).where(sql`${authTokens.expiresAt} < NOW()`);
}

// ─── Admin Notifications ──────────────────────────────────────────────────────
export async function insertAdminNotification(data: { type: AdminNotification["type"]; title: string; body: string }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminNotifications).values(data);
}

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminNotifications).orderBy(desc(adminNotifications.createdAt)).limit(50);
}

export async function getAdminUnreadCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select().from(adminNotifications).where(eq(adminNotifications.read, false));
  return rows.length;
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(adminNotifications).set({ read: true });
}

export async function markAdminNotificationRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(adminNotifications).set({ read: true }).where(eq(adminNotifications.id, id));
}

// ─── Order Notifications (customer) ──────────────────────────────────────────
export async function insertOrderNotification(data: {
  userId: number; orderId: number; orderNumber: string;
  type: string; title: string; body: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(orderNotifications).values(data);
}

export async function getUserOrderNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderNotifications)
    .where(eq(orderNotifications.userId, userId))
    .orderBy(desc(orderNotifications.createdAt))
    .limit(15);
}

export async function getOrderNotificationUnreadCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select().from(orderNotifications)
    .where(and(eq(orderNotifications.userId, userId), eq(orderNotifications.read, false)));
  return rows.length;
}

/** Marca UNA notificación como leída: se usa al tocarla en la campanita */
export async function markOrderNotificationRead(userId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(orderNotifications)
    .set({ read: true })
    .where(and(eq(orderNotifications.id, id), eq(orderNotifications.userId, userId)));
}

export async function markAllOrderNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(orderNotifications).set({ read: true }).where(eq(orderNotifications.userId, userId));
}

// ─── Wishlist ──────────────────────────────────────────────────────────────────
export async function getWishlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(wishlist)
    .leftJoin(products, eq(wishlist.productId, products.id))
    .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.position, 0)))
    .where(eq(wishlist.userId, userId));
  return rows.map(r => ({ ...r.wishlist, product: r.products ? { ...r.products, imageUrl: r.productImages?.url ?? null } : null }));
}

export async function toggleWishlist(userId: number, productId: number): Promise<{ saved: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(wishlist)
    .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)))
    .limit(1);
  if (existing.length) {
    await db.delete(wishlist).where(eq(wishlist.id, existing[0].id));
    return { saved: false };
  }
  await db.insert(wishlist).values({ userId, productId });
  return { saved: true };
}

export async function isInWishlist(userId: number, productId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(wishlist)
    .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)))
    .limit(1);
  return rows.length > 0;
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
export async function getPublicFaqItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(faqItems)
    .where(eq(faqItems.active, true))
    .orderBy(faqItems.position);
}

export async function getAllFaqItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(faqItems).orderBy(faqItems.position);
}

export async function createFaqItem(data: Pick<InsertFaqItem, "question" | "answer" | "category" | "position">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(faqItems).values(data);
}

export async function updateFaqItem(id: number, data: Partial<Pick<InsertFaqItem, "question" | "answer" | "category" | "position" | "active">>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(faqItems).set(data).where(eq(faqItems.id, id));
}

export async function deleteFaqItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(faqItems).where(eq(faqItems.id, id));
}

// ─── Payment helpers ──────────────────────────────────────────────────────────
export async function submitOrderReceipt(
  orderId: number,
  data: { receiptUrl: string; paymentReference: string; receiptHolder: string }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set({
    receiptUrl: data.receiptUrl,
    paymentReference: data.paymentReference,
    receiptHolder: data.receiptHolder,
    paymentStatus: "verifying",
  }).where(eq(orders.id, orderId));
}

export async function verifyOrderPayment(
  orderId: number,
  approved: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  if (!approved) {
    await db.update(orders).set({ paymentStatus: "rejected" }).where(eq(orders.id, orderId));
    return { completo: false };
  }

  // Verificar un pago NO significa que se pagó todo: si lo recibido es menor
  // al total, el pedido queda como PARCIAL con su saldo pendiente. Antes se
  // marcaba "approved" sin mirar el importe, y un abono de $8 sobre $15
  // aparecía como pagado por completo.
  const [pedido] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!pedido) throw new Error("El pedido no existe");

  const total = parseFloat(pedido.total as any) || 0;
  const pagado = parseFloat((pedido.amountPaid as any) ?? "0") || 0;
  const completo = pagado <= 0 || pagado >= total - 0.01;

  await db.update(orders).set({
    paymentStatus: completo ? "approved" : "partial",
    status: "preparing",
  }).where(eq(orders.id, orderId));

  return { completo, pagado, total, saldo: Math.max(0, Math.round((total - pagado) * 100) / 100) };
}

export async function updateOrderPaymentStatus(orderNumber: string, paymentStatus: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // 'paid' is Bold's conceptual status; map to 'approved' for the DB enum
  const dbPaymentStatus = paymentStatus === "paid" ? "approved" : (paymentStatus as Order["paymentStatus"]);
  return db.update(orders)
    .set({
      paymentStatus: dbPaymentStatus,
      ...(paymentStatus === "paid" ? { status: "preparing" as Order["status"] } : {}),
      updatedAt: new Date(),
    })
    .where(eq(orders.orderNumber, orderNumber));
}

export async function createManualOrder(input: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  userId?: number | null;
  items: Array<{ productName: string; quantity: number; price: string }>;
  total: string;
  notes?: string;
  shippingAddress?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const orderNumber = `IW-${Date.now()}-MAN`;
  const itemsText = input.items.map(i => `• ${i.productName} ×${i.quantity} @ $${i.price}`).join('\n');
  const fullNotes = [input.notes, itemsText].filter(Boolean).join('\n\n');
  await db.insert(orders).values({
    orderNumber,
    userId: input.userId ?? null,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone ?? '',
    shippingAddress: input.shippingAddress ?? {},
    total: input.total,
    subtotal: input.total,
    status: 'pending',
    paymentStatus: 'approved',
    notes: fullNotes,
  });
  const [newOrder] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
  return { orderNumber, id: newOrder?.id };
}

export async function findUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] ?? null;
}

export async function getOrdersByPaymentStatus(paymentStatus?: string) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const where = paymentStatus
    ? eq(orders.paymentStatus, paymentStatus as Order["paymentStatus"])
    : undefined;
  const items = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(50);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(where);
  return { items, total: Number(countResult?.count ?? 0) };
}

// ─── Installment Plans ────────────────────────────────────────────────────────
export async function createInstallmentPlan(data: {
  userId: number;
  productId: number;
  productName: string;
  totalAmount: string;
  amountPaid: string;
  installments: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(installmentPlans).values({ ...data, status: "active" });
  const [plan] = await db.select().from(installmentPlans)
    .where(and(eq(installmentPlans.userId, data.userId), eq(installmentPlans.productId, data.productId)))
    .orderBy(desc(installmentPlans.createdAt)).limit(1);
  return plan!;
}

export async function getMyInstallmentPlans(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const plans = await db.select().from(installmentPlans)
    .where(eq(installmentPlans.userId, userId))
    .orderBy(desc(installmentPlans.createdAt));
  const result = [];
  for (const plan of plans) {
    const payments = await db.select().from(installmentPayments)
      .where(eq(installmentPayments.planId, plan.id))
      .orderBy(desc(installmentPayments.createdAt));
    result.push({ ...plan, payments });
  }
  return result;
}

export async function submitInstallmentPayment(data: {
  planId: number;
  amount: string;
  paymentReference: string;
  receiptUrl: string;
  receiptHolder: string;
  paymentMethod: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(installmentPayments).values({ ...data, status: "pending" });
}

export async function verifyInstallmentPayment(paymentId: number, approved: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const status = approved ? "approved" : "rejected";
  await db.update(installmentPayments).set({ status }).where(eq(installmentPayments.id, paymentId));
  if (approved) {
    const [payment] = await db.select().from(installmentPayments).where(eq(installmentPayments.id, paymentId)).limit(1);
    if (payment) {
      const [plan] = await db.select().from(installmentPlans).where(eq(installmentPlans.id, payment.planId)).limit(1);
      if (plan) {
        const newPaid = (parseFloat(plan.amountPaid) + parseFloat(payment.amount)).toFixed(2);
        const completed = parseFloat(newPaid) >= parseFloat(plan.totalAmount);
        await db.update(installmentPlans).set({
          amountPaid: newPaid,
          status: completed ? "completed" : "active",
        }).where(eq(installmentPlans.id, plan.id));
      }
    }
  }
}

export async function getAllInstallmentPlans() {
  const db = await getDb();
  if (!db) return [];
  const plans = await db.select().from(installmentPlans).orderBy(desc(installmentPlans.createdAt));
  const result = [];
  for (const plan of plans) {
    const payments = await db.select().from(installmentPayments)
      .where(eq(installmentPayments.planId, plan.id))
      .orderBy(desc(installmentPayments.createdAt));
    result.push({ ...plan, payments });
  }
  return result;
}

export async function updateProductPaymentSettings(id: number, data: { installmentsEnabled: boolean; initialPayment?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set({
    installmentsEnabled: data.installmentsEnabled,
    initialPayment: data.initialPayment && data.initialPayment !== '' ? data.initialPayment : null,
  }).where(eq(products.id, id));
}

export async function getPendingOrdersCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(orders).where(eq(orders.status, "pending"));
  return result[0]?.count ?? 0;
}

export async function getPendingPaymentsCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() })
    .from(orders)
    .where(or(eq(orders.paymentStatus, 'pending'), eq(orders.paymentStatus, 'verifying')));
  return result[0]?.count ?? 0;
}

// ─── Users (admin) ────────────────────────────────────────────────────────────
export async function getUsers({ search, role }: { search?: string; role?: string }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    loginMethod: users.loginMethod,
    createdAt: users.createdAt,
  }).from(users);

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`)
      )
    );
  }
  if (role && role !== 'all') {
    conditions.push(eq(users.role, role as 'user' | 'admin'));
  }
  if (conditions.length) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query.orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(users).where(eq(users.id, userId));
}

// ─── LinkBio ──────────────────────────────────────────────────────────────────
export async function getPublicLinkBioItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(linkBioItems)
    .where(eq(linkBioItems.active, true))
    .orderBy(linkBioItems.position);
}

export async function getAllLinkBioItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(linkBioItems).orderBy(linkBioItems.position);
}

export async function createLinkBioItem(data: Pick<InsertLinkBioItem, "label" | "url" | "position">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(linkBioItems).values(data);
}

export async function updateLinkBioItem(id: number, data: Partial<Pick<InsertLinkBioItem, "label" | "url" | "position" | "active">>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(linkBioItems).set(data).where(eq(linkBioItems.id, id));
}

export async function deleteLinkBioItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(linkBioItems).where(eq(linkBioItems.id, id));
}

export async function reorderLinkBioItems(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await Promise.all(ids.map((id, i) =>
    db.update(linkBioItems).set({ position: i }).where(eq(linkBioItems.id, id))
  ));
}

// ─── Popups ───────────────────────────────────────────────────────────────────
export async function getActivePopups({ page, productId }: { page?: string; productId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const result = await db.select().from(popups).where(
    and(
      eq(popups.active, true),
      or(isNull(popups.startDate), lte(popups.startDate, now)),
      or(isNull(popups.endDate), gte(popups.endDate, now))
    )
  );
  return result.filter(p => {
    if (p.triggerType === 'page' && p.triggerPage && page) {
      return page.includes(p.triggerPage);
    }
    if (p.triggerType === 'product' && p.triggerProductId && productId) {
      return p.triggerProductId === productId;
    }
    return true;
  });
}

export async function getAllPopups() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(popups).orderBy(desc(popups.createdAt));
}

export async function createPopup(data: Omit<Popup, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(popups).values(data as any);
}

export async function updatePopup(id: number, data: Partial<Omit<Popup, 'id' | 'createdAt'>>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(popups).set(data as any).where(eq(popups.id, id));
}

export async function deletePopup(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(popups).where(eq(popups.id, id));
}

// ─── Cosplay Guild ────────────────────────────────────────────────────────────
const TIER_MULTIPLIERS: Record<string, number> = {
  bronce: 1, plata: 1.5, oro: 2, diamante: 3, platino: 5,
};
const DISCOUNT_COSTS: Record<number, number> = {
  10: 500, 20: 1000, 30: 2000, 50: 5000,
};

export async function getApprovedCosplayers() {
  const db = await getDb();
  if (!db) return [];

  const filas = await db.select().from(cosplayers)
    .where(eq(cosplayers.isActive, true))
    .orderBy(desc(cosplayers.approvedAt));

  // El perfil interno del dueño nunca sale en el directorio público, aunque
  // quedara marcado como activo: se crea solo para previsualizar el panel de
  // cosplayers, no es un cosplayer real del Guild.
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
  const idsAdmin = new Set(admins.map(a => a.id));

  return filas.filter(c => !c.userId || !idsAdmin.has(c.userId));
}

export async function getCosplayerByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(cosplayers).where(eq(cosplayers.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function getCosplayerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(cosplayers).where(eq(cosplayers.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createCosplayApplication(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(cosplayApplications).values(data);
  await insertAdminNotification({
    type: 'new_subscriber',
    title: '🎭 Nueva solicitud Cosplay Guild',
    body: `${data.fullName} ${data.lastName} de ${data.country} quiere unirse al Guild.`,
  });
  try {
    await notifyOwner({
      title: 'Nueva solicitud de cosplayer — Isekai World',
      content: `Nombre: ${data.fullName} ${data.lastName}\nPaís: ${data.country}\nEmail: ${data.email}\nInstagram: ${data.instagram ?? 'No indicado'}\nTikTok: ${data.tiktok ?? 'No indicado'}\nExperiencia: ${data.experience} años\n\nRevisa la solicitud en el panel admin → Cosplay Guild → Solicitudes.`,
    });
  } catch { /* non-critical */ }
}

export async function getAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
}

export async function getCosplayerByUsername(username: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(cosplayers)
    .where(and(eq(cosplayers.username, username), eq(cosplayers.isActive, true)));
  return result[0] ?? null;
}

export async function approveCosplayApplication(input: {
  applicationId: number;
  tier: string;
  totalFollowers: number;
  kitProductId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const appRows = await db.select().from(cosplayApplications)
    .where(eq(cosplayApplications.id, input.applicationId)).limit(1);
  const app = appRows[0];
  if (!app) throw new Error('Application not found');

  const artisticName = app.artisticName ?? `${app.fullName} ${app.lastName}`;

  await db.update(cosplayApplications)
    .set({ status: 'approved' })
    .where(eq(cosplayApplications.id, input.applicationId));

  // Generar username desde el nombre artístico
  const username = artisticName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Generar código de referido único
  const nameSlug = artisticName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const referralCode = `ISK-${nameSlug}-${randomPart}`;

  // Crear orden del kit — si falla, continuar igual sin abortar la aprobación
  let kitOrderId: number | null = null;
  let orderNumber = '';
  try {
    const existingKitOrders = await db.select({ orderNumber: orders.orderNumber })
      .from(orders)
      .where(like(orders.orderNumber, 'IW-KIT-%'));
    const maxNumber = existingKitOrders.reduce((max, o) => {
      const num = parseInt(o.orderNumber.replace('IW-KIT-', '')) || 0;
      return Math.max(max, num);
    }, 0);
    orderNumber = `IW-KIT-${String(maxNumber + 1).padStart(4, '0')}`;

    await db.insert(orders).values({
      orderNumber,
      userId: app.userId ?? undefined,
      customerName: `${app.fullName} ${app.lastName}`,
      customerEmail: app.email,
      customerPhone: app.phone,
      shippingAddress: { street: app.address, city: app.city, state: '', country: app.country, zip: '' },
      total: '0.00',
      subtotal: '0.00',
      status: 'preparing',
      paymentStatus: 'approved',
      notes: `Kit de bienvenida Isekai Cosplay Guild — ${artisticName}`,
    });

    const [kitOrder] = await db.select().from(orders)
      .where(eq(orders.orderNumber, orderNumber)).limit(1);

    if (kitOrder) {
      kitOrderId = kitOrder.id;
      if (input.kitProductId) {
        const [kitProduct] = await db.select().from(products)
          .where(eq(products.id, input.kitProductId)).limit(1);
        await db.insert(orderItems).values({
          orderId: kitOrder.id,
          productId: input.kitProductId,
          productName: kitProduct?.name ?? 'Kit de bienvenida',
          price: kitProduct?.price ?? '0.00',
          quantity: 1,
        });
      }
    }
    console.log('[Kit] Orden creada:', orderNumber);
  } catch (kitErr) {
    console.warn('[Kit] Error creando orden del kit — continuando sin kit:', kitErr);
  }

  // Crear perfil de cosplayer independientemente del resultado del kit
  await db.insert(cosplayers).values({
    userId: app.userId,
    applicationId: input.applicationId,
    artisticName: artisticName,
    bio: app.bio ?? null,
    photo: app.photo ?? null,
    bannerImage: app.bannerImage ?? null,
    gallery: app.gallery ?? null,
    tier: input.tier,
    totalFollowers: input.totalFollowers,
    instagram: app.instagram,
    tiktok: app.tiktok,
    youtube: app.youtube,
    facebook: app.facebook,
    twitter: app.twitter,
    ticketBalance: 0,
    cashBalance: '0.00',
    referralCode,
    username,
    kitOrderId,
    isActive: true,
  });

  try {
    await notifyCosplayApproved(app.email, app.fullName, artisticName, input.tier);
  } catch { /* non-critical */ }

  try {
    if (orderNumber) {
      await insertAdminNotification({
        type: 'new_order',
        title: `Kit ${orderNumber} generado`,
        body: `Kit de bienvenida creado para ${artisticName} (${input.tier.toUpperCase()})`,
      });
    }
  } catch { /* non-critical */ }

  return { orderNumber, kitOrderId };
}

export async function rejectCosplayApplication(input: { applicationId: number; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const appRows = await db.select().from(cosplayApplications)
    .where(eq(cosplayApplications.id, input.applicationId)).limit(1);
  const app = appRows[0];
  await db.update(cosplayApplications)
    .set({ status: 'rejected', rejectionReason: input.reason })
    .where(eq(cosplayApplications.id, input.applicationId));

  // Eliminar imágenes de R2
  if (app) {
    const base = ENV.r2PublicUrl.replace(/\/+$/, '');
    const urlToKey = (url: string) => url.replace(`${base}/`, '');
    const toDelete: string[] = [];
    if (app.photo) toDelete.push(urlToKey(app.photo));
    if ((app as any).bannerImage) toDelete.push(urlToKey((app as any).bannerImage));
    if (app.gallery) {
      const gallery = Array.isArray(app.gallery) ? app.gallery : JSON.parse(app.gallery as string);
      gallery.forEach((url: string) => toDelete.push(urlToKey(url)));
    }
    for (const key of toDelete) {
      try {
        await storageDelete(key);
        console.log('[R2] Deleted:', key);
      } catch (err) {
        console.warn('[R2] Failed to delete:', key, err);
      }
    }
  }

  try {
    if (app?.email) await notifyCosplayRejected(app.email, app.fullName, input.reason);
  } catch { /* non-critical */ }
}

export async function updateCosplayerProfile(userId: number, data: {
  artisticName?: string;
  bio?: string; photo?: string; bannerImage?: string; gallery?: string[];
  instagram?: string; tiktok?: string; youtube?: string; facebook?: string; twitter?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const cosplayer = await getCosplayerByUserId(userId);
  if (!cosplayer) throw new Error('Not a cosplayer');

  const cambios: any = { ...data };

  // El nombre artístico no puede repetirse: es lo que identifica al cosplayer
  // en el directorio y en su enlace público.
  if (data.artisticName) {
    const nombre = data.artisticName.trim();
    const todos = await db.select().from(cosplayers);
    const repetido = todos.some(
      c => c.id !== cosplayer.id && c.artisticName.trim().toLowerCase() === nombre.toLowerCase(),
    );
    if (repetido) throw new Error("Ya hay otro cosplayer con ese nombre");
    cambios.artisticName = nombre;
  }

  await db.update(cosplayers).set(cambios).where(eq(cosplayers.id, cosplayer.id));
}

/** Normaliza un enlace para comparar: sin protocolo, sin www, sin barra final
    ni parámetros de campaña. Así "instagram.com/p/ABC" y
    "https://www.instagram.com/p/ABC/?igshid=x" cuentan como el MISMO enlace. */
export function normalizarEnlace(url: string): string {
  let v = url.trim().toLowerCase();
  v = v.replace(/^https?:\/\//, '').replace(/^www\./, '');
  v = v.split('#')[0];
  const [base, query] = v.split('?');
  const limpio = base.replace(/\/+$/, '');
  if (!query) return limpio;
  // Se conservan los parámetros que identifican contenido (ej. ?v= de YouTube)
  const utiles = new URLSearchParams();
  new URLSearchParams(query).forEach((val, k) => {
    if (/^(utm_|igshid|fbclid|si$|feature$)/i.test(k)) return;
    utiles.append(k, val);
  });
  const q = utiles.toString();
  return q ? `${limpio}?${q}` : limpio;
}

/**
 * Registra la entrega de UNA fase de una misión.
 *
 * Reglas que se validan en el servidor (no basta con el formulario):
 *  - el enlace es obligatorio y debe ser una URL http(s) válida
 *  - no se puede repetir un enlace ya usado por ese cosplayer en esa misión
 *  - no se puede reenviar una fase ya entregada
 *  - las fases se entregan en orden
 *  - si la misión tiene fecha límite y ya pasó, no se admite
 */
export async function submitCosplayActivity(
  userId: number,
  input: { activityId: number; evidenceUrl: string; phase?: number },
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const cosplayer = await getCosplayerByUserId(userId);
  if (!cosplayer) throw new Error('Not a cosplayer');

  const url = (input.evidenceUrl ?? '').trim();
  if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(url)) {
    throw new Error('Debes pegar el enlace de tu publicación para completar la fase');
  }

  const [actividad] = await db.select().from(cosplayActivities)
    .where(eq(cosplayActivities.id, input.activityId)).limit(1);
  if (!actividad) throw new Error('La misión no existe');
  if (actividad.active === false) throw new Error('Esta misión ya no está activa');
  if (actividad.deadline && new Date(actividad.deadline).getTime() < Date.now()) {
    throw new Error('La fecha límite de esta misión ya pasó');
  }

  const totalFases = actividad.phases ?? 1;
  const fase = input.phase ?? 1;
  if (fase < 1 || fase > totalFases) throw new Error('Fase inválida');

  const previas = await db.select().from(cosplaySubmissions)
    .where(and(
      eq(cosplaySubmissions.cosplayerId, cosplayer.id),
      eq(cosplaySubmissions.activityId, input.activityId),
    ));

  if (previas.some(p => (p.phase ?? 1) === fase)) {
    throw new Error(`Ya entregaste la fase ${fase} de esta misión`);
  }

  const esperada = (previas.length ?? 0) + 1;
  if (fase !== esperada) {
    throw new Error(`Debes completar primero la fase ${esperada}`);
  }

  const nuevo = normalizarEnlace(url);
  if (previas.some(p => normalizarEnlace(p.evidenceUrl) === nuevo)) {
    throw new Error('Ese enlace ya lo usaste en otra fase. Cada fase necesita una publicación distinta.');
  }

  const evalDeadline = new Date();
  evalDeadline.setDate(evalDeadline.getDate() + 30);

  await db.insert(cosplaySubmissions).values({
    cosplayerId: cosplayer.id,
    activityId: input.activityId,
    evidenceUrl: url,
    phase: fase,
    status: 'pending',
    evaluationDeadline: evalDeadline,
  });

  return {
    fase,
    totalFases,
    completada: fase >= totalFases,
    artisticName: cosplayer.artisticName,
    cosplayerId: cosplayer.id,
    tituloMision: actividad.title,
    evidenceUrl: url,
  };
}

/** Entregas del cosplayer en una misión, para dibujar la barra de progreso */
export async function getMyActivityProgress(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const cosplayer = await getCosplayerByUserId(userId);
  if (!cosplayer) return [];
  return db.select().from(cosplaySubmissions)
    .where(eq(cosplaySubmissions.cosplayerId, cosplayer.id))
    .orderBy(desc(cosplaySubmissions.id));
}

export async function evaluateCosplaySubmission(input: { submissionId: number; pointsAwarded: number; status: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const subRows = await db.select().from(cosplaySubmissions)
    .where(eq(cosplaySubmissions.id, input.submissionId)).limit(1);
  const sub = subRows[0];
  if (!sub) throw new Error('Submission not found');
  const cosplayer = await getCosplayerById(sub.cosplayerId);
  if (!cosplayer) throw new Error('Cosplayer not found');

  const multiplier = TIER_MULTIPLIERS[cosplayer.tier ?? 'bronce'] ?? 1;
  let finalPoints = Math.round(input.pointsAwarded * multiplier);

  // Misión por fases con fecha límite: la recompensa es TODO o NADA. Si la
  // fecha pasó y no entregó todas las fases, no se paga aunque haya subido
  // algunas — así el plazo significa algo.
  const [actividad] = await db.select().from(cosplayActivities)
    .where(eq(cosplayActivities.id, sub.activityId)).limit(1);

  const totalFases = actividad?.phases ?? 1;

  if (totalFases > 1) {
    // Estado del resto de fases (esta aún no está guardada con su nuevo estado)
    const entregas = await db.select().from(cosplaySubmissions)
      .where(and(
        eq(cosplaySubmissions.cosplayerId, sub.cosplayerId),
        eq(cosplaySubmissions.activityId, sub.activityId),
      ));

    const otras = entregas.filter(e => e.id !== sub.id);
    const aprobadasOtras = otras.filter(e => e.status === 'approved').length;
    // Contando ESTA evaluación
    const aprobadasTotal = aprobadasOtras + (input.status === 'approved' ? 1 : 0);
    const todasAprobadas = aprobadasTotal >= totalFases;

    // REGLA: la recompensa se libera SOLO cuando están las N fases y TODAS
    // aprobadas. Aprobar una fase suelta no paga nada; el pago completo se
    // hace al aprobar la última que faltaba.
    if (!todasAprobadas) {
      finalPoints = 0;
      console.log(
        `[Misión] ${cosplayer.artisticName} · "${actividad?.title}": ` +
        `${aprobadasTotal}/${totalFases} fases aprobadas — aún sin recompensa.`
      );
    } else {
      // Se paga la misión completa una sola vez
      finalPoints = Math.round((actividad?.basePoints ?? input.pointsAwarded) * multiplier);
      console.log(
        `[Misión] ${cosplayer.artisticName} completó "${actividad?.title}": ` +
        `se liberan ${finalPoints} tickets.`
      );
    }

    // Con fecha límite, además, todas debieron entregarse a tiempo
    if (actividad?.deadline && new Date(actividad.deadline).getTime() < Date.now()) {
      const entregadasATiempo = entregas.filter(
        e => e.status !== 'rejected' && new Date(e.createdAt as any).getTime() <= new Date(actividad.deadline as any).getTime()
      ).length;
      if (entregadasATiempo < totalFases) {
        finalPoints = 0;
        console.warn(
          `[Misión] ${cosplayer.artisticName} no completó "${actividad?.title}" dentro del plazo ` +
          `(${entregadasATiempo}/${totalFases} a tiempo): sin recompensa.`
        );
      }
    }
  }

  await db.update(cosplaySubmissions).set({
    status: input.status,
    pointsAwarded: finalPoints,
    evaluatedAt: new Date(),
  }).where(eq(cosplaySubmissions.id, input.submissionId));

  if (input.status === 'approved' && finalPoints > 0) {
    await db.update(cosplayers)
      .set({ ticketBalance: sql`ticketBalance + ${finalPoints}` })
      .where(eq(cosplayers.id, cosplayer.id));
    await db.insert(cosplayTicketLedger).values({
      cosplayerId: cosplayer.id,
      amount: finalPoints,
      type: 'earned',
      description: `Actividad completada (x${multiplier} tier ${cosplayer.tier})`,
      submissionId: input.submissionId,
    });

    if (cosplayer.userId) {
      const user = await getUserById(cosplayer.userId);
      if (user?.email) {
        try {
          await sendEmail(
            user.email,
            '🎫 ¡Actividad aprobada! Tickets acreditados',
            `
              <h1>¡Tu actividad fue aprobada!</h1>
              <p>Hola <strong>${cosplayer.artisticName}</strong>, el equipo de Isekai World ha evaluado tu actividad.</p>
              <div class="order-box">
                <p><strong>Tickets acreditados:</strong> <span class="highlight">${finalPoints} tickets</span></p>
                <p><strong>Puntos base:</strong> ${input.pointsAwarded} × ${multiplier} (tier ${cosplayer.tier})</p>
                <p><strong>Balance actual:</strong> ${(cosplayer.ticketBalance ?? 0) + finalPoints} tickets</p>
              </div>
              <p>Canjea tus tickets por códigos de descuento desde tu dashboard.</p>
              <div style="text-align:center">
                <a href="https://isekaiworld.co/cosplay/dashboard" class="btn">Ver mi billetera →</a>
              </div>
            `,
            `+${finalPoints} tickets acreditados en tu billetera`,
          );
        } catch { /* non-critical */ }
      }
      try {
        io.to(`user:${cosplayer.userId}`).emit('notification:new');
      } catch { /* non-critical */ }
    }
  }
}

export async function redeemCosplayDiscountCode(userId: number, discountPercent: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const cosplayer = await getCosplayerByUserId(userId);
  if (!cosplayer) throw new Error('Not a cosplayer');
  const cost = DISCOUNT_COSTS[discountPercent];
  if (!cost) throw new Error('Invalid discount');
  if ((cosplayer.ticketBalance ?? 0) < cost) {
    throw new Error(`Tickets insuficientes. Necesitas ${cost}, tienes ${cosplayer.ticketBalance}`);
  }
  const code = `ISK-${discountPercent}OFF-${nanoid(8).toUpperCase()}`;
  await db.update(cosplayers)
    .set({ ticketBalance: sql`ticketBalance - ${cost}` })
    .where(eq(cosplayers.id, cosplayer.id));
  await db.insert(cosplayDiscountCodes).values({ cosplayerId: cosplayer.id, code, discountPercent, ticketCost: cost });
  await db.insert(cosplayTicketLedger).values({
    cosplayerId: cosplayer.id, amount: -cost, type: 'redeemed',
    description: `Código de descuento ${discountPercent}% canjeado`,
  });
  return { code, discountPercent };
}

export async function getCosplayerTickets(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const cosplayer = await getCosplayerByUserId(userId);
  if (!cosplayer) return null;
  const ledger = await db.select().from(cosplayTicketLedger)
    .where(eq(cosplayTicketLedger.cosplayerId, cosplayer.id))
    .orderBy(desc(cosplayTicketLedger.createdAt));
  return { balance: cosplayer.ticketBalance ?? 0, ledger };
}

export async function getMyCosplayerDiscountCodes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const cosplayer = await getCosplayerByUserId(userId);
  if (!cosplayer) return [];
  return db.select().from(cosplayDiscountCodes)
    .where(eq(cosplayDiscountCodes.cosplayerId, cosplayer.id))
    .orderBy(desc(cosplayDiscountCodes.createdAt));
}

export async function getCosplayApplications(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status && status !== 'all') {
    return db.select().from(cosplayApplications)
      .where(eq(cosplayApplications.status, status))
      .orderBy(desc(cosplayApplications.createdAt));
  }
  return db.select().from(cosplayApplications).orderBy(desc(cosplayApplications.createdAt));
}

export async function getAllCosplayers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cosplayers).orderBy(desc(cosplayers.approvedAt));
}

export async function updateCosplayerTier(input: { cosplayerId: number; tier: string; totalFollowers: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(cosplayers).set({ tier: input.tier, totalFollowers: input.totalFollowers })
    .where(eq(cosplayers.id, input.cosplayerId));
}

export async function suspendCosplayer(cosplayerId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(cosplayers).set({ isActive: false }).where(eq(cosplayers.id, cosplayerId));
}

export async function getActiveActivities() {
  const db = await getDb();
  if (!db) {
    console.log('[getActiveActivities] DB is null');
    return [];
  }

  const now = new Date();

  const result = await db.select().from(cosplayActivities)
    .where(
      and(
        eq(cosplayActivities.active, true),
        or(
          isNull(cosplayActivities.deadline),
          gt(cosplayActivities.deadline, now)
        )
      )
    )
    .orderBy(desc(cosplayActivities.createdAt));

  console.log('[getActiveActivities] result count:', result.length);
  return result;
}

export async function createCosplayActivity(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(cosplayActivities).values({
    ...data,
    deadline: data.deadline ? new Date(data.deadline) : null,
  });

  const activeCosplayers = await db
    .select({ userId: cosplayers.userId, artisticName: cosplayers.artisticName, tier: cosplayers.tier })
    .from(cosplayers)
    .where(eq(cosplayers.isActive, true));

  for (const cp of activeCosplayers) {
    if (!cp.userId) continue;
    try {
      const user = await getUserById(cp.userId);
      if (!user?.email) continue;
      await notifyCosplayActivity(user.email, cp.artisticName, cp.tier ?? 'bronce', data);
    } catch { /* non-critical */ }
  }
}

export async function getAllCosplayActivities() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cosplayActivities).orderBy(desc(cosplayActivities.createdAt));
}

export async function toggleCosplayActivity(id: number, active: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(cosplayActivities).set({ active }).where(eq(cosplayActivities.id, id));
}

export async function deleteCosplayActivity(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cosplayActivities).where(eq(cosplayActivities.id, id));
}

export async function updateCosplayActivity(id: number, data: { active?: boolean; title?: string; description?: string; basePoints?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(cosplayActivities).set(data).where(eq(cosplayActivities.id, id));
}

export async function getMyCosplayerSubmissions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const cosplayer = await getCosplayerByUserId(userId);
  if (!cosplayer) return [];
  return db.select().from(cosplaySubmissions)
    .where(eq(cosplaySubmissions.cosplayerId, cosplayer.id))
    .orderBy(desc(cosplaySubmissions.createdAt));
}

export async function getAllCosplaySubmissions(status?: string) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select({
    id: cosplaySubmissions.id,
    cosplayerId: cosplaySubmissions.cosplayerId,
    activityId: cosplaySubmissions.activityId,
    evidenceUrl: cosplaySubmissions.evidenceUrl,
    status: cosplaySubmissions.status,
    pointsAwarded: cosplaySubmissions.pointsAwarded,
    evaluationDeadline: cosplaySubmissions.evaluationDeadline,
    evaluatedAt: cosplaySubmissions.evaluatedAt,
    createdAt: cosplaySubmissions.createdAt,
    artisticName: cosplayers.artisticName,
    tier: cosplayers.tier,
    photo: cosplayers.photo,
    activityTitle: cosplayActivities.title,
    activityBasePoints: cosplayActivities.basePoints,
    // Fase de esta entrega y total de la misión: sin esto el panel mostraba
    // cada entrega suelta y pedía premiar en cada una, cuando el premio va
    // al completar todas.
    phase: cosplaySubmissions.phase,
    activityPhases: cosplayActivities.phases,
  })
  .from(cosplaySubmissions)
  .leftJoin(cosplayers, eq(cosplaySubmissions.cosplayerId, cosplayers.id))
  .leftJoin(cosplayActivities, eq(cosplaySubmissions.activityId, cosplayActivities.id))
  .orderBy(desc(cosplaySubmissions.createdAt));

  const filas = (status && status !== 'all')
    ? await query.where(eq(cosplaySubmissions.status, status))
    : await query;

  // Cuántas fases lleva entregadas cada cosplayer en cada misión: con eso el
  // panel sabe si esta entrega completa la misión o si aún faltan.
  const todas = await db.select({
    cosplayerId: cosplaySubmissions.cosplayerId,
    activityId: cosplaySubmissions.activityId,
    status: cosplaySubmissions.status,
  }).from(cosplaySubmissions);

  return filas.map(f => {
    const delMismo = todas.filter(t => t.cosplayerId === f.cosplayerId && t.activityId === f.activityId);
    const entregadas = delMismo.filter(t => t.status !== 'rejected').length;
    const total = f.activityPhases ?? 1;
    return {
      ...f,
      entregadas,
      totalFases: total,
      /** Solo la última entrega habilita el premio */
      esUltimaFase: (f.phase ?? 1) >= total,
      misionCompleta: entregadas >= total,
    };
  });
}

export async function addEvidenceToSubmission(submissionId: number, additionalUrl: string, cosplayerId?: number) {
  const db = await getDb();
  if (!db) return null;
  const [sub] = await db.select().from(cosplaySubmissions).where(eq(cosplaySubmissions.id, submissionId));
  if (!sub) return null;
  if (cosplayerId !== undefined && sub.cosplayerId !== cosplayerId) return null;
  let urls: string[] = [];
  try { urls = JSON.parse(sub.evidenceUrl); } catch { urls = [sub.evidenceUrl]; }
  urls.push(additionalUrl);
  await db.update(cosplaySubmissions).set({ evidenceUrl: JSON.stringify(urls) }).where(eq(cosplaySubmissions.id, submissionId));
  return { success: true };
}

export async function getCosplayerByReferralCode(code: string) {
  const db = await getDb();
  if (!db) return null;

  const limpio = (code ?? "").trim();
  if (!limpio) return null;

  const result = await db.select({
    id: cosplayers.id,
    artisticName: cosplayers.artisticName,
    tier: cosplayers.tier,
  }).from(cosplayers)
    .where(and(
      eq(cosplayers.referralCode, limpio),
      eq(cosplayers.isActive, true)
    ));
  if (result[0]) return result[0];

  /**
   * Búsqueda tolerante.
   *
   * El código se dicta de viva voz o se copia a mano, así que llega en
   * minúsculas, con espacios o con guiones de más. Antes la comparación era
   * exacta: cualquier diferencia hacía que la compra se guardara sin
   * cosplayer y su comisión se perdiera sin aviso.
   */
  const normalizar = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const buscado = normalizar(limpio);
  if (buscado.length < 3) return null;

  const todos = await db.select({
    id: cosplayers.id,
    artisticName: cosplayers.artisticName,
    tier: cosplayers.tier,
    referralCode: cosplayers.referralCode,
    isActive: cosplayers.isActive,
  }).from(cosplayers);

  const hallado = todos.find(
    c => c.isActive && normalizar(c.referralCode ?? "") === buscado,
  );
  return hallado ? { id: hallado.id, artisticName: hallado.artisticName, tier: hallado.tier } : null;
}

/**
 * Acredita la recompensa de una venta referida: dólares Y tickets, según el
 * tramo del total de la orden. Ambos quedan registrados en el libro mayor
 * como dos apuntes separados, para que el cosplayer vea de dónde sale cada uno.
 */
export async function creditCashToReferrer(
  cosplayerId: number,
  amount: number,
  orderNumber: string,
  tickets: number = 0,
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.update(cosplayers)
    .set({ cashBalance: sql`cashBalance + ${amount}` })
    .where(eq(cosplayers.id, cosplayerId));

  await db.insert(cosplayTicketLedger).values({
    cosplayerId,
    amount: 0,
    cashAmount: String(amount),
    type: 'earned',
    ledgerType: 'cash',
    description: `Comisión por venta — Orden ${orderNumber}`,
  });

  if (tickets > 0) {
    await db.update(cosplayers)
      .set({ ticketBalance: sql`ticketBalance + ${tickets}` })
      .where(eq(cosplayers.id, cosplayerId));

    await db.insert(cosplayTicketLedger).values({
      cosplayerId,
      amount: tickets,
      cashAmount: '0.00',
      type: 'earned',
      ledgerType: 'tickets',
      description: `Tickets por venta — Orden ${orderNumber}`,
    });
  }
}

export async function getCashWithdrawals(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status && status !== 'all') {
    return db.select().from(cosplayCashWithdrawals)
      .where(eq(cosplayCashWithdrawals.status, status))
      .orderBy(desc(cosplayCashWithdrawals.createdAt));
  }
  return db.select().from(cosplayCashWithdrawals)
    .orderBy(desc(cosplayCashWithdrawals.createdAt));
}

export async function processWithdrawal(id: number, status: string, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const withdrawal = (await db.select().from(cosplayCashWithdrawals)
    .where(eq(cosplayCashWithdrawals.id, id)))[0];
  if (!withdrawal) throw new Error('Not found');

  await db.update(cosplayCashWithdrawals).set({
    status,
    processedAt: new Date(),
    notes,
  }).where(eq(cosplayCashWithdrawals.id, id));

  if (status === 'rejected') {
    await db.update(cosplayers)
      .set({ cashBalance: sql`cashBalance + ${withdrawal.amount}` })
      .where(eq(cosplayers.id, withdrawal.cosplayerId));
  }
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? null;
}

export async function requestCashWithdrawal(cosplayerId: number, amount: number, paymentMethod: string, paymentDetails: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(cosplayers)
    .set({ cashBalance: sql`cashBalance - ${amount}` })
    .where(eq(cosplayers.id, cosplayerId));
  await db.insert(cosplayCashWithdrawals).values({
    cosplayerId,
    amount: String(amount),
    paymentMethod,
    paymentDetails,
    status: 'pending',
  });
}

export async function deductCosplayerCash(cosplayerId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(cosplayers)
    .set({ cashBalance: sql`cashBalance - ${amount}` })
    .where(eq(cosplayers.id, cosplayerId));
}

export async function deleteCosplayer(cosplayerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cosplayers).where(eq(cosplayers.id, cosplayerId));
}

export async function grantTicketsManually(cosplayerId: number, basePoints: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const cosplayer = await getCosplayerById(cosplayerId);
  if (!cosplayer) throw new Error('Cosplayer not found');
  const multiplier = TIER_MULTIPLIERS[cosplayer.tier ?? 'bronce'] ?? 1;
  const finalPoints = Math.round(basePoints * multiplier);
  await db.update(cosplayers)
    .set({ ticketBalance: sql`ticketBalance + ${finalPoints}` })
    .where(eq(cosplayers.id, cosplayerId));
  await db.insert(cosplayTicketLedger).values({
    cosplayerId,
    amount: finalPoints,
    type: 'earned',
    description: `Manual: ${reason} (base: ${basePoints} × ${multiplier})`,
  });
  return { finalPoints, multiplier };
}

// ============ BLOG ============

export async function getBlogPosts({ status, category, limit, offset }: { status?: string; category?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (status && status !== 'all') conditions.push(eq(blogPosts.status, status));
  if (category) conditions.push(eq(blogPosts.category, category));
  const query = conditions.length
    ? db.select().from(blogPosts).where(and(...conditions))
    : db.select().from(blogPosts);
  return query.orderBy(desc(blogPosts.publishedAt)).limit(limit ?? 20).offset(offset ?? 0);
}

export async function getBlogPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
  return result[0] ?? null;
}

export async function getBlogPostById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  return result[0] ?? null;
}

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export async function createBlogPost(data: any) {
  const db = await getDb();
  if (!db) return;
  const slug = data.slug || slugify(data.title);
  await db.insert(blogPosts).values({ ...data, slug, publishedAt: data.status === 'published' ? new Date() : null });
}

export async function updateBlogPost(id: number, data: any) {
  const db = await getDb();
  if (!db) return;
  await db.update(blogPosts).set({ ...data, publishedAt: data.status === 'published' ? (data.publishedAt ?? new Date()) : null, updatedAt: new Date() }).where(eq(blogPosts.id, id));
}

export async function deleteBlogPost(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
}

export async function incrementBlogViews(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(blogPosts).set({ views: sql`views + 1` }).where(eq(blogPosts.id, id));
}

export async function getBlogCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogCategories).orderBy(blogCategories.name);
}

export async function createBlogCategory(data: any) {
  const db = await getDb();
  if (!db) return;
  const slug = slugify(data.name);
  await db.insert(blogCategories).values({ ...data, slug });
}

export async function deleteBlogCategory(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(blogCategories).where(eq(blogCategories.id, id));
}

export async function getBlogComments(postId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(blogComments.postId, postId)];
  if (status) conditions.push(eq(blogComments.status, status));
  return db.select().from(blogComments).where(and(...conditions)).orderBy(desc(blogComments.createdAt));
}

export async function getAllBlogComments(status?: string) {
  const db = await getDb();
  if (!db) return [];
  const where = status ? eq(blogComments.status, status) : undefined;
  const q = where ? db.select().from(blogComments).where(where) : db.select().from(blogComments);
  return q.orderBy(desc(blogComments.createdAt));
}

export async function createBlogComment(data: any) {
  const db = await getDb();
  if (!db) return;
  await db.insert(blogComments).values(data);
}

export async function updateBlogCommentStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(blogComments).set({ status }).where(eq(blogComments.id, id));
}

export async function deleteBlogComment(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(blogComments).where(eq(blogComments.id, id));
}

// ─── Gift Cards ───────────────────────────────────────────────────────────────

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `GR-${seg()}-${seg()}-${seg()}`;
}

export async function createGiftCard(data: {
  amount: number;
  discountType?: string;
  discountPercent?: number;
  maxUses?: number;
  minOrderAmount?: number;
  expiresAt?: Date | null;
  onlyNewUsers?: boolean;
  oncePerUser?: boolean;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  let code = generateGiftCardCode();
  let exists = true;
  while (exists) {
    const rows = await db.select({ id: giftCards.id }).from(giftCards).where(eq(giftCards.code, code)).limit(1);
    exists = rows.length > 0;
    if (exists) code = generateGiftCardCode();
  }
  await db.insert(giftCards).values({
    code,
    amount: String(data.amount),
    discountType: data.discountType ?? 'fixed',
    discountPercent: String(data.discountPercent ?? 0),
    maxUses: data.maxUses ?? 1,
    currentUses: 0,
    minOrderAmount: String(data.minOrderAmount ?? 0),
    expiresAt: data.expiresAt ?? undefined,
    onlyNewUsers: data.onlyNewUsers ?? false,
    oncePerUser: data.oncePerUser ?? false,
    notes: data.notes,
    status: 'active',
  });
  return code;
}

export async function getGiftCards() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(giftCards).orderBy(desc(giftCards.createdAt));
}

export async function validateGiftCard(code: string, userId?: number, orderTotal?: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(giftCards)
    .where(and(eq(giftCards.code, code.toUpperCase()), eq(giftCards.status, 'active')));
  const card = result[0];
  if (!card) return { valid: false, reason: 'Código no válido' };

  if ((card.currentUses ?? 0) >= (card.maxUses ?? 1))
    return { valid: false, reason: 'Código agotado' };

  if (card.expiresAt && new Date(card.expiresAt) < new Date())
    return { valid: false, reason: 'Código expirado' };

  if (orderTotal && parseFloat(card.minOrderAmount ?? '0') > 0) {
    if (orderTotal < parseFloat(card.minOrderAmount ?? '0'))
      return { valid: false, reason: `Monto mínimo requerido: $${parseFloat(card.minOrderAmount ?? '0').toFixed(2)} USD` };
  }

  if (card.onlyNewUsers && userId) {
    const prev = await db.select({ id: orders.id }).from(orders).where(eq(orders.userId, userId));
    if (prev.length > 0)
      return { valid: false, reason: 'Código solo válido para nuevos clientes' };
  }

  if (card.oncePerUser && userId) {
    const userUsage = await db.select().from(giftCardUsages)
      .where(and(
        eq(giftCardUsages.giftCardId, card.id),
        eq(giftCardUsages.userId, userId)
      ));
    if (userUsage.length > 0)
      return { valid: false, reason: 'Ya usaste este código anteriormente' };
  }

  let discount = 0;
  if (card.discountType === 'percent') {
    discount = orderTotal ? (orderTotal * parseFloat(card.discountPercent ?? '0') / 100) : 0;
  } else {
    discount = parseFloat(card.amount);
  }

  return {
    valid: true,
    card: {
      id: card.id,
      code: card.code,
      amount: card.amount,
      discountType: card.discountType,
      discountPercent: card.discountPercent,
      discount: discount.toFixed(2),
      maxUses: card.maxUses,
      currentUses: card.currentUses,
    },
  };
}

export async function redeemGiftCard(code: string, userId: number | null, orderId: number) {
  const db = await getDb();
  if (!db) return false;

  const rows = await db.select().from(giftCards).where(eq(giftCards.code, code.toUpperCase()));
  const card = rows[0];
  if (!card) return false;

  const newUses = (card.currentUses ?? 0) + 1;
  const isExhausted = newUses >= (card.maxUses ?? 1);

  await db.update(giftCards).set({
    currentUses: newUses,
    status: isExhausted ? 'used' : 'active',
    usedBy: userId,
    usedAt: new Date(),
    orderId,
  }).where(eq(giftCards.code, code.toUpperCase()));

  if (userId) {
    await db.insert(giftCardUsages).values({
      giftCardId: card.id,
      userId,
      orderId,
    });
  }

  return true;
}

export async function deleteGiftCard(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db.select().from(giftCards).where(eq(giftCards.id, id)).limit(1);
  if (rows[0]?.status === 'used') throw new Error('No se puede eliminar una tarjeta ya usada');
  await db.delete(giftCards).where(eq(giftCards.id, id));
}

/** Archiva o desarchiva un pedido (no lo borra) */
export async function setOrderArchived(id: number, archived: boolean) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(orders)
    .set({ archived, archivedAt: archived ? new Date() : null })
    .where(eq(orders.id, id));
  return getOrderById(id);
}

/** Archiva en lote todos los pedidos entregados o cancelados anteriores a una fecha */
export async function archiveOldOrders(before: Date) {
  const db = await getDb();
  if (!db) return 0;
  const targets = await db.select({ id: orders.id }).from(orders).where(
    and(
      eq(orders.archived, false),
      inArray(orders.status, ["delivered", "cancelled"]),
      lt(orders.createdAt, before),
    )
  );
  if (targets.length === 0) return 0;
  await db.update(orders)
    .set({ archived: true, archivedAt: new Date() })
    .where(inArray(orders.id, targets.map(t => t.id)));
  return targets.length;
}

// ─── Media Library ────────────────────────────────────────────────────────────

export async function listMediaAssets(opts?: { limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  // Ordenado por id: refleja el orden real de subida, lo más nuevo primero
  return db.select().from(mediaAssets).orderBy(desc(mediaAssets.id)).limit(opts?.limit ?? 200);
}

export async function insertMediaAsset(data: {
  url: string; storageKey: string; fileName: string; mimeType: string; sizeBytes: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const [res] = await db.insert(mediaAssets).values(data);
  const [row] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, res.insertId)).limit(1);
  return row;
}

export async function getMediaAsset(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  return row;
}

export async function updateMediaAlt(id: number, altText: string) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(mediaAssets).set({ altText }).where(eq(mediaAssets.id, id));
  return getMediaAsset(id);
}

export async function deleteMediaAsset(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
}

/** Devuelve las claves de siteSettings que apuntan a esta URL (dónde se está usando) */
export async function findSettingsUsingUrl(url: string) {
  const db = await getDb();
  if (!db) return [] as string[];
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.value, url));
  return rows.map(r => r.key);
}

/**
 * Importa a la biblioteca las imágenes que ya están asignadas en siteSettings
 * y que todavía no figuran en mediaAssets. Sirve para poblar la biblioteca la
 * primera vez, sin volver a subir nada: los archivos ya viven en R2.
 */
export async function importExistingMedia() {
  const db = await getDb();
  if (!db) return { imported: 0 };

  const settings = await db.select().from(siteSettings);
  const existing = await db.select({ url: mediaAssets.url }).from(mediaAssets);
  const known = new Set(existing.map(e => e.url));

  const candidates = new Map<string, string>(); // url -> clave de origen
  for (const row of settings) {
    const value = (row.value ?? "").trim();
    if (!/^https?:\/\//i.test(value)) continue;
    if (!/\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(value)) continue;
    if (known.has(value) || candidates.has(value)) continue;
    candidates.set(value, row.key);
  }
  if (candidates.size === 0) return { imported: 0 };

  const rows = Array.from(candidates.entries()).map(([url]) => {
    const path = url.split("?")[0];
    const fileName = decodeURIComponent(path.substring(path.lastIndexOf("/") + 1)) || "archivo";
    const ext = (fileName.split(".").pop() ?? "").toLowerCase();
    const mimeType = ext === "png" ? "image/png"
      : ext === "webp" ? "image/webp"
      : ext === "gif" ? "image/gif"
      : ext === "svg" ? "image/svg+xml"
      : ext === "avif" ? "image/avif"
      : "image/jpeg";
    // La clave de R2 es lo que sigue al dominio público
    const storageKey = path.replace(/^https?:\/\/[^/]+\//i, "");
    return { url, storageKey, fileName, mimeType, sizeBytes: 0 };
  });

  await db.insert(mediaAssets).values(rows);
  return { imported: rows.length };
}

/** Borra varias tarjetas de regalo de una vez */
export async function deleteGiftCards(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return { deleted: 0 };
  await db.delete(giftCards).where(inArray(giftCards.id, ids));
  return { deleted: ids.length };
}

// ─── Suscriptores ─────────────────────────────────────────────────────────────

/** Guarda el correo. Si ya existía, no duplica y conserva su origen original. */
export async function insertSubscriber(email: string, source: string) {
  const db = await getDb();
  if (!db) return;
  const [existing] = await db.select().from(subscribers).where(eq(subscribers.email, email)).limit(1);
  if (existing) return existing;
  await db.insert(subscribers).values({ email, source });
  const [row] = await db.select().from(subscribers).where(eq(subscribers.email, email)).limit(1);
  return row;
}

export async function getSubscribers(source?: string) {
  const db = await getDb();
  if (!db) return [];
  const where = source ? eq(subscribers.source, source) : undefined;
  return db.select().from(subscribers).where(where).orderBy(desc(subscribers.id)).limit(1000);
}

export async function deleteSubscriber(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(subscribers).where(eq(subscribers.id, id));
}

/**
 * Crea (o devuelve) el perfil de cosplayer del propio admin.
 *
 * Sirve para que el dueño vea el panel de cosplayers con datos reales y pueda
 * probar cambios sin tener que postularse ni aprobarse a sí mismo. No pasa por
 * el flujo de solicitud ni genera orden de kit de bienvenida.
 */
export async function ensureOwnCosplayerProfile(userId: number, nombre: string, correo: string) {
  const db = await getDb();
  if (!db) return undefined;

  const [existente] = await db.select().from(cosplayers).where(eq(cosplayers.userId, userId)).limit(1);
  if (existente) return existente;

  const artisticName = (nombre || 'Admin').trim();
  const username = artisticName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'admin';

  const nameSlug = artisticName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'ADMIN';
  const referralCode = `ISK-${nameSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

  // El esquema exige una solicitud asociada, así que se crea una interna ya
  // aprobada. No aparece como pendiente en el panel del Guild.
  const [appRes] = await db.insert(cosplayApplications).values({
    userId,
    artisticName,
    fullName: artisticName,
    lastName: '(admin)',
    age: 18,
    city: 'Maracaibo',
    country: 'Venezuela',
    address: '-',
    phone: '-',
    email: correo,
    experience: 0,
    whyIsekai: 'Perfil interno del administrador para previsualizar el panel de cosplayers.',
    status: 'approved',
  });

  await db.insert(cosplayers).values({
    userId,
    applicationId: appRes.insertId,
    artisticName,
    tier: 'bronce',
    totalFollowers: 0,
    ticketBalance: 0,
    cashBalance: '0.00',
    referralCode,
    username,
    // Nace oculto del directorio público: es un perfil interno de pruebas.
    // Se muestra con el interruptor del panel admin cuando haga falta.
    isActive: false,
  });

  const [creado] = await db.select().from(cosplayers).where(eq(cosplayers.userId, userId)).limit(1);
  return creado;
}

/**
 * Muestra u oculta el perfil de cosplayer del propio admin en el directorio
 * público. Se separa de isActive (que es para dar de baja a un cosplayer)
 * para no mezclar dos cosas distintas: aquí solo se cambia la visibilidad
 * del perfil interno del dueño.
 */
export async function setOwnCosplayerVisibility(userId: number, visible: boolean) {
  const db = await getDb();
  if (!db) return { visible };
  await db.update(cosplayers).set({ isActive: visible }).where(eq(cosplayers.userId, userId));
  return { visible };
}

/** Dice si el perfil del admin está visible en el directorio */
export async function getOwnCosplayerVisibility(userId: number) {
  const db = await getDb();
  if (!db) return { exists: false, visible: false };
  const [row] = await db.select().from(cosplayers).where(eq(cosplayers.userId, userId)).limit(1);
  if (!row) return { exists: false, visible: false };
  return { exists: true, visible: Boolean(row.isActive) };
}

/**
 * Comprueba si un usuario puede usar un código de referido.
 *
 * Regla: los cosplayers del Guild no pueden usar códigos de referido — ni el
 * propio ni el de un compañero. Sin esto, un grupo puede rotarse los códigos
 * entre ellos y generar comisiones sin traer un solo cliente nuevo.
 *
 * Devuelve el motivo del rechazo, o null si el código es válido para ese usuario.
 */
export async function checkReferralEligibility(userId: number | null | undefined, referralCode: string) {
  const db = await getDb();
  if (!db) return null;

  const codigo = referralCode.trim().toUpperCase();
  if (!codigo) return null;

  const duenio = await getCosplayerByReferralCode(codigo);
  if (!duenio) return 'CODIGO_INVALIDO';

  // Sin sesión no se puede saber quién compra: el bloqueo se apoya en el
  // correo, que se revisa aparte en el checkout.
  if (!userId) return null;

  const [comprador] = await db.select().from(cosplayers).where(eq(cosplayers.userId, userId)).limit(1);
  if (!comprador) return null; // No es cosplayer: puede usar cualquier código

  if (comprador.id === duenio.id) return 'CODIGO_PROPIO';
  return 'CODIGO_ENTRE_COSPLAYERS';
}

/** ¿El correo pertenece a un cosplayer del Guild? Se usa en compras de invitado. */
export async function isCosplayerEmail(email: string) {
  const db = await getDb();
  if (!db || !email) return false;
  const correo = email.trim().toLowerCase();

  const [usuario] = await db.select().from(users).where(eq(users.email, correo)).limit(1);
  if (!usuario) return false;

  const [perfil] = await db.select().from(cosplayers).where(eq(cosplayers.userId, usuario.id)).limit(1);
  return Boolean(perfil);
}

// ─── Cotizaciones ─────────────────────────────────────────────────────────────

/** Token del enlace: largo y aleatorio, es lo único que protege la cotización */
function nuevoTokenCotizacion() {
  return `${nanoid(24)}${nanoid(16)}`.replace(/[^a-zA-Z0-9]/g, "x").slice(0, 48);
}

export async function createQuote(data: {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  title: string;
  description?: string;
  items: Array<{ concepto: string; cantidad: number; precio: string }>;
  referenceImages?: string[];
  notes?: string;
  expiresInDays?: number;
  /** Porcentaje mínimo a abonar (compatibilidad) */
  depositPercent?: number;
  /** Monto fijo del abono en USD. Vacío = se cobra el total. */
  depositAmount?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // El importe se calcula aquí, nunca se acepta del formulario
  const subtotal = data.items.reduce(
    (acc, i) => acc + parseFloat(i.precio || "0") * (i.cantidad || 1), 0,
  );

  const token = nuevoTokenCotizacion();
  const quoteNumber = `COT-${Date.now().toString().slice(-8)}-${nanoid(4).toUpperCase()}`;
  const expiresAt = data.expiresInDays
    ? new Date(Date.now() + data.expiresInDays * 86400000)
    : null;

  await db.insert(quotes).values({
    token,
    quoteNumber,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    title: data.title,
    description: data.description,
    items: data.items,
    referenceImages: data.referenceImages ?? [],
    subtotal: subtotal.toFixed(2),
    total: subtotal.toFixed(2),
    notes: data.notes,
    depositPercent: data.depositPercent ?? 100,
    depositAmount: data.depositAmount || null,
    status: "sent",
    expiresAt,
  });

  const [row] = await db.select().from(quotes).where(eq(quotes.token, token)).limit(1);
  return row;
}

/** Consulta pública: solo por token, y sin exponer datos internos */
export async function getQuoteByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select().from(quotes).where(eq(quotes.token, token)).limit(1);
  return row;
}

export async function getAllQuotes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotes).orderBy(desc(quotes.id)).limit(200);
}

export async function updateQuote(id: number, data: Partial<{ status: string; orderId: number }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(quotes).set(data).where(eq(quotes.id, id));
}

export async function deleteQuote(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(quotes).where(eq(quotes.id, id));
}

/**
 * Vincula un pedido a una cuenta a partir del correo.
 *
 * Si ya existe cuenta con ese correo, se usa. Si no, se crea en silencio: la
 * autenticación es por Google o enlace mágico, así que no hay contraseña que
 * inventar. Escribir un correo NO da acceso a esa cuenta — para entrar sigue
 * haciendo falta el enlace mágico enviado a ese buzón.
 */
export async function vincularCuentaPorCorreo(email: string, nombre?: string) {
  const db = await getDb();
  if (!db) return undefined;

  const correo = email.trim().toLowerCase();
  const [existente] = await db.select().from(users).where(eq(users.email, correo)).limit(1);
  if (existente) return { user: existente, creada: false };

  // openId es obligatorio y único; para cuentas creadas desde una cotización
  // se usa un identificador propio con prefijo, que no colisiona con Google.
  await db.insert(users).values({
    openId: `quote_${nanoid(20)}`,
    email: correo,
    name: nombre ?? correo.split("@")[0],
    role: "user",
    loginMethod: "magic_link",
  });
  const [creado] = await db.select().from(users).where(eq(users.email, correo)).limit(1);
  return { user: creado, creada: true };
}

// ─── Finanzas ─────────────────────────────────────────────────────────────────

/**
 * Historial de transacciones: todo el dinero que ha entrado, de dónde vino y
 * en qué estado está. Antes solo existía el total de ingresos en el panel, sin
 * forma de ver el detalle ni de entender por qué una venta no sumaba.
 */
export async function getTransactions(opts?: { estado?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];

  const condiciones = [];
  if (opts?.estado && opts.estado !== 'all') {
    condiciones.push(eq(orders.paymentStatus, opts.estado as any));
  }

  const filas = await db.select().from(orders)
    .where(condiciones.length ? and(...condiciones) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(opts?.limit ?? 200);

  return filas.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    total: o.total,
    amountPaid: o.amountPaid,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    receiptUrl: o.receiptUrl,
    paymentReference: o.paymentReference,
    receiptHolder: o.receiptHolder,
    status: o.status,
    notes: o.notes,
    // Una cotización se reconoce por su nota: sirve para separarlas en el panel
    esCotizacion: Boolean(o.notes && o.notes.startsWith('Cotización ')),
    createdAt: o.createdAt,
  }));
}

/** Resumen de dinero: cobrado, por verificar y pendiente */
export async function getFinanceSummary() {
  const db = await getDb();
  if (!db) return { cobrado: 0, porVerificar: 0, pendiente: 0, parcial: 0, cantidadPorVerificar: 0 };

  const [resetRow] = await db.select().from(siteSettings).where(eq(siteSettings.key, 'revenue_reset_at')).limit(1);
  const resetAt = resetRow?.value ? new Date(resetRow.value) : null;
  const desdeCorte = resetAt && !isNaN(resetAt.getTime()) ? gte(orders.createdAt, resetAt) : undefined;

  const todas = await db.select().from(orders).where(desdeCorte);

  let cobrado = 0, porVerificar = 0, pendiente = 0, parcial = 0, cantidadPorVerificar = 0;

  for (const o of todas) {
    const total = parseFloat(o.total as any) || 0;
    const pagado = parseFloat((o.amountPaid as any) ?? '0') || 0;
    if (o.status === 'cancelled') continue;

    switch (o.paymentStatus) {
      // Dinero real: si hubo abonos, se cuenta lo recibido
      case 'approved': cobrado += pagado > 0 ? pagado : total; break;
      // Parcial: lo abonado ya es dinero tuyo; el resto se suma a lo pendiente
      case 'partial':
        parcial += pagado;
        cobrado += pagado;
        pendiente += Math.max(0, total - pagado);
        break;
      // Por verificar: se cuenta lo que el cliente dice haber pagado, no el
      // total del pedido. Si abonó $8 de $15, lo que se verifica son $8.
      case 'verifying':
        porVerificar += pagado > 0 ? pagado : total;
        if (pagado > 0 && pagado < total) pendiente += total - pagado;
        cantidadPorVerificar++;
        break;
      default: pendiente += total;
    }
  }

  return {
    cobrado: Math.round(cobrado * 100) / 100,
    porVerificar: Math.round(porVerificar * 100) / 100,
    pendiente: Math.round(pendiente * 100) / 100,
    parcial: Math.round(parcial * 100) / 100,
    cantidadPorVerificar,
  };
}

/**
 * Elimina un pedido y sus líneas. Se usa para limpiar duplicados o pruebas.
 *
 * Si el pedido no estaba cancelado, primero devuelve el stock reservado: de lo
 * contrario esas unidades quedarían descontadas para siempre sin venta detrás.
 */
export async function deleteOrder(id: number) {
  const db = await getDb();
  if (!db) return { ok: false };

  const pedido = await getOrderById(id);
  if (!pedido) return { ok: false };

  if ((pedido as any).status !== 'cancelled') {
    const lineas = (((pedido as any).items) ?? [])
      .filter((i: any) => i.productId)
      .map((i: any) => ({ productId: i.productId, variantId: i.variantId ?? null, quantity: i.quantity }));
    if (lineas.length) {
      try {
        const { devolverStock } = await import('./orderValidation');
        await devolverStock(lineas);
      } catch (e) { console.error('[Pedido] No se pudo devolver el stock al eliminar:', e); }
    }
  }

  await db.delete(orderItems).where(eq(orderItems.orderId, id));
  await db.delete(orders).where(eq(orders.id, id));
  return { ok: true };
}

/**
 * Edita una cotización que aún no se ha pagado.
 *
 * Se conserva el token: el enlace que ya compartiste sigue siendo válido, así
 * no tienes que volver a mandarlo tras corregir un precio o un concepto.
 * El importe se recalcula aquí, nunca se acepta del formulario.
 */
export async function editQuote(id: number, data: {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  title?: string;
  description?: string;
  items?: Array<{ concepto: string; cantidad: number; precio: string }>;
  notes?: string;
  depositAmount?: string | null;
  expiresInDays?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [actual] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!actual) throw new Error("La cotización no existe");
  if (actual.status === "paid") throw new Error("No se puede editar una cotización ya pagada");

  const cambios: any = {};
  if (data.customerName !== undefined) cambios.customerName = data.customerName;
  if (data.customerEmail !== undefined) cambios.customerEmail = data.customerEmail;
  if (data.customerPhone !== undefined) cambios.customerPhone = data.customerPhone;
  if (data.title !== undefined) cambios.title = data.title;
  if (data.description !== undefined) cambios.description = data.description;
  if (data.notes !== undefined) cambios.notes = data.notes;
  if (data.depositAmount !== undefined) cambios.depositAmount = data.depositAmount || null;

  if (data.items) {
    const subtotal = data.items.reduce(
      (acc, i) => acc + parseFloat(i.precio || "0") * (i.cantidad || 1), 0,
    );
    cambios.items = data.items;
    cambios.subtotal = subtotal.toFixed(2);
    cambios.total = subtotal.toFixed(2);
  }

  if (data.expiresInDays !== undefined) {
    cambios.expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86400000)
      : null;
  }

  await db.update(quotes).set(cambios).where(eq(quotes.id, id));
  const [nueva] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  return nueva;
}

/**
 * Registra un abono sobre un pedido.
 *
 * Suma al importe ya pagado y ajusta el estado solo: si con este abono se
 * completa el total, el pedido pasa a cobrado; si no, queda como parcial.
 * Antes solo se podía cambiar el estado a mano, sin llevar la cuenta del
 * dinero recibido.
 */
export async function registrarAbono(orderId: number, monto: number, nota?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [pedido] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!pedido) throw new Error("El pedido no existe");

  const total = parseFloat(pedido.total as any) || 0;
  const yaPagado = parseFloat((pedido.amountPaid as any) ?? "0") || 0;
  const nuevoPagado = Math.round((yaPagado + monto) * 100) / 100;

  if (monto <= 0) throw new Error("El abono debe ser mayor que cero");
  if (nuevoPagado > total + 0.01) {
    throw new Error(`Ese abono supera el saldo pendiente ($${(total - yaPagado).toFixed(2)})`);
  }

  const completo = nuevoPagado >= total - 0.01;

  await db.update(orders).set({
    amountPaid: nuevoPagado.toFixed(2),
    paymentStatus: completo ? "approved" : "partial",
    notes: nota
      ? `${pedido.notes ? pedido.notes + " · " : ""}Abono $${monto.toFixed(2)}: ${nota}`
      : pedido.notes,
  }).where(eq(orders.id, orderId));

  return {
    pagado: nuevoPagado,
    total,
    saldo: Math.max(0, Math.round((total - nuevoPagado) * 100) / 100),
    completo,
    /** Si ya estaba cobrado, la comisión ya se pagó y no debe repetirse */
    yaEstabaAprobado: pedido.paymentStatus === "approved",
  };
}

// ─── Abonos ───────────────────────────────────────────────────────────────────

/** Registra un abono con su comprobante. Queda pendiente hasta que lo apruebes. */
export async function crearAbono(data: {
  orderId: number;
  amount: number;
  method?: string;
  reference?: string;
  holder?: string;
  receiptUrl?: string;
  source?: string;
  /** Si es del admin, se da por aprobado y suma de inmediato */
  autoAprobar?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [pedido] = await db.select().from(orders).where(eq(orders.id, data.orderId)).limit(1);
  if (!pedido) throw new Error("El pedido no existe");

  const total = parseFloat(pedido.total as any) || 0;
  const yaPagado = parseFloat((pedido.amountPaid as any) ?? "0") || 0;
  const saldo = Math.round((total - yaPagado) * 100) / 100;

  if (data.amount <= 0) throw new Error("El abono debe ser mayor que cero");
  if (saldo <= 0.01) throw new Error("Este pedido ya está pagado por completo");
  if (data.amount > saldo + 0.01) {
    throw new Error(`Ese monto supera el saldo pendiente ($${saldo.toFixed(2)})`);
  }

  await db.insert(orderPayments).values({
    orderId: data.orderId,
    amount: data.amount.toFixed(2),
    method: data.method,
    reference: data.reference,
    holder: data.holder,
    receiptUrl: data.receiptUrl,
    source: data.source ?? "cliente",
    status: data.autoAprobar ? "approved" : "pending",
  });

  // Un abono del cliente NO suma hasta que se verifica: igual que el primer
  // pago, primero se comprueba que el dinero llegó.
  if (data.autoAprobar) {
    return aplicarAbono(data.orderId, data.amount);
  }

  return { pendiente: true, saldo, total };
}

/** Suma el abono al pedido y ajusta su estado */
export async function aplicarAbono(orderId: number, monto: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [pedido] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!pedido) throw new Error("El pedido no existe");

  const total = parseFloat(pedido.total as any) || 0;
  const yaPagado = parseFloat((pedido.amountPaid as any) ?? "0") || 0;
  const nuevoPagado = Math.round((yaPagado + monto) * 100) / 100;
  const completo = nuevoPagado >= total - 0.01;
  const yaEstabaAprobado = pedido.paymentStatus === "approved";

  await db.update(orders).set({
    amountPaid: nuevoPagado.toFixed(2),
    paymentStatus: completo ? "approved" : "partial",
  }).where(eq(orders.id, orderId));

  // La cotización asociada sigue el mismo destino que su pedido
  if (completo) {
    await db.update(quotes).set({ status: "paid" }).where(eq(quotes.orderId, orderId));
  }

  return {
    orderId,
    pagado: nuevoPagado,
    total,
    saldo: Math.max(0, Math.round((total - nuevoPagado) * 100) / 100),
    completo,
    yaEstabaAprobado,
    pendiente: false,
  };
}

/** Aprueba un abono pendiente y lo suma al pedido */
export async function aprobarAbono(abonoId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [abono] = await db.select().from(orderPayments).where(eq(orderPayments.id, abonoId)).limit(1);
  if (!abono) throw new Error("El abono no existe");
  if (abono.status === "approved") throw new Error("Ese abono ya fue aprobado");

  await db.update(orderPayments).set({ status: "approved" }).where(eq(orderPayments.id, abonoId));
  return aplicarAbono(abono.orderId, parseFloat(abono.amount as any));
}

export async function rechazarAbono(abonoId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(orderPayments).set({ status: "rejected" }).where(eq(orderPayments.id, abonoId));
}

/** Abonos de un pedido, para ver el historial completo */
export async function getAbonos(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderPayments)
    .where(eq(orderPayments.orderId, orderId))
    .orderBy(desc(orderPayments.id));
}

/** Abonos esperando verificación, para el panel */
export async function getAbonosPendientes() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: orderPayments.id,
    orderId: orderPayments.orderId,
    amount: orderPayments.amount,
    method: orderPayments.method,
    reference: orderPayments.reference,
    holder: orderPayments.holder,
    receiptUrl: orderPayments.receiptUrl,
    source: orderPayments.source,
    createdAt: orderPayments.createdAt,
    orderNumber: orders.orderNumber,
    customerName: orders.customerName,
    total: orders.total,
    amountPaid: orders.amountPaid,
  })
    .from(orderPayments)
    .leftJoin(orders, eq(orderPayments.orderId, orders.id))
    .where(eq(orderPayments.status, "pending"))
    .orderBy(desc(orderPayments.id));
}

// ─── Buzón de mejoras del Guild ───────────────────────────────────────────────

export async function crearFeedback(data: {
  userId?: number;
  cosplayerId?: number;
  anonimo: boolean;
  categoria: string;
  valoracion?: number;
  mensaje: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  // Si el autor pidió anonimato, NO se guarda ninguna referencia a él: no
  // basta con ocultarlo en pantalla, no debe existir el dato.
  await db.insert(guildFeedback).values({
    userId: data.anonimo ? null : data.userId,
    cosplayerId: data.anonimo ? null : data.cosplayerId,
    anonimo: data.anonimo,
    categoria: data.categoria,
    valoracion: data.valoracion,
    mensaje: data.mensaje.trim(),
  });
}

export async function listarFeedback(estado?: string) {
  const db = await getDb();
  if (!db) return [];

  const filas = await db.select().from(guildFeedback)
    .where(estado && estado !== "all" ? eq(guildFeedback.estado, estado) : undefined)
    .orderBy(desc(guildFeedback.id))
    .limit(300);

  const cosplayersTodos = await db.select().from(cosplayers);

  return filas.map(f => {
    const autor = f.cosplayerId ? cosplayersTodos.find(c => c.id === f.cosplayerId) : undefined;
    return {
      ...f,
      autorNombre: f.anonimo ? null : (autor?.artisticName ?? null),
      autorFoto: f.anonimo ? null : (autor?.avatarUrl ?? null),
    };
  });
}

export async function actualizarFeedback(id: number, data: { estado?: string; notaInterna?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(guildFeedback).set(data as any).where(eq(guildFeedback.id, id));
}

export async function borrarFeedback(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(guildFeedback).where(eq(guildFeedback.id, id));
}

/** Resumen para el panel: cuántos hay sin leer y la valoración media */
export async function resumenFeedback() {
  const db = await getDb();
  if (!db) return { total: 0, nuevos: 0, media: 0, anonimos: 0 };

  const filas = await db.select().from(guildFeedback);
  const conNota = filas.filter(f => f.valoracion != null);

  return {
    total: filas.length,
    nuevos: filas.filter(f => f.estado === "nuevo").length,
    media: conNota.length
      ? Math.round((conNota.reduce((a, f) => a + (f.valoracion ?? 0), 0) / conNota.length) * 10) / 10
      : 0,
    anonimos: filas.filter(f => f.anonimo).length,
  };
}

/**
 * Revisa las comisiones de referido y paga las que falten.
 *
 * Un pedido genera comisión cuando está aprobado y tiene cosplayer asignado.
 * Si por cualquier motivo el pago no llegó a acreditarse —un fallo al
 * aprobar, una aprobación por otra vía, un error puntual— el dinero queda
 * debiéndose sin que nadie lo note. Esto compara los pedidos con el libro de
 * movimientos y salda la diferencia.
 */
export async function revisarComisiones(soloMirar = true) {
  const db = await getDb();
  if (!db) return { pendientes: [], pagadas: 0, total: 0 };

  const aprobados = (await db.select().from(orders))
    .filter(o => o.paymentStatus === "approved" && (o as any).referralCosplayerId);

  const libro = await db.select().from(cosplayTicketLedger);
  // El número de pedido va dentro de la descripción, no en columna propia
  const yaPagados = new Set(
    libro
      .filter(l => l.type === "earned")
      .map(l => (l.description ?? "").match(/(?:ISK|IW)-[A-Z0-9-]+/i)?.[0]?.toUpperCase())
      .filter(Boolean) as string[],
  );

  const pendientes = aprobados.filter(o => !yaPagados.has(o.orderNumber.toUpperCase()));

  const detalle = pendientes.map(o => {
    const total = parseFloat(o.total as any) || 0;
    return {
      orderNumber: o.orderNumber,
      cliente: o.customerName,
      total,
      cosplayerId: (o as any).referralCosplayerId as number,
      comision: getReferralCash(total),
      tickets: getReferralTickets(total),
    };
  });

  if (soloMirar) {
    return {
      pendientes: detalle,
      pagadas: 0,
      total: Math.round(detalle.reduce((a, d) => a + d.comision, 0) * 100) / 100,
    };
  }

  let pagadas = 0;
  for (const d of detalle) {
    try {
      await creditCashToReferrer(d.cosplayerId, d.comision, d.orderNumber, d.tickets);
      pagadas++;
    } catch (e) {
      console.error(`[Comisiones] No se pudo pagar ${d.orderNumber}:`, e);
    }
  }

  return {
    pendientes: detalle,
    pagadas,
    total: Math.round(detalle.reduce((a, d) => a + d.comision, 0) * 100) / 100,
  };
}
