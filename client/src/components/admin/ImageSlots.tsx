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
    page: "Global — en todas las páginas",
    slots: [
      { kind: "site", key: "store_logo_url", label: "Logo principal (navbar)",
        where: "Barra superior, sobre fondo claro, en todas las páginas.",
        spec: "PNG transparente, horizontal, ~600 × 160 px." },
      { kind: "site", key: "store_logo_dark_url", label: "Logo oscuro (footer)",
        where: "Pie de página, sobre fondo negro. Si no hay, se usa el principal.",
        spec: "Versión blanca o clara, PNG transparente, ~900 × 240 px." },
    ],
  },
  {
    page: "Inicio — hero principal",
    slots: [
      { kind: "site", key: "hero_slide_1_image", label: "Hero — slide 1",
        where: "Primer slide del carrusel principal de la home.",
        spec: "Horizontal, ~2400 × 1000 px. El texto va a la izquierda." },
      { kind: "site", key: "hero_slide_2_image", label: "Hero — slide 2",
        where: "Segundo slide del carrusel principal.",
        spec: "Horizontal, ~2400 × 1000 px." },
      { kind: "site", key: "hero_slide_3_image", label: "Hero — slide 3",
        where: "Tercer slide del carrusel principal.",
        spec: "Horizontal, ~2400 × 1000 px." },
    ],
  },
  {
    page: "Inicio — resto de secciones",
    slots: [
      { kind: "site", key: "brand_story_image", label: "Filosofía / Brand Story",
        where: "Sección destacada de la home, junto al texto de marca.",
        spec: "Horizontal o cuadrada, ~1200 × 900 px." },
      { kind: "site", key: "sale_banner_1_image", label: "Banner de ofertas 1",
        where: "Slider de ofertas de la home. Solo imagen, sin texto encima.",
        spec: "Horizontal y bajo, ~2400 × 600 px." },
      { kind: "site", key: "sale_banner_2_image", label: "Banner de ofertas 2",
        where: "Segundo banner del slider de ofertas.",
        spec: "Horizontal y bajo, ~2400 × 600 px." },
      { kind: "site", key: "sale_banner_3_image", label: "Banner de ofertas 3",
        where: "Tercer banner del slider de ofertas.",
        spec: "Horizontal y bajo, ~2400 × 600 px." },
      { kind: "content", label: "Imagen de cada categoría",
        where: "Tarjetas de colecciones en la home y en el catálogo.",
        spec: "Cuadrada, ~1000 × 1000 px, con el personaje centrado.",
        goTab: "categories", goLabel: "Categorías" },
    ],
  },
  {
    page: "Producto",
    slots: [
      { kind: "site", key: "product_sidebar_banner_image", label: "Banner lateral de producto",
        where: "Columna izquierda de la ficha de producto, solo en escritorio.",
        spec: "Vertical, ~800 × 1600 px." },
      { kind: "content", label: "Fotos del producto",
        where: "Galería de cada ficha de producto.",
        spec: "Cuadradas, ~1500 × 1500 px. La primera es la portada.",
        goTab: "products", goLabel: "Productos" },
    ],
  },
  {
    page: "Nosotros",
    slots: [
      { kind: "site", key: "nosotros_hero_image", label: "Hero de Nosotros",
        where: "Foto a pantalla completa arriba de la página ¿Quiénes somos?",
        spec: "Horizontal, ~2400 × 1200 px." },
      { kind: "site", key: "nosotros_about_image", label: "Quiénes somos (lateral)",
        where: "Foto del estudio o del proceso de trabajo.",
        spec: "Horizontal o cuadrada, ~1400 × 1000 px." },
      { kind: "site", key: "nosotros_mision_image", label: "Misión / Visión",
        where: "Foto lateral junto a la sección de Misión y Visión.",
        spec: "Vertical o cuadrada, ~1000 × 1200 px." },
      { kind: "site", key: "nosotros_filosofia_image", label: "Filosofía (fondo oscuro)",
        where: "Fondo de la sección de cita, en la página Nosotros.",
        spec: "Horizontal, ~2400 × 900 px. Que sea oscura: lleva texto encima." },
      { kind: "site", key: "nosotros_gallery_1", label: "Galería — foto 1",
        where: "Galería de fotos de la página Nosotros.", spec: "Cuadrada, ~1200 × 1200 px." },
      { kind: "site", key: "nosotros_gallery_2", label: "Galería — foto 2",
        where: "Galería de fotos de la página Nosotros.", spec: "Cuadrada, ~1200 × 1200 px." },
      { kind: "site", key: "nosotros_gallery_3", label: "Galería — foto 3",
        where: "Galería de fotos de la página Nosotros.", spec: "Cuadrada, ~1200 × 1200 px." },
      { kind: "site", key: "nosotros_gallery_4", label: "Galería — foto 4",
        where: "Galería de fotos de la página Nosotros.", spec: "Cuadrada, ~1200 × 1200 px." },
      { kind: "site", key: "nosotros_gallery_5", label: "Galería — foto 5",
        where: "Galería de fotos de la página Nosotros.", spec: "Cuadrada, ~1200 × 1200 px." },
    ],
  },
  {
    page: "Cosplay Guild",
    slots: [
      { kind: "site", key: "cosplay_hero_image", label: "Hero del landing",
        where: "Fondo del hero principal de /cosplay.",
        spec: "Horizontal, ~2400 × 1200 px." },
      { kind: "site", key: "cosplay_cta_image", label: "CTA final",
        where: "Fondo de la sección de llamada a la acción de /cosplay.",
        spec: "Horizontal, ~2400 × 900 px, más bien oscura." },
      { kind: "site", key: "cosplay_guild_banner", label: "Banner del directorio",
        where: "Banner superior de la página /cosplay/guild.",
        spec: "Horizontal, ~2400 × 800 px." },
      { kind: "site", key: "cosplay_apply_banner", label: "Banner de solicitud",
        where: "Cabecera de la página de postulación al Guild.",
        spec: "Horizontal, ~2400 × 800 px." },
    ],
  },
  {
    page: "World Fest",
    slots: [
      { kind: "site", key: "worldfest_hero_image", label: "Fondo del hero",
        where: "Imagen a pantalla completa detrás del título en /world-fest.",
        spec: "Horizontal, ~2400 × 1400 px. Se oscurece y lleva texto encima, así que mejor con zonas despejadas." },
      { kind: "site", key: "worldfest_teaser_image", label: "Imagen del festival",
        where: "Bloque ancho a mitad de la página, debajo de las pistas.",
        spec: "Horizontal, ~2000 × 1100 px." },
    ],
  },
  {
    page: "Invitación (QR)",
    slots: [
      { kind: "site", key: "invitacion_fondo_image", label: "Fondo de toda la página",
        where: "Detrás de todo el contenido de /invitacion, fijo al hacer scroll.",
        spec: "Vertical, ~1440 × 2560 px (9:16). Se muestra al 30% con un velo oscuro encima, así que funciona cualquier imagen; las oscuras y sin texto son las que mejor quedan." },
      { kind: "site", key: "invitacion_hero_image", label: "Fondo de la apertura",
        where: "Detrás del título en la página de invitación (/invitacion).",
        spec: "Vertical u horizontal, ~1600 × 2000 px. Se oscurece bastante: mejor con zonas despejadas." },
      { kind: "site", key: "invitacion_media_image", label: "Imagen intermedia",
        where: "Entre los bloques de texto de la invitación.",
        spec: "Horizontal, ~1800 × 1000 px. Ideal: foto de cosplayers o de un evento." },
      { kind: "site", key: "invitacion_cierre_image", label: "Fondo del cierre",
        where: "Detrás del llamado final a postularse.",
        spec: "Horizontal, ~2000 × 1200 px, preferiblemente oscura." },
    ],
  },
  {
    page: "Link in bio",
    slots: [
      { kind: "site", key: "linkbio_avatar_image", label: "Avatar",
        where: "Foto circular arriba de /linkbio.",
        spec: "Cuadrada, ~600 × 600 px. Se recorta en círculo." },
      { kind: "site", key: "linkbio_banner_image", label: "Banner",
        where: "Franja superior de /linkbio, detrás del avatar.",
        spec: "Horizontal, ~1600 × 600 px." },
      { kind: "site", key: "linkbio_bottom_image", label: "Imagen inferior",
        where: "Al final de /linkbio, debajo de los enlaces.",
        spec: "Horizontal o cuadrada, ~1200 × 1200 px." },
    ],
  },
  {
    page: "FAQ, blog y popups",
    slots: [
      { kind: "site", key: "faq_image", label: "Imagen lateral del FAQ",
        where: "Columna lateral de la página de preguntas frecuentes.",
        spec: "Vertical o cuadrada, ~1000 × 1200 px." },
      { kind: "content", label: "Portada de cada artículo",
        where: "Listado del blog y cabecera del artículo.",
        spec: "Horizontal, ~1600 × 900 px.",
        goTab: "blog", goLabel: "Blog" },
      { kind: "content", label: "Imagen de cada popup",
        where: "Ventana emergente que se muestra al visitante.",
        spec: "Cuadrada o vertical, ~1000 × 1000 px.",
        goTab: "popups", goLabel: "Popups" },
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
