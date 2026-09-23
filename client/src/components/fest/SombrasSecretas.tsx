import { useEffect, useRef, useState } from "react";

/**
 * Easter egg de la Zona de Sombras.
 *
 * Mantener presionada la figura del hero 3 segundos oscurece la pantalla y
 * hace emerger sombras desde el suelo. No hay ninguna pista en la página:
 * la gracia es que alguien lo descubra y lo cuente.
 */
const DURACION = 3000;

type Textos = { titulo: string; texto: string; secreto: string; cerrar: string };

/** Zona sensible encima de la figura: detecta el toque sostenido */
export function ZonaSombras({ onRevelar }: { onRevelar: () => void }) {
  const [carga, setCarga] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const inicio = useRef<number | null>(null);
  const frame = useRef<number>(0);

  const cancelar = () => {
    inicio.current = null;
    cancelAnimationFrame(frame.current);
    setCarga(0);
  };

  const avanzar = () => {
    if (inicio.current === null) return;
    const p = Math.min(1, (performance.now() - inicio.current) / DURACION);
    setCarga(p);
    if (p >= 1) {
      cancelar();
      onRevelar();
      return;
    }
    frame.current = requestAnimationFrame(avanzar);
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div
      className="absolute inset-x-[18%] bottom-20 top-[12%] z-20 select-none lg:bottom-0"
      style={{ WebkitTouchCallout: "none", touchAction: "pan-y" }}
      onContextMenu={ev => ev.preventDefault()}
      onPointerDown={ev => {
        const r = ev.currentTarget.getBoundingClientRect();
        setPos({ x: ev.clientX - r.left, y: ev.clientY - r.top });
        inicio.current = performance.now();
        frame.current = requestAnimationFrame(avanzar);
      }}
      onPointerUp={cancelar}
      onPointerLeave={cancelar}
      onPointerCancel={cancelar}
      aria-hidden="true"
    >
      {/* El anillo solo aparece pasado un momento: un toque normal no lo muestra */}
      {carga > 0.15 && (
        <svg
          className="pointer-events-none absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: pos.x, top: pos.y }}
          viewBox="0 0 80 80"
        >
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="3" />
          <circle
            cx="40" cy="40" r="34" fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 34}
            strokeDashoffset={2 * Math.PI * 34 * (1 - carga)}
            transform="rotate(-90 40 40)"
            style={{ filter: "drop-shadow(0 0 6px #a78bfa)" }}
          />
        </svg>
      )}
    </div>
  );
}

/** Silueta de sombra con ojos que brillan */
function Sombra({ i }: { i: number }) {
  const escala = 0.75 + ((i * 37) % 30) / 100;
  return (
    <svg
      viewBox="0 0 100 180"
      className="ev2-sombra"
      style={{
        left: `${4 + i * 13}%`,
        width: `${22 * escala}vmin`,
        animationDelay: `${0.5 + (i % 4) * 0.22 + i * 0.08}s`,
      }}
      aria-hidden="true"
    >
      <path
        d="M50 8c12 0 20 9 20 21 0 9-5 16-11 19l3 8c16 4 26 14 30 30l6 94H2l6-94c4-16 14-26 30-30l3-8c-6-3-11-10-11-19 0-12 8-21 20-21z"
        fill="#05030b"
        stroke="rgba(124,58,237,0.55)"
        strokeWidth="1.5"
      />
      <ellipse cx="43" cy="28" rx="3.2" ry="1.6" fill="#7dd8ff" className="ev2-sombra-ojo" />
      <ellipse cx="57" cy="28" rx="3.2" ry="1.6" fill="#7dd8ff" className="ev2-sombra-ojo" />
    </svg>
  );
}

export function RevelacionSombras({ textos, onCerrar }: { textos: Textos; onCerrar: () => void }) {
  useEffect(() => {
    try { navigator.vibrate?.([60, 80, 60, 80, 220]); } catch { /* no soportado */ }
    const esc = (ev: KeyboardEvent) => { if (ev.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCerrar]);

  return (
    <div
      className="ev2-sombras-capa fixed inset-0 z-[210] flex items-center justify-center overflow-hidden px-6"
      role="dialog"
      aria-modal="true"
      aria-label={textos.titulo}
      onClick={onCerrar}
    >
      <div className="ev2-sombras-niebla" />
      {Array.from({ length: 7 }, (_, i) => <Sombra key={i} i={i} />)}

      <div className="ev2-sombras-texto relative z-10 max-w-md text-center" onClick={ev => ev.stopPropagation()}>
        <p className="ev-display mb-5 text-5xl text-white sm:text-7xl" style={{ textShadow: "0 0 30px rgba(167,139,250,0.9)" }}>
          {textos.titulo}
        </p>
        <p className="mb-2 text-base leading-relaxed text-[#d8d0ea] sm:text-lg">{textos.texto}</p>
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.25em] text-[#a78bfa]">{textos.secreto}</p>
        <button
          onClick={onCerrar}
          className="ev-notch ev-press border border-[#a78bfa]/60 bg-[#a78bfa]/10 px-8 py-3.5 font-mono text-sm font-bold uppercase tracking-widest text-[#c4b5fd]"
        >
          {textos.cerrar}
        </button>
      </div>
    </div>
  );
}
