import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { Shield, Star, Zap, Crown, Gem, CheckCircle2, Instagram, Youtube, ArrowRight } from "lucide-react";

const TIERS = [
  { name: "Bronce", color: "#cd7f32", bg: "from-amber-900/20 to-amber-700/10", border: "border-amber-700/40", multiplier: "1x", followers: "0–5k", icon: Shield },
  { name: "Plata",  color: "#C0C0C0", bg: "from-slate-400/20 to-slate-300/10", border: "border-slate-400/40", multiplier: "1.5x", followers: "5k–20k", icon: Star },
  { name: "Oro",    color: "#FFD700", bg: "from-yellow-500/20 to-yellow-400/10", border: "border-yellow-500/40", multiplier: "2x", followers: "20k–50k", icon: Zap },
  { name: "Diamante", color: "#b9f2ff", bg: "from-cyan-400/20 to-cyan-300/10", border: "border-cyan-400/40", multiplier: "3x", followers: "50k–200k", icon: Gem },
  { name: "Platino", color: "#e5e4e2", bg: "from-violet-400/20 to-violet-300/10", border: "border-violet-400/40", multiplier: "5x", followers: "200k+", icon: Crown },
];

const STEPS = [
  { n: "01", title: "Postúlate", desc: "Rellena el formulario con tus datos y cuentas de redes sociales. Revisamos cada solicitud manualmente." },
  { n: "02", title: "Recibe tu kit", desc: "Si eres aprobado, recibes gratis un kit de bienvenida con productos Isekai World." },
  { n: "03", title: "Completa actividades", desc: "Publica contenido, haz reels, participa en eventos. Cada actividad aprobada suma tickets." },
  { n: "04", title: "Canjea descuentos", desc: "Usa tus tickets para obtener códigos de descuento del 10% al 50% en la tienda." },
];

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  );
}

function SocialIcon({ platform }: { platform: string }) {
  if (platform === 'instagram') return <Instagram size={14} />;
  if (platform === 'youtube') return <Youtube size={14} />;
  if (platform === 'tiktok') return <TikTokIcon />;
  return null;
}

export default function CosplayLanding() {
  const { data: cosplayers = [] } = trpc.cosplay.getApprovedCosplayers.useQuery();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#e5007d]/20 via-transparent to-violet-900/20 pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1600&q=60')] bg-cover bg-center opacity-10" />
        <div className="relative z-10 container mx-auto px-6 py-24 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e5007d]/20 border border-[#e5007d]/40 text-[#e5007d] text-xs font-bold tracking-widest uppercase mb-6">
              ✦ Isekai Cosplay Guild
            </span>
            <h1 className="text-5xl sm:text-7xl font-black leading-[1.05] mb-6">
              Únete al<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e5007d] to-violet-500">Cosplay Guild</span>
            </h1>
            <p className="text-xl text-white/60 max-w-xl mb-10 leading-relaxed">
              Representa la marca, gana tickets con tu contenido y canjéalos por descuentos exclusivos en la tienda.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/cosplay/apply">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-4 bg-[#e5007d] text-white font-bold rounded-full text-lg hover:bg-[#c4006b] transition-colors flex items-center gap-2"
                >
                  Quiero ser representante <ArrowRight size={18} />
                </motion.button>
              </Link>
              <Link href="/cosplay/guild">
                <button className="px-8 py-4 border border-white/20 text-white font-semibold rounded-full text-lg hover:border-white/60 transition-colors">
                  Ver cosplayers
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Cómo funciona</h2>
            <p className="text-white/50 text-lg">Cuatro pasos para convertirte en representante oficial</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#e5007d]/40 transition-colors"
              >
                <span className="text-5xl font-black text-white/10 absolute top-4 right-5">{s.n}</span>
                <div className="w-10 h-10 rounded-xl bg-[#e5007d]/20 flex items-center justify-center mb-4">
                  <span className="text-[#e5007d] text-lg font-bold">{s.n}</span>
                </div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tiers ── */}
      <section className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Tiers del Guild</h2>
            <p className="text-white/50 text-lg">Cuanto más grande tu comunidad, más multiplicas tus tickets</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {TIERS.map((tier, i) => {
              const Icon = tier.icon;
              return (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className={`p-5 rounded-2xl bg-gradient-to-br ${tier.bg} border ${tier.border} text-center`}
                >
                  <Icon size={28} style={{ color: tier.color }} className="mx-auto mb-3" />
                  <h3 className="font-black text-lg mb-1" style={{ color: tier.color }}>{tier.name}</h3>
                  <p className="text-white/50 text-xs mb-3">{tier.followers} seguidores</p>
                  <div className="px-3 py-1.5 rounded-full bg-white/10 inline-block">
                    <span className="font-black text-sm" style={{ color: tier.color }}>{tier.multiplier}</span>
                    <span className="text-white/50 text-xs ml-1">tickets</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Cosplayers aliados ── */}
      {cosplayers.length > 0 && (
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-4xl font-black mb-4">Cosplayers aliados</h2>
              <p className="text-white/50 text-lg">Representantes verificados de Isekai World</p>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {cosplayers.slice(0, 8).map((cp: any, i: number) => {
                const tierInfo = TIERS.find(t => t.name.toLowerCase() === (cp.tier ?? 'bronce'));
                return (
                  <motion.div
                    key={cp.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link href={`/cosplay/guild/${cp.id}`}>
                      <div className="text-center group cursor-pointer">
                        <div className="relative w-24 h-24 mx-auto mb-3">
                          <div
                            className="w-24 h-24 rounded-full overflow-hidden border-2"
                            style={{ borderColor: tierInfo?.color ?? '#cd7f32' }}
                          >
                            {cp.photo
                              ? <img src={cp.photo} alt={cp.artisticName} className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-white/10 flex items-center justify-center text-3xl font-black text-white/30">{cp.artisticName[0]}</div>
                            }
                          </div>
                          <CheckCircle2 size={18} className="absolute bottom-0 right-0 text-[#e5007d] bg-[#0a0a0a] rounded-full" />
                        </div>
                        <p className="font-bold text-sm group-hover:text-[#e5007d] transition-colors">{cp.artisticName}</p>
                        <span className="text-xs font-semibold capitalize" style={{ color: tierInfo?.color ?? '#cd7f32' }}>{cp.tier ?? 'Bronce'}</span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            {cosplayers.length > 8 && (
              <div className="text-center mt-10">
                <Link href="/cosplay/guild">
                  <button className="px-6 py-3 border border-white/20 rounded-full text-sm font-semibold hover:border-[#e5007d]/60 transition-colors">
                    Ver todos los cosplayers →
                  </button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── CTA final ── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-black mb-4">¿Listo para unirte?</h2>
            <p className="text-white/50 text-lg mb-8">Postúlate ahora. Revisamos cada solicitud y te contactamos en menos de 72 horas.</p>
            <Link href="/cosplay/apply">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-10 py-4 bg-[#e5007d] text-white font-bold rounded-full text-xl hover:bg-[#c4006b] transition-colors"
              >
                Enviar mi solicitud
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
