import { useEffect, useMemo, useRef, useState } from "react";
import { Swords } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import type { Translations } from "@/i18n/es";
import { useRaidSocket } from "@/hooks/useRaidSocket";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";

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

/** Color del combo según lo largo que va */
function colorCombo(n: number) {
  if (n >= 100) return "#7dd8ff";
  if (n >= 50) return "#a78bfa";
  if (n >= 25) return "#fbbf24";
  if (n >= 10) return "#f97316";
  return "#fb7185";
}

type T = Translations["evento"]["v2"];
type Fase = "listo" | "cuenta" | "jugando" | "enviando" | "resultado";

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
  t, imagen, recompensa, recompensaImg, numero,
}: { t: T; imagen: string; recompensa: string; recompensaImg: string; numero: React.ReactNode }) {
  /** Para atacar hace falta cuenta: cada ataque queda a nombre del usuario */
  const { isAuthenticated, user } = useAuth();
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

  const [fase, setFase] = useState<Fase>("listo");
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

  // Ronda de 10 segundos
  useEffect(() => {
    if (fase !== "jugando") return;
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

  const enviar = async () => {
    setFase("enviando");
    const g = golpesRef.current;
    try {
      const r = await atacar.mutateAsync({ golpes: g, ref: refNavegador });
      if (r.ok) setDanioFinal(r.golpes);
      if (r.ok) setMensaje(`${t.raidResultado.replace("{n}", r.golpes.toLocaleString())} ${t.raidVuelve}`);
      else if (r.motivo === "yaAtaco") setMensaje(t.raidYaAtacaste);
      else if (r.motivo === "limite") setMensaje(t.raidLimite);
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
        viejo && viejo.activo ? { ...vivo, yaAtaco: viejo.yaAtaco } : viejo);
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

  const empezar = () => {
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
    if (fase !== "jugando" || golpesRef.current >= GOLPES_MAX) return;
    golpesRef.current += 1;
    setGolpes(golpesRef.current);
    const n = golpesRef.current;
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

  if (!data || !data.activo) return null;

  const enRonda = fase === "cuenta" || fase === "jugando" || fase === "enviando";
  const vidaVista = Math.max(0, data.vida - (enRonda ? golpes : 0));
  const pct = data.vidaMax > 0 ? (vidaVista / data.vidaMax) * 100 : 0;
  const caido = data.derrotado;
  const puedeAtacar = !caido && !data.yaAtaco && fase === "listo";

  return (
    <section id="raid" className="ev2-diferida scroll-mt-16 ev-grid relative overflow-hidden border-y border-[#f43f5e]/20 bg-gradient-to-b from-[#12060d] to-[#06040d] px-6 py-20 lg:px-16 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#f43f5e]">
          {numero}&nbsp;&nbsp;{t.raidEtiqueta}
        </p>
        <h2 className="ev-display mb-4 text-[28px] leading-[1.05] sm:text-5xl">{t.raidTitulo}</h2>
        <p className="mb-10 max-w-2xl text-[15px] leading-relaxed text-[#c9a8b8]">{t.raidTexto}</p>

        {/* Barra de vida compartida */}
        <div ref={arenaRef} className="scroll-mt-20">
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
          className={`relative mx-auto mb-8 aspect-square w-full max-w-[300px] sm:max-w-[340px] select-none ${fase === "jugando" ? "cursor-crosshair" : ""}`}
          style={{ touchAction: fase === "jugando" ? "none" : "auto", WebkitTouchCallout: "none" }}
        >
          <div className={`absolute inset-[8%] rounded-full ${fase === "jugando" && golpes >= 50 ? "ev2-furia" : ""}`} style={{ background: caido ? "radial-gradient(circle, rgba(120,120,140,0.15), transparent 70%)" : "radial-gradient(circle, rgba(244,63,94,0.35), rgba(127,29,29,0.12) 55%, transparent 72%)" }} />
          {revelacion !== "revelada" && (
            <div
              ref={jefeRef}
              className={`relative h-full w-full ${caido && revelacion === "no" ? "grayscale" : ""} ${
                revelacion === "grieta" ? "ev2-jefe-grieta" : revelacion === "estallido" ? "ev2-jefe-estalla" : ""
              }`}
            >
              {imagen ? (
                <img src={imagen} alt="" draggable={false} className="h-full w-full object-contain" />
              ) : (
                <JefeSilueta caido={caido && revelacion === "no"} />
              )}
            </div>
          )}

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

          {fase === "jugando" && golpes > 0 && (
            <div className="pointer-events-none absolute right-0 top-0 text-right" aria-live="off">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: colorCombo(golpes) }}>
                {t.raidCombo}
              </p>
              <p
                key={golpes}
                className="ev2-combo ev-display text-4xl tabular-nums"
                style={{ color: colorCombo(golpes), textShadow: `0 0 18px ${colorCombo(golpes)}` }}
              >
                x{golpes}
              </p>
            </div>
          )}

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
              −1
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

        {/* Controles y estado de la ronda */}
        <div className="mx-auto max-w-md text-center">
          {fase === "jugando" && (
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
              <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-[#9d7f8f]">{t.raidNecesitasCuenta}</p>
            </div>
          )}

          {puedeAtacar && isAuthenticated && (
            <button
              onClick={empezar}
              className="ev-notch ev-press ev2-latido inline-flex items-center gap-2 bg-[#f43f5e] px-10 py-4 text-sm font-bold uppercase tracking-wider text-white"
            >
              <Swords size={18} /> {t.raidAtacar}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
