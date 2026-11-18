/**
 * Qué app se está viendo, según la dirección por la que se entró:
 *
 *   equipo.isekaiworld.co → la app del Equipo (tiendas y personal del evento)
 *   admin.isekaiworld.co  → la app de Administración
 *   cualquier otra        → la web pública
 *
 * Las tres salen del mismo servidor; solo cambia lo que se muestra. Quien
 * entra por una app no ve la web ni tiene enlaces hacia ella.
 */
export type AppActual = "web" | "equipo" | "admin";

const anfitrion = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";

export const APP: AppActual = anfitrion.startsWith("equipo.") ? "equipo" : anfitrion.startsWith("admin.") ? "admin" : "web";
export const ES_APP = APP !== "web";
