import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, ArrowLeft, Star, Package, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ProductDetail() {
  const params = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<number | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [adding, setAdding] = useState(false);

  const { data: product, isLoading } = trpc.products.bySlug.useQuery(
    { slug: params.slug ?? "" },
    { enabled: !!params.slug }
  );

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

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 animate-pulse">
            <div className="aspect-square rounded-2xl bg-card" />
            <div className="space-y-4">
              <div className="h-8 bg-card rounded w-3/4" />
              <div className="h-6 bg-card rounded w-1/4" />
              <div className="h-24 bg-card rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😔</div>
          <h2 className="text-2xl font-bold mb-2">Producto no encontrado</h2>
          <Button asChild className="mt-4">
            <Link href="/catalog">Volver al catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const images = product.images ?? [];
  const hasImages = images.length > 0;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
        >
          <Link href="/">
            <span className="hover:text-foreground transition-colors cursor-pointer">Inicio</span>
          </Link>
          <span>/</span>
          <Link href="/catalog">
            <span className="hover:text-foreground transition-colors cursor-pointer">Catálogo</span>
          </Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px]">{product.name}</span>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* ─── Gallery ──────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {/* Main image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border/50 anime-border">
              <AnimatePresence mode="wait">
                {hasImages ? (
                  <motion.img
                    key={activeImage}
                    src={images[activeImage]?.url}
                    alt={images[activeImage]?.altText ?? product.name}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                    <div className="text-8xl opacity-20">🎮</div>
                  </div>
                )}
              </AnimatePresence>

              {/* Nav arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage((p) => (p - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveImage((p) => (p + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      i === activeImage ? "border-primary neon-glow-purple" : "border-border/50 hover:border-border"
                    }`}
                  >
                    <img src={img.url} alt={img.altText ?? ""} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ─── Product Info ──────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {product.category && (
              <span className="text-xs font-medium text-primary uppercase tracking-widest">
                {product.category.name}
              </span>
            )}

            <h1 className="text-3xl lg:text-4xl font-black text-foreground leading-tight">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= 4 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">(4.8 · 128 reseñas)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-primary">
                ${parseFloat(displayPrice).toFixed(2)}
              </span>
              {product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(displayPrice) && (
                <span className="text-xl text-muted-foreground line-through">
                  ${parseFloat(product.compareAtPrice).toFixed(2)}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-3">Variante</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.id === selectedVariant ? undefined : variant.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                        selectedVariant === variant.id
                          ? "border-primary bg-primary/10 text-primary neon-glow-purple"
                          : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                      } ${variant.stock <= 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                      disabled={variant.stock <= 0}
                    >
                      {variant.name}
                      {variant.stock <= 0 && " (Agotado)"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Cantidad</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stock indicator */}
            <div className="flex items-center gap-2 text-sm">
              <Package className={`w-4 h-4 ${isOutOfStock ? "text-destructive" : "text-green-400"}`} />
              <span className={isOutOfStock ? "text-destructive" : "text-green-400"}>
                {isOutOfStock ? "Agotado" : `${currentVariant?.stock ?? product.stock} disponibles`}
              </span>
            </div>

            {/* Add to cart */}
            <Button
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple font-semibold text-base"
              onClick={handleAddToCart}
              disabled={isOutOfStock || adding}
            >
              {adding ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Agregando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  {isOutOfStock ? "Agotado" : "Agregar al carrito"}
                </span>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
