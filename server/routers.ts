import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc, like } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyStoreActivated, notifyOwner, notifyCustomerOrderStatus, notifyCosplayReferralEarned, notifyCosplayTicketsGranted, sendEmail } from "./_core/notification";
import { orders, orderItems, users } from "../drizzle/schema";
import { io } from "./_core/socket";
import { ENV } from "./_core/env";
import { storagePut, storageDelete } from "./storage";
import { PAYMENT_METHOD_LABELS } from "@shared/payment";
import { antiSpamSchema, guardPublicForm, clientIp, limitarPorUsuario } from "./antiSpam";
import { validarPedido, descontarStock, devolverStock } from "./orderValidation";
import { consultarTasaBinance, actualizarTasaAutomatica } from "./binanceRate";
import {
  crearEvento, listarEventos, editarEvento,
  crearTipoBoleto, listarTipos, editarTipo, borrarTipo,
  crearTienda, listarTiendas, editarTienda, borrarTienda, tiendaDeUsuario,
  generarBoletos, boletoPorToken, venderBoleto, corregirBoleto,
  listarBoletos, resumenEvento, ventasDeTienda, lotesDeEvento, boletosDeLote, ventasPorDia,
  paqueteAcceso, registrarIngreso, resumenAsistencia,
  crearPortero, listarPorteros, editarPortero, borrarPortero, esPorteroPorCorreo,
} from "./tickets";
import {
  crearActividad, listarActividades, editarActividad, borrarActividad,
  otorgarExperiencia, estadoPublico, resumenLevelPass,
  crearStaff, listarStaff, borrarStaff, esStaffPorCorreo, puedeOtorgar,
  levelPassActivo,
} from "./levelPass";
import { getReferralCash, getReferralTickets, REFERRAL_TIERS } from "@shared/referral";

/** Mensajes de rechazo del código de referido, en el idioma del cliente */
const MOTIVO_REFERIDO: Record<string, string> = {
  CODIGO_INVALIDO: 'Ese código de referido no existe',
  CODIGO_PROPIO: 'No puedes usar tu propio código de referido',
  CODIGO_ENTRE_COSPLAYERS: 'Los cosplayers del Guild no pueden usar códigos de referido',
};

import {
  getAllCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory,
  getProducts, getProductBySlug, getProductById, createProduct, updateProduct, deleteProduct,
  addProductImage, getProductImage, getProductImages, deleteProductImage, upsertProductVariant, deleteProductVariant,
  getCartItems, upsertCartItem, removeCartItem, clearCart,
  createOrder, getOrders, getOrderById, getOrderByNumber, updateOrderStatus, setOrderArchived, archiveOldOrders, deleteOrder, registrarAbono,
  crearAbono, aprobarAbono, rechazarAbono, getAbonos, getAbonosPendientes,
  listMediaAssets, insertMediaAsset, getMediaAsset, updateMediaAlt, deleteMediaAsset, findSettingsUsingUrl, importExistingMedia,
  deleteGiftCards,
  insertSubscriber, getSubscribers, deleteSubscriber,
  createQuote, getQuoteByToken, getAllQuotes, updateQuote, deleteQuote, editQuote, vincularCuentaPorCorreo,
  getTransactions, getFinanceSummary,
  crearFeedback, listarFeedback, actualizarFeedback, borrarFeedback, resumenFeedback,
  ensureOwnCosplayerProfile, setOwnCosplayerVisibility, getOwnCosplayerVisibility,
  getDashboardMetrics, getAllSettings, upsertSetting, getSetting, getCartItem,
  insertAdminNotification, getAdminNotifications, getAdminUnreadCount,
  markAllAdminNotificationsRead, markAdminNotificationRead,
  insertOrderNotification, getUserOrderNotifications,
  getOrderNotificationUnreadCount, markAllOrderNotificationsRead, markOrderNotificationRead,
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
  checkReferralEligibility, isCosplayerEmail, getMyActivityProgress,
  processWithdrawal, getUserById, requestCashWithdrawal, deductCosplayerCash,
  deleteCosplayer, grantTicketsManually, findUserByEmail, getDb,
  getBlogPosts, getBlogPostBySlug, createBlogPost, updateBlogPost, deleteBlogPost,
  incrementBlogViews, getBlogCategories, createBlogCategory, deleteBlogCategory,
  getBlogComments, getAllBlogComments, createBlogComment, updateBlogCommentStatus, deleteBlogComment,
  createGiftCard, getGiftCards, validateGiftCard, redeemGiftCard, deleteGiftCard,
} from "./db";
import { notifyWelcome } from "./_core/notification";

// ─── File upload validation ───────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = ['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/svg+xml','image/heic','image/heif','image/avif','application/pdf','video/mp4','video/webm'];
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
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Formato no admitido${contentType ? ` (${contentType})` : ''}. Usa una imagen JPG, PNG o un PDF.`,
    });
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

/** Portal de porteros: valida entradas, no vende ni ve dinero */
const gateProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "gate" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo para el personal de acceso" });
  }
  return next({ ctx });
});

/** Portal de tiendas: admin también entra, para poder probarlo */
const storeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "store" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo para tiendas autorizadas" });
  }
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
        // Un cosplayer no puede usar códigos de referido: ni el suyo ni el de
        // un compañero. Si el código no es elegible se descarta y la compra
        // sigue normalmente, sin comisión para nadie.
        let referralCode = input.referralCode;
        if (referralCode) {
          const motivo = await checkReferralEligibility(ctx.user?.id ?? null, referralCode);
          const compradorEsCosplayer = !ctx.user?.id && input.customerEmail
            ? await isCosplayerEmail(input.customerEmail)
            : false;
          if (motivo || compradorEsCosplayer) {
            console.warn(`[Referido] Código descartado (${motivo ?? 'CORREO_DE_COSPLAYER'}) en compra de ${input.customerEmail}`);
            referralCode = undefined;
          }
        }

        // ── Blindaje del checkout ────────────────────────────────────────
        // El precio, el subtotal, el descuento y el total se recalculan contra
        // la base de datos. Lo que manda el navegador NO se usa para dinero:
        // antes se podía enviar un pedido de $48 con total "1.00".
        const validado = await validarPedido({
          items: input.items.map(i => ({
            productId: i.productId,
            variantId: i.variantId ?? undefined,
            quantity: i.quantity,
          })),
          giftCardCode: input.giftCardCode,
        });

        // Se avisa si el importe no coincide con lo que vio el cliente: puede
        // ser un cambio de precio legítimo mientras compraba, o un intento.
        if (Math.abs(parseFloat(input.total) - parseFloat(validado.total)) > 0.01) {
          console.warn(
            `[Checkout] Total distinto al del cliente: enviado ${input.total}, ` +
            `real ${validado.total} — ${input.customerEmail}`
          );
        }

        // Reserva de stock antes de crear el pedido: si algo se agotó en el
        // camino, se falla aquí y no queda un pedido de algo inexistente.
        await descontarStock(validado.items);

        let order;
        try {
          order = await createOrder({
            ...input,
            referralCode,
            userId: ctx.user?.id,
            items: validado.items,
            subtotal: validado.subtotal,
            total: validado.total,
            giftCardDiscount: validado.giftCardDiscount,
          });
        } catch (e) {
          // Si el pedido no se pudo guardar, el stock vuelve a su sitio
          await devolverStock(validado.items).catch(() => {});
          throw e;
        }
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
      ${referralCode ? `<p><strong>Código referido:</strong> ${referralCode}</p>` : ''}
    </div>
    <div style="text-align:center">
      <a href="https://isekaiworld.co/admin" class="btn">Ver en el panel →</a>
    </div>
  `,
          });
        } catch (e) { console.error("Failed to notify owner:", e); }
        // Admin notification
        try {
          await insertAdminNotification({ type: "new_order", title: "Nuevo pedido", body: `${order.orderNumber} · ${input.customerName} · $${input.total} USD${input.receiptUrl ? ' · con comprobante' : ''}` });
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
    /** Elimina un pedido definitivamente (duplicados, pruebas) */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteOrder(input.id)),

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
        // Al cancelar, el stock reservado vuelve al inventario
        if (input.status === 'cancelled') {
          try {
            const anterior = await getOrderById(input.id);
            if (anterior && (anterior as any).status !== 'cancelled') {
              // Se excluyen las líneas sin producto del catálogo (cotizaciones
              // a medida): no tienen inventario que devolver.
              const lineas = ((anterior as any).items ?? [])
                .filter((i: any) => i.productId)
                .map((i: any) => ({
                  productId: i.productId,
                  variantId: i.variantId ?? null,
                  quantity: i.quantity,
                }));
              if (lineas.length) await devolverStock(lineas);
            }
          } catch (e) { console.error('[Pedido] No se pudo devolver el stock:', e); }
        }

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
        const resultado = await verifyOrderPayment(input.orderId, input.approved);
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

        // La comisión se paga solo cuando el pedido queda cancelado por
        // completo: con un abono parcial el cliente todavía debe.
        if (input.approved && resultado?.completo && (order as any).referralCosplayerId) {
          try {
            const orderTotal = parseFloat(order.total);
            const cashReward = getReferralCash(orderTotal);
            const ticketReward = getReferralTickets(orderTotal);
            await creditCashToReferrer((order as any).referralCosplayerId, cashReward, order.orderNumber, ticketReward);
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
        // Misma regla en las órdenes creadas a mano desde el panel
        let referralCosplayer = input.referralCode
          ? await getCosplayerByReferralCode(input.referralCode)
          : null;
        if (referralCosplayer && input.customerEmail && await isCosplayerEmail(input.customerEmail)) {
          console.warn(`[Referido] Código descartado: ${input.customerEmail} es cosplayer del Guild`);
          referralCosplayer = null;
        }

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

        // Acreditar la comisión por tramo al cosplayer referidor
        if (input.paymentStatus === 'approved' && referralCosplayer) {
          try {
            const orderTotal = parseFloat(input.total);
            const cashReward = getReferralCash(orderTotal);
            const ticketReward = getReferralTickets(orderTotal);
            await creditCashToReferrer(referralCosplayer.id, cashReward, orderNumber, ticketReward);
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

    /** Abonos pendientes de verificar (los que sube el cliente) */
    abonosPendientes: adminProcedure.query(() => getAbonosPendientes()),

    /** Historial de abonos de un pedido */
    abonosDe: adminProcedure
      .input(z.object({ orderId: z.number() }))
      .query(({ input }) => getAbonos(input.orderId)),

    /** Aprueba un abono que subió el cliente y lo suma al pedido */
    aprobarAbono: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const r = await aprobarAbono(input.id);

        // Si con este abono el pedido queda cancelado por completo, se paga
        // la comisión del cosplayer sobre el TOTAL de la venta (una sola vez).
        if (r.completo && !r.yaEstabaAprobado && r.orderId) {
          try {
            const pedido = await getOrderById(r.orderId);
            const refId = (pedido as any)?.referralCosplayerId;
            if (refId) {
              await creditCashToReferrer(
                refId,
                getReferralCash(r.total),
                (pedido as any).orderNumber,
                getReferralTickets(r.total),
              );
            }
          } catch (e) { console.error('[Abono] No se pudo acreditar la comisión:', e); }
        }
        return r;
      }),

    rechazarAbono: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => rechazarAbono(input.id)),

    /** Suma un abono al pedido y ajusta el estado automáticamente */
    registrarAbono: adminProcedure
      .input(z.object({
        orderId: z.number(),
        monto: z.number().positive(),
        nota: z.string().max(200).optional(),
      }))
      .mutation(async ({ input }) => {
        const r = await registrarAbono(input.orderId, input.monto, input.nota);

        // Si el pedido quedó cancelado por completo y hay cosplayer referidor,
        // se acredita su comisión sobre el TOTAL de la venta.
        if (r.completo && !r.yaEstabaAprobado) {
          try {
            const pedido = await getOrderById(input.orderId);
            const refId = (pedido as any)?.referralCosplayerId;
            if (refId) {
              const cashReward = getReferralCash(r.total);
              const ticketReward = getReferralTickets(r.total);
              await creditCashToReferrer(refId, cashReward, (pedido as any).orderNumber, ticketReward);
            }
          } catch (e) { console.error('[Abono] No se pudo acreditar la comisión:', e); }
        }

        return r;
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

  // ─── Contador de ganancias ───────────────────────────────────────────────────
  revenue: router({
    /** Marca desde cuándo cuenta el dashboard. No borra ni altera pedidos. */
    reset: adminProcedure.mutation(async () => {
      await upsertSetting('revenue_reset_at', new Date().toISOString());
      return { resetAt: new Date().toISOString() };
    }),
    /** Vuelve a contar desde el principio */
    undoReset: adminProcedure.mutation(async () => {
      await upsertSetting('revenue_reset_at', '');
      return { resetAt: null };
    }),
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
      // El valor puede ir VACÍO: es la forma de quitar una imagen asignada
      // (banners, slides del hero, etc.). Antes se exigía min(1) y el botón
      // "Quitar" del gestor de medios no hacía nada.
      .input(z.object({ key: z.string().min(1), value: z.string().max(4096) }))
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
        ...antiSpamSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        await guardPublicForm(input, clientIp(ctx.req), { form: "newsletter", max: 5 });
        const esWorldFest = input.source === "worldfest";
        const etiqueta = esWorldFest ? "World Fest" : "Newsletter";

        // Se guarda SIEMPRE en nuestra base: es la lista que se consulta
        // desde el panel, independiente de Mailchimp.
        try {
          await insertSubscriber(input.email, input.source);
        } catch (e) { console.error("Failed to store subscriber:", e); }

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

  // ─── Level Pass ──────────────────────────────────────────────────────────────
  levelPass: router({
    /** Estado público: el asistente consulta con su número de boleto */
    estado: publicProcedure
      .input(z.object({ codigo: z.string().min(4).max(64) }))
      .query(async ({ input }) => {
        const r = await estadoPublico(input.codigo);
        if (!r) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No encontramos ese boleto. Revisa el código impreso.",
          });
        }
        return r;
      }),

    /** Actividades visibles del evento activo, para la página pública */
    actividadesPublicas: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(({ input }) => listarActividades(input.eventId, true)),

    /** ¿Puede este usuario otorgar experiencia, y está el evento en curso? */
    miAcceso: protectedProcedure.query(async ({ ctx }) => {
      const acceso = await puedeOtorgar(ctx.user.id, ctx.user.role);
      const eventos = (await listarEventos()).filter(e => e.active);
      const evento = eventos[0];
      const activo = evento ? await levelPassActivo(evento.id) : false;
      return {
        puede: acceso.puede,
        storeId: acceso.storeId,
        eventId: evento?.id ?? null,
        eventName: evento?.name ?? null,
        // El Level Pass se abre solo durante los días del evento
        enCurso: activo,
      };
    }),

    /** Otorgar experiencia escaneando el QR del boleto */
    otorgar: protectedProcedure
      .input(z.object({ token: z.string().min(4).max(64), activityId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const acceso = await puedeOtorgar(ctx.user.id, ctx.user.role);
        if (!acceso.puede) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para otorgar experiencia" });
        }
        if (!limitarPorUsuario(`xp:${ctx.user.id}`, 300, 10 * 60 * 1000)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiados registros seguidos" });
        }
        return otorgarExperiencia({
          token: input.token,
          activityId: input.activityId,
          userId: ctx.user.id,
          storeId: acceso.storeId,
        });
      }),

    // ── Admin ──
    actividades: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .query(({ input }) => listarActividades(input.eventId)),

    crearActividad: adminProcedure
      .input(z.object({
        eventId: z.number(),
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        xp: z.number().int().min(1).max(1000),
        ubicacion: z.string().max(200).optional(),
        repetible: z.boolean().optional(),
        maxVeces: z.number().int().min(1).max(20).optional(),
      }))
      .mutation(({ input }) => crearActividad(input)),

    editarActividad: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().max(200).optional(),
        description: z.string().max(1000).optional(),
        xp: z.number().int().min(1).max(1000).optional(),
        ubicacion: z.string().max(200).optional(),
        repetible: z.boolean().optional(),
        maxVeces: z.number().int().min(1).max(20).optional(),
        active: z.boolean().optional(),
      }))
      .mutation(({ input }) => { const { id, ...d } = input; return editarActividad(id, d); }),

    borrarActividad: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => borrarActividad(input.id)),

    resumen: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .query(({ input }) => resumenLevelPass(input.eventId)),

    // ── Personal autorizado ──
    staff: adminProcedure.query(() => listarStaff()),
    crearStaff: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        email: z.string().email().max(320).optional(),
        puesto: z.string().max(200).optional(),
      }))
      .mutation(({ input }) => crearStaff(input)),
    borrarStaff: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => borrarStaff(input.id)),
  }),

  // ─── Buzón de mejoras del Guild ──────────────────────────────────────────────
  feedback: router({
    /**
     * Enviar una sugerencia. Requiere sesión para evitar spam, pero el nombre
     * no se muestra a nadie salvo al dueño — y si el autor marca anónimo, no
     * se guarda ni siquiera para él.
     */
    enviar: protectedProcedure
      .input(z.object({
        categoria: z.enum(["experiencia", "actividades", "comunicacion", "pagos", "eventos", "otro"]),
        valoracion: z.number().int().min(1).max(5).optional(),
        mensaje: z.string().min(10).max(4000),
        anonimo: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!limitarPorUsuario(`feedback:${ctx.user.id}`, 5, 60 * 60 * 1000)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Ya enviaste varias sugerencias. Espera un rato antes de mandar otra.",
          });
        }

        const cosplayer = await getCosplayerByUserId(ctx.user.id);

        await crearFeedback({
          userId: ctx.user.id,
          cosplayerId: cosplayer?.id,
          anonimo: input.anonimo,
          categoria: input.categoria,
          valoracion: input.valoracion,
          mensaje: input.mensaje,
        });

        // Aviso al dueño, sin revelar el autor si pidió anonimato
        try {
          const quien = input.anonimo ? "Alguien" : (cosplayer?.artisticName ?? "Un cosplayer");
          await insertAdminNotification({
            type: "new_user",
            title: `${quien} dejó una sugerencia`,
            body: input.mensaje.length > 120 ? input.mensaje.slice(0, 120) + "…" : input.mensaje,
          });
          await notifyOwner({
            title: `Nueva sugerencia del Guild — ${input.categoria}`,
            content: `
              <p><strong>De:</strong> ${quien}${input.anonimo ? " (envío anónimo)" : ""}</p>
              ${input.valoracion ? `<p><strong>Valoración:</strong> ${input.valoracion} de 5</p>` : ""}
              <p><strong>Mensaje:</strong></p>
              <blockquote>${input.mensaje}</blockquote>
              <p style="margin-top:16px"><a href="https://isekaiworld.co/admin?tab=feedback">Ver en el panel</a></p>
            `,
          });
          const admins = await getAdminUsers();
          for (const a of admins) io.to(`user:${a.id}`).emit("notification:new");
        } catch (e) { console.error("[Feedback] Aviso fallido:", e); }

        return { ok: true };
      }),

    // ── Admin ──
    listar: adminProcedure
      .input(z.object({ estado: z.string().optional() }).optional())
      .query(({ input }) => listarFeedback(input?.estado)),

    resumen: adminProcedure.query(() => resumenFeedback()),

    actualizar: adminProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(["nuevo", "leido", "resuelto"]).optional(),
        notaInterna: z.string().max(2000).optional(),
      }))
      .mutation(({ input }) => { const { id, ...d } = input; return actualizarFeedback(id, d); }),

    borrar: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => borrarFeedback(input.id)),
  }),

  // ─── Boletería de eventos ────────────────────────────────────────────────────
  tickets: router({
    // ── Eventos (admin) ──
    eventos: adminProcedure.query(() => listarEventos()),
    crearEvento: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        startDate: z.string(),
        endDate: z.string(),
        location: z.string().max(300).optional(),
      }))
      .mutation(({ input }) => crearEvento(input)),
    editarEvento: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().max(200).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        location: z.string().max(300).optional(),
        active: z.boolean().optional(),
      }))
      .mutation(({ input }) => { const { id, ...d } = input; return editarEvento(id, d); }),

    // ── Tipos de boleto ──
    tipos: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(({ input }) => listarTipos(input.eventId)),
    crearTipo: adminProcedure
      .input(z.object({
        eventId: z.number(),
        name: z.string().min(1).max(200),
        priceUsd: z.string().regex(/^\d+(\.\d{1,2})?$/),
        days: z.number().int().min(1).max(7),
        perks: z.string().max(1000).optional(),
        sortOrder: z.number().int().optional(),
      }))
      .mutation(({ input }) => crearTipoBoleto(input)),
    editarTipo: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().max(200).optional(),
        priceUsd: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        days: z.number().int().min(1).max(7).optional(),
        perks: z.string().max(1000).optional(),
        active: z.boolean().optional(),
      }))
      .mutation(({ input }) => { const { id, ...d } = input; return editarTipo(id, d); }),
    borrarTipo: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => borrarTipo(input.id)),

    // ── Tiendas ──
    tiendas: adminProcedure.query(() => listarTiendas()),
    crearTienda: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        email: z.string().email().max(320).optional(),
        contactName: z.string().max(200).optional(),
        phone: z.string().max(50).optional(),
      }))
      .mutation(async ({ input }) => {
        const r = await crearTienda(input);

        // Correo de activación con el enlace y las instrucciones
        if (input.email) {
          try {
            const activos = (await listarEventos()).filter(e => e.active);
            await notifyStoreActivated(input.email, input.name, activos[0]?.name);
          } catch (e) {
            console.error("[Tienda] No se pudo enviar el correo de activación:", e);
          }
        }
        return r;
      }),
    /** Reenviar el correo de acceso, por si la tienda lo perdió */
    reenviarAcceso: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const tiendas = await listarTiendas();
        const t = tiendas.find(x => x.id === input.id);
        if (!t?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Esa tienda no tiene correo registrado" });
        const activos = (await listarEventos()).filter(e => e.active);
        await notifyStoreActivated(t.email, t.name, activos[0]?.name);
        return { enviado: true };
      }),

    borrarTienda: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => borrarTienda(input.id)),

    editarTienda: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().max(200).optional(),
        contactName: z.string().max(200).optional(),
        phone: z.string().max(50).optional(),
        active: z.boolean().optional(),
        /** Autorizada a otorgar experiencia del Level Pass */
        puedeOtorgarXp: z.boolean().optional(),
      }))
      .mutation(({ input }) => { const { id, ...d } = input; return editarTienda(id, d); }),

    // ── Generación de boletos (solo el dueño) ──
    generar: adminProcedure
      .input(z.object({ eventId: z.number(), cantidad: z.number().int().min(1).max(500) }))
      .mutation(({ input }) => generarBoletos(input.eventId, input.cantidad)),

    listar: adminProcedure
      .input(z.object({ eventId: z.number(), status: z.string().optional(), storeId: z.number().optional() }))
      .query(({ input }) => listarBoletos(input.eventId, { status: input.status, storeId: input.storeId })),

    lotes: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .query(({ input }) => lotesDeEvento(input.eventId)),

    boletosDeLote: adminProcedure
      .input(z.object({ eventId: z.number(), lote: z.string().max(40) }))
      .query(({ input }) => boletosDeLote(input.eventId, input.lote)),

    ventasPorDia: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .query(({ input }) => ventasPorDia(input.eventId)),

    resumen: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .query(({ input }) => resumenEvento(input.eventId)),

    corregir: adminProcedure
      .input(z.object({
        id: z.number(),
        buyerName: z.string().max(200).optional(),
        buyerLastName: z.string().max(200).optional(),
        buyerPhone: z.string().max(50).optional(),
        ticketTypeId: z.number().optional(),
        status: z.enum(["blank", "sold", "void"]).optional(),
      }))
      .mutation(({ input }) => { const { id, ...d } = input; return corregirBoleto(id, d); }),

    // ── Portal de la tienda ──
    /** Datos del boleto escaneado. Exige sesión de tienda: un QR suelto no
        revela nada ni puede activarlo cualquiera que lo fotografíe. */
    escanear: storeProcedure
      // Acepta tanto el token del QR (largo) como el código impreso (corto)
      .input(z.object({ token: z.string().min(4).max(64) }))
      .query(async ({ ctx, input }) => {
        // Freno al sondeo de tokens: 60 escaneos cada 10 minutos por usuario
        if (!limitarPorUsuario(`scan:${ctx.user.id}`, 60, 10 * 60 * 1000)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Demasiados escaneos seguidos. Espera un momento.",
          });
        }
        try {
          const r = await boletoPorToken(input.token);
          if (!r) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `No encontramos ningún boleto con ese código (${input.token.slice(0, 24)})`,
            });
          }
          return r;
        } catch (e: any) {
          if (e instanceof TRPCError) throw e;
          // Cualquier otro fallo se registra y se explica, en vez de dejar
          // el "error inesperado" que no dice nada.
          console.error("[Boleto] Error al escanear:", e);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No se pudo leer el boleto. Avísanos para revisarlo.",
          });
        }
      }),

    vender: storeProcedure
      .input(z.object({
        token: z.string().min(4).max(64),
        ticketTypeId: z.number(),
        buyerName: z.string().min(1).max(200),
        buyerLastName: z.string().min(1).max(200),
        buyerPhone: z.string().min(4).max(50),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!limitarPorUsuario(`venta:${ctx.user.id}`, 40, 10 * 60 * 1000)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiadas ventas seguidas. Espera un momento." });
        }

        const tienda = await tiendaDeUsuario(ctx.user.id);
        if (!tienda) throw new TRPCError({ code: "FORBIDDEN", message: "Tu usuario no está asociado a una tienda" });
        if (!tienda.active) throw new TRPCError({ code: "FORBIDDEN", message: "Esta tienda está desactivada" });

        const r = await venderBoleto({ ...input, storeId: tienda.id, userId: ctx.user.id });

        // Aviso en vivo al panel: la venta aparece sin recargar
        try {
          const admins = await getAdminUsers();
          for (const a of admins) io.to(`user:${a.id}`).emit("ticket:sold");
        } catch { /* no crítico */ }

        return r;
      }),

    miTienda: storeProcedure.query(async ({ ctx }) => {
      const tienda = await tiendaDeUsuario(ctx.user.id);
      return tienda ?? null;
    }),

    misVentas: storeProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        const tienda = await tiendaDeUsuario(ctx.user.id);
        if (!tienda) return { cantidad: 0, totalUsd: 0, totalBs: 0, boletos: [] };
        return ventasDeTienda(tienda.id, input.eventId);
      }),

    // ── Control de acceso (porteros) ──
    /** Paquete completo para validar sin conexión */
    paqueteAcceso: gateProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        const r = await paqueteAcceso(input.eventId);
        if (!r) throw new TRPCError({ code: "NOT_FOUND", message: "Ese evento no existe" });
        return r;
      }),

    eventosParaAcceso: gateProcedure.query(async () => {
      const todos = await listarEventos();
      return todos.filter(e => e.active);
    }),

    /** Registra un ingreso. Devuelve el motivo si no procede, sin lanzar. */
    validarIngreso: gateProcedure
      .input(z.object({
        token: z.string().min(4).max(64),
        offline: z.boolean().optional(),
        diaForzado: z.number().int().min(1).max(7).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!limitarPorUsuario(`acceso:${ctx.user.id}`, 400, 10 * 60 * 1000)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiados escaneos seguidos" });
        }
        return registrarIngreso({ ...input, userId: ctx.user.id });
      }),

    /**
     * Sincroniza los ingresos que el portero registró sin conexión.
     * Cada uno se procesa por separado: si alguno resulta duplicado, se informa
     * pero no bloquea a los demás.
     */
    sincronizarIngresos: gateProcedure
      .input(z.object({
        ingresos: z.array(z.object({
          token: z.string().min(4).max(64),
          dia: z.number().int().min(1).max(7),
        })).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const resultados = [];
        for (const i of input.ingresos) {
          try {
            const r = await registrarIngreso({
              token: i.token,
              userId: ctx.user.id,
              offline: true,
              diaForzado: i.dia,
            });
            resultados.push({ token: i.token, ...r });
          } catch (e: any) {
            resultados.push({ token: i.token, ok: false, motivo: "error", mensaje: String(e?.message ?? e) });
          }
        }
        return {
          total: resultados.length,
          aceptados: resultados.filter(r => r.ok).length,
          rechazados: resultados.filter(r => !r.ok),
        };
      }),

    // ── Porteros (admin) ──
    porteros: adminProcedure.query(() => listarPorteros()),
    crearPortero: adminProcedure
      .input(z.object({ name: z.string().min(1).max(200), email: z.string().email().max(320).optional() }))
      .mutation(({ input }) => crearPortero(input)),
    editarPortero: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().max(200).optional(), active: z.boolean().optional() }))
      .mutation(({ input }) => { const { id, ...d } = input; return editarPortero(id, d); }),
    borrarPortero: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => borrarPortero(input.id)),

    asistencia: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .query(({ input }) => resumenAsistencia(input.eventId)),

    eventosActivos: storeProcedure.query(async () => {
      const todos = await listarEventos();
      return todos.filter(e => e.active);
    }),
  }),

  // ─── Tasa automática ─────────────────────────────────────────────────────────
  tasa: router({
    /** Consulta Binance ahora mismo, sin guardar: para previsualizar */
    consultar: adminProcedure
      .input(z.object({ montoBs: z.number().optional() }).optional())
      .query(async ({ input }) => {
      const r = await consultarTasaBinance(input?.montoBs);
      if (!r) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Binance no respondió. Se conserva la tasa actual." });
      return r;
    }),

    /** Fuerza la actualización sin esperar a la hora */
    actualizarAhora: adminProcedure.mutation(async () => {
      const r = await actualizarTasaAutomatica();
      if (!r.actualizada) {
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "No se pudo obtener la tasa. Se conserva la anterior." });
      }
      return r;
    }),
  }),

  // ─── Finanzas ────────────────────────────────────────────────────────────────
  finance: router({
    summary: adminProcedure.query(() => getFinanceSummary()),
    transactions: adminProcedure
      .input(z.object({ estado: z.string().optional() }).optional())
      .query(({ input }) => getTransactions({ estado: input?.estado })),
  }),

  // ─── Cotizaciones ────────────────────────────────────────────────────────────
  quotes: router({
    /** Vista pública: solo con el token del enlace */
    byToken: publicProcedure
      .input(z.object({ token: z.string().min(10).max(64) }))
      .query(async ({ input }) => {
        const q = await getQuoteByToken(input.token);
        if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "Esta cotización no existe o el enlace no es válido" });
        if (q.expiresAt && new Date(q.expiresAt as any).getTime() < Date.now() && q.status !== "paid") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cotización venció. Escríbenos para renovarla." });
        }
        // Saldo pendiente: el cliente vuelve al mismo enlace a pagar lo que
        // falta, así que necesita ver cuánto es.
        let saldoPendiente = 0;
        let pagado = 0;
        if (q.orderId) {
          const pedido = await getOrderById(q.orderId);
          if (pedido) {
            pagado = parseFloat((pedido as any).amountPaid ?? "0") || 0;
            saldoPendiente = Math.max(0, Math.round((parseFloat((pedido as any).total) - pagado) * 100) / 100);
          }
        }

        // No se exponen campos internos
        return {
          pagado,
          saldoPendiente,
          quoteNumber: q.quoteNumber,
          title: q.title,
          description: q.description,
          items: q.items,
          referenceImages: q.referenceImages,
          subtotal: q.subtotal,
          total: q.total,
          notes: q.notes,
          depositAmount: q.depositAmount,
          status: q.status,
          customerName: q.customerName,
          customerEmail: q.customerEmail,
          expiresAt: q.expiresAt,
        };
      }),

    /** El cliente acepta y paga: crea el pedido y vincula (o crea) su cuenta */
    pay: publicProcedure
      .input(z.object({
        token: z.string().min(10).max(64),
        customerName: z.string().min(2).max(200),
        customerEmail: z.string().email().max(254),
        customerPhone: z.string().max(30).optional(),
        shippingAddress: z.object({
          street: z.string().max(300), city: z.string().max(100),
          state: z.string().max(100), country: z.string().max(100), zip: z.string().max(20),
        }).optional(),
        paymentMethod: z.string().max(50).optional(),
        receiptUrl: z.string().url().max(2048).optional(),
        paymentReference: z.string().max(256).optional(),
        receiptHolder: z.string().max(256).optional(),
        /** Cuánto abonó realmente. Si no viene, se asume el total. */
        amountPaid: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        /** Código del cosplayer que refirió al cliente */
        referralCode: z.string().max(50).optional(),
        ...antiSpamSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        await guardPublicForm(input, clientIp(ctx.req), { form: "quote-pay", max: 6 });

        const q = await getQuoteByToken(input.token);
        if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "Cotización no encontrada" });
        if (q.status === "paid") throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cotización ya fue pagada" });
        if (q.status === "partial") throw new TRPCError({ code: "BAD_REQUEST", message: "Ya abonaste esta cotización. Recarga la página para pagar el saldo." });
        if (q.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cotización fue cancelada" });
        if (q.expiresAt && new Date(q.expiresAt as any).getTime() < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cotización venció" });
        }

        // Cuenta: si el correo ya existe se usa; si no, se crea en silencio.
        // Entrar sigue exigiendo enlace mágico, así que escribir un correo
        // ajeno no da acceso a esa cuenta.
        let userId: number | undefined = ctx.user?.id;
        let cuentaCreada = false;
        if (!userId) {
          const r = await vincularCuentaPorCorreo(input.customerEmail, input.customerName);
          userId = r?.user?.id;
          cuentaCreada = Boolean(r?.creada);
        }

        // El importe sale de la cotización guardada, nunca del formulario
        // Las líneas de una cotización NO son productos del catálogo, así que
        // productId va nulo. Antes iba 0 y la base lo rechazaba: la columna
        // tiene clave foránea a products y no existe ningún producto con id 0.
        const lineas = ((q.items as any[]) ?? []).map((i: any) => ({
          productId: null,
          variantId: null,
          productName: String(i.concepto).slice(0, 250),
          price: String(i.precio),
          quantity: Number(i.cantidad) || 1,
        }));

        // Abono: el cliente puede pagar solo una parte si la cotización lo
        // permite. El pedido queda como pago parcial con el saldo pendiente.
        const totalCot = parseFloat(String(q.total));
        // El mínimo es el abono que fijó el admin; si no hay, se cobra todo
        const minimo = q.depositAmount
          ? Math.min(parseFloat(String(q.depositAmount)), totalCot)
          : totalCot;
        const abonado = input.amountPaid != null
          ? Math.min(Math.max(parseFloat(input.amountPaid), 0), totalCot)
          : totalCot;

        if (abonado < minimo - 0.01) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `El abono mínimo para esta cotización es $${minimo.toFixed(2)} USD`,
          });
        }

        const esAbono = abonado < totalCot - 0.01;

        // Código de referido: mismas reglas que el checkout. Un cosplayer no
        // puede usar códigos, ni el suyo ni el de un compañero.
        let referralCode = input.referralCode?.trim().toUpperCase() || undefined;
        let referralCosplayer = referralCode ? await getCosplayerByReferralCode(referralCode) : null;

        if (referralCosplayer) {
          const motivo = await checkReferralEligibility(userId ?? null, referralCode!);
          const compradorEsCosplayer = await isCosplayerEmail(input.customerEmail);
          if (motivo || compradorEsCosplayer) {
            console.warn(`[Cotización] Código descartado (${motivo ?? 'CORREO_DE_COSPLAYER'}) — ${input.customerEmail}`);
            referralCode = undefined;
            referralCosplayer = null;
          }
        }

        const order = await createOrder({
          userId,
          amountPaid: String(abonado.toFixed(2)),
          referralCode,
          referralCosplayerId: referralCosplayer?.id,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          shippingAddress: input.shippingAddress,
          subtotal: String(q.subtotal),
          total: String(q.total),
          notes: `Cotización ${q.quoteNumber}: ${q.title}${input.paymentReference ? ` · Ref. ${input.paymentReference}` : ""}`,
          paymentMethod: input.paymentMethod,
          receiptUrl: input.receiptUrl,
          paymentReference: input.paymentReference,
          receiptHolder: input.receiptHolder,
          items: lineas as any,
        });

        // Si solo abonó, la cotización NO queda "pagada": pasa a "partial"
        // hasta que se cubra el total. Antes se marcaba pagada con cualquier
        // abono y el cliente veía su cotización como saldada.
        await updateQuote(q.id, { status: esAbono ? "partial" : "paid", orderId: order.id });

        try {
          await insertAdminNotification({
            type: "new_order",
            title: "Cotización pagada",
            body: `${order.orderNumber} · ${q.title} · $${abonado.toFixed(2)}${esAbono ? ` de $${q.total}` : ""} USD`,
          });
          await notifyOwner({
            title: `Cotización pagada — ${q.quoteNumber}`,
            content: `
              <p><strong>Pedido:</strong> ${order.orderNumber}</p>
              <p><strong>Cliente:</strong> ${input.customerName} (${input.customerEmail})</p>
              <p><strong>Trabajo:</strong> ${q.title}</p>
              <p><strong>Total:</strong> $${q.total} USD</p>
              ${esAbono
                ? `<p><strong>Abonó:</strong> $${abonado.toFixed(2)} USD · <strong>Saldo pendiente:</strong> $${(totalCot - abonado).toFixed(2)} USD</p>`
                : "<p><strong>Pagó el total</strong></p>"}
              ${input.receiptUrl ? `<p><a href="${input.receiptUrl}">Ver comprobante</a></p>` : "<p>Sin comprobante adjunto</p>"}
            `,
          });
          const admins = await getAdminUsers();
          for (const a of admins) io.to(`user:${a.id}`).emit("notification:new");
        } catch (e) { console.error("[Cotización] Aviso fallido:", e); }

        return { orderNumber: order.orderNumber, cuentaCreada };
      }),

    /**
     * Abonar el saldo pendiente desde el enlace de la cotización.
     * El cliente vuelve a abrir su enlace, ve cuánto debe y sube el
     * comprobante del nuevo pago. Queda pendiente hasta que se verifique.
     */
    payBalance: publicProcedure
      .input(z.object({
        token: z.string().min(10).max(64),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        paymentMethod: z.string().max(50).optional(),
        receiptUrl: z.string().url().max(2048).optional(),
        paymentReference: z.string().max(256).optional(),
        receiptHolder: z.string().max(256).optional(),
        ...antiSpamSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        await guardPublicForm(input, clientIp(ctx.req), { form: "quote-balance", max: 6 });

        const q = await getQuoteByToken(input.token);
        if (!q || !q.orderId) throw new TRPCError({ code: "NOT_FOUND", message: "Cotización no encontrada" });

        const r = await crearAbono({
          orderId: q.orderId,
          amount: parseFloat(input.amount),
          method: input.paymentMethod,
          reference: input.paymentReference,
          holder: input.receiptHolder,
          receiptUrl: input.receiptUrl,
          source: "cliente",
        });

        try {
          await insertAdminNotification({
            type: "new_order",
            title: "Abono recibido",
            body: `${q.quoteNumber} · ${q.title} · $${parseFloat(input.amount).toFixed(2)} USD`,
          });
          await notifyOwner({
            title: `Abono recibido — ${q.quoteNumber}`,
            content: `
              <p><strong>Trabajo:</strong> ${q.title}</p>
              <p><strong>Abonó:</strong> $${parseFloat(input.amount).toFixed(2)} USD</p>
              ${input.paymentReference ? `<p><strong>Referencia:</strong> ${input.paymentReference}</p>` : ""}
              ${input.receiptUrl ? `<p><a href="${input.receiptUrl}">Ver comprobante</a></p>` : "<p>Sin comprobante adjunto</p>"}
              <p style="margin-top:16px"><a href="https://isekaiworld.co/admin?tab=finanzas">Verificar en Finanzas</a></p>
            `,
          });
          const admins = await getAdminUsers();
          for (const a of admins) io.to(`user:${a.id}`).emit("notification:new");
        } catch (e) { console.error("[Abono] Aviso fallido:", e); }

        return r;
      }),

    // ── Admin ──
    list: adminProcedure.query(() => getAllQuotes()),

    create: adminProcedure
      .input(z.object({
        customerName: z.string().max(200).optional(),
        customerEmail: z.string().email().max(320).optional(),
        customerPhone: z.string().max(50).optional(),
        title: z.string().min(1).max(300),
        description: z.string().max(5000).optional(),
        items: z.array(z.object({
          concepto: z.string().min(1).max(300),
          cantidad: z.number().int().min(1).max(999),
          precio: z.string().regex(/^\d+(\.\d{1,2})?$/),
        })).min(1).max(50),
        referenceImages: z.array(z.string().url()).max(10).optional(),
        notes: z.string().max(2000).optional(),
        expiresInDays: z.number().int().min(1).max(365).optional(),
        /** Monto del abono en USD. Vacío = se cobra el total. */
        depositAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      }))
      .mutation(({ input }) => createQuote(input)),

    /** Corregir una cotización sin invalidar el enlace ya compartido */
    edit: adminProcedure
      .input(z.object({
        id: z.number(),
        customerName: z.string().max(200).optional(),
        customerEmail: z.string().email().max(320).optional(),
        customerPhone: z.string().max(50).optional(),
        title: z.string().min(1).max(300).optional(),
        description: z.string().max(5000).optional(),
        items: z.array(z.object({
          concepto: z.string().min(1).max(300),
          cantidad: z.number().int().min(1).max(999),
          precio: z.string().regex(/^\d+(\.\d{1,2})?$/),
        })).min(1).max(50).optional(),
        notes: z.string().max(2000).optional(),
        depositAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().or(z.literal("")),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...datos } = input;
        return editQuote(id, datos);
      }),

    setStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(["draft", "sent", "partial", "paid", "cancelled"]) }))
      .mutation(({ input }) => updateQuote(input.id, { status: input.status })),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteQuote(input.id)),
  }),

  // ─── Suscriptores (admin) ────────────────────────────────────────────────────
  subscribers: router({
    list: adminProcedure
      .input(z.object({ source: z.enum(["newsletter", "worldfest"]).optional() }).optional())
      .query(({ input }) => getSubscribers(input?.source)),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteSubscriber(input.id)),
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
        ...antiSpamSchema,
      }).refine(
        data => data.instagram || data.tiktok || data.youtube || data.facebook || data.twitter,
        { message: 'Debes incluir al menos una red social' }
      ))
      .mutation(async ({ input, ctx }) => {
        await guardPublicForm(input, clientIp(ctx.req), { form: 'cosplay-apply', max: 3 });
        const { hp, elapsedMs, captchaToken, ...datos } = input;
        await createCosplayApplication(datos);
        try {
          const admins = await getAdminUsers();
          for (const admin of admins) {
            io.to(`user:${admin.id}`).emit('notification:new');
          }
        } catch { /* non-critical */ }
      }),

    /** El admin se activa a sí mismo como cosplayer para poder ver el panel */
    enableMyCosplayerProfile: adminProcedure.mutation(async ({ ctx }) => {
      const perfil = await ensureOwnCosplayerProfile(ctx.user.id, ctx.user.name ?? 'Admin', ctx.user.email ?? '-');
      return { ok: Boolean(perfil) };
    }),

    /** Estado de visibilidad del perfil interno del admin */
    myCosplayerVisibility: adminProcedure.query(({ ctx }) => getOwnCosplayerVisibility(ctx.user.id)),

    /** Mostrar u ocultar mi tarjeta en el directorio público */
    setMyCosplayerVisibility: adminProcedure
      .input(z.object({ visible: z.boolean() }))
      .mutation(({ ctx, input }) => setOwnCosplayerVisibility(ctx.user.id, input.visible)),

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
      .input(z.object({
        activityId: z.number(),
        evidenceUrl: z.string().min(1).max(500),
        phase: z.number().int().min(1).max(20).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const r = await submitCosplayActivity(ctx.user.id, input);

        const etiquetaFase = r.totalFases > 1
          ? `fase ${r.fase} de ${r.totalFases}`
          : 'la misión';

        // Aviso en la campanita del panel, con enlace a Evaluaciones
        try {
          await insertAdminNotification({
            type: 'new_user',
            title: r.completada && r.totalFases > 1
              ? `${r.artisticName} completó "${r.tituloMision}"`
              : `${r.artisticName} entregó ${etiquetaFase}`,
            body: `${r.tituloMision} · ${r.evidenceUrl}`,
          });
        } catch (e) { console.error('[Misión] No se pudo crear la notificación:', e); }

        // Correo al dueño, con el enlace de la publicación pinchable
        try {
          await notifyOwner({
            title: `${r.artisticName} entregó ${etiquetaFase} — ${r.tituloMision}`,
            content: `
              <p><strong>Cosplayer:</strong> ${r.artisticName}</p>
              <p><strong>Misión:</strong> ${r.tituloMision}</p>
              <p><strong>Progreso:</strong> ${r.fase} de ${r.totalFases}${r.completada ? ' — COMPLETADA' : ''}</p>
              <p><strong>Publicación:</strong> <a href="${r.evidenceUrl}">${r.evidenceUrl}</a></p>
              <p style="margin-top:16px">
                <a href="https://isekaiworld.co/admin?tab=cosplay&sub=evaluations">Revisar en el panel</a>
              </p>
            `,
          });
        } catch (e) { console.error('[Misión] No se pudo enviar el correo:', e); }

        try {
          const admins = await getAdminUsers();
          for (const admin of admins) io.to(`user:${admin.id}`).emit('notification:new');
        } catch { /* no crítico */ }

        return r;
      }),

    /** Entregas del cosplayer, para pintar la barra de progreso */
    getMyProgress: protectedProcedure.query(({ ctx }) => getMyActivityProgress(ctx.user.id)),

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
        /** Vacío = la misión no caduca */
        deadline: z.string().optional(),
        /** Entregas necesarias para completarla */
        phases: z.number().int().min(1).max(20).default(1),
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
      .query(async ({ ctx, input }) => {
        const codigo = input.code.toUpperCase();
        // Se avisa en el momento, no al confirmar la compra
        const motivo = await checkReferralEligibility(ctx.user?.id ?? null, codigo);
        if (motivo && motivo !== 'CODIGO_INVALIDO') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: MOTIVO_REFERIDO[motivo] });
        }
        return getCosplayerByReferralCode(codigo);
      }),

    requestWithdrawal: protectedProcedure
      .input(z.object({
        amount: z.number().min(20),
        paymentMethod: z.string().min(1).max(100),
        paymentDetails: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const cosplayer = await getCosplayerByUserId(ctx.user.id);
        if (!cosplayer) throw new TRPCError({ code: 'FORBIDDEN' });
        // El saldo del cosplayer se acredita en dólares por tramo de venta
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

    /** Al tocar una notificación se marca solo esa como leída */
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => markOrderNotificationRead(ctx.user.id, input.id)),

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
      .input(z.object({
        postId: z.number(),
        userId: z.number().optional(),
        guestName: z.string().max(200).optional(),
        guestEmail: z.string().email().optional(),
        content: z.string().min(1).max(2000),
        ...antiSpamSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        // Mismo antispam que el resto de formularios públicos
        await guardPublicForm(input, clientIp(ctx.req), { form: 'blog-comment', max: 4 });

        const { hp, elapsedMs, captchaToken, ...datos } = input;
        const creado = await createBlogComment({ ...datos, status: 'pending' });

        // Los comentarios nacen pendientes: sin aviso se quedaban sin publicar
        const autor = input.guestName ?? 'Alguien';
        const extracto = input.content.length > 120 ? input.content.slice(0, 120) + '…' : input.content;

        try {
          await insertAdminNotification({
            type: 'new_user',
            title: `${autor} comentó en el blog`,
            body: extracto,
          });
        } catch (e) { console.error('[Blog] No se pudo crear la notificación:', e); }

        try {
          await notifyOwner({
            title: `Nuevo comentario en el blog — ${autor}`,
            content: `
              <p><strong>De:</strong> ${autor}${input.guestEmail ? ` (${input.guestEmail})` : ''}</p>
              <p><strong>Comentario:</strong></p>
              <blockquote>${input.content}</blockquote>
              <p style="margin-top:16px">
                <a href="https://isekaiworld.co/admin?tab=blog&sub=comments">Revisar y publicar</a>
              </p>
              <p style="color:#888;font-size:13px">Queda pendiente hasta que lo apruebes.</p>
            `,
          });
        } catch (e) { console.error('[Blog] No se pudo enviar el correo:', e); }

        try {
          const admins = await getAdminUsers();
          for (const admin of admins) io.to(`user:${admin.id}`).emit('notification:new');
        } catch { /* no crítico */ }

        return creado;
      }),

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
