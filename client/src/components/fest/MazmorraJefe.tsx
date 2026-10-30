import { useEffect, useState } from "react";
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
type Fase = "puerta" | "entrando" | "aparece" | "dentro";

export default function MazmorraJefe({ en, imagen, children }: { en: boolean; imagen?: string; children: React.ReactNode }) {
  const [fase, setFase] = useState<Fase>("puerta");
  const reducir = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (fase === "puerta" || fase === "dentro") return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [fase]);

  const entrar = () => {
    if (reducir) { setFase("dentro"); return; }
    setFase("entrando");
    try { navigator.vibrate?.([30, 50, 30, 50, 120]); } catch { /* sin vibración */ }
    window.setTimeout(() => setFase("aparece"), 2300);
    window.setTimeout(() => {
      setFase("dentro");
      window.setTimeout(() => document.getElementById("pk-raid-arena")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }, 5200);
  };

  return (
    <>
      {fase === "puerta" && (
        <section className="pk-mazmorra">
          <span className="pk-mazmorra-suelo" aria-hidden="true" />
          <div className="pk-ancho relative">
            <p className="pk-mono pk-mazmorra-aviso">⚠ {en ? "S-RANK GATE DETECTED" : "GATE DE RANGO S DETECTADO"} ⚠</p>
            <div className="pk-mazmorra-puerta" aria-hidden="true">
              <span className="pk-mazmorra-marco" />
              <span className="pk-mazmorra-remolino" />
              <span className="pk-mazmorra-ojos"><i /><i /></span>
              <Skull className="pk-mazmorra-calavera" size={34} />
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
              <span className="pk-tunel" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.22}s` }} />)}</span>
              <span className="pk-franjas" aria-hidden="true" />
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

      {fase === "dentro" && (
        <div id="pk-raid-arena" className="pk-raid-dentro">
          {children}
        </div>
      )}
    </>
  );
}
