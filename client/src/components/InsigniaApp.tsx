import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Número rojo sobre el ícono de la app instalada (iPhone con la app en la
 * pantalla de inicio y permiso de notificaciones; Android y computadora con
 * la app instalada).
 *
 * Con la app abierta se muestra el número real de notificaciones sin leer:
 * las del panel para el administrador, las de sus pedidos para los clientes.
 * Con la app cerrada, el service worker suma 1 por cada aviso que llega.
 */
export default function InsigniaApp() {
  const { user, isAuthenticated } = useAuth();
  const esAdmin = user?.role === "admin";
  const opciones = { refetchInterval: 60_000, refetchOnWindowFocus: true, retry: false } as const;
  const { data: delPanel } = trpc.notifications.unreadCount.useQuery(undefined, { ...opciones, enabled: isAuthenticated && esAdmin });
  const { data: propias } = trpc.userNotifications.unreadCount.useQuery(undefined, { ...opciones, enabled: isAuthenticated && !esAdmin });

  const total = !isAuthenticated ? 0 : esAdmin ? Number(delPanel ?? 0) : Number(propias ?? 0);
  const listo = !isAuthenticated || (esAdmin ? delPanel !== undefined : propias !== undefined);

  useEffect(() => {
    if (!listo) return;
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    try {
      if (total > 0) void nav.setAppBadge?.(total).catch(() => {});
      else void nav.clearAppBadge?.().catch(() => {});
    } catch { /* el navegador no lo permite */ }
    // El service worker sigue contando desde el número real
    navigator.serviceWorker?.ready
      .then(r => r.active?.postMessage({ tipo: "insignia", n: total }))
      .catch(() => {});
  }, [total, listo]);

  return null;
}
