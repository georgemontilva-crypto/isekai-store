import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, Star, Play, ShoppingBag } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

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
    bg: "#1a1a1a",
    textColor: "white",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&q=80",
  },
  {
    name: "Headphones",
    count: "32 products",
    bg: "#f5f5f5",
    textColor: "#1a1a1a",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
  },
  {
    name: "Earphones",
    count: "24 products",
    bg: "#f5f5f5",
    textColor: "#1a1a1a",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80",
  },
  {
    name: "Speakers",
    count: "18 products",
    bg: "#f5f5f5",
    textColor: "#1a1a1a",
    href: "/catalog",
    img: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80",
  },
  {
    name: "Accessories",
    count: "46 products",
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
      <section className="py-20 border-b border-[#ebebeb]">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black leading-tight">
                We believe in the{" "}
                <span className="italic-serif">power of sound</span>
              </h2>
            </div>
            <div>
              <p className="text-[15px] text-[#555] leading-relaxed mb-6">
                At Isekai Store, we curate only the finest audio equipment and accessories for enthusiasts who demand the best. From studio-grade headphones to portable speakers, every product in our collection is chosen for its exceptional quality, design, and performance.
              </p>
              <Link href="/catalog" className="btn-pill-outline">
                Our Story <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3. COLLECTIONS HORIZONTAL SCROLL
      ══════════════════════════════════════════════ */}
      <section className="py-16 border-b border-[#ebebeb]">
        <div className="container mb-6">
          <h2 className="text-2xl font-bold">Shop by Collection</h2>
        </div>
        <div className="px-6 lg:px-10">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {collections.map((col) => (
              <Link key={col.name} href={col.href}>
                <div
                  className="shrink-0 w-52 h-64 rounded-2xl overflow-hidden relative cursor-pointer group"
                  style={{ background: col.bg }}
                >
                  <img
                    src={col.img}
                    alt={col.name}
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="font-bold text-white text-[15px]">{col.name}</p>
                    <p className="text-white/70 text-[12px]">{col.count}</p>
                    <div className="mt-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      <ArrowRight size={12} className="text-[#1a1a1a]" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4. VIDEO / FEATURE SECTION
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ height: "400px" }}>
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80"
          alt="Sound sculpted"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-center px-4">
          <span className="section-label text-white/60 mb-3">Featured</span>
          <h2 className="text-5xl md:text-7xl font-black text-white mb-6">
            Sound. <span className="italic-serif">Sculpted.</span>
          </h2>
          <Link href="/catalog" className="btn-pill-white">
            Shop Echo Elegance <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          5. FEATURED PRODUCT SPOTLIGHT
      ══════════════════════════════════════════════ */}
      {featuredProduct && (
        <section className="py-20 border-b border-[#ebebeb]">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left: Image */}
              <div className="relative">
                <div className="aspect-square bg-[#f5f5f5] rounded-3xl overflow-hidden img-zoom">
                  {featuredProduct.imageUrl ? (
                    <img
                      src={featuredProduct.imageUrl}
                      alt={featuredProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={64} className="text-[#ccc]" />
                    </div>
                  )}
                </div>
                {/* Rotating badge */}
                <div className="absolute -bottom-4 -right-4 w-24 h-24">
                  <div className="relative w-full h-full">
                    <svg viewBox="0 0 100 100" className="w-full h-full spin-slow">
                      <path
                        id="circle"
                        d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                        fill="none"
                      />
                      <text fontSize="11" fontWeight="600" fill="#1a1a1a" letterSpacing="3">
                        <textPath href="#circle">PRODUCT • FEATURED • ISEKAI •</textPath>
                      </text>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Star size={16} className="text-[#1a1a1a] fill-[#1a1a1a]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Info */}
              <div>
                <span className="section-label mb-2 block">Product Highlights</span>
                <h2 className="text-4xl font-black mb-2">{featuredProduct.name}</h2>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} className="text-[#f59e0b] fill-[#f59e0b]" />
                    ))}
                  </div>
                  <span className="text-[13px] text-[#888]">5.0 · 128 reviews</span>
                </div>
                <p className="text-3xl font-black mb-4">
                  ${parseFloat(featuredProduct.price).toFixed(2)}
                </p>
                {featuredProduct.description && (
                  <p className="text-[14px] text-[#555] leading-relaxed mb-6 line-clamp-3">
                    {featuredProduct.description}
                  </p>
                )}

                {/* Trust badges */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { icon: "✓", text: "In stock" },
                    { icon: "↩", text: "90-day trial" },
                    { icon: "🛡", text: "2-Year Warranty" },
                    { icon: "🚚", text: "Free shipping" },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-[12px] text-[#555]">
                      <span className="text-[#1a1a1a] font-bold">{icon}</span>
                      {text}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleAddToCart(featuredProduct.id, featuredProduct.name)}
                    className="btn-pill flex-1 justify-center"
                  >
                    <ShoppingBag size={15} />
                    Add to cart
                  </button>
                  <Link href={`/product/${featuredProduct.slug}`} className="btn-pill-outline">
                    View full details <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          6. MARQUEE TEXT
      ══════════════════════════════════════════════ */}
      <section className="py-10 border-y border-[#ebebeb] overflow-hidden">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span
              key={i}
              className="text-[48px] md:text-[72px] font-black text-transparent shrink-0 px-8"
              style={{ WebkitTextStroke: "2px #1a1a1a" }}
            >
              {item} ·
            </span>
          ))}
        </div>
      </section>

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
