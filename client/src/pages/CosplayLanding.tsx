import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { REFERRAL_TIERS } from "@shared/referral";
import { CheckCircle2, Instagram, Youtube, Medal, Shield, Zap, Gem, Crown, Tag, ShoppingBag, Lock, Star, Gift, Info, Users, Link2, Repeat, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";

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
  { n: "05", title: "Gana por referidos", desc: "Comparte tu código único con tu comunidad. Cada vez que alguien compre usándolo ganas una comisión fija en cash USD según el monto de la venta, más tickets para canjear. Sin límite de usos." },
];

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} className="fill-current">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  );
}

function CosplayersCarousel({ cosplayers }: { cosplayers: any[] }) {
  const [current, setCurrent] = useState(0);
  const itemsPerSlide = typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 4;
  const totalSlides = Math.ceil(cosplayers.slice(0, 8).length / itemsPerSlide);

  const goTo = (index: number) => setCurrent(index);
  const prev = () => setCurrent(i => (i === 0 ? totalSlides - 1 : i - 1));
  const next = () => setCurrent(i => (i === totalSlides - 1 ? 0 : i + 1));

  const visibleCosplayers = cosplayers.slice(
    current * itemsPerSlide,
    current * itemsPerSlide + itemsPerSlide
  );

  return (
    <div className="relative px-6 lg:px-20">
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {visibleCosplayers.map((cp: any) => {
          const tier = TIERS.find(t => t.name.toLowerCase() === (cp.tier ?? 'bronce')) ?? TIERS[0];
          return (
            <Link key={cp.id} href={`/cosplay/guild/${cp.username ?? cp.id}`}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="group bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden hover:border-[#e5007d] transition-colors cursor-pointer"
              >
                {/* Banner/foto superior */}
                <div className="relative h-40 overflow-hidden bg-[#222]">
                  {cp.bannerImage
                    ? <img src={cp.bannerImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    : cp.photo
                      ? <img src={cp.photo} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" alt="" />
                      : <div className="w-full h-full" style={{ background: tier.color + '22' }} />
                  }
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(26,26,26,1) 0%, transparent 60%)' }} />
                  <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full font-black"
                    style={{ background: tier.color, color: '#000' }}>
                    {(cp.tier ?? 'BRONCE').toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4 -mt-6 relative z-10">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 mb-3"
                    style={{ borderColor: tier.color }}>
                    {cp.photo
                      ? <img src={cp.photo} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full flex items-center justify-center font-black text-lg"
                          style={{ background: tier.color + '33', color: tier.color }}>
                          {cp.artisticName?.[0]}
                        </div>
                    }
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-white font-black text-sm">{cp.artisticName}</p>
                    <CheckCircle2 size={13} className="text-[#e5007d] flex-shrink-0" />
                  </div>
                  {cp.bio && (
                    <p className="text-[#888] text-xs leading-relaxed line-clamp-2">{cp.bio}</p>
                  )}
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* Navegación */}
      {totalSlides > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={prev}
            className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center hover:border-[#e5007d] transition-colors"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === current ? '20px' : '8px',
                  height: '8px',
                  background: i === current ? '#e5007d' : '#333',
                }}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center hover:border-[#e5007d] transition-colors"
          >
            <ChevronRight size={18} className="text-white" />
          </button>
        </div>
      )}
    </div>
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
          {/* El texto habla de lo que gana el cosplayer, no de lo que hace por
              la marca: la iniciativa existe para darles valor y visibilidad. */}
          <p className="text-[#ccc] text-lg mt-6 max-w-xl leading-relaxed">
            Tu personaje merece más que un aplauso.
            <span className="mt-2 block text-white">
              Un espacio donde tu trabajo se ve, se comparte y se reconoce.
            </span>
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
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

          <div className="flex items-center gap-3 bg-[#1a1a1a] border border-[#e5007d]/30 rounded-xl px-5 py-4 mb-10 max-w-xl">
            <Info size={16} className="text-[#e5007d] flex-shrink-0" />
            <p className="text-[#888] text-sm">
              <span className="text-white font-bold">Requisito mínimo:</span> necesitas al menos{" "}
              <span className="text-[#e5007d] font-bold">500 seguidores</span>{" "}
              en al menos una de tus redes sociales para postularte.
            </p>
          </div>

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

            {/* Card — Código de referido */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 relative overflow-hidden lg:col-span-2">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-5"
                style={{ background: '#ffd700', transform: 'translate(30%, -30%)' }} />
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1">
                  <Link2 size={32} className="text-[#ffd700] mb-4" />
                  <h3 className="text-white font-black text-2xl mb-2">Tu código de referido</h3>
                  <p className="text-[#888] text-sm leading-relaxed mb-4">
                    Al unirte al Guild recibirás un código único y personal. Compártelo con tu comunidad —
                    cada vez que alguien realice una compra usándolo, <strong className="text-[#ffd700]">ganas una comisión
                    fija en cash USD</strong> según el monto de la venta, más tickets para canjear. Sin límite de usos ni de compras.
                  </p>

                  {/* Tabla de comisiones por tramo */}
                  <div className="mb-4 overflow-hidden rounded-xl border border-white/10">
                    {REFERRAL_TIERS.map((t, i) => (
                      <div
                        key={t.label}
                        className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${i % 2 ? "bg-white/[0.03]" : ""}`}
                      >
                        <span className="text-[#bbb]">Venta de {t.label}</span>
                        <span className="flex items-center gap-3 shrink-0">
                          <strong className="text-[#ffd700]">${t.cash.toFixed(2)}</strong>
                          <span className="text-[#e5007d] font-bold">+{t.tickets.toLocaleString()} tickets</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {[
                      { icon: Repeat,     text: 'Sin límite de usos — aplica en todas las compras del usuario' },
                      { icon: DollarSign, text: 'Cash USD real, retirable o consumible en la tienda' },
                      { icon: Gift,       text: 'Quien use el código recibe un obsequio secreto con su pedido' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <item.icon size={14} className="text-[#ffd700] flex-shrink-0 mt-0.5" />
                        <span className="text-[#888] text-xs leading-relaxed">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <p className="text-[#555] text-xs uppercase tracking-widest mb-2 text-center">Ejemplo</p>
                  <div className="bg-[#0d0d0d] border-2 border-dashed border-[#ffd700]/40 rounded-2xl px-8 py-5 text-center">
                    <p className="text-[#ffd700] font-black tracking-widest text-2xl">ISK-NOMBRE-0000</p>
                    <p className="text-[#555] text-xs mt-2">Tu código único e intransferible</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Banner CTA */}
          <div className="bg-[#0d0d0d] rounded-2xl p-8 border border-[#e5007d]/30 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-white font-black text-xl mb-1">¿Listo para empezar a ganar?</h3>
              <p className="text-[#888] text-sm">Aplica ahora y empieza a acumular tickets desde tu primera actividad.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Cosplayers aliados ── */}
      {cosplayers.length > 0 && (
        <section className="py-24 bg-[#0d0d0d] overflow-hidden">
          <div className="px-6 lg:px-20 mb-12">
            <p className="text-xs tracking-[0.3em] uppercase text-[#e5007d] mb-3 font-medium">La comunidad</p>
            <h2 className="text-3xl lg:text-5xl font-black text-white">Cosplayers aliados</h2>
          </div>
          <CosplayersCarousel cosplayers={cosplayers} />
          {cosplayers.length > 4 && (
            <div className="text-center mt-10 px-6">
              <Link href="/cosplay/guild">
                <button className="border border-[#444] text-[#ccc] px-8 py-3 rounded-full text-sm font-semibold hover:border-[#e5007d] hover:text-white transition-colors">
                  Ver todos los cosplayers →
                </button>
              </Link>
            </div>
          )}
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
        </motion.div>
      </section>

    </div>
  );
}
