import { sql } from "drizzle-orm";
import { getDb } from "./db";

/**
 * Índices que las consultas del día del evento necesitan para no recorrer
 * tablas completas: la puerta busca los ingresos de un boleto, las estaciones
 * de EXP buscan lo que ya se le dio a un boleto, y el menú busca el boleto de
 * cada cuenta por su correo. Con miles de boletos, sin índice, cada consulta
 * lee la tabla entera.
 *
 * Se crean solos al arrancar el servidor (si ya existen no se toca nada), así
 * no hay que correr SQL a mano.
 */
const INDICES: { tabla: string; nombre: string; columnas: string }[] = [
  { tabla: "ticketCheckins", nombre: "idx_ingresos_boleto", columnas: "ticketId" },
  { tabla: "levelGrants", nombre: "idx_exp_boleto_actividad", columnas: "ticketId, activityId" },
  { tabla: "levelRankUps", nombre: "idx_ascensos_boleto", columnas: "ticketId" },
  { tabla: "eventTickets", nombre: "idx_boletos_correo", columnas: "buyerEmail" },
  { tabla: "eventTickets", nombre: "idx_boletos_evento_estado", columnas: "eventId, status" },
];

export async function asegurarIndices() {
  const db = await getDb();
  if (!db) return;
  for (const i of INDICES) {
    try {
      const [filas] = await db.execute(sql.raw(`SHOW INDEX FROM \`${i.tabla}\` WHERE Key_name = '${i.nombre}'`)) as unknown as [unknown[]];
      if (!filas?.length) {
        await db.execute(sql.raw(`CREATE INDEX \`${i.nombre}\` ON \`${i.tabla}\` (${i.columnas})`));
        console.log(`[Índices] Creado ${i.nombre} en ${i.tabla}`);
      }
    } catch (e) {
      console.warn(`[Índices] No se pudo crear ${i.nombre}:`, (e as Error).message);
    }
  }
}
