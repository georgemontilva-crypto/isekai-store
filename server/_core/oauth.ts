import { randomBytes } from "crypto";
import type { Express, Request, Response } from "express";
import axios from "axios";
import { COOKIE_NAME } from "@shared/const";
import { signSession } from "./sdk";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { notifyWelcome, sendMagicLinkEmail } from "./notification";
import * as db from "../db";

const GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_INFO_URL  = "https://www.googleapis.com/oauth2/v2/userinfo";
const SESSION_MAX_AGE  = 365 * 24 * 60 * 60 * 1000; // 1 year

function callbackUrl() {
  const url = `${ENV.appUrl}/api/auth/google/callback`;
  console.log("[OAuth] APP_URL env:", process.env.APP_URL);
  console.log("[OAuth] callbackUrl:", url);
  return url;
}

function isOwner(email: string | null | undefined): boolean {
  return Boolean(ENV.ownerEmail && email && email.toLowerCase() === ENV.ownerEmail.toLowerCase());
}

async function setSessionCookie(req: Request, res: Response, openId: string, name: string) {
  const token = await signSession({ openId, name });
  res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(req),
    maxAge: SESSION_MAX_AGE,
  });
}

export function registerOAuthRoutes(app: Express): void {

  // ── GET /api/auth/google ─────────────────────────────────────────────────────
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      return res.status(503).json({ error: "Google OAuth no configurado" });
    }
    const params = new URLSearchParams({
      client_id:     ENV.googleClientId,
      redirect_uri:  callbackUrl(),
      response_type: "code",
      scope:         "openid email profile",
      access_type:   "offline",
      prompt:        "select_account",
    });
    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  // ── GET /api/auth/google/callback ────────────────────────────────────────────
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const { code } = req.query;
    if (!code || typeof code !== "string") return res.redirect("/?auth=error");

    try {
      const { data: tokens } = await axios.post(GOOGLE_TOKEN_URL, {
        code,
        client_id:     ENV.googleClientId,
        client_secret: ENV.googleClientSecret,
        redirect_uri:  callbackUrl(),
        grant_type:    "authorization_code",
      });

      const { data: profile } = await axios.get(GOOGLE_INFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      const { id, email, name } = profile as { id: string; email: string; name: string };
      const openId = `google:${id}`;

      const existingUser = await db.getUserByOpenId(openId);
      await db.upsertUser({
        openId,
        email,
        name,
        loginMethod: "google",
        role:        isOwner(email) ? "admin" : "user",
        lastSignedIn: new Date(),
      });
      if (!existingUser) {
        notifyWelcome(email, name).catch((e) => console.warn("[Auth] Welcome email error:", e));
      }

      await setSessionCookie(req, res, openId, name ?? "");
      res.redirect("/?welcome=1");
    } catch (err) {
      console.error("[Auth] Google callback error:", err);
      res.redirect("/?auth=error");
    }
  });

  // ── POST /api/auth/magic-link ────────────────────────────────────────────────
  app.post("/api/auth/magic-link", async (req: Request, res: Response) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : null;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email inválido" });
    }

    try {
      const token     = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      await db.createAuthToken({ token, email, type: "magic_link", expiresAt });

      const verifyUrl = `${ENV.appUrl}/api/auth/verify?token=${token}`;

      if (!ENV.resendApiKey) {
        return res.status(503).json({ error: "El servicio de email no está disponible en este momento" });
      }

      await sendMagicLinkEmail(email, verifyUrl);

      res.json({ success: true });
    } catch (err) {
      console.error("[Auth] Magic link error:", err);
      res.status(500).json({ error: "Error al enviar el correo" });
    }
  });

  // ── GET /api/auth/verify ─────────────────────────────────────────────────────
  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") return res.redirect("/?auth=error");

    try {
      const record = await db.getAuthToken(token);
      if (!record || record.used || new Date() > record.expiresAt) {
        return res.redirect("/?auth=expired");
      }
      await db.markAuthTokenUsed(token);

      const email  = record.email;
      const openId = `magic:${email}`;
      const name   = email.split("@")[0];

      const existingUser = await db.getUserByOpenId(openId);
      await db.upsertUser({
        openId,
        email,
        name,
        loginMethod: "magic_link",
        role:        isOwner(email) ? "admin" : "user",
        lastSignedIn: new Date(),
      });
      if (!existingUser) {
        notifyWelcome(email, name).catch((e) => console.warn("[Auth] Welcome email error:", e));
      }

      await setSessionCookie(req, res, openId, name);
      res.redirect("/?welcome=1");
    } catch (err) {
      console.error("[Auth] Verify error:", err);
      res.redirect("/?auth=error");
    }
  });

  // ── POST /api/auth/logout ────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
    res.json({ success: true });
  });
}
