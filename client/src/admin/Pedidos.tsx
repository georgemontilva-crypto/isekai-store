import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PAYMENT_METHOD_LABELS } from "@shared/payment";
import { Panel, Badge, Confirmar, num, dinero, fecha } from "./ui";

/**
 * Pedidos: una sola bandeja para el pedido y su pago.
 *
 * Antes había que ir a «Pedidos» para mover el pedido y a «Pagos» para
 * aprobar el comprobante. Aquí cada pedido dice cuál es su siguiente paso
 * (revisar el pago, empezar a preparar, enviar…) y se hace desde su ficha.
 */
type Pedido = {
  id: number; orderNumber: string; customerName: string; customerEmail: string; customerPhone: string | null;
  shippingAddress: { street?: string; city?: string; state?: string; country?: string; zip?: string } | null;
  total: string; status: string; trackingNumber: string | null; trackingCarrier: string | null; notes: string | null;
  paymentMethod: string | null; paymentStatus: string; amountPaid: string | null; paymentReference: string | null;
  receiptUrl: string | null; receiptHolder: string | null; referralCode: string | null; giftCardCode: string | null; giftCardDiscount: string | null;
  archived: boolean; createdAt: string | Date;
  articulos?: { nombre: string; variante: string | null; cantidad: number }[];
};
type Abono = { id: number; orderId: number; amount: string; method: string | null; reference: string | null; holder: string | null; receiptUrl: string | null; status?: string; source: string; createdAt: string | Date };

const ESTADO: Record<string, string> = {
  pending: "Recibido", preparing: "Preparando", printing: "Imprimiendo", post_printing: "Acabado",
  packed: "Empacado", shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado",
};
const PAGO: Record<string, { texto: string; tono: "plain" | "ok" | "warn" | "hot" | "off" }> = {
  pending: { texto: "Sin pagar", tono: "plain" }, verifying: { texto: "Pago por revisar", tono: "hot" },
  approved: { texto: "Pagado", tono: "ok" }, partial: { texto: "Abonado", tono: "warn" }, rejected: { texto: "Pago rechazado", tono: "off" },
};
/** El paso que sigue en la preparación de un pedido ya pagado o abonado */
const SIGUIENTE: Record<string, { a: string; texto: string }> = {
  pending: { a: "preparing", texto: "Empezar a preparar" },
  preparing: { a: "printing", texto: "Pasar a impresión" },
  printing: { a: "post_printing", texto: "Pasar a acabado" },
  post_printing: { a: "packed", texto: "Marcar empacado" },
  packed: { a: "shipped", texto: "Marcar enviado" },
  shipped: { a: "delivered", texto: "Marcar entregado" },
};
/** Lo que pidió el cliente, en una línea: «2 × Figura Jin-Woo (pintada) y 1 más» */
function loQuePidio(p: Pedido): string {
  const a = p.articulos ?? [];
  if (a.length === 0) return "";
  const uno = (x: (typeof a)[number]) => `${x.cantidad > 1 ? `${x.cantidad} × ` : ""}${x.nombre}${x.variante ? ` (${x.variante})` : ""}`;
  if (a.length === 1) return uno(a[0]);
  if (a.length === 2) return `${uno(a[0])} y ${uno(a[1])}`;
  return `${uno(a[0])}, ${uno(a[1])} y ${a.length - 2} más`;
}
const esKit = (p: Pedido) => p.orderNumber.startsWith("IW-KIT-");
const pagado = (p: Pedido) => p.paymentStatus === "approved" || p.paymentStatus === "partial";

type Filtro = "atender" | "espera" | "proceso" | "enviados" | "entregados" | "cancelados" | "kits" | "archivados";
const FILTROS: { id: Filtro; texto: string }[] = [
  { id: "atender", texto: "Por atender" }, { id: "espera", texto: "Esperan pago" }, { id: "proceso", texto: "En proceso" },
  { id: "enviados", texto: "Enviados" }, { id: "entregados", texto: "Entregados" }, { id: "cancelados", texto: "Cancelados" },
  { id: "kits", texto: "Kits" }, { id: "archivados", texto: "Archivados" },
];
const VACIO: Record<Filtro, string> = {
  atender: "Nada espera por ti. Los pagos por revisar y los pedidos pagados sin empezar aparecen aquí.",
  espera: "Ningún pedido está esperando el pago del cliente.", proceso: "No hay pedidos en preparación.",
  enviados: "No hay pedidos en camino.", entregados: "Todavía no hay pedidos entregados sin archivar.",
  cancelados: "No hay pedidos cancelados.", kits: "No hay kits de cosplayer activos.", archivados: "No hay pedidos archivados.",
};

function useRefrescar() {
  const utils = trpc.useUtils();
  return () => { void utils.orders.invalidate(); };
}

function Comprobante({ url }: { url: string | null }) {
  if (!url) return <span className="pa-tenue">Sin comprobante</span>;
  return <a className="ped__comprobante" href={url} target="_blank" rel="noreferrer"><img src={url} alt="Comprobante de pago" loading="lazy" /><span>Abrir comprobante</span></a>;
}

function Ficha({ pedido, abonosPendientes }: { pedido: Pedido; abonosPendientes: Abono[] }) {
  const refrescar = useRefrescar();
  const detalle = trpc.orders.adminById.useQuery({ id: pedido.id });
  const historial = trpc.orders.abonosDe.useQuery({ orderId: pedido.id });
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const hecho = (texto: string) => () => { toast.success(texto); refrescar(); };
  const estado = trpc.orders.updateStatus.useMutation({ onSuccess: hecho("Pedido actualizado"), onError: alFallar });
  const verificar = trpc.orders.verifyPayment.useMutation({ onSuccess: refrescar, onError: alFallar });
  const aprobarAbono = trpc.orders.aprobarAbono.useMutation({ onSuccess: hecho("Abono aprobado"), onError: alFallar });
  const rechazarAbono = trpc.orders.rechazarAbono.useMutation({ onSuccess: hecho("Abono rechazado"), onError: alFallar });
  const registrar = trpc.orders.registrarAbono.useMutation({ onSuccess: () => { setMonto(""); setNota(""); hecho("Abono registrado")(); }, onError: alFallar });
  const marcarPago = trpc.orders.updatePaymentStatus.useMutation({ onSuccess: hecho("Pago actualizado"), onError: alFallar });
  const archivar = trpc.orders.setArchived.useMutation({ onSuccess: hecho(pedido.archived ? "Pedido de vuelta en la bandeja" : "Pedido archivado"), onError: alFallar });
  const borrar = trpc.orders.delete.useMutation({ onSuccess: hecho("Pedido eliminado"), onError: alFallar });

  const [guia, setGuia] = useState(pedido.trackingNumber ?? "");
  const [transporte, setTransporte] = useState(pedido.trackingCarrier ?? "");
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");

  const total = num(pedido.total), abonado = num(pedido.amountPaid);
  const saldo = Math.max(0, total - abonado);
  const paso = SIGUIENTE[pedido.status];
  const ocupado = estado.isPending || verificar.isPending;
  // Según la base, la dirección llega como objeto o como texto JSON
  const d = (() => { const v = pedido.shippingAddress as unknown; if (typeof v !== "string") return pedido.shippingAddress; try { return JSON.parse(v) as Pedido["shippingAddress"]; } catch { return null; } })();
  const direccion = d ? [d.street, d.city, d.state, d.zip, d.country].filter(Boolean).join(", ") : "";
  const tel = (pedido.customerPhone ?? "").replace(/\D/g, "");
  const items = ((detalle.data as any)?.items ?? []) as { id: number; productName: string; variantName: string | null; price: string; quantity: number; imageUrl: string | null }[];
  const abonos = ((historial.data ?? []) as Abono[]).filter(a => a.status !== "pending");
  const avanzar = (a: string) => estado.mutate({ id: pedido.id, status: a as any, ...(a === "shipped" ? { trackingNumber: guia.trim() || undefined, trackingCarrier: transporte.trim() || undefined } : {}) });
  const abonar = (e: FormEvent) => {
    e.preventDefault();
    const m = parseFloat(monto.replace(",", "."));
    if (!(m > 0)) { toast.error("Escribe el monto del abono"); return; }
    registrar.mutate({ orderId: pedido.id, monto: m, nota: nota.trim() || undefined });
  };

  return (
    <div className="ped__ficha">
      {/* ── Lo que toca hacer ahora ── */}
      {pedido.paymentStatus === "verifying" && (
        <div className="ped__paso">
          <h3>Revisa el pago</h3>
          <p>El cliente reportó {dinero(total)} por {PAYMENT_METHOD_LABELS[pedido.paymentMethod ?? ""] ?? pedido.paymentMethod ?? "un método sin indicar"}
            {pedido.paymentReference ? <>, referencia <strong>{pedido.paymentReference}</strong></> : null}{pedido.receiptHolder ? <>, a nombre de <strong>{pedido.receiptHolder}</strong></> : null}.</p>
          <Comprobante url={pedido.receiptUrl} />
          <div className="eq-acciones">
            <button className="btn btn--small" type="button" disabled={ocupado} onClick={() => verificar.mutate({ orderId: pedido.id, approved: true }, { onSuccess: () => toast.success("Pago aprobado") })}>Aprobar pago</button>
            <button className="btn btn--ghost btn--small" type="button" disabled={ocupado} onClick={() => verificar.mutate({ orderId: pedido.id, approved: false }, { onSuccess: () => toast.success("Pago rechazado") })}>Rechazar</button>
          </div>
        </div>
      )}
      {abonosPendientes.map(a => (
        <div className="ped__paso" key={a.id}>
          <h3>Revisa un abono de {dinero(a.amount)}</h3>
          <p>{PAYMENT_METHOD_LABELS[a.method ?? ""] ?? a.method ?? "Método sin indicar"}{a.reference ? <>, referencia <strong>{a.reference}</strong></> : null}{a.holder ? <>, a nombre de <strong>{a.holder}</strong></> : null}. Enviado el {fecha(a.createdAt)}.</p>
          <Comprobante url={a.receiptUrl} />
          <div className="eq-acciones">
            <button className="btn btn--small" type="button" disabled={aprobarAbono.isPending} onClick={() => aprobarAbono.mutate({ id: a.id })}>Aprobar abono</button>
            <button className="btn btn--ghost btn--small" type="button" disabled={rechazarAbono.isPending} onClick={() => rechazarAbono.mutate({ id: a.id })}>Rechazar</button>
          </div>
        </div>
      ))}
      {pedido.paymentStatus !== "verifying" && paso && pedido.status !== "cancelled" && (pagado(pedido) || pedido.status !== "pending") && (
        <div className="ped__paso">
          <h3>{paso.texto}</h3>
          {paso.a === "shipped" ? (
            <form className="form form--inline" onSubmit={e => { e.preventDefault(); avanzar("shipped"); }}>
              <label className="field"><span className="field__label">Número de guía</span><input value={guia} onChange={e => setGuia(e.target.value)} placeholder="Opcional" /></label>
              <label className="field"><span className="field__label">Transportista</span><input value={transporte} onChange={e => setTransporte(e.target.value)} placeholder="MRW, Zoom, entrega personal…" /></label>
              <button className="btn btn--small" type="submit" disabled={ocupado}>Marcar enviado</button>
            </form>
          ) : (
            <>
              <p>El pedido está en «{ESTADO[pedido.status]}». Al avanzar, el cliente recibe el aviso.</p>
              <div className="eq-acciones"><button className="btn btn--small" type="button" disabled={ocupado} onClick={() => avanzar(paso.a)}>{paso.texto}</button></div>
            </>
          )}
        </div>
      )}
      {pedido.status === "pending" && !pagado(pedido) && pedido.paymentStatus !== "verifying" && abonosPendientes.length === 0 && (
        <p className="notice notice--info">Esperando el pago del cliente. Si te pagó por otra vía, registra el abono más abajo.</p>
      )}

      {/* ── Datos ── */}
      <dl className="ped__datos">
        <div><dt>Cliente</dt><dd>{pedido.customerName}<small>{pedido.customerEmail}</small>
          {tel && <small><a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer">WhatsApp {pedido.customerPhone}</a></small>}</dd></div>
        <div><dt>Envío</dt><dd>{direccion || <span className="pa-tenue">Sin dirección</span>}
          {pedido.trackingNumber && <small>Guía {pedido.trackingNumber}{pedido.trackingCarrier ? ` · ${pedido.trackingCarrier}` : ""}</small>}</dd></div>
        <div><dt>Pago</dt><dd>{dinero(abonado)} de {dinero(total)}{saldo > 0 && abonado > 0 ? <small>Falta {dinero(saldo)}</small> : null}
          <small>{PAYMENT_METHOD_LABELS[pedido.paymentMethod ?? ""] ?? pedido.paymentMethod ?? "Método sin indicar"}{pedido.paymentReference ? ` · ref. ${pedido.paymentReference}` : ""}</small>
          {pedido.referralCode && <small>Código de referido {pedido.referralCode}</small>}
          {pedido.giftCardCode && <small>Tarjeta de regalo {pedido.giftCardCode} (−{dinero(pedido.giftCardDiscount)})</small>}</dd></div>
        {pedido.notes && <div><dt>Nota del pedido</dt><dd>{pedido.notes}</dd></div>}
      </dl>

      <h3 className="ped__sub">Artículos</h3>
      {detalle.isLoading ? <p className="empty">Cargando…</p> : items.length === 0 ? <p className="empty">Este pedido no tiene artículos.</p> : (
        <ul className="rows ped__items">
          {items.map(i => (
            <li key={i.id}>
              <span className="ped__item">{i.imageUrl && <img src={i.imageUrl} alt="" loading="lazy" />}
                <span className="rows__main"><strong>{i.productName}</strong><small>{i.variantName ? `${i.variantName} · ` : ""}{i.quantity} × {dinero(i.price)}</small></span></span>
              <span className="rows__side">{dinero(num(i.price) * i.quantity)}</span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="ped__sub">Abonos</h3>
      {abonos.length > 0 && (
        <ul className="rows">
          {abonos.map(a => (
            <li key={a.id}>
              <span className="rows__main"><strong>{dinero(a.amount)}{a.status === "rejected" ? " · rechazado" : ""}</strong>
                <small>{fecha(a.createdAt)} · {a.source === "admin" ? "registrado por ti" : "enviado por el cliente"}{a.reference ? ` · ${a.reference}` : ""}</small></span>
              {a.receiptUrl && <a className="pa-accion" href={a.receiptUrl} target="_blank" rel="noreferrer">Comprobante</a>}
            </li>
          ))}
        </ul>
      )}
      {saldo > 0 && pedido.status !== "cancelled" ? (
        <form className="form form--inline" onSubmit={abonar}>
          <label className="field"><span className="field__label">Registrar un abono (USD)</span><input value={monto} onChange={e => setMonto(e.target.value)} inputMode="decimal" placeholder={saldo.toFixed(2)} /></label>
          <label className="field"><span className="field__label">Nota</span><input value={nota} onChange={e => setNota(e.target.value)} placeholder="Efectivo, Zelle… (opcional)" maxLength={200} /></label>
          <button className="btn btn--ghost btn--small" type="submit" disabled={registrar.isPending}>Registrar abono</button>
        </form>
      ) : abonos.length === 0 ? <p className="empty">Sin abonos.</p> : null}

      {/* ── Lo de vez en cuando ── */}
      <div className="ped__otras">
        <label className="pa-select">Cambiar estado
          <select value={pedido.status} disabled={ocupado} onChange={e => avanzar(e.target.value)}>
            {Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="pa-select">Marcar el pago como
          <select value={["pending", "partial", "approved"].includes(pedido.paymentStatus) ? pedido.paymentStatus : ""} disabled={marcarPago.isPending}
            onChange={e => e.target.value && marcarPago.mutate({ orderId: pedido.id, paymentStatus: e.target.value as "pending" | "partial" | "approved" })}>
            <option value="" disabled>{PAGO[pedido.paymentStatus]?.texto ?? "—"}</option>
            <option value="pending">Sin pagar</option><option value="partial">Abonado</option><option value="approved">Pagado</option>
          </select>
        </label>
        <button type="button" className="pa-accion" disabled={archivar.isPending} onClick={() => archivar.mutate({ id: pedido.id, archived: !pedido.archived })}>{pedido.archived ? "Devolver a la bandeja" : "Archivar"}</button>
        <Confirmar texto="Eliminar" pregunta="¿Eliminar este pedido para siempre?" si="Sí, eliminar" disabled={borrar.isPending} onSi={() => borrar.mutate({ id: pedido.id })} />
      </div>
    </div>
  );
}

export default function Pedidos({ buscar: buscarInicial = "" }: { buscar?: string }) {
  const [filtro, setFiltro] = useState<Filtro>("atender");
  const [buscar, setBuscar] = useState(buscarInicial);
  const [abierto, setAbierto] = useState<number | null>(null);
  const refrescar = useRefrescar();

  const activos = trpc.orders.adminList.useQuery({ archived: false, limit: 300 }, { refetchInterval: 30_000 });
  const archivados = trpc.orders.adminList.useQuery({ archived: true, limit: 200 }, { enabled: filtro === "archivados" || Boolean(buscar.trim()) });
  const abonos = trpc.orders.abonosPendientes.useQuery(undefined, { refetchInterval: 30_000 });
  const archivarViejos = trpc.orders.archiveOld.useMutation({ onSuccess: r => { toast.success(r.count ? `${r.count} pedidos archivados` : "No había pedidos que archivar"); refrescar(); }, onError: e => toast.error(e.message) });

  const abonosPorPedido = useMemo(() => {
    const m = new Map<number, Abono[]>();
    for (const a of (abonos.data ?? []) as Abono[]) m.set(a.orderId, [...(m.get(a.orderId) ?? []), a]);
    return m;
  }, [abonos.data]);

  const todos = ((activos.data?.items ?? []) as unknown as Pedido[]);
  const grupo = (p: Pedido): Filtro => {
    if (p.archived) return "archivados";
    if (esKit(p)) return "kits";
    if (p.status === "cancelled") return "cancelados";
    if (p.paymentStatus === "verifying" || abonosPorPedido.has(p.id) || (p.status === "pending" && pagado(p))) return "atender";
    if (p.status === "pending") return "espera";
    if (p.status === "shipped") return "enviados";
    if (p.status === "delivered") return "entregados";
    return "proceso";
  };
  const cuenta = useMemo(() => {
    const c = {} as Record<Filtro, number>;
    for (const p of todos) c[grupo(p)] = (c[grupo(p)] ?? 0) + 1;
    return c;
  }, [todos, abonosPorPedido]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = buscar.trim().toLowerCase();
  const visibles = useMemo(() => {
    if (q) {
      const universo = [...todos, ...((archivados.data?.items ?? []) as unknown as Pedido[])];
      return universo.filter(p => [p.orderNumber, p.customerName, p.customerEmail, p.customerPhone ?? "", p.paymentReference ?? "", ...(p.articulos ?? []).map(a => a.nombre)].some(v => v.toLowerCase().includes(q)));
    }
    if (filtro === "archivados") return (archivados.data?.items ?? []) as unknown as Pedido[];
    // El que está abierto se queda a la vista aunque cambie de bandeja (al aprobar su pago, por ejemplo): así se da el paso siguiente sin buscarlo
    return todos.filter(p => grupo(p) === filtro || p.id === abierto);
  }, [q, filtro, todos, archivados.data, abonosPorPedido, abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si se llega buscando un pedido concreto (desde un aviso), se abre su ficha
  useEffect(() => { if (buscarInicial && visibles.length === 1) setAbierto(visibles[0].id); }, [buscarInicial, visibles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Panel title="Pedidos" lead="Cada pedido muestra lo que le falta. Tócalo para ver su ficha y dar el siguiente paso.">
      <label className="field ped__buscar">
        <span className="field__label">Buscar</span>
        <input value={buscar} onChange={e => setBuscar(e.target.value)} type="search" placeholder="Cliente, producto, número o referencia" />
      </label>
      {!q && (
        <div className="tabs" role="tablist" aria-label="Pedidos por estado">
          {FILTROS.map(f => (
            <button key={f.id} type="button" role="tab" aria-selected={filtro === f.id} className={filtro === f.id ? "is-active" : undefined} onClick={() => { setFiltro(f.id); setAbierto(null); }}>
              {f.texto}{f.id !== "archivados" && cuenta[f.id] ? <span className={`tabs__n${f.id === "atender" ? " tabs__n--hot" : ""}`}>{cuenta[f.id]}</span> : null}
            </button>
          ))}
        </div>
      )}
      {activos.isLoading ? <p className="empty">Cargando pedidos…</p>
        : activos.error ? <p className="notice" role="alert">No pudimos cargar los pedidos. {activos.error.message}</p>
        : visibles.length === 0 ? <p className="empty">{q ? `Ningún pedido coincide con «${buscar.trim()}».` : VACIO[filtro]}</p>
        : (
          <ul className="ped">
            {visibles.map(p => {
              const pend = abonosPorPedido.get(p.id) ?? [];
              const pago = pend.length ? { texto: "Abono por revisar", tono: "hot" as const } : PAGO[p.paymentStatus] ?? { texto: p.paymentStatus, tono: "plain" as const };
              const esteAbierto = abierto === p.id;
              return (
                <li key={p.id} className={esteAbierto ? "is-open" : undefined}>
                  <button type="button" className="ped__fila" aria-expanded={esteAbierto} onClick={() => setAbierto(esteAbierto ? null : p.id)}>
                    <span className="ped__quien"><strong>{p.customerName}</strong><span className="rows__side">{dinero(p.total)}</span></span>
                    {loQuePidio(p) && <span className="ped__pidio">{loQuePidio(p)}</span>}
                    <span className="ped__pie-fila"><small>{p.orderNumber} · {fecha(p.createdAt)}</small>
                      <span className="ped__insignias"><Badge tone={pago.tono}>{pago.texto}</Badge><Badge tone={p.status === "cancelled" ? "off" : "plain"}>{ESTADO[p.status] ?? p.status}</Badge></span></span>
                  </button>
                  {esteAbierto && <Ficha pedido={p} abonosPendientes={pend} />}
                </li>
              );
            })}
          </ul>
        )}
      {!q && filtro === "entregados" && (cuenta.entregados ?? 0) > 0 && (
        <p className="ped__pie"><Confirmar texto="Archivar los entregados hace más de 30 días" pregunta="¿Archivar los entregados y cancelados con más de 30 días?" si="Sí, archivar" disabled={archivarViejos.isPending} onSi={() => archivarViejos.mutate({ days: 30 })} /></p>
      )}
    </Panel>
  );
}
