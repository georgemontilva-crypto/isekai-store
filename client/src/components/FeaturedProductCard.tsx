import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Star } from "lucide-react";
import { motion } from "framer-motion";

export type FeaturedProduct = {
  id: number;
  name: string;
  price: string;
  description?: string | null;
  imageUrl?: string | null;
  slug: string;
};

const THUMBNAILS = [
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80',
  'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=200&q=80',
  'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&q=80',
];

export default function FeaturedProductCard({
  product,
  onAddToCart,
}: {
  product: FeaturedProduct;
  onAddToCart: (id: number, name: string) => void;
}) {
  const thumbs = [product.imageUrl ?? THUMBNAILS[0], THUMBNAILS[1], THUMBNAILS[2]];
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <motion.div
      className="relative z-10 mx-auto"
      style={{ maxWidth: 1200, padding: '0 8px', marginTop: -60 }}
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="bg-white rounded-[20px] shadow-2xl overflow-hidden" style={{ border: '1px solid #ebebeb' }}>
        {/* Rotating badge */}
        <div className="flex justify-center" style={{ marginTop: -28 }}>
          <div className="relative w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full spin-slow absolute inset-0">
              <path id="fp-badge-circle" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none" />
              <text fontSize="11" fontWeight="600" fill="#1a1a1a" letterSpacing="3">
                <textPath href="#fp-badge-circle">FEATURED • PRODUCT • </textPath>
              </text>
            </svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" className="relative z-10">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-[72px_1fr_1fr] gap-0" style={{ minHeight: 380 }}>
          {/* Thumbnails */}
          <div className="flex flex-col gap-2 p-3 border-r border-[#f0f0f0]">
            {thumbs.map((src, ti) => (
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
            ))}
          </div>

          {/* Main image — square, rounded, object-cover */}
          <div className="p-4 bg-[#f7f7f7] flex items-center justify-center">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="w-full aspect-square rounded-2xl overflow-hidden"
            >
              <img
                src={thumbs[activeIdx]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>

          {/* Details panel */}
          <div className="flex flex-col justify-between p-7 border-l border-[#f0f0f0]">
            <div>
              <p className="text-[12px] text-[#888] font-medium mb-1">Isekai Store</p>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-[26px] font-black text-[#1a1a1a] leading-tight">{product.name}</h3>
                <span className="text-[22px] font-black text-[#1a1a1a] whitespace-nowrap">
                  ${parseFloat(product.price).toFixed(2)}
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
              <div className="mb-4">
                <p className="text-[12px] font-medium text-[#1a1a1a] mb-2">
                  Color: <span className="font-normal text-[#555]">Default</span>
                </p>
                <div className="flex gap-2">
                  {['#e8e0d0','#555','#7a5c3a','#1e3a5f','#2a2a2a'].map((c, ci) => (
                    <div
                      key={ci}
                      className="w-8 h-8 rounded-full cursor-pointer"
                      style={{
                        background: c,
                        border: ci === 0 ? '2px solid #1a1a1a' : '2px solid transparent',
                        outline: ci === 0 ? '2px solid #1a1a1a' : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>
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
                <span>Add to cart</span>
                <span className="text-white/70">— ${parseFloat(product.price).toFixed(2)}</span>
              </button>
              <div className="grid grid-cols-2 gap-y-2">
                {[
                  { icon: '📦', text: 'Ships within 1-2 days' },
                  { icon: '↩', text: '90-day risk-free trial' },
                  { icon: '🛡', text: '2-Year Warranty' },
                  { icon: '🚚', text: 'Complimentary shipping' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-[11px] text-[#666]">
                    <span>{icon}</span>{text}
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
