import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Star, Package, ChevronLeft, ChevronRight,
  Minus, Plus, Shield, Truck, RotateCcw, Heart, Share2, Check, Frown, Gamepad2
} from "lucide-react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { toast } from "sonner";

export default function ProductDetail() {
  const params = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<number | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const { data: product, isLoading } = trpc.products.bySlug.useQuery(
    { slug: params.slug ?? "" },
    { enabled: !!params.slug }
  );

  // Related products from same category
  const { data: relatedData } = trpc.products.list.useQuery(
    { categoryId: product?.categoryId ?? undefined, limit: 4 },
    { enabled: !!product?.categoryId }
  );
  const relatedProducts = (relatedData?.items ?? []).filter((p) => p.id !== product?.id).slice(0, 4);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, selectedVariant, quantity);
      toast.success(`${product.name} agregado al carrito`);
    } catch {
      toast.error("Error al agregar al carrito");
    } finally {
      setAdding(false);
    }
  };

  const currentVariant = product?.variants?.find((v) => v.id === selectedVariant);
  const displayPrice = currentVariant?.price ?? product?.price ?? "0";
  const isOutOfStock = (currentVariant?.stock ?? product?.stock ?? 0) <= 0;
  const hasDiscount = product?.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(displayPrice);
  const discountPct = hasDiscount
    ? Math.round((1 - parseFloat(displayPrice) / parseFloat(product!.compareAtPrice!)) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen pt-8 pb-16">
        <div className="container">
          <div className="grid lg:grid-cols-[1fr_480px] gap-12 animate-pulse">
            <div className="space-y-4">
              <div className="aspect-square rounded-3xl bg-card" />
              <div className="flex gap-3">
                {[1,2,3].map(i => <div key={i} className="w-20 h-20 rounded-xl bg-card" />)}
              </div>
            </div>
            <div className="space-y-5 pt-4">
              <div className="h-4 bg-card rounded w-1/4" />
              <div className="h-10 bg-card rounded w-3/4" />
              <div className="h-8 bg-card rounded w-1/3" />
              <div className="h-24 bg-card rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4 opacity-30">
            <Frown className="w-16 h-16" strokeWidth={1} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Producto no encontrado</h2>
          <Button className="mt-4 bg-primary text-primary-foreground rounded-xl" asChild>
            <Link href="/catalog">Volver al catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const images = product.images ?? [];
  const hasImages = images.length > 0;

  return (
    <div className="min-h-screen pb-20">
      {/* ── Breadcrumb ── */}
      <div className="border-b border-border/30 bg-card/20">
        <div className="container py-4">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Link href="/"><span className="hover:text-foreground transition-colors cursor-pointer">Inicio</span></Link>
            <span className="opacity-40">/</span>
            <Link href="/catalog"><span className="hover:text-foreground transition-colors cursor-pointer">Catálogo</span></Link>
            {product.category && (
              <>
                <span className="opacity-40">/</span>
                <Link href={`/catalog?category=${product.categoryId}`}>
                  <span className="hover:text-foreground transition-colors cursor-pointer">{product.category.name}</span>
                </Link>
              </>
            )}
            <span className="opacity-40">/</span>
            <span className="text-foreground truncate max-w-[180px]">{product.name}</span>
          </motion.div>
        </div>
      </div>

      <div className="container pt-10">
        <div className="grid lg:grid-cols-[1fr_480px] gap-12 xl:gap-16">

          {/* ══════════════════════════════════════════════════════════════════
              LEFT — Gallery
          ══════════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-4"
          >
            {/* Main image */}
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-card border border-border/50 group">
              <AnimatePresence mode="wait">
                {hasImages ? (
                  <motion.img
                    key={activeImage}
                    src={images[activeImage]?.url}
                    alt={images[activeImage]?.altText ?? product.name}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35 }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/8 via-muted to-accent/8">
                    <Gamepad2 className="w-32 h-32 opacity-10" strokeWidth={0.8} />
                  </div>
                )}
              </AnimatePresence>

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                {hasDiscount && (
                  <span className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-bold neon-glow-purple">
                    -{discountPct}%
                  </span>
                )}
                {!isOutOfStock && (product.stock ?? 0) <= 5 && (
                  <span className="px-3 py-1.5 rounded-full bg-orange-500/80 text-white text-xs font-medium backdrop-blur-sm">
                    ¡Últimas {product.stock}!
                  </span>
                )}
              </div>

              {/* Nav arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage((p) => (p - 1 + images.length) % images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveImage((p) => (p + 1) % images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Image counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full glass text-xs text-white/80">
                  {activeImage + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                      i === activeImage
                        ? "border-primary neon-glow-purple scale-105"
                        : "border-border/50 hover:border-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt={img.altText ?? ""} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT — Product Info (sticky)
          ══════════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="lg:sticky lg:top-24 self-start space-y-6"
          >
            {/* Category + Wishlist row */}
            <div className="flex items-center justify-between">
              {product.category && (
                <Link href={`/catalog?category=${product.categoryId}`}>
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest cursor-pointer hover:text-primary/80 transition-colors">
                    {product.category.name}
                  </span>
                </Link>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => { setWishlisted(!wishlisted); toast.success(wishlisted ? "Eliminado de favoritos" : "Agregado a favoritos"); }}
                  className={`p-2 rounded-xl border transition-all duration-200 ${wishlisted ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"}`}
                >
                  <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} />
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Enlace copiado"); }}
                  className="p-2 rounded-xl border border-border/50 text-muted-foreground hover:border-border hover:text-foreground transition-all duration-200"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-black text-foreground leading-tight">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= 4 ? "fill-yellow-400 text-yellow-400" : "fill-yellow-400/20 text-yellow-400/20"}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">4.8 · 128 reseñas</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 pb-2 border-b border-border/30">
              <span className="text-4xl font-black gradient-text">
                ${parseFloat(displayPrice).toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-xl text-muted-foreground line-through">
                  ${parseFloat(product.compareAtPrice!).toFixed(2)}
                </span>
              )}
              {hasDiscount && (
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  Ahorras {discountPct}%
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-muted-foreground leading-relaxed text-sm">
                {product.description}
              </p>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">
                  Variante: <span className="text-primary font-normal">{currentVariant?.name ?? "Selecciona una opción"}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.id === selectedVariant ? undefined : variant.id)}
                      disabled={variant.stock <= 0}
                      className={`relative px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                        selectedVariant === variant.id
                          ? "border-primary bg-primary/10 text-primary neon-glow-purple"
                          : variant.stock <= 0
                          ? "border-border/30 text-muted-foreground/40 cursor-not-allowed"
                          : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      {selectedVariant === variant.id && (
                        <Check className="w-3 h-3 absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-0.5" />
                      )}
                      {variant.name}
                      {variant.stock <= 0 && <span className="ml-1 text-xs">(Agotado)</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Stock */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Cantidad</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Package className={`w-4 h-4 ${isOutOfStock ? "text-destructive" : "text-green-400"}`} />
                <span className={isOutOfStock ? "text-destructive" : "text-green-400 font-medium"}>
                  {isOutOfStock ? "Sin stock" : `${currentVariant?.stock ?? product.stock} disponibles`}
                </span>
              </div>
            </div>

            {/* Add to cart */}
            <Button
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple font-bold text-base h-14 rounded-2xl"
              onClick={handleAddToCart}
              disabled={isOutOfStock || adding}
            >
              {adding ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Agregando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  {isOutOfStock ? "Producto agotado" : "Agregar al carrito"}
                </span>
              )}
            </Button>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Shield, text: "Pago seguro" },
                { icon: Truck, text: "Envío gratis +$50" },
                { icon: RotateCcw, text: "30 días devolución" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/30 text-center">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground leading-tight">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RELATED PRODUCTS
        ══════════════════════════════════════════════════════════════════ */}
        {relatedProducts.length > 0 && (
          <section className="mt-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">También te puede gustar</span>
              <h2 className="text-2xl font-black mt-1">
                Productos <span className="gradient-text">Relacionados</span>
              </h2>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {relatedProducts.map((p: any, i: number) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                >
                  <ProductCard
                    id={p.id}
                    name={p.name}
                    slug={p.slug}
                    price={p.price}
                    compareAtPrice={p.compareAtPrice}
                    imageUrl={p.imageUrl ?? undefined}
                    category={p.category?.name}
                    stock={p.stock}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
