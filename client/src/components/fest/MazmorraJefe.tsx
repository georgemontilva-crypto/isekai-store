import { useCallback, useEffect, useState } from "react";
import GatePortal, { ENTRAR_MS, SALIR_MS } from "@/components/fest/GatePortal";
import { Skull, Swords } from "lucide-react";

/**
 * La mazmorra del jefe (/propuesta): antes del raid hay una puerta de
 * mazmorra. Al entrar, la pantalla tiembla, se oscurece, pasas por un túnel de
 * luz, salta la advertencia y el jefe aparece como en un videojuego, con su
 * barra de vida llenándose. Después queda el raid de siempre (`children`),
 * donde se empieza a golpear.
 *
 * Con «reducir movimiento» se entra directo, sin la secuencia.
 */
type Fase = "puerta" | "entrando" | "aparece" | "dentro" | "saliendo";

/**
 * `children` recibe `onEstado`: el raid avisa cuándo la persona ya puede salir
 * (terminó su oportunidad de ataque). Mientras tanto, no hay salida.
 */
export default function MazmorraJefe({ en, imagen, children }: {
  en: boolean; imagen?: string;
  children: (onEstado: (puedeSalir: boolean) => void) => React.ReactNode;
}) {
  const [fase, setFase] = useState<Fase>("puerta");
  const [puedeSalir, setPuedeSalir] = useState(false);
  const alEstado = useCallback((v: boolean) => setPuedeSalir(v), []);
  const reducir = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Dentro de la mazmorra la página de atrás no se mueve: todo pasa aquí
  useEffect(() => {
    if (fase === "puerta") return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [fase]);

  const entrar = () => {
    if (reducir) { setFase("dentro"); return; }
    setFase("entrando");
    try { navigator.vibrate?.([30, 50, 30, 50, 120]); } catch { /* sin vibración */ }
    window.setTimeout(() => setFase("aparece"), ENTRAR_MS);
    window.setTimeout(() => setFase("dentro"), ENTRAR_MS + 2900);
  };

  /** Salir: el portal se cierra, destello y vuelves al home en esta sección */
  const salir = () => {
    if (reducir) { setFase("puerta"); volver(); return; }
    setFase("saliendo");
    try { navigator.vibrate?.([20, 40, 60]); } catch { /* sin vibración */ }
    window.setTimeout(() => { setFase("puerta"); volver(); }, SALIR_MS + 250);
  };
  const volver = () => window.setTimeout(() => document.getElementById("pk-raid")?.scrollIntoView({ block: "start" }), 30);

  return (
    <>
      {fase === "puerta" && (
        <section className="pk-mazmorra">
          <span className="pk-mazmorra-suelo" aria-hidden="true" />
          <div className="pk-ancho relative">
            <p className="pk-mono pk-mazmorra-aviso">⚠ {en ? "S-RANK GATE DETECTED" : "GATE DE RANGO S DETECTADO"} ⚠</p>
            <div className="pk-mazmorra-puerta" aria-hidden="true">
              <GatePortal />
            </div>
            <h3 className="pk-cond pk-mazmorra-titulo">{en ? "The boss's dungeon" : "La mazmorra del jefe"}</h3>
            <p className="pk-mono pk-mazmorra-texto">
              {en
                ? "A boss so strong it can only be defeated together. Every hit from every hunter lowers its life for the whole community."
                : "Un jefe tan fuerte que solo se derrota entre todos. Cada golpe de cada cazador le baja la vida para toda la comunidad."}
            </p>
            <button className="pk-mazmorra-btn" onClick={entrar}>
              <Swords size={18} /> {en ? "Enter the dungeon" : "Entrar a la mazmorra"}
            </button>
          </div>
        </section>
      )}

      {/* Secuencia de entrada */}
      {(fase === "entrando" || fase === "aparece") && (
        <div className={`pk-entrada ${fase === "aparece" ? "pk-entrada-jefe" : ""}`} role="presentation">
          {fase === "entrando" && (
            <>
              {/* La cámara entra al portal: se acerca al centro entre rayos */}
              <GatePortal modo="entrar" className="pk-entrada-gate" />
              <p className="pk-cond pk-advertencia" data-t={en ? "WARNING" : "ADVERTENCIA"}>{en ? "WARNING" : "ADVERTENCIA"}</p>
              <p className="pk-mono pk-advertencia-sub">{en ? "You are entering an S-rank dungeon" : "Estás entrando a una mazmorra de rango S"}</p>
            </>
          )}
          {fase === "aparece" && (
            <>
              <span className="pk-jefe-luz" aria-hidden="true" />
              <div className="pk-jefe-figura" aria-hidden="true">
                {imagen ? <img src={imagen} alt="" /> : <Skull size={180} strokeWidth={1} />}
              </div>
              <div className="pk-jefe-pie">
                <p className="pk-cond pk-jefe-nombre" data-t={en ? "BOSS DETECTED" : "JEFE DETECTADO"}>{en ? "BOSS DETECTED" : "JEFE DETECTADO"}</p>
                <span className="pk-jefe-vida"><i /></span>
                <p className="pk-mono pk-jefe-listo">{en ? "Get ready to attack…" : "Prepárate para atacar…"}</p>
              </div>
            </>
          )}
          <span className="pk-entrada-flash" aria-hidden="true" />
        </div>
      )}

      {/* Dentro de la mazmorra: el combate ocupa toda la pantalla y solo se
          sale cuando se acaba tu oportunidad de ataque */}
      {fase === "dentro" && (
        <div id="pk-raid-arena" className="pk-dentro" role="dialog" aria-modal="true" aria-label={en ? "Boss dungeon" : "Mazmorra del jefe"}>
          <div className="pk-dentro-fondo" aria-hidden="true">
            <GatePortal className="pk-dentro-gate" />
          </div>
          <div className="pk-dentro-cab">
            <span className="pk-mono">⚠ {en ? "S-RANK DUNGEON" : "MAZMORRA RANGO S"}</span>
            <span className="pk-mono pk-dentro-estado">{puedeSalir ? (en ? "EXIT OPEN" : "SALIDA ABIERTA") : (en ? "EXIT SEALED" : "SALIDA SELLADA")}</span>
          </div>
          <div className="pk-dentro-raid">{children(alEstado)}</div>
          <div className={`pk-dentro-pie ${puedeSalir ? "pk-dentro-pie-on" : ""}`}>
            {puedeSalir ? (
              <button className="pk-salir-btn" onClick={salir}>{en ? "Leave the dungeon" : "Salir de la mazmorra"}</button>
            ) : (
              <p className="pk-mono">{en ? "The exit opens when your attack chance is over." : "La salida se abre cuando termine tu oportunidad de ataque."}</p>
            )}
          </div>
        </div>
      )}

      {/* Salida: el portal se cierra y vuelves */}
      {fase === "saliendo" && (
        <div className="pk-salida" role="presentation">
          <GatePortal modo="salir" className="pk-salida-gate" />
          <p className="pk-cond pk-salida-titulo">{en ? "CLOSING THE GATE" : "CERRANDO EL GATE"}</p>
          <p className="pk-mono pk-salida-sub">{en ? "Returning to the world…" : "Volviendo al mundo…"}</p>
          <span className="pk-salida-flash" aria-hidden="true" />
        </div>
      )}
    </>
  );
}
