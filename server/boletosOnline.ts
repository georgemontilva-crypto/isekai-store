import { sql, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { events, ticketTypes } from "../drizzle/schema";
import { io } from "./_core/socket";
import { vendidosPorTipo } from "./beneficios";
import { emitirBoletosVendidos, tiendaEnLinea } from "./tickets";
import { verificarPagoBinance, binanceConfigurado, MENSAJE_BINANCE } from "./binancePay";

/**
 * Compra de boletos por la web.
 *
 * La persona elige su boleto, paga (Pago Móvil o Binance Pay) y reporta el
 * pago. Eso crea una ORDEN:
 *   - Binance Pay: con el número de transacción se verifica sola contra
 *     nuestra cuenta; si coincide, se aprueba al instante.
 *   - Pago Móvil (o Binance que no se pudo verificar): queda «en revisión»
 *     y el admin la aprueba con un toque.
 * Al aprobarse se EMITEN los boletos (digitales, ya vendidos, con su código
 * y su QR) y le llegan al comprador por correo con el diseño del boleto.
 */
const filas = <T,>(r: unknown) => ((r as any)?.[0] ?? []) as T[];
const SITIO = "https://www.isekaiworld.co";
export const MAX_POR_ORDEN = 6;

function avisar() {
  try { io?.to("stands").emit("stands:cambio"); io?.to("admin").emit("stands:cambio"); } catch { /* */ }
}

export async function asegurarTablasBoletosOnline() {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS festBoletoOrdenes (
      id int AUTO_INCREMENT PRIMARY KEY,
      clave varchar(40) NOT NULL,
      eventId int NOT NULL,
      ticketTypeId int NOT NULL,
      tipoNombre varchar(200) NOT NULL,
      cantidad int NOT NULL,
      monto decimal(10,2) NOT NULL,
      nombre varchar(200) NOT NULL,
      apellido varchar(200) NOT NULL,
      telefono varchar(50) NOT NULL,
      email varchar(320) NOT NULL,
      metodo varchar(30) NOT NULL,
      referencia varchar(120) NULL,
      comprobanteUrl varchar(600) NULL,
      estado varchar(20) NOT NULL DEFAULT 'pendiente',
      verificacion varchar(40) NULL,
      lote varchar(40) NULL,
      creadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revisadoEn timestamp NULL,
      UNIQUE KEY uniq_orden_clave (clave),
      INDEX idx_orden_estado (estado)
    )`);
    const { asegurarTablaBinance } = await import("./binancePay");
    await asegurarTablaBinance();
  } catch (e) { console.error("[BoletosOnline] preparación:", e); }
}

/** El evento que está a la venta: el próximo (o en curso) que esté activo */
async function eventoEnVenta() {
  const db = await getDb();
  if (!db) return undefined;
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date());
  const dia = (d: any) => new Date(d).toISOString().slice(0, 10);
  return (await db.select().from(events)).filter(e => e.active !== false && dia(e.endDate) >= hoy)
    .sort((a, b) => dia(a.startDate).localeCompare(dia(b.startDate)))[0];
}

/** Lo que ve el público: el evento y sus boletos a la venta */
export async function catalogo() {
  const db = await getDb();
  const ev = await eventoEnVenta();
  if (!db || !ev) return { evento: null, tipos: [], binanceAutomatico: binanceConfigurado(), maximo: MAX_POR_ORDEN };
  const [tipos, vendidos] = await Promise.all([
    db.select().from(ticketTypes).where(eq(ticketTypes.eventId, ev.id)).orderBy(ticketTypes.sortOrder, ticketTypes.id),
    vendidosPorTipo(ev.id),
  ]);
  return {
    evento: { id: ev.id, nombre: ev.name, inicio: ev.startDate, fin: ev.endDate, lugar: ev.location },
    tipos: tipos.filter(t => t.active && !(t as any).archivado).map(t => ({
      id: t.id, nombre: t.name, precio: parseFloat(t.priceUsd as any), dias: t.days, esVip: Boolean((t as any).esVip),
      color: (t as any).color as string | null,
      beneficios: String(t.perks ?? "").split("\n").map(x => x.trim()).filter(Boolean),
      cupo: (t as any).cupo as number | null,
      quedan: (t as any).cupo != null ? Math.max(0, (t as any).cupo - (vendidos[t.id] ?? 0)) : null,
    })),
    binanceAutomatico: binanceConfigurado(),
    maximo: MAX_POR_ORDEN,
  };
}

type DatosOrden = {
  ticketTypeId: number; cantidad: number; nombre: string; apellido: string; telefono: string; email: string;
  metodo: "pago_movil" | "crypto"; referencia: string; comprobanteUrl?: string;
};

export async function crearOrden(d: DatosOrden) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const cat = await catalogo();
  const tipo = cat.tipos.find(t => t.id === d.ticketTypeId);
  if (!cat.evento || !tipo) throw new Error("Ese boleto ya no está a la venta");
  if (tipo.quedan !== null && tipo.quedan < d.cantidad) throw new Error(tipo.quedan === 0 ? `«${tipo.nombre}» está agotado` : `Solo quedan ${tipo.quedan} de «${tipo.nombre}»`);
  const monto = Math.round(tipo.precio * d.cantidad * 100) / 100;
  const clave = nanoid(24).replace(/[^a-zA-Z0-9]/g, "x");
  const res = await db.execute(sql`INSERT INTO festBoletoOrdenes
    (clave, eventId, ticketTypeId, tipoNombre, cantidad, monto, nombre, apellido, telefono, email, metodo, referencia, comprobanteUrl)
    VALUES (${clave}, ${cat.evento.id}, ${tipo.id}, ${tipo.nombre}, ${d.cantidad}, ${monto}, ${d.nombre}, ${d.apellido}, ${d.telefono}, ${d.email}, ${d.metodo}, ${d.referencia}, ${d.comprobanteUrl ?? null})`);
  const id = Number((res as any)?.[0]?.insertId);

  let mensaje: string | null = null;
  if (d.metodo === "crypto") {
    const r = await intentarBinance(id, d.referencia, monto);
    if (r.aprobada) return { clave, estado: "aprobado" as const, monto, mensaje: null };
    mensaje = r.mensaje;
  }
  try {
    const { insertAdminNotification } = await import("./db");
    await insertAdminNotification({ type: "new_order", title: "Compra de boletos por revisar", body: `${d.cantidad} × ${tipo.nombre} · ${d.nombre} ${d.apellido} · $${monto}` });
    const { enviarPushAdmins } = await import("./push");
    await enviarPushAdmins({ titulo: `🎟️ Boletos por revisar · $${monto}`, cuerpo: `${d.cantidad} × ${tipo.nombre} · ${d.nombre} ${d.apellido}`, url: "/boleteria?v=admin", etiqueta: `orden-boleto-${id}` });
  } catch (e) { console.warn("[BoletosOnline] aviso al admin:", e); }
  avisar();
  return { clave, estado: "pendiente" as const, monto, mensaje };
}

/** Verifica contra Binance y, si coincide, aprueba la orden */
async function intentarBinance(id: number, transactionId: string, monto: number) {
  const r = await verificarPagoBinance({ transactionId, montoUsd: monto, uso: `boleto:${id}` });
  const db = await getDb();
  await db?.execute(sql`UPDATE festBoletoOrdenes SET verificacion = ${r.ok ? "binance_ok" : `binance_${r.motivo}`} WHERE id = ${id}`);
  if (!r.ok) return { aprobada: false, mensaje: MENSAJE_BINANCE[r.motivo] ?? MENSAJE_BINANCE.error };
  try { await aprobarOrden(id, true); return { aprobada: true, mensaje: null }; }
  catch (e: any) { return { aprobada: false, mensaje: `Tu pago está confirmado, pero no pudimos emitir los boletos: ${e.message}. Te contactaremos.` }; }
}

/** El comprador corrige o reenvía su número de transacción */
export async function reintentarVerificacion(clave: string, transactionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [o] = filas<any>(await db.execute(sql`SELECT * FROM festBoletoOrdenes WHERE clave = ${clave} LIMIT 1`));
  if (!o) throw new Error("No encontramos esa compra");
  if (o.estado === "aprobado") return { estado: "aprobado" as const, mensaje: null };
  if (o.estado === "rechazado") throw new Error("Esta compra fue rechazada. Haz una nueva.");
  if (o.metodo !== "crypto") throw new Error("Esta compra no se pagó por Binance");
  await db.execute(sql`UPDATE festBoletoOrdenes SET referencia = ${transactionId} WHERE id = ${o.id}`);
  const r = await intentarBinance(o.id, transactionId, Number(o.monto));
  return { estado: r.aprobada ? "aprobado" as const : "pendiente" as const, mensaje: r.mensaje };
}

/** Aprueba: emite los boletos y los manda por correo. Solo una vez. */
export async function aprobarOrden(id: number, automatica = false) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const lote = `WEB${id}`;
  const [res] = await db.execute(sql`UPDATE festBoletoOrdenes SET estado = 'aprobado', lote = ${lote}, revisadoEn = NOW(),
    verificacion = COALESCE(verificacion, ${automatica ? "binance_ok" : "manual"}) WHERE id = ${id} AND estado = 'pendiente'`) as any;
  if (!res?.affectedRows) return { ok: true, yaEstaba: true };
  const [o] = filas<any>(await db.execute(sql`SELECT * FROM festBoletoOrdenes WHERE id = ${id}`));
  try {
    const tienda = await tiendaEnLinea();
    if (!tienda) throw new Error("No se pudo preparar el punto de venta en línea");
    const r = await emitirBoletosVendidos({
      ticketTypeId: o.ticketTypeId, cantidad: Number(o.cantidad), storeId: tienda.id, lote,
      buyerName: o.nombre, buyerLastName: o.apellido, buyerPhone: o.telefono, buyerEmail: o.email,
    });
    void enviarBoletos(o, r).catch(e => console.warn("[BoletosOnline] correo:", e));
    try { const { getAdminUsers } = await import("./db"); for (const a of await getAdminUsers()) io.to(`user:${a.id}`).emit("ticket:sold"); } catch { /* */ }
    avisar();
    return { ok: true, boletos: r.boletos.length };
  } catch (e) {
    // No se pudo emitir (por ejemplo, se agotó el cupo): la orden vuelve a revisión
    await db.execute(sql`UPDATE festBoletoOrdenes SET estado = 'pendiente', lote = NULL, revisadoEn = NULL WHERE id = ${id}`);
    throw e;
  }
}

export async function rechazarOrden(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [res] = await db.execute(sql`UPDATE festBoletoOrdenes SET estado = 'rechazado', revisadoEn = NOW() WHERE id = ${id} AND estado = 'pendiente'`) as any;
  if (!res?.affectedRows) return { ok: true, yaEstaba: true };
  const [o] = filas<any>(await db.execute(sql`SELECT * FROM festBoletoOrdenes WHERE id = ${id}`));
  try {
    const { sendEmail } = await import("./_core/notification");
    await sendEmail(o.email, "No pudimos confirmar tu pago · Isekai World Fest", `
      <h2>No pudimos confirmar tu pago</h2>
      <p>Hola, ${esc(o.nombre)}. No encontramos el pago de <strong>$${Number(o.monto).toFixed(2)}</strong> por ${o.cantidad} × ${esc(o.tipoNombre)} (referencia ${esc(o.referencia ?? "—")}).</p>
      <p>Revisa la referencia y vuelve a hacer la compra, o escríbenos a <a href="mailto:ventas@isekaiworld.co">ventas@isekaiworld.co</a> con tu comprobante.</p>
      <div style="text-align:center;margin:24px 0"><a href="${SITIO}/boletos" class="btn">Volver a comprar →</a></div>`, "Revisa la referencia de tu pago");
  } catch (e) { console.warn("[BoletosOnline] correo de rechazo:", e); }
  avisar();
  return { ok: true };
}

/** Estado de una compra, para quien la hizo (por su clave) */
export async function estadoOrden(clave: string) {
  const db = await getDb();
  if (!db) return null;
  const [o] = filas<any>(await db.execute(sql`SELECT * FROM festBoletoOrdenes WHERE clave = ${clave} LIMIT 1`));
  if (!o) return null;
  const boletos = o.estado === "aprobado" && o.lote
    ? filas<any>(await db.execute(sql`SELECT code, token FROM eventTickets WHERE batch = ${o.lote} AND eventId = ${o.eventId} ORDER BY id`))
    : [];
  return {
    estado: o.estado as "pendiente" | "aprobado" | "rechazado", metodo: o.metodo as string, tipo: o.tipoNombre as string,
    cantidad: Number(o.cantidad), monto: Number(o.monto), email: o.email as string, nombre: o.nombre as string,
    boletos: boletos.map(b => ({ codigo: b.code as string, token: b.token as string })),
  };
}

/** Admin: compras por la web */
export async function panelOrdenes() {
  const db = await getDb();
  if (!db) return [];
  return filas<any>(await db.execute(sql`SELECT * FROM festBoletoOrdenes ORDER BY (estado = 'pendiente') DESC, creadoEn DESC LIMIT 200`))
    .map(o => ({ ...o, monto: Number(o.monto), cantidad: Number(o.cantidad) }));
}

/** Datos de un boleto para mostrarlo con su diseño (quien tiene el enlace) */
export async function boletoPublico(token: string) {
  const db = await getDb();
  if (!db) return null;
  const [b] = filas<any>(await db.execute(sql`SELECT t.code, t.token, t.status, t.buyerName, t.buyerLastName, tt.name AS tipo, tt.days, tt.color, tt.esVip,
    e.name AS evento, e.startDate, e.endDate, e.location
    FROM eventTickets t LEFT JOIN ticketTypes tt ON tt.id = t.ticketTypeId JOIN events e ON e.id = t.eventId WHERE t.token = ${token} LIMIT 1`));
  if (!b || b.status === "blank") return null;
  return {
    codigo: b.code as string, token: b.token as string, anulado: b.status === "void",
    nombre: `${b.buyerName ?? ""} ${b.buyerLastName ?? ""}`.trim(), tipo: (b.tipo ?? "") as string, dias: Number(b.days ?? 1),
    color: (b.color ?? null) as string | null, esVip: Boolean(b.esVip),
    evento: b.evento as string, inicio: b.startDate as Date, fin: b.endDate as Date, lugar: (b.location ?? null) as string | null,
  };
}

const esc = (v: string) => String(v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const fechaLarga = (d: any) => new Date(d).toLocaleDateString("es-VE", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });

/** El correo con el boleto: un «boleto» por cada entrada, con su QR */
async function enviarBoletos(o: any, r: { boletos: any[]; tipo: any; evento: any }) {
  const { sendEmail } = await import("./_core/notification");
  const color = r.tipo.color || "#e5007d";
  const fechas = fechaLarga(r.evento.startDate) === fechaLarga(r.evento.endDate) ? fechaLarga(r.evento.startDate) : `${fechaLarga(r.evento.startDate).replace(/ de \d{4}$/, "")} y ${fechaLarga(r.evento.endDate)}`;
  const tarjetas = r.boletos.map(b => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-collapse:separate;border-radius:18px;overflow:hidden;background:#15121c;border:1px solid #2c2638">
      <tr><td style="height:6px;background:${color};font-size:0;line-height:0">&nbsp;</td></tr>
      <tr><td style="padding:22px 22px 16px">
        <p style="margin:0;font-size:12px;letter-spacing:2px;color:#ff3d9e;font-weight:700">ISEKAI WORLD FEST</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:#ffffff">${esc(r.tipo.name)}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#bfb8c9">${esc(fechas)}${r.evento.location ? `<br>${esc(r.evento.location)}` : ""}</p>
        <p style="margin:14px 0 0;font-size:13px;color:#9a93a6">A nombre de</p>
        <p style="margin:2px 0 0;font-size:16px;font-weight:700;color:#ffffff">${esc(`${o.nombre} ${o.apellido}`)}</p>
      </td></tr>
      <tr><td style="border-top:2px dashed #2c2638;padding:18px 22px;text-align:center;background:#100e16">
        <img src="${SITIO}/api/boleto-qr/${b.token}.png" width="190" height="190" alt="Código QR del boleto ${b.code}" style="display:inline-block;border-radius:12px;background:#ffffff;padding:8px">
        <p style="margin:12px 0 0;font-size:24px;font-weight:800;letter-spacing:3px;color:#ffffff;font-family:monospace">${b.code}</p>
        <p style="margin:10px 0 0"><a href="${SITIO}/boleto/${b.token}" style="color:#7dd8ff;font-size:14px;font-weight:700">Abrir este boleto en el teléfono</a></p>
      </td></tr>
    </table>`).join("");
  const n = r.boletos.length;
  await sendEmail(o.email, `🎟️ ${n === 1 ? "Tu boleto" : `Tus ${n} boletos`} para el ${r.evento.name}`, `
    <h1>${n === 1 ? "¡Tu boleto está listo!" : `¡Tus ${n} boletos están listos!`}</h1>
    <p>Hola, <strong>${esc(o.nombre)}</strong>. Confirmamos tu pago de <strong>$${Number(o.monto).toFixed(2)}</strong>. ${n === 1 ? "Este es tu boleto" : "Estos son tus boletos"}: guarda este correo.</p>
    ${tarjetas}
    <div class="order-box">
      <p><strong>El día del evento</strong></p>
      <p style="margin-top:8px">Muestra el código QR desde tu teléfono o impreso. Cada QR vale para una persona${r.tipo.days > 1 ? " y sirve los dos días" : ""}. Si no carga la imagen, en la puerta también te buscan por el código.</p>
    </div>
    <div class="order-box">
      <p><strong>Tu Level Pass</strong></p>
      <p style="margin-top:8px">Entra a <a href="${SITIO}/worldfest/pass">isekaiworld.co/worldfest/pass</a> con este correo (${esc(o.email)}) para ver tu rango, tu EXP y las misiones del Fest.</p>
    </div>`, `${n === 1 ? "Tu boleto" : "Tus boletos"} con código QR`);
}
