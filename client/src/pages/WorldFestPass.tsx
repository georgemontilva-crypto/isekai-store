import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  Loader2, Search, Check, Lock, MapPin, Trophy, X, LogOut,
  Swords, User, ScrollText, ChevronLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBoletoSocket } from "@/hooks/useBoletoSocket";

/**
 * Zona del evento — Isekai World Fest.
 *
 * Es un espacio APARTE de la tienda: sin navbar, sin footer, con su propia
 * navegación y su propia estética. La idea es que quien entra sienta que
 * cruzó a otro lugar, no que abrió una sección más de la web.
 *
 * Se accede con el código impreso del boleto, sin necesidad de cuenta: la
 * mayoría de asistentes no la tendrán.
 */

const CLAVE_BOLETO = "iw_worldfest_boleto";


const COLOR_RANGO: Record<string, string> = {
  E: "#8a8a9c",
  D: "#4ade80",
  C: "#38bdf8",
  B: "#a78bfa",
  A: "#fbbf24",
  S: "#f43f5e",
};

const RANGOS_INFO = [
  { rango: "E", desde: 0 },
  { rango: "D", desde: 60 },
  { rango: "C", desde: 140 },
  { rango: "B", desde: 240 },
  { rango: "A", desde: 360 },
  { rango: "S", desde: 500 },
];

type Pestana = "rango" | "misiones" | "perfil";

export default function WorldFestPass() {
  /**
   * TEMPORAL: la zona del evento todavía no es pública. Mientras se prepara,
   * solo entra el dueño. Quitar esta restricción antes del evento.
   */
  const { user, isAuthenticated, loading: cargandoSesion } = useAuth();
  const esAdmin = isAuthenticated && user?.role === "admin";

  const [codigo, setCodigo] = useState("");
  const [consultado, setConsultado] = useState("");
  const [pestana, setPestana] = useState<Pestana>("rango");
  const [rangoAnunciado, setRangoAnunciado] = useState<string | null>(null);
  const rangoPrevio = useRef<string | null>(null);

  // El boleto se recuerda: nadie quiere teclear su código cada vez
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_BOLETO);
      if (guardado) setConsultado(guardado);
    } catch { /* almacenamiento no disponible */ }
  }, []);

  const { data, isLoading, error } = trpc.levelPass.estado.useQuery(
    { codigo: consultado },
    { enabled: consultado.length >= 4, retry: false, refetchInterval: 15000 },
  );


  const utils = trpc.useUtils();

  /**
   * Los puntos llegan al instante por conexión en vivo. La consulta cada 15
   * segundos se mantiene como respaldo por si la conexión se cae.
   */
  useBoletoSocket(consultado, (aviso) => {
    /**
     * El aviso ya trae los puntos y el rango, así que se aplican de inmediato
     * sobre lo que hay en pantalla. Antes se pedían de nuevo al servidor, y
     * esa vuelta se notaba como un retraso de varios segundos.
     */
    utils.levelPass.estado.setData({ codigo: consultado }, (previo: any) => {
      if (!previo) return previo;
      return { ...previo, xpTotal: aviso.xpTotal, rango: aviso.rango, esRangoS: aviso.rango === "S" };
    });

    // En segundo plano se traen los datos completos: qué misiones quedaron
    // marcadas, el historial y cuánto falta para el siguiente rango.
    utils.levelPass.estado.invalidate({ codigo: consultado });
  });

  useEffect(() => {
    if (!data?.rango) return;
    if (rangoPrevio.current && rangoPrevio.current !== data.rango) {
      setRangoAnunciado(data.rango);
      setAnchoBarra(0);   // se llenará de nuevo al cerrar el anuncio
      // Vibración corta: en el teléfono refuerza el momento sin depender
      // de que el asistente esté mirando la pantalla.
      try { navigator.vibrate?.([40, 60, 120]); } catch { /* no soportado */ }
    }
    rangoPrevio.current = data.rango;
  }, [data?.rango]);

  const entrar = (valor: string) => {
    const limpio = valor.trim();
    if (limpio.length < 4) return;
    setConsultado(limpio);
    try { localStorage.setItem(CLAVE_BOLETO, limpio); } catch { /* ignorado */ }
  };

  const salir = () => {
    setConsultado("");
    setCodigo("");
    rangoPrevio.current = null;
    try { localStorage.removeItem(CLAVE_BOLETO); } catch { /* ignorado */ }
  };

  const color = data ? (COLOR_RANGO[data.rango] ?? "#38bdf8") : "#38bdf8";
  const esRangoMaximo = rangoAnunciado === "S";

  /**
   * La barra de experiencia se llena desde cero al entrar y al cambiar de
   * rango: ver el avance producirse es lo que da sensación de progreso,
   * frente a encontrarla ya llena.
   */
  const [anchoBarra, setAnchoBarra] = useState(0);
  useEffect(() => {
    if (!data) return;
    const destino = data.siguiente?.progreso ?? 100;
    const id = setTimeout(() => setAnchoBarra(destino), 120);
    return () => clearTimeout(id);
  }, [data?.xpTotal, data?.rango]);

  if (cargandoSesion) {
    return (
      <div className="wf-zona flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#38bdf8]" />
      </div>
    );
  }

  // ── Todavía no es pública ──
  if (!esAdmin) {
    return (
      <div className="wf-zona flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="lp-ventana w-full max-w-sm p-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.4em] text-[#7dd8ff]">
            Isekai World Fest
          </p>
          <h1 className="mb-3 text-2xl font-black text-white">Sistema en preparación</h1>
          <p className="mb-7 text-sm leading-relaxed text-[#8fa8bd]">
            El Level Pass se activará antes del evento. Vuelve pronto.
          </p>
          <Link
            href="/world-fest"
            className="block w-full rounded-lg border border-[#38bdf8]/40 bg-[#38bdf8]/10 py-3.5 font-mono text-xs uppercase tracking-widest text-[#7dd8ff]"
          >
            Volver
          </Link>
        </div>
      </div>
    );
  }

  // ── Entrada: sin boleto todavía ──
  if (!data) {
    return (
      <div
        className="wf-zona flex min-h-screen flex-col items-center justify-center px-6 py-16"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 5rem)" }}
      >
        <Link
          href="/world-fest"
          className="absolute left-5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[#5f7f96] transition-colors hover:text-[#7dd8ff]"
          style={{ top: "calc(env(safe-area-inset-top) + 1.25rem)" }}
        >
          <ChevronLeft size={13} /> Salir
        </Link>

        <div className="lp-ventana w-full max-w-md p-7 sm:p-9">
          <p className="mb-2 text-center font-mono text-[11px] uppercase tracking-[0.4em] text-[#7dd8ff]">
            Isekai World Fest
          </p>
          <h1 className="mb-3 text-center text-3xl font-black text-white">
            Entrar al sistema
          </h1>
          <p className="mb-7 text-center text-sm leading-relaxed text-[#8fa8bd]">
            Escribe el código impreso en tu boleto. Desde aquí verás tu rango,
            las misiones disponibles y tu progreso.
          </p>

          <div className="flex gap-2">
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === "Enter") entrar(codigo); }}
              placeholder="IW-XXXXXX"
              className="w-full rounded-lg border border-[#38bdf8]/25 bg-[#050b14] px-4 font-mono uppercase tracking-widest text-white outline-none transition-colors placeholder:text-[#3a5a72] focus:border-[#38bdf8]"
              style={{ minHeight: 54 }}
            />
            <button
              onClick={() => entrar(codigo)}
              disabled={codigo.trim().length < 4}
              className="shrink-0 rounded-lg border border-[#38bdf8]/50 bg-[#38bdf8]/10 px-5 text-[#7dd8ff] disabled:opacity-40"
              style={{ minHeight: 54 }}
              aria-label="Entrar"
            >
              {isLoading ? <Loader2 size={19} className="animate-spin" /> : <Search size={19} />}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-red-400">{error.message}</p>
          )}

          <p className="mt-6 text-center text-[11px] leading-relaxed text-[#5f7f96]">
            El código está debajo del QR de tu boleto.
          </p>

          {/* TEMPORAL: atajo mientras se prueba el sistema */}
          <div className="mt-5 border-t border-[#38bdf8]/12 pt-4">
            <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-[#5f7f96]">
              Boletos de prueba
            </p>
            <div className="flex justify-center gap-2">
              {["IW-TEST01", "IW-TEST02", "IW-TEST03"].map(c => (
                <button
                  key={c}
                  onClick={() => entrar(c)}
                  className="rounded-lg border border-[#38bdf8]/25 px-3 py-2 font-mono text-[11px] text-[#7dd8ff] transition-colors hover:border-[#38bdf8]/60"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="wf-zona min-h-screen pb-28">

      {/* ── Anuncio de ascenso ── */}
      {rangoAnunciado && (
        <div
          className="lp-overlay fixed inset-0 z-[200] flex items-center justify-center bg-black/88 px-6"
          onClick={() => setRangoAnunciado(null)}
        >
          {/* Destello del color del rango que tiñe la pantalla */}
          <span
            className="lp-fogonazo"
            style={{
              background: `radial-gradient(circle at 50% 45%, ${COLOR_RANGO[rangoAnunciado] ?? "#38bdf8"}, transparent 65%)`,
            }}
          />
          <div
            className="lp-ventana lp-anuncio relative w-full max-w-sm overflow-hidden p-8 text-center"
            onClick={e => e.stopPropagation()}
            style={{
              ["--lp-glow" as string]: `${COLOR_RANGO[rangoAnunciado] ?? "#38bdf8"}66`,
              ["--lp-glow-soft" as string]: `${COLOR_RANGO[rangoAnunciado] ?? "#38bdf8"}22`,
            }}
          >
            {/* Destello que cruza la ventana al aparecer */}
            <span className="lp-brillo" />
            {/* Línea de escaneo, como una interfaz que se inicializa */}
            <span className="lp-escaneo" />

            {/* Partículas ascendentes: más y más rápidas en rango S */}
            {Array.from({ length: esRangoMaximo ? 18 : 10 }, (_, i) => (
              <span
                key={i}
                className="lp-particula"
                style={{
                  color: COLOR_RANGO[rangoAnunciado] ?? "#38bdf8",
                  left: `${6 + (i * 88) / (esRangoMaximo ? 18 : 10)}%`,
                  animationDelay: `${0.4 + i * 0.13}s`,
                  animationDuration: `${(esRangoMaximo ? 1.9 : 2.4) + (i % 3) * 0.35}s`,
                }}
              />
            ))}

            <button
              onClick={() => setRangoAnunciado(null)}
              className="absolute right-3 top-3 z-10 p-2 text-[#7dd8ff]/60 hover:text-white"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <p className="lp-linea-1 mb-2 font-mono text-[11px] uppercase tracking-[0.4em] text-[#7dd8ff]">
              Notificación
            </p>
            <p className="lp-linea-2 mb-7 text-sm text-[#b8e6ff]">Has subido de rango</p>

            {/* Sello del rango: gira al entrar y late después, con anillos
                que se expanden desde el borde. */}
            <div
              className={`lp-sello relative mx-auto mb-7 flex items-center justify-center rounded-full border-2 ${esRangoMaximo ? "h-36 w-36" : "h-28 w-28"}`}
              style={{
                borderColor: COLOR_RANGO[rangoAnunciado] ?? "#38bdf8",
                color: COLOR_RANGO[rangoAnunciado] ?? "#38bdf8",
              }}
            >
              <span className="lp-anillo lp-anillo-1" />
              <span className="lp-anillo lp-anillo-2" />
              {esRangoMaximo && <span className="lp-aura" />}

              {/* La letra se desdobla en cian y magenta antes de asentarse */}
              <span className="lp-glitch font-mono text-6xl font-black" style={{ color: COLOR_RANGO[rangoAnunciado] ?? "#38bdf8" }}>
                <span className="lp-glitch-capa lp-glitch-cian font-mono text-6xl font-black" aria-hidden="true">
                  {rangoAnunciado}
                </span>
                <span className="lp-glitch-capa lp-glitch-magenta font-mono text-6xl font-black" aria-hidden="true">
                  {rangoAnunciado}
                </span>
                {rangoAnunciado}
              </span>
            </div>

            <p className="lp-linea-3 text-lg font-black text-white">RANGO {rangoAnunciado}</p>
            {esRangoMaximo && (
              <div className="lp-linea-4 mt-4 rounded-lg border border-[#f43f5e]/40 bg-[#f43f5e]/10 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#f43f5e]">
                  Rango máximo
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#ffd0d8]">
                  Ya estás dentro del <strong className="text-white">sorteo especial</strong> del
                  cierre del evento.
                </p>
              </div>
            )}

            <button
              onClick={() => setRangoAnunciado(null)}
              className="lp-linea-4 mt-7 w-full rounded-lg border border-[#38bdf8]/50 bg-[#38bdf8]/10 font-mono text-sm font-bold uppercase tracking-widest text-[#7dd8ff] transition-colors hover:bg-[#38bdf8]/20"
              style={{ minHeight: 48 }}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* ── Cabecera propia ── */}
      <header
        className="sticky top-0 z-40 border-b border-[#38bdf8]/15 bg-[#040a12]/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7dd8ff]">
              World Fest
            </p>
            <p className="truncate text-sm font-black text-white">{data.nombre}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full border font-mono text-base font-black"
              style={{ borderColor: color, color, boxShadow: `0 0 14px ${color}44` }}
            >
              {data.rango}
            </span>
            <button onClick={salir} className="p-2 text-[#5f7f96] hover:text-[#7dd8ff]" aria-label="Salir">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-6">

        {/* ── Mi rango ── */}
        {pestana === "rango" && (
          <>
            <div className="lp-ventana mb-4 p-6 sm:p-8">
              <div className="mb-7 flex flex-col items-center text-center">
                <div
                  className="mb-4 flex h-32 w-32 items-center justify-center rounded-full border-2"
                  style={{ borderColor: color, boxShadow: `0 0 36px ${color}55, inset 0 0 26px ${color}22` }}
                >
                  <span className="font-mono text-6xl font-black" style={{ color }}>{data.rango}</span>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#7dd8ff]">
                  Rango actual
                </p>
              </div>

              <div className="mb-2 flex items-end justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-[#7dd8ff]">
                  Experiencia
                </span>
                <span className="font-mono text-sm font-bold text-white">{data.xpTotal} XP</span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-[#0d1c2b]">
                <div
                  className="h-full rounded-full transition-all duration-[1100ms] ease-out"
                  style={{
                    width: `${anchoBarra}%`,
                    background: `linear-gradient(90deg, ${color}, #7dd8ff)`,
                    boxShadow: `0 0 14px ${color}88`,
                  }}
                />
              </div>

              <p className="mt-3 text-center text-sm text-[#8fa8bd]">
                {data.siguiente
                  ? <>Faltan <strong className="text-white">{data.siguiente.faltan} XP</strong> para el rango {data.siguiente.rango}</>
                  : "Has alcanzado el rango máximo"}
              </p>

              {data.esRangoS && (
                <div className="mt-6 flex items-center gap-3 rounded-lg border border-[#f43f5e]/40 bg-[#f43f5e]/10 p-4">
                  <Trophy size={20} className="shrink-0 text-[#f43f5e]" />
                  <p className="text-sm leading-relaxed text-[#ffd0d8]">
                    Estás dentro del <strong className="text-white">sorteo especial</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Escala de rangos */}
            <div className="lp-ventana p-6 sm:p-8">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[#7dd8ff]">
                Escala
              </p>
              <div className="flex flex-col gap-2.5">
                {RANGOS_INFO.map(r => {
                  const alcanzado = data.xpTotal >= r.desde;
                  const esActual = data.rango === r.rango;
                  return (
                    <div
                      key={r.rango}
                      className={`flex items-center gap-3.5 rounded-lg border px-4 py-3 ${
                        esActual ? "border-[#38bdf8]/50 bg-[#38bdf8]/[0.07]" : "border-[#38bdf8]/12"
                      }`}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-black"
                        style={{
                          borderColor: alcanzado ? (COLOR_RANGO[r.rango] ?? "#38bdf8") : "#1e3a52",
                          color: alcanzado ? (COLOR_RANGO[r.rango] ?? "#38bdf8") : "#3a5a72",
                        }}
                      >
                        {r.rango}
                      </span>
                      <span className={`flex-1 text-sm ${alcanzado ? "text-white" : "text-[#5f7f96]"}`}>
                        {r.desde} XP
                      </span>
                      {alcanzado && <Check size={15} className="text-[#4ade80]" />}
                      {r.rango === "S" && (
                        <span className="font-mono text-[10px] uppercase tracking-widest text-[#f43f5e]">
                          Sorteo
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Misiones ── */}
        {pestana === "misiones" && (
          <div className="lp-ventana p-6 sm:p-8">
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-[#7dd8ff]">
              Misiones disponibles
            </p>
            <p className="mb-5 text-xs text-[#8fa8bd]">
              Complétalas durante el evento para ganar experiencia.
            </p>

            <div className="flex flex-col gap-2.5">
              {data.actividades.map((a: any) => (
                <div
                  key={a.id}
                  className={`flex items-start gap-3.5 rounded-lg border p-4 ${
                    a.completada ? "border-[#4ade80]/25 bg-[#4ade80]/[0.05]" : "border-[#38bdf8]/25 bg-[#050b14]"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border ${
                      a.completada ? "border-[#4ade80] bg-[#4ade80]/15" : "border-[#38bdf8]/35"
                    }`}
                  >
                    {a.completada
                      ? <Check size={13} className="text-[#4ade80]" />
                      : <Lock size={11} className="text-[#38bdf8]/50" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${a.completada ? "text-[#8fa8bd]" : "text-white"}`}>
                      {a.name}
                    </p>
                    {a.description && (
                      <p className="mt-1 text-xs leading-relaxed text-[#8fa8bd]">{a.description}</p>
                    )}
                    {a.ubicacion && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#5f7f96]">
                        <MapPin size={11} /> {a.ubicacion}
                      </p>
                    )}
                    {a.tope > 1 && (
                      <p className="mt-1 text-[11px] text-[#5f7f96]">{a.veces} de {a.tope} veces</p>
                    )}
                  </div>

                  <span
                    className="shrink-0 font-mono text-sm font-black"
                    style={{ color: a.completada ? "#4ade80" : "#7dd8ff" }}
                  >
                    +{a.xp}
                  </span>
                </div>
              ))}

              {data.actividades.length === 0 && (
                <p className="py-10 text-center text-sm text-[#8fa8bd]">
                  Todavía no hay misiones publicadas.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Perfil ── */}
        {pestana === "perfil" && (
          <>
            <div className="lp-ventana mb-4 p-6 sm:p-8">
              <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.3em] text-[#7dd8ff]">
                Cazador
              </p>

              <div className="flex flex-col gap-3">
                {[
                  ["Nombre", data.nombre],
                  ["Boleto", data.codigo],
                  ["Rango", data.rango],
                  ["Experiencia", `${data.xpTotal} XP`],
                  ["Misiones completadas", String(data.actividades.filter((a: any) => a.completada).length)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-b border-[#38bdf8]/10 pb-2.5 last:border-0">
                    <span className="text-sm text-[#8fa8bd]">{k}</span>
                    <span className="text-right font-mono text-sm font-bold text-white" style={{ overflowWrap: "anywhere" }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {data.historial.length > 0 && (
              <div className="lp-ventana p-6 sm:p-8">
                <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[#7dd8ff]">
                  Registro de actividad
                </p>
                <div className="flex flex-col gap-2">
                  {data.historial.map((h: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-3 border-b border-[#38bdf8]/10 pb-2 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[#b8e6ff]">{h.actividad}</p>
                        <p className="font-mono text-[10px] text-[#5f7f96]">
                          {new Date(h.fecha).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-xs font-bold text-[#4ade80]">+{h.xp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/world-fest"
              className="mt-6 block text-center font-mono text-xs uppercase tracking-widest text-[#5f7f96] transition-colors hover:text-[#7dd8ff]"
            >
              Volver a Isekai World Fest
            </Link>
          </>
        )}
      </div>

      {/* ── Navegación propia, estilo app ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#38bdf8]/20 bg-[#040a12]/97 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-2xl">
          {([
            ["rango", "Mi rango", Swords],
            ["misiones", "Misiones", ScrollText],
            ["perfil", "Perfil", User],
          ] as const).map(([id, label, Icono]) => (
            <button
              key={id}
              onClick={() => setPestana(id)}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors"
              style={{ minHeight: 62, WebkitTapHighlightColor: "transparent" }}
            >
              <Icono size={19} className={pestana === id ? "text-[#7dd8ff]" : "text-[#3a5a72]"} />
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  pestana === id ? "text-[#7dd8ff]" : "text-[#3a5a72]"
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
