import { useState } from "react";
import { ExternalLink, Link2, Mic } from "lucide-react";
import { useSocketEvento } from "@/hooks/useSocket";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Acceso del administrador a la invitación de la rueda de prensa.
 * Muestra cuántos confirmaron asistencia (en tiempo real), abre la
 * invitación y copia su enlace para compartirlo o ponerlo en un QR.
 */
const URL_INVITACION = "https://isekaiworld.co/rueda-de-prensa";

export default function TarjetaRuedaPrensa() {
  const utils = trpc.useUtils();
  // El número llega en vivo; la consulta periódica queda solo de respaldo
  const { data, isLoading } = trpc.prensa.total.useQuery(undefined, { refetchInterval: 60_000 });
  const [destello, setDestello] = useState(0);

  useSocketEvento<{ total: number; hoy: number }>("prensa:confirmacion", conteo => {
    utils.prensa.total.setData(undefined, conteo);
    setDestello(d => d + 1);
    toast.success(`🎟️ Nueva confirmación · ya son ${conteo.total}`);
  });

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(URL_INVITACION);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar: " + URL_INVITACION);
    }
  };

  return (
    <div className="ev-notch w-full border border-[#e5007d]/25 bg-gradient-to-br from-[#e5007d]/[0.06] to-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e5007d]">
            <Mic size={12} /> Rueda de prensa · World Fest
          </p>
          <p className="text-sm font-semibold text-[#111]">Sábado 7 de noviembre · 4:30 p. m.</p>
          <p className="text-xs text-[#888]">Arena Panter, CC Costa Verde</p>
        </div>
        <div className="shrink-0 text-right">
          <p key={destello} className={`text-3xl font-black leading-none text-[#111] ${destello > 0 ? "animate-[prensa-pop_0.6s_ease-out]" : ""}`}>
            {isLoading ? "…" : (data?.total ?? 0)}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-[#888]">
            confirmados{data && data.hoy > 0 ? ` · ${data.hoy} hoy` : ""}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <a
          href="/rueda-de-prensa"
          target="_blank"
          rel="noopener noreferrer"
          className="ev-notch flex flex-1 items-center justify-center gap-1.5 bg-[#e5007d] py-2.5 text-xs font-bold text-white"
        >
          <ExternalLink size={14} /> Abrir invitación
        </a>
        <button
          onClick={copiar}
          className="ev-notch flex flex-1 items-center justify-center gap-1.5 border border-[#e5e5e5] bg-white py-2.5 text-xs font-bold text-[#333]"
        >
          <Link2 size={14} /> Copiar enlace
        </button>
      </div>
    </div>
  );
}
