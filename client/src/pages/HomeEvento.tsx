import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Gamepad2, Users, Sparkles, Store, ArrowRight, ShoppingBag, Ticket,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import AvisoPropiedadIntelectual from "@/components/AvisoPropiedadIntelectual";
import { useSEO } from "@/hooks/useSEO";
import { useAntiSpam } from "@/hooks/useAntiSpam";

/**
 * Portada del sitio, centrada en Isekai World Fest.
 *
 * El evento pasa a ser la cara de la marca y la tienda vive en /tienda. Los
 * contenidos se cuentan como expectativa: se nombra lo que habrá sin revelar
 * detalles, para que la curiosidad haga el trabajo.
 */

const ZONAS = [
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
];

export default function HomeEvento() {
  const { data: settings } = trpc.settings.getAll.useQuery();
  const heroImg = settings?.["worldfest_hero_image"] ?? "";
  const teaserImg = settings?.["worldfest_teaser_image"] ?? "";

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

      {/* ── Portada ── */}
      <section className="relative flex min-h-[88svh] items-center overflow-hidden">
        {heroImg && (
          <img
            src={heroImg}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/70 via-[#0a0a0a]/60 to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl"
          >
            <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-[#5db4ff]">
              [ Próximamente ]
            </p>
            <h1 className="mb-5 text-4xl font-black leading-[1.05] sm:text-6xl lg:text-7xl">
              Isekai
              <br />
              World Fest
            </h1>
            <p className="mb-9 max-w-xl text-base leading-relaxed text-[#b4c6d8] sm:text-lg">
              Dos días para cruzar a otro mundo. Torneos, cosplay, experiencias
              que no vas a ver en otro sitio y las marcas que mueven esta cultura.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/world-fest"
                className="inline-flex items-center gap-2 rounded-xl bg-[#e5007d] px-7 py-4 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
              >
                <Ticket size={17} /> Ya tengo mi entrada
              </Link>
              <Link
                href="/tienda"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-7 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                <ShoppingBag size={17} /> Ver la tienda
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Qué habrá ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-16 lg:py-28">
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#5db4ff]">
          [ Qué te vas a encontrar ]
        </p>
        <h2 className="mb-4 text-3xl font-black sm:text-5xl">
          Cuatro zonas.
          <br />
          <span className="text-[#e5007d]">Un solo mundo.</span>
        </h2>
        <p className="mb-12 max-w-2xl text-[15px] leading-relaxed text-[#9db8d4]">
          Todavía no lo contamos todo. Sí podemos adelantarte por dónde va a ir la cosa.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {ZONAS.map((z, i) => {
            const Icono = z.icono;
            return (
              <motion.div
                key={z.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative overflow-hidden rounded-2xl border p-7 transition-colors"
                style={{
                  borderColor: `${z.color}33`,
                  background: `linear-gradient(150deg, ${z.color}0f, rgba(10,10,10,0.6))`,
                }}
              >
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: `${z.color}1f`, border: `1px solid ${z.color}44` }}
                >
                  <Icono size={22} style={{ color: z.color }} />
                </div>

                <h3 className="mb-2 text-xl font-black text-white">{z.titulo}</h3>
                <p className="mb-3 text-sm font-semibold" style={{ color: z.color }}>
                  {z.frase}
                </p>
                <p className="text-sm leading-relaxed text-[#9db8d4]">{z.detalle}</p>
              </motion.div>
            );
          })}
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
