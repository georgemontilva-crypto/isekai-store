import crypto from "crypto";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { wfRaid, wfRaidAtaques } from "../drizzle/schema";
import { io } from "./_core/socket";
import { ENV } from "./_core/env";

/**
 * Raid comunitario de la landing del World Fest.
 *
 * Todos los visitantes golpean al mismo jefe. Cada uno ataca una vez al día
 * durante una ronda corta en su teléfono; al terminar se envía el total.
 * Cuando la vida llega a cero queda derrotado y la página muestra la
 * recompensa.
 *
 * Contra trampas: tope de golpes por ronda, un ataque por clave y día, y un
 * máximo de ataques por IP y día (holgado, para que una familia o una
 * oficina con la misma red puedan jugar).
 */

/** Tope realista: 10 segundos a ~13 toques por segundo */
export const GOLPES_MAX = 130;
/** Desde que un cazador lleva estos ataques válidos, su daño se duplica */
export const ATAQUES_VETERANO = 4;
const MULTIPLICADOR_VETERANO = 2;

/** Ataques por IP y día */
const ATAQUES_POR_IP = 12;

/** Día actual en Venezuela (AAAA-MM-DD): el reinicio es a medianoche local */
function diaVenezuela(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function raidActivo() {
  const db = await getDb();
  if (!db) return null;
  // Solo las columnas que el juego necesita: así el jefe se sigue viendo
  // aunque falte alguna columna nueva (por ejemplo, migración pendiente)
  const [r] = await db
    .select({
      id: wfRaid.id,
      vidaMax: wfRaid.vidaMax,
      danio: wfRaid.danio,
      activo: wfRaid.activo,
      derrotadoEn: wfRaid.derrotadoEn,
    })
    .from(wfRaid)
    .where(eq(wfRaid.activo, true))
    .orderBy(desc(wfRaid.id))
    .limit(1);
  return r ?? null;
}

export type EstadoRaid =
  | { activo: false }
  | {
      activo: true;
      vidaMax: number;
      vida: number;
      derrotado: boolean;
      cazadores: number;
      /** Si esta clave ya atacó hoy */
      yaAtaco: boolean;
      /** Ataques válidos de este cazador en este jefe */
      misAtaques: number;
      /** 2 si ya es veterano (daño doble), 1 si no */
      multiplicador: number;
    };

export async function estadoRaid(clave?: string): Promise<EstadoRaid> {
  try {
    const r = await raidActivo();
    const db = await getDb();
    if (!r || !db) return { activo: false };

    const [{ n }] = await db
      .select({ n: sql<number>`COUNT(DISTINCT ${wfRaidAtaques.clave})` })
      .from(wfRaidAtaques)
      .where(eq(wfRaidAtaques.raidId, r.id));

    let yaAtaco = false;
    let misAtaques = 0;
    if (clave) {
      misAtaques = await ataquesValidos(r.id, clave);
      const [a] = await db
        .select({ id: wfRaidAtaques.id })
        .from(wfRaidAtaques)
        .where(and(
          eq(wfRaidAtaques.raidId, r.id),
          eq(wfRaidAtaques.clave, clave),
          eq(wfRaidAtaques.dia, diaVenezuela()),
        ))
        .limit(1);
      yaAtaco = !!a;
    }

    return {
      activo: true,
      vidaMax: r.vidaMax,
      vida: Math.max(0, r.vidaMax - r.danio),
      derrotado: r.danio >= r.vidaMax,
      cazadores: Number(n) || 0,
      yaAtaco,
      misAtaques,
      multiplicador: misAtaques >= ATAQUES_VETERANO ? MULTIPLICADOR_VETERANO : 1,
    };
  } catch (e) {
    // Si las tablas aún no existen (migración pendiente), el raid no se muestra
    console.error("[Raid] estado:", e);
    return { activo: false };
  }
}

/** «clave» identifica al jugador: `u<id de usuario>` */
/** Ataques que sí sumaron daño (los anulados por trampa quedan con 0) */
async function ataquesValidos(raidId: number, clave: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(wfRaidAtaques)
    .where(and(eq(wfRaidAtaques.raidId, raidId), eq(wfRaidAtaques.clave, clave), gt(wfRaidAtaques.golpes, 0)));
  return Number(n) || 0;
}

// ─── Ticket de ronda ───────────────────────────────────────────────────────
/**
 * Al tocar «Atacar» el servidor entrega un ticket firmado con la hora de
 * inicio. Al enviar el ataque se comprueba que realmente pasaron los 10 s
 * de ronda (más la cuenta 3-2-1) y que el ticket no se usó antes. Así nadie
 * puede mandar «hice 130 golpes» directo al servidor sin jugar.
 */
const RONDA_MIN_MS = 10_500;   // 3-2-1 (≈2 s) + 10 s de ronda, con margen
const RONDA_MAX_MS = 120_000;
const ticketsUsados = new Map<string, number>();

function firmaTicket(userId: number, inicio: number, nonce: string) {
  return crypto.createHmac("sha256", ENV.cookieSecret || "isekai-raid")
    .update(`raid-ronda:${userId}:${inicio}:${nonce}`).digest("hex").slice(0, 32);
}

export function iniciarRonda(userId: number): { ticket: string } {
  const inicio = Date.now();
  const nonce = crypto.randomBytes(8).toString("hex");
  return { ticket: `${inicio}.${nonce}.${firmaTicket(userId, inicio, nonce)}` };
}

function validarTicket(userId: number, ticket: string): "ok" | "invalido" | "rapido" | "vencido" | "usado" {
  const [ini, nonce, firma] = String(ticket).split(".");
  const inicio = Number(ini);
  if (!inicio || !nonce || !firma || firma.length !== 32) return "invalido";
  const esperada = firmaTicket(userId, inicio, nonce);
  if (!crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return "invalido";
  const edad = Date.now() - inicio;
  if (edad < RONDA_MIN_MS) return "rapido";
  if (edad > RONDA_MAX_MS) return "vencido";
  if (ticketsUsados.has(nonce)) return "usado";
  ticketsUsados.set(nonce, Date.now());
  // Limpieza de tickets viejos
  ticketsUsados.forEach((t, k) => { if (Date.now() - t > RONDA_MAX_MS * 2) ticketsUsados.delete(k); });
  return "ok";
}

// ─── Detector de auto clicker ──────────────────────────────────────────────
/**
 * Umbrales pensados para NO castigar a quien toca rápido con dos dedos:
 * se mira el patrón de toda la ronda, no un toque suelto.
 *  - Demasiado rápido: más de la mitad de los intervalos bajo 35 ms, o la
 *    mediana bajo 40 ms (≈25+ toques por segundo sostenidos: no es humano).
 *  - Ritmo mecánico: intervalos casi idénticos (variación < 10 %).
 *  - Mismo punto: casi todos los toques en el mismo píxel con ritmo regular.
 *  - Clics generados por programa (no son toques reales).
 *  - Datos incompletos: los tiempos no cuadran con los golpes enviados.
 */
export type AnalisisToques = { intervalos: number[]; sinteticos: number; posiciones: number };
export const INTERVALO_HUMANO_MS = 35;

export function detectarTrampa(golpes: number, a: AnalisisToques): string | null {
  if (a.sinteticos > 0) return "clics_sinteticos";
  if (golpes < 15) return null;                        // muy pocos toques para juzgar
  const iv = a.intervalos.filter(n => Number.isFinite(n) && n >= 0);
  if (iv.length < Math.floor((golpes - 1) * 0.8)) return "datos_incompletos";
  const ordenados = [...iv].sort((x, y) => x - y);
  const mediana = ordenados[Math.floor(ordenados.length / 2)];
  const rapidos = iv.filter(n => n < INTERVALO_HUMANO_MS).length;
  if (rapidos / iv.length > 0.5 || mediana < 40) return "demasiado_rapido";
  const media = iv.reduce((s, n) => s + n, 0) / iv.length;
  const desvio = Math.sqrt(iv.reduce((s, n) => s + (n - media) ** 2, 0) / iv.length);
  const variacion = media > 0 ? desvio / media : 0;
  if (iv.length >= 20 && variacion < 0.1) return "ritmo_mecanico";
  if (iv.length >= 20 && a.posiciones <= 2 && variacion < 0.2) return "mismo_punto";
  return null;
}

export async function atacarRaid(
  clave: string, golpes: number, ip: string, ref = "",
  extra?: { userId: number; ticket: string; analisis: AnalisisToques },
) {
  const db = await getDb();
  const r = await raidActivo();
  if (!db || !r) throw new TRPCError({ code: "NOT_FOUND", message: "No hay un jefe activo" });
  if (r.danio >= r.vidaMax) return { ok: false as const, motivo: "derrotado" as const };

  // Ronda real: ticket firmado, tiempo mínimo y de un solo uso
  if (extra) {
    const t = validarTicket(extra.userId, extra.ticket);
    if (t !== "ok") return { ok: false as const, motivo: "ticket" as const };
  }

  const dia = diaVenezuela();
  const g = Math.max(0, Math.min(GOLPES_MAX, Math.floor(golpes)));

  const [{ n: porIp }] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(wfRaidAtaques)
    .where(and(eq(wfRaidAtaques.raidId, r.id), eq(wfRaidAtaques.ip, ip), eq(wfRaidAtaques.dia, dia)));
  if (Number(porIp) >= ATAQUES_POR_IP) return { ok: false as const, motivo: "limite" as const };

  // Auto clicker: el ataque cuenta como el del día, pero con 0 de daño
  const trampa = extra ? detectarTrampa(g, extra.analisis) : null;
  if (trampa) {
    try {
      await db.insert(wfRaidAtaques).values({ raidId: r.id, clave, ip, dia, golpes: 0, motivo: trampa });
    } catch (e: any) {
      const sinColumna = /Unknown column/i.test(String(e?.message ?? e));
      if (!sinColumna) return { ok: false as const, motivo: "yaAtaco" as const };
      // Migración pendiente: se registra igual, sin el motivo
      try { await db.insert(wfRaidAtaques).values({ raidId: r.id, clave, ip, dia, golpes: 0 }); }
      catch { return { ok: false as const, motivo: "yaAtaco" as const }; }
    }
    console.warn(`[Raid] ataque anulado (${trampa}) de ${clave}`);
    return { ok: false as const, motivo: "autoclicker" as const };
  }

  // Veterano: desde su 5.º ataque válido, el daño se duplica
  const previos = await ataquesValidos(r.id, clave);
  const multiplicador = previos >= ATAQUES_VETERANO ? MULTIPLICADOR_VETERANO : 1;
  const danio = g * multiplicador;

  try {
    await db.insert(wfRaidAtaques).values({ raidId: r.id, clave, ip, dia, golpes: danio });
  } catch {
    // Índice único: esta clave ya atacó hoy
    return { ok: false as const, motivo: "yaAtaco" as const };
  }

  // Suma atómica, sin pasarse de la vida máxima; marca la derrota una vez
  await db.execute(sql`
    UPDATE wfRaid
    SET danio = LEAST(vidaMax, danio + ${danio}),
        derrotadoEn = IF(derrotadoEn IS NULL AND danio >= vidaMax, NOW(), derrotadoEn)
    WHERE id = ${r.id}
  `);

  // Tiempo real: todos los que miran la página ven bajar la vida al instante
  try {
    const estado = await estadoRaid();
    if (io && estado.activo) {
      const { yaAtaco: _o1, misAtaques: _o2, multiplicador: _o3, ...publico } = estado;
      io.to("raid").emit("raid:estado", publico);
      // «ref» es una marca aleatoria que manda el navegador que atacó: así no
      // se muestra a sí mismo como «otro cazador». No identifica a nadie.
      io.to("raid").emit("raid:golpe", { golpes: danio, ref });
    }
  } catch (e) {
    console.error("[Raid] aviso en vivo:", e);
  }

  return { ok: true as const, golpes: danio, multiplicador };
}
