import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "./db";

/**
 * Verificación automática de pagos por Binance Pay.
 *
 * Con una clave de API de SOLO LECTURA de la cuenta que recibe, se consulta
 * el historial de Binance Pay y se busca el pago por su número de
 * transacción (el que ve el comprador en su comprobante). Un pago se da por
 * bueno solo si coincide todo:
 *   - existe en el historial y es un ingreso a nuestra cuenta
 *   - es reciente
 *   - el monto cubre lo que se cobra, en una moneda estable (USDT…)
 *   - ese número de transacción no se usó antes en otra compra
 *
 * Si falta la clave, Binance no responde o algo no coincide, NO se aprueba:
 * el pago queda para revisión manual, como siempre.
 *
 * Variables de entorno: BINANCE_API_KEY y BINANCE_API_SECRET.
 * Opcional: BINANCE_API_BASE (por defecto https://api.binance.com).
 */
const ESTABLES = new Set(["USDT", "USDC", "FDUSD", "BUSD", "USD"]);
const VENTANA_MS = 72 * 3600_000;

export function binanceConfigurado() {
  return Boolean(process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET);
}

export type PagoBinance = { transactionId: string; monto: number; moneda: string; fecha: number; tipo: string; pagador: string; pagadorId: string };
export type ResultadoBinance =
  | { ok: true; pago: PagoBinance }
  | { ok: false; motivo: "sin_configurar" | "formato" | "no_encontrado" | "no_es_ingreso" | "moneda" | "monto_menor" | "ya_usado" | "error"; detalle?: string; pago?: PagoBinance };

export const MENSAJE_BINANCE: Record<string, string> = {
  sin_configurar: "La verificación automática no está activa. Revisaremos tu pago a mano.",
  formato: "Ese número de transacción no tiene el formato de Binance. Cópialo del comprobante del pago.",
  no_encontrado: "Todavía no vemos ese pago en nuestra cuenta de Binance. Si acabas de pagar, espera un minuto y vuelve a verificar.",
  no_es_ingreso: "Esa transacción no es un pago recibido en nuestra cuenta.",
  moneda: "El pago debe hacerse en USDT.",
  monto_menor: "El monto de ese pago es menor al de tu compra. Lo revisaremos a mano.",
  ya_usado: "Ese número de transacción ya se usó en otra compra.",
  error: "No pudimos consultar Binance en este momento. Revisaremos tu pago a mano.",
};

// La consulta pesa mucho en el límite de Binance: se guarda unos segundos
let cache: { hasta: number; lista: PagoBinance[] } | null = null;
let enCurso: Promise<PagoBinance[]> | null = null;

async function historial(): Promise<PagoBinance[]> {
  if (cache && cache.hasta > Date.now()) return cache.lista;
  if (enCurso) return enCurso;
  enCurso = (async () => {
    const base = (process.env.BINANCE_API_BASE || "https://api.binance.com").replace(/\/+$/, "");
    const consulta = `startTime=${Date.now() - VENTANA_MS}&limit=100&recvWindow=60000&timestamp=${Date.now()}`;
    const firma = crypto.createHmac("sha256", process.env.BINANCE_API_SECRET as string).update(consulta).digest("hex");
    const r = await fetch(`${base}/sapi/v1/pay/transactions?${consulta}&signature=${firma}`, {
      headers: { "X-MBX-APIKEY": process.env.BINANCE_API_KEY as string },
      signal: AbortSignal.timeout(12_000),
    });
    const texto = await r.text();
    if (!r.ok) throw new Error(`Binance ${r.status}: ${texto.slice(0, 200)}`);
    const j = JSON.parse(texto);
    const lista: PagoBinance[] = (Array.isArray(j?.data) ? j.data : []).map((t: any) => ({
      transactionId: String(t.transactionId ?? ""),
      monto: parseFloat(t.amount ?? "0") || 0,
      moneda: String(t.currency ?? "").toUpperCase(),
      fecha: Number(t.transactionTime ?? 0),
      tipo: String(t.orderType ?? ""),
      pagador: String(t.payerInfo?.name ?? ""),
      pagadorId: String(t.payerInfo?.binanceId ?? ""),
    }));
    cache = { hasta: Date.now() + 15_000, lista };
    return lista;
  })().finally(() => { enCurso = null; });
  return enCurso;
}

export async function asegurarTablaBinance() {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`CREATE TABLE IF NOT EXISTS pagosBinanceUsados (
    transactionId varchar(80) PRIMARY KEY,
    uso varchar(80) NOT NULL,
    monto decimal(12,2) NOT NULL,
    pagador varchar(200) NULL,
    creadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}

/**
 * Busca el pago y, si todo coincide, lo reserva para `uso` (por ejemplo
 * «boleto:12»). La reserva es atómica: el mismo número no sirve dos veces.
 */
export async function verificarPagoBinance(d: { transactionId: string; montoUsd: number; uso: string }): Promise<ResultadoBinance> {
  if (!binanceConfigurado()) return { ok: false, motivo: "sin_configurar" };
  const id = d.transactionId.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) return { ok: false, motivo: "formato" };
  const db = await getDb();
  if (!db) return { ok: false, motivo: "error", detalle: "sin base de datos" };

  let lista: PagoBinance[];
  try { lista = await historial(); }
  catch (e: any) {
    console.warn("[Binance] consulta:", e?.message ?? e);
    return { ok: false, motivo: "error", detalle: String(e?.message ?? e).slice(0, 200) };
  }
  const pago = lista.find(p => p.transactionId === id);
  if (!pago) return { ok: false, motivo: "no_encontrado" };
  if (pago.monto <= 0) return { ok: false, motivo: "no_es_ingreso", pago };
  if (!ESTABLES.has(pago.moneda)) return { ok: false, motivo: "moneda", pago };
  if (pago.monto + 0.011 < d.montoUsd) return { ok: false, motivo: "monto_menor", pago };

  const [res] = await db.execute(sql`INSERT IGNORE INTO pagosBinanceUsados (transactionId, uso, monto, pagador)
    VALUES (${id}, ${d.uso}, ${pago.monto}, ${`${pago.pagador} ${pago.pagadorId}`.trim().slice(0, 200)})`) as any;
  if (!res?.affectedRows) {
    // ¿La reservó esta misma compra en un intento anterior?
    const [[ya]] = await db.execute(sql`SELECT uso FROM pagosBinanceUsados WHERE transactionId = ${id}`) as unknown as [[{ uso: string } | undefined]];
    if (ya?.uso !== d.uso) return { ok: false, motivo: "ya_usado", pago };
  }
  return { ok: true, pago };
}

/** ¿Ese número ya quedó reservado por otra compra? (para avisar en la revisión manual) */
export async function usoDeTransaccion(transactionId: string) {
  const db = await getDb();
  if (!db) return null;
  const [[f]] = await db.execute(sql`SELECT uso FROM pagosBinanceUsados WHERE transactionId = ${transactionId.replace(/\s+/g, "")}`) as unknown as [[{ uso: string } | undefined]];
  return f?.uso ?? null;
}
