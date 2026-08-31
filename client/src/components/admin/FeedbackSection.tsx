import { useState } from 'react';
import { Star, Trash2, MessageSquare, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

/**
 * Sugerencias del Cosplay Guild — vista del dueño.
 *
 * Muestra quién escribió cada mensaje, salvo los enviados de forma anónima,
 * donde no existe el dato. Permite marcar como leído o resuelto y dejar una
 * nota interna para no perder el hilo.
 */
const CATEGORIAS: Record<string, string> = {
  experiencia: 'Experiencia',
  actividades: 'Actividades',
  comunicacion: 'Comunicación',
  pagos: 'Comisiones y pagos',
  eventos: 'Eventos',
  otro: 'Otro',
};

export default function FeedbackSection({ compact = false }: { compact?: boolean }) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const habilitado = isAuthenticated && user?.role === 'admin';

  const [filtro, setFiltro] = useState<'nuevo' | 'leido' | 'resuelto' | 'all'>('nuevo');
  const [notaAbierta, setNotaAbierta] = useState<number | null>(null);
  const [nota, setNota] = useState('');

  const { data: resumen } = trpc.feedback.resumen.useQuery(undefined, { enabled: habilitado });
  const { data: mensajes = [] } = trpc.feedback.listar.useQuery({ estado: filtro }, { enabled: habilitado });

  const actualizar = trpc.feedback.actualizar.useMutation({
    onSuccess: () => {
      utils.feedback.listar.invalidate();
      utils.feedback.resumen.invalidate();
      setNotaAbierta(null);
      setNota('');
    },
    onError: (e) => toast.error(e.message),
  });

  const borrar = trpc.feedback.borrar.useMutation({
    onSuccess: () => {
      utils.feedback.listar.invalidate();
      utils.feedback.resumen.invalidate();
      toast.success('Mensaje eliminado');
    },
  });

  if (!habilitado) return null;

  const tarjeta = 'rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-4';

  return (
    <div className={compact ? 'p-4 flex flex-col gap-3' : 'flex flex-col gap-4'}>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { l: 'Sin leer', v: String(resumen.nuevos), c: 'text-[#e5007d]' },
            { l: 'Total', v: String(resumen.total), c: 'text-[var(--iw-text)]' },
            { l: 'Valoración media', v: resumen.media ? `${resumen.media} / 5` : '—', c: 'text-green-500' },
            { l: 'Anónimos', v: String(resumen.anonimos), c: 'text-[var(--iw-text-muted)]' },
          ].map(c => (
            <div key={c.l} className={tarjeta}>
              <p className="text-[11px] text-[var(--iw-text-muted)]">{c.l}</p>
              <p className={`mt-1 text-base font-black tabular-nums ${c.c}`}>{c.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtro */}
      <div className="flex items-center gap-2">
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value as any)}
          className="flex-1 rounded-xl border border-[var(--iw-border)] bg-[var(--iw-surface)] px-4 text-sm font-bold text-[var(--iw-text)] outline-none focus:border-[#e5007d]"
          style={{ minHeight: 48 }}
        >
          <option value="nuevo">Sin leer</option>
          <option value="leido">Leídos</option>
          <option value="resuelto">Resueltos</option>
          <option value="all">Todos</option>
        </select>
        <span className="shrink-0 text-xs text-[var(--iw-text-muted)]">
          {(mensajes as any[]).length}
        </span>
      </div>

      {/* Mensajes */}
      {(mensajes as any[]).length === 0 ? (
        <div className="py-12 text-center">
          <MessageSquare size={30} className="mx-auto mb-3 text-[var(--iw-border)]" />
          <p className="text-sm text-[var(--iw-text-muted)]">
            {filtro === 'nuevo' ? 'No hay sugerencias sin leer.' : 'No hay mensajes en este filtro.'}
          </p>
        </div>
      ) : (
        (mensajes as any[]).map((m: any) => (
          <div key={m.id} className={tarjeta}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#e5007d]/12 px-2.5 py-0.5 text-[10px] font-bold text-[#e5007d]">
                {CATEGORIAS[m.categoria] ?? m.categoria}
              </span>
              {m.estado === 'nuevo' && (
                <span className="rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-[10px] font-bold text-[#d9a400]">
                  Sin leer
                </span>
              )}
              {m.estado === 'resuelto' && (
                <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[10px] font-bold text-green-500">
                  Resuelto
                </span>
              )}
              {m.valoracion && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--iw-text-muted)]">
                  <Star size={11} className="fill-[#e5007d] text-[#e5007d]" />
                  {m.valoracion}/5
                </span>
              )}
              <span className="ml-auto text-[11px] text-[var(--iw-text-muted)]">
                {new Date(m.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Autor: solo el dueño lo ve, y no existe si fue anónimo */}
            <div className="mb-2.5 flex items-center gap-2">
              {m.anonimo ? (
                <>
                  <EyeOff size={13} className="text-[var(--iw-text-muted)]" />
                  <span className="text-xs italic text-[var(--iw-text-muted)]">Envío anónimo</span>
                </>
              ) : (
                <>
                  {m.autorFoto && (
                    <img src={m.autorFoto} alt="" className="h-6 w-6 rounded-full object-cover" />
                  )}
                  <span className="text-xs font-bold text-[var(--iw-text)]">
                    {m.autorNombre ?? 'Cosplayer'}
                  </span>
                </>
              )}
            </div>

            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--iw-text-muted)]" style={{ overflowWrap: 'anywhere' }}>
              {m.mensaje}
            </p>

            {m.notaInterna && (
              <p className="mt-3 rounded-xl border border-[var(--iw-border)] bg-[var(--iw-input-bg)] p-3 text-xs text-[var(--iw-text-muted)]">
                <strong className="text-[var(--iw-text)]">Nota:</strong> {m.notaInterna}
              </p>
            )}

            {/* Nota interna */}
            {notaAbierta === m.id && (
              <div className="mt-3 flex flex-col gap-2">
                <textarea
                  rows={3}
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder="Nota para ti: qué se hizo con esto"
                  className="w-full rounded-xl border border-[var(--iw-border)] bg-[var(--iw-input-bg)] px-3 py-2.5 text-sm text-[var(--iw-text)] outline-none focus:border-[#e5007d]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setNotaAbierta(null); setNota(''); }}
                    className="flex-1 rounded-xl border border-[var(--iw-border)] text-xs font-bold text-[var(--iw-text-muted)]"
                    style={{ minHeight: 42 }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => actualizar.mutate({ id: m.id, notaInterna: nota })}
                    className="flex-1 rounded-xl bg-[#e5007d] text-xs font-bold text-white"
                    style={{ minHeight: 42 }}
                  >
                    Guardar nota
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--iw-border)] pt-3">
              {m.estado !== 'leido' && (
                <button
                  onClick={() => actualizar.mutate({ id: m.id, estado: 'leido' })}
                  className="rounded-full border border-[var(--iw-border)] px-4 text-xs font-bold text-[var(--iw-text-muted)]"
                  style={{ minHeight: 40 }}
                >
                  Marcar leído
                </button>
              )}
              {m.estado !== 'resuelto' && (
                <button
                  onClick={() => actualizar.mutate({ id: m.id, estado: 'resuelto' })}
                  className="rounded-full bg-[#e5007d] px-4 text-xs font-bold text-white"
                  style={{ minHeight: 40 }}
                >
                  Resuelto
                </button>
              )}
              <button
                onClick={() => { setNotaAbierta(m.id); setNota(m.notaInterna ?? ''); }}
                className="rounded-full border border-[var(--iw-border)] px-4 text-xs font-bold text-[var(--iw-text-muted)]"
                style={{ minHeight: 40 }}
              >
                Nota
              </button>
              <button
                onClick={() => { if (confirm('¿Eliminar este mensaje?')) borrar.mutate({ id: m.id }); }}
                className="ml-auto rounded-full border border-red-500/30 px-3 text-red-500"
                style={{ minHeight: 40 }}
                aria-label="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
