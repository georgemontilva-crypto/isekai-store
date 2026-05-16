import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Clock, ChevronRight, LogOut, Heart, Ticket, User, ShoppingBag, Mail, Calendar, Chrome, MapPin } from "lucide-react";
import { OrderTimeline } from "@/components/OrderTimeline";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/_core/hooks/useAuth";
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

type Tab = "orders" | "wishlist" | "coupons" | "profile";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "orders",   label: "Mis Pedidos", icon: Package },
  { id: "wishlist", label: "Guardados",   icon: Heart },
  { id: "coupons",  label: "Cupones",     icon: Ticket },
  { id: "profile",  label: "Mi Perfil",   icon: User },
];

export default function Account() {
  const { t } = useLang();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("orders");

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
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="container max-w-4xl">

        {/* ── Avatar + Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-3xl font-bold mb-4 shadow-sm">
            {initial}
          </div>
          <h1 className="text-xl font-bold text-[#1a1a1a]">{user?.name}</h1>
          <p className="text-sm text-[#888] mt-0.5">{user?.email}</p>
          <button
            onClick={() => logout()}
            className="mt-4 flex items-center gap-1.5 text-xs text-[#888] hover:text-[#1a1a1a] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </motion.div>

        {/* ── Tabs pills ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex justify-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide"
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
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
                                    <OrderTimeline
                                      currentStatus={order.status}
                                      showDescriptions
                                    />
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
