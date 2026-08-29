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

  const { data } = trpc.products.list.useQuery({ categoryId, limit: 12 });
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
    <section className="px-4 pb-10 sm:px-5 lg:px-[22px]">
      <div className="mx-auto w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#16191f]">

        {/* Imagen de cabecera */}
        {banner && (
          <Link href={destino} className="block">
            <div
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: esMovil ? "4/3" : "1920/620" }}
            >
              <img src={banner} alt={titulo} className="h-full w-full object-cover" />
              {ctaTexto && (
                <div className="absolute inset-0 flex items-end justify-center pb-7">
                  <span className="rounded-xl bg-white px-7 py-3 text-sm font-bold text-[#111]">
                    {ctaTexto}
                  </span>
                </div>
              )}
            </div>
          </Link>
        )}

        {/* Cabecera del carril */}
        <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
          <h2 className="min-w-0 truncate text-base font-black text-white sm:text-lg">{titulo}</h2>
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

        {/* Productos en filas alargadas.
            Cada columna agrupa tres productos; al deslizar se pasa de bloque
            en bloque, como en la referencia. */}
        <div
          ref={carril}
          className="flex gap-4 overflow-x-auto px-4 py-4 sm:px-5"
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
              className="flex shrink-0 flex-col gap-3.5"
              style={{ scrollSnapAlign: "start", width: "min(100%, 420px)" }}
            >
              {productos.slice(bloque * 3, bloque * 3 + 3).map((p: any) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className="group flex items-center gap-3.5"
                >
                  <div className="h-[74px] w-[58px] shrink-0 overflow-hidden rounded-lg bg-[#0f1216]">
                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-[#ff45a0]">
                      {p.name}
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      ${parseFloat(p.price).toFixed(2)} USD
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
