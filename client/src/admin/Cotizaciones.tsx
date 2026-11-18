import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Panel, Badge, Confirmar, num, dinero, fecha, paraWhatsApp } from "./ui";
import { aPrecio, useSubirImagen } from "./Tienda";

/**
 * Cotizaciones de piezas a medida.
 *
 * El recorrido es corto: se arma la cotización, se le manda el enlace al
 * cliente (al copiarlo o abrir WhatsApp queda marcada como enviada) y el
 * cliente paga desde ese enlace, lo que crea su pedido.
 */
type Linea = { concepto: string; cantidad: number; precio: string };
type Cotizacion = {
  id: number; token: string; quoteNumber: string; customerName: string | null; customerEmail: string | null; customerPhone: string | null;
  title: string; description: string | null; items: unknown; referenceImages: unknown; subtotal: string; total: string; notes: string | null;
  depositAmount: string | null; couponCode: string | null; couponPercent: number | null; status: string; orderId: number | null; expiresAt: string | Date | null; createdAt: string | Date;
};
const lista = <T,>(v: unknown): T[] => { if (Array.isArray(v)) return v as T[]; if (typeof v === "string") { try { const j = JSON.parse(v); return Array.isArray(j) ? j : []; } catch { return []; } } return []; };

const ESTADO: Record<string, { texto: string; tono: "plain" | "ok" | "warn" | "hot" | "off" }> = {
  draft: { texto: "Borrador", tono: "warn" }, sent: { texto: "Enviada", tono: "plain" }, partial: { texto: "Abonada", tono: "hot" },
  paid: { texto: "Pagada", tono: "ok" }, cancelled: { texto: "Cancelada", tono: "off" }, expired: { texto: "Vencida", tono: "off" },
};
type Filtro = "abiertas" | "borradores" | "pagadas" | "cerradas";
const FILTROS: { id: Filtro; texto: string; si: (c: Cotizacion) => boolean }[] = [
  { id: "abiertas", texto: "Por cobrar", si: c => c.status === "sent" || c.status === "partial" },
  { id: "borradores", texto: "Borradores", si: c => c.status === "draft" },
  { id: "pagadas", texto: "Pagadas", si: c => c.status === "paid" },
  { id: "cerradas", texto: "Canceladas y vencidas", si: c => c.status === "cancelled" || c.status === "expired" },
];
const enlace = (c: Cotizacion) => `https://www.isekaiworld.co/cotizacion/${c.token}`;

// ── Formulario (crear y corregir) ────────────────────────────────────────────
type Borrador = { customerName: string; customerPhone: string; customerEmail: string; title: string; description: string; lineas: { concepto: string; cantidad: string; precio: string }[]; abono: string; dias: string; notes: string };
const VACIO: Borrador = { customerName: "", customerPhone: "", customerEmail: "", title: "", description: "", lineas: [{ concepto: "", cantidad: "1", precio: "" }], abono: "", dias: "", notes: "" };

function Formulario({ inicial, cotizacion, alTerminar }: { inicial: Borrador; cotizacion?: Cotizacion; alTerminar: (id?: number) => void }) {
  const utils = trpc.useUtils();
  const [b, setB] = useState<Borrador>(inicial);
  const [fotos, setFotos] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const subir = useSubirImagen();
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const crear = trpc.quotes.create.useMutation({ onError: alFallar });
  const editar = trpc.quotes.edit.useMutation({ onError: alFallar });

  const lineas = b.lineas.filter(l => l.concepto.trim() || l.precio.trim());
  const total = lineas.reduce((s, l) => s + (parseFloat(aPrecio(l.precio) ?? "0") || 0) * (parseInt(l.cantidad, 10) || 0), 0);
  const cambia = (i: number, dato: Partial<Borrador["lineas"][number]>) => setB({ ...b, lineas: b.lineas.map((l, j) => (j === i ? { ...l, ...dato } : l)) });
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!b.title.trim()) { toast.error("Ponle un título a la cotización"); return; }
    if (lineas.length === 0) { toast.error("Agrega al menos una línea con su precio"); return; }
    const items: Linea[] = [];
    for (const l of lineas) {
      const p = aPrecio(l.precio), n = parseInt(l.cantidad, 10);
      if (!l.concepto.trim() || p === null || !(n >= 1)) { toast.error(`Revisa la línea «${l.concepto.trim() || "sin nombre"}»: concepto, cantidad y precio (12 o 12,50)`); return; }
      items.push({ concepto: l.concepto.trim(), cantidad: n, precio: p });
    }
    const abono = b.abono.trim() ? aPrecio(b.abono) : "";
    if (abono === null) { toast.error("El abono no es un monto válido"); return; }
    if (abono && parseFloat(abono) > total) { toast.error("El abono no puede ser mayor que el total"); return; }
    if (b.customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.customerEmail.trim())) { toast.error("Ese correo no parece válido"); return; }
    const dias = parseInt(b.dias, 10);
    const comun = {
      ...(b.customerName.trim() ? { customerName: b.customerName.trim() } : {}), ...(b.customerPhone.trim() ? { customerPhone: b.customerPhone.trim() } : {}),
      ...(b.customerEmail.trim() ? { customerEmail: b.customerEmail.trim().toLowerCase() } : {}),
      title: b.title.trim(), description: b.description, items, notes: b.notes, ...(dias >= 1 ? { expiresInDays: Math.min(dias, 365) } : {}),
    };
    if (cotizacion) {
      await editar.mutateAsync({ id: cotizacion.id, ...comun, depositAmount: abono || "" });
      toast.success("Cotización corregida. El enlace del cliente sigue siendo el mismo.");
      await utils.quotes.invalidate(); alTerminar(cotizacion.id);
    } else {
      const r = await crear.mutateAsync({ ...comun, ...(abono ? { depositAmount: abono } : {}), ...(fotos.length ? { referenceImages: fotos } : {}) });
      toast.success("Cotización creada");
      await utils.quotes.invalidate(); alTerminar((r as { id?: number } | undefined)?.id);
    }
  };
  const alElegir = async (archivos: FileList | null) => {
    const a = Array.from(archivos ?? []).slice(0, 10 - fotos.length);
    if (!a.length) return;
    setSubiendo(true);
    try { const nuevas: string[] = []; for (const f of a) nuevas.push((await subir(f)).url); setFotos(x => [...x, ...nuevas]); }
    catch (e: any) { toast.error(e?.message ?? "No se pudo subir la imagen"); } finally { setSubiendo(false); }
  };
  const ocupado = crear.isPending || editar.isPending;

  return (
    <form className="form cot__form" onSubmit={e => void enviar(e).catch(() => {})}>
      <label className="field"><span className="field__label">Qué se cotiza</span><input value={b.title} onChange={e => setB({ ...b, title: e.target.value })} placeholder="Casco de Beru a escala real" maxLength={300} required /></label>
      <div className="form form--inline">
        <label className="field"><span className="field__label">Cliente</span><input value={b.customerName} onChange={e => setB({ ...b, customerName: e.target.value })} placeholder="Nombre" maxLength={200} /></label>
        <label className="field"><span className="field__label">WhatsApp</span><input value={b.customerPhone} onChange={e => setB({ ...b, customerPhone: e.target.value })} inputMode="tel" placeholder="0414 555 1234" maxLength={50} /></label>
        <label className="field"><span className="field__label">Correo</span><input value={b.customerEmail} onChange={e => setB({ ...b, customerEmail: e.target.value })} type="email" placeholder="Opcional" maxLength={320} /></label>
      </div>
      <label className="field"><span className="field__label">Descripción</span><textarea value={b.description} onChange={e => setB({ ...b, description: e.target.value })} rows={3} maxLength={5000} placeholder="Medidas, materiales, acabado, tiempo de entrega…" /></label>

      <fieldset className="cot__lineas">
        <legend className="field__label">Lo que se cobra</legend>
        {b.lineas.map((l, i) => (
          <div className="cot__linea" key={i}>
            <label className="field"><span className="field__label">Concepto</span><input value={l.concepto} onChange={e => cambia(i, { concepto: e.target.value })} placeholder="Impresión y pintura" maxLength={300} /></label>
            <label className="field"><span className="field__label">Cant.</span><input value={l.cantidad} onChange={e => cambia(i, { cantidad: e.target.value })} inputMode="numeric" /></label>
            <label className="field"><span className="field__label">Precio c/u</span><input value={l.precio} onChange={e => cambia(i, { precio: e.target.value })} inputMode="decimal" placeholder="0,00" /></label>
            {b.lineas.length > 1 && <button type="button" className="pa-accion" onClick={() => setB({ ...b, lineas: b.lineas.filter((_, j) => j !== i) })}>Quitar</button>}
          </div>
        ))}
        <div className="cot__total"><button type="button" className="pa-accion" disabled={b.lineas.length >= 50} onClick={() => setB({ ...b, lineas: [...b.lineas, { concepto: "", cantidad: "1", precio: "" }] })}>Agregar otra línea</button><span>Total <strong>{dinero(total)}</strong></span></div>
      </fieldset>

      <div className="form form--inline">
        <label className="field"><span className="field__label">Abono para empezar (USD)</span><input value={b.abono} onChange={e => setB({ ...b, abono: e.target.value })} inputMode="decimal" placeholder="Vacío: se cobra todo" /></label>
        <label className="field"><span className="field__label">Vence en (días)</span><input value={b.dias} onChange={e => setB({ ...b, dias: e.target.value })} inputMode="numeric" placeholder={cotizacion ? "Sin cambiar" : "Opcional"} /></label>
      </div>
      <label className="field"><span className="field__label">Nota para el cliente</span><textarea value={b.notes} onChange={e => setB({ ...b, notes: e.target.value })} rows={2} maxLength={2000} /></label>
      {!cotizacion && (
        <div className="cot__fotos">
          {fotos.map(u => <span key={u} className="cot__foto"><img src={u} alt="" /><button type="button" className="pa-accion" onClick={() => setFotos(fotos.filter(x => x !== u))}>Quitar</button></span>)}
          <input id="cot-fotos" type="file" accept="image/*" multiple hidden onChange={e => { void alElegir(e.target.files); e.target.value = ""; }} />
          {fotos.length < 10 && <label htmlFor="cot-fotos" className={`btn btn--ghost btn--small${subiendo ? " is-off" : ""}`}>{subiendo ? "Subiendo…" : "Agregar imágenes de referencia"}</label>}
        </div>
      )}
      <div className="eq-acciones">
        <button className="btn btn--small" type="submit" disabled={ocupado || subiendo}>{ocupado ? "Guardando…" : cotizacion ? "Guardar corrección" : "Crear cotización"}</button>
        <button type="button" className="pa-accion" onClick={() => alTerminar()}>Cancelar</button>
      </div>
    </form>
  );
}

// ── Ficha ────────────────────────────────────────────────────────────────────
function Ficha({ c, verPedidos }: { c: Cotizacion; verPedidos: () => void }) {
  const utils = trpc.useUtils();
  const refrescar = () => { void utils.quotes.invalidate(); };
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const estado = trpc.quotes.setStatus.useMutation({ onSuccess: refrescar, onError: alFallar });
  const borrar = trpc.quotes.delete.useMutation({ onSuccess: () => { toast.success("Cotización eliminada"); refrescar(); }, onError: alFallar });
  const [corrigiendo, setCorrigiendo] = useState(false);

  const lineas = lista<Linea>(c.items), fotos = lista<string>(c.referenceImages);
  const total = num(c.total), abono = c.depositAmount ? num(c.depositAmount) : 0;
  const tel = paraWhatsApp(c.customerPhone);
  const mensaje = `Hola${c.customerName ? ` ${c.customerName.split(" ")[0]}` : ""}, esta es tu cotización ${c.quoteNumber} de Isekai World: ${enlace(c)}`;
  // Mandar el enlace ES enviarla: no hace falta marcarlo aparte
  const yaEnviada = () => { if (c.status === "draft") estado.mutate({ id: c.id, status: "sent" }); };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(enlace(c)); toast.success(c.status === "draft" ? "Enlace copiado. Quedó como enviada." : "Enlace copiado"); yaEnviada(); }
    catch { toast.error("No se pudo copiar. Mantén pulsado el enlace para copiarlo."); }
  };

  if (corrigiendo) {
    return <div className="ped__ficha"><Formulario cotizacion={c} alTerminar={() => setCorrigiendo(false)} inicial={{
      customerName: c.customerName ?? "", customerPhone: c.customerPhone ?? "", customerEmail: c.customerEmail ?? "", title: c.title, description: c.description ?? "",
      lineas: lineas.length ? lineas.map(l => ({ concepto: l.concepto, cantidad: String(l.cantidad), precio: num(l.precio).toFixed(2) })) : VACIO.lineas,
      abono: c.depositAmount ? num(c.depositAmount).toFixed(2) : "", dias: "", notes: c.notes ?? "" }} /></div>;
  }
  const abierta = c.status === "draft" || c.status === "sent" || c.status === "partial";
  return (
    <div className="ped__ficha">
      {abierta && (
        <div className="ped__paso">
          <h3>{c.status === "draft" ? "Envíasela al cliente" : c.status === "partial" ? "Abonó: falta el saldo" : "Esperando el pago"}</h3>
          <p>{c.status === "draft" ? "El cliente la ve y la paga desde este enlace. Al copiarlo o abrir WhatsApp queda marcada como enviada."
            : c.status === "partial" ? "El cliente ya abonó y su pedido está en Pedidos. El saldo lo paga desde el mismo enlace."
            : "Cuando el cliente pague desde el enlace, se crea su pedido y aparece en Pedidos."}</p>
          <p className="cot__enlace">{enlace(c)}</p>
          <div className="eq-acciones">
            <button className="btn btn--small" type="button" onClick={() => void copiar()}>Copiar enlace</button>
            <a className="btn btn--ghost btn--small" href={`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer" onClick={yaEnviada}>{tel ? "Enviar por WhatsApp" : "Compartir por WhatsApp"}</a>
            {c.orderId && <button type="button" className="pa-accion" onClick={verPedidos}>Ir a Pedidos</button>}
          </div>
        </div>
      )}
      {c.status === "paid" && <p className="notice notice--ok">Pagada. Su pedido está en Pedidos. <button type="button" className="pa-accion" onClick={verPedidos}>Ir a Pedidos</button></p>}

      <dl className="ped__datos">
        <div><dt>Cliente</dt><dd>{c.customerName || <span className="pa-tenue">Sin nombre</span>}{c.customerEmail && <small>{c.customerEmail}</small>}
          {tel && <small><a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer">WhatsApp {c.customerPhone}</a></small>}</dd></div>
        <div><dt>Cobro</dt><dd>{dinero(total)}<small>{abono > 0 && abono < total ? `Empieza con un abono de ${dinero(abono)}` : "Se cobra completo"}</small>
          {c.couponCode && <small>Cupón {c.couponCode}{c.couponPercent ? ` (−${c.couponPercent}%)` : ""}</small>}</dd></div>
        <div><dt>Fechas</dt><dd>Creada el {fecha(c.createdAt)}{c.expiresAt && <small>Vence el {fecha(c.expiresAt)}</small>}</dd></div>
        {c.description && <div className="cot__largo"><dt>Descripción</dt><dd>{c.description}</dd></div>}
        {c.notes && <div className="cot__largo"><dt>Nota para el cliente</dt><dd>{c.notes}</dd></div>}
      </dl>

      <h3 className="ped__sub">Lo que se cobra</h3>
      <ul className="rows ped__items">
        {lineas.map((l, i) => <li key={i}><span className="rows__main"><strong>{l.concepto}</strong><small>{l.cantidad} × {dinero(l.precio)}</small></span><span className="rows__side">{dinero(num(l.precio) * l.cantidad)}</span></li>)}
        <li className="rows__total"><span className="rows__main"><strong>Total</strong></span><span className="rows__side">{dinero(total)}</span></li>
      </ul>
      {fotos.length > 0 && <><h3 className="ped__sub">Imágenes de referencia</h3><div className="cot__fotos">{fotos.map(u => <a key={u} className="cot__foto" href={u} target="_blank" rel="noreferrer"><img src={u} alt="Referencia" loading="lazy" /></a>)}</div></>}

      <div className="ped__otras">
        {c.status !== "paid" && <button type="button" className="pa-accion" onClick={() => setCorrigiendo(true)}>Corregir</button>}
        <label className="pa-select">Cambiar estado
          <select value={c.status === "expired" ? "" : c.status} disabled={estado.isPending} onChange={e => e.target.value && estado.mutate({ id: c.id, status: e.target.value as "draft" | "sent" | "partial" | "paid" | "cancelled" }, { onSuccess: () => toast.success("Estado cambiado") })}>
            {c.status === "expired" && <option value="" disabled>Vencida</option>}
            <option value="draft">Borrador</option><option value="sent">Enviada</option><option value="partial">Abonada</option><option value="paid">Pagada</option><option value="cancelled">Cancelada</option>
          </select></label>
        <Confirmar texto="Eliminar" pregunta="¿Eliminar esta cotización? El enlace del cliente dejará de funcionar." si="Sí, eliminar" disabled={borrar.isPending} onSi={() => borrar.mutate({ id: c.id })} />
      </div>
    </div>
  );
}

export default function Cotizaciones({ verPedidos }: { verPedidos: () => void }) {
  const todas = trpc.quotes.list.useQuery(undefined, { refetchInterval: 60_000 });
  const [filtro, setFiltro] = useState<Filtro>("abiertas");
  const [buscar, setBuscar] = useState("");
  const [abierta, setAbierta] = useState<number | null>(null);
  const [nueva, setNueva] = useState(false);

  const items = (todas.data ?? []) as unknown as Cotizacion[];
  const q = buscar.trim().toLowerCase();
  const visibles = useMemo(() => {
    const si = FILTROS.find(f => f.id === filtro)!.si;
    return items.filter(c => (q ? [c.title, c.quoteNumber, c.customerName ?? "", c.customerPhone ?? "", c.customerEmail ?? ""].some(v => v.toLowerCase().includes(q)) : si(c) || c.id === abierta));
  }, [items, filtro, q, abierta]);

  return (
    <Panel title="Cotizaciones" lead="Piezas a medida. Armas la cotización, le mandas el enlace al cliente y él paga desde ahí."
      action={<button className="btn btn--small" type="button" onClick={() => setNueva(n => !n)}>{nueva ? "Cerrar" : "Nueva cotización"}</button>}>
      {nueva && <div className="tie__nuevo"><Formulario inicial={VACIO} alTerminar={id => { setNueva(false); if (id) { setBuscar(""); setFiltro("abiertas"); setAbierta(id); } }} /></div>}
      <label className="field ped__buscar"><span className="field__label">Buscar</span><input value={buscar} onChange={e => setBuscar(e.target.value)} type="search" placeholder="Título, cliente o número" /></label>
      {!q && (
        <div className="tabs" role="tablist" aria-label="Cotizaciones por estado">
          {FILTROS.map(f => { const n = items.filter(f.si).length; return (
            <button key={f.id} type="button" role="tab" aria-selected={filtro === f.id} className={filtro === f.id ? "is-active" : undefined} onClick={() => { setFiltro(f.id); setAbierta(null); }}>{f.texto}{n && f.id !== "cerradas" && f.id !== "pagadas" ? <span className="tabs__n">{n}</span> : null}</button>); })}
        </div>
      )}
      {todas.isLoading ? <p className="empty">Cargando cotizaciones…</p>
        : todas.error ? <p className="notice" role="alert">No pudimos cargar las cotizaciones. {todas.error.message}</p>
        : visibles.length === 0 ? <p className="empty">{q ? `Ninguna cotización coincide con «${buscar.trim()}».` : filtro === "abiertas" ? "No hay cotizaciones esperando pago." : filtro === "borradores" ? "No hay borradores. Crea una con «Nueva cotización»." : "No hay cotizaciones en esta lista."}</p>
        : (
          <ul className="ped">
            {visibles.map(c => {
              const e = ESTADO[c.status] ?? { texto: c.status, tono: "plain" as const };
              const esta = abierta === c.id;
              return (
                <li key={c.id} className={esta ? "is-open" : undefined}>
                  <button type="button" className="ped__fila" aria-expanded={esta} onClick={() => setAbierta(esta ? null : c.id)}>
                    <span className="ped__quien"><strong>{c.title}</strong><span className="rows__side">{dinero(c.total)}</span></span>
                    <span className="ped__pie-fila"><small>{c.customerName || "Sin cliente"} · {c.quoteNumber} · {fecha(c.createdAt)}</small><span className="ped__insignias"><Badge tone={e.tono}>{e.texto}</Badge></span></span>
                  </button>
                  {esta && <Ficha key={c.id} c={c} verPedidos={verPedidos} />}
                </li>
              );
            })}
          </ul>
        )}
    </Panel>
  );
}
