import crypto from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { RECARGO_CASHEA_PCT, aceptaCashea, precioCashea } from "../shared/payment";
import { TIPOS_STAND, aprobarPago, avisarCambio, type TipoStand } from "./stands";

/**
 * Saldo de un stand: la página donde cada tienda paga lo que le falta.
 *
 * Cada reserva tiene un enlace personal (isekaiworld.co/stands/saldo/<clave>).
 * Desde ahí la tienda paga el saldo de dos formas:
 *
 *  - De contado (Pago Móvil, Binance Pay o efectivo): reporta el pago y queda
 *    en «Pagos por revisar», igual que el primer pago.
 *
 *  - Con Cashea, en cuotas. El stand pasa a costar su precio + 8 %. Lo que la
 *    tienda ya abonó cuenta como inicial y Cashea financia el resto. El flujo
 *    es el del botón de pago de Cashea:
 *      1. La tienda pone su cédula y toca «Continuar con Cashea» (el botón
 *         oficial crea la orden con la llave pública y la lleva a Cashea).
 *      2. En Cashea inicia sesión, ve su plan y confirma. Cashea la devuelve a
 *         /stands/saldo/<clave>/cashea?idNumber=<orden>.
 *      3. La orden queda «por confirmar» en el panel. El administrador revisa
 *         en su portal de Cashea que el monto sea el correcto y la confirma:
 *         ahí se avisa a Cashea que la inicial está pagada (llave privada) y
 *         el stand queda pagado por completo. También puede cancelarla. Si Cashea
 *         pide una inicial mayor a lo abonado, la tienda paga la diferencia de
 *         contado desde la misma página antes de que se confirme.
 *
 * Las tiendas nuevas también pueden reservar pagando todo con Cashea desde
 * /stands: ahí todavía no han pagado nada, así que al volver de Cashea pagan
 * la inicial que Cashea les indicó (de contado, en esta misma página) y con
 * ese pago aprobado se confirma la orden.
 *
 * Cashea solo se ofrece cuando están configuradas sus variables de entorno.
 */

const filas = <T>(r: unknown): T[] => ((r as [T[]])?.[0] ?? []) as T[];
const insertado = (r: unknown) => Number((r as any)?.[0]?.insertId);

// ─── Configuración de Cashea ───────────────────────────────────────────────
export function casheaConfig() {
  const c = {
    publicKey: process.env.CASHEA_PUBLIC_API_KEY ?? "",
    privateKey: process.env.CASHEA_PRIVATE_API_KEY ?? "",
    externalClientId: process.env.CASHEA_EXTERNAL_CLIENT_ID ?? "",
    storeId: Number(process.env.CASHEA_STORE_ID ?? 0) || 0,
    storeName: process.env.CASHEA_STORE_NAME ?? "",
    merchantName: process.env.CASHEA_MERCHANT_NAME || "Isekai World",
    apiUrl: (process.env.CASHEA_API_URL || "https://external.cashea.app").replace(/\/+$/, ""),
  };
  return { ...c, activo: !!(c.publicKey && c.privateKey && c.externalClientId && c.storeId && c.storeName) };
}

/** Llamada a la API de Cashea con la llave privada (solo desde el servidor) */
async function casheaApi(metodo: "POST" | "DELETE", ruta: string, cuerpo?: unknown): Promise<{ ok: boolean; status: number; texto: string }> {
  const c = casheaConfig();
  if (!c.activo) throw new Error("Cashea no está configurado");
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), 20_000);
  try {
    const res = await fetch(`${c.apiUrl}${ruta}`, {
      method: metodo,
      headers: { Authorization: `ApiKey ${c.privateKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: control.signal,
    });
    const texto = (await res.text().catch(() => "")).slice(0, 280);
    return { ok: res.ok, status: res.status, texto };
  } catch (e: any) {
    throw new Error(e?.name === "AbortError" ? "Cashea no respondió a tiempo. Intenta de nuevo." : `No se pudo conectar con Cashea: ${e?.message ?? e}`);
  } finally {
    clearTimeout(corte);
  }
}

// ─── Enlace personal de cada reserva ───────────────────────────────────────
function firma(id: number) {
  return crypto.createHmac("sha256", ENV.cookieSecret || "isekai-stands").update(`stand-saldo:${id}`).digest("hex").slice(0, 20);
}
export function claveDeReserva(id: number) {
  return `${id.toString(36)}-${firma(id)}`;
}
export function reservaDeClave(clave: string): number | null {
  const m = /^([a-z0-9]{1,8})-([a-f0-9]{20})$/.exec(clave);
  if (!m) return null;
  const id = parseInt(m[1], 36);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const esperada = firma(id);
  return crypto.timingSafeEqual(Buffer.from(m[2]), Buffer.from(esperada)) ? id : null;
}
export function enlaceDeSaldo(id: number, origen = "https://www.isekaiworld.co") {
  return `${origen}/stands/saldo/${claveDeReserva(id)}`;
}

// ─── Tabla de órdenes de Cashea ────────────────────────────────────────────
let tabla: Promise<void> | null = null;
function asegurarTabla(): Promise<void> {
  if (!tabla) {
    tabla = (async () => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");
      await db.execute(sql`CREATE TABLE IF NOT EXISTS festStandCashea (
        id int AUTO_INCREMENT PRIMARY KEY,
        reservaId int NOT NULL,
        cedula varchar(20) NOT NULL,
        total decimal(10,2) NOT NULL,
        inicial decimal(10,2) NOT NULL,
        orderId varchar(40) NULL,
        estado varchar(20) NOT NULL DEFAULT 'creada',
        detalle varchar(300) NULL,
        creadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        actualizadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cashea_reserva (reservaId),
        INDEX idx_cashea_estado (estado)
      )`);
    })().catch(e => { tabla = null; throw e; });
  }
  return tabla;
}

type Reserva = { id: number; standId: number; tipo: TipoStand; precio: number; negocio: string; contacto: string; email: string; estado: string; pagado: number; modalidad: string };
type Orden = { id: number; reservaId: number; cedula: string; total: number; inicial: number; orderId: string | null; estado: string; detalle: string | null; creadoEn: string };

async function reservaDe(clave: string): Promise<{ r: Reserva; numero: string }> {
  const id = reservaDeClave(clave);
  const db = await getDb();
  if (!id || !db) throw new Error("Este enlace no es válido. Pídenos uno nuevo a ventas@isekaiworld.co.");
  const [f] = filas<any>(await db.execute(sql`SELECT r.*, s.numero FROM festStandReservas r JOIN festStands s ON s.id = r.standId WHERE r.id = ${id} LIMIT 1`));
  if (!f) throw new Error("Este enlace no es válido. Pídenos uno nuevo a ventas@isekaiworld.co.");
  return { r: { ...f, precio: Number(f.precio), pagado: Number(f.pagado) }, numero: String(f.numero) };
}

/**
 * Precio del stand con Cashea y cómo se reparte: lo que la tienda ya pagó
 * cuenta como inicial (en una reserva nueva todavía es cero: la inicial la
 * indica Cashea y la tienda la paga al volver).
 */
function planCashea(r: Reserva) {
  const total = precioCashea(r.precio);
  const inicial = Math.round(r.pagado * 100) / 100;
  return { total, inicial, financiado: Math.round((total - inicial) * 100) / 100, recargoPct: RECARGO_CASHEA_PCT };
}

async function ordenVigente(reservaId: number): Promise<Orden | null> {
  await asegurarTabla();
  const db = (await getDb())!;
  const [o] = filas<any>(await db.execute(sql`SELECT * FROM festStandCashea WHERE reservaId = ${reservaId}
    AND estado IN ('por_confirmar', 'error', 'confirmada') ORDER BY id DESC LIMIT 1`));
  return o ? { ...o, total: Number(o.total), inicial: Number(o.inicial) } : null;
}

// ─── Lo que ve la tienda ───────────────────────────────────────────────────
export async function estadoSaldo(clave: string) {
  const { r, numero } = await reservaDe(clave);
  const db = (await getDb())!;
  const [{ enRevision }] = filas<{ enRevision: number }>(await db.execute(
    sql`SELECT COALESCE(SUM(monto), 0) AS enRevision FROM festStandPagos WHERE reservaId = ${r.id} AND estado = 'pendiente'`));
  const saldo = Math.max(0, Math.round((r.precio - r.pagado) * 100) / 100);
  const c = casheaConfig();
  const plan = planCashea(r);
  let orden: Orden | null = null;
  try { orden = await ordenVigente(r.id); } catch (e) { console.warn("[Saldo] órdenes de Cashea:", e); }
  // Una reserva sin pago confirmado todavía no tiene la mesa: otra tienda pudo tomarla
  const [mesa] = filas<{ estado: string; reservaId: number | null }>(await db.execute(sql`SELECT estado, reservaId FROM festStands WHERE id = ${r.standId} LIMIT 1`));
  const mesaLibre = !!mesa && (mesa.estado === "libre" || Number(mesa.reservaId) === r.id);
  // Cashea se ofrece con saldo por pagar, nada en revisión y sin otra orden viva:
  // a las tiendas que ya apartaron (preventa) y a las que reservan pagando con Cashea
  const casheaDisponible = c.activo && (r.estado === "apartado" || (r.estado === "pendiente" && mesaLibre)) && saldo > 0
    && Number(enRevision) === 0 && aceptaCashea(plan.total) && plan.financiado > 0 && !orden;
  return {
    numero, plan: TIPOS_STAND[r.tipo]?.nombre ?? r.tipo, negocio: r.negocio, modalidad: r.modalidad, mesaLibre,
    precio: r.precio, pagado: r.pagado, saldo, estado: r.estado, enRevision: Number(enRevision) || 0,
    cashea: { activo: c.activo, disponible: casheaDisponible, ...plan },
    orden: orden ? { orderId: orden.orderId, estado: orden.estado, total: orden.total } : null,
  };
}

/**
 * La tienda reporta un pago de contado: el saldo de un stand ya apartado, o
 * el primer pago de una reserva hecha con Cashea (su inicial). Queda por revisar.
 */
export async function reportarPagoSaldo(clave: string, d: { monto: number; metodo: string; referencia: string; comprobanteUrl?: string }) {
  const { r, numero } = await reservaDe(clave);
  const db = (await getDb())!;
  if (r.estado === "pagado") throw new Error("Tu stand ya está pagado por completo.");
  if (r.estado !== "apartado" && r.estado !== "pendiente") throw new Error("Esta reserva no está activa. Escríbenos a ventas@isekaiworld.co.");
  if (r.estado === "pendiente") {
    const [mesa] = filas<{ estado: string; reservaId: number | null }>(await db.execute(sql`SELECT estado, reservaId FROM festStands WHERE id = ${r.standId} LIMIT 1`));
    if (!mesa || (mesa.estado !== "libre" && Number(mesa.reservaId) !== r.id)) throw new Error(`El stand ${numero} ya fue reservado por otra tienda. Escríbenos a ventas@isekaiworld.co y te asignamos otro.`);
  }
  const [{ enRevision }] = filas<{ enRevision: number }>(await db.execute(
    sql`SELECT COALESCE(SUM(monto), 0) AS enRevision FROM festStandPagos WHERE reservaId = ${r.id} AND estado = 'pendiente'`));
  const porPagar = Math.round((r.precio - r.pagado - Number(enRevision)) * 100) / 100;
  if (porPagar <= 0) throw new Error("Ya reportaste el pago de tu saldo. Lo estamos revisando.");
  const monto = Math.round(d.monto * 100) / 100;
  if (monto < 1) throw new Error("Indica el monto que pagaste.");
  if (monto > porPagar + 0.009) throw new Error(`El monto supera lo que falta por pagar ($${porPagar.toFixed(2)}).`);

  const pagoId = insertado(await db.execute(sql`INSERT INTO festStandPagos (reservaId, monto, metodo, referencia, comprobanteUrl)
    VALUES (${r.id}, ${monto}, ${d.metodo}, ${d.referencia}, ${d.comprobanteUrl ?? null})`));

  // Binance Pay: con el número de transacción se verifica solo
  let aviso: string | null = null;
  if (d.metodo === "crypto") {
    try {
      const { verificarPagoBinance, MENSAJE_BINANCE } = await import("./binancePay");
      const v = await verificarPagoBinance({ transactionId: d.referencia, montoUsd: monto, uso: `stand:${r.id}:saldo:${pagoId}` });
      if (v.ok) {
        const res = await aprobarPago(pagoId);
        return { ok: true, aprobado: true, completo: Boolean((res as any).completo), monto, aviso: null as string | null };
      }
      aviso = MENSAJE_BINANCE[v.motivo] ?? null;
    } catch (e: any) { console.warn("[Saldo] verificación Binance:", e?.message ?? e); }
  }
  const deCashea = !!(await ordenCasheaDe(r.id));
  await avisarAdmin(`💵 ${deCashea ? "Inicial de Cashea" : r.estado === "pendiente" ? "Primer pago" : "Saldo"} del stand ${numero} · ${r.negocio}`,
    `Reportó $${monto.toFixed(2)}. Revisa el pago${deCashea ? " y después confirma la orden en la pestaña Cashea" : ""}.`, `saldo-${r.id}`);
  avisarCambio();
  return { ok: true, aprobado: false, completo: false, monto, aviso };
}

/** La orden de Cashea que una reserva tiene esperando confirmación (o nada) */
export async function ordenCasheaDe(reservaId: number): Promise<{ orderId: string | null; total: number } | null> {
  try {
    const o = await ordenVigente(reservaId);
    return o && o.estado !== "confirmada" ? { orderId: o.orderId, total: o.total } : null;
  } catch { return null; }
}

async function avisarAdmin(titulo: string, cuerpo: string, etiqueta: string) {
  try {
    const { insertAdminNotification } = await import("./db");
    await insertAdminNotification({ type: "new_order", title: titulo.replace(/^\S+\s/, ""), body: cuerpo });
    const { enviarPushAdmins } = await import("./push");
    await enviarPushAdmins({ titulo, cuerpo, url: "/admin?tab=stands", etiqueta });
  } catch (e) { console.warn("[Saldo] aviso al admin:", e); }
}

// ─── Cashea: lo que hace la tienda ─────────────────────────────────────────
/** Paso 1: prepara la orden y devuelve lo que necesita el botón oficial de Cashea */
export async function casheaIniciar(clave: string, cedula: string, origen: string) {
  const estado = await estadoSaldo(clave);
  if (!estado.cashea.activo) throw new Error("El pago con Cashea todavía no está disponible.");
  if (estado.orden) throw new Error("Ya tienes una orden de Cashea. Te avisamos cuando la confirmemos.");
  if (!estado.cashea.disponible) throw new Error("Ahora mismo no se puede pagar este saldo con Cashea.");
  const { r, numero } = await reservaDe(clave);
  await asegurarTabla();
  const db = (await getDb())!;
  const c = casheaConfig();
  const plan = planCashea(r);
  // Los intentos anteriores que no llegaron a Cashea se descartan
  await db.execute(sql`UPDATE festStandCashea SET estado = 'abandonada' WHERE reservaId = ${r.id} AND estado = 'creada'`);
  const id = insertado(await db.execute(sql`INSERT INTO festStandCashea (reservaId, cedula, total, inicial)
    VALUES (${r.id}, ${cedula}, ${plan.total}, ${plan.inicial})`));
  const nombrePlan = TIPOS_STAND[r.tipo]?.nombre ?? r.tipo;
  return {
    publicKey: c.publicKey,
    payload: {
      identificationNumber: cedula,
      externalClientId: c.externalClientId,
      deliveryMethod: "IN_STORE",
      merchantName: c.merchantName,
      // Sin parámetros: Cashea le agrega ?idNumber=<orden> al volver
      redirectUrl: `${origen}/stands/saldo/${clave}/cashea`,
      deliveryPrice: 0,
      invoiceId: `stand-${r.id}-${id}`,
      orders: [{
        store: { id: c.storeId, name: c.storeName, enabled: true },
        products: [{
          id: `stand-${numero}`,
          name: `Stand ${numero} · ${nombrePlan}`,
          sku: `STAND-${numero}`,
          description: `Stand ${nombrePlan} del Isekai World Fest 2027 (14 y 15 de agosto, Maracaibo)`,
          imageUrl: "https://www.isekaiworld.co/icons/isekai-512.png",
          quantity: 1,
          price: plan.total,
          tax: 0,
          discount: 0,
        }],
      }],
    },
  };
}

/**
 * Reserva nueva pagando con Cashea desde la página de stands: se guarda la
 * solicitud (sin pago todavía) y se devuelve lo que necesita el botón de
 * Cashea. La mesa se toma cuando se aprueba el pago de la inicial.
 */
export async function crearReservaCashea(d: { standId: number; negocio: string; contacto: string; email: string; whatsapp: string; rif?: string; cedula: string }, origen: string) {
  const c = casheaConfig();
  if (!c.activo) throw new Error("El pago con Cashea todavía no está disponible.");
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [stand] = filas<{ id: number; numero: string; tipo: TipoStand; estado: string }>(
    await db.execute(sql`SELECT id, numero, tipo, estado FROM festStands WHERE id = ${d.standId} LIMIT 1`));
  if (!stand) throw new Error("Ese stand no existe");
  if (stand.estado !== "libre") throw new Error(`El stand ${stand.numero} ya fue reservado. Elige otro, por favor.`);
  const t = TIPOS_STAND[stand.tipo];
  if (!aceptaCashea(precioCashea(t.precio))) throw new Error("Este stand no se puede pagar con Cashea.");

  // Si la misma tienda repite el intento, se sigue con su misma solicitud
  const [previa] = filas<{ id: number }>(await db.execute(sql`SELECT r.id FROM festStandReservas r
    WHERE r.standId = ${stand.id} AND r.email = ${d.email} AND r.modalidad = 'cashea' AND r.estado = 'pendiente'
      AND NOT EXISTS (SELECT 1 FROM festStandPagos p WHERE p.reservaId = r.id) ORDER BY r.id DESC LIMIT 1`));
  let reservaId = previa ? Number(previa.id) : 0;
  if (reservaId) {
    await db.execute(sql`UPDATE festStandReservas SET negocio = ${d.negocio}, contacto = ${d.contacto}, whatsapp = ${d.whatsapp}, rif = ${d.rif ?? null} WHERE id = ${reservaId}`);
  } else {
    reservaId = insertado(await db.execute(sql`INSERT INTO festStandReservas
      (standId, tipo, precio, negocio, contacto, email, whatsapp, rif, modalidad)
      VALUES (${stand.id}, ${stand.tipo}, ${t.precio}, ${d.negocio}, ${d.contacto}, ${d.email}, ${d.whatsapp}, ${d.rif ?? null}, 'cashea')`));
  }
  const clave = claveDeReserva(reservaId);
  return { clave, numero: stand.numero, ...(await casheaIniciar(clave, d.cedula, origen)) };
}

/** Paso 2: la tienda vuelve de Cashea con el número de su orden */
export async function casheaVolver(clave: string, orderId: string) {
  const { r, numero } = await reservaDe(clave);
  await asegurarTabla();
  const db = (await getDb())!;
  const [misma] = filas<any>(await db.execute(sql`SELECT id, reservaId, estado FROM festStandCashea WHERE orderId = ${orderId} LIMIT 1`));
  if (misma) {
    if (Number(misma.reservaId) !== r.id) throw new Error("Esa orden de Cashea pertenece a otro stand.");
    return { ok: true, orderId, estado: String(misma.estado) };
  }
  const [intento] = filas<any>(await db.execute(sql`SELECT id, total FROM festStandCashea WHERE reservaId = ${r.id} AND estado = 'creada' ORDER BY id DESC LIMIT 1`));
  if (!intento) throw new Error("No encontramos tu intento de pago con Cashea. Vuelve a empezar desde tu enlace de saldo.");
  await db.execute(sql`UPDATE festStandCashea SET orderId = ${orderId}, estado = 'por_confirmar' WHERE id = ${intento.id} AND estado = 'creada'`);
  const faltaInicial = r.pagado <= 0;
  await avisarAdmin(`🟡 Cashea · stand ${numero} · ${r.negocio}`,
    `Orden ${orderId} por $${Number(intento.total).toFixed(2)}. ${faltaInicial ? "Falta que la tienda pague la inicial." : "Revísala y confírmala."}`, `cashea-${r.id}`);
  // Correo a la tienda con su enlace, por si cierra la página antes de pagar la inicial
  if (r.email) {
    try {
      const { sendEmail } = await import("./_core/notification");
      await sendEmail(r.email, `Tu orden de Cashea del stand ${numero} · Isekai World Fest 2027`, `
        <h2>Recibimos tu orden de Cashea</h2>
        <p>Hola, ${r.contacto}. Registramos la orden <strong>n.º ${orderId}</strong> de <strong>${r.negocio}</strong> por el stand <strong>${numero}</strong> ($${Number(intento.total).toFixed(2)} con Cashea).</p>
        ${faltaInicial
          ? `<p><strong>Falta un paso:</strong> paga la inicial que te indicó Cashea desde tu enlace personal. Cuando la confirmemos, cerramos tu orden con Cashea y tu stand queda reservado y pagado.</p>
             <div style="text-align:center;margin:24px 0"><a href="${enlaceDeSaldo(r.id)}" class="btn">Pagar la inicial →</a></div>`
          : `<p>La estamos confirmando con Cashea. Te avisamos por correo cuando tu stand quede pagado.</p>
             <div style="text-align:center;margin:24px 0"><a href="${enlaceDeSaldo(r.id)}" class="btn">Ver tu stand →</a></div>`}
        <p style="color:#9a93a6">¿Dudas? Escríbenos a <a href="mailto:ventas@isekaiworld.co">ventas@isekaiworld.co</a>.</p>`,
        faltaInicial ? "Falta pagar la inicial que te indicó Cashea" : "Estamos confirmando tu orden con Cashea");
    } catch (e) { console.warn("[Saldo] correo de la orden de Cashea:", e); }
  }
  avisarCambio();
  return { ok: true, orderId, estado: "por_confirmar" };
}

// ─── Cashea: lo que hace el administrador ──────────────────────────────────
export async function casheaPanel() {
  try {
    await asegurarTabla();
    const db = (await getDb())!;
    const ordenes = filas<any>(await db.execute(sql`SELECT c.*, r.negocio, r.precio, r.pagado, r.estado AS estadoReserva, s.numero
      FROM festStandCashea c JOIN festStandReservas r ON r.id = c.reservaId JOIN festStands s ON s.id = r.standId
      WHERE c.estado IN ('por_confirmar', 'error', 'confirmada', 'cancelada') ORDER BY c.id DESC LIMIT 100`));
    return ordenes.map(o => ({
      id: Number(o.id), reservaId: Number(o.reservaId), numero: String(o.numero), negocio: String(o.negocio), cedula: String(o.cedula),
      total: Number(o.total), inicial: Number(o.inicial), pagado: Number(o.pagado), precio: Number(o.precio),
      orderId: o.orderId ? String(o.orderId) : null, estado: String(o.estado), detalle: o.detalle ? String(o.detalle) : null, creadoEn: o.creadoEn,
      estadoReserva: String(o.estadoReserva),
    }));
  } catch (e) { console.warn("[Saldo] panel de Cashea:", e); return []; }
}

/**
 * Confirma la orden: avisa a Cashea que la inicial está pagada (lo que la
 * tienda ya abonó, o el monto que indique el administrador si Cashea pide
 * otra inicial) y deja el stand pagado por completo.
 */
export async function casheaConfirmar(id: number, inicialIndicada?: number) {
  await asegurarTabla();
  const db = (await getDb())!;
  const [o] = filas<any>(await db.execute(sql`SELECT * FROM festStandCashea WHERE id = ${id} LIMIT 1`));
  if (!o) throw new Error("Orden no encontrada");
  if (o.estado === "confirmada") return { ok: true, yaEstaba: true };
  if (!["por_confirmar", "error"].includes(o.estado) || !o.orderId) throw new Error("Esta orden no se puede confirmar");
  const [r] = filas<any>(await db.execute(sql`SELECT * FROM festStandReservas WHERE id = ${o.reservaId} LIMIT 1`));
  if (!r) throw new Error("Reserva no encontrada");
  if (r.estado === "pagado") throw new Error("Este stand ya está pagado por completo. Cancela la orden de Cashea.");
  if (r.estado === "pendiente") throw new Error("La tienda todavía no tiene la inicial pagada. Si ya la reportó, apruébala primero en «Pagos por revisar».");
  if (r.estado !== "apartado") throw new Error("Esta reserva no está activa");
  // La inicial que se le confirma a Cashea: por defecto, todo lo que la tienda ya pagó
  const pagado = Math.round(Number(r.pagado) * 100) / 100;
  const inicial = Math.round((inicialIndicada ?? pagado) * 100) / 100;
  if (inicial <= 0) throw new Error("Indica la inicial que se va a confirmar");
  if (inicial > pagado + 0.009) {
    throw new Error(`La tienda ha pagado $${pagado.toFixed(2)} y la inicial es de $${inicial.toFixed(2)}: le faltan $${(inicial - pagado).toFixed(2)}. Regístrale ese pago antes de confirmar.`);
  }

  const res = await casheaApi("POST", `/orders/${encodeURIComponent(o.orderId)}/down-payment`, { amount: inicial });
  if (!res.ok) {
    const detalle = `Cashea respondió ${res.status}${res.texto ? `: ${res.texto}` : ""}`.slice(0, 300);
    await db.execute(sql`UPDATE festStandCashea SET estado = 'error', detalle = ${detalle} WHERE id = ${id}`);
    throw new Error(`Cashea no aceptó la confirmación (${res.status}). ${res.texto || "Revisa la orden en tu portal de Cashea."}`);
  }
  // Cashea ya la tiene confirmada: se anota antes de tocar la reserva
  await db.execute(sql`UPDATE festStandCashea SET estado = 'confirmada', inicial = ${inicial}, detalle = NULL WHERE id = ${id}`);
  const saldo = Math.round((Number(r.precio) - Number(r.pagado)) * 100) / 100;
  const pagoId = insertado(await db.execute(sql`INSERT INTO festStandPagos (reservaId, monto, metodo, referencia)
    VALUES (${r.id}, ${saldo}, 'cashea', ${`Cashea orden ${o.orderId} · total $${Number(o.total).toFixed(2)}`})`));
  const pago = await aprobarPago(pagoId);
  return { ok: true, completo: Boolean((pago as any).completo) };
}

/** Cancela la orden en Cashea (la tienda no completó, o el monto no cuadra) */
export async function casheaCancelar(id: number) {
  await asegurarTabla();
  const db = (await getDb())!;
  const [o] = filas<any>(await db.execute(sql`SELECT * FROM festStandCashea WHERE id = ${id} LIMIT 1`));
  if (!o) throw new Error("Orden no encontrada");
  if (o.estado === "confirmada") throw new Error("Esta orden ya fue confirmada: no se puede cancelar desde aquí");
  if (o.estado === "cancelada") return { ok: true };
  if (o.orderId) {
    const res = await casheaApi("DELETE", `/orders/${encodeURIComponent(o.orderId)}`);
    // 404: Cashea ya no la tiene; se da por cancelada
    if (!res.ok && res.status !== 404) throw new Error(`Cashea no pudo cancelar la orden (${res.status}). ${res.texto}`);
  }
  await db.execute(sql`UPDATE festStandCashea SET estado = 'cancelada' WHERE id = ${id}`);
  avisarCambio();
  return { ok: true };
}
