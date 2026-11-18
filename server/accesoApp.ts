import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { sql, and, eq } from "drizzle-orm";
import type { Request } from "express";
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { getDb } from "./db";
import { users, stores, gateUsers, levelStaff } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { anfitrion } from "./_core/apps";
import { staffRuedaPorCorreo } from "./ruedaPrensa";

/**
 * Entrada a las apps aparte (Equipo y Admin).
 *
 * Solo entra el correo al que se le asignó el rol. La primera vez confirma
 * que el correo es suyo con el enlace de siempre y crea una clave; desde
 * entonces entra con correo y clave, o con Face ID / huella del teléfono.
 *
 *   appClaves  una clave por correo (guardada con scrypt, nunca en claro)
 *   appLlaves  las llaves biométricas (WebAuthn): una por teléfono
 */
export type AppConPuerta = "equipo" | "admin";

const filas = <T,>(r: unknown) => ((r as any)?.[0] ?? []) as T[];
const limpio = (correo: string) => correo.trim().toLowerCase();

export async function asegurarTablasAcceso() {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS appClaves (
      email varchar(254) NOT NULL PRIMARY KEY,
      hash varchar(255) NOT NULL,
      actualizadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS appLlaves (
      id int AUTO_INCREMENT PRIMARY KEY,
      email varchar(254) NOT NULL,
      credId varchar(700) CHARACTER SET ascii NOT NULL,
      clavePublica text NOT NULL,
      contador bigint NOT NULL DEFAULT 0,
      transportes varchar(120) NULL,
      dispositivo varchar(80) NULL,
      creadoEn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      usadoEn timestamp NULL,
      UNIQUE KEY uq_llave_cred (credId),
      INDEX idx_llave_email (email)
    )`);
  } catch (e) { console.error("[Acceso] No se pudieron crear las tablas:", e); }
}

// ── ¿Ese correo tiene un rol? ────────────────────────────────────────────────

/** Administrador: el dueño, o cualquier cuenta con ese correo marcada como admin */
export async function esAdminPorCorreo(email: string): Promise<boolean> {
  const correo = limpio(email);
  if (!correo) return false;
  if (ENV.ownerEmail && correo === ENV.ownerEmail.toLowerCase()) return true;
  const db = await getDb();
  if (!db) return false;
  const r = await db.select({ id: users.id }).from(users).where(and(eq(users.email, correo), eq(users.role, "admin"))).limit(1);
  return r.length > 0;
}

/**
 * ¿El correo puede entrar a esa app? La de Admin, solo administradores. La
 * del Equipo: tiendas, puerta, personal de EXP, rueda de negocios (y admin).
 */
export async function correoTieneAcceso(email: string, app: AppConPuerta): Promise<boolean> {
  const correo = limpio(email);
  if (!correo) return false;
  if (await esAdminPorCorreo(correo)) return true;
  if (app === "admin") return false;
  const db = await getDb();
  if (!db) return false;
  const [tiendas, porteros, personal, rueda] = await Promise.all([
    db.select({ id: stores.id, archivado: stores.archivado }).from(stores).where(eq(stores.email, correo)).catch(() => []),
    db.select({ id: gateUsers.id }).from(gateUsers).where(and(eq(gateUsers.email, correo), eq(gateUsers.active, true))).catch(() => []),
    db.select({ id: levelStaff.id }).from(levelStaff).where(and(eq(levelStaff.email, correo), eq(levelStaff.active, true))).catch(() => []),
    staffRuedaPorCorreo(correo).catch(() => null),
  ]);
  return tiendas.some(t => !t.archivado) || porteros.length > 0 || personal.length > 0 || Boolean(rueda);
}

// ── Clave ────────────────────────────────────────────────────────────────────

const derivar = (clave: string, sal: Buffer) =>
  new Promise<Buffer>((ok, mal) => scrypt(clave.normalize("NFKC"), sal, 64, (e, h) => (e ? mal(e) : ok(h))));

async function hashear(clave: string) {
  const sal = randomBytes(16);
  return `s1$${sal.toString("base64")}$${(await derivar(clave, sal)).toString("base64")}`;
}
async function coincide(clave: string, guardado: string) {
  const [v, sal, hash] = guardado.split("$");
  if (v !== "s1" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const dado = await derivar(clave, Buffer.from(sal, "base64"));
  return esperado.length === dado.length && timingSafeEqual(esperado, dado);
}

async function hashDe(correo: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  return filas<{ hash: string }>(await db.execute(sql`SELECT hash FROM appClaves WHERE email = ${correo} LIMIT 1`))[0]?.hash ?? null;
}
async function llavesDe(correo: string) {
  const db = await getDb();
  if (!db) return [];
  return filas<{ id: number; credId: string; clavePublica: string; contador: number; transportes: string | null }>(
    await db.execute(sql`SELECT id, credId, clavePublica, contador, transportes FROM appLlaves WHERE email = ${correo}`));
}

export async function guardarClave(email: string, clave: string) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const correo = limpio(email);
  const hash = await hashear(clave);
  await db.execute(sql`INSERT INTO appClaves (email, hash) VALUES (${correo}, ${hash}) ON DUPLICATE KEY UPDATE hash = ${hash}`);
  intentos.delete(correo);
}

/** Lo que la pantalla de entrada necesita saber de un correo */
export async function consultarCorreo(email: string, app: AppConPuerta) {
  const correo = limpio(email);
  if (!(await correoTieneAcceso(correo, app))) return { acceso: false as const, tieneClave: false, tieneLlave: false };
  const [hash, llaves] = await Promise.all([hashDe(correo), llavesDe(correo)]);
  return { acceso: true as const, tieneClave: Boolean(hash), tieneLlave: llaves.length > 0 };
}

export async function estadoDeCuenta(email: string) {
  const correo = limpio(email);
  const [hash, llaves] = await Promise.all([hashDe(correo), llavesDe(correo)]);
  return { tieneClave: Boolean(hash), llaves: llaves.length };
}

/* Freno a quien prueba claves: 6 fallos seguidos con un correo lo dejan 15
   minutos sin poder entrar con clave (el enlace al correo sigue sirviendo). */
const MAX_FALLOS = 6;
const CASTIGO_MS = 15 * 60_000;
const intentos = new Map<string, { fallos: number; hasta: number }>();

export type ResultadoClave =
  | { ok: true; email: string }
  | { ok: false; motivo: "sin_acceso" | "sin_clave" | "bloqueado" }
  | { ok: false; motivo: "clave"; quedan: number };

export async function entrarConClave(email: string, clave: string, app: AppConPuerta): Promise<ResultadoClave> {
  const correo = limpio(email);
  const freno = intentos.get(correo);
  if (freno && freno.hasta > Date.now()) return { ok: false, motivo: "bloqueado" };
  if (!(await correoTieneAcceso(correo, app))) return { ok: false, motivo: "sin_acceso" };
  const hash = await hashDe(correo);
  if (!hash) return { ok: false, motivo: "sin_clave" };
  if (await coincide(clave, hash)) { intentos.delete(correo); return { ok: true, email: correo }; }
  const fallos = (freno && freno.hasta === 0 ? freno.fallos : 0) + 1;
  if (fallos >= MAX_FALLOS) { intentos.set(correo, { fallos: 0, hasta: Date.now() + CASTIGO_MS }); return { ok: false, motivo: "bloqueado" }; }
  intentos.set(correo, { fallos, hasta: 0 });
  return { ok: false, motivo: "clave", quedan: MAX_FALLOS - fallos };
}

// ── Face ID / huella (WebAuthn) ──────────────────────────────────────────────

/**
 * Dominio al que quedan atadas las llaves. En producción es isekaiworld.co
 * entero, así la misma llave abre la app del Equipo y la de Admin. En otra
 * dirección (la de Railway) no hay biometría.
 */
function dominio(req: Request): { rpID: string; origen: string } | null {
  const h = anfitrion(req);
  if (h === "isekaiworld.co" || h.endsWith(".isekaiworld.co")) return { rpID: "isekaiworld.co", origen: `https://${h}` };
  if (h === "localhost" || h.endsWith(".localhost")) return { rpID: h, origen: `http://${req.headers.host}` };
  return null;
}
export const hayBiometria = (req: Request) => Boolean(dominio(req));

/** Retos pendientes: valen 5 minutos y un solo uso */
const retos = new Map<string, { reto: string; hasta: number }>();
function guardarReto(clave: string, reto: string) {
  const ahora = Date.now();
  if (retos.size > 5000) retos.forEach((v, k) => { if (v.hasta < ahora) retos.delete(k); });
  retos.set(clave, { reto, hasta: ahora + 5 * 60_000 });
}
function tomarReto(clave: string): string | null {
  const r = retos.get(clave);
  retos.delete(clave);
  return r && r.hasta > Date.now() ? r.reto : null;
}

export async function opcionesDeRegistro(req: Request, email: string) {
  const d = dominio(req);
  if (!d) throw new Error("La entrada con huella o rostro no está disponible en esta dirección");
  const correo = limpio(email);
  const ya = await llavesDe(correo);
  const opciones = await generateRegistrationOptions({
    rpName: "Isekai World",
    rpID: d.rpID,
    userName: correo,
    userID: new TextEncoder().encode(correo) as any,
    attestationType: "none",
    excludeCredentials: ya.map(l => ({ id: l.credId, transports: l.transportes ? (l.transportes.split(",") as any) : undefined })),
    // La llave vive en el teléfono y pide rostro, huella o el código del equipo
    authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" },
  });
  guardarReto(`alta:${correo}`, opciones.challenge);
  return opciones;
}

export async function registrarLlave(req: Request, email: string, respuesta: any, dispositivo: string) {
  const d = dominio(req);
  const correo = limpio(email);
  const reto = tomarReto(`alta:${correo}`);
  if (!d || !reto) throw new Error("La solicitud venció. Inténtalo otra vez.");
  const v = await verifyRegistrationResponse({ response: respuesta, expectedChallenge: reto, expectedOrigin: d.origen, expectedRPID: d.rpID, requireUserVerification: true });
  if (!v.verified || !v.registrationInfo) throw new Error("No se pudo confirmar la huella o el rostro.");
  const c = v.registrationInfo.credential;
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db.execute(sql`INSERT INTO appLlaves (email, credId, clavePublica, contador, transportes, dispositivo)
    VALUES (${correo}, ${c.id}, ${Buffer.from(c.publicKey).toString("base64url")}, ${c.counter}, ${(c.transports ?? []).join(",") || null}, ${dispositivo.slice(0, 80) || null})
    ON DUPLICATE KEY UPDATE email = ${correo}`);
}

export async function opcionesDeEntrada(req: Request) {
  const d = dominio(req);
  if (!d) throw new Error("La entrada con huella o rostro no está disponible en esta dirección");
  // Sin lista de llaves: el teléfono ofrece la que tenga guardada para este sitio
  const opciones = await generateAuthenticationOptions({ rpID: d.rpID, userVerification: "required" });
  const id = randomBytes(18).toString("base64url");
  guardarReto(`entra:${id}`, opciones.challenge);
  return { id, opciones };
}

export type ResultadoLlave = { ok: true; email: string } | { ok: false; motivo: "sin_acceso" | "desconocida" | "vencida" };

export async function entrarConLlave(req: Request, id: string, respuesta: any, app: AppConPuerta): Promise<ResultadoLlave> {
  const d = dominio(req);
  const reto = tomarReto(`entra:${id}`);
  if (!d || !reto) return { ok: false, motivo: "vencida" };
  const db = await getDb();
  if (!db) return { ok: false, motivo: "vencida" };
  const credId = String(respuesta?.id ?? "");
  const llave = filas<{ id: number; email: string; clavePublica: string; contador: number; transportes: string | null }>(
    await db.execute(sql`SELECT id, email, clavePublica, contador, transportes FROM appLlaves WHERE credId = ${credId} LIMIT 1`))[0];
  if (!llave) return { ok: false, motivo: "desconocida" };
  let v;
  try {
    v = await verifyAuthenticationResponse({
      response: respuesta, expectedChallenge: reto, expectedOrigin: d.origen, expectedRPID: d.rpID, requireUserVerification: true,
      credential: { id: credId, publicKey: new Uint8Array(Buffer.from(llave.clavePublica, "base64url")) as any, counter: Number(llave.contador), transports: llave.transportes ? (llave.transportes.split(",") as any) : undefined },
    });
  } catch (e) { console.warn("[Acceso] Llave rechazada:", (e as Error).message); return { ok: false, motivo: "desconocida" }; }
  if (!v.verified) return { ok: false, motivo: "desconocida" };
  // El rol se comprueba en cada entrada: si se lo quitaron, la llave ya no abre
  if (!(await correoTieneAcceso(llave.email, app))) return { ok: false, motivo: "sin_acceso" };
  await db.execute(sql`UPDATE appLlaves SET contador = ${v.authenticationInfo.newCounter}, usadoEn = NOW() WHERE id = ${llave.id}`);
  return { ok: true, email: llave.email };
}
