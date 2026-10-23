import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  AlertCircle, ArrowLeft, BadgeCheck, Ban, Camera, Check, ChevronRight, Home, Keyboard, ListChecks,
  Loader2, MapPin, Receipt, Repeat, Search, Store, Swords, Ticket, User, X, Zap,
} from "lucide-react";
import { toast } from "sonner";
import QrScanner from "@/components/admin/QrScanner";
import { trpc } from "@/lib/trpc";
import CambiarHerramienta from "@/components/CambiarHerramienta";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";

/**
 * Portal del punto de venta: tiendas autorizadas y personal del evento.
 *
 * Tres tareas, cada una en su pestaña (como una app):
 *   - Vender:   escanear el boleto en blanco → elegir el tipo → datos → listo
 *   - Dar EXP:  elegir la actividad UNA vez y escanear persona tras persona
 *   - Ventas:   lo vendido por esta tienda
 *
 * El QR del boleto apunta a /vender/TOKEN. Si lo escanea quien NO es tienda
 * (el propio comprador, con la cámara del teléfono), se le lleva a su Level
 * Pass en vez de mostrarle un portal que no es para él.
 */

/** Si la librería de cámara falla, el portal sigue vivo y se escribe el código */
class EscanerSeguro extends Component<{ children: ReactNode; onFallo: () => void }, { roto: boolean }> {
  state = { roto: false };
  static getDerivedStateFromError() { return { roto: true }; }
  componentDidCatch(e: unknown) { console.error("[QR] El escáner falló:", e); this.props.onFallo(); }
  render() { return this.state.roto ? null : this.props.children; }
}

type Modo = "vender" | "xp" | "ventas";
const ROSA = "#e5007d";
const CIAN = "#38bdf8";
const COLOR_RANGO: Record<string, string> = { E: "#8a8a9c", D: "#4ade80", C: "#38bdf8", B: "#a78bfa", A: "#fbbf24", S: "#f43f5e" };

function hace(fecha?: string | Date | null) {
  if (!fecha) return "";
  const m = Math.round((Date.now() - new Date(fecha).getTime()) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(fecha).toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

/** Campo con etiqueta: en el mostrador se escribe rápido y sin dudas */
function Campo({ etiqueta, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-[#a39cad]">{etiqueta}</span>
      <input
        {...props}
        className={`w-full rounded-xl border bg-[#0f0e15] px-4 text-[16px] text-white outline-none transition-colors placeholder:text-[#5d5766] focus:border-[#e5007d] ${error ? "border-[#f87171]/70" : "border-white/10"}`}
        style={{ minHeight: 52 }}
      />
      {error && <span className="mt-1 block text-[12px] text-[#f87171]">{error}</span>}
    </label>
  );
}

/** Botón grande para abrir la cámara */
function BotonEscanear({ onClick, color, texto, disabled }: { onClick: () => void; color: string; texto: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="sp-escanear ev-press flex w-full flex-col items-center justify-center gap-2 rounded-2xl font-bold text-white disabled:opacity-40"
      style={{ minHeight: 132, ["--sp-color" as string]: color, WebkitTapHighlightColor: "transparent" }}
    >
      <span className="sp-escanear-icono flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${color}26` }}>
        <Camera size={28} style={{ color }} />
      </span>
      <span className="text-[16px]">{texto}</span>
    </button>
  );
}

/** Escribir el código a mano (cuando la cámara no lee) */
function CodigoManual({ onEnviar, color, cargando, textoBoton = "Buscar" }: { onEnviar: (c: string) => void; color: string; cargando?: boolean; textoBoton?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState("");
  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="mx-auto mt-3 flex min-h-[44px] items-center gap-2 px-3 text-[13px] font-semibold text-[#a39cad]">
        <Keyboard size={16} /> Escribir el código a mano
      </button>
    );
  }
  const listo = valor.trim().length >= 4;
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={e => { e.preventDefault(); if (listo) { onEnviar(valor.trim()); setValor(""); } }}
    >
      <input
        autoFocus
        value={valor}
        onChange={e => setValor(e.target.value.toUpperCase())}
        placeholder="IW-XXXXXX"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-xl border border-white/10 bg-[#0f0e15] px-4 font-mono text-[16px] uppercase tracking-widest text-white outline-none placeholder:text-[#5d5766] focus:border-white/30"
        style={{ minHeight: 52 }}
      />
      <button
        type="submit"
        disabled={!listo || cargando}
        className="shrink-0 rounded-xl px-5 text-[14px] font-bold text-white disabled:opacity-40"
        style={{ minHeight: 52, background: color }}
      >
        {cargando ? <Loader2 size={18} className="animate-spin" /> : textoBoton}
      </button>
    </form>
  );
}

export default function StorePortal() {
  const [, params] = useRoute("/vender/:token");
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: cargandoSesion } = useAuth();
  const utils = trpc.useUtils();

  const [token, setToken] = useState(params?.token ?? "");
  const [ultimoEscaneo, setUltimoEscaneo] = useState("");
  const [camara, setCamara] = useState<null | "vender" | "xp">(null);

  /**
   * El token se guarda al llegar por QR: si el navegador se abre sin sesión
   * —lo normal al escanear con la cámara del sistema— tras iniciar sesión
   * la app vuelve al inicio y se perdía.
   */
  useEffect(() => {
    if (params?.token) {
      try { localStorage.setItem("iw_boleto_pendiente", params.token); } catch { /* modo privado */ }
    } else {
      try {
        const guardado = localStorage.getItem("iw_boleto_pendiente");
        if (guardado) { setToken(guardado); localStorage.removeItem("iw_boleto_pendiente"); }
      } catch { /* modo privado */ }
    }
  }, [params?.token]);

  // Permisos consultados al servidor (no al rol guardado en la sesión)
  const { data: acceso, isLoading: cargandoAcceso } = trpc.tickets.miAcceso.useQuery(undefined, { enabled: isAuthenticated });
  const esTienda = Boolean(acceso?.esTienda || acceso?.rol === "admin");
  const esStaff = acceso?.esStaff ?? false;
  const puedeEntrar = esTienda || esStaff;

  // Quien no es del equipo y llegó escaneando un boleto: es su boleto → su Level Pass
  useEffect(() => {
    if (!isAuthenticated || cargandoAcceso || puedeEntrar || !token) return;
    try { localStorage.removeItem("iw_boleto_pendiente"); } catch { /* */ }
    navigate(`/worldfest/pass?boleto=${encodeURIComponent(token)}`, { replace: true });
  }, [isAuthenticated, cargandoAcceso, puedeEntrar, token, navigate]);

  const { data: tienda } = trpc.tickets.miTienda.useQuery(undefined, { enabled: esTienda });
  const { data: accesoXp } = trpc.levelPass.miAcceso.useQuery(undefined, { enabled: puedeEntrar });
  const puedeXp = Boolean(accesoXp?.puede);
  const xpEnCurso = Boolean(accesoXp?.puede && accesoXp?.enCurso);

  // Pestaña inicial: la que pida el enlace (?modo=xp), si no la principal del rol
  const modoInicial = (): Modo => {
    const q = new URLSearchParams(window.location.search).get("modo");
    if (q === "xp" || q === "ventas" || q === "vender") return q;
    return "vender";
  };
  const [modo, setModo] = useState<Modo>(modoInicial);
  useEffect(() => {
    if (!acceso) return;
    if (!esTienda && modo !== "xp") setModo("xp");     // el personal solo da EXP
  }, [acceso, esTienda, modo]);
  const irA = (m: Modo) => {
    setModo(m);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try { const u = new URL(window.location.href); u.searchParams.set("modo", m); window.history.replaceState(null, "", u.pathname.replace(/\/vender\/.+$/, "/vender") + u.search); } catch { /* */ }
  };

  const { data: ajustes } = trpc.settings.getAll.useQuery();
  const tasa = parseFloat(ajustes?.["bs_rate"] ?? "0") || 0;

  const { data: eventos = [] } = trpc.tickets.eventosActivos.useQuery(undefined, { enabled: puedeEntrar });
  const evento = eventos[0];
  // ═══ VENDER ═══
  const { data: escaneo, isLoading: buscando, error: errorEscaneo } =
    trpc.tickets.escanear.useQuery({ token }, { enabled: esTienda && token.trim().length >= 4, retry: false });

  // Los tipos salen del evento del boleto escaneado (puede no ser el primero
  // de la lista si hay más de un evento activo)
  const eventoDeVenta = escaneo?.ticket?.eventId ?? evento?.id ?? 0;
  const { data: tipos = [] } = trpc.tickets.tipos.useQuery({ eventId: eventoDeVenta }, { enabled: esTienda && eventoDeVenta > 0 });
  const tiposActivos = (tipos as any[]).filter(t => t.active);
  const { data: misVentas } = trpc.tickets.misVentas.useQuery({ eventId: evento?.id ?? 0 }, { enabled: esTienda && !!evento });

  const [tipoElegido, setTipoElegido] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [intento, setIntento] = useState(false);
  const [vendido, setVendido] = useState<any>(null);
  const datosRef = useRef<HTMLDivElement>(null);

  const vender = trpc.tickets.vender.useMutation({
    onSuccess: r => {
      setVendido(r);
      void utils.tickets.misVentas.invalidate();
      void utils.tickets.escanear.invalidate();
      try { navigator.vibrate?.([30, 40, 60]); } catch { /* */ }
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: e => toast.error(e.message),
  });

  // Un solo tipo activo: se elige solo
  useEffect(() => {
    if (escaneo?.ticket?.status === "blank" && tiposActivos.length === 1 && !tipoElegido) setTipoElegido(tiposActivos[0].id);
  }, [escaneo?.ticket?.status, tiposActivos.length, tipoElegido]);

  const limpiarVenta = () => {
    try { localStorage.removeItem("iw_boleto_pendiente"); } catch { /* */ }
    setToken(""); setUltimoEscaneo(""); setTipoElegido(null);
    setNombre(""); setApellido(""); setTelefono(""); setCorreo(""); setIntento(false); setVendido(null);
    if (params?.token) navigate("/vender", { replace: true });
  };

  const correoValido = !correo.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.trim());
  const errores = {
    tipo: !tipoElegido ? "Elige el tipo de boleto" : "",
    nombre: !nombre.trim() ? "Escribe el nombre" : "",
    apellido: !apellido.trim() ? "Escribe el apellido" : "",
    telefono: telefono.replace(/\D/g, "").length < 7 ? "Escribe un teléfono válido" : "",
    correo: !correoValido ? "Ese correo no parece válido" : "",
  };
  const hayErrores = Object.values(errores).some(Boolean);
  const tipoSel = tiposActivos.find(t => t.id === tipoElegido);

  const registrar = () => {
    setIntento(true);
    if (hayErrores) { toast.error("Revisa los datos marcados"); return; }
    vender.mutate({
      token, ticketTypeId: tipoElegido!, buyerName: nombre.trim(), buyerLastName: apellido.trim(),
      buyerPhone: telefono.trim(), buyerEmail: correo.trim() || undefined,
    });
  };

  // ═══ DAR EXP ═══
  const { data: actividades = [] } = trpc.levelPass.actividadesPublicas.useQuery(
    { eventId: accesoXp?.eventId ?? 0 },
    { enabled: Boolean(accesoXp?.puede && accesoXp?.eventId) },
  );
  const [actividadId, setActividadId] = useState<number | null>(() => {
    try { const v = Number(sessionStorage.getItem("iw_actividad_xp")); return v || null; } catch { return null; }
  });
  useEffect(() => { try { if (actividadId) sessionStorage.setItem("iw_actividad_xp", String(actividadId)); else sessionStorage.removeItem("iw_actividad_xp"); } catch { /* */ } }, [actividadId]);
  const actividad = (actividades as any[]).find(a => a.id === actividadId);
  const [buscarAct, setBuscarAct] = useState("");
  const [resultadoXp, setResultadoXp] = useState<any>(null);
  const [errorXp, setErrorXp] = useState("");
  const [contadorXp, setContadorXp] = useState(0);
  const [continuo, setContinuo] = useState(false);
  const otorgar = trpc.levelPass.otorgar.useMutation({
    onSuccess: r => {
      setResultadoXp(r); setErrorXp(""); setContadorXp(n => n + 1);
      try { navigator.vibrate?.(r.subioDeRango ? [40, 60, 120] : 40); } catch { /* */ }
      if (continuo) window.setTimeout(() => setCamara("xp"), 1400);
    },
    onError: e => { setErrorXp(e.message); setResultadoXp(null); try { navigator.vibrate?.([80, 40, 80]); } catch { /* */ } },
  });
  const darXp = (t: string) => {
    if (!actividadId) return;
    setUltimoEscaneo(t); setResultadoXp(null); setErrorXp("");
    otorgar.mutate({ token: t, activityId: actividadId });
  };
  const actividadesFiltradas = useMemo(() => {
    const q = buscarAct.trim().toLowerCase();
    const l = actividades as any[];
    return q ? l.filter(a => `${a.name} ${a.ubicacion ?? ""}`.toLowerCase().includes(q)) : l;
  }, [actividades, buscarAct]);

  // ═══ VENTAS ═══
  const [buscarVenta, setBuscarVenta] = useState("");
  const ventasFiltradas = useMemo(() => {
    const l = (misVentas?.boletos ?? []) as any[];
    const q = buscarVenta.trim().toLowerCase();
    return q ? l.filter(b => `${b.buyerName} ${b.buyerLastName} ${b.code} ${b.tipoNombre}`.toLowerCase().includes(q)) : l;
  }, [misVentas, buscarVenta]);

  // ─────────────────────────────────────────────────────────────────────────
  if (cargandoSesion || (isAuthenticated && cargandoAcceso) || (isAuthenticated && !puedeEntrar && token)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08070c]">
        <Loader2 className="h-6 w-6 animate-spin text-[#e5007d]" />
      </div>
    );
  }

  if (!isAuthenticated || !puedeEntrar) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08070c] px-5" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="w-full max-w-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: `${ROSA}1f` }}>
            <Store className="h-8 w-8" style={{ color: ROSA }} />
          </div>
          <h1 className="mb-2 text-center text-[22px] font-black text-white">Punto de venta</h1>
          <p className="mb-7 text-center text-[14px] leading-relaxed text-[#a39cad]">
            {!isAuthenticated
              ? "Para tiendas autorizadas y personal del Isekai World Fest. Entra con el correo que registramos para ti."
              : "Tu cuenta no está registrada como tienda ni como personal del evento. Si crees que es un error, escríbenos."}
          </p>
          {!isAuthenticated && (
            <button onClick={openLoginModal} className="mb-3 w-full rounded-2xl font-bold text-white" style={{ minHeight: 54, background: ROSA }}>
              Soy tienda o personal · Entrar
            </button>
          )}
          {/* Quien llegó escaneando su propio boleto */}
          <Link
            href={token ? `/worldfest/pass?boleto=${encodeURIComponent(token)}` : "/worldfest/pass"}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 font-bold text-white"
            style={{ minHeight: 54 }}
          >
            <Swords size={17} className="text-[#a78bfa]" /> {token ? "Es mi boleto · Ver mi Level Pass" : "Ir a mi Level Pass"}
          </Link>
          <Link href="/" className="mt-4 block py-2 text-center text-[13px] text-[#8a8494]">Volver a la web</Link>
        </div>
      </div>
    );
  }

  const pestanas = ([
    esTienda && ["vender", "Vender", Ticket, ROSA],
    puedeXp && ["xp", "Dar EXP", Zap, CIAN],
    esTienda && ["ventas", "Ventas", Receipt, "#a78bfa"],
  ].filter(Boolean) as [Modo, string, any, string][]);
  const conBarra = pestanas.length > 1;
  const colorModo = modo === "xp" ? CIAN : modo === "ventas" ? "#a78bfa" : ROSA;

  // Paso actual de la venta (para la guía de arriba)
  const pasoVenta = vendido ? 4 : !token ? 1 : escaneo?.ticket?.status === "blank" ? (tipoElegido ? 3 : 2) : 1;

  return (
    <div className="sp min-h-screen bg-[#08070c] text-white" style={{ paddingBottom: conBarra ? "calc(env(safe-area-inset-bottom) + 84px)" : "calc(env(safe-area-inset-bottom) + 24px)" }}>
      {camara && (
        <EscanerSeguro onFallo={() => { setCamara(null); toast.error("La cámara no funcionó. Escribe el código del boleto."); }}>
          <QrScanner
            onDetectado={t => {
              const para = camara;
              setCamara(null);
              setUltimoEscaneo(t);
              if (para === "xp") darXp(t);
              else { setVendido(null); setTipoElegido(null); setIntento(false); setToken(t); }
            }}
            onCerrar={() => setCamara(null)}
          />
        </EscanerSeguro>
      )}

      {/* ── Cabecera ── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#08070c]/90 backdrop-blur-md" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${colorModo}1f` }}>
            {esTienda ? <Store size={19} style={{ color: colorModo }} /> : <Zap size={19} style={{ color: colorModo }} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-tight">{esTienda ? (tienda?.name ?? (acceso?.rol === "admin" ? "Administrador" : "Tienda")) : "Personal del evento"}</p>
            <p className="truncate text-[11.5px] text-[#8a8494]">{evento?.name ?? accesoXp?.eventName ?? "Sin evento activo"}</p>
          </div>
          {esTienda && tienda && (
            <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${tienda.active ? "bg-[#4ade80]/12 text-[#4ade80]" : "bg-[#f87171]/12 text-[#f87171]"}`}>
              {tienda.active ? <><BadgeCheck size={12} /> Activa</> : <><Ban size={12} /> Suspendida</>}
            </span>
          )}
          <Link href="/" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8a8494]" aria-label="Volver a la web">
            <Home size={18} />
          </Link>
        </div>
        <CambiarHerramienta className="mx-auto max-w-lg px-4 pb-2.5" ocultar={["vender", "xp"]} />
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5">
        {/* ═════════════ VENDER ═════════════ */}
        {modo === "vender" && esTienda && (
          <div className="sp-entra">
            {/* Guía de pasos */}
            <ol className="mb-5 grid grid-cols-3 gap-2" aria-label="Pasos de la venta">
              {["Escanear", "Tipo", "Comprador"].map((p, i) => {
                const n = i + 1;
                const hecho = pasoVenta > n;
                const actual = pasoVenta === n;
                return (
                  <li key={p} className="flex flex-col gap-1.5">
                    <span className="h-1 rounded-full transition-colors" style={{ background: hecho || actual ? ROSA : "rgba(255,255,255,0.1)", opacity: actual ? 1 : hecho ? 0.6 : 1 }} />
                    <span className={`text-[11.5px] font-semibold ${actual ? "text-white" : hecho ? "text-[#a39cad]" : "text-[#5d5766]"}`}>
                      {hecho ? "✓ " : `${n}. `}{p}
                    </span>
                  </li>
                );
              })}
            </ol>

            {acceso?.rol === "admin" && !tienda && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#fbbf24]/40 bg-[#fbbf24]/[0.08] p-4">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#fbbf24]" />
                <p className="text-[13px] leading-relaxed text-[#fde68a]">Como administrador ves el portal tal cual lo ven las tiendas, pero para registrar una venta hace falta entrar con la cuenta de una tienda autorizada.</p>
              </div>
            )}

            {tienda && !tienda.active && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#f87171]/40 bg-[#f87171]/10 p-4">
                <Ban size={18} className="mt-0.5 shrink-0 text-[#f87171]" />
                <p className="text-[13px] leading-relaxed text-[#fecaca]">Tu tienda está suspendida y no puede vender boletos por ahora. Escríbenos para reactivarla.</p>
              </div>
            )}

            {vendido ? (
              /* ── Venta registrada ── */
              <section className="sp-exito rounded-3xl border border-[#4ade80]/30 bg-[#4ade80]/[0.06] p-6 text-center">
                <span className="sp-exito-check mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#4ade80]">
                  <Check size={32} strokeWidth={3} className="text-[#04140a]" />
                </span>
                <p className="text-[22px] font-black">¡Boleto vendido!</p>
                <p className="mt-1 font-mono text-[15px] tracking-[0.12em] text-[#a39cad]">{vendido.code}</p>
                <div className="mt-5 rounded-2xl bg-black/30 p-4 text-left">
                  <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                    <span className="text-[13px] text-[#8a8494]">Comprador</span>
                    <span className="text-right text-[14px] font-bold">{vendido.comprador}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] py-3">
                    <span className="text-[13px] text-[#8a8494]">Boleto</span>
                    <span className="text-right text-[14px] font-bold">{vendido.tipo}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-3">
                    <span className="text-[13px] text-[#8a8494]">Cobrar</span>
                    <span className="text-right">
                      <span className="block text-[18px] font-black" style={{ color: ROSA }}>${Number(vendido.precioUsd).toFixed(2)}</span>
                      {vendido.precioBs ? <span className="block text-[12px] text-[#a39cad]">Bs {Number(vendido.precioBs).toLocaleString("es-VE")}</span> : null}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-[12.5px] text-[#a39cad]">
                  {vendido.correoEnviado ? "✉️ Le enviamos el comprobante por correo." : "Sin correo: no se envió comprobante."}
                </p>
                <button
                  onClick={() => { limpiarVenta(); setCamara("vender"); }}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl font-bold text-white"
                  style={{ minHeight: 56, background: ROSA }}
                >
                  <Camera size={18} /> Vender otro boleto
                </button>
                <button onClick={limpiarVenta} className="mt-2 w-full py-3 text-[13px] font-semibold text-[#a39cad]">Listo por ahora</button>
              </section>
            ) : !token ? (
              /* ── Paso 1: escanear ── */
              <section>
                <BotonEscanear onClick={() => setCamara("vender")} color={ROSA} texto="Escanear boleto en blanco" disabled={tienda ? !tienda.active : false} />
                <CodigoManual onEnviar={c => { setUltimoEscaneo(c); setToken(c); }} color={ROSA} />
                <p className="mt-2 text-center text-[12px] leading-relaxed text-[#5d5766]">Apunta la cámara al QR del cartón. El código también está impreso debajo.</p>

                {misVentas && (
                  <div className="mt-7 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                      <p className="text-[11px] text-[#8a8494]">Vendidos</p>
                      <p className="text-[20px] font-black tabular-nums">{misVentas.cantidad}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                      <p className="text-[11px] text-[#8a8494]">USD</p>
                      <p className="text-[20px] font-black tabular-nums" style={{ color: ROSA }}>${misVentas.totalUsd.toFixed(0)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                      <p className="text-[11px] text-[#8a8494]">Bs</p>
                      <p className="truncate text-[15px] font-black tabular-nums leading-[30px]">{misVentas.totalBs.toLocaleString("es-VE")}</p>
                    </div>
                  </div>
                )}
              </section>
            ) : buscando ? (
              <div className="flex flex-col items-center gap-3 py-16 text-[#a39cad]">
                <Loader2 className="h-7 w-7 animate-spin" style={{ color: ROSA }} />
                <p className="text-[13px]">Buscando el boleto…</p>
              </div>
            ) : errorEscaneo ? (
              <section className="rounded-3xl border border-[#f87171]/40 bg-[#f87171]/[0.07] p-6 text-center">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#f87171]" />
                <p className="text-[18px] font-black">No reconocemos ese código</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#fecaca]">{errorEscaneo.message}</p>
                {ultimoEscaneo && <p className="mt-3 break-all rounded-xl bg-black/30 px-3 py-2 font-mono text-[11px] text-[#8a8494]">Leído: {ultimoEscaneo}</p>}
                <button onClick={() => { limpiarVenta(); setCamara("vender"); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl font-bold text-white" style={{ minHeight: 52, background: ROSA }}>
                  <Camera size={17} /> Escanear de nuevo
                </button>
                <button onClick={limpiarVenta} className="mt-2 w-full py-3 text-[13px] font-semibold text-[#a39cad]">Cancelar</button>
              </section>
            ) : escaneo?.ticket?.status !== "blank" ? (
              <section className="rounded-3xl border border-[#fbbf24]/40 bg-[#fbbf24]/[0.07] p-6 text-center">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#fbbf24]" />
                <p className="text-[18px] font-black">{escaneo?.ticket?.status === "void" ? "Este boleto está anulado" : "Este boleto ya fue vendido"}</p>
                {escaneo?.ticket?.status === "sold" && (
                  <div className="mt-4 rounded-2xl bg-black/30 p-4 text-left text-[13px]">
                    <p className="font-bold text-white">{escaneo.ticket.buyerName} {escaneo.ticket.buyerLastName}</p>
                    <p className="text-[#a39cad]">{escaneo.tipo?.name} · {escaneo.ticket.code}</p>
                    <p className="mt-1 text-[#8a8494]">
                      Vendido por {escaneo.tienda?.name ?? "—"} {escaneo.ticket.soldAt ? `el ${new Date(escaneo.ticket.soldAt).toLocaleDateString("es-VE")}` : ""}
                    </p>
                  </div>
                )}
                <button onClick={() => { limpiarVenta(); setCamara("vender"); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl font-bold text-white" style={{ minHeight: 52, background: ROSA }}>
                  <Camera size={17} /> Escanear otro
                </button>
              </section>
            ) : (
              /* ── Pasos 2 y 3: tipo y datos ── */
              <section className="flex flex-col gap-6">
                <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="text-[11px] text-[#8a8494]">Boleto en blanco</p>
                    <p className="font-mono text-[17px] font-black tracking-[0.1em]" style={{ color: ROSA }}>{escaneo.ticket.code}</p>
                  </div>
                  <button onClick={limpiarVenta} className="flex min-h-[40px] items-center gap-1 rounded-full border border-white/12 px-3.5 text-[12.5px] font-semibold text-[#a39cad]">
                    <X size={14} /> Cambiar
                  </button>
                </div>

                <div>
                  <p className="mb-2.5 text-[15px] font-bold">¿Qué boleto compró?</p>
                  <div className="flex flex-col gap-2">
                    {tiposActivos.map((t: any) => {
                      const sel = tipoElegido === t.id;
                      const usd = parseFloat(t.priceUsd);
                      return (
                        <button
                          key={t.id}
                          onClick={() => { setTipoElegido(t.id); window.setTimeout(() => datosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); }}
                          className="flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors"
                          style={{ borderColor: sel ? ROSA : "rgba(255,255,255,0.08)", background: sel ? `${ROSA}14` : "rgba(255,255,255,0.025)" }}
                          aria-pressed={sel}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: sel ? ROSA : "rgba(255,255,255,0.25)", background: sel ? ROSA : "transparent" }}>
                            {sel && <Check size={13} strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-bold">{t.name}</span>
                            <span className="block text-[12px] text-[#8a8494]">{t.days === 2 ? "Ambos días" : "Un día"}{t.perks ? ` · ${t.perks}` : ""}</span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-[17px] font-black">${usd.toFixed(2)}</span>
                            {tasa > 0 && <span className="block text-[11px] text-[#8a8494]">Bs {(usd * tasa).toLocaleString("es-VE", { maximumFractionDigits: 0 })}</span>}
                          </span>
                        </button>
                      );
                    })}
                    {tiposActivos.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 py-6 text-center text-[13px] text-[#8a8494]">No hay tipos de boleto activos para este evento.</p>}
                    {intento && errores.tipo && <p className="text-[12px] text-[#f87171]">{errores.tipo}</p>}
                  </div>
                </div>

                <div ref={datosRef} className="scroll-mt-24">
                  <p className="mb-2.5 text-[15px] font-bold">Datos del comprador</p>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <Campo etiqueta="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="off" autoCapitalize="words" error={intento ? errores.nombre : ""} />
                      <Campo etiqueta="Apellido" value={apellido} onChange={e => setApellido(e.target.value)} autoComplete="off" autoCapitalize="words" error={intento ? errores.apellido : ""} />
                    </div>
                    <Campo etiqueta="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} inputMode="tel" placeholder="0414 1234567" autoComplete="off" error={intento ? errores.telefono : ""} />
                    <Campo etiqueta="Correo (recomendado)" value={correo} onChange={e => setCorreo(e.target.value.trim())} inputMode="email" type="email" autoCapitalize="none" placeholder="correo@ejemplo.com" autoComplete="off" error={intento ? errores.correo : ""} />
                  </div>
                  <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-[#a78bfa]/[0.08] p-3.5">
                    <Swords size={16} className="mt-0.5 shrink-0 text-[#a78bfa]" />
                    <p className="text-[12.5px] leading-relaxed text-[#c4b5fd]">Con su correo el comprador recibe el comprobante y entra a su <strong className="text-white">Level Pass</strong> para ver su rango y sus misiones.</p>
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-[#8a8494]">Revisa bien los datos: una vez registrado, el boleto no se puede editar.</p>
                </div>

                {/* Barra fija para confirmar, siempre a la vista */}
                <div className="sp-accion sticky z-20 -mx-4 border-t border-white/[0.06] bg-[#08070c]/95 px-4 py-3 backdrop-blur-md" style={{ bottom: conBarra ? "calc(env(safe-area-inset-bottom) + 70px)" : "env(safe-area-inset-bottom)" }}>
                  <button
                    onClick={registrar}
                    disabled={vender.isPending || (tienda ? !tienda.active : false)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 font-bold text-white disabled:opacity-50"
                    style={{ minHeight: 58, background: ROSA }}
                  >
                    <span className="flex items-center gap-2">
                      {vender.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                      Registrar venta
                    </span>
                    {tipoSel && <span className="text-[15px] font-black">${parseFloat(tipoSel.priceUsd).toFixed(2)}</span>}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ═════════════ DAR EXP ═════════════ */}
        {modo === "xp" && (
          <div className="sp-entra">
            {!puedeXp ? (
              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
                <Zap className="mx-auto mb-3 h-9 w-9 text-[#5d5766]" />
                <p className="text-[17px] font-black">Sin permiso para dar EXP</p>
                <p className="mt-1 text-[13px] text-[#a39cad]">Pide al administrador que te autorice para otorgar experiencia.</p>
              </section>
            ) : !xpEnCurso ? (
              <section className="rounded-3xl border border-[#38bdf8]/25 bg-[#38bdf8]/[0.05] p-6 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#38bdf8]/15"><Zap size={26} className="text-[#38bdf8]" /></span>
                <p className="text-[18px] font-black">Se activa durante el evento</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[#a39cad]">
                  Durante los días de {accesoXp?.eventName ?? "el evento"} aquí elegirás la actividad de tu estación y escanearás el boleto de cada persona para darle su EXP.
                </p>
                {(actividades as any[]).length > 0 && (
                  <div className="mt-5 text-left">
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#8a8494]">Actividades publicadas</p>
                    <div className="flex flex-col gap-1.5">
                      {(actividades as any[]).slice(0, 8).map(a => (
                        <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-[13px]">
                          <span className="truncate">{a.name}</span>
                          <span className="shrink-0 font-mono font-bold text-[#7dd8ff]">+{a.xp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ) : !actividad ? (
              /* ── Paso 1: actividad de la estación ── */
              <section>
                <p className="mb-1 text-[20px] font-black">¿Qué actividad atiendes?</p>
                <p className="mb-4 text-[13px] text-[#a39cad]">Elígela una vez y escanea a cada persona. Puedes cambiarla cuando quieras.</p>
                {(actividades as any[]).length > 6 && (
                  <div className="relative mb-3">
                    <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5d5766]" />
                    <input
                      value={buscarAct}
                      onChange={e => setBuscarAct(e.target.value)}
                      placeholder="Buscar actividad o zona"
                      className="w-full rounded-xl border border-white/10 bg-[#0f0e15] pl-10 pr-4 text-[16px] text-white outline-none placeholder:text-[#5d5766] focus:border-[#38bdf8]"
                      style={{ minHeight: 48 }}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {actividadesFiltradas.map((a: any) => (
                    <button
                      key={a.id}
                      onClick={() => { setActividadId(a.id); setResultadoXp(null); setErrorXp(""); window.scrollTo({ top: 0 }); }}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left transition-colors active:bg-white/[0.06]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#38bdf8]/12 text-[#38bdf8]">
                        {a.repetible ? <Repeat size={17} /> : <Swords size={17} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold leading-snug">{a.name}</span>
                        {a.ubicacion && <span className="mt-0.5 flex items-center gap-1 text-[12px] text-[#8a8494]"><MapPin size={11} /> {a.ubicacion}</span>}
                      </span>
                      <span className="shrink-0 rounded-full bg-[#38bdf8]/12 px-2.5 py-1 font-mono text-[13px] font-black text-[#7dd8ff]">+{a.xp}</span>
                      <ChevronRight size={16} className="shrink-0 text-[#5d5766]" />
                    </button>
                  ))}
                  {(actividades as any[]).length === 0 && <p className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-[13px] text-[#8a8494]">No hay actividades publicadas para este evento.</p>}
                  {(actividades as any[]).length > 0 && actividadesFiltradas.length === 0 && <p className="py-6 text-center text-[13px] text-[#8a8494]">Ninguna coincide con «{buscarAct}».</p>}
                </div>
              </section>
            ) : (
              /* ── Paso 2: escanear persona tras persona ── */
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/[0.07] p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#38bdf8]/15 font-mono text-[14px] font-black text-[#7dd8ff]">+{actividad.xp}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7dd8ff]">Tu estación</p>
                    <p className="truncate text-[15px] font-bold">{actividad.name}</p>
                  </div>
                  <button onClick={() => { setActividadId(null); setResultadoXp(null); setErrorXp(""); }} className="flex min-h-[40px] shrink-0 items-center gap-1 rounded-full border border-white/12 px-3 text-[12.5px] font-semibold text-[#a39cad]">
                    <ArrowLeft size={14} /> Cambiar
                  </button>
                </div>

                {otorgar.isPending ? (
                  <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 py-14 text-[#a39cad]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#38bdf8]" />
                    <p className="text-[13px]">Registrando…</p>
                  </div>
                ) : resultadoXp ? (
                  <div
                    className="sp-exito rounded-3xl border p-6 text-center"
                    style={{ borderColor: resultadoXp.subioDeRango ? `${COLOR_RANGO[resultadoXp.rango] ?? CIAN}66` : "rgba(74,222,128,0.3)", background: resultadoXp.subioDeRango ? `${COLOR_RANGO[resultadoXp.rango] ?? CIAN}14` : "rgba(74,222,128,0.06)" }}
                  >
                    <p className="sp-exito-check font-mono text-[44px] font-black leading-none" style={{ color: resultadoXp.subioDeRango ? COLOR_RANGO[resultadoXp.rango] : "#4ade80" }}>+{resultadoXp.xpGanada}</p>
                    <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.25em] text-[#a39cad]">EXP entregada</p>
                    <p className="mt-4 flex items-center justify-center gap-2 text-[18px] font-black"><User size={17} className="text-[#a39cad]" /> {resultadoXp.nombre}</p>
                    <p className="mt-1 text-[13px] text-[#a39cad]">Total {resultadoXp.xpTotal} EXP · Rango {resultadoXp.rango}</p>
                    {resultadoXp.subioDeRango && (
                      <p className="mx-auto mt-4 inline-block rounded-full px-4 py-2 text-[14px] font-black text-[#04080f]" style={{ background: COLOR_RANGO[resultadoXp.rango] ?? CIAN }}>
                        ¡Subió a rango {resultadoXp.rango}!
                      </p>
                    )}
                  </div>
                ) : errorXp ? (
                  <div className="rounded-3xl border border-[#f87171]/40 bg-[#f87171]/[0.07] p-6 text-center">
                    <AlertCircle className="mx-auto mb-2 h-10 w-10 text-[#f87171]" />
                    <p className="text-[17px] font-black">No se pudo dar la EXP</p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-[#fecaca]">{errorXp}</p>
                    {ultimoEscaneo && <p className="mt-3 break-all rounded-xl bg-black/30 px-3 py-2 font-mono text-[11px] text-[#8a8494]">Leído: {ultimoEscaneo}</p>}
                  </div>
                ) : null}

                <BotonEscanear onClick={() => setCamara("xp")} color={CIAN} texto={resultadoXp || errorXp ? "Escanear siguiente persona" : "Escanear boleto"} />
                <CodigoManual onEnviar={darXp} color={CIAN} cargando={otorgar.isPending} textoBoton="Dar" />

                <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                  <label className="flex items-center gap-2.5 text-[13px] text-[#a39cad]">
                    <input type="checkbox" checked={continuo} onChange={e => setContinuo(e.target.checked)} className="h-5 w-5 accent-[#38bdf8]" />
                    Abrir la cámara sola tras cada registro
                  </label>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[18px] font-black tabular-nums text-white">{contadorXp}</span>
                    <span className="block text-[10px] text-[#8a8494]">en esta sesión</span>
                  </span>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ═════════════ VENTAS ═════════════ */}
        {modo === "ventas" && esTienda && (
          <div className="sp-entra flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2 rounded-3xl border border-[#a78bfa]/25 bg-[#a78bfa]/[0.07] p-5">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-[#c4b5fd]">Total vendido</p>
                <p className="mt-1 text-[34px] font-black leading-none tabular-nums">${(misVentas?.totalUsd ?? 0).toFixed(2)}</p>
                <p className="mt-1.5 text-[13px] text-[#a39cad]">Bs {(misVentas?.totalBs ?? 0).toLocaleString("es-VE")}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <p className="text-[11px] text-[#8a8494]">Boletos vendidos</p>
                <p className="text-[24px] font-black tabular-nums">{misVentas?.cantidad ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <p className="text-[11px] text-[#8a8494]">Con correo</p>
                <p className="text-[24px] font-black tabular-nums">{((misVentas?.boletos ?? []) as any[]).filter(b => b.buyerEmail).length}</p>
              </div>
            </div>

            {(misVentas?.boletos.length ?? 0) > 5 && (
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5d5766]" />
                <input
                  value={buscarVenta}
                  onChange={e => setBuscarVenta(e.target.value)}
                  placeholder="Buscar por nombre o código"
                  className="w-full rounded-xl border border-white/10 bg-[#0f0e15] pl-10 pr-4 text-[16px] text-white outline-none placeholder:text-[#5d5766] focus:border-[#a78bfa]"
                  style={{ minHeight: 48 }}
                />
              </div>
            )}

            {ventasFiltradas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center">
                <ListChecks className="mx-auto mb-2 h-8 w-8 text-[#5d5766]" />
                <p className="text-[13px] text-[#8a8494]">{(misVentas?.boletos.length ?? 0) === 0 ? "Todavía no has vendido boletos." : "Ninguna venta coincide."}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {ventasFiltradas.slice(0, 200).map((b: any) => (
                  <li key={b.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[13px] font-black">
                      {(b.buyerName ?? "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold">{b.buyerName} {b.buyerLastName}</span>
                      <span className="block truncate text-[11.5px] text-[#8a8494]">{b.tipoNombre} · {b.code}{b.soldAt ? ` · ${hace(b.soldAt)}` : ""}</span>
                    </span>
                    <span className="shrink-0 text-[14px] font-black" style={{ color: ROSA }}>${parseFloat(b.priceUsd ?? "0").toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>

      {/* ── Navegación, estilo app ── */}
      {conBarra && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-[#08070c]/95 backdrop-blur-md" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Secciones">
          <div className="mx-auto flex max-w-lg px-2">
            {pestanas.map(([id, label, Icono, color]) => {
              const activo = modo === id;
              return (
                <button
                  key={id}
                  onClick={() => irA(id)}
                  aria-current={activo ? "page" : undefined}
                  className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
                  style={{ minHeight: 64, WebkitTapHighlightColor: "transparent" }}
                >
                  <span className="flex h-8 w-14 items-center justify-center rounded-full transition-colors" style={{ background: activo ? `${color}26` : "transparent" }}>
                    <Icono size={19} style={{ color: activo ? color : "#5d5766" }} />
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: activo ? "#ffffff" : "#5d5766" }}>{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
