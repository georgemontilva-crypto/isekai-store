import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import {
  Loader2, Search, Check, Lock, MapPin, Trophy, X, Home,
  Swords, User, ScrollText, ChevronLeft, ChevronRight, Copy, Repeat, Camera,
} from "lucide-react";
import { Component, type ReactNode } from "react";
import QrScanner from "@/components/admin/QrScanner";

/** Si la cámara falla, la pantalla sigue viva y se escribe el código */
class EscanerSeguro extends Component<{ children: ReactNode; onFallo: () => void }, { roto: boolean }> {
  state = { roto: false };
  static getDerivedStateFromError() { return { roto: true }; }
  componentDidCatch() { this.props.onFallo(); }
  render() { return this.state.roto ? null : this.props.children; }
}
import CarruselPatrocinantes from "@/components/fest/CarruselPatrocinantes";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBoletoSocket } from "@/hooks/useBoletoSocket";
import { openLoginModal } from "@/const";

/**
 * Zona del evento — Isekai World Fest.
 *
 * Es un espacio APARTE de la tienda: sin navbar, sin footer, con su propia
 * navegación y su propia estética. La idea es que quien entra sienta que
 * cruzó a otro lugar, no que abrió una sección más de la web.
 *
 * Se accede con el código impreso del boleto, sin necesidad de cuenta: la
 * mayoría de asistentes no la tendrán.
 */

const CLAVE_BOLETO = "iw_worldfest_boleto";


const COLOR_RANGO: Record<string, string> = {
  E: "#8a8a9c",
  D: "#4ade80",
  C: "#38bdf8",
  B: "#a78bfa",
  A: "#fbbf24",
  S: "#f43f5e",
};

const RANGOS_INFO = [
  { rango: "E", desde: 0 },
  { rango: "D", desde: 60 },
  { rango: "C", desde: 140 },
  { rango: "B", desde: 240 },
  { rango: "A", desde: 360 },
  { rango: "S", desde: 500 },
];

const NOMBRE_RANGO: Record<string, string> = {
  E: "Despertado", D: "Explorador", C: "Cazador", B: "Élite", A: "Élite superior", S: "El Despertado",
};

/**
 * Demo pública del Level Pass: se activa desde el panel (ajuste «lp_demo»).
 * Mientras está activa, quien entra sin boleto ve un cazador de prueba con
 * misiones de ejemplo que puede completar tocándolas. Todo pasa en su
 * teléfono: no se guarda nada ni toca boletos reales.
 */
const MISIONES_DEMO = [
  { id: 1, name: "Escanea tu boleto en la entrada", description: "Muestra tu boleto en el acceso y empieza tu aventura en rango E.", ubicacion: "Acceso principal", xp: 20, tope: 1 },
  { id: 2, name: "Foto en el photocall oficial", description: "Tómate la foto en el photocall del World Fest y muéstrasela al personal.", ubicacion: "Entrada principal", xp: 30, tope: 1 },
  { id: 3, name: "Desfila en el Red Carpet Cosplayer", description: "Recorre la alfombra roja con tu personaje frente a fotógrafos y público.", ubicacion: "Red Carpet", xp: 60, tope: 1 },
  { id: 4, name: "Gana un reto en la Zona Gamer", description: "Compite en cualquiera de los retos de videojuegos y gana una partida.", ubicacion: "Zona Gamer", xp: 80, tope: 1 },
  { id: 5, name: "Compra en un stand aliado", description: "Cada compra en los stands autorizados suma experiencia. Se puede repetir.", ubicacion: "Stands comerciales", xp: 20, tope: 3 },
  { id: 6, name: "Encuentra la puerta oculta", description: "Una de las experiencias inmersivas esconde una puerta. Encuéntrala y crúzala.", ubicacion: "Experiencias inmersivas", xp: 100, tope: 1 },
  { id: 7, name: "Asiste a la obra teatral", description: "Vive la historia creada para el World Fest en el escenario principal.", ubicacion: "Escenario principal", xp: 60, tope: 1 },
  { id: 8, name: "Ataca al Guardián del Portal", description: "Únete al raid del jefe en la Zona Gate y ayuda a derribarlo.", ubicacion: "Zona Gate", xp: 120, tope: 1 },
];

function rangoDeXp(xp: number) {
  let r = "E";
  for (const x of RANGOS_INFO) if (xp >= x.desde) r = x.rango;
  return r;
}
function siguienteDeXp(xp: number) {
  const prox = RANGOS_INFO.find(r => xp < r.desde);
  if (!prox) return null;
  const act = [...RANGOS_INFO].reverse().find(r => xp >= r.desde) ?? RANGOS_INFO[0];
  const tramo = prox.desde - act.desde;
  return { rango: prox.rango, faltan: prox.desde - xp, progreso: tramo > 0 ? Math.round(((xp - act.desde) / tramo) * 100) : 100 };
}

type Pestana = "rango" | "misiones" | "perfil";
type Filtro = "pendientes" | "completadas" | "todas";

/** Número que sube de a poco hasta el valor (se nota cuando gana EXP) */
function Contador({ valor }: { valor: number }) {
  const [visto, setVisto] = useState(0);
  const previo = useRef(0);
  useEffect(() => {
    const desde = previo.current;
    previo.current = valor;
    if (desde === valor) { setVisto(valor); return; }
    const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducir) { setVisto(valor); return; }
    const inicio = performance.now();
    const dur = 900;
    let raf = 0;
    const paso = (t: number) => {
      const k = Math.min(1, (t - inicio) / dur);
      const suave = 1 - Math.pow(1 - k, 3);
      setVisto(Math.round(desde + (valor - desde) * suave));
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return <>{visto.toLocaleString()}</>;
}

/** Sello del rango con un anillo que marca el avance hacia el siguiente */
function AnilloRango({ color, progreso, rango }: { color: string; progreso: number; rango: string }) {
  const R = 62;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative h-[150px] w-[150px]">
      <svg viewBox="0 0 150 150" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="75" cy="75" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle
          cx="75" cy="75" r={R} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(100, progreso) / 100)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)", filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div
        className="wfp-sello absolute inset-[18px] flex items-center justify-center rounded-full"
        style={{ background: `radial-gradient(circle at 50% 35%, ${color}33, #040a12 70%)`, boxShadow: `inset 0 0 24px ${color}33, 0 0 30px ${color}33`, ["--lp-rango" as string]: color }}
      >
        <span className="font-mono text-[56px] font-black leading-none" style={{ color, textShadow: `0 0 22px ${color}aa` }}>{rango}</span>
      </div>
    </div>
  );
}

/** Una misión: qué hacer, dónde, cuánta EXP da y cómo va */
function TarjetaMision({ a, color, onCompletar }: { a: any; color: string; onCompletar?: () => void }) {
  const [abierta, setAbierta] = useState(false);
  const hecha = a.completada;
  const larga = (a.description ?? "").length > 90;
  const tocable = !!onCompletar && !hecha;
  return (
    <article
      className={`wfp-mision rounded-2xl border p-4 transition-colors ${hecha ? "border-[#4ade80]/20 bg-[#4ade80]/[0.04]" : "border-white/[0.08] bg-white/[0.025]"} ${tocable ? "ev-press cursor-pointer active:bg-white/[0.06]" : ""}`}
      onClick={() => { if (tocable) onCompletar!(); else if (larga) setAbierta(v => !v); }}
      role={tocable ? "button" : undefined}
      tabIndex={tocable ? 0 : undefined}
      onKeyDown={e => { if (tocable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onCompletar!(); } }}
    >
      <div className="flex items-start gap-3.5">
        <span
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
          style={hecha
            ? { borderColor: "#4ade8066", background: "#4ade801a", color: "#4ade80" }
            : { borderColor: `${color}55`, background: `${color}12`, color }}
        >
          {hecha ? <Check size={18} strokeWidth={2.6} /> : a.tope > 1 ? <Repeat size={16} /> : <Swords size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className={`text-[15px] font-bold leading-snug ${hecha ? "text-[#8fa8bd]" : "text-white"}`}>{a.name}</h3>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[11.5px] font-black"
              style={hecha ? { background: "#4ade801a", color: "#4ade80" } : { background: `${color}1f`, color }}
            >
              +{a.xp}
            </span>
          </div>
          {a.description && (
            <p className={`mt-1 text-[13px] leading-relaxed text-[#8fa8bd] ${abierta ? "" : "line-clamp-2"}`}>{a.description}</p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {a.ubicacion && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-[#b8e6ff]">
                <MapPin size={11} /> {a.ubicacion}
              </span>
            )}
            {a.tope > 1 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-[#b8e6ff]">
                <span className="flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: Math.min(a.tope, 8) }, (_, i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < a.veces ? (hecha ? "#4ade80" : color) : "rgba(255,255,255,0.15)" }} />
                  ))}
                </span>
                {a.veces}/{a.tope}
              </span>
            )}
            {hecha && <span className="text-[11px] font-semibold text-[#4ade80]">Completada</span>}
            {tocable && <span className="text-[11px] font-semibold text-[#fbbf24]">Toca para completar · demo</span>}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function WorldFestPass() {
  /**
   * TEMPORAL: la zona del evento todavía no es pública. Mientras se prepara,
   * solo entra el dueño. Quitar esta restricción antes del evento.
   */
  const { user, isAuthenticated, loading: cargandoSesion } = useAuth();
  /**
   * Entra quien tenga cuenta: el sistema comprueba que el boleto esté a su
   * nombre comparando el correo. El personal del evento puede ver cualquiera
   * para resolver incidencias.
   */
  const esAdmin = isAuthenticated;

  const [codigo, setCodigo] = useState("");
  const [consultado, setConsultado] = useState("");
  const [pestana, setPestana] = useState<Pestana>("rango");
  const [rangoAnunciado, setRangoAnunciado] = useState<string | null>(null);
  const rangoPrevio = useRef<string | null>(null);

  // El boleto llega por el enlace (al escanear el QR propio: ?boleto=TOKEN)
  // o se recuerda de la última vez: nadie quiere teclear su código cada vez
  useEffect(() => {
    try {
      const delEnlace = new URLSearchParams(window.location.search).get("boleto");
      if (delEnlace && delEnlace.length >= 4) {
        setConsultado(delEnlace);
        localStorage.setItem(CLAVE_BOLETO, delEnlace);
        window.history.replaceState(null, "", "/worldfest/pass");
        return;
      }
      const guardado = localStorage.getItem(CLAVE_BOLETO);
      if (guardado) setConsultado(guardado);
    } catch { /* almacenamiento no disponible */ }
  }, []);
  const [escaneandoPropio, setEscaneandoPropio] = useState(false);

  const { data: real, isLoading, error } = trpc.levelPass.estado.useQuery(
    { codigo: consultado },
    { enabled: consultado.length >= 4, retry: false, refetchInterval: 15000 },
  );

  // ── Demo (se enciende desde el panel) ──
  const { data: ajustes } = trpc.settings.getAll.useQuery();
  const demoActivo = ajustes?.["lp_demo"] === "1";
  const [salioDemo, setSalioDemo] = useState(false);
  const [demoVeces, setDemoVeces] = useState<Record<number, number>>({});
  const [demoHistorial, setDemoHistorial] = useState<{ actividad: string; xp: number; fecha: Date }[]>([]);
  const modoDemo = demoActivo && !real && !salioDemo;
  const demoData = useMemo(() => {
    const xp = MISIONES_DEMO.reduce((t, m) => t + m.xp * (demoVeces[m.id] ?? 0), 0);
    const rango = rangoDeXp(xp);
    return {
      codigo: "IW-DEMO",
      // En la demo, el nombre de quien la está viendo
      nombre: (user?.name && !user.name.includes("@") ? user.name : "") || "Cazador de prueba",
      xpTotal: xp,
      rango,
      siguiente: siguienteDeXp(xp),
      esRangoS: rango === "S",
      actividades: MISIONES_DEMO.map(m => {
        const veces = demoVeces[m.id] ?? 0;
        return { ...m, veces, completada: veces >= m.tope };
      }),
      historial: demoHistorial,
    };
  }, [demoVeces, demoHistorial]);
  const data: any = modoDemo ? demoData : real;
  const completarDemo = (id: number) => {
    const m = MISIONES_DEMO.find(x => x.id === id);
    if (!m || (demoVeces[id] ?? 0) >= m.tope) return;
    setDemoVeces(v => ({ ...v, [id]: (v[id] ?? 0) + 1 }));
    setDemoHistorial(h => [{ actividad: m.name, xp: m.xp, fecha: new Date() }, ...h]);
    try { navigator.vibrate?.(30); } catch { /* no soportado */ }
  };
  const reiniciarDemo = () => {
    setDemoVeces({});
    setDemoHistorial([]);
    rangoPrevio.current = null;
    setRangoAnunciado(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  const utils = trpc.useUtils();

  // Con sesión iniciada: si su correo tiene un boleto, se abre solo
  const { data: miBoleto } = trpc.levelPass.miBoleto.useQuery(undefined, { enabled: isAuthenticated && !consultado });
  useEffect(() => {
    if (!consultado && miBoleto?.codigo) setConsultado(miBoleto.codigo);
  }, [miBoleto?.codigo, consultado]);

  /**
   * TEMPORAL: barra de ensayo para el dueño. Permite sumar puntos sin salir
   * de esta pantalla, para ver el ascenso de rango al momento.
   */
  const esDueno = user?.role === "admin";
  const darXp = trpc.levelPass.darXpPrueba.useMutation({
    onSuccess: () => utils.levelPass.estado.invalidate({ codigo: consultado }),
    onError: (e: any) => alert(e.message),
  });

  /**
   * Los puntos llegan al instante por conexión en vivo. La consulta cada 15
   * segundos se mantiene como respaldo por si la conexión se cae.
   */
  useBoletoSocket(consultado, (aviso) => {
    /**
     * El aviso ya trae los puntos y el rango, así que se aplican de inmediato
     * sobre lo que hay en pantalla. Antes se pedían de nuevo al servidor, y
     * esa vuelta se notaba como un retraso de varios segundos.
     */
    utils.levelPass.estado.setData({ codigo: consultado }, (previo: any) => {
      if (!previo) return previo;
      return { ...previo, xpTotal: aviso.xpTotal, rango: aviso.rango, esRangoS: aviso.rango === "S" };
    });

    // En segundo plano se traen los datos completos: qué misiones quedaron
    // marcadas, el historial y cuánto falta para el siguiente rango.
    utils.levelPass.estado.invalidate({ codigo: consultado });
  });

  useEffect(() => {
    if (!data?.rango) return;
    if (rangoPrevio.current && rangoPrevio.current !== data.rango) {
      setRangoAnunciado(data.rango);
      setAnchoBarra(0);   // se llenará de nuevo al cerrar el anuncio
      // Vibración corta: en el teléfono refuerza el momento sin depender
      // de que el asistente esté mirando la pantalla.
      try { navigator.vibrate?.([40, 60, 120]); } catch { /* no soportado */ }
    }
    rangoPrevio.current = data.rango;
  }, [data?.rango]);

  const entrar = (valor: string) => {
    const limpio = valor.trim();
    if (limpio.length < 4) return;
    setConsultado(limpio);
    try { localStorage.setItem(CLAVE_BOLETO, limpio); } catch { /* ignorado */ }
  };

  const salir = () => {
    if (modoDemo) { reiniciarDemo(); setSalioDemo(true); setPestana("rango"); return; }
    setConsultado("");
    setCodigo("");
    rangoPrevio.current = null;
    try { localStorage.removeItem(CLAVE_BOLETO); } catch { /* ignorado */ }
  };

  const color = data ? (COLOR_RANGO[data.rango] ?? "#38bdf8") : "#38bdf8";

  // La cabecera se esconde al bajar y vuelve al subir, como en las apps
  const [cabOculta, setCabOculta] = useState(false);
  useEffect(() => {
    let ultimo = window.scrollY;
    let pendiente = false;
    const alMover = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => {
        pendiente = false;
        const y = window.scrollY;
        const d = y - ultimo;
        if (y < 72) setCabOculta(false);
        else if (d > 8) setCabOculta(true);
        else if (d < -8) setCabOculta(false);
        if (Math.abs(d) > 8 || y < 72) ultimo = y;
      });
    };
    window.addEventListener("scroll", alMover, { passive: true });
    return () => window.removeEventListener("scroll", alMover);
  }, []);
  const esRangoMaximo = rangoAnunciado === "S";

  /**
   * La barra de experiencia se llena desde cero al entrar y al cambiar de
   * rango: ver el avance producirse es lo que da sensación de progreso,
   * frente a encontrarla ya llena.
   */
  const [anchoBarra, setAnchoBarra] = useState(0);
  useEffect(() => {
    if (!data || rangoAnunciado) return;   // mientras se anuncia el ascenso queda vacía
    const destino = data.siguiente?.progreso ?? 100;
    const id = setTimeout(() => setAnchoBarra(destino), 120);
    return () => clearTimeout(id);
  }, [data?.xpTotal, data?.rango, rangoAnunciado]);

  // Pestaña y filtro de misiones; al cambiar de pestaña se vuelve arriba
  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  const [copiado, setCopiado] = useState(false);
  const irA = (p: Pestana) => { setPestana(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // «+N EXP» flotante cuando llega experiencia nueva (no al entrar)
  const [ganancia, setGanancia] = useState<{ id: number; n: number } | null>(null);
  const xpPrevio = useRef<number | null>(null);
  useEffect(() => {
    if (data?.xpTotal === undefined) return;
    const antes = xpPrevio.current;
    xpPrevio.current = data.xpTotal;
    if (antes !== null && data.xpTotal > antes) {
      setGanancia({ id: Date.now(), n: data.xpTotal - antes });
      const t = window.setTimeout(() => setGanancia(null), 2400);
      return () => window.clearTimeout(t);
    }
  }, [data?.xpTotal]);

  const actividades: any[] = data?.actividades ?? [];
  const pendientes = actividades.filter(a => !a.completada);
  const hechas = actividades.length - pendientes.length;
  const expDisponible = pendientes.reduce((t, a) => t + a.xp * Math.max(1, (a.tope ?? 1) - (a.veces ?? 0)), 0);
  const listaFiltrada = filtro === "pendientes" ? pendientes : filtro === "completadas" ? actividades.filter(a => a.completada) : actividades;
  const indiceRango = RANGOS_INFO.findIndex(r => r.rango === data?.rango);
  const tramo = {
    desde: RANGOS_INFO[Math.max(0, indiceRango)]?.desde ?? 0,
    hasta: RANGOS_INFO[indiceRango + 1]?.desde ?? null,
  };

  if (cargandoSesion) {
    return (
      <div className="wf-zona flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#38bdf8]" />
      </div>
    );
  }

  // ── Sin sesión: el boleto se reclama con el correo con el que se compró ──
  if (!esAdmin && !modoDemo) {
    return (
      <div className="wf-zona flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="lp-ventana w-full max-w-sm p-8">
          <p className="mb-3 ui-etq text-[#7dd8ff]">
            Isekai World Fest
          </p>
          <h1 className="ev-display mb-3 text-[24px] leading-[1.08] text-white">Entra a tu Level Pass</h1>
          <p className="mb-7 text-sm leading-relaxed text-[#8fa8bd]">
            Inicia sesión con el <strong className="text-white">mismo correo</strong> que
            diste al comprar tu boleto. Así nadie más puede ver tu progreso.
          </p>
          <button
            onClick={openLoginModal}
            className="mb-3 block w-full rounded-full bg-[#38bdf8] py-4 text-[15px] font-bold text-[#04080f]"
          >
            Iniciar sesión
          </button>
          {demoActivo && salioDemo && (
            <button
              onClick={() => setSalioDemo(false)}
              className="mb-3 block w-full rounded-full border border-[#fbbf24]/40 py-3.5 text-sm font-bold text-[#fbbf24]"
            >
              Ver la demo otra vez
            </button>
          )}
          <Link
            href="/"
            className="block w-full py-2 font-mono text-[11px] uppercase tracking-widest text-[#5f7f96]"
          >
            Volver
          </Link>
        </div>
      </div>
    );
  }

  // ── Entrada: sin boleto todavía ──
  if (!data) {
    return (
      <div
        className="wf-zona flex min-h-screen flex-col items-center justify-center px-6 py-16"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 5rem)" }}
      >
        <Link
          href="/"
          className="absolute left-5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[#5f7f96] transition-colors hover:text-[#7dd8ff]"
          style={{ top: "calc(env(safe-area-inset-top) + 1.25rem)" }}
        >
          <ChevronLeft size={13} /> Salir
        </Link>

        <div className="lp-ventana w-full max-w-md p-7 sm:p-9">
          <p className="mb-2 text-center ui-etq text-[#7dd8ff]">
            Isekai World Fest
          </p>
          <h1 className="ev-display mb-3 text-center text-[26px] leading-[1.05] text-white">
            Entrar al sistema
          </h1>
          <p className="mb-7 text-center text-sm leading-relaxed text-[#8fa8bd]">
            Escanea el QR de tu boleto o escribe el código impreso. Desde aquí
            verás tu rango, tus misiones y tu progreso.
          </p>

          {escaneandoPropio && (
            <EscanerSeguro onFallo={() => setEscaneandoPropio(false)}>
              <QrScanner onDetectado={t => { setEscaneandoPropio(false); entrar(t); }} onCerrar={() => setEscaneandoPropio(false)} />
            </EscanerSeguro>
          )}
          <button
            onClick={() => setEscaneandoPropio(true)}
            className="ev-press mb-4 flex w-full items-center justify-center gap-2.5 rounded-2xl font-bold text-[#04080f]"
            style={{ minHeight: 56, background: "#38bdf8", boxShadow: "0 12px 30px -12px #38bdf8" }}
          >
            <Camera size={20} /> Escanear mi boleto
          </button>
          <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-[#5f7f96]">o escribe el código</p>

          <div className="flex gap-2">
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === "Enter") entrar(codigo); }}
              placeholder="IW-XXXXXX"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 font-mono text-[16px] uppercase tracking-widest text-white outline-none transition-colors placeholder:text-[#3a5a72] focus:border-[#38bdf8]"
              style={{ minHeight: 54 }}
            />
            <button
              onClick={() => entrar(codigo)}
              disabled={codigo.trim().length < 4}
              className="shrink-0 ev-press rounded-2xl bg-[#38bdf8]/15 px-5 text-[#7dd8ff] disabled:opacity-40"
              style={{ minHeight: 54 }}
              aria-label="Entrar"
            >
              {isLoading ? <Loader2 size={19} className="animate-spin" /> : <Search size={19} />}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-red-400">{error.message}</p>
          )}

          <p className="mt-6 text-center text-[11px] leading-relaxed text-[#5f7f96]">
            El código está debajo del QR de tu boleto.
          </p>

          {demoActivo && salioDemo && (
            <button
              onClick={() => setSalioDemo(false)}
              className="mx-auto mt-4 flex items-center justify-center rounded-full border border-[#fbbf24]/40 px-4 py-2.5 text-xs font-bold text-[#fbbf24]"
            >
              Ver la demo otra vez
            </button>
          )}

          {/* TEMPORAL: atajo mientras se prueba el sistema (solo administración) */}
          {esDueno && <div className="mt-5 border-t border-[#38bdf8]/12 pt-4">
            <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-[#5f7f96]">
              Boletos de prueba
            </p>
            <div className="flex justify-center gap-2">
              {["IW-TEST01", "IW-TEST02", "IW-TEST03"].map(c => (
                <button
                  key={c}
                  onClick={() => entrar(c)}
                  className="rounded-full border border-[#38bdf8]/25 px-3.5 py-2 font-mono text-[11px] text-[#7dd8ff] transition-colors hover:border-[#38bdf8]/60"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>}

        </div>
      </div>
    );
  }

  return (
    <div className="wf-zona ev-grid min-h-screen" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 70px)" }}>

      {/* El entorno toma el color del rango: golpe al ascender y tinte suave
          mientras se permanece en él. */}
      <div
        className={`lp-ambiente ${rangoAnunciado ? "lp-ambiente-sube" : ""}`}
        style={{ ["--lp-rango" as string]: color }}
      />
      {rangoAnunciado && (
        <div className="lp-marco-sube" style={{ ["--lp-rango" as string]: color }} />
      )}

      {/* ── Anuncio de ascenso ── */}
      {rangoAnunciado && (
        <div
          className="lp-overlay fixed inset-0 z-[200] flex items-center justify-center bg-black/88 px-6"
          onClick={() => setRangoAnunciado(null)}
        >
          {/* Destello del color del rango que tiñe la pantalla */}
          <span
            className="lp-fogonazo"
            style={{
              background: `radial-gradient(circle at 50% 45%, ${COLOR_RANGO[rangoAnunciado] ?? "#38bdf8"}, transparent 65%)`,
            }}
          />
          <div
            className="lp-ventana lp-anuncio lp-anuncio-color relative w-full max-w-sm overflow-hidden p-8 text-center"
            onClick={e => e.stopPropagation()}
            style={{
              // El cuadro entero toma el color del rango nuevo
              ["--lp-rango" as string]: (COLOR_RANGO[rangoAnunciado] ?? "#38bdf8"),
              ["--lp-glow" as string]: `${COLOR_RANGO[rangoAnunciado] ?? "#38bdf8"}66`,
              ["--lp-glow-soft" as string]: `${COLOR_RANGO[rangoAnunciado] ?? "#38bdf8"}22`,
            }}
          >
            {/* Destello que cruza la ventana al aparecer */}
            <span className="lp-brillo" />
            {/* Línea de escaneo, como una interfaz que se inicializa */}
            <span className="lp-escaneo" />

            {/* Partículas ascendentes: más y más rápidas en rango S */}
            {Array.from({ length: esRangoMaximo ? 18 : 10 }, (_, i) => (
              <span
                key={i}
                className="lp-particula"
                style={{
                  color: COLOR_RANGO[rangoAnunciado] ?? "#38bdf8",
                  left: `${6 + (i * 88) / (esRangoMaximo ? 18 : 10)}%`,
                  animationDelay: `${0.4 + i * 0.13}s`,
                  animationDuration: `${(esRangoMaximo ? 1.9 : 2.4) + (i % 3) * 0.35}s`,
                }}
              />
            ))}

            <button
              onClick={() => setRangoAnunciado(null)}
              className="absolute right-3 top-3 z-10 p-2 text-[#7dd8ff]/60 hover:text-white"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <p className="lp-linea-1 mb-2 ui-etq text-[#7dd8ff]">
              Notificación
            </p>
            <p className="lp-linea-2 mb-7 text-sm text-[#b8e6ff]">Has subido de rango</p>

            {/* Sello del rango: gira al entrar y late después, con anillos
                que se expanden desde el borde. */}
            <div
              className={`lp-sello relative mx-auto mb-7 flex items-center justify-center rounded-full border-2 ${esRangoMaximo ? "h-36 w-36" : "h-28 w-28"}`}
              style={{
                borderColor: COLOR_RANGO[rangoAnunciado] ?? "#38bdf8",
                color: COLOR_RANGO[rangoAnunciado] ?? "#38bdf8",
              }}
            >
              <span className="lp-anillo lp-anillo-1" />
              <span className="lp-anillo lp-anillo-2" />
              {esRangoMaximo && <span className="lp-aura" />}

              {/* La letra se desdobla en cian y magenta antes de asentarse */}
              <span className="lp-glitch font-mono text-6xl font-black" style={{ color: COLOR_RANGO[rangoAnunciado] ?? "#38bdf8" }}>
                <span className="lp-glitch-capa lp-glitch-cian font-mono text-6xl font-black" aria-hidden="true">
                  {rangoAnunciado}
                </span>
                <span className="lp-glitch-capa lp-glitch-magenta font-mono text-6xl font-black" aria-hidden="true">
                  {rangoAnunciado}
                </span>
                {rangoAnunciado}
              </span>
            </div>

            <p className="lp-linea-3 text-lg font-black text-white">RANGO {rangoAnunciado}</p>
            {esRangoMaximo && (
              <div className="lp-linea-4 mt-4 rounded-2xl border border-[#f43f5e]/40 bg-[#f43f5e]/10 p-4">
                <p className="ui-etq text-[#f43f5e]">
                  Rango máximo
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#ffd0d8]">
                  Ya estás dentro del <strong className="text-white">sorteo especial</strong> del
                  cierre del evento.
                </p>
              </div>
            )}

            <button
              onClick={() => setRangoAnunciado(null)}
              className="lp-linea-4 mt-7 w-full ev-press rounded-full bg-[#38bdf8] text-[15px] font-bold text-[#04080f] transition-colors"
              style={{ minHeight: 48 }}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* Aviso flotante de EXP ganada (llega en vivo desde la estación) */}
      {ganancia && (
        <div key={ganancia.id} className="wfp-ganancia pointer-events-none fixed inset-x-0 z-[150] flex justify-center" style={{ top: "calc(env(safe-area-inset-top) + 76px)" }}>
          <span className="wfp-ganancia-chip" style={{ ["--lp-rango" as string]: color }}>+{ganancia.n} EXP</span>
        </div>
      )}

      {/* ── Cabecera propia ── */}
      <header
        className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#040a12]/90 backdrop-blur-md transition-transform duration-300 ease-out"
        style={{ paddingTop: "env(safe-area-inset-top)", transform: cabOculta ? "translateY(-100%)" : "none" }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-mono text-base font-black"
              style={{ borderColor: color, color, boxShadow: `0 0 16px ${color}55`, background: `${color}14` }}
              aria-label={`Rango ${data.rango}`}
            >
              {data.rango}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold leading-tight text-white">{data.nombre || "Cazador"}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color }}>
                {NOMBRE_RANGO[data.rango] ?? "Cazador"} · {data.xpTotal.toLocaleString()} EXP
              </p>
            </div>
          </div>
          <Link href="/" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[#7f9bb2] hover:text-[#7dd8ff]" aria-label="Volver a la web">
            <Home size={17} />
          </Link>
        </div>
      </header>

      {modoDemo && (
        <div className="wfp-demo border-b border-[#fbbf24]/25 px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <span className="wfp-demo-punto shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-[#fde68a]">
              <strong className="text-[#fbbf24]">Demo.</strong> Así verás tu Level Pass el día del evento. Toca una misión para completarla.
            </p>
            <button onClick={reiniciarDemo} className="flex h-9 shrink-0 items-center rounded-full border border-[#fbbf24]/40 px-3 text-[11.5px] font-bold text-[#fbbf24]">
              Reiniciar
            </button>
            <button onClick={salir} aria-label="Cerrar la demo" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fbbf24]/15 text-[#fbbf24]">
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      {/* TEMPORAL: solo el dueño la ve */}
      {esDueno && !modoDemo && (
        <div className="border-b border-[#fbbf24]/25 bg-[#fbbf24]/[0.07] px-4 py-2.5">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#fbbf24]">Ensayo</span>
            {[40, 80, 200].map(n => (
              <button
                key={n}
                onClick={() => darXp.mutate({ codigo: consultado, xp: n })}
                disabled={darXp.isPending}
                className="rounded-full border border-[#fbbf24]/40 bg-[#fbbf24]/10 px-3.5 py-2 text-xs font-bold text-[#fbbf24] disabled:opacity-40"
              >
                +{n} EXP
              </button>
            ))}
            <button
              onClick={() => darXp.mutate({ codigo: consultado, xp: -5000 })}
              className="rounded-full border border-[#38bdf8]/30 px-3.5 py-2 text-xs font-bold text-[#7dd8ff]"
            >
              Reiniciar
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-4 pb-6 pt-5">

        {/* ═══════════ MI RANGO ═══════════ */}
        {pestana === "rango" && (
          <div className="wfp-entra flex flex-col gap-5">
            {/* Tarjeta principal: sello con anillo de progreso, EXP y barra */}
            <section className="lp-ventana wfp-heroe overflow-hidden px-5 pb-6 pt-7" style={{ ["--lp-rango" as string]: color }}>
              <div className="flex flex-col items-center text-center">
                <AnilloRango color={color} progreso={anchoBarra} rango={data.rango} />
                <p className="mt-4 ui-etq text-[#7dd8ff]">Rango actual</p>
                <p className="mt-1 text-[22px] font-black leading-tight text-white">{NOMBRE_RANGO[data.rango] ?? data.rango}</p>
              </div>

              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="ui-etq text-[#5f7f96]">Experiencia</p>
                  <p className="font-mono text-[34px] font-black leading-none text-white tabular-nums">
                    <Contador valor={data.xpTotal} /> <span className="text-sm font-bold" style={{ color }}>EXP</span>
                  </p>
                </div>
                {data.siguiente && (
                  <div className="text-right">
                    <p className="ui-etq text-[#5f7f96]">Siguiente</p>
                    <p className="font-mono text-lg font-black leading-none" style={{ color: COLOR_RANGO[data.siguiente.rango] }}>
                      {data.siguiente.rango}
                    </p>
                  </div>
                )}
              </div>

              {/* Barra con los dos extremos del tramo */}
              <div className="mt-3">
                <div className="wfp-barra relative h-3.5 w-full overflow-hidden rounded-full">
                  <div
                    className="wfp-barra-relleno h-full rounded-full transition-[width] duration-[1100ms] ease-out"
                    style={{ width: `${anchoBarra}%`, background: `linear-gradient(90deg, ${color}, #7dd8ff)`, boxShadow: `0 0 14px ${color}88` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[#5f7f96]">
                  <span>{tramo.desde} EXP</span>
                  <span>{tramo.hasta !== null ? `${tramo.hasta} EXP` : "MÁX"}</span>
                </div>
              </div>

              <p className="mt-3 text-center text-[14px] text-[#8fa8bd]">
                {data.siguiente
                  ? <>Te faltan <strong className="text-white">{data.siguiente.faltan} EXP</strong> para <strong style={{ color: COLOR_RANGO[data.siguiente.rango] }}>{NOMBRE_RANGO[data.siguiente.rango]}</strong></>
                  : <>Alcanzaste el <strong className="text-white">rango máximo</strong></>}
              </p>

              {/* Resumen rápido */}
              <div className="mt-6 grid grid-cols-3 gap-2">
                {[
                  { n: `${hechas}/${data.actividades.length}`, t: "Misiones" },
                  { n: String(pendientes.length), t: "Pendientes" },
                  { n: `+${expDisponible}`, t: "EXP por ganar" },
                ].map(c => (
                  <div key={c.t} className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-2 py-3 text-center">
                    <p className="font-mono text-[17px] font-black text-white tabular-nums">{c.n}</p>
                    <p className="mt-0.5 text-[10.5px] text-[#5f7f96]">{c.t}</p>
                  </div>
                ))}
              </div>

              {data.esRangoS && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#f43f5e]/40 bg-[#f43f5e]/10 p-4">
                  <Trophy size={20} className="shrink-0 text-[#f43f5e]" />
                  <p className="text-sm leading-relaxed text-[#ffd0d8]">
                    Estás dentro del <strong className="text-white">sorteo especial</strong> del cierre.
                  </p>
                </div>
              )}
            </section>

            <CarruselPatrocinantes muestra={modoDemo} />

            {/* Próximas misiones */}
            <section>
              <div className="mb-3 flex items-end justify-between">
                <h2 className="text-[17px] font-black text-white">Tus próximas misiones</h2>
                {pendientes.length > 0 && (
                  <button onClick={() => irA("misiones")} className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-[#7dd8ff]">
                    Ver todas <ChevronRight size={13} />
                  </button>
                )}
              </div>
              {pendientes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center">
                  <p className="text-sm text-[#8fa8bd]">
                    {data.actividades.length === 0 ? "Las misiones aparecerán aquí cuando se publiquen." : "¡Completaste todas las misiones disponibles!"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {pendientes.slice(0, 3).map((a: any) => <TarjetaMision key={a.id} a={a} color={color} onCompletar={modoDemo ? () => completarDemo(a.id) : undefined} />)}
                </div>
              )}
            </section>

            {/* Escala de rangos en línea */}
            <section className="lp-ventana px-4 py-5" style={{ ["--lp-rango" as string]: color }}>
              <p className="mb-4 ui-etq text-[#7dd8ff]">El camino al rango S</p>
              <div className="relative">
                <div className="absolute left-[8%] right-[8%] top-[18px] h-[2px] bg-white/[0.08]" />
                <div
                  className="absolute left-[8%] top-[18px] h-[2px] transition-[width] duration-700"
                  style={{ width: `${(Math.max(0, indiceRango) / (RANGOS_INFO.length - 1)) * 84}%`, background: `linear-gradient(90deg, #8a8a9c, ${color})` }}
                />
                <div className="relative grid grid-cols-6">
                  {RANGOS_INFO.map((r, i) => {
                    const alcanzado = data.xpTotal >= r.desde;
                    const esActual = data.rango === r.rango;
                    const c = COLOR_RANGO[r.rango];
                    return (
                      <div key={r.rango} className="flex flex-col items-center">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-mono text-sm font-black ${esActual ? "wfp-nodo-actual" : ""}`}
                          style={{
                            borderColor: alcanzado ? c : "#1e3a52",
                            color: alcanzado ? c : "#3a5a72",
                            background: esActual ? `${c}22` : "#040a12",
                            ["--lp-rango" as string]: c,
                          }}
                        >
                          {alcanzado && !esActual && i < indiceRango ? <Check size={14} strokeWidth={3} /> : r.rango}
                        </span>
                        <span className={`mt-1.5 font-mono text-[9.5px] tabular-nums ${alcanzado ? "text-[#b8e6ff]" : "text-[#3a5a72]"}`}>{r.desde}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="mt-4 text-center text-[12px] leading-relaxed text-[#5f7f96]">
                Quien llegue al <strong style={{ color: COLOR_RANGO.S }}>rango S</strong> entra al sorteo especial del cierre del evento.
              </p>
            </section>
          </div>
        )}

        {/* ═══════════ MISIONES ═══════════ */}
        {pestana === "misiones" && (
          <div className="wfp-entra flex flex-col gap-4">
            <section className="lp-ventana px-5 py-5" style={{ ["--lp-rango" as string]: color }}>
              <div className="flex items-end justify-between">
                <div>
                  <p className="ui-etq text-[#7dd8ff]">Misiones</p>
                  <p className="mt-1 text-[22px] font-black leading-tight text-white">
                    {hechas} <span className="text-[#5f7f96]">de {data.actividades.length}</span>
                  </p>
                </div>
                <p className="text-right font-mono text-[12px] font-bold" style={{ color }}>
                  +{expDisponible} EXP
                  <span className="block text-[10px] font-normal uppercase tracking-wider text-[#5f7f96]">por ganar</span>
                </p>
              </div>
              <div className="wfp-barra mt-3 h-2 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${data.actividades.length ? (hechas / data.actividades.length) * 100 : 0}%`, background: `linear-gradient(90deg, ${color}, #7dd8ff)` }}
                />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[#8fa8bd]">
                Ve a la estación de cada misión y complétala allí: el personal la marca y tu EXP sube al instante.
              </p>
            </section>

            {/* Filtros */}
            <div className="flex gap-2" role="tablist" aria-label="Filtrar misiones">
              {([
                ["pendientes", `Pendientes (${pendientes.length})`],
                ["completadas", `Hechas (${hechas})`],
                ["todas", "Todas"],
              ] as const).map(([id, txt]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={filtro === id}
                  onClick={() => setFiltro(id)}
                  className="wfp-chip"
                  data-activo={filtro === id ? "1" : "0"}
                  style={{ ["--lp-rango" as string]: color }}
                >
                  {txt}
                </button>
              ))}
            </div>

            {listaFiltrada.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center">
                <p className="text-sm text-[#8fa8bd]">
                  {data.actividades.length === 0
                    ? "Todavía no hay misiones publicadas. Vuelve pronto."
                    : filtro === "completadas" ? "Aún no completas ninguna. ¡La primera está cerca!" : "No te queda ninguna pendiente. ¡Bien hecho, cazador!"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {listaFiltrada.map((a: any, i: number) => (
                  <div key={a.id} className="contents">
                    <TarjetaMision a={a} color={color} onCompletar={modoDemo ? () => completarDemo(a.id) : undefined} />
                    {i === 2 && listaFiltrada.length > 3 && <CarruselPatrocinantes className="my-2" muestra={modoDemo} />}
                  </div>
                ))}
              </div>
            )}
            {listaFiltrada.length > 0 && listaFiltrada.length <= 3 && <CarruselPatrocinantes className="mt-2" muestra={modoDemo} />}
          </div>
        )}

        {/* ═══════════ PERFIL ═══════════ */}
        {pestana === "perfil" && (
          <div className="wfp-entra flex flex-col gap-4">
            {/* El boleto, como una credencial */}
            <section className="wfp-credencial relative overflow-hidden rounded-2xl p-5" style={{ ["--lp-rango" as string]: color }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="ui-etq text-[#7dd8ff]">Isekai World Fest · Cazador</p>
                  <p className="mt-2 truncate text-[20px] font-black text-white">{data.nombre || "Cazador"}</p>
                  <p className="text-[13px]" style={{ color }}>Rango {data.rango} · {NOMBRE_RANGO[data.rango]}</p>
                </div>
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 font-mono text-2xl font-black"
                  style={{ borderColor: color, color, boxShadow: `0 0 20px ${color}55` }}
                >
                  {data.rango}
                </span>
              </div>
              <div className="wfp-credencial-corte my-4" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="ui-etq text-[#5f7f96]">Código del boleto</p>
                  <p className="font-mono text-[17px] font-bold tracking-[0.12em] text-white" style={{ overflowWrap: "anywhere" }}>{data.codigo}</p>
                </div>
                <button
                  onClick={async () => { try { await navigator.clipboard.writeText(data.codigo); setCopiado(true); window.setTimeout(() => setCopiado(false), 1800); } catch { /* sin portapapeles */ } }}
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-4 text-xs font-bold text-white"
                >
                  {copiado ? <Check size={14} className="text-[#4ade80]" /> : <Copy size={14} />} {copiado ? "Copiado" : "Copiar"}
                </button>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { n: data.xpTotal.toLocaleString(), t: "EXP total" },
                { n: `${hechas}/${data.actividades.length}`, t: "Misiones hechas" },
                { n: data.rango, t: NOMBRE_RANGO[data.rango] ?? "Rango" },
                { n: String(data.historial.length), t: "Registros" },
              ].map(c => (
                <div key={c.t} className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5">
                  <p className="font-mono text-[20px] font-black text-white tabular-nums">{c.n}</p>
                  <p className="text-[11px] text-[#5f7f96]">{c.t}</p>
                </div>
              ))}
            </div>

            <section className="lp-ventana px-5 py-5" style={{ ["--lp-rango" as string]: color }}>
              <p className="mb-4 ui-etq text-[#7dd8ff]">Registro de actividad</p>
              {data.historial.length === 0 ? (
                <p className="py-4 text-center text-sm text-[#5f7f96]">Aquí aparecerá cada misión que completes.</p>
              ) : (
                <ol className="relative flex flex-col gap-4 border-l border-white/[0.08] pl-5">
                  {data.historial.map((h: any, i: number) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold leading-snug text-white">{h.actividad}</p>
                          <p className="mt-0.5 font-mono text-[10.5px] text-[#5f7f96]">
                            {new Date(h.fecha).toLocaleString("es-VE", { weekday: "short", hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#4ade80]/10 px-2.5 py-1 font-mono text-[11px] font-bold text-[#4ade80]">+{h.xp}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <Link
              href="/"
              className="mt-2 block py-3 text-center font-mono text-xs uppercase tracking-widest text-[#5f7f96] transition-colors hover:text-[#7dd8ff]"
            >
              Volver a Isekai World Fest
            </Link>
          </div>
        )}
      </main>

      {/* ── Navegación propia, estilo app ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-[#040a12]/95 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Secciones"
      >
        <div className="mx-auto flex max-w-2xl px-2">
          {([
            ["rango", "Mi rango", Swords],
            ["misiones", "Misiones", ScrollText],
            ["perfil", "Perfil", User],
          ] as const).map(([id, label, Icono]) => {
            const activo = pestana === id;
            return (
              <button
                key={id}
                onClick={() => irA(id)}
                aria-current={activo ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5"
                style={{ minHeight: 50, WebkitTapHighlightColor: "transparent" }}
              >
                <span
                  className="flex h-7 w-12 items-center justify-center rounded-full transition-colors"
                  style={{ background: activo ? `${color}22` : "transparent" }}
                >
                  <Icono size={18} style={{ color: activo ? color : "#3a5a72" }} />
                </span>
                <span className="text-[10.5px] font-semibold" style={{ color: activo ? "#e6f6ff" : "#3a5a72" }}>
                  {label}
                  {id === "misiones" && pendientes.length > 0 && (
                    <span className="ml-1 rounded-full px-1.5 py-px font-mono text-[9px] font-bold text-[#04080f]" style={{ background: color }}>{pendientes.length}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
