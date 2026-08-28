import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Plus, Download, Store, Ticket, Trash2, RefreshCw } from "lucide-react";
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
export default function TicketsAdmin({ compact = false }: { compact?: boolean }) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const habilitado = isAuthenticated && user?.role === "admin";

  const [eventoId, setEventoId] = useState<number | null>(null);
  const [vista, setVista] = useState<"resumen" | "boletos" | "tipos" | "tiendas">("resumen");

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

  if (!habilitado) return null;

  const tarjeta = "rounded-2xl border border-[#e5e5e5] bg-white p-4";
  const campo = "w-full rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#e5007d]";

  return (
    <div className={compact ? "p-4 flex flex-col gap-4" : "flex flex-col gap-5"}>
      {/* Selector de evento */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={evento?.id ?? ""}
          onChange={e => setEventoId(Number(e.target.value))}
          className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-2.5 text-sm font-bold outline-none"
        >
          {eventos.map((e: any) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
          {eventos.length === 0 && <option>Sin eventos</option>}
        </select>
        <button
          onClick={() => setFormEvento(!formEvento)}
          className="flex items-center gap-2 rounded-xl bg-[#e5007d] px-4 py-2.5 text-sm font-bold text-white"
        >
          <Plus size={15} /> Evento
        </button>
        <button
          onClick={() => refetchResumen()}
          className="rounded-xl border border-[#e5e5e5] p-2.5 text-[#666]"
          aria-label="Actualizar"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {formEvento && (
        <div className={tarjeta}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Nombre del evento" value={nuevoEvento.name}
              onChange={e => setNuevoEvento(f => ({ ...f, name: e.target.value }))} className={campo} />
            <input placeholder="Lugar" value={nuevoEvento.location}
              onChange={e => setNuevoEvento(f => ({ ...f, location: e.target.value }))} className={campo} />
            <div>
              <label className="mb-1 block text-xs text-[#888]">Primer día</label>
              <input type="date" value={nuevoEvento.startDate}
                onChange={e => setNuevoEvento(f => ({ ...f, startDate: e.target.value }))} className={campo} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#888]">Último día</label>
              <input type="date" value={nuevoEvento.endDate}
                onChange={e => setNuevoEvento(f => ({ ...f, endDate: e.target.value }))} className={campo} />
            </div>
          </div>
          <button
            onClick={() => crearEvento.mutate(nuevoEvento)}
            disabled={!nuevoEvento.name || !nuevoEvento.startDate || !nuevoEvento.endDate}
            className="mt-3 w-full rounded-xl bg-[#e5007d] py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            Crear evento
          </button>
        </div>
      )}

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2">
        {([["resumen", "Resumen"], ["boletos", "Vendidos"], ["tipos", "Tipos de boleto"], ["tiendas", "Tiendas"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setVista(id)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              vista === id ? "bg-[#e5007d] text-white" : "bg-[#f0f0f0] text-[#666] hover:bg-[#e5e5e5]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Resumen ── */}
      {vista === "resumen" && resumen && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { l: "Vendidos", v: String(resumen.vendidos), c: "text-[#e5007d]" },
              { l: "Recaudado", v: `$${resumen.totalUsd.toFixed(2)}`, c: "text-green-500" },
              { l: "En bolívares", v: `Bs ${resumen.totalBs.toLocaleString("es-VE")}`, c: "text-[#111]" },
              { l: "Sin vender", v: String(resumen.enBlanco), c: "text-[#888]" },
            ].map(c => (
              <div key={c.l} className={tarjeta}>
                <p className="text-xs text-[#888]">{c.l}</p>
                <p className={`mt-1 text-xl font-black tabular-nums ${c.c}`}>{c.v}</p>
              </div>
            ))}
          </div>

          {/* Generar boletos */}
          <div className={tarjeta}>
            <p className="mb-1 text-sm font-bold">Generar boletos en blanco</p>
            <p className="mb-3 text-xs text-[#888]">
              Se crean sin datos. Al generarlos se abre la hoja de QR lista para imprimir.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {[10, 25, 50, 100].map(n => (
                <button key={n} onClick={() => setCantidad(n)}
                  className={`rounded-full px-4 py-2 text-xs font-bold ${cantidad === n ? "bg-[#111] text-white" : "bg-[#f0f0f0] text-[#666]"}`}>
                  {n}
                </button>
              ))}
              <input type="number" min={1} max={500} value={cantidad}
                onChange={e => setCantidad(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-24 rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-sm outline-none" />
              <button
                onClick={() => evento && generar.mutate({ eventId: evento.id, cantidad })}
                disabled={!evento || generar.isPending}
                className="flex items-center gap-2 rounded-xl bg-[#e5007d] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
              >
                <Download size={15} /> {generar.isPending ? "Generando..." : "Generar e imprimir"}
              </button>
            </div>
          </div>

          {/* Por tipo */}
          <div className={tarjeta}>
            <p className="mb-3 text-sm font-bold">Por tipo de boleto</p>
            {resumen.porTipo.length === 0 ? (
              <p className="py-4 text-center text-sm text-[#888]">Aún no hay ventas.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {resumen.porTipo.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 border-b border-[#f5f5f5] pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111]">{t.nombre}</p>
                      <p className="text-xs text-[#888]">${t.precioUsd.toFixed(2)} · {t.dias} día(s)</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-black text-[#111]">{t.cantidad}</p>
                      <p className="text-xs text-[#e5007d]">${t.totalUsd.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Por tienda */}
          <div className={tarjeta}>
            <p className="mb-3 text-sm font-bold">Por tienda</p>
            {resumen.porTienda.length === 0 ? (
              <p className="py-4 text-center text-sm text-[#888]">Ninguna tienda ha vendido todavía.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {resumen.porTienda.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 border-b border-[#f5f5f5] pb-2 last:border-0">
                    <p className="min-w-0 truncate text-sm font-semibold text-[#111]">{t.nombre}</p>
                    <div className="shrink-0 text-right">
                      <p className="font-black text-[#111]">{t.cantidad} boletos</p>
                      <p className="text-xs text-[#e5007d]">
                        ${t.totalUsd.toFixed(2)} · Bs {t.totalBs.toLocaleString("es-VE")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Vendidos ── */}
      {vista === "boletos" && (
        <div className="flex flex-col gap-2">
          {boletos.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#888]">Todavía no hay boletos vendidos.</p>
          ) : boletos.map((b: any) => (
            <div key={b.id} className={tarjeta}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-[#999]">{b.code}</p>
                  <p className="text-sm font-bold text-[#111]">{b.buyerName} {b.buyerLastName}</p>
                  <p className="text-xs text-[#888]">
                    {b.tipoNombre} · {b.buyerPhone}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#999]">
                    {b.tiendaNombre ?? "—"} ·{" "}
                    {b.soldAt ? new Date(b.soldAt).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" }) : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-black text-[#111]">${parseFloat(b.priceUsd ?? "0").toFixed(2)}</p>
                  {b.priceBs && <p className="text-[11px] text-[#888]">Bs {parseFloat(b.priceBs).toLocaleString("es-VE")}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tipos ── */}
      {vista === "tipos" && (
        <>
          <div className={tarjeta}>
            <p className="mb-3 text-sm font-bold">Nuevo tipo de boleto</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input placeholder="Ej: Boleto General x1 Día" value={nuevoTipo.name}
                onChange={e => setNuevoTipo(f => ({ ...f, name: e.target.value }))} className={campo} />
              <div className="flex gap-2">
                <input placeholder="Precio USD" inputMode="decimal" value={nuevoTipo.priceUsd}
                  onChange={e => setNuevoTipo(f => ({ ...f, priceUsd: e.target.value.replace(/[^0-9.]/g, "") }))}
                  className={campo} />
                <select value={nuevoTipo.days}
                  onChange={e => setNuevoTipo(f => ({ ...f, days: Number(e.target.value) }))}
                  className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 text-sm outline-none">
                  <option value={1}>1 día</option>
                  <option value={2}>2 días</option>
                </select>
              </div>
            </div>
            <textarea rows={2} placeholder="Qué incluye (Level Pass, zona cosplayers, etc.)"
              value={nuevoTipo.perks}
              onChange={e => setNuevoTipo(f => ({ ...f, perks: e.target.value }))}
              className={`${campo} mt-3 resize-y`} />
            <button
              onClick={() => evento && crearTipo.mutate({ ...nuevoTipo, eventId: evento.id, perks: nuevoTipo.perks || undefined })}
              disabled={!nuevoTipo.name || !parseFloat(nuevoTipo.priceUsd || "0")}
              className="mt-3 w-full rounded-xl bg-[#e5007d] py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              Añadir tipo
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {tipos.map((t: any) => (
              <div key={t.id} className={`${tarjeta} ${t.active ? "" : "opacity-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#111]">{t.name}</p>
                    <p className="text-xs text-[#888]">{t.days} día(s){t.active ? "" : " · desactivado"}</p>
                    {t.perks && <p className="mt-1 text-[11px] leading-snug text-[#999]">{t.perks}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="font-black text-[#e5007d]">${parseFloat(t.priceUsd).toFixed(2)}</p>
                    <button onClick={() => { if (confirm(`¿Eliminar "${t.name}"?`)) borrarTipo.mutate({ id: t.id }); }}
                      className="text-[#999] hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {tipos.length === 0 && <p className="py-8 text-center text-sm text-[#888]">Aún no has creado tipos de boleto.</p>}
          </div>
        </>
      )}

      {/* ── Tiendas ── */}
      {vista === "tiendas" && (
        <>
          <div className={tarjeta}>
            <p className="mb-1 text-sm font-bold">Autorizar tienda</p>
            <p className="mb-3 text-xs text-[#888]">
              Con el correo se le crea su acceso al portal de venta. Entra con enlace mágico, sin contraseña.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input placeholder="Nombre de la tienda" value={nuevaTienda.name}
                onChange={e => setNuevaTienda(f => ({ ...f, name: e.target.value }))} className={campo} />
              <input placeholder="Correo de acceso" type="email" value={nuevaTienda.email}
                onChange={e => setNuevaTienda(f => ({ ...f, email: e.target.value }))} className={campo} />
              <input placeholder="Persona de contacto" value={nuevaTienda.contactName}
                onChange={e => setNuevaTienda(f => ({ ...f, contactName: e.target.value }))} className={campo} />
              <input placeholder="Teléfono" value={nuevaTienda.phone}
                onChange={e => setNuevaTienda(f => ({ ...f, phone: e.target.value }))} className={campo} />
            </div>
            <button
              onClick={() => crearTienda.mutate({
                name: nuevaTienda.name,
                email: nuevaTienda.email || undefined,
                contactName: nuevaTienda.contactName || undefined,
                phone: nuevaTienda.phone || undefined,
              })}
              disabled={!nuevaTienda.name}
              className="mt-3 w-full rounded-xl bg-[#e5007d] py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              Autorizar
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {tiendas.map((s: any) => (
              <div key={s.id} className={`${tarjeta} ${s.active ? "" : "opacity-50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#111]">{s.name}</p>
                    <p className="truncate text-xs text-[#888]" style={{ overflowWrap: "anywhere" }}>
                      {s.email ?? "sin correo"}{s.phone ? ` · ${s.phone}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => editarTienda.mutate({ id: s.id, active: !s.active })}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                      s.active ? "border border-[#e5e5e5] text-[#666]" : "bg-[#e5007d] text-white"
                    }`}
                  >
                    {s.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
            {tiendas.length === 0 && <p className="py-8 text-center text-sm text-[#888]">No hay tiendas autorizadas.</p>}
          </div>
        </>
      )}
    </div>
  );
}
