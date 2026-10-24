import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { eventTickets, ticketTypes, ticketCanjes, stores } from "../drizzle/schema";
import { conCandado } from "./candado";

/**
 * Beneficios de cada tipo de boleto: cupo, VIP, kit que se entrega al llegar
 * y bonos de consumo en tiendas aliadas.
 *
 * Las columnas y la tabla de canjes se crean solas al arrancar el servidor,
 * para que no haya que correr SQL a mano.
 */
export async function asegurarEsquemaBeneficios() {
  const db = await getDb();
  if (!db) return;
  try {
    const [filas] = await db.execute(sql`SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ticketTypes'`) as unknown as [{ c: string }[]];
    const hay = new Set((filas ?? []).map(f => f.c));
    const columnas: [string, string][] = [
      ["cupo", "int NULL"],
      ["esVip", "boolean NOT NULL DEFAULT false"],
      ["entregaKit", "varchar(200) NULL"],
      ["bonos", "int NOT NULL DEFAULT 0"],
      ["color", "varchar(20) NULL"],
      ["archivado", "boolean NOT NULL DEFAULT false"],
    ];
    for (const [c, tipo] of columnas) {
      if (!hay.has(c)) {
        await db.execute(sql.raw(`ALTER TABLE ticketTypes ADD COLUMN \`${c}\` ${tipo}`));
        console.log(`[Boletos] columna creada: ticketTypes.${c}`);
      }
    }
    const [colTiendas] = await db.execute(sql`SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stores' AND COLUMN_NAME = 'archivado'`) as unknown as [unknown[]];
    if (!colTiendas?.length) {
      await db.execute(sql`ALTER TABLE stores ADD COLUMN archivado boolean NOT NULL DEFAULT false`);
      console.log("[Boletos] columna creada: stores.archivado");
    }
    await db.execute(sql`CREATE TABLE IF NOT EXISTS ticketCanjes (
      id int AUTO_INCREMENT PRIMARY KEY,
      ticketId int NOT NULL,
      tipo varchar(20) NOT NULL,
      storeId int NULL,
      userId int NULL,
      creadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_canje_boleto (ticketId)
    )`);
  } catch (e) {
    console.error("[Boletos] No se pudo preparar la tabla de beneficios:", e);
  }
}

/** Los boletos del Isekai World Fest 2027, listos para cargar en un toque */
export const PLANTILLA_2027 = [
  {
    name: "General 1 día", priceUsd: "25", days: 1, cupo: null, esVip: false, entregaKit: null, bonos: 0, color: "#38bdf8", sortOrder: 1,
    perks: "Acceso a un día del evento\nLevel Pass incluido",
  },
  {
    name: "General 2 días", priceUsd: "45", days: 2, cupo: null, esVip: false, entregaKit: null, bonos: 0, color: "#a78bfa", sortOrder: 2,
    perks: "Acceso a los dos días del evento\nLevel Pass incluido",
  },
  {
    name: "VIP 2 días", priceUsd: "80", days: 2, cupo: 20, esVip: true, entregaKit: null, bonos: 0, color: "#fbbf24", sortOrder: 3,
    perks: "Acceso a los dos días + Level Pass\nMesa en zona VIP con servicio a la mesa\nIngreso 1 hora antes de la apertura\nZona exclusiva de fotos con los cosplayers internacionales invitados\nParticipación directa en el sorteo de la pieza a tamaño real (día 2)",
  },
  {
    name: "Isekai Fanbox", priceUsd: "100", days: 2, cupo: 100, esVip: false, entregaKit: "Caja Fanbox + tote bag oficial", bonos: 5, color: "#e5007d", sortOrder: 4,
    perks: "Entrada general para los dos días + Level Pass\nTote bag oficial del evento\n5 bonos de consumo en tiendas aliadas\nUn obsequio sorpresa (desde un llavero hasta una figura coleccionable)",
  },
] as const;

/**
 * Carga los cuatro tipos en el evento. Si ya existe uno con el mismo nombre
 * se actualiza (no se duplica), para poder volver a tocarlo sin miedo.
 */
export async function cargarPlantilla2027(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const existentes = await db.select().from(ticketTypes).where(eq(ticketTypes.eventId, eventId));
  let creados = 0, actualizados = 0;
  for (const t of PLANTILLA_2027) {
    const ya = existentes.find(e => e.name.trim().toLowerCase() === t.name.toLowerCase());
    const datos = { ...t, active: true };
    if (ya) {
      await db.update(ticketTypes).set(datos as any).where(eq(ticketTypes.id, ya.id));
      actualizados++;
    } else {
      await db.insert(ticketTypes).values({ eventId, ...datos } as any);
      creados++;
    }
  }
  return { creados, actualizados };
}

/** Cuántos boletos de cada tipo ya se vendieron (los anulados no cuentan) */
export async function vendidosPorTipo(eventId: number): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db) return {};
  const filas = await db.select({ tipo: eventTickets.ticketTypeId, n: sql<number>`COUNT(*)` })
    .from(eventTickets)
    .where(and(eq(eventTickets.eventId, eventId), eq(eventTickets.status, "sold")))
    .groupBy(eventTickets.ticketTypeId);
  return Object.fromEntries(filas.filter(f => f.tipo != null).map(f => [f.tipo as number, Number(f.n)]));
}

/** Estado de los beneficios de un boleto: kit entregado y bonos usados */
export async function beneficiosDe(ticketId: number, tipo?: { entregaKit: string | null; bonos: number } | null) {
  const db = await getDb();
  if (!db) return { kitEntregado: null as Date | null, bonosUsados: 0, bonosTotales: tipo?.bonos ?? 0, canjes: [] as { tienda: string | null; fecha: Date }[] };
  const canjes = await db.select().from(ticketCanjes).where(eq(ticketCanjes.ticketId, ticketId)).catch(() => []);
  const bonos = canjes.filter(c => c.tipo === "bono");
  const kit = canjes.find(c => c.tipo === "kit");
  const ids = Array.from(new Set(bonos.map(b => b.storeId).filter(Boolean))) as number[];
  const tiendas = ids.length ? await db.select({ id: stores.id, name: stores.name }).from(stores).where(inArray(stores.id, ids)) : [];
  return {
    kitEntregado: kit?.creadoEn ?? null,
    bonosUsados: bonos.length,
    bonosTotales: tipo?.bonos ?? 0,
    canjes: bonos.map(b => ({ tienda: tiendas.find(t => t.id === b.storeId)?.name ?? null, fecha: b.creadoEn })),
  };
}

type BoletoConTipo = { id: number; status: string; ticketTypeId: number | null };

async function tipoDe(t: BoletoConTipo) {
  const db = await getDb();
  if (!db || !t.ticketTypeId) return null;
  const [tipo] = await db.select().from(ticketTypes).where(eq(ticketTypes.id, t.ticketTypeId)).limit(1);
  return tipo ?? null;
}

/** Canjea un bono de consumo del boleto en una tienda aliada */
export async function canjearBono(t: BoletoConTipo & { code: string; buyerName: string | null; buyerLastName: string | null }, userId: number, storeId?: number) {
  if (t.status !== "sold") throw new Error(t.status === "void" ? "Ese boleto fue anulado" : "Ese boleto no fue vendido");
  const tipo = await tipoDe(t);
  if (!tipo || !tipo.bonos) throw new Error(`El boleto ${t.code} (${tipo?.name ?? "sin tipo"}) no trae bonos de consumo`);
  return conCandado(`bono:${t.id}`, async () => {
    const db = await getDb();
    if (!db) throw new Error("Base de datos no disponible");
    const usados = (await db.select({ id: ticketCanjes.id }).from(ticketCanjes)
      .where(and(eq(ticketCanjes.ticketId, t.id), eq(ticketCanjes.tipo, "bono")))).length;
    if (usados >= tipo.bonos) throw new Error(`Ya usó sus ${tipo.bonos} bonos`);
    await db.insert(ticketCanjes).values({ ticketId: t.id, tipo: "bono", storeId: storeId ?? null, userId });
    return { ok: true, codigo: t.code, nombre: `${t.buyerName ?? ""} ${t.buyerLastName ?? ""}`.trim(), usados: usados + 1, total: tipo.bonos, quedan: tipo.bonos - usados - 1 };
  });
}

/** Marca que se le entregó el kit (la caja Fanbox) */
export async function entregarKit(t: BoletoConTipo & { code: string }, userId: number) {
  if (t.status !== "sold") throw new Error(t.status === "void" ? "Ese boleto fue anulado" : "Ese boleto no fue vendido");
  const tipo = await tipoDe(t);
  if (!tipo?.entregaKit) throw new Error("Este boleto no trae nada que entregar");
  return conCandado(`kit:${t.id}`, async () => {
    const db = await getDb();
    if (!db) throw new Error("Base de datos no disponible");
    const [ya] = await db.select().from(ticketCanjes).where(and(eq(ticketCanjes.ticketId, t.id), eq(ticketCanjes.tipo, "kit"))).limit(1);
    if (ya) return { ok: false as const, yaEntregado: ya.creadoEn, kit: tipo.entregaKit };
    await db.insert(ticketCanjes).values({ ticketId: t.id, tipo: "kit", userId });
    return { ok: true as const, kit: tipo.entregaKit };
  });
}

/** Participantes del sorteo: todos los boletos VIP vendidos */
export async function participantesSorteo(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  const vip = await db.select({ id: ticketTypes.id }).from(ticketTypes).where(and(eq(ticketTypes.eventId, eventId), eq(ticketTypes.esVip, true)));
  if (!vip.length) return [];
  const filas = await db.select().from(eventTickets)
    .where(and(eq(eventTickets.eventId, eventId), eq(eventTickets.status, "sold"), inArray(eventTickets.ticketTypeId, vip.map(v => v.id))));
  return filas.map(t => ({ id: t.id, codigo: t.code, nombre: `${t.buyerName ?? ""} ${t.buyerLastName ?? ""}`.trim(), telefono: t.buyerPhone, correo: t.buyerEmail }));
}
