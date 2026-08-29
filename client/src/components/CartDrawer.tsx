import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, Shield, Truck, Package, Gamepad2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { PriceDisplay } from "@/components/PriceDisplay";
import { useLang } from "@/i18n/LangContext";
import { Link } from "wouter";

export default function CartDrawer() {
  const { t } = useLang();
  const { items, isOpen, closeCart, updateQuantity, removeItem, totalItems, subtotal } = useCart();

  const shipping = subtotal >= 50 ? 0 : 5.99;
  const total = subtotal + shipping;
  const freeShippingLeft = Math.max(0, 50 - subtotal);
  const progressPct = Math.min(100, (subtotal / 50) * 100);

  // Dark drawer color palette (hardcoded to avoid light-theme CSS var conflicts)
  const BG = "#111111";
  const BG_CARD = "#1e1e1e";
  const BG_MUTED = "#2a2a2a";
  const TEXT = "#f5f5f5";
  const TEXT_MUTED = "#9a9a9a";
  const BORDER = "rgba(255,255,255,0.08)";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px] flex flex-col"
            style={{ background: BG, borderLeft: `1px solid ${BORDER}` }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}`, paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: BG_MUTED }}>
                  <ShoppingCart className="w-4 h-4" style={{ color: TEXT }} />
                </div>
                <div>
                  <h2 className="font-bold text-base" style={{ color: TEXT }}>Mi Carrito</h2>
                  <p className="text-xs" style={{ color: TEXT_MUTED }}>
                    {totalItems === 0
                      ? t.cart.empty
                      : `${totalItems} ${totalItems !== 1 ? t.cart.itemsPlural : t.cart.items}`}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: BG_MUTED, color: TEXT_MUTED }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED; }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Free Shipping Progress ── */}
            {items.length > 0 && (
              <div className="px-6 py-3" style={{ background: "rgba(34,197,94,0.06)", borderBottom: `1px solid rgba(34,197,94,0.12)` }}>
                {freeShippingLeft <= 0 ? (
                  <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#22c55e" }}>
                    <Truck className="w-3.5 h-3.5" />
                    ¡Envío gratis en San Francisco!
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span style={{ color: TEXT_MUTED }}>
                        Agrega{" "}
                        <span className="font-semibold" style={{ color: "#a78bfa" }}>
                          ${freeShippingLeft.toFixed(2)}
                        </span>{" "}
                        más para envío gratis en San Francisco
                      </span>
                      <Truck className="w-3.5 h-3.5" style={{ color: TEXT_MUTED }} />
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: BG_MUTED }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(to right, #a78bfa, #38bdf8)" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Items ── */}
            <div className="flex-1 overflow-y-auto py-4 px-6 space-y-3">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center gap-5 py-16"
                  >
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: BG_MUTED }}>
                      <ShoppingCart className="w-8 h-8" style={{ color: TEXT_MUTED, opacity: 0.4 }} />
                    </div>
                    <div>
                      <p className="font-bold text-lg" style={{ color: TEXT }}>Tu carrito está vacío</p>
                      <p className="text-sm mt-1" style={{ color: TEXT_MUTED }}>
                        Explora el catálogo y encuentra algo que te encante
                      </p>
                    </div>
                    <Link
                      href="/catalog"
                      onClick={closeCart}
                      className="px-6 py-3 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2"
                      style={{ background: "#a78bfa", color: "#fff" }}
                    >
                      Explorar tienda <ArrowRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                ) : (
                  items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      className="flex gap-3 p-3 rounded-2xl transition-colors"
                      style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
                    >
                      {/* Image */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ background: BG_MUTED }}>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.product?.name ?? "Producto"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-20">
                            <Gamepad2 className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <p className="font-semibold text-sm leading-tight line-clamp-2" style={{ color: TEXT }}>
                            {item.product?.name ?? "Producto"}
                          </p>
                          {item.variant && (
                            <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>{item.variant.name}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {/* Qty controls */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                              style={{ background: BG_MUTED, color: TEXT_MUTED }}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center text-sm font-bold" style={{ color: TEXT }}>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                              style={{ background: BG_MUTED, color: TEXT_MUTED }}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Price + Remove */}
                          <div className="flex items-center gap-2">
                            <PriceDisplay
                              price={parseFloat(item.variant?.price ?? item.product?.price ?? "0") * item.quantity}
                              size="sm"
                            />
                            <button
                              onClick={() => removeItem(item.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                              style={{ color: TEXT_MUTED }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            {items.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 space-y-4"
                style={{ borderTop: `1px solid ${BORDER}` }}
              >
                {/* Order summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: TEXT_MUTED }}>Subtotal</span>
                    <span className="font-medium" style={{ color: TEXT }}>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: TEXT_MUTED }}>Envío</span>
                    <span className="font-medium" style={{ color: shipping === 0 ? "#22c55e" : TEXT }}>
                      {shipping === 0 ? t.cart.free : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="h-px" style={{ background: BORDER }} />
                  <div className="flex items-center justify-between">
                    <span className="font-bold" style={{ color: TEXT }}>Total</span>
                    <motion.span
                      key={total}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-xl font-black"
                      style={{ color: TEXT }}
                    >
                      ${total.toFixed(2)}
                    </motion.span>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 text-xs" style={{ color: TEXT_MUTED }}>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3" style={{ color: "#a78bfa" }} />
                    <span>Pago seguro</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3" style={{ color: "#a78bfa" }} />
                    <span>Devolución fácil</span>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="w-full font-bold h-12 rounded-2xl text-base flex items-center justify-center gap-2 transition-colors"
                  style={{ background: "#f5f5f5", color: "#111111", display: "flex" }}
                >
                  Proceder al pago
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <button
                  onClick={closeCart}
                  className="w-full text-center text-sm py-1 transition-colors"
                  style={{ color: TEXT_MUTED }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED; }}
                >
                  Continuar comprando
                </button>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
