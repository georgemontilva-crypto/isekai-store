import { useMemo, useState } from "react";
import { Check, ExternalLink, Loader2, MapPin, MessageCircle, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import MapaStands, { COLOR_TIPO, type MesaPlano } from "@/components/fest/MapaStands";
import { enlaceWhatsapp } from "@/components/rueda/ListaRueda";
import { confirmar, dinero, fechaRelativa } from "./ui";

/**
 * Admin de la venta de stands: revisar pagos (abono 30% o completo), ver lo
 * que falta por cobrar a cada tienda y ubicar las mesas en el plano.
 */
const NOMBRE: Record<string, string> = { mercader: "Mercader", gremio: "Gremio", gran_gremio: "Gran Gremio" };
const METODO: Record<string, string> = { pago_movil: "Pago Móvil", crypto: "Binance Pay", efectivo: "Efectivo", otro: "Otro", transferencia: "Transferencia", zelle: "Zelle" };
type Vista = "revisar" | "cobrar" | "pagados" | "plano";

export default function StandsAdmin() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.stands.panel.useQuery(undefined, { refetchInterval: 30_000 });
  const [vista, setVista] = useState<Vista>("revisar");
  const refrescar = () => { void utils.stands.panel.invalidate(); void utils.stands.publico.invalidate(); };
  const aprobar = trpc.stands.aprobarPago.useMutation({ onSuccess: r => { toast.success(r.completo ? "Pago aprobado · stand pagado" : "Pago aprobado · stand apartado"); refrescar(); }, onError: e => toast.error(e.message, { duration: 8000 }) });
  const rechazar = trpc.stands.rechazarPago.useMutation({ onSuccess: () => { toast.success("Pago rechazado"); refrescar(); }, onError: e => toast.error(e.message) });
  const registrar = trpc.stands.registrarPago.useMutation({ onSuccess: r => { toast.success(r.completo ? "Stand pagado por completo" : "Pago registrado"); refrescar(); }, onError: e => toast.error(e.message) });
  const cambiarMesa = trpc.stands.cambiarMesa.useMutation({ onSuccess: () => { toast.success("Mesa cambiada"); refrescar(); }, onError: e => toast.error(e.message) });
  const anular = trpc.stands.anular.useMutation({ onSuccess: () => { toast.success("Reserva anulada · la mesa quedó libre"); refrescar(); } });

  const stands = (data?.stands ?? []) as any[];
  const reservas = (data?.reservas ?? []) as any[];
  const pagos = (data?.pagos ?? []) as any[];
  const reservaPorId = useMemo(() => new Map(reservas.map(r => [r.id, r])), [reservas]);

  const pendientes = pagos.filter(p => p.estado === "pendiente" && reservaPorId.get(p.reservaId)?.estado !== "rechazada");
  const porCobrar = reservas.filter(r => r.estado === "apartado");
  const pagados = reservas.filter(r => r.estado === "pagado");
  const cobrado = pagos.filter(p => p.estado === "aprobado").reduce((a, p) => a + p.monto, 0);
  const saldo = porCobrar.reduce((a, r) => a + Math.max(0, r.precio - r.pagado), 0);
  const libresDeTipo = (tipo: string) => stands.filter(s => s.tipo === tipo && s.estado === "libre");

  const resumen = (["mercader", "gremio", "gran_gremio"] as const).map(t => ({
    t, total: stands.filter(s => s.tipo === t).length,
    libres: stands.filter(s => s.tipo === t && s.estado === "libre").length,
    apartados: stands.filter(s => s.tipo === t && s.estado === "apartado").length,
    pagados: stands.filter(s => s.tipo === t && s.estado === "pagado").length,
  }));

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#999]" /></div>;

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-3">
        {resumen.map(r => (
          <div key={r.t} className="rounded-2xl border border-[#e8e8ea] bg-white p-4">
            <p className="text-[13px] font-bold" style={{ color: COLOR_TIPO[r.t] === "#fbbf24" ? "#b45309" : COLOR_TIPO[r.t] }}>{NOMBRE[r.t]}</p>
            <p className="mt-1 text-[26px] font-black text-[#111]">{r.libres}<span className="text-[14px] font-semibold text-[#999]"> libres de {r.total}</span></p>
            <p className="text-[12px] text-[#666]">{r.apartados} apartados · {r.pagados} pagados</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#e8e8ea] bg-white p-4"><p className="text-[12px] text-[#666]">Cobrado</p><p className="text-[22px] font-black text-[#16a34a]">{dinero(cobrado)}</p></div>
        <div className="rounded-2xl border border-[#e8e8ea] bg-white p-4"><p className="text-[12px] text-[#666]">Por cobrar (saldos de abonos)</p><p className="text-[22px] font-black text-[#e5007d]">{dinero(saldo)}</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {([["revisar", `Pagos por revisar · ${pendientes.length}`], ["cobrar", `Pendientes de cobro · ${porCobrar.length}`], ["pagados", `Pagados · ${pagados.length}`], ["plano", "Plano y mesas"]] as [Vista, string][]).map(([id, txt]) => (
          <button key={id} onClick={() => setVista(id)} className="rounded-full px-4 py-2 text-[13px] font-semibold"
            style={vista === id ? { background: "#111", color: "#fff" } : { background: "#fff", color: "#555", border: "1px solid #e8e8ea" }}>{txt}</button>
        ))}
      </div>

      {vista === "revisar" && (
        <div className="space-y-3">
          {!pendientes.length && <p className="rounded-2xl border border-dashed border-[#ddd] bg-white p-8 text-center text-[14px] text-[#888]">No hay pagos por revisar.</p>}
          {pendientes.map(p => {
            const r = reservaPorId.get(p.reservaId);
            if (!r) return null;
            const mesa = stands.find(s => s.id === r.standId);
            const tomada = mesa && mesa.estado !== "libre" && mesa.reservaId !== r.id;
            return (
              <div key={p.id} className="rounded-2xl border border-[#e8e8ea] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold text-[#111]">{r.negocio} <span className="text-[13px] font-semibold text-[#888]">· {r.contacto}</span></p>
                    <p className="text-[13px] text-[#555]">Stand <b>{r.numero}</b> · {NOMBRE[r.tipo]} · {dinero(r.precio)} · {r.modalidad === "abono" ? "abono 30%" : "pago completo"}</p>
                    <p className="text-[12px] text-[#888]">{r.email} · {r.whatsapp}{r.rif ? ` · ${r.rif}` : ""} · {fechaRelativa(p.creadoEn).texto}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[22px] font-black text-[#111]">{dinero(p.monto)}</p>
                    <p className="text-[12px] text-[#666]">{METODO[p.metodo] ?? p.metodo} · Ref. {p.referencia || "—"}</p>
                    {p.comprobanteUrl && <a href={p.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#e5007d]">Ver comprobante <ExternalLink size={12} /></a>}
                  </div>
                </div>
                {tomada && (
                  <div className="mt-3 rounded-xl bg-[#fff7ed] p-3 text-[13px] text-[#9a3412]">
                    La mesa {r.numero} ya la tomó otra tienda. Asígnale otra mesa libre antes de aprobar:
                    <select className="ml-2 rounded-lg border border-[#fed7aa] bg-white px-2 py-1" defaultValue="" onChange={e => e.target.value && cambiarMesa.mutate({ reservaId: r.id, standId: Number(e.target.value) })}>
                      <option value="">Elegir mesa…</option>
                      {libresDeTipo(r.tipo).map(s => <option key={s.id} value={s.id}>{s.numero}</option>)}
                    </select>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button disabled={aprobar.isPending || tomada} onClick={() => aprobar.mutate({ pagoId: p.id })} className="flex items-center gap-1.5 rounded-full bg-[#16a34a] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40"><Check size={15} /> Aprobar pago</button>
                  <button onClick={async () => { const v = prompt("Monto que realmente llegó (USD):", String(p.monto)); const n = v ? parseFloat(v.replace(",", ".")) : NaN; if (n > 0) aprobar.mutate({ pagoId: p.id, monto: n }); }} className="rounded-full border border-[#e8e8ea] px-4 py-2 text-[13px] font-semibold text-[#333]">Aprobar otro monto</button>
                  <button onClick={async () => { if (await confirmar({ titulo: "Rechazar pago", mensaje: `El pago de ${dinero(p.monto)} de «${r.negocio}» se marcará como rechazado.`, confirmar: "Rechazar", peligro: true })) rechazar.mutate({ pagoId: p.id }); }} className="rounded-full border border-[#fecaca] px-4 py-2 text-[13px] font-semibold text-[#dc2626]"><X size={14} className="inline" /> Rechazar</button>
                  <a href={enlaceWhatsapp(r.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-4 py-2 text-[13px] font-semibold text-[#15803d]"><MessageCircle size={14} /> WhatsApp</a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(vista === "cobrar" || vista === "pagados") && (
        <div className="space-y-3">
          {!(vista === "cobrar" ? porCobrar : pagados).length && <p className="rounded-2xl border border-dashed border-[#ddd] bg-white p-8 text-center text-[14px] text-[#888]">{vista === "cobrar" ? "Ninguna tienda debe saldo." : "Todavía no hay stands pagados por completo."}</p>}
          {(vista === "cobrar" ? porCobrar : pagados).map(r => (
            <FilaReserva key={r.id} r={r} conCobro={vista === "cobrar"}
              onRegistrar={(monto, metodo, referencia) => registrar.mutate({ reservaId: r.id, monto, metodo, referencia })}
              onAnular={async () => { if (await confirmar({ titulo: "Anular reserva", mensaje: `La mesa ${r.numero} de «${r.negocio}» volverá a estar libre. Lo ya pagado queda registrado.`, confirmar: "Anular", peligro: true })) anular.mutate({ reservaId: r.id }); }}
            />
          ))}
        </div>
      )}

      {vista === "plano" && <EditorPlano stands={stands} onCambio={refrescar} />}
    </div>
  );
}

function FilaReserva({ r, conCobro, onRegistrar, onAnular }: { r: any; conCobro: boolean; onRegistrar: (monto: number, metodo: string, referencia: string) => void; onAnular: () => void }) {
  const saldo = Math.max(0, r.precio - r.pagado);
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState(String(saldo));
  const [metodo, setMetodo] = useState("pago_movil");
  const [ref, setRef] = useState("");
  const pct = Math.min(100, Math.round((r.pagado / r.precio) * 100));
  return (
    <div className="rounded-2xl border border-[#e8e8ea] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-[#111]">{r.negocio} <span className="text-[13px] font-semibold text-[#888]">· {r.contacto}</span></p>
          <p className="text-[13px] text-[#555]">Stand <b>{r.numero}</b> · {NOMBRE[r.tipo]} · {r.email} · {r.whatsapp}</p>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-[#666]">Pagado {dinero(r.pagado)} de {dinero(r.precio)}</p>
          {conCobro ? <p className="text-[20px] font-black text-[#e5007d]">Debe {dinero(saldo)}</p> : <p className="text-[16px] font-black text-[#16a34a]">Pagado ✓</p>}
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1f1f3]"><div className="h-full rounded-full bg-[#16a34a]" style={{ width: `${pct}%` }} /></div>
      <div className="mt-3 flex flex-wrap gap-2">
        {conCobro && <button onClick={() => setAbierto(a => !a)} className="rounded-full bg-[#111] px-4 py-2 text-[13px] font-bold text-white">Registrar pago</button>}
        <a href={enlaceWhatsapp(r.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-4 py-2 text-[13px] font-semibold text-[#15803d]"><MessageCircle size={14} /> WhatsApp</a>
        <button onClick={onAnular} className="rounded-full border border-[#fecaca] px-4 py-2 text-[13px] font-semibold text-[#dc2626]">Anular</button>
      </div>
      {abierto && (
        <div className="mt-3 grid gap-2 rounded-xl bg-[#f8f8f9] p-3 sm:grid-cols-4">
          <input value={monto} onChange={e => setMonto(e.target.value)} inputMode="decimal" placeholder="Monto USD" className="rounded-lg border border-[#e8e8ea] px-3 py-2 text-[15px]" />
          <select value={metodo} onChange={e => setMetodo(e.target.value)} className="rounded-lg border border-[#e8e8ea] px-3 py-2 text-[15px]">
            {Object.entries(METODO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Referencia" className="rounded-lg border border-[#e8e8ea] px-3 py-2 text-[15px]" />
          <button onClick={() => { const n = parseFloat(monto.replace(",", ".")); if (n > 0) { onRegistrar(n, metodo, ref); setAbierto(false); } }} className="rounded-lg bg-[#16a34a] px-3 py-2 text-[14px] font-bold text-white">Guardar</button>
        </div>
      )}
    </div>
  );
}

/** Ubicar las mesas: eliges una y tocas el plano donde va */
function EditorPlano({ stands, onCambio }: { stands: any[]; onCambio: () => void }) {
  const [elegida, setElegida] = useState<number | null>(null);
  const [tipo, setTipo] = useState("mercader");
  const ubicar = trpc.stands.ubicar.useMutation({ onSuccess: onCambio, onError: e => toast.error(e.message) });
  const bloquear = trpc.stands.bloquear.useMutation({ onSuccess: onCambio });
  const mesas: MesaPlano[] = stands.map(s => ({ id: s.id, numero: s.numero, tipo: s.tipo, x: s.x, y: s.y, libre: s.estado === "libre" }));
  const sel = stands.find(s => s.id === elegida);
  const deTipo = stands.filter(s => s.tipo === tipo);
  const siguienteSinUbicar = (desde: number) => deTipo.find(s => s.id !== desde && s.x === null)?.id ?? null;

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[#555]">
        1) Elige una mesa abajo · 2) toca en el plano el lugar donde va. Al ubicarla pasa sola a la siguiente sin ubicar. Las mesas ubicadas aparecen en la página de venta para elegir en el plano.
      </p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(NOMBRE).map(([k, v]) => (
          <button key={k} onClick={() => setTipo(k)} className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold" style={tipo === k ? { background: "#111", color: "#fff" } : { background: "#fff", border: "1px solid #e8e8ea" }}>
            {v} · {stands.filter(s => s.tipo === k && s.x !== null).length}/{stands.filter(s => s.tipo === k).length} ubicadas
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {deTipo.map(s => (
          <button key={s.id} onClick={() => setElegida(s.id)} className="rounded-lg px-2.5 py-1.5 text-[12px] font-bold"
            style={{ background: elegida === s.id ? "#111" : s.x !== null ? "#dcfce7" : "#fff", color: elegida === s.id ? "#fff" : s.estado === "bloqueado" ? "#999" : "#111", border: "1px solid #e8e8ea" }}>
            {s.numero}{s.x !== null ? " ✓" : ""}
          </button>
        ))}
      </div>
      {sel && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#111] px-4 py-3 text-[13px] text-white">
          <MapPin size={15} /> Ubicando <b>{sel.numero}</b> · toca el plano
          {sel.x !== null && <button onClick={() => ubicar.mutate({ standId: sel.id, x: null, y: null })} className="ml-auto flex items-center gap-1 rounded-full bg-white/15 px-3 py-1"><RotateCcw size={12} /> Quitar del plano</button>}
          {(sel.estado === "libre" || sel.estado === "bloqueado") && (
            <button onClick={() => bloquear.mutate({ standId: sel.id, bloquear: sel.estado === "libre" })} className="rounded-full bg-white/15 px-3 py-1">{sel.estado === "bloqueado" ? "Poner a la venta" : "Bloquear (no se vende)"}</button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <MapaStands
            mesas={mesas}
            seleccionada={elegida}
            modoAdmin
            onElegir={m => setElegida(m.id)}
            onTocarPlano={(x, y) => {
              if (!sel) { toast("Primero elige una mesa"); return; }
              ubicar.mutate({ standId: sel.id, x, y });
              setElegida(siguienteSinUbicar(sel.id));
            }}
          />
        </div>
      </div>
    </div>
  );
}
