import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Swords, Sparkles, Users, Store, Theater, Mic, Globe2, Gamepad2,
  Trophy, Lock, Star, ChevronLeft, ChevronRight, X, Menu, LayoutGrid, Square, ShoppingBag,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/i18n/LangContext";
import { useSEO } from "@/hooks/useSEO";
import { useAntiSpam } from "@/hooks/useAntiSpam";
import { useFiguraRecortada } from "@/hooks/useFiguraRecortada";
import IntroSistema from "@/components/fest/IntroSistema";
import PortadaPoster from "@/components/fest/PortadaPoster";
import MapaEvento, { ZONAS } from "@/components/fest/MapaEvento";
import MazmorraJefe from "@/components/fest/MazmorraJefe";
import RaidJefe from "@/components/fest/RaidJefe";
import AvisoPropiedadIntelectual from "@/components/AvisoPropiedadIntelectual";

/**
 * PROPUESTA del home (/propuesta): misma información del home actual, con
 * otra forma de presentarla, al estilo de las webs oficiales de juegos.
 *
 * - Cabecera propia con menú de capítulos a pantalla completa.
 * - Portada tipo póster: ilustración a pantalla completa y el logo abajo.
 * - Cada sección es un «capítulo» con título que se escribe como terminal.
 * - El mundo como pestañas verticales numeradas, las áreas como visor con
 *   ANTERIOR / SIGUIENTE, los invitados como fichas de personaje, los rangos
 *   como metas con sello CLEAR! y el premio como ficha técnica.
 * - Barra fija abajo con el botón principal.
 *
 * Vive sola (sin la barra de la tienda) y no se indexa en buscadores.
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
const RANGOS_ESTILO = [
  { r: "E", color: "#8a8a9c" },
  { r: "D", color: "#4ade80" },
  { r: "C", color: "#38bdf8" },
  { r: "B", color: "#a78bfa" },
  { r: "A", color: "#fbbf24" },
  { r: "S", color: "#f43f5e" },
];
const UMBRALES = [0, 60, 140, 240, 360, 500];
const APERTURA = new Date("2027-08-14T00:00:00-04:00").getTime();
const FOTO_RESPALDO: Record<number, string> = { 2: "/invitados/invitado-2-silueta.png" };
const n3 = (n: number) => String(n).padStart(3, "0");

/**
 * Textos que explican la mecánica. Resumen lo que ya dice el home (boleto,
 * misiones, EXP, rangos E→S, raid y batalla final) en pasos cortos.
 */
const PASOS = {
  es: [
    ["Consigue tu boleto", "Tu entrada es tu licencia de cazador. Al escanearla en la puerta, el Sistema te registra en Rango E."],
    ["Entra a los Gates", "Cada área del Fest es un Gate: zona gamer, red carpet, stands, shows. Recórrelos todos."],
    ["Cumple misiones", "Retos, combates, desfiles y zonas ocultas. Cada misión completada te da EXP."],
    ["Sube de rango", "E → D → C → B → A → S. Tu progreso se ve en vivo en tu Level Pass."],
    ["Llega a Rango S", "Los cazadores que alcancen el Rango S entran a la batalla final por una recompensa única."],
  ],
  en: [
    ["Get your ticket", "Your ticket is your hunter license. When it's scanned at the door, the System registers you at Rank E."],
    ["Enter the Gates", "Every area of the Fest is a Gate: gaming zone, red carpet, stands, shows. Explore them all."],
    ["Complete missions", "Challenges, battles, catwalks and hidden zones. Every mission completed gives you EXP."],
    ["Rank up", "E → D → C → B → A → S. You see your progress live in your Level Pass."],
    ["Reach Rank S", "Hunters who reach Rank S enter the final battle for a unique reward."],
  ],
};

const UNIVERSO = {
  es: {
    intro: "Isekai World Fest toma el universo de Solo Leveling —la historia del cazador que empezó como el más débil y terminó siendo el más fuerte— y lo convierte en un evento real. Aquí el cazador eres tú.",
    items: [
      ["Gates", "Las puertas a otro mundo. En el Fest, cada área es un Gate con sus propios retos."],
      ["Cazador", "Tú. Tu boleto es tu licencia y empiezas desde abajo, en Rango E."],
      ["El Sistema", "La voz que te da misiones y registra tu experiencia. En el Fest es tu Level Pass."],
      ["Rangos", "E, D, C, B, A y S. Con EXP subes; solo los mejores llegan a S."],
      ["Raid", "Un jefe tan fuerte que solo se derrota entre todos. Cada ataque de la comunidad cuenta."],
      ["Sombras", "Zonas y secretos ocultos que solo encuentran los que buscan bien."],
    ],
  },
  en: {
    intro: "Isekai World Fest takes the Solo Leveling universe —the story of the hunter who started as the weakest and became the strongest— and turns it into a real event. Here, the hunter is you.",
    items: [
      ["Gates", "Doors to another world. At the Fest, every area is a Gate with its own challenges."],
      ["Hunter", "You. Your ticket is your license and you start at the bottom, Rank E."],
      ["The System", "The voice that gives you missions and tracks your experience. At the Fest, it's your Level Pass."],
      ["Ranks", "E, D, C, B, A and S. EXP makes you rise; only the best reach S."],
      ["Raid", "A boss so strong it can only be defeated together. Every community attack counts."],
      ["Shadows", "Hidden zones and secrets that only those who search carefully will find."],
    ],
  },
};
const UNIVERSO_ICONOS = [Sparkles, Swords, Gamepad2, Star, Trophy, Lock];

/** «¿Qué es Isekai World Fest?», tomado del brochure (p. 3) */
const QUE_ES = {
  es: {
    palabra: "«otro mundo»",
    p1: "Isekai World Fest es la puerta a ese mundo: dos días en los que Maracaibo se abre a los universos que nos formaron, y cada persona que la cruza se convierte en protagonista de su propia historia.",
    p2: "Es un lugar para todos. Para el niño que ve por primera vez a un personaje gigante, para el joven que encuentra a su gente y para el adulto que vuelve a sentirse protagonista. Quien ya ama el anime viene a vivirlo en primera persona; quien nunca ha visto una serie llega a un mundo nuevo por descubrir.",
    pilares: ["Inspirar", "Conectar", "Unir", "Vivir", "Trascender"],
  },
  en: {
    palabra: "“another world”",
    p1: "Isekai World Fest is the door to that world: two days when Maracaibo opens up to the universes that shaped us, and everyone who walks through it becomes the main character of their own story.",
    p2: "It's a place for everyone. For the kid seeing a giant character for the first time, for the teen who finds their people and for the adult who feels like the hero again. Anime fans come to live it firsthand; someone who has never watched a series arrives at a new world to discover.",
    pilares: ["Inspire", "Connect", "Unite", "Live", "Transcend"],
  },
};

/* ───────────── Piezas pequeñas ───────────── */

/** Cinta que se desliza entre capítulos */
function Cinta({ items, claro = false }: { items: string[]; claro?: boolean }) {
  const linea = items.join("   ◆   ") + "   ◆   ";
  return (
    <div className={`pk-cinta ${claro ? "pk-cinta-claro" : ""}`} aria-hidden="true">
      <div className="pk-cinta-pista pk-cond"><span>{linea}</span><span>{linea}</span></div>
    </div>
  );
}

/** Anima la entrada de todo lo marcado con .pk-rev al aparecer en pantalla */
function useRevelar(dep: unknown) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".pk-rev:not(.pk-rev-on)"));
    const io = new IntersectionObserver(ents => {
      ents.forEach(en => { if (en.isIntersecting) { en.target.classList.add("pk-rev-on"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [dep]);
}

/** Línea de tiempo «Cómo funciona»: la línea de energía se llena al bajar */
function ComoFunciona({ pasos }: { pasos: string[][] }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const f = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.75 - r.top) / r.height));
      el.style.setProperty("--avance", String(p));
      el.querySelectorAll<HTMLElement>("li").forEach((li, i) => li.classList.toggle("pk-paso-on", p >= (i + 0.35) / pasos.length));
    };
    const alBajar = () => { if (!raf) raf = requestAnimationFrame(f); };
    f();
    window.addEventListener("scroll", alBajar, { passive: true });
    return () => { window.removeEventListener("scroll", alBajar); if (raf) cancelAnimationFrame(raf); };
  }, [pasos.length]);
  return (
    <ol ref={ref} className="pk-pasos">
      {pasos.map(([t, d], i) => (
        <li key={i}>
          <span className="pk-paso-num pk-cond">{String(i + 1).padStart(2, "0")}</span>
          <div>
            <b className="pk-cond">{t}</b>
            <p className="pk-mono">{d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Título de capítulo: un bloque de color lo barre y queda escrito, con cursor */
function Titulo({ children, claro = false, n, intro }: { children: React.ReactNode; claro?: boolean; n?: number; intro?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: "-40px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`pk-cap ${on ? "pk-cap-on" : ""} ${claro ? "pk-cap-claro" : ""}`}>
      {n !== undefined && <span className="pk-cap-num pk-cond" aria-hidden="true">{n3(n)}</span>}
      <h2 ref={ref} className={`pk-titulo ${claro ? "pk-titulo-claro" : ""} ${on ? "pk-titulo-on" : ""}`}>
        <span>{children}</span>
      </h2>
      {intro && <p className="pk-cap-intro pk-mono">{intro}</p>}
    </div>
  );
}

/** Marco de visor: cuatro esquinas */
function Visor() {
  return <span className="pk-visor" aria-hidden="true"><i /><i /><i /><i /></span>;
}

/** Nombre que el Sistema todavía está descifrando */
function Descifrando({ etiqueta, semilla }: { etiqueta: string; semilla: number }) {
  const [txt, setTxt] = useState("████████");
  useEffect(() => {
    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&?";
    let k = semilla;
    const id = window.setInterval(() => {
      k++;
      setTxt(Array.from({ length: 9 }, (_, i) => abc[(k * 7 + i * 13 + semilla * 5) % abc.length]).join(""));
    }, 110);
    return () => window.clearInterval(id);
  }, [semilla]);
  return (
    <span className="block">
      <span className="pk-mono block text-[10px] uppercase tracking-[0.22em] opacity-70">{etiqueta}</span>
      <span className="pk-cond block text-[26px] leading-none tracking-wide" aria-hidden="true">{txt}</span>
    </span>
  );
}

function Cuenta({ et }: { et: [string, string, string, string] }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setAhora(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const r = Math.max(0, APERTURA - ahora);
  const v = [Math.floor(r / 864e5), Math.floor(r / 36e5) % 24, Math.floor(r / 6e4) % 60, Math.floor(r / 1e3) % 60];
  return (
    <div className="grid grid-cols-4 gap-2">
      {v.map((x, i) => (
        <div key={i} className={`pk-reloj ${i === 3 ? "pk-reloj-seg" : ""}`}>
          <b>{String(x).padStart(i === 0 ? 3 : 2, "0")}</b>
          <span>{et[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ───────────── Página ───────────── */

export default function PropuestaHome() {
  const { t, lang, setLang } = useLang();
  const e = t.evento;
  const en = lang === "en";
  const { data: settings, isLoading } = trpc.settings.getAll.useQuery();
  const s = (k: string) => settings?.[k] ?? "";

  const MUNDO = MUNDO_ESTILO.map((x, i) => ({ ...x, ...e.mundoItems[i] }));
  const AREAS = AREAS_ESTILO.map((x, i) => ({ ...x, ...e.areasItems[i] }));
  const RANGOS = RANGOS_ESTILO.map((x, i) => ({ ...x, ...e.rangosItems[i] }));

  const logo = settings ? (s("store_logo_dark_url") || s("store_logo_url") || null) : undefined;
  const heroBg = s("wf_hero_bg") || s("worldfest_hero_image");
  const figura = useFiguraRecortada(s("wf_hero_figura"));
  const mundoBg = s("wf_mundo_bg");
  const premioImg = s("wf_premio_image");

  useSEO({
    title: en ? "Isekai World Fest 2027 — Proposal" : "Isekai World Fest 2027 — Propuesta",
    description: en ? "August 14–15, 2027 in Maracaibo, Venezuela." : "14 y 15 de agosto de 2027 en Maracaibo, Venezuela.",
  });
  // Propuesta: que los buscadores no la indexen
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  /* Intro (sale en cada visita: es una propuesta para mostrar) */
  const [intro, setIntro] = useState(true);
  const [lista, setLista] = useState(false);

  /* Cabecera: se vuelve sólida al bajar */
  const [bajo, setBajo] = useState(false);
  const [menu, setMenu] = useState(false);
  const [barra, setBarra] = useState(false);
  useEffect(() => {
    const f = () => {
      setBajo(window.scrollY > 40);
      const acc = document.getElementById("pk-acceso");
      setBarra(!acc || acc.getBoundingClientRect().top > window.innerHeight * 0.85);
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("iw-barra-fija", barra && lista);
    return () => document.documentElement.classList.remove("iw-barra-fija");
  }, [barra, lista]);

  const capitulos = useMemo(() => ([
    ["pk-que-es", en ? "WHAT IS IT" : "¿QUÉ ES?"],
    ["pk-concepto", en ? "CONCEPT" : "CONCEPTO"],
    ["pk-universo", en ? "UNIVERSE" : "UNIVERSO"],
    ["pk-como", en ? "HOW IT WORKS" : "CÓMO FUNCIONA"],
    ["pk-evento", en ? "THE EVENT" : "EL EVENTO"],
    ["pk-invitados", en ? "GUESTS" : "INVITADOS"],
    ["pk-rangos", en ? "RANKS" : "RANGOS"],
    ["pk-raid", en ? "THE BOSS" : "EL JEFE"],
    ["pk-acceso", en ? "ACCESS" : "ACCESO"],
  ] as const), [en]);
  const ir = (id: string) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  useRevelar(lista);

  /* Invitados: carril o rejilla, y ficha abierta */
  const [vistaRejilla, setVistaRejilla] = useState(false);
  const [ficha, setFicha] = useState<number | null>(null);
  const invitados = [1, 2].map(n => {
    const nombre = s(`wf_invitado_${n}_nombre`);
    return {
      n,
      foto: s(`wf_invitado_${n}_foto`) || FOTO_RESPALDO[n] || "",
      revelado: s(`wf_invitado_${n}_revelado`) === "1" && !!nombre,
      nombre,
      rango: String(s(`wf_invitado_${n}_rango`)).trim().toUpperCase().slice(0, 2) || "?",
    };
  });
  // Casillas por revelar en la rejilla (como los personajes bloqueados)
  const bloqueados = 6;

  /* Rangos: simulación con las misiones de ejemplo */
  const [hechas, setHechas] = useState<number[]>([]);
  const xp = hechas.reduce((a, i) => a + (e.listaMisiones.items[i]?.xp ?? 0), 0);
  const nivel = UMBRALES.reduce((acc, u, k) => (xp >= u ? k : acc), 0);
  const sig = UMBRALES[nivel + 1];
  const progreso = sig ? Math.round(((xp - UMBRALES[nivel]) / (sig - UMBRALES[nivel])) * 100) : 100;

  /* Lista de acceso */
  const [email, setEmail] = useState("");
  const [suscrito, setSuscrito] = useState(false);
  const antiSpam = useAntiSpam();
  const suscribir = trpc.newsletter.subscribe.useMutation({ onSuccess: () => { setSuscrito(true); setEmail(""); } });

  // Bloquea el fondo con un panel abierto
  useEffect(() => {
    const abierto = menu || ficha !== null;
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menu, ficha]);

  return (
    <div className="pk">
      {intro && (
        <IntroSistema
          siempre
          logo={logo}
          cargando={isLoading}
          textoCarga={en ? "Loading" : "Cargando"}
          onAbre={() => setLista(true)}
          onFin={() => setIntro(false)}
        />
      )}

      {/* ═══ Cabecera ═══ */}
      <header className={`pk-cab ${bajo ? "pk-cab-solida" : ""}`}>
        <button className="pk-cab-btn" onClick={() => setMenu(true)} aria-label={en ? "Chapters" : "Capítulos"}><Menu size={20} /></button>
        <button className="pk-cab-idioma" onClick={() => setLang(en ? "es" : "en")}>{en ? "ES" : "EN"}</button>
        <div className="flex-1" />
        <Link href="/tienda" className="pk-cab-tienda"><ShoppingBag size={14} /> {en ? "Store" : "Tienda"}</Link>
        <button onClick={() => ir("pk-acceso")} className="pk-cab-cta">{en ? "Access list" : "Lista de acceso"} <ChevronRight size={13} /></button>
      </header>

      {/* Menú de capítulos */}
      <div className={`pk-menu ${menu ? "pk-menu-on" : ""}`} aria-hidden={!menu}>
        <button className="pk-menu-cerrar" onClick={() => setMenu(false)} aria-label={en ? "Close" : "Cerrar"}><X size={22} /></button>
        <nav className="pk-menu-lista">
          {capitulos.map(([id, nombre], i) => (
            <button key={id} onClick={() => ir(id)} tabIndex={menu ? 0 : -1} style={{ transitionDelay: menu ? `${80 + i * 40}ms` : "0ms" }}>
              <span className="pk-mono">{n3(i + 1)}</span>{nombre}
            </button>
          ))}
        </nav>
        <p className="pk-mono pk-menu-pie">{e.heroFecha} · {e.heroLugar}</p>
      </div>

      {/* ═══ Portada: póster a pantalla completa ═══ */}
      <PortadaPoster
        fondo={heroBg}
        figura={figura.estado !== "cargando" ? figura.src : undefined}
        logo={logo}
        lema1={e.heroTitulo1}
        lema2={e.heroTitulo2}
        fecha={e.heroFecha}
        lugar={e.heroLugar}
        etiqueta={e.etiquetaAnio}
        lista={lista}
        onInsignia={() => ir("pk-rangos")}
      />

      {/* ═══ 001 ¿QUÉ ES? (del brochure) ═══ */}
      <section id="pk-que-es" className="pk-sec pk-oscuro pk-que-es">
        <div className="pk-ancho">
          <Titulo n={1}>{capitulos[0][1]}</Titulo>
          <p className="pk-cond pk-que-es-palabra pk-rev"><span>ISEKAI</span> = {QUE_ES[en ? "en" : "es"].palabra}</p>
          <p className="pk-texto pk-rev mb-5 max-w-2xl text-[15px] text-[#ece8f7]" style={{ ["--d" as string]: "120ms" }}>{QUE_ES[en ? "en" : "es"].p1}</p>
          <p className="pk-texto pk-rev mb-9 max-w-2xl" style={{ ["--d" as string]: "220ms" }}>{QUE_ES[en ? "en" : "es"].p2}</p>
          <div className="pk-pilares pk-rev pk-rev-hijos">
            {QUE_ES[en ? "en" : "es"].pilares.map((x, i) => (
              <span key={x} className="pk-cond" style={{ ["--d" as string]: `${i * 120}ms` }}>{x}</span>
            ))}
          </div>
          <div className="pk-ventana pk-rev mt-12">
            <Visor />
            <p className="pk-mono pk-ventana-cab">! {e.v2.sistemaAlerta}</p>
            <p className="pk-texto mb-7">{e.heroTexto}</p>
            <p className="pk-mono pk-etq mb-3">{e.v2.cuentaEtiqueta}</p>
            <Cuenta et={[e.v2.dias, e.v2.horas, e.v2.minutos, e.v2.segundos]} />
          </div>
        </div>
      </section>

      {/* ═══ 002 CONCEPTO ═══ */}
      <section id="pk-concepto" className="pk-sec pk-concepto">
        {mundoBg && <img src={mundoBg} alt="" loading="lazy" className="pk-concepto-fondo" aria-hidden="true" />}
        <div className="pk-ancho relative">
          <Titulo n={2}>{capitulos[1][1]}</Titulo>
          <p className="pk-cond pk-concepto-titular pk-rev">{e.bienvenidaT1}<br /><span>{e.bienvenidaT2}</span></p>
          <div className="pk-concepto-cuerpo pk-rev" style={{ ["--d" as string]: "150ms" }}>
            <p className="pk-texto">{e.bienvenidaP1}</p>
            <p className="pk-texto">{e.bienvenidaP2}</p>
            <p className="pk-texto pk-concepto-frase">{e.bienvenidaFrase1} <b>{e.bienvenidaFrase2}</b></p>
          </div>
        </div>
      </section>

      <Cinta items={en ? ["GATE OPEN", "RANK E → S", "+EXP", "RAID BOSS", "SHADOW ZONES", "AUG 14—15 2027"] : ["GATE ABIERTO", "RANGO E → S", "+EXP", "JEFE DE RAID", "ZONAS DE SOMBRA", "14—15 AGO 2027"]} />

      {/* ═══ 003 UNIVERSO: qué tomamos de Solo Leveling ═══ */}
      <section id="pk-universo" className="pk-sec pk-universo">
        <div className="pk-ancho">
          <Titulo n={3} intro={en ? "Inspired by Solo Leveling." : "Inspirado en Solo Leveling."}>{capitulos[2][1]}</Titulo>
          <p className="pk-texto pk-rev mb-9 max-w-2xl text-[14.5px] text-[#e5e0f2]">{UNIVERSO[en ? "en" : "es"].intro}</p>
          <div className="pk-glosario pk-rev pk-rev-hijos">
            {UNIVERSO[en ? "en" : "es"].items.map(([t, d], i) => {
              const Ico = UNIVERSO_ICONOS[i];
              return (
                <div key={i} className="pk-glosa" style={{ ["--d" as string]: `${i * 90}ms` }}>
                  <Visor />
                  <span className="pk-glosa-ico"><Ico size={22} /></span>
                  <span className="pk-mono pk-glosa-num">{n3(i + 1)}</span>
                  <b className="pk-cond">{t}</b>
                  <p className="pk-mono">{d}</p>
                  {/* Los Gates del Fest: las 8 zonas del evento */}
                  {i === 0 && (
                    <div className="pk-glosa-zonas">
                      {ZONAS.map((z, k) => {
                        const Ico = z.icono;
                        return (
                          <button key={z.id} onClick={() => ir("pk-evento")} style={{ ["--c" as string]: z.color }}>
                            <span className="pk-mono">{String(k + 1).padStart(2, "0")}</span>
                            <Ico size={14} />
                            {en ? z.en[0] : z.es[0]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ 004 CÓMO FUNCIONA ═══ */}
      <section id="pk-como" className="pk-sec pk-oscuro">
        <div className="pk-ancho">
          <Titulo n={4} intro={en ? "Your ticket, the Gates, missions, ranks and the final battle, step by step." : "Tu boleto, los Gates, las misiones, los rangos y la batalla final, paso a paso."}>{capitulos[3][1]}</Titulo>
          <ComoFunciona pasos={PASOS[en ? "en" : "es"]} />
        </div>
      </section>

      <Cinta claro items={ZONAS.map(z => (en ? z.en[0] : z.es[0]).toUpperCase())} />

      {/* ═══ 005 EL EVENTO: plano interactivo con las zonas ═══ */}
      <section id="pk-evento" className="pk-sec pk-claro">
        <div className="pk-ancho">
          <Titulo claro n={5} intro={en ? "Tap a zone on the map to enter it." : "Toca una zona del plano para entrar en ella."}>{capitulos[4][1]}</Titulo>
          <p className="pk-mono mb-6 max-w-2xl text-[13px] leading-relaxed text-[#3b3450]">
            {en
              ? "The venue is divided into eight zones with their own identity. Each one gives you experience when you visit it."
              : "El recinto se divide en ocho zonas con identidad propia. Cada una te da experiencia al visitarla."}
          </p>
          <div className="pk-rev"><MapaEvento en={en} imagenes={Object.fromEntries(ZONAS.map(z => [z.id, s(`wf_zona_${z.id}_img`)]))} /></div>
        </div>
      </section>

      {/* ═══ 005 INVITADOS: fichas de personaje ═══ */}
      <section id="pk-invitados" className="pk-sec pk-claro">
        <div className="pk-ancho">
          <Titulo claro n={6} intro={en ? "Tap a card to see their file." : "Toca una ficha para ver su información."}>{capitulos[5][1]}</Titulo>
          <p className="pk-mono pk-etq-claro mb-2">● {e.invitadosTransmision}</p>
          <p className="pk-cond mb-3 text-[30px] leading-[0.95] text-[#0b0814] sm:text-5xl">{e.invitadosTitulo}</p>
          <p className="pk-mono mb-6 text-[13px] leading-relaxed text-[#4b4460]">{e.invitadosTexto}</p>
          <div className="mb-4 flex items-center gap-3">
            <span className="pk-mono text-[11px] font-bold text-[#3b3450]">{en ? "CHANGE VIEW:" : "CAMBIAR VISTA:"}</span>
            <button className={`pk-vista ${!vistaRejilla ? "pk-vista-on" : ""}`} onClick={() => setVistaRejilla(false)} aria-label="Carril"><Square size={14} /></button>
            <button className={`pk-vista ${vistaRejilla ? "pk-vista-on" : ""}`} onClick={() => setVistaRejilla(true)} aria-label="Rejilla"><LayoutGrid size={14} /></button>
          </div>

          {!vistaRejilla ? (
            <div className="pk-cartas pk-rev">
              {invitados.map((g, i) => (
                <button key={g.n} className="pk-carta" onClick={() => setFicha(i)}>
                  <span className="pk-carta-arte">
                    {g.foto ? <img src={g.foto} alt="" /> : <span className="pk-cond pk-carta-q">?</span>}
                    <span className="pk-carta-rango pk-cond">{g.rango}</span>
                  </span>
                  <span className="pk-carta-nombre pk-cond">{g.revelado ? g.nombre : `${e.artistaInvitado} ${String(g.n).padStart(2, "0")}`}</span>
                </button>
              ))}
              {Array.from({ length: 2 }, (_, i) => (
                <div key={`b${i}`} className="pk-carta pk-carta-bloq" aria-hidden="true">
                  <span className="pk-carta-arte"><Lock size={34} /></span>
                  <span className="pk-carta-nombre pk-cond">{e.clasificado}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="pk-rejilla">
              {invitados.map((g, i) => (
                <button key={g.n} className="pk-celda" onClick={() => setFicha(i)}>
                  {g.foto ? <img src={g.foto} alt="" /> : <span className="pk-cond">?</span>}
                </button>
              ))}
              {Array.from({ length: bloqueados }, (_, i) => <div key={i} className="pk-celda pk-celda-bloq" aria-hidden="true"><Lock size={16} /></div>)}
            </div>
          )}
          <p className="pk-mono mt-6 text-[12px] text-[#4b4460]">{e.nombresOcultos1} <b className="text-[#6d28d9]">{e.nombresOcultos2}</b></p>
        </div>
      </section>

      {ficha !== null && (() => {
        const g = invitados[ficha];
        return (
          <div className="pk-ficha">
            <div className="pk-ficha-cuerpo">
              <span className="pk-ficha-rayas" aria-hidden="true" />
              <div className="pk-ficha-arte">{g.foto ? <img src={g.foto} alt="" /> : <span className="pk-cond">?</span>}</div>
              <div className="pk-ficha-info">
                {g.revelado
                  ? <p className="pk-cond text-[38px] leading-none text-[#6ff0ff]">{g.nombre}</p>
                  : <div className="text-[#6ff0ff]"><Descifrando etiqueta={e.descifrandoNombre} semilla={g.n} /></div>}
                <p className="pk-mono pk-ficha-chip">{e.artistaInvitado}</p>
                <p className="pk-mono mt-5 text-[11px] text-[#b9b2cc]">[ {e.v2.rango} ]</p>
                <p className="pk-cond text-[30px] text-white">{g.rango}</p>
                <p className="pk-mono mt-4 text-[11px] text-[#b9b2cc]">[ {e.v2.estadoCazador} ]</p>
                <p className="pk-mono text-[13px] text-[#4ade80]">{e.v2.confirmado}</p>
                <p className="pk-mono mt-5 text-[12.5px] leading-relaxed text-[#d8d2e8]">{e.invitadosTexto}</p>
              </div>
            </div>
            <div className="pk-ficha-nav">
              <button onClick={() => setFicha((ficha - 1 + invitados.length) % invitados.length)}><ChevronLeft size={16} /> {en ? "PREV" : "ANTERIOR"}</button>
              <button onClick={() => setFicha(null)} aria-label={en ? "Close" : "Cerrar"}><X size={18} /></button>
              <button onClick={() => setFicha((ficha + 1) % invitados.length)}>{en ? "NEXT" : "SIGUIENTE"} <ChevronRight size={16} /></button>
            </div>
          </div>
        );
      })()}

      {/* ═══ 006 RANGOS: metas con sello CLEAR! ═══ */}
      <section id="pk-rangos" className="pk-sec pk-oscuro">
        <div className="pk-ancho">
          <Titulo n={7} intro={en ? "Try it: tap the missions and watch your rank go up." : "Pruébalo: toca las misiones y mira cómo subes de rango."}>{capitulos[6][1]}</Titulo>
          <p className="pk-mono pk-etq mb-2">{e.sistemaEtiqueta}</p>
          <p className="pk-cond mb-3 text-[30px] leading-[0.95] text-white sm:text-5xl">{e.sistemaTitulo}</p>
          <p className="pk-texto mb-7">{e.sistemaTexto}</p>

          <div className="pk-sim pk-rev">
            <div className="pk-sim-cab">
              <span className="pk-cond pk-sim-letra" style={{ color: RANGOS[nivel].color }}>{RANGOS[nivel].r}</span>
              <div className="min-w-0 flex-1">
                <p className="pk-mono text-[10px] uppercase tracking-[0.2em] text-[#8b84a3]">{e.pruebalo}</p>
                <p className="pk-cond text-[22px] leading-tight text-white">{RANGOS[nivel].nombre} · {xp} EXP</p>
                <span className="pk-sim-barra"><i style={{ width: `${progreso}%`, background: RANGOS[nivel].color }} /></span>
              </div>
            </div>
            <ul className="pk-misiones">
              {e.listaMisiones.items.map((m, i) => {
                const h = hechas.includes(i);
                return (
                  <li key={i}>
                    <button disabled={h} onClick={() => setHechas(x => [...x, i])} className={h ? "pk-mision-hecha" : ""}>
                      <span className="pk-mono pk-mision-xp">+{m.xp}</span>
                      <span className="min-w-0 flex-1 text-left">
                        <b>{m.t}</b>
                        <span className="pk-mono">{e.listaMisiones.estacion}: {m.z}</span>
                      </span>
                      <span className="pk-mono pk-mision-estado">{h ? e.listaMisiones.hecha : e.listaMisiones.completar}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {hechas.length > 0 && <button className="pk-mono pk-reiniciar" onClick={() => setHechas([])}>{e.reiniciar}</button>}
          </div>

          <div className="pk-metas pk-rev pk-rev-hijos">
            {RANGOS.map((x, i) => (
              <div key={x.r} className={`pk-meta ${xp >= UMBRALES[i] && i > 0 ? "pk-meta-ok" : ""}`} style={{ ["--c" as string]: x.color, ["--d" as string]: `${i * 80}ms` }}>
                {xp >= UMBRALES[i] && i > 0 && <span className="pk-clear pk-cond">CLEAR!</span>}
                <span className="pk-cond pk-meta-letra">{x.r}</span>
                <span className="min-w-0 flex-1">
                  <b className="pk-cond">{x.nombre}</b>
                  <span className="pk-mono">{x.desc}</span>
                </span>
                <span className="pk-mono pk-meta-xp">{UMBRALES[i]} EXP</span>
              </div>
            ))}
          </div>
          {/* Lo que se llevan al llegar al último rango */}
          <div className="pk-recompensa pk-rev">
            <Visor />
            <p className="pk-mono pk-recompensa-etq">{en ? "[ WHAT YOU GET AT RANK S ]" : "[ LO QUE TE LLEVAS EN RANGO S ]"}</p>
            <div className="pk-recompensa-grid">
              <div className="pk-premio-caja">
                {premioImg && <img src={premioImg} alt="" loading="lazy" />}
                <span className="pk-premio-candado"><Lock size={28} /></span>
                <span className="pk-mono pk-premio-clas">{e.clasificado}</span>
              </div>
              <div>
                <p className="pk-cond mb-3 text-[28px] leading-[0.95] text-white sm:text-4xl">{e.premioTitulo1} {e.premioTitulo2}</p>
                <p className="pk-texto mb-5">{e.premioTexto}</p>
                <dl className="pk-spec">
                  <div><dt>{en ? "Piece" : "Pieza"}</dt><dd>{e.premioPieza} — {e.premioPiezaTexto}</dd></div>
                  <div><dt>{en ? "Value" : "Valor"}</dt><dd className="text-[#ff5d7a]">{e.premioValor}</dd></div>
                  <div><dt>{en ? "Which one?" : "¿Cuál?"}</dt><dd>{e.premioQue} <b className="text-[#ff5d7a]">{e.premioSistema}</b></dd></div>
                </dl>
              </div>
            </div>
          </div>

          <p className="pk-cond mt-12 text-center text-[34px] leading-none text-white sm:text-6xl">{e.serasCapaz1} <span className="text-[#ff3d5e]">{e.serasCapaz2}</span>?</p>
        </div>
      </section>

      {/* ═══ 008 EL JEFE: entrar a la mazmorra ═══ */}
      <div id="pk-raid" className="pk-raid">
        <div className="pk-sec pk-oscuro pb-0">
          <div className="pk-ancho">
            <Titulo n={8} intro={en ? "Enter the dungeon and face the boss with the whole community." : "Entra a la mazmorra y enfrenta al jefe junto a toda la comunidad."}>{capitulos[7][1]}</Titulo>
          </div>
        </div>
        <MazmorraJefe en={en} imagen={s("wf_raid_jefe")}>
          {onEstado => <RaidJefe
            onEstado={onEstado}
            t={e.v2}
            imagen={s("wf_raid_jefe")}
            recompensa={(en ? s("wf_raid_recompensa_en") : s("wf_raid_recompensa"))}
            recompensaImg={s("wf_raid_recompensa_img")}
            numero={<span className="pk-mono text-[10px] text-[#8b84a3]">008</span>}
          />}
        </MazmorraJefe>
      </div>

      {/* ═══ 009 ACCESO ═══ */}
      <section id="pk-acceso" className="pk-sec pk-acceso">
        <div className="pk-ancho">
          <Titulo n={9}>{capitulos[8][1]}</Titulo>
          <div className="pk-ventana pk-rev">
            <Visor />
            <p className="pk-mono pk-ventana-cab">{e.listaEtiqueta}</p>
            <p className="pk-cond mb-3 text-[30px] leading-[0.95] text-white sm:text-5xl">{e.listaTitulo}</p>
            <p className="pk-texto mb-6">{e.listaTexto}</p>
            {suscrito ? (
              <p className="pk-mono rounded border border-[#4ade80]/40 bg-[#4ade80]/10 px-4 py-3 text-[13px] text-[#bbf7d0]">{e.listaHecho}</p>
            ) : (
              <form className="pk-form" onSubmit={ev => { ev.preventDefault(); suscribir.mutate({ email: email.trim(), source: "worldfest", ...antiSpam.fields() }); }}>
                <antiSpam.HoneyPot />
                <input type="email" required value={email} onChange={ev => setEmail(ev.target.value)} placeholder={e.v2.correo} />
                <button type="submit" disabled={suscribir.isPending}>{suscribir.isPending ? "..." : e.listaBoton}</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Pie con enlaces en bloques */}
      <footer className="pk-pie">
        <div className="pk-ancho">
          {logo ? <img src={logo} alt="Isekai World" className="mb-6 h-10 w-auto" /> : <p className="pk-cond mb-6 text-3xl">ISEKAI WORLD</p>}
          <p className="pk-mono mb-6 text-[11px] text-[#8b84a3]">{e.heroFecha} · {e.heroLugar}</p>
        </div>
        <div className="pk-pie-enlaces">
          <Link href="/tienda">{en ? "Isekai World Store" : "Tienda Isekai World"} <ChevronRight size={14} /></Link>
          <Link href="/">{en ? "Current home" : "Home actual"} <ChevronRight size={14} /></Link>
        </div>
        <AvisoPropiedadIntelectual />
      </footer>

      {/* Barra fija abajo */}
      <div className={`pk-barra ${barra && lista ? "pk-barra-on" : ""}`}>
        <span className="pk-mono pk-barra-etq">{en ? "EARLY ACCESS" : "ACCESO ANTICIPADO"}</span>
        <button onClick={() => ir("pk-acceso")}>{e.ctaAviso}</button>
      </div>
    </div>
  );
}
