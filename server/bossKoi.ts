import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { io } from "./_core/socket";

/**
 * Koi-sama: el jefe de la batalla EN VIVO del Fest.
 *
 * A diferencia del Guardián del Portal (un ataque al día), aquí todos golpean
 * a la vez y sin tope: cientos de personas tocando al mismo tiempo, con
 * combos que multiplican el daño. La vida baja en vivo para todos.
 *
 * Para pelear hay que estar registrado (cuenta + unirse a la batalla): así
 * el GOLPE FINAL queda a nombre de una sola persona, que es la ganadora.
 *
 * La pelea vive en memoria (un solo proceso) para aguantar el ritmo, y se va
 * guardando en la base cada poco. El golpe final se decide aquí mismo, en un
 * único hilo: no puede haber dos ganadores.
 */
export type EstadoBoss = "espera" | "activo" | "derrotado";
type Jugador = { userId: number; nombre: string; golpes: number; danio: number; racha: number; ultimo: number; fichas: number; sucio: boolean };

/** Combos: golpes seguidos sin parar más de PAUSA_COMBO_MS */
export const NIVELES_COMBO = [
  { desde: 100, x: 4 },
  { desde: 50, x: 3 },
  { desde: 25, x: 2 },
  { desde: 10, x: 1.5 },
] as const;
const PAUSA_COMBO_MS = 1500;
/** Ritmo humano máximo: ~16 toques por segundo (dos dedos), con una pequeña reserva */
const TOQUES_POR_SEG = 16;
const RESERVA_TOQUES = 28;
export const VIDA_POR_DEFECTO = 20_000;
/** La vida con la que nació el jefe antes de fijarla en 5.000: nadie la eligió */
const VIDA_ANTERIOR = 300_000;

const boss = { id: 0, vidaMax: VIDA_POR_DEFECTO, danio: 0, estado: "espera" as EstadoBoss, ganadorId: null as number | null, ganadorNombre: null as string | null, iniciadoEn: null as Date | null, derrotadoEn: null as Date | null };
const jugadores = new Map<number, Jugador>();
let listo = false;
let cambio = false;      // hay algo nuevo que emitir
let porGuardar = false;  // hay algo nuevo que guardar
let topCache: { nombre: string; danio: number; golpes: number }[] = [];

const filas = <T,>(r: unknown) => ((r as any)?.[0] ?? []) as T[];
export const multiplicador = (racha: number) => NIVELES_COMBO.find(n => racha >= n.desde)?.x ?? 1;

export async function asegurarBossKoi() {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS festBoss (
      id int AUTO_INCREMENT PRIMARY KEY,
      clave varchar(30) NOT NULL,
      vidaMax int NOT NULL,
      danio int NOT NULL DEFAULT 0,
      estado varchar(20) NOT NULL DEFAULT 'espera',
      ganadorUserId int NULL,
      ganadorNombre varchar(60) NULL,
      iniciadoEn timestamp NULL,
      derrotadoEn timestamp NULL,
      creadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_boss_clave (clave)
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS festBossGolpes (
      bossId int NOT NULL,
      userId int NOT NULL,
      nombre varchar(60) NOT NULL,
      golpes int NOT NULL DEFAULT 0,
      danio int NOT NULL DEFAULT 0,
      PRIMARY KEY (bossId, userId)
    )`);
    await cargar();
    if (!temporizadores) {
      temporizadores = true;
      setInterval(emitir, 200).unref?.();
      setInterval(() => { void guardar(); }, 2000).unref?.();
    }
  } catch (e) { console.error("[Koi] preparación:", e); }
}
let temporizadores = false;

async function cargar() {
  const db = await getDb();
  if (!db) return;
  let [b] = filas<any>(await db.execute(sql`SELECT * FROM festBoss WHERE clave = 'koi' ORDER BY id DESC LIMIT 1`));
  if (!b) {
    await db.execute(sql`INSERT INTO festBoss (clave, vidaMax) VALUES ('koi', ${VIDA_POR_DEFECTO})`);
    [b] = filas<any>(await db.execute(sql`SELECT * FROM festBoss WHERE clave = 'koi' ORDER BY id DESC LIMIT 1`));
  }
  // Una batalla sin terminar que sigue con la vida de fábrica anterior pasa a
  // la nueva y vuelve a empezar (solo tenía golpes de prueba)
  if (Number(b.vidaMax) === VIDA_ANTERIOR && b.estado !== "derrotado") {
    await db.execute(sql`UPDATE festBoss SET vidaMax = ${VIDA_POR_DEFECTO}, danio = 0, estado = 'espera', iniciadoEn = NULL WHERE id = ${b.id}`);
    await db.execute(sql`UPDATE festBossGolpes SET golpes = 0, danio = 0 WHERE bossId = ${b.id}`);
    [b] = filas<any>(await db.execute(sql`SELECT * FROM festBoss WHERE id = ${b.id}`));
  }
  // Y la que seguía con los 5.000 de antes sube a la vida actual, sin perder
  // los golpes que ya lleve
  if (Number(b.vidaMax) === 5_000 && b.estado !== "derrotado") {
    await db.execute(sql`UPDATE festBoss SET vidaMax = ${VIDA_POR_DEFECTO} WHERE id = ${b.id}`);
    [b] = filas<any>(await db.execute(sql`SELECT * FROM festBoss WHERE id = ${b.id}`));
  }
  Object.assign(boss, { id: Number(b.id), vidaMax: Number(b.vidaMax), danio: Number(b.danio), estado: b.estado as EstadoBoss, ganadorId: b.ganadorUserId ? Number(b.ganadorUserId) : null, ganadorNombre: b.ganadorNombre ?? null, iniciadoEn: b.iniciadoEn ?? null, derrotadoEn: b.derrotadoEn ?? null });
  jugadores.clear();
  for (const g of filas<any>(await db.execute(sql`SELECT * FROM festBossGolpes WHERE bossId = ${boss.id}`))) {
    jugadores.set(Number(g.userId), { userId: Number(g.userId), nombre: g.nombre, golpes: Number(g.golpes), danio: Number(g.danio), racha: 0, ultimo: 0, fichas: RESERVA_TOQUES, sucio: false });
  }
  recalcularTop();
  listo = true;
}

function recalcularTop() {
  topCache = Array.from(jugadores.values()).filter(j => j.danio > 0).sort((a, b) => b.danio - a.danio).slice(0, 10)
    .map(j => ({ nombre: j.nombre, danio: j.danio, golpes: j.golpes }));
}

export function estadoPublico() {
  return {
    listo,
    estado: boss.estado,
    vidaMax: boss.vidaMax,
    vida: Math.max(0, boss.vidaMax - boss.danio),
    jugadores: jugadores.size,
    ganador: boss.estado === "derrotado" ? boss.ganadorNombre : null,
    top: topCache,
  };
}
export function miEstado(userId?: number) {
  const j = userId ? jugadores.get(userId) : undefined;
  return j ? { registrado: true, nombre: j.nombre, golpes: j.golpes, danio: j.danio, gane: boss.estado === "derrotado" && boss.ganadorId === userId } : { registrado: false, nombre: "", golpes: 0, danio: 0, gane: false };
}

let ultimoTop = 0;
function emitir() {
  if (!cambio || !io) return;
  cambio = false;
  if (Date.now() - ultimoTop > 1000) { recalcularTop(); ultimoTop = Date.now(); }
  io.to("koi").emit("koi:estado", estadoPublico());
}

async function guardar() {
  if (!porGuardar) return;
  porGuardar = false;
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`UPDATE festBoss SET danio = ${Math.min(boss.danio, boss.vidaMax)} WHERE id = ${boss.id}`);
    const sucios = Array.from(jugadores.values()).filter(j => j.sucio);
    for (const j of sucios) j.sucio = false;
    for (let i = 0; i < sucios.length; i += 100) {
      const lote = sucios.slice(i, i + 100);
      const valores = sql.join(lote.map(j => sql`(${boss.id}, ${j.userId}, ${j.nombre}, ${j.golpes}, ${j.danio})`), sql`, `);
      await db.execute(sql`INSERT INTO festBossGolpes (bossId, userId, nombre, golpes, danio) VALUES ${valores}
        ON DUPLICATE KEY UPDATE golpes = VALUES(golpes), danio = VALUES(danio), nombre = VALUES(nombre)`);
    }
  } catch (e) { porGuardar = true; console.error("[Koi] guardar:", e); }
}

/** Nombre de cazador: corto y limpio (se muestra en pantalla grande) */
export function limpiarNombre(v: string) {
  return String(v ?? "").replace(/[<>&"'`\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 22);
}

/** Registrarse en la batalla: requisito para que los golpes cuenten */
export async function unirse(userId: number, nombre: string) {
  if (!listo) await cargar();
  const limpio = limpiarNombre(nombre);
  if (limpio.length < 2) throw new Error("Escribe tu nombre de cazador (mínimo 2 letras)");
  const ya = jugadores.get(userId);
  if (ya) {
    // El nombre se puede corregir solo antes de que empiece la pelea
    if (boss.estado === "espera" && ya.nombre !== limpio) { ya.nombre = limpio; ya.sucio = true; porGuardar = true; }
    return miEstado(userId);
  }
  if (boss.estado === "derrotado") throw new Error("Esta batalla ya terminó");
  jugadores.set(userId, { userId, nombre: limpio, golpes: 0, danio: 0, racha: 0, ultimo: 0, fichas: RESERVA_TOQUES, sucio: true });
  porGuardar = true; cambio = true;
  const db = await getDb();
  await db?.execute(sql`INSERT IGNORE INTO festBossGolpes (bossId, userId, nombre) VALUES (${boss.id}, ${userId}, ${limpio})`);
  return miEstado(userId);
}

/**
 * Un lote de toques de un jugador. Devuelve lo que contó de verdad.
 * Todo ocurre de corrido, sin esperas: el golpe que deja la vida en cero es
 * uno solo, y su autor es el ganador.
 */
export function golpear(userId: number, toques: number) {
  if (!listo || boss.estado !== "activo") return { ok: false as const, estado: boss.estado };
  const j = jugadores.get(userId);
  if (!j) return { ok: false as const, estado: boss.estado, sinRegistro: true };
  const ahora = Date.now();
  // Ritmo humano: fichas que se recargan con el tiempo
  if (j.ultimo) j.fichas = Math.min(RESERVA_TOQUES, j.fichas + ((ahora - j.ultimo) / 1000) * TOQUES_POR_SEG);
  const n = Math.max(0, Math.min(Math.floor(toques), Math.floor(j.fichas)));
  if (j.ultimo && ahora - j.ultimo > PAUSA_COMBO_MS) j.racha = 0;
  j.ultimo = ahora;
  if (n <= 0) return { ok: true as const, contados: 0, danio: 0, racha: j.racha, x: multiplicador(j.racha), estado: boss.estado };
  j.fichas -= n;
  j.racha += n;
  const x = multiplicador(j.racha);
  const danio = Math.round(n * x);
  j.golpes += n; j.danio += danio; j.sucio = true;
  boss.danio += danio;
  cambio = true; porGuardar = true;

  if (boss.danio >= boss.vidaMax) {
    // GOLPE FINAL: uno solo
    boss.danio = boss.vidaMax;
    boss.estado = "derrotado";
    boss.ganadorId = userId;
    boss.ganadorNombre = j.nombre;
    boss.derrotadoEn = new Date();
    recalcularTop();
    void cerrar(userId, j.nombre);
    try { io?.to("koi").emit("koi:estado", estadoPublico()); io?.to("koi").emit("koi:fin", { ganador: j.nombre, top: topCache }); } catch { /* */ }
    return { ok: true as const, contados: n, danio, racha: j.racha, x, estado: boss.estado, golpeFinal: true };
  }
  return { ok: true as const, contados: n, danio, racha: j.racha, x, estado: boss.estado };
}

async function cerrar(userId: number, nombre: string) {
  const db = await getDb();
  try {
    // Solo se escribe si nadie quedó antes como ganador
    await db?.execute(sql`UPDATE festBoss SET estado = 'derrotado', danio = vidaMax, ganadorUserId = ${userId}, ganadorNombre = ${nombre}, derrotadoEn = NOW()
      WHERE id = ${boss.id} AND ganadorUserId IS NULL`);
    porGuardar = true;
    await guardar();
    console.log(`[Koi] derrotado. Golpe final: ${nombre} (usuario ${userId})`);
    try {
      const { insertAdminNotification } = await import("./db");
      await insertAdminNotification({ type: "new_order", title: "Koi-sama fue derrotado", body: `Golpe final: ${nombre}` });
    } catch { /* */ }
  } catch (e) { console.error("[Koi] cierre:", e); }
}

// ─── Administrador ───────────────────────────────────────────────────────────
export async function configurar(vidaMax: number) {
  if (boss.estado !== "espera") throw new Error("La vida solo se cambia antes de empezar. Reinicia la batalla primero.");
  boss.vidaMax = vidaMax;
  const db = await getDb();
  await db?.execute(sql`UPDATE festBoss SET vidaMax = ${vidaMax} WHERE id = ${boss.id}`);
  cambio = true;
  return estadoPublico();
}

export async function iniciar() {
  if (boss.estado === "activo") return estadoPublico();
  if (boss.estado === "derrotado") throw new Error("Esta batalla ya terminó. Reiníciala para jugar otra.");
  boss.estado = "activo"; boss.iniciadoEn = new Date();
  jugadores.forEach(j => { j.racha = 0; j.ultimo = 0; j.fichas = RESERVA_TOQUES; });
  const db = await getDb();
  await db?.execute(sql`UPDATE festBoss SET estado = 'activo', iniciadoEn = NOW() WHERE id = ${boss.id}`);
  try { io?.to("koi").emit("koi:inicio", {}); io?.to("koi").emit("koi:estado", estadoPublico()); } catch { /* */ }
  return estadoPublico();
}

export async function pausar() {
  if (boss.estado !== "activo") return estadoPublico();
  boss.estado = "espera";
  const db = await getDb();
  await db?.execute(sql`UPDATE festBoss SET estado = 'espera' WHERE id = ${boss.id}`);
  await guardar();
  try { io?.to("koi").emit("koi:estado", estadoPublico()); } catch { /* */ }
  return estadoPublico();
}

/** Batalla nueva: vida llena y marcadores en cero. Los registrados siguen registrados. */
export async function reiniciar(vidaMax?: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await guardar();
  const vida = vidaMax ?? boss.vidaMax;
  await db.execute(sql`INSERT INTO festBoss (clave, vidaMax) VALUES ('koi', ${vida})`);
  const [b] = filas<any>(await db.execute(sql`SELECT id FROM festBoss WHERE clave = 'koi' ORDER BY id DESC LIMIT 1`));
  const anteriores = Array.from(jugadores.values());
  Object.assign(boss, { id: Number(b.id), vidaMax: vida, danio: 0, estado: "espera" as EstadoBoss, ganadorId: null, ganadorNombre: null, iniciadoEn: null, derrotadoEn: null });
  jugadores.clear();
  for (const j of anteriores) jugadores.set(j.userId, { ...j, golpes: 0, danio: 0, racha: 0, ultimo: 0, fichas: RESERVA_TOQUES, sucio: true });
  porGuardar = true;
  await guardar();
  recalcularTop();
  try { io?.to("koi").emit("koi:reinicio", {}); io?.to("koi").emit("koi:estado", estadoPublico()); } catch { /* */ }
  return estadoPublico();
}

/** Para el admin: quién dio el golpe final y la tabla completa */
export async function resultado() {
  const lista = Array.from(jugadores.values()).sort((a, b) => b.danio - a.danio).slice(0, 50)
    .map(j => ({ userId: j.userId, nombre: j.nombre, golpes: j.golpes, danio: j.danio }));
  let ganador: { nombre: string; email: string | null; telefono: string | null } | null = null;
  if (boss.ganadorId) {
    const db = await getDb();
    const [u] = filas<any>(await db?.execute(sql`SELECT name, email FROM users WHERE id = ${boss.ganadorId} LIMIT 1`));
    ganador = { nombre: boss.ganadorNombre ?? u?.name ?? "", email: u?.email ?? null, telefono: null };
  }
  return { ...estadoPublico(), ganadorDatos: ganador, tabla: lista };
}


// ── Visualizadores: cuentas que solo miran la batalla (pantalla de transmisión) ──
// Se guardan como huella del correo, no el correo: el código puede ser público.
const VISORES = new Set(["dde588809eb5af04535014b431493e66a7c716bd15dfd833966264b242d2c7a4"]);
/** ¿Esta cuenta solo puede mirar? También vale la lista del ajuste «koi_visores» (correos separados por comas) */
export async function esVisor(email?: string | null): Promise<boolean> {
  const correo = String(email ?? "").trim().toLowerCase();
  if (!correo) return false;
  const { createHash } = await import("crypto");
  if (VISORES.has(createHash("sha256").update(correo).digest("hex"))) return true;
  try {
    const { getSetting } = await import("./db");
    const lista = (await getSetting("koi_visores")) ?? "";
    return lista.toLowerCase().split(/[\s,;]+/).filter(Boolean).includes(correo);
  } catch { return false; }
}
