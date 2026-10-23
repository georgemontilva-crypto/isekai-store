/**
 * Candado por clave dentro del servidor: dos operaciones sobre el mismo boleto
 * (dos porteros escaneándolo a la vez, dos estaciones dando EXP) se hacen una
 * detrás de otra, nunca al mismo tiempo. Sin esto, ambas leían «todavía no
 * entró» y las dos lo dejaban pasar.
 *
 * Railway corre una sola instancia del servidor, así que basta con esto; la
 * base de datos añade además un índice único como segunda barrera.
 */
const colas = new Map<string, Promise<unknown>>();

export async function conCandado<T>(clave: string, fn: () => Promise<T>): Promise<T> {
  const anterior = colas.get(clave) ?? Promise.resolve();
  let liberar!: () => void;
  const turno = new Promise<void>(r => { liberar = r; });
  const cadena = anterior.then(() => turno);
  colas.set(clave, cadena);
  await anterior.catch(() => {});
  try {
    return await fn();
  } finally {
    liberar();
    if (colas.get(clave) === cadena) colas.delete(clave);
  }
}
