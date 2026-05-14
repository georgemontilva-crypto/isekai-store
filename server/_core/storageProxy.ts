/**
 * Storage proxy — sin operación.
 *
 * Con Cloudflare R2 las imágenes se sirven directamente desde la URL pública
 * del bucket (R2_PUBLIC_URL). No se necesita proxy en el servidor.
 *
 * Se mantiene el archivo para no romper el import en index.ts.
 */
import type { Express } from "express";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerStorageProxy(_app: Express): void {
  // No-op: R2 sirve archivos directamente vía URL pública.
}
