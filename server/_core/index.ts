import "dotenv/config";
import { validateEnv } from "./env";
validateEnv();
import crypto from "crypto";
import express from "express";
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

  // Bold webhook — registered before global body parsers to preserve raw body for HMAC verification
  app.post("/api/webhooks/bold", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const signature = req.headers["x-bold-signature"] as string;
      const secret = ENV.boldSecretKey;
      const hmac = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
      if (signature !== hmac) {
        return res.status(401).json({ error: "Invalid signature" });
      }
      const payload = JSON.parse(req.body.toString());
      if (payload.status === "APPROVED") {
        const orderNumber = payload.order_id ?? payload.reference;
        await db.updateOrderPaymentStatus(orderNumber, "paid");
        const order = await db.getOrderByNumber(orderNumber);
        if (order?.customerEmail) {
          await notifyCustomerOrderStatus(
            order.customerEmail,
            order.customerName,
            orderNumber,
            "¡Pago confirmado!",
            "Tu pago fue verificado. Tu orden pasa a producción."
          );
        }
        if (order?.userId) {
          io.to(`user:${order.userId}`).emit("order:updated", { orderId: order.id });
          io.to(`user:${order.userId}`).emit("notification:new");
        }
      }
      res.json({ received: true });
    } catch (err) {
      console.error("[Bold webhook]", err);
      res.status(500).json({ error: "Webhook error" });
    }
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
