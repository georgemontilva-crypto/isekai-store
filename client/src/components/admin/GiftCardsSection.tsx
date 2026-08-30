import { useState } from 'react';
import { Plus, Download, Copy, Trash2, Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { descargarTarjeta } from '@/lib/giftCardImage';

/**
 * Tarjetas de regalo — versión de teléfono.
 *
 * Permite crearlas y descargar su imagen para enviarla al cliente, que es lo
 * que se hace sobre la marcha: alguien pide una tarjeta y la quieres mandar
 * por WhatsApp en ese momento.
 */
export default function GiftCardsSection() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const habilitado = isAuthenticated && user?.role === 'admin';

  const { data: tarjetas = [] } = trpc.giftCards.list.useQuery(undefined, { enabled: habilitado });
  const { data: settings } = trpc.settings.getAll.useQuery();
  const plantilla = settings?.['giftcard_template'];

  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    discountType: 'fixed' as 'fixed' | 'percent',
    discountPercent: '',
    maxUses: 1,
    expiresInDays: 90,
    quantity: 1,
  });

  const crear = trpc.giftCards.create.useMutation({
    onSuccess: () => {
      utils.giftCards.list.invalidate();
      setAbierto(false);
      setForm({ amount: '', discountType: 'fixed', discountPercent: '', maxUses: 1, expiresInDays: 90, quantity: 1 });
      toast.success('Tarjeta creada');
    },
    onError: (e) => toast.error(e.message),
  });

  const borrar = trpc.giftCards.delete.useMutation({
    onSuccess: () => { utils.giftCards.list.invalidate(); toast.success('Tarjeta eliminada'); },
    onError: (e) => toast.error(e.message),
  });

  const descargar = async (card: any) => {
    try {
      await descargarTarjeta(card, plantilla);
      toast.success('Imagen descargada');
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo generar la imagen');
    }
  };

  const copiar = async (codigo: string) => {
    try { await navigator.clipboard.writeText(codigo); toast.success('Código copiado'); }
    catch { prompt('Copia el código:', codigo); }
  };

  const campo = 'w-full rounded-xl border border-[var(--iw-border)] bg-[var(--iw-input-bg)] px-4 text-[var(--iw-text)] outline-none focus:border-[#e5007d]';
  const alto = { minHeight: 48 };

  const esPorcentaje = form.discountType === 'percent';
  const valido = esPorcentaje
    ? parseFloat(form.discountPercent || '0') > 0
    : parseFloat(form.amount || '0') > 0;

  if (!habilitado) return null;

  return (
    <div className="p-4 flex flex-col gap-3">
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e5007d] text-sm font-bold text-white transition-transform active:scale-[0.98]"
        style={{ minHeight: 52, WebkitTapHighlightColor: 'transparent' }}
      >
        <Plus size={16} /> {abierto ? 'Cerrar' : 'Nueva tarjeta'}
      </button>

      {abierto && (
        <div className="rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-4 flex flex-col gap-3">
          {/* Tipo de tarjeta */}
          <div className="grid grid-cols-2 gap-2">
            {([['fixed', 'Monto fijo'], ['percent', 'Porcentaje']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setForm(f => ({ ...f, discountType: id }))}
                className={`rounded-xl text-xs font-bold transition-colors ${
                  form.discountType === id
                    ? 'bg-[#e5007d] text-white'
                    : 'border border-[var(--iw-border)] bg-[var(--iw-input-bg)] text-[var(--iw-text-muted)]'
                }`}
                style={{ minHeight: 46 }}
              >
                {label}
              </button>
            ))}
          </div>

          {esPorcentaje ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--iw-text-muted)]">
                Porcentaje de descuento
              </label>
              <input
                inputMode="decimal"
                value={form.discountPercent}
                onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value.replace(/[^0-9.]/g, '') }))}
                placeholder="Ej: 20"
                className={campo}
                style={alto}
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--iw-text-muted)]">
                Monto en dólares
              </label>
              <input
                inputMode="decimal"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, '') }))}
                placeholder="Ej: 20.00"
                className={campo}
                style={alto}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--iw-text-muted)]">Usos</label>
              <input
                type="number" inputMode="numeric" min={1}
                value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: parseInt(e.target.value) || 1 }))}
                className={campo} style={alto}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--iw-text-muted)]">Vence (días)</label>
              <input
                type="number" inputMode="numeric" min={1}
                value={form.expiresInDays}
                onChange={e => setForm(f => ({ ...f, expiresInDays: parseInt(e.target.value) || 90 }))}
                className={campo} style={alto}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--iw-text-muted)]">
              Cuántas tarjetas crear
            </label>
            <input
              type="number" inputMode="numeric" min={1} max={50}
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)) }))}
              className={campo} style={alto}
            />
          </div>

          <button
            onClick={() => crear.mutate({
              amount: esPorcentaje ? '0' : form.amount,
              discountType: form.discountType,
              discountPercent: esPorcentaje ? form.discountPercent : undefined,
              maxUses: form.maxUses,
              expiresAt: new Date(Date.now() + form.expiresInDays * 86400000).toISOString(),
              quantity: form.quantity,
            } as any)}
            disabled={!valido || crear.isPending}
            className="w-full rounded-xl bg-[#e5007d] text-sm font-bold text-white disabled:bg-[var(--iw-border)] disabled:text-[var(--iw-text-muted)]"
            style={{ minHeight: 52 }}
          >
            {crear.isPending ? 'Creando...' : `Crear ${form.quantity > 1 ? form.quantity + ' tarjetas' : 'tarjeta'}`}
          </button>
        </div>
      )}

      {/* Listado */}
      {(tarjetas as any[]).length === 0 ? (
        <div className="py-12 text-center">
          <Gift size={32} className="mx-auto mb-3 text-[var(--iw-border)]" />
          <p className="text-sm text-[var(--iw-text-muted)]">Todavía no hay tarjetas de regalo.</p>
        </div>
      ) : (
        (tarjetas as any[]).map((c: any) => {
          const porcentaje = c.discountType === 'percent';
          const usada = (c.currentUses ?? 0) >= (c.maxUses ?? 1);
          return (
            <div
              key={c.id}
              className={`rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-4 ${usada ? 'opacity-55' : ''}`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-black tracking-wider text-[#e5007d]" style={{ overflowWrap: 'anywhere' }}>
                    {c.code}
                  </p>
                  <p className="mt-1 text-xs text-[var(--iw-text-muted)]">
                    {c.currentUses ?? 0}/{c.maxUses ?? 1} usos
                    {c.expiresAt && ` · vence ${new Date(c.expiresAt).toLocaleDateString('es-VE')}`}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-black text-[var(--iw-text)]">
                  {porcentaje
                    ? `${parseFloat(c.discountPercent ?? '0').toFixed(0)}%`
                    : `$${parseFloat(c.amount).toFixed(2)}`}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => descargar(c)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#e5007d] text-xs font-bold text-white"
                  style={{ minHeight: 44 }}
                >
                  <Download size={14} /> Descargar
                </button>
                <button
                  onClick={() => copiar(c.code)}
                  className="flex items-center justify-center rounded-xl border border-[var(--iw-border)] px-4 text-[var(--iw-text-muted)]"
                  style={{ minHeight: 44 }}
                  aria-label="Copiar código"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => { if (confirm(`¿Eliminar la tarjeta ${c.code}?`)) borrar.mutate({ id: c.id }); }}
                  className="flex items-center justify-center rounded-xl border border-red-500/30 px-4 text-red-500"
                  style={{ minHeight: 44 }}
                  aria-label="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
