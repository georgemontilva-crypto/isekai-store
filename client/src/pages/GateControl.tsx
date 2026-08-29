import { useState, useEffect, useCallback } from "react";
import {
  Loader2, Check, X, AlertTriangle, ShieldCheck, WifiOff, Wifi,
  RefreshCw, Camera,
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
  const esPortero = user?.role === "gate" || user?.role === "admin";

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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6">
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

  const campo = "w-full rounded-xl border border-white/10 bg-[#101319] px-4 text-white outline-none placeholder:text-[#6a6a7c] focus:border-[#e5007d]";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {escaneando && (
        <QrScanner
          onDetectado={(t) => { setEscaneando(false); void procesar(t); }}
          onCerrar={() => setEscaneando(false)}
        />
      )}

      <div className="mx-auto max-w-lg px-5 py-6">
        {/* Estado */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{paquete?.evento?.name ?? evento?.name ?? "Sin evento"}</p>
            <p className="text-xs text-[#8a8a9c]">
              {paquete?.diaActual ? `Día ${paquete.diaActual} del evento` : "Fuera de fechas"}
            </p>
          </div>
          <div className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
            enLinea ? "bg-green-500/15 text-green-400" : "bg-[#ffd700]/15 text-[#ffd700]"
          }`}>
            {enLinea ? <Wifi size={13} /> : <WifiOff size={13} />}
            {enLinea ? "En línea" : "Sin conexión"}
          </div>
        </div>

        {/* Preparación */}
        <div className="mb-5 rounded-2xl border border-white/10 bg-[#16191f] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold">Lista de boletos</p>
              <p className="text-xs text-[#8a8a9c]">
                {paquete
                  ? `${paquete.boletos.length} boletos · descargada ${new Date(paquete.generadoEn).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}`
                  : "Sin descargar. Hazlo antes de que empiece el evento."}
              </p>
            </div>
            <button
              onClick={descargar}
              disabled={!enLinea || !evento}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-4 text-xs font-bold text-[#b4b4c2] disabled:opacity-40"
              style={{ minHeight: 44 }}
            >
              <RefreshCw size={14} /> Descargar
            </button>
          </div>

          {cola.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <p className="text-xs text-[#ffd700]">
                {cola.length} ingreso(s) sin enviar
              </p>
              <button
                onClick={() => void enviarPendientes()}
                disabled={!enLinea || sincronizar.isPending}
                className="shrink-0 rounded-full bg-[#e5007d] px-4 text-xs font-bold text-white disabled:opacity-40"
                style={{ minHeight: 40 }}
              >
                {sincronizar.isPending ? "Enviando..." : "Enviar ahora"}
              </button>
            </div>
          )}
        </div>

        {/* Veredicto */}
        {veredicto && (
          <div className={`mb-5 rounded-2xl border p-6 text-center ${
            veredicto.ok
              ? "border-green-500/50 bg-green-500/15"
              : veredicto.motivo === "ya_entro" || veredicto.motivo === "dia_no_cubierto"
                ? "border-[#ffd700]/50 bg-[#ffd700]/15"
                : "border-red-500/50 bg-red-500/15"
          }`}>
            {veredicto.ok
              ? <Check className="mx-auto mb-3 h-12 w-12 text-green-400" />
              : veredicto.motivo === "ya_entro" || veredicto.motivo === "dia_no_cubierto"
                ? <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-[#ffd700]" />
                : <X className="mx-auto mb-3 h-12 w-12 text-red-400" />}

            <p className="text-xl font-black">
              {veredicto.ok ? "ADELANTE" : veredicto.motivo === "ya_entro" ? "YA ENTRÓ" : "NO PASA"}
            </p>
            <p className="mt-1 text-sm text-[#d8d8e2]">{veredicto.mensaje}</p>

            {veredicto.nombre && (
              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="font-bold text-white">{veredicto.nombre}</p>
                {veredicto.tipoNombre && <p className="text-xs text-[#b4b4c2]">{veredicto.tipoNombre}</p>}
              </div>
            )}

            {veredicto.sinConexion && (
              <p className="mt-3 text-[11px] text-[#8a8a9c]">
                Registrado sin conexión · se enviará al recuperar señal
              </p>
            )}

            <button
              onClick={() => { setVeredicto(null); setCodigoManual(""); }}
              className="mt-5 w-full rounded-full bg-white/10 font-bold text-white"
              style={{ minHeight: 48 }}
            >
              Siguiente persona
            </button>
          </div>
        )}

        {/* Escanear */}
        {!veredicto && (
          <>
            <button
              onClick={() => setEscaneando(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e5007d] font-bold text-white transition-transform active:scale-[0.98]"
              style={{ minHeight: 72, WebkitTapHighlightColor: "transparent" }}
            >
              <Camera size={24} /> Escanear entrada
            </button>

            <p className="my-4 text-center text-[11px] uppercase tracking-wider text-[#6a6a7c]">
              o escribe el código
            </p>

            <div className="flex gap-2">
              <input
                value={codigoManual}
                onChange={e => setCodigoManual(e.target.value.toUpperCase())}
                placeholder="IW-XXXXXX"
                className={`${campo} font-mono uppercase`}
                style={{ minHeight: 52 }}
              />
              <button
                onClick={() => void procesar(codigoManual.trim())}
                disabled={codigoManual.trim().length < 4 || validar.isPending}
                className="shrink-0 rounded-xl bg-[#e5007d] px-6 font-bold text-white disabled:bg-[#22222c] disabled:text-[#6a6a7c]"
                style={{ minHeight: 52 }}
              >
                {validar.isPending ? <Loader2 size={18} className="animate-spin" /> : "Validar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
