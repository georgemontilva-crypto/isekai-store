import { motion } from "framer-motion";
import { ShoppingCart, Star, Eye } from "lucide-react";
import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface ProductCardProps {
  id: number;
  name: string;
  slug: string;
  price: string;
  compareAtPrice?: string | null;
  imageUrl?: string;
  category?: string | null;
  stock?: number;
  vendor?: string;
}

export default function ProductCard({
  id,
  name,
  slug,
  price,
  compareAtPrice,
  imageUrl,
  category,
  stock = 0,
  vendor,
}: ProductCardProps) {
  const { addItem } = useCart();
  const isOutOfStock = stock <= 0;
  const hasDiscount = compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price);
  const discountPct = hasDiscount
    ? Math.round((1 - parseFloat(price) / parseFloat(compareAtPrice!)) * 100)
    : 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    try {
      await addItem(id);
      toast.success(`${name} agregado al carrito`);
    } catch {
      toast.error("Error al agregar al carrito");
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="group relative flex flex-col card-hover"
    >
      <Link href={`/product/${slug}`}>
        <div className="flex flex-col cursor-pointer">
          {/* ── Image Container ── */}
          <div className="relative overflow-hidden rounded-2xl bg-muted aspect-[3/4]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted via-card to-muted/50">
                <div className="flex flex-col items-center gap-3 opacity-30">
                  <div className="text-5xl">🎮</div>
                  <div className="w-16 h-0.5 bg-primary/40 rounded-full" />
                </div>
              </div>
            )}

            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Badges top-left */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
              {hasDiscount && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-2.5 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full neon-glow-purple"
                >
                  -{discountPct}%
                </motion.span>
              )}
              {isOutOfStock && (
                <span className="px-2.5 py-1 bg-black/60 text-white/80 text-xs font-medium rounded-full backdrop-blur-sm">
                  Agotado
                </span>
              )}
              {!isOutOfStock && stock <= 5 && stock > 0 && (
                <span className="px-2.5 py-1 bg-orange-500/80 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                  ¡Últimas {stock}!
                </span>
              )}
            </div>

            {/* Quick actions bottom */}
            <div className="absolute inset-x-3 bottom-3 flex gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out z-10">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                  isOutOfStock
                    ? "bg-muted/80 text-muted-foreground cursor-not-allowed backdrop-blur-sm"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple backdrop-blur-sm"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                {isOutOfStock ? "Agotado" : "Agregar"}
              </button>
              <Link href={`/product/${slug}`}>
                <button className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm">
                  <Eye className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* ── Product Info ── */}
          <div className="mt-3 px-0.5">
            {/* Vendor / Category */}
            {(vendor || category) && (
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 font-medium">
                {vendor ?? category}
              </p>
            )}

            {/* Name */}
            <h3 className="font-medium text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200 mb-2">
              {name}
            </h3>

            {/* Price + Rating */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-foreground text-base">
                  ${parseFloat(price).toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-muted-foreground line-through">
                    ${parseFloat(compareAtPrice!).toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3 h-3 ${s <= 4 ? "fill-yellow-400 text-yellow-400" : "fill-yellow-400/30 text-yellow-400/30"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
