import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Instagram, Youtube } from "lucide-react";

const TIERS = [
  { name: "Bronce",   color: "#cd7f32", emoji: "🥉", followers: "0–5k",    multiplier: 1   },
  { name: "Plata",    color: "#c0c0c0", emoji: "🥈", followers: "5k–20k",  multiplier: 1.5 },
  { name: "Oro",      color: "#ffd700", emoji: "🥇", followers: "20k–50k", multiplier: 2   },
  { name: "Diamante", color: "#b9f2ff", emoji: "💎", followers: "50k–200k",multiplier: 3   },
  { name: "Platino",  color: "#e8e8e8", emoji: "👑", followers: "200k+",   multiplier: 5   },
];

const STEPS = [
  { n: "01", title: "Postúlate",          desc: "Rellena el formulario con tus datos y redes sociales. Revisamos cada solicitud manualmente." },
  { n: "02", title: "Recibe tu kit",      desc: "Si eres aprobado, recibes gratis un kit de bienvenida con productos Isekai World." },
  { n: "03", title: "Completa retos",     desc: "Publica contenido, haz reels, participa en eventos. Cada actividad aprobada suma tickets." },
  { n: "04", title: "Canjea descuentos",  desc: "Usa tus tickets para obtener códigos de descuento del 10% al 50% en la tienda." },
];

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} className="fill-current">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  );
}

export default function CosplayLanding() {
  const [offsetY, setOffsetY] = useState(0);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const { data: cosplayers = [] } = trpc.cosplay.getApprovedCosplayers.useQuery();
  const { data: siteSettings } = trpc.settings.getAll.useQuery();

  useEffect(() => {
    const h = () => setOffsetY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const heroImage = siteSettings?.["cosplay_hero_image"] ?? "";
  const ctaImage  = siteSettings?.["cosplay_cta_image"]  ?? "";

  return (
    <div className="min-h-screen bg-[#0d0d0d] overflow-x-hidden">

      {/* ── 1. Hero full-bleed parallax ── */}
      <section className="relative h-[90vh] overflow-hidden flex items-end pb-20">
        <div
          className="absolute inset-0 bg-[#111]"
          style={{ transform: `translateY(${offsetY * 0.4}px)`, willChange: "transform" }}
        >
          {heroImage ? (
            <img src={heroImage} className="w-full h-full object-cover opacity-60" alt="" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] via-[#222] to-[#0d0d0d]" />
          )}
        </div>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)" }}
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 px-6 lg:px-20 max-w-5xl"
        >
          <p className="text-xs tracking-[0.35em] uppercase text-[#e5007d] mb-5 font-medium">Isekai World</p>
          <h1 className="text-6xl sm:text-7xl lg:text-[108px] font-black text-white leading-[0.92] tracking-tight">
            Cosplay<br />
            <span className="text-[#e5007d]">Guild</span>
          </h1>
          <p className="text-[#ccc] text-lg mt-6 max-w-xl leading-relaxed">
            Representa la marca. Gana tickets. Canjea descuentos.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/cosplay/apply">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 bg-[#e5007d] text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors"
              >
                Quiero ser representante →
              </motion.button>
            </Link>
            <Link href="/cosplay/guild">
              <button className="inline-flex items-center gap-2 border border-[#444] text-[#ccc] px-8 py-4 rounded-full font-bold text-sm hover:border-white hover:text-white transition-colors">
                Ver cosplayers
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── 2. Cómo funciona — lista con hover ── */}
      <section className="bg-[#0d0d0d]">
        <div className="px-6 lg:px-20 pt-20 pb-8">
          <p className="text-xs tracking-[0.3em] uppercase text-[#e5007d] mb-3 font-medium">El proceso</p>
          <h2 className="text-3xl lg:text-5xl font-black text-white">Cómo funciona</h2>
        </div>
        <div>
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="group relative border-t border-[#222] cursor-default overflow-hidden"
              onMouseEnter={() => setHoveredStep(i)}
              onMouseLeave={() => setHoveredStep(null)}
            >
              <div
                className="absolute inset-0 bg-[#e5007d] transition-opacity duration-500"
                style={{ opacity: hoveredStep === i ? 0.06 : 0 }}
              />
              {/* Móvil */}
              <div className="relative lg:hidden py-7 px-6">
                <div className="flex items-center gap-6 mb-2">
                  <span className="text-xs text-[#555] font-mono w-6 shrink-0">{s.n}</span>
                  <span className="text-xl font-black text-white group-hover:text-[#e5007d] transition-colors duration-300">{s.title}</span>
                </div>
                <p className="text-sm text-[#888] leading-relaxed pl-12">{s.desc}</p>
              </div>
              {/* Desktop */}
              <div className="hidden lg:flex items-center justify-between py-7 px-20">
                <div className="flex items-center gap-10">
                  <span className="text-xs text-[#555] font-mono w-6 shrink-0">{s.n}</span>
                  <span className="text-4xl font-black text-white group-hover:text-[#e5007d] transition-colors duration-300">{s.title}</span>
                </div>
                <span className="text-sm text-[#888] max-w-[280px] text-right leading-relaxed">{s.desc}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-[#222]" />
        </div>
      </section>

      {/* ── 3. Tiers ── */}
      <section className="py-24 bg-[#111]">
        <div className="px-6 lg:px-20 mb-12">
          <p className="text-xs tracking-[0.3em] uppercase text-[#e5007d] mb-3 font-medium">Niveles</p>
          <h2 className="text-3xl lg:text-5xl font-black text-white">Tu tier, tus beneficios</h2>
        </div>
        <div className="px-6 lg:px-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-[#1a1a1a] rounded-2xl p-6 border-t-4"
                style={{ borderColor: tier.color }}
              >
                <span className="text-3xl mb-3 block">{tier.emoji}</span>
                <h3 className="text-white font-black text-xl mb-1">{tier.name}</h3>
                <p className="text-[#888] text-xs mb-4">{tier.followers} seguidores</p>
                <p className="font-black text-sm" style={{ color: tier.color }}>×{tier.multiplier} tickets</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Cosplayers aliados ── */}
      {cosplayers.length > 0 && (
        <section className="py-24 bg-[#0d0d0d]">
          <div className="px-6 lg:px-20 mb-12">
            <p className="text-xs tracking-[0.3em] uppercase text-[#e5007d] mb-3 font-medium">La comunidad</p>
            <h2 className="text-3xl lg:text-5xl font-black text-white">Cosplayers aliados</h2>
          </div>
          <div className="px-6 lg:px-20">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {cosplayers.slice(0, 10).map((cp: any, i: number) => {
                const tier = TIERS.find(t => t.name.toLowerCase() === (cp.tier ?? 'bronce')) ?? TIERS[0];
                return (
                  <motion.div
                    key={cp.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link href={`/cosplay/guild/${cp.id}`}>
                      <div className="group cursor-pointer text-center">
                        <div className="relative w-20 h-20 mx-auto mb-3">
                          <div
                            className="w-20 h-20 rounded-full overflow-hidden border-2"
                            style={{ borderColor: tier.color }}
                          >
                            {cp.photo
                              ? <img src={cp.photo} alt={cp.artisticName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              : <div className="w-full h-full bg-[#222] flex items-center justify-center text-2xl font-black" style={{ color: tier.color }}>{cp.artisticName[0]}</div>
                            }
                          </div>
                          <CheckCircle2 size={16} className="absolute -bottom-0.5 -right-0.5 text-[#e5007d] bg-[#0d0d0d] rounded-full" />
                        </div>
                        <p className="text-white font-bold text-sm group-hover:text-[#e5007d] transition-colors">{cp.artisticName}</p>
                        <span className="text-xs font-bold capitalize" style={{ color: tier.color }}>{cp.tier ?? 'Bronce'}</span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            {cosplayers.length > 10 && (
              <div className="text-center mt-12">
                <Link href="/cosplay/guild">
                  <button className="border border-[#444] text-[#ccc] px-8 py-3 rounded-full text-sm font-semibold hover:border-[#e5007d] hover:text-white transition-colors">
                    Ver todos los cosplayers →
                  </button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 5. CTA full-bleed ── */}
      <section className="relative h-[60vh] overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[#111]">
          {ctaImage
            ? <img src={ctaImage} className="w-full h-full object-cover opacity-40" alt="" />
            : <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#050505]" />
          }
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 100%)" }} />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 text-center px-6 max-w-3xl"
        >
          <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
            "De fan para fan.<br />
            <span className="text-[#e5007d]">De cosplayer para cosplayer."</span>
          </p>
          <Link href="/cosplay/apply">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mt-10 inline-block bg-[#e5007d] text-white px-10 py-4 rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors"
            >
              Únete ahora →
            </motion.button>
          </Link>
        </motion.div>
      </section>

    </div>
  );
}
