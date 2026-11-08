import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, Copy, MessageCircle, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { enlaceWhatsapp } from "@/components/rueda/ListaRueda";

/**
 * Recordatorio por WhatsApp a los confirmados de la rueda de negocios.
 *
 * WhatsApp no deja enviar mensajes masivos desde una web sin su API de pago
 * (y sin plantillas aprobadas por Meta). Esto es lo más rápido sin eso: el
 * mensaje se escribe una vez, y con un toque se abre el chat de cada persona
 * con el texto ya puesto. Solo hay que darle «Enviar» en WhatsApp y volver.
 * Cada envío queda marcado en este teléfono para no repetir a nadie.
 */
type Destino = { id: number; tienda: string | null; whatsapp: string | null; tipo?: string | null };

const CLAVE_ENVIADOS = "iw_rueda_recordatorio_enviados";
const CLAVE_MENSAJE = "iw_rueda_recordatorio_mensaje";

const MENSAJE_BASE =
  "Hola, {nombre} 👋\n\n" +
  "Le recordamos que *mañana, sábado 7 de noviembre a las 4:30 p. m.*, es la rueda de negocios oficial de *Isekai World Fest 2027*.\n\n" +
  "📍 Arena Panter, CC Costa Verde, Maracaibo.\n\n" +
  "Su lugar ya está reservado. ¡Le esperamos!\n" +
  "https://www.isekaiworld.co/rueda-de-negocios";

function leer<T>(clave: string, porDefecto: T): T {
  try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : porDefecto; } catch { return porDefecto; }
}
function guardar(clave: string, valor: unknown) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}

export default function RecordatorioWhatsapp({ destinos, grupo, onCerrar }: { destinos: Destino[]; grupo: string; onCerrar: () => void }) {
  const [mensaje, setMensaje] = useState<string>(() => leer(CLAVE_MENSAJE, MENSAJE_BASE));
  const [enviados, setEnviados] = useState<number[]>(() => leer(CLAVE_ENVIADOS, [] as number[]));

  const lista = useMemo(() => destinos.filter(d => (d.whatsapp ?? "").replace(/\D/g, "").length >= 7), [destinos]);
  const pendientes = lista.filter(d => !enviados.includes(d.id));
  const siguiente = pendientes[0];

  const textoPara = (d: Destino) => mensaje.replace(/\{nombre\}/g, (d.tienda ?? "").trim() || "estimado invitado");
  const enlace = (d: Destino) => `${enlaceWhatsapp(d.whatsapp!)}?text=${encodeURIComponent(textoPara(d))}`;

  const marcar = (id: number) => {
    const nuevos = Array.from(new Set([...enviados, id]));
    setEnviados(nuevos); guardar(CLAVE_ENVIADOS, nuevos);
  };
  const cambiarMensaje = (v: string) => { setMensaje(v); guardar(CLAVE_MENSAJE, v); };
  const reiniciar = () => { setEnviados([]); guardar(CLAVE_ENVIADOS, []); toast.success("Lista reiniciada"); };

  // Abre el chat con el mensaje listo y lo marca como enviado
  const abrir = (d: Destino) => {
    window.open(enlace(d), "_blank", "noopener,noreferrer");
    marcar(d.id);
  };

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/70 sm:items-center" onClick={onCerrar}>
      <div
        className="flex max-h-[92svh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0d0b12] sm:rounded-3xl"
        onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Recordatorio por WhatsApp"
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4ade80]">Mensaje · {grupo}</p>
            <p className="mt-1 text-[20px] font-bold leading-tight text-white">Enviar por WhatsApp</p>
            <p className="mt-1 text-[13px] text-[#9a93a6]">
              {lista.length} con WhatsApp · {lista.length - pendientes.length} enviados · {pendientes.length} por enviar
            </p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[#cfc9d8]">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          <label className="mb-1.5 block text-[12px] font-semibold text-[#cfc9d8]">Mensaje</label>
          <textarea
            value={mensaje}
            onChange={e => cambiarMensaje(e.target.value)}
            rows={8}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-[15px] leading-relaxed text-white outline-none focus:border-[#4ade80]/60"
          />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#8d8697]">
            <span><b className="text-[#cfc9d8]">{"{nombre}"}</b> se cambia por el nombre de cada tienda o medio.</span>
            <button onClick={() => cambiarMensaje(MENSAJE_BASE)} className="underline">Restaurar texto</button>
          </div>

          {/* El siguiente: botón grande, uno tras otro */}
          {siguiente ? (
            <button
              onClick={() => abrir(siguiente)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-bold text-[#04130a] active:scale-[0.98]"
              style={{ background: "#25d366" }}
            >
              <MessageCircle size={18} /> Enviar a {siguiente.tienda || siguiente.whatsapp} <ChevronRight size={18} />
            </button>
          ) : (
            <p className="mt-5 rounded-2xl bg-[#16a34a]/15 px-4 py-3 text-center text-[14px] font-semibold text-[#4ade80]">
              ✓ Ya se le abrió el mensaje a todos
            </p>
          )}
          <p className="mt-2 text-center text-[12px] text-[#8d8697]">
            Se abre WhatsApp con el texto listo: dale <b>Enviar</b> y vuelve aquí para el siguiente.
          </p>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8d8697]">Lista</p>
            {enviados.length > 0 && (
              <button onClick={reiniciar} className="flex items-center gap-1 text-[12px] text-[#9a93a6]"><RotateCcw size={13} /> Empezar de nuevo</button>
            )}
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {lista.map(d => {
              const hecho = enviados.includes(d.id);
              return (
                <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${hecho ? "bg-[#16a34a] text-white" : "bg-white/[0.07] text-[#6f6878]"}`}>
                    {hecho ? <Check size={15} strokeWidth={3} /> : <MessageCircle size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-white">{d.tienda || "Sin nombre"}</span>
                    <span className="block truncate text-[12px] text-[#8d8697]">{d.whatsapp}{d.tipo === "medio" ? " · Medio" : ""}</span>
                  </span>
                  <button
                    onClick={() => { void navigator.clipboard?.writeText(textoPara(d)).then(() => toast.success("Mensaje copiado")).catch(() => {}); }}
                    aria-label="Copiar mensaje" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.07] text-[#cfc9d8]"
                  ><Copy size={14} /></button>
                  <button
                    onClick={() => abrir(d)}
                    className="rounded-full px-3 py-2 text-[12.5px] font-bold"
                    style={hecho ? { background: "rgba(255,255,255,0.07)", color: "#cfc9d8" } : { background: "rgba(37,211,102,0.15)", color: "#4ade80" }}
                  >{hecho ? "Reenviar" : "Enviar"}</button>
                </li>
              );
            })}
            {!lista.length && <li className="py-6 text-center text-[13px] text-[#8d8697]">Nadie dejó WhatsApp todavía.</li>}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
