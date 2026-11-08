import { sql } from "drizzle-orm";
import { getDb } from "./db";

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
    incluye: ["Mesa en el Gran Salón", "Punto oficial de venta de boletería", "Recuperas el 60% del valor del stand en ventas de boletos", "Misión en el Level Pass"],
  },
  gran_gremio: {
    nombre: "Gran Gremio", precio: 499, prefijo: "GG", cantidad: 8, color: "#fbbf24",
    incluye: ["Mesa en el Gran Salón, frente al escenario", "Punto oficial de venta de boletería", "Recuperas el 100% del valor del stand + 10% en ventas de boletos", "Misión en el Level Pass"],
  },
};

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
  await db.execute(sql`INSERT INTO festStandPagos (reservaId, monto, metodo, referencia, comprobanteUrl)
    VALUES (${reservaId}, ${monto}, ${d.metodo}, ${d.referencia}, ${d.comprobanteUrl ?? null})`);
  // Aviso al admin (no frena la solicitud si falla)
  try {
    const { insertAdminNotification } = await import("./db");
    await insertAdminNotification({ type: "new_order", title: "Nueva solicitud de stand", body: `${stand.numero} · ${t.nombre} · ${d.negocio} · $${monto} (${d.modalidad === "abono" ? `abono ${ABONO_PCT}%` : "pago completo"})` });
    const { enviarPushAdmins } = await import("./push");
    await enviarPushAdmins({ titulo: `🏪 Stand ${stand.numero} · ${d.negocio}`, cuerpo: `${t.nombre} · reportó $${monto}. Revisa el pago.`, url: "/admin?tab=stands", etiqueta: `stand-${reservaId}` });
  } catch (e) { console.warn("[Stands] aviso al admin:", e); }
  return { ok: true, reservaId, numero: stand.numero, monto, tipo: t.nombre };
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
    const { sendEmail } = await import("./_core/notification");
    const t = TIPOS_STAND[reserva.tipo as TipoStand];
    const saldo = Math.max(0, Number(reserva.precio) - pagado);
    await sendEmail(reserva.email, `Tu stand ${s?.numero} en Isekai World Fest 2027`, `
      <h2>¡Tu stand está ${completo ? "pagado" : "apartado"}!</h2>
      <p>Hola, ${reserva.contacto}. Confirmamos el pago de <strong>$${monto.toFixed(2)}</strong> para <strong>${reserva.negocio}</strong>.</p>
      <p><strong>Stand:</strong> ${s?.numero} · ${t?.nombre ?? reserva.tipo}<br/>
      <strong>Total pagado:</strong> $${pagado.toFixed(2)} de $${Number(reserva.precio).toFixed(2)}<br/>
      ${saldo > 0 ? `<strong>Saldo pendiente:</strong> $${saldo.toFixed(2)}` : "<strong>Pagado por completo.</strong>"}</p>
      <p>Esta mesa es tuya: nadie más puede apartarla.</p>
      <p>Isekai World Fest 2027 · 14 y 15 de agosto · Maracaibo</p>`, `Stand ${s?.numero} ${completo ? "pagado" : "apartado"}`);
  } catch (e) { console.warn("[Stands] correo al cliente:", e); }
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
  return { ok: true };
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
  return { ok: true };
}

/** Anular una reserva: libera la mesa (lo pagado queda registrado) */
export async function anularReserva(reservaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db.execute(sql`UPDATE festStands SET estado = 'libre', reservaId = NULL WHERE reservaId = ${reservaId}`);
  await db.execute(sql`UPDATE festStandReservas SET estado = 'rechazada' WHERE id = ${reservaId}`);
  await db.execute(sql`UPDATE festStandPagos SET estado = 'rechazado', revisadoEn = NOW() WHERE reservaId = ${reservaId} AND estado = 'pendiente'`);
  return { ok: true };
}

/** Ubicar una mesa en el plano (x, y en % del plano) o quitarla */
export async function ubicarStand(standId: number, x: number | null, y: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db.execute(sql`UPDATE festStands SET x = ${x}, y = ${y} WHERE id = ${standId}`);
  return { ok: true };
}

/** Bloquear una mesa (para uso interno) o volverla a poner a la venta */
export async function bloquearStand(standId: number, bloquear: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  if (bloquear) await db.execute(sql`UPDATE festStands SET estado = 'bloqueado' WHERE id = ${standId} AND estado = 'libre'`);
  else await db.execute(sql`UPDATE festStands SET estado = 'libre' WHERE id = ${standId} AND estado = 'bloqueado'`);
  return { ok: true };
}
