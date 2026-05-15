import { motion } from "framer-motion";
import { Package, Clock, ChevronRight, User, LogOut } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";

const statusLabels: Record<string, string> = {
  pending: "Pendiente / Pending",
  processing: "Procesando / Processing",
  shipped: "Enviado / Shipped",
  delivered: "Entregado / Delivered",
  cancelled: "Cancelado / Cancelled",
};

export default function Account() {
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
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm mx-auto px-4"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Inicia sesión</h2>
          <p className="text-muted-foreground mb-6">
            Accede a tu cuenta para ver tu historial de pedidos
          </p>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple w-full"
            onClick={() => (window.location.href = getLoginUrl())}
          >
            Iniciar sesión
          </Button>
        </motion.div>
      </div>
    );
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
              <p className="font-medium text-foreground">No tienes pedidos aún</p>
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
