import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, User, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { getTierColor } from "./CosplayDashboard";

export default function CosplayProfile() {
  const params = useParams<{ username: string }>();
  const username = params.username ?? '';
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: ajustes } = trpc.settings.getAll.useQuery();
  const { data: todos = [] } = trpc.cosplay.getApprovedCosplayers.useQuery();
  const { data: cosplayer, isLoading } = trpc.cosplay.getCosplayerByUsername.useQuery(
    { username },
    { enabled: !!username }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#e5007d] rounded-full animate-spin" />
      </div>
    );
  }

  if (!cosplayer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
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

  const textura = ajustes?.["textura_fondo"];
  const opacidadTextura = parseFloat(ajustes?.["textura_fondo_opacidad"] ?? "0.28");

  const gallery   = (cosplayer.gallery as string[] | null) ?? [];

  /**
   * Cuatro cosplayers al azar, sin repetir el actual. El orden se calcula a
   * partir del nombre del perfil que se está viendo: así es variado entre
   * perfiles pero estable mientras navegas, y las fotos no saltan de sitio
   * cada vez que llegan datos nuevos.
   */
  const semilla = (cosplayer.artisticName ?? '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const otros = (todos as any[])
    .filter(c => c.id !== cosplayer.id)
    .map(c => ({ c, peso: ((c.id * 9301 + semilla * 49297) % 233280) }))
    .sort((a, b) => a.peso - b.peso)
    .slice(0, 4)
    .map(x => x.c);
  const banner    = (cosplayer as any).bannerImage as string | undefined;

  const socials = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'tiktok',    label: 'TikTok'    },
    { key: 'youtube',   label: 'YouTube'   },
    { key: 'facebook',  label: 'Facebook'  },
    { key: 'twitter',   label: 'Twitter / X' },
  ].filter(r => (cosplayer as any)[r.key]);

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex flex-col items-center px-4 py-0">

      {/* Textura del perfil: acompaña la parte de arriba y se apaga al bajar,
          para que la biografía y la galería se lean sobre negro limpio. */}
      {textura && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-0"
          style={{
            height: "min(1100px, 100%)",
            backgroundImage: `url(${textura})`,
            backgroundSize: "cover",
            backgroundPosition: "top center",
            opacity: Number.isFinite(opacidadTextura) ? opacidadTextura : 0.28,
            maskImage: "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.5) 45%, transparent 90%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.5) 45%, transparent 90%)",
          }}
        />
      )}

      {/* Banner superior */}
      <div className="w-full h-[200px] sm:h-[260px] overflow-hidden relative">
        {banner
          ? <img src={banner} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full bg-[#16191f]" />
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(13,13,13,1) 100%)' }} />
      </div>

      {/* Contenido centrado */}
      <div className="w-full max-w-[480px] -mt-16 relative z-10 flex flex-col items-center">

        {/* Foto de perfil */}
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 mb-3 flex-shrink-0 bg-white/[0.06]" style={{ borderColor: '#e5007d', outline: '3px solid #0d0d0d', outlineOffset: '0px' }}>
          {cosplayer.photo
            ? <img src={cosplayer.photo} className="w-full h-full object-cover" alt={cosplayer.artisticName} />
            : <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-[#555]" /></div>
          }
        </div>

        {/* Nombre + verificado */}
        <div className="flex items-center gap-2 mb-1">
          <h1 className="ev-display text-2xl text-white">{cosplayer.artisticName}</h1>
          <CheckCircle2 size={16} className="text-[#e5007d]" />
        </div>

        {/* El nivel ya no se muestra en público: solo lo ve el cosplayer en
            su panel. Aquí va una marca común a todos los miembros del Guild,
            para que nadie se sienta por debajo de otro. */}
        <span className="ev-notch mb-4 border border-[#e5007d]/50 bg-[#e5007d]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff45a0]">
          Cosplay Guild
        </span>

        {/* Bio */}
        {cosplayer.bio && (
          <p className="text-[#aaa] text-sm text-center leading-relaxed mb-6 px-2">
            {cosplayer.bio}
          </p>
        )}

        {/* Redes sociales — estilo LinkBio */}
        {socials.length > 0 && (
          <div className="w-full flex flex-col gap-3 mb-3">
            {socials.map(r => (
              <a
                key={r.key}
                href={(cosplayer as any)[r.key]}
                target="_blank"
                rel="noopener noreferrer"
                className="ev-notch ev-press w-full border border-white/10 bg-[#16191f] py-4 text-center text-sm font-semibold text-white transition-colors hover:border-[#e5007d] hover:bg-white/[0.06]"
              >
                {r.label}
              </a>
            ))}
          </div>
        )}

        {/* Booking: para contratar al cosplayer. Las solicitudes llegan al
            correo de la marca, que las coordina; así el cosplayer no expone
            su contacto personal. */}
        <a
          href={`mailto:hola@isekaiworld.co?subject=${encodeURIComponent(`Booking — ${cosplayer.artisticName}`)}&body=${encodeURIComponent(
            `Hola, me gustaría contratar a ${cosplayer.artisticName}.\n\nTipo de evento:\nFecha:\nCiudad:\nDetalles:\n`,
          )}`}
          className="iw-guild-card ev-notch ev-press relative mb-8 flex w-full items-center justify-center gap-2 overflow-hidden py-4 text-sm font-bold uppercase tracking-[0.14em] text-[#ff45a0]"
        >
          <span className="iw-guild-brillo" />
          <Mail size={16} className="relative" />
          <span className="relative">Booking</span>
        </a>

        {/* Galería — carrusel */}
        {gallery.length > 0 && (
          <div className="w-full mt-6">
            <div className="relative w-full aspect-square ev-notch overflow-hidden">
              <img
                src={gallery[currentSlide]}
                className="w-full h-full object-cover object-top transition-opacity duration-300"
                alt={`${cosplayer.artisticName} cosplay ${currentSlide + 1}`}
              />
              {gallery.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentSlide(i => i === 0 ? gallery.length - 1 : i - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <ChevronLeft size={16} className="text-white" />
                  </button>
                  <button
                    onClick={() => setCurrentSlide(i => i === gallery.length - 1 ? 0 : i + 1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <ChevronRight size={16} className="text-white" />
                  </button>
                </>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="flex justify-center gap-2 mt-3">
                {gallery.map((_: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === currentSlide ? 'w-5 h-2 bg-[#e5007d]' : 'w-2 h-2 bg-[#333]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Otros miembros del Guild: mantiene la visita dentro de la
            comunidad en vez de terminar en un callejón sin salida. Se
            eligen al azar para que ninguno quede siempre en primer plano. */}
        {otros.length > 0 && (
          <div className="mt-14 w-full">
            <p className="mb-1 text-center font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#e5007d]">
              Cosplay Guild
            </p>
            <h2 className="ev-display mb-6 text-center text-xl text-white">
              Puede que también te interesen
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {otros.map((cp: any) => (
                <Link key={cp.id} href={`/cosplay/guild/${cp.username ?? cp.id}`}>
                  <div className="group ev-notch overflow-hidden border border-white/10 bg-[#16191f] transition-colors hover:border-[#e5007d]/60">
                    <div className="relative aspect-[3/4] overflow-hidden bg-[#0d0d0d]">
                      {cp.photo ? (
                        <img
                          src={cp.photo}
                          alt={cp.artisticName}
                          loading="lazy"
                          decoding="async"
                          className="iw-cp-img h-full w-full object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-8 w-8 text-white/15" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                      <p className="ev-display absolute inset-x-0 bottom-0 truncate px-3 pb-3 text-sm text-white">
                        {cp.artisticName}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Link href="/cosplay/guild">
              <span className="ev-notch mt-5 block border border-white/10 py-3.5 text-center text-xs font-bold uppercase tracking-[0.18em] text-[#b4b4c2] transition-colors hover:border-[#e5007d] hover:text-white">
                Ver todos los cosplayers
              </span>
            </Link>
          </div>
        )}

        {/* Footer */}
        <p className="mt-10 text-[#444] text-xs mb-10">isekaiworld.co/cosplay/guild</p>
      </div>
    </div>
  );
}
