import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, Star, Play, ShoppingBag, Instagram, ExternalLink } from "lucide-react";
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

/* ─── Sale Slides data ─── */
const saleSlides = [
  {
    bg: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1600&q=80",
    label: "Limited Time Offer",
    title: "Get up to",
    highlight: "50% off",
    subtitle: "On waterproof speakers and premium headphones",
    cta: "Discover sales",
    href: "/catalog",
  },
  {
    bg: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&q=80",
    label: "Flash Sale",
    title: "Up to",
    highlight: "40% off",
    subtitle: "On premium over-ear headphones — limited stock",
    cta: "Shop headphones",
    href: "/catalog",
  },
  {
    bg: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=1600&q=80",
    label: "Weekend Deal",
    title: "Save",
    highlight: "30%",
    subtitle: "On portable Bluetooth speakers, this weekend only",
    cta: "View speakers",
    href: "/catalog",
  },
];

/* ─── SaleSlider component ─── */
function SaleSlider({ countdown }: { countdown: { days: number; hours: number; mins: number; secs: number } }) {
  const [idx, setIdx] = useState(0);
  const total = saleSlides.length;

  // Auto-advance every 5 seconds
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % total), 5000);
    return () => clearInterval(t);
  }, [total]);

  const slide = saleSlides[idx];

  return (
    <section style={{ padding: '24px 8px 0 8px' }}>
      <div
        className="relative overflow-hidden"
        style={{ borderRadius: 18, minHeight: 320 }}
      >
        {/* Background images — crossfade */}
        {saleSlides.map((s, i) => (
          <img
            key={i}
            src={s.bg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: i === idx ? 1 : 0,
              transition: 'opacity 800ms cubic-bezier(0.23,1,0.32,1)',
              zIndex: 0,
            }}
          />
        ))}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" style={{ zIndex: 1 }} />

        {/* Content */}
        <div
          className="relative flex flex-col md:flex-row items-center justify-between gap-8 px-8 md:px-16 py-14"
          style={{ zIndex: 2 }}
        >
          {/* Left: text + CTA */}
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
            className="text-white text-center md:text-left"
          >
            <span
              className="inline-block text-[11px] uppercase tracking-[0.2em] mb-3"
              style={{ fontFamily: 'Orbitron, sans-serif', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.2em' }}
            >
              {slide.label}
            </span>
            <h2
              className="text-4xl md:text-5xl mb-2 leading-tight"
              style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#ffffff' }}
            >
              {slide.title}{' '}
              <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 900, color: '#ffffff' }}>{slide.highlight}</span>
            </h2>
            <p className="text-[15px] mb-7" style={{ color: 'rgba(255,255,255,0.75)' }}>{slide.subtitle}</p>
            <Link
              href={slide.href}
              className="inline-flex items-center gap-2 bg-white text-black text-[13px] font-semibold px-6 py-3 rounded-full hover:bg-white/90 transition-colors"
            >
              {slide.cta} <ArrowRight size={14} />
            </Link>
          </motion.div>

          {/* Right: countdown */}
          <motion.div
            key={`cd-${idx}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
            className="flex items-center gap-3 text-white"
          >
            {[
              { value: countdown.days, label: 'Days' },
              { value: countdown.hours, label: 'Hours' },
              { value: countdown.mins, label: 'Mins' },
              { value: countdown.secs, label: 'Secs' },
            ].map(({ value, label }, i) => (
              <div key={label} className="flex items-center gap-3">
                <div className="text-center">
                  <div
                    className="text-5xl md:text-6xl font-black tabular-nums leading-none"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    {String(value).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest mt-1">{label}</div>
                </div>
                {i < 3 && <span className="text-3xl font-bold text-white/30 mb-5">:</span>}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Dot indicators */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
          style={{ zIndex: 3 }}
        >
          {saleSlides.map((_, i) => (
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

        {/* Arrow buttons */}
        <button
          onClick={() => setIdx(i => (i - 1 + total) % total)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-colors"
          style={{ zIndex: 3 }}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => setIdx(i => (i + 1) % total)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-colors"
          style={{ zIndex: 3 }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}

/* ─── Instagram Feed Section ─────────────────────────────────────────────────────────────────────────────────── */
function InstagramFeedSection() {
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
          className="relative flex flex-col md:flex-row md:items-center justify-between gap-8 rounded-3xl overflow-hidden px-10 py-14 md:py-16 group cursor-pointer"
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
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3" style={{ fontFamily: "'Orbitron', sans-serif" }}>Shop the Feed</h2>
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
          <style>{`
            .cat-carousel { display:flex; gap:12px; overflow-x:auto; scrollbar-width:none; -ms-overflow-style:none; -webkit-overflow-scrolling:touch; }
            .cat-carousel::-webkit-scrollbar { display:none; }
            .cat-card { flex-shrink:0; width:66vw; aspect-ratio:3/4; }
            @media(min-width:768px){ .cat-card { width:calc((100vw - 16px - 4 * 12px) / 5); } }
          `}</style>
          <div className="cat-carousel">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalog?category=${cat.slug}`}
                className="cat-card relative rounded-[18px] overflow-hidden block group"
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
        </section>
      )}

      {/* ══════════════════════════════════════════════
          7. COUNTDOWN SALE SLIDER (ISLAND)
      ══════════════════════════════════════════════ */}
      <SaleSlider countdown={countdown} />

      {/* ══════════════════════════════════════════════
          8. BEST SELLERS (TABBED)
      ══════════════════════════════════════════════ */}
      <section className="py-16">
        <div className="container">
          {/* Header row: title + tabs left, arrows right */}
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-6 flex-wrap">
              <h2
                className="text-4xl md:text-5xl font-black leading-none"
                style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#1a1a1a' }}
              >
                Best Sellers
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {tabCategories.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`tab-pill ${activeTab === tab ? 'active' : ''}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            {/* Navigation arrows */}
            <div className="flex items-center gap-2 shrink-0">
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

          {/* Horizontal scroll container */}
          {productsLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="shrink-0 rounded-2xl shimmer" style={{ width: 'clamp(220px, calc(20% - 12.8px), 320px)', aspectRatio: '3/4' }} />
              ))}
            </div>
          ) : displayProducts.length > 0 ? (
            <div id="best-sellers-scroll" className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {displayProducts.map((product: any, i: number) => {
                const numPrice = parseFloat(product.price);
                const numCompare = product.compareAtPrice ? parseFloat(product.compareAtPrice) : null;
                const hasDiscount = numCompare && numCompare > numPrice;
                const discountPct = hasDiscount ? Math.round(((numCompare! - numPrice) / numCompare!) * 100) : 0;
                const isOutOfStock = product.stock <= 0;
                const isNewProduct = i < 2;
                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="shrink-0 group cursor-pointer"
                    style={{ width: 'clamp(220px, calc(20% - 12.8px), 320px)' }}
                  >
                    <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden hover:shadow-md transition-shadow duration-300">
                      {/* Image area */}
                      <div className="relative bg-white overflow-hidden" style={{ aspectRatio: '1/1' }}>
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
                          {isNewProduct && (
                            <span className="bg-[#22c55e] text-white text-[10px] font-bold px-2.5 py-1 rounded-full leading-none">New</span>
                          )}
                          {hasDiscount && (
                            <span className="bg-[#e63946] text-white text-[10px] font-bold px-2.5 py-1 rounded-full leading-none">-{discountPct}%</span>
                          )}
                          {isOutOfStock && (
                            <span className="bg-[#999] text-white text-[10px] font-bold px-2.5 py-1 rounded-full leading-none">Sold out</span>
                          )}
                        </div>
                        {/* Rating top-right */}
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 rounded-full px-2 py-0.5">
                          <Star size={10} className="text-[#f59e0b] fill-[#f59e0b]" />
                          <span className="text-[10px] font-semibold text-[#1a1a1a]">5.0</span>
                        </div>
                        {/* Add to cart on hover */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-250">
                          <button
                            onClick={async (e) => {
                              e.preventDefault(); e.stopPropagation();
                              if (!isOutOfStock) { try { await addItem(product.id); toast.success('Added to cart'); } catch { toast.error('Could not add to cart'); } }
                            }}
                            disabled={isOutOfStock}
                            className="w-full bg-[#1a1a1a] text-white text-[12px] font-semibold py-2.5 rounded-full hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <ShoppingBag size={12} />
                            {isOutOfStock ? 'Sold out' : 'Add to cart'}
                          </button>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-3 pb-2">
                        {product.category?.name && (
                          <p className="text-[10px] font-semibold text-[#888] uppercase tracking-[0.12em] mb-0.5">{product.category.name}</p>
                        )}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-[13px] font-semibold text-[#1a1a1a] leading-snug line-clamp-2 flex-1">{product.name}</h3>
                          <div className="text-right shrink-0">
                            <span className="text-[13px] font-bold text-[#1a1a1a]">${numPrice.toFixed(2)}</span>
                            {hasDiscount && <div className="text-[11px] text-[#aaa] line-through">${numCompare!.toFixed(2)}</div>}
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-[#1a1a1a] underline underline-offset-2">Choose options</span>
                      </div>
                      {/* Specs bar */}
                      <div className="border-t border-[#f0f0f0] px-3 py-2.5 grid grid-cols-3 gap-2">
                        {[['40mm', 'Driver size'], ['285g', 'Product weight'], ['35h', 'Battery life']].map(([val, lbl]) => (
                          <div key={lbl} className="flex flex-col">
                            <span className="text-[11px] font-bold text-[#1a1a1a]">{val}</span>
                            <span className="text-[9px] text-[#999] leading-tight">{lbl}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <ShoppingBag size={48} className="text-[#ccc] mx-auto mb-4" />
              <p className="text-[#888] text-lg font-medium">No products yet</p>
              <p className="text-[#aaa] text-sm mt-1">Add products from the admin panel to see them here</p>
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

        {/* ════════════════════════════════════════════
          11. SHOP THE FEED (Instagram)
      ════════════════════════════════════════════ */}
      <InstagramFeedSection />

    </div>
  );
}

