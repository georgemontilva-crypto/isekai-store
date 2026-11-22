/**
 * Invitación al raid: quien llega con el enlace de otro cazador
 * (isekaiworld.co/?inv=código) trae su código en la dirección.
 *
 * Se anota aquí, al cargar, porque la dirección se limpia enseguida. Queda
 * guardado en el navegador hasta que la persona crea su cuenta; entonces se
 * canjea por el bono de bienvenida.
 */
const CLAVE = "iw_inv";
const FORMATO = /^[a-z0-9]{5,14}$/;

let enMemoria = "";
let llego = false;
try {
  const p = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("inv") : null;
  if (p && FORMATO.test(p)) {
    llego = true;
    enMemoria = p;
    localStorage.setItem(CLAVE, p);
  }
} catch { /* modo privado: queda en memoria */ }

/** Esta visita empezó con un enlace de invitación */
export const LLEGO_CON_INVITACION = llego;

export function invitacionPendiente(): string {
  try { return localStorage.getItem(CLAVE) || enMemoria; } catch { return enMemoria; }
}
export function olvidarInvitacion() {
  enMemoria = "";
  try { localStorage.removeItem(CLAVE); } catch { /* */ }
}

/** Enlace para compartir. En producción siempre con www, la dirección que nunca falla */
export function enlaceDeInvitacion(codigo: string): string {
  const base = typeof window !== "undefined" && !window.location.hostname.endsWith("isekaiworld.co")
    ? window.location.origin
    : "https://www.isekaiworld.co";
  return `${base}/?inv=${codigo}`;
}
