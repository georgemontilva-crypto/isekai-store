import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, Zap, Shield, Truck, Star, ChevronLeft, ChevronRight,
  ShoppingCart, Heart, Eye, Sparkles, TrendingUp, Clock, Package
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

/* ─────────────────────────────────────────────────────────────────────────────
   MARQUEE TICKER
───────────────────────────────────────────────────────────────────────────── */
const tickerItems = [
  "✦ NUEVA COLECCIÓN DISPONIBLE",
  "✦ ENVÍO GRATIS EN PEDIDOS +$50",
  "✦ FIGURAS ORIGINALES CERTIFICADAS",
  "✦ GAMING EDITION 2025",
  "✦ DEVOLUCIONES SIN PREGUNTAS",
  "✦ PAGO 100% SEGURO",
];

function Marquee() {
  const items = [...tickerItems, ...tickerItems];
  return (
    <div className="overflow-hidden bg-primary/10 border-b border-primary/20 py-2.5">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="flex gap-12 whitespace-nowrap"
      >
        {items.map((item, i) => (
          <span key={i} className="text-xs font-semibold text-primary tracking-widest flex-shrink-0">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HERO SLIDES CONFIG
───────────────────────────────────────────────────────────────────────────── */
const heroSlides = [
  {
    tag: "Nueva Temporada 2025",
    title: "Colección\nAnime Premium",
    subtitle: "Figuras, ropa y accesorios de tus series favoritas. Calidad de exportación, directamente a tu puerta.",
    cta: "Explorar ahora",
    ctaHref: "/catalog",
    accent: "oklch(0.72 0.25 310)",
    accentHex: "#a855f7",
    emoji: "🎌",
    label: "Anime",
  },
  {
    tag: "Gaming Edition",
    title: "Equipamiento\nGamer Pro",
    subtitle: "Periféricos, coleccionables y merchandise de los mejores títulos. Lleva tu setup al siguiente nivel.",
    cta: "Ver colección",
    ctaHref: "/catalog",
    accent: "oklch(0.65 0.28 195)",
    accentHex: "#06b6d4",
    emoji: "🎮",
    label: "Gaming",
  },
  {
    tag: "Edición Limitada",
    title: "Figuras\nColeccionables",
    subtitle: "Piezas únicas de edición limitada de los mangas y animes más populares del momento.",
    cta: "Ver figuras",
    ctaHref: "/catalog",
    accent: "oklch(0.70 0.28 340)",
    accentHex: "#ec4899",
    emoji: "⚔️",
    label: "Figuras",
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURED PRODUCT CARD (for spotlight section)
───────────────────────────────────────────────────────────────────────────── */
function FeaturedSpotlight({ product }: { product: any }) {
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      await addItem(product.id, undefined, 1);
      toast.success(`${product.name} agregado al carrito`);
    } catch {
      toast.error("Error al agregar al carrito");
    } finally {
      setAdding(false);
    }
  };

  const hasDiscount = product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.compareAtPrice)) * 100)
    : 0;

  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-0 rounded-3xl overflow-hidden border border-border/50 bg-card">
      {/* Image */}
      <div className="relative min-h-[420px] lg:min-h-[560px] bg-muted overflow-hidden group">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-accent/10">
            <div className="text-9xl opacity-20">🎌</div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/20" />
        {/* Badges */}
        <div className="absolute top-6 left-6 flex flex-col gap-2">
          {hasDiscount && (
            <span className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-bold neon-glow-purple">
              -{discountPct}%
            </span>
          )}
          <span className="px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-medium backdrop-blur-sm border border-white/10">
            ★ Más vendido
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col justify-center p-8 lg:p-12 gap-6">
        {product.category?.name && (
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">
            {product.category.name}
          </span>
        )}
        <h3 className="text-3xl lg:text-4xl font-black text-foreground leading-tight">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-4 h-4 ${s <= 4 ? "fill-yellow-400 text-yellow-400" : "fill-yellow-400/20 text-yellow-400/20"}`} />
          ))}
          <span className="text-sm text-muted-foreground ml-1">4.8 (128)</span>
        </div>
        {product.description && (
          <p className="text-muted-foreground leading-relaxed line-clamp-3">{product.description}</p>
        )}
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-black gradient-text">${parseFloat(product.price).toFixed(2)}</span>
          {hasDiscount && (
            <span className="text-xl text-muted-foreground line-through">${parseFloat(product.compareAtPrice).toFixed(2)}</span>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple font-bold h-12 rounded-2xl"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Agregando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Agregar al carrito
              </span>
            )}
          </Button>
          <Link href={`/product/${product.slug}`}>
            <Button variant="outline" className="h-12 px-5 rounded-2xl border-border/50 hover:border-primary/40">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        {/* Stock indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="w-4 h-4 text-green-400" />
          <span className="text-green-400 font-medium">{product.stock} disponibles</span>
          <span className="text-muted-foreground">· Envío en 2-5 días</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   COLLECTION CARD
───────────────────────────────────────────────────────────────────────────── */
function CollectionCard({ cat, index }: { cat: any; index: number }) {
  const sizes = ["lg:col-span-2 lg:row-span-2", "", "", "lg:col-span-2", ""];
  const heights = ["min-h-[320px]", "min-h-[200px]", "min-h-[200px]", "min-h-[200px]", "min-h-[200px]"];
  const size = sizes[index % sizes.length];
  const height = heights[index % heights.length];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.5 }}
      className={size}
    >
      <Link href={`/catalog?category=${cat.id}`}>
        <div className={`relative ${height} rounded-2xl overflow-hidden bg-card border border-border/50 cursor-pointer group`}>
          {cat.imageUrl ? (
            <img
              src={cat.imageUrl}
              alt={cat.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/15 via-muted to-accent/15 flex items-center justify-center">
              <span className="text-6xl opacity-30">🎌</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-500" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="font-black text-white text-lg leading-tight">{cat.name}</p>
            <p className="text-white/60 text-sm mt-1 flex items-center gap-1 group-hover:text-primary transition-colors">
              Ver colección <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function Home() {
  const [heroIdx, setHeroIdx] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY = useTransform(scrollY, [0, 500], [0, 100]);

  const { data: productsData } = trpc.products.list.useQuery({ featured: true, limit: 12 });
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: allProductsData } = trpc.products.list.useQuery({ limit: 12 });

  const featuredProducts = productsData?.items ?? [];
  const allProducts = allProductsData?.items ?? [];
  const slide = heroSlides[heroIdx];

  // Auto-advance hero
  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroSlides.length), 6000);
    return () => clearInterval(t);
  }, []);

  const prevSlide = () => setHeroIdx((i) => (i - 1 + heroSlides.length) % heroSlides.length);
  const nextSlide = () => setHeroIdx((i) => (i + 1) % heroSlides.length);

  // Tabs: "Todos" + real categories
  const tabs = [
    { label: "Todos", id: null },
    ...(categories ?? []).slice(0, 5).map((c) => ({ label: c.name, id: c.id })),
  ];

  const tabProducts =
    activeTab === 0
      ? allProducts
      : allProducts.filter((p: any) => p.categoryId === tabs[activeTab]?.id);

  const spotlightProduct = featuredProducts[0] ?? allProducts[0];

  return (
    <div className="min-h-screen">

      {/* ══════════════════════════════════════════════════════════════════════
          MARQUEE TICKER
      ══════════════════════════════════════════════════════════════════════ */}
      <Marquee />

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — Full screen cinematic
      ══════════════════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[95vh] flex items-center overflow-hidden">
        {/* Animated background */}
        <AnimatePresence mode="wait">
          <motion.div
            key={heroIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 80% 60% at 70% 50%, ${slide.accentHex}18 0%, transparent 60%),
                             radial-gradient(ellipse 60% 80% at 20% 80%, ${slide.accentHex}10 0%, transparent 60%),
                             #171717`,
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(oklch(0.97 0.003 264) 1px, transparent 1px), linear-gradient(90deg, oklch(0.97 0.003 264) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating orbs */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${slide.accentHex} 0%, transparent 70%)` }}
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.08, 0.16, 0.08] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${slide.accentHex} 0%, transparent 70%)` }}
        />

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="container relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[95vh] py-28">

            {/* LEFT: Text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={heroIdx}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col gap-7"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <span
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold"
                    style={{
                      background: `${slide.accentHex}18`,
                      borderColor: `${slide.accentHex}40`,
                      color: slide.accentHex,
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    {slide.tag}
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                  className="text-6xl sm:text-7xl xl:text-8xl font-black leading-[1.0] tracking-tight font-display"
                >
                  {slide.title.split("\n").map((line, i) => (
                    <span key={i} className={`block ${i === 1 ? "gradient-text" : "text-foreground"}`}>
                      {line}
                    </span>
                  ))}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-lg text-muted-foreground leading-relaxed max-w-lg"
                >
                  {slide.subtitle}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 }}
                  className="flex flex-wrap gap-3"
                >
                  <Button
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple font-bold px-8 text-base rounded-2xl h-14"
                    asChild
                  >
                    <Link href={slide.ctaHref}>
                      {slide.cta}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/15 bg-white/5 text-foreground hover:bg-white/10 font-semibold px-8 text-base rounded-2xl h-14 backdrop-blur-sm"
                    asChild
                  >
                    <Link href="/catalog">Ver catálogo</Link>
                  </Button>
                </motion.div>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="flex items-center gap-8 pt-4 border-t border-white/10"
                >
                  {[
                    { value: "10K+", label: "Clientes" },
                    { value: "500+", label: "Productos" },
                    { value: "4.9★", label: "Rating" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div className="text-2xl font-black gradient-text">{stat.value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* RIGHT: Visual showcase */}
            <AnimatePresence mode="wait">
              <motion.div
                key={heroIdx}
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95 }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                className="hidden lg:flex items-center justify-center"
              >
                <div className="relative w-full max-w-[480px]">
                  {/* Main showcase card */}
                  <div
                    className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-white/10"
                    style={{ background: `linear-gradient(135deg, ${slide.accentHex}15, ${slide.accentHex}05, transparent)` }}
                  >
                    {/* Product grid inside hero */}
                    {allProducts.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 p-6 h-full">
                        {allProducts.slice(0, 4).map((p: any, i: number) => (
                          <motion.div
                            key={p.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + i * 0.08 }}
                            className="rounded-2xl overflow-hidden bg-card/60 border border-white/10 backdrop-blur-sm aspect-square"
                          >
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">
                                {slide.emoji}
                              </div>
                            )}
                          </motion.div>
                        ))}
                        {allProducts.length === 0 && (
                          <div className="col-span-2 row-span-2 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-8xl mb-4 opacity-40">{slide.emoji}</div>
                              <p className="text-muted-foreground text-sm">{slide.label}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-9xl mb-6 opacity-30">{slide.emoji}</div>
                          <p className="text-muted-foreground text-sm">{slide.label}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Floating cards */}
                  <motion.div
                    animate={{ y: [-6, 6, -6] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-5 -right-5 px-4 py-3 rounded-2xl bg-card border border-border/60 shadow-2xl shadow-black/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Rating</p>
                        <p className="text-sm font-bold">4.9 / 5.0</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{ y: [6, -6, 6] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -bottom-5 -left-5 px-4 py-3 rounded-2xl bg-card border border-border/60 shadow-2xl shadow-black/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Truck className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Envío</p>
                        <p className="text-sm font-bold text-primary">Gratis</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{ y: [-4, 4, -4] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute top-1/2 -right-8 px-3 py-2 rounded-xl bg-card border border-border/60 shadow-xl shadow-black/40"
                  >
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                      <p className="text-xs font-semibold text-green-400">+24% ventas</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Slide controls */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
          <button onClick={prevSlide} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex gap-2">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === heroIdx ? "w-10 bg-primary" : "w-1.5 bg-white/25 hover:bg-white/40"}`}
              />
            ))}
          </div>
          <button onClick={nextSlide} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 right-8 hidden lg:flex flex-col items-center gap-2 text-muted-foreground/40"
        >
          <span className="text-xs tracking-widest rotate-90 origin-center">SCROLL</span>
          <div className="w-px h-10 bg-gradient-to-b from-muted-foreground/40 to-transparent" />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TRUST BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-border/30 bg-card/40 py-5 backdrop-blur-sm">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-border/30">
            {[
              { icon: Truck, title: "Envío gratis", desc: "En pedidos +$50" },
              { icon: Shield, title: "Pago seguro", desc: "SSL 256-bit" },
              { icon: Star, title: "100% Originales", desc: "Certificados" },
              { icon: Clock, title: "Entrega rápida", desc: "2-5 días hábiles" },
            ].map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center justify-center gap-3 px-6 py-4"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feat.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{feat.title}</p>
                  <p className="text-xs text-muted-foreground">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURED PRODUCT SPOTLIGHT
      ══════════════════════════════════════════════════════════════════════ */}
      {spotlightProduct && (
        <section className="py-24">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-end justify-between mb-10"
            >
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest">Producto destacado</span>
                <h2 className="text-4xl font-black mt-1.5">
                  El favorito de la <span className="gradient-text">comunidad</span>
                </h2>
              </div>
              <Link href="/catalog">
                <span className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors cursor-pointer">
                  Ver todos <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <FeaturedSpotlight product={spotlightProduct} />
            </motion.div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          COLLECTIONS GRID (Shopify-style bento)
      ══════════════════════════════════════════════════════════════════════ */}
      {categories && categories.length > 0 && (
        <section className="py-20 bg-card/20 border-y border-border/20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-end justify-between mb-10"
            >
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest">Explora</span>
                <h2 className="text-3xl font-black mt-1.5">
                  Nuestras <span className="gradient-text">Colecciones</span>
                </h2>
              </div>
              <Link href="/catalog">
                <span className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors cursor-pointer">
                  Ver todas <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>

            {/* Bento grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-4 auto-rows-[200px]">
              {categories.slice(0, 5).map((cat, i) => (
                <CollectionCard key={cat.id} cat={cat} index={i} />
              ))}
            </div>

            {/* If fewer than 2 categories, show simple grid */}
            {categories.length < 2 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                {categories.map((cat, i) => (
                  <CollectionCard key={cat.id} cat={cat} index={i} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TABBED PRODUCTS (Shopify-style)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8"
          >
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Catálogo</span>
              <h2 className="text-3xl font-black mt-1.5">
                Productos <span className="gradient-text">Populares</span>
              </h2>
            </div>
            <Link href="/catalog">
              <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 rounded-xl gap-2">
                Ver todos <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === i
                    ? "bg-primary text-primary-foreground neon-glow-purple"
                    : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Products grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {(activeTab === 0 ? allProducts : tabProducts).length === 0 ? (
                <div className="text-center py-28">
                  <div className="text-7xl mb-4 opacity-20">🎮</div>
                  <p className="text-xl font-bold text-foreground">Próximamente</p>
                  <p className="text-muted-foreground mt-2 text-sm">Estamos preparando productos increíbles</p>
                  <Button className="mt-6 bg-primary text-primary-foreground rounded-xl" asChild>
                    <Link href="/catalog">Explorar catálogo</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 lg:gap-6">
                  {(activeTab === 0 ? allProducts : tabProducts).slice(0, 8).map((product: any, i: number) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                    >
                      <ProductCard
                        id={product.id}
                        name={product.name}
                        slug={product.slug}
                        price={product.price}
                        compareAtPrice={product.compareAtPrice}
                        imageUrl={product.imageUrl ?? undefined}
                        category={product.category?.name}
                        stock={product.stock}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          EDITORIAL BANNER — Why Isekai Store
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-card/30 border-y border-border/20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Visual */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="aspect-video rounded-3xl overflow-hidden bg-gradient-to-br from-primary/15 via-muted to-accent/15 flex items-center justify-center border border-border/50 relative">
                <div className="text-center">
                  <div className="text-8xl mb-4 opacity-30">⚔️</div>
                  <p className="text-muted-foreground text-sm font-medium">Isekai Store — Tu mundo, tu estilo</p>
                </div>
              </div>
              {/* Floating stat */}
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -right-6 p-5 rounded-2xl bg-card border border-border/60 shadow-2xl shadow-black/40"
              >
                <p className="text-xs text-muted-foreground mb-0.5">Clientes satisfechos</p>
                <p className="text-3xl font-black gradient-text">10,000+</p>
              </motion.div>
            </motion.div>

            {/* Right: Text */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="flex flex-col gap-6"
            >
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest">¿Por qué elegirnos?</span>
                <h2 className="text-3xl font-black mt-2 leading-tight">
                  Más que una tienda,<br />
                  <span className="gradient-text">una comunidad</span>
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                En Isekai Store somos apasionados del anime y el gaming. Cada producto es cuidadosamente seleccionado para garantizar la más alta calidad y autenticidad.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "🎌", title: "100% Originales", desc: "Productos certificados" },
                  { icon: "🚀", title: "Envío rápido", desc: "2-5 días hábiles" },
                  { icon: "💎", title: "Premium Quality", desc: "Primera calidad" },
                  { icon: "🔒", title: "Compra segura", desc: "Pago protegido" },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 p-4 rounded-2xl bg-card border border-border/30 hover:border-primary/20 transition-colors">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-bold text-foreground text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="self-start bg-primary text-primary-foreground rounded-2xl px-8 h-12 font-bold neon-glow-purple" asChild>
                <Link href="/catalog">
                  Explorar tienda <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECOND PRODUCTS BLOCK (Featured)
      ══════════════════════════════════════════════════════════════════════ */}
      {featuredProducts.length > 1 && (
        <section className="py-24">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-end justify-between mb-10"
            >
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest">Selección especial</span>
                <h2 className="text-3xl font-black mt-1.5">
                  <span className="gradient-text">Destacados</span> de la semana
                </h2>
              </div>
              <Link href="/catalog">
                <span className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 cursor-pointer transition-colors">
                  Ver todos <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 lg:gap-6">
              {featuredProducts.slice(0, 8).map((product: any, i: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                >
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    price={product.price}
                    compareAtPrice={product.compareAtPrice}
                    imageUrl={product.imageUrl ?? undefined}
                    category={product.category?.name}
                    stock={product.stock}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SOCIAL PROOF — Testimonials
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-card/20 border-y border-border/20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Testimonios</span>
            <h2 className="text-3xl font-black mt-1.5">
              Lo que dice nuestra <span className="gradient-text">comunidad</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: "Alejandro M.", avatar: "🧑‍💻", rating: 5, text: "La calidad de las figuras es increíble. Llegaron perfectamente empacadas y en tiempo récord. Ya hice mi segundo pedido!", role: "Coleccionista" },
              { name: "Valentina R.", avatar: "👩‍🎨", rating: 5, text: "Finalmente una tienda que entiende el anime de verdad. Los productos son 100% originales y el servicio al cliente es excelente.", role: "Otaku desde 2010" },
              { name: "Carlos D.", avatar: "🎮", rating: 5, text: "El merchandise de gaming es top. Tengo la camiseta de mi juego favorito y la calidad del material es premium. Muy recomendado.", role: "Gamer Pro" },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/20 transition-colors flex flex-col gap-4"
              >
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= t.rating ? "fill-yellow-400 text-yellow-400" : "fill-yellow-400/20 text-yellow-400/20"}`} />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          NEWSLETTER CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden p-12 lg:p-20 text-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.72 0.25 310 / 0.12), oklch(0.65 0.28 195 / 0.08))",
              border: "1px solid oklch(0.72 0.25 310 / 0.2)",
            }}
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary/8 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-accent/8 blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `linear-gradient(oklch(0.97 0.003 264) 1px, transparent 1px), linear-gradient(90deg, oklch(0.97 0.003 264) 1px, transparent 1px)`,
                  backgroundSize: "40px 40px",
                }}
              />
            </div>
            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Únete hoy</span>
              <h2 className="text-4xl lg:text-5xl font-black mt-3 mb-4 leading-tight">
                Sé el primero en<br />
                <span className="gradient-text">descubrir novedades</span>
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Suscríbete y recibe acceso anticipado a lanzamientos, descuentos exclusivos y noticias del mundo anime y gaming.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="tu@email.com"
                  className="flex-1 px-5 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-sm"
                />
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple font-bold px-7 py-3.5 rounded-2xl h-auto">
                  Suscribirse
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">Sin spam. Cancela cuando quieras.</p>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
