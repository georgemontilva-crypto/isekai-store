import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Package,
  Minus, Plus, Shield, Truck, RotateCcw, Heart, Share2, Check, Frown, Gamepad2, Layers,
  Printer, Globe, Star
} from "lucide-react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { PriceDisplay } from "@/components/PriceDisplay";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import ProductCard from "@/components/ProductCard";
import { toast } from "sonner";
import { openLoginModal } from "@/const";
import { useSEO } from "@/hooks/useSEO";
import { PopupManager } from "@/components/PopupManager";

export default function ProductDetail() {
  const params = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [selectedVariant, setSelectedVariant] = useState<number | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [mainImageOverride, setMainImageOverride] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const { t } = useLang();
  const { data: product, isLoading } = trpc.products.bySlug.useQuery(
    { slug: params.slug ?? "" },
    { enabled: !!params.slug }
  );

  useSEO({
    title: product?.name ?? 'Producto',
    description: product?.description?.slice(0, 160),
    image: product?.images?.[0]?.url,
    url: `https://isekaiworld.co/product/${product?.slug}`,
    type: 'product',
  });

  useEffect(() => {
    if (!product) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.images?.[0]?.url,
      brand: { '@type': 'Brand', name: 'Isekai World' },
      offers: {
        '@type': 'Offer',
        price: parseFloat(product.price),
        priceCurrency: 'USD',
        availability: (product.stock ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url: `https://isekaiworld.co/product/${product.slug}`,
      },
    });
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [product]);

  const utils = trpc.useUtils();
  const { data: savedData } = trpc.wishlist.isSaved.useQuery(
    { productId: product?.id ?? 0 },
    { enabled: isAuthenticated && !!product?.id }
  );
  const wishlisted = savedData ?? false;
  const toggleWishlist = trpc.wishlist.toggle.useMutation({
    onSuccess: (data) => {
      utils.wishlist.isSaved.invalidate({ productId: product?.id });
      utils.wishlist.getAll.invalidate();
      toast.success(data.saved ? "¡Guardado!" : "Eliminado de guardados");
    },
  });

  const handleWishlist = () => {
    if (!isAuthenticated) {
      toast.error("Inicia sesión para guardar productos");
      openLoginModal();
      return;
    }
    if (product) toggleWishlist.mutate({ productId: product.id });
  };

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
      toast.error(t.product.addToCartError);
    } finally {
      setAdding(false);
    }
  };

  const currentVariant = product?.variants?.find((v) => v.id === selectedVariant);
  const displayPrice = currentVariant?.price ?? product?.price ?? "0";
  const displayStock = currentVariant?.stock ?? product?.stock ?? 0;
  const isOutOfStock = displayStock <= 0;
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
          <Link href="/catalog" className="mt-4 inline-block bg-[#1a1a1a] text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-[#333] transition-colors">
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images ?? [];
  const mainImageSrc = mainImageOverride ?? images[activeImage]?.url ?? null;
  const hasImages = !!mainImageSrc || images.length > 0;

  return (
    <>
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

      <div className="container px-4 pt-20 md:pt-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* ══════════════════════════════════════════════════════════════════
              GALLERY — product images
          ══════════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-4"
          >
            {/* Main image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#f5f5f5]">
              <AnimatePresence mode="wait">
                {mainImageSrc ? (
                  <motion.img
                    key={mainImageSrc}
                    src={mainImageSrc}
                    alt={currentVariant?.name ?? product.name}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3 }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#f5f5f5]">
                    <Gamepad2 className="w-32 h-32 opacity-10" strokeWidth={0.8} />
                  </div>
                )}
              </AnimatePresence>

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                {hasDiscount && (
                  <span className="bg-[#1a1a1a] text-white text-[10px] font-bold px-2.5 py-1 rounded-full leading-none">
                    -{discountPct}%
                  </span>
                )}
                {!isOutOfStock && displayStock <= 5 && (
                  <span className="bg-[#e63946] text-white text-[10px] font-bold px-2.5 py-1 rounded-full leading-none">
                    ¡Solo quedan {displayStock}!
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails — only if more than 1 image */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mt-3">
                {images.slice(0, 5).map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => { setMainImageOverride(null); setActiveImage(i); }}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      !mainImageOverride && i === activeImage
                        ? "border-[#1a1a1a]"
                        : "border-transparent hover:border-[#ccc]"
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
            {/* Brand + Wishlist row */}
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest">Isekai World</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleWishlist}
                  className={`p-2 rounded-xl border transition-all duration-200 ${wishlisted ? "border-red-400/50 bg-red-50 text-red-400" : "border-[#ebebeb] text-[#888] hover:border-[#ccc] hover:text-[#1a1a1a]"}`}
                >
                  <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} />
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Enlace copiado"); }}
                  className="p-2 rounded-xl border border-[#ebebeb] text-[#888] hover:border-[#ccc] hover:text-[#1a1a1a] transition-all duration-200"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-[#1a1a1a] leading-tight">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3 pb-4 border-b border-[#ebebeb]">
              <PriceDisplay price={displayPrice} size="lg" />
              {hasDiscount && (
                <span className="text-lg text-[#aaa] line-through">
                  ${parseFloat(product.compareAtPrice!).toFixed(2)}
                </span>
              )}
              {hasDiscount && (
                <span className="px-2.5 py-1 rounded-full bg-[#f0f0f0] text-[#1a1a1a] text-xs font-bold">
                  -{discountPct}%
                </span>
              )}
            </div>

            {/* CredIsekai badge — solo si installmentsEnabled Y precio >= 150 */}
            {(product as any).installmentsEnabled && (product as any).initialPayment && parseFloat(displayPrice) >= 150 && (
              <Link href="/account">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-50 border border-violet-200 cursor-pointer hover:bg-violet-100 transition-colors">
                  <Layers className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-violet-700">CredIsekai disponible</p>
                    <p className="text-[11px] text-violet-600 mt-0.5">
                      Cuota inicial: <strong>${parseFloat((product as any).initialPayment).toFixed(2)}</strong> · Elige 2 o 3 cuotas quincenales
                    </p>
                    <p className="text-[10px] text-violet-500 mt-1">
                      ⚠️ El envío se realiza solo al completar el pago total
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-[13px] text-[#555] leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-[#1a1a1a] mb-2">
                  Variante: <span className="font-normal text-[#555]">{currentVariant?.name ?? "Selecciona una opción"}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const vImg = (variant as any).image as string | undefined;
                    const isSelected = selectedVariant === variant.id;
                    const handleSelect = () => {
                      if (isSelected) {
                        setSelectedVariant(undefined);
                        setMainImageOverride(null);
                      } else {
                        setSelectedVariant(variant.id);
                        if (vImg) setMainImageOverride(vImg);
                        else { setMainImageOverride(null); setActiveImage(0); }
                      }
                    };
                    if (vImg) {
                      return (
                        <button
                          key={variant.id}
                          onClick={handleSelect}
                          disabled={variant.stock <= 0}
                          title={variant.name}
                          className={`relative w-[44px] h-[44px] sm:w-[55px] sm:h-[55px] rounded-xl overflow-hidden border-2 transition-all duration-200 shrink-0 ${
                            isSelected
                              ? "border-[#1a1a1a]"
                              : variant.stock <= 0
                              ? "border-transparent opacity-40 cursor-not-allowed"
                              : "border-transparent hover:border-[#ccc]"
                          }`}
                        >
                          <img src={vImg} alt={variant.name} className="w-full h-full object-cover" />
                          {isSelected && (
                            <Check className="w-3 h-3 absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-0.5" />
                          )}
                          {variant.stock <= 0 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-[8px] text-white font-semibold">Agotado</span>
                            </div>
                          )}
                        </button>
                      );
                    }
                    return (
                      <button
                        key={variant.id}
                        onClick={handleSelect}
                        disabled={variant.stock <= 0}
                        className={`relative px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-200 ${
                          isSelected
                            ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                            : variant.stock <= 0
                            ? "border-[#ebebeb] text-[#ccc] cursor-not-allowed"
                            : "border-[#ebebeb] text-[#555] hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
                        }`}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-0.5" />
                        )}
                        {variant.name}
                        {variant.stock <= 0 && <span className="ml-1 text-xs">(Agotado)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity + Stock */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-[#1a1a1a] mb-2">Cantidad</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-full bg-[#f5f5f5] hover:bg-[#ebebeb] flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-bold text-[15px]">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 rounded-full bg-[#f5f5f5] hover:bg-[#ebebeb] flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[12px]">
                <Package className={`w-3.5 h-3.5 ${isOutOfStock ? "text-[#e63946]" : "text-[#22c55e]"}`} />
                <span className={isOutOfStock ? "text-[#e63946]" : "text-[#22c55e] font-medium"}>
                  {isOutOfStock ? t.product.outOfStock : `${displayStock} disponibles`}
                </span>
              </div>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || adding}
              className="w-full bg-[#1a1a1a] text-white font-semibold text-[15px] py-4 rounded-full hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {adding ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  {isOutOfStock ? t.product.outOfStock : t.product.addToCart}
                </>
              )}
            </button>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { icon: <Printer size={14} />, text: 'Impresión 3D de alta precisión' },
                { icon: <Package size={14} />, text: 'Empaque seguro para tu pedido' },
                { icon: <Globe size={14} />, text: 'Envíos nacionales e internacionales' },
                { icon: <Star size={14} />, text: 'Diseños exclusivos para coleccionistas' },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#555]">
                  <span className="text-[#999]">{badge.icon}</span>
                  {badge.text}
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
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">{t.product.relatedTitle}</span>
              <h2 className="text-2xl font-black mt-1">
                Productos <span className="gradient-text">Relacionados</span>
              </h2>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
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
    <PopupManager productId={product?.id} />
    </>
  );
}
