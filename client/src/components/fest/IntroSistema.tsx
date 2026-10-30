import { useEffect, useRef, useState } from "react";

/**
 * Pantalla de entrada del home: fondo negro, «Cargando» del Sistema y el logo
 * de Isekai World que aparece borroso y se enfoca suave. Después la pantalla
 * se desvanece y se abre la web.
 *
 * - Sale una sola vez por sesión (al volver al home no se repite).
 * - Tocar la pantalla la salta.
 * - Si el logo tarda, no se queda esperando: a los 1,6 s sigue con el nombre.
 * - Con «reducir movimiento» es solo un fundido corto.
 */
const CLAVE = "iw_intro_visto";

export function introPendiente() {
  try { return !sessionStorage.getItem(CLAVE); } catch { return false; }
}

type Fase = "carga" | "logo" | "sale";

export default function IntroSistema({ logo, cargando, onAbre, onFin, textoCarga = "Cargando" }: {
  /** URL del logo; undefined mientras llegan los ajustes */
  logo?: string | null;
  /** true mientras los ajustes todavía no llegan */
  cargando: boolean;
  /** Empieza el fundido: la portada puede arrancar sus animaciones */
  onAbre: () => void;
  /** Terminó el fundido: ya se puede quitar */
  onFin: () => void;
  textoCarga?: string;
}) {
  const reducir = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [fase, setFase] = useState<Fase>("carga");
  const [logoListo, setLogoListo] = useState(false);
  const [logoFallo, setLogoFallo] = useState(false);
  const terminado = useRef(false);

  const terminar = () => {
    if (terminado.current) return;
    terminado.current = true;
    try { sessionStorage.setItem(CLAVE, "1"); } catch { /* sin almacenamiento */ }
    setFase("sale");
    onAbre();
    window.setTimeout(onFin, reducir ? 250 : 750);
  };

  // Mientras está la intro, la página no se desplaza. Avisa que ya está para
  // que la pantalla de carga general (que mostraba lo mismo) se quite.
  useEffect(() => {
    (window as unknown as { __iwIntro?: boolean }).__iwIntro = true;
    window.dispatchEvent(new Event("iw-intro-montada"));
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, []);

  // Precarga del logo
  useEffect(() => {
    if (!logo) return;
    const img = new Image();
    img.onload = () => setLogoListo(true);
    img.onerror = () => setLogoFallo(true);
    img.src = logo;
  }, [logo]);

  // Pasa a mostrar el logo cuando cargó, o a los 1,6 s como máximo
  useEffect(() => {
    if (fase !== "carga") return;
    const listo = logoListo || logoFallo || (!cargando && !logo);
    const espera = window.setTimeout(() => setFase("logo"), listo ? (reducir ? 0 : 650) : 1600);
    return () => window.clearTimeout(espera);
  }, [fase, logoListo, logoFallo, cargando, logo, reducir]);

  // El logo se queda un momento y se abre la web
  useEffect(() => {
    if (fase !== "logo") return;
    const t = window.setTimeout(terminar, reducir ? 500 : 2100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const conImagen = !!logo && logoListo && !logoFallo;

  return (
    <div
      className={`iw-intro ${fase === "sale" ? "iw-intro-sale" : ""} ${reducir ? "iw-intro-quieta" : ""}`}
      onClick={terminar}
      role="presentation"
    >
      <div className={`iw-intro-logo ${fase !== "carga" ? "iw-intro-logo-on" : ""}`}>
        {conImagen
          ? <img src={logo!} alt="Isekai World" />
          : <span className="iw-intro-nombre">ISEKAI<br />WORLD</span>}
      </div>
      <p className="iw-intro-carga" aria-live="polite">
        {textoCarga}<span className="iw-intro-puntos" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
      </p>
      <span className="iw-intro-linea" aria-hidden="true" />
    </div>
  );
}
