import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle, ShoppingBag, Loader2, Gamepad2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const schema = z.object({
  customerName: z.string().min(2, t.checkout.errors.name),
  customerEmail: z.string().email(t.checkout.errors.email),
  customerPhone: z.string().optional(),
  street: z.string().min(5, t.checkout.errors.address),
  city: z.string().min(2, t.checkout.errors.city),
  state: z.string().min(2, t.checkout.errors.state),
  country: z.string().optional().default("Colombia"),
  zip: z.string().min(4, "Código postal requerido"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Checkout() {
  const { t } = useLang();
  const [, navigate] = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const sessionId = localStorage.getItem("isekai-session-id") ?? undefined;

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: async (order) => {
      setOrderNumber(order.orderNumber);
      await clearCart();
    },
    onError: () => toast.error(t.checkout.errors.error),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      customerName: user?.name ?? "",
      customerEmail: user?.email ?? "",
      country: "Colombia",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (items.length === 0) {
      toast.error(t.checkout.empty);
      return;
    }

    await createOrder.mutateAsync({
      sessionId: user ? undefined : sessionId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      shippingAddress: {
        street: data.street,
        city: data.city,
        state: data.state,
        country: data.country,
        zip: data.zip,
      },
      subtotal: subtotal.toFixed(2),
      total: subtotal.toFixed(2),
      notes: data.notes,
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product?.name ?? "Producto",
        variantName: item.variant?.name,
        price: (item.variant?.price ?? item.product?.price ?? "0"),
        quantity: item.quantity,
        imageUrl: item.imageUrl,
      })),
    });
  };

  // ─── Order Confirmation ──────────────────────────────────────────────────────
  if (orderNumber) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="text-center max-w-md mx-auto px-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-12 h-12 text-green-400" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-3xl font-black mb-3">¡Pedido confirmado!</h1>
            <p className="text-muted-foreground mb-6">
              Tu pedido ha sido procesado exitosamente. Recibirás una confirmación pronto.
            </p>

            <div className="p-4 rounded-2xl bg-card border border-border/50 mb-8">
              <p className="text-sm text-muted-foreground mb-1">Número de pedido</p>
              <p className="text-xl font-bold text-primary">{orderNumber}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple"
                asChild
              >
                <Link href="/account">{t.checkout.success.viewAccount}</Link>
              </Button>
              <Button variant="outline" className="border-border/50" asChild>
                <Link href="/catalog">{t.checkout.success.continueShopping}</Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─── Empty cart ──────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t.checkout.empty}</h2>
          <Button asChild className="mt-4 bg-primary text-primary-foreground">
            <Link href="/catalog">Explorar productos</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container max-w-5xl px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/catalog">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" />
              Volver al catálogo
            </button>
          </Link>
          <h1 className="text-3xl font-bold">
            <span className="gradient-text">Checkout</span>
          </h1>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit as any)}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            {/* ─── Form ─────────────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-3 space-y-6"
            >
              {/* Customer info */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="font-semibold text-lg mb-4">Información del cliente</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">{t.checkout.name} *</Label>
                    <Input
                      id="customerName"
                      {...register("customerName")}
                      className="mt-1 bg-muted border-border/50 focus:border-primary/50"
                      placeholder="Juan Pérez"
                    />
                    {errors.customerName && (
                      <p className="text-destructive text-xs mt-1">{errors.customerName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">{t.checkout.email} *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      {...register("customerEmail")}
                      className="mt-1 bg-muted border-border/50 focus:border-primary/50"
                      placeholder="juan@email.com"
                    />
                    {errors.customerEmail && (
                      <p className="text-destructive text-xs mt-1">{errors.customerEmail.message}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="customerPhone">{t.checkout.phone}</Label>
                    <Input
                      id="customerPhone"
                      {...register("customerPhone")}
                      className="mt-1 bg-muted border-border/50 focus:border-primary/50"
                      placeholder="+57 300 000 0000"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping address */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="font-semibold text-lg mb-4">Dirección de envío</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="street">{t.checkout.address} *</Label>
                    <Input
                      id="street"
                      {...register("street")}
                      className="mt-1 bg-muted border-border/50 focus:border-primary/50"
                      placeholder="Calle 123 #45-67"
                    />
                    {errors.street && (
                      <p className="text-destructive text-xs mt-1">{errors.street.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="city">{t.checkout.city} *</Label>
                    <Input
                      id="city"
                      {...register("city")}
                      className="mt-1 bg-muted border-border/50 focus:border-primary/50"
                      placeholder="Bogotá"
                    />
                    {errors.city && (
                      <p className="text-destructive text-xs mt-1">{errors.city.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="state">{t.checkout.state} *</Label>
                    <Input
                      id="state"
                      {...register("state")}
                      className="mt-1 bg-muted border-border/50 focus:border-primary/50"
                      placeholder="Cundinamarca"
                    />
                    {errors.state && (
                      <p className="text-destructive text-xs mt-1">{errors.state.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="zip">{t.checkout.zip} *</Label>
                    <Input
                      id="zip"
                      {...register("zip")}
                      className="mt-1 bg-muted border-border/50 focus:border-primary/50"
                      placeholder="110111"
                    />
                    {errors.zip && (
                      <p className="text-destructive text-xs mt-1">{errors.zip.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="country">{t.checkout.country}</Label>
                    <Input
                      id="country"
                      {...register("country")}
                      className="mt-1 bg-muted border-border/50"
                      defaultValue="Colombia"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="font-semibold text-lg mb-4">Notas adicionales</h2>
                <textarea
                  {...register("notes")}
                  rows={3}
                  className="w-full bg-muted border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                  placeholder=t.checkout.notes
                />
              </div>
            </motion.div>

            {/* ─── Order Summary ─────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-4 lg:sticky lg:top-24">
              <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
                <h2 className="font-semibold text-lg">{t.checkout.summary}</h2>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground opacity-40">
                            <Gamepad2 className="w-5 h-5" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product?.name}</p>
                        {item.variant && (
                          <p className="text-xs text-muted-foreground">{item.variant.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary flex-shrink-0">
                        ${(parseFloat(item.variant?.price ?? item.product?.price ?? "0") * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/50 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t.checkout.subtotal}</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t.checkout.shipping}</span>
                    <span className="text-green-400">{t.checkout.free}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-border/50 pt-2">
                    <span>{t.checkout.total}</span>
                    <span className="text-primary">${subtotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple font-semibold"
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </span>
                  ) : (
                    t.checkout.confirm
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Al confirmar aceptas nuestros términos y condiciones
                </p>
              </div>

              {/* ─── Promo Banner ─────────────────────────────────────────────── */}
              <div
                className="rounded-2xl overflow-hidden relative"
                style={{
                  minHeight: "150px",
                  backgroundImage: `url(https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&q=80)`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* dark overlay */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 100%)" }}
                />
                <div className="relative z-10 p-5">
                  <span
                    className="inline-block text-xs font-bold tracking-widest uppercase mb-2 px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}
                  >
                    Oferta exclusiva
                  </span>
                  <p
                    className="text-xl font-black leading-tight mb-1"
                    style={{ color: "#ffffff" }}
                  >
                    Envío gratis en tu primer pedido
                  </p>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                    Usa el código{" "}
                    <span
                      className="font-bold px-2 py-0.5 rounded"
                      style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
                    >
                      FREESHIP
                    </span>
                  </p>
                </div>
              </div>

              </div>
            </motion.div>
          </div>
        </form>
      </div>
    </div>
  );
}
