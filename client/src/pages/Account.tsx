import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Clock, ChevronRight, LogOut } from "lucide-react";
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
      className="min-h-screen flex items-center justify-center bg-cover bg-center px-4 py-16"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=1600&q=80')" }}
    >
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />

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

export default function Account() {
  const { t } = useLang();

  const statusLabels: Record<string, string> = {
    pending: t.account.status.pending,
    processing: t.account.status.processing,
    shipped: t.account.status.shipped,
    delivered: t.account.status.delivered,
    cancelled: t.account.status.cancelled,
  };
  const { user, isAuthenticated, logout, loading } = useAuth();
  const { data: ordersData, isLoading } = trpc.orders.myOrders.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const orders = ordersData?.items ?? [];

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold">
              Mi <span className="gradient-text">cuenta</span>
            </h1>
            <p className="text-muted-foreground mt-1">Bienvenido, {user?.name}</p>
          </div>
          <Button
            variant="outline"
            className="border-border/50 text-muted-foreground hover:text-foreground gap-2"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            Salir
          </Button>
        </motion.div>

        {/* Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Mis pedidos</h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-card animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground">{t.account.noOrders}</p>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Explora nuestro catálogo y realiza tu primera compra
              </p>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                asChild
              >
                <Link href="/catalog">Explorar productos</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-foreground">{order.orderNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium status-${order.status}`}>
                          {statusLabels[order.status] ?? order.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(order.createdAt).toLocaleDateString("es-CO")}</span>
                        <span>·</span>
                        <span className="text-primary font-medium">${parseFloat(order.total).toFixed(2)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
