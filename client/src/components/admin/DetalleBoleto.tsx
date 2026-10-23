import { useState } from "react";
import { Ban, Check, DoorOpen, Loader2, Mail, RotateCcw, Undo2, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { confirmar } from "./ui";
import { Hoja, campoRueda, etiquetaRueda } from "@/components/rueda/ListaRueda";

/**
 * Detalle de un boleto vendido, para resolver incidencias desde el panel:
 * corregir los datos que la tienda escribió mal, cambiar el tipo, anularlo
 * (perdido, reembolso), deshacer una venta equivocada o reenviar el
 * comprobante. La tienda no puede hacer nada de esto: solo el admin.
 */
export default function DetalleBoleto({ boleto, tipos, onCerrar }: { boleto: any; tipos: any[]; onCerrar: () => void }) {
  const utils = trpc.useUtils();
  const { data: extra } = trpc.tickets.detalle.useQuery({ id: boleto.id });
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState({
    buyerName: boleto.buyerName ?? "", buyerLastName: boleto.buyerLastName ?? "",
    buyerPhone: boleto.buyerPhone ?? "", buyerEmail: boleto.buyerEmail ?? "", ticketTypeId: boleto.ticketTypeId as number | null,
  });
  const refrescar = () => { void utils.tickets.listar.invalidate(); void utils.tickets.resumen.invalidate(); void utils.tickets.detalle.invalidate(); };
  const corregir = trpc.tickets.corregir.useMutation({ onError: e => toast.error(e.message) });
  const deshacer = trpc.tickets.deshacerVenta.useMutation({ onError: e => toast.error(e.message) });
  const reenviar = trpc.tickets.reenviarComprobante.useMutation({
    onSuccess: r => toast.success(`Comprobante enviado a ${r.correo}`),
    onError: e => toast.error(e.message),
  });
  const anulado = boleto.status === "void";
  const ocupado = corregir.isPending || deshacer.isPending;

  const guardar = async () => {
    if (!f.buyerName.trim() || !f.buyerLastName.trim()) return toast.error("Nombre y apellido son obligatorios");
    if (f.buyerPhone.replace(/\D/g, "").length < 7) return toast.error("Revisa el teléfono");
    if (f.buyerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.buyerEmail.trim())) return toast.error("Revisa el correo");
    await corregir.mutateAsync({
      id: boleto.id, buyerName: f.buyerName, buyerLastName: f.buyerLastName, buyerPhone: f.buyerPhone,
      buyerEmail: f.buyerEmail.trim() || null, ...(f.ticketTypeId && f.ticketTypeId !== boleto.ticketTypeId ? { ticketTypeId: f.ticketTypeId } : {}),
    });
    toast.success("Datos corregidos");
    refrescar();
    onCerrar();
  };

  const alternarAnulado = async () => {
    const ok = await confirmar(anulado
      ? { titulo: "Reactivar boleto", mensaje: `${boleto.code} vuelve a ser válido en la puerta.`, confirmar: "Reactivar" }
      : { titulo: "Anular boleto", mensaje: `${boleto.code} dejará de valer en la puerta y en el Level Pass. Úsalo si se perdió o se reembolsó.`, confirmar: "Anular", peligro: true });
    if (!ok) return;
    await corregir.mutateAsync({ id: boleto.id, status: anulado ? "sold" : "void" });
    toast.success(anulado ? "Boleto reactivado" : "Boleto anulado");
    refrescar();
    onCerrar();
  };

  const deshacerVenta = async () => {
    const ok = await confirmar({ titulo: "Deshacer venta", mensaje: `${boleto.code} vuelve a quedar en blanco y se borran los datos del comprador. La tienda podrá venderlo de nuevo.`, confirmar: "Deshacer", peligro: true });
    if (!ok) return;
    await deshacer.mutateAsync({ id: boleto.id });
    toast.success("Venta deshecha: el boleto quedó en blanco");
    refrescar();
    onCerrar();
  };

  const campo = (k: keyof typeof f, etiqueta: string, extraProps: Record<string, unknown> = {}) => (
    <div className="mb-3">
      <label className={etiquetaRueda}>{etiqueta}</label>
      <input value={(f[k] as string) ?? ""} onChange={e => setF({ ...f, [k]: e.target.value })} className={campoRueda} {...extraProps} />
    </div>
  );

  return (
    <Hoja titulo={`${boleto.buyerName ?? ""} ${boleto.buyerLastName ?? ""}`.trim() || boleto.code} subtitulo={`${boleto.code} · ${boleto.tipoNombre ?? "Sin tipo"} · ${boleto.tiendaNombre ?? "Venta online"}`} onCerrar={onCerrar}>
      {anulado && (
        <p className="mb-4 rounded-2xl bg-[#f87171]/10 px-4 py-3 text-[13px] font-semibold text-[#f87171]">Este boleto está anulado: no vale en la puerta.</p>
      )}

      {/* Lo que ha pasado con el boleto */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11px] text-[#9a93a6]"><DoorOpen size={13} /> Ingresos</p>
          <p className="mt-1 text-[15px] font-bold text-white">
            {extra ? (extra.ingresos.length ? extra.ingresos.map(i => `Día ${i.dia}`).join(" · ") : "Aún no entra") : "…"}
          </p>
        </div>
        <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11px] text-[#9a93a6]"><Zap size={13} /> Level Pass</p>
          <p className="mt-1 text-[15px] font-bold text-white">{extra ? `${extra.xp} EXP · ${extra.actividades} misiones` : "…"}</p>
        </div>
      </div>

      {extra?.beneficios && (
        <div className="mb-4 rounded-2xl bg-white/[0.04] px-4 py-3 text-[13px]">
          {extra.beneficios.kit && <p className="text-[#cfc9d8]"><span className="text-[#9a93a6]">{extra.beneficios.kit}:</span> {extra.beneficios.kitEntregado ? `entregado ${new Date(extra.beneficios.kitEntregado).toLocaleString("es-VE", { timeZone: "America/Caracas", dateStyle: "short", timeStyle: "short" })}` : "pendiente de entregar"}</p>}
          {extra.beneficios.bonosTotales > 0 && <p className="mt-1 text-[#cfc9d8]"><span className="text-[#9a93a6]">Bonos:</span> {extra.beneficios.bonosUsados} de {extra.beneficios.bonosTotales} usados{extra.beneficios.canjes.length ? ` (${extra.beneficios.canjes.map(c => c.tienda ?? "tienda").join(", ")})` : ""}</p>}
        </div>
      )}

      {!editando ? (
        <>
          <div className="mb-4 flex flex-col gap-1.5 rounded-2xl bg-white/[0.03] px-4 py-3 text-[13px]">
            <p className="text-[#cfc9d8]"><span className="text-[#9a93a6]">Teléfono:</span> {boleto.buyerPhone || "—"}</p>
            <p className="truncate text-[#cfc9d8]"><span className="text-[#9a93a6]">Correo:</span> {boleto.buyerEmail || "Sin correo (no puede entrar a su Level Pass)"}</p>
            <p className="text-[#cfc9d8]"><span className="text-[#9a93a6]">Vendido:</span> {boleto.soldAt ? new Date(boleto.soldAt).toLocaleString("es-VE", { timeZone: "America/Caracas", dateStyle: "short", timeStyle: "short" }) : "—"}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => setEditando(true)} className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold text-white" style={{ background: "#e5007d" }}>
              <Check size={16} /> Corregir datos o tipo
            </button>
            <button onClick={() => reenviar.mutate({ id: boleto.id })} disabled={reenviar.isPending || anulado} className="flex w-full items-center justify-center gap-2 rounded-full bg-white/[0.07] py-3.5 text-[14px] font-semibold text-white disabled:opacity-40">
              {reenviar.isPending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Reenviar comprobante
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={alternarAnulado} disabled={ocupado} className="flex items-center justify-center gap-1.5 rounded-full py-3 text-[13px] font-semibold disabled:opacity-40" style={anulado ? { background: "rgba(74,222,128,0.12)", color: "#4ade80" } : { background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
                {anulado ? <><RotateCcw size={15} /> Reactivar</> : <><Ban size={15} /> Anular</>}
              </button>
              <button onClick={deshacerVenta} disabled={ocupado} className="flex items-center justify-center gap-1.5 rounded-full bg-white/[0.05] py-3 text-[13px] font-semibold text-[#cfc9d8] disabled:opacity-40">
                <Undo2 size={15} /> Deshacer venta
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {campo("buyerName", "Nombre", { maxLength: 200 })}
            {campo("buyerLastName", "Apellido", { maxLength: 200 })}
          </div>
          {campo("buyerPhone", "Teléfono", { inputMode: "tel", maxLength: 50 })}
          {campo("buyerEmail", "Correo (para su Level Pass)", { inputMode: "email", autoCapitalize: "none", maxLength: 320 })}
          <label className={etiquetaRueda}>Tipo de boleto</label>
          <div className="mb-5 flex flex-col gap-1.5">
            {tipos.map(t => (
              <button key={t.id} onClick={() => setF({ ...f, ticketTypeId: t.id })} className="flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-[13.5px]"
                style={f.ticketTypeId === t.id ? { borderColor: "#e5007d", background: "rgba(229,0,125,0.1)", color: "#fff" } : { borderColor: "rgba(255,255,255,0.1)", color: "#cfc9d8" }}>
                <span>{t.name}{!t.active && " (no a la venta)"}</span>
                <span className="font-semibold">${parseFloat(t.priceUsd).toFixed(2)}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditando(false)} className="flex-1 rounded-full bg-white/[0.07] py-3.5 text-[14px] font-semibold text-white">Cancelar</button>
            <button onClick={guardar} disabled={ocupado} className="flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold text-white disabled:opacity-50" style={{ background: "#e5007d" }}>
              {corregir.isPending && <Loader2 size={16} className="animate-spin" />} Guardar
            </button>
          </div>
        </>
      )}
    </Hoja>
  );
}
