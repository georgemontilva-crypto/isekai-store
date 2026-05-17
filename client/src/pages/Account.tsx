import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Clock, ChevronRight, LogOut, Heart, Ticket, User, ShoppingBag, Mail, Calendar, Chrome, MapPin, Layers, Upload, Loader2 } from "lucide-react";
import { OrderTimeline } from "@/components/OrderTimeline";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) throw new Error();
      setMagicSent(true);
    } catch {
      toast.error("Error al enviar el enlace, intenta de nuevo");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed left-0 right-0 bottom-0 top-[96px] flex items-center justify-center p-4 overflow-hidden"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=1600&q=80')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 shadow-2xl max-w-md w-full text-white text-center"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="flex items-end gap-[3px]">
            {[6, 10, 14, 10, 6].map((h, i) => (
              <div key={i} className="w-[3px] bg-white rounded-full" style={{ height: `${h}px` }} />
            ))}
          </div>
          <span className="font-bold text-[17px] tracking-tight" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            Isekai World
          </span>
        </div>

        <div className="border-t border-white/20 mb-7" />

        <h1 className="text-2xl font-bold mb-2 leading-snug">Bienvenido de vuelta</h1>
        <p className="text-white/65 text-sm mb-8">Accede para ver tus pedidos, favoritos y más</p>

        {/* Google */}
        <button
          onClick={() => { window.location.href = "/api/auth/google"; }}
          className="w-full flex items-center justify-center gap-3 bg-white text-[#1a1a1a] font-semibold text-sm rounded-xl px-5 py-3.5 hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg mb-5"
        >
          <GoogleIcon />
          Continuar con Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 border-t border-white/20" />
          <span className="text-white/40 text-xs">o</span>
          <div className="flex-1 border-t border-white/20" />
        </div>

        {/* Magic link */}
        {magicSent ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 rounded-xl px-5 py-4 text-sm text-white/90"
          >
            ✉️ Revisa tu correo — te enviamos un enlace de acceso a <span className="font-semibold">{email}</span>
          </motion.div>
        ) : (
          <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu email"
              required
              disabled={sending}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/50 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="w-full bg-white/15 hover:bg-white/25 border border-white/25 text-white font-semibold text-sm rounded-xl px-5 py-3 active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {sending ? "Enviando..." : "Enviar enlace mágico"}
            </button>
          </form>
        )}

        <p className="text-white/35 text-xs mt-7 leading-relaxed">
          ¿No tienes cuenta? El registro es automático al iniciar sesión.
        </p>
      </motion.div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending:       "bg-[#f5f5f5] text-[#555]",
  preparing:     "bg-blue-50 text-blue-700",
  printing:      "bg-violet-50 text-violet-700",
  post_printing: "bg-purple-50 text-purple-700",
  packed:        "bg-orange-50 text-orange-700",
  shipped:       "bg-indigo-50 text-indigo-700",
  delivered:     "bg-green-50 text-green-700",
  cancelled:     "bg-red-50 text-red-700",
};

type Tab = "orders" | "wishlist" | "coupons" | "reserve" | "profile";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "orders",   label: "Mis Pedidos",     icon: Package },
  { id: "wishlist", label: "Guardados",        icon: Heart },
  { id: "coupons",  label: "Cupones",          icon: Ticket },
  { id: "reserve",  label: "CredIsekai",         icon: Layers },
  { id: "profile",  label: "Mi Perfil",        icon: User },
];

export default function Account() {
  const { t } = useLang();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [offsetY, setOffsetY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const { data: siteSettings } = trpc.settings.getAll.useQuery();
  const textureEnabled = siteSettings?.["texture_enabled"] === "true";

  const statusLabels: Record<string, string> = {
    pending:       "Orden creada",
    preparing:     "En preparación",
    printing:      "En impresión 3D",
    post_printing: "Post impresión",
    packed:        "Empacada",
    shipped:       "Enviada",
    delivered:     "Entregada",
    cancelled:     "Cancelada",
  };
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const socket = useSocket();
  const utils = trpc.useUtils();
  const reserveFileRef = useRef<HTMLInputElement>(null);
  const [reservePayingPlanId, setReservePayingPlanId] = useState<number | null>(null);
  const [reserveFile, setReserveFile] = useState<File | null>(null);
  const [reserveRef, setReserveRef] = useState("");
  const [reserveHolder, setReserveHolder] = useState("");
  const [reserveMethod, setReserveMethod] = useState("nequi");
  const [reserveUploading, setReserveUploading] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const handleOrderUpdated = () => {
      utils.orders.myOrders.invalidate();
    };
    socket.on("order:updated", handleOrderUpdated);
    return () => { socket.off("order:updated", handleOrderUpdated); };
  }, [socket, utils]);

  const { data: ordersData, isLoading: ordersLoading } = trpc.orders.myOrders.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const orders = ordersData?.items ?? [];

  const { data: wishlistData, isLoading: wishlistLoading } = trpc.wishlist.getAll.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const wishlistItems = wishlistData ?? [];

  const { data: installmentPlans = [], refetch: refetchPlans } = trpc.installments.getMyPlans.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const uploadReceipt = trpc.orders.uploadReceipt.useMutation();
  const submitInstallmentPayment = trpc.installments.submitPayment.useMutation({
    onSuccess: () => {
      refetchPlans();
      setReservePayingPlanId(null);
      setReserveFile(null);
      setReserveRef("");
      setReserveHolder("");
      toast.success("¡Cuota enviada! La verificaremos pronto.");
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a1a1a]/20 border-t-[#1a1a1a] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const initial = user?.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-white pt-0 pb-20">

      {/* ── Avatar + Header — full width ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden pb-8 sm:py-16"
        style={{
          backgroundImage: textureEnabled ? 'url(/textura-isekai.svg)' : 'none',
          backgroundSize: 'cover',
          backgroundPosition: `center ${offsetY * 0.2}px`,
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,1) 100%)' }} />
        <div className="relative z-10 flex flex-col items-center gap-2 text-center pt-4 sm:pt-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-sm">
            {initial}
          </div>
          <h1 className="text-xl font-bold text-[#1a1a1a]">{user?.name}</h1>
          <p className="text-sm text-[#888]">{user?.email}</p>
          <button
            onClick={() => logout()}
            className="mt-2 flex items-center gap-1.5 text-xs text-[#888] hover:text-[#1a1a1a] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </motion.div>

      <div className="container max-w-4xl py-8">
        {/* ── Tabs pills ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2 mb-8"
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#1a1a1a] text-white"
                    : "bg-white border border-[#ebebeb] text-[#555] hover:border-[#1a1a1a]/30"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >

            {/* ORDERS */}
            {activeTab === "orders" && (
              <div>
                {ordersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 rounded-2xl bg-[#f5f5f5] animate-pulse" />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl border border-[#ebebeb]">
                    <Package className="w-10 h-10 text-[#ccc] mx-auto mb-3" />
                    <p className="font-medium text-[#1a1a1a]">{t.account.noOrders}</p>
                    <p className="text-sm text-[#888] mt-1 mb-6">Explora el catálogo y realiza tu primera compra</p>
                    <Link href="/catalog">
                      <button className="btn-pill text-sm">Explorar tienda</button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order, i) => {
                      const isExpanded = expandedOrderId === order.id;
                      const isCancelled = order.status === "cancelled";
                      const hasTracking = ["shipped", "delivered"].includes(order.status) && ((order as any).trackingNumber || (order as any).trackingCarrier);
                      return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="rounded-2xl border border-[#ebebeb] bg-white overflow-hidden"
                        >
                          {/* Header */}
                          <button
                            className="w-full p-4 text-left hover:bg-[#fafafa] transition-colors"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="font-semibold text-sm text-[#1a1a1a]">{order.orderNumber}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[order.status] ?? "bg-[#f5f5f5] text-[#555]"}`}>
                                    {statusLabels[order.status] ?? order.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-[#888]">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(order.createdAt).toLocaleDateString("es-CO")}</span>
                                  <span>·</span>
                                  <span className="font-semibold text-[#1a1a1a]">${parseFloat(order.total).toFixed(2)}</span>
                                </div>
                              </div>
                              <ChevronRight className={`w-4 h-4 text-[#ccc] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                            </div>
                          </button>

                          {/* Expanded timeline */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-5 pt-4 border-t border-[#f0f0f0]">
                                  {isCancelled ? (
                                    <div className="py-3 px-4 rounded-xl bg-red-50 text-sm font-medium text-red-600 text-center">
                                      Este pedido fue cancelado.
                                    </div>
                                  ) : (
                                    <>
                                      <OrderTimeline currentStatus={order.status} />
                                      {["post_printing", "packed", "shipped", "delivered"].includes(order.status) && (
                                        <div className="sm:hidden mt-4 flex justify-center">
                                          <img
                                            src="https://pub-c4fd9395c33848c3be4160fe5f9532a4.r2.dev/isekai-world/banner/ya%20casi%20listo-11-11.png"
                                            className="w-full max-w-[280px] object-contain rounded-xl"
                                            style={{ animation: "fadeInUp 0.5s ease-out" }}
                                            alt=""
                                          />
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {/* Tracking card — only when shipped/delivered and data exists */}
                                  {hasTracking && (
                                    <div className="mt-4 flex items-start gap-3 p-3.5 rounded-xl border border-[#ebebeb] bg-[#fafafa]">
                                      <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
                                        <MapPin className="w-4 h-4 text-white" />
                                      </div>
                                      <div className="text-sm">
                                        <p className="font-semibold text-[#1a1a1a] mb-0.5">Información de envío</p>
                                        {(order as any).trackingCarrier && (
                                          <p className="text-[#555]">Transportadora: <span className="font-medium">{(order as any).trackingCarrier}</span></p>
                                        )}
                                        {(order as any).trackingNumber && (
                                          <p className="text-[#555]">N° de guía: <span className="font-mono font-medium text-[#1a1a1a]">{(order as any).trackingNumber}</span></p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST */}
            {activeTab === "wishlist" && (
              wishlistLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-48 rounded-2xl bg-[#f5f5f5] animate-pulse" />)}
                </div>
              ) : wishlistItems.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-[#ebebeb]">
                  <Heart className="w-10 h-10 text-[#ccc] mx-auto mb-3" />
                  <p className="font-medium text-[#1a1a1a]">No tienes productos guardados aún</p>
                  <p className="text-sm text-[#888] mt-1 mb-6">Guarda tus productos favoritos para encontrarlos fácilmente</p>
                  <Link href="/catalog">
                    <button className="btn-pill text-sm">
                      <ShoppingBag className="w-3.5 h-3.5 mr-1.5 inline" />
                      Explorar tienda
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {wishlistItems.map((item, i) => item.product && (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link href={`/product/${item.product.slug}`}>
                        <div className="rounded-2xl border border-[#ebebeb] overflow-hidden hover:border-[#1a1a1a]/20 transition-colors bg-white">
                          <div className="aspect-square bg-[#f5f5f5] overflow-hidden">
                            {item.product.imageUrl
                              ? <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-[#ccc]"><ShoppingBag className="w-8 h-8" /></div>
                            }
                          </div>
                          <div className="p-3">
                            <p className="text-xs font-medium text-[#1a1a1a] truncate">{item.product.name}</p>
                            <p className="text-xs text-[#888] mt-0.5">${parseFloat(item.product.price).toFixed(2)}</p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )
            )}

            {/* COUPONS */}
            {activeTab === "coupons" && (
              <div className="text-center py-16 rounded-2xl border border-[#ebebeb]">
                <Ticket className="w-10 h-10 text-[#ccc] mx-auto mb-3" />
                <p className="font-medium text-[#1a1a1a]">No tienes cupones activos</p>
                <p className="text-sm text-[#888] mt-1">Los cupones aparecerán aquí cuando los recibas</p>
              </div>
            )}

            {/* CREDISEKAI */}
            {activeTab === "reserve" && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <h2 className="text-xl font-bold text-[#1a1a1a]">CredIsekai</h2>
                  <p className="text-sm text-[#888] mt-1">Tus planes de pago en cuotas</p>
                </div>

                {/* Disclaimer */}
                <div className="flex gap-2.5 items-start bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <span className="text-amber-500 text-base shrink-0 mt-0.5">⚠️</span>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Importante:</strong> El pedido solo será enviado una vez que se complete el pago total. Disponible únicamente para productos con valor superior a <strong>$150 USD</strong> (o su equivalente en Bs a tasa BCV / COP a tasa del día).
                  </p>
                </div>

                {installmentPlans.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl border border-[#ebebeb]">
                    <Layers className="w-10 h-10 text-[#ccc] mx-auto mb-3" />
                    <p className="font-medium text-[#1a1a1a]">No tienes planes activos</p>
                    <p className="text-sm text-[#888] mt-1 mb-6">Reserva productos elegibles desde la página del producto</p>
                    <Link href="/catalog">
                      <button className="btn-pill text-sm">Explorar tienda</button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(installmentPlans as any[]).map((plan) => {
                      const paid = parseFloat(plan.amountPaid);
                      const total = parseFloat(plan.totalAmount);
                      const pct = Math.min(100, Math.round((paid / total) * 100));
                      const isActive = reservePayingPlanId === plan.id;
                      const cuotaAmount = (total / plan.installments).toFixed(2);
                      const startDate = new Date(plan.createdAt);
                      const schedule = Array.from({ length: plan.installments }, (_, i) => {
                        const d = new Date(startDate);
                        d.setDate(d.getDate() + i * 15);
                        return d;
                      });
                      const approvedCount = (plan.payments as any[]).filter((p: any) => p.status === "approved").length;

                      return (
                        <div key={plan.id} className="rounded-2xl border border-[#ebebeb] overflow-hidden bg-white">
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-[#1a1a1a] truncate">{plan.productName}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                    plan.status === "active" ? "bg-blue-50 text-blue-700" :
                                    plan.status === "completed" ? "bg-green-50 text-green-700" :
                                    "bg-red-50 text-red-700"
                                  }`}>
                                    {plan.status === "active" ? "Activo" : plan.status === "completed" ? "Completado" : "Cancelado"}
                                  </span>
                                  <span className="text-xs text-[#888]">{plan.installments} cuotas · ${cuotaAmount} c/u</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-[#1a1a1a]">${paid.toFixed(2)} / ${total.toFixed(2)}</p>
                                <p className="text-xs text-[#888]">{pct}% pagado</p>
                              </div>
                            </div>

                            <div className="mt-3 h-2 bg-[#f5f5f5] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>

                            {/* Payment schedule */}
                            <div className="mt-3 space-y-1">
                              {schedule.map((date, i) => {
                                const isPaid = i < approvedCount;
                                return (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                    <span className={isPaid ? "text-green-600 font-medium" : "text-[#555]"}>
                                      {isPaid ? "✓ " : `Cuota ${i + 1}: `}
                                      {date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                    <span className={isPaid ? "text-green-600 font-semibold" : "text-[#888]"}>${cuotaAmount}</span>
                                  </div>
                                );
                              })}
                            </div>

                            {plan.status === "active" && (
                              <button
                                onClick={() => setReservePayingPlanId(isActive ? null : plan.id)}
                                className="mt-3 btn-pill text-xs"
                              >
                                {isActive ? "Cancelar" : "Pagar cuota"}
                              </button>
                            )}
                          </div>

                          {/* Payment form */}
                          <AnimatePresence>
                            {isActive && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-[#ebebeb] overflow-hidden"
                              >
                                <div className="p-4 space-y-3">
                                  <p className="text-sm font-medium text-[#1a1a1a]">Subir comprobante de cuota</p>

                                  <div>
                                    <label className="text-xs text-[#888]">Método de pago</label>
                                    <select
                                      value={reserveMethod}
                                      onChange={e => setReserveMethod(e.target.value)}
                                      className="mt-1 w-full text-sm bg-[#f5f5f5] border border-[#ebebeb] rounded-xl px-3 py-2 focus:outline-none"
                                    >
                                      <option value="nequi">Nequi</option>
                                      <option value="daviplata">Daviplata</option>
                                      <option value="bancolombia">Bancolombia</option>
                                      <option value="pago_movil">Pago Móvil</option>
                                      <option value="binance">Binance Pay</option>
                                      <option value="zelle">Zelle</option>
                                      <option value="transferencia">Transferencia</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-xs text-[#888]">Referencia de pago *</label>
                                    <input
                                      value={reserveRef}
                                      onChange={e => setReserveRef(e.target.value)}
                                      className="mt-1 w-full text-sm bg-[#f5f5f5] border border-[#ebebeb] rounded-xl px-3 py-2 focus:outline-none focus:border-[#1a1a1a]/30"
                                      placeholder="Número de referencia"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-xs text-[#888]">Titular de la cuenta *</label>
                                    <input
                                      value={reserveHolder}
                                      onChange={e => setReserveHolder(e.target.value)}
                                      className="mt-1 w-full text-sm bg-[#f5f5f5] border border-[#ebebeb] rounded-xl px-3 py-2 focus:outline-none focus:border-[#1a1a1a]/30"
                                      placeholder="Nombre de quien pagó"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-xs text-[#888]">Comprobante (JPG, PNG, PDF) *</label>
                                    <div
                                      className="mt-1 border-2 border-dashed border-[#ebebeb] rounded-xl p-3 cursor-pointer hover:border-[#1a1a1a]/20 transition-colors flex items-center gap-2"
                                      onClick={() => reserveFileRef.current?.click()}
                                    >
                                      <Upload className="w-4 h-4 text-[#888]" />
                                      <p className="text-xs text-[#888]">{reserveFile ? reserveFile.name : "Seleccionar archivo"}</p>
                                      <input
                                        ref={reserveFileRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                        className="hidden"
                                        onChange={e => setReserveFile(e.target.files?.[0] ?? null)}
                                      />
                                    </div>
                                  </div>

                                  <button
                                    className="btn-pill text-xs w-full justify-center"
                                    disabled={reserveUploading || !reserveFile || !reserveRef || !reserveHolder}
                                    onClick={async () => {
                                      if (!reserveFile) return;
                                      setReserveUploading(true);
                                      try {
                                        const base64 = await new Promise<string>((resolve, reject) => {
                                          const reader = new FileReader();
                                          reader.onload = () => resolve((reader.result as string).split(",")[1]);
                                          reader.onerror = reject;
                                          reader.readAsDataURL(reserveFile);
                                        });
                                        const { url } = await uploadReceipt.mutateAsync({ fileName: reserveFile.name, fileType: reserveFile.type, fileBase64: base64 });
                                        await submitInstallmentPayment.mutateAsync({
                                          planId: plan.id,
                                          amount: (total / plan.installments).toFixed(2),
                                          paymentReference: reserveRef,
                                          receiptUrl: url,
                                          receiptHolder: reserveHolder,
                                          paymentMethod: reserveMethod,
                                        });
                                      } catch {
                                        toast.error("Error al subir el comprobante");
                                      } finally {
                                        setReserveUploading(false);
                                      }
                                    }}
                                  >
                                    {reserveUploading ? (
                                      <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</span>
                                    ) : "Confirmar pago de cuota"}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Payment history */}
                          {plan.payments.length > 0 && (
                            <div className="border-t border-[#ebebeb] px-4 py-3">
                              <p className="text-xs font-medium text-[#888] uppercase tracking-wide mb-2">Historial de cuotas</p>
                              <div className="space-y-1.5">
                                {plan.payments.map((p: any) => (
                                  <div key={p.id} className="flex items-center justify-between text-xs">
                                    <span className="text-[#555]">${parseFloat(p.amount).toFixed(2)} · {p.paymentMethod ?? "—"}</span>
                                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                                      p.status === "approved" ? "bg-green-50 text-green-700" :
                                      p.status === "rejected" ? "bg-red-50 text-red-700" :
                                      "bg-yellow-50 text-yellow-700"
                                    }`}>
                                      {p.status === "approved" ? "Aprobado" : p.status === "rejected" ? "Rechazado" : "En revisión"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#ebebeb] divide-y divide-[#ebebeb]">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <User className="w-4 h-4 text-[#888] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#888] mb-0.5">Nombre</p>
                      <p className="text-sm font-medium text-[#1a1a1a] truncate">{user?.name ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-4">
                    <Mail className="w-4 h-4 text-[#888] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#888] mb-0.5">Email</p>
                      <p className="text-sm font-medium text-[#1a1a1a] truncate">{user?.email ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-4">
                    <Chrome className="w-4 h-4 text-[#888] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#888] mb-0.5">Método de acceso</p>
                      <p className="text-sm font-medium text-[#1a1a1a]">
                        {user?.openId ? "Google" : "Magic Link (Email)"}
                      </p>
                    </div>
                  </div>
                  {user?.createdAt && (
                    <div className="flex items-center gap-3 px-5 py-4">
                      <Calendar className="w-4 h-4 text-[#888] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#888] mb-0.5">Miembro desde</p>
                        <p className="text-sm font-medium text-[#1a1a1a]">
                          {new Date(user.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
