import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, DoorOpen, ScanLine, Star, Moon, Gamepad2, Mic, Camera, Store } from "lucide-react";
import ManaParticulas from "@/components/fest/ManaParticulas";

/**
 * Mapa interactivo del evento (/propuesta).
 *
 * Un plano del recinto con las zonas del brochure. Al tocar una zona, la
 * cámara se acerca a ella en el plano, un destello te «mete» y se abre la zona
 * a pantalla completa, como si entraras por su puerta: la imagen se acerca y
 * se enfoca, con el suelo en perspectiva avanzando hacia ti.
 *
 * La imagen de cada zona se sube desde el panel (Medios › Landing del evento ›
 * «Zona: …», clave `wf_zona_<id>_img`). Sin imagen, la zona se ambienta con su
 * color, su ícono y partículas.
 *
 * El plano es referencial: la distribución final puede cambiar.
 */

type Zona = {
  id: string; color: string; icono: typeof Star;
  /** Rectángulo de la zona en el plano (viewBox 1303 × 740) */
  x: number; y: number; w: number; h: number;
  es: [string, string]; en: [string, string];
};

export const ZONAS: Zona[] = [
  { id: "portal", color: "#4f8bff", icono: DoorOpen, x: 168, y: 652, w: 150, h: 84,
    es: ["Portal de Entrada", "Una estructura con iluminación y sonido envolvente que marca el paso al otro mundo. La primera foto que todos van a publicar."],
    en: ["Entrance Portal", "A structure with lighting and surround sound that marks your step into the other world. The first photo everyone will post."] },
  { id: "evaluacion", color: "#34c7a9", icono: ScanLine, x: 404, y: 600, w: 112, h: 118,
    es: ["Sala de Evaluación", "Aquí activas tu pase, recibes tu rango inicial y aprendes cómo funciona el Sistema. Tu aventura empieza desde el primer minuto."],
    en: ["Evaluation Room", "Here you activate your pass, get your starting rank and learn how the System works. Your adventure starts from minute one."] },
  { id: "redcarpet", color: "#f43f5e", icono: Star, x: 393, y: 210, w: 92, h: 286,
    es: ["Red Carpet", "La alfombra roja con fotógrafos, donde llegan los invitados, la prensa y los cosplayers. El momento más fotografiado del evento."],
    en: ["Red Carpet", "The red carpet with photographers, where guests, press and cosplayers arrive. The most photographed moment of the event."] },
  { id: "sombras", color: "#a855f7", icono: Moon, x: 42, y: 462, w: 150, h: 160,
    es: ["Zona de Sombras", "Un recorrido en penumbra con piezas y personajes a tamaño real, cada uno iluminado por separado. La zona que todos van a recordar."],
    en: ["Shadow Zone", "A walk through the half-light with life-size pieces and characters, each one lit on its own. The zone everyone will remember."] },
  { id: "gamer", color: "#22c3f0", icono: Gamepad2, x: 500, y: 470, w: 150, h: 112,
    es: ["Zona Gamer", "Torneos, consolas libres y desafíos por equipos, junto a Arena Panter. Para quedarse horas jugando."],
    en: ["Gaming Zone", "Tournaments, free-play consoles and team challenges, with Arena Panter. A place to stay and play for hours."] },
  { id: "escenario", color: "#e5007d", icono: Mic, x: 698, y: 217, w: 362, h: 308,
    es: ["Escenario Principal", "Presentaciones en vivo, el concurso de cosplay y una obra teatral original. Marca el ritmo de los dos días."],
    en: ["Main Stage", "Live shows, the cosplay contest and an original stage play. It sets the rhythm of both days."] },
  { id: "setfoto", color: "#fbbf24", icono: Camera, x: 486, y: 138, w: 168, h: 112,
    es: ["Set Fotográfico", "Una escena ambientada a tamaño real, con piezas físicas en primer plano. Tu foto dentro del mundo."],
    en: ["Photo Set", "A life-size themed scene with physical pieces up front. Your photo inside the world."] },
  { id: "comercial", color: "#8b5cf6", icono: Store, x: 158, y: 30, w: 222, h: 326,
    es: ["Zona Comercial", "Tiendas, artistas, coleccionables, impresión 3D y marcas aliadas. Comprar en un stand habilitado también te da experiencia."],
    en: ["Market Zone", "Shops, artists, collectibles, 3D printing and partner brands. Buying at an enabled stand also gives you experience."] },
];

export default function MapaEvento({ en, imagenes }: { en: boolean; imagenes: Record<string, string> }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const [camara, setCamara] = useState<{ x: number; y: number; s: number } | null>(null);
  const [destello, setDestello] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [dir, setDir] = useState(1);
  const reducir = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const toqueX = useRef<number | null>(null);

  // Con una zona abierta, la página no se desplaza; Escape la cierra
  useEffect(() => {
    if (abierta === null) return;
    document.body.style.overflow = "hidden";
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") cerrar();
      if (ev.key === "ArrowRight") mover(1);
      if (ev.key === "ArrowLeft") mover(-1);
    };
    window.addEventListener("keydown", tecla);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", tecla); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta]);

  /** Entrar: la cámara se acerca a la zona, destello y se abre a pantalla completa */
  const entrar = (i: number) => {
    if (reducir) { setAbierta(i); return; }
    const z = ZONAS[i];
    const cx = ((z.x + z.w / 2) / 1303) * 100;
    const cy = ((z.y + z.h / 2) / 740) * 100;
    setCamara({ x: cx, y: cy, s: 3.4 });
    try { navigator.vibrate?.(25); } catch { /* sin vibración */ }
    window.setTimeout(() => setDestello(true), 480);
    window.setTimeout(() => { setDir(1); setAbierta(i); }, 720);
    window.setTimeout(() => { setDestello(false); setCamara(null); }, 1050);
  };
  const cerrar = () => {
    setCerrando(true);
    window.setTimeout(() => { setAbierta(null); setCerrando(false); }, reducir ? 0 : 380);
  };
  const mover = (d: number) => {
    setDir(d);
    setAbierta(a => (a === null ? a : (a + d + ZONAS.length) % ZONAS.length));
  };

  const z = abierta !== null ? ZONAS[abierta] : null;
  const ZIcono = z?.icono;
  const img = z ? imagenes[z.id] : "";

  return (
    <div className="pk-mapa-envoltura">
      <div className="pk-mapa">
        <div
          className="pk-mapa-lienzo"
          style={camara ? { transformOrigin: `${camara.x}% ${camara.y}%`, transform: `scale(${camara.s})` } : undefined}
        >
          <svg viewBox="0 0 1303 740" className="pk-mapa-svg" role="img" aria-label={en ? "Venue map" : "Plano del recinto"}>
            <defs>
              <pattern id="pk-mapa-rejilla" width="26" height="26" patternUnits="userSpaceOnUse">
                <path d="M26 0H0V26" fill="none" stroke="rgba(120,100,255,.10)" strokeWidth="1" />
              </pattern>
            </defs>
            <polygon points="0,373 150,0 523,0 523,127 1303,127 1303,620 656,620 656,740 150,740" fill="#0d0c1b" stroke="#7e6bff" strokeWidth="3" strokeLinejoin="round" />
            <polygon points="0,373 150,0 523,0 523,127 1303,127 1303,620 656,620 656,740 150,740" fill="url(#pk-mapa-rejilla)" />
            <line x1="40" y1="373" x2="698" y2="373" stroke="#3b2f8f" strokeWidth="2" />
            <line x1="393" y1="215" x2="393" y2="600" stroke="#3b2f8f" strokeWidth="2" />
            <line x1="483" y1="262" x2="483" y2="490" stroke="#3b2f8f" strokeWidth="2" />
            <path className="pk-mapa-ruta" d="M243 728 L243 645 L443 645 L443 560 L443 300 L560 300 L690 300 L690 380 L880 380" />
            {ZONAS.map((zz, i) => (
              <g key={zz.id} className="pk-mapa-zona" style={{ ["--c" as string]: zz.color, ["--d" as string]: `${i * 110}ms` }}
                onClick={() => entrar(i)} role="button" tabIndex={0} aria-label={en ? zz.en[0] : zz.es[0]}
                onKeyDown={ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); entrar(i); } }}>
                <rect x={zz.x} y={zz.y} width={zz.w} height={zz.h} rx="6" />
                <circle className="pk-mapa-pulso" cx={zz.x + zz.w / 2} cy={zz.y + zz.h / 2} r="26" />
                <circle className="pk-mapa-pin" cx={zz.x + zz.w / 2} cy={zz.y + zz.h / 2} r="22" />
                <text className="pk-mapa-num" x={zz.x + zz.w / 2} y={zz.y + zz.h / 2 + 8} textAnchor="middle">{i + 1}</text>
                <text className="pk-mapa-nombre" x={zz.x + zz.w / 2} y={zz.y + zz.h / 2 + 50} textAnchor="middle">{(en ? zz.en[0] : zz.es[0]).toUpperCase()}</text>
              </g>
            ))}
          </svg>
        </div>
        <span className={`pk-mapa-destello ${destello ? "pk-mapa-destello-on" : ""}`} aria-hidden="true" />
        <span className="pk-mapa-esquinas" aria-hidden="true"><i /><i /><i /><i /></span>
        <p className="pk-mono pk-mapa-toca">{en ? "Tap a zone to enter" : "Toca una zona para entrar"}</p>
      </div>

      {/* Lista de zonas: lo mismo que tocar el plano */}
      <div className="pk-mapa-chips">
        {ZONAS.map((zz, i) => {
          const Ico = zz.icono;
          return (
            <button key={zz.id} onClick={() => entrar(i)} style={{ ["--c" as string]: zz.color }}>
              <span className="pk-mono">{String(i + 1).padStart(2, "0")}</span>
              <Ico size={15} />
              <b>{en ? zz.en[0] : zz.es[0]}</b>
            </button>
          );
        })}
      </div>
      <p className="pk-mono mt-3 text-[10.5px] text-[#6f6888]">{en ? "Reference plan: the final layout may change." : "Plano referencial: la distribución final puede cambiar."}</p>

      {/* La zona a pantalla completa: como entrar a ese espacio */}
      {z && ZIcono && (
        <div
          className={`pk-zona ${cerrando ? "pk-zona-sale" : ""}`}
          style={{ ["--c" as string]: z.color }}
          role="dialog"
          aria-modal="true"
          aria-label={en ? z.en[0] : z.es[0]}
          onTouchStart={ev => { toqueX.current = ev.touches[0].clientX; }}
          onTouchEnd={ev => {
            if (toqueX.current === null) return;
            const dx = ev.changedTouches[0].clientX - toqueX.current;
            toqueX.current = null;
            if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1);
          }}
        >
          <div className="pk-zona-escena" key={z.id} style={{ ["--dir" as string]: dir }}>
            {img
              ? <img src={img} alt="" className="pk-zona-img" />
              : (
                <div className="pk-zona-ambiente">
                  <span className="pk-zona-suelo" />
                  <span className="pk-zona-niebla" />
                  <ZIcono className="pk-zona-ico" size={120} strokeWidth={1.3} />
                </div>
              )}
            <ManaParticulas className="absolute inset-0 h-full w-full" cantidad={28} />
            <span className="pk-zona-velo" />
          </div>

          <div className="pk-zona-cab">
            <span className="pk-mono">{String(abierta! + 1).padStart(2, "0")} / {String(ZONAS.length).padStart(2, "0")}</span>
            <button onClick={cerrar} aria-label={en ? "Back to the map" : "Volver al plano"}><X size={20} /></button>
          </div>

          <div className="pk-zona-info" key={`i${z.id}`}>
            <p className="pk-mono pk-zona-etq">{en ? "[ ENTERING ZONE ]" : "[ ENTRANDO A LA ZONA ]"}</p>
            <h3 className="pk-cond pk-zona-titulo">{en ? z.en[0] : z.es[0]}</h3>
            <p className="pk-mono pk-zona-texto">{en ? z.en[1] : z.es[1]}</p>
            <p className="pk-mono pk-zona-exp">+ EXP · {en ? "Visiting this zone gives you experience" : "Visitar esta zona te da experiencia"}</p>
          </div>

          <div className="pk-zona-nav">
            <button onClick={() => mover(-1)}><ChevronLeft size={16} /> {en ? ZONAS[(abierta! - 1 + ZONAS.length) % ZONAS.length].en[0] : ZONAS[(abierta! - 1 + ZONAS.length) % ZONAS.length].es[0]}</button>
            <button onClick={() => mover(1)}>{en ? ZONAS[(abierta! + 1) % ZONAS.length].en[0] : ZONAS[(abierta! + 1) % ZONAS.length].es[0]} <ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
