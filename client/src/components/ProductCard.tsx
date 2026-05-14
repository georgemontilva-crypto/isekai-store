import { useState } from "react";
import { Link } from "wouter";
import { Star, ShoppingBag, Heart } from "lucide-react";
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
  isNew?: boolean;
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
  isNew,
}: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const [wishlist, setWishlist] = useState(false);
  const { addItem, isLoading } = useCart();

  const numPrice = parseFloat(price);
  const numCompare = compareAtPrice ? parseFloat(compareAtPrice) : null;
  const hasDiscount = numCompare && numCompare > numPrice;
  const discountPct = hasDiscount
    ? Math.round(((numCompare! - numPrice) / numCompare!) * 100)
    : 0;
  const isOutOfStock = stock <= 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    try {
      await addItem(id);
      toast.success("Added to cart");
    } catch {
      toast.error("Could not add to cart");
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlist(w => !w);
  };

  return (
    <Link href={`/product/${slug}`}>
      <div
        className="product-card group cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* ── Image ── */}
        <div className="relative bg-[#f5f5f5] overflow-hidden" style={{ aspectRatio: "1/1" }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#f5f5f5]">
              <ShoppingBag size={36} className="text-[#ccc]" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {isNew && (
              <span className="bg-[#1a1a1a] text-white text-[10px] font-semibold px-2.5 py-1 rounded-full leading-none">
                New
              </span>
            )}
            {hasDiscount && (
              <span className="bg-[#e63946] text-white text-[10px] font-semibold px-2.5 py-1 rounded-full leading-none">
                -{discountPct}%
              </span>
            )}
            {isOutOfStock && (
              <span className="bg-[#999] text-white text-[10px] font-semibold px-2.5 py-1 rounded-full leading-none">
                Sold out
              </span>
            )}
          </div>

          {/* Wishlist button */}
          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 ${
              wishlist
                ? "bg-[#1a1a1a] text-white opacity-100"
                : "bg-white text-[#1a1a1a] opacity-0 group-hover:opacity-100"
            }`}
          >
            <Heart size={13} fill={wishlist ? "currentColor" : "none"} />
          </button>

          {/* Add to cart overlay */}
          <div
            className={`absolute bottom-0 left-0 right-0 p-3 transition-all duration-250 ${
              hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <button
              onClick={handleAddToCart}
              disabled={isLoading || isOutOfStock}
              className="w-full bg-[#1a1a1a] text-white text-[12px] font-semibold py-2.5 rounded-full hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <ShoppingBag size={12} />
              {isOutOfStock ? "Sold out" : "Add to cart"}
            </button>
          </div>
        </div>

        {/* ── Info ── */}
        <div className="pt-3 pb-2">
          {/* Vendor */}
          {(vendor || category) && (
            <p className="text-[10px] font-semibold text-[#888] uppercase tracking-[0.12em] mb-0.5">
              {vendor ?? category}
            </p>
          )}

          {/* Name + Price */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-[#1a1a1a] leading-snug line-clamp-2 flex-1">
              {name}
            </h3>
            <div className="text-right shrink-0">
              <span className="text-[13px] font-bold text-[#1a1a1a]">
                ${numPrice.toFixed(2)}
              </span>
              {hasDiscount && (
                <div className="text-[11px] text-[#aaa] line-through">
                  ${numCompare!.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-1 mt-1.5">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={10} className="text-[#f59e0b] fill-[#f59e0b]" />
            ))}
            <span className="text-[10px] text-[#888] ml-0.5">5.0</span>
          </div>

          {/* CTA */}
          <div className="mt-2">
            <span className="text-[11px] font-medium text-[#1a1a1a] underline underline-offset-2 hover:opacity-60 transition-opacity">
              Choose options
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
