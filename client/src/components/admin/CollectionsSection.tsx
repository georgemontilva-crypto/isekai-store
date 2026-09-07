import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Layers, Image as ImageIcon, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import MediaPickerModal from './MediaPickerModal';

/**
 * Colecciones de productos — versión de teléfono.
 *
 * Son los "universos" que salen en el carrusel del inicio. Desde aquí se
 * crean, se les pone imagen y se ordena cómo aparecen, sin tener que ir al
 * panel de escritorio.
 */
export default function CollectionsSection() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const habilitado = isAuthenticated && user?.role === 'admin';

  const { data: colecciones = [] } = trpc.categories.list.useQuery();

  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', imageUrl: '' });
  const [editando, setEditando] = useState<any>(null);
  const [pickerPara, setPickerPara] = useState<'nueva' | 'edicion' | null>(null);

  const crear = trpc.categories.create.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      setForm({ name: '', description: '', imageUrl: '' });
      setAbierto(false);
      toast.success('Colección creada');
    },
    onError: (e) => toast.error(e.message),
  });

  const actualizar = trpc.categories.update.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      setEditando(null);
      toast.success('Colección actualizada');
    },
    onError: (e) => toast.error(e.message),
  });

  const borrar = trpc.categories.delete.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); toast.success('Colección eliminada'); },
    onError: (e) => toast.error(e.message),
  });

  const mover = trpc.categories.mover.useMutation({
    onSuccess: () => utils.categories.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  /** El enlace se genera a partir del nombre */
  const aSlug = (t: string) =>
    t.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const campo = 'w-full rounded-xl border border-[var(--iw-border)] bg-[var(--iw-input-bg)] px-4 text-[var(--iw-text)] outline-none focus:border-[#e5007d]';
  const alto = { minHeight: 48 };

  if (!habilitado) return null;

  return (
    <div className="p-4 flex flex-col gap-3">
      {pickerPara && (
        <MediaPickerModal
          onPick={item => {
            if (pickerPara === 'nueva') setForm(f => ({ ...f, imageUrl: item.url }));
            else setEditando((e: any) => ({ ...e, imageUrl: item.url }));
            setPickerPara(null);
          }}
          onClose={() => setPickerPara(null)}
        />
      )}

      <button
        onClick={() => setAbierto(!abierto)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e5007d] text-sm font-bold text-white transition-transform active:scale-[0.98]"
        style={{ minHeight: 52, WebkitTapHighlightColor: 'transparent' }}
      >
        <Plus size={16} /> {abierto ? 'Cerrar' : 'Nueva colección'}
      </button>

      {abierto && (
        <div className="rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-4 flex flex-col gap-3">
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nombre (ej: Marvel)"
            className={campo}
            style={alto}
          />
          <textarea
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Descripción (opcional)"
            className={`${campo} resize-y py-3`}
          />

          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--iw-border)] bg-[var(--iw-input-bg)]"
              style={{ width: 72, height: 90 }}
            >
              {form.imageUrl
                ? <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                : <ImageIcon className="h-5 w-5 text-[var(--iw-text-muted)]" />}
            </div>
            <button
              onClick={() => setPickerPara('nueva')}
              className="rounded-xl border border-[var(--iw-border)] px-4 text-xs font-bold text-[var(--iw-text-muted)]"
              style={{ minHeight: 44 }}
            >
              {form.imageUrl ? 'Cambiar imagen' : 'Elegir imagen'}
            </button>
          </div>

          <button
            onClick={() => crear.mutate({
              name: form.name.trim(),
              slug: aSlug(form.name),
              description: form.description || undefined,
              imageUrl: form.imageUrl || undefined,
            })}
            disabled={!form.name.trim() || crear.isPending}
            className="w-full rounded-xl bg-[#e5007d] text-sm font-bold text-white disabled:opacity-40"
            style={{ minHeight: 52 }}
          >
            {crear.isPending ? 'Creando...' : 'Crear colección'}
          </button>
        </div>
      )}

      {(colecciones as any[]).length === 0 ? (
        <div className="py-12 text-center">
          <Layers size={30} className="mx-auto mb-3 text-[var(--iw-border)]" />
          <p className="text-sm text-[var(--iw-text-muted)]">Todavía no hay colecciones.</p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-[var(--iw-text-muted)]">
            El orden de esta lista es el que se ve en el carrusel del inicio.
          </p>

          {(colecciones as any[]).map((c: any, i: number) => (
            <div key={c.id} className="rounded-2xl border border-[var(--iw-border)] bg-[var(--iw-surface)] p-3.5">
              <div className="flex items-center gap-3">
                {/* Orden en el carrusel */}
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    onClick={() => mover.mutate({ id: c.id, direccion: 'arriba' })}
                    disabled={i === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--iw-border)] text-[var(--iw-text-muted)] disabled:opacity-25"
                    aria-label="Subir"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => mover.mutate({ id: c.id, direccion: 'abajo' })}
                    disabled={i === (colecciones as any[]).length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--iw-border)] text-[var(--iw-text-muted)] disabled:opacity-25"
                    aria-label="Bajar"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div
                  className="shrink-0 overflow-hidden rounded-lg bg-[var(--iw-input-bg)]"
                  style={{ width: 44, height: 56 }}
                >
                  {c.imageUrl
                    ? <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-[var(--iw-text-muted)]" />
                      </div>}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--iw-text)]">{c.name}</p>
                  <p className="truncate text-[11px] text-[var(--iw-text-muted)]">/{c.slug}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditando({ ...c })}
                    className="p-2 text-[var(--iw-text-muted)]"
                    aria-label="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`¿Eliminar "${c.name}"?`)) borrar.mutate({ id: c.id }); }}
                    className="p-2 text-red-400"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Edición en la misma tarjeta */}
              {editando?.id === c.id && (
                <div className="mt-3 flex flex-col gap-2 border-t border-[var(--iw-border)] pt-3">
                  <input
                    value={editando.name}
                    onChange={e => setEditando((f: any) => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre"
                    className={campo}
                    style={alto}
                  />
                  <textarea
                    rows={2}
                    value={editando.description ?? ''}
                    onChange={e => setEditando((f: any) => ({ ...f, description: e.target.value }))}
                    placeholder="Descripción"
                    className={`${campo} resize-y py-3`}
                  />
                  <button
                    onClick={() => setPickerPara('edicion')}
                    className="rounded-xl border border-[var(--iw-border)] text-xs font-bold text-[var(--iw-text-muted)]"
                    style={{ minHeight: 44 }}
                  >
                    Cambiar imagen
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditando(null)}
                      className="flex-1 rounded-xl border border-[var(--iw-border)] text-xs font-bold text-[var(--iw-text-muted)]"
                      style={{ minHeight: 46 }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => actualizar.mutate({
                        id: c.id,
                        name: editando.name?.trim(),
                        description: editando.description ?? undefined,
                        imageUrl: editando.imageUrl ?? undefined,
                      })}
                      disabled={actualizar.isPending}
                      className="flex-1 rounded-xl bg-[#e5007d] text-xs font-bold text-white disabled:opacity-40"
                      style={{ minHeight: 46 }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
