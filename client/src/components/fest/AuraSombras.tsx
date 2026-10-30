import { useEffect, useRef } from "react";

/**
 * Aura del Monarca de las Sombras: humo y llamas violeta-negras que suben
 * desde los pies de la figura, con bordes que brillan en violeta y azul.
 *
 * Un solo <canvas>. Cada «bocanada» nace en la base, sube, se ensancha y se
 * desvanece. Se pausa fuera de pantalla o con la pestaña oculta, usa menos
 * bocanadas en gama baja y queda quieto con «reducir movimiento».
 *
 * `centroX` es la posición horizontal de la figura (0 a 1) y `base` la altura
 * de sus pies (0 arriba, 1 abajo).
 */
export default function AuraSombras({ centroX = 0.5, base = 0.92, ancho = 0.42, ligero = false, className = "" }: {
  centroX?: number; base?: number; ancho?: number; ligero?: boolean; className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const total = ligero ? 34 : 70;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0;

    type B = { x: number; y: number; r: number; vy: number; vx: number; vida: number; max: number; tono: number; borde: boolean };
    let bs: B[] = [];
    const nueva = (avance = 0): B => {
      const max = 140 + Math.random() * 160;
      const b: B = {
        x: w * centroX + (Math.random() - 0.5) * w * ancho * (0.4 + Math.random() * 0.6),
        y: h * base + Math.random() * 20,
        r: 18 + Math.random() * 34,
        vy: 0.9 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 0.5,
        vida: 0,
        max,
        tono: Math.random(),
        // Algunas bocanadas son el «filo» luminoso de la llama
        borde: Math.random() < 0.38,
      };
      for (let i = 0; i < avance; i++) paso1(b);
      return b;
    };
    const paso1 = (b: B) => {
      b.vida++;
      b.y -= b.vy;
      b.x += b.vx + Math.sin((b.vida + b.r) * 0.05) * 0.6;
      // La llama se cierra hacia arriba: las bocanadas tiran al centro
      b.x += (w * centroX - b.x) * 0.004;
      b.r += 0.35;
    };

    const medir = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bs = Array.from({ length: total }, () => nueva(Math.floor(Math.random() * 200)));
    };
    medir();

    const pintar = () => {
      ctx.clearRect(0, 0, w, h);
      // 1) Cuerpo oscuro de la sombra
      ctx.globalCompositeOperation = "source-over";
      for (const b of bs) {
        if (b.borde) continue;
        const t = b.vida / b.max;
        const a = Math.max(0, Math.sin(Math.PI * Math.min(1, t))) * 0.55;
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `rgba(14,6,34,${a})`);
        g.addColorStop(0.6, `rgba(28,10,64,${a * 0.6})`);
        g.addColorStop(1, "rgba(28,10,64,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      }
      // 2) Filo luminoso violeta y azul
      ctx.globalCompositeOperation = "lighter";
      for (const b of bs) {
        if (!b.borde) continue;
        const t = b.vida / b.max;
        const a = Math.max(0, Math.sin(Math.PI * Math.min(1, t))) * 0.22;
        const c = b.tono < 0.65 ? "139,92,246" : b.tono < 0.9 ? "79,195,255" : "229,0,125";
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 0.9);
        g.addColorStop(0, `rgba(${c},${a})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    let raf = 0;
    let visible = true;
    const animar = () => {
      for (let i = 0; i < bs.length; i++) {
        paso1(bs[i]);
        if (bs[i].vida > bs[i].max || bs[i].y + bs[i].r < 0) bs[i] = nueva();
      }
      pintar();
      raf = requestAnimationFrame(animar);
    };
    const arrancar = () => { if (!raf && !reducir && visible && !document.hidden) raf = requestAnimationFrame(animar); };
    const parar = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    if (reducir) pintar(); else arrancar();

    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) arrancar(); else parar(); });
    io.observe(canvas);
    const vis = () => { if (document.hidden) parar(); else arrancar(); };
    document.addEventListener("visibilitychange", vis);
    const ro = new ResizeObserver(() => { medir(); if (reducir) pintar(); });
    ro.observe(canvas);
    return () => { parar(); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, [centroX, base, ancho, ligero]);

  return <canvas ref={ref} className={`pointer-events-none ${className}`} aria-hidden="true" />;
}
