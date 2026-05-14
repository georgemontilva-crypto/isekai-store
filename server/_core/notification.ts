/**
 * Notificaciones al owner — via Resend.
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
        from:    ENV.resendFrom,
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
