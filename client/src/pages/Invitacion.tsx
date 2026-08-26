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
  // El logo de la tienda encabeza la invitación
  const logo = settings?.["store_logo_dark_url"] || settings?.["store_logo_url"] || "";
  const imagenMedia = settings?.["invitacion_media_image"] ?? "";
  const imagenCierre = settings?.["invitacion_cierre_image"] ?? "";
  const imagenPrevia = settings?.["invitacion_previa_image"] ?? "";

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
      <div className="pointer-events-none fixed inset-0 z-0">
        {fondoGeneral && (
          <img src={fondoGeneral} alt="" className="h-full w-full object-cover opacity-30" />
        )}
        {/* El mismo ambiente del hero, extendido a toda la página: el
            resplandor magenta y el degradado negro dejan de repetirse por
            sección y pasan a ser el fondo continuo del documento. */}
        <div
          className="inv-portal absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(229,0,125,0.45) 0%, rgba(120,0,70,0.2) 40%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />
        {/* Auroras moradas: dos velos anchos y difusos que ondulan muy lento
            por detrás de todo. Van en modo "screen" para que sumen luz en vez
            de tapar, como una aurora real. */}
        <div className="inv-aurora inv-aurora-1" />
        <div className="inv-aurora inv-aurora-2" />

        {/* Partículas: puntos de luz que suben despacio. Son 14 elementos con
            animación CSS — sin lienzo ni JavaScript, así que no consumen. */}
        <div className="inv-particulas">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className={`inv-p inv-p-${i + 1}`} />
          ))}
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-[#050507] via-[#050507]/55 to-[#050507]" />
      </div>
      <div className="relative z-10">
      <style>{`
        /* El portal: un resplandor magenta que respira detrás del título.
           Solo se anima transform y opacity, así que no cuesta rendimiento. */
        @keyframes inv-portal {
          0%, 100% { transform: translate3d(0,0,0) scale(1);    opacity: 0.55; }
          50%      { transform: translate3d(0,-3%,0) scale(1.18); opacity: 0.9; }
        }
        .inv-portal { animation: inv-portal 12s ease-in-out infinite; will-change: transform; }

        /* ── Auroras moradas ── */
        @keyframes inv-aurora-a {
          0%   { transform: translate3d(-8%, 0, 0) rotate(-6deg) scaleY(1);    opacity: 0.35; }
          50%  { transform: translate3d(6%, -4%, 0) rotate(-2deg) scaleY(1.3); opacity: 0.6; }
          100% { transform: translate3d(-4%, 3%, 0) rotate(-8deg) scaleY(1.1); opacity: 0.4; }
        }
        @keyframes inv-aurora-b {
          0%   { transform: translate3d(6%, 4%, 0) rotate(7deg) scaleY(1.2);  opacity: 0.3; }
          50%  { transform: translate3d(-8%, -2%, 0) rotate(3deg) scaleY(0.9); opacity: 0.55; }
          100% { transform: translate3d(4%, 5%, 0) rotate(9deg) scaleY(1.25); opacity: 0.32; }
        }
        .inv-aurora {
          position: absolute;
          left: -25%;
          width: 150%;
          height: 55vh;
          filter: blur(80px);
          mix-blend-mode: screen;
          pointer-events: none;
          will-change: transform, opacity;
        }
        .inv-aurora-1 {
          top: 4%;
          background: linear-gradient(100deg, transparent 0%, rgba(150,60,255,0.5) 30%, rgba(229,0,125,0.4) 60%, transparent 100%);
          animation: inv-aurora-a 26s ease-in-out infinite alternate;
        }
        .inv-aurora-2 {
          bottom: 6%;
          background: linear-gradient(80deg, transparent 0%, rgba(120,40,220,0.45) 35%, rgba(180,50,200,0.35) 70%, transparent 100%);
          animation: inv-aurora-b 34s ease-in-out infinite alternate;
        }

        /* ── Partículas ── */
        @keyframes inv-flotar {
          0%   { transform: translate3d(0, 0, 0);            opacity: 0; }
          10%  { opacity: 0.9; }
          85%  { opacity: 0.5; }
          100% { transform: translate3d(14px, -75vh, 0);     opacity: 0; }
        }
        .inv-particulas { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .inv-p {
          position: absolute;
          bottom: -10px;
          width: 3px; height: 3px;
          border-radius: 9999px;
          background: #d98cff;
          box-shadow: 0 0 8px 2px rgba(190,110,255,0.75);
          animation: inv-flotar linear infinite;
          will-change: transform, opacity;
        }
        /* Cada punto con su posición, ritmo y retraso: sin esto se verían
           subir en formación, que delata el truco. */
        .inv-p-1  { left: 6%;  animation-duration: 19s; animation-delay: 0s;    }
        .inv-p-2  { left: 14%; animation-duration: 25s; animation-delay: 3s;   width: 2px; height: 2px; }
        .inv-p-3  { left: 22%; animation-duration: 16s; animation-delay: 7s;   }
        .inv-p-4  { left: 29%; animation-duration: 28s; animation-delay: 1.5s; width: 4px; height: 4px; }
        .inv-p-5  { left: 37%; animation-duration: 21s; animation-delay: 9s;   }
        .inv-p-6  { left: 44%; animation-duration: 24s; animation-delay: 5s;   width: 2px; height: 2px; }
        .inv-p-7  { left: 52%; animation-duration: 18s; animation-delay: 12s;  }
        .inv-p-8  { left: 59%; animation-duration: 30s; animation-delay: 2s;   }
        .inv-p-9  { left: 66%; animation-duration: 22s; animation-delay: 8s;   width: 4px; height: 4px; }
        .inv-p-10 { left: 73%; animation-duration: 17s; animation-delay: 14s;  }
        .inv-p-11 { left: 80%; animation-duration: 27s; animation-delay: 4s;   width: 2px; height: 2px; }
        .inv-p-12 { left: 87%; animation-duration: 20s; animation-delay: 10s;  }
        .inv-p-13 { left: 93%; animation-duration: 23s; animation-delay: 6s;   }
        .inv-p-14 { left: 98%; animation-duration: 26s; animation-delay: 16s;  width: 2px; height: 2px; }

        @media (prefers-reduced-motion: reduce) {
          .inv-portal, .inv-aurora, .inv-p { animation: none; }
          .inv-p { opacity: 0.5; }
        }
      `}</style>

      {/* ─── Apertura ─────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[92svh] items-center overflow-hidden px-6">
        {/* El fondo lo pone la capa general de la página (ver arriba). Aquí
            solo va la imagen propia del hero, si se cargó una. */}
        {heroImage && (
          <div className="pointer-events-none absolute inset-0">
            <img src={heroImage} alt="" className="h-full w-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#050507]/60 via-transparent to-[#050507]" />
          </div>
        )}

        <div className="relative z-10 mx-auto w-full max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e5007d]/50 bg-[#e5007d]/10 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.35em] text-[#ff45a0]"
          >
            <Sparkles size={13} /> Una invitación para ti
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            {logo ? (
              <img
                src={logo}
                alt="Isekai World"
                className="mx-auto w-full max-w-[380px] object-contain sm:max-w-[460px]"
                style={{ filter: "drop-shadow(0 0 60px rgba(229,0,125,0.5))" }}
              />
            ) : (
              // Si aún no hay logo cargado, la invitación no se ve rota
              <h1
                className="text-[clamp(2.8rem,12vw,7rem)] font-black uppercase leading-[0.85] tracking-[-0.04em]"
                style={{ textShadow: "0 0 80px rgba(229,0,125,0.45)" }}
              >
                Isekai<br />World
              </h1>
            )}
          </motion.div>

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
        <section key={b.titulo} className="mx-auto max-w-3xl px-6 py-7 sm:py-9">
          {/* Imagen que antecede a "El próximo mundo está por abrirse" */}
          {i === 1 && imagenPrevia && (
            <motion.div {...aparecer} className="mb-10 overflow-hidden rounded-3xl border border-white/10">
              <img src={imagenPrevia} alt="" className="w-full object-cover" />
            </motion.div>
          )}
          <motion.div {...aparecer}>
            <h2 className="mb-5 text-[clamp(1.6rem,5vw,2.6rem)] font-black uppercase leading-[0.95] tracking-tight">
              {b.titulo}
            </h2>
            <div className="space-y-4 text-[16px] leading-relaxed text-white/70">
              {b.parrafos.map((p, j) => <p key={j}>{p}</p>)}
            </div>
            <p className="mt-5 text-xl font-black text-[#ff45a0] sm:text-2xl">{b.cierre}</p>
          </motion.div>

          {/* Imagen entre bloques, si está cargada */}
        </section>
      ))}

      {/* ─── Cierre ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-14 sm:py-20">
        <div className="absolute inset-0">
          {imagenCierre && (
            <img src={imagenCierre} alt="" className="h-full w-full object-cover opacity-25" />
          )}
        </div>

        <motion.div {...aparecer} className="relative z-10 mx-auto max-w-2xl text-center">
          {/* El personaje encabeza el cierre: la figura y las tres frases
              funcionan como una sola imagen final. */}
          {imagenMedia && (
            <img
              src={imagenMedia}
              alt=""
              className="mx-auto mb-6 max-h-[340px] w-auto max-w-[260px] object-contain sm:max-h-[420px] sm:max-w-[300px]"
              style={{ filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.6))" }}
            />
          )}

          <div className="mb-8 space-y-1 text-[clamp(1.8rem,7vw,3.4rem)] font-black uppercase leading-[0.9] tracking-tight">
            <p>Tu personaje.</p>
            <p className="text-white/60">Tu historia.</p>
            <p className="text-[#ff45a0]">Tu mundo.</p>
          </div>

          <h2 className="mb-3 text-2xl font-black uppercase tracking-tight sm:text-3xl">
            ¿Quieres formar parte?
          </h2>
          <p className="mx-auto mb-7 max-w-md text-[15px] leading-relaxed text-white/60">
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

          <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.35em] text-white/40">
            Isekai World
          </p>
          <p className="mt-1.5 text-sm italic text-white/50">Donde los mundos cobran vida.</p>
        </motion.div>
      </section>
      </div>
    </div>
  );
}
