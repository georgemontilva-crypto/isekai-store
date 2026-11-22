import crypto from "crypto";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users, wfRaid, wfRaidAtaques } from "../drizzle/schema";
import { io } from "./_core/socket";
import { ENV } from "./_core/env";
import { revisarDescanso } from "./raidDescansos";
import { VIDA_CAZADOR, VIDA_POR_GOLPE, REPOSICION_MS, cobrarGolpes, golpesQueAguanta, reponerTodas, vidaDe } from "./raidVidas";
import { alPrimerGolpe, estadoInvitacion, multiplicadorInvitacion, type EstadoInvitacion } from "./raidInvitaciones";

/**
 * Raid comunitario de la landing del World Fest.
 *
 * Todos los visitantes golpean al mismo jefe. Cada uno ataca una vez al día
 * durante una ronda corta en su teléfono; al terminar se envía el total.
 * Cuando la vida llega a cero queda derrotado y la página muestra la
 * recompensa.
 *
 * Contra trampas: tope de golpes por ronda, un ataque por clave y día, y un
 * máximo de ataques por IP y día (holgado, para que una familia o una
 * oficina con la misma red puedan jugar).
 */

/** Tope realista: 10 segundos a ~13 toques por segundo */
export const GOLPES_MAX = 130;
/** Desde que un cazador lleva estos ataques válidos, su daño se duplica */
export const ATAQUES_VETERANO = 4;
const MULTIPLICADOR_VETERANO = 2;

/** Ataques por IP y día */
const ATAQUES_POR_IP = 12;

/**
 * Días sin límite (fecha de Venezuela, AAAA-MM-DD): ese día no hay tope de
 * ataques por cazador ni por red, y tampoco hay tiempo de ronda: se golpea
 * sin parar, sin tope de golpes, y el navegador los va mandando por tandas.
 * Sigue haciendo falta cuenta y sigue activo el detector de auto clicker.
 * Para que nadie mande golpes que no dio, cada cazador tiene una sola
 * cadena de tickets y cada tanda no puede traer más golpes de los que caben
 * en el tiempo que pasó. Termina solo a la medianoche.
 */
const DIAS_SIN_LIMITE = ["2026-11-22"];
export function sinLimiteHoy(): boolean {
  return DIAS_SIN_LIMITE.includes(diaVenezuela());
}

/** Día actual en Venezuela (AAAA-MM-DD): el reinicio es a medianoche local */
function diaVenezuela(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Fecha alterna de un jefe (10 caracteres, p. ej. «r2.11-22»). Solo se usa el
 * día en que se reinicia al jefe, para quien ya había atacado al anterior:
 * así su ataque al jefe nuevo no choca con la regla de una fila por día.
 */
function diaAlterno(raidId: number, hoy: string): string {
  return `r${raidId}.${hoy.slice(5)}`.slice(0, 10);
}

async function raidActivo() {
  const db = await getDb();
  if (!db) return null;
  // Solo las columnas que el juego necesita: así el jefe se sigue viendo
  // aunque falte alguna columna nueva (por ejemplo, migración pendiente)
  const [r] = await db
    .select({
      id: wfRaid.id,
      vidaMax: wfRaid.vidaMax,
      danio: wfRaid.danio,
      activo: wfRaid.activo,
      derrotadoEn: wfRaid.derrotadoEn,
    })
    .from(wfRaid)
    .where(eq(wfRaid.activo, true))
    .orderBy(desc(wfRaid.id))
    .limit(1);
  return r ?? null;
}

export type EstadoRaid =
  | { activo: false }
  | {
      activo: true;
      vidaMax: number;
      vida: number;
      derrotado: boolean;
      cazadores: number;
      /** Hoy no hay límite de ataques (día especial) */
      sinLimite: boolean;
      /** Si esta clave ya atacó hoy */
      yaAtaco: boolean;
      /** Ataques válidos de este cazador en este jefe */
      misAtaques: number;
      /** Por cuánto se multiplica su daño: vale el mayor de sus bonos */
      multiplicador: number;
      /** De dónde sale ese multiplicador */
      motivoX: MotivoX;
      /** Su enlace para invitar y sus bonos por invitación (solo con sesión) */
      invitacion: EstadoInvitacion | null;
      /** Día sin límite: milisegundos de descanso que le faltan (0 si puede atacar) */
      descansoMs: number;
      /** Vida del cazador: el jefe le quita vida por cada golpe que da */
      vidaJugador: number;
      /** Reglas de la vida, iguales para todos */
      vidaReglas: { max: number; porGolpe: number; reposicionMs: number };
      /** Los 10 cazadores con más daño en este jefe, de mayor a menor */
      top: PuestoRaid[];
      /** Nombre con que este cazador sale en la tabla y su daño total */
      miNombre: string;
      miDanio: number;
    };

export type MotivoX = "refuerzo" | "bono" | "veterano" | "";

/**
 * Multiplicador de un cazador: Refuerzo por invitar (x4), bono de bienvenida
 * (x2) o veterano (x2). No se multiplican entre sí: vale el mayor.
 */
function multiplicadorDe(ataques: number, inv: EstadoInvitacion | null): { x: number; motivo: MotivoX } {
  const veterano = ataques >= ATAQUES_VETERANO ? MULTIPLICADOR_VETERANO : 1;
  const porInvitar = inv ? multiplicadorInvitacion(inv) : { x: 1, motivo: "" as const };
  if (porInvitar.x > 1 && porInvitar.x >= veterano) return porInvitar;
  return veterano > 1 ? { x: veterano, motivo: "veterano" } : { x: 1, motivo: "" };
}
function usuarioDeClave(clave: string): number | null {
  const m = /^u(\d+)$/.exec(clave);
  return m ? Number(m[1]) : null;
}

// ─── Tabla de los 10 con más daño ──────────────────────────────────────────
export type PuestoRaid = { nombre: string; danio: number };

/**
 * Nombre que se muestra en público: solo el primer nombre y una inicial.
 * Nunca el correo: si la cuenta no tiene nombre, sale «Cazador» y su número.
 */
export function nombrePublico(nombre: string | null | undefined, id: number): string {
  const limpio = String(nombre ?? "").replace(/\s+/g, " ").trim();
  if (!limpio || limpio.includes("@")) return `Cazador ${id}`;
  const [primero, segundo] = limpio.split(" ");
  return `${primero.slice(0, 18)}${segundo ? ` ${segundo[0].toUpperCase()}.` : ""}`;
}

/** Nombre público de cada clave (`u<id de usuario>`); las demás son anónimas */
async function nombresDeClaves(claves: string[]): Promise<Map<string, string>> {
  const salida = new Map<string, string>();
  const ids = claves.map(c => /^u(\d+)$/.exec(c)?.[1]).filter(Boolean).map(Number);
  const db = await getDb();
  if (db && ids.length) {
    const filas = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids));
    for (const f of filas) salida.set(`u${f.id}`, nombrePublico(f.name, f.id));
    // Quien eligió un nombre de cazador para Koi-sama sale con ese nombre
    try {
      const res: any = await db.execute(sql`SELECT userId, nombre FROM festBossGolpes WHERE userId IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)}) ORDER BY bossId`);
      const lista: any[] = Array.isArray(res?.[0]) ? res[0] : Array.isArray(res) ? res : res?.rows ?? [];
      for (const g of lista) if (g?.nombre) salida.set(`u${Number(g.userId)}`, String(g.nombre));
    } catch { /* la tabla de Koi-sama aún no existe: se usa el nombre de la cuenta */ }
  }
  for (const c of claves) if (!salida.has(c)) salida.set(c, "Cazador anónimo");
  return salida;
}

/** Se recalcula como mucho cada 15 s, y al momento cuando alguien ataca */
const TOP_VIGENCIA_MS = 15_000;
let topGuardado: { raidId: number; hasta: number; top: PuestoRaid[] } | null = null;

async function topRaid(raidId: number): Promise<PuestoRaid[]> {
  if (topGuardado && topGuardado.raidId === raidId && topGuardado.hasta > Date.now()) return topGuardado.top;
  const db = await getDb();
  if (!db) return [];
  const filas = await db
    .select({ clave: wfRaidAtaques.clave, total: sql<number>`SUM(${wfRaidAtaques.golpes})` })
    .from(wfRaidAtaques)
    .where(and(eq(wfRaidAtaques.raidId, raidId), gt(wfRaidAtaques.golpes, 0)))
    .groupBy(wfRaidAtaques.clave)
    // Con el mismo daño va primero quien lo alcanzó antes
    .orderBy(sql`SUM(${wfRaidAtaques.golpes}) DESC`, sql`MAX(${wfRaidAtaques.id}) ASC`)
    .limit(10);
  const nombres = await nombresDeClaves(filas.map(f => f.clave));
  const top = filas.map(f => ({ nombre: nombres.get(f.clave) ?? "Cazador anónimo", danio: Number(f.total) || 0 }));
  topGuardado = { raidId, hasta: Date.now() + TOP_VIGENCIA_MS, top };
  return top;
}

export async function estadoRaid(clave?: string): Promise<EstadoRaid> {
  try {
    const r = await raidActivo();
    const db = await getDb();
    if (!r || !db) return { activo: false };

    const [{ n }] = await db
      .select({ n: sql<number>`COUNT(DISTINCT ${wfRaidAtaques.clave})` })
      .from(wfRaidAtaques)
      .where(eq(wfRaidAtaques.raidId, r.id));

    // Si la tabla falla, el jefe se sigue viendo: sale sin tabla
    let top: PuestoRaid[] = [];
    try { top = await topRaid(r.id); } catch (e) { console.error("[Raid] top:", e); }

    let yaAtaco = false;
    let misAtaques = 0;
    let miNombre = "";
    let miDanio = 0;
    let invitacion: EstadoInvitacion | null = null;
    let descansoMs = 0;
    let vidaJugador = VIDA_CAZADOR;
    if (clave) {
      const uid = usuarioDeClave(clave);
      if (uid) invitacion = await estadoInvitacion(uid);
      if (uid) { try { vidaJugador = await vidaDe(uid); } catch (e) { console.error("[Raid] vida:", e); } }
      ({ ataques: misAtaques, danio: miDanio } = await resumenDeClave(r.id, clave));
      if (miDanio > 0) {
        try { miNombre = (await nombresDeClaves([clave])).get(clave) ?? ""; } catch { /* sin nombre no se resalta */ }
      }
      const [a] = await db
        .select({ id: wfRaidAtaques.id })
        .from(wfRaidAtaques)
        .where(and(
          eq(wfRaidAtaques.raidId, r.id),
          eq(wfRaidAtaques.clave, clave),
          inArray(wfRaidAtaques.dia, [diaVenezuela(), diaAlterno(r.id, diaVenezuela())]),
        ))
        .limit(1);
      // En un día sin límite siempre puede volver a atacar
      yaAtaco = !!a && !sinLimiteHoy();
      // …salvo que le toque descansar: cada 20.000 de daño, 30 minutos
      if (uid && sinLimiteHoy() && r.danio < r.vidaMax) {
        try { descansoMs = await revisarDescanso(uid, r.id, miDanio); } catch (e) { console.error("[Raid] descanso:", e); }
      }
    }

    return {
      activo: true,
      vidaMax: r.vidaMax,
      vida: Math.max(0, r.vidaMax - r.danio),
      derrotado: r.danio >= r.vidaMax,
      cazadores: Number(n) || 0,
      sinLimite: sinLimiteHoy(),
      yaAtaco,
      misAtaques,
      multiplicador: multiplicadorDe(misAtaques, invitacion).x,
      motivoX: multiplicadorDe(misAtaques, invitacion).motivo,
      invitacion,
      descansoMs,
      vidaJugador,
      vidaReglas: { max: VIDA_CAZADOR, porGolpe: VIDA_POR_GOLPE, reposicionMs: REPOSICION_MS },
      top,
      miNombre,
      miDanio,
    };
  } catch (e) {
    // Si las tablas aún no existen (migración pendiente), el raid no se muestra
    console.error("[Raid] estado:", e);
    return { activo: false };
  }
}

/** «clave» identifica al jugador: `u<id de usuario>` */
/** Ataques que sí sumaron daño (los anulados por trampa quedan con 0) */
async function resumenDeClave(raidId: number, clave: string): Promise<{ ataques: number; danio: number }> {
  const db = await getDb();
  if (!db) return { ataques: 0, danio: 0 };
  const [{ n, total }] = await db
    .select({ n: sql<number>`COUNT(*)`, total: sql<number>`COALESCE(SUM(${wfRaidAtaques.golpes}), 0)` })
    .from(wfRaidAtaques)
    .where(and(eq(wfRaidAtaques.raidId, raidId), eq(wfRaidAtaques.clave, clave), gt(wfRaidAtaques.golpes, 0)));
  return { ataques: Number(n) || 0, danio: Number(total) || 0 };
}
async function ataquesValidos(raidId: number, clave: string): Promise<number> {
  return (await resumenDeClave(raidId, clave)).ataques;
}

// ─── Ticket de ronda ───────────────────────────────────────────────────────
/**
 * Al tocar «Atacar» el servidor entrega un ticket firmado con la hora de
 * inicio. Al enviar el ataque se comprueba que realmente pasaron los 10 s
 * de ronda (más la cuenta 3-2-1) y que el ticket no se usó antes. Así nadie
 * puede mandar «hice 130 golpes» directo al servidor sin jugar.
 */
const RONDA_MIN_MS = 10_500;   // 3-2-1 (≈2 s) + 10 s de ronda, con margen
const RONDA_MAX_MS = 120_000;
const ticketsUsados = new Map<string, number>();

function firmaTicket(userId: number, inicio: number, nonce: string) {
  return crypto.createHmac("sha256", ENV.cookieSecret || "isekai-raid")
    .update(`raid-ronda:${userId}:${inicio}:${nonce}`).digest("hex").slice(0, 32);
}

/** Día sin límite: el último ticket entregado a cada cazador (una sola cadena) */
const ticketVigente = new Map<number, string>();
/**
 * Día sin límite: no hay tope fijo de golpes. Lo único que se comprueba es
 * que quepan en el tiempo que pasó, a un ritmo que ninguna persona alcanza
 * ni con varios dedos.
 */
const TOQUES_POR_SEGUNDO = 40;

export function iniciarRonda(userId: number): { ticket: string } {
  const inicio = Date.now();
  const nonce = crypto.randomBytes(8).toString("hex");
  ticketVigente.set(userId, nonce);
  return { ticket: `${inicio}.${nonce}.${firmaTicket(userId, inicio, nonce)}` };
}

type TicketLeido = { estado: "ok" | "invalido" | "rapido" | "vencido" | "usado"; edad: number };

/**
 * `libre` (día sin límite): no hay tiempo mínimo de ronda, pero el ticket
 * tiene que ser el último que se le entregó a ese cazador.
 */
function validarTicket(userId: number, ticket: string, libre = false): TicketLeido {
  const [ini, nonce, firma] = String(ticket).split(".");
  const inicio = Number(ini);
  if (!inicio || !nonce || !firma || firma.length !== 32) return { estado: "invalido", edad: 0 };
  const esperada = firmaTicket(userId, inicio, nonce);
  if (!crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return { estado: "invalido", edad: 0 };
  const edad = Date.now() - inicio;
  if (!libre && edad < RONDA_MIN_MS) return { estado: "rapido", edad };
  if (edad > RONDA_MAX_MS) return { estado: "vencido", edad };
  if (ticketsUsados.has(nonce)) return { estado: "usado", edad };
  if (libre) {
    const vigente = ticketVigente.get(userId);
    if (vigente && vigente !== nonce) return { estado: "usado", edad };
  }
  ticketsUsados.set(nonce, Date.now());
  // Limpieza de tickets viejos
  ticketsUsados.forEach((t, k) => { if (Date.now() - t > RONDA_MAX_MS * 2) ticketsUsados.delete(k); });
  return { estado: "ok", edad };
}

// ─── Detector de auto clicker ──────────────────────────────────────────────
/**
 * Solo marca lo que una persona no puede hacer, ni con varios dedos ni
 * haciendo clic muy rápido sin mover el ratón. Se mira el patrón de toda la
 * tanda, no un toque suelto, y con menos de 30 golpes no se juzga.
 *  - Demasiado rápido: más del 80 % de los intervalos bajo 20 ms (50 o más
 *    toques por segundo sostenidos). Dos dedos que caen casi a la vez dan
 *    intervalos cortos sueltos, pero nunca tantos.
 *  - Ritmo mecánico: 40 intervalos o más casi idénticos (variación < 4 %).
 *    Una persona, por constante que sea, varía bastante más.
 *  - Mismo punto: todos los toques en el mismo píxel y además con ritmo de
 *    máquina (variación < 6 %). Hacer clic rápido sin mover el ratón no basta.
 *  - Clics generados por programa: al menos la mitad de los golpes.
 *  - Datos incompletos: llegan muchos menos tiempos que golpes.
 */
export type AnalisisToques = { intervalos: number[]; sinteticos: number; posiciones: number };
export const INTERVALO_HUMANO_MS = 20;
/** Tiempos entre toques que el navegador manda como mucho por tanda */
export const MAX_INTERVALOS = 2000;
const MUESTRA_MINIMA = 30;

export function detectarTrampa(golpes: number, a: AnalisisToques): string | null {
  if (golpes < MUESTRA_MINIMA) return null;            // muy pocos toques para juzgar
  if (a.sinteticos >= Math.max(10, golpes * 0.5)) return "clics_sinteticos";
  const iv = a.intervalos.filter(n => Number.isFinite(n) && n >= 0);
  if (iv.length < Math.floor((Math.min(golpes, MAX_INTERVALOS) - 1) * 0.6)) return "datos_incompletos";
  const rapidos = iv.filter(n => n < INTERVALO_HUMANO_MS).length;
  if (rapidos / iv.length > 0.8) return "demasiado_rapido";
  const media = iv.reduce((s, n) => s + n, 0) / iv.length;
  const desvio = Math.sqrt(iv.reduce((s, n) => s + (n - media) ** 2, 0) / iv.length);
  const variacion = media > 0 ? desvio / media : 0;
  if (iv.length >= 40 && variacion < 0.04) return "ritmo_mecanico";
  if (iv.length >= 40 && a.posiciones <= 1 && variacion < 0.06) return "mismo_punto";
  return null;
}

export async function atacarRaid(
  clave: string, golpes: number, ip: string, ref = "",
  extra?: { userId: number; ticket: string; analisis: AnalisisToques },
) {
  const db = await getDb();
  const r = await raidActivo();
  if (!db || !r) throw new TRPCError({ code: "NOT_FOUND", message: "No hay un jefe activo" });
  if (r.danio >= r.vidaMax) return { ok: false as const, motivo: "derrotado" as const };

  const hoy = diaVenezuela();
  const libre = sinLimiteHoy();
  /** Día sin límite: cada respuesta trae el ticket de la tanda siguiente */
  const siguiente = () => (libre && extra ? iniciarRonda(extra.userId).ticket : null);

  // Ronda real: ticket firmado, de un solo uso y (en día normal) con su tiempo mínimo
  let tope = GOLPES_MAX;
  if (extra) {
    const t = validarTicket(extra.userId, extra.ticket, libre);
    if (t.estado !== "ok") return { ok: false as const, motivo: "ticket" as const, ticket: siguiente() };
    // Sin tiempo de ronda, la tanda no puede traer más golpes de los que caben
    // en lo que duró (con 2 s de margen por la red)
    if (libre) tope = Math.ceil((t.edad / 1000 + 2) * TOQUES_POR_SEGUNDO);
  }
  const g = Math.max(0, Math.min(tope, Math.floor(golpes)));

  if (!libre) {
    const [{ n: porIp }] = await db
      .select({ n: sql<number>`COUNT(*)` })
      .from(wfRaidAtaques)
      .where(and(eq(wfRaidAtaques.raidId, r.id), eq(wfRaidAtaques.ip, ip), eq(wfRaidAtaques.dia, hoy)));
    if (Number(porIp) >= ATAQUES_POR_IP) return { ok: false as const, motivo: "limite" as const };
  }

  // Cada cazador tiene una fila por día. En un día sin límite, las tandas
  // siguientes se suman a esa misma fila.
  let dia = hoy;
  const [ya] = await db.select({ id: wfRaidAtaques.id }).from(wfRaidAtaques)
    .where(and(eq(wfRaidAtaques.raidId, r.id), eq(wfRaidAtaques.clave, clave), inArray(wfRaidAtaques.dia, [hoy, diaAlterno(r.id, hoy)]))).limit(1);
  if (!ya) {
    // Hoy ya atacó a un jefe anterior (se reinició): su fila de hoy lleva la fecha alterna
    const [otro] = await db.select({ id: wfRaidAtaques.id }).from(wfRaidAtaques)
      .where(and(eq(wfRaidAtaques.clave, clave), eq(wfRaidAtaques.dia, hoy), sql`${wfRaidAtaques.raidId} <> ${r.id}`)).limit(1);
    if (otro) dia = diaAlterno(r.id, hoy);
  }
  // Un día normal: un ataque por cazador (se comprueba aquí además del índice)
  if (ya && !libre) return { ok: false as const, motivo: "yaAtaco" as const };

  // Auto clicker: el ataque cuenta como el del día, pero con 0 de daño
  const trampa = extra ? detectarTrampa(g, extra.analisis) : null;
  if (trampa && ya) {
    // Día sin límite y ya tiene su fila de hoy: la tanda se descarta
    console.warn(`[Raid] tanda anulada (${trampa}) de ${clave}`);
    return { ok: false as const, motivo: "autoclicker" as const };
  }
  if (trampa) {
    try {
      await db.insert(wfRaidAtaques).values({ raidId: r.id, clave, ip, dia, golpes: 0, motivo: trampa });
    } catch (e: any) {
      const sinColumna = /Unknown column/i.test(String(e?.message ?? e));
      if (!sinColumna) return { ok: false as const, motivo: "yaAtaco" as const };
      // Migración pendiente: se registra igual, sin el motivo
      try { await db.insert(wfRaidAtaques).values({ raidId: r.id, clave, ip, dia, golpes: 0 }); }
      catch { return { ok: false as const, motivo: "yaAtaco" as const }; }
    }
    console.warn(`[Raid] ataque anulado (${trampa}) de ${clave}`);
    return { ok: false as const, motivo: "autoclicker" as const };
  }

  // Bonos: Refuerzo por invitar (x4), bienvenida (x2) o veterano desde el
  // 5.º ataque válido (x2). Vale el mayor.
  const antes = await resumenDeClave(r.id, clave);
  const previos = antes.ataques;
  const uid = usuarioDeClave(clave);

  // Día sin límite: cada 20.000 de daño, 30 minutos de descanso
  if (libre && uid) {
    let falta = 0;
    try { falta = await revisarDescanso(uid, r.id, antes.danio); } catch (e) { console.error("[Raid] descanso:", e); }
    if (falta > 0) return { ok: false as const, motivo: "descanso" as const, descansoMs: falta };
  }

  // El jefe también ataca: cada golpe cuesta vida, y sin vida no se puede atacar
  let golpesValidos = g;
  if (uid) {
    let vida = VIDA_CAZADOR;
    try { vida = await vidaDe(uid); } catch (e) { console.error("[Raid] vida:", e); }
    const aguanta = golpesQueAguanta(vida);
    if (aguanta <= 0) return { ok: false as const, motivo: "sinVida" as const, vida };
    golpesValidos = Math.min(g, aguanta);
  }

  const multiplicador = multiplicadorDe(previos, uid ? await estadoInvitacion(uid) : null).x;
  const danio = golpesValidos * multiplicador;

  if (ya) {
    // Día sin límite: otra tanda del mismo cazador
    await db.execute(sql`UPDATE wfRaidAtaques SET golpes = golpes + ${danio} WHERE id = ${ya.id}`);
  } else {
    try {
      await db.insert(wfRaidAtaques).values({ raidId: r.id, clave, ip, dia, golpes: danio });
    } catch {
      // Índice único: esta clave ya atacó hoy
      return { ok: false as const, motivo: "yaAtaco" as const };
    }
  }

  // Suma atómica, sin pasarse de la vida máxima; marca la derrota una vez
  await db.execute(sql`
    UPDATE wfRaid
    SET danio = LEAST(vidaMax, danio + ${danio}),
        derrotadoEn = IF(derrotadoEn IS NULL AND danio >= vidaMax, NOW(), derrotadoEn)
    WHERE id = ${r.id}
  `);

  // La tabla de los 10 se recalcula con este ataque. En un día sin límite
  // llegan tandas todo el rato: ahí se refresca como mucho cada 5 segundos.
  if (!libre) topGuardado = null;
  else if (topGuardado) topGuardado.hasta = Math.min(topGuardado.hasta, Date.now() + 5_000);

  // El jefe cobra los golpes en vida del cazador
  let vida = VIDA_CAZADOR;
  if (uid) {
    try { vida = await cobrarGolpes(uid, golpesValidos); } catch (e) { console.error("[Raid] vida:", e); }
  }

  // Con esta tanda puede haber llegado a su descanso
  let descansoMs = 0;
  if (libre && uid) {
    try { descansoMs = await revisarDescanso(uid, r.id, antes.danio + danio); } catch (e) { console.error("[Raid] descanso:", e); }
  }

  // Primer golpe válido de un invitado: quien lo invitó gana su Refuerzo
  if (uid && danio > 0) {
    try { await alPrimerGolpe(uid); } catch (e) { console.error("[Raid] premio por invitar:", e); }
  }

  // Tiempo real: todos los que miran la página ven bajar la vida al instante
  try {
    const estado = await estadoRaid();
    if (io && estado.activo) {
      const { yaAtaco: _o1, misAtaques: _o2, multiplicador: _o3, miNombre: _o4, miDanio: _o5, motivoX: _o6, invitacion: _o7, descansoMs: _o8, vidaJugador: _o9, ...publico } = estado;
      io.to("raid").emit("raid:estado", publico);
      // «ref» es una marca aleatoria que manda el navegador que atacó: así no
      // se muestra a sí mismo como «otro cazador». No identifica a nadie.
      io.to("raid").emit("raid:golpe", { golpes: danio, ref });
    }
  } catch (e) {
    console.error("[Raid] aviso en vivo:", e);
  }

  return { ok: true as const, golpes: danio, multiplicador, ticket: descansoMs > 0 ? null : siguiente(), descansoMs, vida };
}

// ─── Administración: ver y reiniciar al jefe ───────────────────────────────
export async function resumenAdminRaid() {
  const db = await getDb();
  const r = await raidActivo();
  if (!db || !r) return null;
  const [{ cazadores, ataques }] = await db
    .select({ cazadores: sql<number>`COUNT(DISTINCT ${wfRaidAtaques.clave})`, ataques: sql<number>`COUNT(*)` })
    .from(wfRaidAtaques).where(eq(wfRaidAtaques.raidId, r.id));
  return {
    id: r.id, vidaMax: r.vidaMax, danio: r.danio, vida: Math.max(0, r.vidaMax - r.danio),
    derrotado: r.danio >= r.vidaMax, cazadores: Number(cazadores) || 0, ataques: Number(ataques) || 0,
    sinLimite: sinLimiteHoy(),
  };
}

/**
 * Reinicia al jefe: el actual se archiva (con todo su historial) y entra uno
 * nuevo con la vida indicada. Como los ataques van por jefe, los contadores
 * de todos quedan en cero: daño, tabla de los 10 y progreso de veterano.
 * También se repone la vida de todos los cazadores y se quitan los descansos.
 */
export async function reiniciarRaid(vidaMax: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sin base de datos" });
  const [anterior] = await db.select({ nombre: wfRaid.nombre }).from(wfRaid).orderBy(desc(wfRaid.id)).limit(1);
  await db.update(wfRaid).set({ activo: false }).where(eq(wfRaid.activo, true));
  await db.insert(wfRaid).values({ nombre: anterior?.nombre ?? "Guardián del Portal", vidaMax, danio: 0, activo: true });
  try { await reponerTodas(); } catch (e) { console.error("[Raid] reponer vidas:", e); }
  try { await db.execute(sql`DELETE FROM wfRaidDescansos`); } catch { /* la tabla aún no existe */ }
  topGuardado = null;
  ticketVigente.clear();
  // Quien tiene la página abierta ve al jefe nuevo al momento
  try {
    const estado = await estadoRaid();
    if (io && estado.activo) {
      const { yaAtaco: _o1, misAtaques: _o2, multiplicador: _o3, miNombre: _o4, miDanio: _o5, motivoX: _o6, invitacion: _o7, descansoMs: _o8, vidaJugador: _o9, ...publico } = estado;
      io.to("raid").emit("raid:estado", publico);
    }
  } catch (e) { console.error("[Raid] aviso de reinicio:", e); }
  console.log(`[Raid] jefe reiniciado con ${vidaMax} de vida`);
  return resumenAdminRaid();
}
