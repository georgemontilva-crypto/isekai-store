import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";

interface Props {
  /** Qué hacer al soltar: normalmente refetch de las consultas de la pantalla */
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
  className?: string;
  /** Cuántos píxeles hay que arrastrar para que dispare */
  threshold?: number;
}

/**
 * Deslizar hacia abajo para recargar, como en una app nativa.
 *
 * Solo actúa cuando el contenedor ya está arriba del todo, para no pelearse
 * con el scroll normal. Se desactiva si el sistema pide menos movimiento.
 */
export default function PullToRefresh({ onRefresh, children, className = "", threshold = 70 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 0 || refreshing) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) { setOffset(0); return; }
      if (el.scrollTop > 0) { pulling.current = false; setOffset(0); return; }
      // Resistencia: cuesta más mientras más se arrastra
      setOffset(Math.min(delta * 0.45, threshold * 1.6));
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (offset >= threshold && !refreshing) {
        setRefreshing(true);
        setOffset(threshold * 0.7);
        try { await onRefresh(); } finally {
          setRefreshing(false);
          setOffset(0);
        }
      } else {
        setOffset(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [offset, refreshing, onRefresh, threshold]);

  const listo = offset >= threshold;

  return (
    <div ref={ref} className={className} style={{ overscrollBehaviorY: "contain" }}>
      {/* Indicador */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: offset }}
      >
        {offset > 8 && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#e5007d]">
            {refreshing ? (
              <><Loader2 size={15} className="animate-spin" /> Actualizando…</>
            ) : (
              <>
                <ArrowDown size={15} className={`transition-transform ${listo ? "rotate-180" : ""}`} />
                {listo ? "Suelta para actualizar" : "Desliza para actualizar"}
              </>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
