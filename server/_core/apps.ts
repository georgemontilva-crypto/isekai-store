import type { Request } from "express";

/**
 * Apps aparte que salen del mismo servidor, según la dirección de entrada:
 *   equipo.isekaiworld.co → app del Equipo (tiendas y personal del evento)
 *   admin.isekaiworld.co  → app de Administración
 */
export type AppDeHost = "web" | "equipo" | "admin";

export function anfitrion(req: Request): string {
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

/**
 * ¿Ya responde cada app en su propia dirección?
 *
 * Mientras una dirección no funcione (el dominio sin conectar, un registro
 * mal puesto), la web sigue dando la entrada de siempre: nadie se queda sin
 * su panel. En cuanto responde, la web retira esos accesos y las direcciones
 * viejas llevan a la app. Se comprueba solo, sin tocar nada a mano.
 */
type AppAparte = "equipo" | "admin";
const DIRECCION: Record<AppAparte, string> = {
  equipo: (process.env.URL_APP_EQUIPO || "https://equipo.isekaiworld.co").replace(/\/+$/, ""),
  admin: (process.env.URL_APP_ADMIN || "https://admin.isekaiworld.co").replace(/\/+$/, ""),
};
const activa: Record<AppAparte, boolean> = { equipo: false, admin: false };
const fallos: Record<AppAparte, number> = { equipo: 0, admin: 0 };

/** La dirección de cada app si ya funciona; si no, null */
export function appsActivas(): Record<AppAparte, string | null> {
  return { equipo: activa.equipo ? DIRECCION.equipo : null, admin: activa.admin ? DIRECCION.admin : null };
}

/** Enlace para un correo: a la app si ya funciona, si no a la web de siempre */
export function enlaceDeApp(app: AppAparte, ruta: string): string {
  return `${activa[app] ? DIRECCION[app] : "https://www.isekaiworld.co"}${ruta}`;
}

async function responde(app: AppAparte): Promise<boolean> {
  try {
    const r = await fetch(`${DIRECCION[app]}/api/app-ping`, { signal: AbortSignal.timeout(8000), redirect: "error", cache: "no-store" });
    if (!r.ok) return false;
    const j = (await r.json()) as { app?: string };
    // Tiene que contestar ESTE servidor reconociéndose como esa app
    return j?.app === app;
  } catch { return false; }
}

export function vigilarApps() {
  const revisar = async () => {
    for (const app of ["equipo", "admin"] as const) {
      const ok = await responde(app);
      if (ok) {
        fallos[app] = 0;
        if (!activa[app]) { activa[app] = true; console.log(`[Apps] ${DIRECCION[app]} ya responde: la web deja de dar ese acceso`); }
      } else if (activa[app] && ++fallos[app] >= 3) {
        // Tres fallos seguidos: la dirección se cayó, la web vuelve a dar la entrada
        activa[app] = false; fallos[app] = 0;
        console.warn(`[Apps] ${DIRECCION[app]} dejó de responder: la web vuelve a dar ese acceso`);
      }
    }
  };
  setTimeout(() => void revisar(), 8_000);
  setInterval(() => void revisar(), 2 * 60_000).unref?.();
}
