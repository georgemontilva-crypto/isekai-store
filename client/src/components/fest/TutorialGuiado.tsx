import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * Tutorial guiado («coach marks»): oscurece la pantalla, ilumina el elemento
 * que se explica y muestra un globo con la explicación, «Saltar» y
 * «Siguiente». Se activa solo la primera vez que el elemento disparador
 * entra en pantalla (queda guardado en el navegador) y se puede repetir.
 *
 * Un paso «accion» espera a que la persona toque el elemento iluminado
 * (por ejemplo, el botón de la demostración) y luego avanza solo.
 */
export type PasoTutorial = {
  objetivo: RefObject<HTMLElement | null>;
  titulo: string;
  texto: string;
  /** La persona debe tocar el elemento para avanzar */
  accion?: boolean;
};

type Textos = { saltar: string; siguiente: string; entendido: string; paso: string; tocaAqui: string };

const MARGEN = 8;

export default function TutorialGuiado({
  pasos, disparador, claveVisto, textos, abrirRef,
}: {
  pasos: PasoTutorial[];
  disparador: RefObject<HTMLElement | null>;
  claveVisto: string;
  textos: Textos;
  /** Permite abrirlo desde fuera (enlace «Ver tutorial») */
  abrirRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const [paso, setPaso] = useState<number | null>(null);
  const [caja, setCaja] = useState<DOMRect | null>(null);
  /** Alto real del globo, para decidir si cabe abajo, arriba o se fija abajo */
  const globoRef = useRef<HTMLDivElement>(null);
  const [altoGlobo, setAltoGlobo] = useState(230);
  const avanzando = useRef(false);

  const cerrar = useCallback(() => {
    setPaso(null);
    try { localStorage.setItem(claveVisto, "1"); } catch { /* sin almacenamiento */ }
  }, [claveVisto]);

  const abrir = useCallback(() => { avanzando.current = false; setPaso(0); }, []);
  useEffect(() => { if (abrirRef) abrirRef.current = abrir; }, [abrir, abrirRef]);

  // Se activa solo la primera vez que la simulación entra en pantalla
  useEffect(() => {
    let visto = false;
    try { visto = localStorage.getItem(claveVisto) === "1"; } catch { /* nada */ }
    const el = disparador.current;
    if (visto || !el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio >= 0.55) {
        obs.disconnect();
        window.setTimeout(abrir, 450);
      }
    }, { threshold: [0.55] });
    obs.observe(el);
    return () => obs.disconnect();
  }, [claveVisto, disparador, abrir]);

  // Lleva el elemento al centro de la pantalla al cambiar de paso
  useEffect(() => {
    if (paso === null) return;
    pasos[paso]?.objetivo.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [paso, pasos]);

  // Sigue la posición del elemento (scroll, giro del teléfono, animaciones)
  useLayoutEffect(() => {
    if (paso === null) return;
    let raf = 0;
    const medir = () => {
      const el = pasos[paso]?.objetivo.current;
      if (el) {
        const r = el.getBoundingClientRect();
        setCaja(prev => (prev && Math.abs(prev.top - r.top) < 0.5 && Math.abs(prev.left - r.left) < 0.5 &&
          Math.abs(prev.width - r.width) < 0.5 && Math.abs(prev.height - r.height) < 0.5) ? prev : r);
      }
      const h = globoRef.current?.offsetHeight;
      if (h) setAltoGlobo(prev => (Math.abs(prev - h) > 1 ? h : prev));
      raf = requestAnimationFrame(medir);
    };
    medir();
    return () => cancelAnimationFrame(raf);
  }, [paso, pasos]);

  // Paso de acción: avanza cuando la persona toca el elemento iluminado
  useEffect(() => {
    if (paso === null || !pasos[paso]?.accion) return;
    const el = pasos[paso].objetivo.current;
    if (!el) return;
    const alTocar = () => {
      if (avanzando.current) return;
      avanzando.current = true;
      window.setTimeout(() => {
        avanzando.current = false;
        setPaso(p => (p === null ? null : Math.min(p + 1, pasos.length - 1)));
      }, 1100);
    };
    el.addEventListener("click", alTocar);
    return () => el.removeEventListener("click", alTocar);
  }, [paso, pasos]);

  // Esc para cerrar
  useEffect(() => {
    if (paso === null) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [paso, cerrar]);

  if (paso === null || !caja || typeof document === "undefined") return null;
  const actual = pasos[paso];
  const ultimo = paso === pasos.length - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Recuadro iluminado
  const foco = { top: caja.top - MARGEN, left: caja.left - MARGEN, width: caja.width + MARGEN * 2, height: caja.height + MARGEN * 2 };
  // Globo: debajo si cabe, si no arriba; si no cabe en ningún lado (elemento
  // muy alto), se fija en la parte de abajo de la pantalla, siempre visible
  const ancho = Math.min(330, vw - 24);
  const espacioAbajo = vh - (foco.top + foco.height) - 14;
  const espacioArriba = foco.top - 14;
  const posicion: "abajo" | "arriba" | "fijo" =
    espacioAbajo >= altoGlobo + 12 ? "abajo" : espacioArriba >= altoGlobo + 12 ? "arriba" : "fijo";
  const abajo = posicion === "abajo";
  const izquierda = Math.max(12, Math.min(vw - ancho - 12, caja.left + caja.width / 2 - ancho / 2));
  const flechaX = Math.max(18, Math.min(ancho - 18, caja.left + caja.width / 2 - izquierda));

  return createPortal(
    <div className="tg-capa">
      {/* Bloquea toques en el resto de la página, salvo en el paso de acción */}
      <div className="tg-bloqueo" style={{ pointerEvents: actual.accion ? "none" : "auto" }} />
      <div className="tg-foco" style={foco} aria-hidden="true">
        {actual.accion && (
          <span className="tg-mano" aria-hidden="true">
            <span className="tg-mano-onda" />
            👆
          </span>
        )}
      </div>

      <div
        ref={globoRef}
        role="alertdialog"
        aria-label={actual.titulo}
        aria-describedby="tg-texto"
        className="tg-globo"
        style={{
          width: ancho, left: posicion === "fijo" ? (vw - ancho) / 2 : izquierda,
          ...(posicion === "abajo" ? { top: foco.top + foco.height + 14 }
            : posicion === "arriba" ? { bottom: vh - foco.top + 14 }
            : { bottom: "calc(14px + env(safe-area-inset-bottom, 0px))" }),
        }}
      >
        {posicion !== "fijo" && (
          <span className={`tg-flecha ${abajo ? "tg-flecha-arriba" : "tg-flecha-abajo"}`} style={{ left: flechaX }} aria-hidden="true" />
        )}
        <p className="tg-paso">[ {textos.paso.replace("{n}", String(paso + 1)).replace("{t}", String(pasos.length))} ]</p>
        <p className="tg-titulo">{actual.titulo}</p>
        <p id="tg-texto" className="tg-texto">{actual.texto}</p>
        <div className="tg-puntos" aria-hidden="true">
          {pasos.map((_, i) => <span key={i} className={i === paso ? "tg-punto-activo" : ""} />)}
        </div>
        {actual.accion && <p className="tg-indicacion">👆 {textos.tocaAqui}</p>}
        <div className="tg-botones">
          {!ultimo && <button className="tg-saltar" onClick={cerrar}>{textos.saltar}</button>}
          {actual.accion ? (
            <button className="tg-siguiente-suave" onClick={() => setPaso(paso + 1)}>{textos.siguiente} →</button>
          ) : (
            <button className="tg-siguiente" onClick={() => (ultimo ? cerrar() : setPaso(paso + 1))} autoFocus>
              {ultimo ? textos.entendido : textos.siguiente}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
