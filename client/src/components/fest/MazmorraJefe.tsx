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
type Fase = "puerta" | "entrando" | "elegir" | "aparece" | "dentro" | "saliendo";

/**
 * Un jefe de la mazmorra. Al entrar se elige entre ellos, como al escoger
 * personaje en un videojuego; cada uno tiene su entrada con su propio diseño.
 */
export type JefeMazmorra = {
  clave: string;
  nombre: string;
  /** Qué tipo de pelea es: «Raid comunitario», «Batalla en vivo»… */
  tipo: string;
  detalle: string;
  rango: string;
  imagen?: string;
  /** Dibujo de respaldo si no hay imagen cargada */
  arte?: React.ReactNode;
  /** Color del jefe (marco, luces y barra de vida) */
  color: string;
  /** Texto al aparecer: «JEFE DETECTADO», «KOI-SAMA DESPIERTA»… */
  aparicion: string;
  /** Misión ya cerrada: la tarjeta queda en gris, como completada */
  completado?: boolean;
  render: (onEstado: (puedeSalir: boolean) => void) => React.ReactNode;
};

/**
 * `children` recibe `onEstado`: el raid avisa cuándo la persona ya puede salir
 * (terminó su oportunidad de ataque). Mientras tanto, no hay salida.
 */
export default function MazmorraJefe({ en, jefes }: { en: boolean; jefes: JefeMazmorra[] }) {
  const [clave, setClave] = useState(jefes[0]?.clave ?? "");
  const jefe = jefes.find(j => j.clave === clave) ?? jefes[0];
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
    if (reducir) { setFase("elegir"); return; }
    setFase("entrando");
    try { navigator.vibrate?.([30, 50, 30, 50, 120]); } catch { /* sin vibración */ }
    // Tras cruzar el portal se elige a qué jefe enfrentar
    window.setTimeout(() => setFase("elegir"), ENTRAR_MS);
  };

  /** Elegido el jefe: su entrada, con su diseño, y empieza la pelea */
  const elegir = (c: string) => {
    setClave(c);
    setPuedeSalir(false);
    try { navigator.vibrate?.([20, 30, 90]); } catch { /* sin vibración */ }
    if (reducir) { setFase("dentro"); return; }
    window.setTimeout(() => setFase("aparece"), 380);
    window.setTimeout(() => setFase("dentro"), 380 + 2900);
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
            <h3 className="pk-cond pk-mazmorra-titulo">{en ? "The bosses' dungeon" : "La mazmorra de los jefes"}</h3>
            <p className="pk-mono pk-mazmorra-texto">
              {en
                ? "Two bosses wait inside. Choose who to face: both can only be defeated together."
                : "Dentro esperan dos jefes. Elige a cuál enfrentar: a los dos solo se les derrota entre todos."}
            </p>
            <button className="pk-mazmorra-btn" onClick={entrar}>
              <Swords size={18} /> {en ? "Enter the dungeon" : "Entrar a la mazmorra"}
            </button>
          </div>
        </section>
      )}

      {/* Secuencia de entrada: cruzar el portal */}
      {fase === "entrando" && (
        <div className="pk-entrada" role="presentation">
          {/* La cámara entra al portal: se acerca al centro entre rayos */}
          <GatePortal modo="entrar" className="pk-entrada-gate" />
          <p className="pk-cond pk-advertencia" data-t={en ? "WARNING" : "ADVERTENCIA"}>{en ? "WARNING" : "ADVERTENCIA"}</p>
          <p className="pk-mono pk-advertencia-sub">{en ? "You are entering an S-rank dungeon" : "Estás entrando a una mazmorra de rango S"}</p>
          <span className="pk-entrada-flash" aria-hidden="true" />
        </div>
      )}

      {/* Selección de jefe: como elegir personaje en un videojuego */}
      {fase === "elegir" && (
        <div className="pk-elegir" role="dialog" aria-modal="true" aria-label={en ? "Choose your boss" : "Elige a tu jefe"}>
          <div className="pk-dentro-fondo" aria-hidden="true"><GatePortal className="pk-dentro-gate" /></div>
          <p className="pk-mono pk-elegir-et">⚠ {en ? "S-RANK DUNGEON" : "MAZMORRA RANGO S"}</p>
          <h3 className="pk-cond pk-elegir-titulo">{en ? "CHOOSE YOUR BOSS" : "ELIGE A TU JEFE"}</h3>
          <div className="pk-elegir-rejilla">
            {jefes.map((j, i) => (
              <button key={j.clave} className={`pk-elegir-carta ${clave === j.clave ? "pk-elegir-sel" : ""} ${j.completado ? "pk-elegir-hecha" : ""}`} style={{ "--jefe": j.color, animationDelay: `${0.12 * i}s` } as React.CSSProperties} onClick={() => elegir(j.clave)}>
                <span className="pk-elegir-num pk-mono">{String(i + 1).padStart(2, "0")}</span>
                <span className="pk-elegir-rango pk-cond">{j.rango}</span>
                {j.completado && <span className="pk-elegir-sello pk-mono">{en ? "COMPLETED" : "COMPLETADA"}</span>}
                <span className="pk-elegir-arte">{j.imagen ? <img src={j.imagen} alt="" /> : j.arte ?? <Skull size={90} strokeWidth={1} />}</span>
                <span className="pk-elegir-pie">
                  <span className="pk-cond pk-elegir-nombre">{j.nombre}</span>
                  <span className="pk-mono pk-elegir-tipo">{j.tipo}</span>
                  <span className="pk-elegir-detalle">{j.detalle}</span>
                </span>
              </button>
            ))}
          </div>
          <button className="pk-elegir-salir pk-mono" onClick={salir}>{en ? "Leave the dungeon" : "Salir de la mazmorra"}</button>
        </div>
      )}

      {/* El jefe elegido aparece, con su propio diseño */}
      {fase === "aparece" && jefe && (
        <div className={`pk-entrada pk-entrada-jefe pk-tema-${jefe.clave}`} style={{ "--jefe": jefe.color } as React.CSSProperties} role="presentation">
          <span className="pk-jefe-luz" aria-hidden="true" />
          {jefe.clave === "koi" && <span className="pk-koi-agua" aria-hidden="true"><i /><i /><i /><b>鯉</b></span>}
          <div className="pk-jefe-figura" aria-hidden="true">
            {jefe.imagen ? <img src={jefe.imagen} alt="" /> : jefe.arte ?? <Skull size={180} strokeWidth={1} />}
          </div>
          <div className="pk-jefe-pie">
            <p className="pk-cond pk-jefe-nombre" data-t={jefe.aparicion}>{jefe.aparicion}</p>
            <span className="pk-jefe-vida"><i /></span>
            <p className="pk-mono pk-jefe-listo">{en ? "Get ready to attack…" : "Prepárate para atacar…"}</p>
          </div>
          <span className="pk-entrada-flash" aria-hidden="true" />
        </div>
      )}

      {/* Dentro de la mazmorra: el combate ocupa toda la pantalla y solo se
          sale cuando se acaba tu oportunidad de ataque */}
      {fase === "dentro" && (
        <div id="pk-raid-arena" className={`pk-dentro pk-tema-${jefe?.clave}`} style={{ "--jefe": jefe?.color } as React.CSSProperties} role="dialog" aria-modal="true" aria-label={en ? "Boss dungeon" : "Mazmorra del jefe"}>
          <div className="pk-dentro-fondo" aria-hidden="true">
            <GatePortal className="pk-dentro-gate" />
          </div>
          <div className="pk-dentro-cab">
            <span className="pk-mono">⚠ {jefe?.nombre.toUpperCase()}</span>
            <span className="pk-mono pk-dentro-estado">{puedeSalir ? (en ? "EXIT OPEN" : "SALIDA ABIERTA") : (en ? "EXIT SEALED" : "SALIDA SELLADA")}</span>
          </div>
          <div className="pk-dentro-raid">{jefe?.render(alEstado)}</div>
          <div className={`pk-dentro-pie ${puedeSalir ? "pk-dentro-pie-on" : ""}`}>
            {puedeSalir ? (
              <div className="pk-dentro-salidas">
                <button className="pk-salir-btn pk-salir-otro" onClick={() => setFase("elegir")}>{en ? "Other boss" : "Otro jefe"}</button>
                <button className="pk-salir-btn" onClick={salir}>{en ? "Leave the dungeon" : "Salir de la mazmorra"}</button>
              </div>
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
