import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { CheckCircle2, Instagram, Youtube, ArrowLeft } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  bronce: "#cd7f32", plata: "#C0C0C0", oro: "#FFD700", diamante: "#b9f2ff", platino: "#e5e4e2",
};

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  );
}

export default function CosplayGuild() {
  const { data: cosplayers = [], isLoading } = trpc.cosplay.getApprovedCosplayers.useQuery();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <Link href="/cosplay">
          <button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mb-8">
            <ArrowLeft size={16} /> Cosplay Guild
          </button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h1 className="text-4xl font-black mb-3">Cosplayers aliados</h1>
          <p className="text-white/50">Representantes verificados de Isekai World</p>
        </motion.div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#e5007d]/30 border-t-[#e5007d] rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && cosplayers.length === 0 && (
          <div className="text-center py-20 text-white/30">
            <p className="text-xl font-semibold mb-2">Aún no hay cosplayers registrados</p>
            <Link href="/cosplay/apply">
              <button className="mt-4 px-6 py-3 bg-[#e5007d] rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors text-white">Sé el primero</button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {cosplayers.map((cp: any, i: number) => {
            const tierColor = TIER_COLORS[cp.tier ?? 'bronce'] ?? '#cd7f32';
            return (
              <motion.div
                key={cp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/cosplay/guild/${cp.id}`}>
                  <div className="group cursor-pointer p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-center">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      <div
                        className="w-20 h-20 rounded-full overflow-hidden border-2"
                        style={{ borderColor: tierColor }}
                      >
                        {cp.photo
                          ? <img src={cp.photo} alt={cp.artisticName} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-white/10 flex items-center justify-center text-2xl font-black" style={{ color: tierColor }}>{cp.artisticName[0]}</div>
                        }
                      </div>
                      <CheckCircle2 size={16} className="absolute -bottom-1 -right-1 text-[#e5007d] bg-[#0a0a0a] rounded-full" />
                    </div>

                    <p className="font-bold text-sm group-hover:text-[#e5007d] transition-colors mb-1">{cp.artisticName}</p>
                    <span
                      className="text-xs font-bold capitalize px-2 py-0.5 rounded-full"
                      style={{ color: tierColor, backgroundColor: tierColor + '20' }}
                    >
                      {cp.tier ?? 'Bronce'}
                    </span>

                    {/* Social icons */}
                    <div className="flex justify-center gap-2 mt-3">
                      {cp.instagram && <Instagram size={13} className="text-white/40" />}
                      {cp.tiktok && <TikTokIcon />}
                      {cp.youtube && <Youtube size={13} className="text-white/40" />}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
