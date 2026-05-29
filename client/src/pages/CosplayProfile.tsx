import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Instagram, Youtube, ExternalLink, ArrowLeft } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  bronce: "#cd7f32", plata: "#c0c0c0", oro: "#ffd700", diamante: "#b9f2ff", platino: "#e8e8e8",
};

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="fill-current">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  );
}

export default function CosplayProfile() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? '0');
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const h = () => setOffsetY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const { data: cosplayer, isLoading } = trpc.cosplay.getCosplayerProfile.useQuery({ id }, { enabled: !!id });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#333] border-t-[#e5007d] rounded-full animate-spin" />
      </div>
    );
  }

  if (!cosplayer) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#888] text-lg mb-6">Cosplayer no encontrado</p>
          <Link href="/cosplay/guild">
            <button className="bg-[#e5007d] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors">
              Ver todos
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const tierColor = TIER_COLORS[cosplayer.tier ?? 'bronce'] ?? '#cd7f32';
  const gallery   = (cosplayer.gallery as string[] | null) ?? [];

  const socials = [
    { icon: <Instagram size={16} />, label: 'Instagram', value: cosplayer.instagram },
    { icon: <TikTokIcon size={16} />, label: 'TikTok',   value: cosplayer.tiktok },
    { icon: <Youtube size={16} />,   label: 'YouTube',  value: cosplayer.youtube },
    { icon: <ExternalLink size={16} />, label: 'Facebook', value: cosplayer.facebook },
    { icon: <ExternalLink size={16} />, label: 'Twitter',  value: cosplayer.twitter },
  ].filter(s => s.value);

  return (
    <div className="min-h-screen bg-[#0d0d0d]">

      {/* Hero parallax */}
      <section className="relative h-[60vh] overflow-hidden flex items-end pb-12">
        <div
          className="absolute inset-0 bg-[#111]"
          style={{ transform: `translateY(${offsetY * 0.3}px)`, willChange: "transform" }}
        >
          {cosplayer.photo
            ? <img src={cosplayer.photo} className="w-full h-full object-cover opacity-60" alt="" />
            : <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#050505]" />
          }
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(13,13,13,1) 0%, rgba(13,13,13,0.4) 50%, transparent 100%)" }} />

        <div className="relative z-10 px-6 lg:px-20 w-full max-w-5xl">
          <Link href="/cosplay/guild">
            <button className="flex items-center gap-2 text-[#888] hover:text-white transition-colors text-sm mb-6">
              <ArrowLeft size={14} /> Todos los cosplayers
            </button>
          </Link>
          <div className="flex items-end gap-5">
            <div className="relative shrink-0">
              <div
                className="w-20 h-20 rounded-full overflow-hidden border-[3px]"
                style={{ borderColor: tierColor }}
              >
                {cosplayer.photo
                  ? <img src={cosplayer.photo} alt={cosplayer.artisticName} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-[#222] flex items-center justify-center text-3xl font-black" style={{ color: tierColor }}>{cosplayer.artisticName[0]}</div>
                }
              </div>
              <CheckCircle2 size={18} className="absolute -bottom-0.5 -right-0.5 text-[#e5007d] bg-[#0d0d0d] rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl lg:text-5xl font-black text-white leading-none">{cosplayer.artisticName}</h1>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full capitalize shrink-0"
                  style={{ backgroundColor: tierColor + '25', color: tierColor }}
                >
                  {cosplayer.tier ?? 'Bronce'}
                </span>
              </div>
              <p className="text-[#888] text-sm">Cosplayer oficial Isekai World</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido */}
      <div className="container max-w-5xl py-12">
        <div className="grid lg:grid-cols-3 gap-10">

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {socials.length > 0 && (
              <div>
                <p className="text-xs tracking-[0.25em] uppercase text-[#555] mb-3 font-medium">Redes sociales</p>
                <div className="space-y-2">
                  {socials.map((s, i) => (
                    <a
                      key={i}
                      href={s.value!.startsWith('http') ? s.value! : `https://${s.value!.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#333] hover:border-[#e5007d] transition-colors text-sm text-[#ccc] group"
                    >
                      <span className="text-[#888] group-hover:text-[#e5007d] transition-colors">{s.icon}</span>
                      <span className="flex-1">{s.label}</span>
                      <ExternalLink size={11} className="text-[#555]" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main */}
          <div className="lg:col-span-2 space-y-10">
            {cosplayer.bio && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-xs tracking-[0.25em] uppercase text-[#555] mb-3 font-medium">Sobre mí</p>
                <p className="text-[#ccc] leading-relaxed text-[15px]">{cosplayer.bio}</p>
              </motion.div>
            )}

            {gallery.length > 0 && (
              <div>
                <p className="text-xs tracking-[0.25em] uppercase text-[#555] mb-4 font-medium">Galería</p>
                <div className="grid grid-cols-3 gap-2">
                  {gallery.map((img: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.07 }}
                      className="aspect-square rounded-xl overflow-hidden bg-[#1a1a1a]"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {!cosplayer.bio && gallery.length === 0 && (
              <p className="text-[#555] text-sm">Este cosplayer aún no ha completado su perfil.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
