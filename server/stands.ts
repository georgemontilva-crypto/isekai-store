import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { io } from "./_core/socket";

/** Aviso en vivo: la página de stands y el admin se actualizan solos */
function avisarCambio() {
  try { io?.to("stands").emit("stands:cambio"); io?.to("admin").emit("stands:cambio"); } catch { /* sin canal en vivo */ }
}

/** Un stand pagado por completo le da a su tienda acceso a la Boletería */
function sincronizarTiendas() {
  void import("./standTiendas").then(m => m.sincronizarTiendasDeStands()).catch(e => console.warn("[Stands] tiendas:", e));
}

/**
 * Venta de stands del Isekai World Fest.
 *
 * - Cada stand es una mesa numerada (M-01…, G-01…, GG-01…) de un tipo:
 *   Mercader, Gremio o Gran Gremio. Puede tener su punto en el plano (x, y en %).
 * - Quien compra elige su mesa, deja sus datos y reporta su pago: abono del
 *   30% o pago completo. Eso crea una SOLICITUD con el pago en revisión.
 * - La mesa NO se bloquea mientras se revisa: queda tomada solo cuando el
 *   admin confirma un pago. Esa confirmación es atómica: si dos personas
 *   pidieron la misma mesa, gana el primer pago confirmado y el segundo avisa.
 * - Con abono la mesa queda «Apartada» con saldo pendiente; al completar el
 *   pago queda «Pagada».
 *
 * Las tablas se crean solas al arrancar (no hay que correr SQL a mano).
 */

export type TipoStand = "mercader" | "gremio" | "gran_gremio";

export const TIPOS_STAND: Record<TipoStand, { nombre: string; precio: number; prefijo: string; cantidad: number; color: string; incluye: string[] }> = {
  mercader: {
    nombre: "Mercader", precio: 299, prefijo: "M", cantidad: 60, color: "#38bdf8",
    incluye: ["Mesa en el corredor comercial", "1 misión en el Level Pass: tu stand da experiencia"],
  },
  gremio: {
    nombre: "Gremio", precio: 399, prefijo: "G", cantidad: 12, color: "#a78bfa",
    incluye: ["Mesa en el Gran Salón", "Punto oficial de venta de boletería", "Recuperas el 60% del valor del stand en ventas de boletos", "2 misiones en el Level Pass: tu stand da experiencia"],
  },
  gran_gremio: {
    nombre: "Gran Gremio", precio: 499, prefijo: "GG", cantidad: 8, color: "#fbbf24",
    incluye: ["Mesa en primera fila del Gran Salón, bordeando al público frente al escenario", "Punto oficial de venta de boletería", "Recuperas el 100% del valor del stand + 10% en ventas de boletos", "3 misiones en el Level Pass: tu stand da experiencia"],
  },
};

/**
 * Ubicación de cada mesa en el plano oficial (x, y en % del plano), sacada de
 * las mesas dibujadas en mapa-fest.svg. Se aplica sola a las mesas que aún no
 * tienen punto; si el admin mueve una mesa, se respeta su cambio.
 */
/** Subir al cambiar la distribución: reubica todas las mesas una vez */
export const VERSION_PLANO = "v2-gran-gremio-frente";

export const PLANO_STANDS: [string, TipoStand, number, number][] = [
  ["GG-01", "gran_gremio", 66.78, 36.69],
  ["GG-02", "gran_gremio", 70.05, 36.69],
  ["GG-03", "gran_gremio", 73.25, 36.69],
  ["GG-04", "gran_gremio", 76.45, 36.69],
  ["GG-05", "gran_gremio", 66.78, 56.2],
  ["GG-06", "gran_gremio", 70.05, 56.2],
  ["GG-07", "gran_gremio", 73.25, 56.2],
  ["GG-08", "gran_gremio", 76.45, 56.2],
  ["G-01", "gremio", 60.38, 36.69],
  ["G-02", "gremio", 63.58, 36.69],
  ["G-03", "gremio", 57.85, 41.39],
  ["G-04", "gremio", 57.85, 46.57],
  ["G-05", "gremio", 57.85, 51.75],
  ["G-06", "gremio", 60.38, 56.2],
  ["G-07", "gremio", 63.58, 56.2],
  ["G-08", "gremio", 53.98, 35.12],
  ["G-09", "gremio", 53.98, 40.3],
  ["G-10", "gremio", 53.98, 45.48],
  ["G-11", "gremio", 53.98, 50.66],
  ["G-12", "gremio", 53.98, 55.84],
  ["M-01", "mercader", 54.43, 66.08],
  ["M-02", "mercader", 57.55, 66.08],
  ["M-03", "mercader", 60.68, 66.08],
  ["M-04", "mercader", 63.8, 66.08],
  ["M-05", "mercader", 66.93, 66.08],
  ["M-06", "mercader", 70.13, 66.08],
  ["M-07", "mercader", 73.25, 66.08],
  ["M-08", "mercader", 76.38, 66.08],
  ["M-09", "mercader", 50.26, 71.87],
  ["M-10", "mercader", 53.39, 71.87],
  ["M-11", "mercader", 56.58, 71.87],
  ["M-12", "mercader", 59.71, 71.87],
  ["M-13", "mercader", 62.83, 71.87],
  ["M-14", "mercader", 66.03, 71.87],
  ["M-15", "mercader", 69.16, 71.87],
  ["M-16", "mercader", 72.28, 71.87],
  ["M-17", "mercader", 75.48, 71.87],
  ["M-18", "mercader", 78.61, 71.87],
  ["M-19", "mercader", 52.34, 62.41],
  ["M-20", "mercader", 16.48, 47.89],
  ["M-21", "mercader", 19.68, 47.89],
  ["M-22", "mercader", 22.88, 47.89],
  ["M-23", "mercader", 26.08, 47.89],
  ["M-24", "mercader", 29.28, 47.89],
  ["M-25", "mercader", 32.48, 47.89],
  ["M-26", "mercader", 34.71, 47.89],
  ["M-27", "mercader", 8.67, 57.05],
  ["M-28", "mercader", 11.87, 57.05],
  ["M-29", "mercader", 15.07, 57.05],
  ["M-30", "mercader", 23.92, 57.05],
  ["M-31", "mercader", 27.12, 57.05],
  ["M-32", "mercader", 30.32, 57.05],
  ["M-33", "mercader", 33.52, 57.05],
  ["M-34", "mercader", 8.67, 58.73],
  ["M-35", "mercader", 11.87, 58.73],
  ["M-36", "mercader", 15.07, 58.73],
  ["M-37", "mercader", 23.92, 58.73],
  ["M-38", "mercader", 27.12, 58.73],
  ["M-39", "mercader", 30.32, 58.73],
  ["M-40", "mercader", 33.52, 58.73],
  ["M-41", "mercader", 24.52, 78.13],
  ["M-42", "mercader", 27.72, 78.13],
  ["M-43", "mercader", 30.92, 78.13],
  ["M-44", "mercader", 24.52, 79.82],
  ["M-45", "mercader", 27.72, 79.82],
  ["M-46", "mercader", 30.92, 79.82],
  ["M-47", "mercader", 58.15, 29.46],
  ["M-48", "mercader", 61.35, 29.46],
  ["M-49", "mercader", 64.55, 29.46],
  ["M-50", "mercader", 67.75, 29.46],
  ["M-51", "mercader", 70.94, 29.46],
  ["M-52", "mercader", 74.14, 29.46],
  ["M-53", "mercader", 77.34, 29.46],
  ["M-54", "mercader", 58.15, 63.55],
  ["M-55", "mercader", 61.35, 63.55],
  ["M-56", "mercader", 64.55, 63.55],
  ["M-57", "mercader", 67.75, 63.55],
  ["M-58", "mercader", 70.94, 63.55],
  ["M-59", "mercader", 74.14, 63.55],
  ["M-60", "mercader", 77.34, 63.55],
];

/** Porcentaje del abono para apartar */
export const ABONO_PCT = 30;

const filas = <T>(r: unknown): T[] => ((r as [T[]])?.[0] ?? []) as T[];

export async function asegurarTablasStands() {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS festStands (
      id int AUTO_INCREMENT PRIMARY KEY,
      numero varchar(10) NOT NULL,
      tipo varchar(20) NOT NULL,
      x decimal(6,3) NULL,
      y decimal(6,3) NULL,
      estado varchar(20) NOT NULL DEFAULT 'libre',
      reservaId int NULL,
      actualizadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_stand_numero (numero)
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS festStandReservas (
      id int AUTO_INCREMENT PRIMARY KEY,
      standId int NOT NULL,
      tipo varchar(20) NOT NULL,
      precio decimal(10,2) NOT NULL,
      negocio varchar(150) NOT NULL,
      contacto varchar(150) NOT NULL,
      email varchar(320) NOT NULL,
      whatsapp varchar(40) NOT NULL,
      rif varchar(40) NULL,
      modalidad varchar(20) NOT NULL,
      estado varchar(20) NOT NULL DEFAULT 'pendiente',
      pagado decimal(10,2) NOT NULL DEFAULT 0,
      notas text NULL,
      creadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      confirmadaEn timestamp NULL,
      INDEX idx_reserva_stand (standId),
      INDEX idx_reserva_estado (estado)
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS festStandPagos (
      id int AUTO_INCREMENT PRIMARY KEY,
      reservaId int NOT NULL,
      monto decimal(10,2) NOT NULL,
      metodo varchar(30) NOT NULL,
      referencia varchar(120) NULL,
      comprobanteUrl varchar(600) NULL,
      estado varchar(20) NOT NULL DEFAULT 'pendiente',
      creadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revisadoEn timestamp NULL,
      INDEX idx_pago_reserva (reservaId)
    )`);
    // Las mesas se crean la primera vez con su numeración
    const [[{ n }]] = await db.execute(sql`SELECT COUNT(*) AS n FROM festStands`) as unknown as [[{ n: number }]];
    if (Number(n) === 0) {
      for (const [tipo, t] of Object.entries(TIPOS_STAND) as [TipoStand, (typeof TIPOS_STAND)[TipoStand]][]) {
        for (let i = 1; i <= t.cantidad; i++) {
          const numero = `${t.prefijo}-${String(i).padStart(2, "0")}`;
          await db.execute(sql`INSERT IGNORE INTO festStands (numero, tipo) VALUES (${numero}, ${tipo})`);
        }
      }
      console.log("[Stands] Mesas creadas: 60 Mercader, 12 Gremio, 8 Gran Gremio");
    }
    // Cada mesa en su lugar del plano. Cuando cambia la versión del plano se
    // reubican todas una vez; después solo las que no tienen punto, así se
    // respetan los cambios que haga el admin.
    await db.execute(sql`CREATE TABLE IF NOT EXISTS festStandsMeta (clave varchar(40) PRIMARY KEY, valor varchar(100) NOT NULL)`);
    const [[meta]] = await db.execute(sql`SELECT valor FROM festStandsMeta WHERE clave = 'plano'`) as unknown as [[{ valor: string } | undefined]];
    const forzar = meta?.valor !== VERSION_PLANO;
    for (const [numero, , x, y] of PLANO_STANDS) {
      if (forzar) await db.execute(sql`UPDATE festStands SET x = ${x}, y = ${y} WHERE numero = ${numero}`);
      else await db.execute(sql`UPDATE festStands SET x = ${x}, y = ${y} WHERE numero = ${numero} AND x IS NULL`);
    }
    if (forzar) {
      await db.execute(sql`INSERT INTO festStandsMeta (clave, valor) VALUES ('plano', ${VERSION_PLANO}) ON DUPLICATE KEY UPDATE valor = ${VERSION_PLANO}`);
      console.log(`[Stands] Plano ${VERSION_PLANO}: mesas reubicadas`);
    }
  } catch (e) {
    console.error("[Stands] No se pudieron preparar las tablas:", e);
  }
}

export type StandPublico = { id: number; numero: string; tipo: TipoStand; x: number | null; y: number | null; libre: boolean };

/** Mapa público: qué mesas están libres (sin datos de quién compró) */
export async function standsPublicos(): Promise<{ stands: StandPublico[]; disponibles: Record<TipoStand, number> }> {
  const db = await getDb();
  const disponibles = { mercader: 0, gremio: 0, gran_gremio: 0 } as Record<TipoStand, number>;
  if (!db) return { stands: [], disponibles };
  const r = filas<{ id: number; numero: string; tipo: TipoStand; x: string | null; y: string | null; estado: string }>(
    await db.execute(sql`SELECT id, numero, tipo, x, y, estado FROM festStands ORDER BY tipo, numero`),
  );
  const stands = r.map(s => ({
    id: s.id, numero: s.numero, tipo: s.tipo,
    x: s.x === null ? null : Number(s.x), y: s.y === null ? null : Number(s.y),
    libre: s.estado === "libre",
  }));
  for (const s of stands) if (s.libre && s.tipo in disponibles) disponibles[s.tipo]++;
  return { stands, disponibles };
}

export type DatosSolicitud = {
  standId: number; negocio: string; contacto: string; email: string; whatsapp: string; rif?: string;
  modalidad: "abono" | "completo"; metodo: string; referencia: string; comprobanteUrl?: string;
};

/** Solicitud de compra: queda en revisión hasta que el admin confirme el pago */
export async function crearSolicitud(d: DatosSolicitud) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [stand] = filas<{ id: number; numero: string; tipo: TipoStand; estado: string }>(
    await db.execute(sql`SELECT id, numero, tipo, estado FROM festStands WHERE id = ${d.standId} LIMIT 1`),
  );
  if (!stand) throw new Error("Ese stand no existe");
  if (stand.estado !== "libre") throw new Error(`El stand ${stand.numero} ya fue reservado. Elige otro, por favor.`);
  const t = TIPOS_STAND[stand.tipo];
  const monto = d.modalidad === "abono" ? Math.round(t.precio * ABONO_PCT) / 100 : t.precio;
  const res = await db.execute(sql`INSERT INTO festStandReservas
    (standId, tipo, precio, negocio, contacto, email, whatsapp, rif, modalidad)
    VALUES (${stand.id}, ${stand.tipo}, ${t.precio}, ${d.negocio}, ${d.contacto}, ${d.email}, ${d.whatsapp}, ${d.rif ?? null}, ${d.modalidad})`);
  const reservaId = Number((res as any)?.[0]?.insertId);
  const insPago = await db.execute(sql`INSERT INTO festStandPagos (reservaId, monto, metodo, referencia, comprobanteUrl)
    VALUES (${reservaId}, ${monto}, ${d.metodo}, ${d.referencia}, ${d.comprobanteUrl ?? null})`);
  // Binance Pay: con el número de transacción se verifica solo. Si coincide,
  // la mesa queda reservada al instante; si no, sigue a revisión manual.
  let avisoBinance: string | null = null;
  if (d.metodo === "crypto") {
    try {
      const { verificarPagoBinance, MENSAJE_BINANCE } = await import("./binancePay");
      const v = await verificarPagoBinance({ transactionId: d.referencia, montoUsd: monto, uso: `stand:${reservaId}` });
      if (v.ok) {
        await aprobarPago(Number((insPago as any)?.[0]?.insertId));
        return { ok: true, reservaId, numero: stand.numero, monto, tipo: t.nombre, aprobado: true, aviso: null as string | null };
      }
      avisoBinance = MENSAJE_BINANCE[v.motivo] ?? null;
    } catch (e: any) { console.warn("[Stands] verificación Binance:", e?.message ?? e); }
  }
  // Aviso al admin (no frena la solicitud si falla)
  try {
    const { insertAdminNotification } = await import("./db");
    await insertAdminNotification({ type: "new_order", title: "Nueva solicitud de stand", body: `${stand.numero} · ${t.nombre} · ${d.negocio} · $${monto} (${d.modalidad === "abono" ? `abono ${ABONO_PCT}%` : "pago completo"})` });
    const { enviarPushAdmins } = await import("./push");
    await enviarPushAdmins({ titulo: `🏪 Stand ${stand.numero} · ${d.negocio}`, cuerpo: `${t.nombre} · reportó $${monto}. Revisa el pago.`, url: "/admin?tab=stands", etiqueta: `stand-${reservaId}` });
  } catch (e) { console.warn("[Stands] aviso al admin:", e); }
  avisarCambio();
  return { ok: true, reservaId, numero: stand.numero, monto, tipo: t.nombre, aprobado: false, aviso: avisoBinance };
}

/** Todo para el admin: mesas, solicitudes y pagos */
export async function panelStands() {
  const db = await getDb();
  if (!db) return { stands: [], reservas: [], pagos: [] };
  const stands = filas<any>(await db.execute(sql`SELECT * FROM festStands ORDER BY tipo, numero`))
    .map(s => ({ ...s, x: s.x === null ? null : Number(s.x), y: s.y === null ? null : Number(s.y) }));
  const reservas = filas<any>(await db.execute(sql`SELECT r.*, s.numero FROM festStandReservas r JOIN festStands s ON s.id = r.standId ORDER BY r.creadoEn DESC`))
    .map(r => ({ ...r, precio: Number(r.precio), pagado: Number(r.pagado) }));
  const pagos = filas<any>(await db.execute(sql`SELECT * FROM festStandPagos ORDER BY creadoEn DESC`))
    .map(p => ({ ...p, monto: Number(p.monto) }));
  return { stands, reservas, pagos };
}

/**
 * Aprobar un pago. Si la solicitud aún no tiene mesa tomada, la toma en este
 * momento SOLO si sigue libre (o ya es suya): así nadie más puede quedarse con
 * ella. Devuelve error claro si otra persona la confirmó antes.
 */
export async function aprobarPago(pagoId: number, montoReal?: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [pago] = filas<any>(await db.execute(sql`SELECT * FROM festStandPagos WHERE id = ${pagoId} LIMIT 1`));
  if (!pago) throw new Error("Pago no encontrado");
  if (pago.estado === "aprobado") return { ok: true, yaEstaba: true };
  const [reserva] = filas<any>(await db.execute(sql`SELECT * FROM festStandReservas WHERE id = ${pago.reservaId} LIMIT 1`));
  if (!reserva) throw new Error("Solicitud no encontrada");
  if (reserva.estado === "rechazada") throw new Error("Esta solicitud fue rechazada");

  const monto = montoReal ?? Number(pago.monto);
  const pagado = Number(reserva.pagado) + monto;
  const completo = pagado + 0.009 >= Number(reserva.precio);
  const estadoMesa = completo ? "pagado" : "apartado";

  // Toma de la mesa: atómica. Solo si está libre o ya es de esta solicitud.
  const [res] = await db.execute(sql`UPDATE festStands SET estado = ${estadoMesa}, reservaId = ${reserva.id}
    WHERE id = ${reserva.standId} AND (estado = 'libre' OR reservaId = ${reserva.id})`) as any;
  if (!res?.affectedRows) {
    const [otra] = filas<any>(await db.execute(sql`SELECT s.numero, r.negocio FROM festStands s LEFT JOIN festStandReservas r ON r.id = s.reservaId WHERE s.id = ${reserva.standId}`));
    throw new Error(`La mesa ${otra?.numero ?? ""} ya es de «${otra?.negocio ?? "otra tienda"}». Asígnale otra mesa libre a esta solicitud antes de aprobar.`);
  }
  await db.execute(sql`UPDATE festStandPagos SET estado = 'aprobado', monto = ${monto}, revisadoEn = NOW() WHERE id = ${pagoId}`);
  await db.execute(sql`UPDATE festStandReservas SET pagado = ${pagado}, estado = ${completo ? "pagado" : "apartado"},
    confirmadaEn = COALESCE(confirmadaEn, NOW()) WHERE id = ${reserva.id}`);

  // Correo al cliente con su mesa confirmada y el saldo
  try {
    const [s] = filas<any>(await db.execute(sql`SELECT numero FROM festStands WHERE id = ${reserva.standId}`));
    if (!reserva.email) throw new Error("sin correo");
    const { sendEmail } = await import("./_core/notification");
    const t = TIPOS_STAND[reserva.tipo as TipoStand];
    const saldo = Math.max(0, Number(reserva.precio) - pagado);
    const fila = (k: string, v: string) => `<tr><td style="padding:8px 0;color:#9a93a6">${k}</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#ffffff">${v}</td></tr>`;
    const asunto = completo
      ? `✅ Tu stand ${s?.numero} está pagado · Isekai World Fest 2027`
      : `✅ Tu lugar quedó apartado: stand ${s?.numero} · Isekai World Fest 2027`;
    await sendEmail(reserva.email, asunto, `
      <h2>${completo ? "¡Tu stand está pagado!" : "¡Tu lugar quedó apartado!"}</h2>
      <p>Hola, ${reserva.contacto}. Confirmamos el pago de <strong>$${monto.toFixed(2)}</strong> de <strong>${reserva.negocio}</strong>.
      ${completo ? "Tu stand está pagado por completo." : "Tu mesa ya está reservada a tu nombre."} Nadie más puede apartarla.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;border-top:1px solid #2a2433;border-bottom:1px solid #2a2433">
        ${fila("Stand", `${s?.numero ?? ""} · ${t?.nombre ?? reserva.tipo}`)}
        ${fila("Precio del stand", `$${Number(reserva.precio).toFixed(2)}`)}
        ${fila("Pagado hasta hoy", `$${pagado.toFixed(2)}`)}
        ${fila(saldo > 0 ? "Saldo pendiente" : "Saldo", saldo > 0 ? `$${saldo.toFixed(2)}` : "Pagado ✓")}
      </table>
      ${saldo > 0 ? `<p>El saldo de <strong>$${saldo.toFixed(2)}</strong> lo puedes pagar cuando quieras antes del evento. Escríbenos a <a href="mailto:ventas@isekaiworld.co">ventas@isekaiworld.co</a> para coordinarlo.</p>` : ""}
      <div style="text-align:center;margin:24px 0"><a href="https://www.isekaiworld.co/stands" class="btn">Ver el plano de stands →</a></div>
      <p style="color:#9a93a6">Isekai World Fest 2027 · 14 y 15 de agosto · Maracaibo, Venezuela</p>`,
      completo ? `Stand ${s?.numero} pagado por completo` : `Tu stand ${s?.numero} quedó apartado a tu nombre`);
  } catch (e) { console.warn("[Stands] correo al cliente:", e); }
  avisarCambio();
  sincronizarTiendas();
  return { ok: true, completo, pagado };
}

export async function rechazarPago(pagoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [pago] = filas<any>(await db.execute(sql`SELECT * FROM festStandPagos WHERE id = ${pagoId} LIMIT 1`));
  if (!pago) throw new Error("Pago no encontrado");
  if (pago.estado === "aprobado") throw new Error("Ese pago ya fue aprobado");
  await db.execute(sql`UPDATE festStandPagos SET estado = 'rechazado', revisadoEn = NOW() WHERE id = ${pagoId}`);
  // Si la solicitud no tenía nada confirmado, queda rechazada
  const [r] = filas<any>(await db.execute(sql`SELECT * FROM festStandReservas WHERE id = ${pago.reservaId}`));
  if (r && r.estado === "pendiente" && Number(r.pagado) === 0) {
    await db.execute(sql`UPDATE festStandReservas SET estado = 'rechazada' WHERE id = ${r.id}`);
  }
  avisarCambio();
  return { ok: true };
}

/**
 * Venta registrada por el admin o un agente: para quien ya pagó (por ejemplo
 * en efectivo). Crea la reserva y aprueba el pago en un paso: la mesa queda
 * tomada al instante si sigue libre.
 */
export async function ventaDirecta(d: {
  standId: number; negocio: string; contacto: string; email?: string; whatsapp?: string;
  monto: number; metodo: string; referencia?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [stand] = filas<{ id: number; numero: string; tipo: TipoStand; estado: string }>(
    await db.execute(sql`SELECT id, numero, tipo, estado FROM festStands WHERE id = ${d.standId} LIMIT 1`),
  );
  if (!stand) throw new Error("Ese stand no existe");
  if (stand.estado !== "libre") throw new Error(`El stand ${stand.numero} no está libre`);
  const t = TIPOS_STAND[stand.tipo];
  const modalidad = d.monto + 0.009 >= t.precio ? "completo" : "abono";
  const res = await db.execute(sql`INSERT INTO festStandReservas
    (standId, tipo, precio, negocio, contacto, email, whatsapp, modalidad, notas)
    VALUES (${stand.id}, ${stand.tipo}, ${t.precio}, ${d.negocio}, ${d.contacto}, ${d.email ?? ""}, ${d.whatsapp ?? ""}, ${modalidad}, ${"Venta registrada en el admin"})`);
  const reservaId = Number((res as any)?.[0]?.insertId);
  const p = await db.execute(sql`INSERT INTO festStandPagos (reservaId, monto, metodo, referencia) VALUES (${reservaId}, ${d.monto}, ${d.metodo}, ${d.referencia ?? ""})`);
  const pagoId = Number((p as any)?.[0]?.insertId);
  return aprobarPago(pagoId);
}

/** El admin registra un pago recibido (abono siguiente o el resto) */
export async function registrarPagoAdmin(reservaId: number, monto: number, metodo: string, referencia: string) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const res = await db.execute(sql`INSERT INTO festStandPagos (reservaId, monto, metodo, referencia) VALUES (${reservaId}, ${monto}, ${metodo}, ${referencia})`);
  const pagoId = Number((res as any)?.[0]?.insertId);
  return aprobarPago(pagoId);
}

/** Cambiar la mesa de una solicitud (si la que pidió ya la tomó otro) */
export async function cambiarMesa(reservaId: number, standId: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [r] = filas<any>(await db.execute(sql`SELECT * FROM festStandReservas WHERE id = ${reservaId}`));
  if (!r) throw new Error("Solicitud no encontrada");
  const [nueva] = filas<any>(await db.execute(sql`SELECT * FROM festStands WHERE id = ${standId}`));
  if (!nueva) throw new Error("Mesa no encontrada");
  if (nueva.estado !== "libre") throw new Error(`La mesa ${nueva.numero} no está libre`);
  if (r.estado === "apartado" || r.estado === "pagado") {
    // Mueve la mesa tomada: toma la nueva (si sigue libre) y libera la anterior
    const [res] = await db.execute(sql`UPDATE festStands SET estado = ${r.estado}, reservaId = ${r.id} WHERE id = ${standId} AND estado = 'libre'`) as any;
    if (!res?.affectedRows) throw new Error(`La mesa ${nueva.numero} acaba de ocuparse`);
    await db.execute(sql`UPDATE festStands SET estado = 'libre', reservaId = NULL WHERE id = ${r.standId} AND reservaId = ${r.id}`);
  }
  // El precio sigue al tipo de la mesa nueva
  const precio = TIPOS_STAND[nueva.tipo as TipoStand]?.precio ?? Number(r.precio);
  await db.execute(sql`UPDATE festStandReservas SET standId = ${standId}, tipo = ${nueva.tipo}, precio = ${precio} WHERE id = ${reservaId}`);
  avisarCambio();
  sincronizarTiendas();
  return { ok: true };
}

/** Anular una reserva: libera la mesa (lo pagado queda registrado) */
export async function anularReserva(reservaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db.execute(sql`UPDATE festStands SET estado = 'libre', reservaId = NULL WHERE reservaId = ${reservaId}`);
  await db.execute(sql`UPDATE festStandReservas SET estado = 'rechazada' WHERE id = ${reservaId}`);
  await db.execute(sql`UPDATE festStandPagos SET estado = 'rechazado', revisadoEn = NOW() WHERE reservaId = ${reservaId} AND estado = 'pendiente'`);
  avisarCambio();
  sincronizarTiendas();
  return { ok: true };
}

/** Ubicar una mesa en el plano (x, y en % del plano) o quitarla */
export async function ubicarStand(standId: number, x: number | null, y: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db.execute(sql`UPDATE festStands SET x = ${x}, y = ${y} WHERE id = ${standId}`);
  avisarCambio();
  return { ok: true };
}

/** Bloquear una mesa (para uso interno) o volverla a poner a la venta */
export async function bloquearStand(standId: number, bloquear: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  if (bloquear) await db.execute(sql`UPDATE festStands SET estado = 'bloqueado' WHERE id = ${standId} AND estado = 'libre'`);
  else await db.execute(sql`UPDATE festStands SET estado = 'libre' WHERE id = ${standId} AND estado = 'bloqueado'`);
  avisarCambio();
  return { ok: true };
}
