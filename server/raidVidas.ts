import { sql } from "drizzle-orm";
import { getDb } from "./db";

/**
 * Vida de los cazadores: el jefe también ataca.
 *
 *  - Cada cazador tiene 2.000 de vida.
 *  - Por cada golpe que da, el jefe le quita 1 de vida: con 2.000 golpes
 *    se queda sin vida (antes eran 5.000; se bajó para que dure menos).
 *    Los bonos (x2, x4) multiplican el daño que hace cada golpe, no la vida
 *    que cuesta, así que siguen valiendo la pena.
 *  - La vida se recupera sola y de forma continua: de 0 a completa en 24 h.
 *  - Sin vida no se puede atacar.
 *
 * Se guarda la vida y el momento en que se anotó; la vida actual se calcula
 * sumando lo recuperado desde entonces.
 */
export const VIDA_CAZADOR = 2000;
export const REPOSICION_MS = 24 * 3_600_000;
/** Golpes que aguanta una vida completa */
export const GOLPES_POR_VIDA = 2000;
export const VIDA_POR_GOLPE = VIDA_CAZADOR / GOLPES_POR_VIDA;

function filas<T = any>(res: any): T[] {
  if (Array.isArray(res?.[0])) return res[0] as T[];
  if (Array.isArray(res)) return res as T[];
  return (res?.rows ?? []) as T[];
}

let tabla: Promise<void> | null = null;
function asegurarTabla(): Promise<void> {
  if (!tabla) {
    tabla = (async () => {
      const db = await getDb();
      if (!db) throw new Error("sin base de datos");
      await db.execute(sql`CREATE TABLE IF NOT EXISTS wfRaidVidas (
        userId int NOT NULL PRIMARY KEY,
        vida double NOT NULL,
        actualizadoMs bigint NOT NULL
      )`);
    })().catch(e => { tabla = null; throw e; });
  }
  return tabla;
}

/** Vida con lo recuperado desde la última anotación */
function conReposicion(vida: number, actualizadoMs: number, ahora: number): number {
  const recuperado = ((ahora - actualizadoMs) / REPOSICION_MS) * VIDA_CAZADOR;
  return Math.min(VIDA_CAZADOR, Math.max(0, vida + Math.max(0, recuperado)));
}

/** Vida actual de un cazador (quien nunca ha peleado la tiene completa) */
export async function vidaDe(userId: number): Promise<number> {
  await asegurarTabla();
  const db = (await getDb())!;
  const [f] = filas<{ vida: number; actualizadoMs: number }>(await db.execute(
    sql`SELECT vida, actualizadoMs FROM wfRaidVidas WHERE userId = ${userId}`));
  return f ? conReposicion(Number(f.vida), Number(f.actualizadoMs), Date.now()) : VIDA_CAZADOR;
}

/** Cuántos golpes puede dar con la vida que tiene */
export function golpesQueAguanta(vida: number): number {
  return Math.max(0, Math.floor(vida / VIDA_POR_GOLPE + 1e-6));
}

/** El jefe cobra los golpes dados. Devuelve la vida que queda */
export async function cobrarGolpes(userId: number, golpes: number): Promise<number> {
  const ahora = Date.now();
  const queda = Math.max(0, (await vidaDe(userId)) - golpes * VIDA_POR_GOLPE);
  const db = (await getDb())!;
  await db.execute(sql`INSERT INTO wfRaidVidas (userId, vida, actualizadoMs) VALUES (${userId}, ${queda}, ${ahora})
    ON DUPLICATE KEY UPDATE vida = VALUES(vida), actualizadoMs = VALUES(actualizadoMs)`);
  return queda;
}

/** Todos vuelven a tener la vida completa (al reiniciar el jefe) */
export async function reponerTodas(): Promise<void> {
  await asegurarTabla();
  const db = (await getDb())!;
  await db.execute(sql`DELETE FROM wfRaidVidas`);
}
