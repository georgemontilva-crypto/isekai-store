/**
 * Notificaciones via Resend — al owner y al cliente.
 *
 * Variables necesarias: RESEND_API_KEY, RESEND_FROM, OWNER_EMAIL
 */
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

/**
 * Envía un email de notificación al owner de la tienda.
 * Retorna true si fue exitoso, false si Resend no está configurado o falla.
 */
export async function notifyCustomerOrderStatus(
  userEmail: string,
  userName: string,
  orderNumber: string,
  title: string,
  body: string,
): Promise<boolean> {
  if (!ENV.resendApiKey) {
    console.warn("[Notification] Resend no configurado. Email al cliente omitido.");
    return false;
  }
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
      <div style="margin-bottom:24px">
        <span style="font-weight:700;font-size:16px;letter-spacing:-0.3px">ISEKAI WORLD</span>
      </div>
      <h2 style="font-size:20px;font-weight:700;margin:0 0 8px">${title}</h2>
      <p style="font-size:14px;color:#555;margin:0 0 4px">Hola, <strong>${userName}</strong></p>
      <p style="font-size:14px;color:#555;margin:0 0 24px">${body}</p>
      <a href="https://isekaiworld.co/account"
         style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:24px">
        Ver mi pedido
      </a>
      <p style="font-size:11px;color:#bbb;margin-top:32px">Pedido ${orderNumber} · ISEKAI WORLD</p>
    </div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ISEKAI WORLD <noreply@isekaiworld.co>",
        to: userEmail,
        subject: `[ISEKAI WORLD] ${title} — Pedido ${orderNumber}`,
        html,
      }),
    });
    if (!res.ok) {
      console.warn(`[Notification] Resend error al cliente (${res.status}):`, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Notification] Error enviando email al cliente:", err);
    return false;
  }
}

export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  if (!ENV.resendApiKey || !ENV.ownerEmail) {
    console.warn("[Notification] Resend no configurado (RESEND_API_KEY u OWNER_EMAIL vacíos). Notificación omitida.");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    "ISEKAI WORLD <noreply@isekaiworld.co>",
        to:      ENV.ownerEmail,
        subject: payload.title,
        text:    payload.content,
        html:    `<pre style="font-family:sans-serif;white-space:pre-wrap">${payload.content}</pre>`,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`[Notification] Resend error (${res.status}): ${detail}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[Notification] Error enviando email:", err);
    return false;
  }
}

export async function notifyWelcome(userEmail: string, userName: string): Promise<boolean> {
  if (!ENV.resendApiKey) {
    console.warn("[Notification] Resend no configurado. Email de bienvenida omitido.");
    return false;
  }
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
      <div style="margin-bottom:24px">
        <span style="font-weight:700;font-size:16px;letter-spacing:-0.3px">ISEKAI WORLD</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;margin:0 0 12px;color:#e5007d">¡Bienvenido, ${userName}!</h1>
      <p style="font-size:14px;color:#555;margin:0 0 8px">Tu cuenta en Isekai World ha sido creada exitosamente.</p>
      <p style="font-size:14px;color:#555;margin:0 0 24px">Explora nuestra tienda y encuentra tus figuras favoritas.</p>
      <a href="https://isekaiworld.co/catalog"
         style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:24px">
        Ver tienda →
      </a>
    </div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ISEKAI WORLD <noreply@isekaiworld.co>",
        to: userEmail,
        subject: "¡Bienvenido a Isekai World!",
        html,
      }),
    });
    if (!res.ok) {
      console.warn(`[Notification] Resend error bienvenida (${res.status}):`, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Notification] Error enviando email de bienvenida:", err);
    return false;
  }
}
