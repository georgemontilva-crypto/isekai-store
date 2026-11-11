import { sql, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { siteSettings } from "../drizzle/schema";
import { conCandado } from "./candado";
import { TIPOS_STAND, type TipoStand } from "./stands";

/**
 * Factura de venta de un stand. Se emite sola cuando el stand queda pagado
 * por completo: recibe su número correlativo y un enlace propio para verla,
 * imprimirla o guardarla en PDF. Lleva el logo y el RIF de la empresa.
 */
export const EMISOR = {
  razon: "Isekai World, C.A.",
  rif: "J-50887904-0",
  domicilio: "Av. Principal, Casa Nro. 206A-41, Urb. Los Samanes, Zona Postal 4004, Maracaibo, Venezuela",
  correo: "ventas@isekaiworld.co",
  web: "www.isekaiworld.co",
};
const SITIO = "https://www.isekaiworld.co";
const filas = <T,>(r: unknown) => ((r as any)?.[0] ?? []) as T[];
export const numeroFactura = (n: number) => `IWF-${String(n).padStart(4, "0")}`;
export const urlFactura = (clave: string) => `${SITIO}/api/factura-stand/${clave}`;

export async function asegurarColumnasFactura() {
  const db = await getDb();
  if (!db) return;
  const ya = new Set(filas<{ c: string }>(await db.execute(sql`SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'festStandReservas'`)).map(x => x.c));
  for (const [c, tipo] of [["facturaNumero", "int NULL"], ["facturaClave", "varchar(40) NULL"], ["pagadoEn", "timestamp NULL"]] as const) {
    if (!ya.has(c)) await db.execute(sql.raw(`ALTER TABLE festStandReservas ADD COLUMN \`${c}\` ${tipo}`));
  }
  // Stands que ya estaban pagados completos antes de existir la factura
  const sin = filas<{ id: number }>(await db.execute(sql`SELECT id FROM festStandReservas WHERE estado = 'pagado' AND facturaNumero IS NULL ORDER BY COALESCE(confirmadaEn, creadoEn), id`));
  for (const r of sin) await emitirFactura(r.id);
}

/** Asigna número y enlace a la factura de un stand pagado. Una sola vez. */
export async function emitirFactura(reservaId: number) {
  const db = await getDb();
  if (!db) return null;
  return conCandado("factura-stand", async () => {
    const [r] = filas<any>(await db.execute(sql`SELECT * FROM festStandReservas WHERE id = ${reservaId} LIMIT 1`));
    if (!r || r.estado !== "pagado") return null;
    if (r.facturaNumero) return { numero: numeroFactura(Number(r.facturaNumero)), clave: r.facturaClave as string, url: urlFactura(r.facturaClave) };
    const [[m]] = await db.execute(sql`SELECT COALESCE(MAX(facturaNumero), 0) + 1 AS n FROM festStandReservas`) as unknown as [[{ n: number }]];
    const clave = nanoid(26).replace(/[^a-zA-Z0-9]/g, "x");
    // Fecha de pago: la del último pago aprobado
    await db.execute(sql`UPDATE festStandReservas SET facturaNumero = ${Number(m.n)}, facturaClave = ${clave},
      pagadoEn = COALESCE((SELECT MAX(revisadoEn) FROM festStandPagos WHERE reservaId = ${reservaId} AND estado = 'aprobado'), NOW())
      WHERE id = ${reservaId} AND facturaNumero IS NULL`);
    return { numero: numeroFactura(Number(m.n)), clave, url: urlFactura(clave) };
  });
}

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const fecha = (d: any) => new Intl.DateTimeFormat("es-VE", { timeZone: "America/Caracas", day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
const usd = (n: number) => `US$ ${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const METODO: Record<string, string> = { pago_movil: "Pago Móvil", crypto: "Binance Pay", efectivo: "Efectivo" };

/** La factura como página lista para imprimir o guardar en PDF */
export async function htmlFactura(clave: string): Promise<string | null> {
  const db = await getDb();
  if (!db || !/^[A-Za-z0-9]{16,40}$/.test(clave)) return null;
  const [r] = filas<any>(await db.execute(sql`SELECT r.*, s.numero FROM festStandReservas r JOIN festStands s ON s.id = r.standId WHERE r.facturaClave = ${clave} LIMIT 1`));
  if (!r || !r.facturaNumero) return null;
  const pagos = filas<any>(await db.execute(sql`SELECT * FROM festStandPagos WHERE reservaId = ${r.id} AND estado = 'aprobado' ORDER BY COALESCE(revisadoEn, creadoEn), id`));
  const ajustes = await db.select().from(siteSettings).where(inArray(siteSettings.key, ["email_logo_url", "store_logo_url"]));
  const valor = (k: string) => (ajustes.find(f => f.key === k)?.value ?? "").trim();
  const logo = [valor("store_logo_url"), valor("email_logo_url")].find(u => /^https?:\/\//.test(u)) ?? "";
  const t = TIPOS_STAND[r.tipo as TipoStand];
  const precio = Number(r.precio), pagado = Number(r.pagado);
  const anulada = r.estado !== "pagado";
  const num = numeroFactura(Number(r.facturaNumero));

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Factura ${num} · ${esc(EMISOR.razon)}</title>
<style>
  *{box-sizing:border-box} body{margin:0;background:#eceaf0;color:#17141c;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5}
  .hoja{max-width:760px;margin:24px auto;background:#fff;padding:44px 48px;border-radius:6px;box-shadow:0 8px 30px rgba(20,10,40,.12);position:relative;overflow:hidden}
  .franja{position:absolute;inset:0 0 auto 0;height:8px;background:#e5007d}
  .cab{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
  .logo{max-height:60px;max-width:220px;display:block} .logo-caja{display:inline-block;background:#0b0a10;border-radius:10px;padding:12px 16px;-webkit-print-color-adjust:exact;print-color-adjust:exact} .franja,.sello{-webkit-print-color-adjust:exact;print-color-adjust:exact} .marca{font:italic 900 28px "Arial Black",Arial,sans-serif;letter-spacing:-.5px}
  .emisor{margin-top:10px;font-size:12.5px;color:#55505f} .emisor b{color:#17141c;font-size:14px}
  .doc{text-align:right} .doc h1{margin:0;font-size:25px;letter-spacing:-.3px} .doc .n{margin-top:4px;font-size:17px;font-weight:800;color:#e5007d}
  .doc p{margin:6px 0 0;font-size:13px;color:#55505f}
  h2{margin:34px 0 8px;font-size:12.5px;font-weight:700;color:#7a7486}
  .datos{display:grid;grid-template-columns:1fr 1fr;gap:6px 28px} .datos div span{display:block;font-size:12px;color:#7a7486} .datos div b{font-size:14.5px;overflow-wrap:anywhere}
  table{width:100%;border-collapse:collapse} th{font-size:12px;text-align:left;color:#7a7486;font-weight:600;padding:9px 8px;border-bottom:2px solid #17141c}
  td{padding:12px 8px;border-bottom:1px solid #e6e3ec;vertical-align:top} .der{text-align:right;white-space:nowrap} td small{color:#6b6575;display:block;margin-top:3px;font-size:12.5px}
  .tot{margin:18px 0 0 auto;width:min(100%,300px)} .tot div{display:flex;justify-content:space-between;padding:6px 8px} .tot .g{margin-top:6px;border-top:2px solid #17141c;font-size:18px;font-weight:800;padding-top:10px}
  .sello{display:inline-block;margin-top:14px;padding:6px 14px;border:2px solid #16a34a;color:#16a34a;font-weight:800;border-radius:6px;transform:rotate(-3deg)}
  .sello.no{border-color:#dc2626;color:#dc2626}
  .pie{margin-top:36px;padding-top:16px;border-top:1px solid #e6e3ec;font-size:12px;color:#7a7486;text-align:center}
  .acc{max-width:760px;margin:0 auto 28px;display:flex;gap:10px;justify-content:center;padding:0 16px}
  .acc button,.acc a{font:inherit;font-weight:700;border:0;border-radius:999px;padding:12px 22px;cursor:pointer;text-decoration:none;background:#e5007d;color:#fff} .acc a{background:#fff;color:#17141c}
  @media(max-width:640px){.hoja{margin:0;padding:30px 20px;border-radius:0}.cab{flex-direction:column}.doc{text-align:left}.datos{grid-template-columns:1fr}}
  @media print{body{background:#fff}.hoja{margin:0;box-shadow:none;max-width:none;padding:28px 34px}.acc{display:none}@page{size:letter;margin:12mm}}
</style></head><body>
<div class="hoja"><div class="franja"></div>
  <div class="cab">
    <div>
      ${logo ? `<span class="logo-caja"><img class="logo" src="${esc(logo)}" alt="${esc(EMISOR.razon)}"></span>` : `<div class="marca">ISEKAI WORLD</div>`}
      <div class="emisor"><b>${esc(EMISOR.razon)}</b><br>RIF ${esc(EMISOR.rif)}<br>${esc(EMISOR.domicilio)}<br>${esc(EMISOR.correo)} · ${esc(EMISOR.web)}</div>
    </div>
    <div class="doc">
      <h1>Factura de venta</h1>
      <div class="n">N.º ${num}</div>
      <p>Fecha de pago: <b>${esc(fecha(r.pagadoEn ?? r.confirmadaEn ?? r.creadoEn))}</b></p>
      <span class="sello ${anulada ? "no" : ""}">${anulada ? "ANULADA" : "PAGADO"}</span>
    </div>
  </div>

  <h2>Cliente</h2>
  <div class="datos">
    <div><span>Nombre o razón social</span><b>${esc(r.negocio)}</b></div>
    <div><span>Responsable</span><b>${esc(r.contacto)}</b></div>
    ${r.rif ? `<div><span>RIF / C.I.</span><b>${esc(r.rif)}</b></div>` : ""}
    <div><span>Correo</span><b>${esc(r.email || "—")}</b></div>
    <div><span>Teléfono</span><b>${esc(r.whatsapp || "—")}</b></div>
  </div>

  <h2>Detalle</h2>
  <table>
    <tr><th>Descripción</th><th class="der">Cant.</th><th class="der">Precio</th></tr>
    <tr><td><b>Stand ${esc(t?.nombre ?? r.tipo)} · puesto ${esc(r.numero)}</b>
      <small>Espacio de exhibición y venta en el Isekai World Fest 2027, 14 y 15 de agosto de 2027, Maracaibo, Venezuela.</small>
      ${t?.incluye?.length ? `<small>Incluye: ${esc((t.incluye as readonly string[]).filter(x => !/^Recuperas/i.test(x)).join(" · "))}</small>` : ""}</td>
      <td class="der">1</td><td class="der">${usd(precio)}</td></tr>
  </table>

  <h2>Pagos recibidos</h2>
  <table>
    <tr><th>Fecha</th><th>Forma de pago</th><th>Referencia</th><th class="der">Monto</th></tr>
    ${pagos.map(p => `<tr><td>${esc(fecha(p.revisadoEn ?? p.creadoEn))}</td><td>${esc(METODO[p.metodo] ?? p.metodo)}</td><td style="overflow-wrap:anywhere">${esc(p.referencia || "—")}</td><td class="der">${usd(Number(p.monto))}</td></tr>`).join("")}
  </table>

  <div class="tot">
    <div><span>Precio del stand</span><span>${usd(precio)}</span></div>
    <div><span>Total pagado</span><span>${usd(pagado)}</span></div>
    <div class="g"><span>Saldo</span><span>${usd(Math.max(0, precio - pagado))}</span></div>
  </div>

  <div class="pie">${esc(EMISOR.razon)} · RIF ${esc(EMISOR.rif)} · Gracias por ser parte del Isekai World Fest 2027.</div>
</div>
<div class="acc"><button onclick="window.print()">Imprimir o guardar en PDF</button><a href="${SITIO}/boleteria">Ir a mi panel</a></div>
</body></html>`;
}
