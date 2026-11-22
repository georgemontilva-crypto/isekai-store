import crypto from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { ENV } from "./_core/env";

/**
 * Invitaciones del raid: «comparte tu enlace para que más se sumen».
 *
 *  - Quien se une con el enlace de otro cazador ataca con daño x2 durante
 *    24 horas (bono de bienvenida). Solo vale para cuentas nuevas.
 *  - Cuando ese invitado da su primer golpe válido, quien lo invitó gana un
 *    Refuerzo: daño x4 durante 2 días.
 *  - El Refuerzo se acumula hasta 2 veces seguidas (4 días). Al terminar hay
 *    que esperar 7 días para volver a ganarlo.
 *
 * Los bonos no se multiplican entre sí ni con el de veterano: vale el mayor.
 * Las fechas se guardan en milisegundos para no depender de la zona horaria
 * de la base de datos.
 */
const HORA = 3_600_000;
const DIA = 24 * HORA;
export const BONO_INVITADO_MS = 24 * HORA;
export const REFUERZO_MS = 2 * DIA;
export const ESPERA_MS = 7 * DIA;
export const REFUERZOS_SEGUIDOS = 2;
export const X_REFUERZO = 4;
export const X_BONO = 2;
/** La cuenta del invitado tiene que haberse creado en las últimas 24 horas */
const CUENTA_NUEVA_MIN = 24 * 60;

/** Filas de un `db.execute` (el formato cambia según el driver) */
function filas<T = any>(res: any): T[] {
  if (Array.isArray(res?.[0])) return res[0] as T[];
  if (Array.isArray(res)) return res as T[];
  return (res?.rows ?? []) as T[];
}
function afectadas(res: any): number {
  const r = Array.isArray(res) ? res[0] : res;
  return Number(r?.affectedRows ?? r?.rowsAffected ?? 0);
}

// ─── Tablas (se crean solas al primer uso) ─────────────────────────────────
let tablas: Promise<void> | null = null;
function asegurarTablas(): Promise<void> {
  if (!tablas) {
    tablas = (async () => {
      const db = await getDb();
      if (!db) throw new Error("sin base de datos");
      await db.execute(sql`CREATE TABLE IF NOT EXISTS wfRaidInvitados (
        invitadoId int NOT NULL PRIMARY KEY,
        invitadorId int NOT NULL,
        creadoMs bigint NOT NULL,
        bonoHastaMs bigint NOT NULL,
        contadoMs bigint NULL,
        resultado varchar(20) NULL,
        INDEX wfRaidInvitados_invitador (invitadorId)
      )`);
      await db.execute(sql`CREATE TABLE IF NOT EXISTS wfRaidRefuerzos (
        userId int NOT NULL PRIMARY KEY,
        hastaMs bigint NOT NULL,
        acumulados int NOT NULL DEFAULT 1,
        esperaHastaMs bigint NOT NULL
      )`);
    })().catch(e => { tablas = null; throw e; });
  }
  return tablas;
}

// ─── Código del enlace ─────────────────────────────────────────────────────
/** Código corto y fijo de cada usuario: su número en base 36 + 4 letras de firma */
export function codigoDe(userId: number): string {
  const firma = crypto.createHmac("sha256", ENV.cookieSecret || "isekai-raid")
    .update(`raid-inv:${userId}`).digest("hex").slice(0, 4);
  return `${userId.toString(36)}${firma}`;
}
export const FORMATO_CODIGO = /^[a-z0-9]{5,14}$/;
export function usuarioDeCodigo(codigo: string): number | null {
  if (!FORMATO_CODIGO.test(codigo)) return null;
  const id = parseInt(codigo.slice(0, -4), 36);
  if (!Number.isSafeInteger(id) || id <= 0 || codigoDe(id) !== codigo) return null;
  return id;
}

// ─── Unirse con el enlace de otro cazador ──────────────────────────────────
export type ResultadoUnirse =
  | { ok: true; bonoHasta: number }
  | { ok: false; motivo: "codigo" | "propio" | "antiguo" | "yaTenia" };

export async function unirConInvitacion(userId: number, codigo: string): Promise<ResultadoUnirse> {
  const invitadorId = usuarioDeCodigo(codigo);
  if (!invitadorId) return { ok: false, motivo: "codigo" };
  if (invitadorId === userId) return { ok: false, motivo: "propio" };
  await asegurarTablas();
  const db = (await getDb())!;

  const [quien] = filas<{ id: number }>(await db.execute(sql`SELECT id FROM users WHERE id = ${invitadorId}`));
  if (!quien) return { ok: false, motivo: "codigo" };

  // Solo cuentas recién creadas y que aún no han atacado a ningún jefe
  const [yo] = filas<{ minutos: number }>(await db.execute(
    sql`SELECT TIMESTAMPDIFF(MINUTE, createdAt, NOW()) AS minutos FROM users WHERE id = ${userId}`));
  if (!yo || Number(yo.minutos) > CUENTA_NUEVA_MIN) return { ok: false, motivo: "antiguo" };
  const [previos] = filas<{ n: number }>(await db.execute(
    sql`SELECT COUNT(*) AS n FROM wfRaidAtaques WHERE clave = ${`u${userId}`}`));
  if (Number(previos?.n) > 0) return { ok: false, motivo: "antiguo" };

  const ahora = Date.now();
  const bonoHasta = ahora + BONO_INVITADO_MS;
  const res = await db.execute(sql`INSERT IGNORE INTO wfRaidInvitados (invitadoId, invitadorId, creadoMs, bonoHastaMs)
    VALUES (${userId}, ${invitadorId}, ${ahora}, ${bonoHasta})`);
  if (afectadas(res) === 0) return { ok: false, motivo: "yaTenia" };
  return { ok: true, bonoHasta };
}

// ─── Premio a quien invitó: al primer golpe válido del invitado ────────────
export async function alPrimerGolpe(invitadoId: number): Promise<void> {
  await asegurarTablas();
  const db = (await getDb())!;
  const ahora = Date.now();
  // Solo cuenta una vez: la marca se pone en la misma consulta
  const marca = await db.execute(sql`UPDATE wfRaidInvitados SET contadoMs = ${ahora}
    WHERE invitadoId = ${invitadoId} AND contadoMs IS NULL`);
  if (afectadas(marca) === 0) return;
  const [inv] = filas<{ invitadorId: number }>(await db.execute(
    sql`SELECT invitadorId FROM wfRaidInvitados WHERE invitadoId = ${invitadoId}`));
  if (!inv) return;
  const invitadorId = Number(inv.invitadorId);

  const [r] = filas<{ hastaMs: number; acumulados: number; esperaHastaMs: number }>(await db.execute(
    sql`SELECT hastaMs, acumulados, esperaHastaMs FROM wfRaidRefuerzos WHERE userId = ${invitadorId}`));
  let resultado: "refuerzo" | "tope" | "espera";
  if (!r || ahora >= Number(r.esperaHastaMs)) {
    // Refuerzo nuevo: 2 días desde ahora
    const hasta = ahora + REFUERZO_MS;
    await db.execute(sql`INSERT INTO wfRaidRefuerzos (userId, hastaMs, acumulados, esperaHastaMs)
      VALUES (${invitadorId}, ${hasta}, 1, ${hasta + ESPERA_MS})
      ON DUPLICATE KEY UPDATE hastaMs = VALUES(hastaMs), acumulados = 1, esperaHastaMs = VALUES(esperaHastaMs)`);
    resultado = "refuerzo";
  } else if (ahora < Number(r.hastaMs) && Number(r.acumulados) < REFUERZOS_SEGUIDOS) {
    // Segundo seguido: 2 días más sobre el que ya tiene
    const hasta = Number(r.hastaMs) + REFUERZO_MS;
    await db.execute(sql`UPDATE wfRaidRefuerzos SET hastaMs = ${hasta}, acumulados = acumulados + 1, esperaHastaMs = ${hasta + ESPERA_MS}
      WHERE userId = ${invitadorId}`);
    resultado = "refuerzo";
  } else {
    // Ya acumuló el máximo, o está en la semana de espera
    resultado = ahora < Number(r.hastaMs) ? "tope" : "espera";
  }
  await db.execute(sql`UPDATE wfRaidInvitados SET resultado = ${resultado} WHERE invitadoId = ${invitadoId}`);
  console.log(`[Raid] invitación contada: ${invitadoId} → ${invitadorId} (${resultado})`);
}

// ─── Estado de un cazador ──────────────────────────────────────────────────
export type EstadoInvitacion = {
  /** Código de su enlace para invitar */
  codigo: string;
  /** Refuerzo x4 activo: hasta cuándo (0 si no tiene) */
  refuerzoHasta: number;
  /** Cuántos refuerzos seguidos lleva (1 o 2) mientras está activo */
  acumulados: number;
  /** Semana de espera: desde cuándo puede volver a ganarlo (0 si no espera) */
  esperaHasta: number;
  /** Bono de bienvenida x2 activo: hasta cuándo (0 si no tiene) */
  bonoHasta: number;
  /** Cazadores que se unieron con su enlace y ya dieron su primer golpe */
  invitados: number;
};

export async function estadoInvitacion(userId: number): Promise<EstadoInvitacion> {
  const base: EstadoInvitacion = { codigo: codigoDe(userId), refuerzoHasta: 0, acumulados: 0, esperaHasta: 0, bonoHasta: 0, invitados: 0 };
  try {
    await asegurarTablas();
    const db = (await getDb())!;
    const ahora = Date.now();
    const [r] = filas<{ hastaMs: number; acumulados: number; esperaHastaMs: number }>(await db.execute(
      sql`SELECT hastaMs, acumulados, esperaHastaMs FROM wfRaidRefuerzos WHERE userId = ${userId}`));
    if (r) {
      if (ahora < Number(r.hastaMs)) { base.refuerzoHasta = Number(r.hastaMs); base.acumulados = Number(r.acumulados); }
      else if (ahora < Number(r.esperaHastaMs)) base.esperaHasta = Number(r.esperaHastaMs);
    }
    const [b] = filas<{ bonoHastaMs: number }>(await db.execute(
      sql`SELECT bonoHastaMs FROM wfRaidInvitados WHERE invitadoId = ${userId}`));
    if (b && ahora < Number(b.bonoHastaMs)) base.bonoHasta = Number(b.bonoHastaMs);
    const [c] = filas<{ n: number }>(await db.execute(
      sql`SELECT COUNT(*) AS n FROM wfRaidInvitados WHERE invitadorId = ${userId} AND contadoMs IS NOT NULL`));
    base.invitados = Number(c?.n) || 0;
  } catch (e) {
    // Si las tablas fallan, el raid sigue igual: solo no hay bonos
    console.error("[Raid] invitaciones:", e);
  }
  return base;
}

/** Multiplicador por invitaciones: 4 con Refuerzo, 2 con bono de bienvenida, 1 sin nada */
export function multiplicadorInvitacion(e: EstadoInvitacion): { x: number; motivo: "refuerzo" | "bono" | "" } {
  if (e.refuerzoHasta > 0) return { x: X_REFUERZO, motivo: "refuerzo" };
  if (e.bonoHasta > 0) return { x: X_BONO, motivo: "bono" };
  return { x: 1, motivo: "" };
}
