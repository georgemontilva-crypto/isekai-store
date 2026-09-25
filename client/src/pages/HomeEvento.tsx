import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";
import {
  Swords, Sparkles, Users, Store, Theater, Mic, Globe2, Gamepad2,
  Trophy, Lock, MapPin, Calendar, Star, ChevronLeft, ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/i18n/LangContext";
import { useSEO } from "@/hooks/useSEO";
import { useAntiSpam } from "@/hooks/useAntiSpam";
import AvisoPropiedadIntelectual from "@/components/AvisoPropiedadIntelectual";
import { useFiguraRecortada } from "@/hooks/useFiguraRecortada";
import ToqueParticulas from "@/components/fest/ToqueParticulas";
import ChispasEnergia from "@/components/fest/ChispasEnergia";
import { esGamaBaja } from "@/lib/gamaBaja";
import RaidJefe from "@/components/fest/RaidJefe";
import { ZonaSombras, RevelacionSombras } from "@/components/fest/SombrasSecretas";

/**
 * Isekai World Fest — landing del evento (portada del sitio).
 *
 * Presentada como la interfaz del Sistema:
 * portal detrás de la figura, ventana de notificación, cuenta regresiva,
 * gates en los carriles y la lista de acceso como una misión.
 *
 * El orden vende la experiencia antes que los datos prácticos: primero se
 * despierta la curiosidad, luego se explica la mecánica de rangos, y solo al
 * final aparecen fecha y lugar.
 *
 * Casi todo se cuenta como expectativa. Lo que no se revela sostiene el
 * interés y permite ir anunciando por partes.
 */

/**
 * Estas listas solo guardan lo visual —icono y color—. Los títulos y textos
 * viven en los archivos de idioma y se emparejan por posición, de modo que
 * al añadir una entrada hay que añadirla también en español e inglés.
 */
const MUNDO_ESTILO = [
  { icono: Swords, color: "#a78bfa" },
  { icono: Star, color: "#fbbf24" },
  { icono: Sparkles, color: "#38bdf8" },
  { icono: Lock, color: "#f43f5e" },
  { icono: Trophy, color: "#e5007d" },
];

const AREAS_ESTILO = [
  { icono: Star, color: "#f43f5e" },
  { icono: Gamepad2, color: "#5db4ff" },
  { icono: Users, color: "#e5007d" },
  { icono: Sparkles, color: "#a78bfa" },
  { icono: Store, color: "#fbbf24" },
  { icono: Theater, color: "#f43f5e" },
  { icono: Mic, color: "#4ade80" },
  { icono: Globe2, color: "#7dd8ff" },
];

/** Letra y color de cada rango; su nombre y descripción van en el idioma */
const RANGOS_ESTILO = [
  { r: "E", color: "#8a8a9c" },
  { r: "D", color: "#4ade80" },
  { r: "C", color: "#38bdf8" },
  { r: "B", color: "#a78bfa" },
  { r: "A", color: "#fbbf24" },
  { r: "S", color: "#f43f5e" },
];

/**
 * Flechas de un carril. Solo en escritorio: en teléfono se desliza con el
 * dedo y unos botones ahí estorbarían.
 */
function FlechasCarril({ id, anterior, siguiente }: { id: string; anterior: string; siguiente: string }) {
  const mover = (dir: number) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <>
      <button
        onClick={() => mover(-1)}
        aria-label={anterior}
        className="absolute -left-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0d0620]/90 text-white/70 shadow-xl backdrop-blur transition-colors hover:border-[#a78bfa]/60 hover:text-white lg:flex"
      >
        <ChevronLeft size={19} />
      </button>
      <button
        onClick={() => mover(1)}
        aria-label={siguiente}
        className="absolute -right-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0d0620]/90 text-white/70 shadow-xl backdrop-blur transition-colors hover:border-[#a78bfa]/60 hover:text-white lg:flex"
      >
        <ChevronRight size={19} />
      </button>
    </>
  );
}


/** Fecha de apertura del Fest (hora de Venezuela, UTC−4) */
const APERTURA = new Date("2027-08-14T00:00:00-04:00").getTime();

/**
 * Texto que se escribe letra por letra, como una notificación del Sistema.
 * El lector de pantalla recibe el texto completo desde el principio, y con
 * «reducir movimiento» aparece entero de una vez.
 */
function Escritura({ texto }: { texto: string }) {
  const reducir = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (reducir) { setN(texto.length); return; }
    setN(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= texto.length) window.clearInterval(id);
    }, 22);
    return () => window.clearInterval(id);
  }, [texto, reducir]);

  return (
    <>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">
        {texto.slice(0, n)}
        {n < texto.length && <span className="ev2-cursor">▌</span>}
      </span>
    </>
  );
}

/** Cuenta regresiva a la apertura en cajas biseladas tipo HUD */
function CuentaRegresiva({ etiquetas }: { etiquetas: [string, string, string, string] }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const s = Math.max(0, Math.floor((APERTURA - ahora) / 1000));
  const valores = [
    String(Math.floor(s / 86400)).padStart(3, "0"),
    String(Math.floor((s % 86400) / 3600)).padStart(2, "0"),
    String(Math.floor((s % 3600) / 60)).padStart(2, "0"),
    String(s % 60).padStart(2, "0"),
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:max-w-md">
      {valores.map((v, i) => (
        <div
          key={i}
          className={`ev-notch ev2-hud py-2.5 text-center ${i === 3 ? "ev2-hud-rosa" : ""}`}
          style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
        >
          <div className={`ev-display text-xl tabular-nums sm:text-2xl ${i === 3 ? "text-[#ff5fb1]" : "text-white"}`}>{v}</div>
          <div className={`font-mono text-[10px] uppercase tracking-[0.2em] ${i === 3 ? "text-[#ff5fb1]" : "text-[#a78bfa]"}`}>
            {etiquetas[i]}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Número de sección tipo HUD: se siente que avanzas por niveles */
function NumSeccion({ n, total = 9 }: { n: number; total?: number }) {
  return (
    <span className="font-mono text-[10px] tracking-[0.25em] text-[#7c6fa0]">
      {String(n).padStart(2, "0")} / {String(total).padStart(2, "0")}
    </span>
  );
}

/** Franja inclinada que se desliza con los nombres de las áreas */
function Franja({ items }: { items: string[] }) {
  const linea = items.map(x => x.toUpperCase()).join("  ◆  ") + "  ◆  ";
  return (
    <div className="overflow-hidden py-4" aria-hidden="true">
      <div className="ev2-franja -mx-8 bg-[#e5007d] py-2.5">
        <div className="ev2-franja-pista font-mono text-xs font-bold tracking-[0.18em] text-white sm:text-sm">
          <span className="whitespace-pre">{linea}</span>
          <span className="whitespace-pre">{linea}</span>
        </div>
      </div>
    </div>
  );
}

/** La luz de la tarjeta sigue al dedo o al mouse */
function moverLuz(ev: RPointerEvent<HTMLDivElement>) {
  const r = ev.currentTarget.getBoundingClientRect();
  ev.currentTarget.style.setProperty("--gx", `${ev.clientX - r.left}px`);
  ev.currentTarget.style.setProperty("--gy", `${ev.clientY - r.top}px`);
}

/**
 * Invitado con su silueta completa (sin cortar la cabeza) y efectos de luz:
 * contraluz que late, rayos que giran, borde de luz alrededor de la figura,
 * niebla en el suelo y partículas que suben. Al pasar el mouse o tocar, la
 * figura crece un poco y la luz se intensifica.
 */
function InvitadoFigura({ foto, nombre }: { foto: string; nombre: string }) {
  // Recorta el borde transparente del PNG: la figura ocupa todo el alto
  const figura = useFiguraRecortada(foto);
  return (
    <div className="ev2-invitado group relative h-full overflow-hidden">
      <span className="ev2-invitado-rayos" aria-hidden="true" />
      <span className="ev2-invitado-contraluz" aria-hidden="true" />
      {Array.from({ length: 7 }, (_, i) => (
        <span
          key={i}
          className="ev2-invitado-particula"
          style={{ left: `${12 + ((i * 29) % 76)}%`, animationDelay: `${(i * 0.7) % 4}s`, animationDuration: `${4 + (i % 3)}s` }}
          aria-hidden="true"
        />
      ))}
      {figura.estado !== "cargando" && (
        <img
          src={figura.src}
          alt={nombre}
          className="ev2-invitado-img absolute inset-x-0 bottom-0 top-[6%] h-[94%] w-full object-contain object-bottom"
        />
      )}
      <span className="ev2-invitado-suelo" aria-hidden="true" />
    </div>
  );
}

/** Silueta genérica para invitados aún sin revelar */
function Silueta() {
  return (
    <svg viewBox="0 0 100 120" className="absolute bottom-0 left-1/2 w-[70%] -translate-x-1/2" aria-hidden="true">
      <path
        d="M50 16c11 0 18 8 18 19s-7 19-18 19-18-8-18-19 7-19 18-19zM14 120c0-32 16-54 36-54s36 22 36 54z"
        fill="#1c1233"
        stroke="rgba(167,139,250,0.35)"
        strokeWidth="1"
      />
    </svg>
  );
}

export default function HomeEvento() {
  const { t, lang } = useLang();
  const e = t.evento;

  const TRANSFORMACION = MUNDO_ESTILO.map((x, i) => ({ ...x, ...e.mundoItems[i] }));
  const AREAS = AREAS_ESTILO.map((x, i) => ({ ...x, ...e.areasItems[i] }));
  const RANGOS = RANGOS_ESTILO.map((x, i) => ({ ...x, ...e.rangosItems[i] }));
  const { data: settings } = trpc.settings.getAll.useQuery();
  const heroBg = settings?.["wf_hero_bg"] ?? settings?.["worldfest_hero_image"] ?? "";
  /** Video de fondo opcional: queda como textura, apenas perceptible */
  /**
   * Gama baja: se marca <html> para aligerar los efectos, y el video de
   * fondo del hero no se carga (la imagen de fondo queda en su lugar).
   */
  const [ligero] = useState(esGamaBaja);
  useEffect(() => {
    document.documentElement.classList.toggle("iw-ligero", ligero);
    return () => document.documentElement.classList.remove("iw-ligero");
  }, [ligero]);
  const heroVideo = ligero ? "" : (settings?.["wf_hero_video"] ?? "");
  /** Figura recortada de la derecha del hero (PNG sin fondo) */
  const heroFigura = settings?.["wf_hero_figura"] ?? "";
  const figura = useFiguraRecortada(heroFigura);
  const premioImg = settings?.["wf_premio_image"] ?? "";
  /** Fondo de la sección «El mundo ha cambiado» */
  const mundoBg = settings?.["wf_mundo_bg"] ?? "";
  /** Fondo de la lista de acceso: video si lo hay, si no la imagen */
  const listaVideo = settings?.["wf_lista_video"] ?? "";
  const listaImg = settings?.["wf_lista_image"] ?? "";
  /** Raid: imagen del jefe y recompensa opcional (se escribe desde la base) */
  const raidJefe = settings?.["wf_raid_jefe"] ?? "";
  const raidRecompensa = (lang === "en" ? settings?.["wf_raid_recompensa_en"] : settings?.["wf_raid_recompensa"]) ?? "";
  const raidRecompensaImg = settings?.["wf_raid_recompensa_img"] ?? "";
  /** Si la comunidad ya derrotó al jefe, la pieza deja de estar clasificada */
  const { data: estadoRaid } = trpc.raid.estado.useQuery(undefined, { refetchInterval: 120_000 });
  const piezaRevelada = !!(estadoRaid?.activo && estadoRaid.derrotado && raidRecompensaImg);
  const [sombras, setSombras] = useState(false);
  const cerrarSombras = useCallback(() => setSombras(false), []);

  const [email, setEmail] = useState("");
  const [suscrito, setSuscrito] = useState(false);
  const antiSpam = useAntiSpam();
  const suscribir = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => { setSuscrito(true); setEmail(""); },
  });

  useSEO({
    title: lang === "en"
      ? "Isekai World Fest 2027 — The System has awakened"
      : "Isekai World Fest 2027 — El Sistema ha despertado",
    description: lang === "en"
      ? "August 14–15, 2027 in Maracaibo, Venezuela. Two days where anime, video games and cosplay come to life."
      : "14 y 15 de agosto de 2027 en Maracaibo, Venezuela. Dos días donde el anime, los videojuegos y el cosplay cobran vida.",
    url: "https://isekaiworld.co/",
  });

  /**
   * Simulación de rango.
   *
   * Deja que el visitante se dé experiencia y vea el ascenso con la misma
   * animación del evento. Vive solo en el navegador: no toca la base de datos
   * ni requiere cuenta.
   */
  const [xpDemo, setXpDemo] = useState(0);
  const [ascensoDemo, setAscensoDemo] = useState<string | null>(null);

  const UMBRALES = [0, 60, 140, 240, 360, 500];
  const rangoDe = (xp: number) => {
    let i = 0;
    UMBRALES.forEach((u, k) => { if (xp >= u) i = k; });
    return RANGOS[i];
  };

  const rangoActualDemo = rangoDe(xpDemo);
  const rangoDemo = rangoActualDemo.r;
  const colorDemo = rangoActualDemo.color;

  const siguienteDemo = (() => {
    const i = UMBRALES.findIndex(u => xpDemo < u);
    if (i === -1) return null;
    const previo = UMBRALES[i - 1] ?? 0;
    return {
      rango: RANGOS[i].r,
      faltan: UMBRALES[i] - xpDemo,
      progreso: Math.round(((xpDemo - previo) / (UMBRALES[i] - previo)) * 100),
    };
  })();

  const progresoDemo = siguienteDemo?.progreso ?? 100;

  const sumarXp = (n: number) => {
    const antes = rangoDe(xpDemo).r;
    const nuevo = Math.min(500, xpDemo + n);
    setXpDemo(nuevo);
    const despues = rangoDe(nuevo).r;
    if (despues !== antes) {
      setAscensoDemo(despues);
      try { navigator.vibrate?.([40, 60, 120]); } catch { /* no soportado */ }
    }
  };

  /** Parallax de la figura (solo tiene efecto con mouse) */
  const heroRef = useRef<HTMLElement>(null);
  const moverFigura = (ev: RPointerEvent<HTMLElement>) => {
    if (ev.pointerType !== "mouse" || !heroRef.current) return;
    const r = heroRef.current.getBoundingClientRect();
    heroRef.current.style.setProperty("--ev2-px", String((ev.clientX - r.left) / r.width - 0.5));
    heroRef.current.style.setProperty("--ev2-py", String((ev.clientY - r.top) / r.height - 0.5));
  };

  /** Línea de energía de la escalera de rangos: se llena al bajar */
  const escaleraRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: avanceEscalera } = useScroll({
    target: escaleraRef,
    offset: ["start 80%", "end 55%"],
  });
  const energia = useSpring(avanceEscalera, { stiffness: 120, damping: 30 });

  const irALista = () =>
    document.getElementById("lista-acceso")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen overflow-x-clip bg-[#06040d] text-white">

      {/* El entorno se tiñe del color del rango actual: un golpe fuerte al
          ascender y después un tinte suave que permanece. */}
      <ToqueParticulas />
      {sombras && (
        <RevelacionSombras
          onCerrar={cerrarSombras}
          textos={{
            titulo: e.v2.sombrasTitulo,
            texto: e.v2.sombrasTexto,
            secreto: e.v2.sombrasSecreto,
            cerrar: e.v2.sombrasCerrar,
          }}
        />
      )}

      <div
        className={`lp-ambiente ${ascensoDemo ? "lp-ambiente-sube" : ""}`}
        style={{ ["--lp-rango" as string]: colorDemo }}
      />
      {ascensoDemo && (
        <div className="lp-marco-sube" style={{ ["--lp-rango" as string]: colorDemo }} />
      )}

      {/* ── Anuncio de ascenso de la simulación ──
          La misma secuencia que verán en el evento: la ventana se materializa,
          el sello gira y late, y las partículas suben. */}
      {ascensoDemo && (
        <div
          className="lp-overlay fixed inset-0 z-[200] flex items-center justify-center bg-black/88 px-6"
          onClick={() => setAscensoDemo(null)}
        >
          <span
            className="lp-fogonazo"
            style={{
              background: `radial-gradient(circle at 50% 45%, ${rangoDe(xpDemo).color}, transparent 65%)`,
            }}
          />

          <div
            className="lp-ventana lp-anuncio lp-anuncio-color relative w-full max-w-sm overflow-hidden p-8 text-center"
            onClick={e => e.stopPropagation()}
            style={{
              // El cuadro entero toma el color del rango nuevo
              ["--lp-rango" as string]: rangoDe(xpDemo).color,
              ["--lp-glow" as string]: `${rangoDe(xpDemo).color}66`,
              ["--lp-glow-soft" as string]: `${rangoDe(xpDemo).color}22`,
            }}
          >
            <span className="lp-brillo" />
            <span className="lp-escaneo" />

            {Array.from({ length: ascensoDemo === "S" ? 18 : 10 }, (_, i) => (
              <span
                key={i}
                className="lp-particula"
                style={{
                  color: rangoDe(xpDemo).color,
                  left: `${6 + (i * 88) / (ascensoDemo === "S" ? 18 : 10)}%`,
                  animationDelay: `${0.4 + i * 0.13}s`,
                  animationDuration: `${(ascensoDemo === "S" ? 1.9 : 2.4) + (i % 3) * 0.35}s`,
                }}
              />
            ))}

            <p className="lp-linea-1 mb-2 font-mono text-[11px] uppercase tracking-[0.4em] text-[#7dd8ff]">
              {e.aviso.notificacion}
            </p>
            <p className="lp-linea-2 mb-7 text-sm text-[#b8e6ff]">{e.aviso.subiste}</p>

            <div
              className={`lp-sello relative mx-auto mb-7 flex items-center justify-center rounded-full border-2 ${
                ascensoDemo === "S" ? "h-36 w-36" : "h-28 w-28"
              }`}
              style={{ borderColor: rangoDe(xpDemo).color, color: rangoDe(xpDemo).color }}
            >
              <span className="lp-anillo lp-anillo-1" />
              <span className="lp-anillo lp-anillo-2" />
              {ascensoDemo === "S" && <span className="lp-aura" />}

              <span
                className="lp-glitch font-mono text-6xl font-black"
                style={{ color: rangoDe(xpDemo).color }}
              >
                <span className="lp-glitch-capa lp-glitch-cian font-mono text-6xl font-black" aria-hidden="true">
                  {ascensoDemo}
                </span>
                <span className="lp-glitch-capa lp-glitch-magenta font-mono text-6xl font-black" aria-hidden="true">
                  {ascensoDemo}
                </span>
                {ascensoDemo}
              </span>
            </div>

            <p className="lp-linea-3 text-base font-black leading-tight text-white sm:text-lg">
              {e.aviso.rango} {ascensoDemo} · {rangoDe(xpDemo).nombre.toUpperCase()}
            </p>

            {ascensoDemo === "S" && (
              <div className="lp-linea-4 mt-4 rounded-lg border border-[#f43f5e]/40 bg-[#f43f5e]/10 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#f43f5e]">
                  {e.aviso.rangoMax}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#ffd0d8]">
                  {e.aviso.sorteo}
                </p>
              </div>
            )}

            <button
              onClick={() => setAscensoDemo(null)}
              className="lp-linea-4 mt-7 w-full rounded-lg border border-[#38bdf8]/50 bg-[#38bdf8]/10 font-mono text-sm font-bold uppercase tracking-widest text-[#7dd8ff] transition-colors hover:bg-[#38bdf8]/20"
              style={{ minHeight: 48 }}
            >
              {e.aviso.aceptar}
            </button>
          </div>
        </div>
      )}

      {/* ═══ 1. EL SISTEMA HA DESPERTADO ═══
          Teléfono: la figura arriba dentro del portal y el texto montado
          sobre su base. Escritorio: texto a la izquierda, figura y portal a
          la derecha, con un leve movimiento que sigue al mouse. */}
      <section
        ref={heroRef}
        onPointerMove={moverFigura}
        className="relative overflow-hidden lg:flex lg:min-h-[680px] lg:items-center"
      >
        {heroBg && (
          <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {heroVideo && (
          <video
            src={heroVideo}
            autoPlay
            muted
            loop
            playsInline
            poster={heroBg || undefined}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: 0.45 }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#06040d]/75 via-[#0d0620]/70 to-[#06040d]" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-[#06040d] via-[#06040d]/40 to-transparent lg:block" />
        <div className="ev-grid absolute inset-0 opacity-70" />
        <div className="ev-halo absolute -left-40 top-1/4 h-[520px] w-[520px]" />

        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="iw-particula-sistema"
            style={{
              left: `${5 + i * 7}%`,
              animationDelay: `${i * 0.55}s`,
              animationDuration: `${5 + (i % 4)}s`,
            }}
          />
        ))}

        <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 lg:grid-cols-[54fr_46fr] lg:gap-4 lg:px-10">
          {/* Figura + portal. Va primero en el DOM para quedar arriba en
              teléfono; en escritorio pasa a la segunda columna. */}
          <div className="relative h-[52svh] min-h-[320px] max-h-[520px] lg:order-2 lg:h-auto lg:max-h-none lg:min-h-[680px] lg:self-stretch">
            <div className="ev2-portal left-1/2 top-[46%] w-[82vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 lg:w-[88%] lg:max-w-[560px]">
              <span className="ev2-portal-anillo" />
              <span className="ev2-portal-anillo ev2-portal-anillo-2" />
              <span className="ev2-portal-anillo ev2-portal-anillo-3" />
              <span className="ev2-portal-nucleo" />
            </div>

            {heroFigura && figura.estado !== "cargando" && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9 }}
                className="ev2-parallax pointer-events-none absolute inset-x-0 bottom-0 top-4 lg:top-8"
              >
                <img
                  src={figura.src}
                  alt=""
                  className={`iw-hero-figura h-full w-full object-bottom ${
                    figura.estado === "recortada" ? "object-contain" : "object-cover"
                  }`}
                />
              </motion.div>
            )}

            {/* Zona de Sombras: mantener presionada la figura 3 segundos */}
            {heroFigura && <ZonaSombras onRevelar={() => setSombras(true)} />}

            {/* La base de la figura se funde con el texto que sube encima */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#06040d] to-transparent lg:h-24" />

            <p className="absolute left-5 top-4 font-mono text-[11px] tracking-[0.2em] text-[#7dd8ff] lg:hidden">
              {e.v2.hudSistema} <span className="ev2-cursor">_</span>
            </p>
            <p className="absolute right-5 top-4 lg:hidden"><NumSeccion n={1} /></p>
          </div>

          {/* Texto */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 -mt-16 min-w-0 px-5 pb-14 sm:px-6 lg:order-1 lg:mt-0 lg:self-center lg:px-0 lg:py-14"
          >
            <div className="mb-4 flex items-center gap-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.4em] text-[#a78bfa]">
                {e.etiquetaAnio}
              </p>
              <span className="hidden lg:inline"><NumSeccion n={1} /></span>
            </div>

            <h1 className="ev-display mb-6 text-[40px] leading-[0.95] [hyphens:none] [overflow-wrap:normal] sm:text-6xl lg:text-[56px] xl:text-[64px]">
              <span className="text-[#e5007d]">{e.heroTitulo1}</span>
              <br />
              <span className="iw-texto-sistema">{e.heroTitulo2}</span>
            </h1>

            {/* Ventana del Sistema con el texto del hero */}
            <div className="ev-notch ev2-ventana mb-6 max-w-xl p-4 sm:p-5">
              <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#7dd8ff]">
                {e.v2.sistemaAlerta}
              </p>
              <p className="min-h-[7.5em] text-[15px] leading-relaxed text-[#dbeafe] sm:min-h-[5.2em] sm:text-base">
                <Escritura texto={e.heroTexto} />
              </p>
            </div>

            <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm text-[#d8d0ea]">
              <span className="flex items-center gap-2">
                <Calendar size={15} className="text-[#a78bfa]" /> {e.heroFecha}
              </span>
              <span className="flex items-center gap-2">
                <MapPin size={15} className="text-[#a78bfa]" /> {e.heroLugar}
              </span>
            </div>

            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#7c6fa0]">
              {e.v2.cuentaEtiqueta}
            </p>
            <div className="mb-7">
              <CuentaRegresiva etiquetas={[e.v2.dias, e.v2.horas, e.v2.minutos, e.v2.segundos]} />
            </div>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                onClick={irALista}
                className="ev-notch ev-press ev2-latido bg-[#e5007d] px-8 py-4 text-sm font-bold uppercase tracking-wider text-white"
              >
                {e.ctaAviso}
              </button>
              <a
                href="#el-mundo"
                className="ev-press ev2-corchetes px-8 py-4 text-center text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
              >
                {e.ctaDescubrir}
              </a>
            </div>

            <p className="font-mono text-xs text-[#7c6fa0]">
              {e.tuRango}{" "}
              <span className="text-[#a78bfa]">E → D → C → B → A → S</span>
            </p>
          </motion.div>
        </div>
      </section>

      <Franja items={AREAS.map(a => a.titulo)} />

      {/* ═══ 2. BIENVENIDO AL ISEKAI ═══ */}
      <section className="ev2-diferida mx-auto max-w-4xl px-6 py-20 text-left sm:text-center lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-6"><NumSeccion n={2} /></p>
          <h2 className="ev-display mb-8 text-[26px] leading-[1.08] sm:text-5xl">
            {e.bienvenidaT1}
            <br />
            <span className="text-[#a78bfa]">{e.bienvenidaT2}</span>
          </h2>

          <p className="mx-auto mb-5 max-w-3xl text-[15px] leading-relaxed text-[#b9b0d4] sm:text-base">
            {e.bienvenidaP1}
          </p>
          <p className="mx-auto mb-10 max-w-3xl text-[15px] leading-relaxed text-[#b9b0d4] sm:text-base">
            {e.bienvenidaP2}
          </p>

          <p className="text-xl font-black text-white sm:text-2xl">
            {e.bienvenidaFrase1}{" "}
            <span className="text-[#e5007d]">{e.bienvenidaFrase2}</span>
          </p>
        </motion.div>
      </section>

      <div className="ev-linea" />

      {/* ═══ 3. EL MUNDO HA CAMBIADO ═══ */}
      <section id="el-mundo" className="ev2-diferida ev-grid relative overflow-hidden border-y border-white/[0.06] bg-white/[0.015] px-6 py-20 lg:px-16 lg:py-24">
        {/* Fondo opcional. Va bajo un velo oscuro y se apaga hacia los bordes
            de arriba y abajo, para que las tarjetas se lean y la sección
            se funda con las de alrededor en vez de cortar de golpe. */}
        {mundoBg && (
          <>
            <img
              src={mundoBg}
              alt=""
              loading="lazy"
              decoding="async"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-[#06040d]/78" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#06040d] via-transparent to-[#06040d]" />
          </>
        )}

        <div className="relative mx-auto max-w-6xl">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            <NumSeccion n={3} />&nbsp;&nbsp;{e.mundoEtiqueta}
          </p>
          <h2 className="ev-display mb-12 text-[26px] leading-[1.05] sm:text-5xl">{e.mundoTitulo}</h2>

          {/* Carril horizontal: con tarjetas más grandes se lee mejor cada
              bloque que apretándolos en una rejilla. En escritorio se pasa con
              flechas; en teléfono, deslizando. */}
          <div className="relative">
            <FlechasCarril anterior={e.v2.anterior} siguiente={e.v2.siguiente} id="carril-mundo" />
            <div id="carril-mundo" className="iw-areas-carril flex gap-5 overflow-x-auto pb-3">
            {TRANSFORMACION.map((x, i) => {
              const Icono = x.icono;
              return (
                <div
                  key={x.titulo}
                  onPointerMove={moverLuz}
                  className="ev-notch ev2-gate iw-card-grande border p-8 sm:p-10"
                  style={{
                    ["--gc" as string]: x.color,
                    borderColor: `${x.color}40`,
                    background: `linear-gradient(150deg, ${x.color}0d, rgba(6,4,13,0.7))`,
                  }}
                >
                  <p className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: x.color }}>
                    {e.v2.gate} {String(i + 1).padStart(2, "0")}
                  </p>
                  <div
                    className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl"
                    style={{ background: `${x.color}1f`, border: `1px solid ${x.color}44` }}
                  >
                    <Icono size={26} style={{ color: x.color }} />
                  </div>
                  <h3 className="ev-card-title mb-3 uppercase text-white">
                    {x.titulo}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#a99fc4]">{x.texto}</p>
                </div>
              );
            })}
            </div>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#7c6fa0] lg:hidden">
              {e.v2.desliza} →
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 4. EXPLORA EL FEST ═══ */}
      <section className="ev2-diferida px-6 py-20 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            <NumSeccion n={4} />&nbsp;&nbsp;{e.exploraEtiqueta}
          </p>
          <h2 className="ev-display mb-3 text-[26px] leading-[1.05] sm:text-5xl">{e.exploraTitulo}</h2>
          <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-[#a99fc4]">
            {e.exploraTexto}
          </p>

          {/* En teléfono se desliza: con siete áreas, apilarlas sería eterno */}
          <div className="relative">
            <FlechasCarril anterior={e.v2.anterior} siguiente={e.v2.siguiente} id="carril-areas" />
            <div id="carril-areas" className="iw-areas-carril flex gap-5 overflow-x-auto pb-3">
            {AREAS.map((a, i) => {
              const Icono = a.icono;
              return (
                <div
                  key={a.titulo}
                  onPointerMove={moverLuz}
                  className="ev-notch ev2-gate iw-card-grande relative overflow-hidden border p-8 sm:p-10"
                  style={{
                    ["--gc" as string]: a.color,
                    borderColor: `${a.color}40`,
                    background: `linear-gradient(160deg, ${a.color}0f, rgba(6,4,13,0.8))`,
                  }}
                >
                  <p className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: a.color }}>
                    {e.v2.gate} {String(i + 1).padStart(2, "0")}
                  </p>
                  <Icono size={30} style={{ color: a.color }} className="mb-6" />
                  <h3 className="ev-card-title mb-3 uppercase text-white">
                    {a.titulo}
                  </h3>
                  <p className="mb-6 text-[15px] leading-relaxed text-[#a99fc4]">{a.texto}</p>
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.25em]"
                    style={{ color: `${a.color}aa` }}
                  >
                    {e.proximamente}
                  </p>
                </div>
              );
            })}
            </div>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#7c6fa0] lg:hidden">
              {e.v2.desliza} →
            </p>
          </div>

        </div>
      </section>

      {/* ═══ 5. INVITADOS ═══ */}
      <section className="ev2-diferida px-6 pb-20 lg:px-16 lg:pb-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            <NumSeccion n={5} />&nbsp;&nbsp;{e.invitadosEtiqueta}
          </p>
          <h2 className="ev-display mb-4 text-[26px] leading-[1.05] sm:text-5xl">{e.invitadosTitulo}</h2>
          <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-[#a99fc4]">
            {e.invitadosTexto}
          </p>

          <div className="relative">
            <FlechasCarril anterior={e.v2.anterior} siguiente={e.v2.siguiente} id="carril-invitados" />
            <div id="carril-invitados" className="iw-areas-carril flex gap-5 overflow-x-auto pb-3">
            {[1, 2, 3].map(n => {
              const nombre = settings?.[`wf_invitado_${n}_nombre`];
              const foto = settings?.[`wf_invitado_${n}_foto`];
              return (
                <div key={n} className="ev-notch iw-card-grande overflow-hidden border border-white/[0.07] bg-[#0d0620]">
                  <div className="relative" style={{ aspectRatio: "4/5" }}>
                    {foto ? (
                      <InvitadoFigura foto={foto} nombre={nombre ?? ""} />
                    ) : (
                      <div className="ev2-escaner relative h-full overflow-hidden">
                        <Silueta />
                        <span className="ev-display absolute inset-x-0 top-[30%] text-center text-5xl text-[#a78bfa]">?</span>
                        <span className="absolute inset-x-0 bottom-3 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#f43f5e]">
                          {e.clasificado}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#7c6fa0]">
                      {e.invitadoNum} #{String(n).padStart(2, "0")}
                    </p>
                    <p className="mt-1.5 font-black text-white">{nombre || e.porAnunciar}</p>
                  </div>
                </div>
              );
            })}
            </div>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#7c6fa0] lg:hidden">
              {e.v2.desliza} →
            </p>
          </div>

          <p className="mt-8 text-center font-mono text-sm leading-relaxed text-[#7c6fa0]">
            {e.nombresOcultos1}
            <br />
            <span className="text-[#a78bfa]">{e.nombresOcultos2}</span>
          </p>
        </div>
      </section>

      <div className="ev-linea" />

      <div className="ev-linea" />

      {/* ═══ 6. LA MECÁNICA Y LOS RANGOS ═══ */}
      <section className="ev2-diferida ev-grid relative border-y border-[#a78bfa]/20 bg-gradient-to-b from-[#0d0620] to-[#06040d] px-6 py-20 lg:px-16 lg:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            <NumSeccion n={6} />&nbsp;&nbsp;{e.sistemaEtiqueta}
          </p>
          <h2 className="mb-6 text-center text-3xl font-black sm:text-5xl">
            {e.sistemaTitulo}
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-[15px] leading-relaxed text-[#b9b0d4]">
            {e.sistemaTexto}
          </p>

          {/* ── Simulación ──
              Pruébalo aquí mismo: es más convincente ver el ascenso que leer
              una explicación. Todo ocurre en el navegador, no se guarda nada. */}
          <div className="mx-auto mb-16 max-w-lg">
            <div
              className="lp-ventana p-7 sm:p-9"
              style={{ ["--lp-rango" as string]: colorDemo }}
            >
              <p className="mb-6 text-center font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: colorDemo }}>
                {e.pruebalo}
              </p>

              <div className="mb-7 flex flex-col items-center">
                <div
                  className="mb-4 flex h-28 w-28 items-center justify-center rounded-full border-2 transition-all duration-500"
                  style={{
                    borderColor: colorDemo,
                    boxShadow: `0 0 30px ${colorDemo}55, inset 0 0 22px ${colorDemo}22`,
                  }}
                >
                  <span
                    className="font-mono text-5xl font-black transition-colors duration-500"
                    style={{ color: colorDemo }}
                  >
                    {rangoDemo}
                  </span>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#7dd8ff]">
                  {e.tuRangoActual}
                </p>
              </div>

              <div className="mb-2 flex items-end justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: colorDemo }}>
                  {e.experiencia}
                </span>
                <span className="font-mono text-sm font-bold text-white">{xpDemo} EXP</span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-[#0d1c2b]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progresoDemo}%`,
                    background: `linear-gradient(90deg, ${colorDemo}, #7dd8ff)`,
                    boxShadow: `0 0 14px ${colorDemo}88`,
                  }}
                />
              </div>

              <p className="mb-7 mt-3 text-center text-sm text-[#8fa8bd]">
                {siguienteDemo
                  ? e.faltanPara.replace("{n}", String(siguienteDemo.faltan)).replace("{r}", siguienteDemo.rango)
                  : e.rangoMaximo}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => sumarXp(80)}
                  disabled={xpDemo >= 500}
                  className="ev-notch ev-press flex-1 border font-mono text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-30"
                  style={{
                    minHeight: 48,
                    borderColor: `${colorDemo}80`,
                    background: `${colorDemo}1a`,
                    color: colorDemo,
                  }}
                >
                  +80 EXP
                </button>
                <button
                  onClick={() => { setXpDemo(0); setAscensoDemo(null); }}
                  className="rounded-lg border border-white/15 px-5 font-mono text-xs font-bold uppercase tracking-widest text-[#5f7f96]"
                  style={{ minHeight: 48 }}
                >
                  {e.reiniciar}
                </button>
              </div>

              <p className="mt-5 text-center text-[11px] leading-relaxed text-[#5f7f96]">
                {e.notaSimulacion}
              </p>
            </div>
          </div>

          {/* Detalle de cada rango */}
          <div ref={escaleraRef} className="relative flex flex-col gap-2.5 pl-7 sm:pl-9">
            <span className="absolute bottom-3 left-2 top-3 w-[2px] bg-white/10 sm:left-3" aria-hidden="true" />
            <motion.span
              aria-hidden="true"
              className="absolute bottom-3 left-2 top-3 w-[2px] origin-top sm:left-3"
              style={{
                scaleY: energia,
                background: "linear-gradient(#8a8a9c, #4ade80, #38bdf8, #a78bfa, #fbbf24, #f43f5e)",
                boxShadow: "0 0 10px rgba(167,139,250,0.6)",
              }}
            />
            <ChispasEnergia progreso={energia} />
            {RANGOS.map((x, i) => (
              <motion.div
                key={x.r}
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="relative flex items-center"
              >
                {/* Punto sobre la línea de energía: fuera de la fila para que
                    el biselado no lo recorte */}
                <span
                  aria-hidden="true"
                  className="absolute -left-[24px] h-2.5 w-2.5 rounded-full sm:-left-[28px]"
                  style={{ background: x.color, boxShadow: `0 0 10px ${x.color}` }}
                />
                <div
                  className="ev-notch flex w-full items-center gap-4 border p-4 sm:gap-6 sm:p-5"
                  style={{
                    borderColor: `${x.color}2e`,
                    background: `linear-gradient(90deg, ${x.color}0f, transparent 60%)`,
                  }}
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border font-mono text-lg font-black"
                    style={{ borderColor: `${x.color}66`, color: x.color }}
                  >
                    {x.r}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black uppercase tracking-wide" style={{ color: x.color }}>
                      {x.nombre}
                    </p>
                    <p className="mt-0.5 text-sm text-[#a99fc4]">{x.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="mt-14 text-center text-2xl font-black sm:text-4xl">
            {e.serasCapaz1} <span className="text-[#f43f5e]">{e.serasCapaz2}</span>?
          </p>
        </div>
      </section>

      <div className="ev-linea" />

      {/* ═══ 7. RAID COMUNITARIO ═══ */}
      <RaidJefe
        t={e.v2}
        imagen={raidJefe}
        recompensa={raidRecompensa}
        recompensaImg={raidRecompensaImg}
        numero={<NumSeccion n={7} />}
      />

      {/* ═══ 8. EL PREMIO ═══ */}
      <section className="ev2-diferida px-6 py-20 lg:px-16 lg:py-24">
        <div className="ev-notch mx-auto max-w-5xl overflow-hidden border border-[#f43f5e]/25 bg-gradient-to-br from-[#1a0a14] to-[#06040d]">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <Trophy size={30} className="mb-6 text-[#f43f5e]" />
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#f43f5e]">
                <NumSeccion n={8} />&nbsp;&nbsp;{e.premioEtiqueta}
              </p>
              <h2 className="mb-5 text-2xl font-black leading-tight sm:text-4xl">
                {e.premioTitulo1}
                <br />
                {e.premioTitulo2}
              </h2>
              <p className="mb-7 text-[15px] leading-relaxed text-[#c9a8b8]">
                {e.premioTexto}
              </p>

              {/* El premio es la pieza, no el dinero: se nombra primero para
                  que no se lea como un premio en efectivo. */}
              <div className="mb-7 rounded-xl border border-[#f43f5e]/30 bg-[#f43f5e]/[0.07] p-5">
                <p className="text-lg font-black leading-tight text-white sm:text-xl">
                  {e.premioPieza}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#c9a8b8]">
                  {e.premioPiezaTexto}
                </p>
                <p className="mt-4 font-mono text-sm uppercase tracking-wider text-[#f43f5e]">
                  {e.premioValor}
                </p>
              </div>

              <p className="font-mono text-sm leading-relaxed text-[#7c6fa0]">
                {e.premioQue}
                <br />
                <span className="text-[#f43f5e]">{e.premioSistema}</span>
              </p>
            </div>

            {/* La pieza: clasificada hasta que la comunidad derrota al jefe
                del raid; entonces se muestra entera */}
            {piezaRevelada ? (
              <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden p-6 lg:min-h-0">
                <span className="ev2-rayos" aria-hidden="true" />
                <img
                  src={raidRecompensaImg}
                  alt={e.premioPieza}
                  className="relative max-h-[420px] w-full object-contain"
                  style={{ filter: "drop-shadow(0 0 28px rgba(251,191,36,0.5))" }}
                />
                <span className="absolute bottom-4 left-0 right-0 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-[#fbbf24]">
                  {e.v2.premioDesbloqueado}
                </span>
              </div>
            ) : (
            <div className="relative min-h-[260px] overflow-hidden lg:min-h-0">
              {premioImg ? (
                <>
                  <img
                    src={premioImg}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ filter: "brightness(0.35) contrast(1.2)" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#06040d] via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06040d] via-transparent to-transparent" />
                </>
              ) : (
                <div className="h-full min-h-[260px] bg-gradient-to-br from-[#2a0a1a] to-[#06040d]" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <span className="ev2-candado flex h-20 w-20 items-center justify-center rounded-xl border-2 border-[#f43f5e] bg-[#06040d]/70">
                  <Lock size={30} className="text-[#f43f5e]" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.4em] text-white/60">
                  {e.clasificado}
                </span>
              </div>
            </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ Lista de acceso ═══ */}
      <section id="lista-acceso" className="ev2-diferida relative overflow-hidden px-6 py-20 lg:py-28">
        {/* Fondo opcional: video o imagen, siempre bajo un velo para que el
            formulario se lea. */}
        {listaImg && (
          <img src={listaImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {listaVideo && (
          <video
            src={listaVideo}
            autoPlay
            muted
            loop
            playsInline
            poster={listaImg || undefined}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {(listaImg || listaVideo) && (
          <>
            <div className="absolute inset-0 bg-[#06040d]/78" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#06040d] via-transparent to-[#06040d]" />
          </>
        )}

        <div className="ev-notch ev2-ventana relative z-10 mx-auto max-w-xl p-6 text-center sm:p-9">
          <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#7dd8ff]">
            {e.v2.nuevaMision}
          </p>
          <p className="ev-display mb-6 text-xl text-white sm:text-2xl">{e.v2.aceptasMision}</p>
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            <NumSeccion n={9} />&nbsp;&nbsp;{e.listaEtiqueta}
          </p>
          <h2 className="mb-4 text-2xl font-black sm:text-4xl">{e.listaTitulo}</h2>
          <p className="mb-8 text-[15px] leading-relaxed text-[#a99fc4]">
            {e.listaTexto}
          </p>

          {suscrito ? (
            <p className="rounded-xl border border-[#a78bfa]/40 bg-[#a78bfa]/10 px-6 py-4 text-sm text-[#c4b5fd]">
              {e.listaHecho}
            </p>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                suscribir.mutate({ email: email.trim(), source: "worldfest", ...antiSpam.fields() });
              }}
              className="flex gap-2"
            >
              <antiSpam.HoneyPot />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={e.v2.correo}
                required
                className="min-w-0 flex-1 border border-white/15 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#a78bfa]"
                style={{ minHeight: 54 }}
              />
              <button
                type="submit"
                disabled={suscribir.isPending}
                className="ev-notch ev2-latido shrink-0 bg-[#e5007d] px-7 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-50"
                style={{ minHeight: 54 }}
              >
                {suscribir.isPending ? "..." : e.listaBoton}
              </button>
            </form>
          )}
        </div>
      </section>

      <AvisoPropiedadIntelectual />
    </div>
  );
}
