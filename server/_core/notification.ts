/**
 * Notificaciones via Resend — al owner y al cliente.
 *
 * Variables necesarias: RESEND_API_KEY, RESEND_FROM, OWNER_EMAIL
 */
import { ENV } from "./env";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOGO_URL = 'https://pub-c4fd9395c33848c3be4160fe5f9532a4.r2.dev/isekai-world/banner/Favicon-11%20grande-11.png';
const APP_URL  = 'https://isekaiworld.co';
const WHATSAPP = 'https://wa.me/584121133899';

export type NotificationPayload = {
  title: string;
  content: string;
};

// ─── Base template ────────────────────────────────────────────────────────────

function emailTemplate(content: string, previewText: string = ''): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Isekai World</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .wrapper { max-width:600px; margin:0 auto; padding:24px 16px; }
    .card { background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
    .header { background:#0d0d0d; padding:32px 40px; text-align:center; }
    .header img { height:48px; width:auto; object-fit:contain; }
    .body { padding:40px; }
    .footer { background:#0d0d0d; padding:24px 40px; text-align:center; }
    .btn { display:inline-block; background:#e5007d; color:#ffffff !important; text-decoration:none; padding:14px 32px; border-radius:50px; font-weight:700; font-size:15px; margin:24px 0; }
    .divider { border:none; border-top:1px solid #f0f0f0; margin:24px 0; }
    .badge { display:inline-block; background:#f4f4f5; border-radius:8px; padding:6px 14px; font-size:13px; color:#555; margin:4px; }
    h1 { font-size:26px; font-weight:800; color:#0d0d0d; line-height:1.3; margin-bottom:12px; }
    p { font-size:15px; color:#555; line-height:1.7; margin-bottom:12px; }
    .highlight { color:#e5007d; font-weight:700; }
    .order-box { background:#f8f8f8; border-radius:12px; padding:20px; margin:20px 0; }
    .order-box p { margin:4px 0; font-size:14px; }
    .social-links { margin:16px 0; }
    .social-links a { display:inline-block; margin:0 8px; color:#aaa !important; font-size:13px; text-decoration:none; }
    .footer p { color:#666; font-size:12px; line-height:1.6; }
    .footer a { color:#aaa !important; text-decoration:none; }
    @media(max-width:600px){
      .body { padding:24px 20px; }
      .header { padding:24px 20px; }
      h1 { font-size:22px; }
    }
  </style>
</head>
<body>
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden">${previewText}</div>` : ''}
  <div class="wrapper">
    <div class="card">

      <!-- HEADER -->
      <div class="header">
        <img src="${LOGO_URL}" alt="Isekai World" />
      </div>

      <!-- BODY -->
      <div class="body">
        ${content}
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="social-links">
          <a href="https://instagram.com/isekaistore">📸 Instagram</a>
          <a href="${WHATSAPP}">💬 WhatsApp</a>
          <a href="${APP_URL}">🌐 Tienda</a>
        </div>
        <hr style="border:none;border-top:1px solid #222;margin:16px 0"/>
        <p>© ${new Date().getFullYear()} Isekai World. Todos los derechos reservados.</p>
        <p style="margin-top:6px">
          <a href="${APP_URL}/politicas">Políticas de privacidad</a> ·
          <a href="${APP_URL}/faq">Preguntas frecuentes</a>
        </p>
        <p style="margin-top:10px;color:#444;font-size:11px">
          Isekai World — Impresión 3D Anime &amp; Gaming · isekaiworld.co
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

// ─── sendEmail helper ─────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, content: string, previewText?: string): Promise<boolean> {
  if (!ENV.resendApiKey) return false;
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
    💬 Contactarnos por WhatsApp</p>
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
    <p style="font-size:13px;color:#999">¿Tienes alguna duda? Escríbenos por WhatsApp y te ayudamos enseguida.</p>
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
