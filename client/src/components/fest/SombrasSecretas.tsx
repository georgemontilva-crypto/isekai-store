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

/**
 * Caballeros de sombra. Tres tipos de guerrero —espadachín, lancero y
 * escudero— dibujados a mano (no son personajes de ninguna obra), en negro
 * con filo púrpura y ojos que se encienden al final.
 */
type Tipo = "espada" | "lanza" | "escudo";

const TRAZO = { stroke: "rgba(139,92,246,0.75)", strokeWidth: 1.2, strokeLinejoin: "round" as const };

function CuerpoBase({ id, hombros = 0 }: { id: string; hombros?: number }) {
  const f = `url(#${id})`;
  const h = hombros;
  return (
    <>
      {/* Capa */}
      <path d="M36 64 L84 64 L104 196 L112 230 L8 230 L16 196 Z" fill={f} {...TRAZO} />
      {/* Piernas y faldón */}
      <path d="M42 152 L56 152 L55 228 L39 228 Z M64 152 L78 152 L81 228 L65 228 Z" fill={f} {...TRAZO} />
      <path d="M38 128 L82 128 L88 156 L32 156 Z" fill={f} {...TRAZO} />
      {/* Peto con arista central */}
      <path d="M40 64 L80 64 L86 102 L78 130 L42 130 L34 102 Z" fill={f} {...TRAZO} />
      <path d="M60 67 L60 128 M44 96 L76 96" fill="none" stroke="rgba(139,92,246,0.35)" strokeWidth="1" />
      {/* Hombreras con púa */}
      <path
        d={`M44 60 C${30 - h} 58 ${18 - h} 66 ${14 - h} 80 L${22 - h} 88 L30 80 C34 72 40 68 48 67 Z
            M76 60 C${90 + h} 58 ${102 + h} 66 ${106 + h} 80 L${98 + h} 88 L90 80 C86 72 80 68 72 67 Z`}
        fill={f} {...TRAZO}
      />
      <path d={`M${22 - h} 70 L${8 - h} 58 L${20 - h} 78 Z M${98 + h} 70 L${112 + h} 58 L${100 + h} 78 Z`} fill={f} {...TRAZO} />
      {/* Gola */}
      <path d="M47 54 L73 54 L76 64 L44 64 Z" fill={f} {...TRAZO} />
    </>
  );
}

function Ojos({ y = 36, color = "#7dd8ff" }: { y?: number; color?: string }) {
  return (
    <>
      <ellipse cx="53" cy={y} rx="4.2" ry="1.5" fill={color} className="ev2-sombra-ojo" />
      <ellipse cx="67" cy={y} rx="4.2" ry="1.5" fill={color} className="ev2-sombra-ojo" />
    </>
  );
}

function Caballero({ tipo, id }: { tipo: Tipo; id: string }) {
  const f = `url(#${id})`;
  return (
    <svg viewBox="0 0 120 230" className="h-auto w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1234" />
          <stop offset="0.55" stopColor="#0a0616" />
          <stop offset="1" stopColor="#020104" />
        </linearGradient>
      </defs>

      {tipo === "espada" && (
        <>
          {/* Penacho que cae hacia atrás */}
          <path d="M60 6 C72 -2 90 6 98 24 C86 14 72 12 62 13 Z" fill={f} {...TRAZO} />
          <CuerpoBase id={id} />
          {/* Espada clavada frente al cuerpo */}
          <path d="M55 132 L65 132 L64 214 L60 228 L56 214 Z" fill={f} {...TRAZO} />
          <path d="M42 126 L78 126 L76 132 L44 132 Z M57 113 L63 113 L63 126 L57 126 Z" fill={f} {...TRAZO} />
          <circle cx="60" cy="109" r="4.5" fill={f} {...TRAZO} />
          {/* Brazos con guanteletes sobre el pomo */}
          <path d="M34 84 L26 112 L50 121 L53 112 L37 104 Z M86 84 L94 112 L70 121 L67 112 L83 104 Z" fill={f} {...TRAZO} />
          {/* Yelmo con cresta */}
          <path d="M60 8 C73 8 81 18 81 32 L79 46 L71 55 L49 55 L41 46 L39 32 C39 18 47 8 60 8 Z" fill={f} {...TRAZO} />
          <path d="M60 0 L65 12 L55 12 Z" fill={f} {...TRAZO} />
          <path d="M45 33 L75 33 L73 39 L47 39 Z" fill="#000" />
          <Ojos />
        </>
      )}

      {tipo === "lanza" && (
        <>
          <CuerpoBase id={id} hombros={-2} />
          {/* Lanza al costado */}
          <path d="M101.5 30 L104.5 30 L105 228 L101 228 Z" fill={f} {...TRAZO} />
          <path d="M103 0 L111 17 L103 32 L95 17 Z" fill={f} {...TRAZO} />
          <path d="M96 34 L110 34" stroke="rgba(139,92,246,0.75)" strokeWidth="2" />
          {/* Brazo derecho sujeta la lanza, izquierdo caído */}
          <path d="M86 84 L99 70 L107 78 L93 102 Z M34 84 L27 122 L36 124 L43 100 Z" fill={f} {...TRAZO} />
          {/* Yelmo en punta */}
          <path d="M60 2 L74 18 L81 34 L79 48 L70 56 L50 56 L41 48 L39 34 L46 18 Z" fill={f} {...TRAZO} />
          <path d="M40 30 L28 22 L41 40 Z M80 30 L92 22 L79 40 Z" fill={f} {...TRAZO} />
          <path d="M45 34 L75 34 L72 39 L48 39 Z" fill="#000" />
          <Ojos y={36.5} color="#a5b4fc" />
        </>
      )}

      {tipo === "escudo" && (
        <>
          <CuerpoBase id={id} hombros={6} />
          {/* Cuernos */}
          <path d="M44 28 C32 24 22 14 20 2 C30 12 38 16 46 20 Z M76 28 C88 24 98 14 100 2 C90 12 82 16 74 20 Z" fill={f} {...TRAZO} />
          {/* Yelmo cerrado con visera en T */}
          <path d="M60 12 C74 12 82 20 82 34 L82 50 L72 58 L48 58 L38 50 L38 34 C38 20 46 12 60 12 Z" fill={f} {...TRAZO} />
          <path d="M47 33 L73 33 L73 38 L63 38 L63 50 L57 50 L57 38 L47 38 Z" fill="#000" />
          <Ojos y={35.5} color="#c4b5fd" />
          {/* Escudo grande con runa */}
          <path d="M28 86 L92 86 L92 138 C92 160 78 176 60 190 C42 176 28 160 28 138 Z" fill={f} {...TRAZO} />
          <path d="M36 94 L84 94 L84 138 C84 155 73 167 60 178 C47 167 36 155 36 138 Z" fill="none" stroke="rgba(139,92,246,0.45)" strokeWidth="1" />
          <path d="M60 110 L70 128 L60 146 L50 128 Z" fill="none" stroke="#a78bfa" strokeWidth="1.6" className="ev2-sombra-ojo" />
        </>
      )}
    </svg>
  );
}

/** Formación: el más grande al centro y los demás más atrás a los lados */
const FORMACION: { tipo: Tipo; x: number; s: number; voltear?: boolean }[] = [
  { tipo: "lanza", x: 7, s: 0.6 },
  { tipo: "escudo", x: 21, s: 0.72 },
  { tipo: "espada", x: 35, s: 0.84 },
  { tipo: "lanza", x: 65, s: 0.84, voltear: true },
  { tipo: "escudo", x: 79, s: 0.72 },
  { tipo: "espada", x: 93, s: 0.6, voltear: true },
  { tipo: "espada", x: 50, s: 1 },
];

function Sombra({ i }: { i: number }) {
  const c = FORMACION[i];
  return (
    <div
      className="ev2-sombra"
      style={{
        left: `${c.x}%`,
        width: `min(${34 * c.s}vmin, ${190 * c.s}px)`,
        bottom: `${(1 - c.s) * 9}%`,
        zIndex: Math.round(c.s * 10),
        filter: `brightness(${0.55 + c.s * 0.45}) drop-shadow(0 0 16px rgba(124,58,237,0.65))`,
        animationDelay: `${0.35 + (Math.abs(c.x - 50) / 50) * 0.7}s`,
      }}
    >
      <div style={{ transform: c.voltear ? "scaleX(-1)" : undefined }}>
        <Caballero tipo={c.tipo} id={`sombra-grad-${i}`} />
      </div>
    </div>
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
      className="ev2-sombras-capa fixed inset-0 z-[210] flex items-center justify-center overflow-hidden px-6 sm:items-start sm:pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label={textos.titulo}
      onClick={onCerrar}
    >
      <div className="ev2-sombras-niebla" />
      {FORMACION.map((_, i) => <Sombra key={i} i={i} />)}
      {/* Humo que sube desde el suelo */}
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={`h${i}`}
          className="ev2-humo"
          style={{ left: `${i * 8.5}%`, animationDelay: `${0.4 + (i % 5) * 0.45}s`, animationDuration: `${3.2 + (i % 3) * 0.8}s` }}
        />
      ))}

      <div className="ev2-sombras-texto relative z-20 max-w-lg text-center" onClick={ev => ev.stopPropagation()}>
        <p className="ev-display mb-5 whitespace-nowrap text-5xl text-white sm:text-7xl" style={{ textShadow: "0 0 30px rgba(167,139,250,0.9)" }}>
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
