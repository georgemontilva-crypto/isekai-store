import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

let socketInstance: Socket | null = null;

export function useSocket(): Socket | null {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      socketInstance = null;
      return;
    }

    if (socketInstance?.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect_error", () => {
      // Socket.io handles reconnection automatically
    });

    socketInstance = socket;
    socketRef.current = socket;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  }, [isAuthenticated]);

  return socketRef.current;
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
