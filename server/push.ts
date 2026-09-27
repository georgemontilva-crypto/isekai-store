import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { pushSuscripciones, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

/**
 * Notificaciones push: llegan al teléfono aunque la app esté cerrada, como
 * en una app normal. Funcionan con la web instalada (en iPhone, desde
 * «Agregar a pantalla de inicio», iOS 16.4 o superior) y en Android/PC.
 *
 * Cada dispositivo que acepta queda guardado; si el navegador informa que
 * la suscripción ya no existe (404/410), se borra sola.
 */
let configurado: boolean | null = null;
function configurar(): boolean {
  if (configurado !== null) return configurado;
  configurado = !!(ENV.vapidPublicKey && ENV.vapidPrivateKey);
  if (configurado) webpush.setVapidDetails(ENV.vapidSubject, ENV.vapidPublicKey, ENV.vapidPrivateKey);
  else console.warn("[Push] Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY: las notificaciones push están apagadas");
  return configurado;
}

export function clavePublicaPush(): { clave: string | null } {
  return { clave: configurar() ? ENV.vapidPublicKey : null };
}

export async function guardarSuscripcion(userId: number, s: { endpoint: string; keys: { p256dh: string; auth: string } }, dispositivo: string) {
  const db = await getDb();
  if (!db) throw new Error("Sin base de datos");
  await db.insert(pushSuscripciones)
    .values({ userId, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, dispositivo: dispositivo.slice(0, 200) })
    // El mismo dispositivo con otra cuenta: pasa a la cuenta actual
    .onDuplicateKeyUpdate({ set: { userId, p256dh: s.keys.p256dh, auth: s.keys.auth, dispositivo: dispositivo.slice(0, 200) } });
  return { ok: true };
}

export async function borrarSuscripcion(userId: number, endpoint: string) {
  const db = await getDb();
  if (!db) return { ok: false };
  const [f] = await db.select({ userId: pushSuscripciones.userId }).from(pushSuscripciones).where(eq(pushSuscripciones.endpoint, endpoint)).limit(1);
  if (f && f.userId === userId) await db.delete(pushSuscripciones).where(eq(pushSuscripciones.endpoint, endpoint));
  return { ok: true };
}

export type AvisoPush = { titulo: string; cuerpo: string; url?: string; etiqueta?: string };

async function enviarA(filas: { endpoint: string; p256dh: string; auth: string }[], aviso: AvisoPush): Promise<number> {
  if (!configurar() || filas.length === 0) return 0;
  const db = await getDb();
  const payload = JSON.stringify({
    title: aviso.titulo.slice(0, 120),
    body: aviso.cuerpo.slice(0, 300),
    url: aviso.url && aviso.url.startsWith("/") ? aviso.url : "/",
    tag: aviso.etiqueta,
  });
  let enviados = 0;
  await Promise.all(filas.map(async f => {
    try {
      await webpush.sendNotification({ endpoint: f.endpoint, keys: { p256dh: f.p256dh, auth: f.auth } }, payload, { TTL: 60 * 60 * 24 });
      enviados++;
    } catch (e: any) {
      // Suscripción vencida o desinstalada: se limpia
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await db?.delete(pushSuscripciones).where(eq(pushSuscripciones.endpoint, f.endpoint)).catch(() => {});
      } else {
        console.warn("[Push] No se pudo enviar:", e?.statusCode ?? "", String(e?.body ?? e?.message ?? e).slice(0, 160));
      }
    }
  }));
  return enviados;
}

/** A todos los dispositivos de ciertas cuentas */
export async function enviarPushAUsuarios(userIds: number[], aviso: AvisoPush): Promise<number> {
  try {
    const db = await getDb();
    if (!db || userIds.length === 0) return 0;
    const filas = await db.select().from(pushSuscripciones).where(inArray(pushSuscripciones.userId, userIds));
    return enviarA(filas, aviso);
  } catch (e) {
    console.warn("[Push] envío a usuarios:", e);
    return 0;
  }
}

/** A todos los administradores */
export async function enviarPushAdmins(aviso: AvisoPush): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;
    const filas = await db.select({ endpoint: pushSuscripciones.endpoint, p256dh: pushSuscripciones.p256dh, auth: pushSuscripciones.auth })
      .from(pushSuscripciones).innerJoin(users, eq(users.id, pushSuscripciones.userId)).where(eq(users.role, "admin"));
    return enviarA(filas, aviso);
  } catch (e) {
    // Tabla aún sin crear (migración pendiente): no se envía nada
    return 0;
  }
}
