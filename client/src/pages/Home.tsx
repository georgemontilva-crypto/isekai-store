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
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import FeaturedProductCard from "@/components/FeaturedProductCard";
import { useLang } from "@/i18n/LangContext";

/* ─── Collections ─── */
const collectionHrefsHome = ["/catalog","/catalog","/catalog","/catalog","/catalog"];
const collectionImgsHome = [
  "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&q=80",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80",
  "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80",
];
const _old_collections_ignore = [
  {
    name: "Todo el Catálogo",
    count: "120+ items",
    desc: "Explora toda la tienda",
    bg: "#1a1a1a",
    textColor: "white",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&q=80",
  },
  {
    name: "Audifonos",
    count: "15 products",
    desc: "Sumérgete en el sonido",
    bg: "#f5f5f5",
    textColor: "#1a1a1a",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
  },
  {
    name: "Auriculares",
    count: "8 products",
    desc: "Diseño compacto, gran sonido",
    bg: "#f5f5f5",
    textColor: "#1a1a1a",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80",
  },
  {
    name: "Parlantes",
    count: "11 products",
    desc: "El sonido más inmersivo del mundo",
    bg: "#f5f5f5",
    textColor: "#1a1a1a",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80",
  },
  {
    name: "Accesorios",
    count: "24 products",
    desc: "Calidad que dura años",
    bg: "#f5f5f5",
    textColor: "#1a1a1a",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80",
  },
];

/* ─── Brand logos ─── */
const brands = ["B&O", "Bose", "Sennheiser", "Logitech", "Apple", "Sony", "JBL"];

/* ─── Marquee items ─── */
const marqueeItems = [
  "Juega lo que quieras", "Comodidad todo el día", "Sonido premium", "Envío gratis",
  "Juega lo que quieras", "Comodidad todo el día", "Sonido premium", "Envío gratis",
];

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
      <div className="relative overflow-hidden rounded-[18px]">
        {/* Images — crossfade */}
        {banners.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="w-full object-cover"
            style={{
              display: i === idx ? 'block' : 'none',
              maxHeight: isMobile ? 220 : 420,
            }}
          />
        ))}

        {/* Dots */}
        {total > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 3 }}>
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
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
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 hidden sm:flex items-center justify-center text-white transition-colors"
              style={{ zIndex: 3 }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setIdx(i => (i + 1) % total)}
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
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)",
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          whileHover={{ scale: 1.005 }}
        >
          {/* Decorative gradient orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #e1306c, transparent 70%)", transform: "translate(30%, -30%)" }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #833ab4, transparent 70%)", transform: "translate(-20%, 30%)" }} />

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
  const products = productsData?.items ?? [];
  const { addItem } = useCart();

  const heroSlides = [1, 2, 3]
    .map(n => ({
      image:      settings?.[`hero_slide_${n}_image`]       ?? "",
      title:      settings?.[`hero_slide_${n}_title`]       ?? "",
      subtitle:   settings?.[`hero_slide_${n}_subtitle`]    ?? "",
      buttonText: settings?.[`hero_slide_${n}_button_text`] ?? "",
      buttonUrl:  settings?.[`hero_slide_${n}_button_url`]  ?? "/catalog",
    }))
    .filter(s => s.image);

  // Auto-advance hero
  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % heroSlides.length), 5000);
    return () => clearInterval(t);
  }, [heroSlides.length]);

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
      {heroSlides.length > 0 && (
      <section className="hero-peek-section">
        {/* Track */}
        <div className="hero-peek-track">
          {heroSlides.map((slide, i) => {
            const offset = i - heroIdx;
            const isActive = offset === 0;
            const isPrev = offset === -1 || (heroIdx === 0 && i === heroSlides.length - 1);
            const isNext = offset === 1 || (heroIdx === heroSlides.length - 1 && i === 0);
            return (
              <div
                key={i}
                className={`hero-peek-slide ${
                  isActive ? "active" : isPrev ? "prev" : isNext ? "next" : "hidden-slide"
                }`}
                onClick={() => !isActive && setHeroIdx(i)}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className={`hero-peek-img ${isActive ? "zoomed-in" : ""}`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
                {isActive && (slide.title || slide.buttonText) && (
                  <div className="hero-peek-content">
                    {slide.title && (
                      <h1 className="hero-peek-title">{slide.title.toUpperCase()}</h1>
                    )}
                    {slide.subtitle && (
                      <p className="text-white/80 text-base mb-4">{slide.subtitle}</p>
                    )}
                    {slide.buttonText && (
                      <Link href={slide.buttonUrl} className="btn-pill-white">
                        {slide.buttonText}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Controls row */}
        <div className="hero-peek-controls">
          <button
            onClick={() => setHeroIdx(i => (i - 1 + heroSlides.length) % heroSlides.length)}
            className="hero-ctrl-btn"
            aria-label="Anterior"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIdx(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === heroIdx ? "w-5 h-[6px] bg-[#1a1a1a]" : "w-[6px] h-[6px] bg-[#ccc]"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setHeroIdx(i => (i + 1) % heroSlides.length)}
            className="hero-ctrl-btn"
            aria-label="Siguiente"
          >
            →
          </button>
        </div>
      </section>
      )}

      {/* ══════════════════════════════════════════════
          2. COLLECTIONS CAROUSEL (Shopify Concept style)
      ══════════════════════════════════════════════ */}
      <section className="bg-white border-b border-[#ebebeb] py-0">
        {/* 5 cards visible, scrollable, 8px left margin matching hero */}
        <div
          className="flex gap-[10px] overflow-x-auto scrollbar-hide"
          style={{ padding: '24px 8px 28px 8px' }}
        >
          {(categories && categories.length > 0 ? categories : t.home.collections.map((col, idx) => ({
            id: idx,
            name: col.name,
            slug: "",
            description: col.desc ?? "",
            imageUrl: collectionImgsHome[idx] ?? null,
            featured: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))).map((cat, idx) => {
            const img = cat.imageUrl || collectionImgsHome[idx % collectionImgsHome.length];
            const href = 'slug' in cat && cat.slug ? `/catalog?category=${cat.slug}` : "/catalog";
            return (
            <Link key={cat.id} href={href}>
              <div
                className="shrink-0 relative overflow-hidden cursor-pointer group"
                style={{
                  width: collectionCardWidth,
                  minWidth: isMobile ? 140 : 160,
                  height: 300,
                  borderRadius: 18,
                  background: idx === 0 ? '#1a1a1a' : '#f0f0f0',
                }}
              >
                <img
                  src={img}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  style={{ opacity: idx === 0 ? 0.65 : 1 }}
                />
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
                      {'description' in cat && cat.description && (
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
      </section>

      {/* ══════════════════════════════════════════════
          3. BRAND STORY
      ══════════════════════════════════════════════ */}
      <section className="border-b border-[#ebebeb] bg-[#f5f5f5] py-6 px-[8px]">
        {/* Same 8px side margin as hero carousel prev/next slides */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-0">
          {/* LEFT: image island with same 8px left margin as hero */}
          <div
            className="overflow-hidden"
            style={{ height: isMobile ? '180px' : '240px', borderRadius: '18px' }}
          >
            <img
              src={settings?.["brand_story_image"] || "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=900&auto=format&fit=crop"}
              alt="Figuras coleccionables 3D anime"
              className="w-full h-full object-cover"
            />
          </div>
          {/* RIGHT: brand statement */}
          <div className="flex flex-col justify-center px-0 pt-5 md:pt-0 md:px-10 lg:px-16">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#888] mb-3">
              {settings?.["brand_story_label"] ?? t.home.brandStory.label}
            </p>
            {(() => {
              const raw = settings?.["brand_story_heading"] ?? `${t.home.brandStory.heading} | ${t.home.brandStory.highlight}`;
              const parts = raw.split("|");
              const blackPart = parts[0]?.trim();
              const magentaPart = parts[1]?.trim();
              return (
                <h2
                  style={{ fontFamily: "'Orbitron', sans-serif", lineHeight: 1.15 }}
                  className="text-2xl md:text-3xl lg:text-4xl font-black mb-0"
                >
                  {blackPart && <span className="text-[#111]">{blackPart} </span>}
                  {magentaPart && (
                    <span
                      style={{
                        background: "linear-gradient(to right, #e5007d, #ff0099)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {magentaPart}
                    </span>
                  )}
                </h2>
              );
            })()}
            <p className="mt-4 text-[14px] text-[#666] leading-relaxed">
              {settings?.["brand_story_body"] ?? t.home.brandStory.body}
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4+5. VIDEO BANNER + FLOATING FEATURED PRODUCT
      ══════════════════════════════════════════════ */}
      {/* Outer wrapper: video + overlapping product card */}
      <div className="relative">

        {/* ── VIDEO BANNER ── */}
        <section className="bg-[#f5f5f5] py-0" style={{ padding: '0 8px 0 8px' }}>
          <div
            className="relative overflow-hidden"
            style={{ height: 480, borderRadius: 18 }}
          >
            <img
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80"
              alt="Sound sculpted"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <h2
                className="font-black text-white mb-3"
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 'clamp(36px, 6vw, 72px)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                }}
              >
                {t.home.videoBanner.title}
              </h2>
              <p className="text-white/70 text-[15px] mb-7">
                {t.home.videoBanner.subtitle}
              </p>
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 bg-white text-[#1a1a1a] font-semibold text-[14px] px-7 py-3.5 rounded-full hover:bg-white/90 transition-colors"
              >
                {t.home.videoBanner.cta} <ArrowRight size={14} />
              </Link>
            </div>
            {/* Pause button bottom-right */}
            <button
              className="absolute bottom-5 right-5 w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              aria-label="Pausar"
            >
              <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                <rect x="0" y="0" width="4" height="14" rx="1.5" />
                <rect x="8" y="0" width="4" height="14" rx="1.5" />
              </svg>
            </button>
          </div>
        </section>

        {/* ── FEATURED PRODUCT + CTA ── */}
        {featuredProduct && (
          <section
            className="py-16 relative overflow-hidden"
            style={{
              backgroundImage: settings?.["texture_enabled"] === "true" ? `url(/textura-isekai.svg)` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: `center ${offsetY * 0.3}px`,
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.92) 60%, rgba(255,255,255,1) 100%)' }} />
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
            {/* Filtros — hermano directo, ancho completo, scroll sin clip */}
            <div
              className="flex gap-2 pb-2 -mx-4 px-4"
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
                            className="w-full bg-[#1a1a1a] text-white text-[12px] font-semibold py-2.5 rounded-full hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
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
                          <span className="text-[13px] font-bold text-[#1a1a1a]">${numPrice.toFixed(2)}</span>
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

