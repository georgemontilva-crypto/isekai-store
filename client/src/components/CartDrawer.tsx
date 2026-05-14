import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, Shield, Truck, Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, totalItems, subtotal } = useCart();

  const shipping = subtotal >= 50 ? 0 : 5.99;
  const total = subtotal + shipping;
  const freeShippingLeft = Math.max(0, 50 - subtotal);
  const progressPct = Math.min(100, (subtotal / 50) * 100);

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
            style={{ background: "oklch(0.14 0.006 264)", borderLeft: "1px solid oklch(0.25 0.01 264 / 0.5)" }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-base">Mi Carrito</h2>
                  <p className="text-xs text-muted-foreground">
                    {totalItems === 0
                      ? "Vacío"
                      : `${totalItems} artículo${totalItems !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Free Shipping Progress ── */}
            {items.length > 0 && (
              <div className="px-6 py-3 bg-primary/5 border-b border-primary/10">
                {freeShippingLeft <= 0 ? (
                  <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
                    <Truck className="w-3.5 h-3.5" />
                    ¡Tienes envío gratis!
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">
                        Agrega{" "}
                        <span className="text-primary font-semibold">
                          ${freeShippingLeft.toFixed(2)}
                        </span>{" "}
                        más para envío gratis
                      </span>
                      <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
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
                    <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
                      <ShoppingCart className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">Tu carrito está vacío</p>
                      <p className="text-muted-foreground text-sm mt-1">
                        Explora el catálogo y encuentra algo que te encante
                      </p>
                    </div>
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple rounded-xl font-semibold"
                      onClick={closeCart}
                      asChild
                    >
                      <Link href="/catalog">
                        Explorar tienda <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
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
                      className="flex gap-3 p-3 rounded-2xl bg-card border border-border/40 hover:border-border/70 transition-colors"
                    >
                      {/* Image */}
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.product?.name ?? "Producto"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">
                            🎮
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
                            {item.product?.name ?? "Producto"}
                          </p>
                          {item.variant && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.variant.name}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {/* Qty controls */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                              className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Price + Remove */}
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">
                              ${(
                                parseFloat(item.variant?.price ?? item.product?.price ?? "0") *
                                item.quantity
                              ).toFixed(2)}
                            </span>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
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
                className="border-t border-border/30 p-6 space-y-4"
              >
                {/* Order summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span className={shipping === 0 ? "text-green-400 font-medium" : "font-medium"}>
                      {shipping === 0 ? "Gratis" : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="h-px bg-border/30" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Total</span>
                    <motion.span
                      key={total}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-xl font-black gradient-text"
                    >
                      ${total.toFixed(2)}
                    </motion.span>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-primary" />
                    <span>Pago seguro</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3 text-primary" />
                    <span>Devolución fácil</span>
                  </div>
                </div>

                {/* CTA */}
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple font-bold h-12 rounded-2xl text-base"
                  onClick={closeCart}
                  asChild
                >
                  <Link href="/checkout">
                    Proceder al pago
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>

                <button
                  onClick={closeCart}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
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
