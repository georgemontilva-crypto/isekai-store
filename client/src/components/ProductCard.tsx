import { Link } from "wouter";
import { ShoppingBag, Heart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useLang } from "@/i18n/LangContext";
import { trpc } from "@/lib/trpc";
import { PriceDisplay } from "@/components/PriceDisplay";
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
      <div className="group cursor-pointer rounded-2xl overflow-hidden bg-white border border-[#ebebeb] shadow-sm hover:shadow-md transition-shadow">

        {/* ── Image ── */}
        <div className="relative aspect-square overflow-hidden bg-[#f5f5f5]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#f5f5f5]">
              <ShoppingBag size={36} className="text-[#ccc]" />
            </div>
          )}

          {/* Discount badge */}
          {hasDiscount && (
            <span className="absolute top-3 left-3 bg-[#16191f] text-white text-[10px] font-bold px-2 py-1 rounded-full leading-none">
              -{discountPct}%
            </span>
          )}

          {/* Out of stock badge */}
          {isOutOfStock && (
            <span className="absolute top-3 left-3 bg-[#999] text-white text-[10px] font-bold px-2 py-1 rounded-full leading-none">
              Agotado
            </span>
          )}

          {/* Wishlist button */}
          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 bg-white ${
              saved ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <Heart size={13} className={saved ? "text-[#e63946]" : "text-[#1a1a1a]"} fill={saved ? "currentColor" : "none"} />
          </button>

          {/* Add to cart hover button */}
          {!isOutOfStock && (
            <button
              onClick={handleAddToCart}
              disabled={isLoading}
              className="absolute bottom-3 left-3 right-3 bg-[#16191f] text-white text-[13px] font-semibold py-2.5 rounded-xl opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <ShoppingBag size={13} />
              {t.catalog.addToCart}
            </button>
          )}
        </div>

        {/* ── Info ── */}
        <div className="p-3">
          {(vendor || category) && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">
              {vendor ?? category}
            </p>
          )}

          <h3 className="text-[14px] font-semibold text-[#1a1a1a] leading-snug mt-1 line-clamp-2">
            {name}
          </h3>

          <div className="mt-2">
            <PriceDisplay price={numPrice} size="sm" />
            {hasDiscount && (
              <span className="text-[12px] text-[#aaa] line-through">
                ${numCompare!.toFixed(2)}
              </span>
            )}
          </div>
        </div>

      </div>
    </Link>
  );
}
