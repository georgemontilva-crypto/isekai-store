import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Instagram, Youtube, Medal, Shield, Zap, Gem, Crown, Tag, ShoppingBag, Lock, Star, Gift } from "lucide-react";

const TIERS = [
  { name: "Bronce",   color: "#cd7f32", icon: Medal,  followers: "1K – 3K",    mult: "×1",   width: "30%"  },
  { name: "Plata",    color: "#c0c0c0", icon: Shield, followers: "3K – 6K",    mult: "×1.5", width: "45%"  },
  { name: "Oro",      color: "#ffd700", icon: Zap,    followers: "6K – 50K",   mult: "×2",   width: "60%"  },
  { name: "Diamante", color: "#7dd3fc", icon: Gem,    followers: "50K – 300K", mult: "×3",   width: "80%"  },
  { name: "Platino",  color: "#e8e8e8", icon: Crown,  followers: "300K – 1M+", mult: "×5",   width: "100%" },
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
      <section className="py-24 bg-[#0d0d0d] overflow-hidden">
        <div className="container">
          <p className="text-xs tracking-widest uppercase text-[#e5007d] mb-2 font-medium">Niveles del Guild</p>
          <h2 className="text-4xl lg:text-6xl font-black text-white mb-4">
            Cuanto más crezcas,<br />
            <span className="text-[#e5007d]">más ganas.</span>
          </h2>
          <p className="text-[#888] mb-16 max-w-xl leading-relaxed">
            Tu tier se actualiza automáticamente según tu audiencia.
            Cada nivel multiplica los tickets que ganas por actividad.
          </p>

          <div className="flex flex-col gap-3">
            {TIERS.map((tier, i) => {
              const Icon = tier.icon;
              return (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="group flex items-center gap-4"
                >
                  <div
                    className="relative h-16 lg:h-20 rounded-2xl flex items-center px-6 transition-all duration-500 group-hover:brightness-110 flex-shrink-0"
                    style={{
                      width: tier.width,
                      minWidth: "200px",
                      background: `linear-gradient(135deg, ${tier.color}22, ${tier.color}44)`,
                      border: `1px solid ${tier.color}66`,
                    }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: tier.color }} />
                    <Icon size={22} style={{ color: tier.color }} className="mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-lg leading-none">{tier.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: tier.color }}>{tier.followers} seguidores</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-2xl lg:text-3xl font-black" style={{ color: tier.color }}>{tier.mult}</span>
                    <span className="text-[#555] text-xs hidden lg:block leading-tight">tickets<br />por actividad</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="text-[#555] text-sm mt-10 border-t border-[#222] pt-6">
            El admin asigna puntos base por actividad. Tu tier multiplica ese valor automáticamente.
          </p>
        </div>
      </section>

      {/* ── 4. Recompensas ── */}
      <section className="py-24 bg-[#111]">
        <div className="container">
          <p className="text-xs tracking-widest uppercase text-[#e5007d] mb-2 font-medium">Recompensas</p>
          <h2 className="text-4xl lg:text-6xl font-black text-white mb-4">
            Tus tickets,<br />
            <span className="text-[#e5007d]">tu poder.</span>
          </h2>
          <p className="text-[#888] max-w-xl mb-16 leading-relaxed">
            Cada actividad completada suma tickets a tu billetera.
            Canjéalos en la tienda exclusiva para cosplayers aliados de Isekai World.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Códigos de descuento */}
            <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#333] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-5" style={{ background: '#e5007d', transform: 'translate(30%, -30%)' }} />
              <Tag size={32} className="text-[#e5007d] mb-4" strokeWidth={1.5} />
              <h3 className="text-white font-black text-2xl mb-2">Códigos de descuento</h3>
              <p className="text-[#888] text-sm leading-relaxed mb-6">
                Canjea tus tickets por códigos de descuento de uso único para comprar en la tienda.
                Úsalos en cualquier producto del catálogo.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { percent: '10%', tickets: 500 },
                  { percent: '20%', tickets: 1000 },
                  { percent: '30%', tickets: 2000 },
                  { percent: '50%', tickets: 5000 },
                ].map(item => (
                  <div key={item.percent} className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#222] border border-[#333]">
                    <span className="text-white font-bold text-sm">{item.percent} de descuento</span>
                    <span className="text-[#e5007d] font-black text-sm">{item.tickets.toLocaleString()} tickets</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tienda exclusiva */}
            <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#333] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-5" style={{ background: '#ffd700', transform: 'translate(30%, -30%)' }} />
              <ShoppingBag size={32} className="text-[#ffd700] mb-4" strokeWidth={1.5} />
              <h3 className="text-white font-black text-2xl mb-2">Tienda exclusiva</h3>
              <p className="text-[#888] text-sm leading-relaxed mb-6">
                Como cosplayer aliado tendrás acceso a una tienda privada con productos
                y piezas exclusivas disponibles solo para miembros del Guild.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { icon: Lock,        text: 'Acceso solo para cosplayers aprobados' },
                  { icon: Star,        text: 'Piezas y accesorios exclusivos para cosplay' },
                  { icon: Zap,         text: 'Drops y ediciones limitadas avant-première' },
                  { icon: Gift,        text: 'Descuentos permanentes en piezas de cosplay' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <item.icon size={16} className="text-[#ffd700] flex-shrink-0" strokeWidth={1.5} />
                    <span className="text-[#ccc] text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Banner CTA */}
          <div className="bg-[#0d0d0d] rounded-2xl p-8 border border-[#e5007d]/30 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-white font-black text-xl mb-1">¿Listo para empezar a ganar?</h3>
              <p className="text-[#888] text-sm">Aplica ahora y empieza a acumular tickets desde tu primera actividad.</p>
            </div>
            <Link href="/cosplay/apply" className="flex-shrink-0 bg-[#e5007d] text-white px-8 py-3 rounded-full font-bold hover:bg-[#c4006b] transition-colors whitespace-nowrap text-sm">
              Quiero ser representante
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. Cosplayers aliados ── */}
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
