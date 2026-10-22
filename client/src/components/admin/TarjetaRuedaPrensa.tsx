import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Link2, Handshake, Users, X, Download, Mail, MessageCircle } from "lucide-react";
import { useSocketEvento } from "@/hooks/useSocket";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Acceso del administrador a la invitación de la rueda de negocios.
 * Muestra cuántos confirmaron asistencia (en tiempo real), abre la
 * invitación y copia su enlace para compartirlo o ponerlo en un QR.
 */
const URL_INVITACION = "https://isekaiworld.co/rueda-de-negocios";

export default function TarjetaRuedaPrensa() {
  const utils = trpc.useUtils();
  // El número llega en vivo; la consulta periódica queda solo de respaldo
  const { data, isLoading } = trpc.prensa.total.useQuery(undefined, { refetchInterval: 60_000 });
  const [destello, setDestello] = useState(0);
  const [verLista, setVerLista] = useState(false);

  useSocketEvento<{ total: number; hoy: number }>("prensa:confirmacion", conteo => {
    utils.prensa.total.setData(undefined, conteo);
    setDestello(d => d + 1);
    toast.success(`🎟️ Nueva confirmación · ya son ${conteo.total}`);
    void utils.prensa.lista.invalidate();
  });
  useSocketEvento("prensa:datos", () => { void utils.prensa.lista.invalidate(); });

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
            <Handshake size={12} /> Rueda de negocios
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
          href="/rueda-de-negocios"
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
      <button
        onClick={() => setVerLista(true)}
        className="ev-notch mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
        style={{ background: "#141414", color: "#ff3d9e", border: "1px solid rgba(229,0,125,0.45)" }}
      >
        <Users size={14} /> Ver confirmados y sus datos
      </button>
      {verLista && <ListaConfirmados onCerrar={() => setVerLista(false)} />}
    </div>
  );
}

/** Enlace de WhatsApp: si el número venezolano viene sin código, se le pone el 58 */
function enlaceWhatsapp(n: string): string {
  let d = n.replace(/[^0-9]/g, "");
  if (!n.startsWith("+") && d.startsWith("0")) d = "58" + d.slice(1);
  return `https://wa.me/${d}`;
}

function fecha(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleString("es-VE", { timeZone: "America/Caracas", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** Ventana con todos los confirmados: tienda, correo y WhatsApp */
function ListaConfirmados({ onCerrar }: { onCerrar: () => void }) {
  const { data, isLoading } = trpc.prensa.lista.useQuery();
  const conDatos = (data ?? []).filter(f => f.datosEn);
  const sinDatos = (data ?? []).length - conDatos.length;

  const descargar = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const filas = [["Tienda", "Correo", "WhatsApp", "Confirmó"], ...conDatos.map(f => [f.tienda ?? "", f.email ?? "", f.whatsapp ?? "", fecha(f.creadoEn)])];
    const csv = "\uFEFF" + filas.map(r => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "confirmados-rueda-de-negocios.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // Mientras está abierta, el panel de atrás no se desplaza
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => { document.body.style.overflow = previo; window.removeEventListener("keydown", tecla); };
  }, [onCerrar]);

  // Se monta fuera de la tarjeta (en el body): la tarjeta recorta sus esquinas
  // y eso dejaba la ventana encerrada y cortada dentro de ella.
  // Sin role="dialog": el tema oscuro le pone fondo sólido a esos elementos.
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={onCerrar}>
      <div
        aria-modal="true"
        aria-label="Confirmados de la rueda de negocios"
        className="flex h-[92vh] w-full max-w-lg flex-col sm:h-auto sm:max-h-[88vh]"
        style={{ background: "#0a0a0a", border: "1px solid rgba(229,0,125,0.45)", paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <p className="text-[15px] font-bold" style={{ color: "#ffffff" }}>Confirmados · rueda de negocios</p>
            <p className="mt-0.5 text-xs" style={{ color: "#9a9a9a" }}>
              {isLoading ? "Cargando…" : `${conDatos.length} con datos · ${sinDatos} sin datos todavía`}
            </p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="p-1.5" style={{ color: "#bdbdbd" }}><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          {!isLoading && conDatos.length === 0 && (
            <p className="py-10 text-center text-sm" style={{ color: "#8a8a8a" }}>
              Nadie ha dejado sus datos todavía. Aparecerán aquí al momento.
            </p>
          )}
          {conDatos.map(f => (
            <div key={f.id} className="py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[14px] font-bold" style={{ color: "#ffffff" }}>{f.tienda}</p>
                <p className="shrink-0 text-[10px]" style={{ color: "#6f6f6f" }}>{fecha(f.creadoEn)}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {f.email && (
                  <a href={`mailto:${f.email}`} className="flex min-w-0 max-w-full items-center gap-1.5 px-2.5 py-1.5 text-xs" style={{ background: "#151515", color: "#d6d6d6" }}>
                    <Mail size={12} className="shrink-0" /> <span className="truncate">{f.email}</span>
                  </a>
                )}
                {f.whatsapp && (
                  <a href={enlaceWhatsapp(f.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs" style={{ background: "#0f2a1a", color: "#6ee7a0" }}>
                    <MessageCircle size={12} /> {f.whatsapp}
                  </a>
                )}
              </div>
            </div>
          ))}
          {sinDatos > 0 && conDatos.length > 0 && (
            <p className="py-4 text-center text-[11px]" style={{ color: "#6f6f6f" }}>
              {sinDatos} {sinDatos === 1 ? "persona confirmó" : "personas confirmaron"} sin dejar datos. Verán el formulario cuando vuelvan a abrir la invitación.
            </p>
          )}
        </div>

        {conDatos.length > 0 && (
          <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <button onClick={descargar} className="ev-notch flex w-full items-center justify-center gap-1.5 py-3 text-xs font-bold" style={{ background: "#e5007d", color: "#ffffff" }}>
              <Download size={14} /> Descargar lista (Excel / CSV)
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
