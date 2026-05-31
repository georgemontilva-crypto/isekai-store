import { motion } from "framer-motion";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Instagram, Youtube } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  bronce: "#cd7f32", plata: "#c0c0c0", oro: "#ffd700", diamante: "#b9f2ff", platino: "#e8e8e8",
};

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} className="fill-current">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  );
}

export default function CosplayGuild() {
  const { data: cosplayers = [], isLoading } = trpc.cosplay.getApprovedCosplayers.useQuery();
  const { data: siteSettings } = trpc.settings.getAll.useQuery();
  const bannerImage = siteSettings?.["cosplay_guild_banner"] ?? "";

  return (
    <div className="min-h-screen bg-[#0d0d0d]">

      {/* Banner */}
      {bannerImage && (
        <div className="relative h-48 overflow-hidden">
          <img src={bannerImage} className="w-full h-full object-cover opacity-50" alt="" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, #0d0d0d 100%)" }} />
        </div>
      )}

      <div className="container py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <p className="text-xs tracking-[0.3em] uppercase text-[#e5007d] mb-2 font-medium">Isekai World</p>
          <h1 className="text-4xl lg:text-6xl font-black text-white mb-3">Cosplayers Aliados</h1>
          <p className="text-[#888]">Representantes verificados de la comunidad</p>
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-[#333] animate-pulse">
                <div className="aspect-square bg-[#222]" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-[#222] rounded w-3/4" />
                  <div className="h-3 bg-[#222] rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && cosplayers.length === 0 && (
          <div className="text-center py-24 border border-[#222] rounded-2xl">
            <p className="text-[#555] text-lg font-semibold mb-2">Aún no hay cosplayers registrados</p>
            <p className="text-[#888] text-sm mb-6">Sé el primero en representar a Isekai World</p>
            <Link href="/cosplay/apply">
              <button className="bg-[#e5007d] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors">
                Postularme
              </button>
            </Link>
          </div>
        )}

        {!isLoading && cosplayers.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {cosplayers.map((cp: any, i: number) => {
              const tierColor = TIER_COLORS[cp.tier ?? 'bronce'] ?? '#cd7f32';
              return (
                <motion.div
                  key={cp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link href={`/cosplay/guild/${cp.username ?? cp.id}`}>
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-[#333] hover:border-[#e5007d] transition-colors group cursor-pointer">
                      <div className="aspect-square overflow-hidden bg-[#222]">
                        {cp.photo
                          ? <img src={cp.photo} alt={cp.artisticName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          : (
                            <div className="w-full h-full flex items-center justify-center text-5xl font-black" style={{ color: tierColor }}>
                              {cp.artisticName[0]}
                            </div>
                          )
                        }
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-white font-bold text-sm group-hover:text-[#e5007d] transition-colors">{cp.artisticName}</span>
                          <CheckCircle2 size={13} className="text-[#e5007d] shrink-0" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-bold capitalize"
                            style={{ backgroundColor: tierColor + '25', color: tierColor }}
                          >
                            {cp.tier ?? 'bronce'}
                          </span>
                          <div className="flex gap-1.5 text-[#555]">
                            {cp.instagram && <Instagram size={12} />}
                            {cp.tiktok && <TikTokIcon />}
                            {cp.youtube && <Youtube size={12} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
