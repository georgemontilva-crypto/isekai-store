import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import {
  ShoppingBag, CreditCard, Sparkles, Package,
  BarChart3, Bell, ChevronRight, Check,
  TrendingUp, Gift, ExternalLink, Pencil, X,
  LogOut, Settings, Menu, ChevronDown, Eye,
  Tag, MessageCircle, Megaphone, BookOpen, Link, Users,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';

// ============ TIPOS ============
type MobileTab = 'stats' | 'orders' | 'payments' | 'cosplay' | 'products' | 'more';

// ============ HELPERS ============
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', preparing: 'Preparando', printing: 'Imprimiendo',
  post_printing: 'Post-impresión', packed: 'Empacado', shipped: 'Enviado', delivered: 'Entregado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', preparing: '#3b82f6', printing: '#8b5cf6',
  post_printing: '#06b6d4', packed: '#10b981', shipped: '#e5007d', delivered: '#22c55e',
};

const TIER_COLORS: Record<string, string> = {
  bronce: '#cd7f32', plata: '#c0c0c0', oro: '#ffd700', diamante: '#7dd3fc', platino: '#e8e8e8',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="text-xs font-bold px-2 py-1 rounded-full"
      style={{
        background: (STATUS_COLORS[status] ?? '#666') + '20',
        color: STATUS_COLORS[status] ?? '#666',
      }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ============ SECCIÓN: ESTADÍSTICAS ============
function StatsSection() {
  const { user, isAuthenticated } = useAuth();
  const { data: metrics } = trpc.admin.metrics.useQuery(undefined, { enabled: isAuthenticated && user?.role === 'admin' });
  const { data: pendingPaymentsData } = trpc.orders.adminPayments.useQuery(
    { paymentStatus: 'pending_verification' },
    { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const { data: pendingCosplay = [] } = trpc.cosplay.getApplications.useQuery(
    { status: 'pending' },
    { enabled: isAuthenticated && user?.role === 'admin' },
  );

  const pendingPaymentsCount = pendingPaymentsData?.items?.length ?? 0;

  const stats = [
    { label: 'Pedidos totales', value: metrics?.totalOrders ?? 0, icon: ShoppingBag, color: '#e5007d' },
    { label: 'Ingresos', value: `$${(metrics?.totalRevenue ?? 0).toLocaleString('es-CO')}`, icon: TrendingUp, color: '#22c55e' },
    { label: 'Pagos pendientes', value: pendingPaymentsCount, icon: CreditCard, color: '#f59e0b' },
    { label: 'Solicitudes cosplay', value: pendingCosplay.length, icon: Sparkles, color: '#8b5cf6' },
  ];

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-lg font-black text-[#111]">Resumen</h2>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-[#e5e5e5] shadow-sm">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: stat.color + '15' }}>
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-black text-[#111]">{stat.value}</p>
            <p className="text-xs text-[#999] mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#e5e5e5]">
          <p className="font-bold text-sm text-[#111]">Pedidos recientes</p>
        </div>
        {(metrics?.recentOrders ?? []).slice(0, 5).map((order: any) => (
          <div key={order.id} className="px-4 py-3 border-b border-[#f0f0f0] last:border-0 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-[#111] truncate">{order.orderNumber}</p>
              <p className="text-xs text-[#999] truncate">{order.customerName}</p>
            </div>
            <div className="text-right ml-3 flex-shrink-0">
              <p className="text-sm font-bold text-[#e5007d]">${parseFloat(order.total ?? 0).toLocaleString('es-CO')}</p>
              <StatusBadge status={order.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ SECCIÓN: PEDIDOS ============
function OrdersSection() {
  const { user, isAuthenticated } = useAuth();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: ordersData, refetch } = trpc.orders.adminList.useQuery(
    statusFilter !== 'all' ? { status: statusFilter } : undefined,
    { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const orders = ordersData?.items ?? [];
  const updateStatus = trpc.orders.updateStatus.useMutation({ onSuccess: () => refetch() });

  const ORDER_STEPS = [
    { key: 'pending',       label: 'Pendiente'   },
    { key: 'preparing',     label: 'Preparando'  },
    { key: 'printing',      label: 'Imprimiendo' },
    { key: 'post_printing', label: 'Post-imp.'   },
    { key: 'packed',        label: 'Empacado'    },
    { key: 'shipped',       label: 'Enviado'     },
    { key: 'delivered',     label: 'Entregado'   },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Filtros scroll horizontal */}
      <div className="px-4 py-3 bg-white border-b border-[#e5e5e5] overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {['all', ...ORDER_STEPS.map(s => s.key)].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === s ? 'bg-[#111] text-white' : 'bg-[#f0f0f0] text-[#666]'
              }`}>
              {s === 'all' ? 'Todos' : ORDER_STEPS.find(o => o.key === s)?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {orders.length === 0 && (
          <div className="text-center py-16 text-[#999] text-sm">No hay pedidos</div>
        )}
        {orders.map((order: any) => (
          <div key={order.id} className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden shadow-sm">

            {/* Header — sin truncar, altura automática */}
            <button
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              className="w-full px-4 py-4 flex items-start justify-between text-left gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-bold text-sm text-[#111]">{order.orderNumber}</p>
                  {order.hasSecretGift && <Gift size={12} className="text-orange-500" />}
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-xs text-[#999]">{order.customerName}</p>
                <p className="text-xs text-[#999]">{order.customerEmail}</p>
                {order.items?.length > 0 && (
                  <p className="text-xs text-[#666] mt-1">
                    {order.items.map((i: any) => `${i.productName} ×${i.quantity}`).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-black text-[#111]">${parseFloat(order.total ?? 0).toLocaleString('es-CO')}</p>
                <ChevronDown size={16} className={`text-[#999] mt-1 ml-auto transition-transform ${expanded === order.id ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Detalle expandido */}
            {expanded === order.id && (
              <div className="border-t border-[#f0f0f0] px-4 py-4">

                {/* Datos del cliente */}
                <div className="flex flex-col gap-1.5 text-sm mb-4">
                  <p className="text-[#999] text-xs font-semibold uppercase tracking-wider mb-1">Datos del cliente</p>
                  <p><span className="text-[#999]">Teléfono:</span> <span className="text-[#111]">{order.customerPhone}</span></p>
                  {order.notes && <p><span className="text-[#999]">Notas:</span> <span className="text-[#111]">{order.notes}</span></p>}
                  {order.hasSecretGift && (
                    <p className="text-orange-500 font-semibold flex items-center gap-1 mt-1">
                      <Gift size={14} /> Incluir obsequio secreto
                    </p>
                  )}
                </div>

                {/* Productos del pedido */}
                {order.items?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[#999] text-xs font-semibold uppercase tracking-wider mb-2">Productos</p>
                    <div className="flex flex-col gap-2">
                      {order.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-[#f8f8f8] rounded-xl p-2">
                          <p className="text-sm text-[#111]">{item.productName}</p>
                          <div className="text-right">
                            <p className="text-xs text-[#999]">×{item.quantity}</p>
                            <p className="text-xs font-bold text-[#e5007d]">${parseFloat(item.price ?? 0).toLocaleString('es-CO')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cambiar estado — todos los pasos disponibles para revertir */}
                <p className="text-[#999] text-xs font-semibold uppercase tracking-wider mb-2">Estado del pedido</p>
                <div className="grid grid-cols-2 gap-2">
                  {ORDER_STEPS.map(step => (
                    <button key={step.key}
                      onClick={() => updateStatus.mutate({ id: order.id, status: step.key as any })}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        order.status === step.key ? 'text-white shadow-sm' : 'bg-[#f8f8f8] text-[#666] border border-[#e5e5e5]'
                      }`}
                      style={order.status === step.key ? { background: STATUS_COLORS[step.key] } : {}}>
                      {order.status === step.key ? '✓ ' : ''}{step.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ SECCIÓN: PAGOS ============
function PaymentsSection() {
  const { user, isAuthenticated } = useAuth();
  const { data: paymentsData, refetch } = trpc.orders.adminPayments.useQuery(
    { paymentStatus: 'pending_verification' },
    { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const orders = paymentsData?.items ?? [];
  const verifyPayment = trpc.orders.verifyPayment.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="p-4 flex flex-col gap-3">
      {orders.length === 0 && (
        <div className="text-center py-16">
          <Check size={40} className="text-green-400 mx-auto mb-3" />
          <p className="text-[#999] text-sm">No hay pagos pendientes</p>
        </div>
      )}
      {orders.map((order: any) => (
        <div key={order.id} className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden shadow-sm">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[#111]">{order.orderNumber}</p>
                <p className="text-xs text-[#999] truncate">{order.customerName}</p>
                <p className="text-xs text-[#999] truncate">{order.customerEmail}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-600 font-bold border border-yellow-200 flex-shrink-0 ml-2">
                {order.paymentStatus}
              </span>
            </div>

            <p className="text-3xl font-black text-[#111] mb-3">
              ${parseFloat(order.total ?? 0).toLocaleString('es-CO')} COP
            </p>

            {order.receiptUrl && (
              <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-blue-50 text-blue-600 py-3 rounded-xl text-sm font-semibold mb-3 border border-blue-100">
                <ExternalLink size={14} />
                Ver comprobante
              </a>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => verifyPayment.mutate({ orderId: order.id, approved: true })}
                disabled={verifyPayment.isPending}
                className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
              >
                ✓ Aprobar
              </button>
              <button
                onClick={() => verifyPayment.mutate({ orderId: order.id, approved: false })}
                disabled={verifyPayment.isPending}
                className="flex-1 bg-red-50 text-red-500 border border-red-200 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
              >
                ✗ Rechazar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ SECCIÓN: COSPLAY ============
type CosplaySubTab = 'applications' | 'cosplayers' | 'activities';

function CosplaySection() {
  const { user, isAuthenticated } = useAuth();
  const [subTab, setSubTab] = useState<CosplaySubTab>('applications');
  const { data: applications = [], refetch: refetchApps } = trpc.cosplay.getApplications.useQuery(
    { status: 'pending' },
    { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const { data: cosplayers = [], refetch: refetchCosplayers } = trpc.cosplay.getAllCosplayers.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const { data: activities = [] } = trpc.cosplay.getAllActivities.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const [viewApplication, setViewApplication] = useState<any>(null);
  const [approveModal, setApproveModal] = useState<any>(null);
  const [approveForm, setApproveForm] = useState({ totalFollowers: 0, tier: 'bronce' });
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  const TIER_BY_FOLLOWERS = (f: number) => {
    if (f >= 300000) return 'platino';
    if (f >= 50000) return 'diamante';
    if (f >= 6000) return 'oro';
    if (f >= 3000) return 'plata';
    return 'bronce';
  };

  const approveApp = trpc.cosplay.approveApplication.useMutation({
    onSuccess: () => { setApproveModal(null); refetchApps(); refetchCosplayers(); },
  });
  const rejectApp = trpc.cosplay.rejectApplication.useMutation({
    onSuccess: () => { setRejectModal(null); refetchApps(); },
  });
  const suspendCosplayer = trpc.cosplay.suspendCosplayer.useMutation({
    onSuccess: () => refetchCosplayers(),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="bg-white border-b border-[#e5e5e5] px-4 py-2 flex gap-2 overflow-x-auto">
        <button onClick={() => setSubTab('applications')}
          className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${subTab === 'applications' ? 'bg-[#111] text-white' : 'bg-[#f0f0f0] text-[#666]'}`}>
          Solicitudes {(applications as any[]).length > 0 && `(${(applications as any[]).length})`}
        </button>
        <button onClick={() => setSubTab('cosplayers')}
          className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${subTab === 'cosplayers' ? 'bg-[#111] text-white' : 'bg-[#f0f0f0] text-[#666]'}`}>
          Activos ({(cosplayers as any[]).length})
        </button>
        <button onClick={() => setSubTab('activities')}
          className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${subTab === 'activities' ? 'bg-[#111] text-white' : 'bg-[#f0f0f0] text-[#666]'}`}>
          Actividades
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

        {/* Solicitudes */}
        {subTab === 'applications' && (
          <>
            {(applications as any[]).length === 0 && (
              <div className="text-center py-16 text-[#999] text-sm">No hay solicitudes pendientes</div>
            )}
            {(applications as any[]).map((app: any) => (
              <div key={app.id} className="bg-white rounded-2xl border border-[#e5e5e5] shadow-sm">
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {app.photo && (
                      <img src={app.photo} className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-[#e5e5e5]" alt="" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-[#111]">{app.artisticName ?? app.fullName}</p>
                      <p className="text-xs text-[#999]">{app.country} · {app.experience} años exp.</p>
                      <p className="text-xs text-[#999]">{app.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {['instagram', 'tiktok', 'youtube', 'facebook', 'twitter'].filter(r => app[r]).map(r => (
                      <a key={r} href={app[r]} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#e5007d] underline capitalize">{r}</a>
                    ))}
                  </div>

                  <button onClick={() => setViewApplication(app)}
                    className="w-full border border-[#e5e5e5] text-[#666] py-2.5 rounded-xl text-xs font-semibold mb-2">
                    Ver solicitud completa
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setApproveModal(app); setApproveForm({ totalFollowers: 0, tier: 'bronce' }); }}
                      className="flex-1 bg-[#111] text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                    >
                      ✓ Aprobar
                    </button>
                    <button
                      onClick={() => { setRejectModal(app); setRejectReason(''); }}
                      className="flex-1 border border-red-200 text-red-500 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                    >
                      ✗ Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Cosplayers activos */}
        {subTab === 'cosplayers' && (cosplayers as any[]).map((cp: any) => (
          <div key={cp.id} className="bg-white rounded-2xl border border-[#e5e5e5] shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              {cp.photo && <img src={cp.photo} className="w-12 h-12 rounded-full object-cover flex-shrink-0" alt="" />}
              <div className="min-w-0 flex-1">
                <p className="font-black text-[#111]">{cp.artisticName}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: (TIER_COLORS[cp.tier] ?? '#888') + '20', color: TIER_COLORS[cp.tier] ?? '#888' }}>
                  {(cp.tier ?? 'bronce').toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-[#999] mb-3">
              <span>🎫 {cp.ticketBalance} tickets</span>
              <span>💵 ${parseFloat(cp.cashBalance ?? '0').toLocaleString('es-CO')} COP</span>
            </div>
            {cp.isActive && (
              <button
                onClick={() => { if (confirm(`¿Suspender a ${cp.artisticName}?`)) suspendCosplayer.mutate({ cosplayerId: cp.id }); }}
                className="w-full border border-red-200 text-red-500 py-2.5 rounded-xl text-xs font-bold"
              >
                Suspender
              </button>
            )}
          </div>
        ))}

        {/* Actividades */}
        {subTab === 'activities' && (
          <>
            {(activities as any[]).length === 0 && (
              <div className="text-center py-16 text-[#999] text-sm">No hay actividades</div>
            )}
            {(activities as any[]).map((act: any) => (
              <div key={act.id} className="bg-white rounded-2xl border border-[#e5e5e5] shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-black text-[#111] text-sm">{act.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${act.active ? 'bg-green-100 text-green-700' : 'bg-[#f0f0f0] text-[#999]'}`}>
                    {act.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                {act.description && (
                  <p className="text-xs text-[#666] leading-relaxed mb-2">{act.description}</p>
                )}
                <div className="flex gap-3 text-xs text-[#999]">
                  <span>🎫 {act.basePoints} pts base</span>
                  {act.deadline && <span>⏰ {new Date(act.deadline).toLocaleDateString('es-CO')}</span>}
                  <span className="capitalize">{act.type}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Modal ver solicitud completa */}
      {viewApplication && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
            <div className="sticky top-0 z-10 bg-white border-b border-[#f0f0f0] px-4 py-4 flex items-center justify-between"
              style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(255,255,255,0.98)' }}>
              <h3 className="font-black text-[#111]">{viewApplication.artisticName ?? viewApplication.fullName}</h3>
              <button onClick={() => setViewApplication(null)}>
                <X size={20} className="text-[#999]" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {viewApplication.bannerImage && (
                <img src={viewApplication.bannerImage} className="w-full h-32 object-cover rounded-2xl" alt="" />
              )}
              {viewApplication.photo && (
                <img src={viewApplication.photo} className="w-20 h-20 rounded-full object-cover border-2 border-[#e5e5e5] -mt-10 ml-4" alt="" />
              )}

              <div className="bg-[#f8f8f8] rounded-2xl p-4 flex flex-col gap-2 text-sm">
                <p className="font-bold text-[#111] text-xs uppercase tracking-wider mb-1">Datos personales</p>
                <p><span className="text-[#999]">Nombre:</span> {viewApplication.fullName} {viewApplication.lastName}</p>
                <p><span className="text-[#999]">Edad:</span> {viewApplication.age} años</p>
                <p><span className="text-[#999]">Ciudad:</span> {viewApplication.city}, {viewApplication.country}</p>
                <p><span className="text-[#999]">Dirección:</span> {viewApplication.address}</p>
                <p><span className="text-[#999]">Teléfono:</span> {viewApplication.phone}</p>
                <p><span className="text-[#999]">Email:</span> {viewApplication.email}</p>
                <p><span className="text-[#999]">Experiencia:</span> {viewApplication.experience} años</p>
              </div>

              <div className="bg-[#f8f8f8] rounded-2xl p-4">
                <p className="font-bold text-[#111] text-xs uppercase tracking-wider mb-3">Redes sociales</p>
                <div className="flex flex-col gap-2">
                  {['instagram', 'tiktok', 'youtube', 'facebook', 'twitter'].filter(r => viewApplication[r]).map(r => (
                    <a key={r} href={viewApplication[r]} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between text-sm bg-white rounded-xl px-3 py-2 border border-[#e5e5e5]">
                      <span className="capitalize font-medium text-[#111]">{r}</span>
                      <span className="text-[#e5007d] text-xs ml-2 max-w-[200px] truncate">{viewApplication[r]}</span>
                    </a>
                  ))}
                </div>
              </div>

              {viewApplication.bio && (
                <div className="bg-[#f8f8f8] rounded-2xl p-4">
                  <p className="font-bold text-[#111] text-xs uppercase tracking-wider mb-2">Biografía</p>
                  <p className="text-sm text-[#666] leading-relaxed">{viewApplication.bio}</p>
                </div>
              )}

              <div className="bg-[#f8f8f8] rounded-2xl p-4">
                <p className="font-bold text-[#111] text-xs uppercase tracking-wider mb-2">¿Por qué quiere ser representante?</p>
                <p className="text-sm text-[#666] leading-relaxed">{viewApplication.whyIsekai}</p>
              </div>

              {viewApplication.gallery?.length > 0 && (
                <div>
                  <p className="font-bold text-[#111] text-xs uppercase tracking-wider mb-2">Galería</p>
                  <div className="grid grid-cols-3 gap-2">
                    {viewApplication.gallery.map((img: string, i: number) => (
                      <img key={i} src={img} className="aspect-square object-cover rounded-xl" alt="" />
                    ))}
                  </div>
                </div>
              )}

              {viewApplication.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setApproveModal(viewApplication); setViewApplication(null); setApproveForm({ totalFollowers: 0, tier: 'bronce' }); }}
                    className="flex-1 bg-[#111] text-white py-3 rounded-xl font-bold text-sm">
                    ✓ Aprobar
                  </button>
                  <button onClick={() => { setRejectModal(viewApplication); setViewApplication(null); setRejectReason(''); }}
                    className="flex-1 border border-red-200 text-red-500 py-3 rounded-xl font-bold text-sm">
                    ✗ Rechazar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal aprobar */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
            <div className="w-10 h-1 bg-[#e5e5e5] rounded-full mx-auto mb-4" />
            <h3 className="font-black text-lg mb-1">Aprobar a {approveModal.artisticName}</h3>
            <p className="text-[#999] text-sm mb-4">{approveModal.email}</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Total de seguidores</label>
                <input type="number" value={approveForm.totalFollowers}
                  onChange={e => {
                    const f = parseInt(e.target.value) || 0;
                    setApproveForm({ totalFollowers: f, tier: TIER_BY_FOLLOWERS(f) });
                  }}
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]"
                  placeholder="Ej: 15000" />
              </div>
              <div className="bg-[#f8f8f8] rounded-xl p-4 border border-[#e5e5e5]">
                <p className="text-xs text-[#999] mb-1">Tier asignado automáticamente:</p>
                <p className="text-xl font-black" style={{ color: TIER_COLORS[approveForm.tier] }}>
                  {approveForm.tier.toUpperCase()}
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setApproveModal(null)}
                  className="flex-1 border border-[#e5e5e5] text-[#666] py-3 rounded-xl text-sm">
                  Cancelar
                </button>
                <button
                  onClick={() => approveApp.mutate({
                    applicationId: approveModal.id,
                    tier: approveForm.tier as any,
                    totalFollowers: approveForm.totalFollowers,
                  })}
                  disabled={approveApp.isPending}
                  className="flex-1 bg-[#111] text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">
                  {approveApp.isPending ? 'Aprobando...' : 'Confirmar aprobación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal rechazar */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
            <div className="w-10 h-1 bg-[#e5e5e5] rounded-full mx-auto mb-4" />
            <h3 className="font-black text-lg mb-4">Razón del rechazo</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              rows={3} placeholder="Explica por qué se rechaza la solicitud..."
              className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111] resize-none mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 border border-[#e5e5e5] text-[#666] py-3 rounded-xl text-sm">
                Cancelar
              </button>
              <button
                onClick={() => rejectApp.mutate({ applicationId: rejectModal.id, reason: rejectReason })}
                disabled={!rejectReason || rejectApp.isPending}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SECCIÓN: PRODUCTOS ============
function ProductsSection() {
  const { user, isAuthenticated } = useAuth();
  const { data: productsData } = trpc.products.adminList.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const products = productsData?.items ?? [];

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-black text-[#111]">Productos ({products.length})</h2>
        <a href="/admin?tab=products&action=new">
          <button className="bg-[#e5007d] text-white px-4 py-2 rounded-xl text-xs font-bold">
            + Nuevo
          </button>
        </a>
      </div>
      {(products as any[]).map((p: any) => (
        <div key={p.id} className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-3">
            {p.images?.[0]?.url && (
              <img src={p.images[0].url} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt="" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-[#111] truncate">{p.name}</p>
              <p className="text-[#e5007d] font-black text-sm">${parseFloat(p.price ?? 0).toLocaleString('es-CO')}</p>
              <span className={`text-xs font-semibold ${p.status === 'published' ? 'text-green-500' : 'text-[#999]'}`}>
                {p.status === 'published' ? 'Publicado' : 'Borrador'}
              </span>
            </div>
            <a href={`/admin?tab=products&edit=${p.id}`}
              className="w-9 h-9 bg-[#f8f8f8] border border-[#e5e5e5] rounded-xl flex items-center justify-center flex-shrink-0">
              <Pencil size={15} className="text-[#666]" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ SECCIÓN: MÁS ============
function MoreSection({ onLogout }: { onLogout: () => void }) {
  const sections = [
    {
      title: 'Gestión',
      items: [
        { label: 'Categorías',       href: '/admin#categories', icon: Tag },
        { label: 'FAQ',              href: '/admin#faq',        icon: MessageCircle },
        { label: 'Popups',           href: '/admin#popups',     icon: Megaphone },
        { label: 'Blog',             href: '/admin#blog',       icon: BookOpen },
        { label: 'LinkBio',          href: '/admin#linkbio',    icon: Link },
        { label: 'Usuarios',         href: '/admin#users',      icon: Users },
      ],
    },
    {
      title: 'Configuración',
      items: [
        { label: 'Ajustes generales', href: '/admin#settings', icon: Settings },
        { label: 'Ver tienda',        href: '/',               icon: Eye },
      ],
    },
  ];

  return (
    <div className="p-4 flex flex-col gap-4 pb-8">
      {sections.map((section, si) => (
        <div key={si}>
          <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">{section.title}</p>
          <div className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden shadow-sm">
            {section.items.map((item, i) => (
              <a key={i} href={item.href}
                className="flex items-center justify-between px-4 py-3.5 border-b border-[#f0f0f0] last:border-0 active:bg-[#f8f8f8]">
                <div className="flex items-center gap-3">
                  <item.icon size={18} className="text-[#666]" />
                  <span className="text-sm font-medium text-[#111]">{item.label}</span>
                </div>
                <ChevronRight size={16} className="text-[#ccc]" />
              </a>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden shadow-sm">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-4 text-red-500 active:bg-red-50">
          <LogOut size={18} />
          <span className="text-sm font-medium">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}

// ============ COMPONENTE PRINCIPAL ============
export default function AdminMobile() {
  const [activeTab, setActiveTab] = useState<MobileTab>('stats');
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: pendingPaymentsData } = trpc.orders.adminPayments.useQuery(
    { paymentStatus: 'pending_verification' },
    { enabled: isAuthenticated && user?.role === 'admin', refetchInterval: 30000 },
  );
  const { data: pendingCosplay = [] } = trpc.cosplay.getApplications.useQuery(
    { status: 'pending' },
    { enabled: isAuthenticated && user?.role === 'admin', refetchInterval: 30000 },
  );
  const { data: notifications = [], refetch: refetchNotifications } = trpc.notifications.getAll.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
    refetchInterval: 15000,
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const markRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => refetchNotifications(),
  });

  if (loading) return <div className="min-h-screen bg-[#f8f8f8]" />;
  if (!isAuthenticated || user?.role !== 'admin') {
    navigate('/');
    return null;
  }

  const pendingPaymentsCount = pendingPaymentsData?.items?.length ?? 0;
  const unreadCount = (notifications as any[]).filter((n: any) => !n.read).length;

  const TABS = [
    { id: 'stats' as MobileTab,    label: 'Inicio',    icon: BarChart3 },
    { id: 'orders' as MobileTab,   label: 'Pedidos',   icon: ShoppingBag },
    { id: 'payments' as MobileTab, label: 'Pagos',     icon: CreditCard,  badge: pendingPaymentsCount },
    { id: 'cosplay' as MobileTab,  label: 'Cosplay',   icon: Sparkles,    badge: (pendingCosplay as any[]).length },
    { id: 'products' as MobileTab, label: 'Productos', icon: Package },
    { id: 'more' as MobileTab,     label: 'Más',       icon: Menu },
  ];

  const SECTION_TITLES: Record<MobileTab, string> = {
    stats: 'Resumen', orders: 'Pedidos', payments: 'Pagos pendientes',
    cosplay: 'Cosplay Guild', products: 'Productos', more: 'Más',
  };

  return (
    <div className="flex flex-col bg-[#f8f8f8]"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Header */}
      <div className="bg-white border-b border-[#e5e5e5] px-4 flex items-center justify-between flex-shrink-0"
        style={{ height: '52px' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#0d0d0d] rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-black">IW</span>
          </div>
          <span className="font-black text-[#111] text-sm">{SECTION_TITLES[activeTab]}</span>
        </div>

        <button
          onClick={() => setShowNotifications(true)}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-[#f8f8f8] border border-[#e5e5e5]"
        >
          <Bell size={18} className="text-[#111]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'stats'    && <StatsSection />}
        {activeTab === 'orders'   && <OrdersSection />}
        {activeTab === 'payments' && <PaymentsSection />}
        {activeTab === 'cosplay'  && <CosplaySection />}
        {activeTab === 'products' && <ProductsSection />}
        {activeTab === 'more'     && <MoreSection onLogout={logout} />}
      </div>

      {/* Modal notificaciones */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[70vh] overflow-y-auto"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            <div className="sticky top-0 bg-white border-b border-[#f0f0f0] px-4 py-4 flex items-center justify-between">
              <h3 className="font-black text-[#111]">Notificaciones</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => markRead.mutate()}
                  className="text-xs text-[#e5007d] font-semibold">
                  Marcar todas leídas
                </button>
                <button onClick={() => setShowNotifications(false)}>
                  <X size={20} className="text-[#999]" />
                </button>
              </div>
            </div>
            <div className="flex flex-col divide-y divide-[#f0f0f0]">
              {(notifications as any[]).length === 0 && (
                <p className="text-center text-[#999] text-sm py-8">Sin notificaciones</p>
              )}
              {(notifications as any[]).map((n: any) => (
                <div key={n.id} className={`px-4 py-3 ${!n.read ? 'bg-[#fff8fc]' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-[#e5007d]' : 'bg-[#e5e5e5]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111]">{n.title}</p>
                      <p className="text-xs text-[#999] mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-[#ccc] mt-1">
                        {new Date(n.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <div className="bg-white border-t border-[#e5e5e5] flex-shrink-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {TABS.map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-2 relative transition-colors"
            >
              <div className="relative">
                <tab.icon size={22} className={activeTab === tab.id ? 'text-[#e5007d]' : 'text-[#999]'} />
                {(tab.badge ?? 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 font-semibold ${activeTab === tab.id ? 'text-[#e5007d]' : 'text-[#999]'}`}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#e5007d] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
