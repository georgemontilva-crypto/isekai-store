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
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag, Instagram, ExternalLink } from "lucide-react";
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

  const banners = [
    settings?.["sale_banner_1_image"],
    settings?.["sale_banner_2_image"],
    settings?.["sale_banner_3_image"],
  ].filter((b): b is string => !!b);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [banners.length]);

  if (!banners.length) {
    return (
      <section style={{ padding: '24px 8px 0 8px' }}>
        <div className="h-[140px] sm:h-[200px] bg-[#f0f0f0] rounded-[18px] flex items-center justify-center">
          <p className="text-[#888] text-sm">Configura los banners desde el panel admin → Configuración</p>
        </div>
      </section>
    );
  }

  const total = banners.length;

  return (
    <section style={{ padding: '24px 8px 0 8px' }}>
      <div className="relative overflow-hidden rounded-[18px]" style={{ aspectRatio: '1920/600' }}>
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

/* ─── Instagram Feed Section ─────────────────────────────────────────────────────────────────────────────────── */
function InstagramFeedSection() {
  const { t } = useLang();
  const { data: settings } = trpc.settings.getAll.useQuery();

  const username = settings?.["instagram_username"] || "@isekaistore";
  const ctaText = settings?.["instagram_cta_text"] || "Síguenos en Instagram para contenido exclusivo, novedades y ofertas especiales.";
  const instagramUrl = `https://www.instagram.com/${username.replace("@", "")}`;

  return (
    <section className="py-20 border-b border-[#ebebeb]">
      <div className="container">
        <motion.a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-3xl overflow-hidden px-6 py-10 md:px-10 md:py-16 group cursor-pointer"
          style={{
            // Base oscura: el humo magenta se mueve encima de ella
            background: "linear-gradient(135deg, #120610 0%, #1c0714 45%, #0a0509 100%)",
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          whileHover={{ scale: 1.005 }}
        >
          {/* Humo animado en magenta y negro. Son tres manchas difusas que se
              desplazan muy lento: solo se anima `transform`, que corre en la
              tarjeta gráfica y no repinta la página. Se apaga si el sistema
              pide menos movimiento. */}
          <div className="iw-humo pointer-events-none absolute inset-0 overflow-hidden">
            <span className="iw-humo-1" />
            <span className="iw-humo-2" />
            <span className="iw-humo-3" />
          </div>

          {/* Left: text */}
          <div className="relative z-10 flex-1 max-w-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f09433, #e1306c, #833ab4)" }}>
                <Instagram className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <span className="text-white/70 text-sm font-medium">{username}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3" style={{ fontFamily: "'Orbitron', sans-serif" }}>{t.home.instagram.title}</h2>
            <p className="text-white/70 text-[15px] leading-relaxed max-w-md">{ctaText}</p>
          </div>

          {/* Right: CTA button */}
          <div className="relative z-10 shrink-0">
            <span className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white text-[#1a1a1a] text-[14px] font-bold shadow-xl group-hover:shadow-2xl group-hover:scale-105 transition-all duration-300">
              <Instagram className="w-4 h-4" strokeWidth={2} />
              Seguirnos en Instagram
              <ExternalLink className="w-3.5 h-3.5 opacity-50" strokeWidth={2} />
            </span>
          </div>
        </motion.a>
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

  const featuredProduct = products[0];
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
      {/* ── Banner principal — estilo Epic Games Store ──
          Rejilla 3:1: el banner grande a la izquierda y la lista de slides a
          la derecha. El slide activo se llena con una barra de progreso que
          indica cuánto falta para el siguiente; al tocar cualquiera se salta
          a él. En teléfono la lista se oculta y queda solo el banner. */}
      {heroSlides.length > 0 && (
      <section className="px-3 pt-4 pb-8 sm:px-5 lg:px-6">
        <div className="mx-auto w-full max-w-[1720px] lg:grid lg:gap-5" style={{ gridTemplateColumns: "3.6fr 1fr" }}>

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
      )}

      {/* ══════════════════════════════════════════════
          2. COLLECTIONS CAROUSEL (Shopify Concept style)
      ══════════════════════════════════════════════ */}
      {categories && categories.length > 0 && (
      <section className="bg-white border-b border-[#ebebeb] py-0" style={{ padding: '0 8px' }}>
        <div className="relative">

          {/* Flecha izquierda */}
          <button
            onClick={() => scrollCategories('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white shadow-lg rounded-full flex items-center justify-center border border-[#e5e5e5] hover:border-[#111] transition-colors -ml-2"
          >
            <ChevronLeft size={18} className="text-[#111]" />
          </button>

          {/* Scroll container */}
          <div
            ref={categoryScrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide py-6"
            style={{
              scrollSnapType: 'x mandatory',
              // El relleno deja que la primera y la última tarjeta también
              // lleguen al centro de la pantalla.
              paddingLeft: isMobile ? 'calc((100vw - (100vw - 48px)) / 2)' : '1.5rem',
              paddingRight: isMobile ? 'calc((100vw - (100vw - 48px)) / 2)' : '1.5rem',
              scrollPaddingInline: isMobile ? 'calc((100vw - (100vw - 48px)) / 2)' : '1.5rem',
            }}
          >
            {categories.map((cat, idx) => {
              const href = cat.slug ? `/catalog?category=${cat.slug}` : "/catalog";
              return (
              <Link key={cat.id} href={href}>
                <div
                  className="shrink-0 relative overflow-hidden cursor-pointer group"
                  style={{
                    scrollSnapAlign: 'center',
                    width: collectionCardWidth,
                    minWidth: isMobile ? 140 : 160,
                    aspectRatio: '1/1',
                    borderRadius: 18,
                    background: idx === 0 ? '#1a1a1a' : '#f0f0f0',
                  }}
                >
                  {cat.imageUrl && (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      style={{ opacity: idx === 0 ? 0.65 : 1 }}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: idx === 0
                        ? 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)'
                        : 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)',
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p
                          className="font-black text-white leading-tight"
                          style={{ fontSize: idx === 0 ? 18 : 16, fontFamily: idx === 0 ? "'Orbitron', sans-serif" : 'inherit' }}
                        >
                          {cat.name}
                        </p>
                        {cat.description && (
                          <p className="text-white/60 text-[11px] mt-0.5 leading-tight">{cat.description}</p>
                        )}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0 ml-2">
                        <ArrowRight size={12} className="text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );})}
          </div>

          {/* Flecha derecha */}
          <button
            onClick={() => scrollCategories('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white shadow-lg rounded-full flex items-center justify-center border border-[#e5e5e5] hover:border-[#111] transition-colors -mr-2"
          >
            <ChevronRight size={18} className="text-[#111]" />
          </button>

          {/* Dots */}
          {categories.length > 3 && (
            <div className="flex justify-center gap-2 pb-4">
              {Array.from({ length: Math.ceil(categories.length / 2) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const container = categoryScrollRef.current;
                    if (container) {
                      container.scrollTo({ left: i * 160 * 2, behavior: 'smooth' });
                      setCategoryIndex(i);
                    }
                  }}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === categoryIndex ? '20px' : '8px',
                    height: '8px',
                    background: i === categoryIndex ? '#111' : '#e5e5e5',
                  }}
                />
              ))}
            </div>
          )}

        </div>
      </section>
      )}

      {/* ══════════════════════════════════════════════
          4+5. VIDEO BANNER + FLOATING FEATURED PRODUCT
      ══════════════════════════════════════════════ */}
      {/* Outer wrapper: video + overlapping product card */}
      <div className="relative">

        {/* ── VIDEO BANNER ── */}
        {videoUrl && (
        <section className="hidden md:block bg-[#f5f5f5] py-0" style={{ padding: '0 8px 0 8px' }}>
          <div
            className="relative overflow-hidden"
            style={{ height: 480, borderRadius: 18 }}
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

        {/* ── FEATURED PRODUCT + CTA ── */}
        {featuredProduct && (
          <section
            className="py-16 relative overflow-hidden"
            style={{
              backgroundImage: textureEnabled ? 'url(/textura-isekai.svg)' : 'none',
              backgroundSize: 'cover',
              backgroundPosition: `center ${offsetY * 0.2}px`,
            }}
          >
            {/* Velo sobre la textura. El degradado va en una clase (no en
                style en línea) para que el modo oscuro pueda reemplazarlo:
                los estilos en línea ganan a cualquier hoja de estilos. */}
            <div className="absolute inset-0 spotlight-veil" />
            <div className="container relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-stretch">
              {/* Card del producto — izquierda */}
              <div>
                <FeaturedProductCard
                  product={featuredProduct}
                  onAddToCart={handleAddToCart}
                />
              </div>

              {/* CTA — derecha, solo desktop */}
              <div className="hidden lg:flex flex-col items-center justify-center text-center gap-6 bg-[#f8f8f8] rounded-2xl p-10 min-h-full">
                <span className="text-xs font-semibold tracking-widest text-[#888] uppercase">
                  Nuestra tienda
                </span>
                <h3 className="text-3xl font-bold text-[#111] leading-tight">
                  Explora toda<br/>la colección
                </h3>
                <p className="text-[#555] text-sm leading-relaxed">
                  Figuras únicas impresas en 3D de tus universos favoritos. Anime, gaming y más.
                </p>
                <Link
                  href="/catalog"
                  className="bg-[#111] text-white px-8 py-3 rounded-full font-semibold text-sm hover:bg-[#333] transition-colors"
                >
                  Ver tienda →
                </Link>
              </div>
            </div>
            </div>{/* container */}
          </section>
        )}
      </div>



      {/* ══════════════════════════════════════════════
          7. COUNTDOWN SALE SLIDER (ISLAND)
      ══════════════════════════════════════════════ */}
      <SaleSlider />

      {/* ══════════════════════════════════════════════
          8. BEST SELLERS (TABBED)
      ══════════════════════════════════════════════ */}
      <section className="py-16">
        <div className="container">
          {/* Header: título + flechas en una fila, filtros debajo ancho completo */}
          <div className="flex flex-col justify-between mb-6 gap-3">
            <div className="flex items-center justify-between gap-4">
              <h2
                className="text-3xl md:text-5xl font-black leading-none"
                style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#1a1a1a' }}
              >
                {t.home.bestSellers}
              </h2>
              {/* Navigation arrows — solo desktop */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { const el = document.getElementById('best-sellers-scroll'); if (el) el.scrollBy({ left: -320, behavior: 'smooth' }); }}
                  className="w-10 h-10 rounded-full border border-[#ddd] flex items-center justify-center hover:border-[#1a1a1a] transition-colors bg-white"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => { const el = document.getElementById('best-sellers-scroll'); if (el) el.scrollBy({ left: 320, behavior: 'smooth' }); }}
                  className="w-10 h-10 rounded-full border border-[#ddd] flex items-center justify-center hover:border-[#1a1a1a] transition-colors bg-white"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            {/* Filtros — con sus propias flechas: las de arriba mueven los
                productos, no los chips */}
            <div className="relative -mx-4 px-4">
              <button
                onClick={() => { const el = document.getElementById('cat-chips-scroll'); if (el) el.scrollBy({ left: -260, behavior: 'smooth' }); }}
                aria-label="Categorías anteriores"
                className="cat-arrow absolute left-1 top-1/2 -translate-y-1/2 z-10 hidden md:flex"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => { const el = document.getElementById('cat-chips-scroll'); if (el) el.scrollBy({ left: 260, behavior: 'smooth' }); }}
                aria-label="Más categorías"
                className="cat-arrow absolute right-1 top-1/2 -translate-y-1/2 z-10 hidden md:flex"
              >
                <ChevronRight size={15} />
              </button>
            <div
              id="cat-chips-scroll"
              className="flex gap-2 pb-2 md:px-8"
              style={{
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
              }}
            >
              <button
                onClick={() => navigate('/catalog')}
                className="tab-pill flex-shrink-0"
              >
                Todo
              </button>
              {(categories ?? []).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/catalog?category=${cat.slug}`)}
                  className="tab-pill flex-shrink-0"
                >
                  {cat.name}
                </button>
              ))}
              <div className="flex-shrink-0 w-6" />
            </div>
            </div>
          </div>

          {/* Horizontal scroll container */}
          {productsLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="shrink-0 rounded-2xl shimmer" style={{ width: 'clamp(220px, calc(20% - 12.8px), 320px)', aspectRatio: '3/4' }} />
              ))}
            </div>
          ) : displayProducts.length > 0 ? (
            <div id="best-sellers-scroll" className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {displayProducts.map((product: any) => {
                const numPrice = parseFloat(product.price);
                const numCompare = product.compareAtPrice ? parseFloat(product.compareAtPrice) : null;
                const hasDiscount = numCompare && numCompare > numPrice;
                const discountPct = hasDiscount ? Math.round(((numCompare! - numPrice) / numCompare!) * 100) : 0;
                const isOutOfStock = product.stock <= 0;
                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="shrink-0 group cursor-pointer"
                    style={{ width: 'clamp(220px, calc(20% - 12.8px), 320px)' }}
                  >
                    <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden hover:shadow-md transition-shadow duration-300">
                      {/* Image area */}
                      <div className="relative bg-[#f5f5f5] overflow-hidden" style={{ aspectRatio: '1/1' }}>
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            width={400}
                            height={400}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#f9f9f9]">
                            <ShoppingBag size={40} className="text-[#ddd]" />
                          </div>
                        )}
                        {/* Badges top-left */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          {hasDiscount && (
                            <span className="bg-[#e63946] text-white text-[10px] font-bold px-2.5 py-1 rounded-full leading-none">-{discountPct}%</span>
                          )}
                          {isOutOfStock && (
                            <span className="bg-[#999] text-white text-[10px] font-bold px-2.5 py-1 rounded-full leading-none">Agotado</span>
                          )}
                        </div>
                        {/* Add to cart on hover */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-250">
                          <button
                            onClick={async (e) => {
                              e.preventDefault(); e.stopPropagation();
                              if (!isOutOfStock) { try { await addItem(product.id); toast.success("Agregado al carrito"); } catch { toast.error("No se pudo agregar"); } }
                            }}
                            disabled={isOutOfStock}
                            className="w-full bg-[#111] text-white text-[12px] font-semibold py-2.5 rounded-full hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <ShoppingBag size={12} />
                            {isOutOfStock ? "Agotado" : "Agregar al carrito"}
                          </button>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-3 pb-3">
                        {product.category?.name && (
                          <p className="text-[10px] font-semibold text-[#888] uppercase tracking-[0.08em] mb-0.5">{product.category.name}</p>
                        )}
                        <h3 className="text-[13px] font-semibold text-[#1a1a1a] leading-snug line-clamp-2 mb-1">{product.name}</h3>
                        <div className="flex items-baseline gap-1.5">
                          <PriceDisplay price={numPrice} size="sm" />
                          {hasDiscount && <span className="text-[11px] text-[#aaa] line-through">${numCompare!.toFixed(2)}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <ShoppingBag size={48} className="text-[#ccc] mx-auto mb-4" />
              <p className="text-[#888] text-lg font-medium">{t.home.noProducts}</p>
              <p className="text-[#aaa] text-sm mt-1">{t.home.noProductsDesc}</p>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          9. MARQUEE TICKER
      ══════════════════════════════════════════════ */}
      <section className="bg-[#f5e642] border-y border-[#e8d800] overflow-hidden py-5">
        <style>{`
          @keyframes marquee-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .marquee-track {
            display: flex;
            width: max-content;
            animation: marquee-scroll 22s linear infinite;
          }
          .marquee-track:hover { animation-play-state: paused; }
        `}</style>
        <div className="marquee-track">
          {[...Array(2)].map((_, rep) => (
            <div key={rep} className="flex items-center shrink-0">
              {[
                "Figuras Anime 3D",
                "★",
                "Ediciones Limitadas",
                "★",
                "Gaming Culture",
                "★",
                "Envío Gratis +$150",
                "★",
                "Coleccionables Premium",
                "★",
                "Nuevos Drops Semanales",
                "★",
                "ISEKAI WORLD",
                "★",
              ].map((item, i) => (
                <span
                  key={i}
                  className="text-[#1a1a1a] font-black uppercase tracking-wide px-6 shrink-0"
                  style={{
                    fontSize: item === "★" ? "18px" : "clamp(18px, 2.5vw, 26px)",
                    fontFamily: item === "ISEKAI WORLD" ? "'Orbitron', sans-serif" : "inherit",
                    opacity: item === "★" ? 0.35 : 1,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

        {/* ════════════════════════════════════════════
          11. SHOP THE FEED (Instagram)
      ════════════════════════════════════════════ */}
      <InstagramFeedSection />

    </div>
  );
}

