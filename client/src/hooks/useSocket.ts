import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";
import { cargarSocketIo } from "@/lib/socketCliente";

let socketInstance: Socket | null = null;

export function useSocket(): Socket | null {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(socketInstance);

  useEffect(() => {
    if (!isAuthenticated) {
      socketInstance?.disconnect();
      socketInstance = null;
      setSocket(null);
      return;
    }
    if (socketInstance) { setSocket(socketInstance); return; }

    let cancelado = false;
    // La librería se descarga aquí, solo para quien tiene sesión
    void cargarSocketIo().then(({ io }) => {
      if (cancelado) return;
      if (!socketInstance) {
        socketInstance = io(window.location.origin, { transports: ["websocket", "polling"], withCredentials: true });
        socketInstance.on("connect_error", () => { /* socket.io reintenta solo */ });
      }
      setSocket(socketInstance);
    });
    return () => { cancelado = true; };
  }, [isAuthenticated]);

  return socket;
}

/**
 * Escucha un evento del canal en vivo global (el de la sesión iniciada).
 * El socket se crea al iniciar sesión, así que si todavía no existe se
 * reintenta enganchar cada medio segundo hasta que esté listo.
 */
export function useSocketEvento<T = unknown>(evento: string, alRecibir: (datos: T) => void) {
  const handler = useRef(alRecibir);
  handler.current = alRecibir;

  useEffect(() => {
    let enganchado: Socket | null = null;
    let reintento: ReturnType<typeof setTimeout> | undefined;
    const fn = (datos: T) => handler.current(datos);
    const enganchar = () => {
      if (socketInstance) {
        enganchado = socketInstance;
        enganchado.on(evento, fn);
      } else {
        reintento = setTimeout(enganchar, 500);
      }
    };
    enganchar();
    return () => {
      if (reintento) clearTimeout(reintento);
      enganchado?.off(evento, fn);
    };
  }, [evento]);
}

// Al volver a la app, si el canal se cortó en segundo plano, se reconecta
if (typeof window !== "undefined") {
  window.addEventListener("iw:volver", () => {
    if (socketInstance && !socketInstance.connected) socketInstance.connect();
  });
}

