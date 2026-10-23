import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await conIconoOficial(await vite.transformIndexHtml(url, template));
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}


/**
 * La vista previa al compartir el enlace (WhatsApp, Instagram, Facebook…) usa
 * la imagen de las etiquetas og:image / twitter:image del HTML. Antes era una
 * dirección fija con el ícono viejo; ahora se pone el ícono oficial subido en
 * el panel (Medios → «Ícono oficial de la marca»; si no hay, el favicon).
 */
const ICONO_VIEJO = "https://pub-c4fd9395c33848c3be4160fe5f9532a4.r2.dev/isekai-world/banner/Favicon-11%20grande-11.png";
let iconoCache: { url: string; hasta: number } | null = null;
async function iconoOficial(): Promise<string> {
  if (iconoCache && iconoCache.hasta > Date.now()) return iconoCache.url;
  let url = "";
  try {
    const { getSetting } = await import("../db");
    url = (await getSetting("icono_oficial")) || (await getSetting("favicon_url")) || (await getSetting("pwa_icon_url")) || "";
  } catch { /* sin base de datos: se queda el de respaldo */ }
  url = /^https:\/\//i.test(url) ? url : ICONO_VIEJO;
  iconoCache = { url, hasta: Date.now() + 60_000 };
  return url;
}
async function conIconoOficial(html: string): Promise<string> {
  const url = await iconoOficial();
  if (url === ICONO_VIEJO) return html;
  const seguro = url.replace(/"/g, "%22").replace(/</g, "%3C").replace(/>/g, "%3E");
  return html.split(ICONO_VIEJO).join(seguro);
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // index: false → la portada también pasa por abajo y lleva el ícono oficial
  app.use(express.static(distPath, { index: false }));

  // fall through to index.html if the file doesn't exist
  let plantilla: string | null = null;
  app.use("*", async (_req, res) => {
    try {
      if (plantilla === null) plantilla = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf-8");
      res.status(200).set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }).end(await conIconoOficial(plantilla));
    } catch {
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });
}
