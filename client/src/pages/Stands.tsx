import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Copy, Loader2, Map as MapaIcono, Store, Upload } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useSEO } from "@/hooks/useSEO";
import MapaStands, { COLOR_TIPO, type MesaPlano } from "@/components/fest/MapaStands";
import { PAGO_MOVIL, BINANCE_PAY_ID } from "@shared/payment";

/**
 * Tienda de stands del Isekai World Fest (/stands).
 * Se elige el tipo (Mercader, Gremio, Gran Gremio), la mesa numerada en el
 * plano o en la lista, y se reporta el pago (abono del 30% o completo).
 * La mesa queda reservada cuando Isekai confirma el pago.
 */
type Tipo = "mercader" | "gremio" | "gran_gremio";
const ORDEN: Tipo[] = ["mercader", "gremio", "gran_gremio"];

const dinero = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const campo = "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-3 text-[16px] text-white outline-none placeholder:text-[#6f6878] focus:border-[#ff3d9e]/70";
const etiqueta = "mb-1.5 block text-[12px] font-semibold text-[#cfc9d8]";

export default function Stands() {
  useSEO({ title: "Reserva tu stand — Isekai World Fest 2027", description: "Elige tu stand Mercader, Gremio o Gran Gremio y tu mesa en el plano del Isekai World Fest 2027.", url: "https://www.isekaiworld.co/stands" });
  const { data, isLoading } = trpc.stands.publico.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: settings } = trpc.settings.getAll.useQuery();
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [mesaId, setMesaId] = useState<number | null>(null);
  const [hecho, setHecho] = useState<{ numero: string; monto: number; tipo: string } | null>(null);

  const mesas = (data?.stands ?? []) as MesaPlano[];
  const mesa = mesas.find(m => m.id === mesaId) ?? null;
  const tipos = data?.tipos;
  const hayPlano = mesas.some(m => m.x !== null);
  const deTipo = useMemo(() => mesas.filter(m => !tipo || m.tipo === tipo), [mesas, tipo]);

  const elegir = (m: MesaPlano) => {
    if (!m.libre) return;
    setTipo(m.tipo as Tipo);
    setMesaId(m.id);
    window.setTimeout(() => document.getElementById("stand-formulario")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  if (hecho) {
    return (
      <main className="min-h-[100svh] bg-[#06050a] px-5 py-16 text-white">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#16a34a]/20"><Check size={30} className="text-[#4ade80]" /></div>
          <h1 className="text-[26px] font-black leading-tight">¡Recibimos tu solicitud!</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#bfb8c9]">
            Stand <b className="text-white">{hecho.numero}</b> · {hecho.tipo}. Reportaste un pago de <b className="text-white">{dinero(hecho.monto)}</b>.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-[#bfb8c9]">
            En cuanto confirmemos tu pago, la mesa queda <b className="text-white">reservada a tu nombre</b> y te llega un correo. Hasta entonces sigue disponible para otros, así que te avisaremos lo antes posible.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/" className="rounded-full bg-[#ff3d9e] py-3.5 font-bold">Volver al Fest</Link>
            <button onClick={() => { setHecho(null); setMesaId(null); }} className="rounded-full border border-white/15 py-3.5 font-semibold">Reservar otro stand</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] bg-[#06050a] pb-24 text-white">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.06] bg-[#06050a]/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06]" aria-label="Volver"><ArrowLeft size={18} /></Link>
        <p className="font-bold">Stands · Isekai World Fest 2027</p>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#ff3d9e]">14 y 15 de agosto 2027 · Maracaibo</p>
        <h1 className="mt-2 text-[34px] font-black leading-[1.05] sm:text-[46px]">Reserva tu stand</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#bfb8c9]">
          Elige el tipo de stand y tu mesa en el plano. Apártala con un abono del {data?.abonoPct ?? 30}% o págala completa: en cuanto confirmemos tu pago, esa mesa es tuya y nadie más puede tomarla.
        </p>

        {/* Tipos con su conteo de disponibles */}
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {ORDEN.map(id => {
            const t = tipos?.[id];
            const libres = data?.disponibles?.[id] ?? 0;
            const activo = tipo === id;
            return (
              <button
                key={id}
                onClick={() => { setTipo(activo ? null : id); setMesaId(null); }}
                className="rounded-2xl border p-4 text-left transition-colors"
                style={{ borderColor: activo ? COLOR_TIPO[id] : "rgba(255,255,255,0.1)", background: activo ? `${COLOR_TIPO[id]}14` : "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[18px] font-black" style={{ color: COLOR_TIPO[id] }}>{t?.nombre ?? "…"}</p>
                  <p className="text-[22px] font-black">{t ? dinero(t.precio) : ""}</p>
                </div>
                <p className="mt-1 text-[13px] font-semibold" style={{ color: libres ? "#4ade80" : "#f87171" }}>
                  {isLoading ? "Cargando…" : libres ? `${libres} disponibles de ${t?.cantidad}` : "Agotado"}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {(t?.incluye ?? []).map(x => (
                    <li key={x} className="flex gap-2 text-[13px] leading-snug text-[#cfc9d8]"><Check size={14} className="mt-0.5 shrink-0" style={{ color: COLOR_TIPO[id] }} />{x}</li>
                  ))}
                </ul>
                <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: COLOR_TIPO[id] }}>{activo ? "Mostrando sus mesas ✓" : "Ver mesas →"}</p>
              </button>
            );
          })}
        </div>

        {/* Plano */}
        {hayPlano && (
          <div className="mt-8">
            <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#cfc9d8]"><MapaIcono size={15} /> Toca una mesa libre en el plano</p>
            <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              <div className="min-w-[640px]">
                <MapaStands mesas={mesas} seleccionada={mesaId} onElegir={elegir} resaltarTipo={tipo} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-[#9a93a6]">
              {ORDEN.map(id => <span key={id} className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-[3px]" style={{ background: COLOR_TIPO[id] }} />{tipos?.[id]?.nombre}</span>)}
              <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-[3px] bg-[#3a3542]" />Reservado</span>
            </div>
          </div>
        )}

        {/* Mesas numeradas */}
        <div className="mt-8">
          <p className="mb-3 text-[13px] font-semibold text-[#cfc9d8]">{tipo ? `Mesas ${tipos?.[tipo]?.nombre}` : "Todas las mesas"} · elige tu número</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
            {deTipo.map(m => {
              const activa = m.id === mesaId;
              return (
                <button
                  key={m.id}
                  onClick={() => elegir(m)}
                  disabled={!m.libre}
                  className="rounded-xl py-3 text-[13px] font-bold transition-transform active:scale-95 disabled:cursor-not-allowed"
                  style={m.libre
                    ? { background: activa ? "#fff" : `${COLOR_TIPO[m.tipo]}22`, color: activa ? "#06050a" : COLOR_TIPO[m.tipo], border: `1px solid ${COLOR_TIPO[m.tipo]}66` }
                    : { background: "rgba(255,255,255,0.04)", color: "#4e4857", textDecoration: "line-through" }}
                  aria-label={`Stand ${m.numero}${m.libre ? "" : " reservado"}`}
                >
                  {m.numero}
                </button>
              );
            })}
          </div>
        </div>

        {mesa && tipos && <Formulario mesa={mesa} tipos={tipos} abonoPct={data?.abonoPct ?? 30} tasa={parseFloat(settings?.["bs_rate"] ?? "")} onListo={setHecho} />}
      </section>
    </main>
  );
}

function Formulario({ mesa, tipos, abonoPct, tasa, onListo }: {
  mesa: MesaPlano; tipos: Record<string, { nombre: string; precio: number }>; abonoPct: number; tasa: number;
  onListo: (r: { numero: string; monto: number; tipo: string }) => void;
}) {
  const t = tipos[mesa.tipo];
  const [modalidad, setModalidad] = useState<"abono" | "completo">("abono");
  const [negocio, setNegocio] = useState("");
  const [contacto, setContacto] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [rif, setRif] = useState("");
  const [metodo, setMetodo] = useState<"pago_movil" | "crypto">("pago_movil");
  const [referencia, setReferencia] = useState("");
  const [comprobanteUrl, setComprobanteUrl] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const subir = trpc.orders.uploadReceiptPublic.useMutation();
  const utils = trpc.useUtils();
  const solicitar = trpc.stands.solicitar.useMutation({
    onSuccess: r => { void utils.stands.publico.invalidate(); onListo({ numero: r.numero, monto: r.monto, tipo: r.tipo }); window.scrollTo({ top: 0 }); },
    onError: e => toast.error(e.message.includes("WhatsApp") ? "Revisa el número de WhatsApp" : e.message.includes("email") ? "Revisa el correo" : e.message),
  });

  const monto = modalidad === "abono" ? Math.round(t.precio * abonoPct) / 100 : t.precio;
  const montoBs = Number.isFinite(tasa) && tasa > 0 ? monto * tasa : 0;
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

  const listo = negocio.trim().length >= 2 && contacto.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && whatsapp.replace(/\D/g, "").length >= 7 && referencia.trim().length >= 3;

  return (
    <div id="stand-formulario" className="mt-10 scroll-mt-20 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-[13px] font-black text-[#06050a]" style={{ background: COLOR_TIPO[mesa.tipo] }}>{mesa.numero}</span>
        <div>
          <p className="text-[18px] font-black">Stand {mesa.numero} · {t.nombre}</p>
          <p className="text-[13px] text-[#9a93a6]">Precio: {dinero(t.precio)}</p>
        </div>
      </div>

      <p className={`${etiqueta} mt-6`}>¿Cómo quieres pagar?</p>
      <div className="grid grid-cols-2 gap-2">
        {(["abono", "completo"] as const).map(m => (
          <button key={m} type="button" onClick={() => setModalidad(m)}
            className="rounded-xl border px-3 py-3 text-left"
            style={modalidad === m ? { borderColor: "#ff3d9e", background: "rgba(255,61,158,0.12)" } : { borderColor: "rgba(255,255,255,0.12)" }}>
            <p className="text-[14px] font-bold">{m === "abono" ? `Abono ${abonoPct}%` : "Pago completo"}</p>
            <p className="text-[13px] text-[#cfc9d8]">{dinero(m === "abono" ? Math.round(t.precio * abonoPct) / 100 : t.precio)}</p>
          </button>
        ))}
      </div>
      {modalidad === "abono" && <p className="mt-2 text-[12px] text-[#9a93a6]">Con el abono la mesa queda apartada a tu nombre; el saldo de {dinero(t.precio - monto)} se paga después.</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label><span className={etiqueta}>Nombre de tu tienda o marca *</span><input value={negocio} onChange={e => setNegocio(e.target.value)} maxLength={150} className={campo} /></label>
        <label><span className={etiqueta}>Persona de contacto *</span><input value={contacto} onChange={e => setContacto(e.target.value)} maxLength={150} autoComplete="name" className={campo} /></label>
        <label><span className={etiqueta}>Correo *</span><input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" className={campo} /></label>
        <label><span className={etiqueta}>WhatsApp *</span><input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} inputMode="tel" placeholder="0414 123 4567" className={campo} /></label>
        <label className="sm:col-span-2"><span className={etiqueta}>RIF o cédula (opcional)</span><input value={rif} onChange={e => setRif(e.target.value)} maxLength={40} className={campo} /></label>
      </div>

      <p className={`${etiqueta} mt-6`}>Paga {dinero(monto)} por:</p>
      <div className="grid grid-cols-2 gap-2">
        {([["pago_movil", "Pago Móvil"], ["crypto", "Binance Pay"]] as const).map(([id, n]) => (
          <button key={id} type="button" onClick={() => setMetodo(id)} className="rounded-xl border px-3 py-3 text-[14px] font-bold"
            style={metodo === id ? { borderColor: "#ff3d9e", background: "rgba(255,61,158,0.12)" } : { borderColor: "rgba(255,255,255,0.12)" }}>{n}</button>
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
        ) : (
          <>
            <Dato k="Binance Pay ID" v={BINANCE_PAY_ID} copiar={copiar} />
            <Dato k="Monto" v={`${monto} USDT`} copiar={copiar} />
            <p className="mt-1 text-[12px] text-[#9a93a6]">En Binance: Pagar → Enviar → Binance Pay ID. Coloca el número de orden como referencia.</p>
          </>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label><span className={etiqueta}>Número de referencia *</span><input value={referencia} onChange={e => setReferencia(e.target.value)} maxLength={120} className={campo} /></label>
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
        disabled={!listo || solicitar.isPending || subiendo}
        onClick={() => solicitar.mutate({ standId: mesa.id, negocio, contacto, email, whatsapp, rif: rif || undefined, modalidad, metodo, referencia, comprobanteUrl: comprobanteUrl || undefined })}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#ff3d9e] py-4 text-[16px] font-black disabled:opacity-40"
      >
        {solicitar.isPending ? <Loader2 size={18} className="animate-spin" /> : <Store size={18} />} Reportar pago y reservar {mesa.numero}
      </button>
      <p className="mt-3 text-center text-[12px] text-[#8d8697]">La mesa queda reservada cuando confirmemos tu pago. Te avisamos por correo.</p>
    </div>
  );
}

function Dato({ k, v, copiar }: { k: string; v: string; copiar: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[#9a93a6]">{k}</span>
      <button onClick={() => copiar(v)} className="flex min-w-0 items-center gap-1.5 font-semibold text-white"><span className="truncate">{v}</span><Copy size={13} className="shrink-0 text-[#9a93a6]" /></button>
    </div>
  );
}
