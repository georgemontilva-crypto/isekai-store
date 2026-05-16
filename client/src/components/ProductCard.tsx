import { Link } from "wouter";
import { ShoppingBag, Heart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useLang } from "@/i18n/LangContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";

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
  const { t } = useLang();
  const { isAuthenticated } = useAuth();
  const { addItem, isLoading } = useCart();
  const utils = trpc.useUtils();

  const { data: savedData } = trpc.wishlist.isSaved.useQuery(
    { productId: id },
    { enabled: isAuthenticated }
  );
  const saved = savedData ?? false;

  const toggleMutation = trpc.wishlist.toggle.useMutation({
    onSuccess: (data) => {
      utils.wishlist.isSaved.invalidate({ productId: id });
      utils.wishlist.getAll.invalidate();
      toast.success(data.saved ? "¡Guardado!" : "Eliminado de guardados");
    },
  });

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
      toast.success("Agregado al carrito");
    } catch {
      toast.error("No se pudo agregar al carrito");
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Inicia sesión para guardar productos");
      openLoginModal();
      return;
    }
    toggleMutation.mutate({ productId: id });
  };

  return (
    <Link href={`/product/${slug}`}>
      <div className="product-card group cursor-pointer">

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
                Nuevo
              </span>
            )}
            {hasDiscount && (
              <span className="bg-[#e63946] text-white text-[10px] font-semibold px-2.5 py-1 rounded-full leading-none">
                -{discountPct}%
              </span>
            )}
            {isOutOfStock && (
              <span className="bg-[#999] text-white text-[10px] font-semibold px-2.5 py-1 rounded-full leading-none">
                Agotado
              </span>
            )}
          </div>

          {/* Wishlist button */}
          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 ${
              saved
                ? "bg-[#1a1a1a] text-white opacity-100"
                : "bg-white text-[#1a1a1a] opacity-0 group-hover:opacity-100"
            }`}
          >
            <Heart size={13} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>

        {/* ── Info ── */}
        <div className="pt-2.5 pb-1">
          {/* Category / Vendor */}
          {(vendor || category) && (
            <p className="text-[10px] font-semibold text-[#888] uppercase tracking-[0.08em] mb-0.5">
              {vendor ?? category}
            </p>
          )}

          {/* Name */}
          <h3 className="text-[13px] font-semibold text-[#1a1a1a] leading-snug line-clamp-2 mb-1">
            {name}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[13px] font-bold text-[#1a1a1a]">
              ${numPrice.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-[11px] text-[#aaa] line-through">
                ${numCompare!.toFixed(2)}
              </span>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleAddToCart}
            disabled={isLoading || isOutOfStock}
            className="w-full bg-[#1a1a1a] text-white text-[11px] font-semibold py-2 rounded-full hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <ShoppingBag size={11} />
            {isOutOfStock ? t.catalog.soldOut : t.catalog.addToCart}
          </button>
        </div>

      </div>
    </Link>
  );
}
