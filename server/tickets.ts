import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { diaDelEventoVE, fechaVE } from "@shared/diaEvento";
import { conCandado } from "./candado";
import { notifyTicketPurchased } from "./_core/notification";
import {
  events, ticketTypes, stores, eventTickets, ticketCheckins, gateUsers, users, siteSettings,
} from "../drizzle/schema";

/**
 * Boletería de eventos.
 *
 * Los boletos se generan EN BLANCO: solo llevan un token aleatorio impreso en
 * el QR. La tienda autorizada los escanea al venderlos, elige el tipo y
 * registra al comprador. Una vez vendido, la tienda ya no puede editarlo.
 */

/** Token del QR: largo y aleatorio, nunca secuencial */
function nuevoToken() {
  return nanoid(32).replace(/[^a-zA-Z0-9]/g, "x");
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

export async function crearEvento(data: {
  name: string; startDate: string; endDate: string; location?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  await db.insert(events).values({
    name: data.name,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    location: data.location,
  });
  const [row] = await db.select().from(events).orderBy(desc(events.id)).limit(1);
  return row;
}

export async function listarEventos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).orderBy(desc(events.id));
}

export async function editarEvento(id: number, data: Partial<{
  name: string; startDate: string; endDate: string; location: string; active: boolean;
}>) {
  const db = await getDb();
  if (!db) return;
  const cambios: any = {};
  if (data.name !== undefined) cambios.name = data.name;
  if (data.location !== undefined) cambios.location = data.location;
  if (data.active !== undefined) cambios.active = data.active;
  if (data.startDate) cambios.startDate = new Date(data.startDate);
  if (data.endDate) cambios.endDate = new Date(data.endDate);
  await db.update(events).set(cambios).where(eq(events.id, id));
}

// ─── Tipos de boleto ──────────────────────────────────────────────────────────

export async function crearTipoBoleto(data: {
  eventId: number; name: string; priceUsd: string; days: number; perks?: string; sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  await db.insert(ticketTypes).values({
    eventId: data.eventId,
    name: data.name,
    priceUsd: data.priceUsd,
    days: data.days,
    perks: data.perks,
    sortOrder: data.sortOrder ?? 0,
  });
}

export async function listarTipos(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ticketTypes)
    .where(eq(ticketTypes.eventId, eventId))
    .orderBy(ticketTypes.sortOrder, ticketTypes.id);
}

export async function editarTipo(id: number, data: Partial<{
  name: string; priceUsd: string; days: number; perks: string; active: boolean; sortOrder: number;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(ticketTypes).set(data as any).where(eq(ticketTypes.id, id));
}

export async function borrarTipo(id: number) {
  const db = await getDb();
  if (!db) return;
  // No se borra si ya hay boletos vendidos con ese tipo: se desactiva
  const [usado] = await db.select({ n: sql<number>`count(*)` })
    .from(eventTickets).where(eq(eventTickets.ticketTypeId, id));
  if ((usado?.n ?? 0) > 0) {
    await db.update(ticketTypes).set({ active: false }).where(eq(ticketTypes.id, id));
    return { desactivado: true };
  }
  await db.delete(ticketTypes).where(eq(ticketTypes.id, id));
  return { desactivado: false };
}

// ─── Tiendas ──────────────────────────────────────────────────────────────────

export async function crearTienda(data: {
  name: string; email?: string; contactName?: string; phone?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  // Guarda contra duplicados: un doble toque en el botón creaba dos tiendas.
  const nombreLimpio = data.name.trim();
  const correoLimpio = data.email?.trim().toLowerCase();

  const existentes = await db.select().from(stores);
  const yaExiste = existentes.find(t =>
    t.name.trim().toLowerCase() === nombreLimpio.toLowerCase() ||
    (correoLimpio && t.email === correoLimpio)
  );
  if (yaExiste) {
    throw new Error(`Ya existe una tienda con ese ${yaExiste.email === correoLimpio ? "correo" : "nombre"}`);
  }

  let userId: number | undefined;

  // Si se da un correo, se le crea (o reutiliza) la cuenta con rol `store`,
  // para que pueda entrar al portal con enlace mágico.
  if (data.email) {
    const correo = data.email.trim().toLowerCase();
    const [existente] = await db.select().from(users).where(eq(users.email, correo)).limit(1);
    if (existente) {
      userId = existente.id;
      if (existente.role !== "admin") {
        await db.update(users).set({ role: "store" }).where(eq(users.id, existente.id));
      }
    } else {
      await db.insert(users).values({
        openId: `store_${nanoid(20)}`,
        email: correo,
        name: data.name,
        role: "store",
        loginMethod: "magic_link",
      });
      const [creado] = await db.select().from(users).where(eq(users.email, correo)).limit(1);
      userId = creado?.id;
    }
  }

  await db.insert(stores).values({
    name: nombreLimpio,
    userId,
    contactName: data.contactName,
    phone: data.phone,
    email: correoLimpio,
  });
}

export async function listarTiendas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stores).orderBy(desc(stores.id));
}

export async function editarTienda(id: number, data: Partial<{ name: string; phone: string; contactName: string; active: boolean; puedeOtorgarXp: boolean }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(stores).set(data as any).where(eq(stores.id, id));
}

/** Tienda a la que pertenece un usuario, para el portal de venta */
export async function tiendaDeUsuario(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select().from(stores).where(eq(stores.userId, userId)).limit(1);
  return row;
}

// ─── Boletos ──────────────────────────────────────────────────────────────────

/**
 * Genera boletos en blanco. Se crean con token aleatorio y código corto
 * legible; el tipo y el comprador se asignan al venderlos.
 */
export async function generarBoletos(eventId: number, cantidad: number) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  if (cantidad < 1 || cantidad > 1000) throw new Error("Cantidad entre 1 y 1000");

  // El evento debe existir: antes se podían generar boletos huérfanos que
  // luego fallaban al escanearse.
  const [ev] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!ev) throw new Error("Ese evento no existe");

  const lote = `L${Date.now().toString().slice(-8)}`;

  /**
   * Los códigos se comprueban contra los que ya existen antes de insertarlos.
   *
   * La columna es única, así que un choque nunca produciría dos boletos
   * iguales — pero haría fallar el lote completo. Con seis caracteres hay
   * 2.176 millones de combinaciones, y el riesgo de repetir sube con el
   * volumen: a partir de unos miles de boletos deja de ser despreciable.
   * Comprobar antes cuesta una consulta y elimina el problema.
   */
  const existentes = new Set(
    (await db.select({ code: eventTickets.code }).from(eventTickets)).map(r => r.code),
  );

  const nuevoCodigo = () => {
    for (let intento = 0; intento < 40; intento++) {
      const c = `IW-${nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, "X")}`;
      if (!existentes.has(c)) {
        existentes.add(c);
        return c;
      }
    }
    // Con tantos choques seguidos, se alarga el código antes que fallar
    const largo = `IW-${nanoid(9).toUpperCase().replace(/[^A-Z0-9]/g, "X")}`;
    existentes.add(largo);
    return largo;
  };

  const filas = Array.from({ length: cantidad }, () => ({
    eventId,
    token: nuevoToken(),
    code: nuevoCodigo(),
    status: "blank",
    batch: lote,
  }));

  // Por tandas: un solo INSERT de mil filas puede pasarse del tamaño permitido
  for (let i = 0; i < filas.length; i += 200) {
    await db.insert(eventTickets).values(filas.slice(i, i + 200));
  }

  const creados = await db.select().from(eventTickets)
    .where(and(eq(eventTickets.eventId, eventId), eq(eventTickets.batch, lote)))
    .orderBy(eventTickets.id);

  return { lote, boletos: creados };
}

/**
 * Busca un boleto por su token (el del QR) o por su código impreso.
 *
 * Antes solo buscaba por token, así que teclear el código a mano no
 * encontraba nada: son dos identificadores distintos del mismo boleto.
 */
export async function boletoPorToken(tokenOCodigo: string) {
  const db = await getDb();
  if (!db) return undefined;

  const valor = tokenOCodigo.trim();

  let [t] = await db.select().from(eventTickets).where(eq(eventTickets.token, valor)).limit(1);

  if (!t) {
    // Se prueba como código impreso, sin distinguir mayúsculas ni el prefijo
    const codigo = valor.toUpperCase();
    const conPrefijo = codigo.startsWith("IW-") ? codigo : `IW-${codigo}`;
    [t] = await db.select().from(eventTickets).where(eq(eventTickets.code, conPrefijo)).limit(1);
  }

  if (!t) return undefined;

  // Los datos de apoyo se consultan por separado y sin romper el escaneo: si
  // alguna consulta falla, el boleto se devuelve igual. Antes un fallo aquí
  // tumbaba todo el escaneo con un error genérico.
  let evento: any = undefined;
  let tipo: any = undefined;
  let tienda: any = undefined;
  let ingresos: any[] = [];

  try {
    [evento] = await db.select().from(events).where(eq(events.id, t.eventId)).limit(1);
  } catch (e) { console.error("[Boleto] No se pudo leer el evento:", e); }

  try {
    if (t.ticketTypeId) {
      [tipo] = await db.select().from(ticketTypes).where(eq(ticketTypes.id, t.ticketTypeId)).limit(1);
    }
  } catch (e) { console.error("[Boleto] No se pudo leer el tipo:", e); }

  try {
    if (t.storeId) {
      [tienda] = await db.select().from(stores).where(eq(stores.id, t.storeId)).limit(1);
    }
  } catch (e) { console.error("[Boleto] No se pudo leer la tienda:", e); }

  try {
    ingresos = await db.select().from(ticketCheckins).where(eq(ticketCheckins.ticketId, t.id));
  } catch (e) { console.error("[Boleto] No se pudieron leer los ingresos:", e); }

  return { ticket: t, evento, tipo, tienda, ingresos };
}

/**
 * Activa un boleto al venderlo. Solo la tienda autorizada, y una sola vez:
 * después queda bloqueado para ella (el admin sí puede corregir).
 */
export async function venderBoleto(data: {
  token: string;
  ticketTypeId: number;
  buyerName: string;
  buyerLastName: string;
  buyerPhone: string;
  buyerEmail?: string;
  storeId: number;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  const encontrado = await boletoPorToken(data.token);
  const t = encontrado?.ticket;
  if (!t) throw new Error("Ese boleto no existe");
  if (t.status === "void") throw new Error("Ese boleto fue anulado");
  if (t.status !== "blank") throw new Error("Ese boleto ya fue vendido");

  const [tipo] = await db.select().from(ticketTypes).where(eq(ticketTypes.id, data.ticketTypeId)).limit(1);
  if (!tipo || tipo.eventId !== t.eventId) throw new Error("Ese tipo de boleto no es de este evento");
  if (!tipo.active) throw new Error("Ese tipo de boleto ya no está a la venta");
  const [evVenta] = await db.select().from(events).where(eq(events.id, t.eventId)).limit(1);
  if (!evVenta?.active) throw new Error("La venta de este evento está cerrada");

  // La tasa se congela en el momento de la venta: si mañana cambia, este
  // boleto conserva el precio en bolívares con el que se vendió.
  const [rateRow] = await db.select().from(siteSettings).where(eq(siteSettings.key, "bs_rate")).limit(1);
  const tasa = parseFloat(rateRow?.value ?? "0") || 0;
  const precioUsd = parseFloat(tipo.priceUsd as any);
  const precioBs = tasa > 0 ? Math.round(precioUsd * tasa * 100) / 100 : null;

  // La venta se marca con la condición de que el boleto SIGA en blanco. Si dos
  // tiendas escanean el mismo boleto a la vez, solo una consulta afecta filas
  // y la otra falla: sin esto, ambas lo vendían y el segundo comprador
  // sobrescribía al primero.
  const res: any = await db.update(eventTickets).set({
    status: "sold",
    ticketTypeId: tipo.id,
    storeId: data.storeId,
    buyerName: data.buyerName.trim().slice(0, 200),
    buyerLastName: data.buyerLastName.trim().slice(0, 200),
    buyerPhone: data.buyerPhone.trim().slice(0, 50),
    buyerEmail: data.buyerEmail?.trim().toLowerCase().slice(0, 320) || null,
    priceUsd: precioUsd.toFixed(2),
    rateBs: tasa > 0 ? tasa.toFixed(2) : null,
    priceBs: precioBs != null ? precioBs.toFixed(2) : null,
    soldAt: new Date(),
    soldByUserId: data.userId,
  }).where(and(eq(eventTickets.id, t.id), eq(eventTickets.status, "blank")));

  const afectadas = res?.[0]?.affectedRows ?? res?.affectedRows ?? 1;
  if (!afectadas) {
    throw new Error("Ese boleto acaba de venderse en otro dispositivo");
  }

  // Comprobante para el comprador. No detiene la venta si falla: el boleto
  // ya está vendido y el correo se puede reenviar después.
  if (data.buyerEmail) {
    try {
      const [ev] = await db.select().from(events).where(eq(events.id, t.eventId)).limit(1);
      const [tienda] = await db.select().from(stores).where(eq(stores.id, data.storeId)).limit(1);

      const fechas = ev?.startDate
        ? `${new Date(ev.startDate).toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" })}` +
          (ev.endDate && new Date(ev.endDate).getTime() !== new Date(ev.startDate).getTime()
            ? ` — ${new Date(ev.endDate).toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" })}`
            : "")
        : undefined;

      await notifyTicketPurchased(data.buyerEmail, {
        nombre: data.buyerName,
        codigo: t.code,
        evento: ev?.name ?? "Isekai World Fest",
        tipo: tipo.name,
        precioUsd: String(precioUsd),
        tienda: tienda?.name,
        fechas,
      });
    } catch (e) {
      console.error(`[Boleto] No se pudo enviar el comprobante de ${t.code}:`, e);
    }
  }

  return {
    code: t.code,
    tipo: tipo.name,
    precioUsd,
    precioBs,
    tasa,
    comprador: `${data.buyerName} ${data.buyerLastName}`,
    correoEnviado: Boolean(data.buyerEmail),
  };
}

/**
 * Corrección por parte del admin (la tienda no puede). Si cambia el tipo, el
 * precio se recalcula con la misma tasa con la que se vendió.
 */
export async function corregirBoleto(id: number, data: Partial<{
  buyerName: string; buyerLastName: string; buyerPhone: string; buyerEmail: string | null; ticketTypeId: number; status: string;
}>) {
  const db = await getDb();
  if (!db) return;
  const [t] = await db.select().from(eventTickets).where(eq(eventTickets.id, id)).limit(1);
  if (!t) throw new Error("Ese boleto no existe");
  const cambios: any = {};
  for (const k of ["buyerName", "buyerLastName", "buyerPhone"] as const) {
    if (data[k] !== undefined) cambios[k] = String(data[k]).trim().slice(0, 200);
  }
  if (data.buyerEmail !== undefined) cambios.buyerEmail = data.buyerEmail ? data.buyerEmail.trim().toLowerCase().slice(0, 320) : null;
  if (data.ticketTypeId !== undefined && data.ticketTypeId !== t.ticketTypeId) {
    const [tipo] = await db.select().from(ticketTypes).where(eq(ticketTypes.id, data.ticketTypeId)).limit(1);
    if (!tipo || tipo.eventId !== t.eventId) throw new Error("Tipo de boleto inválido");
    const usd = parseFloat(tipo.priceUsd as any);
    const tasa = parseFloat((t.rateBs as any) ?? "0") || 0;
    cambios.ticketTypeId = tipo.id;
    cambios.priceUsd = usd.toFixed(2);
    cambios.priceBs = tasa > 0 ? (Math.round(usd * tasa * 100) / 100).toFixed(2) : null;
  }
  if (data.status !== undefined) {
    if (data.status === "blank") throw new Error("Para devolver un boleto a blanco usa «Deshacer venta»");
    if (data.status === "sold" && !t.buyerName) throw new Error("Ese boleto no tiene comprador: véndelo desde el portal");
    cambios.status = data.status;
  }
  if (Object.keys(cambios).length) await db.update(eventTickets).set(cambios).where(eq(eventTickets.id, id));
  return { ok: true };
}

/**
 * Deshace una venta mal hecha: el boleto vuelve a quedar en blanco para
 * venderse de nuevo. No se permite si ya entró al evento o ya ganó EXP,
 * porque se perdería ese historial (en ese caso, mejor anularlo).
 */
export async function deshacerVenta(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  const [t] = await db.select().from(eventTickets).where(eq(eventTickets.id, id)).limit(1);
  if (!t) throw new Error("Ese boleto no existe");
  if (t.status === "blank") return { ok: true };
  const ingresos = await db.select({ id: ticketCheckins.id }).from(ticketCheckins).where(eq(ticketCheckins.ticketId, id)).limit(1);
  if (ingresos.length) throw new Error("Este boleto ya entró al evento: no se puede deshacer la venta. Puedes anularlo.");
  const [xp] = await db.execute(sql`SELECT COUNT(*) AS n FROM levelGrants WHERE ticketId = ${id}`).catch(() => [[{ n: 0 }]]) as any;
  if (Number(xp?.[0]?.n ?? 0) > 0) throw new Error("Este boleto ya ganó EXP: no se puede deshacer la venta. Puedes anularlo.");
  await db.update(eventTickets).set({
    status: "blank", ticketTypeId: null, storeId: null,
    buyerName: null, buyerLastName: null, buyerPhone: null, buyerEmail: null,
    priceUsd: null, rateBs: null, priceBs: null, soldAt: null, soldByUserId: null,
  } as any).where(eq(eventTickets.id, id));
  return { ok: true };
}

/** Vuelve a enviar el comprobante al correo del comprador */
export async function reenviarComprobante(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  const [t] = await db.select().from(eventTickets).where(eq(eventTickets.id, id)).limit(1);
  if (!t || t.status !== "sold") throw new Error("Ese boleto no está vendido");
  if (!t.buyerEmail) throw new Error("Este boleto no tiene correo. Agrégalo primero en «Corregir datos».");
  const [ev] = await db.select().from(events).where(eq(events.id, t.eventId)).limit(1);
  const [tipo] = t.ticketTypeId ? await db.select().from(ticketTypes).where(eq(ticketTypes.id, t.ticketTypeId)).limit(1) : [];
  const [tienda] = t.storeId ? await db.select().from(stores).where(eq(stores.id, t.storeId)).limit(1) : [];
  await notifyTicketPurchased(t.buyerEmail, {
    nombre: t.buyerName ?? "",
    codigo: t.code,
    evento: ev?.name ?? "Isekai World Fest",
    tipo: tipo?.name ?? "",
    precioUsd: String(parseFloat((t.priceUsd as any) ?? "0")),
    tienda: tienda?.name,
    fechas: ev?.startDate ? new Date(ev.startDate).toLocaleDateString("es-VE", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" }) : undefined,
  });
  return { ok: true, correo: t.buyerEmail };
}

/** Un boleto con sus ingresos y su EXP, para el detalle del panel */
export async function listarBoletosPorId(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [t] = await db.select().from(eventTickets).where(eq(eventTickets.id, id)).limit(1);
  if (!t) return null;
  const ingresos = await db.select().from(ticketCheckins).where(eq(ticketCheckins.ticketId, id));
  const [xp] = await db.execute(sql`SELECT COALESCE(SUM(xp), 0) AS xp, COUNT(*) AS n FROM levelGrants WHERE ticketId = ${id}`).catch(() => [[{ xp: 0, n: 0 }]]) as any;
  return {
    ingresos: ingresos.map(i => ({ dia: i.eventDay, hora: i.checkedAt, sinConexion: i.offline })).sort((a, b) => a.dia - b.dia),
    xp: Number(xp?.[0]?.xp ?? 0),
    actividades: Number(xp?.[0]?.n ?? 0),
  };
}

/**
 * Orden útil de los eventos activos: primero el que está ocurriendo hoy,
 * luego los próximos (el más cercano primero) y al final los ya pasados.
 * Antes se tomaba el último creado, y con un evento de prueba o el del año
 * siguiente activo, la puerta y las tiendas abrían el evento equivocado.
 */
export function ordenarEventos<T extends { startDate: Date | string; endDate: Date | string; active: boolean }>(lista: T[]): T[] {
  const ahora = Date.now();
  const peso = (e: T) => {
    if (diaDelEvento(e) !== null) return 0;
    return new Date(e.startDate).getTime() > ahora ? 1 : 2;
  };
  return lista.filter(e => e.active).sort((a, b) => {
    const pa = peso(a), pb = peso(b);
    if (pa !== pb) return pa - pb;
    const da = new Date(a.startDate).getTime(), dbb = new Date(b.startDate).getTime();
    return pa === 2 ? dbb - da : da - dbb;
  });
}

// ─── Listados y totales ───────────────────────────────────────────────────────

export async function listarBoletos(eventId: number, opts?: { status?: string; storeId?: number }) {
  const db = await getDb();
  if (!db) return [];

  const cond: any[] = [eq(eventTickets.eventId, eventId)];
  if (opts?.status === "emitidos") cond.push(inArray(eventTickets.status, ["sold", "void"]));
  else if (opts?.status && opts.status !== "all") cond.push(eq(eventTickets.status, opts.status));
  if (opts?.storeId) cond.push(eq(eventTickets.storeId, opts.storeId));

  const filas = await db.select().from(eventTickets)
    .where(and(...cond))
    .orderBy(desc(eventTickets.soldAt), desc(eventTickets.id))
    .limit(1000);

  const tipos = await listarTipos(eventId);
  const tiendas = await listarTiendas();

  return filas.map(t => ({
    ...t,
    tipoNombre: tipos.find(x => x.id === t.ticketTypeId)?.name ?? null,
    tiendaNombre: tiendas.find(x => x.id === t.storeId)?.name ?? null,
  }));
}

/** Totales del evento: por tipo, por tienda y balance general */
export async function resumenEvento(eventId: number) {
  const db = await getDb();
  if (!db) return null;

  const boletos = await db.select().from(eventTickets).where(eq(eventTickets.eventId, eventId));
  const tipos = await listarTipos(eventId);
  const tiendas = await listarTiendas();

  const vendidos = boletos.filter(b => b.status === "sold");
  const enBlanco = boletos.filter(b => b.status === "blank").length;

  const totalUsd = vendidos.reduce((a, b) => a + (parseFloat(b.priceUsd as any) || 0), 0);
  const totalBs = vendidos.reduce((a, b) => a + (parseFloat((b.priceBs as any) ?? "0") || 0), 0);

  const porTipo = tipos.map(t => {
    const delTipo = vendidos.filter(b => b.ticketTypeId === t.id);
    return {
      id: t.id,
      nombre: t.name,
      precioUsd: parseFloat(t.priceUsd as any),
      dias: t.days,
      cantidad: delTipo.length,
      totalUsd: Math.round(delTipo.reduce((a, b) => a + (parseFloat(b.priceUsd as any) || 0), 0) * 100) / 100,
    };
  });

  const porTienda = tiendas.map(s => {
    const deLaTienda = vendidos.filter(b => b.storeId === s.id);
    return {
      id: s.id,
      nombre: s.name,
      cantidad: deLaTienda.length,
      totalUsd: Math.round(deLaTienda.reduce((a, b) => a + (parseFloat(b.priceUsd as any) || 0), 0) * 100) / 100,
      totalBs: Math.round(deLaTienda.reduce((a, b) => a + (parseFloat((b.priceBs as any) ?? "0") || 0), 0) * 100) / 100,
    };
  }).filter(x => x.cantidad > 0);

  return {
    generados: boletos.length,
    enBlanco,
    vendidos: vendidos.length,
    totalUsd: Math.round(totalUsd * 100) / 100,
    totalBs: Math.round(totalBs * 100) / 100,
    porTipo,
    porTienda,
  };
}

/** Ventas de una tienda concreta, para su propio portal */
export async function ventasDeTienda(storeId: number, eventId: number) {
  const db = await getDb();
  if (!db) return { cantidad: 0, totalUsd: 0, totalBs: 0, boletos: [] as any[] };

  const filas = await db.select().from(eventTickets)
    .where(and(eq(eventTickets.storeId, storeId), eq(eventTickets.eventId, eventId), eq(eventTickets.status, "sold")))
    .orderBy(desc(eventTickets.soldAt))
    .limit(500);

  const tipos = await listarTipos(eventId);

  return {
    cantidad: filas.length,
    totalUsd: Math.round(filas.reduce((a, b) => a + (parseFloat(b.priceUsd as any) || 0), 0) * 100) / 100,
    totalBs: Math.round(filas.reduce((a, b) => a + (parseFloat((b.priceBs as any) ?? "0") || 0), 0) * 100) / 100,
    boletos: filas.map(t => ({ ...t, tipoNombre: tipos.find(x => x.id === t.ticketTypeId)?.name ?? null })),
  };
}

/** Elimina una tienda. Si ya vendió boletos, se desactiva en lugar de borrar
    para no perder el registro de quién vendió qué. */
export async function borrarTienda(id: number) {
  const db = await getDb();
  if (!db) return { desactivada: false };

  const [conVentas] = await db.select({ n: sql<number>`count(*)` })
    .from(eventTickets).where(eq(eventTickets.storeId, id));

  if ((conVentas?.n ?? 0) > 0) {
    await db.update(stores).set({ active: false }).where(eq(stores.id, id));
    return { desactivada: true };
  }
  await db.delete(stores).where(eq(stores.id, id));
  return { desactivada: false };
}

/**
 * Rol que le corresponde a un correo al iniciar sesión.
 *
 * Al autorizar una tienda se crea su usuario con un identificador propio, pero
 * cuando la persona entra con Google el sistema usa OTRO identificador y creaba
 * un usuario nuevo con rol normal: la tienda quedaba sin acceso. Aquí se
 * comprueba por correo y se le devuelve el rol correcto.
 */
export async function rolPorCorreo(email: string): Promise<"store" | null> {
  const db = await getDb();
  if (!db || !email) return null;
  const correo = email.trim().toLowerCase();
  const [tienda] = await db.select().from(stores).where(eq(stores.email, correo)).limit(1);
  return tienda ? "store" : null;
}

/** Vincula el usuario recién logueado con su tienda */
export async function vincularUsuarioTienda(email: string, userId: number) {
  const db = await getDb();
  if (!db || !email) return;
  const correo = email.trim().toLowerCase();
  await db.update(stores).set({ userId }).where(eq(stores.email, correo));
}

/** Lotes generados de un evento, con su estado: para reimprimir o revisar */
export async function lotesDeEvento(eventId: number) {
  const db = await getDb();
  if (!db) return [];

  const filas = await db.select().from(eventTickets).where(eq(eventTickets.eventId, eventId));

  const porLote = new Map<string, { lote: string; total: number; vendidos: number; enBlanco: number; creado: Date | null }>();
  for (const t of filas) {
    const clave = t.batch ?? "sin-lote";
    const actual = porLote.get(clave) ?? { lote: clave, total: 0, vendidos: 0, enBlanco: 0, creado: t.createdAt };
    actual.total++;
    if (t.status === "sold") actual.vendidos++;
    if (t.status === "blank") actual.enBlanco++;
    porLote.set(clave, actual);
  }

  return Array.from(porLote.values()).sort((a, b) => b.lote.localeCompare(a.lote));
}

/** Boletos de un lote, para volver a imprimir sus QR */
export async function boletosDeLote(eventId: number, lote: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(eventTickets)
    .where(and(eq(eventTickets.eventId, eventId), eq(eventTickets.batch, lote)))
    .orderBy(eventTickets.id);
}

/** Ventas por día, para la gráfica */
export async function ventasPorDia(eventId: number) {
  const db = await getDb();
  if (!db) return [];

  const filas = await db.select().from(eventTickets)
    .where(and(eq(eventTickets.eventId, eventId), eq(eventTickets.status, "sold")));

  const porDia = new Map<string, { dia: string; cantidad: number; usd: number }>();
  for (const t of filas) {
    if (!t.soldAt) continue;
    const dia = fechaVE(new Date(t.soldAt));
    const actual = porDia.get(dia) ?? { dia, cantidad: 0, usd: 0 };
    actual.cantidad++;
    actual.usd += parseFloat(t.priceUsd as any) || 0;
    porDia.set(dia, actual);
  }

  return Array.from(porDia.values())
    .map(d => ({ ...d, usd: Math.round(d.usd * 100) / 100 }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

// ─── Control de acceso al evento ──────────────────────────────────────────────

/**
 * Qué día del evento es hoy (1, 2, …). Devuelve null si la fecha actual cae
 * fuera del evento: sin esto no se podría distinguir "ya entró hoy" de
 * "ya entró ayer", que es lo que impide reusar un boleto de un solo día.
 */
export function diaDelEvento(evento: { startDate: Date | string; endDate: Date | string }, fecha = new Date()) {
  return diaDelEventoVE(evento, fecha);
}

/** Todo lo que el portero necesita para validar sin conexión */
export async function paqueteAcceso(eventId: number) {
  const db = await getDb();
  if (!db) return null;

  const [evento] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!evento) return null;

  const tipos = await listarTipos(eventId);
  const vendidos = await db.select().from(eventTickets)
    .where(and(eq(eventTickets.eventId, eventId), eq(eventTickets.status, "sold")));

  const ingresos = await db.select().from(ticketCheckins);
  const porBoleto = new Map<number, number[]>();
  for (const i of ingresos) {
    porBoleto.set(i.ticketId, [...(porBoleto.get(i.ticketId) ?? []), i.eventDay]);
  }

  return {
    evento: {
      id: evento.id,
      name: evento.name,
      startDate: evento.startDate,
      endDate: evento.endDate,
    },
    diaActual: diaDelEvento(evento),
    // Solo lo imprescindible: el paquete viaja al teléfono del portero
    boletos: vendidos.map(t => ({
      token: t.token,
      code: t.code,
      nombre: `${t.buyerName ?? ""} ${t.buyerLastName ?? ""}`.trim(),
      tipoId: t.ticketTypeId,
      dias: tipos.find(x => x.id === t.ticketTypeId)?.days ?? 1,
      tipoNombre: tipos.find(x => x.id === t.ticketTypeId)?.name ?? "",
      diasUsados: porBoleto.get(t.id) ?? [],
    })),
    generadoEn: new Date().toISOString(),
  };
}

/**
 * Registra el ingreso de un boleto.
 *
 * Reglas: el boleto debe estar vendido, la fecha debe caer dentro del evento,
 * el día debe estar cubierto por el tipo comprado (un boleto de un día no vale
 * el segundo), y no puede haber entrado ya ese mismo día.
 */
export async function registrarIngreso(data: {
  token: string;
  userId: number;
  offline?: boolean;
  /** Día forzado, solo para sincronizar ingresos guardados sin conexión */
  diaForzado?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  const encontrado = await boletoPorToken(data.token);
  const t = encontrado?.ticket;
  if (!t) return { ok: false, motivo: "inexistente" as const, mensaje: "Ese boleto no existe" };
  await asegurarIndiceIngresos();
  // Un boleto a la vez: dos puertas escaneando el mismo no lo dejan pasar dos veces
  return conCandado(`ingreso:${t.id}`, () => registrarIngresoDe(t, data));
}

/**
 * Índice único (boleto, día) en la base: segunda barrera contra ingresos
 * repetidos. Se crea solo, una vez por arranque; si ya hay repetidos viejos
 * no se puede crear y se avisa en el registro, sin frenar nada.
 */
let indiceListo: Promise<void> | null = null;
function asegurarIndiceIngresos() {
  if (!indiceListo) {
    indiceListo = (async () => {
      const db = await getDb();
      if (!db) return;
      try {
        const [filas] = await db.execute(sql`SHOW INDEX FROM ticketCheckins WHERE Key_name = 'uq_ingreso_dia'`) as unknown as [unknown[]];
        if (!filas?.length) {
          await db.execute(sql`CREATE UNIQUE INDEX uq_ingreso_dia ON ticketCheckins (ticketId, eventDay)`);
          console.log("[Acceso] Índice único de ingresos creado");
        }
      } catch (e) {
        console.warn("[Acceso] No se pudo crear el índice único de ingresos (¿hay ingresos repetidos?):", (e as Error).message);
      }
    })();
  }
  return indiceListo;
}

async function registrarIngresoDe(t: typeof eventTickets.$inferSelect, data: { token: string; userId: number; offline?: boolean; diaForzado?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  if (t.status === "void") return { ok: false, motivo: "anulado" as const, mensaje: "Boleto anulado" };
  if (t.status !== "sold") {
    return { ok: false, motivo: "sin_vender" as const, mensaje: "Este boleto no fue vendido" };
  }

  const [evento] = await db.select().from(events).where(eq(events.id, t.eventId)).limit(1);
  if (!evento) return { ok: false, motivo: "sin_evento" as const, mensaje: "El evento no existe" };

  const dia = data.diaForzado ?? diaDelEvento(evento);
  if (!dia) {
    return { ok: false, motivo: "fuera_de_fecha" as const, mensaje: "Hoy no hay evento" };
  }

  const tipo = t.ticketTypeId
    ? (await db.select().from(ticketTypes).where(eq(ticketTypes.id, t.ticketTypeId)).limit(1))[0]
    : undefined;
  const diasCubiertos = tipo?.days ?? 1;

  if (dia > diasCubiertos) {
    return {
      ok: false,
      motivo: "dia_no_cubierto" as const,
      mensaje: `Este boleto es solo para ${diasCubiertos} día(s) y hoy es el día ${dia}`,
      nombre: `${t.buyerName ?? ""} ${t.buyerLastName ?? ""}`.trim(),
      tipoNombre: tipo?.name,
    };
  }

  const previos = await db.select().from(ticketCheckins)
    .where(and(eq(ticketCheckins.ticketId, t.id), eq(ticketCheckins.eventDay, dia)));

  if (previos.length) {
    return {
      ok: false,
      motivo: "ya_entro" as const,
      mensaje: "Este boleto ya entró hoy",
      entroA: previos[0].checkedAt,
      nombre: `${t.buyerName ?? ""} ${t.buyerLastName ?? ""}`.trim(),
      tipoNombre: tipo?.name,
    };
  }

  try {
    await db.insert(ticketCheckins).values({
      ticketId: t.id,
      eventDay: dia,
      checkedByUserId: data.userId,
      offline: Boolean(data.offline),
    });
  } catch (e: any) {
    // El índice único lo frenó: alguien lo registró en ese mismo instante
    if (String(e?.cause?.code ?? e?.code ?? e?.message).includes("DUP")) {
      return { ok: false, motivo: "ya_entro" as const, mensaje: "Este boleto ya entró hoy", entroA: new Date(), nombre: `${t.buyerName ?? ""} ${t.buyerLastName ?? ""}`.trim(), tipoNombre: tipo?.name };
    }
    throw e;
  }

  return {
    ok: true as const,
    motivo: "ok" as const,
    mensaje: "Acceso permitido",
    nombre: `${t.buyerName ?? ""} ${t.buyerLastName ?? ""}`.trim(),
    tipoNombre: tipo?.name,
    dia,
    diasCubiertos,
  };
}

/** Resumen de asistencia del evento */
export async function resumenAsistencia(eventId: number) {
  const db = await getDb();
  if (!db) return null;

  const [evento] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!evento) return null;

  const vendidos = await db.select().from(eventTickets)
    .where(and(eq(eventTickets.eventId, eventId), eq(eventTickets.status, "sold")));
  const idsVendidos = new Set(vendidos.map(t => t.id));

  const ingresos = (await db.select().from(ticketCheckins))
    .filter(i => idsVendidos.has(i.ticketId));

  const porDia = new Map<number, number>();
  for (const i of ingresos) porDia.set(i.eventDay, (porDia.get(i.eventDay) ?? 0) + 1);

  return {
    vendidos: vendidos.length,
    ingresosTotales: ingresos.length,
    diaActual: diaDelEvento(evento),
    porDia: Array.from(porDia.entries())
      .map(([dia, cantidad]) => ({ dia, cantidad }))
      .sort((a, b) => a.dia - b.dia),
    sincronizadosSinConexion: ingresos.filter(i => i.offline).length,
  };
}

// ─── Porteros ─────────────────────────────────────────────────────────────────

export async function crearPortero(data: { name: string; email?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  const correo = data.email?.trim().toLowerCase();
  const existentes = await db.select().from(gateUsers);
  if (correo && existentes.some(g => g.email === correo)) {
    throw new Error("Ya existe un portero con ese correo");
  }

  let userId: number | undefined;
  if (correo) {
    const [u] = await db.select().from(users).where(eq(users.email, correo)).limit(1);
    if (u) {
      userId = u.id;
      if (u.role !== "admin") await db.update(users).set({ role: "gate" }).where(eq(users.id, u.id));
    } else {
      await db.insert(users).values({
        openId: `gate_${nanoid(20)}`,
        email: correo,
        name: data.name,
        role: "gate",
        loginMethod: "magic_link",
      });
      const [creado] = await db.select().from(users).where(eq(users.email, correo)).limit(1);
      userId = creado?.id;
    }
  }

  await db.insert(gateUsers).values({ name: data.name.trim(), email: correo, userId });
}

export async function listarPorteros() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gateUsers).orderBy(desc(gateUsers.id));
}

export async function editarPortero(id: number, data: Partial<{ name: string; active: boolean }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(gateUsers).set(data as any).where(eq(gateUsers.id, id));
}

export async function borrarPortero(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(gateUsers).where(eq(gateUsers.id, id));
}

/** Rol de portero según el correo, para conservarlo al iniciar sesión */
export async function esPorteroPorCorreo(email: string): Promise<"gate" | null> {
  const db = await getDb();
  if (!db || !email) return null;
  const correo = email.trim().toLowerCase();
  const [g] = await db.select().from(gateUsers).where(eq(gateUsers.email, correo)).limit(1);
  return g?.active ? "gate" : null;
}

/**
 * Permisos del usuario actual, calculados por su correo en el momento.
 *
 * El rol se guarda al iniciar sesión, así que si alguien ya tenía la sesión
 * abierta cuando lo autorizaste, su cuenta seguía figurando como usuario
 * normal y el portal le pedía entrar de nuevo. Aquí se comprueba al vuelo y,
 * si el rol guardado no coincide, se corrige para que no vuelva a pasar.
 */
export async function miAccesoPorCorreo(userId: number, email: string, rolActual: string) {
  const { permisosDe, rolPrincipal } = await import("./permisos");
  const p = await permisosDe({ id: userId, email, role: rolActual });
  const rol = rolPrincipal(p);

  // El rol guardado se mantiene al día (también hacia abajo: si te quitan
  // el acceso, la cuenta vuelve a ser de usuario normal)
  if (rolActual !== "admin" && rol !== rolActual) {
    try {
      const db = await getDb();
      if (db) await db.update(users).set({ role: rol }).where(eq(users.id, userId));
    } catch (e) {
      console.warn("[Acceso] No se pudo actualizar el rol:", e);
    }
  }

  return {
    esTienda: Boolean(p.tienda) || p.admin,
    tiendaActiva: p.admin || Boolean(p.tienda?.active),
    esStaff: p.personalXp,
    esPortero: p.portero,
    puedeXp: p.xp,
    esRueda: p.rueda,
    rol,
  };
}
