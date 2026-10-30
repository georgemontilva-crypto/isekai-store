import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { motion, useScroll, useSpring, useReducedMotion, useTransform } from "framer-motion";
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
import TutorialGuiado from "@/components/fest/TutorialGuiado";
import ToqueParticulas from "@/components/fest/ToqueParticulas";
import ChispasEnergia from "@/components/fest/ChispasEnergia";
import { esGamaBaja } from "@/lib/gamaBaja";
import RaidJefe from "@/components/fest/RaidJefe";
import { ZonaSombras, RevelacionSombras } from "@/components/fest/SombrasSecretas";
import ManaParticulas from "@/components/fest/ManaParticulas";
import IntroSistema, { introPendiente } from "@/components/fest/IntroSistema";

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
 * Barra de navegación del carril al estilo de las webs de juegos:
 * ◀ ANTERIOR · 01 / 07 · SIGUIENTE ▶. Funciona en teléfono y computador, y el
 * contador sigue al deslizar con el dedo.
 */
function BarraCarril({ id, total, anterior, siguiente }: { id: string; total: number; anterior: string; siguiente: string }) {
  const [actual, setActual] = useState(0);
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const medir = () => {
      const primera = el.children[0] as HTMLElement | undefined;
      if (!primera) return;
      const paso = primera.offsetWidth + 20;
      const fin = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setActual(fin ? total - 1 : Math.min(total - 1, Math.round(el.scrollLeft / paso)));
    };
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    return () => el.removeEventListener("scroll", medir);
  }, [id, total]);
  const mover = (dir: number) => {
    const el = document.getElementById(id);
    const primera = el?.children[0] as HTMLElement | undefined;
    if (!el || !primera) return;
    el.scrollBy({ left: dir * (primera.offsetWidth + 20), behavior: "smooth" });
  };
  return (
    <div className="sl-carril-barra">
      <button onClick={() => mover(-1)} disabled={actual === 0} aria-label={anterior}>
        <ChevronLeft size={16} /> <span>{anterior}</span>
      </button>
      <p aria-live="polite"><b>{String(actual + 1).padStart(2, "0")}</b> / {String(total).padStart(2, "0")}</p>
      <button onClick={() => mover(1)} disabled={actual >= total - 1} aria-label={siguiente}>
        <span>{siguiente}</span> <ChevronRight size={16} />
      </button>
    </div>
  );
}

/** Esquinas de visor (como el marco de una cámara) para tarjetas e imágenes */
function Visor() {
  return <span className="sl-visor" aria-hidden="true"><i /><i /><i /><i /></span>;
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

/**
 * Título que entra letra por letra con un pequeño «glitch» de color. El lector
 * de pantalla recibe la frase completa; las letras sueltas son decorativas.
 */
function LetrasEntrada({ texto, retraso = 0 }: { texto: string; retraso?: number }) {
  return (
    <>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">
        {texto.split(" ").map((palabra, w, palabras) => {
          const antes = palabras.slice(0, w).join(" ").length + (w ? 1 : 0);
          return (
            <span key={w} className="inline-block whitespace-nowrap">
              {Array.from(palabra).map((ch, k) => (
                <span key={k} className="sl-letra" style={{ animationDelay: `${retraso + (antes + k) * 0.035}s` }}>{ch}</span>
              ))}
              {w < palabras.length - 1 && <span className="inline-block">&nbsp;</span>}
            </span>
          );
        })}
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
    <div className="grid grid-cols-4 gap-2">
      {valores.map((v, i) => (
        <div key={i} className={`sl-reloj py-3 text-center ${i === 3 ? "sl-reloj-rosa" : ""}`}>
          <div className={`sl-orbitron text-2xl font-black tabular-nums sm:text-3xl ${i === 3 ? "text-[#ff5fb1]" : "text-white"}`}>{v}</div>
          <div className={`mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.2em] ${i === 3 ? "text-[#ff5fb1]" : "text-[#9be7ff]/80"}`}>
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

/**
 * Cabecera de cada sección: hexágono con el número del «piso», etiqueta del
 * Sistema y un título blanco metálico. Mismo texto de siempre, otra piel.
 */
function Cabecera({ n, etiqueta, titulo, centro = false, color = "#9be7ff" }: { n: number; etiqueta?: string; titulo?: React.ReactNode; centro?: boolean; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: [0.2, 0.9, 0.2, 1] }}
      className={centro ? "text-center" : ""}
    >
      <div className={`mb-5 flex items-center gap-4 ${centro ? "justify-center" : ""}`}>
        <span className="sl-hex"><span className="sl-orbitron text-[13px] font-black text-white">{String(n).padStart(2, "0")}</span></span>
        {etiqueta && <p className="sl-orbitron text-[10.5px] font-bold uppercase tracking-[0.32em]" style={{ color }}>{etiqueta}</p>}
        {!centro && <span className="sl-cabecera-linea hidden sm:block" aria-hidden="true" />}
        <span className="hidden sm:inline"><NumSeccion n={n} /></span>
        {!centro && <span className="sl-rayas" aria-hidden="true">//////</span>}
      </div>
      {titulo && <TituloTerminal><h2 className="sl-h2 text-[34px] sm:text-6xl lg:text-7xl">{titulo}</h2></TituloTerminal>}
    </motion.div>
  );
}

/**
 * Título que «se escribe» como en una terminal: un bloque de color barre de
 * izquierda a derecha, deja el texto detrás y queda un cursor parpadeando.
 */
function TituloTerminal({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  return (
    <motion.div
      className={`sl-tecla ${on ? "sl-tecla-on" : ""}`}
      onViewportEnter={() => setOn(true)}
      viewport={{ once: true, margin: "-40px" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Barra fija abajo con el botón principal, como la de «Download now» de las
 * webs de juegos. En teléfono está siempre (la portada no repite el botón);
 * en computador aparece al pasar la portada. Se esconde al llegar a la lista,
 * donde ya está el formulario.
 */
function BarraEntrada({ fecha, lugar, cta, onClick, oculta }: { fecha: string; lugar: string; cta: string; onClick: () => void; oculta: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const revisar = () => {
      const lista = document.getElementById("lista-acceso");
      const llego = lista ? lista.getBoundingClientRect().top < window.innerHeight * 0.85 : false;
      const ancho = window.innerWidth >= 1024;
      const paso = window.scrollY > window.innerHeight * 0.7;
      setVisible(!llego && (!ancho || paso));
    };
    revisar();
    window.addEventListener("scroll", revisar, { passive: true });
    window.addEventListener("resize", revisar);
    return () => { window.removeEventListener("scroll", revisar); window.removeEventListener("resize", revisar); };
  }, []);
  const ver = visible && !oculta;
  useEffect(() => {
    document.documentElement.classList.toggle("iw-barra-fija", ver);
    return () => document.documentElement.classList.remove("iw-barra-fija");
  }, [ver]);
  return (
    <div className={`sl-barra ${ver ? "sl-barra-on" : ""}`} aria-hidden={!ver}>
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 sm:px-6">
        <div className="hidden min-w-0 flex-1 min-[370px]:block">
          <p className="sl-orbitron text-[9.5px] font-bold uppercase leading-snug tracking-[0.1em] text-[#9be7ff]">{fecha}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-[#a99fc4]">{lugar}</p>
        </div>
        <button onClick={onClick} tabIndex={ver ? 0 : -1} className="sl-btn sl-btn-marca flex-1 px-4 py-[13px] text-[11px] min-[370px]:flex-none sm:px-7 sm:text-[11.5px]">
          {cta}
        </button>
      </div>
    </div>
  );
}

/** Franja inclinada que se desliza con los nombres de las áreas */
function Franja({ items }: { items: string[] }) {
  const linea = items.map(x => x.toUpperCase()).join("  ◆  ") + "  ◆  ";
  // Dos cintas cruzadas: la de la marca y la del Sistema, en sentidos opuestos
  return (
    <div className="relative z-[1] overflow-hidden py-8" aria-hidden="true">
      <div className="sl-cinta ev2-franja bg-gradient-to-r from-[#ff2e93] via-[#e5007d] to-[#a1005a] py-3 shadow-[0_0_40px_rgba(229,0,125,0.45)]">
        <div className="ev2-franja-pista sl-orbitron text-[12px] font-bold tracking-[0.22em] text-white sm:text-sm">
          <span className="whitespace-pre">{linea}</span>
          <span className="whitespace-pre">{linea}</span>
        </div>
      </div>
      <div className="sl-cinta sl-cinta-2 ev2-franja border-y border-[#9be7ff]/40 bg-[#07102a]/95 py-2.5">
        <div className="ev2-franja-pista sl-orbitron text-[11px] font-bold tracking-[0.3em] text-[#9be7ff] sm:text-xs" style={{ animationDirection: "reverse" }}>
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
      <PortalGate />
      {figura.estado !== "cargando" && (
        <img
          src={figura.src}
          alt={nombre}
          className="ev2-invitado-img absolute inset-x-0 bottom-0 top-[12%] h-[88%] w-full object-contain object-bottom"
        />
      )}
      <span className="ev2-invitado-suelo" aria-hidden="true" />
    </div>
  );
}

/**
 * Portal astral detrás del artista: video en bucle (anillo morado sobre el
 * agua). El negro del video se funde con la tarjeta (modo «screen»), así que
 * solo se ve la luz. Solo se reproduce cuando está en pantalla; en teléfonos
 * de gama baja o con «reducir movimiento» queda la imagen fija.
 */
function PortalGate() {
  const ref = useRef<HTMLVideoElement>(null);
  const reducir = useReducedMotion();
  const [quieto] = useState(() => esGamaBaja());
  const estatico = quieto || !!reducir;
  useEffect(() => {
    const v = ref.current;
    if (!v || estatico) return;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { void v.play().catch(() => {}); } else v.pause();
    }, { rootMargin: "120px" });
    io.observe(v);
    return () => io.disconnect();
  }, [estatico]);
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {estatico ? (
        <img src="/fest/portal-astral.jpg" alt="" className="ev2-portal-video" loading="lazy" />
      ) : (
        <video ref={ref} className="ev2-portal-video" muted loop playsInline preload="metadata" poster="/fest/portal-astral.jpg">
          <source src="/fest/portal-astral.webm" type="video/webm" />
          <source src="/fest/portal-astral.mp4" type="video/mp4" />
        </video>
      )}
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          className="ev2-invitado-particula"
          style={{ left: `${22 + ((i * 29) % 56)}%`, animationDelay: `${(i * 0.7) % 4}s`, animationDuration: `${4 + (i % 3)}s` }}
        />
      ))}
    </div>
  );
}

/**
 * Nombre «en descifrado»: caracteres que cambian sin parar como si el Sistema
 * estuviera rompiendo una clave. Nunca muestra el nombre real (ni lo recibe).
 * Solo se anima mientras está en pantalla, para no gastar batería.
 */
const GLIFOS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&@*?/<>";
/**
 * Forma del nombre de cada invitado (letras por palabra). Solo la forma, nunca
 * las letras: 1 = Taryn (5), 2 = Prince De Guzman (6 · 2 · 6).
 */
/** Silueta incluida en la web por si no hay foto subida desde el panel */
const FOTO_RESPALDO_INVITADO: Record<number, string> = { 2: "/invitados/invitado-2-silueta.png" };

const PATRON_NOMBRE: Record<number, number[]> = { 1: [5], 2: [6, 2, 6] };

function NombreDescifrando({ etiqueta, semilla }: { etiqueta: string; semilla: number }) {
  const patron = PATRON_NOMBRE[semilla] ?? [8];
  const largo = patron.reduce((a, b) => a + b, 0);
  const azar = () => GLIFOS[Math.floor(Math.random() * GLIFOS.length)];
  const [chars, setChars] = useState<string[]>(() => Array.from({ length: largo }, azar));
  const [fijos, setFijos] = useState<boolean[]>(() => Array(largo).fill(false));
  const [pct, setPct] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const reducir = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = false;
    let id = 0;
    let tick = 0;
    const paso = () => {
      tick++;
      // Algunos caracteres «se fijan» un momento y luego se vuelven a perder
      setFijos(f => f.map(v => (v ? Math.random() > 0.25 : Math.random() > 0.93)));
      setChars(c => c.map((ch, i) => (Math.random() > 0.35 ? azar() : ch)));
      if (tick % 3 === 0) setPct(p => (p >= 97 ? 12 : Math.min(97, p + 1 + Math.floor(Math.random() * 4))));
    };
    const arrancar = () => { if (!id) id = window.setInterval(paso, reducir ? 400 : 75); };
    const parar = () => { if (id) { window.clearInterval(id); id = 0; } };
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !document.hidden) arrancar(); else parar();
    });
    io.observe(el);
    const vis = () => { if (document.hidden) parar(); else if (visible) arrancar(); };
    document.addEventListener("visibilitychange", vis);
    return () => { parar(); io.disconnect(); document.removeEventListener("visibilitychange", vis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducir]);

  return (
    <div ref={ref} className="mt-3">
      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#7dd8ff]">
        <span className="ev2-inv-cursor" aria-hidden="true" />
        {etiqueta}<span className="ev2-parpadeo">…</span>
        <span className="ml-auto tabular-nums text-[#7dd8ff]/70">{pct}%</span>
      </p>
      <div
        className={`ev2-inv-clave mt-2.5 flex select-none items-center justify-center px-3 py-3 ${largo > 8 ? "ev2-inv-clave-larga gap-3" : "gap-1"}`}
        aria-label={etiqueta}
      >
        {patron.map((n, w) => {
          const desde = patron.slice(0, w).reduce((a, b) => a + b, 0);
          return (
            <span key={w} className={`flex ${largo > 8 ? "gap-[1px]" : "gap-3"}`}>
              {chars.slice(desde, desde + n).map((ch, k) => (
                <span key={k} aria-hidden="true" className={`ev2-inv-glifo ${fijos[desde + k] ? "ev2-inv-glifo-fijo" : ""}`}>{ch}</span>
              ))}
            </span>
          );
        })}
      </div>
      <div className="mt-2 h-[3px] overflow-hidden bg-white/[0.07]">
        <div className="ev2-inv-progreso h-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Indicador de piso (solo pantallas anchas): un rombo por sección que se
 * enciende en la que estás. Tocarlo te lleva a esa sección.
 */
function IndicadorPisos() {
  const [activo, setActivo] = useState(1);
  useEffect(() => {
    const secciones = Array.from(document.querySelectorAll<HTMLElement>("[data-piso]"));
    const io = new IntersectionObserver(entradas => {
      for (const en of entradas) if (en.isIntersecting) setActivo(Number(en.target.getAttribute("data-piso")));
    }, { rootMargin: "-45% 0px -50% 0px" });
    secciones.forEach(s => io.observe(s));
    return () => io.disconnect();
  }, []);
  return (
    <nav className="sl-pisos" aria-label="Secciones">
      {Array.from({ length: 9 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          className="sl-piso"
          data-activo={activo === n ? "1" : "0"}
          onClick={() => document.querySelector(`[data-piso="${n}"]`)?.scrollIntoView({ behavior: "smooth" })}
          aria-label={`${n}`}
        >
          {activo === n && <span>{String(n).padStart(2, "0")}</span>}<i />
        </button>
      ))}
    </nav>
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
  const { data: settings, isLoading: cargandoAjustes } = trpc.settings.getAll.useQuery();
  /**
   * Intro de carga con el logo (una vez por sesión). Mientras está, la
   * portada espera: sus animaciones de entrada arrancan cuando se abre.
   */
  const [intro, setIntro] = useState(introPendiente);
  const [portadaLista, setPortadaLista] = useState(() => !introPendiente());
  const logoIntro = settings ? (settings["store_logo_dark_url"] || settings["store_logo_url"] || null) : undefined;
  // Tutorial de la simulación de experiencia
  const tutoVentanaRef = useRef<HTMLDivElement>(null);
  const tutoRangoRef = useRef<HTMLDivElement>(null);
  const tutoBarraRef = useRef<HTMLDivElement>(null);
  const tutoBotonRef = useRef<HTMLButtonElement>(null);
  const abrirTutorialRef = useRef<(() => void) | null>(null);
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
  /** Misiones de ejemplo ya completadas en la simulación */
  const [misionesHechas, setMisionesHechas] = useState<number[]>([]);
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

  /**
   * Cruce de la puerta: la portada queda fija mientras se baja, la puerta
   * crece, la figura se acerca y un destello «te mete» en el Fest. Sin esto
   * (reducir movimiento o gama baja) la portada es una pantalla normal.
   */
  const reducirMov = useReducedMotion();
  // En teléfono no hay cruce: la portada es una pantalla limpia que se desliza normal
  const [anchoGrande] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches);
  const escenaFija = !reducirMov && !ligero && anchoGrande;
  const heroMarcoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: cruce } = useScroll({ target: heroMarcoRef, offset: ["start start", "end end"] });
  const puertaEscala = useTransform(cruce, [0, 1], [1, 2.6]);
  const figuraEscala = useTransform(cruce, [0, 1], [1, 1.25]);
  const figuraOpacidad = useTransform(cruce, [0.35, 0.7], [1, 0]);
  const contenidoOpacidad = useTransform(cruce, [0, 0.3], [1, 0]);
  const contenidoY = useTransform(cruce, [0, 0.35], [0, -60]);
  const cruceOpacidad = useTransform(cruce, [0.6, 0.86, 1], [0, 1, 0]);
  const tunelOpacidad = useTransform(cruce, [0.2, 0.55, 0.85], [0, 1, 0]);
  const tunelEscala = useTransform(cruce, [0.2, 0.9], [0.6, 2.2]);
  const [notificacionVisible, setNotificacionVisible] = useState(false);

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

  /** Barra de energía a la izquierda: se llena al recorrer la página */
  const { scrollYProgress: avancePagina } = useScroll();
  const energiaPagina = useSpring(avancePagina, { stiffness: 140, damping: 30 });

  const irALista = () =>
    document.getElementById("lista-acceso")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="sl-home relative min-h-screen overflow-x-clip text-white">
      <div className="sl-cielo" aria-hidden="true" />
      <motion.div className="sl-energia" style={{ scaleY: energiaPagina }} aria-hidden="true" />
      <IndicadorPisos />
      {intro && (
        <IntroSistema
          logo={logoIntro}
          cargando={cargandoAjustes}
          textoCarga={lang === "en" ? "Loading" : "Cargando"}
          onAbre={() => setPortadaLista(true)}
          onFin={() => setIntro(false)}
        />
      )}
      {portadaLista && <BarraEntrada fecha={e.heroFecha} lugar={e.heroLugar} cta={e.ctaAviso} onClick={irALista} oculta={!!ascensoDemo} />}

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
          Escena 1: la puerta de maná con la figura delante y el título.
          Al bajar, la puerta crece y se «cruza» con un destello de luz.
          Escena 2: aparece la notificación del Sistema con el texto, la
          fecha, la cuenta regresiva y la misión. */}
      <div ref={heroMarcoRef} className="sl-hero-marco" style={{ height: escenaFija ? "150svh" : undefined }}>
        <section
          ref={heroRef}
          onPointerMove={moverFigura}
          className="sl-hero flex flex-col lg:block"
          style={escenaFija ? { position: "sticky", top: 0 } : undefined}
          data-piso="1"
        >
          <div className="sl-hero-fondo" aria-hidden="true">
            {heroBg && <img src={heroBg} alt="" />}
            {heroVideo && <video src={heroVideo} autoPlay muted loop playsInline poster={heroBg || undefined} style={{ opacity: 0.6 }} />}
          </div>
          <div className="sl-hero-velo" aria-hidden="true" />
          <div className="sl-hero-rejilla" aria-hidden="true" />

          <ManaParticulas className="absolute inset-0 z-0 h-full w-full" ligero={ligero} cantidad={52} />

          {/* HUD superior. Teléfono: va en el flujo, arriba de la puerta */}
          <div className="relative z-[3] mx-auto flex w-full max-w-7xl items-center justify-between px-5 pt-5 lg:absolute lg:inset-x-0 lg:top-0 lg:px-10 lg:pt-28">
            <p className="sl-orbitron whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.2em] text-[#9be7ff] min-[380px]:text-[10px] min-[380px]:tracking-[0.35em]">
              {e.v2.hudSistema} <span className="ev2-cursor">_</span>
            </p>
            <p className="sl-orbitron text-[9px] font-bold uppercase tracking-[0.18em] text-[#c4b5fd] min-[380px]:text-[10px] min-[380px]:tracking-[0.3em] lg:hidden">{e.etiquetaAnio}</p>
            <span className="hidden lg:inline"><NumSeccion n={1} /></span>
          </div>

          {/* Escenario: la figura con su aura. En teléfono ocupa el centro de
              la pantalla, sin texto encima; en computador va a la derecha y el
              texto a la izquierda. */}
          <div className="sl-escenario relative z-[1] min-h-0 flex-1 lg:absolute lg:inset-0">
            {/* Escena del Monarca de las Sombras: título gigante calado al
                fondo, aura de sombras que sube desde sus pies y un charco de
                sombra en el suelo. Sin marcos: la figura es la protagonista. */}
            <motion.div className="absolute inset-0" style={escenaFija ? { scale: puertaEscala, transformOrigin: "70% 85%" } : undefined} aria-hidden="true">
              {portadaLista && <div className="sl-eco">
                {e.heroTitulo1.split(" ").map((p, k, todas) => (
                  <span key={k} className={`block ${k < todas.length - 1 ? "hidden lg:block" : ""}`}>{p}</span>
                ))}
              </div>}
              <span className="sl-contraluz" />
              <span className="sl-charco"><i /><i /><i /></span>
              <span className="sl-sombra-pies" />
              <span className="sl-relampago" />
            </motion.div>

            {/* Figura sobre su sombra (mantener presionada abre la Zona de Sombras) */}
            {heroFigura && portadaLista && figura.estado !== "cargando" && (
              <div className="sl-figura">
                <motion.div
                  className="ev2-parallax h-full"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.1, delay: 0.9 }}
                  style={escenaFija ? { scale: figuraEscala, opacity: figuraOpacidad, transformOrigin: "50% 100%" } : undefined}
                >
                  {/* Aura de sombras: copias de la silueta distorsionadas como
                      fuego, que se alternan para que las llamas parpadeen */}
                  {!reducirMov && (
                    <div className="sl-aura" aria-hidden="true">
                      <img src={figura.src} alt="" className="sl-aura-capa sl-aura-1" />
                      <img src={figura.src} alt="" className="sl-aura-capa sl-aura-2" />
                      {!ligero && <img src={figura.src} alt="" className="sl-aura-capa sl-aura-3" />}
                    </div>
                  )}
                  <img src={figura.src} alt="" className="sl-figura-img" />
                </motion.div>
              </div>
            )}
            {/* Filtros de las llamas (fuera de la vista) */}
            <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
              <defs>
                {[[3, "#8b5cf6", 34], [11, "#5b21b6", 46], [23, "#4fc3ff", 26]].map(([semilla, color, escala], k) => (
                  <filter key={k} id={`sl-llama-${k + 1}`} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.045" numOctaves={2} seed={semilla as number} result="ruido" />
                    <feDisplacementMap in="SourceAlpha" in2="ruido" scale={escala as number} xChannelSelector="R" yChannelSelector="G" result="forma" />
                    <feFlood floodColor={color as string} />
                    <feComposite in2="forma" operator="in" result="color" />
                    <feGaussianBlur in="color" stdDeviation={4} />
                  </filter>
                ))}
              </defs>
            </svg>
            {heroFigura && (
              <div className="absolute left-1/2 top-[8%] z-[2] h-[84%] w-[56%] -translate-x-1/2 lg:left-[70%] lg:top-[10%] lg:h-[80%] lg:w-[34%]">
                <ZonaSombras onRevelar={() => setSombras(true)} />
              </div>
            )}
          </div>

          {/* Pie del póster: oscurece la parte baja para que el título se lea */}
          <div className="sl-hero-pie" aria-hidden="true" />

          {/* Título y misión */}
          <motion.div
            className="sl-hero-texto relative z-[3] mx-auto w-full max-w-7xl px-5 pb-[calc(env(safe-area-inset-bottom)+1.6rem)] text-center lg:absolute lg:inset-y-0 lg:left-0 lg:right-0 lg:flex lg:flex-col lg:justify-center lg:px-10 lg:pb-0 lg:text-left"
            style={escenaFija ? { opacity: contenidoOpacidad, y: contenidoY } : undefined}
          >
            <div className="lg:max-w-[60%]">
              <p className="sl-orbitron mb-4 hidden text-xs font-bold uppercase tracking-[0.45em] text-[#c4b5fd] lg:block">
                {e.etiquetaAnio}
              </p>
              <h1 className="sl-titulo sl-titan mb-4 text-[31px] [hyphens:none] min-[380px]:text-[38px] min-[400px]:text-[42px] sm:text-7xl lg:mb-5 lg:text-[84px] xl:text-[96px]">
                <span className="sl-texto-marca block">{portadaLista ? <LetrasEntrada texto={e.heroTitulo1} retraso={0.35} /> : <span className="opacity-0">{e.heroTitulo1}</span>}</span>
                <span className="sl-texto-sistema block">{portadaLista ? <LetrasEntrada texto={e.heroTitulo2} retraso={0.35 + e.heroTitulo1.length * 0.035} /> : <span className="opacity-0">{e.heroTitulo2}</span>}</span>
              </h1>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={portadaLista ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{ duration: 0.7, delay: 1.1 }}
              >
                <div className="mb-5 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-[13px] font-semibold text-[#e7e3f5] sm:text-sm lg:mb-6 lg:justify-start">
                  <span className="flex items-center gap-2"><Calendar size={15} className="text-[#4fc3ff]" /> {e.heroFecha}</span>
                  <span className="flex items-center gap-2"><MapPin size={15} className="text-[#4fc3ff]" /> {e.heroLugar}</span>
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center lg:justify-start">
                  <button onClick={irALista} className="sl-btn sl-btn-marca sl-solo-ancho px-8 py-[16px] text-[12.5px]">
                    {e.ctaAviso}
                  </button>
                  <a href="#el-mundo" className="sl-btn sl-btn-sistema sl-solo-ancho px-8 py-[16px] text-[12.5px]">
                    {e.ctaDescubrir}
                  </a>
                  {/* Teléfono: enlace compacto, para que todo quepa en la pantalla */}
                  <a href="#el-mundo" className="sl-orbitron mx-auto mt-1 hidden items-center gap-1.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.28em] text-[#9be7ff]">
                    {e.ctaDescubrir} <ChevronRight size={13} className="rotate-90" />
                  </a>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Bajar */}
          <div className="absolute bottom-6 right-6 z-[3] hidden flex-col items-center gap-2 lg:flex" aria-hidden="true">
            <span className="sl-bajar" />
          </div>

          {/* Destello al cruzar la puerta */}
          {escenaFija && <motion.div className="sl-tunel" style={{ opacity: tunelOpacidad, scale: tunelEscala }} aria-hidden="true" />}
          {escenaFija && <motion.div className="sl-cruce" style={{ opacity: cruceOpacidad }} aria-hidden="true" />}
        </section>
      </div>

      {/* ═══ Notificación del Sistema (continuación de la portada) ═══ */}
      <section className="relative z-[1] px-5 pb-16 pt-14 lg:pb-24 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.2, 0.9, 0.2, 1] }}
          onViewportEnter={() => setNotificacionVisible(true)}
          className="sl-ventana mx-auto max-w-2xl"
        >
          <span className="sl-esquinas" aria-hidden="true" />
          <div className="sl-ventana-cab">
            <span className="sl-ventana-icono">!</span>
            <p className="sl-orbitron text-[10.5px] font-bold uppercase tracking-[0.3em] text-[#e9fbff]">{e.v2.sistemaAlerta}</p>
          </div>
          <div className="p-5 sm:p-8">
            <p className="min-h-[7.5em] text-[16px] leading-relaxed text-[#e3f4ff] sm:min-h-[5.2em] sm:text-[17px]">
              {notificacionVisible ? <Escritura texto={e.heroTexto} /> : <span className="sr-only">{e.heroTexto}</span>}
            </p>

            <p className="sl-orbitron mb-3 mt-7 text-[10px] font-bold uppercase tracking-[0.35em] text-[#9be7ff]/80">
              {e.v2.cuentaEtiqueta}
            </p>
            <CuentaRegresiva etiquetas={[e.v2.dias, e.v2.horas, e.v2.minutos, e.v2.segundos]} />

            <p className="mt-7 border-t border-[#9be7ff]/20 pt-5 font-mono text-xs text-[#a9b8d6]">
              {e.tuRango}{" "}
              <span className="sl-orbitron font-bold tracking-[0.2em] text-[#9be7ff]">E → D → C → B → A → S</span>
            </p>
          </div>
        </motion.div>
      </section>

      <Franja items={AREAS.map(a => a.titulo)} />

      {/* ═══ 2. BIENVENIDO AL ISEKAI ═══ */}
      <section data-piso="2" className="ev2-diferida relative z-[1] mx-auto max-w-5xl px-6 py-24 lg:py-32">
        <Cabecera n={2} />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="sl-frase mb-10 text-[40px] sm:text-7xl lg:text-[88px]">
            <span className="sl-h2">{e.bienvenidaT1}</span>
            <br />
            <span className="sl-texto-sistema">{e.bienvenidaT2}</span>
          </h2>

          <div className="grid gap-6 border-l-2 border-[#4fc3ff]/40 pl-5 sm:grid-cols-2 sm:gap-10 sm:pl-8">
            <p className="font-mono text-[14px] leading-[1.8] text-[#c5bfdc] sm:text-[15px]">{e.bienvenidaP1}</p>
            <p className="font-mono text-[14px] leading-[1.8] text-[#c5bfdc] sm:text-[15px]">{e.bienvenidaP2}</p>
          </div>

          <p className="sl-frase mt-14 text-[30px] sm:text-5xl">
            <span className="text-white">{e.bienvenidaFrase1}</span>{" "}
            <span className="sl-texto-marca">{e.bienvenidaFrase2}</span>
          </p>
        </motion.div>
      </section>

      {/* ═══ 3. EL MUNDO HA CAMBIADO ═══ */}
      <section id="el-mundo" data-piso="3" className="ev2-diferida relative z-[1] overflow-hidden px-6 py-20 lg:px-16 lg:py-28">
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
          <Cabecera n={3} etiqueta={e.mundoEtiqueta} titulo={e.mundoTitulo} />
          <div className="mb-12" />

          {/* Carril horizontal: con tarjetas más grandes se lee mejor cada
              bloque que apretándolos en una rejilla. En escritorio se pasa con
              flechas; en teléfono, deslizando. */}
          <div className="relative">
            <div id="carril-mundo" className="iw-areas-carril flex gap-5 overflow-x-auto pb-3">
            {TRANSFORMACION.map((x, i) => {
              const Icono = x.icono;
              return (
                <div
                  key={x.titulo}
                  onPointerMove={moverLuz}
                  className="sl-panel iw-card-grande p-8 sm:p-10"
                  style={{ ["--gc" as string]: x.color }}
                >
                  <Visor />
                  <span className="sl-panel-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <p className="sl-orbitron mb-6 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: x.color }}>
                    {e.v2.gate} {String(i + 1).padStart(2, "0")}
                  </p>
                  <div className="sl-panel-icono mb-7">
                    <Icono size={26} style={{ color: x.color }} />
                  </div>
                  <h3 className="ev-card-title mb-3 uppercase text-white">
                    {x.titulo}
                  </h3>
                  <p className="font-mono text-[13.5px] leading-relaxed text-[#b4abcc]">{x.texto}</p>
                </div>
              );
            })}
            </div>
            <BarraCarril id="carril-mundo" total={TRANSFORMACION.length} anterior={e.v2.anterior} siguiente={e.v2.siguiente} />
          </div>
        </div>
      </section>

      {/* ═══ 4. EXPLORA EL FEST ═══ */}
      <section data-piso="4" className="sl-claro ev2-diferida relative z-[1] px-6 py-20 lg:px-16 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <Cabecera n={4} etiqueta={e.exploraEtiqueta} titulo={e.exploraTitulo} />
          <p className="sl-claro-texto mb-12 mt-5 max-w-2xl font-mono text-[14px] leading-relaxed text-[#b4abcc]">
            {e.exploraTexto}
          </p>

          {/* En teléfono se desliza: con siete áreas, apilarlas sería eterno */}
          <div className="relative">
            <div id="carril-areas" className="iw-areas-carril flex gap-5 overflow-x-auto pb-3">
            {AREAS.map((a, i) => {
              const Icono = a.icono;
              return (
                <div
                  key={a.titulo}
                  onPointerMove={moverLuz}
                  className="sl-panel iw-card-grande p-8 sm:p-10"
                  style={{ ["--gc" as string]: a.color }}
                >
                  <Visor />
                  <span className="sl-panel-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <p className="sl-orbitron mb-6 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: a.color }}>
                    {e.v2.gate} {String(i + 1).padStart(2, "0")}
                  </p>
                  <div className="sl-panel-icono mb-7">
                    <Icono size={28} style={{ color: a.color }} />
                  </div>
                  <h3 className="ev-card-title mb-3 uppercase text-white">
                    {a.titulo}
                  </h3>
                  <p className="mb-6 font-mono text-[13.5px] leading-relaxed text-[#b4abcc]">{a.texto}</p>
                  <p
                    className="sl-orbitron text-[10px] font-bold uppercase tracking-[0.25em]"
                    style={{ color: `${a.color}aa` }}
                  >
                    {e.proximamente}
                  </p>
                </div>
              );
            })}
            </div>
            <BarraCarril id="carril-areas" total={AREAS.length} anterior={e.v2.anterior} siguiente={e.v2.siguiente} />
          </div>

        </div>
      </section>

      {/* ═══ 5. INVITADOS ═══
          Solo los dos artistas internacionales, en grande. Su nombre no se
          muestra: el Sistema lo está «descifrando». Para revelarlo algún día,
          poner wf_invitado_N_revelado = 1 (y su nombre) en los ajustes. */}
      <section data-piso="5" className="ev2-diferida ev2-inv-seccion relative z-[1] overflow-hidden px-6 py-24 lg:px-16 lg:py-32">
        <div className="absolute inset-x-0 top-0 z-[2]" aria-hidden="true">
          <div className="sl-alerta" />
          <p className="sl-orbitron sl-alerta-texto bg-[#14040a]/90 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.5em] text-[#ff5d7a]">⚠ S ⚠ S ⚠ S ⚠</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-[2]" aria-hidden="true"><div className="sl-alerta" /></div>
        <div className="ev2-inv-fondo pointer-events-none absolute inset-0" aria-hidden="true">
          <img src="/fest/invitados-fondo.webp" alt="" loading="lazy" decoding="async" className="ev2-inv-imagen" />
          <span className="ev2-inv-aura ev2-inv-aura-1" />
          <span className="ev2-inv-aura ev2-inv-aura-2" />
          <span className="ev2-inv-rejilla" />
          <span className="ev2-inv-barrido" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-center gap-3">
            <span className="ev2-inv-punto" aria-hidden="true" />
            <Cabecera n={5} etiqueta={e.invitadosTransmision} centro color="#ff6bb5" />
          </div>
          <h2 className="sl-titan ev2-inv-titulo mx-auto mb-6 max-w-4xl text-center text-[30px] leading-[1] [overflow-wrap:anywhere] min-[400px]:text-[34px] sm:text-7xl lg:text-[92px]">
            {e.invitadosTitulo}
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-[15px] leading-relaxed text-[#b9aed6] sm:text-[17px]">
            {e.invitadosTexto}
          </p>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6 lg:gap-10">
            {[1, 2].map(n => {
              const nombre = settings?.[`wf_invitado_${n}_nombre`];
              // Si no se subió foto en el panel, el invitado 2 usa su silueta incluida en la web
              const foto = settings?.[`wf_invitado_${n}_foto`] || FOTO_RESPALDO_INVITADO[n];
              const revelado = settings?.[`wf_invitado_${n}_revelado`] === "1" && !!nombre;
              // Rango opcional (S, A, B…) desde el panel; «?» mientras no se revele
              const rango = String(settings?.[`wf_invitado_${n}_rango`] ?? "").trim().toUpperCase().slice(0, 2);
              return (
                <div key={n} className="ev2-inv-marco ev-notch p-[1.5px]">
                <div className={`ev-notch ev2-cazador relative h-full overflow-hidden bg-[#0a0616] ${foto ? "" : "ev2-apagado"}`}>
                  {/* Esquinas de mira del Sistema */}
                  <span className="ev2-mira ev2-mira-1" aria-hidden="true" />
                  <span className="ev2-mira ev2-mira-2" aria-hidden="true" />
                  <span className="ev2-mira ev2-mira-3" aria-hidden="true" />
                  <span className="ev2-mira ev2-mira-4" aria-hidden="true" />

                  <div className="relative" style={{ aspectRatio: "4/5" }}>
                    {foto ? (
                      <InvitadoFigura foto={foto} nombre={revelado ? nombre ?? "" : e.artistaInvitado} />
                    ) : (
                      <div className="ev2-invitado relative flex h-full items-center justify-center overflow-hidden">
                        <span className="ev-display select-none text-[110px] leading-none text-[#3b3553]" aria-hidden="true">?</span>
                      </div>
                    )}

                    <span className="ev2-escaneo" aria-hidden="true" />
                    <div className="absolute inset-x-3 top-3 flex items-start justify-between">
                      <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#7dd8ff]">
                        [ {e.v2.hudSistema.replace(/[[\]\s]/g, "")} ] <span className="ev2-parpadeo">{e.v2.analizando}…</span>
                      </p>
                      <div className="ev2-rango flex flex-col items-center" title={`${e.v2.rango} ${rango || "?"}`}>
                        <span className="ev2-rango-hex ev-display">{rango || "?"}</span>
                        <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.2em] text-[#7dd8ff]/80">{e.v2.rango}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ficha: artista internacional y nombre en descifrado */}
                  <div className="relative border-t border-[#ff3d9e]/25 bg-gradient-to-b from-[#120a26] to-[#0a0616] p-5 sm:p-6">
                    <p className="ev2-inv-etiqueta flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.28em]">
                      <Globe2 size={13} strokeWidth={2} /> {e.artistaInvitado}
                    </p>

                    {revelado ? (
                      <p className="mt-3 text-[22px] font-black text-white">{nombre}</p>
                    ) : (
                      <NombreDescifrando etiqueta={e.descifrandoNombre} semilla={n} />
                    )}

                    <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.15em]">
                      <span className="text-[#7c6fa0]">{e.v2.poder}</span>
                      <span className="ev2-poder h-1.5 bg-white/10"><span /></span>
                      <span className="text-[#c4b5fd]">{revelado ? "∞" : "???"}</span>
                      <span className="text-[#7c6fa0]">{e.v2.estadoCazador}</span>
                      <span />
                      <span className="text-[#4ade80]">{e.v2.confirmado}</span>
                    </div>
                  </div>
                </div>
                </div>
              );
            })}
          </div>

          <p className="mt-12 text-center font-mono text-sm leading-relaxed text-[#7c6fa0]">
            {e.nombresOcultos1}
            <br />
            <span className="text-[#a78bfa]">{e.nombresOcultos2}</span>
          </p>
        </div>
      </section>

      {/* ═══ 6. LA MECÁNICA Y LOS RANGOS ═══ */}
      <section data-piso="6" className="ev2-diferida relative z-[1] overflow-hidden px-6 py-24 lg:px-16 lg:py-32">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{ background: "radial-gradient(70% 50% at 50% 0%, rgba(91,33,182,.28), transparent 70%)" }} />
        <div className="relative mx-auto max-w-5xl">
          <Cabecera n={6} etiqueta={e.sistemaEtiqueta} centro color="#c4b5fd" titulo={e.sistemaTitulo} />
          <p className="mx-auto mb-14 mt-6 max-w-2xl text-center text-[16px] leading-relaxed text-[#c5bfdc]">
            {e.sistemaTexto}
          </p>

          {/* ── Simulación ──
              Pruébalo aquí mismo: es más convincente ver el ascenso que leer
              una explicación. Todo ocurre en el navegador, no se guarda nada. */}
          <div className="mx-auto mb-16 grid max-w-lg grid-cols-1 items-stretch gap-6 lg:max-w-5xl lg:grid-cols-2">
            <div
              ref={tutoVentanaRef}
              className="lp-ventana p-7 sm:p-9 lg:flex lg:flex-col lg:justify-center"
              style={{ ["--lp-rango" as string]: colorDemo }}
            >
              <p className="mb-6 text-center font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: colorDemo }}>
                {e.pruebalo}
              </p>

              <div className="mb-7 flex flex-col items-center">
                <div
                  ref={tutoRangoRef}
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

              <div ref={tutoBarraRef}>
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
              </div>

              <div className="flex gap-2">
                <button
                  ref={tutoBotonRef}
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
                  onClick={() => { setXpDemo(0); setAscensoDemo(null); setMisionesHechas([]); }}
                  className="rounded-lg border border-white/15 px-5 font-mono text-xs font-bold uppercase tracking-widest text-[#5f7f96]"
                  style={{ minHeight: 48 }}
                >
                  {e.reiniciar}
                </button>
              </div>

              <p className="mt-5 text-center text-[11px] leading-relaxed text-[#5f7f96]">
                {e.notaSimulacion}
              </p>
              <button
                onClick={() => { setXpDemo(0); setAscensoDemo(null); setMisionesHechas([]); abrirTutorialRef.current?.(); }}
                className="mx-auto mt-3 block font-mono text-[10px] uppercase tracking-[0.25em] text-[#7dd8ff] underline-offset-4 hover:underline"
              >
                ▶ {e.tutorial.ver}
              </button>
              <TutorialGuiado
                claveVisto="iw_tutorial_exp_v1"
                disparador={tutoVentanaRef}
                abrirRef={abrirTutorialRef}
                textos={{ saltar: e.tutorial.saltar, siguiente: e.tutorial.siguiente, entendido: e.tutorial.entendido, paso: e.tutorial.paso, tocaAqui: e.tutorial.tocaAqui }}
                pasos={[
                  { objetivo: tutoRangoRef, titulo: e.tutorial.p1Titulo, texto: e.tutorial.p1Texto },
                  { objetivo: tutoBarraRef, titulo: e.tutorial.p2Titulo, texto: e.tutorial.p2Texto },
                  { objetivo: tutoBotonRef, titulo: e.tutorial.p3Titulo, texto: e.tutorial.p3Texto, accion: true },
                  { objetivo: tutoVentanaRef, titulo: e.tutorial.p4Titulo, texto: e.tutorial.p4Texto },
                ]}
              />
            </div>

            {/* ── Lista de misiones (ejemplo): cada una suma su EXP a la simulación ── */}
            <div className="lp-ventana flex flex-col p-7 sm:p-9" style={{ ["--lp-rango" as string]: colorDemo }}>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: colorDemo }}>
                {e.listaMisiones.etiqueta}
              </p>
              <h3 className="mb-3 text-xl font-black text-white sm:text-2xl">{e.listaMisiones.titulo}</h3>
              <p className="mb-6 text-[14px] leading-relaxed text-[#8fa8bd]">{e.listaMisiones.texto}</p>

              <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[9.5px] uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.2em]">
                <span className="text-[#5f7f96]">{e.listaMisiones.ejemplo}</span>
                <span className="shrink-0" style={{ color: colorDemo }}>
                  {e.listaMisiones.progreso.replace("{h}", String(misionesHechas.length)).replace("{t}", String(e.listaMisiones.items.length))}
                </span>
              </div>

              <ul className="flex flex-col gap-2">
                {e.listaMisiones.items.map((m, i) => {
                  const hecha = misionesHechas.includes(i);
                  return (
                    <li key={i}>
                      <button
                        onClick={() => {
                          if (hecha || xpDemo >= 500) return;
                          setMisionesHechas(h => [...h, i]);
                          sumarXp(m.xp);
                        }}
                        disabled={hecha}
                        className="lp-mision ev-press flex w-full items-center gap-3 border px-3.5 py-3 text-left transition-colors"
                        style={{
                          borderColor: hecha ? `${colorDemo}66` : "rgba(255,255,255,0.08)",
                          background: hecha ? `${colorDemo}14` : "rgba(255,255,255,0.025)",
                        }}
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-black transition-colors"
                          style={{ borderColor: hecha ? colorDemo : "rgba(255,255,255,0.25)", background: hecha ? colorDemo : "transparent", color: "#04080f" }}
                          aria-hidden="true"
                        >
                          {hecha ? "✓" : ""}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[14px] font-semibold leading-snug ${hecha ? "text-white/60 line-through decoration-white/30" : "text-white"}`}>{m.t}</span>
                          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.15em] text-[#5f7f96]">
                            {e.listaMisiones.estacion}: {m.z}
                          </span>
                        </span>
                        <span className="shrink-0 text-right font-mono text-[12px] font-bold" style={{ color: colorDemo }}>
                          +{m.xp} EXP
                          <span className="mt-0.5 block text-[9px] font-normal uppercase tracking-[0.15em] text-[#5f7f96]">
                            {hecha ? e.listaMisiones.hecha : e.listaMisiones.completar}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                <li>
                  <div className="flex w-full items-center gap-3 border border-dashed border-white/10 px-3.5 py-3 opacity-70">
                    <Lock size={16} className="shrink-0 text-[#5f7f96]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-[#8fa8bd]">{e.listaMisiones.secreta}</span>
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.15em] text-[#5f7f96]">{e.listaMisiones.secretaTexto}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[12px] font-bold text-[#5f7f96]">??? EXP</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Demo del Level Pass: solo mientras está encendida desde el panel */}
          {settings?.["lp_demo"] === "1" && (
            <div className="-mt-8 mb-16 text-center">
              <a
                href="/worldfest/pass"
                className="ev-notch ev-press inline-flex items-center gap-2 border px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-widest"
                style={{ borderColor: `${colorDemo}80`, background: `${colorDemo}1a`, color: colorDemo, minHeight: 48 }}
              >
                ▶ {e.probarLevelPass}
              </a>
            </div>
          )}

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
                  className="ev-notch relative flex w-full items-center gap-4 border p-4 sm:gap-6 sm:p-5"
                  style={{
                    borderColor: `${x.color}2e`,
                    background: `linear-gradient(90deg, ${x.color}0f, transparent 60%)`,
                  }}
                >
                  <span
                    className="sl-rango-letra flex h-14 w-14 shrink-0 items-center justify-center text-[30px] sm:h-16 sm:w-16 sm:text-[36px]"
                    style={{ color: x.color, textShadow: `0 0 18px ${x.color}, 0 0 2px #fff`, clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)", background: `${x.color}1a` }}
                  >
                    {x.r}
                  </span>
                  {i > 0 && xpDemo >= UMBRALES[i] && (
                    <span className="sl-clear sl-orbitron" style={{ ["--c" as string]: x.color }} aria-hidden="true">CLEAR!</span>
                  )}
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

          <p className="sl-frase mt-16 text-center text-[32px] sm:text-6xl">
            <span className="text-white">{e.serasCapaz1}</span>{" "}
            <span style={{ color: "#ff3d5e", textShadow: "0 0 30px rgba(244,63,94,.7)" }}>{e.serasCapaz2}</span><span className="text-white">?</span>
          </p>
        </div>
      </section>

      {/* ═══ 7. RAID COMUNITARIO ═══ */}
      <div data-piso="7" className="relative z-[1]">
      <RaidJefe
        t={e.v2}
        imagen={raidJefe}
        recompensa={raidRecompensa}
        recompensaImg={raidRecompensaImg}
        numero={<NumSeccion n={7} />}
      />
      </div>

      {/* ═══ 8. EL PREMIO ═══ */}
      <section data-piso="8" className="sl-claro ev2-diferida relative z-[1] px-6 py-20 lg:px-16 lg:py-28">
        <div className="sl-panel sl-boveda relative mx-auto max-w-5xl" style={{ ["--gc" as string]: "#f43f5e" }}>
          <span className="sl-cadena top-6" aria-hidden="true" />
          <span className="sl-cadena bottom-6" aria-hidden="true" />
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <Trophy size={34} className="mb-6 text-[#f43f5e]" style={{ filter: "drop-shadow(0 0 12px rgba(244,63,94,.8))" }} />
              <Cabecera n={8} etiqueta={e.premioEtiqueta} color="#ff6b85" />
              <h2 className="sl-h2 mb-6 text-[34px] sm:text-5xl">
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
      <section id="lista-acceso" data-piso="9" className="ev2-diferida relative z-[1] overflow-hidden px-6 py-24 lg:py-32">
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

        <ManaParticulas className="absolute inset-0 h-full w-full" ligero={ligero} cantidad={30} />
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.2, 0.9, 0.2, 1] }}
          className="sl-ventana relative z-10 mx-auto max-w-xl text-center"
        >
          <span className="sl-esquinas" aria-hidden="true" />
          <div className="sl-ventana-cab justify-center">
            <span className="sl-ventana-icono">!</span>
            <p className="sl-orbitron text-[10.5px] font-bold uppercase tracking-[0.3em] text-[#e9fbff]">{e.v2.nuevaMision}</p>
          </div>
          <div className="p-6 sm:p-9">
          <p className="sl-titan mb-7 text-2xl text-white sm:text-3xl">{e.v2.aceptasMision}</p>
          <p className="sl-orbitron mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-[#9be7ff]">
            <NumSeccion n={9} />&nbsp;&nbsp;{e.listaEtiqueta}
          </p>
          <h2 className="sl-h2 mb-4 text-3xl sm:text-5xl">{e.listaTitulo}</h2>
          <p className="mb-8 text-[15px] leading-relaxed text-[#c3cde4]">
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
                className="min-w-0 flex-1 border border-[#9be7ff]/30 bg-[#07102a]/80 px-4 text-[16px] text-white outline-none placeholder:text-white/40 focus:border-[#9be7ff]"
                style={{ minHeight: 56 }}
              />
              <button
                type="submit"
                disabled={suscribir.isPending}
                className="sl-btn sl-btn-marca shrink-0 px-6 text-[12px] disabled:opacity-50"
                style={{ minHeight: 56 }}
              >
                {suscribir.isPending ? "..." : e.listaBoton}
              </button>
            </form>
          )}
          </div>
        </motion.div>
      </section>

      <AvisoPropiedadIntelectual />
    </div>
  );
}
