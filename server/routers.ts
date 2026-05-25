import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner, notifyCustomerOrderStatus } from "./_core/notification";
import { io } from "./_core/socket";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import {
  getAllCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory,
  getProducts, getProductBySlug, getProductById, createProduct, updateProduct, deleteProduct,
  addProductImage, deleteProductImage, upsertProductVariant, deleteProductVariant,
  getCartItems, upsertCartItem, removeCartItem, clearCart,
  createOrder, getOrders, getOrderById, getOrderByNumber, updateOrderStatus,
  getDashboardMetrics, getAllSettings, upsertSetting, getSetting,
  insertAdminNotification, getAdminNotifications, getAdminUnreadCount,
  markAllAdminNotificationsRead, markAdminNotificationRead,
  insertOrderNotification, getUserOrderNotifications,
  getOrderNotificationUnreadCount, markAllOrderNotificationsRead,
  getWishlist, toggleWishlist, isInWishlist,
  getPublicFaqItems, getAllFaqItems, createFaqItem, updateFaqItem, deleteFaqItem,
  submitOrderReceipt, verifyOrderPayment, getOrdersByPaymentStatus,
  createInstallmentPlan, getMyInstallmentPlans, submitInstallmentPayment,
  verifyInstallmentPayment, getAllInstallmentPlans, updateProductPaymentSettings,
  getPublicLinkBioItems, getAllLinkBioItems, createLinkBioItem, updateLinkBioItem,
  deleteLinkBioItem, reorderLinkBioItems, getPendingOrdersCount,
} from "./db";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      console.log("[auth.me] user:", ctx.user?.email ?? "null");
      return ctx.user ?? null;
    }),
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
      .input(z.object({ name: z.string(), slug: z.string(), description: z.string().optional(), imageUrl: z.string().optional(), featured: z.boolean().optional() }))
      .mutation(({ input }) => createCategory(input)),

    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), slug: z.string().optional(), description: z.string().optional(), imageUrl: z.string().optional(), featured: z.boolean().optional() }))
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
      .mutation(async ({ input }) => {
        try {
          return await createProduct(input);
        } catch (err) {
          console.error('[products.create] Error:', err);
          throw err;
        }
      }),

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
        image: z.string().optional(),
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

    updatePaymentSettings: adminProcedure
      .input(z.object({
        id: z.number(),
        installmentsEnabled: z.boolean(),
        initialPayment: z.string().optional(),
      }))
      .mutation(({ input }) => updateProductPaymentSettings(input.id, { installmentsEnabled: input.installmentsEnabled, initialPayment: input.initialPayment && input.initialPayment !== '' ? input.initialPayment : null })),
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
        paymentMethod: z.string().optional(),
        country: z.string().optional(),
        items: z.array(z.object({
          productId: z.number(),
          variantId: z.number().nullable().optional(),
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

        // Bold integration removed — WhatsApp payment flow is active.
        // To re-enable Bold, restore the boldApiKey block here and update Checkout.tsx.
        return { ...order, paymentUrl: null as string | null };
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
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending","preparing","printing","post_printing","packed","shipped","delivered","cancelled"]),
        trackingNumber: z.string().optional(),
        trackingCarrier: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateOrderStatus(input.id, input.status, input.trackingNumber, input.trackingCarrier);

        const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
          pending:       { title: "Orden recibida",    body: "Hemos recibido tu pedido" },
          preparing:     { title: "En preparación",    body: "Tu pedido está siendo preparado" },
          printing:      { title: "En impresión 3D",   body: "Tu pedido está en proceso de impresión" },
          post_printing: { title: "Post impresión",    body: "Tu pedido completó la impresión" },
          packed:        { title: "Empacado",          body: "Tu pedido está listo para envío" },
          shipped:       { title: "¡Enviado!",         body: `Tu pedido está en camino. Guía: ${input.trackingNumber ?? "—"} — ${input.trackingCarrier ?? "—"}` },
          delivered:     { title: "¡Entregado!",       body: "Tu pedido fue entregado exitosamente" },
        };

        const msg = STATUS_MESSAGES[input.status];
        if (!msg) return;

        const order = await getOrderById(input.id);
        if (!order) return;

        if (order.userId) {
          try {
            await insertOrderNotification({
              userId: order.userId,
              orderId: order.id,
              orderNumber: order.orderNumber,
              type: input.status,
              title: msg.title,
              body: msg.body,
            });
          } catch (e) { console.error("Failed to insert order notification:", e); }
        }

        try {
          await notifyCustomerOrderStatus(order.customerEmail, order.customerName, order.orderNumber, msg.title, msg.body);
        } catch (e) { console.error("Failed to send customer email:", e); }

        if (order.userId && io) {
          io.to(`user:${order.userId}`).emit("order:updated", {
            orderId: order.id,
            status: input.status,
          });
          io.to(`user:${order.userId}`).emit("notification:new");
        }
      }),

    submitReceipt: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        receiptUrl: z.string().url(),
        paymentReference: z.string().min(1),
        receiptHolder: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });
        if (order.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await submitOrderReceipt(input.orderId, input);
        try {
          await insertAdminNotification({ type: "new_order", title: "💳 Comprobante recibido", body: `Pedido ${order.orderNumber} · ${ctx.user.name ?? ctx.user.email}` });
        } catch { /* non-critical */ }
        try {
          await notifyOwner({ title: `💳 Comprobante: ${order.orderNumber}`, content: `${ctx.user.name ?? ctx.user.email} subió su comprobante de pago. Ref: ${input.paymentReference}` });
        } catch { /* non-critical */ }
        return { success: true };
      }),

    verifyPayment: adminProcedure
      .input(z.object({ orderId: z.number(), approved: z.boolean() }))
      .mutation(async ({ input }) => {
        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });
        await verifyOrderPayment(input.orderId, input.approved);
        const title = input.approved ? "Pago aprobado" : "Pago rechazado";
        const body = input.approved
          ? "Tu pago fue verificado. ¡Estamos preparando tu pedido!"
          : "Tu pago fue rechazado. Contáctanos para más información.";
        if (order.userId) {
          try {
            await insertOrderNotification({ userId: order.userId, orderId: order.id, orderNumber: order.orderNumber, type: "payment", title, body });
          } catch { /* non-critical */ }
          if (io) {
            io.to(`user:${order.userId}`).emit("order:updated", { orderId: order.id, status: input.approved ? "preparing" : order.status });
            io.to(`user:${order.userId}`).emit("notification:new");
          }
        }
        try {
          await notifyCustomerOrderStatus(order.customerEmail, order.customerName, order.orderNumber, title, body);
        } catch { /* non-critical */ }
        return { success: true };
      }),

    pendingCount: adminProcedure.query(() => getPendingOrdersCount()),

    adminPayments: adminProcedure
      .input(z.object({ paymentStatus: z.string().optional() }).optional())
      .query(({ input }) => getOrdersByPaymentStatus(input?.paymentStatus)),

    uploadReceipt: protectedProcedure
      .input(z.object({ fileName: z.string(), fileType: z.string(), fileBase64: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const key = `receipts/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { url } = await storagePut(key, buffer, input.fileType);
        return { url };
      }),
  }),

  // ─── Installments ────────────────────────────────────────────────────────────
  installments: router({
    createPlan: protectedProcedure
      .input(z.object({
        productId: z.number(),
        productName: z.string(),
        totalAmount: z.string().refine(v => parseFloat(v) >= 150, { message: "CredIsekai solo aplica para montos ≥ $150 USD" }),
        amountPaid: z.string(),
        installments: z.union([z.literal(2), z.literal(3)]),
      }))
      .mutation(({ ctx, input }) => createInstallmentPlan({ ...input, userId: ctx.user.id })),

    submitPayment: protectedProcedure
      .input(z.object({
        planId: z.number(),
        amount: z.string(),
        paymentReference: z.string().min(1),
        receiptUrl: z.string().url(),
        receiptHolder: z.string().min(1),
        paymentMethod: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const plans = await getMyInstallmentPlans(ctx.user.id);
        const plan = plans.find(p => p.id === input.planId);
        if (!plan) throw new TRPCError({ code: "NOT_FOUND" });
        await submitInstallmentPayment(input);
        try {
          await insertAdminNotification({ type: "new_order", title: "💳 Cuota recibida", body: `${ctx.user.name ?? ctx.user.email} · ${plan.productName}` });
        } catch { /* non-critical */ }
        return { success: true };
      }),

    getMyPlans: protectedProcedure
      .query(({ ctx }) => getMyInstallmentPlans(ctx.user.id)),

    verifyPayment: adminProcedure
      .input(z.object({ paymentId: z.number(), approved: z.boolean() }))
      .mutation(({ input }) => verifyInstallmentPayment(input.paymentId, input.approved)),

    adminList: adminProcedure
      .query(() => getAllInstallmentPlans()),
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

  // ─── Wishlist ────────────────────────────────────────────────────────────────
  wishlist: router({
    getAll: protectedProcedure.query(({ ctx }) => getWishlist(ctx.user.id)),

    isSaved: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(({ ctx, input }) => isInWishlist(ctx.user.id, input.productId)),

    toggle: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(({ ctx, input }) => toggleWishlist(ctx.user.id, input.productId)),
  }),

  // ─── FAQ ─────────────────────────────────────────────────────────────────────
  faq: router({
    list: publicProcedure.query(async () => {
      try { return await getPublicFaqItems(); } catch { return []; }
    }),

    adminList: adminProcedure.query(async () => {
      try { return await getAllFaqItems(); } catch { return []; }
    }),

    create: adminProcedure
      .input(z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
        category: z.string().optional(),
        position: z.number().optional(),
      }))
      .mutation(({ input }) => createFaqItem(input)),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        question: z.string().optional(),
        answer: z.string().optional(),
        category: z.string().optional(),
        position: z.number().optional(),
        active: z.boolean().optional(),
      }))
      .mutation(({ input }) => { const { id, ...data } = input; return updateFaqItem(id, data); }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteFaqItem(input.id)),
  }),

  // ─── Admin Dashboard ────────────────────────────────────────────────────────────────────────────────
  admin: router({
    metrics: adminProcedure.query(() => getDashboardMetrics()),
  }),

  // ─── User Notifications (customer) ──────────────────────────────────────────
  userNotifications: router({
    list: protectedProcedure.query(({ ctx }) => getUserOrderNotifications(ctx.user.id)),

    unreadCount: protectedProcedure.query(({ ctx }) => getOrderNotificationUnreadCount(ctx.user.id)),

    markAllRead: protectedProcedure.mutation(({ ctx }) => markAllOrderNotificationsRead(ctx.user.id)),
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

  // ─── LinkBio ──────────────────────────────────────────────────────────────────
  linkBio: router({
    list: publicProcedure.query(async () => {
      try { return await getPublicLinkBioItems(); } catch { return []; }
    }),

    adminList: adminProcedure.query(async () => {
      try { return await getAllLinkBioItems(); } catch { return []; }
    }),

    create: adminProcedure
      .input(z.object({ label: z.string().min(1), url: z.string().min(1), position: z.number().optional() }))
      .mutation(({ input }) => createLinkBioItem({ label: input.label, url: input.url, position: input.position ?? 0 })),

    update: adminProcedure
      .input(z.object({ id: z.number(), label: z.string().optional(), url: z.string().optional(), position: z.number().optional(), active: z.boolean().optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return updateLinkBioItem(id, data); }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteLinkBioItem(input.id)),

    reorder: adminProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(({ input }) => reorderLinkBioItems(input.ids)),

    trackVisit: publicProcedure.mutation(async () => {
      const current = await getSetting('linkbio_visit_count');
      const count = parseInt(current ?? '0') + 1;
      await upsertSetting('linkbio_visit_count', String(count));
      return { count };
    }),

    getVisitCount: adminProcedure.query(async () => {
      const count = await getSetting('linkbio_visit_count');
      return { count: parseInt(count ?? '0') };
    }),
  }),
});

export type AppRouter = typeof appRouter;
