import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from "./_core/env";

/**
 * Antispam para formularios públicos.
 *
 * Va por capas, de la más barata a la más costosa. Las tres primeras no
 * requieren ninguna configuración ni servicio externo, y frenan a la enorme
 * mayoría de los bots, que rellenan formularios de forma automática:
 *
 *   1. Trampa (honeypot): un campo invisible que una persona nunca ve ni
 *      llena, pero que un bot completa porque lee el HTML.
 *   2. Tiempo mínimo: un humano tarda segundos en escribir su correo; un bot
 *      envía al instante.
 *   3. Límite por IP: aunque pase las anteriores, no puede repetir en masa.
 *   4. Cloudflare Turnstile (OPCIONAL): si están las variables de entorno,
 *      se verifica el token. Si no lo están, esta capa simplemente no aplica
 *      y las otras tres siguen funcionando.
 */

/** Campos que el cliente añade a cualquier formulario público */
export const antiSpamSchema = {
  /** Trampa: debe llegar vacío siempre */
  hp: z.string().max(200).optional(),
  /** Milisegundos que el formulario estuvo abierto antes de enviarse */
  elapsedMs: z.number().int().min(0).max(86_400_000).optional(),
  /** Token de Turnstile, solo si está configurado */
  captchaToken: z.string().max(4096).optional(),
};

export type AntiSpamInput = {
  hp?: string;
  elapsedMs?: number;
  captchaToken?: string;
};

/** Tiempo mínimo razonable entre abrir el formulario y enviarlo */
const MIN_ELAPSED_MS = 2500;

/** Memoria de envíos por IP. Se limpia sola. */
const hits = new Map<string, number[]>();

function checkRate(ip: string, max: number, windowMs: number) {
  const now = Date.now();
  const prev = (hits.get(ip) ?? []).filter(t => now - t < windowMs);
  prev.push(now);
  hits.set(ip, prev);

  // Limpieza oportunista para que el mapa no crezca sin control
  if (hits.size > 5000) {
    for (const [k, v] of Array.from(hits.entries())) {
      if (v.every((t: number) => now - t > windowMs)) hits.delete(k);
    }
  }
  return prev.length <= max;
}

async function verifyTurnstile(token: string | undefined, ip: string) {
  const secret = (ENV as any).turnstileSecretKey as string | undefined;
  if (!secret) return true; // No configurado: esta capa no aplica

  if (!token) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Verificación anti-spam incompleta" });
  }
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data = await res.json() as { success?: boolean };
    if (!data.success) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No pudimos verificar que eres una persona" });
    }
  } catch (e) {
    if (e instanceof TRPCError) throw e;
    // Si Cloudflare no responde, no bloqueamos al usuario: las otras capas siguen
    console.error("[AntiSpam] Turnstile no respondió:", e);
  }
  return true;
}

interface GuardOptions {
  /** Identificador del formulario, para separar los límites entre sí */
  form: string;
  /** Envíos permitidos por ventana */
  max?: number;
  /** Tamaño de la ventana en milisegundos */
  windowMs?: number;
}

/**
 * Ejecuta todas las capas. Lanza TRPCError si algo no cuadra.
 * Los mensajes son deliberadamente vagos: no conviene explicarle a un bot
 * qué capa lo detuvo.
 */
export async function guardPublicForm(
  input: AntiSpamInput,
  ip: string,
  { form, max = 5, windowMs = 10 * 60 * 1000 }: GuardOptions,
) {
  // 1. Trampa
  if (input.hp && input.hp.trim() !== "") {
    console.warn(`[AntiSpam] Honeypot activado en "${form}" desde ${ip}`);
    throw new TRPCError({ code: "BAD_REQUEST", message: "No pudimos procesar el envío" });
  }

  // 2. Tiempo mínimo
  if (input.elapsedMs !== undefined && input.elapsedMs < MIN_ELAPSED_MS) {
    console.warn(`[AntiSpam] Envío demasiado rápido en "${form}" desde ${ip}`);
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tómate un momento y vuelve a intentarlo" });
  }

  // 3. Límite por IP
  if (!checkRate(`${form}:${ip}`, max, windowMs)) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiados intentos. Espera unos minutos." });
  }

  // 4. Turnstile, solo si está configurado
  await verifyTurnstile(input.captchaToken, ip);
}

/** Saca la IP real del cliente detrás del proxy de Railway */
export function clientIp(req: any): string {
  const fwd = req?.headers?.["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req?.ip ?? req?.socket?.remoteAddress ?? "desconocida";
}

/**
 * Límite de intentos por usuario, sin honeypot ni tiempo mínimo.
 *
 * Para acciones de personas ya autenticadas (como escanear boletos) donde no
 * hay formulario público, pero sí conviene frenar el abuso: sin esto, una
 * tienda con acceso podría probar tokens al azar sin límite.
 */
const intentos = new Map<string, number[]>();

export function limitarPorUsuario(clave: string, max: number, ventanaMs: number) {
  const ahora = Date.now();
  const previos = (intentos.get(clave) ?? []).filter(t => ahora - t < ventanaMs);
  previos.push(ahora);
  intentos.set(clave, previos);

  // Limpieza para que el mapa no crezca sin control
  if (intentos.size > 5000) {
    intentos.forEach((v, k) => {
      if (!v.length || ahora - v[v.length - 1] > ventanaMs) intentos.delete(k);
    });
  }

  return previos.length <= max;
}
