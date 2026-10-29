import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb, getSetting, upsertSetting } from "./db";
import { nanoid } from "nanoid";
import { wfPrensaConfirmaciones } from "../drizzle/schema";
import { io } from "./_core/socket";
import { notifyConfirmacionPrensa } from "./_core/notification";

/**
 * Confirmaciones de asistencia a la rueda de negocios del World Fest.
 *
 * Sin registro: cada navegador guarda una clave anónima y confirma una sola
 * vez. Para que nadie infle el número, una misma red (IP) puede confirmar
 * como mucho 6 veces en 24 horas (holgado para un equipo o una familia).
 */
const MAX_POR_IP_DIA = 6;

export async function estadoConfirmacion(clave?: string): Promise<{ confirmado: boolean; conDatos: boolean }> {
  if (!clave) return { confirmado: false, conDatos: false };
  try {
    const db = await getDb();
    if (!db) return { confirmado: false, conDatos: false };
    const [f] = await db.select({ id: wfPrensaConfirmaciones.id, datosEn: wfPrensaConfirmaciones.datosEn })
      .from(wfPrensaConfirmaciones).where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1);
    return { confirmado: !!f, conDatos: !!f?.datosEn };
  } catch {
    // Si la migración de los datos aún no se corrió, al menos el estado básico
    try {
      const db = await getDb();
      if (!db) return { confirmado: false, conDatos: false };
      const [f] = await db.select({ id: wfPrensaConfirmaciones.id }).from(wfPrensaConfirmaciones)
        .where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1);
      return { confirmado: !!f, conDatos: false };
    } catch {
      return { confirmado: false, conDatos: false };
    }
  }
}

export type DatosPrensa = { tienda: string; email: string; whatsapp: string };

/**
 * La persona que ya confirmó deja el nombre de su tienda, su correo y su
 * WhatsApp. Solo funciona con una clave que ya confirmó (nadie puede crear
 * filas nuevas por aquí) y puede corregir sus datos las veces que quiera.
 */
/** Nombre de tienda comparable: sin mayúsculas, acentos, espacios ni signos */
export function nombreComparable(n: string | null | undefined): string {
  return (n ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(c\.?\s?a\.?|s\.?\s?a\.?|tienda|store)\b/g, "").replace(/[^a-z0-9]/g, "");
}

/**
 * ¿Ya hay otra tienda registrada con ese correo o ese nombre?
 * Pasaba que la misma tienda confirmaba desde dos teléfonos (o volvía días
 * después desde otro navegador) y aparecía dos veces en la lista.
 */
export async function buscarDuplicado(datos: { tienda: string; email?: string | null }, excluirId?: number) {
  const db = await getDb();
  if (!db) return null;
  const correo = (datos.email ?? "").trim().toLowerCase();
  const nombre = nombreComparable(datos.tienda);
  const filas = await db.select({ id: wfPrensaConfirmaciones.id, tienda: wfPrensaConfirmaciones.tienda, email: wfPrensaConfirmaciones.email })
    .from(wfPrensaConfirmaciones).where(sql`${wfPrensaConfirmaciones.datosEn} IS NOT NULL`);
  return filas.find(x => x.id !== excluirId && (
    (correo && (x.email ?? "").trim().toLowerCase() === correo) ||
    (nombre.length >= 3 && nombreComparable(x.tienda) === nombre)
  )) ?? null;
}

export async function completarDatos(clave: string, datos: DatosPrensa, ip = "desconocida"):
  Promise<{ ok: true; yaRegistrado?: boolean } | { ok: false; motivo: "noConfirmado" | "error" | "duplicado" }> {
  const db = await getDb();
  if (!db) return { ok: false, motivo: "error" };
  const [f] = await db.select({ id: wfPrensaConfirmaciones.id, datosEn: wfPrensaConfirmaciones.datosEn })
    .from(wfPrensaConfirmaciones).where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1);
  // Página vieja: como «confirmar» ya no crea la fila, se registra aquí todo junto
  if (!f) {
    const r = await registrarConDatos(clave, ip, datos);
    return r.ok ? r : { ok: false, motivo: "error" };
  }

  // Misma tienda ya registrada: no se duplica. Esta confirmación sobra y se
  // quita, así el conteo tampoco cuenta dos veces a la misma tienda.
  const repetida = await buscarDuplicado({ tienda: datos.tienda, email: datos.email }, f.id).catch(() => null);
  if (repetida) {
    if (f.datosEn) return { ok: false, motivo: "duplicado" };
    await db.delete(wfPrensaConfirmaciones).where(eq(wfPrensaConfirmaciones.id, f.id)).catch(() => {});
    try {
      const conteo = await totalConfirmaciones();
      io?.to("admin").emit("prensa:confirmacion", conteo);
    } catch { /* opcional */ }
    return { ok: true, yaRegistrado: true };
  }
  const primeraVez = !f.datosEn;
  try {
    await db.update(wfPrensaConfirmaciones)
      .set({ tienda: datos.tienda, email: datos.email, whatsapp: datos.whatsapp, datosEn: new Date() })
      .where(eq(wfPrensaConfirmaciones.id, f.id));
  } catch (e) {
    console.warn("[Prensa] guardar datos:", e);
    return { ok: false, motivo: "error" };
  }
  try {
    io?.to("admin").emit("prensa:datos", { id: f.id });
    if (primeraVez) {
      void import("./push").then(m => m.enviarPushAdmins({
        titulo: "🏪 Datos de invitado · rueda de negocios",
        cuerpo: `${datos.tienda} dejó su correo y WhatsApp.`,
        url: "/admin",
        etiqueta: "prensa-datos",
      }));
    }
  } catch { /* aviso opcional */ }
  return { ok: true };
}

export type FilaPrensa = {
  id: number; tienda: string | null; email: string | null; whatsapp: string | null;
  datosEn: Date | null; creadoEn: Date; asistioEn: Date | null; asistioPor: string | null;
};

/**
 * Crea las columnas que falten en la tabla, una sola vez por arranque.
 * Así la asistencia funciona sin que haya que correr SQL a mano.
 */
let columnasListas: Promise<void> | null = null;
export function asegurarColumnas(): Promise<void> {
  if (!columnasListas) {
    columnasListas = (async () => {
      const db = await getDb();
      if (!db) throw new Error("sin base de datos");
      const [filas] = await db.execute(sql`SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wfPrensaConfirmaciones'`) as unknown as [{ c: string }[]];
      const hay = new Set((filas ?? []).map(f => f.c));
      const faltan: [string, string][] = [
        ["tienda", "varchar(150) NULL"], ["email", "varchar(320) NULL"], ["whatsapp", "varchar(30) NULL"],
        ["datosEn", "timestamp NULL"], ["asistioEn", "timestamp NULL"], ["asistioPor", "varchar(150) NULL"],
      ];
      for (const [col, tipo] of faltan) {
        if (!hay.has(col)) {
          await db.execute(sql.raw(`ALTER TABLE wfPrensaConfirmaciones ADD COLUMN \`${col}\` ${tipo}`));
          console.log(`[Prensa] columna creada: ${col}`);
        }
      }
      // Rescate: si alguna fila tiene tienda, correo o WhatsApp pero quedó sin
      // marca de «datos recibidos», se marca para que salga con sus datos
      const [res] = await db.execute(sql`UPDATE wfPrensaConfirmaciones SET datosEn = creadoEn
        WHERE datosEn IS NULL AND (COALESCE(tienda, '') <> '' OR COALESCE(email, '') <> '' OR COALESCE(whatsapp, '') <> '')`) as any;
      if (res?.affectedRows) console.log(`[Prensa] ${res.affectedRows} confirmaciones con datos recuperadas`);
    })().catch(e => { columnasListas = null; throw e; });
  }
  return columnasListas;
}

/** Administradores y staff de la rueda: lista de confirmados, los que dejaron datos primero */
export async function listaConfirmaciones(): Promise<FilaPrensa[]> {
  const db = await getDb();
  if (!db) return [];
  await asegurarColumnas().catch(e => console.warn("[Prensa] columnas:", e));
  return db.select({
    id: wfPrensaConfirmaciones.id,
    tienda: wfPrensaConfirmaciones.tienda,
    email: wfPrensaConfirmaciones.email,
    whatsapp: wfPrensaConfirmaciones.whatsapp,
    datosEn: wfPrensaConfirmaciones.datosEn,
    creadoEn: wfPrensaConfirmaciones.creadoEn,
    asistioEn: wfPrensaConfirmaciones.asistioEn,
    asistioPor: wfPrensaConfirmaciones.asistioPor,
  }).from(wfPrensaConfirmaciones)
    .orderBy(sql`${wfPrensaConfirmaciones.datosEn} IS NULL`, desc(wfPrensaConfirmaciones.datosEn), desc(wfPrensaConfirmaciones.creadoEn))
    .limit(2000);
}

export async function confirmarAsistencia(clave: string, ip: string):
  Promise<{ ok: true; yaEstaba: boolean } | { ok: false; motivo: "limite" | "error" }> {
  const db = await getDb();
  if (!db) return { ok: false, motivo: "error" };
  /**
   * Ya no se guarda nada al tocar «Confirmar»: la asistencia se registra al
   * enviar los datos (ver registrarConDatos). Esta ruta queda solo para los
   * teléfonos que aún tienen la versión vieja de la página abierta: les
   * responde que sí, les muestra el formulario, y sus datos crean la fila.
   */
  if (!SOLO_CON_DATOS) {

  const [ya] = await db.select({ id: wfPrensaConfirmaciones.id }).from(wfPrensaConfirmaciones)
    .where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1);
  if (ya) return { ok: true, yaEstaba: true };

  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(wfPrensaConfirmaciones)
    .where(and(eq(wfPrensaConfirmaciones.ip, ip), gte(wfPrensaConfirmaciones.creadoEn, hace24h)));
  if (Number(n) >= MAX_POR_IP_DIA) return { ok: false, motivo: "limite" };

  try {
    // Solo las dos columnas de siempre: así confirmar sigue funcionando
    // aunque la migración de los datos de contacto todavía no se haya corrido
    await db.execute(sql`INSERT INTO wfPrensaConfirmaciones (clave, ip) VALUES (${clave}, ${ip})`);
  } catch (e) {
    // Dos toques casi simultáneos: la clave ya quedó guardada
    const [otra] = await db.select({ id: wfPrensaConfirmaciones.id }).from(wfPrensaConfirmaciones)
      .where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1).catch(() => []);
    if (otra) return { ok: true, yaEstaba: true };
    console.warn("[Prensa] confirmar:", e);
    return { ok: false, motivo: "error" };
  }

  // Aviso al instante a los administradores conectados, y correo al dueño.
  // No se espera el correo: la persona que confirma no debe esperar por él.
  try {
    const conteo = await totalConfirmaciones();
    io?.to("admin").emit("prensa:confirmacion", conteo);
    void notifyConfirmacionPrensa(conteo.total, conteo.hoy).catch(e => console.warn("[Prensa] correo:", e));
    void import("./push").then(m => m.enviarPushAdmins({
      titulo: "🎟️ Nueva confirmación · rueda de negocios",
      cuerpo: `Ya son ${conteo.total} confirmados (${conteo.hoy} hoy).`,
      url: "/admin",
      etiqueta: "prensa",
    }));
  } catch (e) {
    console.warn("[Prensa] aviso en vivo:", e);
  }
  return { ok: true, yaEstaba: false };
  }
  void ip;
  const [ya] = await db.select({ id: wfPrensaConfirmaciones.id }).from(wfPrensaConfirmaciones)
    .where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1).catch(() => []);
  return { ok: true, yaEstaba: Boolean(ya) };
}
const SOLO_CON_DATOS = true;

/** Solo para administradores: total y confirmaciones de hoy (hora de Venezuela) */
export async function totalConfirmaciones(): Promise<{ total: number; hoy: number }> {
  const db = await getDb();
  if (!db) return { total: 0, hoy: 0 };
  const [f] = await db.select({
    total: sql<number>`COUNT(*)`,
    hoy: sql<number>`SUM(DATE(CONVERT_TZ(${wfPrensaConfirmaciones.creadoEn}, '+00:00', '-04:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-04:00')))`,
  }).from(wfPrensaConfirmaciones);
  return { total: Number(f?.total ?? 0), hoy: Number(f?.hoy ?? 0) };
}

/** Solo administradores: borra una confirmación (pruebas o duplicados) */
export async function borrarConfirmacion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db.delete(wfPrensaConfirmaciones).where(eq(wfPrensaConfirmaciones.id, id));
  try {
    const conteo = await totalConfirmaciones();
    io?.to("admin").emit("prensa:confirmacion", conteo);
  } catch { /* aviso opcional */ }
  return { ok: true };
}


// ─── Asistencia el día de la rueda ───────────────────────────────────────────

/** Marca (o desmarca) que la tienda llegó. «quien» es el nombre del staff */
export async function marcarAsistencia(id: number, asistio: boolean, quien: string) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await asegurarColumnas();
  await db.update(wfPrensaConfirmaciones)
    .set(asistio ? { asistioEn: new Date(), asistioPor: quien.slice(0, 150) } : { asistioEn: null, asistioPor: null })
    .where(eq(wfPrensaConfirmaciones.id, id));
  try { io?.to("admin").emit("prensa:datos", { id }); } catch { /* opcional */ }
  return { ok: true };
}

/** Tienda que llega sin haber confirmado: se agrega ya marcada como presente */
export async function registrarEnPuerta(datos: { tienda: string; email?: string; whatsapp?: string }, quien: string) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await asegurarColumnas();
  const ahora = new Date();
  // Si ya estaba en la lista (confirmó antes), se marca esa en vez de crear otra
  const repetida = await buscarDuplicado({ tienda: datos.tienda, email: datos.email });
  if (repetida) {
    await db.update(wfPrensaConfirmaciones).set({ asistioEn: ahora, asistioPor: quien.slice(0, 150) })
      .where(eq(wfPrensaConfirmaciones.id, repetida.id));
    return { ok: true, yaEstaba: repetida.tienda };
  }
  await db.insert(wfPrensaConfirmaciones).values({
    clave: `puerta${nanoid(20).replace(/[^A-Za-z0-9]/g, "x")}`,
    ip: "puerta",
    tienda: datos.tienda,
    email: datos.email || null,
    whatsapp: datos.whatsapp || null,
    datosEn: ahora,
    asistioEn: ahora,
    asistioPor: quien.slice(0, 150),
  });
  try {
    const conteo = await totalConfirmaciones();
    io?.to("admin").emit("prensa:confirmacion", conteo);
  } catch { /* opcional */ }
  return { ok: true, yaEstaba: null as string | null };
}

// ─── Staff de la rueda: entran solo a la lista y marcan asistencia ───────────

export type StaffRueda = { email: string; nombre: string };
const CLAVE_STAFF = "rn_staff";

export async function listarStaffRueda(): Promise<StaffRueda[]> {
  try {
    const v = await getSetting(CLAVE_STAFF);
    const lista = v ? JSON.parse(v) : [];
    return Array.isArray(lista) ? lista.filter(x => x && typeof x.email === "string") : [];
  } catch {
    return [];
  }
}

export async function agregarStaffRueda(email: string, nombre: string) {
  const correo = email.trim().toLowerCase();
  const lista = await listarStaffRueda();
  if (lista.some(s => s.email === correo)) throw new Error("Esa persona ya está en el staff");
  lista.push({ email: correo, nombre: nombre.trim() || correo.split("@")[0] });
  await upsertSetting(CLAVE_STAFF, JSON.stringify(lista));
  return { ok: true };
}

export async function quitarStaffRueda(email: string) {
  const correo = email.trim().toLowerCase();
  const lista = (await listarStaffRueda()).filter(s => s.email !== correo);
  await upsertSetting(CLAVE_STAFF, JSON.stringify(lista));
  return { ok: true };
}

export async function staffRuedaPorCorreo(email?: string | null): Promise<StaffRueda | null> {
  if (!email) return null;
  const correo = email.trim().toLowerCase();
  return (await listarStaffRueda()).find(s => s.email === correo) ?? null;
}


/**
 * Confirmar y dejar los datos en un solo paso.
 *
 * Antes la confirmación se guardaba al tocar el botón y los datos después: si
 * la persona cerraba la página en medio, quedaba una «confirmación sin datos»
 * y el aviso al admin llegaba sin nombre. Ahora no se guarda nada hasta que
 * envía la tienda, el correo y el WhatsApp juntos.
 */
export async function registrarConDatos(clave: string, ip: string, datos: DatosPrensa):
  Promise<{ ok: true; yaRegistrado?: boolean } | { ok: false; motivo: "limite" | "error" }> {
  const db = await getDb();
  if (!db) return { ok: false, motivo: "error" };
  await asegurarColumnas().catch(e => console.warn("[Prensa] columnas:", e));

  const [propia] = await db.select({ id: wfPrensaConfirmaciones.id, datosEn: wfPrensaConfirmaciones.datosEn })
    .from(wfPrensaConfirmaciones).where(eq(wfPrensaConfirmaciones.clave, clave)).limit(1);
  if (propia?.datosEn) return { ok: true, yaRegistrado: true };

  // Misma tienda ya registrada (por correo o nombre): no se duplica
  const repetida = await buscarDuplicado({ tienda: datos.tienda, email: datos.email }, propia?.id).catch(() => null);
  if (repetida) {
    if (propia) await db.delete(wfPrensaConfirmaciones).where(eq(wfPrensaConfirmaciones.id, propia.id)).catch(() => {});
    return { ok: true, yaRegistrado: true };
  }

  const ahora = new Date();
  try {
    if (propia) {
      // Confirmó con la versión anterior (sin datos): se completa esa misma fila
      await db.update(wfPrensaConfirmaciones)
        .set({ tienda: datos.tienda, email: datos.email, whatsapp: datos.whatsapp, datosEn: ahora })
        .where(eq(wfPrensaConfirmaciones.id, propia.id));
    } else {
      const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(wfPrensaConfirmaciones)
        .where(and(eq(wfPrensaConfirmaciones.ip, ip), gte(wfPrensaConfirmaciones.creadoEn, hace24h)));
      if (Number(n) >= MAX_POR_IP_DIA) return { ok: false, motivo: "limite" };
      await db.insert(wfPrensaConfirmaciones).values({
        clave, ip, tienda: datos.tienda, email: datos.email, whatsapp: datos.whatsapp, datosEn: ahora,
      });
    }
  } catch (e) {
    console.error("[Prensa] registrar:", e);
    return { ok: false, motivo: "error" };
  }

  // Aviso al admin, ahora con el nombre de la tienda
  try {
    const conteo = await totalConfirmaciones();
    io?.to("admin").emit("prensa:confirmacion", { ...conteo, tienda: datos.tienda });
    void notifyConfirmacionPrensa(conteo.total, conteo.hoy, datos).catch(e => console.warn("[Prensa] correo:", e));
    void import("./push").then(m => m.enviarPushAdmins({
      titulo: `🏪 ${datos.tienda} · rueda de negocios`,
      cuerpo: `Confirmó asistencia. Ya son ${conteo.total} tiendas.`,
      url: "/admin",
      etiqueta: "prensa",
    }));
  } catch (e) {
    console.warn("[Prensa] aviso:", e);
  }
  return { ok: true };
}
