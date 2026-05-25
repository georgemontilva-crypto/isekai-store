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
      origin: ENV.appUrl || 'https://isekaiworld.co',
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const cookies = parseCookie(cookieHeader);
      const token = cookies[COOKIE_NAME];
      if (!token) return next(new Error("No autenticado"));

      const session = await verifySession(token);
      if (!session) return next(new Error("Token inválido"));

      const user = await db.getUserByOpenId(session.openId);
      if (!user) return next(new Error("Usuario no encontrado"));

      socket.data.userId = user.id;
      socket.join(`user:${user.id}`);
      next();
    } catch {
      next(new Error("Error de autenticación"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {});
  });

  return io;
}
