import "dotenv/config";
import { validateEnv } from "./env";
validateEnv();
console.log('[DB] DATABASE_URL configured:', !!process.env.DATABASE_URL);
console.log('[DB] DATABASE_URL prefix:', process.env.DATABASE_URL?.slice(0, 20));
import crypto from "crypto";
import express from "express";
import compression from "compression";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initSocket, io } from "./socket";
import { ENV } from "./env";
import * as db from "../db";
import { notifyCustomerOrderStatus } from "./notification";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);


  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use((_req, res, next) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    const isHttps = req.secure || proto === 'https' || (Array.isArray(proto) && proto[0] === 'https');
    if (isHttps) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Rate limiting
  app.use('/api/auth/magic-link', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Demasiados intentos. Espera 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
  }));
  app.use('/api/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }));
  // Subida de comprobantes sin sesión (checkout de invitados)
  app.use('/api/trpc/orders.uploadReceiptPublic', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Demasiadas subidas. Espera unos minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Gzip compression
  app.use(compression());

  // Cache headers for static file extensions
  app.use((req, res, next) => {
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    next();
  });

  // Dynamic sitemap
  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const [products, categories, blogPostsData] = await Promise.all([
        db.getProducts({ limit: 1000 }).catch(() => ({ items: [] })),
        db.getAllCategories().catch(() => []),
        db.getBlogPosts({ status: 'published', limit: 500 }).catch(() => []),
      ]);
      const items = (products as any)?.items ?? products ?? [];
      const cats = Array.isArray(categories) ? categories : [];
      const urls = [
        { loc: 'https://isekaiworld.co/', priority: '1.0' },
        { loc: 'https://isekaiworld.co/catalog', priority: '0.9' },
        { loc: 'https://isekaiworld.co/blog', priority: '0.8' },
        { loc: 'https://isekaiworld.co/nosotros', priority: '0.7' },
        { loc: 'https://isekaiworld.co/faq', priority: '0.6' },
        ...items.map((p: any) => ({ loc: `https://isekaiworld.co/product/${p.slug}`, priority: '0.8' })),
        ...cats.map((c: any) => ({ loc: `https://isekaiworld.co/catalog?category=${c.slug}`, priority: '0.7' })),
        ...(blogPostsData as any[]).map((p: any) => ({ loc: `https://isekaiworld.co/blog/${p.slug}`, priority: '0.7' })),
      ];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <priority>${u.priority}</priority>\n    <changefreq>weekly</changefreq>\n  </url>`).join('\n')}\n</urlset>`;
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch {
      res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
    }
  });

  // Long-lived cache for hashed static assets
  app.use('/assets', (_req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  initSocket(server);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
