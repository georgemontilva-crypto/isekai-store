import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import ManaParticulas from "@/components/fest/ManaParticulas";

/**
 * Portada tipo póster (como las webs oficiales de juegos): la ilustración
 * llena la pantalla, la figura al centro y abajo el logo, el lema y la fecha.
 * La usan el home y la propuesta (/propuesta), para que sean idénticas.
 *
 * - `lista`: arranca la entrada de la figura y del texto (después de la intro).
 * - `conBarra`: la página tiene arriba la barra de la tienda (65 px), así que
 *   el póster ocupa el resto de la pantalla.
 * - Al bajar, el fondo y la figura se mueven a distinto ritmo (profundidad).
 */
export function useFuentesJuego() {
  useEffect(() => {
    const id = "iw-fuentes-juego";
    if (document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id;
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap";
    document.head.appendChild(l);
  }, []);
}

export default function PortadaPoster({
  fondo, video, figura, logo, lema1, lema2, fecha, lugar, etiqueta, lista, ligero = false,
  conBarra = false, onInsignia, superpuesto,
}: {
  fondo?: string; video?: string; figura?: string; logo?: string | null;
  lema1: string; lema2: string; fecha: string; lugar: string; etiqueta: string;
  lista: boolean; ligero?: boolean; conBarra?: boolean;
  onInsignia?: () => void;
  /** Capa encima de la figura (por ejemplo, la Zona de Sombras) */
  superpuesto?: React.ReactNode;
}) {
  useFuentesJuego();
  const ref = useRef<HTMLElement>(null);

  // Profundidad al bajar: el fondo va más lento que la figura
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const f = () => {
      raf = 0;
      const y = Math.min(window.scrollY, window.innerHeight);
      el.style.setProperty("--pp-y", String(y));
    };
    const alBajar = () => { if (!raf) raf = requestAnimationFrame(f); };
    window.addEventListener("scroll", alBajar, { passive: true });
    return () => { window.removeEventListener("scroll", alBajar); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <section ref={ref} className={`pk-hero ${conBarra ? "pk-hero-conbarra" : ""}`}>
      <div className="pk-hero-arte" aria-hidden="true">
        <div className="pk-hero-capa-fondo">
          {fondo && <img src={fondo} alt="" className="pk-hero-fondo" />}
          {video && <video src={video} autoPlay muted loop playsInline poster={fondo || undefined} className="pk-hero-fondo" style={{ opacity: 0.55 }} />}
        </div>
        <span className="pk-hero-luz" />
        <div className="pk-hero-capa-figura">
          {figura && <img src={figura} alt="" className={`pk-hero-figura ${lista ? "pk-entra" : ""}`} />}
        </div>
        <span className="pk-hero-velo" />
      </div>
      <ManaParticulas className="absolute inset-0 z-[1] h-full w-full" cantidad={36} ligero={ligero} />
      {superpuesto}

      {onInsignia && (
        <button className="pk-insignia" onClick={onInsignia}>
          <span className="pk-mono">{etiqueta}</span>
          <b>LEVEL PASS</b>
          <ChevronRight size={12} />
        </button>
      )}

      <div className={`pk-hero-pie ${lista ? "pk-entra-pie" : ""}`}>
        {logo
          ? <img src={logo} alt="Isekai World" className="pk-hero-logo" />
          : <p className="pk-cond pk-hero-logo-txt">ISEKAI WORLD</p>}
        <h1 className="pk-lema">{lema1} <span>{lema2}</span></h1>
        <p className="pk-mono pk-hero-dato">{fecha} &nbsp;/&nbsp; {lugar}</p>
      </div>
      <span className="pk-hero-bajar" aria-hidden="true" />
    </section>
  );
}
