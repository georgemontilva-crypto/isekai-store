import { useEffect, useMemo, useRef, useState } from "react";
import JefeVivo from "@/components/fest/JefeVivo";
import { Crown, Swords } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import type { Translations } from "@/i18n/es";
import { useRaidSocket } from "@/hooks/useRaidSocket";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";
import { useLang } from "@/i18n/LangContext";
import { enlaceDeInvitacion, invitacionPendiente } from "@/lib/invitacion";

/**
 * Raid comunitario: todos los visitantes golpean al mismo jefe.
 *
 * Ronda de 10 segundos: cuenta 3-2-1, luego cada toque sobre el jefe es un
 * golpe. Al terminar se envía el total al servidor, que decide si cuenta
 * (un ataque por día). La barra baja al momento mientras juegas y después
 * se corrige con el valor real.
 */
const RONDA_MS = 10_000;
const GOLPES_MAX = 130;
/** Día sin límite: no hay tiempo de ronda; los golpes se mandan por tandas cada 8 s */
const TANDA_MS = 8_000;

/** Color del combo según lo largo que va */
function colorCombo(n: number) {
  if (n >= 100) return "#7dd8ff";
  if (n >= 50) return "#a78bfa";
  if (n >= 25) return "#fbbf24";
  if (n >= 10) return "#f97316";
  return "#fb7185";
}

type T = Translations["evento"]["v2"];

/** «1 d 5 h», «5 h 20 min», «12 min»: lo que falta para una fecha */
function falta(hasta: number): string {
  const min = Math.max(1, Math.round((hasta - Date.now()) / 60_000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  return `${m} min`;
}
type Fase = "listo" | "cuenta" | "jugando" | "enviando" | "resultado";

/**
 * Ambiente del jefe: relámpagos rojos detrás, fuego en su base y brasas que
 * suben. Todo son capas fijas que solo cambian opacidad o se desplazan
 * (baratas de animar). Posiciones y tiempos fijos: el render es estable.
 */
const RAYOS = [
  { x: 6, y: -6, h: 62, rot: -14, d: 5.2, r: 0.4, rama: true },
  { x: 72, y: -10, h: 70, rot: 12, d: 6.8, r: 2.1, rama: false },
  { x: 40, y: -16, h: 48, rot: 4, d: 8.3, r: 4.6, rama: true },
  { x: 86, y: 8, h: 46, rot: 22, d: 7.4, r: 3.3, rama: false },
  { x: -4, y: 16, h: 44, rot: -26, d: 9.1, r: 6.2, rama: false },
];
/** Llamas detrás del jefe (grandes) y delante de su base (pequeñas) */
const LLAMAS_JEFE = [
  { x: 16, w: 13, d: 1.3 }, { x: 27, w: 17, d: 1.7 }, { x: 38, w: 15, d: 1.1 },
  { x: 50, w: 20, d: 1.5 }, { x: 62, w: 15, d: 1.25 }, { x: 73, w: 17, d: 1.8 }, { x: 84, w: 13, d: 1.4 },
];
const LLAMAS_FRENTE = [
  { x: 24, w: 9, d: 1.2 }, { x: 36, w: 11, d: 1.55 }, { x: 64, w: 11, d: 1.35 }, { x: 76, w: 9, d: 1.65 },
];
const BRASAS_JEFE = Array.from({ length: 18 }, (_, i) => ({
  x: 14 + ((i * 41) % 72),
  d: 1.6 + (i % 5) * 0.35,
  r: (i * 0.37) % 2.4,
  t: 2 + (i % 3),
  dx: ((i * 23) % 40) - 20,
  c: i % 3 === 0 ? "#fde68a" : i % 3 === 1 ? "#fb923c" : "#f43f5e",
}));

function Rayo({ rama }: { rama: boolean }) {
  const d = "M52 0 L40 58 L58 62 L34 120 L50 124 L28 200";
  const r = "M44 64 L22 92 L30 96 L14 130";
  return (
    <svg viewBox="0 0 80 200" className="h-full w-full overflow-visible" aria-hidden="true">
      <g className="ev2-rayo-brillo">
        <path d={d} fill="none" stroke="#ff1744" strokeWidth="12" strokeLinejoin="round" opacity="0.7" />
        {rama && <path d={r} fill="none" stroke="#ff1744" strokeWidth="8" strokeLinejoin="round" opacity="0.6" />}
      </g>
      <path d={d} fill="none" stroke="#ffe4e6" strokeWidth="3" strokeLinejoin="round" />
      {rama && <path d={r} fill="none" stroke="#fecdd3" strokeWidth="2" strokeLinejoin="round" />}
    </svg>
  );
}

/** Detrás del jefe: tormenta y fuego */
function FondoJefe() {
  return (
    <div className="pointer-events-none absolute -inset-x-[12%] -bottom-[12%] top-0 overflow-hidden" aria-hidden="true">
      {RAYOS.map((r, i) => (
        <div key={`c${i}`} className="ev2-cielo" style={{ animationDuration: `${r.d}s`, animationDelay: `${r.r}s` }} />
      ))}
      {RAYOS.map((r, i) => (
        <div
          key={`r${i}`}
          className="ev2-rayo absolute"
          style={{
            left: `${r.x}%`, top: `${r.y}%`, height: `${r.h}%`, aspectRatio: "80 / 200",
            transform: `rotate(${r.rot}deg)`, animationDuration: `${r.d}s`, animationDelay: `${r.r}s`,
          }}
        >
          <Rayo rama={r.rama} />
        </div>
      ))}
      <div className="ev2-suelo-fuego" />
      {LLAMAS_JEFE.map((l, i) => (
        <span
          key={`f${i}`}
          className="ev2-llama-jefe"
          style={{ left: `${l.x}%`, width: `${l.w}%`, animationDuration: `${l.d}s`, animationDelay: `${-i * 0.3}s` }}
        />
      ))}
    </div>
  );
}

/** Delante del jefe: llamas pequeñas en su base y brasas que suben */
function BrasasJefe() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {LLAMAS_FRENTE.map((l, i) => (
        <span
          key={`ff${i}`}
          className="ev2-llama-jefe ev2-llama-frente"
          style={{ left: `${l.x}%`, width: `${l.w}%`, animationDuration: `${l.d}s`, animationDelay: `${-i * 0.45}s` }}
        />
      ))}
      {BRASAS_JEFE.map((b, i) => (
        <span
          key={i}
          className="ev2-brasa-jefe"
          style={{
            left: `${b.x}%`, width: b.t, height: b.t, background: b.c, color: b.c,
            ["--dx" as string]: `${b.dx}px`,
            animationDuration: `${b.d}s`, animationDelay: `${b.r}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Jefe por defecto si no hay imagen subida: una sombra con cuernos */
function JefeSilueta({ caido }: { caido: boolean }) {
  return (
    <svg viewBox="0 0 200 220" className="h-full w-full" aria-hidden="true">
      <path
        d="M100 30c-8 0-14 3-19 8L60 8l8 44c-6 9-9 19-9 30 0 13 4 24 11 33-20 8-36 26-42 50l-8 55h160l-8-55c-6-24-22-42-42-50 7-9 11-20 11-33 0-11-3-21-9-30l8-44-21 30c-5-5-11-8-19-8z"
        fill="#0b0617"
        stroke={caido ? "rgba(120,120,140,0.5)" : "rgba(244,63,94,0.65)"}
        strokeWidth="2"
      />
      {!caido && (
        <>
          <path d="M80 80l14 6-14 3z" fill="#f43f5e" className="ev2-jefe-ojo" />
          <path d="M120 80l-14 6 14 3z" fill="#f43f5e" className="ev2-jefe-ojo" />
        </>
      )}
      {caido && <path d="M70 60l30 40-20 30 40 50" fill="none" stroke="rgba(200,200,220,0.5)" strokeWidth="2" />}
    </svg>
  );
}

/**
 * Revelación de la recompensa al caer el jefe:
 * grieta (el jefe tiembla y brilla) → estallido (destello y esquirlas) →
 * revelada (la pieza sube entre rayos de luz). Se reproduce cada vez que la
 * sección entra en pantalla por primera vez en la visita.
 */
type Revelacion = "no" | "grieta" | "estallido" | "revelada";

export default function RaidJefe({
  t, imagen, recompensa, recompensaImg, numero, onEstado,
}: {
  t: T; imagen: string; recompensa: string; recompensaImg: string; numero: React.ReactNode;
  /**
   * Avisa si la persona ya puede salir (dentro de la mazmorra de /propuesta):
   * terminó su ronda, ya atacó hoy, el jefe cayó, no hay raid o no tiene cuenta.
   */
  onEstado?: (puedeSalir: boolean) => void;
}) {
  /** Para atacar hace falta cuenta: cada ataque queda a nombre del usuario */
  const { isAuthenticated, user } = useAuth();
  const { lang } = useLang();
  /** Marca aleatoria de esta pestaña: reconoce su propio aviso en vivo */
  const refNavegador = useMemo(
    () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, "0")).join(""),
    [],
  );
  const utils = trpc.useUtils();
  // El estado llega en vivo por el socket; la consulta periódica queda solo
  // como respaldo por si la conexión en vivo no está disponible
  const { data } = trpc.raid.estado.useQuery(undefined, { refetchInterval: 60_000 });
  // Al entrar o salir de la cuenta cambia «ya atacaste hoy»
  useEffect(() => { utils.raid.estado.invalidate(); }, [user?.id, utils]);
  const atacar = trpc.raid.atacar.useMutation();
  const iniciarRonda = trpc.raid.iniciar.useMutation();
  /** Ticket firmado de la ronda en curso y el registro de toques (anti auto clicker) */
  const ticketRef = useRef("");
  const toquesRef = useRef<{ ultimo: number; intervalos: number[]; sinteticos: number; puntos: Set<string> }>({
    ultimo: 0, intervalos: [], sinteticos: 0, puntos: new Set(),
  });

  /** Día sin límite: se golpea sin tiempo de ronda hasta tocar «Terminar» */
  const sinTiempo = !!(data && data.activo && data.sinLimite);
  const sinTiempoRef = useRef(sinTiempo);
  sinTiempoRef.current = sinTiempo;
  /** Daño ya confirmado por el servidor en esta sesión sin tiempo */
  const [sesion, setSesion] = useState(0);
  const sesionRef = useRef(0);
  /** Golpes dados en toda la sesión (para el combo); `golpes` son los que faltan por mandar */
  const [toques, setToques] = useState(0);
  const toquesSesionRef = useRef(0);
  /** Las tandas salen de una en una, en orden */
  const colaRef = useRef<Promise<void>>(Promise.resolve());
  const ticketEnRef = useRef(0);
  /** Motivo por el que la sesión se corta sola (trampa, jefe caído, sesión vencida) */
  const finRef = useRef("");
  const terminandoRef = useRef(false);
  /**
   * Descanso de cazador (cada 20.000 de daño, 30 minutos): hora local en que
   * termina. El servidor manda lo que falta, así no depende del reloj del
   * teléfono. `reloj` solo sirve para repintar la cuenta.
   */
  /**
   * Vida del cazador: el jefe le quita vida por cada golpe que da.
   * `miVida` es la última que confirmó el servidor. Durante una sesión la
   * vida real se calcula con los golpes dados desde que empezó, y la barra
   * baja a tirones, cada vez que el jefe «golpea».
   */
  const reglasVida = data && data.activo ? data.vidaReglas : null;
  const vidaServidor = data && data.activo ? data.vidaJugador : null;
  const [miVida, setMiVida] = useState<number | null>(null);
  const miVidaRef = useRef(0);
  const vidaInicioRef = useRef(0);
  const ultimaVidaRef = useRef<number | null>(null);
  const [vidaBarra, setVidaBarra] = useState(0);
  const vidaBarraRef = useRef(0);
  const barraVidaRef = useRef<HTMLDivElement>(null);
  const [zarpazo, setZarpazo] = useState<{ id: number; n: number } | null>(null);
  const faseRef = useRef<Fase>("listo");
  const fijarVida = (v: number) => { miVidaRef.current = v; setMiVida(v); vidaBarraRef.current = v; setVidaBarra(v); };
  useEffect(() => {
    // En plena sesión manda la cuenta local; al terminar se vuelve a la del servidor
    if (vidaServidor == null || faseRef.current === "cuenta" || faseRef.current === "jugando" || faseRef.current === "enviando") return;
    fijarVida(vidaServidor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vidaServidor]);

  const [descansoFin, setDescansoFin] = useState(0);
  const [, setReloj] = useState(0);
  const descansoServidor = data && data.activo ? data.descansoMs ?? 0 : 0;
  useEffect(() => {
    setDescansoFin(descansoServidor > 0 ? Date.now() + descansoServidor : 0);
  }, [descansoServidor]);
  useEffect(() => {
    if (descansoFin <= 0) return;
    const id = window.setInterval(() => {
      setReloj(n => n + 1);
      // Terminó: se pide el estado de nuevo y vuelve el botón de atacar
      if (Date.now() >= descansoFin) { setDescansoFin(0); void utils.raid.estado.invalidate(); }
    }, 10_000);
    return () => window.clearInterval(id);
  }, [descansoFin, utils]);

  const [fase, setFase] = useState<Fase>("listo");
  faseRef.current = fase;
  const [cuenta, setCuenta] = useState(3);
  const [golpes, setGolpes] = useState(0);
  const [restante, setRestante] = useState(RONDA_MS);
  const [numeros, setNumeros] = useState<{ id: number; x: number; y: number }[]>([]);
  const jefeRef = useRef<HTMLDivElement>(null);
  const barraRef = useRef<HTMLDivElement>(null);
  /** Efectos de cada golpe: corte, onda y chispas donde tocas */
  const [impactos, setImpactos] = useState<{ id: number; x: number; y: number; rot: number }[]>([]);
  /** Anuncio grande en los hitos del combo y al terminar el tiempo */
  const [anuncio, setAnuncio] = useState<{ id: number; texto: string } | null>(null);
  const [danioFinal, setDanioFinal] = useState(0);
  /** Golpes de otros cazadores que llegan en vivo */
  const [feed, setFeed] = useState<{ id: number; n: number }[]>([]);
  const [ajenos, setAjenos] = useState<{ id: number; n: number; x: number }[]>([]);
  const [conteo, setConteo] = useState(0);
  const arenaRef = useRef<HTMLDivElement>(null);
  /**
   * Detecta cuándo el jefe entra en pantalla. Se engancha con un ref de
   * función porque la caja no existe hasta que llegan los datos.
   */
  const [caja, setCaja] = useState<HTMLDivElement | null>(null);
  const [seccion, setSeccion] = useState<HTMLElement | null>(null);

  // En computadora, el fondo se coloca para que el portal de la imagen quede
  // justo detrás del jefe. Centro del portal en la imagen: 48,5 % · 47 %.
  useEffect(() => {
    if (!seccion || !caja) return;
    const PX = 0.485, PY = 0.47, PROP = 883 / 2000;
    const ajustar = () => {
      if (window.innerWidth < 1024) {
        seccion.style.removeProperty("--rj-bg-w");
        seccion.style.removeProperty("--rj-bg-x");
        seccion.style.removeProperty("--rj-bg-y");
        return;
      }
      const s = seccion.getBoundingClientRect();
      const c = caja.getBoundingClientRect();
      const cx = c.left - s.left + c.width / 2;
      const cy = c.top - s.top + c.height / 2;
      // Ancho: que el portal (≈32 % del ancho) envuelva al jefe y que la
      // imagen cubra desde arriba de la sección
      const w = Math.max(s.width * 1.3, c.width * 1.15 / 0.32, cy / (PY * PROP), 1600);
      seccion.style.setProperty("--rj-bg-w", `${Math.round(w)}px`);
      seccion.style.setProperty("--rj-bg-x", `${Math.round(cx - w * PX)}px`);
      seccion.style.setProperty("--rj-bg-y", `${Math.round(cy - w * PROP * PY)}px`);
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(seccion);
    window.addEventListener("resize", ajustar);
    return () => { ro.disconnect(); window.removeEventListener("resize", ajustar); };
  }, [seccion, caja]);
  const [enVista, setEnVista] = useState(false);
  useEffect(() => {
    if (!caja || enVista) return;
    const obs = new IntersectionObserver(
      ([entrada]) => { if (entrada.isIntersecting) { setEnVista(true); obs.disconnect(); } },
      { threshold: 0.5 },
    );
    obs.observe(caja);
    return () => obs.disconnect();
  }, [caja, enVista]);
  const reducir = useReducedMotion();
  const [revelacion, setRevelacion] = useState<Revelacion>("no");
  const [mensaje, setMensaje] = useState("");
  const golpesRef = useRef(0);
  const idNum = useRef(0);

  // Cuenta 3-2-1
  useEffect(() => {
    if (fase !== "cuenta") return;
    if (cuenta === 0) {
      setFase("jugando");
      return;
    }
    const id = window.setTimeout(() => setCuenta(c => c - 1), 700);
    return () => window.clearTimeout(id);
  }, [fase, cuenta]);

  // El jefe ataca: cada 2,2 s cobra en la barra la vida perdida desde su último golpe
  useEffect(() => {
    if (fase !== "jugando" || !reglasVida) return;
    const id = window.setInterval(() => {
      const real = Math.max(0, vidaInicioRef.current - toquesSesionRef.current * reglasVida.porGolpe);
      const perdida = vidaBarraRef.current - real;
      if (perdida < 1) return;
      vidaBarraRef.current = real;
      setVidaBarra(real);
      const zid = ++idNum.current;
      setZarpazo({ id: zid, n: Math.round(perdida) });
      window.setTimeout(() => setZarpazo(z => (z?.id === zid ? null : z)), 1100);
      reanimar(barraVidaRef.current, "ev2-sacudir");
      try { navigator.vibrate?.(40); } catch { /* no soportado */ }
    }, 2200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, reglasVida?.porGolpe]);

  // Ronda de 10 segundos. En un día sin límite no hay tiempo: los golpes
  // se van mandando por tandas mientras la persona sigue golpeando.
  useEffect(() => {
    if (fase !== "jugando") return;
    if (sinTiempoRef.current) {
      const id = window.setInterval(() => {
        void encolarTanda().then(() => { if (finRef.current) void terminar(); });
      }, TANDA_MS);
      return () => window.clearInterval(id);
    }
    const inicio = performance.now();
    const id = window.setInterval(() => {
      const r = Math.max(0, RONDA_MS - (performance.now() - inicio));
      setRestante(r);
      if (r <= 0) {
        window.clearInterval(id);
        anunciar(t.raidTiempo);
        enviar();
      }
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const pedirTicket = async () => {
    try {
      ticketRef.current = (await iniciarRonda.mutateAsync()).ticket;
      ticketEnRef.current = Date.now();
    } catch { /* se reintenta en la tanda siguiente */ }
  };

  /** Manda los golpes acumulados desde la tanda anterior */
  const tanda = async () => {
    if (finRef.current) return;
    const g = golpesRef.current;
    if (g === 0) {
      // Sin golpes: si el ticket ya es viejo se renueva, para que no venza
      if (Date.now() - ticketEnRef.current > 60_000) await pedirTicket();
      return;
    }
    const tq = toquesRef.current;
    golpesRef.current = 0;
    setGolpes(0);
    toquesRef.current = { ultimo: tq.ultimo, intervalos: [], sinteticos: 0, puntos: new Set() };
    try {
      const r = await atacar.mutateAsync({
        golpes: g, ref: refNavegador, ticket: ticketRef.current,
        intervalos: tq.intervalos.slice(0, 2000), sinteticos: tq.sinteticos, posiciones: tq.puntos.size,
      });
      // Cada respuesta trae el ticket de la tanda siguiente
      const nuevo = "ticket" in r ? r.ticket : null;
      if (nuevo) { ticketRef.current = nuevo; ticketEnRef.current = Date.now(); }
      // Llegó a su descanso (con esta tanda, o ya lo tenía): la sesión se cierra
      const descanso = "descansoMs" in r ? r.descansoMs ?? 0 : 0;
      if (descanso > 0) { setDescansoFin(Date.now() + descanso); finRef.current = t.raidDescansoFin; }
      if ("vida" in r && typeof r.vida === "number") ultimaVidaRef.current = r.vida;
      if (r.ok) { sesionRef.current += r.golpes; setSesion(sesionRef.current); }
      else if (r.motivo === "sinVida") finRef.current = t.raidSinVidaFin;
      else if (r.motivo === "descanso") { /* ya anotado arriba */ }
      else if (r.motivo === "autoclicker") finRef.current = t.raidTrampa;
      else if (r.motivo === "derrotado") finRef.current = t.raidDerrotado;
      else if (r.motivo === "yaAtaco" || r.motivo === "limite") finRef.current = t.raidYaAtacaste;
      else if (!nuevo) await pedirTicket();
    } catch (e: unknown) {
      const codigo = (e as { data?: { code?: string } })?.data?.code;
      if (codigo === "UNAUTHORIZED") { finRef.current = t.raidNecesitasCuenta; openLoginModal(); }
      else await pedirTicket();
    }
  };
  const encolarTanda = () => (colaRef.current = colaRef.current.then(tanda, tanda));

  /** Al acabar una sesión la vida queda como la dejó el jefe (el servidor la confirma después) */
  const cerrarVida = () => {
    const porGolpe = reglasVida?.porGolpe ?? 0;
    fijarVida(ultimaVidaRef.current ?? Math.max(0, vidaInicioRef.current - toquesSesionRef.current * porGolpe));
  };

  /** Fin de la sesión sin tiempo: manda lo que falte y muestra el total */
  const terminar = async (motivo = "") => {
    if (terminandoRef.current) return;
    terminandoRef.current = true;
    setFase("enviando");
    await encolarTanda();
    // El motivo se anota después de mandar: los últimos golpes sí cuentan
    if (motivo && !finRef.current) finRef.current = motivo;
    const total = sesionRef.current;
    setDanioFinal(total);
    cerrarVida();
    setMensaje(`${total > 0 ? `${t.raidResultado.replace("{n}", total.toLocaleString())} ` : ""}${finRef.current || t.raidLibreOtra}`);
    await utils.raid.estado.invalidate();
    setFase("resultado");
  };

  const enviar = async () => {
    setFase("enviando");
    const g = golpesRef.current;
    try {
      const tq = toquesRef.current;
      const r = await atacar.mutateAsync({
        golpes: g, ref: refNavegador, ticket: ticketRef.current,
        intervalos: tq.intervalos.slice(0, 2000), sinteticos: tq.sinteticos, posiciones: tq.puntos.size,
      });
      if ("vida" in r && typeof r.vida === "number") ultimaVidaRef.current = r.vida;
      if (r.ok) setDanioFinal(r.golpes);
      if (r.ok) setMensaje(`${t.raidResultado.replace("{n}", r.golpes.toLocaleString())}${r.multiplicador > 1 ? ` ${t.raidBonusX.replace("{n}", String(r.multiplicador))}` : ""} ${data?.activo && data.sinLimite ? t.raidLibreOtra : t.raidVuelve}`);
      else if (r.motivo === "autoclicker") setMensaje(t.raidTrampa);
      else if (r.motivo === "sinVida") setMensaje(t.raidSinVidaFin);
      else if (r.motivo === "yaAtaco") setMensaje(t.raidYaAtacaste);
      else if (r.motivo === "limite") setMensaje(t.raidLimite);
      else if (r.motivo === "ticket") setMensaje(t.raidError);
      else setMensaje(t.raidDerrotado);
    } catch (e: unknown) {
      // Si la sesión venció a mitad de la ronda, se pide entrar de nuevo
      const codigo = (e as { data?: { code?: string } })?.data?.code;
      if (codigo === "UNAUTHORIZED") {
        setMensaje(t.raidNecesitasCuenta);
        openLoginModal();
      } else {
        setMensaje(t.raidError);
      }
    }
    cerrarVida();
    await utils.raid.estado.invalidate();
    setFase("resultado");
  };

  /** Reinicia una animación CSS sin volver a montar el elemento */
  const reanimar = (el: HTMLElement | null, clase: string) => {
    if (!el) return;
    el.classList.remove(clase);
    void el.offsetWidth;
    el.classList.add(clase);
  };

  const anunciar = (texto: string) => {
    const id = ++idNum.current;
    setAnuncio({ id, texto });
    window.setTimeout(() => setAnuncio(a => (a?.id === id ? null : a)), 1100);
  };

  useRaidSocket(
    vivo => {
      // Actualiza sin recargar: la consulta de este visitante (conserva si ya
      // atacó hoy) y la de la página, que decide si la pieza está revelada
      utils.raid.estado.setData(undefined, viejo =>
        viejo && viejo.activo
          ? { ...vivo, yaAtaco: viejo.yaAtaco, misAtaques: viejo.misAtaques, multiplicador: viejo.multiplicador, miNombre: viejo.miNombre, miDanio: viejo.miDanio, motivoX: viejo.motivoX, invitacion: viejo.invitacion, descansoMs: viejo.descansoMs, vidaJugador: viejo.vidaJugador }
          : viejo);
    },
    golpe => {
      if (golpe.ref && golpe.ref === refNavegador) return; // fue esta misma pestaña
      const id = ++idNum.current;
      setFeed(f => [{ id, n: golpe.golpes }, ...f].slice(0, 3));
      window.setTimeout(() => setFeed(f => f.filter(k => k.id !== id)), 4500);
      setAjenos(a => [...a.slice(-4), { id, n: golpe.golpes, x: 25 + ((id * 37) % 50) }]);
      window.setTimeout(() => setAjenos(a => a.filter(k => k.id !== id)), 1300);
      reanimar(barraRef.current, "ev2-barra-golpe");
      if (fase !== "jugando") reanimar(jefeRef.current, "ev2-sacudir");
    },
    () => { utils.raid.estado.invalidate(); },
  );

  // El daño total sube contando al terminar la ronda
  useEffect(() => {
    if (fase !== "resultado" || danioFinal <= 0) return;
    const inicio = performance.now();
    let f = 0;
    const paso = () => {
      const p = Math.min(1, (performance.now() - inicio) / 900);
      setConteo(Math.round(danioFinal * (1 - Math.pow(1 - p, 3))));
      if (p < 1) f = requestAnimationFrame(paso);
    };
    f = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(f);
  }, [fase, danioFinal]);

  /** Compartir el enlace de invitación: hoja de compartir del teléfono o copiar */
  const [invCopiado, setInvCopiado] = useState(false);
  const copiarInvitacion = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setInvCopiado(true); window.setTimeout(() => setInvCopiado(false), 2200); } catch { /* sin permiso */ }
  };
  const compartirInvitacion = async (url: string) => {
    try {
      if (navigator.share) { await navigator.share({ title: t.raidTitulo, text: t.raidInvMensaje, url }); return; }
    } catch { return; /* canceló */ }
    await copiarInvitacion(url);
  };

  const empezar = async () => {
    // Ticket de la ronda: el servidor anota la hora de inicio
    try {
      ticketRef.current = (await iniciarRonda.mutateAsync()).ticket;
    } catch (e: unknown) {
      const codigo = (e as { data?: { code?: string } })?.data?.code;
      if (codigo === "UNAUTHORIZED") { openLoginModal(); return; }
      setMensaje(t.raidError); setFase("resultado"); return;
    }
    toquesRef.current = { ultimo: 0, intervalos: [], sinteticos: 0, puntos: new Set() };
    ticketEnRef.current = Date.now();
    sesionRef.current = 0; setSesion(0);
    toquesSesionRef.current = 0; setToques(0);
    finRef.current = ""; terminandoRef.current = false;
    vidaInicioRef.current = miVidaRef.current; ultimaVidaRef.current = null;
    vidaBarraRef.current = miVidaRef.current; setVidaBarra(miVidaRef.current); setZarpazo(null);
    setDanioFinal(0);
    setConteo(0);
    golpesRef.current = 0;
    setGolpes(0);
    setRestante(RONDA_MS);
    setCuenta(3);
    setMensaje("");
    setFase("cuenta");
    // Barra de vida y jefe a la vista durante toda la ronda
    arenaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const golpear = (ev: React.PointerEvent<HTMLDivElement>) => {
    // El tope de golpes por ronda solo vale en días normales
    if (fase !== "jugando" || (!sinTiempoRef.current && golpesRef.current >= GOLPES_MAX)) return;
    // Sin vida no hay más golpes: en un día sin límite la sesión se cierra ahí
    if (reglasVida && toquesSesionRef.current >= Math.floor(vidaInicioRef.current / reglasVida.porGolpe + 1e-6)) {
      if (sinTiempoRef.current) void terminar(t.raidSinVidaFin);
      return;
    }
    // Registro para el detector: tiempo entre toques, toques no reales y puntos tocados
    const tq = toquesRef.current;
    const ahora = performance.now();
    if (tq.ultimo) tq.intervalos.push(Math.round(ahora - tq.ultimo));
    tq.ultimo = ahora;
    if (!ev.isTrusted) tq.sinteticos += 1;
    tq.puntos.add(`${Math.round(ev.clientX)},${Math.round(ev.clientY)}`);
    golpesRef.current += 1;
    setGolpes(golpesRef.current);
    toquesSesionRef.current += 1;
    setToques(toquesSesionRef.current);
    const n = toquesSesionRef.current;
    reanimar(jefeRef.current, "ev2-sacudir");
    reanimar(barraRef.current, "ev2-barra-golpe");

    const r = ev.currentTarget.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    const id = ++idNum.current;
    setNumeros(ns => [...ns.slice(-14), { id, x, y }]);
    window.setTimeout(() => setNumeros(ns => ns.filter(k => k.id !== id)), 700);
    setImpactos(is => [...is.slice(-8), { id, x, y, rot: -60 + ((n * 47) % 120) }]);
    window.setTimeout(() => setImpactos(is => is.filter(k => k.id !== id)), 560);

    const hitos: Record<number, string> = {
      10: t.raidHito10, 25: t.raidHito25, 50: t.raidHito50, 75: t.raidHito75, 100: t.raidHito100,
    };
    if (hitos[n]) {
      anunciar(hitos[n]);
      reanimar(arenaRef.current, "ev2-temblor-fuerte");
      try { navigator.vibrate?.([25, 30, 45]); } catch { /* no soportado */ }
    } else {
      try { navigator.vibrate?.(8); } catch { /* no soportado */ }
    }
  };

  const caidoYa = !!(data && data.activo && data.derrotado);
  // Si el jefe cae mientras golpeas sin tiempo, la sesión se cierra sola
  useEffect(() => {
    if (caidoYa && fase === "jugando" && sinTiempoRef.current) void terminar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caidoYa, fase]);
  useEffect(() => {
    if (!caidoYa || !recompensaImg || !enVista || revelacion !== "no") return;
    if (reducir) { setRevelacion("revelada"); return; }
    setRevelacion("grieta");
    try { navigator.vibrate?.([30, 50, 30, 50, 30]); } catch { /* no soportado */ }
    const t1 = window.setTimeout(() => {
      setRevelacion("estallido");
      try { navigator.vibrate?.(180); } catch { /* no soportado */ }
    }, 1200);
    const t2 = window.setTimeout(() => setRevelacion("revelada"), 2000);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caidoYa, recompensaImg, enVista, reducir]);

  // Desde el correo se llega a /#raid: la sección aparece cuando llegan los
  // datos, así que se baja hasta ella en ese momento
  const listo = !!(data && data.activo);
  useEffect(() => {
    if (!listo || window.location.hash !== "#raid") return;
    const id = window.setTimeout(() => document.getElementById("raid")?.scrollIntoView({ block: "start" }), 400);
    return () => window.clearTimeout(id);
  }, [listo]);

  useEffect(() => {
    if (!onEstado) return;
    if (!data || !data.activo) { onEstado(true); return; }
    const ronda = fase === "cuenta" || fase === "jugando" || fase === "enviando";
    const leToca = !data.derrotado && !data.yaAtaco && fase === "listo" && isAuthenticated && descansoFin <= Date.now() && (miVida == null || !reglasVida || miVida >= reglasVida.porGolpe * 50);
    onEstado(!ronda && !leToca);
  }, [onEstado, data, fase, isAuthenticated, descansoFin, miVida, reglasVida]);

  if (!data || !data.activo) return null;

  const enRonda = fase === "cuenta" || fase === "jugando" || fase === "enviando";
  const vidaVista = Math.max(0, data.vida - (enRonda ? golpes * (data.multiplicador ?? 1) : 0));
  const pct = data.vidaMax > 0 ? (vidaVista / data.vidaMax) * 100 : 0;
  const caido = data.derrotado;
  // En un día sin límite se puede volver a atacar nada más terminar
  const libre = !!data.sinLimite && !caido;
  const enDescanso = !caido && descansoFin > Date.now();
  // Vida del cazador: hacen falta al menos 50 golpes de vida para empezar
  const vidaMax = data.vidaReglas.max;
  const vidaMinima = data.vidaReglas.porGolpe * 50;
  const vidaActual = miVida ?? data.vidaJugador;
  const sinVida = isAuthenticated && !caido && vidaActual < vidaMinima;
  const msVida = (v: number) => (Math.max(0, v) / vidaMax) * data.vidaReglas.reposicionMs;
  const pctVida = Math.max(0, Math.min(100, ((enRonda ? vidaBarra : vidaActual) / vidaMax) * 100));
  const puedeAtacar = !caido && !data.yaAtaco && !enDescanso && !sinVida && (fase === "listo" || (libre && fase === "resultado"));
  // Tabla de los 10 con más daño: la fila propia se reconoce por nombre y daño
  const top = data.top ?? [];
  const miDanio = data.miDanio ?? 0;
  const miFila = miDanio > 0 ? top.findIndex(p => p.nombre === data.miNombre && p.danio === miDanio) : -1;
  // Invitaciones: enlace propio y bonos activos
  const inv = data.invitacion ?? null;
  const enlaceInv = inv ? enlaceDeInvitacion(inv.codigo) : "";
  const idioma = lang === "en" ? "en" : "es-VE";

  return (
    <section ref={setSeccion} id="raid" className="ev2-diferida scroll-mt-16 ev-grid relative overflow-hidden border-y border-[#f43f5e]/20 bg-gradient-to-b from-[#12060d] to-[#06040d] px-6 py-20 lg:px-16 lg:py-24">
      {/* Fondo: la ciudad en ruinas con el portal, y un glitch en la parte de
          arriba, como si la señal se cortara */}
      <div className="rj-fondo pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="rj-fondo-img" />
        <span className="rj-glitch rj-glitch-1" />
        <span className="rj-glitch rj-glitch-2" />
        <span className="rj-glitch-barra" />
        <span className="rj-fondo-velo" />
      </div>
      <div className="relative mx-auto max-w-3xl">
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#f43f5e]">
          {numero}&nbsp;&nbsp;{t.raidEtiqueta}
        </p>
        <h2 className="ev-display mb-4 text-[28px] leading-[1.05] sm:text-5xl">{t.raidTitulo}</h2>
        <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-[#c9a8b8]">{t.raidTexto}</p>

        {/* Día especial: hoy no hay límite de ataques */}
        {libre && (
          <div className="mb-8 border border-[#22d3ee]/50 bg-[#22d3ee]/10 px-5 py-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#67e8f9]">⚡ {t.raidLibreTitulo}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#d5f5fb]">{t.raidLibreTexto}</p>
          </div>
        )}

        {/* Barra de vida compartida */}
        <div ref={arenaRef} className="scroll-mt-20">
        <div className="lg:mx-auto lg:max-w-lg">
        <div className="mb-2 flex items-end justify-between font-mono text-xs uppercase tracking-widest">
          <span className="text-[#f43f5e]">{t.raidVida}</span>
          <span className="text-white tabular-nums">
            {vidaVista.toLocaleString()} / {data.vidaMax.toLocaleString()}
          </span>
        </div>
        <div ref={barraRef} className="ev-notch relative mb-2 h-5 w-full overflow-hidden border border-[#f43f5e]/40 bg-[#1a0a12]" style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}>
          {/* Estela blanca: marca el daño reciente y alcanza a la barra después */}
          <div
            className="absolute inset-y-0 left-0 bg-white/80 transition-[width] delay-300 duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
          <div
            className="relative h-full transition-[width] duration-150"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #7f1d1d, #f43f5e, #fb7185)",
              boxShadow: "0 0 16px rgba(244,63,94,0.6)",
            }}
          />
        </div>
        <div className="mb-6 flex items-center justify-between gap-3 font-mono text-[11px]">
          <span className="text-[#9d7f8f]">
            {t.raidCazadores.replace("{n}", data.cazadores.toLocaleString())}
          </span>
          {!caido && (
            <span className="flex shrink-0 items-center gap-1.5 uppercase tracking-widest text-[#fb7185]">
              <span className="ev2-en-vivo h-2 w-2 rounded-full bg-[#f43f5e]" />
              {t.raidEnVivo}
            </span>
          )}
        </div>

        </div>

        {/* Golpes de otros cazadores, en vivo */}
        <div className="relative -mt-4 mb-2 h-0" aria-live="polite">
          <div className="absolute inset-x-0 top-0 z-20 flex flex-col items-start gap-1">
            {feed.map(f => (
              <p key={f.id} className="ev2-feed border border-[#f43f5e]/30 bg-[#1a0a12]/90 px-2.5 py-1 font-mono text-[11px] text-[#fecdd3]">
                ⚔ {t.raidOtroGolpe.replace("{n}", f.n.toLocaleString())}
              </p>
            ))}
          </div>
        </div>

        {/* El jefe: en la ronda es la zona que se toca */}
        <div
          ref={setCaja}
          data-sin-toque
          onPointerDown={golpear}
          className={`relative mx-auto mb-8 aspect-square w-full max-w-[300px] sm:max-w-[340px] lg:max-w-[500px] select-none ${fase === "jugando" ? "cursor-crosshair" : ""}`}
          style={{ touchAction: fase === "jugando" ? "none" : "auto", WebkitTouchCallout: "none" }}
        >
          <div className={`absolute inset-[8%] rounded-full ${fase === "jugando" && toques >= 50 ? "ev2-furia" : ""}`} style={{ background: caido ? "radial-gradient(circle, rgba(120,120,140,0.15), transparent 70%)" : "radial-gradient(circle, rgba(244,63,94,0.35), rgba(127,29,29,0.12) 55%, transparent 72%)" }} />
          {!caido && revelacion === "no" && <FondoJefe />}

          {revelacion !== "revelada" && (
            <div
              ref={jefeRef}
              className={`relative h-full w-full ${caido && revelacion === "no" ? "grayscale" : ""} ${
                revelacion === "grieta" ? "ev2-jefe-grieta" : revelacion === "estallido" ? "ev2-jefe-estalla" : ""
              }`}
            >
              {imagen ? (
                <JefeVivo src={imagen} />
              ) : (
                <JefeSilueta caido={caido && revelacion === "no"} />
              )}
            </div>
          )}

          {!caido && revelacion === "no" && <BrasasJefe />}

          {revelacion === "estallido" && (
            <>
              <span className="ev2-destello" aria-hidden="true" />
              {Array.from({ length: 14 }, (_, i) => {
                const ang = (Math.PI * 2 * i) / 14;
                const d = 120 + (i % 3) * 40;
                return (
                  <span
                    key={i}
                    className="ev2-esquirla"
                    aria-hidden="true"
                    style={{
                      ["--dx" as string]: `${Math.cos(ang) * d}px`,
                      ["--dy" as string]: `${Math.sin(ang) * d}px`,
                      ["--r" as string]: `${i * 47}deg`,
                    }}
                  />
                );
              })}
            </>
          )}

          {revelacion === "revelada" && (
            <div className="absolute inset-0">
              <span className="ev2-rayos" aria-hidden="true" />
              <img
                src={recompensaImg}
                alt={t.raidDesbloqueada}
                draggable={false}
                className="ev2-recompensa-img relative h-full w-full object-contain"
              />
            </div>
          )}

          {impactos.map(k => (
            <span key={`i${k.id}`} className="pointer-events-none absolute" style={{ left: k.x, top: k.y }} aria-hidden="true">
              <span className="ev2-impacto-onda" />
              <span className="ev2-impacto-corte" style={{ ["--rot" as string]: `${k.rot}deg` }} />
              {Array.from({ length: 6 }, (_, j) => {
                const ang = (Math.PI * 2 * j) / 6 + k.rot / 60;
                return (
                  <span
                    key={j}
                    className="ev2-chispa"
                    style={{
                      ["--dx" as string]: `${Math.cos(ang) * 42}px`,
                      ["--dy" as string]: `${Math.sin(ang) * 42}px`,
                    }}
                  />
                );
              })}
            </span>
          ))}

          {fase === "jugando" && toques > 0 && (
            <div className="pointer-events-none absolute right-0 top-0 text-right" aria-live="off">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: colorCombo(toques) }}>
                {t.raidCombo}
              </p>
              <p
                key={toques}
                className="ev2-combo ev-display text-4xl tabular-nums"
                style={{ color: colorCombo(toques), textShadow: `0 0 18px ${colorCombo(toques)}` }}
              >
                x{toques}
              </p>
            </div>
          )}

          {zarpazo && <span key={`z${zarpazo.id}`} className="rj-zarpazo-luz" aria-hidden="true" />}

          {anuncio && (
            <div key={anuncio.id} className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <span className="ev2-flash-rojo" />
              <p
                className="ev2-anuncio ev-display relative whitespace-nowrap text-center text-white"
                style={{ fontSize: "clamp(2rem, 10vw, 3.25rem)", textShadow: "0 0 24px #f43f5e, 0 0 48px #fbbf24" }}
              >
                {anuncio.texto}
              </p>
            </div>
          )}

          {ajenos.map(a => (
            <span
              key={`a${a.id}`}
              className="ev2-danio-ajeno ev-display pointer-events-none absolute top-[28%] text-3xl text-white"
              style={{ left: `${a.x}%`, textShadow: "0 0 16px #f43f5e, 0 0 30px #f43f5e" }}
              aria-hidden="true"
            >
              −{a.n}
            </span>
          ))}

          {numeros.map(n => (
            <span key={n.id} className="ev2-danio pointer-events-none absolute font-mono text-xl font-black text-[#fb7185]" style={{ left: n.x, top: n.y }}>
              −{data?.activo ? data.multiplicador : 1}
            </span>
          ))}

          {fase === "cuenta" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#06040d]/60">
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-[#fb7185]">{t.raidPreparate}</p>
              <p key={cuenta} className="ev2-cuenta ev-display text-7xl text-white">{cuenta || "!"}</p>
            </div>
          )}

          {caido && revelacion === "no" && (
            <div className="absolute inset-x-0 bottom-4 text-center">
              <p className="ev-display text-2xl text-white sm:text-3xl">{t.raidDerrotado}</p>
            </div>
          )}
        </div>

        </div>

        {/* Vida del cazador: el jefe se la va quitando mientras lo golpea */}
        {isAuthenticated && !caido && (
          <div className="relative mx-auto mb-6 max-w-md text-left">
            <div className="mb-1.5 flex items-end justify-between font-mono text-xs uppercase tracking-widest">
              <span className="text-[#4ade80]">{t.raidVidaTitulo}</span>
              <span className="tabular-nums text-white">{Math.round(enRonda ? vidaBarra : vidaActual).toLocaleString()} / {vidaMax.toLocaleString()}</span>
            </div>
            <div ref={barraVidaRef} className="relative h-3.5 w-full overflow-hidden border border-[#4ade80]/40 bg-[#07140c]">
              <div className="h-full transition-[width] duration-300" style={{ width: `${pctVida}%`, background: pctVida > 25 ? "linear-gradient(90deg, #15803d, #4ade80)" : "linear-gradient(90deg, #991b1b, #f87171)" }} />
            </div>
            {zarpazo && (
              <p key={zarpazo.id} className="rj-zarpazo-texto font-mono text-xs font-bold text-[#fca5a5]" aria-live="off">
                {t.raidZarpazo} −{zarpazo.n}
              </p>
            )}
            {!enRonda && <p className="mt-2 text-xs leading-relaxed text-[#9db8a5]">{t.raidVidaAyuda}</p>}
          </div>
        )}

        {/* Controles y estado de la ronda */}
        <div className="mx-auto max-w-md text-center">
          {/* Día sin límite: sin contador de tiempo; se golpea hasta tocar «Terminar» */}
          {fase === "jugando" && sinTiempo && (
            <>
              <p className="mb-3 text-sm font-bold text-white">{t.raidToca}</p>
              <div className="mb-4 flex items-center justify-between font-mono text-sm">
                <span className="text-[#fb7185]">{toques.toLocaleString()} {t.raidGolpes}</span>
                <span className="tabular-nums text-white">{t.raidDanioSesion} {(sesion + golpes * (data.multiplicador ?? 1)).toLocaleString()}</span>
              </div>
              <button
                onClick={() => void terminar()}
                className="ev-press min-h-[44px] border border-white/30 px-8 text-sm font-bold uppercase tracking-wider text-white"
              >
                {t.raidTerminar}
              </button>
            </>
          )}

          {fase === "jugando" && !sinTiempo && (
            <>
              <p className="mb-3 text-sm font-bold text-white">{t.raidToca}</p>
              <div className="mb-2 flex items-center justify-between font-mono text-sm">
                <span className="text-[#fb7185]">{golpes} {t.raidGolpes}</span>
                <span className="tabular-nums text-white">{(restante / 1000).toFixed(1)}s</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-[#f43f5e]" style={{ width: `${(restante / RONDA_MS) * 100}%` }} />
              </div>
            </>
          )}

          {fase === "enviando" && <p className="font-mono text-sm text-[#c9a8b8]">…</p>}

          {fase === "resultado" && danioFinal > 0 && (
            <div className="mb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#fb7185]">{t.raidDanioTotal}</p>
              <p className="ev-display text-6xl tabular-nums text-white" style={{ textShadow: "0 0 26px rgba(244,63,94,0.8)" }}>
                −{conteo}
              </p>
            </div>
          )}

          {fase === "resultado" && (
            <p className="rounded-none border border-[#f43f5e]/40 bg-[#f43f5e]/10 px-5 py-4 text-sm leading-relaxed text-[#ffd0d8]">
              {mensaje}
            </p>
          )}

          {caido && (fase === "listo" || fase === "resultado") && (revelacion === "revelada" || !recompensaImg) && (
            <div className={recompensaImg ? "ev2-aparece-tarde" : ""}>
              {recompensaImg && (
                <p className="ev-display mb-3 text-2xl text-white sm:text-3xl" style={{ textShadow: "0 0 24px rgba(251,191,36,0.7)" }}>
                  {t.raidDesbloqueada}
                </p>
              )}
              <p className="mt-3 border border-[#a78bfa]/40 bg-[#a78bfa]/10 px-5 py-4 text-sm leading-relaxed text-[#ddd6fe]">
                {recompensa || t.raidRecompensa}
              </p>
            </div>
          )}

          {sinVida && !enRonda && (
            <div className="mt-3 border border-[#f87171]/50 bg-[#f87171]/10 px-5 py-4 text-left" role="status">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#fca5a5]">☠ {t.raidSinVidaTitulo}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#fde2e2]">
                {t.raidSinVidaTexto.replace("{t}", falta(Date.now() + msVida(vidaMinima - vidaActual))).replace("{c}", falta(Date.now() + msVida(vidaMax - vidaActual)))}
              </p>
            </div>
          )}

          {enDescanso && (fase === "listo" || fase === "resultado") && (
            <div className="mt-3 border border-[#22d3ee]/50 bg-[#22d3ee]/10 px-5 py-4" role="status">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#67e8f9]">⏳ {t.raidDescansoTitulo}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#d5f5fb]">{t.raidDescansoTexto.replace("{t}", falta(descansoFin))}</p>
            </div>
          )}

          {fase === "listo" && !caido && data.yaAtaco && (
            <p className="border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-relaxed text-[#c9a8b8]">
              {t.raidYaAtacaste}
            </p>
          )}

          {puedeAtacar && !isAuthenticated && (
            <div>
              <button
                onClick={openLoginModal}
                className="ev-notch ev-press ev2-latido inline-flex items-center gap-2 bg-[#f43f5e] px-10 py-4 text-sm font-bold uppercase tracking-wider text-white"
              >
                <Swords size={18} /> {t.raidIniciaSesion}
              </button>
              {invitacionPendiente()
                ? <p className="mx-auto mt-3 max-w-xs text-xs font-bold leading-relaxed text-[#fde68a]">{t.raidInvInvitado}</p>
                : <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-[#9d7f8f]">{t.raidNecesitasCuenta}</p>}
            </div>
          )}

          {/* Cazador veterano: desde su 5.º ataque válido, daño doble */}
          {isAuthenticated && !caido && (data.multiplicador ?? 1) > 1 && fase !== "jugando" && (
            <p className="ev2-veterano mb-3 inline-flex items-center gap-1.5 border border-[#fbbf24]/50 bg-[#fbbf24]/10 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#fde68a]">
              ⚡ {data.motivoX === "refuerzo" ? t.raidX4Refuerzo : data.motivoX === "bono" ? t.raidX2Bono : t.raidVeteranoX2}
            </p>
          )}
          {isAuthenticated && !caido && (data.multiplicador ?? 1) === 1 && fase === "listo" && (
            <div className="mx-auto mb-4 max-w-xs">
              <p className="mb-1.5 text-[11px] text-[#c9a8b8]">
                {t.raidVeteranoProgreso.replace("{n}", String(Math.min(data.misAtaques ?? 0, 4)))}
              </p>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map(i => (
                  <span key={i} className="h-1.5 flex-1" style={{ background: i < (data.misAtaques ?? 0) ? "#fbbf24" : "rgba(255,255,255,0.12)" }} />
                ))}
              </div>
            </div>
          )}

          {puedeAtacar && isAuthenticated && (
            <button
              onClick={empezar}
              disabled={iniciarRonda.isPending}
              className="ev-notch ev-press ev2-latido inline-flex items-center gap-2 bg-[#f43f5e] px-10 py-4 text-sm font-bold uppercase tracking-wider text-white"
            >
              <Swords size={18} /> {fase === "resultado" ? t.raidAtacarOtra : t.raidAtacar}
            </button>
          )}
        </div>

        {/* Invitar: compartir el enlace propio y ver los bonos activos */}
        {!caido && !enRonda && (
          <div className="mx-auto mt-10 max-w-md border border-[#fbbf24]/35 bg-[#fbbf24]/[0.07] px-5 py-5 text-left">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#fbbf24]">{t.raidInvTitulo}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#f3e6c4]">{t.raidInvIntro}</p>

            <p className="mt-4 text-sm font-bold text-white">{t.raidInvGanas}</p>
            <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-[#fde68a]">
              <li className="flex gap-2"><span aria-hidden="true">⚡</span><span>{t.raidInvGanasTu}</span></li>
              <li className="flex gap-2"><span aria-hidden="true">⚡</span><span>{t.raidInvGanasInvitado}</span></li>
            </ul>

            <p className="mt-4 text-sm font-bold text-white">{t.raidInvCondiciones}</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-[#d9cba6]">
              {[t.raidInvCond1, t.raidInvCond2, t.raidInvCond3, t.raidInvCond4, t.raidInvCond5].map(c => <li key={c}>{c}</li>)}
            </ul>

            {isAuthenticated && inv ? (
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => compartirInvitacion(enlaceInv)}
                  className="ev-press min-h-[44px] flex-1 bg-[#fbbf24] px-4 text-sm font-bold uppercase tracking-wider text-[#1a1204]"
                >
                  {t.raidInvCompartir}
                </button>
                <button
                  onClick={() => copiarInvitacion(enlaceInv)}
                  className="ev-press min-h-[44px] shrink-0 border border-[#fbbf24]/60 px-4 text-sm font-bold uppercase tracking-wider text-[#fde68a]"
                >
                  {invCopiado ? t.raidInvCopiado : t.raidInvCopiar}
                </button>
              </div>
            ) : (
              <button
                onClick={openLoginModal}
                className="ev-press mt-5 min-h-[44px] w-full border border-[#fbbf24]/60 px-4 text-sm font-bold uppercase tracking-wider text-[#fde68a]"
              >
                {t.raidInvEntrar}
              </button>
            )}
            {inv && inv.refuerzoHasta > 0 && (
              <p className="mt-4 text-sm font-bold leading-relaxed text-[#fde68a]">
                ⚡ {t.raidInvActivo.replace("{t}", falta(inv.refuerzoHasta))} {inv.acumulados < 2 ? t.raidInvSuma : t.raidInvTope}
              </p>
            )}
            {inv && inv.refuerzoHasta === 0 && inv.esperaHasta > 0 && (
              <p className="mt-4 text-sm leading-relaxed text-[#f3e6c4]">
                {t.raidInvEspera.replace("{f}", new Date(inv.esperaHasta).toLocaleDateString(idioma, { day: "numeric", month: "long" }))}
              </p>
            )}
            {inv && inv.bonoHasta > 0 && inv.refuerzoHasta === 0 && (
              <p className="mt-4 text-sm font-bold leading-relaxed text-[#fde68a]">⚡ {t.raidInvBono.replace("{t}", falta(inv.bonoHasta))}</p>
            )}
            {inv && inv.invitados > 0 && (
              <p className="mt-2 font-mono text-[11px] text-[#c9b98f]">{t.raidInvUnidos.replace("{n}", String(inv.invitados))}</p>
            )}
          </div>
        )}

        {/* Los 10 cazadores con más daño; el primero lleva la corona */}
        {top.length > 0 && (
          <div className="mx-auto mt-10 max-w-md">
            <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#f43f5e]">{t.raidTopTitulo}</p>
            <ol className="border border-[#f43f5e]/25 bg-[#12060d]/85">
              {top.map((p, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-white/[0.06]" : "bg-[#fbbf24]/10"} ${i === miFila && i > 0 ? "bg-[#f43f5e]/10" : ""}`}
                >
                  <span className={`w-5 shrink-0 font-mono text-xs tabular-nums ${i === 0 ? "font-bold text-[#fbbf24]" : "text-[#9d7f8f]"}`}>{i + 1}</span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className={`truncate text-sm font-bold ${i === 0 ? "text-[#fde68a]" : "text-white"}`}>{p.nombre}</span>
                    {i === 0 && <Crown size={15} className="shrink-0 text-[#fbbf24]" fill="#fbbf24" aria-label={t.raidTopLider} />}
                    {i === miFila && (
                      <span className="shrink-0 border border-[#fb7185]/50 px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-widest text-[#fb7185]">{t.raidTopTu}</span>
                    )}
                  </span>
                  <span className={`shrink-0 font-mono text-sm tabular-nums ${i === 0 ? "font-bold text-[#fde68a]" : "text-[#fecdd3]"}`}>{p.danio.toLocaleString()}</span>
                </li>
              ))}
            </ol>
            {isAuthenticated && miDanio > 0 && miFila < 0 && (
              <p className="mt-2 text-right font-mono text-[11px] text-[#9d7f8f]">{t.raidTopMiDanio.replace("{n}", miDanio.toLocaleString())}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
