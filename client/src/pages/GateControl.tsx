import { useState, useEffect, useCallback } from "react";
import {
  Loader2, Check, X, AlertTriangle, ShieldCheck, WifiOff, Wifi,
  RefreshCw, Camera, Home,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";
import QrScanner from "@/components/admin/QrScanner";

/**
 * Control de acceso al evento.
 *
 * Diseñado para funcionar SIN CONEXIÓN, porque en la puerta de un evento con
 * cientos de personas la red se satura justo cuando más se necesita. El
 * portero descarga antes la lista de boletos válidos; a partir de ahí valida
 * contra el teléfono y los ingresos se envían cuando vuelve la señal.
 *
 * La venta NO funciona sin conexión a propósito: dos tiendas podrían vender el
 * mismo boleto sin saberlo. Validar entradas sí es seguro, porque un duplicado
 * se detecta al sincronizar.
 */

const CLAVE_PAQUETE = "iw_acceso_paquete";
const CLAVE_COLA = "iw_acceso_cola";

type Veredicto = {
  ok: boolean;
  motivo: string;
  mensaje: string;
  nombre?: string;
  tipoNombre?: string;
  sinConexion?: boolean;
};

export default function GateControl() {
  const { user, isAuthenticated, loading } = useAuth();
  // Igual que el portal: los permisos se comprueban en el servidor, no en el
  // rol que quedó guardado al iniciar sesión.
  const { data: acceso } = trpc.tickets.miAcceso.useQuery(undefined, { enabled: isAuthenticated });
  const esPortero = acceso?.esPortero || acceso?.rol === "admin";

  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [paquete, setPaquete] = useState<any>(null);
  const [cola, setCola] = useState<Array<{ token: string; dia: number; hora: string }>>([]);
  const [escaneando, setEscaneando] = useState(false);
  const [veredicto, setVeredicto] = useState<Veredicto | null>(null);
  const [codigoManual, setCodigoManual] = useState("");

  const { data: eventos = [] } = trpc.tickets.eventosParaAcceso.useQuery(undefined, { enabled: esPortero });
  const evento = eventos[0];

  const utils = trpc.useUtils();
  const validar = trpc.tickets.validarIngreso.useMutation();
  const sincronizar = trpc.tickets.sincronizarIngresos.useMutation();

  // ── Estado de la conexión ──
  useEffect(() => {
    const subir = () => setEnLinea(true);
    const bajar = () => setEnLinea(false);
    window.addEventListener("online", subir);
    window.addEventListener("offline", bajar);
    return () => {
      window.removeEventListener("online", subir);
      window.removeEventListener("offline", bajar);
    };
  }, []);

  // ── Cargar lo guardado ──
  useEffect(() => {
    try {
      const p = localStorage.getItem(CLAVE_PAQUETE);
      if (p) setPaquete(JSON.parse(p));
      const c = localStorage.getItem(CLAVE_COLA);
      if (c) setCola(JSON.parse(c));
    } catch { /* almacenamiento no disponible */ }
  }, []);

  const guardarCola = useCallback((nueva: typeof cola) => {
    setCola(nueva);
    try { localStorage.setItem(CLAVE_COLA, JSON.stringify(nueva)); } catch { /* ignorado */ }
  }, []);

  /** Descarga la lista de boletos para poder validar sin señal */
  const descargar = async () => {
    if (!evento) return;
    try {
      const p = await utils.tickets.paqueteAcceso.fetch({ eventId: evento.id });
      setPaquete(p);
      try { localStorage.setItem(CLAVE_PAQUETE, JSON.stringify(p)); } catch { /* ignorado */ }
      toast.success(`${p.boletos.length} boletos descargados`);
    } catch {
      toast.error("No se pudo descargar la lista");
    }
  };

  /** Envía los ingresos guardados mientras no había conexión */
  const enviarPendientes = useCallback(async () => {
    if (!cola.length || !enLinea) return;
    try {
      const r = await sincronizar.mutateAsync({
        ingresos: cola.map(c => ({ token: c.token, dia: c.dia })),
      });
      guardarCola([]);
      if (r.rechazados.length) {
        toast.warning(`${r.aceptados} sincronizados · ${r.rechazados.length} con problemas`);
      } else {
        toast.success(`${r.aceptados} ingresos sincronizados`);
      }
    } catch {
      toast.error("No se pudieron sincronizar. Se reintentará.");
    }
  }, [cola, enLinea, sincronizar, guardarCola]);

  // Al recuperar la señal se envía lo pendiente
  useEffect(() => {
    if (enLinea && cola.length) void enviarPendientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enLinea]);

  /** Valida contra la lista descargada, sin red */
  const validarLocalmente = (token: string): Veredicto => {
    if (!paquete) {
      return { ok: false, motivo: "sin_paquete", mensaje: "Descarga la lista de boletos antes de trabajar sin conexión" };
    }
    const dia = paquete.diaActual;
    if (!dia) return { ok: false, motivo: "fuera_de_fecha", mensaje: "Hoy no hay evento" };

    const limpio = token.trim();
    const b = paquete.boletos.find(
      (x: any) => x.token === limpio || x.code.toUpperCase() === limpio.toUpperCase(),
    );
    if (!b) return { ok: false, motivo: "inexistente", mensaje: "Boleto no encontrado o no vendido" };

    if (dia > b.dias) {
      return {
        ok: false, motivo: "dia_no_cubierto", nombre: b.nombre, tipoNombre: b.tipoNombre,
        mensaje: `Este boleto es solo para ${b.dias} día(s) y hoy es el día ${dia}`,
      };
    }

    const yaHoy = (b.diasUsados ?? []).includes(dia) ||
      cola.some(c => c.token === b.token && c.dia === dia);
    if (yaHoy) {
      return { ok: false, motivo: "ya_entro", nombre: b.nombre, tipoNombre: b.tipoNombre, mensaje: "Este boleto ya entró hoy" };
    }

    // Se anota en la cola y en el paquete, para que un segundo intento
    // inmediato también lo detecte
    guardarCola([...cola, { token: b.token, dia, hora: new Date().toISOString() }]);
    b.diasUsados = [...(b.diasUsados ?? []), dia];

    return { ok: true, motivo: "ok", nombre: b.nombre, tipoNombre: b.tipoNombre, mensaje: "Acceso permitido", sinConexion: true };
  };

  const procesar = async (token: string) => {
    if (!enLinea) { setVeredicto(validarLocalmente(token)); return; }
    try {
      const r = await validar.mutateAsync({ token });
      setVeredicto(r as Veredicto);
    } catch {
      // Si la red falla en mitad del escaneo, se resuelve con la lista local
      setVeredicto(validarLocalmente(token));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-[#e5007d]" />
      </div>
    );
  }

  if (!isAuthenticated || !esPortero) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08070c] px-6">
        <div className="max-w-sm text-center">
          <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-[#3a3a48]" />
          <h1 className="mb-2 text-xl font-black text-white">Control de acceso</h1>
          <p className="mb-6 text-sm leading-relaxed text-[#b4b4c2]">
            {!isAuthenticated
              ? "Entra con el correo que registramos para el personal de acceso."
              : "Tu cuenta no está autorizada para validar entradas."}
          </p>
          {!isAuthenticated && (
            <button onClick={openLoginModal} className="w-full rounded-full bg-[#e5007d] font-bold text-white" style={{ minHeight: 52 }}>
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
    );
  }

  const TURQUESA = "#2dd4bf";
  const tono = veredicto
    ? veredicto.ok ? "#4ade80" : (veredicto.motivo === "ya_entro" || veredicto.motivo === "dia_no_cubierto") ? "#fbbf24" : "#f87171"
    : TURQUESA;

  return (
    <div className="min-h-screen bg-[#08070c] text-white" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
      {escaneando && (
        <QrScanner
          onDetectado={(t) => { setEscaneando(false); void procesar(t); }}
          onCerrar={() => setEscaneando(false)}
        />
      )}

      {/* ── Cabecera ── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#08070c]/90 backdrop-blur-md" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${TURQUESA}1f` }}>
            <ShieldCheck size={19} style={{ color: TURQUESA }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-tight">{paquete?.evento?.name ?? evento?.name ?? "Sin evento"}</p>
            <p className="truncate text-[11.5px] text-[#8a8494]">
              Control de acceso · {paquete?.diaActual ? `día ${paquete.diaActual}` : "fuera de fechas"}
            </p>
          </div>
          <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${enLinea ? "bg-[#4ade80]/12 text-[#4ade80]" : "bg-[#fbbf24]/12 text-[#fbbf24]"}`}>
            {enLinea ? <Wifi size={13} /> : <WifiOff size={13} />}
            {enLinea ? "En línea" : "Sin señal"}
          </span>
          <a href="/" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8a8494]" aria-label="Volver a la web">
            <Home size={18} />
          </a>
        </div>
      </header>

      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pt-5">
        {/* Lista de boletos para validar sin conexión */}
        <section className="ui-tarjeta p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: paquete ? "rgba(74,222,128,0.12)" : "rgba(251,191,36,0.12)" }}>
              {paquete ? <Check size={18} className="text-[#4ade80]" /> : <AlertTriangle size={17} className="text-[#fbbf24]" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold">Lista de boletos</p>
              <p className="text-[12px] leading-snug text-[#8a8494]">
                {paquete
                  ? `${paquete.boletos.length} boletos · ${new Date(paquete.generadoEn).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}`
                  : "Descárgala antes de abrir la puerta: así validas aunque se caiga la señal."}
              </p>
            </div>
            <button
              onClick={descargar}
              disabled={!enLinea || !evento}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.07] px-4 text-[12.5px] font-semibold text-white disabled:opacity-40"
              style={{ minHeight: 40 }}
            >
              <RefreshCw size={14} /> {paquete ? "Actualizar" : "Descargar"}
            </button>
          </div>

          {cola.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#fbbf24]/[0.08] px-3.5 py-2.5">
              <p className="text-[12.5px] text-[#fde68a]">{cola.length} ingreso(s) por enviar</p>
              <button
                onClick={() => void enviarPendientes()}
                disabled={!enLinea || sincronizar.isPending}
                className="shrink-0 rounded-full bg-[#fbbf24] px-4 text-[12px] font-bold text-[#1a1203] disabled:opacity-40"
                style={{ minHeight: 36 }}
              >
                {sincronizar.isPending ? "Enviando…" : "Enviar ahora"}
              </button>
            </div>
          )}
        </section>

        {/* Veredicto */}
        {veredicto ? (
          <section className="sp-exito rounded-3xl border p-6 text-center" style={{ borderColor: `${tono}55`, background: `${tono}12` }}>
            <span className="sp-exito-check mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: tono }}>
              {veredicto.ok
                ? <Check size={40} strokeWidth={3} className="text-[#04140a]" />
                : tono === "#fbbf24"
                  ? <AlertTriangle size={36} strokeWidth={2.5} className="text-[#1a1203]" />
                  : <X size={40} strokeWidth={3} className="text-[#1a0505]" />}
            </span>
            <p className="text-[28px] font-black leading-none" style={{ color: tono }}>
              {veredicto.ok ? "Adelante" : veredicto.motivo === "ya_entro" ? "Ya entró" : "No pasa"}
            </p>
            <p className="mt-2 text-[14px] text-[#d8d3e0]">{veredicto.mensaje}</p>

            {veredicto.nombre && (
              <div className="mt-5 rounded-2xl bg-black/25 px-4 py-3">
                <p className="text-[16px] font-bold text-white">{veredicto.nombre}</p>
                {veredicto.tipoNombre && <p className="text-[12.5px] text-[#a39cad]">{veredicto.tipoNombre}</p>}
              </div>
            )}
            {veredicto.sinConexion && (
              <p className="mt-3 text-[11.5px] text-[#8a8494]">Registrado sin señal · se enviará al volver la conexión</p>
            )}

            <button
              onClick={() => { setVeredicto(null); setCodigoManual(""); setEscaneando(true); }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full font-bold text-[#04110f]"
              style={{ minHeight: 56, background: TURQUESA }}
            >
              <Camera size={18} /> Siguiente persona
            </button>
            <button onClick={() => { setVeredicto(null); setCodigoManual(""); }} className="mt-2 w-full py-2.5 text-[13px] font-semibold text-[#a39cad]">
              Cerrar
            </button>
          </section>
        ) : (
          <section>
            <button
              onClick={() => setEscaneando(true)}
              className="sp-escanear ev-press flex w-full flex-col items-center justify-center gap-2 rounded-3xl font-bold text-white"
              style={{ minHeight: 150, ["--sp-color" as string]: TURQUESA, WebkitTapHighlightColor: "transparent" }}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: `${TURQUESA}26` }}>
                <Camera size={30} style={{ color: TURQUESA }} />
              </span>
              <span className="text-[17px]">Escanear entrada</span>
            </button>

            <p className="my-4 text-center text-[12px] text-[#6f6878]">o escribe el código del boleto</p>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (codigoManual.trim().length >= 4) void procesar(codigoManual.trim()); }}>
              <input
                value={codigoManual}
                onChange={e => setCodigoManual(e.target.value.toUpperCase())}
                placeholder="IW-XXXXXX"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="ui-campo w-full px-4 font-mono uppercase tracking-widest placeholder:text-[#5d5766]"
                style={{ minHeight: 54 }}
              />
              <button
                type="submit"
                disabled={codigoManual.trim().length < 4 || validar.isPending}
                className="shrink-0 rounded-2xl px-6 font-bold text-[#04110f] disabled:opacity-40"
                style={{ minHeight: 54, background: TURQUESA }}
              >
                {validar.isPending ? <Loader2 size={18} className="animate-spin" /> : "Validar"}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
