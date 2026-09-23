import { useEffect } from "react";

/**
 * Destello de partículas en cada toque o clic de la página.
 *
 * Se dibuja con elementos sueltos fuera de React (se crean y se borran
 * solos) para que tocar rápido no provoque renders. No se activa sobre
 * campos de texto ni con «reducir movimiento».
 */
const COLORES = ["#a78bfa", "#e5007d", "#7dd8ff", "#c4b5fd"];

export default function ToqueParticulas() {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const capa = document.createElement("div");
    capa.className = "ev2-toques";
    capa.setAttribute("aria-hidden", "true");
    document.body.appendChild(capa);

    const alTocar = (ev: PointerEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t?.closest("input, textarea, select")) return;

      const n = 9;
      for (let i = 0; i < n; i++) {
        const p = document.createElement("span");
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
        const dist = 26 + Math.random() * 30;
        p.className = "ev2-toque";
        p.style.left = `${ev.clientX}px`;
        p.style.top = `${ev.clientY}px`;
        p.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
        p.style.setProperty("--dy", `${Math.sin(ang) * dist}px`);
        p.style.background = COLORES[i % COLORES.length];
        capa.appendChild(p);
        window.setTimeout(() => p.remove(), 650);
      }
      const onda = document.createElement("span");
      onda.className = "ev2-toque-onda";
      onda.style.left = `${ev.clientX}px`;
      onda.style.top = `${ev.clientY}px`;
      capa.appendChild(onda);
      window.setTimeout(() => onda.remove(), 550);
    };

    window.addEventListener("pointerdown", alTocar, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", alTocar);
      capa.remove();
    };
  }, []);

  return null;
}
