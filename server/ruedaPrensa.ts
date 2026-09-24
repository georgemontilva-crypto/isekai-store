import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { wfPrensaConfirmaciones } from "../drizzle/schema";

/**
 * Confirmaciones de asistencia a la rueda de prensa del World Fest.
 *
 * Sin registro: cada navegador guarda una clave anónima y confirma una sola
 * vez. Para que nadie infle el número, una misma red (IP) puede confirmar
 * como mucho 6 veces en 24 horas (holgado para un equipo o una familia).
 */
const MAX_POR_IP_DIA = 6;

export async function estadoConfirmacion(clave?: string): Promise<{ confirmado: boolean }> {
  if (!clave) return { confirmado: false };
  try {
    const db = await getDb();
    if (!db) return { confirmado: false };
    const [f] = await db.select({ id: wfPrensaConfirmaciones.id }).from(wfPrensaConfirmaciones)
      .where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1);
    return { confirmado: !!f };
  } catch {
    return { confirmado: false };
  }
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
    await db.insert(wfPrensaConfirmaciones).values({ clave, ip });
  } catch {
    // Dos toques casi simultáneos: la clave ya quedó guardada
    return { ok: true, yaEstaba: true };
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
