import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ArrowLeft, ExternalLink, User } from "lucide-react";
import { getTierColor } from "./CosplayDashboard";

export default function CosplayProfile() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? '0');
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const h = () => setOffsetY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const { data: cosplayer, isLoading } = trpc.cosplay.getCosplayerProfile.useQuery(
    { id },
    { enabled: !!id }
  );

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
            <button className="bg-[#e5007d] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors">Ver todos</button>
          </Link>
        </div>
      </div>
    );
  }

  const tierColor = getTierColor(cosplayer.tier ?? 'bronce');
  const gallery   = (cosplayer.gallery as string[] | null) ?? [];

  const socials = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'tiktok',    label: 'TikTok'    },
    { key: 'youtube',   label: 'YouTube'   },
    { key: 'facebook',  label: 'Facebook'  },
    { key: 'twitter',   label: 'Twitter / X' },
  ].filter(r => (cosplayer as any)[r.key]);

  return (
    <div className="min-h-screen bg-[#0d0d0d]">

      {/* Hero con foto grande */}
      <div className="relative h-[60vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-[#111]"
          style={{ transform: `translateY(${offsetY * 0.3}px)`, willChange: "transform" }}
        >
          {cosplayer.photo
            ? <img src={cosplayer.photo} className="w-full h-full object-cover object-top opacity-60" alt="" />
            : <div className="w-full h-full bg-[#1a1a1a]" />
          }
        </div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,13,13,1) 0%, rgba(13,13,13,0.3) 60%, transparent 100%)' }} />

        {/* Info sobre la imagen */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <div className="container">
            <Link href="/cosplay/guild">
              <button className="flex items-center gap-2 text-[#888] hover:text-white transition-colors text-sm mb-6">
                <ArrowLeft size={14} /> Todos los cosplayers
              </button>
            </Link>
            <div className="flex items-end gap-5">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 flex-shrink-0 bg-[#222]" style={{ borderColor: tierColor }}>
                {cosplayer.photo
                  ? <img src={cosplayer.photo} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-[#555]" /></div>
                }
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl lg:text-4xl font-black text-white leading-none">{cosplayer.artisticName}</h1>
                  <div className="flex items-center gap-1 bg-[#e5007d]/20 border border-[#e5007d]/40 px-2 py-1 rounded-full">
                    <CheckCircle2 size={12} className="text-[#e5007d]" />
                    <span className="text-[#e5007d] text-xs font-bold">Verificado</span>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full font-bold capitalize" style={{ background: tierColor, color: '#000' }}>
                  {(cosplayer.tier ?? 'bronce').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Columna izquierda — bio y redes */}
          <div className="lg:col-span-1">

            {cosplayer.bio && (
              <div className="mb-8">
                <p className="text-xs tracking-widest uppercase text-[#e5007d] mb-3 font-medium">Sobre mí</p>
                <p className="text-[#ccc] leading-relaxed text-[15px]">{cosplayer.bio}</p>
              </div>
            )}

            {socials.length > 0 && (
              <div>
                <p className="text-xs tracking-widest uppercase text-[#e5007d] mb-3 font-medium">Redes sociales</p>
                <div className="flex flex-col gap-2">
                  {socials.map(r => (
                    <a
                      key={r.key}
                      href={(cosplayer as any)[r.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[#888] hover:text-[#e5007d] transition-colors"
                    >
                      <ExternalLink size={14} />
                      {r.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha — galería */}
          <div className="lg:col-span-2">
            <p className="text-xs tracking-widest uppercase text-[#e5007d] mb-6 font-medium">Galería</p>
            {gallery.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {gallery.map((img, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="aspect-square rounded-xl overflow-hidden bg-[#1a1a1a]"
                  >
                    <img src={img} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" alt="" />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="aspect-video rounded-2xl bg-[#1a1a1a] border border-[#333] flex items-center justify-center">
                <p className="text-[#555] text-sm">Galería próximamente</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
