import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import {
  levelActivities, levelGrants, levelProgress, levelRankUps, levelStaff,
  eventTickets, events, stores, users, ticketTypes,
} from "../drizzle/schema";
import { diaDelEvento } from "./tickets";

/**
 * Level Pass — experiencia y rangos durante el evento.
 *
 * Cada asistente empieza en rango E y sube completando actividades. Las
 * compras en tiendas aliadas son la vía principal, por eso pesan más.
 * Al llegar a rango S entra en el sorteo final.
 */

/**
 * Umbrales de cada rango.
 *
 * La escala es accesible a propósito: hay pocas actividades y la mayoría de
 * puntos vienen de compras, así que exigir demasiado dejaría a casi todos
 * fuera del sorteo.
 */
export const RANGOS = [
  { rango: "E", desde: 0 },
  { rango: "D", desde: 60 },
  { rango: "C", desde: 140 },
  { rango: "B", desde: 240 },
  { rango: "A", desde: 360 },
  { rango: "S", desde: 500 },
] as const;

/** Rango que corresponde a una cantidad de experiencia */
export function rangoPara(xp: number): string {
  let actual = "E";
  for (const r of RANGOS) {
    if (xp >= r.desde) actual = r.rango;
  }
  return actual;
}

/** Cuánto falta para el siguiente rango */
export function siguienteRango(xp: number) {
  const proximo = RANGOS.find(r => xp < r.desde);
  if (!proximo) return null;
  const actual = [...RANGOS].reverse().find(r => xp >= r.desde) ?? RANGOS[0];
  const tramo = proximo.desde - actual.desde;
  return {
    rango: proximo.rango,
    faltan: proximo.desde - xp,
    progreso: tramo > 0 ? Math.round(((xp - actual.desde) / tramo) * 100) : 100,
  };
}

/** El Level Pass solo funciona durante los días del evento */
export async function levelPassActivo(eventId: number) {
  const db = await getDb();
  if (!db) return false;
  const [ev] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!ev) return false;
  return diaDelEvento(ev) !== null;
}

// ─── Actividades ──────────────────────────────────────────────────────────────

export async function crearActividad(data: {
  eventId: number; name: string; description?: string; xp: number;
  ubicacion?: string; repetible?: boolean; maxVeces?: number; sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  await db.insert(levelActivities).values({
    eventId: data.eventId,
    name: data.name.trim(),
    description: data.description,
    xp: data.xp,
    ubicacion: data.ubicacion,
    repetible: data.repetible ?? false,
    maxVeces: data.repetible ? (data.maxVeces ?? 3) : 1,
    sortOrder: data.sortOrder ?? 0,
  });
}

export async function listarActividades(eventId: number, soloActivas = false) {
  const db = await getDb();
  if (!db) return [];
  const cond: any[] = [eq(levelActivities.eventId, eventId)];
  if (soloActivas) cond.push(eq(levelActivities.active, true));
  return db.select().from(levelActivities)
    .where(and(...cond))
    .orderBy(levelActivities.sortOrder, levelActivities.id);
}

export async function editarActividad(id: number, data: Partial<{
  name: string; description: string; xp: number; ubicacion: string;
  repetible: boolean; maxVeces: number; active: boolean;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(levelActivities).set(data as any).where(eq(levelActivities.id, id));
}

export async function borrarActividad(id: number) {
  const db = await getDb();
  if (!db) return { desactivada: false };
  const [usada] = await db.select({ n: sql<number>`count(*)` })
    .from(levelGrants).where(eq(levelGrants.activityId, id));
  if ((usada?.n ?? 0) > 0) {
    await db.update(levelActivities).set({ active: false }).where(eq(levelActivities.id, id));
    return { desactivada: true };
  }
  await db.delete(levelActivities).where(eq(levelActivities.id, id));
  return { desactivada: false };
}

// ─── Progreso ─────────────────────────────────────────────────────────────────

/** Progreso de un boleto, creándolo si es la primera vez */
export async function progresoDeBoleto(ticketId: number, eventId: number) {
  const db = await getDb();
  if (!db) return null;

  const [existente] = await db.select().from(levelProgress)
    .where(eq(levelProgress.ticketId, ticketId)).limit(1);
  if (existente) return existente;

  await db.insert(levelProgress).values({ ticketId, eventId, xpTotal: 0, rango: "E" });
  const [creado] = await db.select().from(levelProgress)
    .where(eq(levelProgress.ticketId, ticketId)).limit(1);
  return creado;
}

/**
 * Otorga experiencia por una actividad.
 *
 * Comprueba que el boleto exista y esté vendido, que la actividad esté activa,
 * y que no se supere el número de veces permitido. Devuelve si hubo ascenso
 * para que la pantalla pueda anunciarlo.
 */
export async function otorgarExperiencia(data: {
  token: string;
  activityId: number;
  userId: number;
  storeId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  const [ticket] = await db.select().from(eventTickets)
    .where(eq(eventTickets.token, data.token)).limit(1);
  if (!ticket) throw new Error("Ese boleto no existe");
  if (ticket.status !== "sold") throw new Error("Ese boleto no fue vendido");

  const [actividad] = await db.select().from(levelActivities)
    .where(eq(levelActivities.id, data.activityId)).limit(1);
  if (!actividad || !actividad.active) throw new Error("Esa actividad no está disponible");
  if (actividad.eventId !== ticket.eventId) throw new Error("La actividad no es de este evento");

  // Cuántas veces se le ha dado ya esta actividad a este boleto
  const previas = await db.select().from(levelGrants)
    .where(and(eq(levelGrants.ticketId, ticket.id), eq(levelGrants.activityId, actividad.id)));

  const tope = actividad.repetible ? actividad.maxVeces : 1;
  if (previas.length >= tope) {
    throw new Error(
      tope === 1
        ? "Esta persona ya completó esta actividad"
        : `Esta persona ya completó esta actividad ${tope} veces`,
    );
  }

  const progreso = await progresoDeBoleto(ticket.id, ticket.eventId);
  const xpAntes = progreso?.xpTotal ?? 0;
  const rangoAntes = progreso?.rango ?? "E";

  await db.insert(levelGrants).values({
    ticketId: ticket.id,
    activityId: actividad.id,
    xp: actividad.xp,
    otorgadoPorUserId: data.userId,
    storeId: data.storeId,
  });

  const xpDespues = xpAntes + actividad.xp;
  const rangoDespues = rangoPara(xpDespues);
  const subio = rangoDespues !== rangoAntes;

  await db.update(levelProgress).set({
    xpTotal: xpDespues,
    rango: rangoDespues,
    ...(subio ? { ultimoAscenso: new Date() } : {}),
  }).where(eq(levelProgress.ticketId, ticket.id));

  if (subio) {
    await db.insert(levelRankUps).values({
      ticketId: ticket.id,
      rangoAnterior: rangoAntes,
      rangoNuevo: rangoDespues,
      xpTotal: xpDespues,
    });
  }

  return {
    ok: true,
    codigo: ticket.code,
    nombre: `${ticket.buyerName ?? ""} ${ticket.buyerLastName ?? ""}`.trim(),
    actividad: actividad.name,
    xpGanada: actividad.xp,
    xpTotal: xpDespues,
    rangoAnterior: rangoAntes,
    rango: rangoDespues,
    subioDeRango: subio,
    siguiente: siguienteRango(xpDespues),
  };
}

/**
 * Estado público de un boleto: lo que ve el asistente al consultar con su
 * número de boleto en la web.
 */
export async function estadoPublico(codigoOToken: string) {
  const db = await getDb();
  if (!db) return null;

  const valor = codigoOToken.trim();
  let [ticket] = await db.select().from(eventTickets)
    .where(eq(eventTickets.token, valor)).limit(1);

  if (!ticket) {
    const codigo = valor.toUpperCase();
    const conPrefijo = codigo.startsWith("IW-") ? codigo : `IW-${codigo}`;
    [ticket] = await db.select().from(eventTickets)
      .where(eq(eventTickets.code, conPrefijo)).limit(1);
  }

  if (!ticket || ticket.status !== "sold") return null;

  const progreso = await progresoDeBoleto(ticket.id, ticket.eventId);
  const xp = progreso?.xpTotal ?? 0;

  const hechas = await db.select().from(levelGrants).where(eq(levelGrants.ticketId, ticket.id));
  const actividades = await listarActividades(ticket.eventId, true);

  return {
    codigo: ticket.code,
    nombre: `${ticket.buyerName ?? ""} ${ticket.buyerLastName ?? ""}`.trim(),
    xpTotal: xp,
    rango: progreso?.rango ?? "E",
    siguiente: siguienteRango(xp),
    esRangoS: (progreso?.rango ?? "E") === "S",
    actividades: actividades.map(a => {
      const veces = hechas.filter(h => h.activityId === a.id).length;
      const tope = a.repetible ? a.maxVeces : 1;
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        xp: a.xp,
        ubicacion: a.ubicacion,
        completada: veces >= tope,
        veces,
        tope,
      };
    }),
    historial: hechas
      .map(h => ({
        actividad: actividades.find(a => a.id === h.activityId)?.name ?? "Actividad",
        xp: h.xp,
        fecha: h.createdAt,
      }))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 20),
  };
}

// ─── Personal autorizado ──────────────────────────────────────────────────────

export async function crearStaff(data: { name: string; email?: string; puesto?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  const correo = data.email?.trim().toLowerCase();
  const existentes = await db.select().from(levelStaff);
  if (correo && existentes.some(g => g.email === correo)) {
    throw new Error("Ya existe personal con ese correo");
  }

  let userId: number | undefined;
  if (correo) {
    const [u] = await db.select().from(users).where(eq(users.email, correo)).limit(1);
    if (u) {
      userId = u.id;
      if (u.role === "user") await db.update(users).set({ role: "staff" }).where(eq(users.id, u.id));
    } else {
      await db.insert(users).values({
        openId: `staff_${nanoid(20)}`,
        email: correo,
        name: data.name,
        role: "staff",
        loginMethod: "magic_link",
      });
      const [creado] = await db.select().from(users).where(eq(users.email, correo)).limit(1);
      userId = creado?.id;
    }
  }

  await db.insert(levelStaff).values({
    name: data.name.trim(),
    email: correo,
    puesto: data.puesto,
    userId,
  });
}

export async function listarStaff() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(levelStaff).orderBy(desc(levelStaff.id));
}

export async function borrarStaff(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(levelStaff).where(eq(levelStaff.id, id));
}

/** Rol de personal según el correo, para conservarlo al iniciar sesión */
export async function esStaffPorCorreo(email: string): Promise<"staff" | null> {
  const db = await getDb();
  if (!db || !email) return null;
  const correo = email.trim().toLowerCase();
  const [g] = await db.select().from(levelStaff).where(eq(levelStaff.email, correo)).limit(1);
  return g?.active ? "staff" : null;
}

/** ¿Este usuario puede otorgar experiencia? Tienda autorizada o personal */
export async function puedeOtorgar(userId: number, rol: string) {
  const db = await getDb();
  if (!db) return { puede: false, storeId: undefined as number | undefined };
  if (rol === "admin") return { puede: true, storeId: undefined };

  const [tienda] = await db.select().from(stores).where(eq(stores.userId, userId)).limit(1);
  if (tienda?.active && tienda.puedeOtorgarXp) return { puede: true, storeId: tienda.id };

  const [staff] = await db.select().from(levelStaff).where(eq(levelStaff.userId, userId)).limit(1);
  if (staff?.active) return { puede: true, storeId: undefined };

  return { puede: false, storeId: undefined };
}

// ─── Panel del admin ──────────────────────────────────────────────────────────

/** Ranking y ascensos, para seguir el evento en vivo */
export async function resumenLevelPass(eventId: number) {
  const db = await getDb();
  if (!db) return null;

  const progresos = await db.select().from(levelProgress).where(eq(levelProgress.eventId, eventId));
  const tickets = await db.select().from(eventTickets)
    .where(and(eq(eventTickets.eventId, eventId), eq(eventTickets.status, "sold")));

  const porRango = RANGOS.map(r => ({
    rango: r.rango,
    cantidad: progresos.filter(p => p.rango === r.rango).length,
  }));

  const ascensos = await db.select().from(levelRankUps)
    .orderBy(desc(levelRankUps.id)).limit(50);

  const ranking = progresos
    .sort((a, b) => b.xpTotal - a.xpTotal)
    .slice(0, 50)
    .map(p => {
      const t = tickets.find(x => x.id === p.ticketId);
      return {
        ticketId: p.ticketId,
        codigo: t?.code ?? "—",
        nombre: `${t?.buyerName ?? ""} ${t?.buyerLastName ?? ""}`.trim() || "—",
        telefono: t?.buyerPhone ?? null,
        xpTotal: p.xpTotal,
        rango: p.rango,
      };
    });

  return {
    participantes: progresos.length,
    boletosVendidos: tickets.length,
    rangoS: progresos.filter(p => p.rango === "S").length,
    porRango,
    ranking,
    ascensos: ascensos.map(a => {
      const t = tickets.find(x => x.id === a.ticketId);
      return {
        ...a,
        codigo: t?.code ?? "—",
        nombre: `${t?.buyerName ?? ""} ${t?.buyerLastName ?? ""}`.trim() || "—",
      };
    }),
  };
}

// ─── Entorno de prueba ────────────────────────────────────────────────────────

/**
 * Crea un evento completo para ensayar: fechas de hoy y mañana, un tipo de
 * boleto, actividades y boletos ya vendidos a nombres de ejemplo.
 *
 * TEMPORAL: sirve para probar el circuito completo antes del evento real.
 * Todo lo creado lleva la marca "[PRUEBA]" para poder borrarlo de una vez.
 */
export async function crearEntornoPrueba() {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  const hoy = new Date();
  const manana = new Date(Date.now() + 86400000);

  await db.insert(events).values({
    name: "[PRUEBA] Ensayo Level Pass",
    startDate: hoy,
    endDate: manana,
    location: "Entorno de pruebas",
    active: true,
  });
  const [evento] = await db.select().from(events).orderBy(desc(events.id)).limit(1);

  await db.insert(ticketTypes).values([
    { eventId: evento.id, name: "General 1 día", priceUsd: "15.00", days: 1, sortOrder: 1 },
    { eventId: evento.id, name: "Pase completo 2 días", priceUsd: "25.00", days: 2, sortOrder: 2 },
  ]);
  const tipos = await db.select().from(ticketTypes).where(eq(ticketTypes.eventId, evento.id));

  await db.insert(levelActivities).values([
    { eventId: evento.id, name: "Compra en tienda aliada", description: "Cualquier compra en los stands autorizados", xp: 60, ubicacion: "Zona de tiendas", repetible: true, maxVeces: 5, sortOrder: 1 },
    { eventId: evento.id, name: "Foto en el photocall", description: "Súbela con la etiqueta del evento", xp: 40, ubicacion: "Entrada principal", sortOrder: 2 },
    { eventId: evento.id, name: "Torneo de cartas", description: "Participa en una partida completa", xp: 80, ubicacion: "Tarima 2", sortOrder: 3 },
    { eventId: evento.id, name: "Desfile de cosplay", description: "Preséntate en la pasarela", xp: 120, ubicacion: "Escenario principal", sortOrder: 4 },
    { eventId: evento.id, name: "Compra en food trucks", description: "Se puede repetir", xp: 30, ubicacion: "Zona de comida", repetible: true, maxVeces: 3, sortOrder: 5 },
  ]);

  // Boletos ya vendidos, para probar sin tener que venderlos primero
  const nombres = [
    ["Ana", "Prueba"],
    ["Luis", "Ensayo"],
    ["María", "Demo"],
  ];
  const lote = `PRUEBA${Date.now().toString().slice(-6)}`;

  // Los vendidos y los vacíos se insertan por separado: al mezclarlos en una
  // sola operación las filas tenían distinta forma y la consulta fallaba.
  await db.insert(eventTickets).values(
    nombres.map((n, i) => ({
      eventId: evento.id,
      token: nanoid(32).replace(/[^a-zA-Z0-9]/g, "x"),
      code: `IW-TEST0${i + 1}`,
      status: "sold",
      ticketTypeId: tipos[i % tipos.length].id,
      storeId: null,
      buyerName: n[0],
      buyerLastName: n[1],
      buyerPhone: "0400-0000000",
      priceUsd: tipos[i % tipos.length].priceUsd,
      rateBs: null,
      priceBs: null,
      soldAt: new Date(),
      soldByUserId: null,
      batch: lote,
    })) as any,
  );

  await db.insert(eventTickets).values(
    [1, 2].map(i => ({
      eventId: evento.id,
      token: nanoid(32).replace(/[^a-zA-Z0-9]/g, "x"),
      code: `IW-LIBRE${i}`,
      status: "blank",
      ticketTypeId: null,
      storeId: null,
      buyerName: null,
      buyerLastName: null,
      buyerPhone: null,
      priceUsd: null,
      rateBs: null,
      priceBs: null,
      soldAt: null,
      soldByUserId: null,
      batch: lote,
    })) as any,
  );

  return {
    eventId: evento.id,
    codigosVendidos: ["IW-TEST01", "IW-TEST02", "IW-TEST03"],
    codigosLibres: ["IW-LIBRE1", "IW-LIBRE2"],
  };
}

/** Borra todo lo creado por el entorno de prueba */
export async function borrarEntornoPrueba() {
  const db = await getDb();
  if (!db) return { borrados: 0 };

  const pruebas = (await db.select().from(events))
    .filter(e => e.name.startsWith("[PRUEBA]"));

  for (const ev of pruebas) {
    const boletos = await db.select().from(eventTickets).where(eq(eventTickets.eventId, ev.id));
    for (const b of boletos) {
      await db.delete(levelGrants).where(eq(levelGrants.ticketId, b.id));
      await db.delete(levelProgress).where(eq(levelProgress.ticketId, b.id));
      await db.delete(levelRankUps).where(eq(levelRankUps.ticketId, b.id));
    }
    await db.delete(eventTickets).where(eq(eventTickets.eventId, ev.id));
    await db.delete(levelActivities).where(eq(levelActivities.eventId, ev.id));
    await db.delete(ticketTypes).where(eq(ticketTypes.eventId, ev.id));
    await db.delete(events).where(eq(events.id, ev.id));
  }

  return { borrados: pruebas.length };
}
