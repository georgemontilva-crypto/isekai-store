import { Loader2, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import "@/styles/tablero.css";

/**
 * Tablero del Fest para el administrador: de un vistazo, cómo va todo.
 *
 *  - boletos vendidos y recaudado, con la gráfica de ventas por día
 *  - cuántos boletos lleva cada tienda (y cuánto le queda de su cupo)
 *  - stands vendidos, apartados, en revisión y disponibles, por tipo
 *  - quiénes dieron solo la inicial y cuánto falta por cobrar
 *
 * No trae datos nuevos: junta lo que ya existe en boletería, tiendas y stands.
 */
const usd = (n: number) => `$${(Math.round(n * 100) / 100).toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;
const TIPOS: { clave: string; nombre: string }[] = [
  { clave: "gran_gremio", nombre: "Gran Gremio" },
  { clave: "gremio", nombre: "Gremio" },
  { clave: "mercader", nombre: "Mercader" },
];
const diaCorto = (iso: string) => { const [, m, d] = iso.split("-"); return `${Number(d)}/${Number(m)}`; };
const desde = (f: string | Date | null) => f ? new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", timeZone: "America/Caracas" }).format(new Date(f)) : "";

function Dato({ etiqueta, valor, nota, tono }: { etiqueta: string; valor: string; nota?: string; tono?: "ok" | "falta" }) {
  return (
    <div className="tf-dato">
      <dt>{etiqueta}</dt>
      <dd className={tono ? `tf-${tono}` : undefined}>{valor}</dd>
      {nota && <p>{nota}</p>}
    </div>
  );
}

export default function TableroFest() {
  const { data: eventos = [] } = trpc.tickets.eventos.useQuery();
  // El evento vigente: el activo más próximo (o el último que haya)
  const evento = (() => {
    const lista = [...(eventos as any[])].filter(e => e.active !== false);
    const hoy = new Date().toISOString().slice(0, 10);
    const proximos = lista.filter(e => String(e.endDate ?? e.startDate ?? "").slice(0, 10) >= hoy).sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
    return proximos[0] ?? lista[lista.length - 1] ?? (eventos as any[])[0];
  })();
  const listo = { enabled: Boolean(evento), refetchInterval: 30_000 } as const;
  const { data: resumen, isLoading: c1 } = trpc.tickets.resumen.useQuery({ eventId: evento?.id ?? 0 }, listo);
  const { data: porDia = [] } = trpc.tickets.ventasPorDia.useQuery({ eventId: evento?.id ?? 0 }, listo);
  const { data: tiendasStand = [] } = trpc.standTienda.comisiones.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: stands, isLoading: c2 } = trpc.stands.panel.useQuery(undefined, { refetchInterval: 30_000 });

  if (c1 || c2) return <div className="tf tf-cargando"><Loader2 className="animate-spin" /></div>;

  // ── Boletos por tienda: las de stand (con su cupo) y el resto que haya vendido ──
  const conStand = new Map((tiendasStand as any[]).map(t => [t.id, t]));
  const tiendas = [
    ...(tiendasStand as any[]).filter(t => t.vende || t.vendidos > 0).map(t => ({ id: t.id, nombre: t.nombre, detalle: `Stand ${t.planNombre}${t.stand ? ` · ${t.stand}` : ""}`, vendidos: t.vendidos, cupo: t.cupo as number | null, usd: t.recaudadoUsd, ganancia: t.ganancia })),
    ...((resumen?.porTienda ?? []) as any[]).filter(t => !conStand.has(t.id)).map(t => ({ id: t.id, nombre: t.nombre, detalle: "Sin stand", vendidos: t.cantidad, cupo: null as number | null, usd: t.totalUsd, ganancia: 0 })),
  ].sort((a, b) => b.vendidos - a.vendidos || a.nombre.localeCompare(b.nombre));
  const topeTienda = Math.max(1, ...tiendas.map(t => Math.max(t.vendidos, t.cupo ?? 0)));
  const comisiones = tiendas.reduce((a, t) => a + t.ganancia, 0);

  // ── Ventas por día ──
  const dias = (porDia as any[]).slice(-30);
  const topeDia = Math.max(1, ...dias.map(d => d.cantidad));

  // ── Stands ──
  const mesas = (stands?.stands ?? []) as any[];
  const reservas = ((stands?.reservas ?? []) as any[]);
  const cuenta = (tipo: string | null, estado: string) => mesas.filter(m => (!tipo || m.tipo === tipo) && m.estado === estado).length;
  const enRevision = reservas.filter(r => r.estado === "pendiente");
  const apartadas = reservas.filter(r => r.estado === "apartado").sort((a, b) => (b.precio - b.pagado) - (a.precio - a.pagado));
  const pagadas = reservas.filter(r => r.estado === "pagado");
  const cobrado = [...apartadas, ...pagadas].reduce((a, r) => a + r.pagado, 0);
  const porCobrar = apartadas.reduce((a, r) => a + Math.max(0, r.precio - r.pagado), 0);
  const totalMesas = mesas.length, libres = cuenta(null, "libre"), vendidas = cuenta(null, "pagado"), conInicial = cuenta(null, "apartado"), bloqueadas = cuenta(null, "bloqueado");

  return (
    <div className="tf">
      <p className="tf-evento">{evento?.name ?? "Isekai World Fest"}</p>

      <dl className="tf-datos">
        <Dato etiqueta="Boletos vendidos" valor={String(resumen?.vendidos ?? 0)} nota={resumen?.generados ? `de ${resumen.generados} generados` : undefined} />
        <Dato etiqueta="Recaudado en boletos" valor={usd(resumen?.totalUsd ?? 0)} nota={comisiones > 0 ? `${usd(comisiones)} en comisiones a tiendas` : undefined} />
        <Dato etiqueta="Stands ocupados" valor={`${vendidas + conInicial} de ${totalMesas}`} nota={`${libres} disponibles`} />
        <Dato etiqueta="Cobrado en stands" valor={usd(cobrado)} tono="ok" />
        <Dato etiqueta="Por cobrar en stands" valor={usd(porCobrar)} tono={porCobrar > 0 ? "falta" : undefined} nota={apartadas.length ? `${apartadas.length} ${apartadas.length === 1 ? "tienda dio" : "tiendas dieron"} solo la inicial` : "Nadie debe saldo"} />
      </dl>

      <section className="tf-caja">
        <h3>Boletos vendidos por día</h3>
        {dias.length === 0 ? <p className="tf-vacio">Todavía no hay ventas. Aquí verás una barra por cada día con ventas.</p> : (
          <div className="tf-dias" role="img" aria-label={`Boletos vendidos por día: ${dias.map(d => `${diaCorto(d.dia)}, ${d.cantidad}`).join("; ")}`}>
            {dias.map(d => (
              <div key={d.dia} className="tf-dia" title={`${d.dia}: ${d.cantidad} boletos, ${usd(d.usd)}`}>
                <b>{d.cantidad}</b>
                <i style={{ height: `${Math.max(3, (d.cantidad / topeDia) * 100)}%` }} />
                <span>{diaCorto(d.dia)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="tf-caja">
        <h3>Boletos por tienda</h3>
        {tiendas.length === 0 ? <p className="tf-vacio">Ninguna tienda ha vendido boletos todavía.</p> : (
          <ul className="tf-tiendas">
            {tiendas.map(t => (
              <li key={t.id}>
                <div className="tf-tienda-cab">
                  <span><strong>{t.nombre}</strong><small>{t.detalle}</small></span>
                  <span className="tf-tienda-num"><b>{t.vendidos}</b>{t.cupo ? ` de ${t.cupo}` : ""}<small>{usd(t.usd)}{t.ganancia > 0 ? ` · gana ${usd(t.ganancia)}` : ""}</small></span>
                </div>
                <div className="tf-barra" role="img" aria-label={`${t.vendidos} vendidos${t.cupo ? ` de un cupo de ${t.cupo}` : ""}`}>
                  {t.cupo ? <i className="tf-barra-cupo" style={{ width: `${(t.cupo / topeTienda) * 100}%` }} /> : null}
                  <i className="tf-barra-ok" style={{ width: `${(t.vendidos / topeTienda) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {(resumen?.porTipo ?? []).length > 0 && (
          <>
            <h4>Por tipo de boleto</h4>
            <ul className="tf-tipos">
              {(resumen!.porTipo as any[]).map(t => (
                <li key={t.id}><span>{t.nombre}</span><span><b>{t.cantidad}</b>{t.cupo ? ` de ${t.cupo}` : ""}<small>{usd(t.totalUsd)}</small></span></li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="tf-caja">
        <h3>Stands</h3>
        <ul className="tf-leyenda">
          <li><i className="tf-s-pagado" /> Pagados <b>{vendidas}</b></li>
          <li><i className="tf-s-apartado" /> Solo inicial <b>{conInicial}</b></li>
          <li><i className="tf-s-libre" /> Disponibles <b>{libres}</b></li>
          {bloqueadas > 0 && <li><i className="tf-s-bloqueado" /> Bloqueados <b>{bloqueadas}</b></li>}
        </ul>
        <ul className="tf-stands">
          {TIPOS.map(tp => {
            const total = mesas.filter(m => m.tipo === tp.clave).length;
            if (!total) return null;
            const p = cuenta(tp.clave, "pagado"), a = cuenta(tp.clave, "apartado"), l = cuenta(tp.clave, "libre"), b = cuenta(tp.clave, "bloqueado");
            return (
              <li key={tp.clave}>
                <div className="tf-tienda-cab"><span><strong>{tp.nombre}</strong></span><span className="tf-tienda-num"><b>{l}</b> disponibles de {total}</span></div>
                <div className="tf-tramos" role="img" aria-label={`${tp.nombre}: ${p} pagados, ${a} con solo la inicial, ${l} disponibles${b ? `, ${b} bloqueados` : ""}`}>
                  {p > 0 && <i className="tf-s-pagado" style={{ flexGrow: p }} />}
                  {a > 0 && <i className="tf-s-apartado" style={{ flexGrow: a }} />}
                  {l > 0 && <i className="tf-s-libre" style={{ flexGrow: l }} />}
                  {b > 0 && <i className="tf-s-bloqueado" style={{ flexGrow: b }} />}
                </div>
              </li>
            );
          })}
        </ul>
        {enRevision.length > 0 && (
          <p className="tf-aviso">
            Hay {enRevision.length} {enRevision.length === 1 ? "solicitud con pago" : "solicitudes con pago"} por revisar. <Link href="/boleteria?v=stands">Revisarlas</Link>
          </p>
        )}
      </section>

      <section className="tf-caja">
        <h3>Solo dieron la inicial</h3>
        {apartadas.length === 0 ? <p className="tf-vacio">Nadie debe saldo: todos los stands apartados están pagados completos.</p> : (
          <>
            <p className="tf-nota">Apartaron su stand con la inicial y les falta el resto. En total falta cobrar <strong>{usd(porCobrar)}</strong>.</p>
            <ul className="tf-deudas">
              {apartadas.map(r => {
                const falta = Math.max(0, r.precio - r.pagado), pct = r.precio ? Math.round((r.pagado / r.precio) * 100) : 0;
                const tel = String(r.whatsapp ?? "").replace(/\D/g, "");
                return (
                  <li key={r.id}>
                    <div className="tf-tienda-cab">
                      <span><strong>{r.negocio}</strong><small>{r.numero} · {TIPOS.find(t => t.clave === r.tipo)?.nombre ?? r.tipo} · {r.contacto}{r.confirmadaEn ? ` · desde el ${desde(r.confirmadaEn)}` : ""}</small></span>
                      <span className="tf-tienda-num"><b className="tf-falta">{usd(falta)}</b><small>falta · pagó {usd(r.pagado)} ({pct}%)</small></span>
                    </div>
                    <div className="tf-barra"><i className="tf-barra-ok" style={{ width: `${pct}%` }} /></div>
                    {tel.length >= 8 && (
                      <a className="tf-wa" href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Escribirle por WhatsApp</a>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
