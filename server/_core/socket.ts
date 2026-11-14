import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { verifySession } from "./sdk";
import * as db from "../db";
import { ENV } from "./env";

export let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      // La web vive en www; el dominio sin www redirige ahí
      origin: [ENV.appUrl, 'https://www.isekaiworld.co', 'https://isekaiworld.co'].filter(Boolean),
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const cookies = parseCookie(cookieHeader);
      const token = cookies[COOKIE_NAME];
      /**
       * Sala del boleto: quien mira su Level Pass recibe ahí sus puntos al
       * instante. Se entra SIEMPRE que venga un código, tenga sesión o no —
       * antes solo se hacía sin sesión, así que al probarlo desde una cuenta
       * iniciada el aviso nunca llegaba.
       */
      /**
       * Sala del raid de la landing: es pública (los visitantes no tienen
       * cuenta) y solo recibe el estado del jefe, nunca datos personales.
       */
      // Venta de stands: aviso público de que algo cambió (sin datos personales)
      if (socket.handshake.auth?.stands === true) {
        socket.join("stands");
        return next();
      }
      if (socket.handshake.auth?.raid === true) {
        // Esta conexión solo escucha al jefe: no necesita (ni valida) sesión,
        // así una cookie vencida no la corta
        socket.join("raid");
        return next();
      }

      /**
       * Batalla en vivo contra Koi-sama: cualquiera puede mirar la vida del
       * jefe; para que sus golpes cuenten hace falta sesión (y registrarse).
       */
      if (socket.handshake.auth?.koi === true) {
        socket.join("koi");
        if (token) {
          try {
            const sesion = await verifySession(token);
            const u = sesion ? await db.getUserByOpenId(sesion.openId) : null;
            if (u) socket.data.userId = u.id;
          } catch { /* mira sin jugar */ }
        }
        return next();
      }

      const boleto = String(socket.handshake.auth?.boleto ?? "").trim();
      if (boleto) {
        socket.data.boleto = boleto.toUpperCase();
        socket.join(`boleto:${boleto.toUpperCase()}`);
        // Sin sesión, la conexión se queda solo con esa sala
        if (!token) return next();
      }

      if (!token) return next(new Error("No autenticado"));

      const session = await verifySession(token);
      if (!session) return next(new Error("Token inválido"));

      const user = await db.getUserByOpenId(session.openId);
      if (!user) return next(new Error("Usuario no encontrado"));

      socket.data.userId = user.id;
      socket.join(`user:${user.id}`);
      // Sala común de administración: por ahí van los avisos del panel
      if (user.role === "admin") socket.join("admin");
      next();
    } catch {
      next(new Error("Error de autenticación"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {});
    // Koi-sama: lotes de toques. Solo cuentan con sesión y registro.
    socket.on("koi:golpes", (n: unknown, responder?: (r: unknown) => void) => {
      const userId = socket.data.userId as number | undefined;
      const toques = Number(n);
      if (!userId || !Number.isFinite(toques) || toques <= 0 || toques > 200) { responder?.({ ok: false }); return; }
      void import("../bossKoi").then(m => responder?.(m.golpear(userId, toques))).catch(() => responder?.({ ok: false }));
    });
  });

  return io;
}
