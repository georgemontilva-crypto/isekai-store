import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle, ShoppingBag, Loader2, Gamepad2, Instagram, Gift, X, Clock,
  Smartphone, Bitcoin,
} from "lucide-react";
import { Link } from "wouter";
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
import PaymentModal, { type ReceiptData } from "@/components/PaymentModal";
import { STORE_COUNTRY, PAYMENT_METHOD_LABELS, type PaymentMethodId } from "@shared/payment";

const schema = z.object({
  customerName: z.string().min(2, "Nombre requerido"),
  customerEmail: z.string().email("Email inválido"),
  customerPhone: z.string().optional(),
  street: z.string().min(5, "Dirección requerida"),
  city: z.string().min(2, "Ciudad requerida"),
  state: z.string().min(2, "Estado requerido"),
  zip: z.string().min(4, "Código postal requerido"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Checkout() {
  const { t } = useLang();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  // La tienda opera únicamente en Venezuela
  const selectedCountry = STORE_COUNTRY;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("pago_movil");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);
  const [createdOrder, setCreatedOrder] = useState<{
    id: number;
    orderNumber: string;
    total: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    country: string;
    shippingAddress: { street: string; city: string };
  } | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralCosplayer, setReferralCosplayer] = useState<any>(null);
  const [giftCardInput, setGiftCardInput] = useState('');

  const sessionId = localStorage.getItem("isekai-session-id") ?? undefined;

  const { data: siteSettings } = trpc.settings.getAll.useQuery();
  const createOrder = trpc.orders.create.useMutation();

  const validateCode = trpc.cosplay.validateReferralCode.useQuery(
    { code: referralCode.toUpperCase() },
    { enabled: referralCode.length >= 8 }
  );

  const giftCardQuery = trpc.giftCards.validate.useQuery(
    { code: giftCardInput.toUpperCase(), orderTotal: subtotal },
    { enabled: giftCardInput.length >= 14 }
  );

  useEffect(() => {
    if (validateCode.data) {
      setReferralCosplayer(validateCode.data);
    } else {
      setReferralCosplayer(null);
    }
  }, [validateCode.data]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      customerName: user?.name ?? "",
      customerEmail: user?.email ?? "",
    },
  });

  const appliedGiftCard = giftCardQuery.data?.valid ? giftCardQuery.data.card : null;
  const giftDiscount = appliedGiftCard ? parseFloat(appliedGiftCard.discount) : 0;
  const finalTotal = Math.max(0, subtotal - giftDiscount);

  /** Paso 1: validar el formulario y abrir el modal con los datos de pago */
  const onSubmitOrder = (data: FormData) => {
    if (items.length === 0) { toast.error(t.checkout.empty); return; }
    setPendingForm(data);
    setPaymentOpen(true);
  };

  /** Paso 2: el cliente ya pagó y subió su comprobante → se crea la orden */
  const createOrderWithReceipt = async (receipt: ReceiptData) => {
    const data = pendingForm;
    if (!data) return;

    try {
      const order = await createOrder.mutateAsync({
        sessionId: user ? undefined : sessionId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        shippingAddress: {
          street: data.street,
          city: data.city,
          state: data.state,
          country: selectedCountry,
          zip: data.zip,
        },
        subtotal: subtotal.toFixed(2),
        total: finalTotal.toFixed(2),
        notes: data.notes,
        paymentMethod,
        receiptUrl: receipt.receiptUrl,
        paymentReference: receipt.paymentReference,
        receiptHolder: receipt.receiptHolder,
        country: selectedCountry,
        referralCode: referralCosplayer ? referralCode : undefined,
        referralCosplayerId: referralCosplayer?.id,
        hasSecretGift: !!referralCosplayer,
        giftCardCode: appliedGiftCard?.code,
        giftCardDiscount: giftDiscount > 0 ? giftDiscount.toFixed(2) : undefined,
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

      await clearCart();

      const orderWithDetails = {
        ...order,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        country: selectedCountry,
        shippingAddress: { street: data.street, city: data.city },
      };

      setPaymentOpen(false);
      setCreatedOrder(orderWithDetails);
    } catch {
      toast.error(t.checkout.errors.error);
    }
  };

  // ─── Order confirmation screen ───────────────────────────────────────────────
  if (createdOrder) {
    const igUser = (siteSettings?.["instagram_username"] ?? "").trim().replace(/^@/, "");

    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <h1 className="text-3xl font-black mb-3">¡Pedido creado!</h1>
          <p className="text-muted-foreground mb-6">
            Recibimos tu comprobante. Verificaremos tu pago y te avisaremos por correo cuando
            esté aprobado. Puedes seguir el estado desde tu cuenta.
          </p>
          <div className="p-4 rounded-2xl bg-card border border-border/50 mb-6">
            <p className="text-sm text-muted-foreground mb-1">Número de pedido</p>
            <p className="text-xl font-bold text-[#e5007d]">{createdOrder.orderNumber}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
              <Clock size={12} /> Pago en verificación
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full bg-[#e5007d] hover:bg-[#c4006b] text-white font-semibold" asChild>
              <Link href="/account">{t.checkout.success.viewAccount}</Link>
            </Button>
            {igUser && (
              <Button
                variant="outline"
                className="border-border/50"
                onClick={() => window.open(`https://ig.me/m/${igUser}`, "_blank")}
              >
                <Instagram size={18} className="mr-2" /> ¿Dudas? Escríbenos por Instagram
              </Button>
            )}
          </div>
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
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

        <form onSubmit={handleSubmit(onSubmitOrder as any)}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-8">
            {/* ─── Form ─────────────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="order-2 md:order-1 md:col-span-3 space-y-6"
            >
              {/* Método de pago */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="font-semibold text-lg mb-1">Método de pago</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Envíos únicamente dentro de {STORE_COUNTRY}. Todos los precios están en dólares (USD).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id: "pago_movil" as const, Icon: Smartphone, desc: "Banco de Venezuela" },
                    { id: "crypto" as const, Icon: Bitcoin, desc: "USDT · Tron (TRC20)" },
                  ]).map(({ id, Icon, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id)}
                      className={`flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all ${
                        paymentMethod === id
                          ? "border-[#e5007d] bg-[#e5007d]/5"
                          : "border-border/50 hover:border-[#e5007d]/40"
                      }`}
                    >
                      <Icon size={20} className={paymentMethod === id ? "text-[#e5007d]" : "text-muted-foreground"} />
                      <span className={`text-sm font-bold ${paymentMethod === id ? "text-[#e5007d]" : ""}`}>
                        {PAYMENT_METHOD_LABELS[id]}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer info */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="font-semibold text-lg mb-4">Información del cliente</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">{t.checkout.name} *</Label>
                    <Input id="customerName" {...register("customerName")} className="mt-1 bg-muted border-border/50 focus:border-primary/50" placeholder="Juan Pérez" />
                    {errors.customerName && <p className="text-destructive text-xs mt-1">{errors.customerName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">{t.checkout.email} *</Label>
                    <Input id="customerEmail" type="email" {...register("customerEmail")} className="mt-1 bg-muted border-border/50 focus:border-primary/50" placeholder="juan@email.com" />
                    {errors.customerEmail && <p className="text-destructive text-xs mt-1">{errors.customerEmail.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="customerPhone">{t.checkout.phone}</Label>
                    <Input id="customerPhone" {...register("customerPhone")} className="mt-1 bg-muted border-border/50 focus:border-primary/50" placeholder="+58 412 000 0000" />
                  </div>
                </div>
              </div>

              {/* Shipping address */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="font-semibold text-lg mb-4">Dirección de envío</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="street">{t.checkout.address} *</Label>
                    <Input id="street" {...register("street")} className="mt-1 bg-muted border-border/50 focus:border-primary/50" placeholder="Av. Principal, Res. Los Robles, Apto 3-B" />
                    {errors.street && <p className="text-destructive text-xs mt-1">{errors.street.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="city">{t.checkout.city} *</Label>
                    <Input id="city" {...register("city")} className="mt-1 bg-muted border-border/50 focus:border-primary/50" placeholder="Caracas" />
                    {errors.city && <p className="text-destructive text-xs mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="state">{t.checkout.state} *</Label>
                    <Input id="state" {...register("state")} className="mt-1 bg-muted border-border/50 focus:border-primary/50" placeholder="Distrito Capital" />
                    {errors.state && <p className="text-destructive text-xs mt-1">{errors.state.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="zip">{t.checkout.zip} *</Label>
                    <Input id="zip" {...register("zip")} className="mt-1 bg-muted border-border/50 focus:border-primary/50" placeholder="1010" />
                    {errors.zip && <p className="text-destructive text-xs mt-1">{errors.zip.message}</p>}
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
                  placeholder={t.checkout.notes}
                />
              </div>

            </motion.div>

            {/* ─── Order Summary ─────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="order-1 md:order-2 md:col-span-2 flex flex-col gap-4"
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
                          {item.variant && <p className="text-xs text-muted-foreground">{item.variant.name}</p>}
                          <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="text-sm font-bold text-[#e5007d]">
                            ${(parseFloat(item.variant?.price ?? item.product?.price ?? "0") * item.quantity).toFixed(2)} USD
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border/50 pt-4 space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{t.checkout.subtotal}</span>
                      <span className="font-bold text-[#e5007d]">${subtotal.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{t.checkout.shipping}</span>
                      <span className="text-green-400">{t.checkout.free}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t border-border/50 pt-2">
                      <span>{t.checkout.total}</span>
                      <span className="font-black text-[#e5007d]">${finalTotal.toFixed(2)} USD</span>
                    </div>
                  </div>

                  {/* Campo tarjeta de regalo / cupón */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#111] mb-2">
                      Tarjeta de regalo / Cupón
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={giftCardInput}
                        onChange={e => setGiftCardInput(e.target.value.toUpperCase())}
                        placeholder="GR-XXXX-XXXX-XXXX"
                        className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111] uppercase tracking-wider"
                      />
                      {appliedGiftCard && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CheckCircle size={16} className="text-green-500" />
                        </div>
                      )}
                    </div>

                    {appliedGiftCard && (
                      <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <p className="text-sm text-green-700 font-semibold">
                          ✓ {appliedGiftCard.discountType === 'percent'
                            ? `${appliedGiftCard.discountPercent}% de descuento aplicado`
                            : `Descuento de $${giftDiscount.toFixed(2)} USD aplicado`}
                        </p>
                      </div>
                    )}
                    {giftCardInput.length >= 14 && !appliedGiftCard && !giftCardQuery.isLoading && (
                      <p className="text-xs text-red-400 mt-1">
                        {giftCardQuery.data?.reason ?? 'Código no válido'}
                      </p>
                    )}
                  </div>

                  {appliedGiftCard && (
                    <div className="flex flex-col gap-1 mb-3 text-sm border-t border-[#e5e5e5] pt-3">
                      <div className="flex justify-between text-[#999]">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)} USD</span>
                      </div>
                      <div className="flex justify-between text-green-600 font-semibold">
                        <span>Descuento</span>
                        <span>-${giftDiscount.toFixed(2)} USD</span>
                      </div>
                      <div className="flex justify-between font-black text-[#111] text-base pt-1 border-t border-[#e5e5e5]">
                        <span>Total a pagar</span>
                        <span className="text-[#e5007d]">${finalTotal.toFixed(2)} USD</span>
                      </div>
                    </div>
                  )}

                  {/* Campo código de referido — destacado con outline magenta */}
                  <div className="mb-4 rounded-2xl border-2 border-[#e5007d] bg-[#e5007d]/[0.03] p-4">
                    <label className="mb-2 block text-sm font-bold text-[#e5007d]">
                      Código de referido <span className="text-[#999] font-normal text-xs">(opcional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={referralCode}
                        onChange={e => setReferralCode(e.target.value.toUpperCase())}
                        placeholder="ISK-NOMBRE-0000"
                        className="w-full border-2 border-[#e5007d]/40 bg-white rounded-xl px-4 py-3 text-sm outline-none focus:border-[#e5007d] transition-colors uppercase tracking-wider placeholder:text-[#bbb] placeholder:normal-case placeholder:tracking-normal"
                      />
                      {referralCosplayer && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CheckCircle size={16} className="text-green-500" />
                        </div>
                      )}
                    </div>
                    {referralCosplayer && (
                      <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle size={12} />
                        Código de <strong>{referralCosplayer.artisticName}</strong> aplicado
                      </p>
                    )}
                    {referralCode.length >= 8 && !referralCosplayer && !validateCode.isLoading && (
                      <p className="mt-1.5 text-xs text-red-400">Código no válido</p>
                    )}
                    {referralCosplayer && (
                      <div className="mt-2 flex items-center gap-2 bg-[#fff8f0] border border-orange-200 rounded-xl px-3 py-2">
                        <Gift size={14} className="text-orange-500 flex-shrink-0" />
                        <p className="text-xs text-orange-700">
                          <strong>¡Obsequio secreto incluido!</strong>
                        </p>
                      </div>
                    )}
                  </div>

                  {referralCosplayer && (
                    <div className="flex items-center justify-between bg-[#fff8f0] border border-dashed border-[#e5007d] rounded-xl px-4 py-3 mb-3">
                      <div>
                        <p className="text-xs text-[#999] mb-0.5">Código de referido</p>
                        <p className="font-black text-[#e5007d] tracking-widest text-lg">{referralCode.toUpperCase()}</p>
                        <p className="text-xs text-[#666]">Referido por {referralCosplayer.artisticName}</p>
                      </div>
                      <Gift size={20} className="text-orange-500 flex-shrink-0" />
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-[#e5007d] hover:bg-[#c4006b] text-white font-semibold"
                    disabled={createOrder.isPending}
                  >
                    {createOrder.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Procesando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {paymentMethod === "crypto" ? <Bitcoin size={18} /> : <Smartphone size={18} />}
                        Pagar con {PAYMENT_METHOD_LABELS[paymentMethod]}
                      </span>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Al confirmar aceptas nuestros términos y condiciones
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </form>
      </div>

      <PaymentModal
        open={paymentOpen}
        method={paymentMethod}
        amountUSD={finalTotal}
        submitting={createOrder.isPending}
        onClose={() => { if (!createOrder.isPending) setPaymentOpen(false); }}
        onConfirm={createOrderWithReceipt}
      />
    </div>
  );
}
