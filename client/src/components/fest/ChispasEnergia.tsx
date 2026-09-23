import { useEffect, useRef } from "react";
import { motion, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { modoLigero } from "@/lib/gamaBaja";

/**
 * Chispas de metal en la punta de la línea de energía de los rangos.
 *
 * Mientras la línea avanza (al hacer scroll), la punta se pone al rojo vivo
 * y suelta trazos blancos, amarillos y naranjas que salen disparados y caen
 * con gravedad, como una amoladora sobre metal. Al detenerse, se enfría.
 *
 * Las chispas se crean fuera de React (se borran solas) para no provocar
 * renders en cada cuadro del scroll.
 */
const COLORES = ["#ffffff", "#fff4c2", "#fde047", "#fb923c", "#f97316"];

export default function ChispasEnergia({ progreso }: { progreso: MotionValue<number> }) {
  const pistaRef = useRef<HTMLDivElement>(null);
  const puntaRef = useRef<HTMLSpanElement>(null);
  const reducir = useReducedMotion();
  const top = useTransform(progreso, v => `${Math.max(0, Math.min(1, v)) * 100}%`);

  useEffect(() => {
    if (reducir) return;
    let ultimo = 0;
    let previo = progreso.get();
    let enfriar: number | undefined;

    const alCambiar = (v: number) => {
      const pista = pistaRef.current;
      const punta = puntaRef.current;
      if (!pista || !punta) return;
      const delta = Math.abs(v - previo);
      previo = v;
      if (v <= 0.01 || v >= 0.995 || delta < 0.0003) return;

      // La punta se calienta mientras hay movimiento
      punta.classList.add("ev2-punta-caliente");
      window.clearTimeout(enfriar);
      enfriar = window.setTimeout(() => punta.classList.remove("ev2-punta-caliente"), 260);

      const ahora = performance.now();
      if (ahora - ultimo < (modoLigero() ? 80 : 40)) return;
      ultimo = ahora;

      const y = v * pista.clientHeight;
      // Más movimiento, más chispas
      const n = Math.min(modoLigero() ? 3 : 7, 2 + Math.round(delta * 900));
      for (let i = 0; i < n; i++) {
        const derecha = Math.random() < 0.55;
        const grados = derecha ? -75 + Math.random() * 95 : 160 + Math.random() * 95;
        const rad = (grados * Math.PI) / 180;
        const dist = 18 + Math.random() * 46;
        const dx = Math.cos(rad) * dist;
        const dy = Math.sin(rad) * dist;
        const largo = 5 + Math.random() * 9;
        const color = COLORES[Math.floor(Math.random() * COLORES.length)];

        const c = document.createElement("span");
        c.className = "ev2-chispa-metal";
        c.style.top = `${y}px`;
        c.style.width = `${largo}px`;
        c.style.background = `linear-gradient(90deg, transparent, ${color})`;
        c.style.color = color;
        c.style.setProperty("--dx", `${dx}px`);
        c.style.setProperty("--dy", `${dy}px`);
        c.style.setProperty("--caida", `${22 + Math.random() * 38}px`);
        c.style.setProperty("--ang", `${grados}deg`);
        c.style.animationDuration = `${0.42 + Math.random() * 0.35}s`;
        pista.appendChild(c);
        window.setTimeout(() => c.remove(), 800);
      }
    };

    const quitar = progreso.on("change", alCambiar);
    return () => {
      quitar();
      window.clearTimeout(enfriar);
    };
  }, [progreso, reducir]);

  return (
    <div
      ref={pistaRef}
      className="pointer-events-none absolute bottom-3 left-2 top-3 z-10 w-[2px] sm:left-3"
      aria-hidden="true"
    >
      <motion.span ref={puntaRef} className="ev2-punta" style={{ top }} />
    </div>
  );
}
