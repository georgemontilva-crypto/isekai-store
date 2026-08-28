import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Plus, Download, Store, Ticket, Trash2, RefreshCw, Mail } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Boletería de eventos — panel del dueño.
 *
 * Aquí se crean los eventos, se definen los tipos de boleto con su precio, se
 * autorizan las tiendas y se generan los QR en blanco. Los totales se
 * actualizan en vivo conforme las tiendas registran ventas.
 */
export default function TicketsAdmin({ compact = false, vistaFija }: {
  compact?: boolean;
  /** Cuando la navegación la lleva la barra inferior, la vista viene dada */
  vistaFija?: "resumen" | "boletos" | "codigos" | "tipos" | "tiendas" | "acceso";
}) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const habilitado = isAuthenticated && user?.role === "admin";

  const [eventoId, setEventoId] = useState<number | null>(null);
  const [vistaLocal, setVistaLocal] = useState<"resumen" | "boletos" | "codigos" | "tipos" | "tiendas" | "acceso">("resumen");
  const vista = vistaFija ?? vistaLocal;
  const setVista = setVistaLocal;

  const { data: eventos = [] } = trpc.tickets.eventos.useQuery(undefined, { enabled: habilitado });
  const evento = eventos.find((e: any) => e.id === eventoId) ?? eventos[0];

  useEffect(() => {
    if (!eventoId && eventos.length) setEventoId(eventos[0].id);
  }, [eventos, eventoId]);

  const { data: resumen, refetch: refetchResumen } = trpc.tickets.resumen.useQuery(
    { eventId: evento?.id ?? 0 }, { enabled: habilitado && !!evento, refetchInterval: 15000 },
  );
  const { data: tipos = [] } = trpc.tickets.tipos.useQuery(
    { eventId: evento?.id ?? 0 }, { enabled: habilitado && !!evento },
  );
  const { data: tiendas = [] } = trpc.tickets.tiendas.useQuery(undefined, { enabled: habilitado });
  const { data: ventasDia = [] } = trpc.tickets.ventasPorDia.useQuery(
    { eventId: evento?.id ?? 0 }, { enabled: habilitado && !!evento && vista === "resumen", refetchInterval: 30000 },
  );
  const { data: porteros = [] } = trpc.tickets.porteros.useQuery(undefined, {
    enabled: habilitado && vista === "acceso",
  });
  const { data: asistencia } = trpc.tickets.asistencia.useQuery(
    { eventId: evento?.id ?? 0 },
    { enabled: habilitado && !!evento && vista === "acceso", refetchInterval: 20000 },
  );
  const [nuevoPortero, setNuevoPortero] = useState({ name: "", email: "" });
  const crearPortero = trpc.tickets.crearPortero.useMutation({
    onSuccess: () => {
      utils.tickets.porteros.invalidate();
      setNuevoPortero({ name: "", email: "" });
      toast.success("Portero autorizado");
    },
    onError: (e) => toast.error(e.message),
  });
  const borrarPortero = trpc.tickets.borrarPortero.useMutation({
    onSuccess: () => { utils.tickets.porteros.invalidate(); toast.success("Portero eliminado"); },
  });

  const { data: lotes = [] } = trpc.tickets.lotes.useQuery(
    { eventId: evento?.id ?? 0 }, { enabled: habilitado && !!evento && vista === "codigos" },
  );
  const { data: todosLosCodigos = [] } = trpc.tickets.listar.useQuery(
    { eventId: evento?.id ?? 0, status: "all" },
    { enabled: habilitado && !!evento && vista === "codigos" },
  );
  const { data: boletos = [] } = trpc.tickets.listar.useQuery(
    { eventId: evento?.id ?? 0, status: "sold" },
    { enabled: habilitado && !!evento && vista === "boletos", refetchInterval: 15000 },
  );

  // ── Formularios ──
  const [nuevoEvento, setNuevoEvento] = useState({ name: "", startDate: "", endDate: "", location: "" });
  const [formEvento, setFormEvento] = useState(false);
  const crearEvento = trpc.tickets.crearEvento.useMutation({
    onSuccess: () => { utils.tickets.eventos.invalidate(); setFormEvento(false); toast.success("Evento creado"); },
    onError: (e) => toast.error(e.message),
  });

  const [nuevoTipo, setNuevoTipo] = useState({ name: "", priceUsd: "", days: 1, perks: "" });
  const crearTipo = trpc.tickets.crearTipo.useMutation({
    onSuccess: () => {
      utils.tickets.tipos.invalidate();
      setNuevoTipo({ name: "", priceUsd: "", days: 1, perks: "" });
      toast.success("Tipo creado");
    },
    onError: (e) => toast.error(e.message),
  });
  const borrarTipo = trpc.tickets.borrarTipo.useMutation({
    onSuccess: (r: any) => {
      utils.tickets.tipos.invalidate();
      toast.success(r?.desactivado ? "Tipo desactivado (ya tiene ventas)" : "Tipo eliminado");
    },
  });

  const [nuevaTienda, setNuevaTienda] = useState({ name: "", email: "", contactName: "", phone: "" });
  const crearTienda = trpc.tickets.crearTienda.useMutation({
    onSuccess: () => {
      utils.tickets.tiendas.invalidate();
      setNuevaTienda({ name: "", email: "", contactName: "", phone: "" });
      toast.success("Tienda autorizada");
    },
    onError: (e) => toast.error(e.message),
  });
  const editarTienda = trpc.tickets.editarTienda.useMutation({
    onSuccess: () => { utils.tickets.tiendas.invalidate(); },
  });
  const reenviarAcceso = trpc.tickets.reenviarAcceso.useMutation({
    onSuccess: () => toast.success("Correo de acceso reenviado"),
    onError: (e) => toast.error(e.message),
  });
  const borrarTienda = trpc.tickets.borrarTienda.useMutation({
    onSuccess: (r: any) => {
      utils.tickets.tiendas.invalidate();
      toast.success(r?.desactivada ? "Tienda desactivada (ya tiene ventas)" : "Tienda eliminada");
    },
    onError: (e) => toast.error(e.message),
  });

  const [cantidad, setCantidad] = useState(10);
  const generar = trpc.tickets.generar.useMutation({
    onSuccess: async (r: any) => {
      utils.tickets.resumen.invalidate();
      toast.success(`${r.boletos.length} boletos generados`);
      await descargarQrs(r.boletos, r.lote);
    },
    onError: (e) => toast.error(e.message),
  });

  /**
   * Genera una hoja imprimible con los QR. Se abre en una ventana nueva lista
   * para imprimir: es la forma más simple de llevarlos al papel sin depender
   * de un servicio externo.
   */
  const descargarQrs = async (lista: any[], lote: string) => {
    const origen = window.location.origin;
    const tarjetas = await Promise.all(lista.map(async (b: any) => {
      const url = `${origen}/vender/${b.token}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 1 });
      return `<div class="t"><img src="${dataUrl}" /><p>${b.code}</p></div>`;
    }));

    const w = window.open("", "_blank");
    if (!w) { toast.error("Permite las ventanas emergentes para imprimir los QR"); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8">
      <title>Boletos ${lote}</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 16px; }
        h1 { font-size: 15px; margin: 0 0 14px; }
        .g { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .t { border: 1px solid #ddd; border-radius: 8px; padding: 8px; text-align: center; break-inside: avoid; }
        .t img { width: 100%; height: auto; }
        .t p { margin: 4px 0 0; font: 700 11px ui-monospace, monospace; letter-spacing: .5px; }
        @media print { body { margin: 8px; } }
      </style></head><body>
      <h1>Boletos — lote ${lote} · ${lista.length} unidades</h1>
      <div class="g">${tarjetas.join("")}</div>
      <script>window.onload = () => window.print();<\/script>
      </body></html>`);
    w.document.close();
  };

  /** Vuelve a abrir la hoja imprimible de un lote ya generado */
  const reimprimir = async (lote: string) => {
    if (!evento) return;
    const lista = await utils.tickets.boletosDeLote.fetch({ eventId: evento.id, lote });
    if (!lista.length) { toast.error("Ese lote no tiene boletos"); return; }
    await descargarQrs(lista, lote);
  };

  if (!habilitado) return null;

  // Variables de tema para que funcione igual en claro y oscuro, y `min-w-0`
  // en todos los contenedores para que nada se salga en pantalla estrecha.
  const tarjeta = "rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-4 min-w-0";
  const campo = "w-full min-w-0 rounded-xl border border-[var(--iw-border)] bg-[var(--iw-input-bg)] px-4 text-[var(--iw-text)] outline-none focus:border-[#e5007d]";
  const altoCampo = { minHeight: 48 };

  return (
    <div className={compact ? "p-4 flex flex-col gap-4" : "flex flex-col gap-5"}>
      {/* Selector de evento */}
      <div className={`flex min-w-0 gap-2 ${vistaFija && vistaFija !== "resumen" ? "hidden" : ""}`}>
        <select
          value={evento?.id ?? ""}
          onChange={e => setEventoId(Number(e.target.value))}
          className={`${campo} flex-1 font-bold`}
          style={altoCampo}
        >
          {eventos.map((e: any) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
          {eventos.length === 0 && <option>Sin eventos</option>}
        </select>
        <button
          onClick={() => setFormEvento(!formEvento)}
          className="flex shrink-0 items-center justify-center rounded-xl bg-[#e5007d] px-4 text-white"
          style={altoCampo}
          aria-label="Nuevo evento"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={() => refetchResumen()}
          className="flex shrink-0 items-center justify-center rounded-xl border border-[var(--iw-border)] px-4 text-[var(--iw-text-muted)]"
          style={altoCampo}
          aria-label="Actualizar"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {formEvento && (
        <div className={tarjeta}>
          <div className="flex flex-col gap-3">
            <input placeholder="Nombre del evento" value={nuevoEvento.name}
              onChange={e => setNuevoEvento(f => ({ ...f, name: e.target.value }))} className={campo} style={altoCampo} />
            <input placeholder="Lugar" value={nuevoEvento.location}
              onChange={e => setNuevoEvento(f => ({ ...f, location: e.target.value }))} className={campo} style={altoCampo} />
            {/* Las fechas van apiladas: en iOS el campo `date` tiene un ancho
                mínimo propio que ignora la columna y desborda el contenedor. */}
            <div className="min-w-0">
              <label className="mb-1 block text-xs text-[var(--iw-text-muted)]">Primer día</label>
              <input type="date" value={nuevoEvento.startDate}
                onChange={e => setNuevoEvento(f => ({ ...f, startDate: e.target.value }))}
                className={campo} style={{ ...altoCampo, maxWidth: "100%" }} />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs text-[var(--iw-text-muted)]">Último día</label>
              <input type="date" value={nuevoEvento.endDate}
                onChange={e => setNuevoEvento(f => ({ ...f, endDate: e.target.value }))}
                className={campo} style={{ ...altoCampo, maxWidth: "100%" }} />
            </div>
          </div>
          <button
            onClick={() => crearEvento.mutate(nuevoEvento)}
            disabled={!nuevoEvento.name || !nuevoEvento.startDate || !nuevoEvento.endDate}
            className="mt-3 w-full rounded-xl bg-[#e5007d] text-sm font-bold text-white disabled:opacity-40"
            style={{ minHeight: 52 }}
          >
            Crear evento
          </button>
        </div>
      )}

      {/* Pestañas */}
      {!vistaFija && (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {([["resumen", "Resumen"], ["boletos", "Vendidos"], ["codigos", "Códigos"], ["tipos", "Tipos"], ["tiendas", "Tiendas"], ["acceso", "Acceso"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setVista(id)}
            className={`rounded-xl text-xs font-bold transition-colors ${
              vista === id ? "bg-[#e5007d] text-white" : "bg-[var(--iw-input-bg)] border border-[var(--iw-border)] text-[var(--iw-text-muted)]"
            }`}
            style={{ minHeight: 44, WebkitTapHighlightColor: "transparent" }}
          >
            {label}
          </button>
        ))}
      </div>
      )}

      {/* ── Resumen ── */}
      {vista === "resumen" && resumen && (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              { l: "Vendidos", v: String(resumen.vendidos), c: "text-[#e5007d]" },
              { l: "Recaudado", v: `$${resumen.totalUsd.toFixed(2)}`, c: "text-green-500" },
              { l: "En bolívares", v: `Bs ${resumen.totalBs.toLocaleString("es-VE")}`, c: "text-[var(--iw-text)]" },
              { l: "Sin vender", v: String(resumen.enBlanco), c: "text-[var(--iw-text-muted)]" },
            ].map(c => (
              <div key={c.l} className={tarjeta}>
                <p className="text-[11px] text-[var(--iw-text-muted)]">{c.l}</p>
                <p className={`mt-1 text-base font-black tabular-nums leading-tight ${c.c}`}
                   style={{ overflowWrap: "anywhere" }}>{c.v}</p>
              </div>
            ))}
          </div>

          {/* Generar boletos */}
          <div className={tarjeta}>
            <p className="mb-1 text-sm font-bold text-[var(--iw-text)]">Generar boletos en blanco</p>
            <p className="mb-3 text-xs text-[var(--iw-text-muted)]">
              Se crean sin datos. Al generarlos se abre la hoja de QR lista para imprimir.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 100].map(n => (
                <button key={n} onClick={() => setCantidad(n)}
                  className={`rounded-xl text-xs font-bold transition-colors ${
                    cantidad === n ? "bg-[#e5007d] text-white" : "bg-[var(--iw-input-bg)] border border-[var(--iw-border)] text-[var(--iw-text-muted)]"
                  }`}
                  style={{ minHeight: 44 }}>
                  {n}
                </button>
              ))}
            </div>
            <input type="number" inputMode="numeric" min={1} max={500} value={cantidad}
              onChange={e => setCantidad(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
              placeholder="Otra cantidad"
              className={`${campo} mt-2`} style={altoCampo} />
            <button
              onClick={() => evento && generar.mutate({ eventId: evento.id, cantidad })}
              disabled={!evento || generar.isPending}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e5007d] text-sm font-bold text-white disabled:opacity-40"
              style={{ minHeight: 52 }}
            >
              <Download size={16} /> {generar.isPending ? "Generando..." : `Generar ${cantidad} e imprimir`}
            </button>
          </div>

          {/* Por tipo */}
          <div className={tarjeta}>
            <p className="mb-3 text-sm font-bold text-[var(--iw-text)]">Por tipo de boleto</p>
            {resumen.porTipo.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--iw-text-muted)]">Aún no hay ventas.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {resumen.porTipo.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 border-b border-[var(--iw-border)] pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--iw-text)]">{t.nombre}</p>
                      <p className="text-xs text-[var(--iw-text-muted)]">${t.precioUsd.toFixed(2)} · {t.dias} día(s)</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-black text-[var(--iw-text)]">{t.cantidad}</p>
                      <p className="text-xs text-[#e5007d]">${t.totalUsd.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Por tienda, con barras comparativas.
              Una barra dice de un vistazo quién vende más; una lista de
              números obliga a compararlos mentalmente. */}
          <div className={tarjeta}>
            <p className="mb-3 text-sm font-bold text-[var(--iw-text)]">Ventas por tienda</p>
            {resumen.porTienda.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--iw-text-muted)]">Ninguna tienda ha vendido todavía.</p>
            ) : (() => {
              const mayor = Math.max(...resumen.porTienda.map((t: any) => t.totalUsd), 1);
              return (
                <div className="flex flex-col gap-3">
                  {[...resumen.porTienda].sort((a: any, b: any) => b.totalUsd - a.totalUsd).map((t: any) => (
                    <div key={t.id}>
                      <div className="mb-1 flex items-end justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-semibold text-[var(--iw-text)]">{t.nombre}</p>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-black text-[var(--iw-text)]">${t.totalUsd.toFixed(2)}</span>
                          <span className="ml-2 text-xs text-[var(--iw-text-muted)]">{t.cantidad} boletos</span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--iw-border)]">
                        <div
                          className="h-full rounded-full bg-[#e5007d] transition-all duration-500"
                          style={{ width: `${Math.max(4, (t.totalUsd / mayor) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--iw-text-muted)]">
                        Bs {t.totalBs.toLocaleString("es-VE")}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Ritmo de ventas por día */}
          {(ventasDia as any[]).length > 0 && (
            <div className={tarjeta}>
              <p className="mb-3 text-sm font-bold text-[var(--iw-text)]">Ventas por día</p>
              {(() => {
                const dias = ventasDia as any[];
                const tope = Math.max(...dias.map(d => d.cantidad), 1);
                return (
                  <div className="flex items-end gap-1.5" style={{ height: 120 }}>
                    {dias.map(d => (
                      <div key={d.dia} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                        <span className="text-[10px] font-bold text-[var(--iw-text)]">{d.cantidad}</span>
                        <div
                          className="w-full rounded-t bg-[#e5007d]"
                          style={{ height: `${Math.max(6, (d.cantidad / tope) * 80)}px` }}
                          title={`${d.cantidad} boletos · $${d.usd.toFixed(2)}`}
                        />
                        <span className="truncate text-[9px] text-[var(--iw-text-muted)]">
                          {new Date(d.dia + "T12:00:00").toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* ── Vendidos ── */}
      {vista === "boletos" && (
        <div className="flex flex-col gap-2">
          {boletos.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--iw-text-muted)]">Todavía no hay boletos vendidos.</p>
          ) : boletos.map((b: any) => (
            <div key={b.id} className={tarjeta}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-[var(--iw-text-muted)]">{b.code}</p>
                  <p className="text-sm font-bold text-[var(--iw-text)]">{b.buyerName} {b.buyerLastName}</p>
                  <p className="text-xs text-[var(--iw-text-muted)]">
                    {b.tipoNombre} · {b.buyerPhone}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--iw-text-muted)]">
                    {b.tiendaNombre ?? "—"} ·{" "}
                    {b.soldAt ? new Date(b.soldAt).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" }) : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-black text-[var(--iw-text)]">${parseFloat(b.priceUsd ?? "0").toFixed(2)}</p>
                  {b.priceBs && <p className="text-[11px] text-[var(--iw-text-muted)]">Bs {parseFloat(b.priceBs).toLocaleString("es-VE")}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Códigos generados ── */}
      {vista === "codigos" && (
        <>
          <div className={tarjeta}>
            <p className="mb-1 text-sm font-bold text-[var(--iw-text)]">Lotes generados</p>
            <p className="mb-3 text-xs text-[var(--iw-text-muted)]">
              Cada vez que generas boletos se crea un lote. Puedes volver a imprimir sus QR.
            </p>
            {lotes.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--iw-text-muted)]">Todavía no has generado boletos.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {lotes.map((l: any) => (
                  <div key={l.lote} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--iw-border)] p-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-[var(--iw-text)]">{l.lote}</p>
                      <p className="text-xs text-[var(--iw-text-muted)]">
                        {l.total} boletos · {l.vendidos} vendidos · {l.enBlanco} sin vender
                      </p>
                    </div>
                    <button
                      onClick={() => reimprimir(l.lote)}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--iw-border)] px-4 text-xs font-bold text-[var(--iw-text-muted)] hover:border-[#e5007d] hover:text-[#e5007d]"
                      style={{ minHeight: 40 }}
                    >
                      <Download size={14} /> Imprimir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={tarjeta}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-[var(--iw-text)]">Todos los códigos</p>
              <span className="text-xs text-[var(--iw-text-muted)]">{todosLosCodigos.length}</span>
            </div>
            <div className="iw-scroll-oculto flex max-h-[420px] flex-col gap-1.5 overflow-y-auto pr-1">
              {todosLosCodigos.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between gap-3 border-b border-[var(--iw-border)] pb-1.5 last:border-0">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-[var(--iw-text)]">{b.code}</p>
                    {b.buyerName && (
                      <p className="truncate text-[11px] text-[var(--iw-text-muted)]">
                        {b.buyerName} {b.buyerLastName} · {b.tiendaNombre ?? "—"}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    b.status === "sold" ? "bg-green-500/15 text-green-500"
                    : b.status === "void" ? "bg-red-500/15 text-red-500"
                    : "bg-[var(--iw-border)] text-[var(--iw-text-muted)]"
                  }`}>
                    {b.status === "sold" ? "Vendido" : b.status === "void" ? "Anulado" : "En blanco"}
                  </span>
                </div>
              ))}
              {todosLosCodigos.length === 0 && (
                <p className="py-6 text-center text-sm text-[var(--iw-text-muted)]">No hay códigos generados.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Control de acceso ── */}
      {vista === "acceso" && (
        <>
          {asistencia && (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[
                { l: "Boletos vendidos", v: String(asistencia.vendidos), c: "text-[var(--iw-text)]" },
                { l: "Han ingresado", v: String(asistencia.ingresosTotales), c: "text-green-500" },
                { l: "Día actual", v: asistencia.diaActual ? `Día ${asistencia.diaActual}` : "Fuera de fecha", c: "text-[#e5007d]" },
                { l: "Sin conexión", v: String(asistencia.sincronizadosSinConexion), c: "text-[var(--iw-text-muted)]" },
              ].map(c => (
                <div key={c.l} className={tarjeta}>
                  <p className="text-[11px] text-[var(--iw-text-muted)]">{c.l}</p>
                  <p className={`mt-1 text-base font-black tabular-nums leading-tight ${c.c}`}>{c.v}</p>
                </div>
              ))}
            </div>
          )}

          {(asistencia?.porDia.length ?? 0) > 0 && (
            <div className={tarjeta}>
              <p className="mb-3 text-sm font-bold text-[var(--iw-text)]">Ingresos por día</p>
              <div className="flex flex-col gap-2">
                {asistencia!.porDia.map((d: any) => (
                  <div key={d.dia} className="flex items-center justify-between border-b border-[var(--iw-border)] pb-2 last:border-0">
                    <span className="text-sm text-[var(--iw-text)]">Día {d.dia}</span>
                    <span className="font-black text-[#e5007d]">{d.cantidad} personas</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={tarjeta}>
            <p className="mb-1 text-sm font-bold text-[var(--iw-text)]">Personal de acceso</p>
            <p className="mb-3 text-xs text-[var(--iw-text-muted)]">
              Validan entradas en la puerta desde isekaiworld.co/acceso. No ven ventas ni dinero.
            </p>
            <div className="flex flex-col gap-3">
              <input placeholder="Nombre" value={nuevoPortero.name}
                onChange={e => setNuevoPortero(f => ({ ...f, name: e.target.value }))} className={campo} style={altoCampo} />
              <input placeholder="Correo de acceso" type="email" inputMode="email" value={nuevoPortero.email}
                onChange={e => setNuevoPortero(f => ({ ...f, email: e.target.value }))} className={campo} style={altoCampo} />
            </div>
            <button
              onClick={() => crearPortero.mutate({ name: nuevoPortero.name, email: nuevoPortero.email || undefined })}
              disabled={!nuevoPortero.name || crearPortero.isPending}
              className="mt-3 w-full rounded-xl bg-[#e5007d] text-sm font-bold text-white disabled:opacity-40"
              style={{ minHeight: 52 }}
            >
              {crearPortero.isPending ? "Autorizando..." : "Autorizar portero"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {porteros.map((g: any) => (
              <div key={g.id} className={tarjeta}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--iw-text)]">{g.name}</p>
                    <p className="truncate text-xs text-[var(--iw-text-muted)]" style={{ overflowWrap: "anywhere" }}>
                      {g.email ?? "sin correo"}
                    </p>
                  </div>
                  <button
                    onClick={() => { if (confirm(`¿Eliminar a ${g.name}?`)) borrarPortero.mutate({ id: g.id }); }}
                    className="p-2 text-[var(--iw-text-muted)] hover:text-red-500"
                    aria-label="Eliminar portero"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            {porteros.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--iw-text-muted)]">No hay personal de acceso autorizado.</p>
            )}
          </div>
        </>
      )}

      {/* ── Tipos ── */}
      {vista === "tipos" && (
        <>
          <div className={tarjeta}>
            <p className="mb-3 text-sm font-bold text-[var(--iw-text)]">Nuevo tipo de boleto</p>
            <div className="flex flex-col gap-3">
              <input placeholder="Ej: Boleto General x1 Día" value={nuevoTipo.name}
                onChange={e => setNuevoTipo(f => ({ ...f, name: e.target.value }))} className={campo} style={altoCampo} />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Precio USD" inputMode="decimal" value={nuevoTipo.priceUsd}
                  onChange={e => setNuevoTipo(f => ({ ...f, priceUsd: e.target.value.replace(/[^0-9.]/g, "") }))}
                  className={campo} style={altoCampo} />
                <select value={nuevoTipo.days}
                  onChange={e => setNuevoTipo(f => ({ ...f, days: Number(e.target.value) }))}
                  className={campo} style={altoCampo}>
                  <option value={1}>1 día</option>
                  <option value={2}>2 días</option>
                </select>
              </div>
              <textarea rows={3} placeholder="Qué incluye (Level Pass, zona cosplayers, etc.)"
                value={nuevoTipo.perks}
                onChange={e => setNuevoTipo(f => ({ ...f, perks: e.target.value }))}
                className={`${campo} resize-y py-3`} />
            </div>
            <button
              onClick={() => evento && crearTipo.mutate({ ...nuevoTipo, eventId: evento.id, perks: nuevoTipo.perks || undefined })}
              disabled={!nuevoTipo.name || !parseFloat(nuevoTipo.priceUsd || "0")}
              className="mt-3 w-full rounded-xl bg-[#e5007d] text-sm font-bold text-white disabled:opacity-40"
              style={{ minHeight: 52 }}
            >
              Añadir tipo
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {tipos.map((t: any) => (
              <div key={t.id} className={`${tarjeta} ${t.active ? "" : "opacity-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--iw-text)]">{t.name}</p>
                    <p className="text-xs text-[var(--iw-text-muted)]">{t.days} día(s){t.active ? "" : " · desactivado"}</p>
                    {t.perks && <p className="mt-1 text-[11px] leading-snug text-[var(--iw-text-muted)]">{t.perks}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="font-black text-[#e5007d]">${parseFloat(t.priceUsd).toFixed(2)}</p>
                    <button onClick={() => { if (confirm(`¿Eliminar "${t.name}"?`)) borrarTipo.mutate({ id: t.id }); }}
                      className="p-2 text-[var(--iw-text-muted)] hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {tipos.length === 0 && <p className="py-8 text-center text-sm text-[var(--iw-text-muted)]">Aún no has creado tipos de boleto.</p>}
          </div>
        </>
      )}

      {/* ── Tiendas ── */}
      {vista === "tiendas" && (
        <>
          <div className={tarjeta}>
            <p className="mb-1 text-sm font-bold text-[var(--iw-text)]">Autorizar tienda</p>
            <p className="mb-3 text-xs text-[var(--iw-text-muted)]">
Al autorizarla le llega un correo con su enlace de acceso y cómo vender. Entra sin contraseña.
            </p>
            <div className="flex flex-col gap-3">
              <input placeholder="Nombre de la tienda" value={nuevaTienda.name}
                onChange={e => setNuevaTienda(f => ({ ...f, name: e.target.value }))} className={campo} style={altoCampo} />
              <input placeholder="Correo de acceso" type="email" inputMode="email" value={nuevaTienda.email}
                onChange={e => setNuevaTienda(f => ({ ...f, email: e.target.value }))} className={campo} style={altoCampo} />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Contacto" value={nuevaTienda.contactName}
                  onChange={e => setNuevaTienda(f => ({ ...f, contactName: e.target.value }))} className={campo} style={altoCampo} />
                <input placeholder="Teléfono" inputMode="tel" value={nuevaTienda.phone}
                  onChange={e => setNuevaTienda(f => ({ ...f, phone: e.target.value }))} className={campo} style={altoCampo} />
              </div>
            </div>
            <button
              onClick={() => crearTienda.mutate({
                name: nuevaTienda.name,
                email: nuevaTienda.email || undefined,
                contactName: nuevaTienda.contactName || undefined,
                phone: nuevaTienda.phone || undefined,
              })}
              disabled={!nuevaTienda.name || crearTienda.isPending}
              className="mt-3 w-full rounded-xl bg-[#e5007d] text-sm font-bold text-white disabled:opacity-40"
              style={{ minHeight: 52 }}
            >
              {crearTienda.isPending ? "Autorizando..." : "Autorizar"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {tiendas.map((s: any) => (
              <div key={s.id} className={`${tarjeta} ${s.active ? "" : "opacity-50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--iw-text)]">{s.name}</p>
                    <p className="truncate text-xs text-[var(--iw-text-muted)]" style={{ overflowWrap: "anywhere" }}>
                      {s.email ?? "sin correo"}{s.phone ? ` · ${s.phone}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {s.email && (
                      <button
                        onClick={() => reenviarAcceso.mutate({ id: s.id })}
                        disabled={reenviarAcceso.isPending}
                        className="p-2 text-[var(--iw-text-muted)] hover:text-[#e5007d]"
                        aria-label="Reenviar acceso"
                        title="Reenviar correo de acceso"
                      >
                        <Mail size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => editarTienda.mutate({ id: s.id, active: !s.active })}
                      className={`rounded-full px-4 text-xs font-bold ${
                        s.active ? "border border-[var(--iw-border)] text-[var(--iw-text-muted)]" : "bg-[#e5007d] text-white"
                      }`}
                      style={{ minHeight: 40 }}
                    >
                      {s.active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => { if (confirm(`¿Eliminar "${s.name}"?`)) borrarTienda.mutate({ id: s.id }); }}
                      className="p-2 text-[var(--iw-text-muted)] hover:text-red-500"
                      aria-label="Eliminar tienda"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {tiendas.length === 0 && <p className="py-8 text-center text-sm text-[var(--iw-text-muted)]">No hay tiendas autorizadas.</p>}
          </div>
        </>
      )}
    </div>
  );
}
