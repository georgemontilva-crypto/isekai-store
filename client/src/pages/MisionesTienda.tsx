import { useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Clock, Lightbulb, Loader2, Lock, Plus, ShoppingBag, Swords, Upload } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";
import { BINANCE_PAY_ID, PAGO_MOVIL } from "@shared/payment";
import { useStandsSocket } from "@/hooks/useStandsSocket";
import CambiarHerramienta from "@/components/CambiarHerramienta";

/**
 * Misiones de la tienda (/boleteria/misiones). Cada tienda con stand escribe
 * las misiones que su stand ofrece en el Level Pass. Una vez puesta, una
 * misión no se cambia. Puede comprar extras hasta 5 en total.
 */
const campo = "w-full rounded-xl border border-white/10 bg-[#0f0e15] px-4 py-3 text-[16px] text-white outline-none placeholder:text-[#5d5766] focus:border-[#a78bfa]";
const etiqueta = "mb-1.5 block text-[12.5px] font-semibold text-[#bfb8c9]";

export default function MisionesTienda() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.standTienda.miPanel.useQuery(undefined, { enabled: isAuthenticated });
  useStandsSocket(() => { void utils.standTienda.miPanel.invalidate(); });
  const m = data?.misiones;

  const marco = (hijos: React.ReactNode) => (
    <div className="min-h-[100dvh] bg-[#07060a] px-4 text-white" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)", paddingBottom: "calc(env(safe-area-inset-bottom) + 2.5rem)" }}>
      <div className="mx-auto max-w-md">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/boleteria" aria-label="Volver a Boletería" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[#cfc9d8]"><ArrowLeft size={18} /></Link>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a78bfa]">Level Pass · Tu stand</p>
            <p className="truncate text-[21px] font-bold">Mis misiones</p>
          </div>
        </div>
        <CambiarHerramienta className="mb-4" />
        {hijos}
      </div>
    </div>
  );

  if (loading || (isAuthenticated && isLoading)) return marco(<div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#a78bfa]" /></div>);
  if (!isAuthenticated) return marco(
    <div className="rounded-3xl bg-white/[0.035] p-6 text-center">
      <p className="text-[15px] font-semibold">Entra con el correo de tu stand</p>
      <button onClick={openLoginModal} className="mt-4 w-full rounded-full bg-[#e5007d] py-3.5 text-[15px] font-bold">Iniciar sesión</button>
    </div>,
  );
  if (!m) return marco(
    <div className="rounded-3xl bg-white/[0.035] p-6 text-center">
      <p className="text-[15px] font-semibold">Esta sección es para tiendas con stand en el Fest</p>
      <p className="mt-2 text-[13px] leading-relaxed text-[#9a93a6]">Se activa sola cuando tu stand queda pagado por completo, con el mismo correo con que lo reservaste.</p>
      <Link href="/stands" className="mt-4 inline-block rounded-full bg-white/[0.08] px-5 py-3 text-[13.5px] font-semibold">Ver stands disponibles</Link>
    </div>,
  );

  return marco(
    <>
      <div className="mb-4 rounded-3xl border border-[#a78bfa]/25 bg-[#a78bfa]/[0.07] p-5">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#c4b5fd]">{m.tienda} · {m.planNombre}</p>
        <p className="mt-1 text-[30px] font-black leading-none tabular-nums">{m.usadas} <span className="text-[17px] font-bold text-[#a39cad]">de {m.cupo} {m.cupo === 1 ? "misión puesta" : "misiones puestas"}</span></p>
        <p className="mt-2 text-[13px] text-[#bfb8c9]">Tu plan incluye {m.incluidas}{m.extrasAprobadas > 0 ? ` y compraste ${m.extrasAprobadas} extra` : ""}. El tope es {m.maximo} por tienda.</p>
      </div>

      {m.misiones.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2.5">
          {m.misiones.map((x, i) => (
            <li key={x.id} className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#a78bfa]/15 text-[14px] font-black text-[#c4b5fd]">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15.5px] font-semibold leading-snug">{x.nombre}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#a39cad]">{x.descripcion}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#8a8494]">
                    <span className="font-bold text-[#7dd8ff]">+{x.xp} EXP</span>
                    <span className="flex items-center gap-1"><Lock size={11} /> Fija, no se puede cambiar</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {m.misiones.length > 0 && (
        <p className="mb-5 rounded-2xl bg-white/[0.03] px-4 py-3 text-[12.5px] leading-relaxed text-[#9a93a6]">
          La EXP la calcula Isekai World y es igual para todas las tiendas. Se ajusta sola según cuántas misiones haya en el evento, para que llegar al rango S pida recorrer varios stands.
        </p>
      )}

      {m.libres > 0 ? <NuevaMision libres={m.libres} /> : (
        <div className="mb-5 rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5 text-center">
          <Check size={22} className="mx-auto text-[#4ade80]" />
          <p className="mt-2 text-[15px] font-semibold">{m.cupo >= m.maximo ? `Ya tienes tus ${m.maximo} misiones` : "Ya pusiste todas tus misiones"}</p>
          {m.puedeComprar > 0 && <p className="mt-1 text-[13px] text-[#9a93a6]">¿Quieres otra? Puedes comprar misiones extra aquí abajo.</p>}
        </div>
      )}

      {m.extrasPendientes > 0 && (
        <p className="mb-4 flex items-start gap-2.5 rounded-2xl border border-[#fbbf24]/25 bg-[#fbbf24]/[0.07] px-4 py-3 text-[13px] leading-relaxed text-[#fde68a]">
          <Clock size={16} className="mt-0.5 shrink-0" />
          Estamos revisando tu pago de {m.extrasPendientes} {m.extrasPendientes === 1 ? "misión extra" : "misiones extra"}. Te avisamos por correo y aparece aquí sola.
        </p>
      )}

      {m.puedeComprar > 0 && <ComprarExtra max={m.puedeComprar} precio={m.precioExtra} tope={m.maximo} />}

      {m.compras.some(c => c.estado === "rechazado") && (
        <p className="mt-4 text-[12.5px] text-[#fca5a5]">Un pago de misiones extra no pudo confirmarse. Revisa la referencia y repórtalo de nuevo.</p>
      )}
    </>,
  );
}

function NuevaMision({ libres }: { libres: number }) {
  const utils = trpc.useUtils();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const crear = trpc.standTienda.crearMision.useMutation({
    onSuccess: () => { toast.success("Misión guardada"); setNombre(""); setDescripcion(""); setConfirmando(false); void utils.standTienda.miPanel.invalidate(); },
    onError: e => { toast.error(e.message); setConfirmando(false); },
  });
  const listo = nombre.trim().length >= 4 && descripcion.trim().length >= 10;

  return (
    <div className="mb-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <p className="flex items-center gap-2 text-[16px] font-bold"><Plus size={18} className="text-[#a78bfa]" /> Nueva misión <span className="text-[12.5px] font-semibold text-[#8a8494]">· te {libres === 1 ? "queda 1" : `quedan ${libres}`}</span></p>

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#f87171]/30 bg-[#f87171]/[0.08] px-4 py-3 text-[13px] leading-relaxed text-[#fecaca]">
        <AlertTriangle size={17} className="mt-0.5 shrink-0" />
        <span><strong className="text-white">Una vez guardada, la misión NO se puede cambiar ni borrar.</strong> Revisa bien el texto antes de confirmar.</span>
      </div>
      <div className="mt-2.5 flex items-start gap-2.5 rounded-2xl border border-[#34d399]/25 bg-[#34d399]/[0.07] px-4 py-3 text-[13px] leading-relaxed text-[#a7f3d0]">
        <Lightbulb size={17} className="mt-0.5 shrink-0" />
        <span>Si tu misión es de compra, <strong className="text-white">ponla en montos bajos: de $2 a $5</strong>. Así la cumple mucha más gente y ganas por cantidad de personas, que es lo que mejor funciona.</span>
      </div>

      <label className="mt-4 block">
        <span className={etiqueta}>Nombre de la misión</span>
        <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={80} placeholder="Ej.: Compra un sticker en nuestro stand" className={campo} />
      </label>
      <label className="mt-3 block">
        <span className={etiqueta}>¿Qué tiene que hacer la persona?</span>
        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={300} rows={3} placeholder="Ej.: Haz una compra desde $3 en el stand y muestra tu boleto para recibir la EXP." className={`${campo} resize-none`} />
        <span className="mt-1 block text-right text-[11px] text-[#5d5766]">{descripcion.length}/300</span>
      </label>

      {!confirmando ? (
        <button disabled={!listo} onClick={() => setConfirmando(true)} className="mt-3 w-full rounded-full bg-[#a78bfa] py-3.5 text-[15px] font-bold text-[#0b0714] disabled:opacity-40">Guardar misión</button>
      ) : (
        <div className="mt-3 rounded-2xl border border-[#f87171]/40 bg-[#f87171]/[0.1] p-4">
          <p className="text-[14px] font-bold">¿Segura esta misión? No podrás cambiarla.</p>
          <p className="mt-1.5 text-[13.5px] font-semibold text-white">«{nombre.trim()}»</p>
          <p className="mt-0.5 text-[12.5px] text-[#d6cfe0]">{descripcion.trim()}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setConfirmando(false)} className="rounded-full bg-white/[0.08] py-3 text-[14px] font-semibold">Revisar</button>
            <button disabled={crear.isPending} onClick={() => crear.mutate({ nombre: nombre.trim(), descripcion: descripcion.trim(), confirmo: true })} className="flex items-center justify-center gap-2 rounded-full bg-[#e5007d] py-3 text-[14px] font-bold disabled:opacity-50">
              {crear.isPending ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />} Sí, guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ComprarExtra({ max, precio, tope }: { max: number; precio: number; tope: number }) {
  const utils = trpc.useUtils();
  const [abierto, setAbierto] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [metodo, setMetodo] = useState<"pago_movil" | "crypto" | "efectivo">("pago_movil");
  const [referencia, setReferencia] = useState("");
  const [comprobanteUrl, setComprobanteUrl] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const { data: settings } = trpc.settings.getAll.useQuery();
  const tasaLeida = parseFloat((settings as any)?.["bs_rate"] ?? "");
  const tasa = Number.isFinite(tasaLeida) ? tasaLeida : 0;
  const subir = trpc.orders.uploadReceiptPublic.useMutation();
  const comprar = trpc.standTienda.comprarExtra.useMutation({
    onSuccess: () => { toast.success("Pago reportado. Te avisamos al confirmarlo."); setAbierto(false); setReferencia(""); setComprobanteUrl(""); void utils.standTienda.miPanel.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const n = Math.min(cantidad, max);
  const monto = n * precio;
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

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="flex w-full items-center gap-4 rounded-3xl border border-[#fbbf24]/30 bg-[#fbbf24]/[0.07] p-4 text-left active:opacity-80">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fbbf24]/20 text-[#fbbf24]"><ShoppingBag size={22} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">Comprar misiones extra</span>
          <span className="block text-[12.5px] text-[#bfb8c9]">${precio} cada una · puedes sumar {max} más (tope de {tope})</span>
        </span>
      </button>
    );
  }

  const Dato = ({ k, v }: { k: string; v: string }) => (
    <button type="button" onClick={() => copiar(v)} className="flex w-full items-center justify-between gap-3 py-1 text-left">
      <span className="text-[#9a93a6]">{k}</span><span className="font-semibold text-white">{v}</span>
    </button>
  );

  return (
    <div className="rounded-3xl border border-[#fbbf24]/30 bg-white/[0.03] p-5">
      <p className="flex items-center gap-2 text-[16px] font-bold"><Swords size={18} className="text-[#fbbf24]" /> Misiones extra · ${precio} c/u</p>
      <p className={`${etiqueta} mt-4`}>¿Cuántas?</p>
      <div className="flex gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map(i => (
          <button key={i} onClick={() => setCantidad(i)} className="h-12 flex-1 rounded-xl border text-[16px] font-bold"
            style={n === i ? { borderColor: "#fbbf24", background: "rgba(251,191,36,0.14)" } : { borderColor: "rgba(255,255,255,0.12)" }}>{i}</button>
        ))}
      </div>

      <p className={`${etiqueta} mt-5`}>Paga ${monto} por:</p>
      <div className="grid grid-cols-3 gap-2">
        {([["pago_movil", "Pago Móvil"], ["crypto", "Binance Pay"], ["efectivo", "Efectivo"]] as const).map(([id, t]) => (
          <button key={id} type="button" onClick={() => setMetodo(id)} className="rounded-xl border px-2 py-3 text-[13.5px] font-bold"
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
          </>
        ) : metodo === "efectivo" ? (
          <p className="text-[13px] text-[#bfb8c9]"><strong className="text-white">Efectivo: ${monto}.</strong> Entrégalo a un agente de Isekai World. Las misiones se activan cuando confirmemos que lo recibimos.</p>
        ) : (
          <>
            <Dato k="Binance Pay ID" v={BINANCE_PAY_ID} />
            <Dato k="Monto" v={`${monto} USDT`} />
          </>
        )}
      </div>

      <label className="mt-4 block">
        <span className={etiqueta}>{metodo === "efectivo" ? "¿A quién le entregaste el efectivo?" : "Número de referencia *"}</span>
        <input value={referencia} onChange={e => setReferencia(e.target.value)} maxLength={120} className={campo} />
      </label>
      <label className="mt-3 block">
        <span className={etiqueta}>Comprobante (opcional)</span>
        <span className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-3 py-3 text-[14px] text-[#cfc9d8]">
          {subiendo ? <Loader2 size={16} className="animate-spin" /> : comprobanteUrl ? <Check size={16} className="text-[#4ade80]" /> : <Upload size={16} />}
          {comprobanteUrl ? "Comprobante cargado" : "Subir captura"}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => void archivo(e.target.files?.[0] ?? null)} />
        </span>
      </label>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
        <button onClick={() => setAbierto(false)} className="rounded-full bg-white/[0.08] px-5 py-3.5 text-[14px] font-semibold">Cancelar</button>
        <button
          disabled={comprar.isPending || subiendo || (metodo !== "efectivo" && referencia.trim().length < 3)}
          onClick={() => comprar.mutate({ cantidad: n, metodo, referencia: referencia.trim() || "Efectivo por entregar", comprobanteUrl: comprobanteUrl || undefined })}
          className="flex items-center justify-center gap-2 rounded-full bg-[#fbbf24] py-3.5 text-[14.5px] font-bold text-[#150f02] disabled:opacity-40"
        >
          {comprar.isPending && <Loader2 size={16} className="animate-spin" />} Reportar pago de ${monto}
        </button>
      </div>
      <p className="mt-3 text-center text-[12px] text-[#8d8697]">Las misiones se activan cuando confirmemos tu pago.</p>
    </div>
  );
}
