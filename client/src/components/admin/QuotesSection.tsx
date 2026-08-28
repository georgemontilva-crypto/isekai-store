import { useState } from 'react';
import { Plus, Copy, ExternalLink, Trash2, FileText, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

/**
 * Cotizaciones a medida — versión de teléfono.
 *
 * El caso real es este: te escriben por Instagram desde el móvil y quieres
 * responder con el enlace de pago sin tener que ir a la computadora.
 */
export default function QuotesSection() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: quotes = [] } = trpc.quotes.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({
    customerName: '', customerEmail: '', title: '', description: '',
    expiresInDays: 15, depositPercent: 100,
    items: [{ concepto: '', cantidad: 1, precio: '' }],
  });

  const vacio = () => setForm({
    customerName: '', customerEmail: '', title: '', description: '',
    expiresInDays: 15, depositPercent: 100, items: [{ concepto: '', cantidad: 1, precio: '' }],
  });

  const crear = trpc.quotes.create.useMutation({
    onSuccess: async (q: any) => {
      await utils.quotes.list.invalidate();
      setAbierto(false);
      vacio();
      // Se copia el enlace de una vez: es lo primero que vas a querer hacer
      const enlace = `${window.location.origin}/cotizacion/${q?.token}`;
      try {
        await navigator.clipboard.writeText(enlace);
        toast.success('Cotización creada y enlace copiado');
      } catch {
        toast.success('Cotización creada');
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const borrar = trpc.quotes.delete.useMutation({
    onSuccess: () => { utils.quotes.list.invalidate(); toast.success('Cotización eliminada'); },
  });

  const total = form.items.reduce((a, i) => a + (parseFloat(i.precio || '0') * (i.cantidad || 1)), 0);
  const valido = form.title.trim().length > 0 && total > 0;

  const copiar = async (enlace: string) => {
    try { await navigator.clipboard.writeText(enlace); toast.success('Enlace copiado'); }
    catch { prompt('Copia el enlace:', enlace); }
  };

  const campo = 'w-full rounded-xl border border-[var(--iw-border)] bg-[var(--iw-input-bg)] px-4 text-[var(--iw-text)] outline-none focus:border-[#e5007d]';

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Para qué sirve: evita confundirla con el pedido manual */}
      <div className="rounded-2xl border border-[#e5007d]/30 bg-[#e5007d]/5 p-4">
        <p className="text-sm font-bold text-[#e5007d] mb-1">¿Cotización o pedido manual?</p>
        <p className="text-xs leading-relaxed text-[var(--iw-text-muted)]">
          Usa <strong>cotización</strong> cuando la venta aún no ocurre: le mandas el enlace,
          el cliente ve el precio, paga y sube su comprobante.
          Usa <strong>pedido manual</strong> (en Pedidos) para registrar algo que ya se cerró y pagó por fuera.
        </p>
      </div>

      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-center gap-2 bg-[#e5007d] text-white rounded-2xl font-bold text-sm transition-transform active:scale-[0.98]"
        style={{ minHeight: 52, WebkitTapHighlightColor: 'transparent' }}
      >
        <Plus size={16} /> {abierto ? 'Cerrar formulario' : 'Nueva cotización'}
      </button>

      {abierto && (
        <div className="rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--iw-text-muted)] block mb-1">Trabajo *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ej: Casco de Iron Man 1:1"
              className={campo} style={{ minHeight: 48 }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--iw-text-muted)] block mb-1">Descripción</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Materiales, acabado, tiempo estimado..."
              className={`${campo} py-3 resize-y`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-[var(--iw-text-muted)] block mb-1">Cliente</label>
              <input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                className={campo} style={{ minHeight: 48 }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--iw-text-muted)] block mb-1">Vence (días)</label>
              <input type="number" inputMode="numeric" min={1} max={365} value={form.expiresInDays}
                onChange={e => setForm(f => ({ ...f, expiresInDays: parseInt(e.target.value) || 15 }))}
                className={campo} style={{ minHeight: 48 }} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--iw-text-muted)] block mb-1">Correo del cliente</label>
            <input type="email" inputMode="email" value={form.customerEmail}
              onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
              className={campo} style={{ minHeight: 48 }} />
          </div>

          {/* Conceptos */}
          <div>
            <label className="text-xs font-semibold text-[var(--iw-text-muted)] block mb-2">Conceptos</label>
            <div className="flex flex-col gap-2">
              {form.items.map((it, idx) => (
                <div key={idx} className="rounded-xl border border-[var(--iw-border)] p-3 flex flex-col gap-2">
                  <input
                    value={it.concepto} placeholder="Qué se cobra"
                    onChange={e => setForm(f => ({ ...f, items: f.items.map((x, i) => i === idx ? { ...x, concepto: e.target.value } : x) }))}
                    className={campo} style={{ minHeight: 44 }}
                  />
                  <div className="flex gap-2">
                    <div className="w-24">
                      <input type="number" inputMode="numeric" min={1} value={it.cantidad} placeholder="Cant."
                        onChange={e => setForm(f => ({ ...f, items: f.items.map((x, i) => i === idx ? { ...x, cantidad: parseInt(e.target.value) || 1 } : x) }))}
                        className={campo} style={{ minHeight: 44 }} />
                    </div>
                    <div className="flex-1">
                      <input inputMode="decimal" value={it.precio} placeholder="Precio $"
                        onChange={e => setForm(f => ({ ...f, items: f.items.map((x, i) => i === idx ? { ...x, precio: e.target.value.replace(/[^0-9.]/g, '') } : x) }))}
                        className={campo} style={{ minHeight: 44 }} />
                    </div>
                    {form.items.length > 1 && (
                      <button
                        onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                        className="rounded-xl border border-red-500/30 px-4 text-red-500"
                        style={{ minHeight: 44 }} aria-label="Quitar concepto"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, items: [...f.items, { concepto: '', cantidad: 1, precio: '' }] }))}
              className="mt-2 text-xs font-bold text-[#e5007d]"
            >
              + Agregar concepto
            </button>
          </div>

          {/* Abono mínimo para empezar el trabajo */}
          <div className="border-t border-[var(--iw-border)] pt-3">
            <label className="text-xs font-semibold text-[var(--iw-text-muted)] block mb-2">
              ¿Cuánto debe abonar para empezar?
            </label>
            <div className="flex gap-2">
              {[100, 50, 30].map(pct => (
                <button
                  key={pct}
                  onClick={() => setForm(f => ({ ...f, depositPercent: pct }))}
                  className={`flex-1 rounded-xl text-xs font-bold transition-colors ${
                    form.depositPercent === pct ? 'bg-[#e5007d] text-white' : 'bg-[var(--iw-input-bg)] border border-[var(--iw-border)] text-[var(--iw-text-muted)]'
                  }`}
                  style={{ minHeight: 44 }}
                >
                  {pct === 100 ? 'Completo' : `${pct}%`}
                </button>
              ))}
            </div>
            {form.depositPercent < 100 && total > 0 && (
              <p className="mt-2 text-xs text-[var(--iw-text-muted)]">
                Abona ${(total * form.depositPercent / 100).toFixed(2)} · Queda debiendo ${(total * (100 - form.depositPercent) / 100).toFixed(2)}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--iw-border)] pt-3">
            <span className="text-sm text-[var(--iw-text-muted)]">Total</span>
            <span className="text-xl font-black text-[#e5007d]">${total.toFixed(2)} USD</span>
          </div>

          <button
            onClick={() => crear.mutate({
              title: form.title,
              description: form.description || undefined,
              customerName: form.customerName || undefined,
              customerEmail: form.customerEmail || undefined,
              expiresInDays: form.expiresInDays,
              depositPercent: form.depositPercent,
              items: form.items.filter(i => i.concepto && i.precio),
            })}
            disabled={!valido || crear.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#e5007d] text-white font-bold text-sm disabled:bg-[var(--iw-border)] disabled:text-[var(--iw-text-muted)]"
            style={{ minHeight: 52 }}
          >
            {crear.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Crear y copiar enlace
          </button>
        </div>
      )}

      {/* Listado */}
      {(quotes as any[]).length === 0 ? (
        <div className="text-center py-12">
          <FileText size={32} className="mx-auto mb-3 text-[var(--iw-border)]" />
          <p className="text-sm text-[var(--iw-text-muted)]">Todavía no has creado cotizaciones.</p>
        </div>
      ) : (
        (quotes as any[]).map((q: any) => {
          const enlace = `${window.location.origin}/cotizacion/${q.token}`;
          return (
            <div key={q.id} className="rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-[10px] text-[var(--iw-text-muted)]">{q.quoteNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      q.status === 'paid' ? 'bg-green-500/15 text-green-500'
                      : q.status === 'cancelled' ? 'bg-red-500/15 text-red-500'
                      : 'bg-blue-500/15 text-blue-400'
                    }`}>
                      {q.status === 'paid' ? 'Pagada' : q.status === 'cancelled' ? 'Cancelada' : 'Enviada'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[var(--iw-text)] truncate">{q.title}</p>
                  {q.customerName && (
                    <p className="text-xs text-[var(--iw-text-muted)] truncate">{q.customerName}</p>
                  )}
                </div>
                <p className="shrink-0 font-black text-[#e5007d]">${q.total}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => copiar(enlace)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--iw-border)] text-xs font-bold text-[var(--iw-text-muted)] active:scale-95 transition-transform"
                  style={{ minHeight: 44 }}
                >
                  <Copy size={14} /> Copiar enlace
                </button>
                <a
                  href={enlace} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-xl border border-[var(--iw-border)] px-4 text-[var(--iw-text-muted)]"
                  style={{ minHeight: 44 }}
                  aria-label="Ver como cliente"
                >
                  <ExternalLink size={14} />
                </a>
                {q.status !== 'paid' && (
                  <button
                    onClick={() => { if (confirm('¿Eliminar esta cotización?')) borrar.mutate({ id: q.id }); }}
                    className="flex items-center justify-center rounded-xl border border-red-500/30 px-4 text-red-500"
                    style={{ minHeight: 44 }}
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
