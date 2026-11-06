export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Abre el modal de login en el frontend (AuthDialog).
 * El modal maneja Google OAuth y Magic Link directamente.
 *
 * Esta función se mantiene por compatibilidad con código existente
 * que llamaba window.location.href = getLoginUrl().
 * Ahora en vez de redirigir, dispara un evento para abrir el modal.
 */
export const getLoginUrl = (): string => {
  // Retorna "#login" como señal para abrir el modal de auth
  return "#login";
};

export const openLoginModal = (): void => {
  window.dispatchEvent(new CustomEvent("isekai:open-auth-modal"));
};

/**
 * Dirección pública para todo enlace que se copie, se envíe o vaya en un QR:
 * siempre con www (la dirección sin www depende del DNS y ha fallado). En
 * local o en pruebas se usa la dirección actual.
 */
export const URL_PUBLICA = "https://www.isekaiworld.co";
export const urlPublica = (): string =>
  typeof window !== "undefined" && window.location.hostname.endsWith("isekaiworld.co")
    ? URL_PUBLICA
    : (typeof window !== "undefined" ? window.location.origin : URL_PUBLICA);
