import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { cargarSocketIo } from "@/lib/socketCliente";

/**
 * Canal en vivo de la venta de stands. Cada vez que alguien reporta un pago,
 * se aprueba, se rechaza o se mueve una mesa, el servidor avisa y la pantalla
 * se actualiza sola (la página pública y el admin). Es anónimo: el aviso no
 * lleva datos de nadie, solo indica que hay que volver a pedir la lista.
 */
export function useStandsSocket(alCambiar: () => void) {
  const fn = useRef(alCambiar);
  fn.current = alCambiar;

  useEffect(() => {
    let socket: Socket | null = null;
    let cerrado = false;
    const alVolver = () => {
      if (socket && !socket.connected) socket.connect();
      fn.current();
    };
    void cargarSocketIo().then(({ io }) => {
      if (cerrado) return;
      socket = io(window.location.origin, {
        transports: ["websocket", "polling"],
        auth: { stands: true },
        reconnectionDelay: 800,
        reconnectionDelayMax: 5000,
      });
      socket.on("stands:cambio", () => fn.current());
      // Si se cortó la conexión, al volver se pide todo de nuevo por si se perdió algo
      socket.io.on("reconnect", () => fn.current());
    });
    window.addEventListener("iw:volver", alVolver);
    // Al regresar a la pestaña o a la app también se refresca
    const visible = () => { if (document.visibilityState === "visible") fn.current(); };
    document.addEventListener("visibilitychange", visible);
    return () => {
      cerrado = true;
      window.removeEventListener("iw:volver", alVolver);
      document.removeEventListener("visibilitychange", visible);
      socket?.disconnect();
    };
  }, []);
}
