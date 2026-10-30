import { useCallback, useEffect, useRef, useState } from "react";
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

/** Centro y radio del anillo dentro del video del portal (480 × 600) */
const CX = 239, CY = 300, R = 118;

/** Un rayo: línea quebrada desde el borde del anillo hacia afuera */
function rayo(semilla: number) {
  let s = semilla;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const ang = rnd() * Math.PI * 2;
  const largo = 60 + rnd() * 120;
  const pasos = 7;
  let x = CX + Math.cos(ang) * (R - 4), y = CY + Math.sin(ang) * (R - 4);
  const pts = [`${x.toFixed(1)},${y.toFixed(1)}`];
  const ramas: string[] = [];
  for (let i = 1; i <= pasos; i++) {
    const d = largo / pasos;
    const desvio = (rnd() - 0.5) * 1.4;
    x += Math.cos(ang + desvio) * d;
    y += Math.sin(ang + desvio) * d;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    // Alguna rama corta
    if (i > 2 && rnd() < 0.3) {
      const a2 = ang + (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.6);
      const x2 = x + Math.cos(a2) * d * 1.6, y2 = y + Math.sin(a2) * d * 1.6;
      ramas.push(`M${x.toFixed(1)},${y.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`);
    }
  }
  return { d: `M${pts.join(" L")}`, ramas };
}

/**
 * Rayos alrededor del portal: aparecen y se apagan al azar, como descargas.
 * Se generan de nuevo a cada rato para que nunca se vean iguales.
 */
function Rayos({ intensos = false }: { intensos?: boolean }) {
  const [semilla, setSemilla] = useState(7);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setSemilla(x => x + 13), intensos ? 260 : 900);
    return () => window.clearInterval(id);
  }, [intensos]);
  const n = intensos ? 9 : 5;
  const lista = Array.from({ length: n }, (_, i) => rayo(semilla * 31 + i * 977));
  return (
    <svg className={`pk-rayos ${intensos ? "pk-rayos-intensos" : ""}`} viewBox="0 0 480 600" aria-hidden="true" key={semilla}>
      {lista.map((r, i) => (
        <g key={i} style={{ animationDelay: `${(i * 0.13) % 0.8}s` }}>
          <path className="pk-rayo-brillo" d={r.d} />
          <path className="pk-rayo" d={r.d} />
          {r.ramas.map((b, k) => <path key={k} className="pk-rayo pk-rayo-rama" d={b} />)}
        </g>
      ))}
    </svg>
  );
}

/** El portal: el video del portal astral con rayos, brillo y los ojos del jefe */
function Portal({ intensos = false, zoom = false }: { intensos?: boolean; zoom?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) void v.play().catch(() => {}); else v.pause(); });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`pk-portal ${zoom ? "pk-portal-zoom" : ""}`}>
      <div className="pk-portal-video">
        <video ref={ref} muted loop playsInline autoPlay preload="auto" poster="/fest/portal-astral.jpg">
          <source src="/fest/portal-astral.webm" type="video/webm" />
          <source src="/fest/portal-astral.mp4" type="video/mp4" />
        </video>
      </div>
      <span className="pk-portal-pulso" aria-hidden="true" />
      <Rayos intensos={intensos} />
      <span className="pk-portal-ojos" aria-hidden="true"><i /><i /></span>
    </div>
  );
}

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
    window.setTimeout(() => setFase("aparece"), 2300);
    window.setTimeout(() => setFase("dentro"), 5200);
  };

  /** Salir: el portal se cierra, destello y vuelves al home en esta sección */
  const salir = () => {
    if (reducir) { setFase("puerta"); volver(); return; }
    setFase("saliendo");
    try { navigator.vibrate?.([20, 40, 60]); } catch { /* sin vibración */ }
    window.setTimeout(() => { setFase("puerta"); volver(); }, 2100);
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
              <Portal />
              <span className="pk-mazmorra-relampago" />
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
              <div className="pk-entrada-portal" aria-hidden="true"><Portal intensos zoom /></div>
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

      {/* Dentro de la mazmorra: el combate ocupa toda la pantalla y solo se
          sale cuando se acaba tu oportunidad de ataque */}
      {fase === "dentro" && (
        <div id="pk-raid-arena" className="pk-dentro" role="dialog" aria-modal="true" aria-label={en ? "Boss dungeon" : "Mazmorra del jefe"}>
          <div className="pk-dentro-fondo" aria-hidden="true">
            <div className="pk-dentro-portal"><Portal /></div>
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
          <div className="pk-salida-portal" aria-hidden="true"><Portal intensos /></div>
          <p className="pk-cond pk-salida-titulo">{en ? "CLOSING THE GATE" : "CERRANDO EL GATE"}</p>
          <p className="pk-mono pk-salida-sub">{en ? "Returning to the world…" : "Volviendo al mundo…"}</p>
          <span className="pk-salida-flash" aria-hidden="true" />
        </div>
      )}
    </>
  );
}
