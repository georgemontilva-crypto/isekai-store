import { useState } from "react";
import { motion } from "framer-motion";
import {
  Swords, Sparkles, Users, Store, Theater, Mic, Globe2, Gamepad2,
  Trophy, Lock, MapPin, Calendar, Star, ChevronLeft, ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useSEO } from "@/hooks/useSEO";
import { useAntiSpam } from "@/hooks/useAntiSpam";
import AvisoPropiedadIntelectual from "@/components/AvisoPropiedadIntelectual";

/**
 * Isekai World Fest — landing del evento.
 *
 * El orden vende la experiencia antes que los datos prácticos: primero se
 * despierta la curiosidad, luego se explica la mecánica de rangos, y solo al
 * final aparecen fecha y lugar.
 *
 * Casi todo se cuenta como expectativa. Lo que no se revela sostiene el
 * interés y permite ir anunciando por partes.
 */

/** Lo que transforma el recinto — «El mundo ha cambiado» */
const TRANSFORMACION = [
  {
    icono: Swords,
    titulo: "Decoración total",
    texto: "El evento será transformado de principio a fin para crear una experiencia visual inspirada en el universo de Solo Leveling.",
    color: "#a78bfa",
  },
  {
    icono: Star,
    titulo: "Personajes a tamaño real",
    texto: "Personajes y elementos icónicos convertidos en piezas físicas para que puedas encontrarlos, fotografiarlos y vivirlos de cerca.",
    color: "#fbbf24",
  },
  {
    icono: Sparkles,
    titulo: "Experiencias inmersivas",
    texto: "Zonas diseñadas para que no solamente las observes. Las vivas.",
    color: "#38bdf8",
  },
  {
    icono: Lock,
    titulo: "Portales y dungeons",
    texto: "Actividades y misiones repartidas por el recinto con las que ganarás EXP. Algunas se revelarán solo durante el evento.",
    color: "#f43f5e",
  },
  {
    icono: Trophy,
    titulo: "El Sistema",
    texto: "Tu entrada no será solamente un boleto. Será el comienzo de tu progreso.",
    color: "#e5007d",
  },
];

/** Áreas del festival — «Explora el Fest» */
const AREAS = [
  { icono: Gamepad2, titulo: "Zona Gamer", texto: "Competencias, videojuegos, desafíos y experiencias para demostrar tus habilidades.", color: "#5db4ff" },
  { icono: Users, titulo: "Fan Zone", texto: "Un espacio creado para quienes viven el anime, manga, cosplay, gaming y la cultura geek.", color: "#e5007d" },
  { icono: Sparkles, titulo: "Experiencias inmersivas", texto: "Cruza las puertas. Entra en nuevos mundos. Algunas tendrás que descubrirlas por ti mismo.", color: "#a78bfa" },
  { icono: Store, titulo: "Stands comerciales", texto: "Tiendas, coleccionables, productos exclusivos, arte, impresión 3D y mucho más.", color: "#fbbf24" },
  { icono: Theater, titulo: "Obra teatral", texto: "Una historia creada para cobrar vida frente a ti.", color: "#f43f5e" },
  { icono: Mic, titulo: "Presentaciones en vivo", texto: "Música, espectáculo, performance y momentos que convertirán el escenario en otra dimensión.", color: "#4ade80" },
  { icono: Globe2, titulo: "Invitados internacionales", texto: "Voces, talentos y creadores que llegarán desde diferentes partes del mundo.", color: "#7dd8ff" },
];

/** La escala de rangos, con su nombre dentro del Sistema */
const RANGOS = [
  { r: "E", nombre: "Despertado",     desc: "Comienzas tu aventura.",                      color: "#8a8a9c" },
  { r: "D", nombre: "Explorador",     desc: "Empiezas a descubrir el mundo.",              color: "#4ade80" },
  { r: "C", nombre: "Cazador",        desc: "Tus primeras grandes misiones.",              color: "#38bdf8" },
  { r: "B", nombre: "Élite",          desc: "Las cosas empiezan a ponerse serias.",        color: "#a78bfa" },
  { r: "A", nombre: "Élite superior", desc: "Solo los más dedicados llegarán hasta aquí.", color: "#fbbf24" },
  { r: "S", nombre: "El Despertado",  desc: "El rango máximo.",                            color: "#f43f5e" },
];

/**
 * Flechas de un carril. Solo en escritorio: en teléfono se desliza con el
 * dedo y unos botones ahí estorbarían.
 */
function FlechasCarril({ id }: { id: string }) {
  const mover = (dir: number) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <>
      <button
        onClick={() => mover(-1)}
        aria-label="Anterior"
        className="absolute -left-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0d0620]/90 text-white/70 shadow-xl backdrop-blur transition-colors hover:border-[#a78bfa]/60 hover:text-white lg:flex"
      >
        <ChevronLeft size={19} />
      </button>
      <button
        onClick={() => mover(1)}
        aria-label="Siguiente"
        className="absolute -right-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0d0620]/90 text-white/70 shadow-xl backdrop-blur transition-colors hover:border-[#a78bfa]/60 hover:text-white lg:flex"
      >
        <ChevronRight size={19} />
      </button>
    </>
  );
}

export default function HomeEvento() {
  const { data: settings } = trpc.settings.getAll.useQuery();
  const heroBg = settings?.["wf_hero_bg"] ?? settings?.["worldfest_hero_image"] ?? "";
  /** Video de fondo opcional: queda como textura, apenas perceptible */
  const heroVideo = settings?.["wf_hero_video"] ?? "";
  const premioImg = settings?.["wf_premio_image"] ?? "";

  const [email, setEmail] = useState("");
  const [suscrito, setSuscrito] = useState(false);
  const antiSpam = useAntiSpam();
  const suscribir = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => { setSuscrito(true); setEmail(""); },
  });

  useSEO({
    title: "Isekai World Fest 2027 — El Sistema ha despertado",
    description:
      "14 y 15 de agosto de 2027, Palacio de Eventos de Venezuela, Maracaibo. Dos días donde el anime, los videojuegos y el cosplay cobran vida.",
    url: "https://isekaiworld.co/evento",
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

  const irALista = () =>
    document.getElementById("lista-acceso")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-[#06040d] text-white">

      {/* El entorno se tiñe del color del rango actual: un golpe fuerte al
          ascender y después un tinte suave que permanece. */}
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
            className="lp-ventana lp-anuncio relative w-full max-w-sm overflow-hidden p-8 text-center"
            onClick={e => e.stopPropagation()}
            style={{
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
              Notificación
            </p>
            <p className="lp-linea-2 mb-7 text-sm text-[#b8e6ff]">Has subido de rango</p>

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
              RANGO {ascensoDemo} · {rangoDe(xpDemo).nombre.toUpperCase()}
            </p>

            {ascensoDemo === "S" && (
              <div className="lp-linea-4 mt-4 rounded-lg border border-[#f43f5e]/40 bg-[#f43f5e]/10 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#f43f5e]">
                  Rango máximo
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#ffd0d8]">
                  En el evento, llegar aquí te mete en la{" "}
                  <strong className="text-white">batalla final</strong> por la pieza.
                </p>
              </div>
            )}

            <button
              onClick={() => setAscensoDemo(null)}
              className="lp-linea-4 mt-7 w-full rounded-lg border border-[#38bdf8]/50 bg-[#38bdf8]/10 font-mono text-sm font-bold uppercase tracking-widest text-[#7dd8ff] transition-colors hover:bg-[#38bdf8]/20"
              style={{ minHeight: 48 }}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* ═══ 1. EL SISTEMA HA DESPERTADO ═══ */}
      <section className="relative flex min-h-[92svh] items-center overflow-hidden">
        {/* El video manda si está puesto; la imagen queda de respaldo mientras
            carga o si el navegador no puede reproducirlo. */}
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#06040d] via-[#06040d]/40 to-transparent" />
        {/* Textura técnica del sistema: rejilla fina y bloques dispersos */}
        <div className="ev-grid absolute inset-0 opacity-70" />
        <div className="ev-pixels absolute inset-0" />
        <div className="ev-halo absolute -left-40 top-1/4 h-[520px] w-[520px]" />

        {/* Partículas de energía ascendentes */}
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

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <p className="mb-5 font-mono text-[11px] font-bold uppercase tracking-[0.4em] text-[#a78bfa]">
              Isekai World Fest 2027
            </p>

            <h1 className="ev-display mb-6 text-[38px] leading-[0.95] sm:text-6xl lg:text-7xl">
              EL SISTEMA
              <br />
              <span className="iw-texto-sistema">HA DESPERTADO.</span>
            </h1>

            <p className="mb-9 max-w-2xl text-base leading-relaxed text-[#b9b0d4] sm:text-lg">
              Maracaibo está a punto de convertirse en un mundo donde el anime, los
              videojuegos, el cosplay y la cultura geek cobran vida.
            </p>

            <div className="mb-9 flex flex-col gap-2 font-mono text-sm text-[#d8d0ea] sm:flex-row sm:gap-8">
              <span className="flex items-center gap-2">
                <Calendar size={15} className="text-[#a78bfa]" /> 14 — 15 AGOSTO 2027
              </span>
              <span className="flex items-center gap-2">
                <MapPin size={15} className="text-[#a78bfa]" /> Maracaibo, Venezuela
              </span>
            </div>

            <div className="mb-8 flex flex-wrap gap-3">
              <button
                onClick={irALista}
                className="ev-notch ev-press bg-[#e5007d] px-8 py-4 text-sm font-bold uppercase tracking-wider text-white"
              >
                Conseguir mi boleto
              </button>
              <a
                href="#el-mundo"
                className="ev-notch ev-press border border-white/20 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white hover:bg-white/10"
              >
                Descubrir el Fest
              </a>
            </div>

            <p className="font-mono text-xs text-[#7c6fa0]">
              ¿Cuál será tu rango?{" "}
              <span className="text-[#a78bfa]">E → D → C → B → A → S</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ 2. BIENVENIDO AL ISEKAI ═══ */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="ev-display mb-8 text-[26px] leading-[1.08] sm:text-5xl">
            NO VIENES A VER EL MUNDO.
            <br />
            <span className="text-[#a78bfa]">VIENES A ENTRAR EN ÉL.</span>
          </h2>

          <p className="mx-auto mb-5 max-w-3xl text-[15px] leading-relaxed text-[#b9b0d4] sm:text-base">
            Isekai World Fest es una experiencia de entretenimiento inmersiva que
            transforma el evento en un universo inspirado en el anime, los videojuegos,
            el cosplay y la cultura geek.
          </p>
          <p className="mx-auto mb-10 max-w-3xl text-[15px] leading-relaxed text-[#b9b0d4] sm:text-base">
            Durante dos días, el Palacio de Eventos se transformará por completo para
            crear una experiencia donde cada visitante podrá explorar, jugar, competir,
            descubrir personajes, vivir historias y formar parte del mundo.
          </p>

          <p className="text-xl font-black text-white sm:text-2xl">
            Aquí no eres espectador.{" "}
            <span className="text-[#e5007d]">Eres parte de la historia.</span>
          </p>
        </motion.div>
      </section>

      <div className="ev-linea" />

      {/* ═══ 3. EL MUNDO HA CAMBIADO ═══ */}
      <section id="el-mundo" className="ev-grid relative border-y border-white/[0.06] bg-white/[0.015] px-6 py-20 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            [ El mundo ha cambiado ]
          </p>
          <h2 className="ev-display mb-12 text-[26px] leading-[1.05] sm:text-5xl">La escala de lo que viene</h2>

          {/* Carril horizontal: con tarjetas más grandes se lee mejor cada
              bloque que apretándolos en una rejilla. En escritorio se pasa con
              flechas; en teléfono, deslizando. */}
          <div className="relative">
            <FlechasCarril id="carril-mundo" />
            <div id="carril-mundo" className="iw-areas-carril flex gap-5 overflow-x-auto pb-3">
            {TRANSFORMACION.map((x, i) => {
              const Icono = x.icono;
              return (
                <motion.div
                  key={x.titulo}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.07 }}
                  className="ev-notch iw-card-grande border p-8 sm:p-10"
                  style={{
                    borderColor: `${x.color}2e`,
                    background: `linear-gradient(150deg, ${x.color}0d, rgba(6,4,13,0.7))`,
                  }}
                >
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
                </motion.div>
              );
            })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 4. EXPLORA EL FEST ═══ */}
      <section className="px-6 py-20 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            [ Explora el Fest ]
          </p>
          <h2 className="ev-display mb-3 text-[26px] leading-[1.05] sm:text-5xl">Las grandes áreas</h2>
          <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-[#a99fc4]">
            Todavía no lo contamos todo. Algunas cosas es mejor descubrirlas allí.
          </p>

          {/* En teléfono se desliza: con siete áreas, apilarlas sería eterno */}
          <div className="relative">
            <FlechasCarril id="carril-areas" />
            <div id="carril-areas" className="iw-areas-carril flex gap-5 overflow-x-auto pb-3">
            {AREAS.map(a => {
              const Icono = a.icono;
              return (
                <div
                  key={a.titulo}
                  className="ev-notch iw-card-grande relative overflow-hidden border p-8 sm:p-10"
                  style={{
                    borderColor: `${a.color}2a`,
                    background: `linear-gradient(160deg, ${a.color}0f, rgba(6,4,13,0.8))`,
                  }}
                >
                  <Icono size={28} style={{ color: a.color }} className="mb-6" />
                  <h3 className="ev-card-title mb-3 uppercase text-white">
                    {a.titulo}
                  </h3>
                  <p className="mb-6 text-[15px] leading-relaxed text-[#a99fc4]">{a.texto}</p>
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.25em]"
                    style={{ color: `${a.color}aa` }}
                  >
                    Próximamente
                  </p>
                </div>
              );
            })}
            </div>
          </div>

          <p className="mt-8 text-center font-mono text-sm leading-relaxed text-[#7c6fa0]">
            Algunos nombres todavía no pueden ser revelados.
            <br />
            <span className="text-[#a78bfa]">El Sistema aún está desbloqueándolos.</span>
          </p>
        </div>
      </section>

      <div className="ev-linea" />

      {/* ═══ 5 y 6. LA MECÁNICA Y LOS RANGOS ═══ */}
      <section className="ev-pixels relative border-y border-[#a78bfa]/20 bg-gradient-to-b from-[#0d0620] to-[#06040d] px-6 py-20 lg:px-16 lg:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            [ Sistema activo ]
          </p>
          <h2 className="mb-6 text-center text-3xl font-black sm:text-5xl">
            TU BOLETO ES EL COMIENZO.
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-[15px] leading-relaxed text-[#b9b0d4]">
            Al entrar al Isekai World Fest, todos comenzarán su aventura en Rango E.
            Completa misiones, participa en actividades y descubre experiencias para
            conseguir EXP y subir de rango.
          </p>

          {/* ── Simulación ──
              Pruébalo aquí mismo: es más convincente ver el ascenso que leer
              una explicación. Todo ocurre en el navegador, no se guarda nada. */}
          <div className="mx-auto mb-16 max-w-lg">
            <div className="lp-ventana p-7 sm:p-9">
              <p className="mb-6 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#7dd8ff]">
                Pruébalo ahora
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
                  Tu rango
                </p>
              </div>

              <div className="mb-2 flex items-end justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-[#7dd8ff]">
                  Experiencia
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
                  ? <>Faltan <strong className="text-white">{siguienteDemo.faltan} EXP</strong> para el rango {siguienteDemo.rango}</>
                  : "Has alcanzado el rango máximo"}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => sumarXp(80)}
                  disabled={xpDemo >= 500}
                  className="flex-1 rounded-lg border border-[#38bdf8]/50 bg-[#38bdf8]/10 font-mono text-xs font-bold uppercase tracking-widest text-[#7dd8ff] transition-colors hover:bg-[#38bdf8]/20 disabled:opacity-30"
                  style={{ minHeight: 48 }}
                >
                  +80 EXP
                </button>
                <button
                  onClick={() => { setXpDemo(0); setAscensoDemo(null); }}
                  className="rounded-lg border border-white/15 px-5 font-mono text-xs font-bold uppercase tracking-widest text-[#5f7f96]"
                  style={{ minHeight: 48 }}
                >
                  Reiniciar
                </button>
              </div>

              <p className="mt-5 text-center text-[11px] leading-relaxed text-[#5f7f96]">
                Así funcionará durante el evento. En el festival, cada EXP hay que ganarlo.
              </p>
            </div>
          </div>

          {/* Detalle de cada rango */}
          <div className="flex flex-col gap-2.5">
            {RANGOS.map((x, i) => (
              <motion.div
                key={x.r}
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="ev-notch flex items-center gap-4 border p-4 sm:gap-6 sm:p-5"
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
              </motion.div>
            ))}
          </div>

          <p className="mt-14 text-center text-2xl font-black sm:text-4xl">
            ¿SERÁS CAPAZ DE LLEGAR A <span className="text-[#f43f5e]">RANGO S</span>?
          </p>
        </div>
      </section>

      <div className="ev-linea" />

      {/* ═══ 7. EL PREMIO ═══ */}
      <section className="px-6 py-20 lg:px-16 lg:py-24">
        <div className="ev-notch mx-auto max-w-5xl overflow-hidden border border-[#f43f5e]/25 bg-gradient-to-br from-[#1a0a14] to-[#06040d]">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <Trophy size={30} className="mb-6 text-[#f43f5e]" />
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#f43f5e]">
                [ Recompensa final ]
              </p>
              <h2 className="mb-5 text-2xl font-black leading-tight sm:text-4xl">
                UNA RECOMPENSA DIGNA
                <br />
                DE UN RANGO S
              </h2>
              <p className="mb-7 text-[15px] leading-relaxed text-[#c9a8b8]">
                Los cazadores que logren alcanzar Rango S entrarán en la batalla final por
                una recompensa única.
              </p>

              {/* El premio es la pieza, no el dinero: se nombra primero para
                  que no se lea como un premio en efectivo. */}
              <div className="mb-7 rounded-xl border border-[#f43f5e]/30 bg-[#f43f5e]/[0.07] p-5">
                <p className="text-lg font-black leading-tight text-white sm:text-xl">
                  Una pieza decorativa a tamaño real
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#c9a8b8]">
                  Creada especialmente para el Isekai World Fest y parte de la decoración
                  del evento.
                </p>
                <p className="mt-4 font-mono text-sm uppercase tracking-wider text-[#f43f5e]">
                  Avaluada en más de $1.500 USD
                </p>
              </div>

              <p className="font-mono text-sm leading-relaxed text-[#7c6fa0]">
                ¿Qué pieza será?
                <br />
                <span className="text-[#f43f5e]">Eso todavía pertenece al Sistema.</span>
              </p>
            </div>

            {/* La pieza, apenas insinuada */}
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
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#2a0a1a] to-[#06040d]">
                  <Lock size={44} className="text-[#f43f5e]/25" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-[11px] uppercase tracking-[0.4em] text-white/40">
                  Clasificado
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 10. INVITADOS ═══ */}
      <section className="px-6 pb-20 lg:px-16 lg:pb-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            [ Invitados ]
          </p>
          <h2 className="ev-display mb-4 text-[26px] leading-[1.05] sm:text-5xl">LOS CAZADORES ESTÁN LLEGANDO</h2>
          <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-[#a99fc4]">
            Creadores, cosplayers, artistas, invitados especiales y talentos internacionales
            serán parte del Isekai World Fest.
          </p>

          <div className="relative">
            <FlechasCarril id="carril-invitados" />
            <div id="carril-invitados" className="iw-areas-carril flex gap-5 overflow-x-auto pb-3">
            {[1, 2, 3].map(n => {
              const nombre = settings?.[`wf_invitado_${n}_nombre`];
              const foto = settings?.[`wf_invitado_${n}_foto`];
              return (
                <div key={n} className="ev-notch iw-card-grande overflow-hidden border border-white/[0.07] bg-[#0d0620]">
                  <div className="relative" style={{ aspectRatio: "1/1" }}>
                    {foto ? (
                      <img src={foto} alt={nombre ?? ""} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Lock size={26} className="text-white/10" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#7c6fa0]">
                      Invitado #{String(n).padStart(2, "0")}
                    </p>
                    <p className="mt-1.5 font-black text-white">{nombre || "[ Próximamente ]"}</p>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </section>

      <div className="ev-linea" />

      {/* ═══ 11. FECHA Y LUGAR ═══ */}
      <section className="border-y border-[#a78bfa]/20 bg-gradient-to-b from-[#0d0620] to-[#06040d] px-6 py-20 text-center lg:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="ev-display mb-12 text-[26px] leading-[1.05] sm:text-5xl">¿CUÁNDO SE ABRE EL PORTAL?</h2>

          <div className="mb-10 grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#a78bfa]/25 bg-[#a78bfa]/[0.06] p-7">
              <Calendar size={22} className="mx-auto mb-4 text-[#a78bfa]" />
              <p className="text-xl font-black text-white sm:text-2xl">14 — 15</p>
              <p className="mt-1 font-mono text-sm uppercase tracking-wider text-[#b9b0d4]">
                Agosto 2027
              </p>
            </div>
            <div className="rounded-2xl border border-[#a78bfa]/25 bg-[#a78bfa]/[0.06] p-7">
              <MapPin size={22} className="mx-auto mb-4 text-[#a78bfa]" />
              <p className="text-base font-black leading-tight text-white">
                Palacio de Eventos de Venezuela
              </p>
              <p className="mt-1 font-mono text-sm text-[#b9b0d4]">Maracaibo, Venezuela</p>
            </div>
          </div>

          <p className="mb-10 text-[15px] leading-relaxed text-[#b9b0d4]">
            Dos días.
            <br />
            Un mundo completamente transformado.
          </p>

          <button
            onClick={irALista}
            className="ev-notch ev-press bg-[#e5007d] px-10 py-5 text-sm font-bold uppercase tracking-wider text-white"
          >
            Conseguir boletos
          </button>
        </div>
      </section>

      {/* ═══ Lista de acceso ═══ */}
      <section id="lista-acceso" className="px-6 py-20 lg:py-24">
        <div className="mx-auto max-w-xl text-center">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            [ Lista de acceso ]
          </p>
          <h2 className="mb-4 text-2xl font-black sm:text-4xl">Sé el primero en cruzar</h2>
          <p className="mb-8 text-[15px] leading-relaxed text-[#a99fc4]">
            Las entradas todavía no están a la venta. Deja tu correo y te avisamos antes
            que a nadie cuando se abran.
          </p>

          {suscrito ? (
            <p className="rounded-xl border border-[#a78bfa]/40 bg-[#a78bfa]/10 px-6 py-4 text-sm text-[#c4b5fd]">
              Estás dentro. Te escribimos cuando el portal se abra.
            </p>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                suscribir.mutate({ email: email.trim(), ...antiSpam.fields() });
              }}
              className="flex gap-2"
            >
              <antiSpam.HoneyPot />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#a78bfa]"
                style={{ minHeight: 54 }}
              />
              <button
                type="submit"
                disabled={suscribir.isPending}
                className="shrink-0 rounded-xl bg-[#e5007d] px-7 text-sm font-bold text-white disabled:opacity-50"
                style={{ minHeight: 54 }}
              >
                {suscribir.isPending ? "..." : "Avísame"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ═══ 12. PREPÁRATE PARA EL DESPERTAR ═══ */}
      <section className="relative overflow-hidden border-t border-white/[0.06] px-6 py-24 text-center lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-[#06040d] via-[#0d0620] to-[#06040d]" />
        <div className="relative z-10 mx-auto max-w-3xl">
          <p className="ev-display text-[24px] leading-[1.12] sm:text-4xl lg:text-5xl">
            TODOS COMIENZAN EN <span className="text-[#8a8a9c]">RANGO E</span>.
            <br />
            PERO NO TODOS LLEGARÁN A <span className="text-[#f43f5e]">S</span>.
          </p>
          <p className="mt-8 font-mono text-sm uppercase tracking-[0.3em] text-[#7c6fa0]">
            ¿Estás preparado?
          </p>
        </div>
      </section>

      <AvisoPropiedadIntelectual />
    </div>
  );
}
