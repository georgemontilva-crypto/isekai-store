import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Link2, Handshake, Users, X, Download, Mail, MessageCircle, Search, Trash2 } from "lucide-react";
import { confirmar } from "./ui";
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
      className="rounded-2xl w-full p-4 sm:p-5"
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
          className="rounded-full flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
          style={{ background: "#e5007d", color: "#ffffff" }}
        >
          <ExternalLink size={14} /> Abrir invitación
        </a>
        <button
          onClick={copiar}
          className="rounded-full flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
          style={{ background: "#141414", color: "#ffffff", border: "1px solid rgba(255,255,255,0.18)" }}
        >
          <Link2 size={14} /> Copiar enlace
        </button>
      </div>
      <button
        onClick={() => setVerLista(true)}
        className="rounded-full mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
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

function hace(d: Date | string | null): string {
  if (!d) return "";
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  return dias < 7 ? `hace ${dias} d` : fecha(d);
}

/** Iniciales y un color estable por tienda, para reconocerlas de un vistazo */
const TONOS = ["#e5007d", "#a78bfa", "#38bdf8", "#2dd4bf", "#fbbf24", "#f87171", "#4ade80"];
function avatar(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const ini = ((partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "")).toUpperCase();
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { ini, color: TONOS[h % TONOS.length] };
}

/** Ventana con todos los confirmados: tienda, correo y WhatsApp */
function ListaConfirmados({ onCerrar }: { onCerrar: () => void }) {
  const { data, isLoading } = trpc.prensa.lista.useQuery();
  const utils = trpc.useUtils();
  const borrar = trpc.prensa.borrar.useMutation({
    onSuccess: () => { toast.success("Confirmación eliminada"); void utils.prensa.lista.invalidate(); void utils.prensa.total.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const pedirBorrar = async (id: number, nombre: string) => {
    if (await confirmar({ titulo: "Eliminar confirmación", mensaje: `Se quitará «${nombre}» de la lista y del conteo. No se puede deshacer.`, confirmar: "Eliminar", peligro: true })) borrar.mutate({ id });
  };
  const [vista, setVista] = useState<"datos" | "sin">("datos");
  const [buscar, setBuscar] = useState("");
  const todos = data ?? [];
  const conDatos = todos.filter(f => f.datosEn);
  const sinDatos = todos.filter(f => !f.datosEn);
  const q = buscar.trim().toLowerCase();
  const visibles = (vista === "datos" ? conDatos : sinDatos)
    .filter(f => !q || `${f.tienda ?? ""} ${f.email ?? ""} ${f.whatsapp ?? ""}`.toLowerCase().includes(q));

  const copiar = async (texto: string, que: string) => {
    try { await navigator.clipboard.writeText(texto); toast.success(`${que} copiado`); } catch { toast.error("No se pudo copiar"); }
  };

  const descargar = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const filas = [["Tienda", "Correo", "WhatsApp", "Confirmó"], ...conDatos.map(f => [f.tienda ?? "", f.email ?? "", f.whatsapp ?? "", fecha(f.creadoEn)])];
    const csv = "﻿" + filas.map(r => r.map(esc).join(",")).join("\r\n");
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

  // Se monta en el body: la tarjeta recorta sus esquinas y la dejaba encerrada.
  // Sin role="dialog": el tema oscuro le pone fondo sólido a esos elementos.
  return createPortal(
    <div className="lc-fondo fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-6" onClick={onCerrar}>
      <div
        aria-modal="true"
        aria-label="Confirmados de la rueda de negocios"
        className="lc-hoja flex h-[94vh] w-full max-w-lg flex-col overflow-hidden sm:h-auto sm:max-h-[86vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Asa para arrastrar (visual) y cabecera */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1.5 w-11 rounded-full bg-white/20" />
        </div>
        <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#ff3d9e" }}>Rueda de negocios</p>
            <p className="mt-1 text-[21px] font-bold leading-tight text-white">Confirmados</p>
            <p className="mt-1 text-[13px] text-[#9a93a6]">
              {isLoading ? "Cargando…" : `${todos.length} en total · ${conDatos.length} dejaron sus datos`}
            </p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[#cfc9d8] transition-colors hover:bg-white/[0.12]">
            <X size={18} />
          </button>
        </div>

        {/* Selector y buscador */}
        <div className="px-5 pb-3">
          <div className="lc-segmento grid grid-cols-2 rounded-full p-1">
            {([["datos", `Con datos · ${conDatos.length}`], ["sin", `Sin datos · ${sinDatos.length}`]] as const).map(([id, txt]) => (
              <button
                key={id}
                onClick={() => setVista(id)}
                className="rounded-full py-2.5 text-[13px] font-semibold transition-colors"
                style={vista === id ? { background: "#e5007d", color: "#fff" } : { color: "#9a93a6" }}
                aria-pressed={vista === id}
              >
                {txt}
              </button>
            ))}
          </div>
          {vista === "datos" && conDatos.length > 4 && (
            <div className="relative mt-3">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6f6878]" />
              <input
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
                placeholder="Buscar tienda, correo o número"
                className="w-full rounded-full border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-[16px] text-white outline-none placeholder:text-[#6f6878] focus:border-[#e5007d]/60"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {isLoading ? (
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2].map(i => <div key={i} className="h-[104px] animate-pulse rounded-3xl bg-white/[0.04]" />)}
            </div>
          ) : visibles.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.05]">
                <Users size={22} className="text-[#6f6878]" />
              </span>
              <p className="text-[14px] text-[#9a93a6]">
                {q ? "Nadie coincide con la búsqueda." : vista === "datos" ? "Nadie ha dejado sus datos todavía. Aparecerán aquí al momento." : "Todos los que confirmaron dejaron sus datos. 🎉"}
              </p>
            </div>
          ) : vista === "datos" ? (
            <ul className="flex flex-col gap-2.5">
              {visibles.map(f => {
                const a = avatar(f.tienda ?? "?");
                return (
                  <li key={f.id} className="lc-tarjeta rounded-3xl p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-bold" style={{ background: `${a.color}26`, color: a.color }}>
                        {a.ini}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-white">{f.tienda}</p>
                        <p className="text-[12px] text-[#7d7688]">Confirmó {hace(f.creadoEn)}</p>
                      </div>
                      <button onClick={() => pedirBorrar(f.id, f.tienda ?? "esta confirmación")} aria-label="Eliminar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6f6878] transition-colors hover:bg-[#f87171]/10 hover:text-[#f87171]">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {f.email && (
                      <button onClick={() => copiar(f.email!, "Correo")} className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-white/[0.04] px-3.5 py-2.5 text-left text-[13px] text-[#cfc9d8]">
                        <Mail size={14} className="shrink-0 text-[#9a93a6]" />
                        <span className="min-w-0 flex-1 truncate">{f.email}</span>
                        <span className="shrink-0 text-[11px] text-[#6f6878]">Copiar</span>
                      </button>
                    )}
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      {f.whatsapp ? (
                        <a href={enlaceWhatsapp(f.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-semibold" style={{ background: "rgba(37,211,102,0.14)", color: "#4ade80" }}>
                          <MessageCircle size={15} /> WhatsApp
                        </a>
                      ) : <span />}
                      {f.email && (
                        <a href={`mailto:${f.email}`} className="flex items-center justify-center gap-1.5 rounded-full bg-white/[0.07] py-2.5 text-[13px] font-semibold text-white">
                          <Mail size={15} /> Escribir
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <>
              <p className="mb-3 px-1 text-[12.5px] leading-relaxed text-[#9a93a6]">
                Confirmaron sin dejar datos. Verán la ventana para completarlos cuando vuelvan a abrir la invitación en su teléfono.
              </p>
              <ul className="flex flex-col gap-1.5">
                {visibles.map((f, i) => (
                  <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[12px] font-semibold text-[#9a93a6]">{sinDatos.length - i}</span>
                    <span className="flex-1 text-[13.5px] text-[#cfc9d8]">Invitado anónimo</span>
                    <span className="text-[12px] text-[#6f6878]">{hace(f.creadoEn)}</span>
                    <button onClick={() => pedirBorrar(f.id, "este invitado anónimo")} aria-label="Eliminar" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6f6878] hover:text-[#f87171]">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {conDatos.length > 0 && (
          <div className="border-t border-white/[0.06] px-5 py-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
            <button onClick={descargar} className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-semibold text-white" style={{ background: "#e5007d" }}>
              <Download size={16} /> Descargar lista (Excel)
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
