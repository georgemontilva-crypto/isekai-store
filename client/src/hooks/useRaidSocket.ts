import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { cargarSocketIo } from "@/lib/socketCliente";

/**
 * Conexión en vivo con el raid de la landing.
 *
 * Cada vez que alguien termina un ataque, el servidor manda el estado nuevo
 * del jefe y el daño de ese golpe. La conexión es anónima: no hace falta
 * cuenta y no viaja ningún dato personal.
 */
export type EstadoRaidVivo = { activo: true; vidaMax: number; vida: number; derrotado: boolean; cazadores: number };
export type GolpeRaidVivo = { golpes: number; ref: string };

export function useRaidSocket(
  onEstado: (e: EstadoRaidVivo) => void,
  onGolpe: (g: GolpeRaidVivo) => void,
  onReconectar?: () => void,
) {
  const alEstado = useRef(onEstado);
  const alGolpe = useRef(onGolpe);
  const alReconectar = useRef(onReconectar);
  alEstado.current = onEstado;
  alGolpe.current = onGolpe;
  alReconectar.current = onReconectar;

  useEffect(() => {
    let socket: Socket | null = null;
    let cerrado = false;
    const alVolver = () => {
      if (socket && !socket.connected) socket.connect();
      alReconectar.current?.();
    };
    // La librería llega aparte: la portada se pinta primero
    void cargarSocketIo().then(({ io }) => {
      if (cerrado) return;
      socket = io(window.location.origin, {
        transports: ["websocket", "polling"],
        auth: { raid: true },
        reconnectionDelay: 800,
        reconnectionDelayMax: 5000,
      });
      socket.on("raid:estado", (e: EstadoRaidVivo) => alEstado.current(e));
      socket.on("raid:golpe", (g: GolpeRaidVivo) => alGolpe.current(g));
      // Tras una caída de la conexión se pide el estado de nuevo por si se
      // perdió algún aviso mientras tanto
      socket.io.on("reconnect", () => alReconectar.current?.());
    });

    // Al volver a la app: si el canal se cortó en segundo plano, se reconecta
    window.addEventListener("iw:volver", alVolver);
    return () => { cerrado = true; window.removeEventListener("iw:volver", alVolver); socket?.disconnect(); };
  }, []);
}
