/**
 * ¿El teléfono es de gama baja?
 *
 * Se considera así si tiene 3 GB de RAM o menos, 4 núcleos o menos, o el
 * ahorro de datos activado. Safari no informa la memoria; los iPhone
 * recientes tienen 6 núcleos, así que no caen aquí.
 *
 * Se usa para aligerar los efectos: menos partículas y sin video de fondo.
 */
export function esGamaBaja(): boolean {
  if (typeof navigator === "undefined") return false;
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const memoria = n.deviceMemory ?? 8;
  const nucleos = n.hardwareConcurrency ?? 8;
  return n.connection?.saveData === true || memoria <= 3 || nucleos <= 4;
}

/** Lo que ya decidió la página (clase en <html>) */
export function modoLigero(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("iw-ligero");
}
