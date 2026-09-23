/**
 * ¿El teléfono es de gama baja?
 *
 * Solo se decide con datos confiables:
 *  - La memoria RAM (Chrome en Android la informa): 3 GB o menos.
 *  - El ahorro de datos activado.
 *
 * NO se usa el número de núcleos: Safari lo reporta recortado por
 * privacidad y dejaba a un iPhone de gama alta en modo ligero. Los iPhone,
 * iPad y Mac nunca entran en modo ligero.
 *
 * Para probar a mano: ?efectos=ligeros o ?efectos=completos en la URL
 * (se recuerda en este navegador; ?efectos=auto vuelve a lo automático).
 */
export function esGamaBaja(): boolean {
  if (typeof navigator === "undefined") return false;

  try {
    const pedido = new URLSearchParams(window.location.search).get("efectos");
    if (pedido === "auto") localStorage.removeItem("iw_efectos");
    else if (pedido === "ligeros" || pedido === "completos") localStorage.setItem("iw_efectos", pedido);
    const guardado = localStorage.getItem("iw_efectos");
    if (guardado === "ligeros") return true;
    if (guardado === "completos") return false;
  } catch { /* sin almacenamiento: se decide solo */ }

  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (n.connection?.saveData === true) return true;
  if (/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)) return false;
  return typeof n.deviceMemory === "number" && n.deviceMemory <= 3;
}

/** Lo que ya decidió la página (clase en <html>) */
export function modoLigero(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("iw-ligero");
}
