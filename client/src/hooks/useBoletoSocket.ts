import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

/**
 * Conexión en vivo para el asistente del evento.
 *
 * El asistente no tiene cuenta: se identifica solo con el código de su
 * boleto. Esta conexión sirve para que su pantalla reciba los puntos en el
 * momento en que se los otorgan, sin esperar a la siguiente consulta.
 */
export function useBoletoSocket(codigo: string, onXp: (datos: any) => void) {
  const alRecibir = useRef(onXp);
  alRecibir.current = onXp;

  useEffect(() => {
    if (!codigo || codigo.length < 4) return;

    const socket: Socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      auth: { boleto: codigo.toUpperCase() },
      // Reconexión rápida: en un evento la señal va y viene, y esperar varios
      // segundos a que vuelva la conexión se nota como si nada funcionara.
      reconnectionDelay: 400,
      reconnectionDelayMax: 2000,
      timeout: 6000,
    });

    socket.on("levelpass:xp", (datos: any) => alRecibir.current(datos));

    return () => { socket.disconnect(); };
  }, [codigo]);
}
