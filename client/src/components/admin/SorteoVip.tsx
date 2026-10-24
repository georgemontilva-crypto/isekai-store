import { useState } from "react";
import { Crown, Shuffle, Trophy } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { confirmar } from "./ui";

/**
 * Sorteo de la pieza a tamaño real (día 2): participan todos los boletos VIP
 * vendidos. El ganador se elige al azar en el teléfono, a la vista de todos.
 */
export default function SorteoVip({ eventId }: { eventId: number }) {
  const { data: lista = [] } = trpc.tickets.sorteo.useQuery({ eventId }, { enabled: eventId > 0 });
  const [ganador, setGanador] = useState<(typeof lista)[number] | null>(null);
  const [girando, setGirando] = useState<string | null>(null);

  if (!lista.length) {
    return (
      <div className="rounded-3xl border border-[#fbbf24]/20 bg-[#fbbf24]/[0.04] p-5 text-center">
        <Crown size={22} className="mx-auto mb-2 text-[#fbbf24]" />
        <p className="text-[14px] font-semibold text-[var(--iw-text)]">Todavía no hay boletos VIP vendidos</p>
        <p className="mt-1 text-[12.5px] text-[var(--iw-text-muted)]">Cada VIP que se venda entra solo al sorteo.</p>
      </div>
    );
  }

  const sortear = async () => {
    if (ganador && !(await confirmar({ titulo: "Volver a sortear", mensaje: "Se elegirá otro ganador al azar.", confirmar: "Sortear de nuevo" }))) return;
    setGanador(null);
    // Unos segundos de nombres pasando: se ve justo y emociona
    const azar = new Uint32Array(1);
    crypto.getRandomValues(azar);
    const elegido = lista[azar[0] % lista.length];
    let n = 0;
    const id = window.setInterval(() => {
      setGirando(lista[n++ % lista.length].nombre);
      if (n > 24) { window.clearInterval(id); setGirando(null); setGanador(elegido); }
    }, 90);
  };

  return (
    <div className="rounded-3xl border border-[#fbbf24]/25 bg-[#fbbf24]/[0.05] p-4">
      <p className="flex items-center gap-2 text-[15px] font-bold text-[var(--iw-text)]"><Crown size={16} className="text-[#fbbf24]" /> Sorteo VIP · pieza a tamaño real</p>
      <p className="mt-1 text-[12.5px] text-[var(--iw-text-muted)]">{lista.length} participante{lista.length === 1 ? "" : "s"} (boletos VIP vendidos)</p>
      {(girando || ganador) && (
        <div className="mt-3 rounded-2xl bg-black/30 px-4 py-5 text-center">
          {ganador ? (
            <>
              <Trophy size={28} className="mx-auto mb-2 text-[#fbbf24]" />
              <p className="text-[22px] font-black text-white">{ganador.nombre}</p>
              <p className="mt-1 font-mono text-[12px] text-[#fde68a]">{ganador.codigo}{ganador.telefono ? ` · ${ganador.telefono}` : ""}</p>
            </>
          ) : (
            <p className="text-[20px] font-bold text-[#fde68a]">{girando}</p>
          )}
        </div>
      )}
      <button onClick={sortear} disabled={!!girando} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold text-[#1a1405] disabled:opacity-60" style={{ background: "#fbbf24" }}>
        <Shuffle size={16} /> {ganador ? "Sortear de nuevo" : "Elegir ganador al azar"}
      </button>
      <details className="mt-3">
        <summary className="cursor-pointer text-[12.5px] font-semibold text-[var(--iw-text-muted)]">Ver participantes</summary>
        <ul className="mt-2 flex flex-col gap-1">
          {lista.map(p => <li key={p.id} className="flex justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-[12.5px]"><span className="text-[var(--iw-text)]">{p.nombre}</span><span className="font-mono text-[var(--iw-text-muted)]">{p.codigo}</span></li>)}
        </ul>
      </details>
    </div>
  );
}
