import { useState } from "react";
import { motion } from "framer-motion";
import {
  Swords, Sparkles, Users, Store, Theater, Mic, Globe2, Gamepad2,
  Trophy, Lock, MapPin, Calendar, Star,
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
    texto: "Lugares ocultos, desafíos y experiencias que irán revelándose progresivamente.",
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

/** Etiquetas de la galería conceptual */
const GALERIA = ["GATE 01", "DUNGEON", "HUNTER AREA", "SYSTEM", "UNKNOWN", "PORTAL"];

export default function HomeEvento() {
  const { data: settings } = trpc.settings.getAll.useQuery();
  const heroBg = settings?.["wf_hero_bg"] ?? settings?.["worldfest_hero_image"] ?? "";
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

  const irALista = () =>
    document.getElementById("lista-acceso")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-[#06040d] text-white">

      {/* ═══ 1. EL SISTEMA HA DESPERTADO ═══ */}
      <section className="relative flex min-h-[92svh] items-center overflow-hidden">
        {heroBg && (
          <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#06040d]/75 via-[#0d0620]/70 to-[#06040d]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06040d] via-[#06040d]/40 to-transparent" />

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

            <h1 className="mb-6 text-4xl font-black leading-[0.98] sm:text-6xl lg:text-7xl">
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
                className="rounded-xl bg-[#e5007d] px-8 py-4 text-sm font-bold uppercase tracking-wider text-white transition-transform hover:scale-[1.03]"
              >
                Conseguir mi boleto
              </button>
              <a
                href="#el-mundo"
                className="rounded-xl border border-white/20 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
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
          <h2 className="mb-8 text-3xl font-black leading-tight sm:text-5xl">
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

      {/* ═══ 3. EL MUNDO HA CAMBIADO ═══ */}
      <section id="el-mundo" className="border-y border-white/[0.06] bg-white/[0.015] px-6 py-20 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            [ El mundo ha cambiado ]
          </p>
          <h2 className="mb-12 text-3xl font-black sm:text-5xl">La escala de lo que viene</h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TRANSFORMACION.map((x, i) => {
              const Icono = x.icono;
              return (
                <motion.div
                  key={x.titulo}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.07 }}
                  className="rounded-2xl border p-7"
                  style={{
                    borderColor: `${x.color}2e`,
                    background: `linear-gradient(150deg, ${x.color}0d, rgba(6,4,13,0.7))`,
                  }}
                >
                  <div
                    className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: `${x.color}1f`, border: `1px solid ${x.color}44` }}
                  >
                    <Icono size={20} style={{ color: x.color }} />
                  </div>
                  <h3 className="mb-2.5 text-lg font-black uppercase tracking-tight text-white">
                    {x.titulo}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#a99fc4]">{x.texto}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ 4. EXPLORA EL FEST ═══ */}
      <section className="px-6 py-20 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            [ Explora el Fest ]
          </p>
          <h2 className="mb-3 text-3xl font-black sm:text-5xl">Las grandes áreas</h2>
          <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-[#a99fc4]">
            Todavía no lo contamos todo. Algunas cosas es mejor descubrirlas allí.
          </p>

          {/* En teléfono se desliza: con siete áreas, apilarlas sería eterno */}
          <div className="iw-areas-carril flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
            {AREAS.map(a => {
              const Icono = a.icono;
              return (
                <div
                  key={a.titulo}
                  className="iw-area-card relative overflow-hidden rounded-2xl border p-7"
                  style={{
                    borderColor: `${a.color}2a`,
                    background: `linear-gradient(160deg, ${a.color}0f, rgba(6,4,13,0.8))`,
                  }}
                >
                  <Icono size={24} style={{ color: a.color }} className="mb-5" />
                  <h3 className="mb-2.5 text-lg font-black uppercase tracking-tight text-white">
                    {a.titulo}
                  </h3>
                  <p className="mb-5 text-sm leading-relaxed text-[#a99fc4]">{a.texto}</p>
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

          <p className="mt-8 text-center font-mono text-sm leading-relaxed text-[#7c6fa0]">
            Algunos nombres todavía no pueden ser revelados.
            <br />
            <span className="text-[#a78bfa]">El Sistema aún está desbloqueándolos.</span>
          </p>
        </div>
      </section>

      {/* ═══ 5 y 6. LA MECÁNICA Y LOS RANGOS ═══ */}
      <section className="border-y border-[#a78bfa]/20 bg-gradient-to-b from-[#0d0620] to-[#06040d] px-6 py-20 lg:px-16 lg:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            [ Sistema activo ]
          </p>
          <h2 className="mb-6 text-center text-3xl font-black sm:text-5xl">
            TU BOLETO ES EL COMIENZO.
          </h2>
          <p className="mx-auto mb-14 max-w-2xl text-center text-[15px] leading-relaxed text-[#b9b0d4]">
            Al entrar al Isekai World Fest, todos los visitantes comenzarán su aventura en
            Rango E. Durante el evento podrás completar misiones, participar en actividades
            y descubrir experiencias para conseguir EXP y aumentar tu rango.
          </p>

          {/* Escala visual */}
          <div className="mb-14 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            {RANGOS.map((x, i) => (
              <div key={x.r} className="flex items-center gap-2 sm:gap-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 font-mono text-lg font-black sm:h-16 sm:w-16 sm:text-2xl"
                  style={{
                    borderColor: x.color,
                    color: x.color,
                    boxShadow: x.r === "S" ? `0 0 30px ${x.color}77` : `0 0 12px ${x.color}22`,
                  }}
                >
                  {x.r}
                </div>
                {i < RANGOS.length - 1 && <span className="text-[#3a2f52]">›</span>}
              </div>
            ))}
          </div>
          <p className="mb-16 text-center font-mono text-sm text-[#7c6fa0]">
            ¿Hasta dónde podrás llegar?
          </p>

          {/* Detalle de cada rango */}
          <div className="flex flex-col gap-2.5">
            {RANGOS.map((x, i) => (
              <motion.div
                key={x.r}
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="flex items-center gap-4 rounded-xl border p-4 sm:gap-6 sm:p-5"
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
            ¿SERÁS CAPAZ DE <span className="text-[#f43f5e]">LLEGAR A S</span>?
          </p>
        </div>
      </section>

      {/* ═══ 7. EL PREMIO ═══ */}
      <section className="px-6 py-20 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#f43f5e]/25 bg-gradient-to-br from-[#1a0a14] to-[#06040d]">
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

              <div className="mb-7 rounded-xl border border-[#f43f5e]/30 bg-[#f43f5e]/[0.07] p-5">
                <p className="text-2xl font-black text-[#f43f5e] sm:text-3xl">+$1.500 USD</p>
                <p className="mt-2 text-sm leading-relaxed text-[#c9a8b8]">
                  Una pieza tamaño real de nuestra decoración, creada especialmente para el
                  Isekai World Fest.
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

      {/* ═══ 8. LAS MISIONES NO HAN SIDO REVELADAS ═══ */}
      <section className="border-y border-white/[0.06] bg-white/[0.015] px-6 py-20 text-center lg:py-24">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            [ Misiones ]
          </p>
          <h2 className="mb-8 text-3xl font-black sm:text-4xl">
            EL SISTEMA NO TE LO CONTARÁ TODO.
          </h2>

          <div className="mb-10 space-y-3 text-[15px] leading-relaxed text-[#b9b0d4]">
            <p>Algunas misiones estarán disponibles desde el momento en que entres.</p>
            <p>Otras aparecerán durante el evento.</p>
            <p>Algunas dependerán de lo que hagas.</p>
            <p className="text-[#a78bfa]">Y algunas… tendrás que descubrirlas tú mismo.</p>
          </div>

          <button
            onClick={irALista}
            className="rounded-xl border border-[#a78bfa]/50 bg-[#a78bfa]/10 px-8 py-4 text-sm font-bold uppercase tracking-wider text-[#c4b5fd] transition-colors hover:bg-[#a78bfa]/20"
          >
            Quiero subir de rango
          </button>
        </div>
      </section>

      {/* ═══ 9. EXPERIENCIA VISUAL ═══ */}
      <section className="px-6 py-20 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-3 text-3xl font-black sm:text-5xl">
            NO TE IMAGINES EL MUNDO.
            <br />
            <span className="text-[#a78bfa]">MÍRALO.</span>
          </h2>
          <p className="mb-10 text-[15px] text-[#a99fc4]">
            Primeras imágenes conceptuales de lo que estamos construyendo.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {GALERIA.map((etiqueta, i) => {
              const img = settings?.[`wf_galeria_${i + 1}`];
              return (
                <div
                  key={etiqueta}
                  className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0d0620]"
                  style={{ aspectRatio: "4/5" }}
                >
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Lock size={22} className="text-white/10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06040d] via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/55">
                    {etiqueta}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ 10. INVITADOS ═══ */}
      <section className="px-6 pb-20 lg:px-16 lg:pb-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#a78bfa]">
            [ Invitados ]
          </p>
          <h2 className="mb-4 text-3xl font-black sm:text-5xl">LOS CAZADORES ESTÁN LLEGANDO</h2>
          <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-[#a99fc4]">
            Creadores, cosplayers, artistas, invitados especiales y talentos internacionales
            serán parte del Isekai World Fest.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map(n => {
              const nombre = settings?.[`wf_invitado_${n}_nombre`];
              const foto = settings?.[`wf_invitado_${n}_foto`];
              return (
                <div key={n} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0620]">
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
      </section>

      {/* ═══ 11. FECHA Y LUGAR ═══ */}
      <section className="border-y border-[#a78bfa]/20 bg-gradient-to-b from-[#0d0620] to-[#06040d] px-6 py-20 text-center lg:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-3xl font-black sm:text-5xl">¿CUÁNDO SE ABRE EL PORTAL?</h2>

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
            className="rounded-xl bg-[#e5007d] px-10 py-5 text-sm font-bold uppercase tracking-wider text-white transition-transform hover:scale-[1.03]"
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
          <p className="text-2xl font-black leading-tight sm:text-4xl lg:text-5xl">
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
