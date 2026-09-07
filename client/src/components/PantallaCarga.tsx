import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Pantalla de carga inicial.
 *
 * Un contador de 0 a 100 sobre fondo magenta, al estilo de las pantallas de
 * carga de videojuegos. Se muestra una sola vez por sesión: repetirla en cada
 * navegación sería un estorbo, no una experiencia.
 */
const CLAVE_VISTA = "iw_carga_vista";

export default function PantallaCarga() {
  const { data: settings } = trpc.settings.getAll.useQuery();
  const logo = settings?.["store_logo_dark_url"] ?? settings?.["store_logo_url"] ?? null;

  const [progreso, setProgreso] = useState(0);
  const [visible, setVisible] = useState(() => {
    try { return !sessionStorage.getItem(CLAVE_VISTA); } catch { return true; }
  });
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (!visible) return;

    /**
     * El contador no avanza a ritmo constante: acelera y frena, como una carga
     * real. Un avance perfectamente lineal se percibe como falso.
     */
    let actual = 0;
    const id = setInterval(() => {
      const salto = actual < 60 ? Math.random() * 9 + 3
                  : actual < 88 ? Math.random() * 4 + 1
                  : Math.random() * 2 + 0.5;
      actual = Math.min(100, actual + salto);
      setProgreso(Math.floor(actual));

      if (actual >= 100) {
        clearInterval(id);
        setTimeout(() => setSaliendo(true), 280);
        setTimeout(() => {
          setVisible(false);
          try { sessionStorage.setItem(CLAVE_VISTA, "1"); } catch { /* ignorado */ }
        }, 900);
      }
    }, 110);

    return () => clearInterval(id);
  }, [visible]);

  // Con el movimiento reducido activado, no se muestra
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className={`iw-carga ${saliendo ? "iw-carga-sale" : ""}`}>
      <div className="iw-carga-centro">
        {logo && <img src={logo} alt="" className="iw-carga-logo" />}

        <div className="iw-carga-numero">
          <span>{String(progreso).padStart(3, "0")}</span>
          <span className="iw-carga-pct">%</span>
        </div>

        <div className="iw-carga-barra">
          <div className="iw-carga-relleno" style={{ width: `${progreso}%` }} />
        </div>

        <p className="iw-carga-texto">
          {progreso < 40 ? "Cargando" : progreso < 80 ? "Preparando" : "Casi listo"}
        </p>
      </div>
    </div>
  );
}
