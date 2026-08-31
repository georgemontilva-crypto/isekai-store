import { useState, useEffect, useRef } from "react";
import { Loader2, Search, Check, Lock, MapPin, Trophy, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Level Pass — vista del asistente.
 *
 * Consulta con el código impreso del boleto, sin necesidad de cuenta. Muestra
 * el rango actual, la barra de progreso y las actividades disponibles con la
 * experiencia que otorgan.
 *
 * La estética sigue la de las ventanas de sistema de Solo Leveling: azul
 * cian sobre azul muy oscuro, marcos finos luminosos y tipografía monoespaciada.
 */

const COLOR_RANGO: Record<string, string> = {
  E: "#8a8a9c",
  D: "#4ade80",
  C: "#38bdf8",
  B: "#a78bfa",
  A: "#fbbf24",
  S: "#f43f5e",
};

export default function LevelPass({ eventId }: { eventId?: number }) {
  const [codigo, setCodigo] = useState("");
  const [consultado, setConsultado] = useState("");
  const [rangoAnunciado, setRangoAnunciado] = useState<string | null>(null);
  const rangoPrevio = useRef<string | null>(null);

  const { data, isLoading, error } = trpc.levelPass.estado.useQuery(
    { codigo: consultado },
    { enabled: consultado.length >= 4, retry: false, refetchInterval: 20000 },
  );

  /**
   * Si el rango cambia entre dos consultas, se anuncia. Como los datos se
   * refrescan solos cada 20 segundos, el asistente ve el ascenso sin recargar.
   */
  useEffect(() => {
    if (!data?.rango) return;
    if (rangoPrevio.current && rangoPrevio.current !== data.rango) {
      setRangoAnunciado(data.rango);
    }
    rangoPrevio.current = data.rango;
  }, [data?.rango]);

  const color = data ? (COLOR_RANGO[data.rango] ?? "#38bdf8") : "#38bdf8";

  return (
    <div className="relative">
      {/* ── Anuncio de ascenso ── */}
      {rangoAnunciado && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 px-6"
          onClick={() => setRangoAnunciado(null)}
        >
          <div
            className="lp-ventana relative w-full max-w-sm p-8 text-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setRangoAnunciado(null)}
              className="absolute right-3 top-3 p-2 text-[#7dd8ff]/60 hover:text-white"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.4em] text-[#7dd8ff]">
              Notificación
            </p>
            <p className="mb-6 text-sm text-[#b8e6ff]">Has subido de rango</p>

            <div
              className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full border-2"
              style={{
                borderColor: COLOR_RANGO[rangoAnunciado] ?? "#38bdf8",
                boxShadow: `0 0 40px ${COLOR_RANGO[rangoAnunciado] ?? "#38bdf8"}66, inset 0 0 30px ${COLOR_RANGO[rangoAnunciado] ?? "#38bdf8"}22`,
              }}
            >
              <span
                className="font-mono text-6xl font-black"
                style={{ color: COLOR_RANGO[rangoAnunciado] ?? "#38bdf8" }}
              >
                {rangoAnunciado}
              </span>
            </div>

            <p className="text-lg font-black text-white">RANGO {rangoAnunciado}</p>
            {rangoAnunciado === "S" && (
              <p className="mt-3 text-sm leading-relaxed text-[#7dd8ff]">
                Alcanzaste el rango máximo. Ya estás dentro del sorteo especial.
              </p>
            )}

            <button
              onClick={() => setRangoAnunciado(null)}
              className="mt-7 w-full rounded-lg border border-[#38bdf8]/50 bg-[#38bdf8]/10 font-mono text-sm font-bold uppercase tracking-widest text-[#7dd8ff] transition-colors hover:bg-[#38bdf8]/20"
              style={{ minHeight: 48 }}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* ── Buscador ── */}
      {!data && (
        <div className="lp-ventana mx-auto max-w-md p-6 sm:p-8">
          <p className="mb-2 text-center font-mono text-[11px] uppercase tracking-[0.4em] text-[#7dd8ff]">
            Level Pass
          </p>
          <h2 className="mb-2 text-center text-2xl font-black text-white">
            Consulta tu rango
          </h2>
          <p className="mb-6 text-center text-sm leading-relaxed text-[#8fa8bd]">
            Escribe el código impreso en tu boleto para ver tu progreso y las
            actividades disponibles.
          </p>

          <div className="flex gap-2">
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === "Enter") setConsultado(codigo.trim()); }}
              placeholder="IW-XXXXXX"
              className="w-full rounded-lg border border-[#38bdf8]/25 bg-[#050b14] px-4 font-mono uppercase tracking-widest text-white outline-none transition-colors placeholder:text-[#3a5a72] focus:border-[#38bdf8]"
              style={{ minHeight: 52 }}
            />
            <button
              onClick={() => setConsultado(codigo.trim())}
              disabled={codigo.trim().length < 4}
              className="shrink-0 rounded-lg border border-[#38bdf8]/50 bg-[#38bdf8]/10 px-5 text-[#7dd8ff] disabled:opacity-40"
              style={{ minHeight: 52 }}
              aria-label="Consultar"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-red-400">{error.message}</p>
          )}
        </div>
      )}

      {/* ── Estado del asistente ── */}
      {data && (
        <div className="mx-auto max-w-2xl">

          {/* Rango y progreso */}
          <div className="lp-ventana mb-4 p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-5">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: color,
                  boxShadow: `0 0 24px ${color}55, inset 0 0 18px ${color}22`,
                }}
              >
                <span className="font-mono text-4xl font-black" style={{ color }}>
                  {data.rango}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#7dd8ff]">
                  Cazador
                </p>
                <p className="truncate text-lg font-black text-white">{data.nombre}</p>
                <p className="font-mono text-xs text-[#5f7f96]">{data.codigo}</p>
              </div>
            </div>

            <div className="mb-2 flex items-end justify-between">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#7dd8ff]">
                Experiencia
              </span>
              <span className="font-mono text-sm font-bold text-white">
                {data.xpTotal} XP
              </span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#0d1c2b]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${data.siguiente?.progreso ?? 100}%`,
                  background: `linear-gradient(90deg, ${color}, #7dd8ff)`,
                  boxShadow: `0 0 12px ${color}88`,
                }}
              />
            </div>

            <p className="mt-2.5 text-xs text-[#8fa8bd]">
              {data.siguiente
                ? <>Faltan <strong className="text-white">{data.siguiente.faltan} XP</strong> para el rango {data.siguiente.rango}</>
                : "Has alcanzado el rango máximo"}
            </p>

            {data.esRangoS && (
              <div className="mt-5 flex items-center gap-3 rounded-lg border border-[#f43f5e]/40 bg-[#f43f5e]/10 p-4">
                <Trophy size={20} className="shrink-0 text-[#f43f5e]" />
                <p className="text-sm leading-relaxed text-[#ffd0d8]">
                  Estás dentro del <strong className="text-white">sorteo especial</strong> del final del evento.
                </p>
              </div>
            )}
          </div>

          {/* Actividades */}
          <div className="lp-ventana p-6 sm:p-8">
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-[#7dd8ff]">
              Misiones disponibles
            </p>
            <p className="mb-5 text-xs text-[#8fa8bd]">
              Complétalas en el evento para ganar experiencia.
            </p>

            <div className="flex flex-col gap-2.5">
              {data.actividades.map((a: any) => (
                <div
                  key={a.id}
                  className={`flex items-start gap-3.5 rounded-lg border p-4 transition-colors ${
                    a.completada
                      ? "border-[#38bdf8]/15 bg-[#38bdf8]/[0.04]"
                      : "border-[#38bdf8]/25 bg-[#050b14]"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border ${
                      a.completada
                        ? "border-[#4ade80] bg-[#4ade80]/15"
                        : "border-[#38bdf8]/35"
                    }`}
                  >
                    {a.completada
                      ? <Check size={13} className="text-[#4ade80]" />
                      : <Lock size={11} className="text-[#38bdf8]/50" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${a.completada ? "text-[#8fa8bd] line-through" : "text-white"}`}>
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
                      <p className="mt-1 text-[11px] text-[#5f7f96]">
                        {a.veces} de {a.tope} veces
                      </p>
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
                <p className="py-8 text-center text-sm text-[#8fa8bd]">
                  Todavía no hay misiones publicadas.
                </p>
              )}
            </div>
          </div>

          {/* Historial */}
          {data.historial.length > 0 && (
            <div className="lp-ventana mt-4 p-6 sm:p-8">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[#7dd8ff]">
                Registro
              </p>
              <div className="flex flex-col gap-2">
                {data.historial.map((h: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-[#38bdf8]/10 pb-2 last:border-0">
                    <span className="min-w-0 truncate text-sm text-[#b8e6ff]">{h.actividad}</span>
                    <span className="shrink-0 font-mono text-xs font-bold text-[#4ade80]">+{h.xp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { setConsultado(""); setCodigo(""); rangoPrevio.current = null; }}
            className="mx-auto mt-6 block font-mono text-xs uppercase tracking-widest text-[#5f7f96] transition-colors hover:text-[#7dd8ff]"
          >
            Consultar otro boleto
          </button>
        </div>
      )}
    </div>
  );
}
