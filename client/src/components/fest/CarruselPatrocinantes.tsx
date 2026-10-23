import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Carrusel de patrocinantes: banners horizontales que pasan solos cada pocos
 * segundos y que también se deslizan con el dedo. Cuenta cuándo se ve cada
 * banner y cuándo se toca, para darle resultados a la marca.
 *
 * Si no hay patrocinantes activos no se muestra nada.
 */
const CADA_MS = 5000;

/** Espacios de ejemplo: se ven en la demo mientras no haya marcas cargadas */
const MUESTRAS = [
  { id: -1, nombre: "Tu marca aquí", color: "#e5007d", texto: "Espacio para patrocinantes" },
  { id: -2, nombre: "Banner 1200 × 500", color: "#38bdf8", texto: "Se muestra a todos los cazadores" },
  { id: -3, nombre: "Aliado del evento", color: "#a78bfa", texto: "Pasa solo cada 5 segundos" },
];

export default function CarruselPatrocinantes({ className = "", etiqueta = "Aliados del evento", muestra = false }: { className?: string; etiqueta?: string; muestra?: boolean }) {
  const { data: reales = [] } = trpc.patrocinantes.publicos.useQuery(undefined, { staleTime: 5 * 60_000 });
  const deMuestra = reales.length === 0 && muestra;
  const banners: { id: number; nombre: string; imagenUrl?: string; enlace?: string | null; color?: string; texto?: string }[] = deMuestra ? MUESTRAS : reales;
  const registrar = trpc.patrocinantes.registrar.useMutation();
  const carril = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(0);
  const pausa = useRef(false);
  const vistos = useRef(new Set<number>());

  // Cuál banner está en pantalla, según el desplazamiento del carril
  useEffect(() => {
    const el = carril.current;
    if (!el) return;
    const alMover = () => {
      const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      setActual(Math.max(0, Math.min(banners.length - 1, i)));
    };
    el.addEventListener("scroll", alMover, { passive: true });
    return () => el.removeEventListener("scroll", alMover);
  }, [banners.length]);

  // Pasa solo, salvo que la persona lo esté tocando o no esté a la vista
  useEffect(() => {
    const el = carril.current;
    if (!el || banners.length < 2) return;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.4 });
    io.observe(el);
    const id = window.setInterval(() => {
      if (pausa.current || !visible || document.hidden) return;
      const sig = (Math.round(el.scrollLeft / el.clientWidth) + 1) % banners.length;
      el.scrollTo({ left: sig * el.clientWidth, behavior: "smooth" });
    }, CADA_MS);
    return () => { window.clearInterval(id); io.disconnect(); };
  }, [banners.length]);

  // Vista: cuando el banner está en pantalla al menos la mitad (una vez por carga)
  useEffect(() => {
    const el = carril.current;
    if (!el || banners.length === 0 || deMuestra) return;
    const pendientes: number[] = [];
    let t = 0;
    const io = new IntersectionObserver(entradas => {
      for (const e of entradas) {
        const id = Number((e.target as HTMLElement).dataset.id);
        if (e.isIntersecting && id && !vistos.current.has(id)) {
          vistos.current.add(id);
          pendientes.push(id);
        }
      }
      if (pendientes.length) {
        window.clearTimeout(t);
        t = window.setTimeout(() => registrar.mutate({ tipo: "vista", ids: pendientes.splice(0) }), 1500);
      }
    }, { threshold: 0.6 });
    el.querySelectorAll("[data-id]").forEach(n => io.observe(n));
    return () => {
      io.disconnect();
      window.clearTimeout(t);
      // Si se cambia de pantalla antes de enviarlas, se envían igual
      if (pendientes.length) registrar.mutate({ tipo: "vista", ids: pendientes.splice(0) });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners]);

  if (banners.length === 0) return null;

  const ir = (i: number) => carril.current?.scrollTo({ left: i * carril.current.clientWidth, behavior: "smooth" });

  return (
    <section className={`cp-carrusel ${className}`} aria-roledescription="carrusel" aria-label={etiqueta}>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#5f7f96]">{etiqueta}</p>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#3a5a72]">Patrocinado</p>
      </div>
      <div
        ref={carril}
        className="cp-carril flex snap-x snap-mandatory overflow-x-auto"
        onPointerDown={() => { pausa.current = true; }}
        onPointerUp={() => { window.setTimeout(() => { pausa.current = false; }, 4000); }}
        onMouseEnter={() => { pausa.current = true; }}
        onMouseLeave={() => { pausa.current = false; }}
      >
        {banners.map((b, i) => {
          const img = !b.imagenUrl ? (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-center"
              style={{ background: `radial-gradient(120% 120% at 20% 0%, ${b.color}40, transparent 60%), linear-gradient(135deg, #0a1422, #05070d)`, border: `1px dashed ${b.color}66` }}
            >
              <p className="text-[18px] font-bold text-white">{b.nombre}</p>
              <p className="text-[12px] text-[#9fb4c8]">{b.texto}</p>
            </div>
          ) : (
            <img
              src={b.imagenUrl}
              alt={b.nombre}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className="h-full w-full object-cover"
            />
          );
          return (
            <div key={b.id} data-id={b.id} className="cp-slide relative w-full shrink-0 snap-center" aria-label={`${i + 1} de ${banners.length}: ${b.nombre}`}>
              {b.enlace ? (
                <a
                  href={b.enlace}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  onClick={() => registrar.mutate({ tipo: "clic", ids: [b.id] })}
                  className="block h-full w-full"
                >
                  {img}
                </a>
              ) : img}
            </div>
          );
        })}
      </div>
      {banners.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => ir(i)}
              aria-label={`Ver ${b.nombre}`}
              className="cp-punto"
              data-activo={i === actual ? "1" : "0"}
            />
          ))}
        </div>
      )}
    </section>
  );
}
