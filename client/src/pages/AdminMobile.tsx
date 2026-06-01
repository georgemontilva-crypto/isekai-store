import { useState } from "react";
import { ShoppingBag, CreditCard, Sparkles, Package, Settings, CheckCircle2, XCircle, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

type Section = "orders" | "payments" | "cosplay" | "products" | "settings";

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  processing: "Procesando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// ─── Mobile Orders ────────────────────────────────────────────────────────────
function MobileOrders() {
  const { isAuthenticated, user } = useAuth();
  const { data: ordersData, refetch } = trpc.orders.adminList.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Estado actualizado"); },
  });
  const orders = ordersData?.items ?? [];

  return (
    <div>
      <h2 className="text-xl font-black mb-4 text-[#111]">Pedidos</h2>
      {orders.length === 0 && (
        <p className="text-center text-[#999] py-12">No hay pedidos aún</p>
      )}
      {orders.map((order: any) => (
        <div key={order.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-bold text-sm text-[#111]">{order.orderNumber}</p>
              <p className="text-[#999] text-xs mt-0.5">{order.customerName}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[order.status] ?? "bg-gray-100 text-gray-600"}`}>
              {statusLabels[order.status] ?? order.status}
            </span>
          </div>
          <p className="text-2xl font-black text-[#111]">${parseFloat(order.total).toFixed(2)}</p>
          {order.status === "pending" && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => updateStatus.mutate({ orderId: order.id, status: "confirmed" })}
                className="flex-1 bg-[#111] text-white py-2.5 rounded-xl text-sm font-semibold"
              >
                Confirmar
              </button>
              <button
                onClick={() => updateStatus.mutate({ orderId: order.id, status: "cancelled" })}
                className="flex-1 bg-red-50 text-red-500 py-2.5 rounded-xl text-sm font-semibold border border-red-200"
              >
                Cancelar
              </button>
            </div>
          )}
          {order.status !== "pending" && (
            <div className="flex gap-2 mt-3">
              <select
                value={order.status}
                onChange={(e) => updateStatus.mutate({ orderId: order.id, status: e.target.value as any })}
                className="flex-1 border border-[#e5e5e5] rounded-xl px-3 py-2 text-sm bg-[#f8f8f8] text-[#111]"
              >
                {Object.entries(statusLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Mobile Payments ──────────────────────────────────────────────────────────
function MobilePayments() {
  const { isAuthenticated, user } = useAuth();
  const { data: paymentsData, refetch } = trpc.orders.adminPayments.useQuery(
    { status: "all" },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const verifyPayment = trpc.orders.verifyPayment.useMutation({
    onSuccess: () => { refetch(); toast.success("Pago actualizado"); },
  });
  const payments = paymentsData?.items ?? [];

  return (
    <div>
      <h2 className="text-xl font-black mb-4 text-[#111]">Pagos</h2>
      {payments.length === 0 && (
        <p className="text-center text-[#999] py-12">No hay pagos pendientes</p>
      )}
      {payments.map((order: any) => (
        <div key={order.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <p className="font-bold text-[#111]">{order.customerName}</p>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[order.paymentStatus ?? order.status] ?? "bg-gray-100 text-gray-600"}`}>
              {order.paymentStatus ?? order.status}
            </span>
          </div>
          <p className="text-xs text-[#999] mb-2">{order.orderNumber}</p>
          <p className="text-2xl font-black text-[#111] my-2">${parseFloat(order.total).toFixed(2)}</p>
          {order.receiptUrl && (
            <a
              href={order.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-blue-50 text-blue-600 py-2.5 rounded-xl text-sm font-medium mb-3"
            >
              <Eye size={15} />
              Ver comprobante
            </a>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => verifyPayment.mutate({ orderId: order.id, approved: true })}
              disabled={verifyPayment.isPending}
              className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={16} /> Aprobar
            </button>
            <button
              onClick={() => verifyPayment.mutate({ orderId: order.id, approved: false })}
              disabled={verifyPayment.isPending}
              className="flex-1 bg-red-50 text-red-500 py-3 rounded-xl font-bold border border-red-200 flex items-center justify-center gap-1.5"
            >
              <XCircle size={16} /> Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Mobile Cosplay ───────────────────────────────────────────────────────────
function MobileCosplay() {
  const { isAuthenticated, user } = useAuth();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { data: apps = [], refetch } = trpc.cosplay.getApplications.useQuery(
    { status: "pending" },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const approveApp = trpc.cosplay.approveApplication.useMutation({
    onSuccess: () => { refetch(); toast.success("Cosplayer aprobado"); },
  });
  const rejectApp = trpc.cosplay.rejectApplication.useMutation({
    onSuccess: () => { refetch(); setRejectingId(null); setRejectReason(""); toast.success("Solicitud rechazada"); },
  });

  return (
    <div>
      <h2 className="text-xl font-black mb-4 text-[#111]">Cosplay — Solicitudes</h2>
      {apps.length === 0 && (
        <p className="text-center text-[#999] py-12">No hay solicitudes pendientes</p>
      )}
      {apps.map((app: any) => (
        <div key={app.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            {app.photo && (
              <img src={app.photo} className="w-12 h-12 rounded-full object-cover shrink-0" alt="" />
            )}
            <div className="min-w-0">
              <p className="font-bold text-[#111] truncate">{app.artisticName ?? app.fullName}</p>
              <p className="text-[#999] text-xs mt-0.5">{app.country} · @{app.instagram}</p>
            </div>
          </div>
          {rejectingId === app.id ? (
            <div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Motivo del rechazo..."
                rows={3}
                className="w-full border border-[#e5e5e5] rounded-xl px-3 py-2 text-sm mb-2 resize-none bg-[#f8f8f8]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => rejectApp.mutate({ applicationId: app.id, reason: rejectReason })}
                  disabled={rejectApp.isPending}
                  className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-bold text-sm"
                >
                  Confirmar rechazo
                </button>
                <button
                  onClick={() => setRejectingId(null)}
                  className="flex-1 border border-[#e5e5e5] text-[#666] py-2.5 rounded-xl font-bold text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => approveApp.mutate({ applicationId: app.id, tier: "bronce", totalFollowers: 0 })}
                disabled={approveApp.isPending}
                className="flex-1 bg-[#111] text-white py-3 rounded-xl font-bold text-sm"
              >
                Aprobar
              </button>
              <button
                onClick={() => setRejectingId(app.id)}
                className="flex-1 border border-red-200 text-red-500 py-3 rounded-xl font-bold text-sm"
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Mobile Products ──────────────────────────────────────────────────────────
function MobileProducts() {
  const { isAuthenticated, user } = useAuth();
  const { data: productsData } = trpc.products.adminList.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const products = productsData?.items ?? [];

  return (
    <div>
      <h2 className="text-xl font-black mb-4 text-[#111]">Productos</h2>
      {products.length === 0 && (
        <p className="text-center text-[#999] py-12">No hay productos</p>
      )}
      {products.map((p: any) => (
        <div key={p.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex items-center gap-3">
          {p.images?.[0]?.url && (
            <img src={p.images[0].url} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#f0f0f0]" alt="" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-[#111] truncate">{p.name}</p>
            <p className="text-xs text-[#999] mt-0.5">{p.categoryName ?? "Sin categoría"}</p>
            <p className="text-sm font-black text-[#e5007d] mt-1">${parseFloat(p.price).toFixed(2)}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {p.active ? "Activo" : "Inactivo"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Mobile Settings ──────────────────────────────────────────────────────────
function MobileSettings() {
  return (
    <div>
      <h2 className="text-xl font-black mb-4 text-[#111]">Configuración</h2>
      <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
        <p className="text-[#999] text-sm">Para configuración avanzada, usa el panel en desktop.</p>
      </div>
    </div>
  );
}

// ─── AdminMobile ──────────────────────────────────────────────────────────────
export default function AdminMobile() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>("orders");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e5007d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    window.location.href = getLoginUrl();
    return null;
  }

  const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: "orders",   label: "Pedidos",   icon: ShoppingBag },
    { id: "payments", label: "Pagos",     icon: CreditCard },
    { id: "cosplay",  label: "Cosplay",   icon: Sparkles },
    { id: "products", label: "Productos", icon: Package },
    { id: "settings", label: "Config",    icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      {/* Header */}
      <div
        className="fixed top-0 left-0 right-0 bg-white border-b border-[#f0f0f0] z-50 px-4 flex items-end pb-3"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', minHeight: 60 }}
      >
        <h1 className="font-black text-lg text-[#111]">Panel Admin</h1>
      </div>

      {/* Content */}
      <div className="pt-20 pb-24 px-4">
        {activeSection === "orders"   && <MobileOrders />}
        {activeSection === "payments" && <MobilePayments />}
        {activeSection === "cosplay"  && <MobileCosplay />}
        {activeSection === "products" && <MobileProducts />}
        {activeSection === "settings" && <MobileSettings />}
      </div>

      {/* Bottom navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#f0f0f0] z-50 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              activeSection === item.id ? "text-[#e5007d]" : "text-[#999]"
            }`}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
