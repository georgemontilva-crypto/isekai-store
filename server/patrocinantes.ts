import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { patrocinantes } from "../drizzle/schema";

/**
 * Patrocinantes del Isekai World Fest: banners que rotan en un carrusel
 * dentro de la zona del cazador. Se cuentan las veces que se ven y que se
 * tocan, para poder mostrarle resultados a cada marca.
 */

export type Patrocinante = typeof patrocinantes.$inferSelect;

/** Público: solo los activos y solo lo que hace falta para pintarlos */
export async function listarPublicos() {
  try {
    const db = await getDb();
    if (!db) return [];
    return await db.select({
      id: patrocinantes.id, nombre: patrocinantes.nombre,
      imagenUrl: patrocinantes.imagenUrl, enlace: patrocinantes.enlace,
    }).from(patrocinantes).where(eq(patrocinantes.activo, true))
      .orderBy(asc(patrocinantes.orden), asc(patrocinantes.id)).limit(20);
  } catch {
    // Si la tabla todavía no existe (falta la migración), no se rompe la página
    return [];
  }
}

export async function listarTodos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(patrocinantes).orderBy(asc(patrocinantes.orden), asc(patrocinantes.id));
}

export async function guardar(d: { id?: number; nombre: string; imagenUrl: string; enlace?: string | null; activo?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const valores = { nombre: d.nombre, imagenUrl: d.imagenUrl, enlace: d.enlace || null, activo: d.activo ?? true };
  if (d.id) {
    await db.update(patrocinantes).set(valores).where(eq(patrocinantes.id, d.id));
    return { id: d.id };
  }
  const [{ max }] = await db.select({ max: sql<number>`COALESCE(MAX(${patrocinantes.orden}), 0)` }).from(patrocinantes);
  const [r] = await db.insert(patrocinantes).values({ ...valores, orden: Number(max) + 1 }).$returningId();
  return { id: r.id };
}

export async function borrar(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db.delete(patrocinantes).where(eq(patrocinantes.id, id));
  return { ok: true };
}

/** Guarda el orden que quedó en el panel (lista de ids de arriba a abajo) */
export async function ordenar(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  for (let i = 0; i < ids.length; i++) {
    await db.update(patrocinantes).set({ orden: i + 1 }).where(eq(patrocinantes.id, ids[i]));
  }
  return { ok: true };
}

export async function reiniciarEstadisticas(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db.update(patrocinantes).set({ vistas: 0, clics: 0 }).where(eq(patrocinantes.id, id));
  return { ok: true };
}

/**
 * Vistas y clics. Para que nadie infle los números, cada red (IP) cuenta como
 * máximo una vista y un clic por banner cada 30 minutos.
 */
const VENTANA_MS = 30 * 60 * 1000;
const visto = new Map<string, number>();

export async function registrar(tipo: "vista" | "clic", ids: number[], ip: string) {
  const ahora = Date.now();
  if (visto.size > 50_000) {
    visto.forEach((t, k) => { if (ahora - t > VENTANA_MS) visto.delete(k); });
  }
  const validos = Array.from(new Set(ids)).slice(0, 20).filter(id => {
    const k = `${tipo}:${id}:${ip}`;
    const t = visto.get(k);
    if (t && ahora - t < VENTANA_MS) return false;
    visto.set(k, ahora);
    return true;
  });
  if (validos.length === 0) return { ok: true };
  try {
    const db = await getDb();
    if (!db) return { ok: true };
    const col = tipo === "vista" ? patrocinantes.vistas : patrocinantes.clics;
    await db.update(patrocinantes)
      .set(tipo === "vista" ? { vistas: sql`${col} + 1` } : { clics: sql`${col} + 1` })
      .where(inArray(patrocinantes.id, validos));
  } catch { /* contar es secundario: nunca debe romper nada */ }
  return { ok: true };
}
