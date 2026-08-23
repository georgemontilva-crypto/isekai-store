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
  const [variantOverrideImg, setVariantOverrideImg] = useState<string | null>(null);

  const variants = fullProduct?.variants ?? [];
  const hasVariants = variants.length > 0;

  // Active variant label
  const activeVariant = variants.find((v) => v.id === activeVariantId) ?? variants[0] ?? null;
  const activeVariantLabel = activeVariant
    ? activeVariant.options
      ? Object.values(activeVariant.options as Record<string, string>).join(' / ')
      : activeVariant.name
    : null;

  const displayImage = variantOverrideImg ?? gallery[activeIdx];

  return (
    <motion.div
      className="relative z-10 w-full"
      style={{ marginTop: 0 }}
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="bg-white rounded-[20px] shadow-2xl overflow-hidden" style={{ border: '1px solid #ebebeb' }}>
        <div className="grid grid-cols-1 md:grid-cols-[72px_1fr_1fr] gap-0" style={{ minHeight: 0 }}>

          {/* ── Thumbnails (gallery images) ── */}
          <div className="hidden md:flex flex-col gap-2 p-3 border-r border-[#f0f0f0]">
            {gallery.length > 0 ? gallery.map((src, ti) => (
              <button
                key={ti}
                onClick={() => setActiveIdx(ti)}
                className="w-full aspect-square rounded-xl overflow-hidden cursor-pointer transition-all"
                style={{
                  border: ti === activeIdx ? '2px solid #1a1a1a' : '2px solid transparent',
                  background: 'var(--iw-surface-alt)',
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
              key={variantOverrideImg ?? activeIdx}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="w-full aspect-square rounded-2xl overflow-hidden"
            >
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#ebebeb] flex items-center justify-center text-[#aaa] text-sm">
                  Sin imagen
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Details panel ── */}
          <div className="flex flex-col justify-between p-7 border-l border-[#f0f0f0]">
            <div>
              <p className="text-[12px] text-[#888] font-medium mb-1">Isekai World</p>
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
                <span className="text-[12px] text-[#888]">5.0 · 2 reseñas</span>
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
                    Variante:{' '}
                    <span className="font-normal text-[#555]">
                      {activeVariantLabel ?? 'Selecciona'}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v, vi) => {
                      const vImg = (v as any).image as string | undefined;
                      const fallbackImg = gallery[vi] ?? gallery[0];
                      const thumbSrc = vImg ?? fallbackImg;
                      const isActive = activeVariantId === v.id || (activeVariantId === null && vi === 0);
                      return (
                        <button
                          key={v.id}
                          onClick={() => {
                            setActiveVariantId(v.id);
                            if (vImg) {
                              setVariantOverrideImg(vImg);
                            } else {
                              setVariantOverrideImg(null);
                              if (gallery[vi]) setActiveIdx(vi);
                            }
                          }}
                          className="w-[55px] h-[55px] rounded-lg overflow-hidden cursor-pointer transition-all shrink-0"
                          style={{
                            border: isActive ? '2px solid #1a1a1a' : '2px solid #e0e0e0',
                            background: 'var(--iw-surface-alt)',
                          }}
                          title={v.name}
                        >
                          {thumbSrc ? (
                            <img src={thumbSrc} alt={v.name} className="w-full h-full object-cover" />
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

              <p className="text-[12px] text-[#e53e3e] font-medium mb-1">¡Solo quedan {activeVariant?.stock ?? fullProduct?.stock ?? 5} unidades!</p>
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
                  { Icon: Package, text: 'Envío en 1-2 días' },
                  { Icon: RotateCcw, text: '90 días de garantía' },
                  { Icon: ShieldCheck, text: '2 años de garantía' },
                  { Icon: Truck, text: 'Envío incluido' },
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
                Ver detalles completos <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
