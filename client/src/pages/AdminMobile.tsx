import { useState } from "react";
import { ShoppingBag, CreditCard, Sparkles, Package, Settings } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    pending:    { label: 'Pendiente',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
    confirmed:  { label: 'Confirmado', bg: 'bg-blue-100',   text: 'text-blue-700' },
    processing: { label: 'Procesando', bg: 'bg-purple-100', text: 'text-purple-700' },
    shipped:    { label: 'Enviado',    bg: 'bg-indigo-100', text: 'text-indigo-700' },
    delivered:  { label: 'Entregado',  bg: 'bg-green-100',  text: 'text-green-700' },
    cancelled:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-600' },
  };
  const s = map[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ─── MobileOrders ─────────────────────────────────────────────────────────────

function MobileOrders() {
  const { user, isAuthenticated } = useAuth();
  const { data: ordersData, isLoading } = trpc.orders.adminList.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const orders = ordersData?.items ?? [];

  if (isLoading) return <p className="text-center text-[#999] py-10 text-sm">Cargando pedidos...</p>;
  if (!orders.length) return <p className="text-center text-[#999] py-10 text-sm">Sin pedidos</p>;

  return (
    <div>
      <h2 className="font-black text-lg mb-4">Pedidos recientes</h2>
      {orders.map((order: any) => (
        <div key={order.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-bold text-sm">{order.orderNumber}</p>
              <p className="text-[#999] text-xs">{order.customerName}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-lg font-black">${order.total}</p>
        </div>
      ))}
    </div>
  );
}

// ─── MobilePayments ───────────────────────────────────────────────────────────

function MobilePayments() {
  const { user, isAuthenticated } = useAuth();
  const { data: paymentsData, refetch } = trpc.orders.adminPayments.useQuery(
    { status: 'pending_verification' },
    { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const verifyPayment = trpc.orders.verifyPayment.useMutation({
    onSuccess: () => { refetch(); toast.success('Pago verificado'); },
  });

  const items = paymentsData?.items ?? [];
  if (!items.length) return <p className="text-center text-[#999] py-10 text-sm">Sin pagos pendientes</p>;

  return (
    <div>
      <h2 className="font-black text-lg mb-4">Pagos pendientes</h2>
      {items.map((order: any) => (
        <div key={order.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <p className="font-bold">{order.customerName}</p>
          <p className="text-2xl font-black my-2">${order.total}</p>
          {order.receiptUrl && (
            <a
              href={order.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-blue-50 text-blue-600 py-2 rounded-xl text-sm mb-3"
            >
              Ver comprobante
            </a>
          )}
          <div className="flex gap-2">
            <button
              className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold disabled:opacity-40"
              disabled={verifyPayment.isPending}
              onClick={() => verifyPayment.mutate({ orderId: order.id, approved: true })}
            >
              ✓ Aprobar
            </button>
            <button
              className="flex-1 bg-red-50 text-red-500 py-3 rounded-xl font-bold border border-red-200 disabled:opacity-40"
              disabled={verifyPayment.isPending}
              onClick={() => verifyPayment.mutate({ orderId: order.id, approved: false })}
            >
              ✗ Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MobileCosplay ────────────────────────────────────────────────────────────

function MobileCosplay() {
  const { user, isAuthenticated } = useAuth();
  const { data: apps = [], refetch } = trpc.cosplay.getApplications.useQuery(
    { status: 'pending' },
    { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const [approveModal, setApproveModal] = useState<any>(null);
  const [tier, setTier] = useState('bronce');
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  const approveApp = trpc.cosplay.approveApplication.useMutation({
    onSuccess: () => { refetch(); setApproveModal(null); toast.success('Cosplayer aprobado'); },
  });
  const rejectApp = trpc.cosplay.rejectApplication.useMutation({
    onSuccess: () => { refetch(); setRejectModal(null); toast.success('Solicitud rechazada'); },
  });

  return (
    <div>
      <h2 className="font-black text-lg mb-4">Solicitudes Cosplay Guild</h2>
      {!apps.length && (
        <p className="text-center text-[#999] py-10 text-sm">Sin solicitudes pendientes</p>
      )}
      {apps.map((app: any) => (
        <div key={app.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            {app.photo && (
              <img src={app.photo} className="w-12 h-12 rounded-full object-cover flex-shrink-0" alt="" />
            )}
            <div>
              <p className="font-bold">{app.artisticName ?? app.fullName}</p>
              <p className="text-[#999] text-xs">{app.country} · {app.instagram}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 bg-[#111] text-white py-3 rounded-xl font-bold text-sm"
              onClick={() => { setApproveModal(app); setTier('bronce'); }}
            >
              Aprobar
            </button>
            <button
              className="flex-1 border border-red-200 text-red-500 py-3 rounded-xl font-bold text-sm"
              onClick={() => { setRejectModal(app); setRejectReason(''); }}
            >
              Rechazar
            </button>
          </div>
        </div>
      ))}

      {/* Modal aprobar */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-0">
          <div className="bg-white rounded-t-3xl w-full p-5">
            <h3 className="font-black text-base mb-1">Aprobar cosplayer</h3>
            <p className="text-[#999] text-sm mb-4">{approveModal.fullName}</p>
            <label className="text-sm font-medium block mb-1">Tier</label>
            <select
              value={tier}
              onChange={e => setTier(e.target.value)}
              className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm mb-4"
            >
              {['bronce', 'plata', 'oro', 'diamante', 'platino'].map(t => (
                <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                className="flex-1 border border-[#e5e5e5] text-[#666] py-2.5 rounded-xl text-sm"
                onClick={() => setApproveModal(null)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 bg-[#111] text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                disabled={approveApp.isPending}
                onClick={() => approveApp.mutate({ applicationId: approveModal.id, tier, totalFollowers: 0 })}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rechazar */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-0">
          <div className="bg-white rounded-t-3xl w-full p-5">
            <h3 className="font-black text-base mb-1">Rechazar solicitud</h3>
            <p className="text-[#999] text-sm mb-4">{rejectModal.fullName}</p>
            <label className="text-sm font-medium block mb-1">Motivo</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explica el motivo del rechazo..."
              className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm mb-4 resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                className="flex-1 border border-[#e5e5e5] text-[#666] py-2.5 rounded-xl text-sm"
                onClick={() => setRejectModal(null)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                disabled={!rejectReason || rejectApp.isPending}
                onClick={() => rejectApp.mutate({ applicationId: rejectModal.id, reason: rejectReason })}
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MobileProducts ───────────────────────────────────────────────────────────

function MobileProducts() {
  const { user, isAuthenticated } = useAuth();
  const { data: productsData } = trpc.products.adminList.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const products = productsData?.items ?? productsData ?? [];

  return (
    <div>
      <h2 className="font-black text-lg mb-4">Productos</h2>
      {(Array.isArray(products) ? products : []).map((p: any) => (
        <div key={p.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex items-center gap-3">
          {p.images?.[0]?.url && (
            <img src={p.images[0].url} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt="" />
          )}
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{p.name}</p>
            <p className="text-[#e5007d] font-black">${p.price}</p>
            <p className="text-[#999] text-xs">{p.stock ?? 0} en stock</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MobileSettings ───────────────────────────────────────────────────────────

function MobileSettings() {
  return (
    <div>
      <h2 className="font-black text-lg mb-4">Configuración</h2>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-[#999] text-sm">Usa el panel de escritorio para acceder a la configuración completa.</p>
      </div>
    </div>
  );
}

// ─── AdminMobile ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'orders',   label: 'Pedidos',   icon: ShoppingBag },
  { id: 'payments', label: 'Pagos',     icon: CreditCard },
  { id: 'cosplay',  label: 'Cosplay',   icon: Sparkles },
  { id: 'products', label: 'Productos', icon: Package },
  { id: 'settings', label: 'Config',    icon: Settings },
];

export default function AdminMobile() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState('orders');

  if (loading) return <div className="min-h-screen bg-[#f8f8f8]" />;
  if (!isAuthenticated || user?.role !== 'admin') {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      {/* Header */}
      <div
        className="fixed top-0 left-0 right-0 bg-white border-b z-50 px-4 py-3"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
      >
        <h1 className="font-black text-lg">Panel Admin</h1>
      </div>

      {/* Contenido */}
      <div className="pt-20 pb-24 px-4">
        {activeSection === 'orders'   && <MobileOrders />}
        {activeSection === 'payments' && <MobilePayments />}
        {activeSection === 'cosplay'  && <MobileCosplay />}
        {activeSection === 'products' && <MobileProducts />}
        {activeSection === 'settings' && <MobileSettings />}
      </div>

      {/* Bottom navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 ${
              activeSection === item.id ? 'text-[#e5007d]' : 'text-[#999]'
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
