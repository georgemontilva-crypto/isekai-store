import { getDb } from "./db";
import { siteSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Tasa automática desde Binance P2P (USDT/VES).
 *
 * IMPORTANTE: este endpoint NO es una API oficial documentada. Puede cambiar
 * sin aviso o bloquear las consultas automáticas. Por eso todo aquí falla en
 * silencio y conserva la última tasa buena: la tienda nunca debe quedarse sin
 * tasa porque un tercero deje de responder.
 *
 * Se consulta un grupo de ofertas y se toma la MÁS ALTA: es la tasa más
 * conservadora, la que evita quedarse corto al cobrar en bolívares.
 */

const URL_P2P = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";

/** Cuántas ofertas se consultan para buscar la más alta */
const OFERTAS_A_REVISAR = 20;

export interface ResultadoTasa {
  tasa: number;
  ofertas: number;
  consultadoEn: string;
  /** Precios devueltos, para poder comparar con lo que se ve en la app */
  precios?: number[];
}

/**
 * Consulta el precio al que se COMPRA USDT pagando en bolívares.
 *
 * En la API de Binance, `tradeType` va desde la perspectiva de QUIEN CONSULTA:
 * "BUY" devuelve los anuncios de quienes venden USDT — que es a quienes tú les
 * pagas en bolívares para comprarlo. Con "SELL" salían los del lado contrario,
 * con precios más bajos, y la tasa quedaba corta.
 */
export async function consultarTasaBinance(): Promise<ResultadoTasa | null> {
  try {
    const respuesta = await fetch(URL_P2P, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Sin esto algunos servidores rechazan la petición
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; IsekaiWorld/1.0)",
      },
      body: JSON.stringify({
        asset: "USDT",
        fiat: "VES",
        tradeType: "BUY",
        page: 1,
        rows: 20,
        // Sin filtro de método de pago ni de anunciante: se ve toda la oferta
        payTypes: [],
        publisherType: null,
      }),
      // Si Binance tarda, no se bloquea la aplicación
      signal: AbortSignal.timeout(8000),
    });

    if (!respuesta.ok) {
      console.warn(`[Tasa] Binance respondió ${respuesta.status}`);
      return null;
    }

    const datos: any = await respuesta.json();
    const anuncios: any[] = datos?.data ?? [];

    const precios = anuncios
      .map(a => parseFloat(a?.adv?.price))
      .filter(p => Number.isFinite(p) && p > 0)
      .slice(0, OFERTAS_A_REVISAR);

    if (!precios.length) {
      console.warn("[Tasa] Binance no devolvió ofertas utilizables");
      return null;
    }

    // Se toma la MÁS ALTA de las ofertas consultadas: es la tasa más
    // conservadora, la que evita quedarse corto al convertir a bolívares.
    const masAlta = Math.max(...precios);

    return {
      tasa: Math.round(masAlta * 100) / 100,
      ofertas: precios.length,
      consultadoEn: new Date().toISOString(),
      precios,
    };
  } catch (e) {
    console.warn("[Tasa] No se pudo consultar Binance:", (e as Error)?.message ?? e);
    return null;
  }
}

/**
 * Actualiza la tasa guardada si la consulta tuvo éxito.
 *
 * Si Binance falla, NO se toca nada: se conserva la última tasa válida, sea
 * automática o la que pusiste a mano.
 */
export async function actualizarTasaAutomatica(): Promise<{ actualizada: boolean; tasa?: number }> {
  const db = await getDb();
  if (!db) return { actualizada: false };

  // Se respeta el modo manual: si lo activaste, el automático no interfiere
  const [modo] = await db.select().from(siteSettings).where(eq(siteSettings.key, "bs_rate_auto")).limit(1);
  if (modo?.value === "false") return { actualizada: false };

  const r = await consultarTasaBinance();
  if (!r) return { actualizada: false };

  // Ajuste opcional: permite subir o bajar un porcentaje sobre lo que
  // devuelve Binance, para cuadrar con la tasa a la que compras de verdad.
  const [ajusteRow] = await db.select().from(siteSettings).where(eq(siteSettings.key, "bs_rate_margin")).limit(1);
  const ajuste = parseFloat(ajusteRow?.value ?? "0") || 0;
  if (ajuste !== 0) {
    r.tasa = Math.round(r.tasa * (1 + ajuste / 100) * 100) / 100;
  }

  const guardar = async (clave: string, valor: string) => {
    const [existe] = await db.select().from(siteSettings).where(eq(siteSettings.key, clave)).limit(1);
    if (existe) {
      await db.update(siteSettings).set({ value: valor }).where(eq(siteSettings.key, clave));
    } else {
      await db.insert(siteSettings).values({ key: clave, value: valor });
    }
  };

  await guardar("bs_rate", r.tasa.toFixed(2));
  await guardar("bs_rate_updated", r.consultadoEn);
  await guardar("bs_rate_source", `Binance P2P · la más alta de ${r.ofertas} ofertas${ajuste !== 0 ? ` · ajuste ${ajuste > 0 ? "+" : ""}${ajuste}%` : ""}`);

  console.log(`[Tasa] Actualizada a Bs ${r.tasa} (${r.ofertas} ofertas de Binance)`);
  return { actualizada: true, tasa: r.tasa };
}

/**
 * Arranca la actualización periódica.
 *
 * Cada hora es suficiente: la tasa se mueve, pero consultar más a menudo
 * aumenta el riesgo de que Binance bloquee al servidor sin dar más precisión.
 */
export function iniciarTasaAutomatica() {
  const UNA_HORA = 60 * 60 * 1000;

  // Primera consulta al arrancar, con margen para que la base esté lista
  setTimeout(() => { void actualizarTasaAutomatica(); }, 20_000);

  setInterval(() => { void actualizarTasaAutomatica(); }, UNA_HORA);

  console.log("[Tasa] Actualización automática activada (cada hora)");
}
