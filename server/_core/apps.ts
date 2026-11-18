import type { Request } from "express";

/**
 * Apps aparte que salen del mismo servidor, según la dirección de entrada:
 *   equipo.isekaiworld.co → app del Equipo (tiendas y personal del evento)
 *   admin.isekaiworld.co  → app de Administración
 */
export type AppDeHost = "web" | "equipo" | "admin";

function anfitrion(req: Request): string {
  const reenviado = String(req.headers["x-forwarded-host"] ?? "").split(",")[0].trim();
  return (reenviado || req.headers.host || "").toLowerCase().replace(/:\d+$/, "");
}

export function appDeHost(req: Request): AppDeHost {
  const h = anfitrion(req);
  return h.startsWith("equipo.") ? "equipo" : h.startsWith("admin.") ? "admin" : "web";
}

/**
 * Dirección a la que debe volver el enlace de entrada del correo: la de la
 * app desde la que se pidió, para que la sesión quede abierta ahí mismo.
 * Solo se aceptan las direcciones propias; cualquier otra cosa vuelve a la web.
 */
export function origenParaEnlace(req: Request): string {
  const h = anfitrion(req);
  if (/^(equipo|admin)\.isekaiworld\.co$/.test(h)) return `https://${h}`;
  // Pruebas en la propia máquina (equipo.localhost, admin.localhost)
  if (process.env.NODE_ENV !== "production" && /^(equipo|admin)\.localhost$/.test(h)) return `http://${req.headers.host}`;
  return "https://www.isekaiworld.co";
}
