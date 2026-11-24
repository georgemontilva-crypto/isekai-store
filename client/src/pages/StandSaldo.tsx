import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, Check, Clock, Copy, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useSEO } from "@/hooks/useSEO";
import { PAGO_MOVIL, BINANCE_PAY_ID } from "@shared/payment";
import { montarBotonCashea, mensajeDeError } from "@/lib/cashea";

/**
 * Saldo de un stand (/stands/saldo/<clave>): la página personal de cada
 * tienda para pagar lo que le falta. De contado (Pago Móvil, Binance Pay o
 * efectivo) o en cuotas con Cashea, cuando Cashea está activo.
 *
 * Cashea devuelve a la tienda a /stands/saldo/<clave>/cashea?idNumber=<orden>.
 */
const dinero = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const campo = "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-3 text-[16px] text-white outline-none placeholder:text-[#6f6878] focus:border-[#ff3d9e]/70";
const etiqueta = "mb-1.5 block text-[12px] font-semibold text-[#cfc9d8]";
const elegida = { borderColor: "#ff3d9e", background: "rgba(255,61,158,0.12)" };
const sinElegir = { borderColor: "rgba(255,255,255,0.12)" };

type Forma = "contado" | "cashea";
const mensaje = mensajeDeError;
type Metodo = "pago_movil" | "crypto" | "efectivo";

export default function StandSaldo() {
  useSEO({ title: "Paga el saldo de tu stand — Isekai World Fest 2027", description: "Página personal para pagar el saldo de tu stand del Isekai World Fest 2027.", url: "https://www.isekaiworld.co/stands" });
  const [, deVuelta] = useRoute("/stands/saldo/:clave/cashea");
  const [, normal] = useRoute("/stands/saldo/:clave");
  const clave = deVuelta?.clave ?? normal?.clave ?? "";
  const [, ir] = useLocation();
  const utils = trpc.useUtils();
  const saldo = trpc.stands.saldo.useQuery({ clave }, { enabled: clave.length > 0, retry: false, refetchOnWindowFocus: true });
  const { data: settings } = trpc.settings.getAll.useQuery();
  const tasa = parseFloat(settings?.["bs_rate"] ?? "");
  const [forma, setForma] = useState<Forma>("contado");
  const [hecho, setHecho] = useState<{ monto: number; aprobado: boolean; completo: boolean } | null>(null);
  const [pagarAparte, setPagarAparte] = useState(false);

  // Vuelta de Cashea: se guarda el número de la orden una sola vez
  const volver = trpc.stands.casheaVolver.useMutation({
    onSuccess: () => { void utils.stands.saldo.invalidate(); ir(`/stands/saldo/${clave}`, { replace: true }); },
    onError: e => { toast.error(mensaje(e, "No pudimos guardar tu orden de Cashea. Escríbenos a ventas@isekaiworld.co."), { duration: 9000 }); ir(`/stands/saldo/${clave}`, { replace: true }); },
  });
  const guardada = useRef(false);
  useEffect(() => {
    if (!deVuelta || guardada.current || !clave) return;
    guardada.current = true;
    const orden = new URLSearchParams(window.location.search).get("idNumber")?.trim();
    if (orden) volver.mutate({ clave, orderId: orden });
    else ir(`/stands/saldo/${clave}`, { replace: true });
  }, [deVuelta, clave]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = saldo.data;
  const porPagar = d ? Math.max(0, Math.round((d.saldo - d.enRevision) * 100) / 100) : 0;
  /** Orden de Cashea esperando confirmación */
  const ordenViva = d?.orden && d.orden.estado !== "confirmada" ? d.orden : null;
  /** Reservó con Cashea y aún no ha pagado nada: le falta la inicial */
  const faltaInicial = Boolean(ordenViva && d && d.pagado <= 0 && d.enRevision <= 0);
  // Quien reservó con Cashea y vuelve sin terminar, sigue con Cashea
  const modalidad = d?.modalidad;
  useEffect(() => { if (modalidad === "cashea") setForma("cashea"); }, [modalidad]);
  const alReportar = (r: { monto: number; aprobado: boolean; completo: boolean }) => { setHecho(r); void utils.stands.saldo.invalidate(); window.scrollTo({ top: 0 }); };

  return (
    <main className="min-h-[100svh] bg-[#06050a] px-5 pb-20 pt-8 text-white">
      <div className="mx-auto max-w-xl">
        <Link href="/stands" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#9a93a6]"><ArrowLeft size={15} /> Stands del Isekai World Fest</Link>
        <h1 className="mt-5 text-[28px] font-black leading-tight">{d?.estado === "pagado" ? "Tu stand" : d && d.pagado <= 0 ? "Paga tu stand" : "Paga el saldo de tu stand"}</h1>

        {saldo.isLoading || volver.isPending ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-[15px] text-[#bfb8c9]"><Loader2 size={18} className="animate-spin" /> {volver.isPending ? "Guardando tu orden de Cashea…" : "Cargando tu stand…"}</p>
        ) : !d ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-[17px] font-bold">Este enlace no es válido</p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#bfb8c9]">Revisa que lo hayas copiado completo desde tu correo. Si sigue sin abrir, pídenos uno nuevo a <a className="font-semibold text-[#ff8cc6]" href="mailto:ventas@isekaiworld.co">ventas@isekaiworld.co</a>.</p>
          </div>
        ) : (
          <>
            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6" aria-label="Tu stand">
              <p className="text-[18px] font-black">Stand {d.numero} · {d.plan}</p>
              <p className="text-[14px] text-[#9a93a6]">{d.negocio}</p>
              <dl className="mt-4 divide-y divide-white/8 text-[15px]">
                <Linea k={ordenViva ? "Stand con Cashea" : "Precio del stand"} v={dinero(ordenViva ? ordenViva.total : d.precio)} />
                <Linea k="Ya pagaste" v={dinero(d.pagado)} />
                {d.enRevision > 0 && <Linea k="Pago en revisión" v={dinero(d.enRevision)} />}
                {ordenViva
                  ? <Linea k="El resto" v="En cuotas con Cashea" fuerte />
                  : <Linea k={d.saldo > 0 ? "Te falta por pagar" : "Saldo"} v={d.saldo > 0 ? dinero(d.saldo) : "Pagado"} fuerte />}
              </dl>
            </section>

            {d.estado === "pagado" ? (
              <Aviso tono="ok" titulo="Tu stand está pagado por completo">No tienes nada pendiente. Tu factura te llegó por correo; si no la encuentras, escríbenos a ventas@isekaiworld.co.</Aviso>
            ) : d.estado !== "apartado" && d.estado !== "pendiente" ? (
              <Aviso tono="espera" titulo="Esta reserva no está activa">Si crees que es un error, escríbenos a ventas@isekaiworld.co.</Aviso>
            ) : d.estado === "pendiente" && !d.mesaLibre ? (
              <Aviso tono="espera" titulo={`El stand ${d.numero} ya lo reservó otra tienda`}>Su pago se confirmó antes. Escríbenos a ventas@isekaiworld.co y te asignamos otro stand del mismo tipo.</Aviso>
            ) : hecho ? (
              <Aviso tono="ok" titulo={hecho.completo ? "Pago verificado: tu stand quedó pagado" : hecho.aprobado ? "Pago verificado" : "Recibimos tu pago"}>
                {hecho.aprobado ? `Confirmamos tu pago de ${dinero(hecho.monto)}.` : `Reportaste ${dinero(hecho.monto)}. Lo revisamos y te avisamos por correo cuando esté confirmado.`}
                {ordenViva
                  ? <> Con ese pago cerramos tu orden de Cashea n.º {ordenViva.orderId} y tu stand queda pagado.</>
                  : !hecho.completo && porPagar > 0 && <> Te quedan {dinero(porPagar)} por pagar. <button type="button" className="font-bold text-white underline" onClick={() => setHecho(null)}>Reportar otro pago</button></>}
              </Aviso>
            ) : (
              <>
                {ordenViva && (
                  <Aviso tono="espera" titulo={`Recibimos tu orden de Cashea n.º ${ordenViva.orderId}`}>
                    {faltaInicial
                      ? "Falta un paso: paga aquí abajo la inicial que te indicó Cashea. Cuando la confirmemos, cerramos tu orden y tu stand queda reservado y pagado."
                      : d.pagado <= 0
                        ? `Estamos revisando tu pago de ${dinero(d.enRevision)}. Cuando lo confirmemos, cerramos tu orden con Cashea y te avisamos por correo.`
                        : `La estamos confirmando y te avisamos por correo. No tienes que hacer nada más, salvo que Cashea te haya pedido una inicial mayor a lo que ya pagaste (${dinero(d.pagado)}): esa diferencia se paga de contado.`}
                  </Aviso>
                )}
                {faltaInicial ? (
                  <DeContado clave={clave} porPagar={porPagar} tasa={tasa} inicial alTerminar={alReportar} />
                ) : ordenViva && !pagarAparte ? (
                  porPagar > 0 && <button type="button" onClick={() => setPagarAparte(true)} className="mt-4 w-full rounded-full border border-white/15 py-3.5 text-[15px] font-bold text-white">{d.pagado > 0 ? "Pagar la diferencia de contado" : "Reportar otro pago"}</button>
                ) : d.estado === "pendiente" && d.enRevision > 0 ? (
                  <Aviso tono="espera" titulo="Estamos revisando tu primer pago">Cuando lo confirmemos, tu mesa queda apartada y desde aquí podrás pagar el saldo. Te avisamos por correo.</Aviso>
                ) : porPagar <= 0 ? (
                  <Aviso tono="espera" titulo="Estamos revisando tu pago">Ya reportaste el pago de todo tu saldo. Te avisamos por correo cuando esté confirmado.</Aviso>
                ) : (
                  <>
                    {d.cashea.disponible && (
                      <>
                        <p className={`${etiqueta} mt-7`}>¿Cómo quieres pagar?</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" aria-pressed={forma === "cashea"} onClick={() => setForma("cashea")} className="rounded-xl border px-3 py-3 text-left" style={forma === "cashea" ? elegida : sinElegir}>
                            <p className="text-[14px] font-bold">En cuotas con Cashea</p>
                            <p className="text-[13px] text-[#cfc9d8]">{d.pagado > 0 ? `${dinero(d.cashea.financiado)} financiados` : `${dinero(d.cashea.total)} en total`}</p>
                          </button>
                          <button type="button" aria-pressed={forma === "contado"} onClick={() => setForma("contado")} className="rounded-xl border px-3 py-3 text-left" style={forma === "contado" ? elegida : sinElegir}>
                            <p className="text-[14px] font-bold">De contado</p>
                            <p className="text-[13px] text-[#cfc9d8]">{dinero(porPagar)}</p>
                          </button>
                        </div>
                      </>
                    )}
                    {forma === "cashea" && d.cashea.disponible
                      ? <ConCashea clave={clave} plan={d.cashea} precio={d.precio} pagado={d.pagado} />
                      : <DeContado clave={clave} porPagar={porPagar} tasa={tasa} alTerminar={alReportar} />}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Linea({ k, v, fuerte }: { k: string; v: string; fuerte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className={fuerte ? "font-bold text-white" : "text-[#9a93a6]"}>{k}</dt>
      <dd className={fuerte ? `${v.length > 10 ? "text-[15px]" : "text-[20px]"} text-right font-black text-white` : "font-semibold text-white"}>{v}</dd>
    </div>
  );
}

function Aviso({ tono, titulo, children }: { tono: "ok" | "espera"; titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4" role="status">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tono === "ok" ? "bg-[#16a34a]/20 text-[#4ade80]" : "bg-[#f59e0b]/15 text-[#fbbf24]"}`}>
        {tono === "ok" ? <Check size={17} /> : <Clock size={16} />}
      </span>
      <div>
        <p className="text-[15px] font-bold">{titulo}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-[#bfb8c9]">{children}</p>
      </div>
    </div>
  );
}

// ─── De contado ────────────────────────────────────────────────────────────
function DeContado({ clave, porPagar, tasa, inicial, alTerminar }: {
  clave: string; porPagar: number; tasa: number;
  /** Es la inicial de Cashea: el monto lo escribe la tienda (se lo indicó Cashea) */
  inicial?: boolean;
  alTerminar: (r: { monto: number; aprobado: boolean; completo: boolean }) => void;
}) {
  const [montoTexto, setMontoTexto] = useState(inicial ? "" : porPagar.toFixed(2));
  const [metodo, setMetodo] = useState<Metodo>("pago_movil");
  const [referencia, setReferencia] = useState("");
  const [comprobanteUrl, setComprobanteUrl] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const subir = trpc.orders.uploadReceiptPublic.useMutation();
  const pagar = trpc.stands.pagarSaldo.useMutation({
    onSuccess: r => { if (r.aviso) toast.message(r.aviso, { duration: 9000 }); alTerminar({ monto: r.monto, aprobado: r.aprobado, completo: r.completo }); },
    onError: e => toast.error(mensaje(e, "Revisa el monto y la referencia."), { duration: 8000 }),
  });
  useEffect(() => { if (!inicial) setMontoTexto(porPagar.toFixed(2)); }, [porPagar, inicial]);

  const monto = Math.round(Number(montoTexto.replace(",", ".")) * 100) / 100;
  const montoValido = Number.isFinite(monto) && monto >= 1 && monto <= porPagar + 0.009;
  const montoBs = montoValido && Number.isFinite(tasa) && tasa > 0 ? monto * tasa : 0;
  const copiar = (v: string) => { void navigator.clipboard?.writeText(v).then(() => toast.success("Copiado")).catch(() => {}); };

  const archivo = async (f: File | null) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("La imagen supera 10 MB"); return; }
    setSubiendo(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] ?? "");
        r.onerror = () => rej(new Error("read"));
        r.readAsDataURL(f);
      });
      const tipo = f.type || (/\.pdf$/i.test(f.name) ? "application/pdf" : /\.png$/i.test(f.name) ? "image/png" : "image/jpeg");
      const { url } = await subir.mutateAsync({ fileName: f.name, fileType: tipo, fileBase64: base64 });
      setComprobanteUrl(url);
      toast.success("Comprobante cargado");
    } catch { toast.error("No se pudo subir el comprobante"); }
    finally { setSubiendo(false); }
  };

  const listo = montoValido && (metodo === "efectivo" || referencia.trim().length >= 3);

  return (
    <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6" aria-label="Pago de contado">
      <label>
        <span className={etiqueta}>{inicial ? "Inicial que te indicó Cashea (USD) *" : "Monto que vas a pagar (USD)"}</span>
        <input value={montoTexto} onChange={e => setMontoTexto(e.target.value)} inputMode="decimal" placeholder={inicial ? "Ej.: 129.20" : ""} className={campo} aria-invalid={montoTexto !== "" && !montoValido} />
      </label>
      <p className="mt-1.5 text-[12px] text-[#9a93a6]">{inicial
        ? "Es el monto de la inicial que viste en Cashea al confirmar tu plan. Las cuotas se las pagas a Cashea."
        : montoValido ? "Puedes pagar todo el saldo o una parte." : `Escribe un monto entre $1 y ${dinero(porPagar)}.`}</p>

      <p className={`${etiqueta} mt-5`}>Paga por:</p>
      <div className="grid grid-cols-3 gap-2">
        {([["pago_movil", "Pago Móvil"], ["crypto", "Binance Pay"], ["efectivo", "Efectivo"]] as const).map(([id, n]) => (
          <button key={id} type="button" aria-pressed={metodo === id} onClick={() => setMetodo(id)} className="rounded-xl border px-3 py-3 text-[14px] font-bold" style={metodo === id ? elegida : sinElegir}>{n}</button>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-black/40 p-4 text-[14px] leading-relaxed">
        {metodo === "pago_movil" ? (
          <>
            <Dato k="Banco" v={PAGO_MOVIL.bank} copiar={copiar} />
            <Dato k="Teléfono" v={PAGO_MOVIL.phone} copiar={copiar} />
            <Dato k="Cédula" v={PAGO_MOVIL.ci} copiar={copiar} />
            {montoBs > 0 && <Dato k="Monto en Bs" v={montoBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} copiar={copiar} />}
            {montoBs > 0 && <p className="mt-1 text-[12px] text-[#9a93a6]">Tasa del día: Bs {tasa.toLocaleString("es-VE", { minimumFractionDigits: 2 })} por USD</p>}
          </>
        ) : metodo === "efectivo" ? (
          <>
            <p className="font-semibold text-white">Pago en efectivo{montoValido ? `: ${dinero(monto)}` : ""}</p>
            <p className="mt-1 text-[13px] text-[#bfb8c9]">Entrégalo a un agente de ventas de Isekai World o coordínalo con nosotros por WhatsApp. Si ya lo pagaste, indica abajo a quién se lo entregaste.</p>
          </>
        ) : (
          <>
            <Dato k="Binance Pay ID" v={BINANCE_PAY_ID} copiar={copiar} />
            {montoValido && <Dato k="Monto" v={`${monto} USDT`} copiar={copiar} />}
            <p className="mt-1 text-[12px] text-[#9a93a6]">En Binance: Pagar → Enviar → Binance Pay ID. Después abre ese pago en tu historial, copia el «ID de la transacción» y pégalo abajo: con ese número verificamos tu pago solos.</p>
          </>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>
          <span className={etiqueta}>{metodo === "efectivo" ? "¿A quién le entregaste el efectivo? (opcional)" : metodo === "crypto" ? "Número de transacción de Binance *" : "Número de referencia *"}</span>
          <input value={referencia} onChange={e => setReferencia(e.target.value)} maxLength={120} placeholder={metodo === "efectivo" ? "Nombre del agente o n.º de recibo" : ""} className={campo} />
        </label>
        <label>
          <span className={etiqueta}>Comprobante (opcional)</span>
          <span className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-3 py-3 text-[14px] text-[#cfc9d8]">
            {subiendo ? <Loader2 size={16} className="animate-spin" /> : comprobanteUrl ? <Check size={16} className="text-[#4ade80]" /> : <Upload size={16} />}
            {comprobanteUrl ? "Comprobante cargado" : "Subir captura"}
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => void archivo(e.target.files?.[0] ?? null)} />
          </span>
        </label>
      </div>

      <button
        type="button"
        disabled={!listo || pagar.isPending || subiendo}
        onClick={() => pagar.mutate({ clave, monto, metodo, referencia: referencia.trim() || "Efectivo por entregar", comprobanteUrl: comprobanteUrl || undefined })}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#ff3d9e] py-4 text-[16px] font-black disabled:opacity-40"
      >
        {pagar.isPending && <Loader2 size={18} className="animate-spin" />} {inicial ? "Reportar la inicial" : "Reportar pago"}{montoValido ? ` de ${dinero(monto)}` : ""}
      </button>
      <p className="mt-3 text-center text-[12px] text-[#8d8697]">Confirmamos tu pago y te avisamos por correo.</p>
    </section>
  );
}

function Dato({ k, v, copiar }: { k: string; v: string; copiar: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[#9a93a6]">{k}</span>
      <button type="button" onClick={() => copiar(v)} className="flex min-w-0 items-center gap-1.5 font-semibold text-white"><span className="truncate">{v}</span><Copy size={13} className="shrink-0 text-[#9a93a6]" /></button>
    </div>
  );
}

// ─── Con Cashea ────────────────────────────────────────────────────────────
function ConCashea({ clave, plan, precio, pagado }: {
  clave: string; precio: number; pagado: number;
  plan: { total: number; inicial: number; financiado: number; recargoPct: number };
}) {
  const [cedula, setCedula] = useState("");
  const [montado, setMontado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const iniciar = trpc.stands.casheaIniciar.useMutation();
  const numeros = cedula.replace(/\D/g, "");
  const cedulaValida = numeros.length >= 6 && numeros.length <= 10;

  /** Prepara la orden y monta el botón oficial de Cashea */
  const continuar = async () => {
    if (!cedulaValida || !caja.current) return;
    setCargando(true);
    try {
      const { publicKey, payload } = await iniciar.mutateAsync({ clave, cedula: numeros });
      await montarBotonCashea(caja.current, publicKey, payload);
      setMontado(true);
    } catch (e: any) {
      toast.error(mensaje(e, "No pudimos preparar el pago con Cashea. Revisa tu cédula e intenta de nuevo."), { duration: 8000 });
    } finally { setCargando(false); }
  };

  return (
    <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6" aria-label="Pago con Cashea">
      <p className="text-[14px] leading-relaxed text-[#cfc9d8]">Con Cashea el stand cuesta {dinero(plan.total)}: su precio de {dinero(precio)} más {plan.recargoPct} % por pagar en cuotas.</p>
      {pagado > 0 ? (
        <>
          <dl className="mt-3 divide-y divide-white/8 text-[15px]">
            <Linea k="Stand con Cashea" v={dinero(plan.total)} />
            <Linea k="Tu inicial (lo que ya pagaste)" v={dinero(plan.inicial)} />
            <Linea k="Lo pagas en cuotas a Cashea" v={dinero(plan.financiado)} fuerte />
          </dl>
          <p className="mt-3 text-[13px] leading-relaxed text-[#9a93a6]">El número de cuotas y la inicial final los define Cashea según tu nivel. Si te pide una inicial mayor a lo que ya pagaste, la diferencia la pagas de contado desde esta misma página.</p>
        </>
      ) : (
        <p className="mt-3 text-[13px] leading-relaxed text-[#9a93a6]">Cashea define tu inicial y tus cuotas según tu nivel. La inicial nos la pagas a nosotros al volver a esta página (Pago Móvil, Binance Pay o efectivo); las cuotas se las pagas a Cashea.</p>
      )}

      <label className="mt-5 block">
        <span className={etiqueta}>Tu cédula, la misma de tu cuenta de Cashea *</span>
        <input value={cedula} onChange={e => { setCedula(e.target.value); if (montado) { caja.current?.replaceChildren(); setMontado(false); } }} inputMode="numeric" autoComplete="off" maxLength={12} placeholder="Solo números" className={campo} />
      </label>

      {!montado && (
        <button type="button" disabled={!cedulaValida || cargando} onClick={() => void continuar()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#ff3d9e] py-4 text-[16px] font-black disabled:opacity-40">
          {cargando && <Loader2 size={18} className="animate-spin" />} Continuar
        </button>
      )}
      {montado && <p className="mt-5 text-center text-[13px] text-[#cfc9d8]">Todo listo. Toca el botón para ver tu plan y confirmar en Cashea.</p>}
      <div ref={caja} className="mt-3" />
      <p className="mt-3 text-center text-[12px] text-[#8d8697]">Al confirmar en Cashea vuelves aquí. {pagado > 0 ? "Tu stand queda pagado cuando revisemos la orden." : "Tu stand queda reservado cuando confirmemos tu inicial."}</p>
    </section>
  );
}
