import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * INVITACIÓN — página privada a la que solo se llega escaneando el QR.
 *
 * No está en el menú ni en el mapa del sitio: quien llega aquí fue invitado,
 * y la página debe sentirse como una carta dirigida a esa persona, no como
 * una sección más de la tienda.
 *
 * Dirección visual: el portal. Fondo negro con un resplandor magenta que
 * respira detrás del título, secciones que aparecen al desplazarse, y una
 * tipografía grande que obliga a leer despacio. Las imágenes se cargan desde
 * el panel (Medios → Invitación), y si no hay ninguna la página funciona
 * igual: nunca se ve rota por una imagen faltante.
 */

const bloques = [
  {
    titulo: "¿Qué significa ser parte de Isekai World?",
    parrafos: [
      "Significa tener un espacio donde puedas mostrar tu trabajo, conectar con otros cosplayers, participar en nuestras actividades y formar parte de los eventos y experiencias que estamos preparando.",
      "Queremos construir una comunidad donde los cosplayers no sean simplemente invitados. Queremos que sean protagonistas.",
      "A través de Isekai World podrás encontrar nuevas oportunidades para participar en eventos, sesiones, actividades especiales, colaboraciones, contenido para redes sociales y experiencias creadas especialmente para nuestra comunidad.",
    ],
    cierre: "Y esto apenas comienza.",
  },
  {
    titulo: "El próximo mundo está por abrirse",
    parrafos: [
      "Durante los próximos meses estaremos construyendo una comunidad cada vez más grande de artistas, cosplayers, creadores y amantes del anime.",
      "Queremos que estés desde el principio.",
      "Si quieres formar parte de esta historia, esta es tu invitación.",
    ],
    cierre: "Bienvenido a Isekai World.",
  },
];

export default function Invitacion() {
  const { data: settings } = trpc.settings.getAll.useQuery();

  const heroImage = settings?.["invitacion_hero_image"] ?? "";
  const fondoGeneral = settings?.["invitacion_fondo_image"] ?? "";
  const imagenMedia = settings?.["invitacion_media_image"] ?? "";
  const imagenCierre = settings?.["invitacion_cierre_image"] ?? "";

  const aparecer = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div className="relative min-h-screen bg-[#050507] text-white">
      {/* Fondo de toda la página. Va fijo (no se desplaza con el scroll) para
          que una sola imagen cubra el recorrido completo sin repetirse ni
          estirarse, y con un velo oscuro encima que garantiza que el texto
          se lea sobre cualquier imagen. */}
      {fondoGeneral && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <img src={fondoGeneral} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-[#050507]/70" />
        </div>
      )}
      <div className="relative z-10">
      <style>{`
        /* El portal: un resplandor magenta que respira detrás del título.
           Solo se anima transform y opacity, así que no cuesta rendimiento. */
        @keyframes inv-portal {
          0%, 100% { transform: translate3d(0,0,0) scale(1);    opacity: 0.55; }
          50%      { transform: translate3d(0,-3%,0) scale(1.18); opacity: 0.9; }
        }
        .inv-portal { animation: inv-portal 12s ease-in-out infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .inv-portal { animation: none; } }
      `}</style>

      {/* ─── Apertura ─────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[92svh] items-center overflow-hidden px-6">
        <div className="absolute inset-0">
          {heroImage && (
            <img src={heroImage} alt="" className="h-full w-full object-cover opacity-35" />
          )}
          {/* Resplandor del portal */}
          <div
            className="inv-portal pointer-events-none absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(229,0,125,0.55) 0%, rgba(120,0,70,0.25) 40%, transparent 70%)",
              filter: "blur(70px)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050507] via-transparent to-[#050507]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e5007d]/50 bg-[#e5007d]/10 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.35em] text-[#ff45a0]"
          >
            <Sparkles size={13} /> Una invitación para ti
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="text-[clamp(2.8rem,12vw,7rem)] font-black uppercase leading-[0.85] tracking-[-0.04em]"
            style={{ textShadow: "0 0 80px rgba(229,0,125,0.45)" }}
          >
            Isekai<br />World
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto mt-9 max-w-xl space-y-4 text-[16px] leading-relaxed text-white/70 sm:text-lg"
          >
            <p>
              Hay mundos que solo existen en nuestra imaginación.
              <br />
              Y hay otros que cobran vida cuando decidimos compartirlos.
            </p>
            <p>
              Isekai World nace para reunir a quienes convierten su pasión por el anime, el manga,
              los videojuegos, el cosplay y la cultura japonesa en algo que puede ser vivido,
              compartido y recordado.
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mx-auto mt-8 max-w-lg text-lg font-bold leading-snug text-white sm:text-xl"
          >
            Por eso queremos invitarte a formar parte de nuestra comunidad de cosplayers.
            <span className="mt-2 block text-[#ff45a0]">Queremos contar contigo.</span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/60"
          >
            Queremos que tu personaje, tu creatividad y tu pasión sean parte de los mundos que
            construiremos juntos.
          </motion.p>
        </div>
      </section>

      {/* ─── Bloques ──────────────────────────────────────────────────────── */}
      {bloques.map((b, i) => (
        <section key={b.titulo} className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <motion.div {...aparecer}>
            <h2 className="mb-7 text-[clamp(1.6rem,5vw,2.6rem)] font-black uppercase leading-[0.95] tracking-tight">
              {b.titulo}
            </h2>
            <div className="space-y-5 text-[16px] leading-relaxed text-white/70">
              {b.parrafos.map((p, j) => <p key={j}>{p}</p>)}
            </div>
            <p className="mt-7 text-xl font-black text-[#ff45a0] sm:text-2xl">{b.cierre}</p>
          </motion.div>

          {/* Imagen entre bloques, si está cargada */}
          {i === 0 && imagenMedia && (
            <motion.div {...aparecer} className="mt-12 overflow-hidden rounded-3xl border border-white/10">
              <img src={imagenMedia} alt="" className="w-full object-cover" />
            </motion.div>
          )}
        </section>
      ))}

      {/* ─── Cierre ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-20 sm:py-28">
        <div className="absolute inset-0">
          {imagenCierre && (
            <img src={imagenCierre} alt="" className="h-full w-full object-cover opacity-25" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_100%_at_50%_100%,rgba(229,0,125,0.35)_0%,transparent_65%)]" />
        </div>

        <motion.div {...aparecer} className="relative z-10 mx-auto max-w-2xl text-center">
          <div className="mb-10 space-y-1 text-[clamp(1.8rem,7vw,3.4rem)] font-black uppercase leading-[0.9] tracking-tight">
            <p>Tu personaje.</p>
            <p className="text-white/60">Tu historia.</p>
            <p className="text-[#ff45a0]">Tu mundo.</p>
          </div>

          <h2 className="mb-3 text-2xl font-black uppercase tracking-tight sm:text-3xl">
            ¿Quieres formar parte?
          </h2>
          <p className="mx-auto mb-9 max-w-md text-[15px] leading-relaxed text-white/60">
            Únete a nuestra comunidad de cosplayers. La postulación toma unos minutos.
          </p>

          <Link
            href="/cosplay/apply"
            className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#e5007d] px-10 text-base font-bold text-white transition-colors hover:bg-[#c4006b]"
            style={{ minHeight: 58 }}
          >
            Quiero postularme
            <ArrowRight size={18} />
          </Link>

          <p className="mt-12 text-[11px] font-bold uppercase tracking-[0.35em] text-white/40">
            Isekai World
          </p>
          <p className="mt-1.5 text-sm italic text-white/50">Donde los mundos cobran vida.</p>
        </motion.div>
      </section>
      </div>
    </div>
  );
}
