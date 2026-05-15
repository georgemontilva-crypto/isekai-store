import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Star, Package, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useLang } from '@/i18n/LangContext';
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";

export type FeaturedProduct = {
  id: number;
  name: string;
  price: string;
  description?: string | null;
  imageUrl?: string | null;
  slug: string;
};

export default function FeaturedProductCard({
  product,
  onAddToCart,
}: {
  product: FeaturedProduct;
  onAddToCart: (id: number, name: string) => void;
}) {
  // Load full product details (images + variants) via public bySlug
  const { data: fullProduct } = trpc.products.bySlug.useQuery(
    { slug: product.slug },
    { enabled: !!product.slug }
  );

  // Build gallery: use productImages if available, otherwise fall back to imageUrl
  const gallery: string[] = fullProduct?.images?.length
    ? fullProduct.images.map((img) => img.url)
    : product.imageUrl
    ? [product.imageUrl]
    : [];

  const { t } = useLang();
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeVariantId, setActiveVariantId] = useState<number | null>(null);

  const variants = fullProduct?.variants ?? [];
  const hasVariants = variants.length > 0;

  // Active variant label
  const activeVariant = variants.find((v) => v.id === activeVariantId) ?? variants[0] ?? null;
  const activeVariantLabel = activeVariant
    ? activeVariant.options
      ? Object.values(activeVariant.options as Record<string, string>).join(' / ')
      : activeVariant.name
    : null;

  return (
    <motion.div
      className="relative z-10 mx-auto"
      style={{ maxWidth: 1200, padding: '0 8px', marginTop: 0 }}
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="bg-white rounded-[20px] shadow-2xl overflow-hidden" style={{ border: '1px solid #ebebeb' }}>
        <div className="grid grid-cols-1 md:grid-cols-[72px_1fr_1fr] gap-0" style={{ minHeight: 0 }}>

          {/* ── Thumbnails (gallery images) ── */}
          <div className="flex flex-col gap-2 p-3 border-r border-[#f0f0f0]">
            {gallery.length > 0 ? gallery.map((src, ti) => (
              <button
                key={ti}
                onClick={() => setActiveIdx(ti)}
                className="w-full aspect-square rounded-xl overflow-hidden cursor-pointer transition-all"
                style={{
                  border: ti === activeIdx ? '2px solid #1a1a1a' : '2px solid transparent',
                  background: '#f5f5f5',
                  outline: 'none',
                }}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            )) : (
              <div className="w-full aspect-square rounded-xl bg-[#f5f5f5]" />
            )}
          </div>

          {/* ── Main image ── */}
          <div className="p-4 bg-white flex items-center justify-center">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="w-full aspect-square rounded-2xl overflow-hidden"
            >
              {gallery[activeIdx] ? (
                <img
                  src={gallery[activeIdx]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#ebebeb] flex items-center justify-center text-[#aaa] text-sm">
                  No image
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Details panel ── */}
          <div className="flex flex-col justify-between p-7 border-l border-[#f0f0f0]">
            <div>
              <p className="text-[12px] text-[#888] font-medium mb-1">Isekai Store</p>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-[26px] font-black text-[#1a1a1a] leading-tight">{product.name}</h3>
                <span className="text-[22px] font-black text-[#1a1a1a] whitespace-nowrap">
                  ${parseFloat(activeVariant?.price ?? product.price).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={13} className="text-[#f59e0b] fill-[#f59e0b]" />
                  ))}
                </div>
                <span className="text-[12px] text-[#888]">5.0 · 2 reviews</span>
              </div>
              {product.description && (
                <p className="text-[13px] text-[#555] leading-relaxed mb-4 line-clamp-2">
                  {product.description}
                </p>
              )}

              {/* Variants — only if the product has them */}
              {hasVariants && (
                <div className="mb-4">
                  <p className="text-[12px] font-medium text-[#1a1a1a] mb-2">
                    Variant:{' '}
                    <span className="font-normal text-[#555]">
                      {activeVariantLabel ?? 'Select'}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v, vi) => {
                      // Try to find a matching gallery image for this variant by index
                      const variantImg = gallery[vi] ?? gallery[0];
                      const isActive = activeVariantId === v.id || (activeVariantId === null && vi === 0);
                      return (
                        <button
                          key={v.id}
                          onClick={() => {
                            setActiveVariantId(v.id);
                            if (gallery[vi]) setActiveIdx(vi);
                          }}
                          className="w-10 h-10 rounded-xl overflow-hidden cursor-pointer transition-all"
                          style={{
                            border: isActive ? '2px solid #1a1a1a' : '2px solid transparent',
                            outline: isActive ? '2px solid #1a1a1a' : 'none',
                            outlineOffset: 2,
                            background: '#f5f5f5',
                          }}
                          title={v.name}
                        >
                          {variantImg ? (
                            <img src={variantImg} alt={v.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] text-[#555] leading-tight px-0.5 block text-center">
                              {v.name.slice(0, 6)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-[12px] text-[#e53e3e] font-medium mb-1">Hurry, only 5 items left in stock!</p>
              <div className="w-full h-1 bg-[#f0f0f0] rounded-full mb-4">
                <div className="h-full bg-[#1a1a1a] rounded-full" style={{ width: '20%' }} />
              </div>
            </div>

            <div>
              <button
                onClick={() => onAddToCart(product.id, product.name)}
                className="w-full flex items-center justify-between bg-[#1a1a1a] text-white font-semibold text-[14px] px-6 py-4 rounded-full hover:bg-[#333] transition-colors mb-3 active:scale-[0.98]"
              >
                <span>{t.product.addToCart}</span>
                <span className="text-white/70">
                  — ${parseFloat(activeVariant?.price ?? product.price).toFixed(2)}
                </span>
              </button>
              <div className="grid grid-cols-2 gap-y-2">
                {[
                  { Icon: Package, text: 'Ships within 1-2 days' },
                  { Icon: RotateCcw, text: '90-day risk-free trial' },
                  { Icon: ShieldCheck, text: '2-Year Warranty' },
                  { Icon: Truck, text: 'Complimentary shipping' },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-[11px] text-[#666]">
                    <Icon className="w-3 h-3 shrink-0" strokeWidth={1.5} />{text}
                  </div>
                ))}
              </div>
              <Link
                href={`/product/${product.slug}`}
                className="flex items-center justify-between text-[13px] font-medium text-[#1a1a1a] mt-4 pt-3 border-t border-[#f0f0f0] hover:opacity-60 transition-opacity"
              >
                View full details <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
