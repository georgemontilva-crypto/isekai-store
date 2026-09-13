import { useState, useEffect, useRef, useCallback } from "react";

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  const handler = useCallback(() => setWidth(window.innerWidth), []);
  useEffect(() => {
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, [handler]);
  return width;
}
import { Link, useLocation } from "wouter";
import CategoryShowcase from "@/components/CategoryShowcase";
import HeroCarousel from "@/components/HeroCarousel";
import AvisoPropiedadIntelectual from "@/components/AvisoPropiedadIntelectual";
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag, Instagram, ExternalLink, Layers } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PriceDisplay } from "@/components/PriceDisplay";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import FeaturedProductCard from "@/components/FeaturedProductCard";
import { useLang } from "@/i18n/LangContext";
import { useSEO } from "@/hooks/useSEO";

/* ─── Collections ─── */
/* ─── Tab categories ─── */
// tabCategories removed — using DB categories directly

/* ─── SaleSlider — image-only banner ─── */
function SaleSlider() {
  const { data: settings } = trpc.settings.getAll.useQuery();
  const [idx, setIdx] = useState(0);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  const bannersEscritorio = [
    settings?.["sale_banner_1_image"],
    settings?.["sale_banner_2_image"],
    settings?.["sale_banner_3_image"],
  ];
  const bannersMovil = [
    settings?.["sale_banner_1_image_mobile"],
    settings?.["sale_banner_2_image_mobile"],
    settings?.["sale_banner_3_image_mobile"],
  ];

  // En teléfono se prefiere la versión vertical de cada banner; si no existe,
  // se usa la horizontal para no dejar el hueco vacío.
  const banners = bannersEscritorio
    .map((src, i) => (isMobile ? bannersMovil[i] || src : src))
    .filter((b): b is string => !!b);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [banners.length]);

  if (!banners.length) {
    return (
      <section className="px-4 pt-6 sm:px-6 lg:px-16 xl:px-24 2xl:px-[233px]">
        <div className="h-[140px] sm:h-[200px] bg-[#f0f0f0] rounded-[18px] flex items-center justify-center">
          <p className="text-[#888] text-sm">Configura los banners desde el panel admin → Configuración</p>
        </div>
      </section>
    );
  }

  const total = banners.length;

  return (
    <section className="px-4 pt-6 sm:px-6 lg:px-16 xl:px-24 2xl:px-[233px]">
      <div
        className="relative overflow-hidden rounded-[18px]"
        style={{ aspectRatio: isMobile ? '4/5' : '1920/600' }}
      >
        {/* Images — crossfade */}
        {banners.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{ display: i === idx ? 'block' : 'none' }}
          >
            <img
              src={src}
              alt=""
              width={1920}
              height={600}
              className="w-full h-full object-cover object-center"
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}

        {/* Dots */}
        {total > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 3 }}>
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Banner ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? 24 : 8,
                  height: 8,
                  background: i === idx ? 'white' : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
        )}

        {/* Arrows */}
        {total > 1 && (
          <>
            <button
              onClick={() => setIdx(i => (i - 1 + total) % total)}
              aria-label="Banner anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 hidden sm:flex items-center justify-center text-white transition-colors"
              style={{ zIndex: 3 }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setIdx(i => (i + 1) % total)}
              aria-label="Siguiente banner"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 hidden sm:flex items-center justify-center text-white transition-colors"
              style={{ zIndex: 3 }}
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/* ─── Aliados comerciales ────────────────────────────────────────────────────
   Carril infinito con los logos de las marcas aliadas. Se duplica la lista y
   se desplaza en bucle, así el movimiento no tiene principio ni final visible.
   Se pausa al pasar por encima para poder leer un logo concreto. */
function AliadosSection() {
  const { data: settings } = trpc.settings.getAll.useQuery();

  // Hasta ocho aliados, configurables desde el panel
  const logos = [1, 2, 3, 4, 5, 6, 7, 8]
    .map(n => ({
      imagen: settings?.[`aliado_${n}_logo`],
      nombre: settings?.[`aliado_${n}_nombre`] ?? "",
      url: settings?.[`aliado_${n}_url`] ?? "",
    }))
    .filter(a => a.imagen);

  if (logos.length === 0) return null;

  // Se repite la lista para que el bucle sea continuo
  const carril = [...logos, ...logos];

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-16 xl:px-24 2xl:px-[233px]">
      <p className="mb-1 text-center font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#ff45a0]">
        Confían en nosotros
      </p>
      <h2 className="mb-8 text-center ev-display text-2xl text-white sm:text-3xl">
        Nuestros aliados comerciales
      </h2>

      <div className="iw-aliados-marco">
        <div className="iw-aliados-carril">
          {carril.map((a, i) => {
            const contenido = (
              <div className="iw-aliado-logo">
                <img src={a.imagen} alt={a.nombre || "Aliado"} loading="lazy" />
              </div>
            );
            return a.url ? (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" aria-label={a.nombre}>
                {contenido}
              </a>
            ) : (
              <div key={i}>{contenido}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  useSEO({
    title: 'Figuras de Impresión 3D Anime & Gaming',
    description: 'Descubre figuras únicas impresas en 3D inspiradas en anime, videojuegos y cultura geek. Fan-made para coleccionistas.',
    url: 'https://isekaiworld.co',
  });

  const { t } = useLang();
  const [, navigate] = useLocation();
  const [heroIdx, setHeroIdx] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  const collectionCardWidth = isMobile
    ? 'calc(100vw - 48px)'
    : isTablet
    ? 'calc((100vw - 16px - 20px) / 3)'
    : 'calc((100vw - 16px - 40px) / 5)';

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: productsData, isLoading: productsLoading } = trpc.products.list.useQuery({
    limit: 12,
    status: "published",
    featured: true,
  });
  const { data: settings } = trpc.settings.getAll.useQuery();
  const textureEnabled = settings?.["texture_enabled"] === "true";
  const products = productsData?.items ?? [];
  const { addItem } = useCart();

  const heroSlides = [1, 2, 3]
    .map(n => ({
      image:      settings?.[`hero_slide_${n}_image`]    ?? "",
      title:      settings?.[`hero_slide_${n}_title`]    ?? "",
      subtitle:   settings?.[`hero_slide_${n}_subtitle`] ?? "",
      buttonText: settings?.[`hero_slide_${n}_cta`]      ?? "",
      buttonUrl:  settings?.[`hero_slide_${n}_cta_url`]  ?? "/catalog",
    }))
    .filter(s => s.image);

  /**
   * Avance del banner con barra de progreso.
   *
   * En vez de un simple temporizador, se lleva la cuenta del porcentaje
   * transcurrido: es lo que llena el fondo del slide activo en la lista
   * lateral y avisa al visitante de cuánto falta para el cambio.
   */
  const DURACION_SLIDE = 8000;
  const [heroProgreso, setHeroProgreso] = useState(0);

  useEffect(() => {
    if (heroSlides.length < 2) return;
    const inicio = Date.now();
    setHeroProgreso(0);

    const id = setInterval(() => {
      const pct = Math.min(((Date.now() - inicio) / DURACION_SLIDE) * 100, 100);
      setHeroProgreso(pct);
      if (pct >= 100) setHeroIdx(i => (i + 1) % heroSlides.length);
    }, 40);

    return () => clearInterval(id);
  }, [heroIdx, heroSlides.length]);

  const videoUrl      = settings?.["video_banner_video_url"] ?? "";
  const videoTitle    = settings?.["video_banner_title"]     ?? "";
  const videoSubtitle = settings?.["video_banner_subtitle"]  ?? "";
  const videoCta      = settings?.["video_banner_cta"]       ?? "";
  const videoCtaUrl   = settings?.["video_banner_cta_url"]   ?? "/catalog";

  const videoRef = useRef<HTMLVideoElement>(null);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    const container = categoryScrollRef.current;
    if (!container) return;
    const scrollAmount = 160 * 2;
    container.scrollBy({ left: direction === 'right' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
  };
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { video.play().catch(() => {}); }
        else { video.pause(); }
      },
      { rootMargin: "0px 0px 300px 0px" }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [videoUrl]);

  const displayProducts = products;

  const handleAddToCart = async (id: number, name: string) => {
    try {
      await addItem(id);
      toast.success(`${name} agregado al carrito`);
    } catch {
      toast.error("No se pudo agregar al carrito");
    }
  };

  return (
    <div className="bg-white text-[#1a1a1a] overflow-x-hidden w-full">

      {/* ══════════════════════════════════════════════
          1. HERO PEEK CAROUSEL
      ══════════════════════════════════════════════ */}
      <HeroCarousel slides={heroSlides} />

      {/* ══════════════════════════════════════════════
          2. COLLECTIONS CAROUSEL (Shopify Concept style)
      ══════════════════════════════════════════════ */}
      {categories && categories.length > 0 && (
      <section className="px-4 pb-10 sm:px-6 lg:px-16 xl:px-24 2xl:px-[233px]">
        <div className="mx-auto w-full">

          {/* Título con los controles a su derecha, como en la referencia */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-white sm:text-xl">
              {t.nav.collections ?? "Universos"}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollCategories('left')}
                aria-label="Anterior"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => scrollCategories('right')}
                aria-label="Siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
              >
                <ChevronRight size={15} />
              </button>
              <Link href="/catalog" className="ml-1 flex items-center gap-1.5 text-xs font-bold text-[#ff45a0] transition-colors hover:text-white">
                Ver todo <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Carril: dos tarjetas por vista en teléfono, tres en tableta y
              cuatro en escritorio. Las tarjetas son verticales (3:4) con el
              nombre sobre un degradado, como las de la referencia. */}
          <div
            ref={categoryScrollRef}
            className="flex gap-4 pb-1"
            style={{
              overflowX: "auto",
              overflowY: "hidden",
              scrollBehavior: "smooth",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
          >
            {categories.map((cat: any) => {
              const href = cat.slug ? `/catalog?category=${cat.slug}` : "/catalog";
              return (
                <Link key={cat.id} href={href} className="iw-universo-card" style={{ scrollSnapAlign: "start" }}>
                  <div
                    className="group relative w-full cursor-pointer overflow-hidden ev-notch bg-[#16191f]"
                    style={{
                      aspectRatio: "3 / 4",
                      border: "1px solid rgba(255,255,255,0.07)",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                    }}
                  >
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1d24] to-[#0a0a0a]">
                        <Layers size={40} className="text-white/15" />
                      </div>
                    )}

                    {/* Degradado para que el nombre se lea sobre cualquier foto */}
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)" }}
                    />
                    {/* Tinte magenta al pasar por encima */}
                    <div
                      className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ background: "linear-gradient(to top, rgba(229,0,125,0.25) 0%, transparent 60%)" }}
                    />

                    <div className="absolute inset-x-0 bottom-0 p-3.5">
                      <p className="text-sm font-bold leading-tight text-white transition-colors group-hover:text-[#ff45a0]">
                        {cat.name}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* Vitrina 1 — debajo de los universos */}
      {(() => {
        const catId = parseInt(settings?.["showcase_1_category"] ?? "0");
        if (!catId) return null;
        const cat = categories?.find((c: any) => c.id === catId);
        return (
          <CategoryShowcase
            categoryId={catId}
            categorySlug={cat?.slug}
            titulo={settings?.["showcase_1_title"] || cat?.name || "Novedades"}
            imagen={settings?.["showcase_1_image"]}
            imagenMovil={settings?.["showcase_1_image_mobile"]}
            ctaTexto={settings?.["showcase_1_cta"]}
            esMovil={isMobile}
            menosEspacioArriba
          />
        );
      })()}


      {/* ══════════════════════════════════════════════
          4+5. VIDEO BANNER + FLOATING FEATURED PRODUCT
      ══════════════════════════════════════════════ */}
      {/* Outer wrapper: video + overlapping product card */}
      <div className="relative">

        {/* ── VIDEO BANNER ── */}
        {videoUrl && (
        <section className="px-4 py-0 sm:px-6 lg:px-16 xl:px-[233px]">
          <div
            className="relative overflow-hidden"
            style={{ height: isMobile ? 300 : 480, borderRadius: 18 }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              preload="none"
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
            {(videoTitle || videoSubtitle || videoCta) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              {videoTitle && (
                <h2
                  className="font-black text-white mb-3"
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 'clamp(36px, 6vw, 72px)',
                    lineHeight: 1.1,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {videoTitle}
                </h2>
              )}
              {videoSubtitle && (
                <p className="text-white/70 text-[15px] mb-7">{videoSubtitle}</p>
              )}
              {videoCta && (
                <Link
                  href={videoCtaUrl}
                  className="inline-flex items-center gap-2 bg-white text-[#1a1a1a] font-semibold text-[14px] px-7 py-3.5 rounded-full hover:bg-white/90 transition-colors"
                >
                  {videoCta} <ArrowRight size={14} />
                </Link>
              )}
            </div>
            )}
          </div>
        </section>
        )}

      </div>

      {/* Vitrina 2 — después del banner de video */}
      {(() => {
        const catId = parseInt(settings?.["showcase_2_category"] ?? "0");
        if (!catId) return null;
        const cat = categories?.find((c: any) => c.id === catId);
        return (
          <CategoryShowcase
            categoryId={catId}
            categorySlug={cat?.slug}
            titulo={settings?.["showcase_2_title"] || cat?.name || "Novedades"}
            imagen={settings?.["showcase_2_image"]}
            imagenMovil={settings?.["showcase_2_image_mobile"]}
            ctaTexto={settings?.["showcase_2_cta"]}
            esMovil={isMobile}
          />
        );
      })()}




      {/* ══════════════════════════════════════════════
          7. COUNTDOWN SALE SLIDER (ISLAND)
      ══════════════════════════════════════════════ */}
      <SaleSlider />

      {/* Vitrina 3 — después del banner de imágenes */}
      {(() => {
        const catId = parseInt(settings?.["showcase_3_category"] ?? "0");
        if (!catId) return null;
        const cat = categories?.find((c: any) => c.id === catId);
        return (
          <CategoryShowcase
            categoryId={catId}
            categorySlug={cat?.slug}
            titulo={settings?.["showcase_3_title"] || cat?.name || "Novedades"}
            imagen={settings?.["showcase_3_image"]}
            imagenMovil={settings?.["showcase_3_image_mobile"]}
            ctaTexto={settings?.["showcase_3_cta"]}
            esMovil={isMobile}
          />
        );
      })()}




        {/* ════════════════════════════════════════════
          11. ALIADOS COMERCIALES
      ════════════════════════════════════════════ */}
      <AliadosSection />

      {/* Aviso legal antes del footer */}
      <AvisoPropiedadIntelectual />

    </div>
  );
}

