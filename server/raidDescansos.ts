import { sql } from "drizzle-orm";
import { getDb } from "./db";

/**
 * Descanso de cazador (días sin límite): cada 20.000 de daño toca descansar
 * 30 minutos. Mientras dura el descanso no se aceptan golpes.
 *
 * De cada cazador se guarda hasta cuándo descansa y cuánto daño llevaba al
 * empezar ese descanso (la «marca»): el siguiente llega cuando su daño
 * supera la marca en otros 20.000. Quien ya pasaba de 20.000 al estrenarse
 * la regla empieza su primer descanso en cuanto se le revisa.
 */
export const DESCANSO_CADA = 20_000;
export const DESCANSO_MS = 30 * 60_000;

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
      await db.execute(sql`CREATE TABLE IF NOT EXISTS wfRaidDescansos (
        userId int NOT NULL PRIMARY KEY,
        raidId int NOT NULL,
        hastaMs bigint NOT NULL,
        marca bigint NOT NULL
      )`);
    })().catch(e => { tabla = null; throw e; });
  }
  return tabla;
}

/**
 * Revisa el descanso de un cazador con su daño total en este jefe.
 * Devuelve los milisegundos que le faltan de descanso (0 si puede atacar).
 * Si ya le toca descansar y no había empezado, el descanso empieza ahora.
 */
export async function revisarDescanso(userId: number, raidId: number, total: number): Promise<number> {
  await asegurarTabla();
  const db = (await getDb())!;
  const [f] = filas<{ raidId: number; hastaMs: number; marca: number }>(await db.execute(
    sql`SELECT raidId, hastaMs, marca FROM wfRaidDescansos WHERE userId = ${userId}`));
  // Con un jefe nuevo la cuenta empieza de cero
  const mismo = !!f && Number(f.raidId) === raidId;
  const hasta = mismo ? Number(f!.hastaMs) : 0;
  const marca = mismo ? Number(f!.marca) : 0;
  const ahora = Date.now();
  if (ahora < hasta) return hasta - ahora;
  if (total - marca < DESCANSO_CADA) return 0;
  await db.execute(sql`INSERT INTO wfRaidDescansos (userId, raidId, hastaMs, marca)
    VALUES (${userId}, ${raidId}, ${ahora + DESCANSO_MS}, ${total})
    ON DUPLICATE KEY UPDATE raidId = VALUES(raidId), hastaMs = VALUES(hastaMs), marca = VALUES(marca)`);
  console.log(`[Raid] descanso de 30 min para el usuario ${userId} (daño ${total})`);
  return DESCANSO_MS;
}
