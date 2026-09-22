import { AlertTriangle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Confirmación para eliminar a un cosplayer.
 *
 * Antes era un aviso genérico del navegador. Aquí se enseña qué implica de
 * verdad: si se le debe dinero, si tiene un retiro por pagar, cuántos
 * códigos quedarán anulados y cuántos pedidos pierden su comisión. Eso es lo
 * que hay que saber antes de pulsar, no después.
 */
export default function EliminarCosplayer({
  cosplayerId,
  onCerrar,
  onEliminado,
}: {
  cosplayerId: number;
  onCerrar: () => void;
  onEliminado?: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: r, isLoading } = trpc.cosplay.resumenEliminar.useQuery({ cosplayerId });

  const eliminar = trpc.cosplay.deleteCosplayer.useMutation({
    onSuccess: () => {
      utils.cosplay.getAllCosplayers.invalidate();
      utils.cosplay.getApprovedCosplayers.invalidate();
      toast.success(`${r?.nombre ?? "Cosplayer"} eliminado`);
      onEliminado?.();
      onCerrar();
    },
    onError: (e) => toast.error(e.message),
  });

  /** Situaciones que merecen un aviso antes de borrar */
  const avisos: string[] = [];
  if (r) {
    if (r.saldo > 0) avisos.push(`Tiene $${r.saldo.toFixed(2)} de saldo sin retirar. Se le debe ese dinero.`);
    if (r.retirosPendientes > 0) {
      avisos.push(
        `Tiene ${r.retirosPendientes} retiro${r.retirosPendientes === 1 ? "" : "s"} pendiente${r.retirosPendientes === 1 ? "" : "s"} por $${r.montoRetirosPendientes.toFixed(2)}.`,
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={onCerrar}
    >
      <div
        className="ev-notch w-full max-w-md bg-[var(--iw-surface,#16191f)] p-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center bg-red-500/15" style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}>
              <AlertTriangle size={17} className="text-red-400" />
            </span>
            <p className="ev-display text-base text-[var(--iw-text,#fff)]">Eliminar cosplayer</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 text-[var(--iw-text-muted,#888)]" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {isLoading || !r ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[#e5007d]" />
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm leading-relaxed text-[var(--iw-text-muted,#aaa)]">
              Vas a eliminar a <strong className="text-[var(--iw-text,#fff)]">{r.nombre}</strong>.
              Su perfil dejará de aparecer en el Guild y no podrá entrar a su panel.
              Esto no se puede deshacer.
            </p>

            {/* Lo que tiene que ver con dinero va primero y en rojo */}
            {avisos.length > 0 && (
              <div className="ev-notch mb-4 border border-red-500/40 bg-red-500/10 p-3.5">
                {avisos.map(a => (
                  <p key={a} className="text-xs leading-relaxed text-red-300">{a}</p>
                ))}
                <p className="mt-2 text-xs leading-relaxed text-red-300/80">
                  Resuélvelo antes de eliminarlo: después ya no podrás verlo desde su perfil.
                </p>
              </div>
            )}

            <div className="mb-5 space-y-1.5 text-xs text-[var(--iw-text-muted,#999)]">
              <p>Al eliminarlo:</p>
              {r.codigosSinUsar > 0 && (
                <p>· Se anulan {r.codigosSinUsar} código{r.codigosSinUsar === 1 ? "" : "s"} de descuento sin usar.</p>
              )}
              {r.pedidosSinPagar > 0 && (
                <p>· {r.pedidosSinPagar} pedido{r.pedidosSinPagar === 1 ? "" : "s"} pendiente{r.pedidosSinPagar === 1 ? "" : "s"} con su código dejará{r.pedidosSinPagar === 1 ? "" : "n"} de generarle comisión.</p>
              )}
              <p>· Se conserva el historial de pagos y retiros, para las cuentas.</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onCerrar}
                className="ev-notch flex-1 border border-[var(--iw-border,#333)] text-sm font-bold text-[var(--iw-text-muted,#aaa)]"
                style={{ minHeight: 48 }}
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminar.mutate({ cosplayerId })}
                disabled={eliminar.isPending}
                className="ev-notch ev-press flex flex-1 items-center justify-center gap-2 bg-red-600 text-sm font-bold text-white disabled:opacity-50"
                style={{ minHeight: 48 }}
              >
                {eliminar.isPending && <Loader2 size={15} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
