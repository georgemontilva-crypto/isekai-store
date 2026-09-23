/**
 * Notificaciones via Resend — al owner y al cliente.
 *
 * Variables necesarias: RESEND_API_KEY, RESEND_FROM, OWNER_EMAIL
 */
import { ENV } from "./env";

// ─── Constants ────────────────────────────────────────────────────────────────

export const APP_URL  = 'https://isekaiworld.co';
const INSTAGRAM = 'https://instagram.com/isekaistore';
const INSTAGRAM_DM = 'https://ig.me/m/isekaistore';

export type NotificationPayload = {
  title: string;
  content: string;
};

// ─── Logo de los correos ──────────────────────────────────────────────────────

/**
 * Logo que se usa en la cabecera de los correos.
 *
 * Orden: el «Logo para correos» del panel (email_logo_url), si no el logo de
 * la tienda (store_logo_url) siempre que no sea SVG —Gmail y Outlook no
 * muestran SVG—, y si no hay ninguno, el wordmark escrito en HTML.
 * Se consulta como mucho cada 10 minutos.
 */
let logoCorreo = "";
let logoRevisado = 0;

export async function refrescarLogoCorreo(): Promise<void> {
  if (Date.now() - logoRevisado < 10 * 60 * 1000) return;
  logoRevisado = Date.now();
  try {
    // Import dinámico: db.ts también importa este archivo
    const { getDb } = await import("../db");
    const { siteSettings } = await import("../../drizzle/schema");
    const { inArray } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return;
    const filas = await db.select().from(siteSettings)
      .where(inArray(siteSettings.key, ["email_logo_url", "store_logo_url"]));
    const valor = (k: string) => (filas.find(f => f.key === k)?.value ?? "").trim();
    const esImagenCorreo = (u: string) => /^https?:\/\//.test(u) && !/\.svg(\?|$)/i.test(u);
    logoCorreo = esImagenCorreo(valor("email_logo_url")) ? valor("email_logo_url")
      : esImagenCorreo(valor("store_logo_url")) ? valor("store_logo_url")
      : "";
  } catch (e) {
    console.warn("[Email] No se pudo leer el logo:", e);
  }
}

/** Wordmark en HTML: se ve en cualquier cliente de correo, sin imágenes */
const WORDMARK = `<span style="font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:30px;font-weight:900;font-style:italic;letter-spacing:-0.5px;line-height:1">`
  + `<span style="color:#e5007d">ISEKAI</span><span style="color:#ffffff">WORLD</span></span>`;

// ─── Base template ────────────────────────────────────────────────────────────

/**
 * Plantilla de todos los correos, con el estilo del sitio: oscura de borde a
 * borde (el fondo del correo y el de la tarjeta son del mismo tono, así en
 * el teléfono no quedan franjas a los lados), línea de energía rosa→púrpura,
 * esquinas biseladas y etiquetas tipo [ SISTEMA ].
 *
 * Los biseles se dibujan con triángulos de borde CSS (funcionan en Gmail,
 * Apple Mail y Outlook), no con clip-path, que los correos no soportan.
 */
const FONDO = "#06040d";
const TARJETA = "#0f0a1f";

export function emailTemplate(content: string, previewText: string = ''): string {
  const logo = logoCorreo
    ? `<img src="${logoCorreo}" alt="Isekai World" height="40" style="height:40px;width:auto;max-width:260px;border:0;display:inline-block" />`
    : WORDMARK;
  const bisel = (pos: "arriba" | "abajo") => pos === "arriba"
    ? `<div style="width:0;height:0;border-top:18px solid ${FONDO};border-right:18px solid transparent;line-height:0;font-size:0"></div>`
    : `<div style="width:0;height:0;border-bottom:18px solid ${FONDO};border-left:18px solid transparent;line-height:0;font-size:0;margin-left:auto"></div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="color-scheme" content="dark light"/>
  <meta name="supported-color-schemes" content="dark light"/>
  <title>Isekai World</title>
  <style>
    body { margin:0; padding:0; background:${FONDO}; }
    .body-cell { padding:34px 36px 30px; }
    .btn { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; display:inline-block; background:#e5007d; color:#ffffff !important; text-decoration:none; padding:15px 34px; font-weight:800; font-size:14px; letter-spacing:1.5px; text-transform:uppercase; margin:22px 0; border-bottom:3px solid #9d0056; }
    .divider { border:none; border-top:1px solid #2a2140; margin:24px 0; }
    .badge { display:inline-block; background:#1d1438; padding:6px 12px; font-size:13px; color:#d8d0ea; margin:4px; border-left:2px solid #a78bfa; }
    h1 { font-family:'Arial Black',Arial,Helvetica,sans-serif; font-size:25px; font-weight:900; color:#ffffff; line-height:1.25; margin:0 0 14px; }
    p { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; color:#c9c3dd; line-height:1.7; margin:0 0 12px; }
    strong { color:#ffffff; }
    .highlight { color:#ff4fa8; font-weight:700; }
    .order-box { background:#170f2e; border-left:3px solid #a78bfa; padding:18px 20px; margin:20px 0; }
    .order-box p { margin:5px 0; font-size:14px; }
    a { color:#ff4fa8; }
    @media (max-width:600px) {
      .body-cell { padding:26px 20px 24px !important; }
      h1 { font-size:22px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${FONDO}">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${previewText}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${FONDO}">
    <tr><td align="center" style="padding:0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${FONDO}">

        <!-- Línea de energía -->
        <tr><td style="height:4px;line-height:4px;font-size:0;background:#e5007d;background-image:linear-gradient(90deg,#e5007d,#a78bfa,#38bdf8)">&nbsp;</td></tr>

        <!-- Cabecera -->
        <tr><td align="center" style="padding:30px 20px 10px">
          <a href="${APP_URL}" style="text-decoration:none">${logo}</a>
        </td></tr>
        <tr><td align="center" style="padding:0 20px 24px;font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:4px;color:#a78bfa">
          [ SISTEMA ]
        </td></tr>

        <!-- Tarjeta con esquinas biseladas -->
        <tr><td style="background:${TARJETA};padding:0">
          ${bisel("arriba")}
          <div class="body-cell" style="padding:34px 36px 30px">
            ${content}
          </div>
          ${bisel("abajo")}
        </td></tr>

        <!-- Pie -->
        <tr><td align="center" style="padding:30px 20px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
          <p style="margin:0 0 14px;font-size:13px">
            <a href="${INSTAGRAM}" style="color:#d8d0ea;text-decoration:none;margin:0 8px">Instagram</a>
            <span style="color:#3a3052">◆</span>
            <a href="${INSTAGRAM_DM}" style="color:#d8d0ea;text-decoration:none;margin:0 8px">Escríbenos</a>
            <span style="color:#3a3052">◆</span>
            <a href="${APP_URL}" style="color:#d8d0ea;text-decoration:none;margin:0 8px">Tienda</a>
          </p>
          <p style="margin:0 0 6px;color:#7c6fa0;font-size:12px">© ${new Date().getFullYear()} Isekai World. Todos los derechos reservados.</p>
          <p style="margin:0;font-size:12px">
            <a href="${APP_URL}/politicas" style="color:#7c6fa0">Políticas de privacidad</a>
            <span style="color:#3a3052"> · </span>
            <a href="${APP_URL}/faq" style="color:#7c6fa0">Preguntas frecuentes</a>
          </p>
        </td></tr>
        <tr><td style="height:3px;line-height:3px;font-size:0;background:#a78bfa;background-image:linear-gradient(90deg,#38bdf8,#a78bfa,#e5007d)">&nbsp;</td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── sendEmail helper ─────────────────────────────────────────────────────────

export async function sendEmail(to: string, subject: string, content: string, previewText?: string): Promise<boolean> {
  if (!ENV.resendApiKey) return false;
  await refrescarLogoCorreo();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ISEKAI WORLD <noreply@isekaiworld.co>",
        to,
        subject,
        html: emailTemplate(content, previewText),
      }),
    });
    if (!res.ok) {
      console.warn(`[Email] Resend error (${res.status}):`, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Email] Error al enviar:", err);
    return false;
  }
}

// ─── notifyWelcome ────────────────────────────────────────────────────────────

export async function notifyWelcome(userEmail: string, userName: string): Promise<boolean> {
  const content = `
    <h1>¡Bienvenido al portal, <span class="highlight">${userName}</span>! 🎮</h1>
    <p>Tu cuenta en <strong>Isekai World</strong> ha sido creada exitosamente. Ahora puedes explorar nuestra colección de figuras impresas en 3D inspiradas en tus universos favoritos.</p>
    <hr class="divider"/>
    <p><strong>¿Qué puedes hacer?</strong></p>
    <p>🛍️ Explorar productos exclusivos<br/>
    📦 Hacer seguimiento de tus pedidos<br/>
    ⭐ Guardar tus favoritos<br/>
    💬 Contactarnos por Instagram</p>
    <div style="text-align:center">
      <a href="${APP_URL}/catalog" class="btn">Explorar la tienda →</a>
    </div>
    <hr class="divider"/>
    <p style="font-size:13px;color:#999">Si no creaste esta cuenta, ignora este mensaje.</p>
  `;
  return sendEmail(userEmail, '¡Bienvenido a Isekai World! 🎮', content, '¡Tu cuenta está lista! Explora nuestra tienda de figuras 3D.');
}

// ─── notifyCustomerOrderStatus ────────────────────────────────────────────────

export async function notifyCustomerOrderStatus(
  userEmail: string,
  userName: string,
  orderNumber: string,
  title: string,
  body: string,
): Promise<boolean> {
  const content = `
    <h1>${title}</h1>
    <p>Hola <strong>${userName}</strong>, te informamos sobre el estado de tu pedido.</p>
    <div class="order-box">
      <p><strong>N° de orden:</strong> <span class="highlight">${orderNumber}</span></p>
      <p style="margin-top:8px">${body}</p>
    </div>
    <p>Puedes ver el detalle completo y el seguimiento en tiempo real desde tu cuenta.</p>
    <div style="text-align:center">
      <a href="${APP_URL}/account" class="btn">Ver mi pedido →</a>
    </div>
    <hr class="divider"/>
    <p style="font-size:13px;color:#999">¿Tienes alguna duda? Escríbenos por Instagram y te ayudamos enseguida.</p>
  `;
  return sendEmail(userEmail, `${title} — Pedido ${orderNumber}`, content, body);
}

// ─── sendMagicLinkEmail ───────────────────────────────────────────────────────

export async function sendMagicLinkEmail(userEmail: string, verifyUrl: string): Promise<boolean> {
  const content = `
    <h1>Tu enlace de acceso 🔐</h1>
    <p>Hola, recibiste este correo porque solicitaste iniciar sesión en <strong>Isekai World</strong>.</p>
    <p>Haz clic en el botón para acceder. Este enlace expira en <strong>15 minutos</strong>.</p>
    <div style="text-align:center">
      <a href="${verifyUrl}" class="btn">Iniciar sesión →</a>
    </div>
    <hr class="divider"/>
    <div class="order-box">
      <p style="font-size:13px">🔗 Si el botón no funciona, copia este enlace:</p>
      <p style="font-size:12px;word-break:break-all;color:#e5007d">${verifyUrl}</p>
    </div>
    <p style="font-size:13px;color:#999">Si no solicitaste este acceso, ignora este mensaje. Tu cuenta está segura.</p>
  `;
  return sendEmail(userEmail, 'Tu enlace de acceso a Isekai World', content, 'Tu enlace de acceso expira en 15 minutos.');
}

// ─── notifyOwner ──────────────────────────────────────────────────────────────

export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  if (!ENV.ownerEmail) {
    console.warn("[Notification] OWNER_EMAIL no configurado. Notificación omitida.");
    return false;
  }
  const content = `
    <h1>📬 ${payload.title}</h1>
    <div class="order-box">
      <p>${payload.content}</p>
    </div>
    <div style="text-align:center">
      <a href="${APP_URL}/admin" class="btn">Ver en el panel →</a>
    </div>
  `;
  return sendEmail(ENV.ownerEmail, payload.title, content);
}

// ─── notifyCosplayApproved ────────────────────────────────────────────────────

const COSPLAY_TIER_MULTIPLIERS: Record<string, number> = {
  bronce: 1, plata: 1.5, oro: 2, diamante: 3, platino: 5,
};

export async function notifyCosplayApproved(
  userEmail: string,
  fullName: string,
  artisticName: string,
  tier: string,
): Promise<boolean> {
  const multiplier = COSPLAY_TIER_MULTIPLIERS[tier] ?? 1;
  const content = `
    <h1>¡Bienvenido al <span class="highlight">Cosplay Guild</span>!</h1>
    <p>Hola <strong>${fullName}</strong>, tu solicitud para unirte al programa de cosplayers aliados de Isekai World ha sido <strong style="color:#e5007d">aprobada</strong>.</p>
    <div class="order-box">
      <p><strong>Nombre artístico:</strong> ${artisticName}</p>
      <p><strong>Tier asignado:</strong> ${tier.toUpperCase()}</p>
      <p><strong>Multiplicador de tickets:</strong> ×${multiplier}</p>
    </div>
    <p>Tu kit de bienvenida está siendo preparado. Puedes ver el estado del envío desde tu dashboard.</p>
    <p><strong>¿Qué sigue?</strong><br/>
    Ingresa a tu cuenta y accede al dashboard para ver las actividades disponibles, acumular tickets y canjearlos por descuentos exclusivos.</p>
    <div style="text-align:center">
      <a href="${APP_URL}/cosplay/dashboard" class="btn">Ir a mi dashboard →</a>
    </div>
    <hr class="divider"/>
    <p style="font-size:13px;color:#999">¿Tienes dudas? Escríbenos por Instagram y te ayudamos.</p>
  `;
  return sendEmail(
    userEmail,
    '¡Bienvenido al Cosplay Guild de Isekai World!',
    content,
    'Tu solicitud fue aprobada. ¡Empieza a ganar tickets!',
  );
}

// ─── notifyCosplayRejected ────────────────────────────────────────────────────

export async function notifyCosplayRejected(
  userEmail: string,
  fullName: string,
  reason: string,
): Promise<boolean> {
  const content = `
    <h1>Actualización sobre tu solicitud</h1>
    <p>Hola <strong>${fullName}</strong>, hemos revisado tu solicitud para unirte al Cosplay Guild de Isekai World.</p>
    <div class="order-box">
      <p>En esta ocasión no podemos aprobar tu solicitud por el siguiente motivo:</p>
      <p style="margin-top:8px;font-style:italic;color:#c9c3dd">"${reason}"</p>
    </div>
    <p>Esto no significa que no puedas volver a intentarlo en el futuro. Te invitamos a seguir creciendo tu comunidad y volver a postularte cuando cumplas los requisitos.</p>
    <div style="text-align:center">
      <a href="${APP_URL}/cosplay" class="btn">Ver requisitos →</a>
    </div>
    <hr class="divider"/>
    <p style="font-size:13px;color:#999">¿Tienes alguna pregunta? Escríbenos por Instagram.</p>
  `;
  return sendEmail(
    userEmail,
    'Actualización de tu solicitud — Cosplay Guild Isekai World',
    content,
    'Hemos revisado tu solicitud al Cosplay Guild.',
  );
}

export async function notifyCosplayReferralEarned(
  userEmail: string,
  artisticName: string,
  cashReward: number,
  orderNumber: string,
): Promise<boolean> {
  const content = `
    <h1>¡Nuevo ingreso en tu billetera!</h1>
    <p>Hola <strong>${artisticName}</strong>, una persona usó tu código de referido y completó una compra.</p>
    <div class="order-box">
      <p><strong>Cash acreditado:</strong> <span class="highlight">$${cashReward.toFixed(2)} USD</span></p>
      <p><strong>Orden:</strong> ${orderNumber}</p>
    </div>
    <div style="text-align:center">
      <a href="${APP_URL}/cosplay/dashboard" class="btn">Ver mi billetera →</a>
    </div>
  `;
  return sendEmail(
    userEmail,
    '💵 ¡Ganaste cash por referido!',
    content,
    `+$${cashReward.toFixed(2)} USD en tu billetera`,
  );
}

// ─── notifyCosplayTicketsGranted ─────────────────────────────────────────────

export async function notifyCosplayTicketsGranted(
  userEmail: string,
  artisticName: string,
  finalPoints: number,
  basePoints: number,
  multiplier: number,
  tier: string,
  newBalance: number,
  reason: string,
): Promise<boolean> {
  const content = `
    <h1>¡Nuevos tickets en tu billetera!</h1>
    <p>Hola <strong>${artisticName}</strong>, el equipo de Isekai World te ha otorgado tickets.</p>
    <div class="order-box">
      <p><strong>Tickets recibidos:</strong> <span class="highlight">${finalPoints} tickets</span></p>
      <p><strong>Puntos base:</strong> ${basePoints} × ${multiplier} (tier ${tier})</p>
      <p><strong>Motivo:</strong> ${reason}</p>
      <p><strong>Balance actual:</strong> ${newBalance} tickets</p>
    </div>
    <p>Recuerda que puedes canjear tus tickets por códigos de descuento desde tu dashboard.</p>
    <div style="text-align:center">
      <a href="${APP_URL}/cosplay/dashboard" class="btn">Ver mi billetera →</a>
    </div>
  `;
  return sendEmail(
    userEmail,
    '🎫 ¡Recibiste tickets en tu billetera!',
    content,
    `+${finalPoints} tickets en tu billetera Isekai`,
  );
}

// ─── notifyCosplayActivity ────────────────────────────────────────────────────

export async function notifyCosplayActivity(
  userEmail: string,
  artisticName: string,
  tier: string,
  activity: { title: string; description?: string | null; deadline?: string | null; type?: string; basePoints?: number; phases?: number },
  opciones: { actualizada?: boolean } = {},
): Promise<boolean> {
  const act = opciones.actualizada === true;
  const multiplier = COSPLAY_TIER_MULTIPLIERS[tier] ?? 1;
  const pointsWouldEarn = Math.round((activity.basePoints ?? 0) * multiplier);
  const content = `
    <h1>${act ? 'Misión actualizada' : 'Nueva actividad disponible'}</h1>
    <p>Hola <strong>${artisticName}</strong>, ${act
      ? 'actualizamos una misión del Cosplay Guild. Revisa los detalles: pueden haber cambiado la fecha, los puntos o la descripción.'
      : 'hay una nueva actividad publicada en el Cosplay Guild.'}</p>
    <div class="order-box">
      <p><strong>Actividad:</strong> ${activity.title}</p>
      ${activity.description ? `<p><strong>Descripción:</strong> ${activity.description}</p>` : ''}
      ${activity.deadline
        ? `<p><strong>Fecha límite:</strong> ${new Date(activity.deadline).toLocaleString('es-VE', { timeZone: 'America/Caracas', dateStyle: 'long', timeStyle: 'short' })}</p>`
        : (act ? '<p><strong>Fecha límite:</strong> sin fecha límite</p>' : '')}
      ${(activity.phases ?? 1) > 1 ? `<p><strong>Fases:</strong> ${activity.phases} entregas</p>` : ''}
      <p><strong>Tipo:</strong> ${activity.type ?? '—'}</p>
      <p><strong>Puntos base:</strong> ${activity.basePoints ?? 0}</p>
      <p><strong>Tus puntos (×${multiplier} tier ${tier}):</strong> <span class="highlight">${pointsWouldEarn} tickets</span></p>
    </div>
    <p>Entra a tu dashboard para ver los detalles y registrar tu evidencia una vez que la completes.</p>
    <div style="text-align:center">
      <a href="${APP_URL}/cosplay/dashboard" class="btn">Ver actividad →</a>
    </div>
    <hr class="divider"/>
    <p style="font-size:13px;color:#999">
      Recuerda: dejar 3 actividades consecutivas sin registrar resultará en tu baja del programa.
    </p>
  `;
  return sendEmail(
    userEmail,
    act ? `Misión actualizada — ${activity.title}` : `Nueva actividad — ${activity.title}`,
    content,
    act
      ? `Revisa los cambios de la misión ${activity.title}`
      : `Nueva actividad disponible: ${activity.title} — ${pointsWouldEarn} tickets para ti`,
  );
}

/**
 * Correo de activación para una tienda autorizada a vender boletos.
 *
 * Sin esto, había que pasarle el enlace por WhatsApp y explicarle a mano cómo
 * entrar y cómo vender.
 */
export async function notifyStoreActivated(
  storeEmail: string,
  storeName: string,
  eventName?: string,
): Promise<boolean> {
  const url = "https://isekaiworld.co/vender";
  const content = `
    <h1>Tu tienda ya puede vender boletos</h1>
    <p>Hola <strong>${storeName}</strong>, quedaste autorizada como punto de venta
    ${eventName ? `de <strong>${eventName}</strong>` : "de nuestros eventos"}.</p>

    <div class="order-box">
      <p><strong>Cómo entrar</strong></p>
      <p style="margin-top:8px">
        Entra en <a href="${url}">isekaiworld.co/vender</a> con <strong>este mismo correo</strong>
        (${storeEmail}). No necesitas contraseña: te llegará un enlace de acceso a tu buzón.
      </p>
    </div>

    <div class="order-box">
      <p><strong>Cómo vender un boleto</strong></p>
      <p style="margin-top:8px">
        1. Escanea el código QR del boleto con la cámara del teléfono.<br>
        2. Elige el tipo de boleto que compró el cliente.<br>
        3. Registra su nombre, apellido y teléfono.<br>
        4. Confirma. Listo.
      </p>
      <p style="margin-top:8px; color:#888; font-size:13px">
        Revisa bien los datos antes de confirmar: una vez registrado, el boleto no se puede editar.
      </p>
    </div>

    <p style="margin-top:20px">
      <a href="${url}" class="btn">Entrar al portal de venta</a>
    </p>

    <p style="color:#888; font-size:13px; margin-top:16px">
      En el portal verás en todo momento cuántos boletos llevas vendidos y el total acumulado.
    </p>
  `;
  return sendEmail(
    storeEmail,
    "Tu tienda ya puede vender boletos — Isekai World",
    content,
    "Ya estás autorizada como punto de venta. Entra con este correo.",
  );
}

/**
 * Enlace de pago para el cliente.
 *
 * Se envía al crear el pedido a medida: lleva el resumen, el importe y el
 * botón para pagar. Si hay abono configurado, se dice claramente cuánto se
 * paga ahora y cuánto queda.
 */
export async function notifyQuoteReady(
  email: string,
  nombre: string,
  datos: {
    quoteNumber: string;
    title: string;
    total: string;
    token: string;
    depositPercent?: number;
    expiresAt?: Date | string | null;
  },
): Promise<boolean> {
  const url = `https://isekaiworld.co/cotizacion/${datos.token}`;
  const total = parseFloat(datos.total) || 0;
  const pct = datos.depositPercent ?? 100;
  const abono = pct < 100 ? Math.round(total * (pct / 100) * 100) / 100 : null;

  const vence = datos.expiresAt ? new Date(datos.expiresAt) : null;

  const content = `
    <h1>Tu pedido está listo para pagar</h1>
    <p>Hola <strong>${nombre || "de nuevo"}</strong>, preparamos tu pedido:</p>

    <div class="order-box">
      <p><strong>${datos.title}</strong></p>
      <p style="margin-top:8px"><strong>N° de pedido:</strong> <span class="highlight">${datos.quoteNumber}</span></p>
      <p style="margin-top:8px"><strong>Total:</strong> $${total.toFixed(2)} USD</p>
      ${abono != null ? `
        <p style="margin-top:8px">
          <strong>Para empezar:</strong> $${abono.toFixed(2)} USD (${pct}%)<br>
          <span style="color:#888; font-size:13px">
            El resto, $${(total - abono).toFixed(2)}, lo pagas antes de la entrega.
          </span>
        </p>` : ""}
    </div>

    <p style="margin-top:20px">
      <a href="${url}" class="btn">Ver y pagar mi pedido</a>
    </p>

    <p style="color:#888; font-size:13px; margin-top:16px">
      En ese enlace verás los datos para pagar y podrás subir tu comprobante.
      Si tienes un cupón, ahí mismo puedes aplicarlo.
      ${vence ? `<br>El enlace está disponible hasta el ${vence.toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" })}.` : ""}
    </p>
  `;

  return sendEmail(
    email,
    `Tu pedido ${datos.quoteNumber} está listo — Isekai World`,
    content,
    "Ya puedes pagar tu pedido desde este enlace.",
  );
}

/**
 * Acceso para el personal del evento.
 *
 * Sirve tanto para quien otorga experiencia como para quien controla la
 * puerta: cambian el enlace y las instrucciones, no el formato.
 */
export async function notifyStaffActivated(
  email: string,
  nombre: string,
  tipo: "xp" | "puerta",
  eventName?: string,
): Promise<boolean> {
  const esPuerta = tipo === "puerta";
  const url = esPuerta ? "https://isekaiworld.co/acceso" : "https://isekaiworld.co/vender";

  const pasos = esPuerta
    ? `1. Antes de que abra el evento, entra y pulsa <strong>Descargar</strong> para tener la lista de boletos.<br>
       2. Escanea el QR de cada asistente con la cámara.<br>
       3. La pantalla te dirá <strong>ADELANTE</strong>, <strong>YA ENTRÓ</strong> o <strong>NO PASA</strong>.<br>
       4. Funciona sin señal: los ingresos se envían solos cuando vuelva la conexión.`
    : `1. Elige la actividad que acaba de completar la persona.<br>
       2. Escanea el QR de su boleto con la cámara.<br>
       3. Listo. Verás sus puntos y si subió de rango.<br>
       4. La actividad se queda elegida, así puedes atender a varias personas seguidas.`;

  const content = `
    <h1>Ya tienes acceso${eventName ? ` a ${eventName}` : ""}</h1>
    <p>Hola <strong>${nombre}</strong>, te sumamos al equipo del evento como
    ${esPuerta ? "<strong>control de acceso</strong>" : "<strong>personal de actividades</strong>"}.</p>

    <div class="order-box">
      <p><strong>Cómo entrar</strong></p>
      <p style="margin-top:8px">
        Entra en <a href="${url}">${url.replace("https://", "")}</a> con
        <strong>este mismo correo</strong> (${email}). No necesitas contraseña:
        recibirás un enlace de acceso en tu buzón.
      </p>
    </div>

    <div class="order-box">
      <p><strong>Cómo funciona</strong></p>
      <p style="margin-top:8px">${pasos}</p>
    </div>

    <p style="margin-top:20px">
      <a href="${url}" class="btn">Entrar</a>
    </p>

    <p style="color:#888; font-size:13px; margin-top:16px">
      El acceso se activa durante los días del evento. Si entras antes y no ves nada,
      es normal.
    </p>
  `;

  return sendEmail(
    email,
    `Tu acceso al evento — Isekai World`,
    content,
    "Ya tienes acceso al sistema del evento.",
  );
}

/**
 * Confirmación de compra de boleto.
 *
 * Le llega al asistente en el momento de la venta. Además del comprobante,
 * le explica cómo entrar a su perfil de cazador: es el primer contacto con
 * la mecánica del evento y conviene que se entienda desde ya.
 */
export async function notifyTicketPurchased(
  email: string,
  datos: {
    nombre: string;
    codigo: string;
    evento: string;
    tipo: string;
    precioUsd: string;
    tienda?: string;
    fechas?: string;
  },
): Promise<boolean> {
  const content = `
    <h1>Tu boleto está confirmado</h1>
    <p>Hola <strong>${datos.nombre}</strong>, guarda este correo: es el comprobante de tu entrada.</p>

    <div class="order-box">
      <p><strong>${datos.evento}</strong></p>
      <p style="margin-top:8px"><strong>Código de tu boleto:</strong></p>
      <p style="font-size:22px; font-weight:800; letter-spacing:2px; margin-top:4px" class="highlight">
        ${datos.codigo}
      </p>
      <p style="margin-top:12px"><strong>Tipo:</strong> ${datos.tipo}</p>
      <p style="margin-top:6px"><strong>Pagado:</strong> $${parseFloat(datos.precioUsd || "0").toFixed(2)} USD</p>
      ${datos.tienda ? `<p style="margin-top:6px"><strong>Punto de venta:</strong> ${datos.tienda}</p>` : ""}
      ${datos.fechas ? `<p style="margin-top:6px"><strong>Fechas:</strong> ${datos.fechas}</p>` : ""}
    </div>

    <div class="order-box">
      <p><strong>El día del evento</strong></p>
      <p style="margin-top:8px">
        Lleva el boleto impreso o este correo. En la entrada escanearán tu código QR.
      </p>
    </div>

    <div class="order-box">
      <p><strong>Tu perfil de cazador</strong></p>
      <p style="margin-top:8px">
        Todos empiezan en rango E. Durante el evento podrás completar misiones para ganar
        experiencia y subir de rango — y solo quienes lleguen a rango S entran en el sorteo final.
      </p>
      <p style="margin-top:8px">
        Entra en <a href="https://isekaiworld.co/worldfest/pass">isekaiworld.co/worldfest/pass</a>
        con <strong>este mismo correo</strong> para ver tu progreso.
      </p>
    </div>

    <p style="margin-top:20px">
      <a href="https://isekaiworld.co/worldfest/pass" class="btn">Ver mi perfil de cazador</a>
    </p>

    <p style="color:#888; font-size:13px; margin-top:16px">
      Si no reconoces esta compra, escríbenos a hola@isekaiworld.co.
    </p>
  `;

  return sendEmail(
    email,
    `Boleto confirmado ${datos.codigo} — ${datos.evento}`,
    content,
    `Tu boleto ${datos.codigo} está confirmado.`,
  );
}

// ─── notifyMisionAceptada ─────────────────────────────────────────────────────

/**
 * Confirmación para quien se apunta a la lista de acceso del World Fest
 * («¿Aceptas la misión?»). Solo se envía la primera vez que se registra
 * ese correo, para que el formulario no sirva para bombardear a nadie.
 */
export async function notifyMisionAceptada(email: string): Promise<boolean> {
  const content = `
    <p style="font-size:12px;letter-spacing:.3em;color:#a78bfa;margin:0 0 8px">[ NUEVA MISIÓN ACEPTADA ]</p>
    <h1>✅ Estás dentro, cazador</h1>
    <p>Tu lugar en la lista de acceso de <span class="highlight">Isekai World Fest 2027</span> quedó registrado.
    Cuando se abran las entradas, <strong>serás de los primeros en saberlo</strong>.</p>
    <div class="order-box">
      <p style="margin:0">📅 <strong>14 y 15 de agosto de 2027</strong><br/>📍 Maracaibo, Venezuela</p>
    </div>
    <p>Mientras tanto, el <strong>Guardián del Portal</strong> ya despertó: toda la comunidad lo está atacando y,
    cuando caiga, todos los que participaron recibirán un premio.</p>
    <div style="text-align:center"><a href="${APP_URL}/#raid" class="btn">Atacar al Guardián →</a></div>
    <hr class="divider"/>
    <p style="font-size:13px;color:#999">EN: Quest accepted! You're on the Isekai World Fest 2027 early-access list
    (August 14–15, 2027 · Maracaibo, Venezuela). You'll be among the first to know when tickets open.</p>
    <p style="font-size:12px;color:#aaa">Si no fuiste tú quien se registró, ignora este correo.</p>
  `;
  return sendEmail(email, "✅ Misión aceptada — Isekai World Fest 2027", content, "Estás en la lista de acceso. Serás de los primeros en saberlo.");
}

