import { eq, or } from "drizzle-orm";
import { getDb } from "./db";
import { stores, gateUsers, levelStaff } from "../drizzle/schema";
import { staffRuedaPorCorreo } from "./ruedaPrensa";

/**
 * Permisos del equipo del evento, calculados en el momento por el correo de
 * la cuenta (y por la cuenta vinculada).
 *
 * Antes el permiso dependía del «rol» que quedaba guardado al iniciar sesión:
 * si desactivabas a un portero o borrabas una tienda, esa cuenta seguía
 * entrando porque su rol guardado no cambiaba. Y como el rol es uno solo, una
 * misma persona no podía ser, por ejemplo, portero y personal de EXP.
 *
 * Aquí cada función se decide por separado y siempre con los datos actuales.
 * Se guarda 20 segundos por usuario para no consultar la base en cada escaneo,
 * y se borra al instante cuando el administrador cambia el equipo.
 */
export type Permisos = {
  admin: boolean;
  tienda: { id: number; name: string; active: boolean; puedeOtorgarXp: boolean } | null;
  portero: boolean;
  personalXp: boolean;
  rueda: boolean;
  /** Puede dar EXP: personal activo o tienda activa autorizada */
  xp: boolean;
};

type Usuario = { id: number; email?: string | null; role: string };

const cache = new Map<number, { hasta: number; p: Permisos }>();
const VIGENCIA_MS = 20_000;

export function limpiarPermisos() {
  cache.clear();
}

const TODO: Omit<Permisos, "tienda"> = { admin: true, portero: true, personalXp: true, rueda: true, xp: true };

export async function permisosDe(u: Usuario): Promise<Permisos> {
  const guardado = cache.get(u.id);
  if (guardado && guardado.hasta > Date.now()) return guardado.p;

  const correo = (u.email ?? "").trim().toLowerCase();
  const db = await getDb();
  let p: Permisos = { admin: false, tienda: null, portero: false, personalXp: false, rueda: false, xp: false };

  if (db) {
    const [tiendas, porteros, personal, rueda] = await Promise.all([
      db.select().from(stores).where(correo ? or(eq(stores.userId, u.id), eq(stores.email, correo)) : eq(stores.userId, u.id)).catch(() => []),
      db.select().from(gateUsers).where(correo ? or(eq(gateUsers.userId, u.id), eq(gateUsers.email, correo)) : eq(gateUsers.userId, u.id)).catch(() => []),
      db.select().from(levelStaff).where(correo ? or(eq(levelStaff.userId, u.id), eq(levelStaff.email, correo)) : eq(levelStaff.userId, u.id)).catch(() => []),
      staffRuedaPorCorreo(correo).catch(() => null),
    ]);
    // Si hay varias tiendas con ese correo, manda la activa
    const vigentes = tiendas.filter(x => !x.archivado);
    const t = vigentes.find(x => x.active) ?? vigentes[0];
    p = {
      admin: false,
      tienda: t ? { id: t.id, name: t.name, active: t.active, puedeOtorgarXp: t.puedeOtorgarXp } : null,
      portero: porteros.some(g => g.active),
      personalXp: personal.some(s => s.active),
      rueda: Boolean(rueda),
      xp: false,
    };
    p.xp = p.personalXp || Boolean(p.tienda?.active && p.tienda.puedeOtorgarXp);

    // Se vincula la cuenta a la tienda la primera vez que entra con ese correo
    if (t && !t.userId && correo) {
      await db.update(stores).set({ userId: u.id }).where(eq(stores.id, t.id)).catch(() => {});
    }
    const sinVincular = personal.find(s => !s.userId);
    if (sinVincular && correo) {
      await db.update(levelStaff).set({ userId: u.id }).where(eq(levelStaff.id, sinVincular.id)).catch(() => {});
    }
  }

  if (u.role === "admin") p = { ...p, ...TODO };

  cache.set(u.id, { hasta: Date.now() + VIGENCIA_MS, p });
  return p;
}

/** El rol principal que se guarda en la cuenta (solo informativo) */
export function rolPrincipal(p: Permisos): "admin" | "store" | "gate" | "staff" | "user" {
  if (p.admin) return "admin";
  if (p.tienda) return "store";
  if (p.portero) return "gate";
  if (p.personalXp) return "staff";
  return "user";
}

export function esDelEquipo(p: Permisos) {
  return p.admin || Boolean(p.tienda) || p.portero || p.personalXp || p.rueda;
}
