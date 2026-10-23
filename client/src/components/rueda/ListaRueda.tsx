import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Download, Loader2, Mail, MessageCircle, Plus, Search, Store, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { confirmar } from "@/components/admin/ui";

/**
 * Lista de la rueda de negocios. La usan el administrador (en una ventana
 * sobre el panel) y el staff (como página propia, desde el teléfono, en la
 * entrada). El staff no borra ni descarga: solo marca quién llegó y agrega
 * a las tiendas que lleguen sin haber confirmado.
 */

const VERDE = "#4ade80";
const ROSA = "#e5007d";

export function enlaceWhatsapp(n: string): string {
  let d = n.replace(/[^0-9]/g, "");
  if (!n.startsWith("+") && d.startsWith("0")) d = "58" + d.slice(1);
  return `https://wa.me/${d}`;
}

function fecha(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleString("es-VE", { timeZone: "America/Caracas", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function hora(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("es-VE", { timeZone: "America/Caracas", hour: "numeric", minute: "2-digit" });
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

const TONOS = ["#e5007d", "#a78bfa", "#38bdf8", "#2dd4bf", "#fbbf24", "#f87171", "#4ade80"];
function avatar(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const ini = ((partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "")).toUpperCase();
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { ini, color: TONOS[h % TONOS.length] };
}

type Vista = "faltan" | "llegaron" | "sin";

/** Contenido de la lista: cabecera, selector, tarjetas y pie */
export function ListaRueda({ modo, onCerrar, arriba }: { modo: "admin" | "staff"; onCerrar?: () => void; arriba?: ReactNode }) {
  const esAdmin = modo === "admin";
  const utils = trpc.useUtils();
  // Varias personas marcan a la vez en la puerta: se refresca seguido
  const { data, isLoading } = trpc.prensa.lista.useQuery(undefined, { refetchInterval: 10_000 });
  const [vista, setVista] = useState<Vista>("faltan");
  const [buscar, setBuscar] = useState("");
  const [enPuerta, setEnPuerta] = useState(false);

  const borrar = trpc.prensa.borrar.useMutation({
    onSuccess: () => { toast.success("Confirmación eliminada"); void utils.prensa.lista.invalidate(); void utils.prensa.total.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const marcar = trpc.prensa.marcarAsistencia.useMutation({
    // Se ve marcada al instante; si falla, vuelve como estaba
    onMutate: async ({ id, asistio }) => {
      await utils.prensa.lista.cancel();
      const antes = utils.prensa.lista.getData();
      utils.prensa.lista.setData(undefined, filas => filas?.map(f => f.id === id ? { ...f, asistioEn: asistio ? new Date() : null, asistioPor: asistio ? "Tú" : null } : f));
      return { antes };
    },
    onError: (e, _v, c) => { if (c?.antes) utils.prensa.lista.setData(undefined, c.antes); toast.error(e.message); },
    onSettled: () => { void utils.prensa.lista.invalidate(); },
  });

  const todos = data ?? [];
  const conDatos = todos.filter(f => f.datosEn);
  const llegaron = conDatos.filter(f => f.asistioEn);
  const faltan = conDatos.filter(f => !f.asistioEn);
  const sinDatos = todos.filter(f => !f.datosEn);
  const q = buscar.trim().toLowerCase();
  const base = vista === "faltan" ? faltan : vista === "llegaron" ? [...llegaron].sort((a, b) => +new Date(b.asistioEn!) - +new Date(a.asistioEn!)) : sinDatos;
  const visibles = base.filter(f => !q || `${f.tienda ?? ""} ${f.email ?? ""} ${f.whatsapp ?? ""}`.toLowerCase().includes(q));
  const pct = conDatos.length ? Math.round((llegaron.length / conDatos.length) * 100) : 0;

  const pedirBorrar = async (id: number, nombre: string) => {
    if (await confirmar({ titulo: "Eliminar confirmación", mensaje: `Se quitará «${nombre}» de la lista y del conteo. No se puede deshacer.`, confirmar: "Eliminar", peligro: true })) borrar.mutate({ id });
  };
  const alternar = async (f: (typeof todos)[number]) => {
    if (f.asistioEn) {
      const ok = await confirmar({ titulo: "Quitar asistencia", mensaje: `«${f.tienda}» volverá a la lista de «Por llegar».`, confirmar: "Quitar" });
      if (ok) marcar.mutate({ id: f.id, asistio: false });
      return;
    }
    marcar.mutate({ id: f.id, asistio: true });
    toast.success(`${f.tienda} llegó ✓`);
  };

  const copiar = async (texto: string, que: string) => {
    try { await navigator.clipboard.writeText(texto); toast.success(`${que} copiado`); } catch { toast.error("No se pudo copiar"); }
  };

  const descargar = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const filas = [["Tienda", "Correo", "WhatsApp", "Confirmó", "Asistió", "Marcó"], ...conDatos.map(f => [f.tienda ?? "", f.email ?? "", f.whatsapp ?? "", fecha(f.creadoEn), f.asistioEn ? fecha(f.asistioEn) : "No", f.asistioPor ?? ""])];
    const csv = "﻿" + filas.map(r => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "rueda-de-negocios.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const opciones: [Vista, string][] = [
    ["faltan", `Por llegar · ${faltan.length}`],
    ["llegaron", `Llegaron · ${llegaron.length}`],
    ...(esAdmin ? [["sin", `Sin datos · ${sinDatos.length}`] as [Vista, string]] : []),
  ];

  return (
    <>
      {arriba}
      <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#ff3d9e" }}>Rueda de negocios</p>
          <p className="mt-1 text-[21px] font-bold leading-tight text-white">{esAdmin ? "Confirmados" : "Asistencia"}</p>
          <p className="mt-1 text-[13px] text-[#9a93a6]">
            {isLoading ? "Cargando…" : `${conDatos.length} tiendas · ${llegaron.length} llegaron`}
          </p>
        </div>
        {onCerrar && (
          <button onClick={onCerrar} aria-label="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[#cfc9d8] transition-colors hover:bg-white/[0.12]">
            <X size={18} />
          </button>
        )}
      </div>

      {conDatos.length > 0 && (
        <div className="px-5 pb-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: VERDE }} />
          </div>
        </div>
      )}

      <div className="px-5 pb-3">
        <div className={`lc-segmento grid rounded-full p-1 ${opciones.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {opciones.map(([id, txt]) => (
            <button
              key={id}
              onClick={() => setVista(id)}
              className="rounded-full px-1 py-2.5 text-[12.5px] font-semibold transition-colors"
              style={vista === id ? { background: id === "llegaron" ? "#16a34a" : ROSA, color: "#fff" } : { color: "#9a93a6" }}
              aria-pressed={vista === id}
            >
              {txt}
            </button>
          ))}
        </div>
        {vista !== "sin" && conDatos.length > 4 && (
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
              {q ? "Nadie coincide con la búsqueda."
                : vista === "faltan" ? (conDatos.length ? "¡Llegaron todas! 🎉" : "Todavía no hay tiendas con sus datos.")
                : vista === "llegaron" ? "Aún no ha llegado nadie. Toca «Asistió» cuando entre cada tienda."
                : "Todos los que confirmaron dejaron sus datos. 🎉"}
            </p>
          </div>
        ) : vista === "sin" ? (
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
        ) : (
          <ul className="flex flex-col gap-2.5">
            {visibles.map(f => {
              const a = avatar(f.tienda ?? "?");
              const llego = Boolean(f.asistioEn);
              return (
                <li
                  key={f.id}
                  className="lc-tarjeta rounded-3xl p-4 transition-colors"
                  style={llego ? { borderColor: "rgba(74,222,128,0.35)", background: "rgba(74,222,128,0.06)" } : undefined}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-bold" style={{ background: `${a.color}26`, color: a.color }}>
                      {a.ini}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-white">{f.tienda}</p>
                      <p className="truncate text-[12px]" style={{ color: llego ? VERDE : "#7d7688" }}>
                        {llego ? `Llegó ${hora(f.asistioEn)}${f.asistioPor ? ` · ${f.asistioPor}` : ""}` : `Confirmó ${hace(f.creadoEn)}`}
                      </p>
                    </div>
                    {esAdmin && (
                      <button onClick={() => pedirBorrar(f.id, f.tienda ?? "esta confirmación")} aria-label="Eliminar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6f6878] transition-colors hover:bg-[#f87171]/10 hover:text-[#f87171]">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Botón principal: grande para tocarlo rápido en la puerta */}
                  <button
                    onClick={() => alternar(f)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[14px] font-bold transition-colors active:scale-[0.98]"
                    style={llego
                      ? { background: "#16a34a", color: "#fff" }
                      : { background: "rgba(74,222,128,0.1)", color: VERDE, border: "1px solid rgba(74,222,128,0.35)" }}
                  >
                    <Check size={17} strokeWidth={3} /> {llego ? "Asistió" : "Marcar asistió"}
                  </button>

                  {(f.email || f.whatsapp) && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {f.whatsapp ? (
                        <a href={enlaceWhatsapp(f.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-semibold" style={{ background: "rgba(37,211,102,0.12)", color: "#4ade80" }}>
                          <MessageCircle size={15} /> WhatsApp
                        </a>
                      ) : <span />}
                      {f.email ? (
                        <button onClick={() => copiar(f.email!, "Correo")} className="flex min-w-0 items-center justify-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-2.5 text-[13px] font-semibold text-white">
                          <Mail size={15} className="shrink-0" /> <span className="truncate">Copiar correo</span>
                        </button>
                      ) : <span />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex gap-2 border-t border-white/[0.06] px-5 py-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
        <button
          onClick={() => setEnPuerta(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-semibold text-white"
          style={esAdmin ? { background: "rgba(255,255,255,0.07)" } : { background: ROSA }}
        >
          <Plus size={16} /> Llegó sin confirmar
        </button>
        {esAdmin && conDatos.length > 0 && (
          <button onClick={descargar} className="flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-semibold text-white" style={{ background: ROSA }}>
            <Download size={16} /> Excel
          </button>
        )}
      </div>

      {enPuerta && <RegistroPuerta onCerrar={() => setEnPuerta(false)} />}
    </>
  );
}

/** Ventana para el administrador: la lista sobre el panel */
export function VentanaRueda({ onCerrar }: { onCerrar: () => void }) {
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => { document.body.style.overflow = previo; window.removeEventListener("keydown", tecla); };
  }, [onCerrar]);

  // En el body: la tarjeta del panel recorta lo que tiene dentro.
  // Sin role="dialog": el tema oscuro le pone fondo sólido a esos elementos.
  return createPortal(
    <div className="lc-fondo fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-6" onClick={onCerrar}>
      <div
        aria-modal="true"
        aria-label="Rueda de negocios"
        className="lc-hoja flex h-[94vh] w-full max-w-lg flex-col overflow-hidden sm:h-auto sm:max-h-[86vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1.5 w-11 rounded-full bg-white/20" />
        </div>
        <ListaRueda modo="admin" onCerrar={onCerrar} />
      </div>
    </div>,
    document.body,
  );
}

/** Hoja pequeña genérica, con el mismo aspecto de la lista */
export function Hoja({ titulo, subtitulo, onCerrar, children }: { titulo: string; subtitulo?: string; onCerrar: () => void; children: ReactNode }) {
  return createPortal(
    <div className="lc-fondo fixed inset-0 z-[320] flex items-end justify-center sm:items-center sm:p-6" onClick={onCerrar}>
      <div
        aria-modal="true"
        aria-label={titulo}
        className="lc-hoja flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
      >
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1.5 w-11 rounded-full bg-white/20" />
        </div>
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <p className="text-[19px] font-bold leading-tight text-white">{titulo}</p>
            {subtitulo && <p className="mt-1 text-[13px] leading-snug text-[#9a93a6]">{subtitulo}</p>}
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[#cfc9d8]">
            <X size={18} />
          </button>
        </div>
        <div className="px-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export const campoRueda = "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-[16px] text-white outline-none placeholder:text-[#6f6878] focus:border-[#e5007d]/60";
export const etiquetaRueda = "mb-1.5 block text-[12px] font-semibold text-[#9a93a6]";

/** Tienda que llega sin haber confirmado: se agrega ya como presente */
function RegistroPuerta({ onCerrar }: { onCerrar: () => void }) {
  const utils = trpc.useUtils();
  const [tienda, setTienda] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const registrar = trpc.prensa.registrarEnPuerta.useMutation({
    onSuccess: () => {
      toast.success(`${tienda.trim()} registrada y marcada ✓`);
      void utils.prensa.lista.invalidate();
      void utils.prensa.total.invalidate();
      onCerrar();
    },
    onError: e => toast.error(e.message.includes("whatsapp") ? "Revisa el número de WhatsApp" : e.message.includes("email") ? "Revisa el correo" : "No se pudo registrar"),
  });
  return (
    <Hoja titulo="Llegó sin confirmar" subtitulo="Se agrega a la lista ya marcada como presente." onCerrar={onCerrar}>
      <label className={etiquetaRueda}>Nombre de la tienda</label>
      <input value={tienda} onChange={e => setTienda(e.target.value)} maxLength={150} autoFocus placeholder="Ej. Otaku Store" className={`${campoRueda} mb-4`} />
      <label className={etiquetaRueda}>WhatsApp (opcional)</label>
      <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} inputMode="tel" placeholder="0414 123 4567" className={`${campoRueda} mb-4`} />
      <label className={etiquetaRueda}>Correo (opcional)</label>
      <input value={email} onChange={e => setEmail(e.target.value.trim())} inputMode="email" autoCapitalize="none" placeholder="tienda@correo.com" className={`${campoRueda} mb-5`} />
      <button
        onClick={() => registrar.mutate({ tienda, whatsapp, email })}
        disabled={tienda.trim().length < 2 || registrar.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
        style={{ background: ROSA }}
      >
        {registrar.isPending ? <Loader2 size={16} className="animate-spin" /> : <Store size={16} />} Registrar y marcar asistió
      </button>
    </Hoja>
  );
}
