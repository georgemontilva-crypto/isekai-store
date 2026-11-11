import { sql, eq, and, isNotNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { stores, users, levelActivities, eventTickets, events } from "../drizzle/schema";
import { conCandado } from "./candado";
import { io } from "./_core/socket";

/**
 * Tiendas con stand en el Fest.
 *
 * Al quedar PAGADO POR COMPLETO un stand, su tienda entra sola al equipo:
 *   - Mercader     → 1 misión en el Level Pass (no vende boletos)
 *   - Gremio       → 2 misiones + punto de venta con cupo de 240 boletos
 *   - Gran Gremio  → 3 misiones + punto de venta con cupo de 539 boletos
 *
 * Cada boleto vendido descuenta del cupo y deja US$1 de comisión; al llegar a
 * cero, la venta de esa tienda se cierra sola. Las misiones las escribe la
 * propia tienda (una vez puestas no se cambian) y puede comprar extras hasta
 * llegar a 5 en total. La EXP de las misiones de tienda la calcula el sistema.
 */
export type Plan = "mercader" | "gremio" | "gran_gremio";
export const PLANES: Record<Plan, { nombre: string; misiones: number; cupo: number; vende: boolean }> = {
  mercader: { nombre: "Mercader", misiones: 1, cupo: 0, vende: false },
  gremio: { nombre: "Gremio", misiones: 2, cupo: 240, vende: true },
  gran_gremio: { nombre: "Gran Gremio", misiones: 3, cupo: 539, vende: true },
};
export const MAX_MISIONES = 5;
export const PRECIO_MISION_EXTRA = 20;
export const COMISION_USD = 1;
/** Rango S del Level Pass */
const XP_RANGO_S = 500;
/**
 * Equilibrio: para llegar a rango S solo con misiones de tiendas hay que
 * completar esta parte de todas las que existan. Así ninguna tienda sobra y
 * el asistente tiene que recorrer varias. La EXP por misión sale de aquí.
 */
export const PARTE_PARA_RANGO_S = 0.4;
const XP_MIN = 5, XP_MAX = 50;

const filas = <T,>(r: unknown) => ((r as any)?.[0] ?? []) as T[];
function avisar() {
  try { io?.to("stands").emit("stands:cambio"); io?.to("admin").emit("stands:cambio"); } catch { /* */ }
}

export async function asegurarTablasStandTiendas() {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS festMisionExtras (
      id int AUTO_INCREMENT PRIMARY KEY,
      storeId int NOT NULL,
      cantidad int NOT NULL,
      monto decimal(10,2) NOT NULL,
      metodo varchar(30) NOT NULL,
      referencia varchar(120) NULL,
      comprobanteUrl varchar(600) NULL,
      estado varchar(20) NOT NULL DEFAULT 'pendiente',
      creadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revisadoEn timestamp NULL,
      INDEX idx_extra_tienda (storeId)
    )`);
    await sincronizarTiendasDeStands();
  } catch (e) { console.error("[StandTiendas] preparación:", e); }
}

/**
 * Deja las tiendas al día con los stands: crea (o enlaza) la tienda de cada
 * stand pagado por completo y suspende la de un stand que dejó de estarlo.
 * Se puede llamar las veces que haga falta: no duplica nada.
 */
export async function sincronizarTiendasDeStands() {
  const db = await getDb();
  if (!db) return;
  await conCandado("stand-tiendas", async () => {
    const reservas = filas<any>(await db.execute(sql`SELECT r.*, s.numero FROM festStandReservas r JOIN festStands s ON s.id = r.standId AND s.reservaId = r.id WHERE r.estado = 'pagado'`));
    const todas = await db.select().from(stores);
    const { limpiarPermisos } = await import("./permisos");
    let cambios = 0;

    for (const r of reservas) {
      const plan = r.tipo as Plan;
      const p = PLANES[plan];
      if (!p) continue;
      const correo = String(r.email ?? "").trim().toLowerCase() || null;
      let t = todas.find(x => x.standReservaId === r.id)
        ?? (correo ? todas.find(x => x.email === correo && !x.archivado && !x.standReservaId) : undefined);
      const datos = { plan, standReservaId: r.id as number, cupoBoletos: p.vende ? p.cupo : 0, vendeBoletos: p.vende, puedeOtorgarXp: true };

      if (t) {
        if (t.plan !== plan || t.standReservaId !== r.id || t.cupoBoletos !== datos.cupoBoletos || t.vendeBoletos !== p.vende || !t.puedeOtorgarXp) {
          await db.update(stores).set(datos).where(eq(stores.id, t.id));
          cambios++;
        }
        continue;
      }
      // Cuenta para entrar con enlace mágico (si dejó correo)
      let userId: number | undefined;
      if (correo) {
        let [u] = await db.select().from(users).where(eq(users.email, correo)).limit(1);
        if (!u) {
          await db.insert(users).values({ openId: `store_${nanoid(20)}`, email: correo, name: r.negocio, role: "store", loginMethod: "magic_link" });
          [u] = await db.select().from(users).where(eq(users.email, correo)).limit(1);
        } else if (u.role === "user") {
          await db.update(users).set({ role: "store" }).where(eq(users.id, u.id));
        }
        userId = u?.id;
      }
      const base = String(r.negocio).trim().slice(0, 180);
      const nombre = todas.some(x => x.name.trim().toLowerCase() === base.toLowerCase()) ? `${base} (${r.numero})` : base;
      await db.insert(stores).values({ name: nombre, userId, contactName: r.contacto, phone: r.whatsapp, email: correo, ...datos });
      const [nueva] = await db.select().from(stores).where(eq(stores.standReservaId, r.id)).limit(1);
      if (nueva) todas.push(nueva);
      cambios++;
      console.log(`[StandTiendas] ${nombre} entra al equipo como ${p.nombre} (stand ${r.numero})`);
      void avisarBienvenida(r, p, plan).catch(e => console.warn("[StandTiendas] correo:", e));
    }

    // Stand anulado o que ya no está pagado: la tienda deja de vender
    const vigentes = new Set(reservas.map(r => Number(r.id)));
    for (const t of todas) {
      if (t.standReservaId && !vigentes.has(t.standReservaId) && t.active) {
        await db.update(stores).set({ active: false }).where(eq(stores.id, t.id));
        cambios++;
      }
    }
    if (cambios) limpiarPermisos();
  });
}

async function avisarBienvenida(r: any, p: (typeof PLANES)[Plan], plan: Plan) {
  if (!r.email) return;
  const { sendEmail } = await import("./_core/notification");
  await sendEmail(r.email, `🎟️ ${r.negocio}: ya tienes acceso a la Boletería · Isekai World Fest`, `
    <h2>¡Tu stand ${r.numero} está pagado!</h2>
    <p>Hola, ${r.contacto}. Con el stand <strong>${p.nombre}</strong> de <strong>${r.negocio}</strong> ya tienes tu panel en la Boletería del Fest.</p>
    <ul>
      <li><strong>${p.misiones} ${p.misiones === 1 ? "misión" : "misiones"} en el Level Pass:</strong> escríbelas tú. Ojo: una vez puesta una misión, no se puede cambiar.</li>
      ${p.vende ? `<li><strong>Punto oficial de venta:</strong> tienes un cupo de ${p.cupo} boletos y ganas US$${COMISION_USD} por cada boleto vendido.</li>` : ""}
      <li>Puedes comprar misiones extra (US$${PRECIO_MISION_EXTRA} cada una) hasta llegar a ${MAX_MISIONES}.</li>
    </ul>
    <div style="text-align:center;margin:24px 0"><a href="https://www.isekaiworld.co/boleteria" class="btn">Entrar a la Boletería →</a></div>
    <p style="color:#9a93a6">Entra con este mismo correo (${r.email}).</p>`,
    `Tu panel de ${plan === "mercader" ? "misiones" : "boletos y misiones"} ya está activo`);
}

// ─── Cupo y comisión ─────────────────────────────────────────────────────────

/** Boletos vendidos (no anulados) por una tienda */
async function vendidosDe(storeId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [f] = await db.select({ n: sql<number>`count(*)` }).from(eventTickets)
    .where(and(eq(eventTickets.storeId, storeId), eq(eventTickets.status, "sold")));
  return Number(f?.n ?? 0);
}

export async function estadoCupo(t: { id: number; plan: string | null; cupoBoletos: number | null; vendeBoletos: boolean }) {
  const vendidos = await vendidosDe(t.id);
  const cupo = t.cupoBoletos;
  const conComision = Boolean(t.plan && t.vendeBoletos);
  return {
    plan: (t.plan as Plan | null) ?? null,
    planNombre: t.plan ? PLANES[t.plan as Plan]?.nombre ?? null : null,
    vende: t.vendeBoletos,
    cupo,
    vendidos,
    restantes: cupo === null ? null : Math.max(0, cupo - vendidos),
    agotado: cupo !== null && vendidos >= cupo,
    comisionPorBoleto: conComision ? COMISION_USD : 0,
    ganancia: conComision ? Math.min(vendidos, cupo ?? vendidos) * COMISION_USD : 0,
    gananciaMaxima: conComision && cupo !== null ? cupo * COMISION_USD : 0,
  };
}

/** Vende dentro del cupo: dos ventas a la vez no pueden pasarse del tope */
export async function venderDentroDelCupo<T>(t: { id: number; name: string; plan: string | null; cupoBoletos: number | null; vendeBoletos: boolean }, vender: () => Promise<T>): Promise<T> {
  if (!t.vendeBoletos) throw new Error("Tu plan no incluye venta de boletos");
  if (t.cupoBoletos === null) return vender();
  return conCandado(`cupo-tienda:${t.id}`, async () => {
    const vendidos = await vendidosDe(t.id);
    if (vendidos >= (t.cupoBoletos as number)) throw new Error(`${t.name} ya vendió sus ${t.cupoBoletos} boletos asignados: la venta en este punto está cerrada`);
    return vender();
  });
}

/** Para el admin: lo vendido y la comisión de cada tienda con stand */
export async function comisionesPorTienda() {
  const db = await getDb();
  if (!db) return [];
  const lista = (await db.select().from(stores)).filter(t => t.plan && !t.archivado);
  const conteo = filas<{ storeId: number; n: number; usd: string }>(await db.execute(sql`SELECT storeId, COUNT(*) AS n, COALESCE(SUM(priceUsd),0) AS usd FROM eventTickets WHERE status = 'sold' AND storeId IS NOT NULL GROUP BY storeId`));
  const misiones = filas<{ storeId: number; n: number }>(await db.execute(sql`SELECT storeId, COUNT(*) AS n FROM levelActivities WHERE storeId IS NOT NULL GROUP BY storeId`));
  const stands = filas<{ id: number; numero: string }>(await db.execute(sql`SELECT r.id, s.numero FROM festStandReservas r JOIN festStands s ON s.id = r.standId`));
  return lista.map(t => {
    const c = conteo.find(x => Number(x.storeId) === t.id);
    const vendidos = Number(c?.n ?? 0);
    const conComision = t.vendeBoletos;
    return {
      id: t.id, nombre: t.name, activa: t.active, plan: t.plan as Plan, planNombre: PLANES[t.plan as Plan]?.nombre ?? t.plan,
      stand: stands.find(s => Number(s.id) === t.standReservaId)?.numero ?? null,
      vende: t.vendeBoletos, cupo: t.cupoBoletos, vendidos,
      restantes: t.cupoBoletos === null ? null : Math.max(0, t.cupoBoletos - vendidos),
      recaudadoUsd: Math.round(Number(c?.usd ?? 0) * 100) / 100,
      ganancia: conComision ? Math.min(vendidos, t.cupoBoletos ?? vendidos) * COMISION_USD : 0,
      misiones: Number(misiones.find(m => Number(m.storeId) === t.id)?.n ?? 0),
    };
  }).sort((a, b) => b.vendidos - a.vendidos || a.nombre.localeCompare(b.nombre));
}

// ─── Misiones de la tienda ───────────────────────────────────────────────────

/** Evento al que van las misiones: el próximo (o en curso) que esté activo */
async function eventoDeMisiones() {
  const db = await getDb();
  if (!db) return undefined;
  const lista = (await db.select().from(events)).filter(e => e.active !== false);
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date());
  const dia = (d: any) => new Date(d).toISOString().slice(0, 10);
  const porVenir = lista.filter(e => dia(e.endDate) >= hoy).sort((a, b) => dia(a.startDate).localeCompare(dia(b.startDate)));
  return porVenir[0] ?? lista.sort((a, b) => dia(b.startDate).localeCompare(dia(a.startDate)))[0];
}

async function extrasDe(storeId: number) {
  const db = await getDb();
  if (!db) return { aprobadas: 0, pendientes: 0, compras: [] as any[] };
  const compras = filas<any>(await db.execute(sql`SELECT * FROM festMisionExtras WHERE storeId = ${storeId} ORDER BY creadoEn DESC`))
    .map(c => ({ ...c, monto: Number(c.monto), cantidad: Number(c.cantidad) }));
  const suma = (e: string) => compras.filter(c => c.estado === e).reduce((a, c) => a + c.cantidad, 0);
  return { aprobadas: suma("aprobado"), pendientes: suma("pendiente"), compras };
}

/** EXP que da hoy una misión de tienda (igual para todas) */
export function xpPorMision(totalMisiones: number) {
  const n = Math.max(1, totalMisiones);
  return Math.min(XP_MAX, Math.max(XP_MIN, Math.ceil(XP_RANGO_S / (PARTE_PARA_RANGO_S * n))));
}

/** Reparte la EXP entre todas las misiones de tiendas del evento */
export async function recalcularXpDeMisiones(eventId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [f] = await db.select({ n: sql<number>`count(*)` }).from(levelActivities)
    .where(and(eq(levelActivities.eventId, eventId), isNotNull(levelActivities.storeId), eq(levelActivities.active, true)));
  const xp = xpPorMision(Number(f?.n ?? 0));
  await db.update(levelActivities).set({ xp }).where(and(eq(levelActivities.eventId, eventId), isNotNull(levelActivities.storeId)));
  return xp;
}

type TiendaPlan = { id: number; name: string; plan: string | null; active: boolean };

export async function misMisiones(t: TiendaPlan) {
  const db = await getDb();
  const plan = t.plan as Plan | null;
  if (!db || !plan || !PLANES[plan]) return null;
  const evento = await eventoDeMisiones();
  const misiones = await db.select().from(levelActivities).where(eq(levelActivities.storeId, t.id)).orderBy(levelActivities.id);
  const extras = await extrasDe(t.id);
  const incluidas = PLANES[plan].misiones;
  const cupo = Math.min(MAX_MISIONES, incluidas + extras.aprobadas);
  return {
    tienda: t.name, plan, planNombre: PLANES[plan].nombre, activa: t.active,
    evento: evento ? { id: evento.id, nombre: evento.name } : null,
    incluidas, extrasAprobadas: extras.aprobadas, extrasPendientes: extras.pendientes,
    cupo, usadas: misiones.length, libres: Math.max(0, cupo - misiones.length),
    puedeComprar: Math.max(0, MAX_MISIONES - incluidas - extras.aprobadas - extras.pendientes),
    maximo: MAX_MISIONES, precioExtra: PRECIO_MISION_EXTRA,
    misiones: misiones.map(m => ({ id: m.id, nombre: m.name, descripcion: m.description, xp: m.xp, activa: m.active })),
    compras: extras.compras.map(c => ({ id: c.id, cantidad: c.cantidad, monto: c.monto, metodo: c.metodo, estado: c.estado, creadoEn: c.creadoEn })),
  };
}

export async function crearMision(t: TiendaPlan, d: { nombre: string; descripcion: string }) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  if (!t.active) throw new Error("Tu tienda está suspendida");
  return conCandado(`misiones:${t.id}`, async () => {
    const estado = await misMisiones(t);
    if (!estado) throw new Error("Tu tienda no tiene un stand del Fest");
    if (!estado.evento) throw new Error("Todavía no hay un evento abierto para registrar misiones");
    if (estado.libres <= 0) throw new Error(estado.cupo >= MAX_MISIONES ? `Ya tienes tus ${MAX_MISIONES} misiones` : "Ya usaste todas tus misiones. Puedes comprar una misión extra.");
    await db.insert(levelActivities).values({
      eventId: estado.evento.id, name: d.nombre, description: d.descripcion,
      xp: XP_MIN, ubicacion: t.name, repetible: false, maxVeces: 1, storeId: t.id, sortOrder: 100,
    });
    const xp = await recalcularXpDeMisiones(estado.evento.id);
    return { ok: true, xp };
  });
}

export async function comprarMisionesExtra(t: TiendaPlan, d: { cantidad: number; metodo: string; referencia: string; comprobanteUrl?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  return conCandado(`misiones:${t.id}`, async () => {
    const estado = await misMisiones(t);
    if (!estado) throw new Error("Tu tienda no tiene un stand del Fest");
    if (d.cantidad > estado.puedeComprar) throw new Error(estado.puedeComprar > 0 ? `Solo puedes comprar ${estado.puedeComprar} más (el tope es ${MAX_MISIONES} misiones en total)` : `Ya llegaste al tope de ${MAX_MISIONES} misiones`);
    const monto = d.cantidad * PRECIO_MISION_EXTRA;
    await db.execute(sql`INSERT INTO festMisionExtras (storeId, cantidad, monto, metodo, referencia, comprobanteUrl)
      VALUES (${t.id}, ${d.cantidad}, ${monto}, ${d.metodo}, ${d.referencia}, ${d.comprobanteUrl ?? null})`);
    try {
      const { insertAdminNotification } = await import("./db");
      await insertAdminNotification({ type: "new_order", title: "Compra de misiones extra", body: `${t.name} · ${d.cantidad} ${d.cantidad === 1 ? "misión" : "misiones"} · $${monto}` });
      const { enviarPushAdmins } = await import("./push");
      await enviarPushAdmins({ titulo: `⚔️ Misiones extra · ${t.name}`, cuerpo: `Reportó $${monto} por ${d.cantidad}. Revisa el pago.`, url: "/boleteria?v=admin", etiqueta: `mision-extra-${t.id}` });
    } catch (e) { console.warn("[StandTiendas] aviso al admin:", e); }
    avisar();
    return { ok: true, monto };
  });
}

/** Admin: compras de misiones extra */
export async function panelExtras() {
  const db = await getDb();
  if (!db) return [];
  return filas<any>(await db.execute(sql`SELECT e.*, s.name AS tienda, s.plan FROM festMisionExtras e JOIN stores s ON s.id = e.storeId ORDER BY (e.estado = 'pendiente') DESC, e.creadoEn DESC LIMIT 300`))
    .map(c => ({ ...c, monto: Number(c.monto), cantidad: Number(c.cantidad) }));
}

export async function revisarExtra(id: number, aprobar: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [c] = filas<any>(await db.execute(sql`SELECT * FROM festMisionExtras WHERE id = ${id} LIMIT 1`));
  if (!c) throw new Error("Compra no encontrada");
  if (c.estado !== "pendiente") return { ok: true, yaEstaba: true };
  const [res] = await db.execute(sql`UPDATE festMisionExtras SET estado = ${aprobar ? "aprobado" : "rechazado"}, revisadoEn = NOW() WHERE id = ${id} AND estado = 'pendiente'`) as any;
  if (!res?.affectedRows) return { ok: true, yaEstaba: true };
  try {
    const [t] = await db.select().from(stores).where(eq(stores.id, Number(c.storeId))).limit(1);
    if (t?.email) {
      const { sendEmail } = await import("./_core/notification");
      const n = Number(c.cantidad);
      await sendEmail(t.email, aprobar ? `✅ ${n === 1 ? "Tu misión extra está lista" : `Tus ${n} misiones extra están listas`} · Isekai World Fest` : "Tu pago de misiones extra no pudo confirmarse", aprobar
        ? `<h2>¡Pago confirmado!</h2><p>${t.name} ya tiene ${n} ${n === 1 ? "misión extra disponible" : "misiones extra disponibles"}. Entra a la Boletería para escribirla${n === 1 ? "" : "s"}. Recuerda: una vez puesta, no se puede cambiar.</p><div style="text-align:center;margin:24px 0"><a href="https://www.isekaiworld.co/boleteria/misiones" class="btn">Poner mis misiones →</a></div>`
        : `<h2>No pudimos confirmar tu pago</h2><p>No encontramos el pago de $${Number(c.monto).toFixed(2)} por misiones extra de ${t.name}. Revisa la referencia y vuelve a reportarlo, o escríbenos a <a href="mailto:ventas@isekaiworld.co">ventas@isekaiworld.co</a>.</p>`,
        aprobar ? "Ya puedes escribir tus misiones extra" : "Revisa la referencia de tu pago");
    }
  } catch (e) { console.warn("[StandTiendas] correo de misiones extra:", e); }
  avisar();
  return { ok: true };
}
