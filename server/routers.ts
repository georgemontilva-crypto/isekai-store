import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import {
  getAllCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory,
  getProducts, getProductBySlug, getProductById, createProduct, updateProduct, deleteProduct,
  addProductImage, deleteProductImage, upsertProductVariant, deleteProductVariant,
  getCartItems, upsertCartItem, removeCartItem, clearCart,
  createOrder, getOrders, getOrderById, getOrderByNumber, updateOrderStatus,
  getDashboardMetrics, getAllSettings, upsertSetting,
  insertAdminNotification, getAdminNotifications, getAdminUnreadCount,
  markAllAdminNotificationsRead, markAdminNotificationRead,
} from "./db";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Categories ─────────────────────────────────────────────────────────────
  categories: router({
    list: publicProcedure.query(() => getAllCategories()),

    bySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => getCategoryBySlug(input.slug)),

    create: adminProcedure
      .input(z.object({ name: z.string(), slug: z.string(), description: z.string().optional(), imageUrl: z.string().optional() }))
      .mutation(({ input }) => createCategory(input)),

    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), slug: z.string().optional(), description: z.string().optional(), imageUrl: z.string().optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return updateCategory(id, data); }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteCategory(input.id)),
  }),

  // ─── Products ────────────────────────────────────────────────────────────────
  products: router({
    list: publicProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        status: z.enum(["draft", "published"]).optional(),
        featured: z.boolean().optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(({ input }) => getProducts({ ...input, status: input?.status ?? "published" })),

    adminList: adminProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        status: z.enum(["draft", "published"]).optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(({ input }) => getProducts({ ...input })),

    bySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => getProductBySlug(input.slug)),

    byId: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getProductById(input.id)),

    create: adminProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        price: z.string(),
        compareAtPrice: z.string().optional(),
        categoryId: z.number().optional(),
        stock: z.number().optional(),
        status: z.enum(["draft", "published"]).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(({ input }) => createProduct(input)),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        compareAtPrice: z.string().optional(),
        categoryId: z.number().optional(),
        stock: z.number().optional(),
        status: z.enum(["draft", "published"]).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(({ input }) => { const { id, ...data } = input; return updateProduct(id, data); }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteProduct(input.id)),

    addImage: adminProcedure
      .input(z.object({ productId: z.number(), url: z.string(), fileKey: z.string().optional(), altText: z.string().optional(), position: z.number().optional() }))
      .mutation(({ input }) => addProductImage(input.productId, input.url, input.fileKey, input.altText, input.position)),

    deleteImage: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteProductImage(input.id)),

    upsertVariant: adminProcedure
      .input(z.object({
        id: z.number().optional(),
        productId: z.number(),
        name: z.string(),
        options: z.record(z.string(), z.string()).optional(),
        price: z.string().optional(),
        stock: z.number().optional(),
        sku: z.string().optional(),
      }))
      .mutation(({ input }) => upsertProductVariant(input)),

    deleteVariant: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteProductVariant(input.id)),

    uploadImage: adminProcedure
      .input(z.object({ fileName: z.string(), contentType: z.string(), base64Data: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64Data, "base64");
        const key = `products/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url, key };
      }),
  }),

  // ─── Cart ────────────────────────────────────────────────────────────────────
  cart: router({
    get: publicProcedure
      .input(z.object({ sessionId: z.string().optional() }).optional())
      .query(({ ctx, input }) => getCartItems(ctx.user?.id, input?.sessionId)),

    upsert: publicProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        productId: z.number(),
        variantId: z.number().optional(),
        quantity: z.number().min(0),
      }))
      .mutation(({ ctx, input }) =>
        upsertCartItem({ userId: ctx.user?.id, sessionId: input.sessionId, productId: input.productId, variantId: input.variantId, quantity: input.quantity })
      ),

    remove: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => removeCartItem(input.id)),

    clear: publicProcedure
      .input(z.object({ sessionId: z.string().optional() }).optional())
      .mutation(({ ctx, input }) => clearCart(ctx.user?.id, input?.sessionId)),
  }),

  // ─── Orders ──────────────────────────────────────────────────────────────────
  orders: router({
    create: publicProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        customerName: z.string(),
        customerEmail: z.string().email(),
        customerPhone: z.string().optional(),
        shippingAddress: z.object({ street: z.string(), city: z.string(), state: z.string(), country: z.string(), zip: z.string() }).optional(),
        subtotal: z.string(),
        total: z.string(),
        notes: z.string().optional(),
        items: z.array(z.object({
          productId: z.number(),
          variantId: z.number().optional(),
          productName: z.string(),
          variantName: z.string().optional(),
          price: z.string(),
          quantity: z.number(),
          imageUrl: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const order = await createOrder({ ...input, userId: ctx.user?.id });
        // Clear cart after order
        await clearCart(ctx.user?.id, input.sessionId);
        // Notify owner
        try {
          await notifyOwner({
            title: `🛒 Nuevo pedido: ${order.orderNumber}`,
            content: `Cliente: ${input.customerName} (${input.customerEmail})\nTotal: $${input.total}\nProductos: ${input.items.length} artículo(s)`,
          });
        } catch (e) { console.error("Failed to notify owner:", e); }
        // Admin notification
        try {
          await insertAdminNotification({ type: "new_order", title: "🛒 Nuevo pedido", body: `${input.customerName} · $${input.total}` });
        } catch (e) { console.error("Failed to insert order notification:", e); }
        return order;
      }),

    myOrders: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(({ ctx, input }) => getOrders({ userId: ctx.user.id, ...input })),

    byNumber: publicProcedure
      .input(z.object({ orderNumber: z.string() }))
      .query(({ input }) => getOrderByNumber(input.orderNumber)),

    // Admin routes
    adminList: adminProcedure
      .input(z.object({ status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(({ input }) => getOrders({ ...input })),

    adminById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getOrderById(input.id)),

    updateStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]) }))
      .mutation(({ input }) => updateOrderStatus(input.id, input.status)),
  }),

  // ─── Site Settings ────────────────────────────────────────────────────────────────────────────────────────
  settings: router({
    // Public: safe settings only — NEVER exposes instagram_access_token
    getAll: publicProcedure.query(async () => {
      const all = await getAllSettings();
      const PRIVATE_KEYS = ["instagram_access_token"];
      return Object.fromEntries(Object.entries(all).filter(([k]) => !PRIVATE_KEYS.includes(k)));
    }),

    // Admin: full settings including sensitive keys
    getAdmin: adminProcedure.query(() => getAllSettings()),

    // Admin: update a setting key/value pair (validates non-empty value)
    upsert: adminProcedure
      .input(z.object({ key: z.string().min(1), value: z.string().min(1) }))
      .mutation(({ input }) => upsertSetting(input.key, input.value)),

    // Proxy Instagram Basic Display API to avoid CORS (token stays server-side)
    instagramFeed: publicProcedure.query(async () => {
      const settings = await getAllSettings();
      const token = settings["instagram_access_token"];
      if (!token) return { posts: [], configured: false };
      try {
        const res = await fetch(
          `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption&limit=8&access_token=${token}`
        );
        if (!res.ok) return { posts: [], configured: true, error: "Token invalid or expired" };
        const data = await res.json() as { data?: Array<{ id: string; media_type: string; media_url: string; thumbnail_url?: string; permalink: string; caption?: string }> };
        const posts = (data.data ?? []).filter((p) => p.media_type === "IMAGE" || p.media_type === "CAROUSEL_ALBUM");
        return { posts, configured: true };
      } catch (e) {
        return { posts: [], configured: true, error: "Failed to fetch feed" };
      }
    }),
  }),

  // ─── Newsletter ─────────────────────────────────────────────────────────────
  newsletter: router({
    subscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        console.log("[Mailchimp] apiKey:", ENV.mailchimpApiKey ? "SET" : "EMPTY");
        console.log("[Mailchimp] listId:", ENV.mailchimpListId ? "SET" : "EMPTY");
        console.log("[Mailchimp] dc:", ENV.mailchimpDc ? "SET" : "EMPTY");
        if (!ENV.mailchimpApiKey || !ENV.mailchimpListId || !ENV.mailchimpDc) {
          throw new Error("Mailchimp no configurado");
        }
        const url = `https://${ENV.mailchimpDc}.api.mailchimp.com/3.0/lists/${ENV.mailchimpListId}/members`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`anystring:${ENV.mailchimpApiKey}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email_address: input.email, status: "subscribed" }),
        });
        if (!res.ok) {
          const err = await res.json() as { title?: string; detail?: string };
          if (err.title === "Member Exists") return { success: true };
          throw new Error(err.detail ?? "Error Mailchimp");
        }
        try {
          await insertAdminNotification({ type: "new_subscriber", title: "📧 Nuevo suscriptor", body: input.email });
        } catch (e) { console.error("Failed to insert subscriber notification:", e); }
        return { success: true };
      }),
  }),

  // ─── Admin Dashboard ────────────────────────────────────────────────────────────────────────────────
  admin: router({
    metrics: adminProcedure.query(() => getDashboardMetrics()),
  }),

  // ─── Admin Notifications ─────────────────────────────────────────────────────
  notifications: router({
    getAll: adminProcedure.query(() => getAdminNotifications()),

    unreadCount: adminProcedure.query(() => getAdminUnreadCount()),

    markAllRead: adminProcedure.mutation(() => markAllAdminNotificationsRead()),

    markRead: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => markAdminNotificationRead(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
