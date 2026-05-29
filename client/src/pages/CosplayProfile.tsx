import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { CheckCircle2, Instagram, Youtube, ArrowLeft, ExternalLink } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  bronce: "#cd7f32", plata: "#C0C0C0", oro: "#FFD700", diamante: "#b9f2ff", platino: "#e5e4e2",
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

  const { data: cosplayer, isLoading } = trpc.cosplay.getCosplayerProfile.useQuery({ id }, { enabled: !!id });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e5007d]/30 border-t-[#e5007d] rounded-full animate-spin" />
      </div>
    );
  }

  if (!cosplayer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold mb-4">Cosplayer no encontrado</p>
          <Link href="/cosplay/guild"><button className="px-6 py-3 bg-[#e5007d] rounded-full font-bold">Ver todos</button></Link>
        </div>
      </div>
    );
  }

  const tierColor = TIER_COLORS[cosplayer.tier ?? 'bronce'] ?? '#cd7f32';
  const gallery = (cosplayer.gallery as string[] | null) ?? [];

  const socials = [
    { key: 'instagram', icon: <Instagram size={18} />, label: 'Instagram', value: cosplayer.instagram },
    { key: 'tiktok', icon: <TikTokIcon size={18} />, label: 'TikTok', value: cosplayer.tiktok },
    { key: 'youtube', icon: <Youtube size={18} />, label: 'YouTube', value: cosplayer.youtube },
  ].filter(s => s.value);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      {/* Hero */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: cosplayer.photo ? `url(${cosplayer.photo})` : undefined,
            backgroundColor: cosplayer.photo ? undefined : '#111',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 flex items-end gap-5">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full border-3 overflow-hidden" style={{ border: `3px solid ${tierColor}` }}>
              {cosplayer.photo
                ? <img src={cosplayer.photo} alt={cosplayer.artisticName} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-white/10 flex items-center justify-center text-3xl font-black" style={{ color: tierColor }}>{cosplayer.artisticName[0]}</div>
              }
            </div>
            <CheckCircle2 size={20} className="absolute -bottom-1 -right-1 text-[#e5007d] bg-[#0a0a0a] rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-black">{cosplayer.artisticName}</h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize" style={{ color: tierColor, backgroundColor: tierColor + '25' }}>
                {cosplayer.tier ?? 'Bronce'}
              </span>
            </div>
            <p className="text-white/40 text-sm">Cosplayer oficial Isekai World</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-8">
        <Link href="/cosplay/guild">
          <button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mb-8">
            <ArrowLeft size={16} /> Todos los cosplayers
          </button>
        </Link>

        <div className="grid sm:grid-cols-3 gap-8">
          {/* Left */}
          <div className="sm:col-span-1 space-y-6">
            {/* Redes */}
            {socials.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Redes sociales</h3>
                <div className="space-y-2">
                  {socials.map(s => (
                    <a
                      key={s.key}
                      href={s.value!.startsWith('http') ? s.value! : `https://${s.value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors text-sm"
                    >
                      <span className="text-white/60">{s.icon}</span>
                      <span className="flex-1 truncate text-white/70">{s.label}</span>
                      <ExternalLink size={12} className="text-white/30" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="sm:col-span-2 space-y-8">
            {cosplayer.bio && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Sobre mí</h3>
                <p className="text-white/70 leading-relaxed">{cosplayer.bio}</p>
              </motion.div>
            )}

            {gallery.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Galería</h3>
                <div className="grid grid-cols-3 gap-2">
                  {gallery.map((img: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.08 }}
                      className="aspect-square rounded-xl overflow-hidden bg-white/5"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
