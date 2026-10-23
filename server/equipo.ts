import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { stores, gateUsers, levelStaff, users } from "../drizzle/schema";
import { crearTienda, crearPortero, editarPortero, borrarPortero, editarTienda, borrarTienda, listarEventos, ordenarEventos } from "./tickets";
import { crearStaff, borrarStaff } from "./levelPass";
import { listarStaffRueda, agregarStaffRueda, quitarStaffRueda } from "./ruedaPrensa";
import { limpiarPermisos } from "./permisos";
import { notifyStoreActivated, notifyStaffActivated } from "./_core/notification";

/**
 * Equipo del evento en un solo lugar.
 *
 * Antes cada función se daba en un rincón distinto del panel (tiendas en
 * Configuración, porteros en Control de acceso, personal de EXP en Level Pass
 * y staff de la rueda en el inicio). Aquí se ve a cada persona una sola vez,
 * por su correo, con todas sus funciones, y se activan o quitan desde la misma
 * ficha.
 */
export type Rol = "tienda" | "portero" | "xp" | "rueda";

export type Persona = {
  email: string;
  nombre: string;
  telefono: string | null;
  tienda: { id: number; nombre: string; activa: boolean; daXp: boolean } | null;
  portero: { id: number; activo: boolean } | null;
  xp: { id: number; activo: boolean; puesto: string | null } | null;
  rueda: boolean;
  /** Última vez que entró con su cuenta (null si nunca) */
  entro: Date | null;
};

export async function listarEquipo(): Promise<Persona[]> {
  const db = await getDb();
  if (!db) return [];
  const [ts, gs, ss, rs] = await Promise.all([
    db.select().from(stores).orderBy(desc(stores.id)),
    db.select().from(gateUsers).orderBy(desc(gateUsers.id)),
    db.select().from(levelStaff).orderBy(desc(levelStaff.id)),
    listarStaffRueda(),
  ]);

  const mapa = new Map<string, Persona>();
  const clave = (email: string | null | undefined, respaldo: string) => (email ?? "").trim().toLowerCase() || respaldo;
  const persona = (k: string, nombre: string): Persona => {
    let p = mapa.get(k);
    if (!p) {
      p = { email: k.includes("@") ? k : "", nombre, telefono: null, tienda: null, portero: null, xp: null, rueda: false, entro: null };
      mapa.set(k, p);
    }
    return p;
  };

  for (const t of ts) {
    const p = persona(clave(t.email, `tienda-${t.id}`), t.contactName || t.name);
    p.tienda = { id: t.id, nombre: t.name, activa: t.active, daXp: t.puedeOtorgarXp };
    p.telefono = p.telefono ?? t.phone ?? null;
  }
  for (const g of gs) {
    const p = persona(clave(g.email, `portero-${g.id}`), g.name);
    p.portero = { id: g.id, activo: g.active };
  }
  for (const s of ss) {
    const p = persona(clave(s.email, `xp-${s.id}`), s.name);
    p.xp = { id: s.id, activo: s.active, puesto: s.puesto ?? null };
  }
  for (const r of rs) {
    const p = persona(clave(r.email, r.email), r.nombre);
    p.rueda = true;
  }

  // Si ya entró alguna vez con su cuenta (para saber si recibió el acceso)
  const correos = Array.from(mapa.values()).map(p => p.email).filter(Boolean);
  if (correos.length) {
    const cuentas = await db.select({ email: users.email, lastSignedIn: users.lastSignedIn, loginMethod: users.loginMethod, openId: users.openId })
      .from(users).where(inArray(users.email, correos));
    for (const c of cuentas) {
      // Las cuentas creadas al autorizar (store_…, gate_…) no cuentan como entrada
      if (/^(store|gate|staff)_/.test(c.openId ?? "")) continue;
      const p = mapa.get((c.email ?? "").toLowerCase());
      if (p && c.lastSignedIn && (!p.entro || c.lastSignedIn > p.entro)) p.entro = c.lastSignedIn;
    }
  }

  return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

async function nombreEvento() {
  try { return ordenarEventos(await listarEventos())[0]?.name; } catch { return undefined; }
}

/**
 * Da o quita una función a una persona. Al darla por primera vez se le
 * manda su correo de acceso. Quitarla desactiva (si ya tiene historial) o
 * borra (si no lo tiene), igual que antes en cada sección.
 */
export async function asignarRol(data: {
  email: string; nombre: string; rol: Rol; activo: boolean;
  telefono?: string; nombreTienda?: string; daXp?: boolean; puesto?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const correo = data.email.trim().toLowerCase();
  const nombre = data.nombre.trim() || correo.split("@")[0];
  const evento = await nombreEvento();

  try {
    if (data.rol === "tienda") {
      const [t] = await db.select().from(stores).where(eq(stores.email, correo)).limit(1);
      if (data.activo) {
        if (t) {
          await editarTienda(t.id, { active: true, ...(data.daXp !== undefined ? { puedeOtorgarXp: data.daXp } : {}) });
        } else {
          await crearTienda({ name: (data.nombreTienda || nombre).trim(), email: correo, contactName: nombre, phone: data.telefono });
          if (data.daXp) {
            const [nueva] = await db.select().from(stores).where(eq(stores.email, correo)).limit(1);
            if (nueva) await editarTienda(nueva.id, { puedeOtorgarXp: true });
          }
          notifyStoreActivated(correo, (data.nombreTienda || nombre).trim(), evento).catch(e => console.warn("[Equipo] correo tienda:", e));
        }
      } else if (t) {
        await borrarTienda(t.id); // si ya vendió, queda desactivada
      }
    }

    if (data.rol === "portero") {
      const [g] = await db.select().from(gateUsers).where(eq(gateUsers.email, correo)).limit(1);
      if (data.activo) {
        if (g) await editarPortero(g.id, { active: true });
        else {
          await crearPortero({ name: nombre, email: correo });
          notifyStaffActivated(correo, nombre, "puerta", evento).catch(e => console.warn("[Equipo] correo portero:", e));
        }
      } else if (g) {
        await borrarPortero(g.id);
      }
    }

    if (data.rol === "xp") {
      const [s] = await db.select().from(levelStaff).where(eq(levelStaff.email, correo)).limit(1);
      if (data.activo) {
        if (s) await db.update(levelStaff).set({ active: true, ...(data.puesto !== undefined ? { puesto: data.puesto } : {}) }).where(eq(levelStaff.id, s.id));
        else {
          await crearStaff({ name: nombre, email: correo, puesto: data.puesto });
          notifyStaffActivated(correo, nombre, "xp", evento).catch(e => console.warn("[Equipo] correo personal:", e));
        }
      } else if (s) {
        await borrarStaff(s.id);
      }
    }

    if (data.rol === "rueda") {
      const ya = (await listarStaffRueda()).some(r => r.email === correo);
      if (data.activo && !ya) await agregarStaffRueda(correo, nombre);
      if (!data.activo && ya) await quitarStaffRueda(correo);
    }
  } finally {
    limpiarPermisos();
  }
  return { ok: true };
}

/** Quita a la persona de todas sus funciones */
export async function quitarDelEquipo(email: string) {
  for (const rol of ["tienda", "portero", "xp", "rueda"] as Rol[]) {
    await asignarRol({ email, nombre: "", rol, activo: false });
  }
  return { ok: true };
}

/** Activa o pausa a la tienda o persona sin perder su registro */
export async function pausarRol(email: string, rol: "tienda" | "portero" | "xp", activo: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const correo = email.trim().toLowerCase();
  if (rol === "tienda") await db.update(stores).set({ active: activo }).where(eq(stores.email, correo));
  if (rol === "portero") await db.update(gateUsers).set({ active: activo }).where(eq(gateUsers.email, correo));
  if (rol === "xp") await db.update(levelStaff).set({ active: activo }).where(eq(levelStaff.email, correo));
  limpiarPermisos();
  return { ok: true };
}
