import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import {
  ShoppingBag, CreditCard, Sparkles, Package,
  BarChart3, Bell, ChevronRight, Check, Trash2, FileText,
  TrendingUp, Gift, ExternalLink, Pencil, X, Plus,
  LogOut, Settings, Menu, ChevronDown, Eye, ArrowLeft,
  Tag, MessageCircle, Megaphone, BookOpen, Link, Users, Mail, Ticket, DollarSign, FolderOpen,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import PullToRefresh from '@/components/admin/PullToRefresh';
import QuotesSection from '@/components/admin/QuotesSection';

// ============ TIPOS ============
type MobileTab = 'stats' | 'orders' | 'payments' | 'cosplay' | 'products' | 'more'
               | 'categories' | 'faq' | 'users' | 'blog' | 'popups' | 'subscribers' | 'comments' | 'quotes' | 'tasa' | 'finanzas' | 'newOrder';

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

const isExpired = (deadline: string | null) => {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
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
  // La tienda opera en dólares: los totales ya vienen en USD, no se convierten.
  const revenueUSD = metrics?.totalRevenue ?? 0;

  const stats = [
    { label: 'Pedidos totales', value: metrics?.totalOrders ?? 0, icon: ShoppingBag, color: '#e5007d' },
    { label: 'Ingresos', value: `$${revenueUSD.toFixed(2)} USD`, icon: TrendingUp, color: '#22c55e' },
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
              <p className="text-sm font-bold text-[#e5007d]">${parseFloat(order.total ?? 0).toFixed(2)} USD</p>
              <StatusBadge status={order.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ SECCIÓN: PEDIDOS ============
function OrdersSection({ onCreateOrder, jumpTo, onJumpDone }: {
  onCreateOrder: () => void;
  jumpTo?: string | null;
  onJumpDone?: () => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: ordersData, refetch } = trpc.orders.adminList.useQuery(
    statusFilter !== 'all' ? { status: statusFilter } : undefined,
    { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const todosLosPedidos = ordersData?.items ?? [];
  /** Los kits de cosplayer (IW-KIT) se listan aparte de las ventas reales */
  const esKit = (o: any) => String(o.orderNumber ?? '').startsWith('IW-KIT-');
  const [tipoLista, setTipoLista] = useState<'ventas' | 'kits'>('ventas');
  const orders = todosLosPedidos.filter((o: any) => tipoLista === 'kits' ? esKit(o) : !esKit(o));
  const nKits = todosLosPedidos.filter(esKit).length;
  const nVentas = todosLosPedidos.length - nKits;

  const utils = trpc.useUtils();
  const borrarPedido = trpc.orders.delete.useMutation({
    onSuccess: () => { refetch(); utils.finance.transactions.invalidate(); utils.finance.summary.invalidate(); toast.success('Pedido eliminado'); },
    onError: (e) => toast.error(e.message),
  });

  // Llega desde una notificación: despliega ese pedido concreto
  useEffect(() => {
    if (!jumpTo || orders.length === 0) return;
    const encontrado = (orders as any[]).find((o: any) => o.orderNumber === jumpTo);
    if (encontrado) setExpanded(encontrado.id);
    setStatusFilter('all');
    onJumpDone?.();
  }, [jumpTo, orders.length]);
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
        <button onClick={onCreateOrder}
          className="w-full flex items-center justify-center gap-2 bg-[#e5007d] text-white rounded-2xl font-bold text-sm mb-1 transition-transform active:scale-[0.98]"
          style={{ minHeight: 52, WebkitTapHighlightColor: 'transparent' }}>
          <Plus size={16} /> Registrar pedido ya pagado
        </button>
        {orders.length === 0 && (
          <div className="text-center py-16 text-[#999] text-sm">No hay pedidos</div>
        )}
        {/* Ventas vs kits */}
        <div className="flex gap-2">
          {([['ventas', `Ventas (${nVentas})`], ['kits', `Kits (${nKits})`]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTipoLista(id)}
              className={`flex-1 rounded-xl text-xs font-bold transition-colors ${
                tipoLista === id ? 'bg-[#e5007d] text-white' : 'bg-[var(--iw-surface)] border border-[var(--iw-border)] text-[var(--iw-text-muted)]'
              }`}
              style={{ minHeight: 44, WebkitTapHighlightColor: 'transparent' }}
            >
              {label}
            </button>
          ))}
        </div>

        {orders.map((order: any) => (
          <div key={order.id} className="bg-white rounded-2xl border border-[#e5e5e5] shadow-sm">

            <button
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              className="w-full text-left"
              style={{ padding: '16px', minHeight: '80px' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="font-bold text-sm text-[#111]">{order.orderNumber}</p>
                    {order.hasSecretGift && <Gift size={12} className="text-orange-500" />}
                  </div>
                  <p className="text-xs text-[#999] mb-0.5">{order.customerName}</p>
                  <p className="text-xs text-[#999] mb-2">{order.customerEmail}</p>
                  {order.items?.length > 0 && (
                    <div className="mb-2">
                      {order.items.map((item: any, i: number) => (
                        <p key={i} className="text-xs text-[#555] font-medium leading-relaxed">
                          • {item.productName} ×{item.quantity}
                        </p>
                      ))}
                    </div>
                  )}
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-black text-[#111] mb-2">
                    ${parseFloat(order.total ?? 0).toFixed(2)} USD
                  </p>
                  <ChevronDown
                    size={16}
                    className={`text-[#999] ml-auto transition-transform duration-200 ${expanded === order.id ? 'rotate-180' : ''}`}
                  />
                </div>
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
                            <p className="text-xs font-bold text-[#e5007d]">${parseFloat(item.price ?? 0).toFixed(2)} USD</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cambiar estado */}
                <p className="text-[#999] text-xs font-semibold uppercase tracking-wider mb-2">Estado del pedido</p>
                <div className="grid grid-cols-2 gap-2">
                  {ORDER_STEPS.map((step, stepIndex) => {
                    const currentIndex = ORDER_STEPS.findIndex(s => s.key === order.status);
                    const isCurrentStatus = order.status === step.key;
                    const isPast = stepIndex < currentIndex;
                    return (
                      <button
                        key={step.key}
                        onClick={() => !isPast && !isCurrentStatus && updateStatus.mutate({ id: order.id, status: step.key as any })}
                        disabled={isPast || isCurrentStatus}
                        className={`py-3 rounded-xl text-xs font-bold transition-all ${
                          isCurrentStatus
                            ? 'text-white shadow-sm'
                            : isPast
                              ? 'bg-[#f0f0f0] text-[#ccc] cursor-not-allowed'
                              : 'bg-[#f8f8f8] text-[#666] border border-[#e5e5e5] active:scale-95'
                        }`}
                        style={isCurrentStatus ? { background: STATUS_COLORS[step.key] } : {}}
                      >
                        {step.label}
                      </button>
                    );
                  })}
                </div>

                {/* Eliminar el pedido: para duplicados o pruebas. Devuelve el
                    stock si el pedido no estaba cancelado. */}
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar el pedido ${order.orderNumber}? Esta acción no se puede deshacer.`)) {
                      borrarPedido.mutate({ id: order.id });
                    }
                  }}
                  disabled={borrarPedido.isPending}
                  className="mt-4 w-full rounded-xl border border-red-500/40 text-xs font-bold text-red-500 active:scale-95 transition-transform disabled:opacity-50"
                  style={{ minHeight: 44 }}
                >
                  Eliminar pedido
                </button>
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
              ${parseFloat(order.total ?? 0).toFixed(2)} USD
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
                Aprobar
              </button>
              <button
                onClick={() => verifyPayment.mutate({ orderId: order.id, approved: false })}
                disabled={verifyPayment.isPending}
                className="flex-1 bg-red-50 text-red-500 border border-red-200 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ SECCIÓN: COSPLAY ============
type CosplaySubTab = 'applications' | 'cosplayers' | 'activities' | 'evaluations';

function CosplaySection({ onModalChange, jumpTo, onJumpDone }: {
  onModalChange: (open: boolean) => void;
  jumpTo?: string | null;
  onJumpDone?: () => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const [subTab, setSubTab] = useState<CosplaySubTab>('applications');

  // Llega desde una notificación: abre la sub-pestaña que corresponde
  useEffect(() => {
    if (!jumpTo) return;
    setSubTab(jumpTo as CosplaySubTab);
    onJumpDone?.();
  }, [jumpTo]);
  const { data: applications = [], refetch: refetchApps } = trpc.cosplay.getApplications.useQuery(
    { status: 'pending' },
    { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const { data: cosplayers = [], refetch: refetchCosplayers } = trpc.cosplay.getAllCosplayers.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const { data: activitiesData = [], refetch: refetchActivities } = trpc.cosplay.getAllActivities.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const { data: submissionsData = [], refetch: refetchSubmissions } = trpc.cosplay.getAllSubmissions.useQuery(
    {},
    { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const [evalModal, setEvalModal] = useState<any>(null);
  const [evalPoints, setEvalPoints] = useState(100);
  const evaluateSub = trpc.cosplay.evaluateSubmission.useMutation({
    onSuccess: () => { setEvalModal(null); refetchSubmissions(); toast.success('Evaluación guardada'); },
  });
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);
  const [descAbierta, setDescAbierta] = useState<number | null>(null);
  const [showNewActivity, setShowNewActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({ title: '', description: '', basePoints: 100, type: 'post', deadline: '', conFecha: false, phases: 1 });

  const createActivity = trpc.cosplay.createActivity.useMutation({
    onSuccess: () => { setShowNewActivity(false); setActivityForm({ title: '', description: '', basePoints: 100, type: 'post', deadline: '', conFecha: false, phases: 1 }); refetchActivities(); },
  });
  const deleteActivity = trpc.cosplay.deleteActivity.useMutation({ onSuccess: () => refetchActivities() });
  const updateActivityMut = trpc.cosplay.updateActivity.useMutation({ onSuccess: () => refetchActivities() });
  const [viewApplication, setViewApplication] = useState<any>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<any>(null);
  const [approveForm, setApproveForm] = useState({ totalFollowers: 0, tier: 'bronce' });
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [grantTicketsModal, setGrantTicketsModal] = useState<any>(null);
  const [grantForm, setGrantForm] = useState({ basePoints: 100, reason: '' });
  const [viewCosplayer, setViewCosplayer] = useState<any>(null);

  const MULTIPLIERS: Record<string, number> = { bronce: 1, plata: 1.5, oro: 2, diamante: 3, platino: 5 };

  const grantTickets = trpc.cosplay.grantTickets.useMutation({
    onSuccess: () => { setGrantTicketsModal(null); refetchCosplayers(); },
  });

  useEffect(() => {
    onModalChange(!!(viewApplication || lightboxImg || approveModal || rejectModal || grantTicketsModal || showNewActivity || viewCosplayer || evalModal));
  }, [viewApplication, lightboxImg, approveModal, rejectModal, grantTicketsModal, showNewActivity, viewCosplayer, evalModal]);

  const TIER_BY_FOLLOWERS = (f: number) => {
    if (f >= 300000) return 'platino';
    if (f >= 50000) return 'diamante';
    if (f >= 6000) return 'oro';
    if (f >= 3000) return 'plata';
    return 'bronce';
  };

  // Visibilidad del perfil interno del admin en el directorio público
  const { data: miPerfil, refetch: refetchMiPerfil } = trpc.cosplay.myCosplayerVisibility.useQuery(
    undefined, { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const cambiarVisibilidad = trpc.cosplay.setMyCosplayerVisibility.useMutation({
    onSuccess: (d) => {
      refetchMiPerfil();
      refetchCosplayers();
      toast.success(d.visible ? 'Tu perfil ya se ve en el directorio' : 'Tu perfil quedó oculto');
    },
    onError: () => toast.error('No se pudo cambiar'),
  });

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
        <button onClick={() => setSubTab('evaluations')}
          className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${subTab === 'evaluations' ? 'bg-[#111] text-white' : 'bg-[#f0f0f0] text-[#666]'}`}>
          Evaluaciones {(submissionsData as any[]).filter((s: any) => s.status === 'pending').length > 0 && `(${(submissionsData as any[]).filter((s: any) => s.status === 'pending').length})`}
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
                      Aprobar
                    </button>
                    <button
                      onClick={() => { setRejectModal(app); setRejectReason(''); }}
                      className="flex-1 border border-red-200 text-red-500 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Cosplayers activos */}
        {subTab === 'cosplayers' && miPerfil?.exists && (
          <button
            onClick={() => cambiarVisibilidad.mutate({ visible: !miPerfil.visible })}
            disabled={cambiarVisibilidad.isPending}
            className={`w-full flex items-center gap-3 rounded-2xl border px-4 text-left transition-colors ${
              miPerfil.visible
                ? 'border-[#e5007d] bg-[#e5007d]/10'
                : 'border-[var(--iw-border)] bg-[var(--iw-surface)]'
            }`}
            style={{ minHeight: 56, WebkitTapHighlightColor: 'transparent' }}
          >
            <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${miPerfil.visible ? 'bg-[#e5007d]' : 'bg-[#999]'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${miPerfil.visible ? 'left-[1.15rem]' : 'left-0.5'}`} />
            </span>
            <span className="min-w-0">
              <span className={`block text-sm font-bold ${miPerfil.visible ? 'text-[#e5007d]' : 'text-[var(--iw-text)]'}`}>
                Mi perfil en el directorio
              </span>
              <span className="block text-xs text-[var(--iw-text-muted)]">
                {miPerfil.visible ? 'Tu tarjeta de admin se está mostrando' : 'Oculto del directorio público'}
              </span>
            </span>
          </button>
        )}

        {subTab === 'cosplayers' && (cosplayers as any[]).map((cp: any) => (
          <button
            key={cp.id}
            onClick={() => setViewCosplayer(cp)}
            className="bg-white rounded-2xl border border-[#e5e5e5] shadow-sm p-4 w-full text-left"
          >
            <div className="flex items-center gap-3 mb-3">
              {cp.photo && <img src={cp.photo} className="w-12 h-12 rounded-full object-cover flex-shrink-0" alt="" />}
              <div className="min-w-0 flex-1">
                <p className="font-black text-[#111] truncate">{cp.artisticName}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: (TIER_COLORS[cp.tier] ?? '#888') + '20', color: TIER_COLORS[cp.tier] ?? '#888' }}>
                  {(cp.tier ?? 'bronce').toUpperCase()}
                </span>
              </div>
              <ChevronRight size={16} className="text-[#ccc] flex-shrink-0" />
            </div>
            <div className="flex gap-3 text-xs text-[#999]">
              <span className="inline-flex items-center gap-1"><Ticket className="w-3 h-3" />{cp.ticketBalance} tickets</span>
              <span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" />${parseFloat(cp.cashBalance ?? '0').toFixed(2)} USD</span>
            </div>
          </button>
        ))}

        {/* Actividades */}
        {subTab === 'activities' && (
          <>
            <button
              onClick={() => setShowNewActivity(true)}
              className="w-full bg-[#e5007d] text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Nueva actividad
            </button>

            {(activitiesData as any[]).length === 0 && (
              <div className="text-center py-12 text-[#999] text-sm">No hay actividades</div>
            )}

            {(activitiesData as any[]).map((act: any) => (
              <div key={act.id} className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden shadow-sm">
                <button
                  onClick={() => setExpandedActivity(expandedActivity === act.id ? null : act.id)}
                  className="w-full px-4 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isExpired(act.deadline) ? 'bg-red-400' : act.active ? 'bg-green-400' : 'bg-[#ccc]'}`} />
                      <p className="font-bold text-sm text-[#111] truncate">{act.title}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#999] flex-wrap">
                      <span className="bg-[#f0f0f0] px-2 py-0.5 rounded-full capitalize">{act.type}</span>
                      <span>{act.basePoints} pts base</span>
                      {isExpired(act.deadline) && (
                        <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
                          Vencida
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-[#999] ml-3 flex-shrink-0 transition-transform ${expandedActivity === act.id ? 'rotate-180' : ''}`} />
                </button>

                {expandedActivity === act.id && (
                  <div className="border-t border-[#f0f0f0] px-4 py-4 flex flex-col gap-3">
                    {act.description && (
                      <div>
                        <p
                          className={`text-sm text-[#666] leading-relaxed ${descAbierta === act.id ? '' : 'line-clamp-4'}`}
                          style={{ overflowWrap: 'anywhere' }}
                        >
                          {act.description}
                        </p>
                        {act.description.length > 200 && (
                          <button
                            onClick={() => setDescAbierta(descAbierta === act.id ? null : act.id)}
                            className="mt-1 text-xs font-bold text-[#e5007d]"
                          >
                            {descAbierta === act.id ? 'Ver menos' : 'Ver más'}
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {(act.phases ?? 1) > 1 && (
                        <span className="rounded-full bg-[#e5007d]/10 px-2 py-0.5 font-bold text-[#e5007d]">
                          {act.phases} fases
                        </span>
                      )}
                      <span className="text-[#999]">
                        {act.deadline
                          ? `Fecha límite: ${new Date(act.deadline).toLocaleDateString('es-VE')}`
                          : 'Sin fecha límite'}
                      </span>
                    </div>
                    <div className="bg-[#f8f8f8] rounded-xl p-3">
                      <p className="text-xs text-[#999] mb-1">Tickets por tier:</p>
                      <div className="grid grid-cols-5 gap-1 text-xs text-center">
                        {[['bronce', 1], ['plata', 1.5], ['oro', 2], ['diamante', 3], ['platino', 5]].map(([tier, mult]) => (
                          <div key={String(tier)}>
                            <p className="text-[#999] capitalize text-[10px]">{tier}</p>
                            <p className="font-bold text-[#111]">{Math.round(act.basePoints * Number(mult))}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateActivityMut.mutate({ id: act.id, active: !act.active })}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                          act.active ? 'border-orange-200 text-orange-500 bg-orange-50' : 'border-green-200 text-green-500 bg-green-50'
                        }`}
                      >
                        {act.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => { if (confirm(`¿Eliminar "${act.title}"? Esta acción no se puede deshacer.`)) deleteActivity.mutate({ id: act.id }); }}
                        className="flex-1 border border-red-200 text-red-500 bg-red-50 py-2.5 rounded-xl text-xs font-bold"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
        {/* Evaluaciones */}
        {subTab === 'evaluations' && (
          <>
            {(submissionsData as any[]).length === 0 && (
              <div className="text-center py-12 text-[#999] text-sm">No hay evaluaciones</div>
            )}
            {(submissionsData as any[]).map((sub: any) => {
              const TC: Record<string, string> = { bronce: '#cd7f32', plata: '#c0c0c0', oro: '#ffd700', diamante: '#b9f2ff', platino: '#e8e8e8' };
              let evidenceUrls: string[] = [];
              try { evidenceUrls = JSON.parse(sub.evidenceUrl); } catch { evidenceUrls = [sub.evidenceUrl]; }
              return (
                <div key={sub.id} className="bg-white rounded-2xl border border-[#e5e5e5] p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    {sub.photo && <img src={sub.photo} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-[#111] text-sm">{sub.artisticName ?? '—'}</p>
                      <span className="text-xs font-bold capitalize" style={{ color: TC[sub.tier] ?? '#888' }}>{sub.tier}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold flex-shrink-0 ${sub.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' : sub.status === 'approved' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-500 border border-red-200'}`}>
                      {sub.status === 'pending' ? 'Pendiente' : sub.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                    </span>
                  </div>
                  <div className="bg-[#f8f8f8] rounded-xl p-3 mb-3">
                    <p className="text-xs text-[#999] mb-0.5">Actividad</p>
                    <p className="text-sm font-semibold text-[#111]">{sub.activityTitle ?? '—'}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#999]">
                      <span>Puntos base: {sub.activityBasePoints}</span>
                      {(sub.phase ?? 1) > 1 || (sub.activityPhases ?? 1) > 1 ? (
                        <span className="rounded-full bg-[#e5007d]/10 px-2 py-0.5 font-bold text-[#e5007d]">
                          Fase {sub.phase ?? 1}{sub.activityPhases ? ` de ${sub.activityPhases}` : ''}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs text-[#999] mb-1">Evidencia</p>
                    {evidenceUrls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#e5007d] underline break-all block">{url}</a>
                    ))}
                  </div>
                  <p className="text-xs text-[#999] mb-3">Enviado: {new Date(sub.createdAt).toLocaleDateString('es-VE')}</p>
                  {sub.status === 'pending' && (
                    <button onClick={() => { setEvalModal(sub); setEvalPoints(sub.activityBasePoints ?? 100); }}
                      className="w-full bg-[#111] text-white py-3 rounded-xl font-bold text-sm">
                      Evaluar y aprobar
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Modal evaluar submission */}
      {evalModal && (
        <div className="fixed inset-0 bg-black/70 z-[300] flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            <h3 className="font-black text-[#111] mb-1">Evaluar submission</h3>
            <p className="text-xs text-[#999] mb-4">{evalModal.artisticName} — {evalModal.activityTitle}</p>
            {(() => {
              const MULTS: Record<string, number> = { bronce: 1, plata: 1.5, oro: 2, diamante: 3, platino: 5 };
              const multiplier = MULTS[evalModal.tier ?? 'bronce'] ?? 1;
              const finalPoints = Math.round(evalPoints * multiplier);
              return (
                <div className="bg-[#f8f8f8] rounded-xl p-4 border border-[#e5e5e5] mb-4">
                  <p className="text-xs text-[#999] mb-3">Puntos base de la actividad</p>
                  <input type="number" value={evalPoints} min={0}
                    onChange={e => setEvalPoints(parseInt(e.target.value) || 0)}
                    className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111] mb-3 bg-white" />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#999]">{evalPoints} base × {multiplier} ({evalModal.tier})</p>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#e5007d]">{finalPoints}</p>
                      <p className="text-xs text-[#999]">tickets finales</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="flex gap-2">
              <button onClick={() => setEvalModal(null)}
                className="flex-1 border border-[#e5e5e5] text-[#666] py-3 rounded-xl text-sm font-semibold">
                Cancelar
              </button>
              <button
                onClick={() => evaluateSub.mutate({ submissionId: evalModal.id, pointsAwarded: evalPoints, status: 'approved' })}
                disabled={evaluateSub.isPending}
                className="flex-1 bg-green-500 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">
                {evaluateSub.isPending ? 'Guardando...' : 'Aprobar'}
              </button>
              <button
                onClick={() => evaluateSub.mutate({ submissionId: evalModal.id, pointsAwarded: 0, status: 'rejected' })}
                disabled={evaluateSub.isPending}
                className="flex-1 bg-red-50 text-red-500 border border-red-200 py-3 rounded-xl text-sm font-bold disabled:opacity-40">
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ver solicitud completa */}
      {viewApplication && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end overflow-x-hidden">
          <div className="bg-white w-full max-w-full rounded-t-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
            <div className="sticky top-0 z-10 bg-white border-b border-[#f0f0f0] px-4 py-4 flex items-center justify-between"
              style={{ backdropFilter: 'blur(8px)', backgroundColor: 'var(--iw-surface)' }}>
              <h3 className="font-black text-[#111]">{viewApplication.artisticName ?? viewApplication.fullName}</h3>
              <button onClick={() => setViewApplication(null)}>
                <X size={20} className="text-[#999]" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {viewApplication.bannerImage && (
                <button onClick={() => setLightboxImg(viewApplication.bannerImage)} className="w-full">
                  <img src={viewApplication.bannerImage} className="w-full h-32 object-cover rounded-2xl" alt="" />
                </button>
              )}
              {viewApplication.photo && (
                <button onClick={() => setLightboxImg(viewApplication.photo)}>
                  <img src={viewApplication.photo} className="w-20 h-20 rounded-full object-cover border-2 border-[#e5e5e5] -mt-10 ml-4" alt="" />
                </button>
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
                      <button key={i} onClick={() => setLightboxImg(img)} className="aspect-square overflow-hidden rounded-xl">
                        <img src={img} className="w-full h-full object-cover active:opacity-80 transition-opacity" alt="" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {viewApplication.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setApproveModal(viewApplication); setViewApplication(null); setApproveForm({ totalFollowers: 0, tier: 'bronce' }); }}
                    className="flex-1 bg-[#111] text-white py-3 rounded-xl font-bold text-sm">
                    Aprobar
                  </button>
                  <button onClick={() => { setRejectModal(viewApplication); setViewApplication(null); setRejectReason(''); }}
                    className="flex-1 border border-red-200 text-red-500 py-3 rounded-xl font-bold text-sm">
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva actividad */}
      {showNewActivity && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end overflow-x-hidden">
          <div className="bg-white w-full max-w-full rounded-t-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
            <div className="sticky top-0 z-10 bg-white border-b border-[#f0f0f0] px-4 py-4 flex items-center justify-between"
              style={{ backdropFilter: 'blur(8px)', backgroundColor: 'var(--iw-surface)' }}>
              <h3 className="font-black text-[#111]">Nueva actividad</h3>
              <button onClick={() => setShowNewActivity(false)}>
                <X size={20} className="text-[#999]" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Título *</label>
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={e => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="Ej: Post en Instagram mencionando Isekai"
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Descripción</label>
                <textarea
                  value={activityForm.description}
                  onChange={e => setActivityForm({ ...activityForm, description: e.target.value })}
                  rows={3}
                  placeholder="Instrucciones detalladas..."
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Puntos base</label>
                  <input
                    type="number"
                    min={1}
                    value={activityForm.basePoints}
                    onChange={e => setActivityForm({ ...activityForm, basePoints: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Tipo</label>
                  <select
                    value={activityForm.type}
                    onChange={e => setActivityForm({ ...activityForm, type: e.target.value })}
                    className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111] bg-white"
                  >
                    <option value="post">Post</option>
                    <option value="reel">Reel</option>
                    <option value="tiktok">TikTok</option>
                    <option value="story">Story</option>
                    <option value="event">Evento</option>
                  </select>
                </div>
              </div>
              <div className="bg-[#f8f8f8] rounded-xl p-3 border border-[#e5e5e5]">
                <p className="text-xs text-[#999] mb-2">Tickets que recibirá cada tier:</p>
                <div className="grid grid-cols-5 gap-1 text-center text-xs">
                  {[['Bronce', 1], ['Plata', 1.5], ['Oro', 2], ['Diamante', 3], ['Platino', 5]].map(([tier, mult]) => (
                    <div key={String(tier)}>
                      <p className="text-[#999] text-[10px]">{tier}</p>
                      <p className="font-black text-[#111]">{Math.round(activityForm.basePoints * Number(mult))}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Fecha límite opcional */}
              <div className="rounded-xl border border-[#e5e5e5] p-3">
                <label className="flex items-center gap-2.5 cursor-pointer" style={{ minHeight: 40 }}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#e5007d]"
                    checked={activityForm.conFecha}
                    onChange={e => setActivityForm({ ...activityForm, conFecha: e.target.checked, deadline: e.target.checked ? activityForm.deadline : '' })}
                  />
                  <span className="text-sm font-medium">Ponerle fecha límite</span>
                </label>
                {activityForm.conFecha ? (
                  <input
                    type="date"
                    value={activityForm.deadline}
                    onChange={e => setActivityForm({ ...activityForm, deadline: e.target.value })}
                    className="mt-2 w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]"
                  />
                ) : (
                  <p className="mt-1 text-xs text-[#999]">Sin fecha límite: la misión queda abierta.</p>
                )}
              </div>

              {/* Fases de la misión */}
              <div className="rounded-xl border border-[#e5e5e5] p-3">
                <label className="text-sm font-medium block">Fases de la misión</label>
                <p className="text-xs text-[#999] mb-2">
                  Cuántas publicaciones debe subir. Con más de una verá barra de progreso
                  y deberá pegar un enlace distinto en cada fase.
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      onClick={() => setActivityForm({ ...activityForm, phases: n })}
                      className={`h-10 w-full rounded-xl text-sm font-bold transition-colors ${
                        activityForm.phases === n ? 'bg-[#e5007d] text-white' : 'bg-[#f0f0f0] text-[#666]'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setShowNewActivity(false)}
                  className="flex-1 border border-[#e5e5e5] text-[#666] py-3 rounded-xl text-sm">
                  Cancelar
                </button>
                <button
                  onClick={() => createActivity.mutate({
                    title: activityForm.title,
                    description: activityForm.description || undefined,
                    basePoints: activityForm.basePoints,
                    type: activityForm.type as any,
                    deadline: activityForm.conFecha && activityForm.deadline ? activityForm.deadline : undefined,
                    phases: activityForm.phases,
                  })}
                  disabled={!activityForm.title || createActivity.isPending}
                  className="flex-1 bg-[#e5007d] text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40"
                >
                  {createActivity.isPending ? 'Creando...' : 'Crear actividad'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal cosplayer activo */}
      {viewCosplayer && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end overflow-x-hidden">
          <div className="bg-white w-full max-w-full rounded-t-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
            <div className="sticky top-0 bg-white border-b border-[#f0f0f0] px-4 py-4 flex items-center justify-between z-10"
              style={{ backdropFilter: 'blur(8px)', backgroundColor: 'var(--iw-surface)' }}>
              <h3 className="font-black text-[#111]">{viewCosplayer.artisticName}</h3>
              <button onClick={() => setViewCosplayer(null)}><X size={20} className="text-[#999]" /></button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {viewCosplayer.bannerImage && (
                <img src={viewCosplayer.bannerImage} className="w-full h-32 object-cover rounded-2xl" alt="" />
              )}
              <div className="flex items-center gap-4">
                {viewCosplayer.photo && (
                  <img src={viewCosplayer.photo} className="w-16 h-16 rounded-full object-cover border-2 flex-shrink-0"
                    style={{ borderColor: TIER_COLORS[viewCosplayer.tier] ?? '#888' }} alt="" />
                )}
                <div>
                  <p className="font-black text-[#111] text-lg">{viewCosplayer.artisticName}</p>
                  <span className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: (TIER_COLORS[viewCosplayer.tier] ?? '#888') + '20', color: TIER_COLORS[viewCosplayer.tier] ?? '#888' }}>
                    {(viewCosplayer.tier ?? 'bronce').toUpperCase()}
                  </span>
                </div>
              </div>

              {viewCosplayer.bio && (
                <div className="bg-[#f8f8f8] rounded-2xl p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">Biografía</p>
                  <p className="text-sm text-[#666] leading-relaxed">{viewCosplayer.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f8f8f8] rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-[#e5007d]">{viewCosplayer.ticketBalance}</p>
                  <p className="text-xs text-[#999]">Tickets</p>
                </div>
                <div className="bg-[#f8f8f8] rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-[#ffd700]">
                    ${parseFloat(viewCosplayer.cashBalance ?? '0').toFixed(2)} USD
                  </p>
                  <p className="text-xs text-[#999]">Cash USD</p>
                </div>
              </div>

              {viewCosplayer.referralCode && (
                <div className="bg-[#f8f8f8] rounded-2xl p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">Código de referido</p>
                  <p className="font-black text-[#e5007d] tracking-widest">{viewCosplayer.referralCode}</p>
                </div>
              )}

              <div className="bg-[#f8f8f8] rounded-2xl p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3">Redes sociales</p>
                <div className="flex flex-col gap-2">
                  {['instagram', 'tiktok', 'youtube', 'facebook', 'twitter'].filter(r => viewCosplayer[r]).map(r => (
                    <a key={r} href={viewCosplayer[r]} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-[#e5e5e5]">
                      <span className="capitalize text-sm font-medium text-[#111]">{r}</span>
                      <span className="text-[#e5007d] text-xs truncate ml-2 max-w-[180px]">{viewCosplayer[r]}</span>
                    </a>
                  ))}
                </div>
              </div>

              {viewCosplayer.gallery?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">Galería</p>
                  <div className="grid grid-cols-3 gap-2">
                    {viewCosplayer.gallery.map((img: string, i: number) => (
                      <button key={i} onClick={() => setLightboxImg(img)} className="aspect-square overflow-hidden rounded-xl">
                        <img src={img} className="w-full h-full object-cover" alt="" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => { setViewCosplayer(null); setGrantTicketsModal(viewCosplayer); setGrantForm({ basePoints: 100, reason: '' }); }}
                  className="w-full bg-[#e5007d] text-white py-3 rounded-xl font-bold text-sm"
                >
                  Dar tickets
                </button>
                {viewCosplayer.isActive && (
                  <button
                    onClick={() => {
                      if (confirm(`¿Suspender a ${viewCosplayer.artisticName}? Perderá acceso al Guild.`)) {
                        suspendCosplayer.mutate({ cosplayerId: viewCosplayer.id });
                        setViewCosplayer(null);
                      }
                    }}
                    className="w-full border border-red-200 text-red-500 py-3 rounded-xl font-bold text-sm"
                  >
                    Suspender cosplayer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal dar tickets */}
      {grantTicketsModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
            <div className="w-10 h-1 bg-[#e5e5e5] rounded-full mx-auto mb-4" />
            <h3 className="font-black text-lg mb-1">Dar tickets</h3>
            <p className="text-[#999] text-sm mb-4">
              {grantTicketsModal.artisticName} · <span className="capitalize">{grantTicketsModal.tier}</span>
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Puntos base</label>
                <input
                  type="number"
                  min={1}
                  value={grantForm.basePoints}
                  onChange={e => setGrantForm({ ...grantForm, basePoints: parseInt(e.target.value) || 1 })}
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]"
                />
              </div>
              <div className="bg-[#f8f8f8] rounded-xl p-4 border border-[#e5e5e5] flex items-center justify-between">
                <p className="text-xs text-[#999]">
                  {grantForm.basePoints} × {MULTIPLIERS[grantTicketsModal.tier] ?? 1} ({grantTicketsModal.tier})
                </p>
                <p className="text-2xl font-black text-[#e5007d]">
                  {Math.round(grantForm.basePoints * (MULTIPLIERS[grantTicketsModal.tier] ?? 1))} tickets
                </p>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Motivo</label>
                <input
                  type="text"
                  value={grantForm.reason}
                  onChange={e => setGrantForm({ ...grantForm, reason: e.target.value })}
                  placeholder="Ej: Participación en evento..."
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setGrantTicketsModal(null)}
                className="flex-1 border border-[#e5e5e5] text-[#666] py-3 rounded-xl text-sm">
                Cancelar
              </button>
              <button
                onClick={() => grantTickets.mutate({ cosplayerId: grantTicketsModal.id, basePoints: grantForm.basePoints, reason: grantForm.reason })}
                disabled={!grantForm.reason || grantTickets.isPending}
                className="flex-1 bg-[#e5007d] text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">
                {grantTickets.isPending ? 'Enviando...' : 'Dar tickets'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <button
            className="absolute right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
            onClick={() => setLightboxImg(null)}
          >
            <X size={20} className="text-white" />
          </button>
          <img
            src={lightboxImg}
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
            alt=""
          />
        </div>
      )}

      {/* Modal aprobar */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end">
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
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end">
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
function ProductsSection({ onModalChange }: { onModalChange: (open: boolean) => void }) {
  const { user, isAuthenticated } = useAuth();
  const { data: productsData, refetch: refetchProducts } = trpc.products.adminList.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const products = productsData?.items ?? [];
  // Guardamos las categorías ABIERTAS: arrancan todas cerradas
  const [openCats, setOpenCats] = useState<string[]>([]);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => { setEditProduct(null); refetchProducts(); },
  });
  const { data: productImages = [], refetch: refetchImages } = trpc.products.getImages.useQuery(
    { productId: editProduct?.id ?? 0 },
    { enabled: !!editProduct?.id },
  );
  const deleteImage = trpc.products.deleteImage.useMutation({ onSuccess: () => refetchImages() });
  const addImage = trpc.products.addImage.useMutation({ onSuccess: () => refetchImages() });
  const uploadImage = trpc.products.uploadImage.useMutation();

  useEffect(() => { onModalChange(!!editProduct); }, [editProduct]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editProduct) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await uploadImage.mutateAsync({ fileName: `products/${editProduct.id}-${Date.now()}-${file.name}`, contentType: file.type, base64Data: base64 });
        await addImage.mutateAsync({ productId: editProduct.id, url: result.url, position: productImages.length });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-black text-[#111]">Productos ({products.length})</h2>
        <a href="/admin?tab=products&action=new">
          <button className="bg-[#e5007d] text-white px-4 py-2 rounded-xl text-xs font-bold">+ Nuevo</button>
        </a>
      </div>
      {/* Agrupado por categoría, cerrado por defecto (igual que en escritorio) */}
      {(() => {
        const grupos = new Map<string, any[]>();
        for (const prod of (products as any[])) {
          const key = prod.category?.name ?? 'Sin categoría';
          if (!grupos.has(key)) grupos.set(key, []);
          grupos.get(key)!.push(prod);
        }
        return Array.from(grupos.entries()).map(([nombre, lista]) => {
          const abierto = openCats.includes(nombre);
          return (
            <div key={nombre} className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden">
              <button
                onClick={() => setOpenCats(prev => prev.includes(nombre) ? prev.filter(g => g !== nombre) : [...prev, nombre])}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[#fafafa]"
                style={{ minHeight: 52, WebkitTapHighlightColor: 'transparent' }}
              >
                <FolderOpen size={16} className="text-[#999] flex-shrink-0" />
                <span className="font-bold text-sm text-[#111] flex-1 truncate">{nombre}</span>
                <span className="text-xs font-semibold text-[#999]">{lista.length}</span>
                <ChevronDown size={16} className={`text-[#999] transition-transform ${abierto ? 'rotate-180' : ''}`} />
              </button>

              {abierto && (
                <div className="border-t border-[#f0f0f0] divide-y divide-[#f0f0f0]">
                  {lista.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 p-3">
                      {p.images?.[0]?.url && (
                        <img src={p.images[0].url} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt="" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-[#111] truncate">{p.name}</p>
                        <p className="text-[#e5007d] font-black text-sm">${parseFloat(p.price ?? 0).toFixed(2)} USD</p>
                        <span className={`text-xs font-semibold ${p.status === 'published' ? 'text-green-500' : 'text-[#999]'}`}>
                          {p.status === 'published' ? 'Publicado' : 'Borrador'}
                        </span>
                      </div>
                      <button onClick={() => setEditProduct({ ...p })}
                        className="w-10 h-10 bg-[#f8f8f8] border border-[#e5e5e5] rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform">
                        <Pencil size={15} className="text-[#666]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        });
      })()}

      {/* Modal editar producto */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[95vh] overflow-y-auto"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
            <div className="sticky top-0 bg-white border-b border-[#f0f0f0] px-4 py-4 flex items-center justify-between z-10"
              style={{ backdropFilter: 'blur(8px)', backgroundColor: 'var(--iw-surface)' }}>
              <h3 className="font-black text-[#111] truncate flex-1 mr-2">{editProduct.name}</h3>
              <button onClick={() => setEditProduct(null)}><X size={20} className="text-[#999]" /></button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {/* Imágenes del producto */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  Imágenes ({productImages.length})
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(productImages as any[]).map((img: any) => (
                    <div key={img.id} className="relative aspect-square">
                      <img src={img.url} className="w-full h-full object-cover rounded-xl border border-[#e5e5e5]" alt="" />
                      {productImages.length > 1 && (
                        <button
                          onClick={() => { if (confirm('¿Eliminar esta imagen?')) deleteImage.mutate({ imageId: img.id }); }}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm"
                        >
                          <X size={11} />
                        </button>
                      )}
                      {img.position === 0 && (
                        <span className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[9px] text-center py-0.5 rounded-lg">
                          Principal
                        </span>
                      )}
                    </div>
                  ))}
                  <label className="aspect-square border-2 border-dashed border-[#e5e5e5] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#e5007d] transition-colors">
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-[#e5007d] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Plus size={22} className="text-[#ccc]" /><span className="text-[10px] text-[#ccc] mt-1">Agregar</span></>
                    )}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Nombre</label>
                <input type="text" value={editProduct.name}
                  onChange={e => setEditProduct({ ...editProduct, name: e.target.value })}
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Precio (USD)</label>
                <input type="text" value={editProduct.price}
                  onChange={e => setEditProduct({ ...editProduct, price: e.target.value })}
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Stock</label>
                <input type="number" value={editProduct.stock ?? 0}
                  onChange={e => setEditProduct({ ...editProduct, stock: parseInt(e.target.value) || 0 })}
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Estado</label>
                <select value={editProduct.status}
                  onChange={e => setEditProduct({ ...editProduct, status: e.target.value })}
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none bg-white">
                  <option value="published">Publicado</option>
                  <option value="draft">Borrador</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Descripción</label>
                <textarea value={editProduct.description ?? ''} rows={4}
                  onChange={e => setEditProduct({ ...editProduct, description: e.target.value })}
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111] resize-none" />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setEditProduct(null)}
                  className="flex-1 border border-[#e5e5e5] text-[#666] py-3 rounded-xl text-sm">Cancelar</button>
                <button
                  onClick={() => updateProduct.mutate({ id: editProduct.id, name: editProduct.name, price: editProduct.price, status: editProduct.status, description: editProduct.description, stock: editProduct.stock })}
                  disabled={updateProduct.isPending}
                  className="flex-1 bg-[#111] text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">
                  {updateProduct.isPending ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
              <a href="/admin" className="text-center text-xs text-[#e5007d] underline">Ir al editor completo</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SECCIÓN: BLOG ============
function BlogSection({ onModalChange }: { onModalChange: (open: boolean) => void }) {
  const { user, isAuthenticated } = useAuth();
  const [subTab, setSubTab] = useState<'posts' | 'categories'>('posts');
  const { data: posts = [], refetch } = trpc.blog.getAllPosts.useQuery(
    {},
    { enabled: isAuthenticated && user?.role === 'admin' },
  );
  const { data: categories = [], refetch: refetchCategories } = trpc.blog.getCategories.useQuery();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', excerpt: '', content: '', category: '', status: 'draft' as 'draft' | 'published', metaTitle: '', metaDescription: '' });
  const [coverImage, setCoverImage] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const uploadImage = trpc.products.uploadImage.useMutation();
  const createPost = trpc.blog.createPost.useMutation({
    onSuccess: () => { setShowNew(false); setForm({ title: '', excerpt: '', content: '', category: '', status: 'draft', metaTitle: '', metaDescription: '' }); setCoverImage(''); refetch(); },
  });
  const deletePost = trpc.blog.deletePost.useMutation({ onSuccess: () => refetch() });
  const createCategory = trpc.blog.createCategory.useMutation({
    onSuccess: () => { setNewCategory(''); setNewCategoryDesc(''); refetchCategories(); },
  });
  const deleteCategory = trpc.blog.deleteCategory.useMutation({ onSuccess: () => refetchCategories() });

  useEffect(() => { onModalChange(showNew); }, [showNew]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const result = await uploadImage.mutateAsync({ fileName: `blog/${Date.now()}-${file.name}`, contentType: file.type, base64Data: base64 });
      setCoverImage(result.url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full">

      {/* Sub-tabs */}
      <div className="bg-white border-b border-[#e5e5e5] px-4 py-2 flex gap-2 flex-shrink-0">
        <button onClick={() => setSubTab('posts')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${subTab === 'posts' ? 'bg-[#111] text-white' : 'bg-[#f0f0f0] text-[#666]'}`}>
          Artículos ({(posts as any[]).length})
        </button>
        <button onClick={() => setSubTab('categories')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${subTab === 'categories' ? 'bg-[#111] text-white' : 'bg-[#f0f0f0] text-[#666]'}`}>
          Categorías ({(categories as any[]).length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">

        {/* Posts */}
        {subTab === 'posts' && (
          <div className="flex flex-col gap-3">
            <button onClick={() => setShowNew(true)}
              className="w-full bg-[#e5007d] text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
              <Plus size={18} /> Nuevo artículo
            </button>
            {(posts as any[]).map((post: any) => (
              <div key={post.id} className="bg-white rounded-2xl border border-[#e5e5e5] p-4 shadow-sm">
                {post.coverImage && (
                  <img src={post.coverImage} className="w-full h-32 object-cover rounded-xl mb-3" alt="" />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#111]">{post.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-semibold ${post.status === 'published' ? 'text-green-500' : 'text-[#999]'}`}>
                        {post.status === 'published' ? 'Publicado' : 'Borrador'}
                      </span>
                      {post.category && <span className="text-xs text-[#999]">· {post.category}</span>}
                      <span className="text-xs text-[#999]">· {post.views ?? 0} vistas</span>
                    </div>
                  </div>
                  <button onClick={() => { if (confirm(`¿Eliminar "${post.title}"?`)) deletePost.mutate({ id: post.id }); }}
                    className="text-red-400 p-1 flex-shrink-0"><X size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Categorías */}
        {subTab === 'categories' && (
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-2xl border border-[#e5e5e5] p-4 shadow-sm">
              <p className="font-bold text-sm text-[#111] mb-3">Nueva categoría</p>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="Nombre de la categoría *"
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]"
                />
                <input
                  type="text"
                  value={newCategoryDesc}
                  onChange={e => setNewCategoryDesc(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]"
                />
                <button
                  onClick={() => createCategory.mutate({ name: newCategory, description: newCategoryDesc || undefined })}
                  disabled={!newCategory.trim() || createCategory.isPending}
                  className="w-full bg-[#e5007d] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40"
                >
                  {createCategory.isPending ? 'Creando...' : '+ Crear categoría'}
                </button>
              </div>
            </div>
            {(categories as any[]).length === 0 && (
              <p className="text-center text-[#999] text-sm py-8">No hay categorías aún</p>
            )}
            {(categories as any[]).map((cat: any) => (
              <div key={cat.id} className="bg-white rounded-2xl border border-[#e5e5e5] p-4 shadow-sm flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-[#111]">{cat.name}</p>
                  {cat.description && <p className="text-xs text-[#999] mt-0.5">{cat.description}</p>}
                  {cat.slug && <p className="text-xs text-[#ccc] mt-0.5">/{cat.slug}</p>}
                </div>
                <button
                  onClick={() => { if (confirm(`¿Eliminar la categoría "${cat.name}"?`)) deleteCategory.mutate({ id: cat.id }); }}
                  className="text-red-400 hover:text-red-600 p-2 flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nuevo artículo */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[95vh] overflow-y-auto"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
            <div className="sticky top-0 bg-white border-b border-[#f0f0f0] px-4 py-4 flex items-center justify-between z-10"
              style={{ backdropFilter: 'blur(8px)', backgroundColor: 'var(--iw-surface)' }}>
              <h3 className="font-black text-[#111]">Nuevo artículo</h3>
              <button onClick={() => setShowNew(false)}><X size={20} className="text-[#999]" /></button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Imagen de portada</label>
                {coverImage ? (
                  <div className="relative">
                    <img src={coverImage} className="w-full h-40 object-cover rounded-xl" alt="" />
                    <button onClick={() => setCoverImage('')}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#e5e5e5] rounded-xl cursor-pointer hover:border-[#e5007d] transition-colors">
                    <Package size={24} className="text-[#ccc] mb-2" />
                    <span className="text-xs text-[#999]">Subir imagen de portada</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  </label>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Título *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Título del artículo"
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Extracto</label>
                <textarea value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })}
                  rows={2} placeholder="Resumen breve del artículo..."
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111] resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Contenido</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                  rows={8} placeholder="Contenido del artículo (HTML soportado)..."
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111] resize-none font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Categoría</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-[#e5e5e5] rounded-xl px-3 py-3 text-sm outline-none bg-white">
                    <option value="">Sin categoría</option>
                    {(categories as any[]).map((c: any) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Estado</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}
                    className="w-full border border-[#e5e5e5] rounded-xl px-3 py-3 text-sm outline-none bg-white">
                    <option value="draft">Borrador</option>
                    <option value="published">Publicar</option>
                  </select>
                </div>
              </div>
              <div className="bg-[#f8f8f8] rounded-2xl p-4 flex flex-col gap-3">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider">SEO</p>
                <input type="text" value={form.metaTitle} onChange={e => setForm({ ...form, metaTitle: e.target.value })}
                  placeholder="Meta título (opcional)"
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none bg-white" />
                <textarea value={form.metaDescription} onChange={e => setForm({ ...form, metaDescription: e.target.value })}
                  rows={2} placeholder="Meta descripción (opcional)"
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none bg-white resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNew(false)}
                  className="flex-1 border border-[#e5e5e5] text-[#666] py-3 rounded-xl text-sm">Cancelar</button>
                <button
                  onClick={() => createPost.mutate({ ...form, coverImage: coverImage || undefined })}
                  disabled={!form.title || createPost.isPending}
                  className="flex-1 bg-[#e5007d] text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">
                  {createPost.isPending ? 'Creando...' : form.status === 'published' ? 'Publicar' : 'Guardar borrador'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SECCIÓN: CATEGORÍAS ============
function CategoriesSection() {
  const { data: categories = [], refetch } = trpc.categories.list.useQuery();
  const [newCat, setNewCat] = useState('');
  const createCat = trpc.categories.create.useMutation({
    onSuccess: () => { setNewCat(''); refetch(); },
  });
  const deleteCat = trpc.categories.delete.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex gap-2">
        <input value={newCat} onChange={e => setNewCat(e.target.value)}
          placeholder="Nueva categoría..."
          className="flex-1 border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#111]" />
        <button
          onClick={() => createCat.mutate({ name: newCat, slug: newCat.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
          disabled={!newCat || createCat.isPending}
          className="bg-[#e5007d] text-white px-4 rounded-xl font-bold disabled:opacity-40">
          +
        </button>
      </div>
      {(categories as any[]).map((cat: any) => (
        <div key={cat.id} className="bg-white rounded-2xl border border-[#e5e5e5] p-4 flex items-center justify-between shadow-sm">
          <p className="font-medium text-[#111]">{cat.name}</p>
          <button onClick={() => { if (confirm(`¿Eliminar "${cat.name}"?`)) deleteCat.mutate({ id: cat.id }); }}
            className="text-red-400 hover:text-red-600 p-1">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ============ SECCIÓN: FAQ ============
function FAQSection() {
  const { data: faqs = [], refetch } = trpc.faq.adminList.useQuery();
  const deleteFaq = trpc.faq.delete.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="p-4 flex flex-col gap-3">
      {(faqs as any[]).length === 0 && (
        <p className="text-center text-[#999] text-sm py-8">Sin preguntas frecuentes</p>
      )}
      {(faqs as any[]).map((faq: any) => (
        <div key={faq.id} className="bg-white rounded-2xl border border-[#e5e5e5] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm text-[#111] flex-1">{faq.question}</p>
            <button onClick={() => { if (confirm('¿Eliminar esta pregunta?')) deleteFaq.mutate({ id: faq.id }); }}
              className="text-red-400 flex-shrink-0 p-1">
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-[#999] mt-1 line-clamp-2">{faq.answer}</p>
        </div>
      ))}
    </div>
  );
}

// ============ SECCIÓN: USUARIOS ============
function UsersSection() {
  const { data: users = [] } = trpc.users.list.useQuery({});
  const updateRole = trpc.users.updateRole.useMutation();

  return (
    <div className="p-4 flex flex-col gap-3">
      {(users as any[]).map((user: any) => (
        <div key={user.id} className="bg-white rounded-2xl border border-[#e5e5e5] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#111] text-white flex items-center justify-center font-bold flex-shrink-0">
              {user.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#111] truncate">{user.name}</p>
              <p className="text-xs text-[#999] truncate">{user.email}</p>
            </div>
            <select value={user.role}
              onChange={e => updateRole.mutate({ userId: user.id, role: e.target.value as 'user' | 'admin' })}
              className="text-xs border border-[#e5e5e5] rounded-lg px-2 py-1 outline-none bg-white">
              <option value="user">Cliente</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ SECCIÓN: MÁS ============
function MoreSection({ onLogout, onNavigate }: { onLogout: () => void; onNavigate: (tab: MobileTab) => void }) {
  const sections = [
    {
      title: 'Gestión',
      items: [
        { label: 'Categorías', tab: 'categories' as MobileTab, icon: Tag },
        { label: 'FAQ',        tab: 'faq'        as MobileTab, icon: MessageCircle },
        { label: 'Usuarios',   tab: 'users'      as MobileTab, icon: Users },
        { label: 'Blog',       tab: 'blog'        as MobileTab, icon: BookOpen },
        { label: 'Popups',     tab: 'popups'     as MobileTab, icon: Megaphone },
        { label: 'Suscriptores', tab: 'subscribers' as MobileTab, icon: Mail },
        { label: 'Tasa del día', tab: 'tasa'        as MobileTab, icon: DollarSign },
        { label: 'Cotizaciones', tab: 'quotes'      as MobileTab, icon: FileText },
        { label: 'Comentarios',  tab: 'comments'    as MobileTab, icon: MessageCircle },
      ],
    },
    {
      title: 'Herramientas',
      items: [
        { label: 'Ver tienda', tab: null, href: '/', icon: Eye },
      ],
    },
  ];

  return (
    <div className="p-4 flex flex-col gap-4 pb-8">
      {sections.map((section, si) => (
        <div key={si}>
          <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">{section.title}</p>
          <div className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden shadow-sm">
            {(section.items as any[]).map((item: any, i) => (
              item.href ? (
                <a key={i} href={item.href}
                  className="flex items-center justify-between px-4 py-3.5 border-b border-[#f0f0f0] last:border-0 active:bg-[#f8f8f8]">
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className="text-[#666]" />
                    <span className="text-sm font-medium text-[#111]">{item.label}</span>
                  </div>
                  <ChevronRight size={16} className="text-[#ccc]" />
                </a>
              ) : (
                <button key={i} onClick={() => onNavigate(item.tab)}
                  className="w-full flex items-center justify-between px-4 py-3.5 border-b border-[#f0f0f0] last:border-0 active:bg-[#f8f8f8]">
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className="text-[#666]" />
                    <span className="text-sm font-medium text-[#111]">{item.label}</span>
                  </div>
                  <ChevronRight size={16} className="text-[#ccc]" />
                </button>
              )
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

// ============ NUEVO PEDIDO — PANTALLA DEDICADA ============
function NewOrderSection({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState({
    customerEmail: '',
    customerName: '',
    customerPhone: '',
    notes: '',
    paymentStatus: 'pending' as 'pending' | 'partial' | 'approved',
    amountPaid: '',
    items: [{ productName: '', quantity: 1, price: '' }],
    referralCode: '',
  });

  const findUser = trpc.users.findByEmail.useQuery(
    { email: form.customerEmail },
    { enabled: form.customerEmail.includes('@') && form.customerEmail.includes('.') },
  );

  const createOrder = trpc.orders.createManual.useMutation({
    onSuccess: (data) => { toast.success(`Pedido ${data.orderNumber} creado`); onSuccess(); },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });
  const { data: activeCosplayers = [] } = trpc.cosplay.getAllCosplayers.useQuery();
  const userSuggestions = trpc.users.searchByEmail.useQuery(
    { query: form.customerEmail },
    { enabled: form.customerEmail.length >= 2 },
  );

  const total = form.items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * item.quantity, 0);
  const addItem = () => setForm({ ...form, items: [...form.items, { productName: '', quantity: 1, price: '' }] });
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, j) => j !== i) });
  const updateItem = (i: number, field: string, value: any) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    setForm({ ...form, items });
  };
  const isStep1Valid = form.customerName && form.customerEmail && form.items[0].productName && form.items[0].price;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: 'var(--iw-bg)', zIndex: 500 }}>

      {/* Header */}
      <div style={{ background: 'var(--iw-surface)', borderBottom: '1px solid var(--iw-border)', flexShrink: 0, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: '12px', paddingLeft: '16px', paddingRight: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <button onClick={step === 1 ? onBack : () => setStep(1)} style={{ padding: '8px', margin: '-8px' }}>
            <ArrowLeft size={20} color="#111" />
          </button>
          <span style={{ fontWeight: 900, fontSize: '16px', color: '#111' }}>Nuevo pedido</span>
          <div style={{ width: '36px' }} />
        </div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
          <div style={{ flex: 1, height: '3px', borderRadius: '99px', background: '#e5007d' }} />
          <div style={{ flex: 1, height: '3px', borderRadius: '99px', background: step === 2 ? '#e5007d' : 'var(--iw-border)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: step === 1 ? '#e5007d' : '#999', fontWeight: 600 }}>Datos</span>
          <span style={{ fontSize: '11px', color: step === 2 ? '#e5007d' : '#999', fontWeight: 600 }}>Confirmar</span>
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, padding: '16px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {step === 1 && (
          <>
            <div style={{ background: 'var(--iw-surface)', borderRadius: '16px', padding: '16px', boxShadow: 'var(--iw-shadow)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</p>
              <div style={{ position: 'relative' }}>
                <input type="email" value={form.customerEmail}
                  onChange={e => { setForm({ ...form, customerEmail: e.target.value }); setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Email *"
                  style={{ width: '100%', border: '1px solid var(--iw-border)', borderRadius: '12px', padding: '12px 16px', fontSize: '16px', outline: 'none', boxSizing: 'border-box', background: 'var(--iw-input-bg)', color: 'var(--iw-text)' }} />
                {showSuggestions && userSuggestions.data && userSuggestions.data.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--iw-surface)', border: '1px solid var(--iw-border)', borderRadius: '12px', boxShadow: 'var(--iw-shadow-lg)', zIndex: 600, marginTop: '4px', overflow: 'hidden' }}>
                    {userSuggestions.data.map((user: any) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => { setForm({ ...form, customerEmail: user.email, customerName: user.name ?? form.customerName }); setShowSuggestions(false); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                          {user.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                          <p style={{ fontSize: '12px', color: '#999', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {findUser.data && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '10px 14px' }}>
                  <Check size={14} color="#22c55e" />
                  <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>{findUser.data.name} — registrado</span>
                </div>
              )}
              <input type="text" value={form.customerName}
                onChange={e => setForm({ ...form, customerName: e.target.value })}
                placeholder="Nombre completo *"
                style={{ width: '100%', border: '1px solid var(--iw-border)', borderRadius: '12px', padding: '12px 16px', fontSize: '16px', outline: 'none', boxSizing: 'border-box', background: 'var(--iw-input-bg)', color: 'var(--iw-text)' }} />
              <input type="tel" value={form.customerPhone}
                onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                placeholder="Teléfono"
                style={{ width: '100%', border: '1px solid var(--iw-border)', borderRadius: '12px', padding: '12px 16px', fontSize: '16px', outline: 'none', boxSizing: 'border-box', background: 'var(--iw-input-bg)', color: 'var(--iw-text)' }} />
            </div>

            <div style={{ background: 'var(--iw-surface)', borderRadius: '16px', padding: '16px', boxShadow: 'var(--iw-shadow)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Productos / Servicios</p>
              {form.items.map((item, i) => (
                <div key={i} style={{ background: 'var(--iw-surface-alt)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="text" value={item.productName}
                      onChange={e => updateItem(i, 'productName', e.target.value)}
                      placeholder="Nombre del producto *"
                      style={{ flex: 1, border: '1px solid var(--iw-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '16px', outline: 'none', background: 'var(--iw-input-bg)', color: 'var(--iw-text)', boxSizing: 'border-box' }} />
                    {form.items.length > 1 && (
                      <button onClick={() => removeItem(i)} style={{ color: '#f87171', flexShrink: 0 }}><X size={16} /></button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ width: '70px' }}>
                      <p style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Cant.</p>
                      <input type="number" value={item.quantity} min={1}
                        onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                        style={{ width: '100%', border: '1px solid var(--iw-border)', borderRadius: '10px', padding: '8px', fontSize: '16px', outline: 'none', background: 'var(--iw-input-bg)', color: 'var(--iw-text)', textAlign: 'center', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Precio USD</p>
                      <input type="number" value={item.price}
                        onChange={e => updateItem(i, 'price', e.target.value)}
                        placeholder="0"
                        style={{ width: '100%', border: '1px solid var(--iw-border)', borderRadius: '10px', padding: '8px 12px', fontSize: '16px', outline: 'none', background: 'var(--iw-input-bg)', color: 'var(--iw-text)', boxSizing: 'border-box' }} />
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#e5007d', flexShrink: 0, paddingBottom: '6px' }}>
                      ${((parseFloat(item.price) || 0) * item.quantity).toFixed(2)} USD
                    </p>
                  </div>
                </div>
              ))}
              <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e5007d', fontSize: '13px', fontWeight: 600, background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer' }}>
                <Plus size={14} /> Agregar producto
              </button>
            </div>

            <div style={{ background: 'var(--iw-surface)', borderRadius: '16px', padding: '16px', boxShadow: 'var(--iw-shadow)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado del pago</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {([
                  { value: 'pending', label: 'Pendiente', color: '#f59e0b' },
                  { value: 'partial', label: 'Parcial', color: '#3b82f6' },
                  { value: 'approved', label: 'Pagado', color: '#22c55e' },
                ] as const).map(opt => (
                  <button key={opt.value}
                    onClick={() => setForm({ ...form, paymentStatus: opt.value })}
                    style={{ padding: '12px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, border: `2px solid ${form.paymentStatus === opt.value ? opt.color : 'var(--iw-border)'}`, background: form.paymentStatus === opt.value ? opt.color + '25' : 'var(--iw-input-bg)', color: form.paymentStatus === opt.value ? opt.color : 'var(--iw-text-muted)', cursor: 'pointer' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {form.paymentStatus === 'partial' && (
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Monto pagado (USD)</p>
                  <input type="number" value={form.amountPaid}
                    onChange={e => setForm({ ...form, amountPaid: e.target.value })}
                    placeholder="0"
                    style={{ width: '100%', border: '1px solid var(--iw-border)', borderRadius: '12px', padding: '12px 16px', fontSize: '16px', outline: 'none', boxSizing: 'border-box', background: 'var(--iw-input-bg)', color: 'var(--iw-text)' }} />
                  {form.amountPaid && (
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      Restante: ${(total - parseFloat(form.amountPaid || '0')).toFixed(2)} USD
                    </p>
                  )}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--iw-surface)', borderRadius: '16px', padding: '16px', boxShadow: 'var(--iw-shadow)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Código de referido (opcional)</p>
              <select
                value={form.referralCode ?? ''}
                onChange={e => setForm({ ...form, referralCode: e.target.value })}
                style={{ width: '100%', border: '1px solid var(--iw-border)', borderRadius: '12px', padding: '12px 16px', fontSize: '16px', outline: 'none', background: 'var(--iw-input-bg)', color: 'var(--iw-text)', boxSizing: 'border-box' }}
              >
                <option value="">Sin código de referido</option>
                {(activeCosplayers as any[]).filter(c => c.referralCode).map(c => (
                  <option key={c.id} value={c.referralCode}>
                    {c.artisticName} — {c.referralCode}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ background: 'var(--iw-surface)', borderRadius: '16px', padding: '16px', boxShadow: 'var(--iw-shadow)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Notas</p>
              <textarea value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3} placeholder="Instrucciones especiales..."
                style={{ width: '100%', border: '1px solid var(--iw-border)', borderRadius: '12px', padding: '12px 16px', fontSize: '16px', outline: 'none', resize: 'none', background: 'var(--iw-input-bg)', color: 'var(--iw-text)', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ background: 'var(--iw-surface)', borderRadius: '16px', padding: '16px', boxShadow: 'var(--iw-shadow)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: '12px' }}>Cliente</p>
              <p style={{ fontWeight: 900, color: '#111', marginBottom: '2px' }}>{form.customerName}</p>
              <p style={{ fontSize: '13px', color: '#999' }}>{form.customerEmail}</p>
              {form.customerPhone && <p style={{ fontSize: '13px', color: '#999' }}>{form.customerPhone}</p>}
            </div>

            <div style={{ background: 'var(--iw-surface)', borderRadius: '16px', padding: '16px', boxShadow: 'var(--iw-shadow)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: '12px' }}>Productos</p>
              {form.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', marginBottom: '10px', borderBottom: i < form.items.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>{item.productName}</p>
                    <p style={{ fontSize: '12px', color: '#999' }}>×{item.quantity}</p>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 900, color: '#e5007d' }}>
                    ${((parseFloat(item.price) || 0) * item.quantity).toFixed(2)} USD
                  </p>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '2px solid var(--iw-border)', marginTop: '4px' }}>
                <p style={{ fontWeight: 700, color: '#111' }}>Total</p>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#e5007d' }}>${total.toFixed(2)} USD</p>
              </div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Mail size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '12px', color: '#1d4ed8', lineHeight: '1.5' }}>
                Se enviará confirmación a <strong>{form.customerEmail}</strong>
              </p>
            </div>
          </>
        )}

      </div>

      {/* Botones fijos abajo */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--iw-surface)', borderTop: '1px solid var(--iw-border)', padding: '10px 16px', paddingBottom: 'env(safe-area-inset-bottom, 0px)', display: 'flex', gap: '8px' }}>
        {step === 1 ? (
          <button onClick={() => setStep(2)} disabled={!isStep1Valid}
            style={{ flex: 1, background: isStep1Valid ? '#e5007d' : 'var(--iw-border)', color: 'white', border: 'none', borderRadius: '14px', padding: '15px', minHeight: '52px', fontSize: '15px', fontWeight: 900, cursor: isStep1Valid ? 'pointer' : 'not-allowed' }}>
            Revisar pedido
          </button>
        ) : (
          <>
            <button onClick={() => setStep(1)}
              style={{ flex: 1, background: 'var(--iw-surface)', border: '2px solid var(--iw-border)', borderRadius: '16px', padding: '16px', fontSize: '14px', fontWeight: 700, color: 'var(--iw-text-muted)', cursor: 'pointer' }}>
              Editar
            </button>
            <button
              onClick={() => createOrder.mutate({
                customerName: form.customerName,
                customerEmail: form.customerEmail,
                customerPhone: form.customerPhone,
                userId: findUser.data?.id,
                items: form.items,
                total: String(total),
                notes: form.notes,
                paymentStatus: form.paymentStatus,
                amountPaid: form.amountPaid || '0',
                referralCode: form.referralCode || undefined,
              })}
              disabled={createOrder.isPending}
              style={{ flex: 2, background: '#e5007d', color: 'white', border: 'none', borderRadius: '16px', padding: '16px', fontSize: '15px', fontWeight: 900, cursor: createOrder.isPending ? 'not-allowed' : 'pointer', opacity: createOrder.isPending ? 0.6 : 1 }}>
              {createOrder.isPending ? 'Creando...' : 'Crear pedido'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}




// ============ FINANZAS ============
/**
 * Historial de transacciones y resumen de dinero. Responde a la pregunta
 * "¿cuánto me entró y qué falta por cobrar?", que antes no tenía respuesta
 * en el panel: solo existía un total de ingresos sin detalle.
 */
function FinanzasSection() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [filtro, setFiltro] = useState<'all' | 'verifying' | 'approved' | 'pending'>('all');

  const habilitado = isAuthenticated && user?.role === 'admin';
  const { data: resumen } = trpc.finance.summary.useQuery(undefined, { enabled: habilitado });
  const { data: tx = [] } = trpc.finance.transactions.useQuery({ estado: filtro }, { enabled: habilitado });

  const { data: abonosPend = [] } = trpc.orders.abonosPendientes.useQuery(undefined, { enabled: habilitado });
  const aprobarAb = trpc.orders.aprobarAbono.useMutation({
    onSuccess: (r) => {
      utils.orders.abonosPendientes.invalidate();
      utils.finance.summary.invalidate();
      utils.finance.transactions.invalidate();
      toast.success(r.completo ? 'Pedido cobrado por completo' : `Abono aprobado · Saldo: $${r.saldo.toFixed(2)}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const rechazarAb = trpc.orders.rechazarAbono.useMutation({
    onSuccess: () => { utils.orders.abonosPendientes.invalidate(); toast.success('Abono rechazado'); },
  });

  const borrarTx = trpc.orders.delete.useMutation({
    onSuccess: () => {
      utils.finance.summary.invalidate();
      utils.finance.transactions.invalidate();
      toast.success('Transacción eliminada');
    },
    onError: (e) => toast.error(e.message),
  });

  const [abonoPara, setAbonoPara] = useState<number | null>(null);
  const [abonoMonto, setAbonoMonto] = useState('');
  const abonar = trpc.orders.registrarAbono.useMutation({
    onSuccess: (r) => {
      utils.finance.summary.invalidate();
      utils.finance.transactions.invalidate();
      setAbonoPara(null);
      setAbonoMonto('');
      toast.success(r.completo ? 'Pedido cobrado por completo' : `Abono registrado · Saldo: $${r.saldo.toFixed(2)}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const confirmar = trpc.orders.verifyPayment.useMutation({
    onSuccess: () => {
      utils.finance.summary.invalidate();
      utils.finance.transactions.invalidate();
      toast.success('Pago confirmado');
    },
    onError: (e) => toast.error(e.message),
  });

  const tarjetas = [
    { label: 'Cobrado', valor: resumen?.cobrado ?? 0, color: 'text-green-500' },
    { label: 'Por verificar', valor: resumen?.porVerificar ?? 0, color: 'text-[#d9a400]' },
    { label: 'Pendiente', valor: resumen?.pendiente ?? 0, color: 'text-[var(--iw-text-muted)]' },
    { label: 'Abonos', valor: resumen?.parcial ?? 0, color: 'text-[#1a6fbd]' },
  ];

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {tarjetas.map(c => (
          <div key={c.label} className="rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-3">
            <p className="text-xs text-[var(--iw-text-muted)]">{c.label}</p>
            <p className={`mt-0.5 text-base font-black tabular-nums leading-tight ${c.color}`} style={{ overflowWrap: "anywhere" }}>${c.valor.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Abonos que subió el cliente */}
      {(abonosPend as any[]).length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-[var(--iw-text)]">
            Abonos por verificar ({(abonosPend as any[]).length})
          </p>
          {(abonosPend as any[]).map((a: any) => (
            <div key={a.id} className="rounded-2xl border border-[#d9a400]/50 bg-[#d9a400]/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-[var(--iw-text-muted)]">{a.orderNumber}</p>
                  <p className="text-sm font-bold text-[var(--iw-text)] truncate">{a.customerName}</p>
                  <p className="text-[11px] text-[var(--iw-text-muted)]">
                    {new Date(a.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-[var(--iw-text)]">${parseFloat(a.amount).toFixed(2)}</p>
                  <p className="text-[10px] text-[var(--iw-text-muted)]">de ${parseFloat(a.total).toFixed(2)}</p>
                </div>
              </div>

              {a.receiptUrl && (
                <a href={a.receiptUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-3">
                  {a.receiptUrl.toLowerCase().endsWith('.pdf') ? (
                    <span className="text-xs font-bold text-[#e5007d]">Ver comprobante (PDF)</span>
                  ) : (
                    <img src={a.receiptUrl} alt="Comprobante" className="h-20 w-20 rounded-xl border border-[var(--iw-border)] object-cover" />
                  )}
                </a>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { if (confirm('¿Rechazar este abono?')) rechazarAb.mutate({ id: a.id }); }}
                  className="flex-1 rounded-xl border border-red-500/40 text-xs font-bold text-red-500"
                  style={{ minHeight: 44 }}
                >
                  Rechazar
                </button>
                <button
                  onClick={() => aprobarAb.mutate({ id: a.id })}
                  disabled={aprobarAb.isPending}
                  className="flex-1 rounded-xl bg-[#e5007d] text-xs font-bold text-white disabled:opacity-50"
                  style={{ minHeight: 44 }}
                >
                  Aprobar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(resumen?.cantidadPorVerificar ?? 0) > 0 && (
        <div className="rounded-2xl border border-[#d9a400]/40 bg-[#d9a400]/10 p-3">
          <p className="text-sm font-bold text-[var(--iw-text)]">
            {resumen?.cantidadPorVerificar} pago(s) esperando verificación
          </p>
          <p className="mt-0.5 text-xs text-[var(--iw-text-muted)]">
            Hasta que los confirmes no cuentan como ingreso.
          </p>
        </div>
      )}

      {/* Filtro como desplegable: cuatro pastillas ocupaban dos líneas y se
          veían apretadas en pantalla estrecha. El <select> nativo además abre
          la rueda del sistema, que es más cómoda con el pulgar. */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select
            value={filtro}
            onChange={e => setFiltro(e.target.value as any)}
            className="w-full appearance-none rounded-xl border border-[var(--iw-border)] bg-[var(--iw-surface)] pl-4 pr-10 text-sm font-bold text-[var(--iw-text)] outline-none focus:border-[#e5007d]"
            style={{ minHeight: 48 }}
          >
            <option value="all">Todas las transacciones</option>
            <option value="verifying">Por verificar</option>
            <option value="approved">Cobradas</option>
            <option value="pending">Pendientes</option>
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--iw-text-muted)]"
          />
        </div>
        <span className="shrink-0 text-xs text-[var(--iw-text-muted)]">
          {(tx as any[]).length}
        </span>
      </div>

      {(tx as any[]).length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--iw-text-muted)]">No hay transacciones en este filtro.</p>
      ) : (
        (tx as any[]).map((t: any) => (
          <div key={t.id} className="rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] text-[var(--iw-text-muted)]">{t.orderNumber}</span>
                  {t.esCotizacion && (
                    <span className="rounded-full bg-[#e5007d]/15 px-2 py-0.5 text-[9px] font-bold text-[#e5007d]">Cotización</span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    t.paymentStatus === 'approved' ? 'bg-green-500/15 text-green-500'
                    : t.paymentStatus === 'verifying' ? 'bg-yellow-500/15 text-[#d9a400]'
                    : 'bg-[var(--iw-border)] text-[var(--iw-text-muted)]'
                  }`}>
                    {t.paymentStatus === 'approved' ? 'Cobrado' : t.paymentStatus === 'verifying' ? 'Por verificar' : 'Pendiente'}
                  </span>
                </div>
                <p className="text-sm font-bold text-[var(--iw-text)] truncate">{t.customerName}</p>
                <p className="text-[11px] text-[var(--iw-text-muted)]">
                  {new Date(t.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-black text-[var(--iw-text)]">${parseFloat(t.total).toFixed(2)}</p>
                {(() => {
                  const pagado = parseFloat(t.amountPaid ?? '0');
                  const resta = Math.round((parseFloat(t.total) - pagado) * 100) / 100;
                  if (pagado <= 0 || resta <= 0.01) return null;
                  return (
                    <p className="mt-0.5 text-[10px] font-bold text-[#d9a400]">
                      Debe ${resta.toFixed(2)}
                    </p>
                  );
                })()}
              </div>
            </div>

            {t.receiptUrl ? (
              <div className="border-t border-[var(--iw-border)] pt-3">
                <a href={t.receiptUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3">
                  {t.receiptUrl.toLowerCase().endsWith('.pdf') ? (
                    <span className="text-xs font-bold text-[#e5007d]">Ver comprobante (PDF)</span>
                  ) : (
                    <>
                      <img src={t.receiptUrl} alt="Comprobante" className="h-20 w-20 rounded-xl border border-[var(--iw-border)] object-cover" />
                      <span className="text-xs font-bold text-[#e5007d]">Ver completo</span>
                    </>
                  )}
                </a>
                {t.receiptHolder && (
                  <p className="mt-2 text-xs text-[var(--iw-text-muted)]">Titular: <strong>{t.receiptHolder}</strong></p>
                )}
                {t.paymentStatus === 'verifying' && (
                  <button
                    onClick={() => confirmar.mutate({ orderId: t.id, approved: true })}
                    disabled={confirmar.isPending}
                    className="mt-3 w-full rounded-xl bg-[#e5007d] text-sm font-bold text-white"
                    style={{ minHeight: 46 }}
                  >
                    {(() => {
                      const pagado = parseFloat(t.amountPaid ?? '0');
                      const esAbono = pagado > 0 && pagado < parseFloat(t.total) - 0.01;
                      return esAbono ? `Confirmar abono de $${pagado.toFixed(2)}` : 'Confirmar pago';
                    })()}
                  </button>
                )}
              </div>
            ) : (
              <p className="border-t border-[var(--iw-border)] pt-3 text-xs text-[var(--iw-text-muted)]">Sin comprobante</p>
            )}

            {/* Eliminar transacción de prueba */}
            <button
              onClick={() => {
                if (confirm(`¿Eliminar ${t.orderNumber}? Deja de contar en los totales.`)) {
                  borrarTx.mutate({ id: t.id });
                }
              }}
              className="mt-3 text-[11px] font-bold text-red-400"
            >
              Eliminar esta transacción
            </button>

            {/* Registrar abono cuando queda saldo pendiente */}
            {(() => {
              const pagado = parseFloat(t.amountPaid ?? '0');
              const saldo = Math.round((parseFloat(t.total) - pagado) * 100) / 100;
              if (saldo <= 0.01 || t.status === 'cancelled') return null;
              return (
                <div className="mt-3 border-t border-[var(--iw-border)] pt-3">
                  {abonoPara === t.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        autoFocus
                        inputMode="decimal"
                        value={abonoMonto}
                        onChange={e => setAbonoMonto(e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder={`Abono recibido (saldo $${saldo.toFixed(2)})`}
                        className="w-full rounded-xl border border-[var(--iw-border)] bg-[var(--iw-input-bg)] px-4 text-[var(--iw-text)] outline-none focus:border-[#e5007d]"
                        style={{ minHeight: 46 }}
                      />
                      <button
                        onClick={() => setAbonoMonto(saldo.toFixed(2))}
                        className="rounded-xl border border-[var(--iw-border)] text-xs font-bold text-[var(--iw-text-muted)]"
                        style={{ minHeight: 42 }}
                      >
                        Pagó todo el saldo (${saldo.toFixed(2)})
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setAbonoPara(null); setAbonoMonto(''); }}
                          className="flex-1 rounded-xl border border-[var(--iw-border)] text-xs font-bold text-[var(--iw-text-muted)]"
                          style={{ minHeight: 44 }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => abonar.mutate({ orderId: t.id, monto: parseFloat(abonoMonto || '0') })}
                          disabled={!parseFloat(abonoMonto || '0') || abonar.isPending}
                          className="flex-1 rounded-xl bg-[#e5007d] text-xs font-bold text-white disabled:opacity-40"
                          style={{ minHeight: 44 }}
                        >
                          Registrar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAbonoPara(t.id); setAbonoMonto(''); }}
                      className="w-full rounded-xl border border-[var(--iw-border)] text-xs font-bold text-[var(--iw-text-muted)]"
                      style={{ minHeight: 44 }}
                    >
                      Registrar abono · Saldo ${saldo.toFixed(2)}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        ))
      )}
    </div>
  );
}

// ============ TASA DEL DÍA ============
/**
 * Tasa Bs/USD. Es lo que se le muestra al cliente en el popup de Pago Móvil,
 * así que conviene poder cambiarla desde el teléfono: es un dato que se
 * actualiza a diario y casi nunca estás frente a la computadora.
 */
function TasaSection() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: settings } = trpc.settings.getAll.useQuery();
  const [valor, setValor] = useState<string | null>(null);

  const guardar = trpc.settings.upsert.useMutation({
    onSuccess: () => { utils.settings.getAll.invalidate(); },
    onError: () => toast.error('No se pudo guardar'),
  });

  const actual = settings?.['bs_rate'] ?? '';
  const enPantalla = valor ?? actual;
  const actualizada = settings?.['bs_rate_updated'];

  const aplicar = async (nuevo: string) => {
    await guardar.mutateAsync({ key: 'bs_rate', value: nuevo });
    await guardar.mutateAsync({ key: 'bs_rate_updated', value: nuevo ? new Date().toISOString() : '' });
    toast.success(nuevo ? 'Tasa actualizada' : 'Tasa desactivada');
    setValor(null);
  };

  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-4">
        <p className="text-sm font-bold text-[var(--iw-text)] mb-1">Bolívares por 1 USD</p>
        <p className="text-xs text-[var(--iw-text-muted)] mb-3">
          Se muestra en el popup de Pago Móvil para que el cliente sepa cuánto transferir.
          Los pedidos se siguen guardando en dólares.
        </p>

        <input
          type="text"
          inputMode="decimal"
          value={enPantalla}
          onChange={e => setValor(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="36.50"
          className="w-full rounded-xl border border-[var(--iw-border)] bg-[var(--iw-input-bg)] px-4 text-[var(--iw-text)] outline-none focus:border-[#e5007d]"
          style={{ minHeight: 52, fontSize: 20, fontWeight: 800 }}
        />

        <button
          onClick={() => aplicar(enPantalla.trim())}
          disabled={guardar.isPending || enPantalla.trim() === actual}
          className="mt-3 w-full rounded-xl bg-[#e5007d] text-white font-bold text-sm disabled:bg-[var(--iw-border)] disabled:text-[var(--iw-text-muted)]"
          style={{ minHeight: 52, WebkitTapHighlightColor: 'transparent' }}
        >
          {guardar.isPending ? 'Guardando...' : 'Guardar tasa'}
        </button>

        {actual && (
          <>
            <p className="mt-3 text-xs text-[var(--iw-text-muted)]">
              Tasa activa: <strong className="text-[#e5007d]">Bs {parseFloat(actual).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong> por USD
              {actualizada && (
                <> · actualizada el {new Date(actualizada).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</>
              )}
            </p>
            <button
              onClick={() => { if (confirm('¿Quitar la tasa? Dejará de mostrarse el monto en bolívares.')) aplicar(''); }}
              className="mt-2 text-xs font-bold text-red-500"
            >
              Quitar tasa
            </button>
          </>
        )}
      </div>

      {/* Cálculo rápido: comprobar cuánto es un monto concreto */}
      {actual && (
        <div className="rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-4">
          <p className="text-sm font-bold text-[var(--iw-text)] mb-2">Equivalencias</p>
          <div className="flex flex-col gap-1.5">
            {[5, 10, 25, 50, 100].map(usd => (
              <div key={usd} className="flex items-center justify-between text-sm">
                <span className="text-[var(--iw-text-muted)]">${usd} USD</span>
                <span className="font-bold text-[var(--iw-text)]">
                  Bs {(usd * parseFloat(actual)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SUSCRIPTORES ============
function SubscribersSection() {
  const [filtro, setFiltro] = useState<'all' | 'worldfest' | 'newsletter'>('all');
  const { data: subs = [] } = trpc.subscribers.list.useQuery(filtro === 'all' ? {} : { source: filtro });

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <select
            value={filtro}
            onChange={e => setFiltro(e.target.value as any)}
            className="w-full appearance-none rounded-xl border border-[var(--iw-border)] bg-[var(--iw-surface)] pl-4 pr-10 text-sm font-bold text-[var(--iw-text)] outline-none focus:border-[#e5007d]"
            style={{ minHeight: 48 }}
          >
            <option value="all">Todos los correos</option>
            <option value="worldfest">World Fest</option>
            <option value="newsletter">Newsletter</option>
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--iw-text-muted)]" />
        </div>
        <span className="shrink-0 text-xs text-[var(--iw-text-muted)]">{(subs as any[]).length}</span>
      </div>

      {(subs as any[]).length === 0 ? (
        <p className="text-center text-[#999] text-sm py-12">Todavía no hay correos registrados.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e5e5e5] divide-y divide-[#f0f0f0] overflow-hidden">
          {(subs as any[]).map((sub: any) => (
            <div key={sub.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#111] truncate">{sub.email}</p>
                <p className="text-xs text-[#999]">
                  {new Date(sub.createdAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
              <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                sub.source === 'worldfest' ? 'bg-[#5db4ff]/15 text-[#1a6fbd]' : 'bg-[#f0f0f0] text-[#666]'
              }`}>
                {sub.source === 'worldfest' ? 'World Fest' : 'News'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/**
 * A qué sección del panel móvil lleva cada notificación al tocarla.
 * Las entregas de misiones llegan como "new_user" pero traen el enlace de la
 * publicación en el cuerpo: por ahí se distinguen.
 */
function destinoNotificacion(n: { type: string; body: string; title?: string }): {
  tab: string | null; sub?: string; buscar?: string; label: string;
} {
  switch (n.type) {
    case 'new_order': {
      const orden = n.body.match(/[A-Z]{2,4}-[A-Z0-9-]+/i)?.[0];
      return { tab: 'orders', buscar: orden, label: 'Ver el pedido' };
    }
    case 'new_subscriber':
      return { tab: 'subscribers', label: 'Ver suscriptores' };
    case 'new_user': {
      if (/https?:\/\//.test(n.body)) {
        return { tab: 'cosplay', sub: 'evaluations', label: 'Revisar entrega' };
      }
      if (/comentó en el blog/i.test(n.title ?? '')) {
        return { tab: 'comments', label: 'Moderar comentario' };
      }
      return { tab: 'users', label: 'Ver usuarios' };
    }
    default:
      return { tab: null, label: 'Abrir' };
  }
}


// ============ COMENTARIOS DEL BLOG ============
function CommentsSection() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [filtro, setFiltro] = useState<'pending' | 'approved' | 'all'>('pending');

  const { data: comentarios = [] } = trpc.blog.getAllComments.useQuery(
    { status: filtro === 'all' ? undefined : filtro },
    { enabled: isAuthenticated && user?.role === 'admin' },
  );

  const moderar = trpc.blog.updateCommentStatus.useMutation({
    onSuccess: (_d, vars: any) => {
      utils.blog.getAllComments.invalidate();
      toast.success(vars.status === 'approved' ? 'Comentario publicado' : 'Comentario rechazado');
    },
    onError: () => toast.error('No se pudo moderar'),
  });

  const borrar = trpc.blog.deleteComment.useMutation({
    onSuccess: () => { utils.blog.getAllComments.invalidate(); toast.success('Comentario eliminado'); },
    onError: () => toast.error('No se pudo eliminar'),
  });

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <select
            value={filtro}
            onChange={e => setFiltro(e.target.value as any)}
            className="w-full appearance-none rounded-xl border border-[var(--iw-border)] bg-[var(--iw-surface)] pl-4 pr-10 text-sm font-bold text-[var(--iw-text)] outline-none focus:border-[#e5007d]"
            style={{ minHeight: 48 }}
          >
            <option value="pending">Pendientes de revisar</option>
            <option value="approved">Publicados</option>
            <option value="all">Todos</option>
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--iw-text-muted)]" />
        </div>
        <span className="shrink-0 text-xs text-[var(--iw-text-muted)]">{(comentarios as any[]).length}</span>
      </div>

      {(comentarios as any[]).length === 0 ? (
        <p className="text-center text-[#999] text-sm py-12">
          {filtro === 'pending' ? 'No hay comentarios por revisar.' : 'No hay comentarios.'}
        </p>
      ) : (
        (comentarios as any[]).map((c: any) => (
          <div key={c.id} className="rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111] truncate">{c.guestName ?? 'Anónimo'}</p>
                <p className="text-[11px] text-[#999]">
                  {new Date(c.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                c.status === 'approved' ? 'bg-green-500/15 text-green-500'
                : c.status === 'rejected' ? 'bg-red-500/15 text-red-500'
                : 'bg-yellow-500/15 text-yellow-600'
              }`}>
                {c.status === 'approved' ? 'Publicado' : c.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
              </span>
            </div>

            <p className="text-sm text-[#666] leading-relaxed" style={{ overflowWrap: 'anywhere' }}>
              {c.content}
            </p>

            <div className="mt-3 flex gap-2">
              {c.status !== 'approved' && (
                <button
                  onClick={() => moderar.mutate({ id: c.id, status: 'approved' })}
                  className="flex-1 rounded-xl bg-[#e5007d] text-white text-xs font-bold transition-transform active:scale-95"
                  style={{ minHeight: 44 }}
                >
                  Publicar
                </button>
              )}
              {c.status !== 'rejected' && (
                <button
                  onClick={() => moderar.mutate({ id: c.id, status: 'rejected' })}
                  className="flex-1 rounded-xl border border-[var(--iw-border)] text-[#999] text-xs font-bold"
                  style={{ minHeight: 44 }}
                >
                  Rechazar
                </button>
              )}
              <button
                onClick={() => { if (confirm('¿Eliminar este comentario?')) borrar.mutate({ id: c.id }); }}
                className="rounded-xl border border-red-500/30 px-4 text-red-500"
                style={{ minHeight: 44 }}
                aria-label="Eliminar"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ============ COMPONENTE PRINCIPAL ============


export default function AdminMobile() {
  const [activeTab, setActiveTab] = useState<MobileTab>('stats');
  const utils = trpc.useUtils();
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
  // Adónde saltar tras tocar una notificación (lo consumen las secciones)
  const marcarLeida = trpc.notifications.markRead.useMutation({
    onSuccess: () => { utils.notifications.getAll.invalidate(); utils.notifications.unreadCount.invalidate(); },
  });
  const [cosplayJumpTo, setCosplayJumpTo] = useState<string | null>(null);
  const [orderJumpTo, setOrderJumpTo] = useState<string | null>(null);
  const [cosplayHasModal, setCosplayHasModal] = useState(false);
  const [productsHasModal, setProductsHasModal] = useState(false);
  const [blogHasModal, setBlogHasModal] = useState(false);
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
  const hasModalOpen = cosplayHasModal || productsHasModal || blogHasModal || showNotifications;

  const TABS = [
    { id: 'stats' as MobileTab,    label: 'Inicio',    icon: BarChart3 },
    { id: 'orders' as MobileTab,   label: 'Pedidos',   icon: ShoppingBag },
    { id: 'finanzas' as MobileTab, label: 'Finanzas',  icon: CreditCard,  badge: pendingPaymentsCount },
    { id: 'cosplay' as MobileTab,  label: 'Cosplay',   icon: Sparkles,    badge: (pendingCosplay as any[]).length },
    { id: 'products' as MobileTab, label: 'Productos', icon: Package },
    { id: 'more' as MobileTab,     label: 'Más',       icon: Menu },
  ];

  const EXTRA_TABS = ['categories', 'faq', 'users', 'blog', 'popups', 'newOrder'];
  const isExtraTab = EXTRA_TABS.includes(activeTab);
  const EXTRA_TITLES: Record<string, string> = {
    categories: 'Categorías', faq: 'FAQ', users: 'Usuarios', blog: 'Blog', popups: 'Popups',
    subscribers: 'Suscriptores', comments: 'Comentarios', quotes: 'Cotizaciones', tasa: 'Tasa del día', finanzas: 'Finanzas', newOrder: 'Nuevo pedido',
  };
  const SECTION_TITLES: Record<MobileTab, string> = {
    stats: 'Resumen', orders: 'Pedidos', payments: 'Pagos pendientes',
    cosplay: 'Cosplay Guild', products: 'Productos', more: 'Más',
    categories: 'Categorías', faq: 'FAQ', users: 'Usuarios', blog: 'Blog', popups: 'Popups',
    subscribers: 'Suscriptores', comments: 'Comentarios', quotes: 'Cotizaciones', tasa: 'Tasa del día', finanzas: 'Finanzas', newOrder: 'Nuevo pedido',
  };

  return (
    <div className="admin-shell flex flex-col bg-[#f8f8f8]"
      style={{ height: '100dvh', paddingTop: activeTab === 'newOrder' ? 0 : 'env(safe-area-inset-top)' }}>

      {/* Header */}
      {activeTab !== 'newOrder' && <div className="bg-white border-b border-[#e5e5e5] px-4 flex items-center justify-between flex-shrink-0"
        style={{ height: '52px' }}>
        <div className="flex items-center gap-2">
          {isExtraTab ? (
            <button onClick={() => setActiveTab(activeTab === 'newOrder' ? 'orders' : 'more')} className="p-1 -ml-1">
              <ArrowLeft size={20} className="text-[#111]" />
            </button>
          ) : (
            <div className="w-7 h-7 bg-[#0d0d0d] rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">IW</span>
            </div>
          )}
          {/* El nombre de la sección solo se muestra en las pantallas que se
              abren desde "Más": en las de la barra inferior ya está indicado
              abajo y repetirlo arriba es ruido. */}
          {isExtraTab && (
            <span className="font-black text-[#111] text-sm">
              {EXTRA_TITLES[activeTab]}
            </span>
          )}
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
      </div>}

      {/* Contenido */}
      <PullToRefresh
        onRefresh={() => utils.invalidate()}
        className={`flex-1 ${activeTab === 'newOrder' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}
      >
        {activeTab === 'stats'    && <StatsSection />}
        {activeTab === 'orders'   && <OrdersSection jumpTo={orderJumpTo} onJumpDone={() => setOrderJumpTo(null)} onCreateOrder={() => setActiveTab('newOrder')} />}
        {activeTab === 'payments' && <PaymentsSection />}
        {activeTab === 'cosplay'     && <CosplaySection jumpTo={cosplayJumpTo} onJumpDone={() => setCosplayJumpTo(null)} onModalChange={setCosplayHasModal} />}
        {activeTab === 'products'    && <ProductsSection onModalChange={setProductsHasModal} />}
        {activeTab === 'more'        && <MoreSection onLogout={logout} onNavigate={setActiveTab} />}
        {activeTab === 'categories'  && <CategoriesSection />}
        {activeTab === 'faq'         && <FAQSection />}
        {activeTab === 'users'       && <UsersSection />}
        {activeTab === 'blog'        && <BlogSection onModalChange={setBlogHasModal} />}
        {activeTab === 'subscribers' && <SubscribersSection />}
        {activeTab === 'comments'    && <CommentsSection />}
        {activeTab === 'quotes'      && <QuotesSection />}
        {activeTab === 'tasa'        && <TasaSection />}
        {activeTab === 'finanzas'    && <FinanzasSection />}
        {activeTab === 'popups'      && <div className="p-4 text-center text-[#999] text-sm pt-16">Usa el panel de escritorio para gestionar los popups.</div>}
        {activeTab === 'newOrder'    && <NewOrderSection onBack={() => setActiveTab('orders')} onSuccess={() => setActiveTab('orders')} />}
      </PullToRefresh>

      {/* Modal notificaciones */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end">
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
              {(notifications as any[]).map((n: any) => {
                const destino = destinoNotificacion(n);
                return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) marcarLeida.mutate({ id: n.id });
                    setShowNotifications(false);
                    if (destino.tab) setActiveTab(destino.tab as MobileTab);
                    if (destino.sub) setCosplayJumpTo(destino.sub);
                    if (destino.buscar) setOrderJumpTo(destino.buscar);
                  }}
                  className={`w-full text-left px-4 py-3 transition-colors active:bg-[#f5f5f5] ${!n.read ? 'bg-[#fff8fc]' : ''}`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-[#e5007d]' : 'bg-[#e5e5e5]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111]">{n.title}</p>
                      <p className="text-xs text-[#999] mt-0.5" style={{ overflowWrap: 'anywhere' }}>{n.body}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <p className="text-[10px] text-[#ccc]">
                          {new Date(n.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <span className="text-[10px] font-bold text-[#e5007d]">· {destino.label}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[#ccc] mt-1 flex-shrink-0" />
                  </div>
                </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      {!hasModalOpen && activeTab !== 'newOrder' && (
      <div className="border-t flex-shrink-0"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          backgroundColor: 'var(--iw-surface)',
          borderColor: 'var(--iw-border)',
          zIndex: hasModalOpen ? -1 : 'auto' as any,
        }}>
        <div className="flex">
          {TABS.map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center relative transition-transform active:scale-95 select-none"
              style={{ minHeight: 56, WebkitTapHighlightColor: 'transparent' }}
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
      )}
    </div>
  );
}
