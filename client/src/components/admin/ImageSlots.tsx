import { useState } from "react";
import { ChevronDown, ImageIcon, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import MediaPickerModal, { type MediaItem } from "./MediaPickerModal";

/**
 * Los espacios de imagen que el sitio realmente dibuja, agrupados POR PÁGINA
 * para que se vea de un golpe a qué pantalla pertenece cada archivo.
 *
 * - "site": vive en siteSettings y se asigna aquí mismo.
 * - "content": pertenece a un registro puntual (un producto, una categoría)
 *   y se asigna desde su propio módulo.
 */

interface SiteSlot {
  kind: "site";
  key: string;
  label: string;
  where: string;
  spec: string;
}

interface ContentSlot {
  kind: "content";
  label: string;
  where: string;
  spec: string;
  goTab: string;
  goLabel: string;
}

type Slot = SiteSlot | ContentSlot;

interface PageGroup {
  page: string;
  slots: Slot[];
}

const PAGES: PageGroup[] = [
  {
    page: "Global — se ve en todas las páginas",
    slots: [
      {
        kind: "site",
        key: "store_logo_url",
        label: "Logo principal (navbar)",
        where: "Barra de navegación superior, sobre fondo claro, en todas las páginas.",
        spec: "PNG con transparencia, horizontal, ~600 × 160 px. Se dibuja al alto que definas en Configuración.",
      },
      {
        kind: "site",
        key: "store_logo_dark_url",
        label: "Logo oscuro (footer)",
        where: "Pie de página, sobre el fondo negro. Si no hay, se usa el logo principal.",
        spec: "Versión blanca o clara del logo, PNG transparente, ~900 × 240 px.",
      },
    ],
  },
  {
    page: "Inicio",
    slots: [
      {
        kind: "site",
        key: "brand_story_image",
        label: "Imagen de Filosofía / Brand Story",
        where: "Sección destacada de la home, junto al texto de la marca.",
        spec: "Horizontal o cuadrada, ~1200 × 900 px.",
      },
      {
        kind: "content",
        label: "Imagen de cada categoría",
        where: "Tarjetas de colecciones en la home y en la página de colecciones.",
        spec: "Cuadrada, ~1000 × 1000 px. El personaje debe ir centrado.",
        goTab: "categories",
        goLabel: "Categorías",
      },
    ],
  },
  {
    page: "Producto",
    slots: [
      {
        kind: "site",
        key: "product_sidebar_banner_image",
        label: "Banner lateral de producto",
        where: "Columna izquierda de la página de producto, solo en escritorio.",
        spec: "Vertical, ~800 × 1600 px. Se recorta a lo alto de la ficha.",
      },
      {
        kind: "content",
        label: "Fotos del producto",
        where: "Galería principal de cada ficha de producto.",
        spec: "Cuadradas, ~1500 × 1500 px, fondo limpio. La primera es la portada.",
        goTab: "products",
        goLabel: "Productos",
      },
    ],
  },
  {
    page: "Link in bio",
    slots: [
      {
        kind: "site",
        key: "linkbio_avatar_image",
        label: "Avatar del Link in bio",
        where: "Foto circular arriba de la página /linkbio.",
        spec: "Cuadrada, ~600 × 600 px. Se recorta en círculo.",
      },
      {
        kind: "site",
        key: "linkbio_banner_image",
        label: "Banner del Link in bio",
        where: "Franja superior de la página /linkbio, detrás del avatar.",
        spec: "Horizontal, ~1600 × 600 px.",
      },
      {
        kind: "site",
        key: "linkbio_bottom_image",
        label: "Imagen inferior del Link in bio",
        where: "Al final de la página /linkbio, debajo de los enlaces.",
        spec: "Horizontal o cuadrada, ~1200 × 1200 px.",
      },
    ],
  },
  {
    page: "Blog y popups",
    slots: [
      {
        kind: "content",
        label: "Portada de cada artículo",
        where: "Listado del blog y cabecera del artículo.",
        spec: "Horizontal, ~1600 × 900 px.",
        goTab: "blog",
        goLabel: "Blog",
      },
      {
        kind: "content",
        label: "Imagen de cada popup",
        where: "Ventana emergente que se muestra al visitante.",
        spec: "Cuadrada o vertical, ~1000 × 1000 px.",
        goTab: "popups",
        goLabel: "Popups",
      },
    ],
  },
];

interface Props {
  /** Cambia de pestaña del admin cuando el espacio pertenece a otro módulo */
  onGoToTab?: (tab: string) => void;
}

export default function ImageSlots({ onGoToTab }: Props) {
  const [open, setOpen] = useState(true);
  const [pickerFor, setPickerFor] = useState<SiteSlot | null>(null);

  const utils = trpc.useUtils();
  const { data: settings } = trpc.settings.getAll.useQuery();
  const upsert = trpc.settings.upsert.useMutation({
    onSuccess: () => { utils.settings.getAll.invalidate(); toast.success("Imagen asignada"); },
    onError: () => toast.error("No se pudo guardar"),
  });

  const assign = (slot: SiteSlot, item: MediaItem | null) => {
    upsert.mutate({ key: slot.key, value: item ? item.url : "" });
    setPickerFor(null);
  };

  return (
    <div className="mb-8">
      <button onClick={() => setOpen(!open)} className="mb-3 flex items-center gap-2 text-left">
        <h3 className="text-lg font-extrabold uppercase tracking-tight">Dónde va cada imagen</h3>
        <ChevronDown className={`h-4 w-4 text-[#888] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <p className="mb-5 max-w-3xl text-[13px] text-[#666]">
            Subir un archivo a la biblioteca no lo publica en ningún lado. Primero súbelo y después
            asígnalo al espacio que le corresponde, aquí abajo.
          </p>

          <div className="space-y-6">
            {PAGES.map(group => (
              <div key={group.page}>
                <div className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-[#999]">
                  {group.page}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.slots.map(slot => {
                    if (slot.kind === "content") {
                      return (
                        <div key={slot.label} className="flex flex-col rounded-xl border border-dashed border-[#dcdcdc] bg-[#fafafa] p-4">
                          <div className="text-[13px] font-extrabold leading-tight">{slot.label}</div>
                          <p className="mt-1.5 text-[11px] text-[#666]">{slot.where}</p>
                          <p className="mt-1 text-[11px] italic text-[#888]">{slot.spec}</p>
                          <button
                            onClick={() => onGoToTab?.(slot.goTab)}
                            className="mt-auto flex items-center justify-center gap-1.5 rounded-full border border-[#ddd] bg-white px-4 py-2.5 pt-2.5 text-[10px] font-bold uppercase tracking-widest text-[#555] transition-colors hover:border-[#111] hover:text-[#111]"
                            style={{ marginTop: "0.75rem" }}
                          >
                            Ir a {slot.goLabel} <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    }

                    const current = settings?.[slot.key] ?? "";
                    const filled = Boolean(current);

                    return (
                      <div key={slot.key} className="flex flex-col rounded-xl border border-[#e8e8ea] bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[13px] font-extrabold leading-tight">{slot.label}</div>
                          <span className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-bold ${
                            filled ? "bg-green-50 text-green-700" : "bg-[#f3f3f3] text-[#8a8a8a]"
                          }`}>
                            {filled ? "ASIGNADA" : "VACÍO"}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-[#666]">{slot.where}</p>
                        <p className="mt-1 text-[11px] italic text-[#888]">{slot.spec}</p>

                        <div className="mt-3 flex h-24 items-center justify-center overflow-hidden rounded-lg border border-[#e8e8ea] bg-[#f6f6f7]">
                          {filled ? (
                            <img src={current} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex items-center gap-1.5 text-[11px] text-[#999]">
                              <ImageIcon className="h-3.5 w-3.5" /> Nada asignado
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setPickerFor(slot)}
                            disabled={upsert.isPending}
                            className="flex-1 rounded-full border border-[#ddd] px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#555] transition-colors hover:border-[#111] hover:text-[#111] disabled:opacity-50"
                          >
                            {filled ? "Reemplazar" : "Elegir archivo"}
                          </button>
                          {filled && (
                            <button
                              onClick={() => assign(slot, null)}
                              className="rounded-full border border-[#e5007d]/30 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#e5007d] transition-colors hover:bg-[#e5007d]/10"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {pickerFor && (
        <MediaPickerModal onPick={item => assign(pickerFor, item)} onClose={() => setPickerFor(null)} />
      )}
    </div>
  );
}
