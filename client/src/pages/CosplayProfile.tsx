import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, User } from "lucide-react";
import { getTierColor } from "./CosplayDashboard";

export default function CosplayProfile() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? '0');

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
            <button className="bg-[#e5007d] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors">
              Ver todos
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const tierColor = getTierColor(cosplayer.tier ?? 'bronce');
  const gallery   = (cosplayer.gallery as string[] | null) ?? [];
  const banner    = (cosplayer as any).bannerImage as string | undefined;

  const socials = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'tiktok',    label: 'TikTok'    },
    { key: 'youtube',   label: 'YouTube'   },
    { key: 'facebook',  label: 'Facebook'  },
    { key: 'twitter',   label: 'Twitter / X' },
  ].filter(r => (cosplayer as any)[r.key]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center px-4 py-0">

      {/* Banner superior */}
      <div className="w-full h-[200px] sm:h-[260px] overflow-hidden relative">
        {banner
          ? <img src={banner} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full bg-[#1a1a1a]" />
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(13,13,13,1) 100%)' }} />
      </div>

      {/* Contenido centrado */}
      <div className="w-full max-w-[480px] -mt-16 relative z-10 flex flex-col items-center">

        {/* Foto de perfil */}
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 mb-3 flex-shrink-0 bg-[#222]" style={{ borderColor: tierColor, outline: '3px solid #0d0d0d', outlineOffset: '0px' }}>
          {cosplayer.photo
            ? <img src={cosplayer.photo} className="w-full h-full object-cover" alt={cosplayer.artisticName} />
            : <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-[#555]" /></div>
          }
        </div>

        {/* Nombre + verificado */}
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-white font-black text-xl">{cosplayer.artisticName}</h1>
          <CheckCircle2 size={16} className="text-[#e5007d]" />
        </div>

        {/* Tier badge */}
        <span className="text-xs px-3 py-1 rounded-full font-bold mb-4 capitalize" style={{ background: tierColor, color: '#000' }}>
          {(cosplayer.tier ?? 'bronce').toUpperCase()}
        </span>

        {/* Bio */}
        {cosplayer.bio && (
          <p className="text-[#aaa] text-sm text-center leading-relaxed mb-6 px-2">
            {cosplayer.bio}
          </p>
        )}

        {/* Redes sociales — estilo LinkBio */}
        {socials.length > 0 && (
          <div className="w-full flex flex-col gap-3 mb-8">
            {socials.map(r => (
              <a
                key={r.key}
                href={(cosplayer as any)[r.key]}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#1a1a1a] border border-[#333] text-white font-semibold text-center py-4 rounded-2xl hover:border-[#e5007d] hover:bg-[#222] transition-all text-sm"
              >
                {r.label}
              </a>
            ))}
          </div>
        )}

        {/* Galería */}
        {gallery.length > 0 && (
          <div className="w-full mb-8">
            <p className="text-xs tracking-widest uppercase text-[#555] text-center mb-4">Galería</p>
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((img, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#1a1a1a]">
                  <img src={img} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" alt="" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-[#444] text-xs mb-10">isekaiworld.co/cosplay/guild</p>
      </div>
    </div>
  );
}
