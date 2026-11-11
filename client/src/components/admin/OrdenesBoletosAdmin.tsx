import { useState } from "react";
import { Check, ExternalLink, Loader2, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useStandsSocket } from "@/hooks/useStandsSocket";

/**
 * Compras de boletos hechas por la web. Las de Binance verificadas se aprueban
 * solas; aquí quedan las que hay que revisar a mano (Pago Móvil, o Binance que
 * no coincidió) y el historial reciente.
 */
const METODO: Record<string, string> = { pago_movil: "Pago Móvil", crypto: "Binance Pay" };
const NOTA: Record<string, string> = {
  binance_no_encontrado: "Binance: ese número de transacción no aparece en la cuenta",
  binance_monto_menor: "Binance: el pago es por menos del total",
  binance_ya_usado: "Binance: ese número ya se usó en otra compra",
  binance_moneda: "Binance: el pago no es en USDT",
  binance_no_es_ingreso: "Binance: esa transacción no es un pago recibido",
  binance_formato: "Binance: el número no tiene formato válido",
  binance_error: "Binance no respondió: revísalo a mano",
  binance_sin_configurar: "Verificación automática de Binance sin configurar",
};

export default function OrdenesBoletosAdmin() {
  const utils = trpc.useUtils();
  const { data: ordenes = [] } = trpc.boletosOnline.ordenes.useQuery(undefined, { refetchInterval: 60_000 });
  const refrescar = () => { void utils.boletosOnline.ordenes.invalidate(); void utils.tickets.resumen.invalidate(); };
  useStandsSocket(refrescar);
  const [verTodas, setVerTodas] = useState(false);
  const revisar = trpc.boletosOnline.revisar.useMutation({
    onSuccess: (_r, v) => { toast.success(v.aprobar ? "Aprobada: boletos enviados por correo" : "Compra rechazada"); refrescar(); },
    onError: e => toast.error(e.message),
  });
  const lista = ordenes as any[];
  const pendientes = lista.filter(o => o.estado === "pendiente");
  const resto = lista.filter(o => o.estado !== "pendiente");
  if (lista.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {pendientes.length > 0 && (
        <div className="rounded-3xl border border-[#fbbf24]/35 bg-[#fbbf24]/[0.07] p-4">
          <p className="text-[14px] font-bold text-[#fde68a]">Compras por la web por revisar ({pendientes.length})</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {pendientes.map(o => (
              <li key={o.id} className="rounded-2xl bg-black/30 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-semibold text-white">{o.nombre} {o.apellido}</p>
                    <p className="text-[12.5px] text-[#bfb8c9]">{o.cantidad} × {o.tipoNombre}</p>
                    <p className="break-all text-[12.5px] text-[#bfb8c9]">{METODO[o.metodo] ?? o.metodo} · ref. {o.referencia || "—"}</p>
                    <p className="truncate text-[12px] text-[#8a8494]">{o.email} · {o.telefono}</p>
                    {o.verificacion && NOTA[o.verificacion] && <p className="mt-1 flex items-start gap-1.5 text-[12px] text-[#fca5a5]"><ShieldAlert size={13} className="mt-0.5 shrink-0" /> {NOTA[o.verificacion]}</p>}
                    {o.comprobanteUrl && <a href={o.comprobanteUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#7dd8ff]"><ExternalLink size={12} /> Ver comprobante</a>}
                  </div>
                  <p className="shrink-0 text-[18px] font-black tabular-nums text-white">${o.monto}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button disabled={revisar.isPending} onClick={() => revisar.mutate({ id: o.id, aprobar: false })} className="flex items-center justify-center gap-1.5 rounded-full bg-white/[0.08] py-2.5 text-[13.5px] font-semibold text-white"><X size={15} /> Rechazar</button>
                  <button disabled={revisar.isPending} onClick={() => revisar.mutate({ id: o.id, aprobar: true })} className="flex items-center justify-center gap-1.5 rounded-full bg-[#22c55e] py-2.5 text-[13.5px] font-bold text-[#04130a]">{revisar.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Aprobar y enviar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {resto.length > 0 && (
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4">
          <button onClick={() => setVerTodas(v => !v)} className="flex w-full items-center justify-between text-left">
            <span className="text-[14px] font-bold text-white">Ventas por la web <span className="font-semibold text-[#9a93a6]">· {resto.filter(o => o.estado === "aprobado").length} aprobadas</span></span>
            <span className="text-[12.5px] font-semibold text-[#7dd8ff]">{verTodas ? "Ocultar" : "Ver"}</span>
          </button>
          {verTodas && (
            <ul className="mt-3 flex flex-col divide-y divide-white/[0.06]">
              {resto.slice(0, 60).map(o => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-white">{o.nombre} {o.apellido} · {o.cantidad} × {o.tipoNombre}</p>
                    <p className="truncate text-[12px] text-[#9a93a6]">{METODO[o.metodo] ?? o.metodo} · {o.verificacion === "binance_ok" ? "verificado solo" : o.estado === "aprobado" ? "aprobado a mano" : "rechazado"}</p>
                  </div>
                  <p className={`shrink-0 text-[14px] font-black tabular-nums ${o.estado === "aprobado" ? "text-[#4ade80]" : "text-[#8a8494] line-through"}`}>${o.monto}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
