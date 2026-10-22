import { ExternalLink, Gamepad2, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Interruptor de la demo del Level Pass. Al encenderlo, cualquiera que abra
 * /worldfest/pass sin boleto ve un cazador de prueba con misiones que puede
 * completar tocándolas (no se guarda nada). Sirve para presentaciones.
 */
const URL_DEMO = "https://isekaiworld.co/worldfest/pass";

export default function TarjetaDemoLevelPass() {
  const utils = trpc.useUtils();
  const { data: ajustes, isLoading } = trpc.settings.getAll.useQuery();
  const activo = ajustes?.["lp_demo"] === "1";
  const guardar = trpc.settings.upsert.useMutation({
    onSuccess: (_r, v) => {
      void utils.settings.getAll.invalidate();
      toast.success(v.value === "1" ? "Demo encendida: ya se ve en el Level Pass" : "Demo apagada");
    },
    onError: e => toast.error(e.message),
  });

  const copiar = async () => {
    try { await navigator.clipboard.writeText(URL_DEMO); toast.success("Enlace copiado"); }
    catch { toast.error("No se pudo copiar: " + URL_DEMO); }
  };

  return (
    <div
      className="ev-notch w-full p-4 sm:p-5"
      style={{ background: "#050505", border: `1px solid ${activo ? "rgba(251,191,36,0.6)" : "rgba(255,255,255,0.12)"}` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#fbbf24" }}>
            <Gamepad2 size={12} /> Demo del Level Pass
          </p>
          <p className="text-[13px] leading-snug" style={{ color: "#cfcfcf" }}>
            {activo
              ? "Encendida: quien abra el Level Pass sin boleto ve un cazador de prueba y puede completar misiones."
              : "Enciéndela para mostrar cómo se verá el Level Pass el día del evento."}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={activo}
          aria-label="Demo del Level Pass"
          disabled={isLoading || guardar.isPending}
          onClick={() => guardar.mutate({ key: "lp_demo", value: activo ? "0" : "1" })}
          className="relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60"
          style={{ background: activo ? "#fbbf24" : "#2a2a2a" }}
        >
          <span
            className="absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white transition-all"
            style={{ left: activo ? 28 : 4 }}
          >
            {guardar.isPending && <Loader2 size={12} className="animate-spin text-black" />}
          </span>
        </button>
      </div>
      {activo && (
        <div className="mt-4 flex gap-2">
          <a
            href="/worldfest/pass"
            target="_blank"
            rel="noopener noreferrer"
            className="ev-notch flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
            style={{ background: "#fbbf24", color: "#111" }}
          >
            <ExternalLink size={14} /> Abrir demo
          </a>
          <button
            onClick={copiar}
            className="ev-notch flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
            style={{ background: "#141414", color: "#ffffff", border: "1px solid rgba(255,255,255,0.18)" }}
          >
            <Link2 size={14} /> Copiar enlace
          </button>
        </div>
      )}
    </div>
  );
}
