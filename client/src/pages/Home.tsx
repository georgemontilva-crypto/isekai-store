import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, Star, Play, ShoppingBag } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import FeaturedProductCard from "@/components/FeaturedProductCard";

/* ─── Hero Slides ─── */
const heroSlides = [
  {
    bg: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80",
    tag: "New Collection",
    title: "Experience\nUnparalleled\nAudio Elegance",
    cta: "Shop Headphones",
    href: "/catalog",
  },
  {
    bg: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1600&q=80",
    tag: "Limited Edition",
    title: "Sound.\nSculpted.\nPerfected.",
    cta: "Explore Now",
    href: "/catalog",
  },
  {
    bg: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1600&q=80",
    tag: "Best Sellers",
    title: "Premium\nAudio\nGear",
    cta: "View Collection",
    href: "/catalog",
  },
];

/* ─── Collections ─── */
const collections = [
  {
    name: "All Products",
    count: "120+ items",
    desc: "Check out all our products",
    bg: "#1a1a1a",
    textColor: "white",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&q=80",
  },
  {
    name: "Headphones",
    count: "15 products",
    desc: "Surround yourself in sound",
    bg: "#f5f5f5",
    textColor: "#1a1a1a",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
  },
  {
    name: "Earphones",
    count: "8 products",
    desc: "Small design, great sound",
    bg: "#f5f5f5",
    textColor: "#1a1a1a",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80",
  },
  {
    name: "Speakers",
    count: "11 products",
    desc: "The world's most immersive sound",
    bg: "#f5f5f5",
    textColor: "#1a1a1a",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80",
  },
  {
    name: "Accessories",
    count: "24 products",
    desc: "Optimal condition for years",
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
  "Play anything", "Day-long comfort", "Premium sound", "Free shipping",
  "Play anything", "Day-long comfort", "Premium sound", "Free shipping",
];

/* ─── Countdown hook ─── */
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) return;
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return timeLeft;
}

/* ─── Tab categories ─── */
const tabCategories = ["All", "Headphones", "Earphones", "Speakers", "Accessories"];

export default function Home() {
  const [heroIdx, setHeroIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("All");
  const [saleTarget] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const countdown = useCountdown(saleTarget);

  const { data: productsData, isLoading: productsLoading } = trpc.products.list.useQuery({
    limit: 12,
    status: "published",
  });
  const { data: categories } = trpc.categories.list.useQuery();
  const products = productsData?.items ?? [];
  const { addItem } = useCart();

  // Auto-advance hero
  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % heroSlides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const featuredProduct = products[0];
  const displayProducts = products.slice(0, 8);

  const handleAddToCart = async (id: number, name: string) => {
    try {
      await addItem(id);
      toast.success(`${name} added to cart`);
    } catch {
      toast.error("Could not add to cart");
    }
  };

  return (
    <div className="bg-white text-[#1a1a1a]">

      {/* ══════════════════════════════════════════════
          1. HERO PEEK CAROUSEL
      ══════════════════════════════════════════════ */}
      <section className="hero-peek-section">
        {/* Social sidebar */}
        <div className="hero-social-bar">
          <a href="#" aria-label="Facebook" className="hero-social-icon">f</a>
          <a href="#" aria-label="Twitter" className="hero-social-icon">𝕏</a>
          <a href="#" aria-label="Instagram" className="hero-social-icon">◎</a>
          <a href="#" aria-label="YouTube" className="hero-social-icon">▶</a>
          <div className="hero-social-promo">GET 20% OFF</div>
        </div>

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
                  src={slide.bg}
                  alt={slide.title}
                  className={`hero-peek-img ${isActive ? "zoomed-in" : ""}`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
                {isActive && (
                  <div className="hero-peek-content">
                    <h1 className="hero-peek-title">{slide.title.toUpperCase()}</h1>
                    <Link href={slide.href} className="btn-pill-white">
                      {slide.cta}
                    </Link>
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
            aria-label="Previous"
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
            aria-label="Next"
          >
            →
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          2. BRAND STORY
      ══════════════════════════════════════════════ */}
      <section className="border-b border-[#ebebeb] bg-[#f5f5f5] py-6 px-[8px]">
        {/* Same 8px side margin as hero carousel prev/next slides */}
        <div className="grid items-center" style={{ gridTemplateColumns: '50% 1fr', gap: '0' }}>
          {/* LEFT: image island with same 8px left margin as hero */}
          <div
            className="overflow-hidden"
            style={{ height: '280px', borderRadius: '18px' }}
          >
            <img
              src="https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=900&auto=format&fit=crop"
              alt="Figuras coleccionables 3D anime"
              className="w-full h-full object-cover"
            />
          </div>
          {/* RIGHT: brand statement */}
          <div className="flex flex-col justify-center px-10 lg:px-16">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#888] mb-3">Nuestra filosofía</p>
            <h2
              style={{ fontFamily: "'Orbitron', sans-serif", lineHeight: 1.15 }}
              className="text-2xl md:text-3xl lg:text-4xl font-black text-[#1a1a1a] mb-0"
            >
              We believe in the{" "}
              <span
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  background: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                power of craft
              </span>
            </h2>
            <p className="mt-4 text-[14px] text-[#666] leading-relaxed max-w-sm">
              Cada figura es una obra de arte impresa en 3D, diseñada para coleccionistas que viven el anime y los videojuegos.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3. COLLECTIONS CAROUSEL (Shopify Concept style)
      ══════════════════════════════════════════════ */}
      <section className="bg-white border-b border-[#ebebeb] py-0">
        {/* 5 cards visible, scrollable, 8px left margin matching hero */}
        <div
          className="flex gap-[10px] overflow-x-auto scrollbar-hide"
          style={{ padding: '24px 8px 28px 8px' }}
        >
          {collections.map((col, idx) => (
            <Link key={col.name} href={col.href}>
              <div
                className="shrink-0 relative overflow-hidden cursor-pointer group"
                style={{
                  /* 5 cards fill viewport: (100vw - 8px left - 8px right - 4*10px gaps) / 5 */
                  width: 'calc((100vw - 16px - 40px) / 5)',
                  minWidth: 200,
                  height: 300,
                  borderRadius: 18,
                  background: idx === 0 ? '#1a1a1a' : '#f0f0f0',
                }}
              >
                {/* Full-cover image with subtle hover zoom */}
                <img
                  src={col.img}
                  alt={col.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  style={{ opacity: idx === 0 ? 0.65 : 1 }}
                />
                {/* Gradient overlay for text legibility */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: idx === 0
                      ? 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)'
                      : 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)',
                  }}
                />
                {/* Bottom label */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p
                        className="font-black text-white leading-tight"
                        style={{
                          fontSize: idx === 0 ? 18 : 16,
                          fontFamily: idx === 0 ? "'Orbitron', sans-serif" : 'inherit',
                        }}
                      >
                        {col.name}
                        <sup className="text-[10px] font-normal ml-1 opacity-60">{col.count.split(' ')[0]}</sup>
                      </p>
                      <p className="text-white/60 text-[11px] mt-0.5 leading-tight">{col.desc}</p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0 ml-2">
                      <ArrowRight size={12} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
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
                Sound. Sculpted.
              </h2>
              <p className="text-white/70 text-[15px] mb-7">
                A speaker that excites the eye and ear from every angle.
              </p>
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 bg-white text-[#1a1a1a] font-semibold text-[14px] px-7 py-3.5 rounded-full hover:bg-white/90 transition-colors"
              >
                Shop Echo Elegance <ArrowRight size={14} />
              </Link>
            </div>
            {/* Pause button bottom-right */}
            <button
              className="absolute bottom-5 right-5 w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              aria-label="Pause"
            >
              <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                <rect x="0" y="0" width="4" height="14" rx="1.5" />
                <rect x="8" y="0" width="4" height="14" rx="1.5" />
              </svg>
            </button>
          </div>
        </section>

        {/* ── FLOATING FEATURED PRODUCT CARD ── */}
        {featuredProduct && (
          <FeaturedProductCard
            product={featuredProduct}
            onAddToCart={handleAddToCart}
          />
        )}
      </div>



      {/* ══════════════════════════════════════════════
          6. CATEGORIES CAROUSEL
      ══════════════════════════════════════════════ */}
      {categories && categories.length > 0 && (
        <section style={{ padding: '24px 8px 0 8px' }}>
          <div
            className="flex gap-3 overflow-x-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalog?category=${cat.slug}`}
                className="relative shrink-0 rounded-[18px] overflow-hidden block group"
                style={{
                  width: 'clamp(62vw, calc((100vw - 16px - 4 * 12px) / 5), 320px)',
                  flexShrink: 0,
                  aspectRatio: '3/4',
                }}
              >
                {/* Background image */}
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#2a2a2a]" />
                )}
                {/* Gradient overlay: black bottom → transparent top */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 45%, transparent 100%)',
                  }}
                />
                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-bold text-[15px] leading-tight">{cat.name}</p>
                  {cat.description && (
                    <p className="text-white/70 text-[11px] mt-0.5 line-clamp-1">{cat.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <style>{`
            section div::-webkit-scrollbar { display: none; }
          `}</style>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          7. COUNTDOWN SALE BANNER
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: "340px" }}>
        <img
          src="https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1600&q=80"
          alt="Sale"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative z-10 container py-16 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="text-white text-center md:text-left">
            <span className="section-label text-white/60 mb-2 block">Limited Time Offer</span>
            <h2 className="text-4xl md:text-5xl font-black mb-2">
              Get up to <span className="italic-serif">50% off</span>
            </h2>
            <p className="text-white/70 text-[15px] mb-6">
              On waterproof speakers and premium headphones
            </p>
            <Link href="/catalog" className="btn-pill-white">
              Discover sales <ArrowRight size={14} />
            </Link>
          </div>
          {/* Countdown */}
          <div className="flex items-center gap-4 text-white">
            {[
              { value: countdown.days, label: "Days" },
              { value: countdown.hours, label: "Hours" },
              { value: countdown.mins, label: "Mins" },
              { value: countdown.secs, label: "Secs" },
            ].map(({ value, label }, i) => (
              <div key={label} className="flex items-center gap-4">
                <div className="text-center">
                  <div className="countdown-digit">{String(value).padStart(2, "0")}</div>
                  <div className="text-[11px] text-white/60 uppercase tracking-widest mt-1">{label}</div>
                </div>
                {i < 3 && <span className="text-3xl font-bold text-white/40 mb-4">:</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          8. BEST SELLERS (TABBED)
      ══════════════════════════════════════════════ */}
      <section className="py-20">
        <div className="container">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <h2 className="text-3xl font-black">Best Sellers</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {tabCategories.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`tab-pill ${activeTab === tab ? "active" : ""}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Products grid */}
          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl shimmer" />
              ))}
            </div>
          ) : displayProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
              {displayProducts.map((product: any, i: number) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  slug={product.slug}
                  price={product.price}
                  compareAtPrice={product.compareAtPrice}
                  imageUrl={(product as any).imageUrl}
                  category={product.categoryName}
                  isNew={i < 2}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <ShoppingBag size={48} className="text-[#ccc] mx-auto mb-4" />
              <p className="text-[#888] text-lg font-medium">No products yet</p>
              <p className="text-[#aaa] text-sm mt-1">Add products from the admin panel to see them here</p>
            </div>
          )}

          {displayProducts.length > 0 && (
            <div className="text-center mt-10">
              <Link href="/catalog" className="btn-pill-outline">
                View all products <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          9. BRAND LOGOS
      ══════════════════════════════════════════════ */}
      <section className="py-10 bg-[#f5e642] border-y border-[#e8d800]">
        <div className="container">
          <div className="flex items-center justify-between gap-6 overflow-x-auto scrollbar-hide">
            {brands.map(brand => (
              <span
                key={brand}
                className="text-[#1a1a1a] font-black text-lg md:text-2xl shrink-0 opacity-70 hover:opacity-100 transition-opacity cursor-default"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          10. PRESS QUOTE
      ══════════════════════════════════════════════ */}
      <section
        className="py-20 text-center text-white"
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
        }}
      >
        <div className="container max-w-3xl">
          <div className="text-6xl font-black text-white/20 mb-4">"</div>
          <blockquote className="text-2xl md:text-3xl font-bold leading-snug mb-6">
            Isekai Store's meticulous curation of premium audio tech truly stands out. Their offerings, from headphones to expansive home theaters, consistently raise the bar.
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-white/30" />
            <div>
              <p className="font-bold text-[15px]">Rolling Stone</p>
              <p className="text-white/60 text-[13px]">— Nathan Wright</p>
            </div>
            <div className="h-px w-12 bg-white/30" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          11. SHOP THE FEED (Instagram-style)
      ══════════════════════════════════════════════ */}
      <section className="py-20 border-b border-[#ebebeb]">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black">Shop the Feed</h2>
              <p className="text-[#888] text-[14px] mt-1">@isekaistore</p>
            </div>
            <a href="#" className="btn-pill-outline text-sm">
              Follow us <ArrowRight size={13} />
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
              "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80",
              "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80",
              "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80",
            ].map((img, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer img-zoom">
                <img src={img} alt={`Feed ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                  <span className="btn-pill-white text-[12px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Shop the Look
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

