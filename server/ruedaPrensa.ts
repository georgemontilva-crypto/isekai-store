import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { wfPrensaConfirmaciones } from "../drizzle/schema";
import { io } from "./_core/socket";
import { notifyConfirmacionPrensa } from "./_core/notification";

/**
 * Confirmaciones de asistencia a la rueda de negocios del World Fest.
 *
 * Sin registro: cada navegador guarda una clave anónima y confirma una sola
 * vez. Para que nadie infle el número, una misma red (IP) puede confirmar
 * como mucho 6 veces en 24 horas (holgado para un equipo o una familia).
 */
const MAX_POR_IP_DIA = 6;

export async function estadoConfirmacion(clave?: string): Promise<{ confirmado: boolean; conDatos: boolean }> {
  if (!clave) return { confirmado: false, conDatos: false };
  try {
    const db = await getDb();
    if (!db) return { confirmado: false, conDatos: false };
    const [f] = await db.select({ id: wfPrensaConfirmaciones.id, datosEn: wfPrensaConfirmaciones.datosEn })
      .from(wfPrensaConfirmaciones).where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1);
    return { confirmado: !!f, conDatos: !!f?.datosEn };
  } catch {
    // Si la migración de los datos aún no se corrió, al menos el estado básico
    try {
      const db = await getDb();
      if (!db) return { confirmado: false, conDatos: false };
      const [f] = await db.select({ id: wfPrensaConfirmaciones.id }).from(wfPrensaConfirmaciones)
        .where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1);
      return { confirmado: !!f, conDatos: false };
    } catch {
      return { confirmado: false, conDatos: false };
    }
  }
}

export type DatosPrensa = { tienda: string; email: string; whatsapp: string };

/**
 * La persona que ya confirmó deja el nombre de su tienda, su correo y su
 * WhatsApp. Solo funciona con una clave que ya confirmó (nadie puede crear
 * filas nuevas por aquí) y puede corregir sus datos las veces que quiera.
 */
export async function completarDatos(clave: string, datos: DatosPrensa):
  Promise<{ ok: true } | { ok: false; motivo: "noConfirmado" | "error" }> {
  const db = await getDb();
  if (!db) return { ok: false, motivo: "error" };
  const [f] = await db.select({ id: wfPrensaConfirmaciones.id, datosEn: wfPrensaConfirmaciones.datosEn })
    .from(wfPrensaConfirmaciones).where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1);
  if (!f) return { ok: false, motivo: "noConfirmado" };
  const primeraVez = !f.datosEn;
  try {
    await db.update(wfPrensaConfirmaciones)
      .set({ tienda: datos.tienda, email: datos.email, whatsapp: datos.whatsapp, datosEn: new Date() })
      .where(eq(wfPrensaConfirmaciones.id, f.id));
  } catch (e) {
    console.warn("[Prensa] guardar datos:", e);
    return { ok: false, motivo: "error" };
  }
  try {
    io?.to("admin").emit("prensa:datos", { id: f.id });
    if (primeraVez) {
      void import("./push").then(m => m.enviarPushAdmins({
        titulo: "🏪 Datos de invitado · rueda de negocios",
        cuerpo: `${datos.tienda} dejó su correo y WhatsApp.`,
        url: "/admin",
        etiqueta: "prensa-datos",
      }));
    }
  } catch { /* aviso opcional */ }
  return { ok: true };
}

export type FilaPrensa = {
  id: number; tienda: string | null; email: string | null; whatsapp: string | null;
  datosEn: Date | null; creadoEn: Date;
};

/** Solo administradores: lista de confirmados, los que dejaron datos primero */
export async function listaConfirmaciones(): Promise<FilaPrensa[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: wfPrensaConfirmaciones.id,
    tienda: wfPrensaConfirmaciones.tienda,
    email: wfPrensaConfirmaciones.email,
    whatsapp: wfPrensaConfirmaciones.whatsapp,
    datosEn: wfPrensaConfirmaciones.datosEn,
    creadoEn: wfPrensaConfirmaciones.creadoEn,
  }).from(wfPrensaConfirmaciones)
    .orderBy(sql`${wfPrensaConfirmaciones.datosEn} IS NULL`, desc(wfPrensaConfirmaciones.datosEn), desc(wfPrensaConfirmaciones.creadoEn))
    .limit(2000);
}

export async function confirmarAsistencia(clave: string, ip: string):
  Promise<{ ok: true; yaEstaba: boolean } | { ok: false; motivo: "limite" | "error" }> {
  const db = await getDb();
  if (!db) return { ok: false, motivo: "error" };

  const [ya] = await db.select({ id: wfPrensaConfirmaciones.id }).from(wfPrensaConfirmaciones)
    .where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1);
  if (ya) return { ok: true, yaEstaba: true };

  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(wfPrensaConfirmaciones)
    .where(and(eq(wfPrensaConfirmaciones.ip, ip), gte(wfPrensaConfirmaciones.creadoEn, hace24h)));
  if (Number(n) >= MAX_POR_IP_DIA) return { ok: false, motivo: "limite" };

  try {
    // Solo las dos columnas de siempre: así confirmar sigue funcionando
    // aunque la migración de los datos de contacto todavía no se haya corrido
    await db.execute(sql`INSERT INTO wfPrensaConfirmaciones (clave, ip) VALUES (${clave}, ${ip})`);
  } catch (e) {
    // Dos toques casi simultáneos: la clave ya quedó guardada
    const [otra] = await db.select({ id: wfPrensaConfirmaciones.id }).from(wfPrensaConfirmaciones)
      .where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1).catch(() => []);
    if (otra) return { ok: true, yaEstaba: true };
    console.warn("[Prensa] confirmar:", e);
    return { ok: false, motivo: "error" };
  }

  // Aviso al instante a los administradores conectados, y correo al dueño.
  // No se espera el correo: la persona que confirma no debe esperar por él.
  try {
    const conteo = await totalConfirmaciones();
    io?.to("admin").emit("prensa:confirmacion", conteo);
    void notifyConfirmacionPrensa(conteo.total, conteo.hoy).catch(e => console.warn("[Prensa] correo:", e));
    void import("./push").then(m => m.enviarPushAdmins({
      titulo: "🎟️ Nueva confirmación · rueda de negocios",
      cuerpo: `Ya son ${conteo.total} confirmados (${conteo.hoy} hoy).`,
      url: "/admin",
      etiqueta: "prensa",
    }));
  } catch (e) {
    console.warn("[Prensa] aviso en vivo:", e);
  }
  return { ok: true, yaEstaba: false };
}

/** Solo para administradores: total y confirmaciones de hoy (hora de Venezuela) */
export async function totalConfirmaciones(): Promise<{ total: number; hoy: number }> {
  const db = await getDb();
  if (!db) return { total: 0, hoy: 0 };
  const [f] = await db.select({
    total: sql<number>`COUNT(*)`,
    hoy: sql<number>`SUM(DATE(CONVERT_TZ(${wfPrensaConfirmaciones.creadoEn}, '+00:00', '-04:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-04:00')))`,
  }).from(wfPrensaConfirmaciones);
  return { total: Number(f?.total ?? 0), hoy: Number(f?.hoy ?? 0) };
}

/** Solo administradores: borra una confirmación (pruebas o duplicados) */
export async function borrarConfirmacion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db.delete(wfPrensaConfirmaciones).where(eq(wfPrensaConfirmaciones.id, id));
  try {
    const conteo = await totalConfirmaciones();
    io?.to("admin").emit("prensa:confirmacion", conteo);
  } catch { /* aviso opcional */ }
  return { ok: true };
}
