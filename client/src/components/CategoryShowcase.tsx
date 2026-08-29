import { Link } from "wouter";
import { useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Vitrina de categoría — al estilo de la sección "Descubre" de Epic Games.
 *
 * Una imagen grande arriba y, justo debajo, los productos de esa categoría en
 * filas alargadas que se deslizan en horizontal: miniatura a la izquierda,
 * nombre y precio a la derecha. Se ven tres a la vez y el resto se alcanza
 * desplazando.
 *
 * El formato en fila aprovecha mejor el ancho del teléfono que una rejilla de
 * tarjetas: caben más productos legibles en la misma altura.
 */
export default function CategoryShowcase({
  categoryId,
  categorySlug,
  titulo,
  imagen,
  imagenMovil,
  ctaTexto,
  esMovil,
}: {
  categoryId: number;
  categorySlug?: string;
  titulo: string;
  imagen?: string;
  imagenMovil?: string;
  ctaTexto?: string;
  esMovil: boolean;
}) {
  const carril = useRef<HTMLDivElement>(null);

  const { data } = trpc.products.list.useQuery({ categoryId, limit: 9 });
  const productos = data?.items ?? [];

  const desplazar = (dir: "izq" | "der") => {
    const el = carril.current;
    if (!el) return;
    const paso = el.clientWidth * 0.9;
    el.scrollBy({ left: dir === "der" ? paso : -paso, behavior: "smooth" });
  };

  if (productos.length === 0) return null;

  const banner = (esMovil && imagenMovil) ? imagenMovil : imagen;
  const destino = categorySlug ? `/catalog?category=${categorySlug}` : "/catalog";

  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-16 xl:px-24 2xl:px-[233px]">
      <div className="mx-auto w-full">

        {/* Cabecera del carril */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-lg font-black text-white sm:text-xl">{titulo}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => desplazar("izq")}
              aria-label="Anterior"
              className="hidden h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white sm:flex"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => desplazar("der")}
              aria-label="Siguiente"
              className="hidden h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white sm:flex"
            >
              <ChevronRight size={15} />
            </button>
            <Link href={destino} className="flex items-center gap-1.5 text-xs font-bold text-[#ff45a0] transition-colors hover:text-white">
              Ver todo <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Imagen cuadrada a la izquierda y, a su derecha, nueve productos en
            tres columnas de tres. En teléfono la imagen va arriba y los
            productos debajo, deslizables. */}
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">

          {banner && (
            <Link href={destino} className="block shrink-0 lg:w-[360px]">
              <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "1/1" }}>
                <img src={banner} alt={titulo} className="h-full w-full object-cover" />
                {ctaTexto && (
                  <div className="absolute inset-x-0 bottom-0 flex justify-center p-5">
                    <span className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#111] transition-transform hover:scale-105">
                      {ctaTexto}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Columnas de tres productos */}
          <div
            ref={carril}
            className="flex flex-1 gap-5 overflow-x-auto pb-1"
            style={{
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {Array.from({ length: Math.ceil(productos.length / 3) }, (_, bloque) => (
              <div
                key={bloque}
                className="iw-vitrina-col flex shrink-0 flex-col gap-2"
                style={{ scrollSnapAlign: "start" }}
              >
                {productos.slice(bloque * 3, bloque * 3 + 3).map((prod: any) => (
                  <Link
                    key={prod.id}
                    href={`/product/${prod.slug}`}
                    className="group flex items-center gap-4 rounded-xl border border-white/[0.07] p-3 transition-colors hover:border-white/20 hover:bg-white/[0.03]"
                  >
                    <div className="h-[96px] w-[96px] shrink-0 overflow-hidden rounded-lg bg-[#16191f]">
                      {prod.imageUrl && (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-white transition-colors group-hover:text-[#ff45a0]">
                        {prod.name}
                      </p>
                      <p className="mt-1.5 text-sm text-white/60">
                        ${parseFloat(prod.price).toFixed(2)} USD
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
