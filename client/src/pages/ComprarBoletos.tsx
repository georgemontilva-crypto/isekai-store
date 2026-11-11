import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Clock, Loader2, Minus, Plus, ShieldCheck, Ticket, Upload } from "lucide-react";
import { Link, useSearch } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { BINANCE_PAY_ID, PAGO_MOVIL } from "@shared/payment";

/**
 * Compra de boletos por la web (/boletos). Elige el boleto, paga y reporta el
 * pago. Con Binance Pay se verifica solo con el número de transacción; con
 * Pago Móvil lo confirma el equipo. Al aprobarse, el boleto llega por correo.
 */
const campo = "w-full rounded-xl border border-white/10 bg-[#0f0e15] px-4 py-3 text-[16px] text-white outline-none placeholder:text-[#5d5766] focus:border-[#ff3d9e]";
const etiqueta = "mb-1.5 block text-[12.5px] font-semibold text-[#bfb8c9]";
const dinero = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const fecha = (d: any) => new Date(d).toLocaleDateString("es-VE", { timeZone: "UTC", day: "numeric", month: "long" });

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100svh] bg-[#06050a] pb-20 text-white">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.06] bg-[#06050a]/90 px-4 py-3 backdrop-blur" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06]" aria-label="Volver"><ArrowLeft size={18} /></Link>
        <p className="font-bold">Boletos · Isekai World Fest</p>
      </header>
      <div className="mx-auto max-w-xl px-4 pt-6">{children}</div>
    </main>
  );
}

export default function ComprarBoletos() {
  const claveUrl = new URLSearchParams(useSearch()).get("orden");
  const [clave, setClave] = useState<string | null>(claveUrl);
  useEffect(() => { setClave(claveUrl); }, [claveUrl]);
  if (clave) return <Marco><Orden clave={clave} /></Marco>;
  return <Marco><Compra onListo={c => { setClave(c); try { window.history.replaceState(null, "", `/boletos?orden=${c}`); } catch { /* */ } window.scrollTo({ top: 0 }); }} /></Marco>;
}

function Compra({ onListo }: { onListo: (clave: string) => void }) {
  const { data, isLoading } = trpc.boletosOnline.catalogo.useQuery();
  const { data: settings } = trpc.settings.getAll.useQuery();
  const tasaLeida = parseFloat((settings as any)?.["bs_rate"] ?? "");
  const tasa = Number.isFinite(tasaLeida) ? tasaLeida : 0;
  const [tipoId, setTipoId] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [metodo, setMetodo] = useState<"pago_movil" | "crypto">("pago_movil");
  const [referencia, setReferencia] = useState("");
  const [comprobanteUrl, setComprobanteUrl] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const subir = trpc.orders.uploadReceiptPublic.useMutation();
  const comprar = trpc.boletosOnline.comprar.useMutation({
    onSuccess: r => { if (r.mensaje) toast.message(r.mensaje); onListo(r.clave); },
    onError: e => toast.error(e.message.includes("email") ? "Revisa el correo" : e.message.includes("Teléfono") ? "Revisa el teléfono" : e.message),
  });

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#ff3d9e]" /></div>;
  if (!data?.evento || data.tipos.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-center">
        <Ticket size={26} className="mx-auto text-[#ff3d9e]" />
        <p className="mt-3 text-[18px] font-bold">La venta en línea abre pronto</p>
        <p className="mt-2 text-[14px] leading-relaxed text-[#9a93a6]">Todavía no hay boletos a la venta por la web. Síguenos para enterarte cuando abra.</p>
        <Link href="/" className="mt-5 inline-block rounded-full bg-[#ff3d9e] px-6 py-3 font-bold">Volver al Fest</Link>
      </div>
    );
  }

  const tipo = data.tipos.find(t => t.id === tipoId) ?? null;
  const tope = Math.min(data.maximo, tipo?.quedan ?? data.maximo);
  const n = Math.max(1, Math.min(cantidad, tope || 1));
  const monto = tipo ? Math.round(tipo.precio * n * 100) / 100 : 0;
  const copiar = (v: string) => { void navigator.clipboard?.writeText(v).then(() => toast.success("Copiado")).catch(() => {}); };
  const refOk = metodo === "crypto" ? referencia.replace(/\s/g, "").length >= 8 : referencia.trim().length >= 4;
  const listo = Boolean(tipo) && nombre.trim().length >= 2 && apellido.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && telefono.replace(/\D/g, "").length >= 7 && refOk;

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
      const t = f.type || (/\.pdf$/i.test(f.name) ? "application/pdf" : /\.png$/i.test(f.name) ? "image/png" : "image/jpeg");
      const { url } = await subir.mutateAsync({ fileName: f.name, fileType: t, fileBase64: base64 });
      setComprobanteUrl(url);
      toast.success("Comprobante cargado");
    } catch { toast.error("No se pudo subir el comprobante"); }
    finally { setSubiendo(false); }
  };

  const Dato = ({ k, v }: { k: string; v: string }) => (
    <button type="button" onClick={() => copiar(v)} className="flex w-full items-center justify-between gap-3 py-1 text-left">
      <span className="text-[#9a93a6]">{k}</span><span className="font-semibold text-white">{v}</span>
    </button>
  );

  return (
    <>
      <h1 className="text-[30px] font-black leading-[1.08]">Compra tu boleto</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[#bfb8c9]">
        {data.evento.nombre} · {fecha(data.evento.inicio)}{fecha(data.evento.fin) !== fecha(data.evento.inicio) ? ` y ${fecha(data.evento.fin)}` : ""}{data.evento.lugar ? ` · ${data.evento.lugar}` : ""}. Tu boleto llega a tu correo con su código QR. Todos incluyen el Level Pass.
      </p>

      <div className="mt-6 flex flex-col gap-2.5">
        {data.tipos.map(t => {
          const sel = tipoId === t.id, agotado = t.quedan === 0, c = t.color ?? "#ff3d9e";
          return (
            <button key={t.id} disabled={agotado} aria-pressed={sel}
              onClick={() => { setTipoId(t.id); setCantidad(1); window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150); }}
              className="rounded-3xl border p-4 text-left transition-colors disabled:opacity-45"
              style={{ borderColor: sel ? c : "rgba(255,255,255,0.09)", background: sel ? `${c}14` : "rgba(255,255,255,0.03)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[17px] font-bold">{t.nombre}</p>
                  <p className="text-[12.5px] text-[#9a93a6]">{t.dias === 2 ? "Los dos días" : "Un día, el que elijas"}{t.cupo != null ? (agotado ? " · Agotado" : ` · Quedan ${t.quedan}`) : ""}</p>
                </div>
                <p className="shrink-0 text-[24px] font-black leading-none tabular-nums">{dinero(t.precio)}</p>
              </div>
              {t.beneficios.length > 0 && (
                <ul className={`mt-3 flex flex-col gap-1 text-[13px] leading-snug text-[#cfc9d8] ${sel ? "" : "line-clamp-2"}`}>
                  {(sel ? t.beneficios : t.beneficios.slice(0, 2)).map(b => <li key={b} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0" style={{ color: c }} />{b}</li>)}
                  {!sel && t.beneficios.length > 2 && <li className="text-[12px] text-[#8a8494]">y {t.beneficios.length - 2} más</li>}
                </ul>
              )}
            </button>
          );
        })}
      </div>

      {tipo && (
        <div ref={formRef} className="mt-7 scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-bold">¿Cuántos boletos?</p>
              <p className="text-[12.5px] text-[#9a93a6]">Hasta {tope} por compra</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setCantidad(Math.max(1, n - 1))} disabled={n <= 1} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] disabled:opacity-30" aria-label="Uno menos"><Minus size={18} /></button>
              <span className="w-6 text-center text-[20px] font-black tabular-nums">{n}</span>
              <button onClick={() => setCantidad(Math.min(tope, n + 1))} disabled={n >= tope} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] disabled:opacity-30" aria-label="Uno más"><Plus size={18} /></button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label><span className={etiqueta}>Nombre *</span><input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={100} autoComplete="given-name" className={campo} /></label>
            <label><span className={etiqueta}>Apellido *</span><input value={apellido} onChange={e => setApellido(e.target.value)} maxLength={100} autoComplete="family-name" className={campo} /></label>
            <label><span className={etiqueta}>Correo * (ahí llega tu boleto)</span><input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" className={campo} /></label>
            <label><span className={etiqueta}>WhatsApp *</span><input value={telefono} onChange={e => setTelefono(e.target.value)} inputMode="tel" placeholder="0414 123 4567" className={campo} /></label>
          </div>
          {n > 1 && <p className="mt-2 text-[12.5px] text-[#9a93a6]">Los {n} boletos llegan a este correo, cada uno con su propio QR, para que los repartas.</p>}

          <p className={`${etiqueta} mt-6`}>Paga {dinero(monto)} por:</p>
          <div className="grid grid-cols-2 gap-2">
            {([["pago_movil", "Pago Móvil"], ["crypto", "Binance Pay"]] as const).map(([id, t]) => (
              <button key={id} type="button" onClick={() => { setMetodo(id); setReferencia(""); }} className="rounded-xl border px-3 py-3 text-[14px] font-bold"
                style={metodo === id ? { borderColor: "#ff3d9e", background: "rgba(255,61,158,0.12)" } : { borderColor: "rgba(255,255,255,0.12)" }}>{t}</button>
            ))}
          </div>
          <div className="mt-3 rounded-2xl bg-black/40 p-4 text-[14px] leading-relaxed">
            {metodo === "pago_movil" ? (
              <>
                <Dato k="Banco" v={PAGO_MOVIL.bank} />
                <Dato k="Teléfono" v={PAGO_MOVIL.phone} />
                <Dato k="Cédula" v={PAGO_MOVIL.ci} />
                {tasa > 0 && <Dato k="Monto en Bs" v={(monto * tasa).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />}
                <p className="mt-2 flex items-start gap-2 text-[12.5px] text-[#9a93a6]"><Clock size={14} className="mt-0.5 shrink-0" /> Lo confirma nuestro equipo. Tu boleto llega al correo en cuanto lo revisemos.</p>
              </>
            ) : (
              <>
                <Dato k="Binance Pay ID" v={BINANCE_PAY_ID} />
                <Dato k="Monto" v={`${monto} USDT`} />
                <p className="mt-2 flex items-start gap-2 text-[12.5px] text-[#a7f3d0]"><ShieldCheck size={14} className="mt-0.5 shrink-0" /> {data.binanceAutomatico ? "Se verifica solo: pega el número de transacción y tu boleto llega al instante." : "Pega el número de transacción de tu pago para confirmarlo."}</p>
              </>
            )}
          </div>

          <label className="mt-4 block">
            <span className={etiqueta}>{metodo === "crypto" ? "Número de transacción de Binance *" : "Número de referencia *"}</span>
            <input value={referencia} onChange={e => setReferencia(e.target.value)} maxLength={120} inputMode={metodo === "crypto" ? "text" : "numeric"} autoCapitalize="off" autoCorrect="off" className={campo} />
            {metodo === "crypto" && <span className="mt-1.5 block text-[12px] leading-relaxed text-[#8a8494]">En Binance: abre el pago que hiciste (Pay → Historial) y copia el «ID de la transacción» u «Order ID». Tiene que ser exacto.</span>}
          </label>
          {metodo === "pago_movil" && (
            <label className="mt-3 block">
              <span className={etiqueta}>Captura del pago (opcional, ayuda a confirmarlo más rápido)</span>
              <span className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-3 py-3 text-[14px] text-[#cfc9d8]">
                {subiendo ? <Loader2 size={16} className="animate-spin" /> : comprobanteUrl ? <Check size={16} className="text-[#4ade80]" /> : <Upload size={16} />}
                {comprobanteUrl ? "Comprobante cargado" : "Subir captura"}
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => void archivo(e.target.files?.[0] ?? null)} />
              </span>
            </label>
          )}

          <button
            disabled={!listo || comprar.isPending || subiendo}
            onClick={() => comprar.mutate({ ticketTypeId: tipo.id, cantidad: n, nombre, apellido, telefono, email, metodo, referencia: referencia.trim(), comprobanteUrl: comprobanteUrl || undefined })}
            className="mt-6 flex w-full items-center justify-between gap-3 rounded-full bg-[#ff3d9e] px-6 py-4 text-[16px] font-black disabled:opacity-40"
          >
            <span className="flex items-center gap-2">{comprar.isPending ? <Loader2 size={18} className="animate-spin" /> : <Ticket size={18} />} {comprar.isPending ? "Verificando…" : "Ya pagué: enviar"}</span>
            <span className="tabular-nums">{dinero(monto)}</span>
          </button>
          <p className="mt-3 text-center text-[12px] text-[#8d8697]">Primero haz el pago y luego envía este formulario.</p>
        </div>
      )}
    </>
  );
}

/** Estado de la compra: aprobada (con los boletos), en revisión o rechazada */
function Orden({ clave }: { clave: string }) {
  const utils = trpc.useUtils();
  const { data: o, isLoading } = trpc.boletosOnline.estado.useQuery({ clave }, { refetchInterval: q => (q.state.data?.estado === "pendiente" ? 15_000 : false) });
  const [tx, setTx] = useState("");
  const verificar = trpc.boletosOnline.verificar.useMutation({
    onSuccess: r => { if (r.mensaje) toast.message(r.mensaje); else toast.success("¡Pago verificado!"); void utils.boletosOnline.estado.invalidate(); },
    onError: e => toast.error(e.message),
  });

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#ff3d9e]" /></div>;
  if (!o) return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-center">
      <p className="text-[17px] font-bold">No encontramos esa compra</p>
      <Link href="/boletos" className="mt-4 inline-block rounded-full bg-[#ff3d9e] px-6 py-3 font-bold">Comprar boletos</Link>
    </div>
  );

  if (o.estado === "aprobado") return (
    <div className="text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#4ade80]/15 text-[#4ade80]"><Check size={30} strokeWidth={3} /></span>
      <h1 className="mt-4 text-[28px] font-black">¡{o.cantidad === 1 ? "Tu boleto está listo" : `Tus ${o.cantidad} boletos están listos`}!</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[#bfb8c9]">{o.cantidad} × {o.tipo}. También {o.cantidad === 1 ? "lo enviamos" : "los enviamos"} a <b className="text-white">{o.email}</b>.</p>
      <div className="mt-6 flex flex-col gap-2.5">
        {o.boletos.map((b, i) => (
          <Link key={b.token} href={`/boleto/${b.token}`} className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left">
            <span className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff3d9e]/15 text-[#ff3d9e]"><Ticket size={20} /></span>
              <span><span className="block text-[12px] text-[#9a93a6]">Boleto {o.boletos.length > 1 ? i + 1 : ""}</span><span className="block font-mono text-[17px] font-bold tracking-wider">{b.codigo}</span></span></span>
            <span className="text-[13px] font-bold text-[#7dd8ff]">Ver QR</span>
          </Link>
        ))}
      </div>
      <Link href="/" className="mt-7 inline-block rounded-full border border-white/15 px-6 py-3 font-semibold">Volver al Fest</Link>
    </div>
  );

  if (o.estado === "rechazado") return (
    <div className="rounded-3xl border border-[#f87171]/30 bg-[#f87171]/[0.07] p-7 text-center">
      <p className="text-[19px] font-bold">No pudimos confirmar tu pago</p>
      <p className="mt-2 text-[14px] leading-relaxed text-[#fecaca]">Revisa la referencia y vuelve a intentarlo, o escríbenos a ventas@isekaiworld.co con tu comprobante.</p>
      <a href="/boletos" className="mt-5 inline-block rounded-full bg-[#ff3d9e] px-6 py-3 font-bold">Intentar de nuevo</a>
    </div>
  );

  return (
    <div className="text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fbbf24]/15 text-[#fbbf24]"><Clock size={28} /></span>
      <h1 className="mt-4 text-[26px] font-black">Estamos confirmando tu pago</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[#bfb8c9]">{o.cantidad} × {o.tipo} · {dinero(o.monto)}. En cuanto se confirme, {o.cantidad === 1 ? "tu boleto llega" : "tus boletos llegan"} a <b className="text-white">{o.email}</b>. Esta página se actualiza sola; puedes guardarla o cerrarla.</p>
      {o.metodo === "crypto" && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left">
          <p className="text-[14.5px] font-bold">¿Ya aparece tu pago en Binance?</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#9a93a6]">Si el número que pusiste tenía un error o acabas de pagar, pégalo otra vez y lo verificamos al momento.</p>
          <input value={tx} onChange={e => setTx(e.target.value)} placeholder="Número de transacción de Binance" autoCapitalize="off" autoCorrect="off" className={`${campo} mt-3`} />
          <button disabled={verificar.isPending || tx.replace(/\s/g, "").length < 8} onClick={() => verificar.mutate({ clave, transactionId: tx.trim() })} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#ff3d9e] py-3.5 font-bold disabled:opacity-40">
            {verificar.isPending ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />} Verificar ahora
          </button>
        </div>
      )}
      <Link href="/" className="mt-7 inline-block rounded-full border border-white/15 px-6 py-3 font-semibold">Volver al Fest</Link>
    </div>
  );
}
