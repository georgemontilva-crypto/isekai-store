/**
 * Día del evento en hora de Venezuela (lo usan el servidor y el teléfono del
 * portero sin conexión, para que ambos cuenten igual).
 *
 * El servidor corre en hora UTC: desde las 8 p. m. de Venezuela ya es «mañana»
 * para él. Por eso el sábado en la noche un boleto de un día salía rechazado y
 * el último día, de noche, decía «Hoy no hay evento».
 */
const ZONA = "America/Caracas";

/** Fecha AAAA-MM-DD de un instante, en hora de Venezuela */
export function fechaVE(d: Date): string {
  // en-CA da el formato AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/**
 * Fecha de calendario de un inicio o fin de evento. Desde el panel se guarda
 * solo la fecha (queda a medianoche UTC): esa fecha es la que vale. Si trae
 * hora (eventos de prueba creados al vuelo), se toma su fecha en Venezuela.
 */
export function fechaDeEvento(valor: Date | string): string {
  const d = new Date(valor);
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
    return d.toISOString().slice(0, 10);
  }
  return fechaVE(d);
}

const aDias = (f: string) => Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) / 86400000;

/** 1, 2, … según el día del evento; null si hoy no hay evento */
export function diaDelEventoVE(evento: { startDate: Date | string; endDate: Date | string }, ahora = new Date()): number | null {
  const hoy = aDias(fechaVE(ahora));
  const d1 = aDias(fechaDeEvento(evento.startDate));
  const d2 = aDias(fechaDeEvento(evento.endDate));
  if (hoy < d1 || hoy > d2) return null;
  return hoy - d1 + 1;
}
