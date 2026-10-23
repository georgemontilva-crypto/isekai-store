/**
 * La librería del canal en vivo (socket.io) pesa ~40 KB comprimida y solo la
 * necesitan quienes tienen sesión, el raid y el Level Pass. Se descarga la
 * primera vez que se usa, no con la portada.
 */
let modulo: Promise<typeof import("socket.io-client")> | null = null;
export function cargarSocketIo() {
  if (!modulo) modulo = import("socket.io-client");
  return modulo;
}
