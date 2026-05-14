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
