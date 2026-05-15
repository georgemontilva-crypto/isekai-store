/**
 * Session helper — reemplaza el SDK de Manus.
 *
 * Maneja firma y verificación de JWT de sesión usando jose.
 * El flujo de login (Google OAuth2 / Magic Link) se implementa en oauth.ts.
 */

import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  openId: string;  // mantenemos "openId" para no migrar la DB
  name:   string;
};

export type AuthenticatedUser = User;

function getSecret(): Uint8Array {
  return new TextEncoder().encode(ENV.cookieSecret);
}

function parseCookies(header: string | undefined): Map<string, string> {
  if (!header) return new Map();
  return new Map(Object.entries(parseCookieHeader(header)));
}

export async function signSession(
  payload: SessionPayload,
  options: { expiresInMs?: number } = {}
): Promise<string> {
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);

  return new SignJWT({ openId: payload.openId, name: payload.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSecret());
}

export async function verifySession(
  cookieValue: string | undefined | null
): Promise<{ openId: string; name: string } | null> {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSecret(), {
      algorithms: ["HS256"],
    });
    const { openId, name } = payload as Record<string, unknown>;
    if (typeof openId !== "string" || !openId) return null;
    return { openId, name: typeof name === "string" ? name : "" };
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: Request): Promise<AuthenticatedUser | null> {
  const cookies    = parseCookies(req.headers.cookie);
  const cookieVal  = cookies.get(COOKIE_NAME);
  const session    = await verifySession(cookieVal);

  console.log("[sdk] session:", session);

  if (!session) return null;

  const user = await db.getUserByOpenId(session.openId);

  console.log("[sdk] user found:", user?.email ?? "null");

  return user ?? null;
}

// Exportamos sdk como objeto para no romper imports existentes
export const sdk = {
  signSession,
  verifySession,
  authenticateRequest,
  /** Alias para compatibilidad con código existente */
  createSessionToken: (openId: string, options: { name?: string; expiresInMs?: number } = {}) =>
    signSession({ openId, name: options.name ?? "" }, options),
};
