import { useState } from 'react';
import { ChevronRight, Image as ImageIcon, Check, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import MediaPickerModal from './MediaPickerModal';
import { IMAGE_SLOTS } from './ImageSlots';

/**
 * Imágenes y video del sitio — versión de teléfono.
 *
 * Los espacios están agrupados por zona de la web y cada grupo se despliega,
 * porque son más de quince secciones y en una sola lista no se encuentra
 * nada. Dentro de cada espacio se ve la imagen puesta, dónde aparece y qué
 * medidas conviene usar.
 */

/** Los grupos siguen el recorrido de la web, no el orden en que se crearon */
const GRUPOS: { titulo: string; paginas: string[] }[] = [
  {
    titulo: 'Portada del evento',
    paginas: ['Landing del evento', 'Portada del evento', 'World Fest'],
  },
  {
    titulo: 'Tienda',
    paginas: ['Inicio — hero principal', 'Inicio — resto de secciones', 'Producto', 'Aliados comerciales'],
  },
  {
    titulo: 'Comunidad',
    paginas: ['Cosplay Guild', 'Nosotros'],
  },
  {
    titulo: 'Marca y sistema',
    paginas: ['Global — en todas las páginas', 'Pantalla de carga'],
  },
  {
    titulo: 'Otros',
    paginas: ['Tarjetas de regalo', 'Invitación (QR)', 'Link in bio', 'FAQ, blog y popups'],
  },
];

export default function MediaSection() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const habilitado = isAuthenticated && user?.role === 'admin';

  const { data: settings } = trpc.settings.getAll.useQuery();
  const guardar = trpc.settings.upsert.useMutation({
    onSuccess: () => { utils.settings.getAll.invalidate(); toast.success('Imagen actualizada'); },
    onError: (e) => toast.error(e.message),
  });

  const { data: pendientes } = trpc.imagenes.pendientes.useQuery(undefined, { enabled: habilitado });
  const reprocesar = trpc.imagenes.reprocesar.useMutation({
    onSuccess: (r: any) => {
      utils.imagenes.pendientes.invalidate();
      utils.settings.getAll.invalidate();
      toast.success(
        r.reducidas > 0
          ? `${r.reducidas} optimizadas · ${r.ahorroMb} MB ahorrados · quedan ${r.quedan}`
          : "No había nada que reducir en esta tanda",
      );
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [abierto, setAbierto] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState<string | null>(null);

  if (!habilitado) return null;

  const tarjeta = 'ev-notch border border-[var(--iw-border)] bg-[var(--iw-surface)]';

  return (
    <div className="flex flex-col gap-3 p-4">
      {eligiendo && (
        <MediaPickerModal
          onPick={item => {
            guardar.mutate({ key: eligiendo, value: item.url });
            setEligiendo(null);
          }}
          onClose={() => setEligiendo(null)}
        />
      )}

      {/* Reprocesado de lo ya subido: las imágenes antiguas se guardaron al
          tamaño original y pesan de más. */}
      {(pendientes?.pendientes ?? 0) > 0 && (
        <div className="ev-notch border border-[#fbbf24]/30 bg-[#fbbf24]/[0.07] p-4">
          <p className="text-sm font-bold text-[var(--iw-text)]">
            {pendientes!.pendientes} imágenes sin optimizar
          </p>
          <p className="mb-3 mt-1 text-xs leading-relaxed text-[var(--iw-text-muted)]">
            Ocupan {pendientes!.pesoMb} MB y hacen que la web cargue lenta. Se reducen
            de a pocas para no saturar el servidor: puedes tocar varias veces.
          </p>
          <button
            onClick={() => reprocesar.mutate({ tanda: 8 })}
            disabled={reprocesar.isPending}
            className="ev-notch bg-[#fbbf24] px-4 text-xs font-bold text-[#1a1a1a] disabled:opacity-50"
            style={{ minHeight: 44 }}
          >
            {reprocesar.isPending ? "Optimizando..." : "Optimizar 8 imágenes"}
          </button>
        </div>
      )}

      <p className="text-xs leading-relaxed text-[var(--iw-text-muted)]">
        Toca un grupo para ver sus espacios. Cada uno indica dónde aparece en la
        web y qué medidas conviene usar.
      </p>

      {GRUPOS.map(grupo => {
        // Solo los espacios que existen en la configuración
        // Solo los que se suben aquí: los de tipo "content" se gestionan
        // desde su propia sección (productos, blog…)
        const espacios = IMAGE_SLOTS
          .filter(s => grupo.paginas.includes(s.page))
          .flatMap(s => s.slots
            .filter((slot): slot is Extract<typeof slot, { kind: "site" }> => slot.kind === "site")
            .map(slot => ({ ...slot, pagina: s.page })));

        if (espacios.length === 0) return null;
        const puestos = espacios.filter(e => settings?.[e.key]).length;
        const desplegado = abierto === grupo.titulo;

        return (
          <div key={grupo.titulo} className={tarjeta}>
            <button
              onClick={() => setAbierto(desplegado ? null : grupo.titulo)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--iw-text)]">{grupo.titulo}</p>
                <p className="mt-0.5 text-xs text-[var(--iw-text-muted)]">
                  {puestos} de {espacios.length} con imagen
                </p>
              </div>
              <ChevronRight
                size={18}
                className="shrink-0 text-[var(--iw-text-muted)] transition-transform"
                style={{ transform: desplegado ? 'rotate(90deg)' : 'none' }}
              />
            </button>

            {desplegado && (
              <div className="flex flex-col gap-2 border-t border-[var(--iw-border)] p-3">
                {espacios.map(e => {
                  const url = settings?.[e.key];
                  const esVideo = url && /\.(mp4|webm)$/i.test(url);

                  return (
                    <div key={e.key} className="ev-notch flex gap-3 border border-[var(--iw-border)] p-3">
                      <div
                        className="flex shrink-0 items-center justify-center overflow-hidden bg-[var(--iw-input-bg)]"
                        style={{ width: 56, height: 70 }}
                      >
                        {url ? (
                          esVideo ? (
                            <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                          ) : (
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          )
                        ) : (
                          <ImageIcon size={16} className="text-[var(--iw-text-muted)]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-[var(--iw-text)]">{e.label}</p>
                          {url && <Check size={14} className="mt-0.5 shrink-0 text-green-500" />}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--iw-text-muted)]">
                          {e.where}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--iw-text-muted)]">
                          {e.spec}
                        </p>

                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setEligiendo(e.key)}
                            className="ev-notch flex items-center gap-1.5 bg-[#e5007d] px-3 text-[11px] font-bold text-white"
                            style={{ minHeight: 38 }}
                          >
                            <Upload size={12} /> {url ? 'Cambiar' : 'Subir'}
                          </button>
                          {url && (
                            <button
                              onClick={() => {
                                if (confirm(`¿Quitar la imagen de "${e.label}"?`)) {
                                  guardar.mutate({ key: e.key, value: '' });
                                }
                              }}
                              className="ev-notch border border-[var(--iw-border)] px-3 text-[11px] font-bold text-[var(--iw-text-muted)]"
                              style={{ minHeight: 38 }}
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
