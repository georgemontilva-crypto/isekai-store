/**
 * Proxy de medios de solo lectura.
 *
 * Las imágenes se sirven directo desde la URL pública de R2 (R2_PUBLIC_URL).
 * Este proxy existe para un caso puntual: cuando el navegador necesita LEER
 * los píxeles de una imagen (por ejemplo, para recortar el margen transparente
 * de la figura del hero). R2 no manda cabeceras CORS, así que un <canvas> con
 * la imagen original queda "contaminado". Pasándola por el mismo dominio no.
 *
 * Seguridad: solo acepta URLs que empiecen por R2_PUBLIC_URL (no es un proxy
 * abierto), solo devuelve imágenes y corta en 15 MB.
 */
import type { Express } from "express";
import { ENV } from "./env";

const MAX_BYTES = 15 * 1024 * 1024;

export function registerStorageProxy(app: Express): void {
  app.get("/api/media-proxy", async (req, res) => {
    const base = ENV.r2PublicUrl.replace(/\/+$/, "");
    const u = typeof req.query.u === "string" ? req.query.u : "";

    if (!base || !u || !u.startsWith(base + "/")) {
      res.status(400).send("URL no permitida");
      return;
    }

    try {
      const r = await fetch(u);
      if (!r.ok) {
        res.status(r.status).send("No encontrado");
        return;
      }
      const tipo = r.headers.get("content-type") ?? "";
      if (!tipo.startsWith("image/")) {
        res.status(415).send("Solo imágenes");
        return;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > MAX_BYTES) {
        res.status(413).send("Imagen demasiado grande");
        return;
      }
      res.setHeader("Content-Type", tipo);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(buf);
    } catch {
      res.status(502).send("Error al obtener la imagen");
    }
  });
}
