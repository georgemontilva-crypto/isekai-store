import crypto from "crypto";
import type { Express } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { siteSettings, wfRaid, wfRaidBajas } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { APP_URL, emailTemplate, refrescarLogoCorreo } from "./_core/notification";

/**
 * Correos del raid comunitario.
 *
 * 1. Recordatorio diario (10:00 a. m. de Venezuela): «tu ataque se recargó».
 *    Solo a quien ya atacó alguna vez a este jefe, todavía no atacó hoy y no
 *    pidió la baja. Cada correo trae un enlace para dejar de recibirlos.
 *
 * 2. Premio en conjunto: cuando el jefe cae, a TODOS los que participaron,
 *    con su aporte personal y el texto del premio que se configure.
 *
 * Una revisión cada 5 minutos decide si toca enviar algo. Cada envío se
 * «reserva» antes de mandar (la fecha del recordatorio, la marca del
 * premio), así un reinicio del servidor no duplica correos.
 */

const HORA_RECORDATORIO = 10; // hora de Venezuela
const LOTE = 100;             // máximo de Resend por llamada
const FROM = "ISEKAI WORLD <noreply@isekaiworld.co>";

function diaVenezuela(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
function horaVenezuela(): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", hour: "numeric", hourCycle: "h23" }).format(new Date()));
}
function escapar(t: string) {
  return t.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
const numero = (n: number) => n.toLocaleString("es-VE");

// ─── Baja de recordatorios ─────────────────────────────────────────────────

function firma(userId: number): string {
  return crypto.createHmac("sha256", ENV.cookieSecret || "isekai-raid")
    .update(`raid-baja:${userId}`).digest("hex").slice(0, 32);
}
function enlaceBaja(userId: number): string {
  return `${APP_URL}/api/raid/baja?u=${userId}&f=${firma(userId)}`;
}

/** Enlace de baja (GET desde el correo y POST «un clic» de Gmail/Apple Mail) */
export function registerRaidCorreos(app: Express): void {
  const baja = async (req: any, res: any) => {
    const u = Number(req.query.u);
    const f = String(req.query.f ?? "");
    const valido = Number.isInteger(u) && u > 0 && f.length === 32 &&
      crypto.timingSafeEqual(Buffer.from(f), Buffer.from(firma(u)));
    if (!valido) { res.status(400).send("Enlace no válido"); return; }
    const db = await getDb();
    if (db) {
      await db.insert(wfRaidBajas).values({ userId: u }).onDuplicateKeyUpdate({ set: { userId: u } });
    }
    if (req.method === "POST") { res.status(200).send("ok"); return; }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Isekai World</title></head><body style="margin:0;background:#06040d;color:#fff;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">
<div><p style="color:#a78bfa;letter-spacing:.3em;font-size:12px">[ SISTEMA ]</p>
<h1 style="font-size:24px">Listo. Ya no recibirás los recordatorios del raid.</h1>
<p style="color:#bbb">You won't receive raid reminders anymore.</p>
<p style="color:#bbb;font-size:14px">Si el jefe cae, igual te avisaremos de tu recompensa.</p>
<a href="${APP_URL}" style="display:inline-block;margin-top:16px;background:#e5007d;color:#fff;padding:12px 28px;text-decoration:none;font-weight:700">Volver a Isekai World</a></div></body></html>`);
  };
  app.get("/api/raid/baja", baja);
  app.post("/api/raid/baja", baja);
}

// ─── Envío por lotes ───────────────────────────────────────────────────────

type Correo = { to: string; subject: string; html: string; baja?: string };

async function enviarLotes(correos: Correo[]): Promise<number> {
  return (await enviarLotesDetalle(correos)).enviados;
}

/** Envía por lotes y devuelve cuántos salieron y a quién no le llegó */
async function enviarLotesDetalle(correos: Correo[]): Promise<{ enviados: number; fallidos: string[] }> {
  if (correos.length === 0) return { enviados: 0, fallidos: [] };
  if (!ENV.resendApiKey) return { enviados: 0, fallidos: correos.map(c => c.to) };
  let enviados = 0;
  const fallidos: string[] = [];
  for (let i = 0; i < correos.length; i += LOTE) {
    const lote = correos.slice(i, i + LOTE).map(c => ({
      from: FROM,
      to: [c.to],
      subject: c.subject,
      html: c.html,
      ...(c.baja ? { headers: { "List-Unsubscribe": `<${c.baja}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
    }));
    try {
      const r = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(lote),
      });
      if (r.ok) enviados += lote.length;
      else {
        fallidos.push(...lote.map(l => l.to[0]));
        console.warn(`[Raid correos] Resend (${r.status}):`, await r.text().catch(() => ""));
      }
    } catch (e) {
      fallidos.push(...lote.map(l => l.to[0]));
      console.warn("[Raid correos] Error de envío:", e);
    }
    await new Promise(r => setTimeout(r, 700)); // respeta el límite de Resend
  }
  return { enviados, fallidos };
}

// ─── Ajustes (siteSettings) ────────────────────────────────────────────────

async function leerAjuste(clave: string): Promise<string> {
  const db = await getDb();
  if (!db) return "";
  const [f] = await db.select({ v: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, clave)).limit(1);
  return f?.v ?? "";
}
async function guardarAjuste(clave: string, valor: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(siteSettings).values({ key: clave, value: valor })
    .onDuplicateKeyUpdate({ set: { value: valor } });
}

// ─── Participantes ─────────────────────────────────────────────────────────

type Participante = { id: number; email: string; nombre: string; danio: number; ataques: number; atacoHoy: number; baja: number };

async function participantes(raidId: number): Promise<Participante[]> {
  const db = await getDb();
  if (!db) return [];
  const hoy = diaVenezuela();
  const [filas] = await db.execute(sql`
    SELECT u.id AS id, u.email AS email, COALESCE(u.name, '') AS nombre,
           SUM(a.golpes) AS danio, COUNT(*) AS ataques,
           MAX(a.dia = ${hoy}) AS atacoHoy,
           MAX(b.userId IS NOT NULL) AS baja
    FROM wfRaidAtaques a
    JOIN users u ON a.clave = CONCAT('u', u.id)
    LEFT JOIN wfRaidBajas b ON b.userId = u.id
    WHERE a.raidId = ${raidId} AND a.clave LIKE 'u%' AND u.email IS NOT NULL AND u.email <> ''
    GROUP BY u.id, u.email, u.name
  `) as unknown as [Participante[]];
  return (filas ?? []).map(f => ({
    ...f, danio: Number(f.danio), ataques: Number(f.ataques), atacoHoy: Number(f.atacoHoy), baja: Number(f.baja),
  }));
}

function primerNombre(n: string) {
  const p = n.trim().split(/\s+/)[0];
  return p ? escapar(p) : "Cazador";
}

// ─── 1. Recordatorio diario ────────────────────────────────────────────────

function correoRecordatorio(p: Participante, vida: number, vidaMax: number, cazadores: number): Correo {
  // Con un decimal: «99,9 %» en vez de un «100 %» engañoso tras los primeros golpes
  const pct = vidaMax > 0 ? (Math.floor((vida / vidaMax) * 1000) / 10).toLocaleString("es-VE") : "0";
  const content = `
    <p style="font-size:12px;letter-spacing:.3em;color:#a78bfa;margin:0 0 8px">[ NOTIFICACIÓN DEL SISTEMA ]</p>
    <h1>⚔️ ${primerNombre(p.nombre)}, tu ataque se recargó</h1>
    <p>El <span class="highlight">Guardián del Portal</span> sigue en pie. Le queda el <strong>${pct}%</strong> de su vida
    (${numero(vida)} de ${numero(vidaMax)}), y ${numero(cazadores)} cazadores ya lo están atacando.</p>
    <p>Tu aporte hasta ahora: <strong>${numero(p.danio)} de daño</strong> en ${p.ataques} ${p.ataques === 1 ? "ataque" : "ataques"}.
    Cuando caiga, <strong>todos los que participaron recibirán un premio</strong>.</p>
    <div style="text-align:center"><a href="${APP_URL}/#raid" class="btn">Atacar ahora →</a></div>
    <hr class="divider"/>
    <p style="font-size:13px;color:#999">EN: Your attack has recharged. The Portal Guardian has ${pct}% HP left — every hunter who takes part gets a reward when it falls.</p>
    <p style="font-size:12px;color:#aaa">¿No quieres estos recordatorios? <a href="${enlaceBaja(p.id)}" style="color:#999">Dejar de recibirlos</a>.</p>
  `;
  return {
    to: p.email,
    subject: `⚔️ Tu ataque se recargó — al Guardián le queda el ${pct}%`,
    html: emailTemplate(content, "El Guardián del Portal sigue en pie. Vuelve a atacar."),
    baja: enlaceBaja(p.id),
  };
}

export async function enviarRecordatorios(forzar = false): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const hoy = diaVenezuela();
  if (!forzar) {
    if (horaVenezuela() < HORA_RECORDATORIO) return 0;
    if ((await leerAjuste("wf_raid_recordatorio_dia")) === hoy) return 0;
  }
  const [r] = await db.select({ id: wfRaid.id, vidaMax: wfRaid.vidaMax, danio: wfRaid.danio })
    .from(wfRaid).where(eq(wfRaid.activo, true)).orderBy(desc(wfRaid.id)).limit(1);
  if (!r || r.danio >= r.vidaMax) return 0;

  // Se reserva el día ANTES de enviar: si el servidor se reinicia a mitad,
  // no se repite el correo
  await guardarAjuste("wf_raid_recordatorio_dia", hoy);

  await refrescarLogoCorreo();
  const todos = await participantes(r.id);
  const destino = todos.filter(p => !p.atacoHoy && !p.baja);
  const { enviados, fallidos } = await enviarLotesDetalle(destino.map(p => correoRecordatorio(p, r.vidaMax - r.danio, r.vidaMax, todos.length)));
  await guardarAjuste(CLAVE_REINTENTO, JSON.stringify({ dia: hoy, correos: fallidos, intentos: 1 }));
  console.log(`[Raid correos] Recordatorio del ${hoy}: ${enviados}/${destino.length} enviados` +
    (fallidos.length ? ` · ${fallidos.length} quedan para reintentar` : ""));
  return enviados;
}

/**
 * Reintento del recordatorio: si Resend falló (dominio sin verificar, límite
 * del plan, caída), cada revisión vuelve a intentar SOLO con quienes no lo
 * recibieron, hasta 6 veces y solo durante ese mismo día. Nadie lo recibe dos
 * veces, y quien ya atacó entretanto no lo recibe.
 */
const CLAVE_REINTENTO = "wf_raid_recordatorio_reintento";
const MAX_INTENTOS = 6;

export async function reintentarRecordatorios(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  let pendiente: { dia: string; correos: string[]; intentos: number };
  try { pendiente = JSON.parse((await leerAjuste(CLAVE_REINTENTO)) || "null"); } catch { return 0; }
  if (!pendiente || !pendiente.correos?.length) return 0;
  if (pendiente.dia !== diaVenezuela() || pendiente.intentos >= MAX_INTENTOS) {
    if (pendiente.correos.length) {
      console.warn(`[Raid correos] Recordatorio del ${pendiente.dia}: ${pendiente.correos.length} no se pudieron enviar tras ${pendiente.intentos} intentos`);
    }
    await guardarAjuste(CLAVE_REINTENTO, "");
    return 0;
  }
  const [r] = await db.select({ id: wfRaid.id, vidaMax: wfRaid.vidaMax, danio: wfRaid.danio })
    .from(wfRaid).where(eq(wfRaid.activo, true)).orderBy(desc(wfRaid.id)).limit(1);
  if (!r || r.danio >= r.vidaMax) { await guardarAjuste(CLAVE_REINTENTO, ""); return 0; }

  const faltan = new Set(pendiente.correos);
  const todos = await participantes(r.id);
  const destino = todos.filter(p => faltan.has(p.email) && !p.atacoHoy && !p.baja);
  await refrescarLogoCorreo();
  const { enviados, fallidos } = await enviarLotesDetalle(destino.map(p => correoRecordatorio(p, r.vidaMax - r.danio, r.vidaMax, todos.length)));
  await guardarAjuste(CLAVE_REINTENTO, JSON.stringify({ dia: pendiente.dia, correos: fallidos, intentos: pendiente.intentos + 1 }));
  console.log(`[Raid correos] Reintento ${pendiente.intentos + 1}: ${enviados}/${destino.length} enviados`);
  return enviados;
}

// ─── 2. Premio en conjunto ─────────────────────────────────────────────────

function correoPremio(p: Participante, total: number, premio: string, imagen: string): Correo {
  const texto = premio
    ? escapar(premio).replace(/\n/g, "<br/>")
    : "Como parte del ejército que derrotó al Guardián, tienes una recompensa. Muy pronto te contaremos cómo reclamarla.";
  const content = `
    <p style="font-size:12px;letter-spacing:.3em;color:#a78bfa;margin:0 0 8px">[ RECOMPENSA DESBLOQUEADA ]</p>
    <h1>🏆 ¡El Guardián ha caído, ${primerNombre(p.nombre)}!</h1>
    <p>Lo logramos juntos: <strong>${numero(total)} cazadores</strong> derribaron al Guardián del Portal.
    Tu aporte fue de <strong>${numero(p.danio)} de daño</strong> en ${p.ataques} ${p.ataques === 1 ? "ataque" : "ataques"}.</p>
    ${imagen ? `<div style="text-align:center;margin:20px 0"><img src="${escapar(imagen)}" alt="Recompensa" style="max-width:100%;max-height:360px"/></div>` : ""}
    <p style="font-size:16px"><span class="highlight">Tu premio:</span> ${texto}</p>
    <div style="text-align:center"><a href="${APP_URL}/#raid" class="btn">Ver la recompensa →</a></div>
    <hr class="divider"/>
    <p style="font-size:13px;color:#999">EN: The Portal Guardian has fallen! ${numero(total)} hunters took it down together, and every one of them — you included — gets a reward.</p>
  `;
  return {
    to: p.email,
    subject: "🏆 ¡El Guardián ha caído! Tu recompensa te espera",
    html: emailTemplate(content, "Lo derrotamos juntos. Esta es tu recompensa."),
  };
}

export async function enviarPremio(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [r] = await db.select({ id: wfRaid.id }).from(wfRaid)
    .where(and(eq(wfRaid.activo, true), sql`${wfRaid.derrotadoEn} IS NOT NULL`, sql`${wfRaid.premioEnviadoEn} IS NULL`))
    .orderBy(desc(wfRaid.id)).limit(1);
  if (!r) return 0;

  // Reserva: se marca antes de enviar para no repetirlo nunca
  await db.update(wfRaid).set({ premioEnviadoEn: new Date() }).where(eq(wfRaid.id, r.id));

  await refrescarLogoCorreo();
  const todos = await participantes(r.id); // incluye a quien pidió baja de recordatorios
  const premio = await leerAjuste("wf_raid_premio_texto");
  const imagen = await leerAjuste("wf_raid_recompensa_img");
  const enviados = await enviarLotes(todos.map(p => correoPremio(p, todos.length, premio, imagen)));
  console.log(`[Raid correos] Premio: ${enviados}/${todos.length} enviados`);
  return enviados;
}

// ─── Revisión periódica ────────────────────────────────────────────────────

export function iniciarCorreosRaid() {
  const CADA = 5 * 60 * 1000;
  const revisar = async () => {
    try {
      await enviarPremio();
      // Si en esta revisión salió el recordatorio del día, el reintento
      // espera a la siguiente (5 minutos): reintentar al instante suele
      // chocar con el mismo fallo
      const antes = (await leerAjuste("wf_raid_recordatorio_dia")) === diaVenezuela();
      await enviarRecordatorios();
      if (antes) await reintentarRecordatorios();
    } catch (e) {
      // Si las tablas nuevas aún no existen (migración pendiente) no se envía nada
      console.error("[Raid correos] Revisión fallida:", e);
    }
  };
  setTimeout(() => { void revisar(); }, 40_000);
  setInterval(() => { void revisar(); }, CADA);
  console.log("[Raid correos] Recordatorio diario y premio activados");
}
