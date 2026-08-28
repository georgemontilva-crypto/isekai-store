import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import {
  events, ticketTypes, stores, eventTickets, ticketCheckins, users, siteSettings,
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

export async function editarTienda(id: number, data: Partial<{ name: string; phone: string; contactName: string; active: boolean }>) {
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
  if (cantidad < 1 || cantidad > 500) throw new Error("Cantidad entre 1 y 500");

  const lote = `L${Date.now().toString().slice(-8)}`;
  const filas = Array.from({ length: cantidad }, () => ({
    eventId,
    token: nuevoToken(),
    code: `IW-${nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, "X")}`,
    status: "blank",
    batch: lote,
  }));

  await db.insert(eventTickets).values(filas);

  const creados = await db.select().from(eventTickets)
    .where(and(eq(eventTickets.eventId, eventId), eq(eventTickets.batch, lote)))
    .orderBy(eventTickets.id);

  return { lote, boletos: creados };
}

/** Consulta pública por token: lo que ve quien escanea el QR */
export async function boletoPorToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [t] = await db.select().from(eventTickets).where(eq(eventTickets.token, token)).limit(1);
  if (!t) return undefined;

  const [evento] = await db.select().from(events).where(eq(events.id, t.eventId)).limit(1);
  const tipo = t.ticketTypeId
    ? (await db.select().from(ticketTypes).where(eq(ticketTypes.id, t.ticketTypeId)).limit(1))[0]
    : undefined;
  const tienda = t.storeId
    ? (await db.select().from(stores).where(eq(stores.id, t.storeId)).limit(1))[0]
    : undefined;
  const ingresos = await db.select().from(ticketCheckins).where(eq(ticketCheckins.ticketId, t.id));

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
  storeId: number;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");

  const [t] = await db.select().from(eventTickets).where(eq(eventTickets.token, data.token)).limit(1);
  if (!t) throw new Error("Ese boleto no existe");
  if (t.status === "void") throw new Error("Ese boleto fue anulado");
  if (t.status !== "blank") throw new Error("Ese boleto ya fue vendido");

  const [tipo] = await db.select().from(ticketTypes).where(eq(ticketTypes.id, data.ticketTypeId)).limit(1);
  if (!tipo || tipo.eventId !== t.eventId) throw new Error("Tipo de boleto inválido");

  // La tasa se congela en el momento de la venta: si mañana cambia, este
  // boleto conserva el precio en bolívares con el que se vendió.
  const [rateRow] = await db.select().from(siteSettings).where(eq(siteSettings.key, "bs_rate")).limit(1);
  const tasa = parseFloat(rateRow?.value ?? "0") || 0;
  const precioUsd = parseFloat(tipo.priceUsd as any);
  const precioBs = tasa > 0 ? Math.round(precioUsd * tasa * 100) / 100 : null;

  await db.update(eventTickets).set({
    status: "sold",
    ticketTypeId: tipo.id,
    storeId: data.storeId,
    buyerName: data.buyerName.trim(),
    buyerLastName: data.buyerLastName.trim(),
    buyerPhone: data.buyerPhone.trim(),
    priceUsd: precioUsd.toFixed(2),
    rateBs: tasa > 0 ? tasa.toFixed(2) : null,
    priceBs: precioBs != null ? precioBs.toFixed(2) : null,
    soldAt: new Date(),
    soldByUserId: data.userId,
  }).where(eq(eventTickets.id, t.id));

  return {
    code: t.code,
    tipo: tipo.name,
    precioUsd,
    precioBs,
    tasa,
    comprador: `${data.buyerName} ${data.buyerLastName}`,
  };
}

/** Corrección por parte del admin (la tienda no puede) */
export async function corregirBoleto(id: number, data: Partial<{
  buyerName: string; buyerLastName: string; buyerPhone: string; ticketTypeId: number; status: string;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(eventTickets).set(data as any).where(eq(eventTickets.id, id));
}

// ─── Listados y totales ───────────────────────────────────────────────────────

export async function listarBoletos(eventId: number, opts?: { status?: string; storeId?: number }) {
  const db = await getDb();
  if (!db) return [];

  const cond: any[] = [eq(eventTickets.eventId, eventId)];
  if (opts?.status && opts.status !== "all") cond.push(eq(eventTickets.status, opts.status));
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
