import crypto from "crypto";
import type { Express } from "express";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { bajasMarketing, campanaEnvios, campanas, cosplayers, orders, subscribers, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { APP_URL, emailTemplate, refrescarLogoCorreo } from "./_core/notification";

/**
 * Campañas de correo propias (el «Mailchimp» del panel).
 *
 * Seguridad:
 *  - Solo las usan administradores (lo controla el router).
 *  - Ningún texto entra como HTML: todo se escapa. Los enlaces deben ser https.
 *  - Cada correo lleva su enlace de baja firmado con HMAC (no se puede dar de
 *    baja a otra persona adivinando el enlace) y la cabecera de baja con un clic.
 *  - Una campaña no se puede lanzar dos veces: el paso a «enviando» es atómico
 *    y cada destinatario queda registrado, así al reanudar nadie recibe dos.
 */

export const SEGMENTOS = ["todos", "usuarios", "worldfest", "newsletter", "cosplayers", "compradores"] as const;
export type Segmento = typeof SEGMENTOS[number];

const LOTE = 100;
const PAUSA_MS = 700;
const FROM_POR_DEFECTO = "ISEKAI WORLD <noreply@isekaiworld.co>";
const EMAIL_VALIDO = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

// ─── Utilidades ────────────────────────────────────────────────────────────

const normalizar = (e: string | null | undefined) => String(e ?? "").trim().toLowerCase();

function escapar(t: string) {
  return t.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/** Solo URLs https (o el propio sitio). Devuelve "" si no es segura */
export function urlSegura(u: string | null | undefined): string {
  const v = String(u ?? "").trim();
  if (!v) return "";
  try {
    const url = new URL(v);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

// ─── Baja firmada ──────────────────────────────────────────────────────────

function firmaBaja(email: string) {
  return crypto.createHmac("sha256", ENV.cookieSecret || "isekai-campanas")
    .update(`baja-mkt:${email}`).digest("hex").slice(0, 32);
}
function enlaceBaja(email: string) {
  const e = Buffer.from(email, "utf8").toString("base64url");
  return `${APP_URL}/api/correo/baja?e=${e}&f=${firmaBaja(email)}`;
}

export function registerBajaCampanas(app: Express): void {
  const baja = async (req: any, res: any) => {
    let email = "";
    try { email = normalizar(Buffer.from(String(req.query.e ?? ""), "base64url").toString("utf8")); } catch { /* inválido */ }
    const f = String(req.query.f ?? "");
    const valido = EMAIL_VALIDO.test(email) && f.length === 32 &&
      crypto.timingSafeEqual(Buffer.from(f), Buffer.from(firmaBaja(email)));
    if (!valido) { res.status(400).send("Enlace no válido"); return; }
    const db = await getDb();
    if (db) await db.insert(bajasMarketing).values({ email }).onDuplicateKeyUpdate({ set: { email } });
    if (req.method === "POST") { res.status(200).send("ok"); return; }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isekai World</title></head>
<body style="margin:0;background:#06040d;color:#fff;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">
<div><p style="color:#a78bfa;letter-spacing:.3em;font-size:12px">[ SISTEMA ]</p>
<h1 style="font-size:24px">Listo. Ya no recibirás nuestras campañas.</h1>
<p style="color:#bbb">You won't receive our campaigns anymore.</p>
<p style="color:#bbb;font-size:14px">Los correos de tus pedidos y de tu cuenta te seguirán llegando.</p>
<a href="${APP_URL}" style="display:inline-block;margin-top:16px;background:#e5007d;color:#fff;padding:12px 28px;text-decoration:none;font-weight:700">Volver a Isekai World</a></div></body></html>`);
  };
  app.get("/api/correo/baja", baja);
  app.post("/api/correo/baja", baja);
}

// ─── Audiencias ────────────────────────────────────────────────────────────

async function correosDe(segmento: Segmento): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const lista: (string | null)[] = [];
  const agregar = (filas: { email: string | null }[]) => filas.forEach(f => lista.push(f.email));

  if (segmento === "todos" || segmento === "usuarios") {
    agregar(await db.select({ email: users.email }).from(users));
  }
  if (segmento === "todos" || segmento === "worldfest" || segmento === "newsletter") {
    const q = db.select({ email: subscribers.email }).from(subscribers);
    agregar(segmento === "todos" ? await q : await q.where(eq(subscribers.source, segmento)));
  }
  if (segmento === "cosplayers") {
    agregar(await db.select({ email: users.email }).from(cosplayers)
      .innerJoin(users, eq(users.id, cosplayers.userId)).where(eq(cosplayers.isActive, true)));
  }
  if (segmento === "compradores") {
    agregar(await db.select({ email: orders.customerEmail }).from(orders)
      .where(inArray(orders.paymentStatus, ["approved", "partial"])));
  }

  const bajas = new Set((await db.select({ email: bajasMarketing.email }).from(bajasMarketing)).map(b => normalizar(b.email)));
  const unicos = new Set<string>();
  for (const e of lista) {
    const n = normalizar(e);
    if (n && EMAIL_VALIDO.test(n) && !bajas.has(n)) unicos.add(n);
  }
  return Array.from(unicos);
}

export async function estadisticasAudiencia() {
  const db = await getDb();
  if (!db) return null;
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const [{ n: usuarios }] = await db.select({ n: sql<number>`COUNT(*)` }).from(users);
  const [{ n: nuevosMes }] = await db.select({ n: sql<number>`COUNT(*)` }).from(users).where(gte(users.createdAt, inicioMes));
  const [{ n: bajas }] = await db.select({ n: sql<number>`COUNT(*)` }).from(bajasMarketing);
  const porSegmento: Record<string, number> = {};
  for (const s of SEGMENTOS) porSegmento[s] = (await correosDe(s)).length;
  return { usuarios: Number(usuarios), nuevosMes: Number(nuevosMes), bajas: Number(bajas), porSegmento };
}

// ─── Plantilla ─────────────────────────────────────────────────────────────

export type ContenidoCampana = {
  asunto: string; preheader?: string | null; titulo: string; cuerpo: string;
  imagenUrl?: string | null; botonTexto?: string | null; botonUrl?: string | null;
};

export function htmlCampana(c: ContenidoCampana, bajaUrl: string): string {
  const imagen = urlSegura(c.imagenUrl);
  const botonUrl = urlSegura(c.botonUrl);
  const parrafos = escapar(c.cuerpo.trim())
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const content = `
    ${imagen ? `<img src="${escapar(imagen)}" alt="${escapar(c.titulo)}" width="100%" style="display:block;width:100%;height:auto;border:0;margin:0 0 24px"/>` : ""}
    <h1>${escapar(c.titulo)}</h1>
    ${parrafos}
    ${c.botonTexto && botonUrl ? `<div style="text-align:center"><a href="${escapar(botonUrl)}" class="btn">${escapar(c.botonTexto)}</a></div>` : ""}
    <hr class="divider"/>
    <p style="font-size:12px;color:#8a8494;line-height:1.6">Recibes este correo porque te registraste en Isekai World o te suscribiste a nuestras novedades.
    <a href="${bajaUrl}" style="color:#a39cad">Dejar de recibir estos correos</a>.</p>
  `;
  return emailTemplate(content, escapar(c.preheader || c.titulo));
}

/** Vista previa para el panel (con un enlace de baja de ejemplo) */
export async function vistaPrevia(c: ContenidoCampana) {
  await refrescarLogoCorreo();
  return htmlCampana(c, `${APP_URL}/api/correo/baja`);
}

// ─── Envío ─────────────────────────────────────────────────────────────────

async function enviarLote(correos: { to: string; subject: string; html: string; baja: string }[]):
  Promise<{ ok: boolean; status: number; error?: string }> {
  if (!ENV.resendApiKey) return { ok: false, status: 0, error: "RESEND_API_KEY no está configurada" };
  try {
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(correos.map(c => ({
        from: ENV.campanasFrom || FROM_POR_DEFECTO,
        to: [c.to],
        subject: c.subject,
        html: c.html,
        headers: { "List-Unsubscribe": `<${c.baja}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      }))),
    });
    if (r.ok) return { ok: true, status: r.status };
    return { ok: false, status: r.status, error: (await r.text().catch(() => "")).slice(0, 280) };
  } catch (e: any) {
    return { ok: false, status: 0, error: String(e?.message ?? e).slice(0, 280) };
  }
}

export async function enviarPrueba(c: ContenidoCampana, destino: string) {
  if (!EMAIL_VALIDO.test(normalizar(destino))) throw new Error("Tu cuenta no tiene un correo válido");
  await refrescarLogoCorreo();
  const baja = enlaceBaja(normalizar(destino));
  const r = await enviarLote([{ to: destino, subject: `[PRUEBA] ${c.asunto}`, html: htmlCampana(c, baja), baja }]);
  if (!r.ok) throw new Error(`Resend rechazó el envío (${r.status}): ${r.error ?? ""}`);
  return { ok: true };
}

const enCurso = new Set<number>();

/**
 * Lanza (o reanuda) el envío. El cambio a «enviando» es atómico: si ya se
 * está enviando o ya se envió, no hace nada. El trabajo sigue en segundo plano.
 */
export async function lanzarCampana(id: number): Promise<{ ok: boolean; motivo?: string; total?: number }> {
  const db = await getDb();
  if (!db) return { ok: false, motivo: "Sin base de datos" };
  const [r] = await db.execute(sql`
    UPDATE campanas SET estado = 'enviando', ultimoError = NULL
    WHERE id = ${id} AND estado IN ('borrador', 'interrumpida')
  `) as any;
  if (!r || Number(r.affectedRows) !== 1) return { ok: false, motivo: "La campaña ya se envió o se está enviando" };

  const [c] = await db.select().from(campanas).where(eq(campanas.id, id)).limit(1);
  const audiencia = await correosDe(c.segmento as Segmento);
  await db.update(campanas).set({ total: audiencia.length }).where(eq(campanas.id, id));
  if (!enCurso.has(id)) {
    enCurso.add(id);
    void procesar(id, audiencia).finally(() => enCurso.delete(id));
  }
  return { ok: true, total: audiencia.length };
}

async function procesar(id: number, audiencia: string[]) {
  const db = await getDb();
  if (!db) return;
  const [c] = await db.select().from(campanas).where(eq(campanas.id, id)).limit(1);
  if (!c) return;
  await refrescarLogoCorreo();

  const ya = new Set((await db.select({ email: campanaEnvios.email }).from(campanaEnvios)
    .where(eq(campanaEnvios.campanaId, id))).map(r => r.email));
  const pendientes = audiencia.filter(e => !ya.has(e));
  let enviados = ya.size;
  let fallidos = 0;

  for (let i = 0; i < pendientes.length; i += LOTE) {
    const lote = pendientes.slice(i, i + LOTE);
    const correos = lote.map(to => {
      const baja = enlaceBaja(to);
      return { to, subject: c.asunto, html: htmlCampana(c, baja), baja };
    });
    const r = await enviarLote(correos);
    if (r.ok) {
      await db.insert(campanaEnvios).values(lote.map(email => ({ campanaId: id, email })))
        .onDuplicateKeyUpdate({ set: { email: sql`email` } });
      enviados += lote.length;
    } else {
      // Límite o error de Resend: se pausa y queda para reanudar
      fallidos += lote.length;
      await db.update(campanas).set({
        estado: "interrumpida", enviados, fallidos,
        ultimoError: `Resend (${r.status}): ${r.error ?? "error"}`.slice(0, 300),
      }).where(eq(campanas.id, id));
      console.warn(`[Campañas] #${id} interrumpida:`, r.status, r.error);
      return;
    }
    await db.update(campanas).set({ enviados }).where(eq(campanas.id, id));
    await new Promise(res => setTimeout(res, PAUSA_MS));
  }
  await db.update(campanas).set({ estado: "enviada", enviados, fallidos: 0, enviadoEn: new Date() })
    .where(eq(campanas.id, id));
  console.log(`[Campañas] #${id} enviada a ${enviados} personas`);
}

/** Al arrancar el servidor: lo que quedó «enviando» pasa a «interrumpida» (se puede reanudar) */
export async function recuperarCampanasInterrumpidas() {
  try {
    const db = await getDb();
    if (!db) return;
    await db.update(campanas).set({ estado: "interrumpida", ultimoError: "El servidor se reinició durante el envío" })
      .where(eq(campanas.estado, "enviando"));
  } catch { /* tabla aún no creada */ }
}

// ─── CRUD ──────────────────────────────────────────────────────────────────

export async function listarCampanas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campanas).orderBy(desc(campanas.id)).limit(100);
}

export async function guardarCampana(datos: ContenidoCampana & { id?: number; segmento: Segmento }, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Sin base de datos");
  const valores = {
    asunto: datos.asunto, preheader: datos.preheader || null, titulo: datos.titulo, cuerpo: datos.cuerpo,
    imagenUrl: urlSegura(datos.imagenUrl) || null, botonTexto: datos.botonTexto || null,
    botonUrl: urlSegura(datos.botonUrl) || null, segmento: datos.segmento,
  };
  if (datos.id) {
    const [r] = await db.execute(sql`SELECT estado FROM campanas WHERE id = ${datos.id}`) as any;
    if (r?.[0]?.estado !== "borrador") throw new Error("Solo se pueden editar los borradores");
    await db.update(campanas).set(valores).where(and(eq(campanas.id, datos.id), eq(campanas.estado, "borrador")));
    return { id: datos.id };
  }
  const [ins] = await db.insert(campanas).values({ ...valores, creadoPor: userId }) as any;
  return { id: Number(ins.insertId) };
}

export async function borrarCampana(id: number) {
  const db = await getDb();
  if (!db) return { ok: false };
  await db.delete(campanas).where(and(eq(campanas.id, id), eq(campanas.estado, "borrador")));
  return { ok: true };
}
