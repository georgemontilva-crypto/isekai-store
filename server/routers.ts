import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc, like } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner, notifyCustomerOrderStatus, notifyCosplayReferralEarned, notifyCosplayTicketsGranted, sendEmail } from "./_core/notification";
import { orders, orderItems, users } from "../drizzle/schema";
import { io } from "./_core/socket";
import { ENV } from "./_core/env";
import { storagePut, storageDelete } from "./storage";
import { PAYMENT_METHOD_LABELS } from "@shared/payment";
import {
  getAllCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory,
  getProducts, getProductBySlug, getProductById, createProduct, updateProduct, deleteProduct,
  addProductImage, getProductImage, getProductImages, deleteProductImage, upsertProductVariant, deleteProductVariant,
  getCartItems, upsertCartItem, removeCartItem, clearCart,
  createOrder, getOrders, getOrderById, getOrderByNumber, updateOrderStatus, setOrderArchived, archiveOldOrders,
  listMediaAssets, insertMediaAsset, getMediaAsset, updateMediaAlt, deleteMediaAsset, findSettingsUsingUrl, importExistingMedia,
  deleteGiftCards,
  getDashboardMetrics, getAllSettings, upsertSetting, getSetting, getCartItem,
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
  deleteLinkBioItem, reorderLinkBioItems, getPendingOrdersCount, getPendingPaymentsCount,
  getUsers, updateUserRole, deleteUser,
  getActivePopups, getAllPopups, createPopup, updatePopup, deletePopup,
  getApprovedCosplayers, getCosplayerById, getCosplayerByUserId, getCosplayerByUsername, getActiveActivities,
  createCosplayApplication, updateCosplayerProfile, submitCosplayActivity,
  getMyCosplayerSubmissions, getCosplayerTickets, redeemCosplayDiscountCode,
  getMyCosplayerDiscountCodes, getCosplayApplications, approveCosplayApplication,
  rejectCosplayApplication, getAllCosplayers, updateCosplayerTier, suspendCosplayer,
  createCosplayActivity, getAllCosplayActivities, toggleCosplayActivity,
  deleteCosplayActivity, updateCosplayActivity,
  evaluateCosplaySubmission, getAllCosplaySubmissions, addEvidenceToSubmission, getAdminUsers,
  getCosplayerByReferralCode, creditCashToReferrer, getCashWithdrawals,
  processWithdrawal, getUserById, requestCashWithdrawal, deductCosplayerCash,
  deleteCosplayer, grantTicketsManually, findUserByEmail, getDb,
  getBlogPosts, getBlogPostBySlug, createBlogPost, updateBlogPost, deleteBlogPost,
  incrementBlogViews, getBlogCategories, createBlogCategory, deleteBlogCategory,
  getBlogComments, getAllBlogComments, createBlogComment, updateBlogCommentStatus, deleteBlogComment,
  createGiftCard, getGiftCards, validateGiftCard, redeemGiftCard, deleteGiftCard,
} from "./db";
import { notifyWelcome } from "./_core/notification";

// ─── File upload validation ───────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = ['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','application/pdf','video/mp4','video/webm'];
const VIDEO_MIME_TYPES = ['video/mp4','video/webm'];
const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png':  [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/webp': [Buffer.from('RIFF')],
  'application/pdf': [Buffer.from('%PDF')],
};
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;       // 10 MB para imágenes
const MAX_VIDEO_UPLOAD_BYTES = 60 * 1024 * 1024; // 60 MB para video de fondo

function validateUpload(contentType: string, buffer: Buffer) {
  if (!ALLOWED_MIME_TYPES.includes(contentType))
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tipo de archivo no permitido' });
  const isVideo = VIDEO_MIME_TYPES.includes(contentType);
  const limit = isVideo ? MAX_VIDEO_UPLOAD_BYTES : MAX_UPLOAD_BYTES;
  if (buffer.length > limit)
    throw new TRPCError({ code: 'BAD_REQUEST', message: `El archivo no puede superar ${limit / 1024 / 1024} MB` });
  const magic = MAGIC_BYTES[contentType];
  if (magic) {
    const valid = magic.some(m => buffer.subarray(0, m.length).equals(m));
    if (!valid) throw new TRPCError({ code: 'BAD_REQUEST', message: 'El archivo no corresponde al tipo declarado' });
  }
}

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
      .input(z.object({ name: z.string().min(1).max(256), slug: z.string().min(1).max(256), description: z.string().max(2000).optional(), imageUrl: z.string().url().optional(), featured: z.boolean().optional() }))
      .mutation(({ input }) => createCategory(input)),

    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(256).optional(), slug: z.string().min(1).max(256).optional(), description: z.string().max(2000).optional(), imageUrl: z.string().url().optional(), featured: z.boolean().optional() }))
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
        name: z.string().min(1).max(256),
        slug: z.string().min(1).max(256),
        description: z.string().max(10000).optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/),
        compareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        categoryId: z.number().optional(),
        stock: z.number().min(0).max(999999).optional(),
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
        name: z.string().min(1).max(256).optional(),
        slug: z.string().min(1).max(256).optional(),
        description: z.string().max(10000).optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        compareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        categoryId: z.number().optional(),
        stock: z.number().min(0).max(999999).optional(),
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
      .input(z.object({ imageId: z.number() }))
      .mutation(async ({ input }) => {
        const image = await getProductImage(input.imageId);
        if (image?.url) {
          const R2_PREFIX = "https://pub-c4fd9395c33848c3be4160fe5f9532a4.r2.dev/";
          const key = image.url.startsWith(R2_PREFIX) ? image.url.slice(R2_PREFIX.length) : null;
          if (key) await storageDelete(key).catch(() => {});
        }
        await deleteProductImage(input.imageId);
      }),

    getImages: adminProcedure
      .input(z.object({ productId: z.number() }))
      .query(({ input }) => getProductImages(input.productId)),

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
      .input(z.object({ fileName: z.string().max(256), contentType: z.string().max(100), base64Data: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64Data, "base64");
        validateUpload(input.contentType, buffer);
        const key = `products/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
      .mutation(async ({ ctx, input }) => {
        const item = await getCartItem(input.id);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
        if (item.userId && item.userId !== ctx.user?.id) throw new TRPCError({ code: 'FORBIDDEN' });
        return removeCartItem(input.id);
      }),

    clear: publicProcedure
      .input(z.object({ sessionId: z.string().optional() }).optional())
      .mutation(({ ctx, input }) => clearCart(ctx.user?.id, input?.sessionId)),
  }),

  // ─── Orders ──────────────────────────────────────────────────────────────────
  orders: router({
    create: publicProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        customerName: z.string().min(2).max(200),
        customerEmail: z.string().email().max(254),
        customerPhone: z.string().max(30).optional(),
        shippingAddress: z.object({ street: z.string().max(300), city: z.string().max(100), state: z.string().max(100), country: z.string().max(100), zip: z.string().max(20) }).optional(),
        subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/),
        total: z.string().regex(/^\d+(\.\d{1,2})?$/),
        notes: z.string().max(1000).optional(),
        paymentMethod: z.string().max(50).optional(),
        // Comprobante enviado desde el checkout (Pago Móvil / Cripto)
        receiptUrl: z.string().url().max(2048).optional(),
        paymentReference: z.string().max(256).optional(),
        receiptHolder: z.string().max(256).optional(),
        country: z.string().max(100).optional(),
        referralCode: z.string().max(50).optional(),
        referralCosplayerId: z.number().optional(),
        hasSecretGift: z.boolean().optional(),
        giftCardCode: z.string().max(50).optional(),
        giftCardDiscount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        items: z.array(z.object({
          productId: z.number(),
          variantId: z.number().nullable().optional(),
          productName: z.string().max(256),
          variantName: z.string().max(256).optional(),
          price: z.string().regex(/^\d+(\.\d{1,2})?$/),
          quantity: z.number().min(1).max(999),
          imageUrl: z.string().url().max(2048).optional(),
        })).min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const order = await createOrder({ ...input, userId: ctx.user?.id });
        // Redeem gift card if provided
        if (input.giftCardCode) {
          try { await redeemGiftCard(input.giftCardCode, ctx.user?.id ?? null, order.id); } catch { /* non-critical */ }
        }
        // Clear cart after order
        await clearCart(ctx.user?.id, input.sessionId);
        // Notify owner
        try {
          await notifyOwner({
            title: `Nueva orden — ${order.orderNumber}`,
            body: `
    <h1>Nueva orden recibida</h1>
    <p>Se ha recibido una nueva orden en Isekai World.</p>
    <div class="order-box">
      <p><strong>N° de orden:</strong> ${order.orderNumber}</p>
      <p><strong>Cliente:</strong> ${input.customerName}</p>
      <p><strong>Email:</strong> ${input.customerEmail}</p>
      <p><strong>Teléfono:</strong> ${input.customerPhone}</p>
      <p><strong>Total:</strong> $${input.total} USD</p>
      <p><strong>Método de pago:</strong> ${PAYMENT_METHOD_LABELS[input.paymentMethod ?? ''] ?? input.paymentMethod ?? '—'}</p>
      ${input.paymentReference ? `<p><strong>Referencia:</strong> ${input.paymentReference}</p>` : ''}
      ${input.receiptHolder ? `<p><strong>Titular:</strong> ${input.receiptHolder}</p>` : ''}
      ${input.receiptUrl ? `<p><strong>Comprobante:</strong> <a href="${input.receiptUrl}">Ver comprobante</a></p>` : ''}
      ${input.referralCode ? `<p><strong>Código referido:</strong> ${input.referralCode}</p>` : ''}
    </div>
    <div style="text-align:center">
      <a href="https://isekaiworld.co/admin" class="btn">Ver en el panel →</a>
    </div>
  `,
          });
        } catch (e) { console.error("Failed to notify owner:", e); }
        // Admin notification
        try {
          await insertAdminNotification({ type: "new_order", title: "Nuevo pedido", body: `${input.customerName} · $${input.total} USD${input.receiptUrl ? ' · con comprobante' : ''}` });
        } catch (e) { console.error("Failed to insert order notification:", e); }

        // Pagos: Pago Móvil y Cripto (USDT/TRC20) con carga de comprobante — ver shared/payment.ts
        return { ...order, paymentUrl: null as string | null };
      }),

    myOrders: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(({ ctx, input }) => getOrders({ userId: ctx.user.id, ...input })),

    byNumber: protectedProcedure
      .input(z.object({ orderNumber: z.string().max(64) }))
      .query(async ({ ctx, input }) => {
        const order = await getOrderByNumber(input.orderNumber);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND' });
        if (order.userId !== ctx.user.id && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return order;
      }),

    // Admin routes
    adminList: adminProcedure
      .input(z.object({
        status: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        archived: z.boolean().optional(),
      }).optional())
      .query(({ input }) => getOrders({ limit: 100, ...input })),

    /** Archiva o desarchiva un pedido (sigue existiendo, sale de la bandeja activa) */
    setArchived: adminProcedure
      .input(z.object({ id: z.number(), archived: z.boolean() }))
      .mutation(({ input }) => setOrderArchived(input.id, input.archived)),

    /** Archiva en lote los pedidos entregados o cancelados con cierta antigüedad */
    archiveOld: adminProcedure
      .input(z.object({ days: z.number().min(1).max(3650) }))
      .mutation(async ({ input }) => {
        const before = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
        const count = await archiveOldOrders(before);
        return { count };
      }),

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
          await insertAdminNotification({ type: "new_order", title: "Comprobante recibido", body: `Pedido ${order.orderNumber} · ${ctx.user.name ?? ctx.user.email}` });
        } catch { /* non-critical */ }
        try {
          await notifyOwner({ title: `Comprobante: ${order.orderNumber}`, content: `${ctx.user.name ?? ctx.user.email} subió su comprobante de pago. Ref: ${input.paymentReference}` });
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

        // Acreditar 2% al cosplayer referidor si el pago fue aprobado
        if (input.approved && (order as any).referralCosplayerId) {
          try {
            const orderTotal = parseFloat(order.total);
            const cashReward = parseFloat((orderTotal * 0.02).toFixed(2));
            await creditCashToReferrer((order as any).referralCosplayerId, cashReward, order.orderNumber);
            const cosplayer = await getCosplayerById((order as any).referralCosplayerId);
            if (cosplayer?.userId) {
              if (io) {
                io.to(`user:${cosplayer.userId}`).emit("notification:new");
                io.to(`user:${cosplayer.userId}`).emit("order:updated", {});
              }
              const referrerUser = await getUserById(cosplayer.userId);
              if (referrerUser?.email) {
                await notifyCosplayReferralEarned(referrerUser.email, cosplayer.artisticName, cashReward, order.orderNumber);
              }
            }
          } catch (e) { console.error("[Referral] Failed to credit referral cash:", e); }
        }

        return { success: true };
      }),

    pendingCount: adminProcedure.query(() => getPendingOrdersCount()),
    pendingPaymentsCount: adminProcedure.query(() => getPendingPaymentsCount()),

    adminPayments: adminProcedure
      .input(z.object({ paymentStatus: z.string().optional() }).optional())
      .query(({ input }) => getOrdersByPaymentStatus(input?.paymentStatus)),

    createManual: adminProcedure
      .input(z.object({
        customerName: z.string().min(1).max(256),
        customerEmail: z.string().email(),
        customerPhone: z.string().optional(),
        userId: z.number().optional(),
        items: z.array(z.object({
          productName: z.string().min(1),
          quantity: z.number().min(1),
          price: z.string(),
        })),
        total: z.string(),
        notes: z.string().optional(),
        paymentStatus: z.enum(['pending', 'partial', 'approved']).default('approved'),
        amountPaid: z.string().optional(),
        referralCode: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        // Número de orden único garantizado por timestamp
        const timestamp = Date.now();
        const orderNumber = `IW-${timestamp}`;

        // Pre-resolver cosplayer referidor (evita doble lookup)
        const referralCosplayer = input.referralCode
          ? await getCosplayerByReferralCode(input.referralCode)
          : null;

        // Insertar orden — si falla aquí, parar todo (no acreditar 2% ni enviar emails)
        try {
          await db.insert(orders).values({
            orderNumber,
            userId: input.userId ?? null,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone ?? '',
            shippingAddress: JSON.stringify({ street: '', city: '', country: '' }),
            subtotal: input.total,
            total: input.total,
            status: 'pending',
            paymentStatus: input.paymentStatus,
            amountPaid: input.amountPaid ?? '0',
            notes: input.notes ?? '',
            referralCode: input.referralCode ?? null,
            referralCosplayerId: referralCosplayer?.id ?? null,
            hasSecretGift: !!input.referralCode,
          });
        } catch (err) {
          console.error('[createManual] Error insertando orden:', err);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error al crear la orden' });
        }

        // Obtener la orden recién creada
        const [newOrder] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
        if (!newOrder) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error al obtener la orden creada' });

        // Insertar items
        for (const item of input.items) {
          await db.insert(orderItems).values({
            orderId: newOrder.id,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
          });
        }

        // Acreditar 2% al cosplayer referidor si el pedido ya está aprobado
        if (input.paymentStatus === 'approved' && referralCosplayer) {
          try {
            const orderTotal = parseFloat(input.total);
            const cashReward = parseFloat((orderTotal * 0.02).toFixed(2));
            await creditCashToReferrer(referralCosplayer.id, cashReward, orderNumber);
            const cosplayerFull = await getCosplayerById(referralCosplayer.id);
            if (cosplayerFull?.userId) {
              const user = await getUserById(cosplayerFull.userId);
              if (user?.email) {
                await sendEmail(
                  user.email,
                  '¡Ganaste cash por referido!',
                  `<h1>¡Nuevo ingreso en tu billetera!</h1>
                   <p>Hola <strong>${cosplayerFull.artisticName}</strong>, alguien usó tu código de referido y realizó una compra.</p>
                   <div class="order-box">
                     <p><strong>Cash acreditado:</strong> <span class="highlight">$${cashReward.toFixed(2)} USD</span></p>
                     <p><strong>Orden:</strong> ${orderNumber}</p>
                   </div>
                   <div style="text-align:center">
                     <a href="https://isekaiworld.co/cosplay/dashboard" class="btn">Ver mi billetera →</a>
                   </div>`,
                  `+$${cashReward.toFixed(2)} USD en tu billetera`
                );
              }
              io.to(`user:${cosplayerFull.userId}`).emit('notification:new');
            }
          } catch (e) { console.error('[createManual] Failed to credit referral cash:', e); }
        }

        // Email al cliente
        const itemsList = input.items
          .map(i => `<p>• ${i.productName} ×${i.quantity} — $${parseFloat(i.price).toFixed(2)} USD</p>`)
          .join('');

        await sendEmail(
          input.customerEmail,
          `Tu pedido ${orderNumber} ha sido creado — Isekai World`,
          `
        <h1>¡Tu pedido está confirmado!</h1>
        <p>Hola <strong>${input.customerName}</strong>, hemos creado tu pedido en Isekai World.</p>
        <div class="order-box">
          <p><strong>N° de orden:</strong> <span class="highlight">${orderNumber}</span></p>
          <p><strong>Productos:</strong></p>
          ${itemsList}
          <p style="margin-top:8px"><strong>Total:</strong> $${parseFloat(input.total).toFixed(2)} USD</p>
          ${input.notes ? `<p><strong>Notas:</strong> ${input.notes}</p>` : ''}
        </div>
        <p>Puedes seguir el estado de tu pedido en tiempo real desde tu cuenta.</p>
        <div style="text-align:center">
          <a href="https://isekaiworld.co/account" class="btn">Ver mi pedido →</a>
        </div>
      `,
          `Tu pedido ${orderNumber} fue confirmado`
        );

        // Notificación interna admin
        await insertAdminNotification({
          type: 'new_order',
          title: `Pedido manual creado`,
          body: `${orderNumber} — ${input.customerName} · $${parseFloat(input.total).toFixed(2)} USD`,
        });

        return { success: true, orderNumber, id: newOrder.id };
      }),

    updatePaymentStatus: adminProcedure
      .input(z.object({ orderId: z.number(), paymentStatus: z.enum(['pending', 'partial', 'approved']) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.update(orders).set({ paymentStatus: input.paymentStatus }).where(eq(orders.id, input.orderId));
        return { success: true };
      }),

    uploadReceipt: protectedProcedure
      .input(z.object({ fileName: z.string().max(256), fileType: z.string().max(100), fileBase64: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        validateUpload(input.fileType, buffer);
        const key = `receipts/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { url } = await storagePut(key, buffer, input.fileType);
        return { url };
      }),

    /**
     * Subida de comprobante desde el checkout, sin sesión iniciada.
     * El checkout permite comprar como invitado, así que no puede exigir login.
     * Protegido por validateUpload (tipo MIME + magic bytes + 10 MB) y por el
     * rate limit de /api/trpc en server/_core/index.ts.
     */
    uploadReceiptPublic: publicProcedure
      .input(z.object({ fileName: z.string().max(256), fileType: z.string().max(100), fileBase64: z.string().max(15_000_000) }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        validateUpload(input.fileType, buffer);
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
          await insertAdminNotification({ type: "new_order", title: "Cuota recibida", body: `${ctx.user.name ?? ctx.user.email} · ${plan.productName}` });
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

  // ─── Media Library ───────────────────────────────────────────────────────────
  media: router({
    list: adminProcedure.query(() => listMediaAssets({ limit: 200 })),

    /** Puebla la biblioteca con las imágenes ya asignadas en el sitio */
    importExisting: adminProcedure.mutation(() => importExistingMedia()),

    upload: adminProcedure
      .input(z.object({ fileName: z.string().max(256), contentType: z.string().max(100), base64Data: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64Data, "base64");
        validateUpload(input.contentType, buffer);
        const storageKey = `media/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { url } = await storagePut(storageKey, buffer, input.contentType);
        return insertMediaAsset({
          url,
          storageKey,
          fileName: input.fileName,
          mimeType: input.contentType,
          sizeBytes: buffer.length,
        });
      }),

    updateAlt: adminProcedure
      .input(z.object({ id: z.number(), altText: z.string().max(512) }))
      .mutation(({ input }) => updateMediaAlt(input.id, input.altText)),

    /** Dónde se está usando este archivo (para avisar antes de borrarlo) */
    usage: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const asset = await getMediaAsset(input.id);
        if (!asset) return { keys: [] as string[] };
        return { keys: await findSettingsUsingUrl(asset.url) };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const asset = await getMediaAsset(input.id);
        if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Archivo no encontrado" });
        let storageDeleted = true;
        try {
          await storageDelete(asset.storageKey);
        } catch (e) {
          console.error("[Media] No se pudo borrar de R2:", e);
          storageDeleted = false;
        }
        await deleteMediaAsset(input.id);
        return { storageDeleted };
      }),
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
      .input(z.object({
        email: z.string().email(),
        /** De dónde vino el registro: cambia el aviso que recibe el dueño */
        source: z.enum(["newsletter", "worldfest"]).default("newsletter"),
      }))
      .mutation(async ({ input }) => {
        const esWorldFest = input.source === "worldfest";
        const etiqueta = esWorldFest ? "World Fest" : "Newsletter";

        // El aviso al dueño va PRIMERO y por separado: si Mailchimp falla o no
        // está configurado, el registro no se pierde silenciosamente.
        try {
          await insertAdminNotification({
            type: "new_subscriber",
            title: esWorldFest ? "Registro en World Fest" : "Nuevo suscriptor",
            body: input.email,
          });
        } catch (e) { console.error("Failed to insert subscriber notification:", e); }

        try {
          await notifyOwner({
            title: esWorldFest ? `Registro en World Fest — ${input.email}` : `Nuevo suscriptor — ${input.email}`,
            content: `
              <p><strong>Correo:</strong> ${input.email}</p>
              <p><strong>Origen:</strong> ${etiqueta}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleString("es-VE")}</p>
            `,
          });
        } catch (e) { console.error("Failed to email owner about subscriber:", e); }

        console.log("[Mailchimp] apiKey:", ENV.mailchimpApiKey ? "SET" : "EMPTY");
        console.log("[Mailchimp] listId:", ENV.mailchimpListId ? "SET" : "EMPTY");
        console.log("[Mailchimp] dc:", ENV.mailchimpDc ? "SET" : "EMPTY");
        if (!ENV.mailchimpApiKey || !ENV.mailchimpListId || !ENV.mailchimpDc) {
          // Sin Mailchimp el registro igual vale: ya quedó el aviso al dueño
          console.warn("[Mailchimp] No configurado — se omite el alta en la lista");
          return { success: true, mailchimp: false };
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
          if (err.title === "Member Exists") return { success: true, mailchimp: true };
          // El correo al dueño ya salió, así que no se pierde el registro
          console.error("[Mailchimp] Error al dar de alta:", err.detail);
          return { success: true, mailchimp: false };
        }
        return { success: true, mailchimp: true };
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
        question: z.string().min(1).max(500),
        answer: z.string().min(1).max(5000),
        category: z.string().max(100).optional(),
        position: z.number().optional(),
      }))
      .mutation(({ input }) => createFaqItem(input)),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        question: z.string().min(1).max(500).optional(),
        answer: z.string().min(1).max(5000).optional(),
        category: z.string().max(100).optional(),
        position: z.number().optional(),
        active: z.boolean().optional(),
      }))
      .mutation(({ input }) => { const { id, ...data } = input; return updateFaqItem(id, data); }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteFaqItem(input.id)),
  }),

  // ─── Users (admin) ───────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure
      .input(z.object({
        search: z.string().optional(),
        role: z.enum(['user', 'admin', 'all']).optional(),
      }))
      .query(async ({ input }) => {
        return await getUsers(input);
      }),

    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['user', 'admin']),
      }))
      .mutation(async ({ input }) => {
        return await updateUserRole(input.userId, input.role);
      }),

    delete: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        return await deleteUser(input.userId);
      }),

    findByEmail: adminProcedure
      .input(z.object({ email: z.string().email() }))
      .query(({ input }) => findUserByEmail(input.email)),

    searchByEmail: adminProcedure
      .input(z.object({ query: z.string().min(2) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(like(users.email, `%${input.query}%`))
          .limit(5);
      }),
  }),

  // ─── Popups ──────────────────────────────────────────────────────────────────
  popups: router({
    getActive: publicProcedure
      .input(z.object({
        page: z.string().optional(),
        productId: z.number().optional(),
        isCosplayer: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const all = await getActivePopups(input);
        return all.filter(p => {
          const aud = (p as any).audience ?? 'all';
          if (aud === 'all') return true;
          if (aud === 'cosplayers') return input.isCosplayer === true;
          if (aud === 'users') return input.isCosplayer !== undefined;
          if (aud === 'guests') return !input.isCosplayer;
          return true;
        });
      }),

    list: adminProcedure.query(() => getAllPopups()),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        title: z.string().max(300).optional(),
        subtitle: z.string().max(500).optional(),
        bodyText: z.string().max(5000).optional(),
        buttonText: z.string().max(200).optional(),
        buttonUrl: z.string().max(500).optional(),
        image: z.string().max(500).optional(),
        showEmail: z.boolean().optional(),
        couponCode: z.string().max(100).optional(),
        triggerType: z.enum(['time', 'entry', 'page', 'product', 'exit']).optional(),
        triggerDelay: z.number().optional(),
        triggerPage: z.string().max(200).optional(),
        triggerProductId: z.number().optional(),
        showOnce: z.boolean().optional(),
        position: z.enum(['center', 'bottom-left', 'bottom-right', 'top']).optional(),
        audience: z.enum(['all', 'cosplayers', 'users', 'guests']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const data: any = { ...input };
        if (input.startDate) data.startDate = new Date(input.startDate);
        else delete data.startDate;
        if (input.endDate) data.endDate = new Date(input.endDate);
        else delete data.endDate;
        return createPopup(data);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().max(200).optional(),
        active: z.boolean().optional(),
        title: z.string().max(300).optional(),
        subtitle: z.string().max(500).optional(),
        bodyText: z.string().max(5000).optional(),
        buttonText: z.string().max(200).optional(),
        buttonUrl: z.string().max(500).optional(),
        image: z.string().max(500).optional(),
        showEmail: z.boolean().optional(),
        couponCode: z.string().max(100).optional(),
        triggerType: z.enum(['time', 'entry', 'page', 'product', 'exit']).optional(),
        triggerDelay: z.number().optional(),
        triggerPage: z.string().max(200).optional(),
        triggerProductId: z.number().optional(),
        showOnce: z.boolean().optional(),
        position: z.enum(['center', 'bottom-left', 'bottom-right', 'top']).optional(),
        audience: z.enum(['all', 'cosplayers', 'users', 'guests']).optional(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
      }))
      .mutation(({ input }) => {
        const { id, ...rest } = input;
        const data: any = { ...rest };
        if (rest.startDate) data.startDate = new Date(rest.startDate);
        else if (rest.startDate === null) data.startDate = null;
        else delete data.startDate;
        if (rest.endDate) data.endDate = new Date(rest.endDate);
        else if (rest.endDate === null) data.endDate = null;
        else delete data.endDate;
        return updatePopup(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deletePopup(input.id)),

    toggleActive: adminProcedure
      .input(z.object({ id: z.number(), active: z.boolean() }))
      .mutation(({ input }) => updatePopup(input.id, { active: input.active })),
  }),

  // ─── Cosplay Guild ───────────────────────────────────────────────────────────
  cosplay: router({
    getApprovedCosplayers: publicProcedure.query(() => getApprovedCosplayers()),

    getCosplayerProfile: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getCosplayerById(input.id)),

    getCosplayerByUsername: publicProcedure
      .input(z.object({ username: z.string() }))
      .query(({ input }) => getCosplayerByUsername(input.username)),

    getActivities: publicProcedure.query(() => getActiveActivities()),

    submitApplication: publicProcedure
      .input(z.object({
        userId: z.number().optional(),
        artisticName: z.string().min(1).max(200),
        photo: z.string().optional(),
        bannerImage: z.string().optional(),
        gallery: z.array(z.string()).optional(),
        bio: z.string().max(2000).optional(),
        fullName: z.string().min(1).max(200),
        lastName: z.string().min(1).max(200),
        age: z.number().min(16).max(99),
        city: z.string().min(1).max(200),
        country: z.string().min(1).max(200),
        address: z.string().min(5),
        phone: z.string().min(7).max(50),
        email: z.string().email(),
        experience: z.number().min(0).max(50),
        instagram: z.string().optional(),
        tiktok: z.string().optional(),
        youtube: z.string().optional(),
        facebook: z.string().optional(),
        twitter: z.string().optional(),
        whyIsekai: z.string().min(50).max(2000),
      }).refine(
        data => data.instagram || data.tiktok || data.youtube || data.facebook || data.twitter,
        { message: 'Debes incluir al menos una red social' }
      ))
      .mutation(async ({ input }) => {
        await createCosplayApplication(input);
        try {
          const admins = await getAdminUsers();
          for (const admin of admins) {
            io.to(`user:${admin.id}`).emit('notification:new');
          }
        } catch { /* non-critical */ }
      }),

    getMyProfile: protectedProcedure.query(async ({ ctx }) => {
      const result = await getCosplayerByUserId(ctx.user.id);
      console.log('[getMyProfile] userId:', ctx.user.id, 'cashBalance:', result?.cashBalance);
      return result;
    }),

    updateMyProfile: protectedProcedure
      .input(z.object({
        bio: z.string().max(1000).optional(),
        photo: z.string().optional(),
        bannerImage: z.string().optional(),
        gallery: z.array(z.string()).optional(),
        instagram: z.string().optional(),
        tiktok: z.string().optional(),
        youtube: z.string().optional(),
        facebook: z.string().optional(),
        twitter: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => updateCosplayerProfile(ctx.user.id, input)),

    submitActivity: protectedProcedure
      .input(z.object({ activityId: z.number(), evidenceUrl: z.string().min(1).max(500) }))
      .mutation(({ ctx, input }) => submitCosplayActivity(ctx.user.id, input)),

    getMySubmissions: protectedProcedure.query(({ ctx }) => getMyCosplayerSubmissions(ctx.user.id)),

    getMyTickets: protectedProcedure.query(({ ctx }) => getCosplayerTickets(ctx.user.id)),

    redeemDiscount: protectedProcedure
      .input(z.object({ discountPercent: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(50)]) }))
      .mutation(({ ctx, input }) => redeemCosplayDiscountCode(ctx.user.id, input.discountPercent)),

    getMyDiscountCodes: protectedProcedure.query(({ ctx }) => getMyCosplayerDiscountCodes(ctx.user.id)),

    uploadImage: protectedProcedure
      .input(z.object({ fileName: z.string().max(256), contentType: z.string().max(100), base64Data: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64Data, 'base64');
        validateUpload(input.contentType, buffer);
        const key = `cosplay/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url };
      }),

    // Admin
    getApplications: adminProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(({ input }) => getCosplayApplications(input.status)),

    approveApplication: adminProcedure
      .input(z.object({
        applicationId: z.number(),
        tier: z.enum(['bronce', 'plata', 'oro', 'diamante', 'platino']),
        totalFollowers: z.number(),
      }))
      .mutation(async ({ input }) => {
        const kitSetting = await getSetting('cosplay_kit_product_id');
        const kitProductId = kitSetting ? parseInt(kitSetting) : null;
        return await approveCosplayApplication({ ...input, kitProductId });
      }),

    rejectApplication: adminProcedure
      .input(z.object({ applicationId: z.number(), reason: z.string().min(1) }))
      .mutation(({ input }) => rejectCosplayApplication(input)),

    getAllCosplayers: adminProcedure.query(async () => {
      const result = await getAllCosplayers();
      console.log('[getAllCosplayers]', result.length, 'cosplayers');
      return result;
    }),

    updateCosplayerTier: adminProcedure
      .input(z.object({
        cosplayerId: z.number(),
        tier: z.enum(['bronce', 'plata', 'oro', 'diamante', 'platino']),
        totalFollowers: z.number(),
      }))
      .mutation(({ input }) => updateCosplayerTier(input)),

    suspendCosplayer: adminProcedure
      .input(z.object({ cosplayerId: z.number() }))
      .mutation(({ input }) => suspendCosplayer(input.cosplayerId)),

    deleteCosplayer: adminProcedure
      .input(z.object({ cosplayerId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCosplayer(input.cosplayerId);
        return { success: true };
      }),

    createActivity: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(300),
        description: z.string().max(5000).optional(),
        basePoints: z.number().min(1),
        type: z.enum(['post', 'reel', 'tiktok', 'story', 'event']),
        deadline: z.string().optional(),
      }))
      .mutation(({ input }) => createCosplayActivity(input)),

    getAllActivities: adminProcedure.query(() => getAllCosplayActivities()),

    toggleActivity: adminProcedure
      .input(z.object({ id: z.number(), active: z.boolean() }))
      .mutation(({ input }) => toggleCosplayActivity(input.id, input.active)),

    deleteActivity: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteCosplayActivity(input.id)),

    updateActivity: adminProcedure
      .input(z.object({
        id: z.number(),
        active: z.boolean().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        basePoints: z.number().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateCosplayActivity(id, data);
      }),

    evaluateSubmission: adminProcedure
      .input(z.object({
        submissionId: z.number(),
        pointsAwarded: z.number().min(0),
        status: z.enum(['approved', 'rejected']),
      }))
      .mutation(({ input }) => evaluateCosplaySubmission(input)),

    grantTickets: adminProcedure
      .input(z.object({
        cosplayerId: z.number(),
        basePoints: z.number().min(1),
        reason: z.string().min(1).max(500),
      }))
      .mutation(async ({ input }) => {
        const result = await grantTicketsManually(input.cosplayerId, input.basePoints, input.reason);
        const cosplayer = await getCosplayerById(input.cosplayerId);
        if (cosplayer) {
          const user = await getUserById(cosplayer.userId);
          if (user?.email) {
            notifyCosplayTicketsGranted(
              user.email,
              cosplayer.artisticName,
              result.finalPoints,
              input.basePoints,
              result.multiplier,
              cosplayer.tier ?? 'bronce',
              cosplayer.ticketBalance ?? 0,
              input.reason,
            ).catch(() => {});
          }
          if (cosplayer.userId) {
            io.to(`user:${cosplayer.userId}`).emit('notification:new');
          }
        }
        return result;
      }),

    getAllSubmissions: adminProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(({ input }) => getAllCosplaySubmissions(input.status)),

    addEvidence: protectedProcedure
      .input(z.object({ submissionId: z.number(), url: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        const cosplayer = await getCosplayerByUserId(ctx.user.id);
        if (!cosplayer) throw new TRPCError({ code: 'FORBIDDEN' });
        const result = await addEvidenceToSubmission(input.submissionId, input.url, cosplayer.id);
        if (!result) throw new TRPCError({ code: 'FORBIDDEN' });
        return result;
      }),

    // ── Referral & Cash ──────────────────────────────────────────────────────
    validateReferralCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(({ input }) => getCosplayerByReferralCode(input.code.toUpperCase())),

    requestWithdrawal: protectedProcedure
      .input(z.object({
        amount: z.number().min(20),
        paymentMethod: z.string().min(1).max(100),
        paymentDetails: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const cosplayer = await getCosplayerByUserId(ctx.user.id);
        if (!cosplayer) throw new TRPCError({ code: 'FORBIDDEN' });
        // El saldo del cosplayer se acredita en dólares (2% del total de la orden)
        const MIN_WITHDRAWAL_USD = 20;
        if (input.amount < MIN_WITHDRAWAL_USD) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `El mínimo de retiro es $${MIN_WITHDRAWAL_USD.toFixed(2)} USD` });
        }
        if (parseFloat(cosplayer.cashBalance ?? '0') < input.amount) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Saldo insuficiente. Tienes $${parseFloat(cosplayer.cashBalance ?? '0').toFixed(2)} USD` });
        }
        await requestCashWithdrawal(cosplayer.id, input.amount, input.paymentMethod, input.paymentDetails);
        try {
          await notifyOwner({
            title: `Solicitud de retiro — ${cosplayer.artisticName}`,
            content: `Monto: $${input.amount} USD\nMétodo: ${input.paymentMethod}\nDetalles: ${input.paymentDetails}`,
          });
        } catch { /* non-critical */ }
        return { success: true };
      }),

    getWithdrawals: adminProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(({ input }) => getCashWithdrawals(input.status)),

    processWithdrawal: adminProcedure
      .input(z.object({
        withdrawalId: z.number(),
        status: z.enum(['completed', 'rejected']),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await processWithdrawal(input.withdrawalId, input.status, input.notes);
        return { success: true };
      }),

    applyCashToOrder: protectedProcedure
      .input(z.object({ amount: z.number().min(0.01) }))
      .mutation(async ({ ctx, input }) => {
        const cosplayer = await getCosplayerByUserId(ctx.user.id);
        if (!cosplayer) throw new TRPCError({ code: 'FORBIDDEN' });
        if (parseFloat(cosplayer.cashBalance ?? '0') < input.amount) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Saldo insuficiente' });
        }
        await deductCosplayerCash(cosplayer.id, input.amount);
        return { success: true, newBalance: parseFloat(cosplayer.cashBalance ?? '0') - input.amount };
      }),
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

  // ─── Blog ──────────────────────────────────────────────────────────────────
  blog: router({
    getPosts: publicProcedure
      .input(z.object({ status: z.string().optional(), category: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => getBlogPosts(input)),

    getPostBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const post = await getBlogPostBySlug(input.slug);
        if (post) await incrementBlogViews(post.id);
        return post;
      }),

    getCategories: publicProcedure.query(() => getBlogCategories()),

    getComments: publicProcedure
      .input(z.object({ postId: z.number() }))
      .query(({ input }) => getBlogComments(input.postId, 'approved')),

    addComment: publicProcedure
      .input(z.object({ postId: z.number(), userId: z.number().optional(), guestName: z.string().max(200).optional(), guestEmail: z.string().email().optional(), content: z.string().min(1).max(2000) }))
      .mutation(({ input }) => createBlogComment({ ...input, status: 'pending' })),

    getAllPosts: adminProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(({ input }) => getBlogPosts({ status: input.status })),

    createPost: adminProcedure
      .input(z.object({ title: z.string().min(1).max(500), slug: z.string().optional(), excerpt: z.string().max(500).optional(), content: z.string().optional(), coverImage: z.string().optional(), category: z.string().optional(), tags: z.array(z.string()).optional(), status: z.enum(['draft', 'published']), authorName: z.string().optional(), metaTitle: z.string().max(500).optional(), metaDescription: z.string().optional(), metaKeywords: z.string().optional() }))
      .mutation(({ input }) => createBlogPost(input)),

    updatePost: adminProcedure
      .input(z.object({ id: z.number(), title: z.string().optional(), slug: z.string().optional(), excerpt: z.string().optional(), content: z.string().optional(), coverImage: z.string().optional(), category: z.string().optional(), tags: z.array(z.string()).optional(), status: z.enum(['draft', 'published']).optional(), authorName: z.string().optional(), metaTitle: z.string().optional(), metaDescription: z.string().optional(), metaKeywords: z.string().optional() }))
      .mutation(({ input }) => updateBlogPost(input.id, input)),

    deletePost: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteBlogPost(input.id)),

    createCategory: adminProcedure
      .input(z.object({ name: z.string().min(1).max(200), description: z.string().optional() }))
      .mutation(({ input }) => createBlogCategory(input)),

    deleteCategory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteBlogCategory(input.id)),

    getAllComments: adminProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(({ input }) => getAllBlogComments(input.status)),

    updateCommentStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(['approved', 'rejected']) }))
      .mutation(({ input }) => updateBlogCommentStatus(input.id, input.status)),

    deleteComment: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteBlogComment(input.id)),
  }),

  // ─── Gift Cards ───────────────────────────────────────────────────────────────
  giftCards: router({
    validate: publicProcedure
      .input(z.object({ code: z.string().min(1).max(50), orderTotal: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await validateGiftCard(input.code, ctx.user?.id, input.orderTotal);
      }),

    create: adminProcedure
      .input(z.object({
        amount: z.number().min(0.01),
        discountType: z.enum(['fixed', 'percent']).default('fixed'),
        discountPercent: z.number().min(0).max(100).optional(),
        maxUses: z.number().min(1).default(1),
        minOrderAmount: z.number().min(0).default(0),
        expiresAt: z.string().optional(),
        onlyNewUsers: z.boolean().default(false),
        oncePerUser: z.boolean().default(false),
        notes: z.string().optional(),
        quantity: z.number().min(1).max(500).default(1),
      }))
      .mutation(async ({ input }) => {
        const codes: string[] = [];
        for (let i = 0; i < input.quantity; i++) {
          const code = await createGiftCard({
            amount: input.amount,
            discountType: input.discountType,
            discountPercent: input.discountPercent ?? 0,
            maxUses: input.maxUses,
            minOrderAmount: input.minOrderAmount,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            onlyNewUsers: input.onlyNewUsers,
            oncePerUser: input.oncePerUser,
            notes: input.notes,
          });
          if (code) codes.push(code);
        }
        return { codes };
      }),

    list: adminProcedure
      .query(() => getGiftCards()),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteGiftCard(input.id)),

    /** Borrado en lote desde la selección del panel */
    deleteMany: adminProcedure
      .input(z.object({ ids: z.array(z.number()).min(1).max(500) }))
      .mutation(({ input }) => deleteGiftCards(input.ids)),
  }),
});

export type AppRouter = typeof appRouter;
