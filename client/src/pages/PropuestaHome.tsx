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
import ManaParticulas from "@/components/fest/ManaParticulas";
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

/* ───────────── Piezas pequeñas ───────────── */

/** Título de capítulo: un bloque de color lo barre y queda escrito, con cursor */
function Titulo({ children, claro = false }: { children: React.ReactNode; claro?: boolean }) {
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
    <h2 ref={ref} className={`pk-titulo ${claro ? "pk-titulo-claro" : ""} ${on ? "pk-titulo-on" : ""}`}>
      <span>{children}</span>
    </h2>
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
  // Tipografías de la propuesta: condensada para títulos y monoespaciada para textos
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap";
    document.head.appendChild(l);
    return () => l.remove();
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
    ["pk-sistema", en ? "SYSTEM" : "SISTEMA"],
    ["pk-concepto", en ? "CONCEPT" : "CONCEPTO"],
    ["pk-mundo", en ? "WORLD" : "EL MUNDO"],
    ["pk-areas", en ? "AREAS" : "ÁREAS"],
    ["pk-invitados", en ? "GUESTS" : "INVITADOS"],
    ["pk-rangos", en ? "RANKS" : "RANGOS"],
    ["pk-raid", "RAID"],
    ["pk-premio", en ? "REWARD" : "PREMIO"],
    ["pk-acceso", en ? "ACCESS" : "ACCESO"],
  ] as const), [en]);
  const ir = (id: string) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  /* El mundo: pestaña abierta */
  const [mundoSel, setMundoSel] = useState(0);

  /* Áreas: visor con anterior / siguiente y «ver todo» */
  const [areaSel, setAreaSel] = useState(0);
  const [verTodo, setVerTodo] = useState(false);
  const area = AREAS[areaSel];
  const AreaIcono = area.icono;
  const sigArea = AREAS[(areaSel + 1) % AREAS.length];

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
    const abierto = menu || verTodo || ficha !== null;
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menu, verTodo, ficha]);

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
      <section className="pk-hero">
        <div className="pk-hero-arte" aria-hidden="true">
          {heroBg && <img src={heroBg} alt="" className="pk-hero-fondo" />}
          <span className="pk-hero-luz" />
          {figura.estado !== "cargando" && figura.src && <img src={figura.src} alt="" className={`pk-hero-figura ${lista ? "pk-entra" : ""}`} />}
          <span className="pk-hero-velo" />
        </div>
        <ManaParticulas className="absolute inset-0 z-[1] h-full w-full" cantidad={36} />

        <button className="pk-insignia" onClick={() => ir("pk-rangos")}>
          <span className="pk-mono">{e.etiquetaAnio}</span>
          <b>LEVEL PASS</b>
          <ChevronRight size={12} />
        </button>

        <div className={`pk-hero-pie ${lista ? "pk-entra-pie" : ""}`}>
          {logo
            ? <img src={logo} alt="Isekai World" className="pk-hero-logo" />
            : <p className="pk-cond pk-hero-logo-txt">ISEKAI WORLD</p>}
          <p className="pk-lema">{e.heroTitulo1} <span>{e.heroTitulo2}</span></p>
          <p className="pk-mono pk-hero-dato">{e.heroFecha} &nbsp;/&nbsp; {e.heroLugar}</p>
        </div>
      </section>

      {/* ═══ 001 SISTEMA ═══ */}
      <section id="pk-sistema" className="pk-sec pk-oscuro">
        <div className="pk-ancho">
          <Titulo>{capitulos[0][1]}</Titulo>
          <div className="pk-ventana">
            <Visor />
            <p className="pk-mono pk-ventana-cab">! {e.v2.sistemaAlerta}</p>
            <p className="pk-texto mb-7">{e.heroTexto}</p>
            <p className="pk-mono pk-etq mb-3">{e.v2.cuentaEtiqueta}</p>
            <Cuenta et={[e.v2.dias, e.v2.horas, e.v2.minutos, e.v2.segundos]} />
            <p className="pk-mono mt-6 text-[12px] text-[#8b84a3]">{e.tuRango} <b className="text-[#6ff0ff]">E → D → C → B → A → S</b></p>
          </div>
        </div>
      </section>

      {/* ═══ 002 CONCEPTO ═══ */}
      <section id="pk-concepto" className="pk-sec pk-concepto">
        {mundoBg && <img src={mundoBg} alt="" loading="lazy" className="pk-concepto-fondo" aria-hidden="true" />}
        <div className="pk-ancho relative">
          <Titulo>{capitulos[1][1]}</Titulo>
          <p className="pk-cond pk-concepto-titular">{e.bienvenidaT1}<br /><span>{e.bienvenidaT2}</span></p>
          <div className="pk-concepto-cuerpo">
            <p className="pk-texto">{e.bienvenidaP1}</p>
            <p className="pk-texto">{e.bienvenidaP2}</p>
            <p className="pk-texto pk-concepto-frase">{e.bienvenidaFrase1} <b>{e.bienvenidaFrase2}</b></p>
          </div>
        </div>
      </section>

      {/* ═══ 003 EL MUNDO: pestañas verticales numeradas ═══ */}
      <section id="pk-mundo" className="pk-sec pk-oscuro">
        <div className="pk-ancho">
          <Titulo>{capitulos[2][1]}</Titulo>
          <p className="pk-mono pk-etq mb-5">{e.mundoEtiqueta} — {e.mundoTitulo}</p>
          <div className="pk-pestanas">
            {MUNDO.map((m, i) => {
              const Ico = m.icono;
              const abierta = i === mundoSel;
              return (
                <button key={i} className={`pk-pestana ${abierta ? "pk-pestana-on" : ""}`} style={{ ["--c" as string]: m.color }} onClick={() => setMundoSel(i)} aria-expanded={abierta}>
                  <span className="pk-pestana-num pk-mono">{n3(i + 1)}</span>
                  <span className="pk-pestana-arte"><Ico size={abierta ? 54 : 22} /></span>
                </button>
              );
            })}
          </div>
          <ul className="pk-lista-mundo">
            {MUNDO.map((m, i) => (
              <li key={i} className={i === mundoSel ? "pk-lm-on" : ""} style={{ ["--c" as string]: m.color }}>
                <button onClick={() => setMundoSel(i)}>
                  <span className="pk-mono pk-lm-num">{n3(i + 1)}</span>
                  <span className="min-w-0 flex-1 text-left">
                    <b className="pk-cond">{m.titulo}</b>
                    <span className="pk-mono">{m.texto}</span>
                  </span>
                  <span className="pk-mas pk-mono">{i === mundoSel ? "—" : "MORE+"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ═══ 004 ÁREAS: visor tipo «System» sobre papel milimetrado ═══ */}
      <section id="pk-areas" className="pk-sec pk-claro">
        <div className="pk-ancho">
          <div className="flex items-end justify-between gap-3">
            <Titulo claro>{capitulos[3][1]}</Titulo>
            <button className="pk-ver-todo pk-mono" onClick={() => setVerTodo(true)}><LayoutGrid size={14} /> {en ? "VIEW ALL" : "VER TODO"}</button>
          </div>
          <p className="pk-mono mb-4 text-[13px] text-[#4b4460]">{e.exploraTexto}</p>
          <p className="pk-area-sub"><span className="pk-mono">{n3(areaSel + 1)}</span> <b className="pk-cond">{area.titulo}</b></p>
          <div className="pk-area-visor" style={{ ["--c" as string]: area.color }} key={areaSel}>
            <Visor />
            <span className="pk-area-rejilla" />
            <AreaIcono size={92} className="pk-area-icono" />
            <span className="pk-mono pk-area-gate">{e.v2.gate} {String(areaSel + 1).padStart(2, "0")}</span>
            <span className="pk-mono pk-area-pronto">{e.proximamente}</span>
          </div>
          <div className="pk-area-texto pk-mono">{area.texto}</div>
          <div className="pk-navbar">
            <button onClick={() => setAreaSel((areaSel - 1 + AREAS.length) % AREAS.length)}><ChevronLeft size={16} /> {en ? "PREV" : "ANTERIOR"}</button>
            <button onClick={() => setAreaSel((areaSel + 1) % AREAS.length)}>{en ? "NEXT" : "SIGUIENTE"} <ChevronRight size={16} /></button>
            <span className="pk-navbar-sig"><span className="pk-mono">{n3(((areaSel + 1) % AREAS.length) + 1)}</span> {sigArea.titulo}</span>
          </div>
        </div>
      </section>

      {verTodo && (
        <div className="pk-panel" onClick={() => setVerTodo(false)}>
          <div className="pk-panel-caja" onClick={ev => ev.stopPropagation()}>
            {AREAS.map((a, i) => {
              const Ico = a.icono;
              return (
                <button key={i} className="pk-panel-fila" onClick={() => { setAreaSel(i); setVerTodo(false); }}>
                  <span className="pk-panel-mini" style={{ ["--c" as string]: a.color }}><Ico size={22} /></span>
                  <span className="text-left"><span className="pk-mono block text-[10px] text-[#8b84a3]">{n3(i + 1)}</span><b className="pk-cond text-[20px] leading-tight">{a.titulo}</b></span>
                </button>
              );
            })}
            <button className="pk-panel-x" onClick={() => setVerTodo(false)} aria-label={en ? "Close" : "Cerrar"}><X size={18} /></button>
          </div>
        </div>
      )}

      {/* ═══ 005 INVITADOS: fichas de personaje ═══ */}
      <section id="pk-invitados" className="pk-sec pk-claro">
        <div className="pk-ancho">
          <Titulo claro>{capitulos[4][1]}</Titulo>
          <p className="pk-mono pk-etq-claro mb-2">● {e.invitadosTransmision}</p>
          <p className="pk-cond mb-3 text-[30px] leading-[0.95] text-[#0b0814] sm:text-5xl">{e.invitadosTitulo}</p>
          <p className="pk-mono mb-6 text-[13px] leading-relaxed text-[#4b4460]">{e.invitadosTexto}</p>
          <div className="mb-4 flex items-center gap-3">
            <span className="pk-mono text-[11px] font-bold text-[#3b3450]">{en ? "CHANGE VIEW:" : "CAMBIAR VISTA:"}</span>
            <button className={`pk-vista ${!vistaRejilla ? "pk-vista-on" : ""}`} onClick={() => setVistaRejilla(false)} aria-label="Carril"><Square size={14} /></button>
            <button className={`pk-vista ${vistaRejilla ? "pk-vista-on" : ""}`} onClick={() => setVistaRejilla(true)} aria-label="Rejilla"><LayoutGrid size={14} /></button>
          </div>

          {!vistaRejilla ? (
            <div className="pk-cartas">
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
          <Titulo>{capitulos[5][1]}</Titulo>
          <p className="pk-mono pk-etq mb-2">{e.sistemaEtiqueta}</p>
          <p className="pk-cond mb-3 text-[30px] leading-[0.95] text-white sm:text-5xl">{e.sistemaTitulo}</p>
          <p className="pk-texto mb-7">{e.sistemaTexto}</p>

          <div className="pk-sim">
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

          <div className="pk-metas">
            {RANGOS.map((x, i) => (
              <div key={x.r} className={`pk-meta ${xp >= UMBRALES[i] && i > 0 ? "pk-meta-ok" : ""}`} style={{ ["--c" as string]: x.color }}>
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
          <p className="pk-cond mt-12 text-center text-[34px] leading-none text-white sm:text-6xl">{e.serasCapaz1} <span className="text-[#ff3d5e]">{e.serasCapaz2}</span>?</p>
        </div>
      </section>

      {/* ═══ 007 RAID ═══ */}
      <div id="pk-raid" className="pk-raid">
        <RaidJefe
          t={e.v2}
          imagen={s("wf_raid_jefe")}
          recompensa={(en ? s("wf_raid_recompensa_en") : s("wf_raid_recompensa"))}
          recompensaImg={s("wf_raid_recompensa_img")}
          numero={<span className="pk-mono text-[10px] text-[#8b84a3]">007</span>}
        />
      </div>

      {/* ═══ 008 PREMIO: ficha técnica ═══ */}
      <section id="pk-premio" className="pk-sec pk-oscuro">
        <div className="pk-ancho">
          <Titulo>{capitulos[7][1]}</Titulo>
          <p className="pk-mono pk-etq mb-2">{e.premioEtiqueta}</p>
          <p className="pk-cond mb-4 text-[30px] leading-[0.95] text-white sm:text-5xl">{e.premioTitulo1} {e.premioTitulo2}</p>
          <p className="pk-texto mb-8">{e.premioTexto}</p>
          <div className="pk-premio-caja">
            {premioImg && <img src={premioImg} alt="" loading="lazy" />}
            <span className="pk-premio-candado"><Lock size={28} /></span>
            <span className="pk-mono pk-premio-clas">{e.clasificado}</span>
            <Visor />
          </div>
          <dl className="pk-spec">
            <div><dt>{en ? "Piece" : "Pieza"}</dt><dd>{e.premioPieza}</dd></div>
            <div><dt>{en ? "Details" : "Detalle"}</dt><dd>{e.premioPiezaTexto}</dd></div>
            <div><dt>{en ? "Value" : "Valor"}</dt><dd className="text-[#ff5d7a]">{e.premioValor}</dd></div>
            <div><dt>{en ? "Status" : "Estado"}</dt><dd>{e.premioQue} <b className="text-[#ff5d7a]">{e.premioSistema}</b></dd></div>
          </dl>
        </div>
      </section>

      {/* ═══ 009 ACCESO ═══ */}
      <section id="pk-acceso" className="pk-sec pk-acceso">
        <div className="pk-ancho">
          <Titulo>{capitulos[8][1]}</Titulo>
          <div className="pk-ventana">
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
