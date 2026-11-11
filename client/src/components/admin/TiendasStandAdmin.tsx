import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useStandsSocket } from "@/hooks/useStandsSocket";

/**
 * Tiendas con stand, para el administrador: pagos de misiones extra por
 * revisar y, por cada tienda, cuántos boletos lleva, cuántos le quedan de su
 * cupo y cuánto ha ganado de comisión.
 */
const METODO: Record<string, string> = { pago_movil: "Pago Móvil", crypto: "Binance Pay", efectivo: "Efectivo" };
const COLOR: Record<string, string> = { mercader: "#38bdf8", gremio: "#a78bfa", gran_gremio: "#fbbf24" };

export default function TiendasStandAdmin({ soloPendientes = false }: { soloPendientes?: boolean }) {
  const utils = trpc.useUtils();
  const { data: extras = [] } = trpc.standTienda.extras.useQuery(undefined, { refetchInterval: 60_000 });
  const { data: tiendas = [], isLoading } = trpc.standTienda.comisiones.useQuery(undefined, { enabled: !soloPendientes, refetchInterval: 60_000 });
  const refrescar = () => { void utils.standTienda.extras.invalidate(); void utils.standTienda.comisiones.invalidate(); };
  useStandsSocket(refrescar);
  const revisar = trpc.standTienda.revisarExtra.useMutation({
    onSuccess: (_r, v) => { toast.success(v.aprobar ? "Pago aprobado: misiones activadas" : "Pago rechazado"); refrescar(); },
    onError: e => toast.error(e.message),
  });
  const pendientes = (extras as any[]).filter(e => e.estado === "pendiente");
  const caja = "rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4";

  const bloquePendientes = pendientes.length > 0 && (
    <div className="rounded-3xl border border-[#fbbf24]/35 bg-[#fbbf24]/[0.07] p-4">
      <p className="text-[14px] font-bold text-[#fde68a]">Misiones extra por revisar ({pendientes.length})</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {pendientes.map((e: any) => (
          <li key={e.id} className="rounded-2xl bg-black/30 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold text-white">{e.tienda}</p>
                <p className="text-[12.5px] text-[#bfb8c9]">{e.cantidad} {e.cantidad === 1 ? "misión" : "misiones"} · {METODO[e.metodo] ?? e.metodo} · ref. {e.referencia || "—"}</p>
                {e.comprobanteUrl && <a href={e.comprobanteUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#7dd8ff]"><ExternalLink size={12} /> Ver comprobante</a>}
              </div>
              <p className="shrink-0 text-[18px] font-black text-white">${e.monto}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button disabled={revisar.isPending} onClick={() => revisar.mutate({ id: e.id, aprobar: false })} className="flex items-center justify-center gap-1.5 rounded-full bg-white/[0.08] py-2.5 text-[13.5px] font-semibold text-white"><X size={15} /> Rechazar</button>
              <button disabled={revisar.isPending} onClick={() => revisar.mutate({ id: e.id, aprobar: true })} className="flex items-center justify-center gap-1.5 rounded-full bg-[#22c55e] py-2.5 text-[13.5px] font-bold text-[#04130a]">{revisar.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Aprobar pago</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  if (soloPendientes) return bloquePendientes || null;

  const lista = tiendas as any[];
  const total = lista.reduce((a, t) => ({ v: a.v + (t.vende ? t.vendidos : 0), g: a.g + t.ganancia, r: a.r + t.recaudadoUsd }), { v: 0, g: 0, r: 0 });
  const extrasCobrados = (extras as any[]).filter(e => e.estado === "aprobado").reduce((a, e) => a + e.monto, 0);

  return (
    <div className="flex flex-col gap-3">
      {bloquePendientes}
      <div className={caja}>
        <p className="text-[15px] font-bold text-white">Tiendas con stand</p>
        <p className="mt-0.5 text-[12.5px] text-[#9a93a6]">Entran solas cuando su stand queda pagado por completo. Gremio y Gran Gremio venden boletos con cupo y ganan $1 por boleto.</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[20px] font-black tabular-nums text-white">{total.v}</p><p className="text-[11px] text-[#9a93a6]">Boletos vendidos</p></div>
          <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[20px] font-black tabular-nums text-[#4ade80]">${total.g}</p><p className="text-[11px] text-[#9a93a6]">Comisiones</p></div>
          <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[20px] font-black tabular-nums text-[#fbbf24]">${extrasCobrados}</p><p className="text-[11px] text-[#9a93a6]">Misiones extra</p></div>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[#ff3d9e]" /></div>
        : lista.length === 0 ? <p className={`${caja} text-center text-[13px] text-[#9a93a6]`}>Todavía no hay stands pagados por completo.</p>
        : lista.map(t => {
          const pct = t.cupo ? Math.min(100, Math.round((t.vendidos / t.cupo) * 100)) : 0;
          return (
            <div key={t.id} className={`${caja} ${t.activa ? "" : "opacity-50"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-white">{t.nombre}</p>
                  <p className="mt-0.5 text-[12px]" style={{ color: COLOR[t.plan] ?? "#fff" }}>{t.planNombre}{t.stand ? ` · stand ${t.stand}` : ""}{t.activa ? "" : " · suspendida"}</p>
                </div>
                {t.vende && <div className="shrink-0 text-right"><p className="text-[18px] font-black tabular-nums text-[#4ade80]">${t.ganancia}</p><p className="text-[10.5px] text-[#9a93a6]">comisión</p></div>}
              </div>
              {t.vende ? (
                <>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-[#e5007d]" style={{ width: `${pct}%` }} /></div>
                  <p className="mt-2 text-[12.5px] text-[#bfb8c9]"><strong className="text-white">{t.vendidos}</strong> de {t.cupo} boletos · le quedan {t.restantes}{t.restantes === 0 ? " (venta cerrada)" : ""} · recaudó ${t.recaudadoUsd.toFixed(2)}</p>
                </>
              ) : <p className="mt-2 text-[12.5px] text-[#9a93a6]">No vende boletos (plan Mercader).</p>}
              <p className="mt-1 text-[12px] text-[#9a93a6]">Misiones puestas: {t.misiones}</p>
            </div>
          );
        })}
    </div>
  );
}
