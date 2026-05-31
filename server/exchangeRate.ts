let cachedRate: number = 4200;
let lastFetch: number = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hora

export async function getUSDtoCOP(): Promise<number> {
  const now = Date.now();
  if (now - lastFetch < CACHE_TTL) return cachedRate;

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await res.json();
    cachedRate = data.rates?.COP ?? 4200;
    lastFetch = now;
    console.log('[ExchangeRate] USD/COP actualizado:', cachedRate);
  } catch (err) {
    console.warn('[ExchangeRate] Error al obtener tasa, usando cache:', cachedRate);
  }
  return cachedRate;
}
