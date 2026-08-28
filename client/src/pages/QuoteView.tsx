import { useState } from "react";
import { useRoute, Link } from "wouter";
import { Loader2, Check, Copy, Upload, ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PAGO_MOVIL, CRYPTO } from "@shared/payment";
import { useAntiSpam } from "@/hooks/useAntiSpam";

/**
 * Cotización a medida — vista pública.
 *
 * El cliente llega por un enlace con token, ve lo que se le cotizó, paga y
 * sube su comprobante. NO se le pide iniciar sesión antes de pagar: cada paso
 * previo al pago cuesta ventas, y aquí es alguien que ya acordó el trabajo.
 * La cuenta se vincula (o se crea) con el correo al confirmar.
 */

function Copiable({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#2e2e3a] bg-[#101016] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-[#8a8a9c]">{label}</p>
        <p className="truncate font-mono text-sm text-white" style={{ overflowWrap: "anywhere" }}>{valor}</p>
      </div>
      <button
        onClick={async () => {
          try { await navigator.clipboard.writeText(valor); toast.success("Copiado"); }
          catch { prompt("Copia este dato:", valor); }
        }}
        className="shrink-0 rounded-lg border border-[#2e2e3a] p-2 text-[#b4b4c2] transition-colors hover:border-[#e5007d] hover:text-[#e5007d]"
        aria-label={`Copiar ${label}`}
      >
        <Copy size={15} />
      </button>
    </div>
  );
}

export default function QuoteView() {
  const [, params] = useRoute("/cotizacion/:token");
  const token = params?.token ?? "";
  const antiSpam = useAntiSpam();

  const { data: cotizacion, isLoading, error } = trpc.quotes.byToken.useQuery(
    { token }, { enabled: token.length > 5, retry: false },
  );

  const [metodo, setMetodo] = useState<"pago_movil" | "crypto">("pago_movil");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [referencia, setReferencia] = useState("");
  const [titular, setTitular] = useState("");
  const [comprobante, setComprobante] = useState<string>("");
  const [subiendo, setSubiendo] = useState(false);
  const [listo, setListo] = useState<{ orderNumber: string; cuentaCreada: boolean } | null>(null);
  const [abonoEnviado, setAbonoEnviado] = useState(false);
  const [montoAbono, setMontoAbono] = useState("");
  // Cuánto va a pagar ahora: el total o solo el abono mínimo
  const [pagaTodo, setPagaTodo] = useState(true);
  // Código del cosplayer que refirió al cliente
  const [codigoRef, setCodigoRef] = useState("");

  const refValido = trpc.cosplay.validateReferralCode.useQuery(
    { code: codigoRef.trim().toUpperCase() },
    { enabled: codigoRef.trim().length >= 4, retry: false },
  );

  const subirComprobante = trpc.orders.uploadReceiptPublic.useMutation();
  const pagarSaldo = trpc.quotes.payBalance.useMutation({
    onSuccess: () => setAbonoEnviado(true),
    onError: (e) => toast.error(e.message),
  });

  const pagar = trpc.quotes.pay.useMutation({
    onSuccess: (d) => setListo(d),
    onError: (e) => toast.error(e.message),
  });

  const ajustes = trpc.settings.getAll.useQuery().data;
  const bsRate = ajustes?.["bs_rate"];
  const tasaActualizada = ajustes?.["bs_rate_updated"];

  const archivo = async (f: File | null) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("La imagen supera 10 MB. Prueba con una captura o reduce su tamaño."); return; }
    setSubiendo(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] ?? "");
        r.onerror = () => rej(new Error("read"));
        r.readAsDataURL(f);
      });
      // Algunos navegadores no informan el tipo del archivo: se deduce por
      // la extensión para que la subida no falle por eso.
      const tipo = f.type || (
        /\.pdf$/i.test(f.name) ? "application/pdf" :
        /\.png$/i.test(f.name) ? "image/png" :
        /\.(heic|heif)$/i.test(f.name) ? "image/heic" :
        "image/jpeg"
      );

      const { url } = await subirComprobante.mutateAsync({
        fileName: f.name, fileType: tipo, fileBase64: base64,
      });
      setComprobante(url);
      toast.success("Comprobante cargado");
    } catch (e: any) {
      // Se muestra el motivo real: antes salía siempre el mismo mensaje y no
      // había forma de saber qué había fallado.
      toast.error(e?.message ?? "No se pudo subir el comprobante");
    } finally {
      setSubiendo(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#050507]">
        <Loader2 className="h-6 w-6 animate-spin text-[#e5007d]" />
      </div>
    );
  }

  if (error || !cotizacion) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#050507] px-6">
        <div className="max-w-sm text-center">
          <FileText className="mx-auto mb-4 h-10 w-10 text-[#3a3a48]" />
          <h1 className="mb-2 text-xl font-black text-white">Cotización no disponible</h1>
          <p className="mb-6 text-sm text-[#b4b4c2]">
            {error?.message ?? "El enlace no es válido o ya no está activo."}
          </p>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-[#e5007d] px-6 py-3 text-sm font-bold text-white">
            Ir a la tienda
          </Link>
        </div>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#050507] px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#e5007d]/15">
            <Check className="h-7 w-7 text-[#e5007d]" />
          </div>
          <h1 className="mb-2 text-2xl font-black text-white">¡Listo!</h1>
          <p className="mb-1 text-sm text-[#b4b4c2]">
            Tu pedido <strong className="text-white">{listo.orderNumber}</strong> quedó registrado.
          </p>
          <p className="mb-6 text-sm text-[#b4b4c2]">
            Verificamos tu pago y te escribimos por correo.
            {listo.cuentaCreada && " Te creamos una cuenta para que puedas seguir tu pedido."}
          </p>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-[#e5007d] px-6 py-3 text-sm font-bold text-white">
            Ir a la tienda
          </Link>
        </div>
      </div>
    );
  }

  const yaPagada = cotizacion.status === "paid";
  const items = (cotizacion.items as any[]) ?? [];
  const totalBs = bsRate ? (parseFloat(cotizacion.total) * parseFloat(bsRate)).toFixed(2) : null;
  const puedeEnviar = nombre.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !pagar.isPending;

  return (
    <div className="min-h-screen bg-[#050507] pb-16">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8a8a9c] transition-colors hover:text-white">
          <ArrowLeft size={13} /> Isekai World
        </Link>

        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#e5007d]">
          Cotización {cotizacion.quoteNumber}
        </p>
        <h1 className="mb-3 text-3xl font-black leading-tight text-white">{cotizacion.title}</h1>
        {cotizacion.description && (
          <p className="mb-8 text-sm leading-relaxed text-[#b4b4c2]">{cotizacion.description}</p>
        )}

        {/* Detalle */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-[#2e2e3a] bg-[#15151b]">
          {items.map((i: any, idx: number) => (
            <div key={idx} className="flex items-start justify-between gap-4 border-b border-[#22222c] px-5 py-4 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{i.concepto}</p>
                {i.cantidad > 1 && <p className="text-xs text-[#8a8a9c]">Cantidad: {i.cantidad}</p>}
              </div>
              <p className="shrink-0 font-bold text-white">
                ${(parseFloat(i.precio) * (i.cantidad || 1)).toFixed(2)}
              </p>
            </div>
          ))}
          <div className="flex items-center justify-between bg-[#101016] px-5 py-4">
            <span className="text-sm font-bold uppercase tracking-wide text-[#b4b4c2]">Total</span>
            <div className="text-right">
              <p className="text-2xl font-black text-[#e5007d]">${cotizacion.total} USD</p>
              {totalBs && (
                <>
                  <p className="text-xs text-[#8a8a9c]">Bs {totalBs}</p>
                  <p className="text-[10px] text-[#6a6a7c]">
                    Tasa: Bs {parseFloat(bsRate!).toLocaleString("es-VE", { minimumFractionDigits: 2 })}/USD
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {cotizacion.notes && (
          <p className="mb-8 rounded-xl border border-[#2e2e3a] bg-[#101016] px-4 py-3 text-xs leading-relaxed text-[#b4b4c2]">
            {cotizacion.notes}
          </p>
        )}

        {abonoEnviado ? (
          <div className="rounded-2xl border border-[#e5007d]/40 bg-[#e5007d]/10 px-5 py-6 text-center">
            <Check className="mx-auto mb-2 h-7 w-7 text-[#e5007d]" />
            <p className="font-bold text-white">Abono enviado</p>
            <p className="mt-1 text-sm text-[#b4b4c2]">
              Verificamos tu pago y te confirmamos por correo.
            </p>
          </div>
        ) : yaPagada && (cotizacion.saldoPendiente ?? 0) > 0.01 ? (
          /* Queda saldo: el cliente puede pagarlo aquí mismo */
          <>
            <div className="mb-6 rounded-2xl border border-[#ffd700]/40 bg-[#ffd700]/10 px-5 py-4">
              <p className="text-sm text-[#b4b4c2]">
                Ya abonaste <strong className="text-white">${(cotizacion.pagado ?? 0).toFixed(2)} USD</strong>
              </p>
              <p className="mt-1 text-lg font-black text-[#ffd700]">
                Saldo pendiente: ${(cotizacion.saldoPendiente ?? 0).toFixed(2)} USD
              </p>
            </div>

            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Pagar el saldo</h2>
            <div className="mb-4 flex gap-2">
              {([["pago_movil", "Pago Móvil"], ["crypto", "Cripto USDT"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setMetodo(id)}
                  className={`flex-1 rounded-xl border px-4 text-sm font-bold transition-colors ${
                    metodo === id ? "border-[#e5007d] bg-[#e5007d]/10 text-[#e5007d]" : "border-[#2e2e3a] text-[#b4b4c2]"
                  }`}
                  style={{ minHeight: 48 }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mb-6 flex flex-col gap-2">
              {metodo === "pago_movil" ? (
                <>
                  <Copiable label="Cédula" valor={PAGO_MOVIL.ci} />
                  <Copiable label="Banco" valor={PAGO_MOVIL.bank} />
                  <Copiable label="Teléfono" valor={PAGO_MOVIL.phone} />
                  {bsRate && (
                    <Copiable
                      label="Saldo en bolívares"
                      valor={((cotizacion.saldoPendiente ?? 0) * parseFloat(bsRate)).toFixed(2)}
                    />
                  )}
                </>
              ) : (
                <>
                  <Copiable label="Red" valor={CRYPTO.network} />
                  <Copiable label="Dirección USDT" valor={CRYPTO.address} />
                  <Copiable label="Saldo" valor={`${(cotizacion.saldoPendiente ?? 0).toFixed(2)} USDT`} />
                </>
              )}
            </div>

            <div className="mb-6 flex flex-col gap-3">
              <antiSpam.HoneyPot />
              <input
                inputMode="decimal"
                value={montoAbono}
                onChange={e => setMontoAbono(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={`Cuánto abonas (hasta ${(cotizacion.saldoPendiente ?? 0).toFixed(2)})`}
                className="rounded-xl border border-[#2e2e3a] bg-[#101016] px-4 text-white outline-none placeholder:text-[#6a6a7c] focus:border-[#e5007d]"
                style={{ minHeight: 50 }}
              />
              <button
                onClick={() => setMontoAbono((cotizacion.saldoPendiente ?? 0).toFixed(2))}
                className="rounded-xl border border-[#2e2e3a] text-xs font-bold text-[#b4b4c2]"
                style={{ minHeight: 44 }}
              >
                Pagar todo el saldo
              </button>
              <input
                value={referencia} onChange={e => setReferencia(e.target.value)}
                placeholder="Referencia del pago"
                className="rounded-xl border border-[#2e2e3a] bg-[#101016] px-4 text-white outline-none placeholder:text-[#6a6a7c] focus:border-[#e5007d]"
                style={{ minHeight: 50 }}
              />
              <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-sm font-semibold transition-colors ${
                comprobante ? "border-green-500/50 text-green-400" : "border-[#2e2e3a] text-[#b4b4c2] hover:border-[#e5007d]"
              }`} style={{ minHeight: 54 }}>
                {subiendo ? <Loader2 size={16} className="animate-spin" /> : comprobante ? <Check size={16} /> : <Upload size={16} />}
                {subiendo ? "Subiendo..." : comprobante ? "Comprobante cargado" : "Subir comprobante"}
                <input type="file" accept="image/*,application/pdf" className="hidden" disabled={subiendo}
                  onChange={e => archivo(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <button
              onClick={() => pagarSaldo.mutate({
                token,
                amount: parseFloat(montoAbono || "0").toFixed(2),
                paymentMethod: metodo,
                receiptUrl: comprobante || undefined,
                paymentReference: referencia.trim() || undefined,
                ...antiSpam.fields(),
              })}
              disabled={!parseFloat(montoAbono || "0") || pagarSaldo.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#e5007d] text-base font-bold text-white transition-colors hover:bg-[#c4006b] disabled:bg-[#22222c] disabled:text-[#6a6a7c]"
              style={{ minHeight: 54 }}
            >
              {pagarSaldo.isPending ? <Loader2 size={18} className="animate-spin" /> : null}
              Enviar abono
            </button>
          </>
        ) : yaPagada ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-center">
            <p className="font-bold text-green-400">Esta cotización está pagada por completo</p>
            <p className="mt-1 text-sm text-[#b4b4c2]">Si tienes dudas, escríbenos por Instagram.</p>
          </div>
        ) : (
          <>
            {/* Abono: solo si el admin fijó un monto adelantado */}
            {cotizacion.depositAmount && parseFloat(cotizacion.depositAmount) < parseFloat(cotizacion.total) && (() => {
              const minimo = parseFloat(cotizacion.depositAmount!);
              const resto = parseFloat(cotizacion.total) - minimo;
              return (
                <>
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Cuánto vas a pagar</h2>
                  <div className="mb-8 flex flex-col gap-2">
                    <button
                      onClick={() => setPagaTodo(false)}
                      className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                        !pagaTodo ? "border-[#e5007d] bg-[#e5007d]/10" : "border-[#2e2e3a]"
                      }`}
                    >
                      <p className={`text-sm font-bold ${!pagaTodo ? "text-[#ff45a0]" : "text-white"}`}>
                        Abonar ${minimo.toFixed(2)} USD
                      </p>
                      <p className="mt-0.5 text-xs text-[#8a8a9c]">
                        Pagas esto para empezar. Quedas debiendo ${resto.toFixed(2)}.
                      </p>
                    </button>
                    <button
                      onClick={() => setPagaTodo(true)}
                      className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                        pagaTodo ? "border-[#e5007d] bg-[#e5007d]/10" : "border-[#2e2e3a]"
                      }`}
                    >
                      <p className={`text-sm font-bold ${pagaTodo ? "text-[#ff45a0]" : "text-white"}`}>
                        Pagar todo: ${cotizacion.total} USD
                      </p>
                      <p className="mt-0.5 text-xs text-[#8a8a9c]">Queda cancelado por completo.</p>
                    </button>
                  </div>
                </>
              );
            })()}

            {/* Método de pago */}
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Cómo pagar</h2>
            <div className="mb-4 flex gap-2">
              {([["pago_movil", "Pago Móvil"], ["crypto", "Cripto USDT"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setMetodo(id)}
                  className={`flex-1 rounded-xl border px-4 text-sm font-bold transition-colors ${
                    metodo === id ? "border-[#e5007d] bg-[#e5007d]/10 text-[#e5007d]" : "border-[#2e2e3a] text-[#b4b4c2]"
                  }`}
                  style={{ minHeight: 48 }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mb-8 flex flex-col gap-2">
              {metodo === "pago_movil" ? (
                <>
                  <Copiable label="Cédula" valor={PAGO_MOVIL.ci} />
                  <Copiable label="Banco" valor={PAGO_MOVIL.bank} />
                  <Copiable label="Teléfono" valor={PAGO_MOVIL.phone} />
                  {(() => {
                    const aPagar = pagaTodo || !cotizacion.depositAmount
                      ? parseFloat(cotizacion.total)
                      : parseFloat(cotizacion.depositAmount);
                    const enBs = bsRate ? (aPagar * parseFloat(bsRate)).toFixed(2) : null;
                    if (!enBs) return null;
                    return (
                      <>
                        <Copiable label="Monto a transferir (Bs)" valor={enBs} />
                        {/* La tasa a la vista: el cliente entiende de dónde
                            sale la cifra en vez de tener que confiar. */}
                        <p className="px-1 text-[11px] text-[#8a8a9c]">
                          Calculado a Bs {parseFloat(bsRate!).toLocaleString("es-VE", { minimumFractionDigits: 2 })} por dólar
                          {tasaActualizada && (
                            <> · tasa del {new Date(tasaActualizada).toLocaleDateString("es-VE", { day: "2-digit", month: "long" })}</>
                          )}
                        </p>
                      </>
                    );
                  })()}
                </>
              ) : (
                <>
                  <Copiable label="Red" valor={CRYPTO.network} />
                  <Copiable label="Dirección USDT" valor={CRYPTO.address} />
                  <Copiable
                    label="Monto a transferir"
                    valor={`${(pagaTodo || !cotizacion.depositAmount ? parseFloat(cotizacion.total) : parseFloat(cotizacion.depositAmount)).toFixed(2)} USDT`}
                  />
                </>
              )}
            </div>

            {/* Datos del cliente */}
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Tus datos</h2>
            <div className="mb-8 flex flex-col gap-3">
              <antiSpam.HoneyPot />
              <input
                value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Tu nombre completo"
                className="rounded-xl border border-[#2e2e3a] bg-[#101016] px-4 text-white outline-none transition-colors placeholder:text-[#6a6a7c] focus:border-[#e5007d]"
                style={{ minHeight: 50 }}
              />
              <input
                type="email" inputMode="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Tu correo"
                className="rounded-xl border border-[#2e2e3a] bg-[#101016] px-4 text-white outline-none transition-colors placeholder:text-[#6a6a7c] focus:border-[#e5007d]"
                style={{ minHeight: 50 }}
              />
              <p className="-mt-1 text-[11px] text-[#8a8a9c]">
                Con este correo verás tu pedido y su avance.
              </p>
              <input
                type="tel" inputMode="tel"
                value={telefono} onChange={e => setTelefono(e.target.value)}
                placeholder="Tu teléfono (opcional)"
                className="rounded-xl border border-[#2e2e3a] bg-[#101016] px-4 text-white outline-none transition-colors placeholder:text-[#6a6a7c] focus:border-[#e5007d]"
                style={{ minHeight: 50 }}
              />
              {/* Código de cosplayer: opcional, pero da comisión a quien te
                  refirió y suele ser lo que motiva a compartir el enlace. */}
              <div>
                <input
                  value={codigoRef}
                  onChange={e => setCodigoRef(e.target.value.toUpperCase())}
                  placeholder="Código de cosplayer (opcional)"
                  className="w-full rounded-xl border border-[#2e2e3a] bg-[#101016] px-4 font-mono text-sm uppercase text-white outline-none transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-[#6a6a7c] focus:border-[#e5007d]"
                  style={{ minHeight: 50 }}
                />
                {codigoRef.trim().length >= 4 && (
                  <p className={`mt-1.5 text-[11px] ${refValido.data ? "text-green-400" : refValido.isLoading ? "text-[#8a8a9c]" : "text-[#ff6b6b]"}`}>
                    {refValido.isLoading
                      ? "Comprobando código..."
                      : refValido.data
                        ? `✓ Código de ${(refValido.data as any).artisticName}`
                        : "Ese código no es válido"}
                  </p>
                )}
              </div>

              <input
                value={referencia} onChange={e => setReferencia(e.target.value)}
                placeholder="Referencia del pago"
                className="rounded-xl border border-[#2e2e3a] bg-[#101016] px-4 text-white outline-none transition-colors placeholder:text-[#6a6a7c] focus:border-[#e5007d]"
                style={{ minHeight: 50 }}
              />
              <input
                value={titular} onChange={e => setTitular(e.target.value)}
                placeholder="Titular de la cuenta que pagó"
                className="rounded-xl border border-[#2e2e3a] bg-[#101016] px-4 text-white outline-none transition-colors placeholder:text-[#6a6a7c] focus:border-[#e5007d]"
                style={{ minHeight: 50 }}
              />

              {/* Comprobante */}
              <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-sm font-semibold transition-colors ${
                comprobante ? "border-green-500/50 text-green-400" : "border-[#2e2e3a] text-[#b4b4c2] hover:border-[#e5007d]"
              }`} style={{ minHeight: 54 }}>
                {subiendo ? <Loader2 size={16} className="animate-spin" /> : comprobante ? <Check size={16} /> : <Upload size={16} />}
                {subiendo ? "Subiendo..." : comprobante ? "Comprobante cargado" : "Subir comprobante de pago"}
                <input
                  type="file" accept="image/*,application/pdf" className="hidden" disabled={subiendo}
                  onChange={e => archivo(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <button
              onClick={() => pagar.mutate({
                token,
                customerName: nombre.trim(),
                customerEmail: email.trim(),
                customerPhone: telefono.trim() || undefined,
                paymentMethod: metodo,
                receiptUrl: comprobante || undefined,
                paymentReference: referencia.trim() || undefined,
                receiptHolder: titular.trim() || undefined,
                referralCode: codigoRef.trim() || undefined,
                amountPaid: pagaTodo || !cotizacion.depositAmount
                  ? cotizacion.total
                  : parseFloat(cotizacion.depositAmount).toFixed(2),
                ...antiSpam.fields(),
              })}
              disabled={!puedeEnviar}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#e5007d] text-base font-bold text-white transition-colors hover:bg-[#c4006b] disabled:cursor-not-allowed disabled:bg-[#22222c] disabled:text-[#6a6a7c]"
              style={{ minHeight: 54 }}
            >
              {pagar.isPending ? <Loader2 size={18} className="animate-spin" /> : null}
              Confirmar y enviar
            </button>

            <p className="mt-3 text-center text-xs text-[#8a8a9c]">
              Si aún no has pagado, transfiere primero y luego sube el comprobante.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
