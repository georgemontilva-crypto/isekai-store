import { useEffect, useRef } from "react";

/**
 * Polvo de maná que sube desde la puerta: partículas azules, violetas y
 * alguna rosa (la marca), con brillo suave. Un solo <canvas>, sin librerías.
 *
 * Se detiene cuando no está en pantalla o la pestaña está oculta, usa la mitad
 * de partículas en teléfonos de gama baja y no se anima con «reducir
 * movimiento» (queda un cuadro quieto).
 */
const COLORES = ["125,216,255", "167,139,250", "79,195,255", "255,95,177"];

export default function ManaParticulas({ cantidad = 46, ligero = false, className = "" }: { cantidad?: number; ligero?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const total = Math.round(cantidad * (ligero ? 0.45 : 1));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;

    type P = { x: number; y: number; r: number; v: number; d: number; a: number; c: string; f: number };
    let ps: P[] = [];
    const nueva = (alAzar: boolean): P => ({
      x: Math.random() * w,
      y: alAzar ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.9,
      v: 0.25 + Math.random() * 0.9,
      d: (Math.random() - 0.5) * 0.35,
      a: 0.25 + Math.random() * 0.75,
      // La rosa aparece poco: es el acento de la marca, no el color base
      c: COLORES[Math.random() < 0.12 ? 3 : Math.floor(Math.random() * 3)],
      f: Math.random() * Math.PI * 2,
    });

    const medir = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ps = Array.from({ length: total }, () => nueva(true));
    };
    medir();

    const pintar = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of ps) {
        const brillo = p.a * (0.6 + 0.4 * Math.sin(p.f));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, `rgba(${p.c},${brillo})`);
        g.addColorStop(1, `rgba(${p.c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let raf = 0;
    let visible = true;
    const paso = () => {
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.y -= p.v;
        p.x += p.d + Math.sin(p.f) * 0.18;
        p.f += 0.03;
        if (p.y < -12) ps[i] = nueva(false);
      }
      pintar();
      raf = requestAnimationFrame(paso);
    };
    const arrancar = () => { if (!raf && !reducir && visible && !document.hidden) raf = requestAnimationFrame(paso); };
    const parar = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    if (reducir) pintar(); else arrancar();

    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) arrancar(); else parar(); });
    io.observe(canvas);
    const vis = () => { if (document.hidden) parar(); else arrancar(); };
    document.addEventListener("visibilitychange", vis);
    const ro = new ResizeObserver(() => { medir(); if (reducir) pintar(); });
    ro.observe(canvas);

    return () => { parar(); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, [cantidad, ligero]);

  return <canvas ref={ref} className={`pointer-events-none ${className}`} aria-hidden="true" />;
}
