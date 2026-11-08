import mapaSvg from "./mapa-fest.svg?raw";

/**
 * El plano sin las zonas tocables (en el mapa del home son capas
 * transparentes que se encienden al tocarlas; aquí estorbarían) y estirado
 * al tamaño del contenedor para que los puntos de las mesas caigan justo.
 */
const PLANO = mapaSvg
  .replace(/<g class="hot"/g, '<g class="hot" style="display:none"')
  .replace('preserveAspectRatio="xMidYMid meet"', 'preserveAspectRatio="none" width="100%" height="100%"');

/**
 * El plano del Fest con las mesas numeradas encima. Cada mesa se dibuja en su
 * punto (x, y en % del plano). Lo usan la página de venta (para elegir) y el
 * admin (para ubicar las mesas tocando el plano).
 */
export type MesaPlano = { id: number; numero: string; tipo: string; x: number | null; y: number | null; libre: boolean };

export const COLOR_TIPO: Record<string, string> = { mercader: "#38bdf8", gremio: "#a78bfa", gran_gremio: "#fbbf24" };

export default function MapaStands({
  mesas, seleccionada, onElegir, onTocarPlano, resaltarTipo, modoAdmin = false,
}: {
  mesas: MesaPlano[];
  seleccionada?: number | null;
  onElegir?: (m: MesaPlano) => void;
  /** Admin: toca el plano para ubicar la mesa elegida (x, y en %) */
  onTocarPlano?: (x: number, y: number) => void;
  resaltarTipo?: string | null;
  modoAdmin?: boolean;
}) {
  const ubicadas = mesas.filter(m => m.x !== null && m.y !== null);

  const alTocar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onTocarPlano) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
    onTocarPlano(Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y)));
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07060b]"
      style={{ aspectRatio: "1344 / 830", cursor: onTocarPlano ? "crosshair" : undefined }}
      onClick={alTocar}
    >
      <div className="pointer-events-none absolute inset-0 select-none [&>svg]:block [&>svg]:h-full [&>svg]:w-full" role="img" aria-label="Plano del Isekai World Fest" dangerouslySetInnerHTML={{ __html: PLANO }} />
      {ubicadas.map(m => {
        const color = COLOR_TIPO[m.tipo] ?? "#fff";
        const activa = seleccionada === m.id;
        const apagada = (!m.libre && !modoAdmin) || (resaltarTipo && resaltarTipo !== m.tipo);
        return (
          <button
            key={m.id}
            type="button"
            onClick={e => { e.stopPropagation(); if (m.libre || modoAdmin) onElegir?.(m); }}
            disabled={!m.libre && !modoAdmin}
            aria-label={`Stand ${m.numero}${m.libre ? "" : " (reservado)"}`}
            title={`Stand ${m.numero}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[5px] font-bold leading-none transition-transform"
            style={{
              left: `${m.x}%`, top: `${m.y}%`,
              fontSize: "clamp(7px, 0.85vw, 10px)", padding: "2px 3px", minWidth: "1.9em", textAlign: "center",
              background: m.libre ? (activa ? "#ffffff" : color) : "#3a3542",
              color: m.libre ? "#06050a" : "#8a8494",
              opacity: apagada ? 0.35 : 1,
              outline: activa ? `3px solid ${color}` : undefined,
              transform: `translate(-50%, -50%) scale(${activa ? 1.35 : 1})`,
              zIndex: activa ? 3 : 2,
              boxShadow: m.libre ? `0 0 10px ${color}88` : undefined,
            }}
          >
            {/* En el plano solo el número: el color dice el tipo (M, G o GG) */}
            {m.numero.split("-")[1] ?? m.numero}
          </button>
        );
      })}
    </div>
  );
}
