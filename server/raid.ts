import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { wfRaid, wfRaidAtaques } from "../drizzle/schema";
import { io } from "./_core/socket";

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
  const [r] = await db
    .select()
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
    if (clave) {
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
    };
  } catch (e) {
    // Si las tablas aún no existen (migración pendiente), el raid no se muestra
    console.error("[Raid] estado:", e);
    return { activo: false };
  }
}

/** «clave» identifica al jugador: `u<id de usuario>` */
export async function atacarRaid(clave: string, golpes: number, ip: string, ref = "") {
  const db = await getDb();
  const r = await raidActivo();
  if (!db || !r) throw new TRPCError({ code: "NOT_FOUND", message: "No hay un jefe activo" });
  if (r.danio >= r.vidaMax) return { ok: false as const, motivo: "derrotado" as const };

  const dia = diaVenezuela();
  const g = Math.max(0, Math.min(GOLPES_MAX, Math.floor(golpes)));

  const [{ n: porIp }] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(wfRaidAtaques)
    .where(and(eq(wfRaidAtaques.raidId, r.id), eq(wfRaidAtaques.ip, ip), eq(wfRaidAtaques.dia, dia)));
  if (Number(porIp) >= ATAQUES_POR_IP) return { ok: false as const, motivo: "limite" as const };

  try {
    await db.insert(wfRaidAtaques).values({ raidId: r.id, clave, ip, dia, golpes: g });
  } catch {
    // Índice único: esta clave ya atacó hoy
    return { ok: false as const, motivo: "yaAtaco" as const };
  }

  // Suma atómica, sin pasarse de la vida máxima; marca la derrota una vez
  await db.execute(sql`
    UPDATE wfRaid
    SET danio = LEAST(vidaMax, danio + ${g}),
        derrotadoEn = IF(derrotadoEn IS NULL AND danio >= vidaMax, NOW(), derrotadoEn)
    WHERE id = ${r.id}
  `);

  // Tiempo real: todos los que miran la página ven bajar la vida al instante
  try {
    const estado = await estadoRaid();
    if (io && estado.activo) {
      const { yaAtaco: _omitido, ...publico } = estado;
      io.to("raid").emit("raid:estado", publico);
      // «ref» es una marca aleatoria que manda el navegador que atacó: así no
      // se muestra a sí mismo como «otro cazador». No identifica a nadie.
      io.to("raid").emit("raid:golpe", { golpes: g, ref });
    }
  } catch (e) {
    console.error("[Raid] aviso en vivo:", e);
  }

  return { ok: true as const, golpes: g };
}
