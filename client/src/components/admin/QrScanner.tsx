import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, CameraOff, Loader2 } from "lucide-react";

/**
 * Escáner de QR con la cámara del teléfono, dentro de la propia web.
 *
 * Antes había que salir a la app de cámara del sistema y volver: para alguien
 * vendiendo boletos en fila eso es un ida y vuelta constante.
 *
 * Devuelve el token del boleto. El QR contiene una URL completa
 * (…/vender/TOKEN), así que se extrae la última parte.
 */
export default function QrScanner({
  onDetectado,
  onCerrar,
}: {
  onDetectado: (token: string) => void;
  onCerrar: () => void;
}) {
  const idRegion = useRef(`qr-${Math.random().toString(36).slice(2)}`);
  const escanerRef = useRef<Html5Qrcode | null>(null);
  const [estado, setEstado] = useState<"iniciando" | "listo" | "error">("iniciando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let cancelado = false;
    const escaner = new Html5Qrcode(idRegion.current, { verbose: false });
    escanerRef.current = escaner;

    /**
     * Saca el token de lo leído. El QR guarda la URL completa, pero se acepta
     * también un token suelto, con barra final, o con parámetros añadidos por
     * algún lector: cualquiera de esas variantes debe funcionar.
     */
    const extraerToken = (texto: string) => {
      let limpio = texto.trim();
      limpio = limpio.split("?")[0].split("#")[0];   // fuera parámetros
      limpio = limpio.replace(/\/+$/, "");           // fuera barra final
      const partes = limpio.split("/").filter(Boolean);
      const ultimo = partes[partes.length - 1] ?? limpio;
      // Si el QR fuera solo el código impreso, se devuelve tal cual
      return ultimo.trim();
    };

    escaner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (texto) => {
          if (cancelado) return;
          cancelado = true;
          // Se detiene antes de avisar, para no leer el mismo código dos veces
          escaner.stop().catch(() => {});
          onDetectado(extraerToken(texto));
        },
        () => { /* lecturas fallidas: normales mientras enfoca */ },
      )
      .then(() => { if (!cancelado) setEstado("listo"); })
      .catch((e) => {
        setEstado("error");
        setMensaje(
          String(e?.message ?? e).toLowerCase().includes("permission")
            ? "No diste permiso para usar la cámara. Actívalo en los ajustes del navegador."
            : "No se pudo abrir la cámara en este dispositivo.",
        );
      });

    return () => {
      cancelado = true;
      escaner.stop().catch(() => {});
      escaner.clear?.();
    };
  }, [onDetectado]);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black">
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <p className="text-sm font-bold text-white">Escanear boleto</p>
        <button onClick={onCerrar} className="p-2 text-white" aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>

      <div className="relative flex-1">
        <div id={idRegion.current} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

        {estado === "iniciando" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
            <Loader2 className="h-6 w-6 animate-spin text-[#e5007d]" />
            <p className="text-sm text-white/70">Abriendo la cámara...</p>
          </div>
        )}

        {estado === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-8 text-center">
            <CameraOff className="h-9 w-9 text-white/40" />
            <p className="text-sm text-white/80">{mensaje}</p>
            <p className="text-xs text-white/50">
              También puedes escribir el código impreso del boleto.
            </p>
            <button
              onClick={onCerrar}
              className="mt-2 rounded-full bg-[#e5007d] px-6 py-3 text-sm font-bold text-white"
            >
              Escribir el código
            </button>
          </div>
        )}
      </div>

      {estado === "listo" && (
        <p
          className="px-8 pb-8 pt-4 text-center text-sm text-white/70"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
        >
          Apunta al código QR del boleto
        </p>
      )}
    </div>
  );
}
