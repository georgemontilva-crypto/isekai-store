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

  // Colores fijos en línea: el tema claro/oscuro del panel no los altera
  return (
    <div
      className="ev-notch w-full p-4 sm:p-5"
      style={{ background: "#050505", border: "1px solid rgba(229,0,125,0.55)", boxShadow: "0 0 24px -8px rgba(229,0,125,0.45)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#ff3d9e" }}>
            <Mic size={12} /> Rueda de prensa
          </p>
          <p className="text-[15px] font-bold leading-snug" style={{ color: "#ffffff" }}>Sábado 7 de noviembre</p>
          <p className="text-[15px] font-bold leading-snug" style={{ color: "#ffffff" }}>4:30 p. m.</p>
          <p className="mt-1 text-xs" style={{ color: "#9a9a9a" }}>Arena Panter, CC Costa Verde</p>
        </div>
        <div className="shrink-0 text-right">
          <p
            key={destello}
            className={`text-4xl font-black leading-none ${destello > 0 ? "animate-[prensa-pop_0.6s_ease-out]" : ""}`}
            style={{ color: "#ff3d9e", textShadow: "0 0 18px rgba(255,61,158,0.45)" }}
          >
            {isLoading ? "…" : (data?.total ?? 0)}
          </p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#bdbdbd" }}>
            confirmados
          </p>
          {data && data.hoy > 0 && (
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "#7a7a7a" }}>{data.hoy} hoy</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <a
          href="/rueda-de-prensa"
          target="_blank"
          rel="noopener noreferrer"
          className="ev-notch flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
          style={{ background: "#e5007d", color: "#ffffff" }}
        >
          <ExternalLink size={14} /> Abrir invitación
        </a>
        <button
          onClick={copiar}
          className="ev-notch flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
          style={{ background: "#141414", color: "#ffffff", border: "1px solid rgba(255,255,255,0.18)" }}
        >
          <Link2 size={14} /> Copiar enlace
        </button>
      </div>
    </div>
  );
}
