import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/i18n/LangContext";
import { introPendiente } from "@/components/fest/IntroSistema";

/**
 * Pantalla de carga inicial.
 *
 * Un contador de 0 a 100 sobre fondo magenta, al estilo de las pantallas de
 * carga de videojuegos. Se muestra una sola vez por sesión: repetirla en cada
 * navegación sería un estorbo, no una experiencia.
 */
const CLAVE_VISTA = "iw_carga_vista";
/** La portada del Fest tiene su propia intro con el logo */
const esPortada = () => typeof window !== "undefined" && ["/", "/evento"].includes(window.location.pathname);

/**
 * En la portada, mientras llega el código del home, se muestra lo mismo que
 * el primer instante de su intro (negro con «Cargando…»). Cuando la intro
 * aparece, esta se quita sin fundido: el cambio no se nota.
 */
function CargaPortada() {
  const [visible, setVisible] = useState(true);
  const { lang } = useLang();
  useEffect(() => {
    const quitar = () => setVisible(false);
    if ((window as unknown as { __iwIntro?: boolean }).__iwIntro) quitar();
    window.addEventListener("iw-intro-montada", quitar);
    const tope = window.setTimeout(quitar, 8000);
    return () => { window.removeEventListener("iw-intro-montada", quitar); window.clearTimeout(tope); };
  }, []);
  if (!visible) return null;
  const en = lang === "en";
  return (
    <div className="iw-intro" style={{ zIndex: 401 }} aria-hidden="true">
      <p className="iw-intro-carga">{en ? "Loading" : "Cargando"}<span className="iw-intro-puntos"><i>.</i><i>.</i><i>.</i></span></p>
      <span className="iw-intro-linea" />
    </div>
  );
}

export default function PantallaCarga() {
  const [portada] = useState(() => esPortada() && introPendiente());
  if (portada) return <CargaPortada />;
  return <PantallaCargaTienda />;
}

function PantallaCargaTienda() {
  const { data: settings } = trpc.settings.getAll.useQuery();
  /** Textura de fondo, opcional: se sube desde Medios */
  const textura = settings?.["carga_textura"] ?? null;

  const [progreso, setProgreso] = useState(0);
  /**
   * Solo en teléfono: en escritorio la web carga rápido y una pantalla de
   * espera ahí estorba más de lo que aporta.
   */
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.innerWidth >= 768 || esPortada()) return false;
    try { return !sessionStorage.getItem(CLAVE_VISTA); } catch { return true; }
  });
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (!visible) return;

    /**
     * El contador no avanza a ritmo constante: acelera y frena, como una carga
     * real. Un avance perfectamente lineal se percibe como falso.
     */
    /**
     * Va al ritmo de la carga real: avanza rápido hasta ~85 y espera a que la
     * página termine de cargar para completar. Dura como mínimo ~1 s (para que
     * se vea el efecto) y como máximo ~2,4 s. Antes contaba siempre unos 3 s
     * aunque la página ya estuviera lista.
     */
    let actual = 0;
    const inicio = Date.now();
    let lista = document.readyState === "complete";
    const alCargar = () => { lista = true; };
    window.addEventListener("load", alCargar);
    const id = setInterval(() => {
      const t = Date.now() - inicio;
      const puedeTerminar = (lista && t > 900) || t > 2400;
      const tope = puedeTerminar ? 100 : 86;
      const salto = puedeTerminar ? Math.random() * 14 + 10
                  : actual < 60 ? Math.random() * 10 + 5
                  : Math.random() * 3 + 1;
      actual = Math.min(tope, actual + salto);
      setProgreso(Math.floor(actual));

      if (actual >= 100) {
        clearInterval(id);
        setTimeout(() => setSaliendo(true), 160);
        setTimeout(() => {
          setVisible(false);
          try { sessionStorage.setItem(CLAVE_VISTA, "1"); } catch { /* ignorado */ }
        }, 620);
      }
    }, 70);

    return () => { clearInterval(id); window.removeEventListener("load", alCargar); };
  }, [visible]);

  // Con el movimiento reducido activado, no se muestra
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`iw-carga ${saliendo ? "iw-carga-sale" : ""}`}
      style={textura ? {
        backgroundImage: `url(${textura})`,
        backgroundSize: "cover",
        backgroundPosition: "top center",
      } : undefined}
    >
      {/* Velo oscuro sobre la textura, para que el contador se lea siempre */}
      {textura && <div className="iw-carga-velo" />}

      <div className="iw-carga-centro">
        <div className="iw-carga-numero">
          <span>{String(progreso).padStart(3, "0")}</span>
          <span className="iw-carga-pct">%</span>
        </div>

        <div className="iw-carga-barra">
          <div className="iw-carga-relleno" style={{ width: `${progreso}%` }} />
        </div>

        {/* El texto acompaña al progreso con el lenguaje de la marca: se
            cruza a otro mundo, se abre el portal, se llega. */}
        <p className="iw-carga-texto">
          {progreso < 25 ? "Abriendo el portal"
            : progreso < 55 ? "Cargando universos"
            : progreso < 85 ? "Invocando figuras"
            : "Bienvenido a Isekai"}
        </p>
      </div>
    </div>
  );
}
