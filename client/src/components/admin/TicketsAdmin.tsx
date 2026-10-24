import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Plus, Download, Store, Ticket, Trash2, Mail, Check, BarChart3, Settings2, Zap, Search, X, Users } from "lucide-react";
import { confirmar } from "./ui";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DetalleBoleto from "./DetalleBoleto";
import EquipoEvento from "./EquipoEvento";
import TiposBoleto from "./TiposBoleto";
import SorteoVip from "./SorteoVip";

/**
 * Boletería de eventos — panel del dueño.
 *
 * Aquí se crean los eventos, se definen los tipos de boleto con su precio, se
 * autorizan las tiendas y se generan los QR en blanco. Los totales se
 * actualizan en vivo conforme las tiendas registran ventas.
 */
/** $12.00 — si el valor viene vacío muestra $0.00 en vez de romper la pantalla */
const usd = (n: unknown) => "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Formulario plegado detrás de un botón «+ …». En el teléfono lo primero que
 * se ve son tus datos (tipos, tiendas, actividades), no un formulario vacío.
 */
function Plegable({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="rounded-2xl flex w-full items-center justify-center gap-2 border border-dashed border-[#e5007d]/60 text-sm font-bold text-[#ff3d9e] transition-colors hover:bg-[#e5007d]/10"
        style={{ minHeight: 52, WebkitTapHighlightColor: "transparent" }}
      >
        <Plus size={16} /> {titulo}
      </button>
    );
  }
  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(false)}
        className="absolute right-3 top-3 z-10 p-1 text-[var(--iw-text-muted)] hover:text-[var(--iw-text)]"
        aria-label="Cerrar formulario"
      >
        <X size={16} />
      </button>
      {children}
    </div>
  );
}

export default function TicketsAdmin({ compact = false, vistaFija }: {
  compact?: boolean;
  /** Cuando la navegación la lleva la barra inferior, la vista viene dada */
  vistaFija?: "resumen" | "boletos" | "codigos" | "tipos" | "tiendas" | "acceso" | "levelpass" | "equipo" | "sorteo";
}) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const habilitado = isAuthenticated && user?.role === "admin";

  const [eventoId, setEventoId] = useState<number | null>(null);
  /** Buscador de Vendidos y Códigos (nombre, apellido, código o teléfono) */
  const [busqueda, setBusqueda] = useState("");
  const coincide = (b: any) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return [b.code, b.buyerName, b.buyerLastName, b.buyerPhone, `${b.buyerName ?? ""} ${b.buyerLastName ?? ""}`]
      .some(v => String(v ?? "").toLowerCase().includes(q));
  };
  const [vistaLocal, setVistaLocal] = useState<"resumen" | "boletos" | "codigos" | "tipos" | "tiendas" | "acceso" | "levelpass" | "equipo" | "sorteo">("resumen");

  /**
   * La vista puede venir de la barra inferior del teléfono, pero en cuanto se
   * toca una pestaña interna manda la elección local: la barra no llega a
   * todas las secciones y sin esto quedaban inalcanzables.
   */
  const [usarLocal, setUsarLocal] = useState(false);
  const vista = usarLocal || !vistaFija ? vistaLocal : vistaFija;
  const setVista = (v: typeof vistaLocal) => { setUsarLocal(true); setVistaLocal(v); };

  // Si la barra inferior cambia de sección, vuelve a mandar ella
  useEffect(() => {
    if (vistaFija) { setUsarLocal(false); setVistaLocal(vistaFija); }
  }, [vistaFija]);

  const { data: eventos = [] } = trpc.tickets.eventos.useQuery(undefined, { enabled: habilitado });
  // Por defecto, el evento en curso o el próximo (no el último creado)
  const eventoPorDefecto = (() => {
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date());
    const dia = (d: any) => new Date(d).toISOString().slice(0, 10);
    const vigentes = (eventos as any[]).filter(e => e.active !== false && dia(e.endDate) >= hoy)
      .sort((a, b) => dia(a.startDate).localeCompare(dia(b.startDate)));
    return vigentes[0] ?? eventos[0];
  })();
  const evento = eventos.find((e: any) => e.id === eventoId) ?? eventoPorDefecto;

  useEffect(() => {
    if (!eventoId && eventos.length && eventoPorDefecto) setEventoId(eventoPorDefecto.id);
  }, [eventos, eventoId]);

  const { data: resumen } = trpc.tickets.resumen.useQuery(
    { eventId: evento?.id ?? 0 }, { enabled: habilitado && !!evento, refetchInterval: 15000 },
  );
  const { data: tipos = [] } = trpc.tickets.tipos.useQuery(
    { eventId: evento?.id ?? 0 }, { enabled: habilitado && !!evento },
  );
  const { data: tiendas = [] } = trpc.tickets.tiendas.useQuery(undefined, { enabled: habilitado });
  const { data: ventasDia = [] } = trpc.tickets.ventasPorDia.useQuery(
    { eventId: evento?.id ?? 0 }, { enabled: habilitado && !!evento && vista === "resumen", refetchInterval: 30000 },
  );
  // ── Level Pass ──
  const { data: lpActividades = [] } = trpc.levelPass.actividades.useQuery(
    { eventId: evento?.id ?? 0 }, { enabled: habilitado && !!evento && vista === "levelpass" },
  );
  const { data: lpResumen } = trpc.levelPass.resumen.useQuery(
    { eventId: evento?.id ?? 0 },
    { enabled: habilitado && !!evento && vista === "levelpass", refetchInterval: 20000 },
  );
  const { data: lpStaff = [] } = trpc.levelPass.staff.useQuery(undefined, {
    enabled: habilitado && vista === "levelpass",
  });

  const [codigoXp, setCodigoXp] = useState("IW-TEST01");
  const darXp = trpc.levelPass.darXpPrueba.useMutation({
    onSuccess: (r: any) => {
      utils.levelPass.resumen.invalidate();
      toast.success(r.subioDeRango
        ? `${r.nombre}: ¡subió a rango ${r.rango}! (${r.xpTotal} XP)`
        : `${r.nombre}: ${r.xpTotal} XP · rango ${r.rango}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const crearPrueba = trpc.levelPass.crearPrueba.useMutation({
    onSuccess: (r: any) => {
      utils.tickets.eventos.invalidate();
      utils.levelPass.actividades.invalidate();
      toast.success(`Listo. Boletos vendidos: ${r.codigosVendidos.join(", ")}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const borrarPrueba = trpc.levelPass.borrarPrueba.useMutation({
    onSuccess: () => {
      utils.tickets.eventos.invalidate();
      utils.levelPass.actividades.invalidate();
      toast.success("Datos de prueba eliminados");
    },
  });

  /** Tienda seleccionada en la lista de vendidos; null = todas */
  const [filtroTienda, setFiltroTienda] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<any>(null);


  const [nuevaAct, setNuevaAct] = useState({ name: "", xp: "25", ubicacion: "", repetible: false, maxVeces: 3 });
  const crearAct = trpc.levelPass.crearActividad.useMutation({
    onSuccess: () => {
      utils.levelPass.actividades.invalidate();
      setNuevaAct({ name: "", xp: "25", ubicacion: "", repetible: false, maxVeces: 3 });
      toast.success("Actividad creada");
    },
    onError: (e) => toast.error(e.message),
  });
  const borrarAct = trpc.levelPass.borrarActividad.useMutation({
    onSuccess: (r: any) => {
      utils.levelPass.actividades.invalidate();
      toast.success(r?.desactivada ? "Actividad desactivada (ya tiene registros)" : "Actividad eliminada");
    },
  });

  const [nuevoStaff, setNuevoStaff] = useState({ name: "", email: "", puesto: "" });
  const crearStaff = trpc.levelPass.crearStaff.useMutation({
    onSuccess: () => {
      utils.levelPass.staff.invalidate();
      setNuevoStaff({ name: "", email: "", puesto: "" });
      toast.success("Personal autorizado");
    },
    onError: (e) => toast.error(e.message),
  });
  const borrarStaff = trpc.levelPass.borrarStaff.useMutation({
    onSuccess: () => { utils.levelPass.staff.invalidate(); toast.success("Eliminado"); },
  });

  const { data: porteros = [] } = trpc.tickets.porteros.useQuery(undefined, {
    enabled: habilitado && vista === "acceso",
  });
  const { data: asistencia } = trpc.tickets.asistencia.useQuery(
    { eventId: evento?.id ?? 0 },
    { enabled: habilitado && !!evento && vista === "acceso", refetchInterval: 20000 },
  );
  const [nuevoPortero, setNuevoPortero] = useState({ name: "", email: "" });
  const crearPortero = trpc.tickets.crearPortero.useMutation({
    onSuccess: () => {
      utils.tickets.porteros.invalidate();
      setNuevoPortero({ name: "", email: "" });
      toast.success("Portero autorizado");
    },
    onError: (e) => toast.error(e.message),
  });
  const borrarPortero = trpc.tickets.borrarPortero.useMutation({
    onSuccess: () => { utils.tickets.porteros.invalidate(); toast.success("Portero eliminado"); },
  });

  const { data: lotes = [] } = trpc.tickets.lotes.useQuery(
    { eventId: evento?.id ?? 0 }, { enabled: habilitado && !!evento && vista === "codigos" },
  );
  const { data: todosLosCodigos = [] } = trpc.tickets.listar.useQuery(
    { eventId: evento?.id ?? 0, status: "all" },
    { enabled: habilitado && !!evento && vista === "codigos" },
  );
  const { data: boletos = [] } = trpc.tickets.listar.useQuery(
    { eventId: evento?.id ?? 0, status: "emitidos" },
    { enabled: habilitado && !!evento && vista === "boletos", refetchInterval: 15000 },
  );

  /**
   * Los boletos guardan el id de la tienda, así que se traduce el nombre
   * elegido a su id usando la lista de tiendas.
   */
  const boletosFiltrados = (() => {
    if (!filtroTienda) return boletos as any[];
    const t = (tiendas as any[]).find(x => x.name === filtroTienda);
    if (!t) return [];
    return (boletos as any[]).filter(b => b.storeId === t.id);
  })();

  // ── Formularios ──
  const [nuevoEvento, setNuevoEvento] = useState({ name: "", startDate: "", endDate: "", location: "" });
  const [formEvento, setFormEvento] = useState(false);
  const crearEvento = trpc.tickets.crearEvento.useMutation({
    onSuccess: () => { utils.tickets.eventos.invalidate(); setFormEvento(false); toast.success("Evento creado"); },
    onError: (e) => toast.error(e.message),
  });

  const [nuevoTipo, setNuevoTipo] = useState({ name: "", priceUsd: "", days: 1, perks: "" });
  const crearTipo = trpc.tickets.crearTipo.useMutation({
    onSuccess: () => {
      utils.tickets.tipos.invalidate();
      setNuevoTipo({ name: "", priceUsd: "", days: 1, perks: "" });
      toast.success("Tipo creado");
    },
    onError: (e) => toast.error(e.message),
  });
  const borrarTipo = trpc.tickets.borrarTipo.useMutation({
    onSuccess: (r: any) => {
      utils.tickets.tipos.invalidate();
      toast.success(r?.desactivado ? "Tipo desactivado (ya tiene ventas)" : "Tipo eliminado");
    },
  });

  const [nuevaTienda, setNuevaTienda] = useState({ name: "", email: "", contactName: "", phone: "" });
  const crearTienda = trpc.tickets.crearTienda.useMutation({
    onSuccess: () => {
      utils.tickets.tiendas.invalidate();
      setNuevaTienda({ name: "", email: "", contactName: "", phone: "" });
      toast.success("Tienda autorizada");
    },
    onError: (e) => toast.error(e.message),
  });
  const editarTienda = trpc.tickets.editarTienda.useMutation({
    onSuccess: () => { utils.tickets.tiendas.invalidate(); },
  });
  const reenviarAcceso = trpc.tickets.reenviarAcceso.useMutation({
    onSuccess: () => toast.success("Correo de acceso reenviado"),
    onError: (e) => toast.error(e.message),
  });
  const borrarTienda = trpc.tickets.borrarTienda.useMutation({
    onSuccess: (r: any) => {
      utils.tickets.tiendas.invalidate();
      toast.success(r?.desactivada ? "Tienda desactivada (ya tiene ventas)" : "Tienda eliminada");
    },
    onError: (e) => toast.error(e.message),
  });

  const [cantidad, setCantidad] = useState(10);
  const generar = trpc.tickets.generar.useMutation({
    onSuccess: async (r: any) => {
      utils.tickets.resumen.invalidate();
      toast.success(`${r.boletos.length} boletos generados`);
      await descargarQrs(r.boletos, r.lote);
    },
    onError: (e) => toast.error(e.message),
  });

  /**
   * Genera una hoja imprimible con los QR. Se abre en una ventana nueva lista
   * para imprimir: es la forma más simple de llevarlos al papel sin depender
   * de un servicio externo.
   */
  const descargarQrs = async (lista: any[], lote: string) => {
    const origen = window.location.origin;
    const tarjetas = await Promise.all(lista.map(async (b: any) => {
      const url = `${origen}/vender/${b.token}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 1 });
      return `<div class="t"><img src="${dataUrl}" /><p>${b.code}</p></div>`;
    }));

    const w = window.open("", "_blank");
    if (!w) { toast.error("Permite las ventanas emergentes para imprimir los QR"); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8">
      <title>Boletos ${lote}</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 16px; }
        h1 { font-size: 15px; margin: 0 0 14px; }
        .g { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .t { border: 1px solid #ddd; border-radius: 8px; padding: 8px; text-align: center; break-inside: avoid; }
        .t img { width: 100%; height: auto; }
        .t p { margin: 4px 0 0; font: 700 11px ui-monospace, monospace; letter-spacing: .5px; }
        @media print { body { margin: 8px; } }
      </style></head><body>
      <h1>Boletos — lote ${lote} · ${lista.length} unidades</h1>
      <div class="g">${tarjetas.join("")}</div>
      <script>window.onload = () => window.print();<\/script>
      </body></html>`);
    w.document.close();
  };

  /** Vuelve a abrir la hoja imprimible de un lote ya generado */
  const reimprimir = async (lote: string) => {
    if (!evento) return;
    const lista = await utils.tickets.boletosDeLote.fetch({ eventId: evento.id, lote });
    if (!lista.length) { toast.error("Ese lote no tiene boletos"); return; }
    await descargarQrs(lista, lote);
  };

  if (!habilitado) return null;

  // Variables de tema para que funcione igual en claro y oscuro, y `min-w-0`
  // en todos los contenedores para que nada se salga en pantalla estrecha.
  const tarjeta = "rounded-3xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-4 min-w-0";
  const campo = "w-full min-w-0 rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-input-bg)] px-4 text-[16px] text-[var(--iw-text)] outline-none focus:border-[#e5007d]";
  const altoCampo = { minHeight: 48 };

  return (
    <div className={compact ? "p-4 flex flex-col gap-4" : "flex flex-col gap-5"}>
      {/* ── Evento: de qué evento se está hablando, de un vistazo ── */}
      {(() => {
        const ev = evento as any;
        const fecha = (d: any) => new Date(d).toLocaleDateString("es-VE", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
        const estado = (() => {
          if (!ev) return null;
          const hoy = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date())).getTime();
          const ini = new Date(new Date(ev.startDate).toISOString().slice(0, 10)).getTime();
          const fin = new Date(new Date(ev.endDate).toISOString().slice(0, 10)).getTime();
          if (hoy < ini) { const d = Math.round((ini - hoy) / 86400000); return { t: d === 1 ? "Es mañana" : `Faltan ${d} días`, c: "#38bdf8" }; }
          if (hoy > fin) return { t: "Terminó", c: "#8a8494" };
          return { t: `En curso · día ${Math.round((hoy - ini) / 86400000) + 1}`, c: "#4ade80" };
        })();
        return (
          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff3d9e]">Evento</p>
                <p className="mt-1 truncate text-[18px] font-bold text-[var(--iw-text)]">{ev?.name ?? "Sin eventos"}</p>
                {ev && <p className="mt-0.5 text-[12.5px] text-[var(--iw-text-muted)]">{fecha(ev.startDate)}{fecha(ev.endDate) !== fecha(ev.startDate) ? ` – ${fecha(ev.endDate)}` : ""}{ev.location ? ` · ${ev.location}` : ""}</p>}
              </div>
              {estado && <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${estado.c}1f`, color: estado.c }}>{estado.t}</span>}
            </div>
            <div className="mt-3 flex gap-2">
              {eventos.length > 1 && (
                <select
                  value={evento?.id ?? ""}
                  onChange={e => setEventoId(Number(e.target.value))}
                  className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.05] px-4 text-[13px] font-semibold text-[var(--iw-text)] outline-none"
                  style={{ minHeight: 40 }}
                  aria-label="Cambiar de evento"
                >
                  {eventos.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              )}
              <button
                onClick={() => setFormEvento(!formEvento)}
                className={`flex shrink-0 items-center justify-center gap-1 rounded-full px-4 text-[13px] font-semibold ${eventos.length > 1 ? "" : "flex-1"}`}
                style={{ minHeight: 40, background: formEvento ? "rgba(255,255,255,0.07)" : "rgba(229,0,125,0.14)", color: formEvento ? "var(--iw-text)" : "#ff3d9e" }}
              >
                {formEvento ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nuevo evento</>}
              </button>
            </div>
          </div>
        );
      })()}

      {formEvento && (
        <div className={tarjeta}>
          <div className="flex flex-col gap-3">
            <input placeholder="Nombre del evento" value={nuevoEvento.name}
              onChange={e => setNuevoEvento(f => ({ ...f, name: e.target.value }))} className={campo} style={altoCampo} />
            <input placeholder="Lugar" value={nuevoEvento.location}
              onChange={e => setNuevoEvento(f => ({ ...f, location: e.target.value }))} className={campo} style={altoCampo} />
            {/* Las fechas van apiladas: en iOS el campo `date` tiene un ancho
                mínimo propio que ignora la columna y desborda el contenedor. */}
            <div className="min-w-0">
              <label className="mb-1 block text-xs text-[var(--iw-text-muted)]">Primer día</label>
              <input type="date" value={nuevoEvento.startDate}
                onChange={e => setNuevoEvento(f => ({ ...f, startDate: e.target.value }))}
                className={campo} style={{ ...altoCampo, maxWidth: "100%" }} />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs text-[var(--iw-text-muted)]">Último día</label>
              <input type="date" value={nuevoEvento.endDate}
                onChange={e => setNuevoEvento(f => ({ ...f, endDate: e.target.value }))}
                className={campo} style={{ ...altoCampo, maxWidth: "100%" }} />
            </div>
          </div>
          <button
            onClick={() => crearEvento.mutate(nuevoEvento)}
            disabled={!nuevoEvento.name || !nuevoEvento.startDate || !nuevoEvento.endDate}
            className="mt-3 w-full rounded-full bg-[#e5007d] text-sm font-bold text-white disabled:opacity-40"
            style={{ minHeight: 52 }}
          >
            Crear evento
          </button>
        </div>
      )}

      {/*
        Tres apartados en el orden en que se trabaja:
          Preparar → qué se vende, imprimir los boletos y quién trabaja
          Ventas   → cómo va, quién compró y cuánto lleva cada tienda
          En vivo  → la puerta, el Level Pass y el sorteo VIP
      */}
      {(() => {
        const GRUPOS = [
          { id: "preparar", label: "Preparar", Icono: Settings2, subs: [["tipos", "Boletos"], ["codigos", "Imprimir"], ["equipo", "Equipo"]] },
          { id: "ventas",   label: "Ventas",   Icono: BarChart3, subs: [["resumen", "Resumen"], ["boletos", "Vendidos"], ["tiendas", "Por tienda"]] },
          { id: "envivo",   label: "En vivo",  Icono: Zap,       subs: [["acceso", "Puerta"], ["levelpass", "Level Pass"], ["sorteo", "Sorteo VIP"]] },
        ] as const;
        const grupo = GRUPOS.find(g => g.subs.some(([id]) => id === vista)) ?? GRUPOS[1];
        const AYUDA: Record<string, string> = {
          tipos: "Qué se vende, a qué precio, cuántos días y qué incluye",
          codigos: "Crea boletos en blanco para imprimir y reimprime lotes",
          equipo: "Tiendas, porteros, personal de EXP y staff de la rueda",
          resumen: "Cómo van las ventas del evento",
          boletos: "Quién compró cada boleto. Tócalo para corregirlo o anularlo",
          tiendas: "Lo que lleva cada tienda y si puede dar EXP",
          acceso: "Asistencia por día en la puerta",
          levelpass: "Misiones y progreso de los asistentes",
          sorteo: "Ganador de la pieza a tamaño real entre los VIP",
        };
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              {GRUPOS.map(g => {
                const on = g.id === grupo.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => { setVista(g.subs[0][0] as any); setBusqueda(""); }}
                    className="flex flex-col items-center justify-center gap-1 rounded-2xl text-[12.5px] font-bold transition-colors"
                    style={{ minHeight: 62, WebkitTapHighlightColor: "transparent", ...(on ? { background: "#e5007d", color: "#fff" } : { background: "rgba(255,255,255,0.04)", color: "var(--iw-text-muted)", border: "1px solid rgba(255,255,255,0.06)" }) }}
                    aria-pressed={on}
                  >
                    <g.Icono size={18} /> {g.label}
                  </button>
                );
              })}
            </div>
            <div className="lc-segmento grid grid-cols-3 rounded-full p-1">
              {grupo.subs.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => { setVista(id as any); setBusqueda(""); }}
                  className={`rounded-full text-[13px] font-semibold transition-colors ${vista === id ? "bg-white/[0.12] text-white" : "text-[var(--iw-text-muted)]"}`}
                  style={{ minHeight: 40 }}
                  aria-pressed={vista === id}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="-mt-1 px-1 text-[12.5px] text-[var(--iw-text-muted)]">{AYUDA[vista] ?? ""}</p>
          </>
        );
      })()}

      {/* ── Resumen ── */}
      {vista === "resumen" && resumen && (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              { l: "Vendidos", v: String(resumen.vendidos), c: "text-[#e5007d]" },
              { l: "Recaudado", v: usd(resumen.totalUsd), c: "text-green-500" },
              { l: "En bolívares", v: `Bs ${resumen.totalBs.toLocaleString("es-VE")}`, c: "text-[var(--iw-text)]" },
              { l: "Sin vender", v: String(resumen.enBlanco), c: "text-[var(--iw-text-muted)]" },
            ].map(c => (
              <div key={c.l} className={tarjeta}>
                <p className="text-[11px] text-[var(--iw-text-muted)]">{c.l}</p>
                <p className={`mt-1 text-base font-black tabular-nums leading-tight ${c.c}`}
                   style={{ overflowWrap: "anywhere" }}>{c.v}</p>
              </div>
            ))}
          </div>


          {/* Por tipo */}
          <div className={tarjeta}>
            <p className="mb-3 text-sm font-bold text-[var(--iw-text)]">Por tipo de boleto</p>
            {resumen.porTipo.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--iw-text-muted)]">Aún no hay ventas.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {resumen.porTipo.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 border-b border-[var(--iw-border)] pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--iw-text)]">{t.nombre}</p>
                      <p className="text-xs text-[var(--iw-text-muted)]">{usd(t.precioUsd)} · {t.dias} día(s)</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-black text-[var(--iw-text)]">{t.cantidad}</p>
                      <p className="text-xs text-[#e5007d]">{usd(t.totalUsd)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Por tienda, con barras comparativas.
              Una barra dice de un vistazo quién vende más; una lista de
              números obliga a compararlos mentalmente. */}
          <div className={tarjeta}>
            <p className="mb-3 text-sm font-bold text-[var(--iw-text)]">Ventas por tienda</p>
            {resumen.porTienda.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--iw-text-muted)]">Ninguna tienda ha vendido todavía.</p>
            ) : (() => {
              const mayor = Math.max(...resumen.porTienda.map((t: any) => t.totalUsd), 1);
              return (
                <div className="flex flex-col gap-3">
                  {[...resumen.porTienda].sort((a: any, b: any) => b.totalUsd - a.totalUsd).map((t: any) => (
                    <div key={t.id}>
                      <div className="mb-1 flex items-end justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-semibold text-[var(--iw-text)]">{t.nombre}</p>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-black text-[var(--iw-text)]">{usd(t.totalUsd)}</span>
                          <span className="ml-2 text-xs text-[var(--iw-text-muted)]">{t.cantidad} boletos</span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--iw-border)]">
                        <div
                          className="h-full rounded-full bg-[#e5007d] transition-all duration-500"
                          style={{ width: `${Math.max(4, (t.totalUsd / mayor) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--iw-text-muted)]">
                        Bs {t.totalBs.toLocaleString("es-VE")}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Ritmo de ventas por día */}
          {(ventasDia as any[]).length > 0 && (
            <div className={tarjeta}>
              <p className="mb-3 text-sm font-bold text-[var(--iw-text)]">Ventas por día</p>
              {(() => {
                const dias = ventasDia as any[];
                const tope = Math.max(...dias.map(d => d.cantidad), 1);
                return (
                  <div className="flex items-end gap-1.5" style={{ height: 120 }}>
                    {dias.map(d => (
                      <div key={d.dia} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                        <span className="text-[10px] font-bold text-[var(--iw-text)]">{d.cantidad}</span>
                        <div
                          className="w-full rounded-t bg-[#e5007d]"
                          style={{ height: `${Math.max(6, (d.cantidad / tope) * 80)}px` }}
                          title={`${d.cantidad} boletos · ${usd(d.usd)}`}
                        />
                        <span className="truncate text-[9px] text-[var(--iw-text-muted)]">
                          {new Date(d.dia + "T12:00:00").toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* ── Vendidos ── */}
      {vista === "boletos" && (
        <div className="flex flex-col gap-2">
          {/* Filtro por tienda: con varios puntos de venta hace falta poder
              mirar uno solo y ver cuánto lleva. */}
          {(resumen?.porTienda?.length ?? 0) > 0 && (
            <div className="iw-areas-carril -mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
              <button
                onClick={() => setFiltroTienda(null)}
                className={`rounded-full shrink-0 px-3.5 text-[11px] font-bold ${
                  filtroTienda === null
                    ? "bg-[#e5007d] text-white"
                    : "border border-[var(--iw-border)] text-[var(--iw-text-muted)]"
                }`}
                style={{ minHeight: 40 }}
              >
                Todas · {boletos.length}
              </button>
              {resumen!.porTienda.map((t: any) => (
                <button
                  key={t.nombre}
                  onClick={() => setFiltroTienda(t.nombre)}
                  className={`rounded-full shrink-0 px-3.5 text-[11px] font-bold ${
                    filtroTienda === t.nombre
                      ? "bg-[#e5007d] text-white"
                      : "border border-[var(--iw-border)] text-[var(--iw-text-muted)]"
                  }`}
                  style={{ minHeight: 40 }}
                >
                  {t.nombre} · {t.cantidad}
                </button>
              ))}
            </div>
          )}

          {/* Buscador: en la puerta hay que encontrar a alguien rápido */}
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--iw-text-muted)]" />
            <input
              type="search"
              placeholder="Buscar nombre, código o teléfono"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className={`${campo} pl-9`}
              style={altoCampo}
            />
          </div>

          {/* Total de lo que se está viendo */}
          {filtroTienda && (
            <p className="mb-1 text-xs text-[var(--iw-text-muted)]">
              {boletosFiltrados.length} boleto{boletosFiltrados.length === 1 ? "" : "s"} ·{" "}
              {usd(boletosFiltrados.reduce((a: number, b: any) => a + (parseFloat(b.priceUsd ?? "0") || 0), 0))} USD
            </p>
          )}

          {boletosFiltrados.filter(coincide).length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--iw-text-muted)]">
              {busqueda ? `No hay boletos que coincidan con «${busqueda}».` : filtroTienda ? `${filtroTienda} no ha vendido boletos.` : "Todavía no hay boletos vendidos."}
            </p>
          ) : boletosFiltrados.filter(coincide).map((b: any) => (
            <button key={b.id} onClick={() => setDetalle(b)} className={`${tarjeta} w-full text-left transition-colors active:bg-white/[0.04] ${b.status === "void" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-[var(--iw-text-muted)]">
                    {b.code}
                    {b.status === "void" && <span className="ml-2 rounded-full bg-[#f87171]/15 px-2 py-0.5 font-sans text-[10px] font-bold text-[#f87171]">Anulado</span>}
                  </p>
                  <p className="text-sm font-bold text-[var(--iw-text)]">{b.buyerName} {b.buyerLastName}</p>
                  <p className="text-xs text-[var(--iw-text-muted)]">
                    {[b.tipoNombre, b.buyerPhone].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--iw-text-muted)]">
                    {[b.tiendaNombre ?? "Venta online", b.soldAt ? new Date(b.soldAt).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" }) : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-black text-[var(--iw-text)]">{usd(b.priceUsd)}</p>
                  {b.priceBs && <p className="text-[11px] text-[var(--iw-text-muted)]">Bs {parseFloat(b.priceBs).toLocaleString("es-VE")}</p>}
                </div>
              </div>
            </button>
          ))}
          {detalle && <DetalleBoleto boleto={detalle} tipos={tipos as any[]} onCerrar={() => setDetalle(null)} />}
        </div>
      )}

      {/* ── Códigos generados ── */}
      {vista === "codigos" && (
        <>
          {/* Generar boletos */}
          <div className={tarjeta}>
            <p className="mb-1 text-sm font-bold text-[var(--iw-text)]">Generar boletos en blanco</p>
            <p className="mb-3 text-xs text-[var(--iw-text-muted)]">
              Se crean sin datos. Al generarlos se abre la hoja de QR lista para imprimir.
            </p>
            {cantidad >= 500 && (
              <p className="mb-2 text-xs leading-relaxed text-[#d9a400]">
                Con lotes grandes la hoja de impresión tarda en abrirse. Dale tiempo
                y no cierres la pestaña.
              </p>
            )}
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 500, 1000].map(n => (
                <button key={n} onClick={() => setCantidad(n)}
                  className={`rounded-full text-xs font-bold transition-colors ${
                    cantidad === n ? "bg-[#e5007d] text-white" : "bg-[var(--iw-input-bg)] border border-[var(--iw-border)] text-[var(--iw-text-muted)]"
                  }`}
                  style={{ minHeight: 44 }}>
                  {n}
                </button>
              ))}
            </div>
            <input type="number" inputMode="numeric" min={1} max={500} value={cantidad}
              onChange={e => setCantidad(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
              placeholder="Otra cantidad"
              className={`${campo} mt-2`} style={altoCampo} />
            <button
              onClick={() => evento && generar.mutate({ eventId: evento.id, cantidad })}
              disabled={!evento || generar.isPending}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#e5007d] text-sm font-bold text-white disabled:opacity-40"
              style={{ minHeight: 52 }}
            >
              <Download size={16} /> {generar.isPending ? "Generando..." : `Generar ${cantidad} e imprimir`}
            </button>
          </div>

          <div className={tarjeta}>
            <p className="mb-1 text-sm font-bold text-[var(--iw-text)]">Lotes generados</p>
            <p className="mb-3 text-xs text-[var(--iw-text-muted)]">
              Cada vez que generas boletos se crea un lote. Puedes volver a imprimir sus QR.
            </p>
            {lotes.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--iw-text-muted)]">Todavía no has generado boletos.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {lotes.map((l: any) => (
                  <div key={l.lote} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--iw-border)] p-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-[var(--iw-text)]">{l.lote}</p>
                      <p className="text-xs text-[var(--iw-text-muted)]">
                        {l.total} boletos · {l.vendidos} vendidos · {l.enBlanco} sin vender
                      </p>
                    </div>
                    <button
                      onClick={() => reimprimir(l.lote)}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--iw-border)] px-4 text-xs font-bold text-[var(--iw-text-muted)] hover:border-[#e5007d] hover:text-[#e5007d]"
                      style={{ minHeight: 40 }}
                    >
                      <Download size={14} /> Imprimir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={tarjeta}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-[var(--iw-text)]">Todos los códigos</p>
              <span className="text-xs text-[var(--iw-text-muted)]">{todosLosCodigos.length}</span>
            </div>
            <div className="relative mb-2">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--iw-text-muted)]" />
              <input type="search" placeholder="Buscar código o comprador" value={busqueda}
                onChange={e => setBusqueda(e.target.value)} className={`${campo} pl-9`} style={altoCampo} />
            </div>
            <div className="iw-scroll-oculto flex max-h-[420px] flex-col gap-1.5 overflow-y-auto pr-1">
              {todosLosCodigos.filter(coincide).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between gap-3 border-b border-[var(--iw-border)] pb-1.5 last:border-0">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-[var(--iw-text)]">{b.code}</p>
                    {b.buyerName && (
                      <p className="truncate text-[11px] text-[var(--iw-text-muted)]">
                        {[`${b.buyerName} ${b.buyerLastName ?? ""}`.trim(), b.tiendaNombre ?? "Venta online"].join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    b.status === "sold" ? "bg-green-500/15 text-green-500"
                    : b.status === "void" ? "bg-red-500/15 text-red-500"
                    : "bg-[var(--iw-border)] text-[var(--iw-text-muted)]"
                  }`}>
                    {b.status === "sold" ? "Vendido" : b.status === "void" ? "Anulado" : "En blanco"}
                  </span>
                </div>
              ))}
              {todosLosCodigos.length === 0 && (
                <p className="py-6 text-center text-sm text-[var(--iw-text-muted)]">No hay códigos generados.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Level Pass ── */}
      {vista === "levelpass" && (
        <>

          {lpResumen && (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[
                { l: "Participantes", v: String(lpResumen.participantes), c: "text-[var(--iw-text)]" },
                { l: "En rango S", v: String(lpResumen.rangoS), c: "text-[#e5007d]" },
                { l: "Boletos vendidos", v: String(lpResumen.boletosVendidos), c: "text-[var(--iw-text-muted)]" },
                { l: "Ascensos", v: String(lpResumen.ascensos.length), c: "text-green-500" },
              ].map(c => (
                <div key={c.l} className={tarjeta}>
                  <p className="text-[11px] text-[var(--iw-text-muted)]">{c.l}</p>
                  <p className={`mt-1 text-base font-black tabular-nums ${c.c}`}>{c.v}</p>
                </div>
              ))}
            </div>
          )}

          {/* Distribución por rango */}
          {lpResumen && lpResumen.participantes > 0 && (
            <div className={tarjeta}>
              <p className="mb-3 text-sm font-bold text-[var(--iw-text)]">Cazadores por rango</p>
              <div className="flex flex-col gap-2">
                {lpResumen.porRango.map((r: any) => (
                  <div key={r.rango} className="flex items-center gap-3">
                    <span className="w-6 font-mono text-sm font-black text-[var(--iw-text)]">{r.rango}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--iw-border)]">
                      <div
                        className="h-full rounded-full bg-[#e5007d]"
                        style={{ width: `${Math.max(2, (r.cantidad / Math.max(1, lpResumen.participantes)) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-[var(--iw-text-muted)]">{r.cantidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2">
            <p className="ev-display text-sm text-[var(--iw-text)]">Actividades</p>
            <p className="mt-0.5 text-xs text-[var(--iw-text-muted)]">Qué se puede completar en el evento y cuánta experiencia da</p>
          </div>

          <Plegable titulo="Nueva actividad">
          {/* Nueva actividad */}
          <div className={tarjeta}>
            <p className="mb-1 text-sm font-bold text-[var(--iw-text)]">Nueva actividad</p>
            <p className="mb-3 text-xs text-[var(--iw-text-muted)]">
              Las compras en tiendas aliadas son las que más experiencia deberían dar.
            </p>
            <div className="flex flex-col gap-3">
              <input placeholder="Ej: Compra en tienda aliada" value={nuevaAct.name}
                onChange={e => setNuevaAct(f => ({ ...f, name: e.target.value }))} className={campo} style={altoCampo} />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="XP" inputMode="numeric" value={nuevaAct.xp}
                  onChange={e => setNuevaAct(f => ({ ...f, xp: e.target.value.replace(/[^0-9]/g, "") }))}
                  className={campo} style={altoCampo} />
                <input placeholder="Ubicación" value={nuevaAct.ubicacion}
                  onChange={e => setNuevaAct(f => ({ ...f, ubicacion: e.target.value }))}
                  className={campo} style={altoCampo} />
              </div>
              <button
                onClick={() => setNuevaAct(f => ({ ...f, repetible: !f.repetible }))}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                  nuevaAct.repetible ? "border-[#e5007d] bg-[#e5007d]/10" : "border-[var(--iw-border)]"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                  nuevaAct.repetible ? "border-[#e5007d] bg-[#e5007d]" : "border-[var(--iw-border)]"
                }`}>
                  {nuevaAct.repetible && <Check size={12} className="text-white" />}
                </span>
                <span className="text-sm text-[var(--iw-text)]">
                  Se puede repetir
                  <span className="ml-1 text-xs text-[var(--iw-text-muted)]">
                    (hasta {nuevaAct.maxVeces} veces)
                  </span>
                </span>
              </button>
              {nuevaAct.repetible && (
                <input type="number" min={1} max={20} value={nuevaAct.maxVeces}
                  onChange={e => setNuevaAct(f => ({ ...f, maxVeces: Math.min(20, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  className={campo} style={altoCampo} />
              )}
            </div>
            <button
              onClick={() => evento && crearAct.mutate({
                eventId: evento.id,
                name: nuevaAct.name,
                xp: parseInt(nuevaAct.xp) || 25,
                ubicacion: nuevaAct.ubicacion || undefined,
                repetible: nuevaAct.repetible,
                maxVeces: nuevaAct.repetible ? nuevaAct.maxVeces : undefined,
              })}
              disabled={!nuevaAct.name || crearAct.isPending}
              className="mt-3 w-full rounded-full bg-[#e5007d] text-sm font-bold text-white disabled:opacity-40"
              style={{ minHeight: 52 }}
            >
              Añadir actividad
            </button>
          </div>
          </Plegable>

          {/* Actividades */}
          <div className="flex flex-col gap-2">
            {(lpActividades as any[]).map((a: any) => (
              <div key={a.id} className={`${tarjeta} ${a.active ? "" : "opacity-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--iw-text)]">{a.name}</p>
                    <p className="text-xs text-[var(--iw-text-muted)]">
                      {a.ubicacion ? `${a.ubicacion} · ` : ""}
                      {a.repetible ? `hasta ${a.maxVeces} veces` : "una sola vez"}
                      {a.active ? "" : " · desactivada"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-sm font-black text-[#e5007d]">+{a.xp}</span>
                    <button onClick={() => { confirmar({ titulo: `¿Eliminar "${a.name}"?`, mensaje: "Esta acción no se puede deshacer.", confirmar: "Eliminar", peligro: true }).then(ok => { if (ok) borrarAct.mutate({ id: a.id }); }); }}
                      className="p-2 text-[var(--iw-text-muted)] hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {(lpActividades as any[]).length === 0 && (
              <p className="py-6 text-center text-sm text-[var(--iw-text-muted)]">
                Aún no hay actividades creadas.
              </p>
            )}
          </div>

          <button onClick={() => { setVista("equipo" as any); setBusqueda(""); }} className="flex w-full items-center gap-3 rounded-3xl border border-white/[0.06] bg-white/[0.035] p-4 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e5007d]/15 text-[#ff3d9e]"><Users size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-[var(--iw-text)]">Quién da EXP: tiendas y personal</span>
              <span className="block text-[12px] text-[var(--iw-text-muted)]">Ahora todo el equipo se agrega y se gestiona en «Equipo»</span>
            </span>
            <span className="text-[var(--iw-text-muted)]">›</span>
          </button>

          <div className="mt-2">
            <p className="ev-display text-sm text-[var(--iw-text)]">Cómo va el evento</p>
            <p className="mt-0.5 text-xs text-[var(--iw-text-muted)]">Se actualiza solo cada 20 segundos</p>
          </div>

          {/* Ranking */}
          {lpResumen && lpResumen.ranking.length > 0 && (
            <div className={tarjeta}>
              <p className="mb-3 text-sm font-bold text-[var(--iw-text)]">Ranking</p>
              <div className="flex flex-col gap-2">
                {lpResumen.ranking.map((r: any, i: number) => (
                  <div key={r.ticketId} className="flex items-center gap-3 border-b border-[var(--iw-border)] pb-2 last:border-0">
                    <span className="w-5 text-xs font-black text-[var(--iw-text-muted)]">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--iw-text)]">{r.nombre}</p>
                      <p className="font-mono text-[11px] text-[var(--iw-text-muted)]">{r.codigo}</p>
                    </div>
                    <span className="font-mono text-xs font-black text-[#e5007d]">{r.rango}</span>
                    <span className="w-14 text-right text-xs text-[var(--iw-text-muted)]">{r.xpTotal} XP</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ascensos recientes */}
          {lpResumen && lpResumen.ascensos.length > 0 && (
            <div className={tarjeta}>
              <p className="mb-3 text-sm font-bold text-[var(--iw-text)]">Ascensos recientes</p>
              <div className="flex flex-col gap-2">
                {lpResumen.ascensos.slice(0, 20).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 border-b border-[var(--iw-border)] pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--iw-text)]">{a.nombre}</p>
                      <p className="text-[11px] text-[var(--iw-text-muted)]">
                        {new Date(a.createdAt).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold text-[#e5007d]">
                      {a.rangoAnterior} → {a.rangoNuevo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* TEMPORAL: entorno de ensayo */}
          <div className="rounded-2xl border border-[#fbbf24]/30 bg-[#fbbf24]/[0.07] p-4">
            <p className="text-sm font-bold text-[var(--iw-text)]">Entorno de prueba</p>
            <p className="mb-3 mt-1 text-xs leading-relaxed text-[var(--iw-text-muted)]">
              Crea un evento con fechas de hoy, cinco actividades y boletos listos:
              tres vendidos (IW-TEST01 a 03) y dos sin vender (IW-LIBRE1 y 2).
            </p>
            {/* Dar puntos a mano para ensayar el ascenso de rango */}
            <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[#fbbf24]/20 pb-3">
              <input
                value={codigoXp}
                onChange={e => setCodigoXp(e.target.value.toUpperCase())}
                placeholder="IW-TEST01"
                className="w-36 rounded-lg border border-[var(--iw-border)] bg-[var(--iw-input-bg)] px-3 font-mono text-xs uppercase text-[var(--iw-text)] outline-none"
                style={{ minHeight: 40 }}
              />
              {[40, 80, 200].map(n => (
                <button
                  key={n}
                  onClick={() => darXp.mutate({ codigo: codigoXp.trim(), xp: n })}
                  disabled={codigoXp.trim().length < 3 || darXp.isPending}
                  className="rounded-lg border border-[#fbbf24]/40 px-3 text-xs font-bold text-[#fbbf24] disabled:opacity-40"
                  style={{ minHeight: 40 }}
                >
                  +{n} XP
                </button>
              ))}
              <button
                onClick={() => darXp.mutate({ codigo: codigoXp.trim(), xp: -2000 })}
                disabled={codigoXp.trim().length < 3}
                className="rounded-lg border border-[var(--iw-border)] px-3 text-xs font-bold text-[var(--iw-text-muted)] disabled:opacity-40"
                style={{ minHeight: 40 }}
              >
                Reiniciar
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => crearPrueba.mutate()}
                disabled={crearPrueba.isPending}
                className="rounded-full bg-[#fbbf24] px-4 text-xs font-bold text-[#1a1a1a] disabled:opacity-50"
                style={{ minHeight: 44 }}
              >
                {crearPrueba.isPending ? "Creando..." : "Crear entorno de prueba"}
              </button>
              <button
                onClick={() => { confirmar({ titulo: "Borrar todos los datos de prueba", mensaje: "Se eliminan los participantes y la experiencia creados para ensayar. Los boletos reales no se tocan.", confirmar: "Borrar", peligro: true }).then(ok => { if (ok) borrarPrueba.mutate(); }); }}
                className="rounded-full border border-[var(--iw-border)] px-4 text-xs font-bold text-[var(--iw-text-muted)]"
                style={{ minHeight: 44 }}
              >
                Borrar pruebas
              </button>
            </div>
          </div>

        </>
      )}

      {/* ── Control de acceso ── */}
      {vista === "acceso" && (
        <>
          {asistencia && (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[
                { l: "Boletos vendidos", v: String(asistencia.vendidos), c: "text-[var(--iw-text)]" },
                { l: "Han ingresado", v: String(asistencia.ingresosTotales), c: "text-green-500" },
                { l: "Día actual", v: asistencia.diaActual ? `Día ${asistencia.diaActual}` : "Fuera de fecha", c: "text-[#e5007d]" },
                { l: "Sin conexión", v: String(asistencia.sincronizadosSinConexion), c: "text-[var(--iw-text-muted)]" },
              ].map(c => (
                <div key={c.l} className={tarjeta}>
                  <p className="text-[11px] text-[var(--iw-text-muted)]">{c.l}</p>
                  <p className={`mt-1 text-base font-black tabular-nums leading-tight ${c.c}`}>{c.v}</p>
                </div>
              ))}
            </div>
          )}

          {(asistencia?.porDia.length ?? 0) > 0 && (
            <div className={tarjeta}>
              <p className="mb-3 text-sm font-bold text-[var(--iw-text)]">Ingresos por día</p>
              <div className="flex flex-col gap-2">
                {asistencia!.porDia.map((d: any) => (
                  <div key={d.dia} className="flex items-center justify-between border-b border-[var(--iw-border)] pb-2 last:border-0">
                    <span className="text-sm text-[var(--iw-text)]">Día {d.dia}</span>
                    <span className="font-black text-[#e5007d]">{d.cantidad} personas</span>
                  </div>
                ))}
              </div>
            </div>
          )}

<button onClick={() => { setVista("equipo" as any); setBusqueda(""); }} className="flex w-full items-center gap-3 rounded-3xl border border-white/[0.06] bg-white/[0.035] p-4 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e5007d]/15 text-[#ff3d9e]"><Users size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-[var(--iw-text)]">Porteros de la puerta</span>
              <span className="block text-[12px] text-[var(--iw-text-muted)]">Ahora todo el equipo se agrega y se gestiona en «Equipo»</span>
            </span>
            <span className="text-[var(--iw-text-muted)]">›</span>
          </button>
        </>
      )}

      {/* ── Tipos ── */}
      {vista === "tipos" && <TiposBoleto evento={evento} />}

      {vista === "sorteo" && evento && <SorteoVip eventId={evento.id} />}

      {/* ── Equipo: todas las funciones en un solo lugar ── */}
      {vista === "equipo" && <EquipoEvento />}

      {/* ── Tiendas ── */}
      {vista === "tiendas" && (
        <>
          <button onClick={() => { setVista("equipo" as any); setBusqueda(""); }} className="flex w-full items-center gap-3 rounded-3xl border border-white/[0.06] bg-white/[0.035] p-4 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e5007d]/15 text-[#ff3d9e]"><Users size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-[var(--iw-text)]">Autorizar una tienda nueva</span>
              <span className="block text-[12px] text-[var(--iw-text-muted)]">Se agrega en «Equipo», junto con el resto del personal</span>
            </span>
            <span className="text-[var(--iw-text-muted)]">›</span>
          </button>

          <div className="flex flex-col gap-2">
            {(tiendas as any[]).filter(s => !s.archivado).map((s: any) => (
              <div key={s.id} className={`${tarjeta} ${s.active ? "" : "opacity-50"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--iw-text)]">{s.name}</p>
                    <p className="text-xs text-[var(--iw-text-muted)]" style={{ overflowWrap: "anywhere" }}>
                      {s.email ?? "sin correo"}{s.phone ? ` · ${s.phone}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {/* Autorización para dar experiencia del Level Pass */}
                    <button
                      onClick={() => editarTienda.mutate({ id: s.id, puedeOtorgarXp: !s.puedeOtorgarXp })}
                      className={`rounded-full px-3 text-[11px] font-bold ${
                        s.puedeOtorgarXp
                          ? "bg-[#38bdf8]/15 text-[#38bdf8]"
                          : "border border-[var(--iw-border)] text-[var(--iw-text-muted)]"
                      }`}
                      style={{ minHeight: 40 }}
                      title="Puede otorgar experiencia del Level Pass"
                    >
                      {s.puedeOtorgarXp ? "✓ Da XP" : "Da XP"}
                    </button>
                    {s.email && (
                      <button
                        onClick={() => reenviarAcceso.mutate({ id: s.id })}
                        disabled={reenviarAcceso.isPending}
                        className="p-2 text-[var(--iw-text-muted)] hover:text-[#e5007d]"
                        aria-label="Reenviar acceso"
                        title="Reenviar correo de acceso"
                      >
                        <Mail size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => editarTienda.mutate({ id: s.id, active: !s.active })}
                      className={`rounded-full px-4 text-xs font-bold ${
                        s.active ? "border border-[var(--iw-border)] text-[var(--iw-text-muted)]" : "bg-[#e5007d] text-white"
                      }`}
                      style={{ minHeight: 40 }}
                    >
                      {s.active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => { confirmar({ titulo: `¿Eliminar "${s.name}"?`, mensaje: "Esta acción no se puede deshacer.", confirmar: "Eliminar", peligro: true }).then(ok => { if (ok) borrarTienda.mutate({ id: s.id }); }); }}
                      className="p-2 text-[var(--iw-text-muted)] hover:text-red-500"
                      aria-label="Eliminar tienda"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {tiendas.length === 0 && <p className="py-8 text-center text-sm text-[var(--iw-text-muted)]">No hay tiendas autorizadas.</p>}
          </div>
        </>
      )}
    </div>
  );
}
