import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Gamepad2, Users, Sparkles, Store, ArrowRight, Lock, Star, Swords, Trophy, ChevronLeft, ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import AvisoPropiedadIntelectual from "@/components/AvisoPropiedadIntelectual";
import HeroCarousel from "@/components/HeroCarousel";
import { useSEO } from "@/hooks/useSEO";
import { useAntiSpam } from "@/hooks/useAntiSpam";

/**
 * Portada del sitio, centrada en Isekai World Fest.
 *
 * El evento pasa a ser la cara de la marca y la tienda vive en /tienda. Los
 * contenidos se cuentan como expectativa: se nombra lo que habrá sin revelar
 * detalles, para que la curiosidad haga el trabajo.
 */

/** Misiones todavía no reveladas: el hueco es parte del mensaje */
const MISIONES = Array.from({ length: 6 }, (_, i) => ({
  rank: "?",
  tier: i < 3 ? "azul" : "morado",
  title: "Misión sin revelar",
  body: "El Sistema todavía no libera esta información.",
}));

const ZONAS = [
  {
    id: "redcarpet",
    icono: Star,
    titulo: "Red Carpet",
    frase: "La alfombra roja de los cosplayers.",
    detalle: "Desfile, fotógrafos y un espacio reservado para quienes llevan meses preparando su personaje.",
    color: "#f43f5e",
    destacada: true,
  },
  {
    id: "gamer",
    icono: Gamepad2,
    titulo: "Zona Gamer",
    frase: "Torneos, consolas libres y retos por equipos.",
    detalle: "Habrá competición de verdad, con premios que anunciaremos más adelante.",
    color: "#5db4ff",
  },
  {
    id: "fan",
    icono: Users,
    titulo: "Fan Zone",
    frase: "El punto de encuentro de la comunidad.",
    detalle: "Cosplayers, concursos, photocalls y actividades donde el protagonista eres tú.",
    color: "#e5007d",
  },
  {
    id: "inmersivas",
    icono: Sparkles,
    titulo: "Experiencias inmersivas",
    frase: "Entrar a otro mundo, literalmente.",
    detalle: "Estamos montando algo que preferimos que descubras allí. No diremos más.",
    color: "#a78bfa",
  },
  {
    id: "stands",
    icono: Store,
    titulo: "Stands comerciales",
    frase: "Marcas, artistas y tiendas aliadas.",
    detalle: "Props, figuras, arte original y piezas que no vas a encontrar en otro sitio.",
    color: "#fbbf24",
  },
  // Tres zonas por revelar: el hueco también cuenta la historia
  { id: "x1", icono: Lock, titulo: "Por revelar", frase: "Zona clasificada.", detalle: "Se anunciará más cerca de la fecha.", color: "#5f7f96", oculta: true },
  { id: "x2", icono: Lock, titulo: "Por revelar", frase: "Zona clasificada.", detalle: "Se anunciará más cerca de la fecha.", color: "#5f7f96", oculta: true },
  { id: "x3", icono: Lock, titulo: "Por revelar", frase: "Zona clasificada.", detalle: "Se anunciará más cerca de la fecha.", color: "#5f7f96", oculta: true },
];

export default function HomeEvento() {
  const { data: settings } = trpc.settings.getAll.useQuery();
  const heroImg = settings?.["worldfest_hero_image"] ?? "";
  const teaserImg = settings?.["worldfest_teaser_image"] ?? "";
  const introBg = settings?.["wf_intro_bg"] ?? settings?.["worldfest_hero_image"] ?? "";

  /**
   * Carrusel propio del evento: sus slides se configuran aparte de los de la
   * tienda, para poder anunciar cosas distintas en cada portada.
   */
  const slidesEvento = [1, 2, 3]
    .map(n => ({
      image:      settings?.[`wf_slide_${n}_image`]    ?? "",
      title:      settings?.[`wf_slide_${n}_title`]    ?? "",
      subtitle:   settings?.[`wf_slide_${n}_subtitle`] ?? "",
      buttonText: settings?.[`wf_slide_${n}_cta`]      ?? "",
      buttonUrl:  settings?.[`wf_slide_${n}_cta_url`]  ?? "/world-fest",
    }))
    .filter(s => s.image);

  const [suscrito, setSuscrito] = useState(false);
  const [email, setEmail] = useState("");
  const antiSpam = useAntiSpam();
  const suscribir = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => { setSuscrito(true); setEmail(""); },
  });

  useSEO({
    title: "Isekai World Fest — El evento de anime, gaming y cosplay",
    description:
      "Zona Gamer, Fan Zone, experiencias inmersivas y stands comerciales. Prepárate para cruzar a otro mundo.",
    url: "https://isekaiworld.co/",
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* El carrusel abre la página: es lo primero que se ve. */}
      <div className="pt-4">
        <HeroCarousel slides={slidesEvento} />
      </div>

      {/* ── Presentación del evento ──
          Con imagen de fondo propia: el texto necesita algo detrás para no
          quedar flotando sobre negro. */}
      <section className="relative overflow-hidden px-6 py-20 lg:px-16 lg:py-24">
        {introBg && (
          <>
            <img src={introBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[#0a0a0a]/80" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative z-10 mx-auto max-w-3xl text-center"
        >
          <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-[#5db4ff]">
            [ Próximamente ]
          </p>
          <h1 className="mb-5 text-4xl font-black leading-[1.05] sm:text-6xl">
            Isekai World Fest
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#b4c6d8] sm:text-lg">
            Dos días para cruzar a otro mundo. Un evento tematizado de principio a fin,
            donde no vienes a mirar: vienes a subir de rango.
          </p>
        </motion.div>
      </section>

      {/* ── El sistema ──
          Es lo que diferencia al evento: no se viene a mirar, se viene a
          subir de rango. Se cuenta con la estética de las ventanas de
          sistema de Solo Leveling. */}
      <section className="border-y border-[#38bdf8]/15 bg-gradient-to-b from-[#040a12] to-[#0a0a0a] px-6 py-20 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#7dd8ff]">
            [ Sistema activo ]
          </p>
          <h2 className="mb-4 text-center text-3xl font-black sm:text-5xl">
            Todos empiezan en <span className="text-[#8a8a9c]">rango E</span>
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-[15px] leading-relaxed text-[#9db8d4]">
            El festival funciona como un sistema de progresión. Completa actividades por
            las zonas, acumula experiencia y sube de rango. Solo quienes lleguen a{" "}
            <strong className="text-[#f43f5e]">rango S</strong> entran en el sorteo final.
          </p>

          {/* Escala de rangos */}
          <div className="mb-12 flex items-center justify-center gap-2 sm:gap-4">
            {[
              { r: "E", c: "#8a8a9c" }, { r: "D", c: "#4ade80" }, { r: "C", c: "#38bdf8" },
              { r: "B", c: "#a78bfa" }, { r: "A", c: "#fbbf24" }, { r: "S", c: "#f43f5e" },
            ].map((x, i, arr) => (
              <div key={x.r} className="flex items-center gap-2 sm:gap-4">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono text-base font-black sm:h-14 sm:w-14 sm:text-xl"
                  style={{
                    borderColor: x.c,
                    color: x.c,
                    boxShadow: x.r === "S" ? `0 0 24px ${x.c}66` : "none",
                  }}
                >
                  {x.r}
                </div>
                {i < arr.length - 1 && (
                  <span className="text-[#2a3f52]">›</span>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icono: Swords, t: "Farmea experiencia", d: "Cada actividad completada suma puntos a tu pase. Las compras en stands aliados dan más." },
              { icono: Sparkles, t: "Zonas tematizadas", d: "El recinto entero está ambientado. No es un salón con stands: es otro mundo." },
              { icono: Trophy, t: "Llega a rango S", d: "El sorteo final es solo para quienes lleguen arriba. No se rifa entre todos." },
            ].map(x => {
              const Icono = x.icono;
              return (
                <div key={x.t} className="rounded-2xl border border-[#38bdf8]/20 bg-[#38bdf8]/[0.04] p-6">
                  <Icono size={22} className="mb-4 text-[#7dd8ff]" />
                  <p className="mb-2 font-black text-white">{x.t}</p>
                  <p className="text-sm leading-relaxed text-[#9db8d4]">{x.d}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-10 text-center text-sm text-[#5f7f96]">
            Habrá invitados especiales. Todavía no decimos quiénes.
          </p>
        </div>
      </section>

      {/* ── Misiones sin revelar ──
          Se traen de la página del evento: las tarjetas bloqueadas cuentan la
          expectativa mejor que cualquier texto. */}
      {/* ─── Misiones ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#5db4ff]">
          [ Misiones detectadas ]
        </p>
        <h2 className="max-w-2xl text-[clamp(1.8rem,4.5vw,3rem)] font-black uppercase leading-[0.95] tracking-tight text-white">
          Lo que hay del otro lado
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#8fb0d6]">
          Todavía no revelamos la fecha. Sí podemos decir a qué te vas a enfrentar cuando la puerta se abra del todo.
        </p>

        {/* Carril a ancho completo de pantalla: se sale del contenedor para que
            las tarjetas lleguen hasta el borde y no parezca que se cortan.
            El relleno izquierdo replica el margen del contenedor, así la
            primera tarjeta queda alineada con el título de arriba. */}
        <div className="wf-rail relative mt-9">
          <button
            onClick={() => document.getElementById("wf-misiones")?.scrollBy({ left: -280, behavior: "smooth" })}
            aria-label="Misiones anteriores"
            className="wf-rail-arrow absolute -left-5 top-1/2 z-20 hidden -translate-y-1/2 lg:flex"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => document.getElementById("wf-misiones")?.scrollBy({ left: 280, behavior: "smooth" })}
            aria-label="Más misiones"
            className="wf-rail-arrow absolute -right-5 top-1/2 z-20 hidden -translate-y-1/2 lg:flex"
          >
            <ChevronRight size={16} />
          </button>

          <div
            id="wf-misiones"
            className="flex gap-4 overflow-x-auto pb-2"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {MISIONES.map((m, i) => {
              const morada = m.tier === "morado";
              return (
                <div
                  key={i}
                  className={`wf-window wf-scan wf-locked wf-mision shrink-0 rounded-sm ${morada ? "wf-window-morado" : ""}`}
                >
                  <span className={`wf-corner -left-px -top-px border-l-2 border-t-2 ${morada ? "wf-corner-morado" : ""}`} />
                  <span className={`wf-corner -right-px -top-px border-r-2 border-t-2 ${morada ? "wf-corner-morado" : ""}`} />
                  <span className={`wf-corner -bottom-px -left-px border-b-2 border-l-2 ${morada ? "wf-corner-morado" : ""}`} />
                  <span className={`wf-corner -bottom-px -right-px border-b-2 border-r-2 ${morada ? "wf-corner-morado" : ""}`} />

                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.28em] ${morada ? "text-[#b98cff]" : "text-[#5db4ff]"}`}>
                      Bloqueada
                    </span>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-sm border font-black ${
                        morada
                          ? "border-[#b98cff]/30 bg-[#b98cff]/10 text-[#b98cff]/70"
                          : "border-[#5db4ff]/25 bg-[#5db4ff]/5 text-[#5db4ff]/60"
                      }`}
                    >
                      {m.rank}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-black uppercase leading-tight tracking-tight text-white/35">
                    {m.title}
                  </h3>
                  <p className={`mt-3 text-sm leading-relaxed ${morada ? "text-[#b0a0d6]/45" : "text-[#8fb0d6]/45"}`}>
                    {m.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Anticipo visual ── */}
      {teaserImg && (
        <section className="px-4 pb-20 sm:px-6 lg:px-16">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl">
            <img src={teaserImg} alt="" className="w-full object-cover" style={{ maxHeight: 480 }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 p-7 sm:p-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#5db4ff]">
                [ Se viene ]
              </p>
              <p className="mt-2 max-w-md text-lg font-black leading-tight sm:text-2xl">
                Todavía falta lo mejor por contar.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Aviso previo ── */}
      <section className="border-y border-white/[0.07] bg-white/[0.02] px-6 py-20 lg:py-24">
        <div className="mx-auto max-w-xl text-center">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#5db4ff]">
            [ Lista de acceso ]
          </p>
          <h2 className="mb-4 text-2xl font-black sm:text-4xl">
            Entérate antes que nadie
          </h2>
          <p className="mb-8 text-[15px] leading-relaxed text-[#9db8d4]">
            Deja tu correo y te avisamos de la fecha, la sede y las entradas antes de
            que se anuncie públicamente.
          </p>

          {suscrito ? (
            <p className="rounded-xl border border-[#5db4ff]/40 bg-[#5db4ff]/10 px-6 py-4 text-sm text-[#b4c6d8]">
              Listo. Te escribimos cuando haya novedades.
            </p>
          ) : (
            <form
              onSubmit={e => { e.preventDefault(); suscribir.mutate({ email: email.trim(), ...antiSpam.fields() }); }}
              className="flex gap-2"
            >
              <antiSpam.HoneyPot />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#5db4ff]"
                style={{ minHeight: 52 }}
              />
              <button
                type="submit"
                disabled={suscribir.isPending}
                className="shrink-0 rounded-xl bg-[#e5007d] px-6 text-sm font-bold text-white disabled:opacity-50"
                style={{ minHeight: 52 }}
              >
                {suscribir.isPending ? "..." : "Avísame"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Puente a la tienda ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-16 lg:py-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 sm:p-12 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#e5007d]">
              [ Mientras tanto ]
            </p>
            <h2 className="mb-3 text-2xl font-black sm:text-3xl">
              Props y piezas de cosplay a medida
            </h2>
            <p className="text-[15px] leading-relaxed text-[#9db8d4]">
              Diseñamos y fabricamos figuras y accesorios para que tu personaje se vea
              como lo imaginaste. Entra a la tienda y mira lo que hacemos.
            </p>
          </div>
          <Link
            href="/tienda"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-7 py-4 text-sm font-bold text-[#111] transition-transform hover:scale-[1.03]"
          >
            Ir a la tienda <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <AvisoPropiedadIntelectual />
    </div>
  );
}
