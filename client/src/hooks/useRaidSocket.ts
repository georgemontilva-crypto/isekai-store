import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

/**
 * Conexión en vivo con el raid de la landing.
 *
 * Cada vez que alguien termina un ataque, el servidor manda el estado nuevo
 * del jefe y el daño de ese golpe. La conexión es anónima: no hace falta
 * cuenta y no viaja ningún dato personal.
 */
export type EstadoRaidVivo = { activo: true; vidaMax: number; vida: number; derrotado: boolean; cazadores: number };
export type GolpeRaidVivo = { golpes: number; quien: string };

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
    const socket: Socket = io(window.location.origin, {
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

    return () => { socket.disconnect(); };
  }, []);
}
