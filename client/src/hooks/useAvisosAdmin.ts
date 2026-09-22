import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";

/**
 * Avisos del panel en tiempo real.
 *
 * Antes las novedades —una solicitud de cosplayer, un pedido, un pago— solo
 * aparecían al recargar la página. Aquí se escucha al servidor y se refresca
 * lo que corresponda en el momento, además de mostrar un aviso flotante.
 *
 * Se refrescan solo las consultas afectadas por cada tipo de novedad, no
 * todas: recargarlo todo en cada aviso haría trabajar de más al servidor.
 */
export function useAvisosAdmin() {
  const { user, isAuthenticated } = useAuth();
  const socket = useSocket();
  const utils = trpc.useUtils();

  // Las funciones cambian en cada render; con una referencia el efecto no se
  // vuelve a suscribir cada vez.
  const manejar = useRef<(n: any) => void>(() => {});

  manejar.current = (n: { type: string; title?: string; body?: string }) => {
    // La campana y el contador siempre
    utils.notifications.getAll.invalidate();

    const titulo = n.title ?? "Nueva notificación";

    if (n.type === "new_subscriber" && /solicitud cosplay guild/i.test(titulo)) {
      utils.cosplay.getApplications.invalidate();
      toast.success(titulo, { description: n.body });
      return;
    }

    if (n.type === "new_order") {
      utils.orders.adminList.invalidate();
      utils.orders.adminPayments.invalidate();
      toast.success(titulo, { description: n.body });
      return;
    }

    if (n.type === "new_user") {
      // Las entregas de misiones traen un enlace en el cuerpo
      if (/https?:\/\//.test(n.body ?? "")) {
        utils.cosplay.getAllSubmissions.invalidate();
      } else {
        utils.users.list.invalidate();
      }
      toast(titulo, { description: n.body });
      return;
    }

    toast(titulo, { description: n.body });
  };

  useEffect(() => {
    if (!socket || !isAuthenticated || user?.role !== "admin") return;

    const alRecibir = (n: any) => manejar.current(n);
    socket.on("admin:notificacion", alRecibir);
    return () => { socket.off("admin:notificacion", alRecibir); };
  }, [socket, isAuthenticated, user?.role]);
}
