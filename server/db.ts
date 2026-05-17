import { and, desc, eq, ilike, inArray, like, or, sql } from "drizzle-orm";
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
  await db.insert(products).values({ ...data, stock: data.stock ?? 0 });
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
  country?: string;
  items: Array<{
    productId: number;
    variantId?: number;
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
    status: "pending",
    paymentStatus: "pending",
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

export async function getOrders(opts: { userId?: number; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts.userId) conditions.push(eq(orders.userId, opts.userId));
  if (opts.status) conditions.push(eq(orders.status, opts.status as Order["status"]));
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
  if (!db) return { totalRevenue: 0, totalOrders: 0, recentOrders: [], topProducts: [] };

  const [revenueResult] = await db
    .select({ total: sql<string>`SUM(total)` })
    .from(orders)
    .where(inArray(orders.status, ["preparing", "printing", "post_printing", "packed", "shipped", "delivered"]));

  const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);

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
    totalRevenue: parseFloat(revenueResult?.total ?? "0"),
    totalOrders: Number(orderCount?.count ?? 0),
    recentOrders,
    topProducts,
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
  if (approved) {
    await db.update(orders).set({ paymentStatus: "approved", status: "preparing" }).where(eq(orders.id, orderId));
  } else {
    await db.update(orders).set({ paymentStatus: "rejected" }).where(eq(orders.id, orderId));
  }
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
    initialPayment: data.initialPayment ?? null,
  }).where(eq(products.id, id));
}
