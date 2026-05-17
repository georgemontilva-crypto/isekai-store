import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle, ShoppingBag, Loader2, Gamepad2,
  Upload, CreditCard, ChevronDown,
} from "lucide-react";
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

// ─── Payment method definitions ───────────────────────────────────────────────
const PAYMENT_METHODS: Record<string, { id: string; label: string; icon: string }[]> = {
  Colombia: [
    { id: "nequi", label: "Nequi", icon: "🟣" },
    { id: "daviplata", label: "Daviplata", icon: "🔴" },
    { id: "bancolombia", label: "Bancolombia", icon: "🟡" },
    { id: "binance", label: "Binance Pay", icon: "🟠" },
  ],
  Venezuela: [
    { id: "pago_movil", label: "Pago Móvil", icon: "📱" },
    { id: "binance", label: "Binance Pay", icon: "🟠" },
    { id: "zelle", label: "Zelle", icon: "🟣" },
  ],
  Otro: [
    { id: "binance", label: "Binance Pay", icon: "🟠" },
    { id: "zelle", label: "Zelle", icon: "🟣" },
    { id: "transferencia", label: "Transferencia", icon: "🏦" },
  ],
};

const SETTING_KEYS: Record<string, string[]> = {
  nequi:         ["nequi_number"],
  daviplata:     ["daviplata_number"],
  bancolombia:   ["bancolombia_number", "bancolombia_type", "bancolombia_owner"],
  pago_movil:    ["pago_movil_number", "pago_movil_bank", "pago_movil_id"],
  binance:       ["binance_id"],
  zelle:         ["zelle_email"],
  transferencia: ["transferencia_details"],
};

const SETTING_LABELS: Record<string, string> = {
  nequi_number:         "Número Nequi",
  daviplata_number:     "Número Daviplata",
  bancolombia_number:   "Número de cuenta",
  bancolombia_type:     "Tipo de cuenta",
  bancolombia_owner:    "Titular",
  pago_movil_number:    "Número de teléfono",
  pago_movil_bank:      "Banco",
  pago_movil_id:        "Cédula / RIF",
  binance_id:           "ID de Binance",
  zelle_email:          "Email de Zelle",
  transferencia_details: "Datos de transferencia",
};

// ─── Form schema ──────────────────────────────────────────────────────────────
const schema = z.object({
  customerName: z.string().min(2, "Nombre requerido"),
  customerEmail: z.string().email("Email inválido"),
  customerPhone: z.string().optional(),
  street: z.string().min(5, "Dirección requerida"),
  city: z.string().min(2, "Ciudad requerida"),
  state: z.string().min(2, "Departamento / Estado requerido"),
  zip: z.string().min(4, "Código postal requerido"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Receipt form schema ───────────────────────────────────────────────────────
const receiptSchema = z.object({
  paymentReference: z.string().min(1, "Referencia requerida"),
  receiptHolder: z.string().min(2, "Nombre del titular requerido"),
});
type ReceiptFormData = z.infer<typeof receiptSchema>;

export default function Checkout() {
  const { t } = useLang();
  const [, navigate] = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── State ─────────────────────────────────────────────────────────────────
  const [selectedCountry, setSelectedCountry] = useState<string>("Colombia");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<{ id: number; orderNumber: string } | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sessionId = localStorage.getItem("isekai-session-id") ?? undefined;

  // ─── Queries & mutations ───────────────────────────────────────────────────
  const { data: settings } = trpc.settings.getAll.useQuery();
  const createOrder = trpc.orders.create.useMutation();
  const uploadReceipt = trpc.orders.uploadReceipt.useMutation();
  const submitReceipt = trpc.orders.submitReceipt.useMutation();

  // ─── Order form ────────────────────────────────────────────────────────────
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

  // ─── Receipt form ──────────────────────────────────────────────────────────
  const {
    register: regReceipt,
    handleSubmit: handleReceipt,
    formState: { errors: receiptErrors },
  } = useForm<ReceiptFormData>({ resolver: zodResolver(receiptSchema) as any });

  const onSubmitOrder = async (data: FormData) => {
    if (items.length === 0) { toast.error(t.checkout.empty); return; }
    if (!selectedMethod) { toast.error("Selecciona un método de pago"); return; }

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
        total: subtotal.toFixed(2),
        notes: data.notes,
        paymentMethod: selectedMethod,
        country: selectedCountry,
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

      if (order.paymentUrl) {
        window.location.href = order.paymentUrl;
        return;
      }

      setCreatedOrder({ id: order.id, orderNumber: order.orderNumber });
    } catch {
      toast.error(t.checkout.errors.error);
    }
  };

  const onSubmitReceipt = async (data: ReceiptFormData) => {
    if (!createdOrder) return;
    if (!selectedMethod) return;
    if (!user) { toast.error("Debes iniciar sesión para enviar el comprobante"); return; }

    if (!receiptFile) { toast.error("Adjunta el comprobante de pago"); return; }

    setUploading(true);
    try {
      const base64 = await fileToBase64(receiptFile);
      const { url } = await uploadReceipt.mutateAsync({
        fileName: receiptFile.name,
        fileType: receiptFile.type,
        fileBase64: base64,
      });

      await submitReceipt.mutateAsync({
        orderId: createdOrder.id,
        receiptUrl: url,
        paymentReference: data.paymentReference,
        receiptHolder: data.receiptHolder,
      });

      setReceiptSubmitted(true);
      toast.success("¡Comprobante enviado! Verificaremos tu pago pronto.");
    } catch {
      toast.error("Error al subir el comprobante. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  // ─── Receipt submitted confirmation ───────────────────────────────────────
  if (receiptSubmitted && createdOrder) {
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
          <h1 className="text-3xl font-black mb-3">¡Comprobante enviado!</h1>
          <p className="text-muted-foreground mb-6">
            Verificaremos tu pago en las próximas horas y te notificaremos por correo.
          </p>
          <div className="p-4 rounded-2xl bg-card border border-border/50 mb-8">
            <p className="text-sm text-muted-foreground mb-1">Número de pedido</p>
            <p className="text-xl font-bold text-primary">{createdOrder.orderNumber}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple" asChild>
              <Link href="/account">{t.checkout.success.viewAccount}</Link>
            </Button>
            <Button variant="outline" className="border-border/50" asChild>
              <Link href="/catalog">{t.checkout.success.continueShopping}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Payment instructions screen (after order created) ────────────────────
  if (createdOrder) {
    const methodKeys = SETTING_KEYS[selectedMethod ?? ""] ?? [];
    const methodLabel = PAYMENT_METHODS[selectedCountry]?.find(m => m.id === selectedMethod)?.label ?? selectedMethod;

    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container max-w-lg px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center mb-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-black mb-1">¡Pedido creado!</h1>
              <p className="text-muted-foreground text-sm">
                Pedido <span className="font-bold text-primary">{createdOrder.orderNumber}</span>
              </p>
            </div>

            {/* Payment instructions */}
            <div className="p-5 rounded-2xl bg-card border border-border/50 space-y-3">
              <h2 className="font-semibold text-base">Instrucciones de pago — {methodLabel}</h2>
              <p className="text-sm text-muted-foreground">Realiza el pago al siguiente número/cuenta y sube el comprobante:</p>
              <div className="space-y-2">
                {methodKeys.map(key => {
                  const val = settings?.[key];
                  if (!val) return null;
                  return (
                    <div key={key} className="flex justify-between items-start gap-4 bg-muted/50 rounded-xl px-3 py-2">
                      <span className="text-xs text-muted-foreground">{SETTING_LABELS[key]}</span>
                      <span className="text-sm font-mono font-semibold text-right break-all">{val}</span>
                    </div>
                  );
                })}
                {methodKeys.every(k => !settings?.[k]) && (
                  <p className="text-sm text-amber-400">El administrador configurará los datos de pago pronto. Contáctanos si necesitas información.</p>
                )}
              </div>
              <div className="bg-primary/10 rounded-xl px-3 py-2">
                <p className="text-sm font-bold text-primary">Total a pagar: ${subtotal.toFixed(2)}</p>
              </div>
            </div>

            {/* Receipt upload */}
            {user ? (
              <form onSubmit={handleReceipt(onSubmitReceipt)} className="p-5 rounded-2xl bg-card border border-border/50 space-y-4">
                <h2 className="font-semibold text-base">Subir comprobante</h2>

                <div>
                  <Label>Comprobante (JPG, PNG o PDF)</Label>
                  <div
                    className="mt-1 border-2 border-dashed border-border/50 rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors flex flex-col items-center gap-2"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {receiptFile ? receiptFile.name : "Haz clic para seleccionar archivo"}
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={e => setReceiptFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Número de referencia *</Label>
                  <Input
                    {...regReceipt("paymentReference")}
                    className="mt-1 bg-muted border-border/50 focus:border-primary/50"
                    placeholder="Ej: 1234567890"
                  />
                  {receiptErrors.paymentReference && (
                    <p className="text-destructive text-xs mt-1">{receiptErrors.paymentReference.message}</p>
                  )}
                </div>

                <div>
                  <Label>Nombre del titular *</Label>
                  <Input
                    {...regReceipt("receiptHolder")}
                    className="mt-1 bg-muted border-border/50 focus:border-primary/50"
                    placeholder="Nombre de quien realiza el pago"
                  />
                  {receiptErrors.receiptHolder && (
                    <p className="text-destructive text-xs mt-1">{receiptErrors.receiptHolder.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple font-semibold"
                  disabled={uploading}
                >
                  {uploading ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</span>
                  ) : "Enviar comprobante"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Tu pedido se activará cuando verifiquemos el pago
                </p>
              </form>
            ) : (
              <div className="p-5 rounded-2xl bg-card border border-border/50 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Inicia sesión para subir tu comprobante de pago.
                </p>
                <p className="text-xs text-muted-foreground">
                  También puedes contactarnos directamente con tu número de pedido: <strong>{createdOrder.orderNumber}</strong>
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/account">Iniciar sesión</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/catalog">Ver catálogo</Link>
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
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

  const availableMethods = PAYMENT_METHODS[selectedCountry] ?? PAYMENT_METHODS["Otro"];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container max-w-5xl px-4">
        {/* Header */}
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
              {/* Country selector */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="font-semibold text-lg mb-4">País de envío</h2>
                <div className="grid grid-cols-3 gap-3">
                  {["Colombia", "Venezuela", "Otro"].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setSelectedCountry(c); setSelectedMethod(null); }}
                      className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                        selectedCountry === c
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {c}
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
                    <Input id="customerPhone" {...register("customerPhone")} className="mt-1 bg-muted border-border/50 focus:border-primary/50" placeholder="+57 300 000 0000" />
                  </div>
                </div>
              </div>

              {/* Shipping address */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="font-semibold text-lg mb-4">Dirección de envío</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="street">{t.checkout.address} *</Label>
                    <Input id="street" {...register("street")} className="mt-1 bg-muted border-border/50 focus:border-primary/50" placeholder="Calle 123 #45-67" />
                    {errors.street && <p className="text-destructive text-xs mt-1">{errors.street.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="city">{t.checkout.city} *</Label>
                    <Input id="city" {...register("city")} className="mt-1 bg-muted border-border/50 focus:border-primary/50" placeholder="Bogotá" />
                    {errors.city && <p className="text-destructive text-xs mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="state">{t.checkout.state} *</Label>
                    <Input id="state" {...register("state")} className="mt-1 bg-muted border-border/50 focus:border-primary/50" placeholder="Cundinamarca" />
                    {errors.state && <p className="text-destructive text-xs mt-1">{errors.state.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="zip">{t.checkout.zip} *</Label>
                    <Input id="zip" {...register("zip")} className="mt-1 bg-muted border-border/50 focus:border-primary/50" placeholder="110111" />
                    {errors.zip && <p className="text-destructive text-xs mt-1">{errors.zip.message}</p>}
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h2 className="font-semibold text-lg mb-4">Método de pago</h2>
                <div className="grid grid-cols-2 gap-3">
                  {availableMethods.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedMethod === m.id
                          ? "border-[#d946ef] bg-[#d946ef]/10 shadow-[0_0_10px_rgba(217,70,239,0.2)]"
                          : "border-border/50 hover:border-[#d946ef]/40"
                      }`}
                    >
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-sm font-medium">{m.label}</span>
                    </button>
                  ))}
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

                  {selectedMethod && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                      <span>Pago vía:</span>
                      <span className="font-semibold text-foreground">
                        {availableMethods.find(m => m.id === selectedMethod)?.label}
                      </span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple font-semibold"
                    disabled={createOrder.isPending || !selectedMethod}
                  >
                    {createOrder.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Procesando...
                      </span>
                    ) : selectedMethod ? t.checkout.confirm : "Selecciona método de pago"}
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
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
