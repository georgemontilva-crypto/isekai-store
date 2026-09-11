import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export interface SlideHero {
  image: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonUrl: string;
}

/**
 * Banner principal al estilo de Epic Games Store.
 *
 * Rejilla 3:1: el banner grande a la izquierda y la lista de slides a la
 * derecha, donde el activo se llena con una barra de progreso. Vive en un
 * componente propio porque lo usan tanto la portada del evento como la tienda.
 */
export default function HeroCarousel({ slides }: { slides: SlideHero[] }) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroProgreso, setHeroProgreso] = useState(0);

  const DURACION_SLIDE = 8000;

  useEffect(() => {
    if (slides.length < 2) return;
    const inicio = Date.now();
    setHeroProgreso(0);

    const id = setInterval(() => {
      const pct = Math.min(((Date.now() - inicio) / DURACION_SLIDE) * 100, 100);
      setHeroProgreso(pct);
      if (pct >= 100) setHeroIdx(i => (i + 1) % slides.length);
    }, 40);

    return () => clearInterval(id);
  }, [heroIdx, slides.length]);

  if (slides.length === 0) return null;

  const heroSlides = slides;

  return (
      <section className="px-4 pt-4 pb-8 sm:px-6 lg:px-16 xl:px-24 2xl:px-[233px]">
        <div className="mx-auto w-full lg:grid lg:gap-4" style={{ gridTemplateColumns: "3.6fr 1fr" }}>

          {/* Banner */}
          <div className="relative w-full overflow-hidden rounded-xl bg-[#16191f]" style={{ height: "clamp(250px, 44vw, 560px)" }}>
            {heroSlides.map((slide, i) => (
              <div
                key={i}
                className="absolute inset-0 transition-opacity duration-300"
                style={{ opacity: i === heroIdx ? 1 : 0, pointerEvents: i === heroIdx ? "auto" : "none" }}
              >
                <img src={slide.image} alt={slide.title || ""} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                {(slide.title || slide.buttonText) && (
                  <div className="absolute bottom-0 left-0 w-full max-w-xl p-6 sm:p-9">
                    {slide.subtitle && (
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[#ff45a0]">
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.title && (
                      <h2 className="mb-4 text-2xl font-black leading-[1.08] text-white sm:text-4xl">
                        {slide.title}
                      </h2>
                    )}
                    {slide.buttonText && slide.buttonUrl && (
                      <Link href={slide.buttonUrl}>
                        <button className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold text-[#111] transition-colors hover:bg-white/85">
                          {slide.buttonText}
                          <ArrowRight size={16} />
                        </button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Lista lateral: solo en escritorio */}
          {heroSlides.length > 1 && (
            <div className="hidden flex-col gap-2 lg:flex">
              {heroSlides.map((slide, i) => {
                const activo = i === heroIdx;
                return (
                  <button
                    key={i}
                    onClick={() => setHeroIdx(i)}
                    className="relative flex items-center gap-3.5 overflow-hidden rounded-lg px-3 py-2.5 text-left transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", isolation: "isolate" }}
                  >
                    {/* El fondo se llena marcando cuánto falta para el cambio */}
                    {activo && (
                      <div
                        className="pointer-events-none absolute inset-y-0 left-0 rounded-lg"
                        style={{
                          background: "rgba(255,255,255,0.09)",
                          width: `${heroProgreso}%`,
                          transition: "width 40ms linear",
                          zIndex: 0,
                        }}
                      />
                    )}
                    <div
                      className="relative z-10 shrink-0 overflow-hidden rounded-lg bg-[#1a1a1f]"
                      style={{ width: 56, height: 56 }}
                    >
                      <img src={slide.image} alt="" className="h-full w-full object-cover" />
                    </div>
                    <p
                      className="relative z-10 min-w-0 flex-1 text-sm font-semibold leading-snug"
                      style={{ color: activo ? "#fff" : "rgba(255,255,255,0.65)", wordBreak: "break-word" }}
                    >
                      {slide.title || `Novedad ${i + 1}`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
  );
}
