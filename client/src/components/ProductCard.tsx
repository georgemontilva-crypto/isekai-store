import { motion } from "framer-motion";
import { ShoppingCart, Star } from "lucide-react";
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
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="group relative"
    >
      <Link href={`/product/${slug}`}>
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-[0_20px_40px_oklch(0.72_0.25_310_/_0.15)]">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-card">
                <div className="text-4xl opacity-20">🎮</div>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {hasDiscount && (
                <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  -{discountPct}%
                </span>
              )}
              {isOutOfStock && (
                <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                  Agotado
                </span>
              )}
            </div>

            {/* Quick add overlay */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileHover={{ opacity: 1, y: 0 }}
              className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`w-full py-2 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                  isOutOfStock
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                {isOutOfStock ? "Agotado" : "Agregar al carrito"}
              </button>
            </motion.div>
          </div>

          {/* Info */}
          <div className="p-4">
            {category && (
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{category}</p>
            )}
            <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {name}
            </h3>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-primary text-base">
                  ${parseFloat(price).toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-muted-foreground line-through">
                    ${parseFloat(compareAtPrice!).toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5 text-yellow-400">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-xs text-muted-foreground">4.8</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
