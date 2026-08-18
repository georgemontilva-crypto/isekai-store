import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGO_MOVIL, CRYPTO, type PaymentMethodId } from "@shared/payment";

export type ReceiptData = {
  receiptUrl: string;
  paymentReference: string;
  receiptHolder: string;
};

interface PaymentModalProps {
  open: boolean;
  method: PaymentMethodId;
  amountUSD: number;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (data: ReceiptData) => void;
}

/** Fila de dato con botón de copiar */
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback para navegadores sin clipboard API (http, webviews viejos)
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    toast.success(`${label} copiado`);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copiar ${label}`}
        className="shrink-0 rounded-lg border border-border/60 p-2 transition-colors hover:border-[#e5007d] hover:text-[#e5007d]"
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}

export default function PaymentModal({
  open,
  method,
  amountUSD,
  submitting = false,
  onClose,
  onConfirm,
}: PaymentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [reference, setReference] = useState("");
  const [holder, setHolder] = useState("");
  const [uploading, setUploading] = useState(false);

  const uploadReceipt = trpc.orders.uploadReceiptPublic.useMutation();
  const { data: siteSettings } = trpc.settings.getAll.useQuery();

  const isCrypto = method === "crypto";

  // Tasa del día en bolívares, cargada desde el panel admin (clave `bs_rate`).
  // Si no está configurada, simplemente no se muestra el monto en Bs.
  const bsRate = parseFloat(siteSettings?.["bs_rate"] ?? "");
  const hasBsRate = Number.isFinite(bsRate) && bsRate > 0;
  const amountBs = hasBsRate ? amountUSD * bsRate : 0;
  const rateUpdated = siteSettings?.["bs_rate_updated"];

  const handleFile = async (selected: File | null) => {
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      toast.error("El archivo no puede superar 10 MB");
      return;
    }
    setFile(selected);
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("read error"));
        reader.readAsDataURL(selected);
      });
      const { url } = await uploadReceipt.mutateAsync({
        fileName: selected.name,
        fileType: selected.type,
        fileBase64: base64,
      });
      setReceiptUrl(url);
      toast.success("Comprobante cargado");
    } catch {
      setFile(null);
      toast.error("No se pudo subir el comprobante, intenta de nuevo");
    } finally {
      setUploading(false);
    }
  };

  const canConfirm = !!receiptUrl && reference.trim().length > 0 && holder.trim().length > 0 && !uploading && !submitting;

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm({ receiptUrl, paymentReference: reference.trim(), receiptHolder: holder.trim() });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            onClick={e => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">
                  {isCrypto ? "Pago en Cripto" : "Pago Móvil"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Copia los datos, realiza el pago y sube tu comprobante.
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 hover:bg-muted">
                <X size={18} />
              </button>
            </div>

            {/* Monto a pagar */}
            <div className="mb-5 rounded-2xl border-2 border-[#e5007d] bg-[#e5007d]/5 px-4 py-3 text-center">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Monto a pagar</p>
              <p className="text-2xl font-black text-[#e5007d]">${amountUSD.toFixed(2)} USD</p>
            </div>

            {/* Datos de pago */}
            <div className="mb-6 space-y-2">
              {isCrypto ? (
                <>
                  <CopyRow label="Dirección USDT" value={CRYPTO.address} />
                  <CopyRow label="Red" value={CRYPTO.network} />
                  <CopyRow label="Monto en dólares" value={amountUSD.toFixed(2)} />
                  <p className="pt-1 text-xs text-muted-foreground">
                    Envía únicamente {CRYPTO.asset} por la red {CRYPTO.network}. Enviar por otra red puede
                    hacer que pierdas los fondos.
                  </p>
                </>
              ) : (
                <>
                  <CopyRow label="Cédula (CI)" value={PAGO_MOVIL.ci} />
                  <CopyRow label="Banco" value={PAGO_MOVIL.bank} />
                  <CopyRow label="Teléfono" value={PAGO_MOVIL.phone} />
                  {hasBsRate ? (
                    <>
                      <CopyRow
                        label="Monto a transferir (Bs)"
                        value={amountBs.toFixed(2)}
                      />
                      <p className="pt-1 text-xs text-muted-foreground">
                        Equivale a ${amountUSD.toFixed(2)} USD a la tasa de Bs{" "}
                        {bsRate.toLocaleString("es-VE", { minimumFractionDigits: 2 })} por dólar
                        {rateUpdated && (
                          <> (actualizada el {new Date(rateUpdated).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit" })})</>
                        )}
                        .
                      </p>
                    </>
                  ) : (
                    <>
                      <CopyRow label="Monto en dólares" value={amountUSD.toFixed(2)} />
                      <p className="pt-1 text-xs text-muted-foreground">
                        El monto en bolívares se calcula a la tasa del día al momento del pago.
                      </p>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Comprobante */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="receiptFile">Comprobante de pago *</Label>
                <label
                  htmlFor="receiptFile"
                  className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-[#e5007d] hover:text-[#e5007d]"
                >
                  {uploading ? (
                    <><Loader2 size={16} className="animate-spin" /> Subiendo…</>
                  ) : receiptUrl ? (
                    <><Check size={16} className="text-green-500" /> {file?.name ?? "Comprobante cargado"}</>
                  ) : (
                    <><Upload size={16} /> Toca para subir imagen o PDF</>
                  )}
                </label>
                <input
                  id="receiptFile"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                  onChange={e => handleFile(e.target.files?.[0] ?? null)}
                />
                {receiptUrl && (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#e5007d] underline"
                  >
                    <FileText size={12} /> Ver comprobante subido
                  </a>
                )}
              </div>

              <div>
                <Label htmlFor="paymentReference">
                  {isCrypto ? "Hash / ID de la transacción *" : "Número de referencia *"}
                </Label>
                <Input
                  id="paymentReference"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="mt-1 bg-muted border-border/50 focus:border-primary/50"
                  placeholder={isCrypto ? "0x1a2b3c…" : "000123456789"}
                />
              </div>

              <div>
                <Label htmlFor="receiptHolder">
                  {isCrypto ? "Nombre de quien envía *" : "Titular del pago *"}
                </Label>
                <Input
                  id="receiptHolder"
                  value={holder}
                  onChange={e => setHolder(e.target.value)}
                  className="mt-1 bg-muted border-border/50 focus:border-primary/50"
                  placeholder="Juan Pérez"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={confirm}
              disabled={!canConfirm}
              className="mt-6 h-12 w-full rounded-2xl bg-[#e5007d] text-base font-bold text-white hover:bg-[#c4006b] disabled:opacity-50"
            >
              {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" /> Creando pedido…</> : "Confirmar pago y crear pedido"}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Tu pedido quedará en verificación hasta que confirmemos el pago.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
