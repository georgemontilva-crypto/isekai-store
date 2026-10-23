import { useState } from "react";
import { DoorOpen, Handshake, Loader2, Mail, Search, Store, Trash2, UserPlus, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { confirmar } from "./ui";
import { Hoja, campoRueda, etiquetaRueda } from "@/components/rueda/ListaRueda";

/**
 * Equipo del evento: cada persona una sola vez, con sus funciones. Desde aquí
 * se agrega gente, se le dan o quitan funciones y se pausa a alguien.
 *
 * Cada función abre solo su herramienta:
 *   Tienda   → vender boletos (y dar EXP si se autoriza)
 *   Portero  → control de acceso en la puerta
 *   EXP      → dar experiencia en una estación
 *   Rueda    → marcar asistencia en la rueda de negocios
 */
type Rol = "tienda" | "portero" | "xp" | "rueda";

const ROLES: { id: Rol; nombre: string; corto: string; ayuda: string; color: string; icono: typeof Store }[] = [
  { id: "tienda", nombre: "Tienda · vende boletos", corto: "Tienda", ayuda: "Escanea boletos en blanco y los vende", color: "#e5007d", icono: Store },
  { id: "portero", nombre: "Portero · control de acceso", corto: "Portero", ayuda: "Valida la entrada en la puerta", color: "#2dd4bf", icono: DoorOpen },
  { id: "xp", nombre: "Personal · da EXP", corto: "EXP", ayuda: "Da experiencia en su estación", color: "#38bdf8", icono: Zap },
  { id: "rueda", nombre: "Staff · rueda de negocios", corto: "Rueda", ayuda: "Marca qué tiendas llegaron", color: "#ff3d9e", icono: Handshake },
];

export default function EquipoEvento() {
  const utils = trpc.useUtils();
  const { data: equipo = [], isLoading } = trpc.equipo.lista.useQuery();
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState<Rol | "todos">("todos");
  const [nuevo, setNuevo] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);

  const tiene = (p: (typeof equipo)[number], r: Rol) => r === "tienda" ? !!p.tienda : r === "portero" ? !!p.portero : r === "xp" ? !!p.xp : p.rueda;
  const q = buscar.trim().toLowerCase();
  const visibles = equipo
    .filter(p => filtro === "todos" || tiene(p, filtro))
    .filter(p => !q || `${p.nombre} ${p.email} ${p.tienda?.nombre ?? ""}`.toLowerCase().includes(q));
  const persona = equipo.find(p => (p.email || p.nombre) === abierta);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-3xl bg-white/[0.035] p-4">
        <p className="text-[15px] font-bold text-[var(--iw-text)]">Todo el equipo en un solo lugar</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--iw-text-muted)]">
          Agrega a cada persona con su correo y elige qué hace. Al entrar a la web con ese correo le aparece solo su herramienta.
        </p>
        <button onClick={() => setNuevo(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold text-white" style={{ background: "#e5007d" }}>
          <UserPlus size={16} /> Agregar persona
        </button>
      </div>

      {/* Filtro por función */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {([["todos", `Todos · ${equipo.length}`, "#e5007d"], ...ROLES.map(r => [r.id, `${r.corto} · ${equipo.filter(p => tiene(p, r.id)).length}`, r.color])] as [Rol | "todos", string, string][]).map(([id, txt, color]) => (
          <button key={id} onClick={() => setFiltro(id)} className="shrink-0 rounded-full px-3.5 text-[12px] font-semibold"
            style={{ minHeight: 38, ...(filtro === id ? { background: color, color: "#fff" } : { border: "1px solid var(--iw-border)", color: "var(--iw-text-muted)" }) }}>
            {txt}
          </button>
        ))}
      </div>

      {equipo.length > 5 && (
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--iw-text-muted)]" />
          <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar nombre, correo o tienda" className={`${campoRueda} pl-11`} />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[var(--iw-text-muted)]" /></div>
      ) : visibles.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white/[0.02] px-6 py-10 text-center">
          <Users size={22} className="mb-2 text-[var(--iw-text-muted)]" />
          <p className="text-[13px] text-[var(--iw-text-muted)]">{equipo.length ? "Nadie coincide." : "Todavía no hay nadie en el equipo."}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibles.map(p => (
            <li key={p.email || p.nombre}>
              <button onClick={() => setAbierta(p.email || p.nombre)} className="w-full rounded-3xl border border-white/[0.06] bg-white/[0.035] p-4 text-left transition-colors active:bg-white/[0.06]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[var(--iw-text)]">{p.tienda?.nombre && p.tienda.nombre !== p.nombre ? `${p.nombre} · ${p.tienda.nombre}` : p.nombre}</p>
                    <p className="truncate text-[12px] text-[var(--iw-text-muted)]">{p.email || "Sin correo"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${p.entro ? "bg-[#4ade80]/12 text-[#4ade80]" : "bg-white/[0.06] text-[var(--iw-text-muted)]"}`}>
                    {p.entro ? "Ya entró" : "No ha entrado"}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {ROLES.filter(r => tiene(p, r.id)).map(r => {
                    const pausado = r.id === "tienda" ? !p.tienda?.activa : r.id === "portero" ? !p.portero?.activo : r.id === "xp" ? !p.xp?.activo : false;
                    return (
                      <span key={r.id} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${r.color}1f`, color: r.color, opacity: pausado ? 0.5 : 1 }}>
                        <r.icono size={12} /> {r.corto}{pausado ? " · pausado" : ""}{r.id === "tienda" && p.tienda?.daXp ? " + EXP" : ""}
                      </span>
                    );
                  })}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {nuevo && <NuevaPersona onCerrar={() => setNuevo(false)} onListo={() => { void utils.equipo.lista.invalidate(); setNuevo(false); }} />}
      {persona && <FichaPersona p={persona} onCerrar={() => setAbierta(null)} />}
    </div>
  );
}

function NuevaPersona({ onCerrar, onListo }: { onCerrar: () => void; onListo: () => void }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<Rol[]>([]);
  const [nombreTienda, setNombreTienda] = useState("");
  const [telefono, setTelefono] = useState("");
  const [daXp, setDaXp] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const asignar = trpc.equipo.asignar.useMutation();

  const alternar = (r: Rol) => setRoles(rs => rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]);
  const valido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && nombre.trim().length > 1 && roles.length > 0 && (!roles.includes("tienda") || nombreTienda.trim().length > 1);

  const guardar = async () => {
    setGuardando(true);
    try {
      for (const rol of roles) {
        await asignar.mutateAsync({ email, nombre, rol, activo: true, nombreTienda, telefono, daXp });
      }
      toast.success(`${nombre.trim()} agregado. Le llegó un correo con su acceso.`);
      onListo();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo agregar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Hoja titulo="Agregar persona" subtitulo="Entra a la web con este correo y ve solo lo que le toca." onCerrar={onCerrar}>
      <label className={etiquetaRueda}>Nombre</label>
      <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={200} placeholder="Ej. Ana Pérez" className={`${campoRueda} mb-3`} />
      <label className={etiquetaRueda}>Correo con el que entra</label>
      <input value={email} onChange={e => setEmail(e.target.value.trim())} inputMode="email" autoCapitalize="none" placeholder="ana@gmail.com" className={`${campoRueda} mb-4`} />

      <label className={etiquetaRueda}>¿Qué va a hacer? (puede ser más de una)</label>
      <div className="mb-4 flex flex-col gap-1.5">
        {ROLES.map(r => {
          const on = roles.includes(r.id);
          return (
            <button key={r.id} onClick={() => alternar(r.id)} className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left"
              style={on ? { borderColor: r.color, background: `${r.color}14` } : { borderColor: "rgba(255,255,255,0.1)" }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${r.color}22`, color: r.color }}><r.icono size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-white">{r.nombre}</span>
                <span className="block text-[12px] text-[#9a93a6]">{r.ayuda}</span>
              </span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px]" style={on ? { background: r.color, borderColor: r.color, color: "#fff" } : { borderColor: "rgba(255,255,255,0.25)" }}>{on ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>

      {roles.includes("tienda") && (
        <div className="mb-4 rounded-2xl bg-white/[0.03] p-3">
          <label className={etiquetaRueda}>Nombre de la tienda</label>
          <input value={nombreTienda} onChange={e => setNombreTienda(e.target.value)} maxLength={200} placeholder="Ej. Otaku Store" className={`${campoRueda} mb-3`} />
          <label className={etiquetaRueda}>Teléfono (opcional)</label>
          <input value={telefono} onChange={e => setTelefono(e.target.value)} inputMode="tel" maxLength={50} className={`${campoRueda} mb-3`} />
          <label className="flex items-center gap-2.5 text-[13px] text-white">
            <input type="checkbox" checked={daXp} onChange={e => setDaXp(e.target.checked)} className="h-4 w-4 accent-[#e5007d]" />
            También puede dar EXP en su puesto
          </label>
        </div>
      )}

      <button onClick={guardar} disabled={!valido || guardando} className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-bold text-white disabled:opacity-45" style={{ background: "#e5007d" }}>
        {guardando ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Agregar y enviar acceso
      </button>
    </Hoja>
  );
}

function FichaPersona({ p, onCerrar }: { p: any; onCerrar: () => void }) {
  const utils = trpc.useUtils();
  const refrescar = () => void utils.equipo.lista.invalidate();
  const asignar = trpc.equipo.asignar.useMutation({ onSuccess: refrescar, onError: e => toast.error(e.message) });
  const pausar = trpc.equipo.pausar.useMutation({ onSuccess: refrescar, onError: e => toast.error(e.message) });
  const quitar = trpc.equipo.quitar.useMutation({ onSuccess: () => { refrescar(); toast.success("Quitado del equipo"); onCerrar(); }, onError: e => toast.error(e.message) });
  const reenviar = trpc.tickets.reenviarAcceso.useMutation({ onSuccess: () => toast.success("Correo de acceso reenviado"), onError: e => toast.error(e.message) });
  const [nombreTienda, setNombreTienda] = useState(p.tienda?.nombre ?? "");
  const ocupado = asignar.isPending || pausar.isPending;

  const estado = (r: Rol): "no" | "activo" | "pausado" => {
    if (r === "tienda") return p.tienda ? (p.tienda.activa ? "activo" : "pausado") : "no";
    if (r === "portero") return p.portero ? (p.portero.activo ? "activo" : "pausado") : "no";
    if (r === "xp") return p.xp ? (p.xp.activo ? "activo" : "pausado") : "no";
    return p.rueda ? "activo" : "no";
  };

  const sinCorreo = !p.email;

  return (
    <Hoja titulo={p.nombre} subtitulo={p.email || "Sin correo: no puede entrar"} onCerrar={onCerrar}>
      <p className="mb-2 mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a93a6]">Funciones</p>
      <div className="mb-5 flex flex-col gap-2">
        {ROLES.map(r => {
          const e = estado(r.id);
          return (
            <div key={r.id} className="rounded-2xl border px-4 py-3" style={{ borderColor: e === "no" ? "rgba(255,255,255,0.08)" : `${r.color}55`, background: e === "activo" ? `${r.color}10` : "transparent" }}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${r.color}22`, color: r.color }}><r.icono size={17} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-white">{r.nombre}</p>
                  <p className="text-[12px]" style={{ color: e === "activo" ? r.color : "#9a93a6" }}>{e === "activo" ? "Activo" : e === "pausado" ? "Pausado" : "Sin esta función"}</p>
                </div>
                {e === "no" ? (
                  <button disabled={ocupado || sinCorreo || (r.id === "tienda" && nombreTienda.trim().length < 2)} onClick={() => asignar.mutate({ email: p.email, nombre: p.nombre, rol: r.id, activo: true, nombreTienda })}
                    className="shrink-0 rounded-full px-3.5 py-2 text-[12px] font-bold text-white disabled:opacity-40" style={{ background: r.color }}>
                    Dar
                  </button>
                ) : r.id === "rueda" ? (
                  <button disabled={ocupado} onClick={() => asignar.mutate({ email: p.email, nombre: p.nombre, rol: "rueda", activo: false })} className="shrink-0 rounded-full bg-white/[0.07] px-3.5 py-2 text-[12px] font-semibold text-white">Quitar</button>
                ) : (
                  <div className="flex shrink-0 gap-1.5">
                    <button disabled={ocupado || sinCorreo} onClick={() => pausar.mutate({ email: p.email, rol: r.id as "tienda" | "portero" | "xp", activo: e !== "activo" })} className="rounded-full bg-white/[0.07] px-3 py-2 text-[12px] font-semibold text-white">
                      {e === "activo" ? "Pausar" : "Activar"}
                    </button>
                    <button disabled={ocupado} aria-label="Quitar función"
                      onClick={async () => { if (await confirmar({ titulo: `Quitar ${r.corto.toLowerCase()}`, mensaje: r.id === "tienda" ? "Si ya vendió boletos, la tienda queda desactivada para conservar sus ventas." : "Dejará de ver esta herramienta.", confirmar: "Quitar", peligro: true })) asignar.mutate({ email: p.email, nombre: p.nombre, rol: r.id, activo: false }); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[#9a93a6] hover:text-[#f87171]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              {r.id === "tienda" && e === "no" && !sinCorreo && (
                <input value={nombreTienda} onChange={ev => setNombreTienda(ev.target.value)} placeholder="Nombre de la tienda" className={`${campoRueda} mt-3`} />
              )}
              {r.id === "tienda" && e !== "no" && (
                <label className="mt-3 flex items-center gap-2.5 text-[13px] text-white">
                  <input type="checkbox" checked={!!p.tienda?.daXp} disabled={ocupado} onChange={ev => asignar.mutate({ email: p.email, nombre: p.nombre, rol: "tienda", activo: true, daXp: ev.target.checked })} className="h-4 w-4 accent-[#e5007d]" />
                  También puede dar EXP
                </label>
              )}
            </div>
          );
        })}
      </div>

      {p.tienda && (
        <button onClick={() => reenviar.mutate({ id: p.tienda.id })} disabled={reenviar.isPending} className="mb-2 flex w-full items-center justify-center gap-2 rounded-full bg-white/[0.07] py-3.5 text-[14px] font-semibold text-white">
          {reenviar.isPending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Reenviar correo de acceso
        </button>
      )}
      {!sinCorreo && (
        <button
          onClick={async () => { if (await confirmar({ titulo: "Quitar del equipo", mensaje: `${p.nombre} pierde todas sus funciones.`, confirmar: "Quitar", peligro: true })) quitar.mutate({ email: p.email }); }}
          className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13px] font-semibold text-[#f87171]"
        >
          <Trash2 size={15} /> Quitar del equipo
        </button>
      )}
    </Hoja>
  );
}
