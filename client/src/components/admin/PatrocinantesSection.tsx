import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Image as ImageIcon, Loader2, MousePointerClick, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import MediaPickerModal from "./MediaPickerModal";
import { COLORES, EstadoVacio, confirmar } from "./ui";

/**
 * Patrocinantes del World Fest: los banners que rotan en la zona del cazador.
 * Se sube la imagen, se pone el enlace de la marca, se ordenan y se ve
 * cuántas veces se mostró y se tocó cada uno.
 */

type Borrador = { id?: number; nombre: string; imagenUrl: string; enlace: string; activo: boolean };
const VACIO: Borrador = { nombre: "", imagenUrl: "", enlace: "", activo: true };

export default function PatrocinantesSection() {
  const utils = trpc.useUtils();
  const { data = [], isLoading } = trpc.patrocinantes.todos.useQuery();
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [picker, setPicker] = useState(false);

  const refrescar = () => { void utils.patrocinantes.todos.invalidate(); void utils.patrocinantes.publicos.invalidate(); };
  const guardar = trpc.patrocinantes.guardar.useMutation({
    onSuccess: () => { toast.success("Patrocinante guardado"); setBorrador(null); refrescar(); },
    onError: e => toast.error(e.message),
  });
  const borrar = trpc.patrocinantes.borrar.useMutation({ onSuccess: () => { toast.success("Eliminado"); refrescar(); } });
  const ordenar = trpc.patrocinantes.ordenar.useMutation({ onSuccess: refrescar });
  const reiniciar = trpc.patrocinantes.reiniciar.useMutation({ onSuccess: () => { toast.success("Estadísticas en cero"); refrescar(); } });
  const alternar = trpc.patrocinantes.guardar.useMutation({ onSuccess: refrescar, onError: e => toast.error(e.message) });

  const mover = (i: number, d: -1 | 1) => {
    const ids = data.map(p => p.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    ordenar.mutate({ ids });
  };

  const enviar = () => {
    if (!borrador) return;
    if (!borrador.nombre.trim()) return toast.error("Ponle el nombre de la marca");
    if (!borrador.imagenUrl) return toast.error("Sube o elige la imagen del banner");
    if (borrador.enlace && !/^https:\/\//i.test(borrador.enlace)) return toast.error("El enlace debe empezar con https://");
    guardar.mutate({ ...borrador, enlace: borrador.enlace || null });
  };

  const totalVistas = data.reduce((a, p) => a + p.vistas, 0);
  const totalClics = data.reduce((a, p) => a + p.clics, 0);

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#8a8494]">
          {data.filter(p => p.activo).length} activos · {totalVistas.toLocaleString()} vistas · {totalClics.toLocaleString()} toques
        </p>
        <button
          onClick={() => setBorrador({ ...VACIO })}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold"
          style={{ background: "#e5007d", color: "#fff" }}
        >
          <Plus size={14} /> Nuevo patrocinante
        </button>
      </div>

      <p className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-[#a39cad]">
        Los banners rotan en la zona del cazador (<strong className="text-white">/worldfest/pass</strong>), arriba en «Mi rango» y entre las misiones.
        Tamaño ideal de la imagen: <strong className="text-white">1200 × 500 px</strong> (horizontal), con el logo y el mensaje en el centro.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a8494]" /></div>
      ) : data.length === 0 ? (
        <EstadoVacio icono={ImageIcon} texto="Todavía no hay patrocinantes. Agrega el primero con su banner." />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((p, i) => {
            const ctr = p.vistas > 0 ? ((p.clics / p.vistas) * 100).toFixed(1) : "0.0";
            return (
              <div key={p.id} className={`flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.02] p-3 sm:flex-row sm:items-center ${p.activo ? "" : "opacity-55"}`}>
                <img src={p.imagenUrl} alt={p.nombre} className="aspect-[12/5] w-full rounded-2xl bg-black object-cover sm:w-48" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{p.nombre}</p>
                  <p className="truncate text-xs text-[#8a8494]">{p.enlace || "Sin enlace"}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1" style={{ color: COLORES.azul }}><Eye size={12} /> {p.vistas.toLocaleString()} vistas</span>
                    <span className="inline-flex items-center gap-1" style={{ color: COLORES.verde }}><MousePointerClick size={12} /> {p.clics.toLocaleString()} toques</span>
                    <span className="text-[#8a8494]">{ctr}% de toques</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button onClick={() => mover(i, -1)} disabled={i === 0} className="rounded-full border border-white/10 p-2 text-[#bdbdbd] disabled:opacity-30" aria-label="Subir"><ArrowUp size={14} /></button>
                  <button onClick={() => mover(i, 1)} disabled={i === data.length - 1} className="rounded-full border border-white/10 p-2 text-[#bdbdbd] disabled:opacity-30" aria-label="Bajar"><ArrowDown size={14} /></button>
                  <button
                    onClick={() => alternar.mutate({ id: p.id, nombre: p.nombre, imagenUrl: p.imagenUrl, enlace: p.enlace, activo: !p.activo })}
                    className="rounded-full border border-white/10 p-2 text-[#bdbdbd]" aria-label={p.activo ? "Ocultar" : "Mostrar"} title={p.activo ? "Ocultar" : "Mostrar"}
                  >
                    {p.activo ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => setBorrador({ id: p.id, nombre: p.nombre, imagenUrl: p.imagenUrl, enlace: p.enlace ?? "", activo: p.activo })} className="rounded-full border border-white/10 px-3.5 py-2 text-xs font-bold text-white">Editar</button>
                  <button
                    onClick={async () => { if (await confirmar({ titulo: "Poner en cero", mensaje: `Las vistas y toques de «${p.nombre}» vuelven a 0.`, confirmar: "Poner en cero" })) reiniciar.mutate({ id: p.id }); }}
                    className="rounded-full border border-white/10 p-2 text-[#bdbdbd]" aria-label="Reiniciar estadísticas" title="Reiniciar estadísticas"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={async () => { if (await confirmar({ titulo: "Eliminar patrocinante", mensaje: `Se quitará «${p.nombre}» del carrusel.`, confirmar: "Eliminar", peligro: true })) borrar.mutate({ id: p.id }); }}
                    className="rounded-full border border-white/10 p-2 text-[#f87171]" aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulario (sin role="dialog": el tema oscuro le pone fondo sólido) */}
      {borrador && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" style={{ background: "rgba(0,0,0,0.72)" }} onClick={() => setBorrador(null)}>
          <div
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl"
            style={{ background: "#0d0b12", border: "1px solid rgba(229,0,125,0.4)", paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-bold text-white">{borrador.id ? "Editar patrocinante" : "Nuevo patrocinante"}</p>
              <button onClick={() => setBorrador(null)} className="p-1.5 text-[#bdbdbd]" aria-label="Cerrar"><X size={18} /></button>
            </div>

            <label className="ui-etq mb-1.5 block text-[#a39cad]">Banner</label>
            {borrador.imagenUrl ? (
              <div className="relative mb-4">
                <img src={borrador.imagenUrl} alt="" className="aspect-[12/5] w-full rounded-2xl bg-black object-cover" />
                <button onClick={() => setBorrador({ ...borrador, imagenUrl: "" })} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white" aria-label="Quitar imagen"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setPicker(true)} className="mb-4 flex aspect-[12/5] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 text-sm text-[#a39cad]">
                <ImageIcon size={22} /> Subir o elegir imagen (1200 × 500)
              </button>
            )}

            <label className="ui-etq mb-1.5 block text-[#a39cad]">Marca</label>
            <input
              value={borrador.nombre}
              onChange={e => setBorrador({ ...borrador, nombre: e.target.value })}
              maxLength={120}
              placeholder="Nombre del patrocinante"
              className="mb-4 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-[16px] text-white outline-none focus:border-[#e5007d]"
            />
            <label className="ui-etq mb-1.5 block text-[#a39cad]">Enlace al tocar el banner (opcional)</label>
            <input
              value={borrador.enlace}
              onChange={e => setBorrador({ ...borrador, enlace: e.target.value.trim() })}
              maxLength={500}
              inputMode="url"
              autoCapitalize="none"
              placeholder="https://instagram.com/marca"
              className="mb-4 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-[16px] text-white outline-none focus:border-[#e5007d]"
            />
            <label className="mb-5 flex items-center gap-2 text-sm text-white">
              <input type="checkbox" checked={borrador.activo} onChange={e => setBorrador({ ...borrador, activo: e.target.checked })} className="h-4 w-4 accent-[#e5007d]" />
              Mostrar en el carrusel
            </label>

            <button
              onClick={enviar}
              disabled={guardar.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold disabled:opacity-60"
              style={{ background: "#e5007d", color: "#fff" }}
            >
              {guardar.isPending && <Loader2 size={15} className="animate-spin" />} Guardar
            </button>
          </div>
        </div>
      )}
      {picker && <MediaPickerModal onPick={item => { if (borrador) setBorrador({ ...borrador, imagenUrl: item.url }); setPicker(false); }} onClose={() => setPicker(false)} />}
    </div>
  );
}
