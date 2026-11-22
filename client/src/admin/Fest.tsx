import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useStandsSocket } from "@/hooks/useStandsSocket";
import TableroFest from "@/components/admin/TableroFest";
import MapaStands, { type MesaPlano } from "@/components/fest/MapaStands";
import { Panel, Badge, Confirmar, dinero, fecha, paraWhatsApp } from "./ui";
import { useSubirImagen } from "./Tienda";
import { useEvento, ComprasWeb, Boletos, Tipos, Equipo, Codigos, Eventos, PuestaAPunto, LevelPass, DiaDelEvento, TiendasConStand, type Tipo, type Orden, type Extra } from "./Boleteria";

/**
 * World Fest: el tablero del evento, la venta de stands y los patrocinantes.
 * (La boletería y el Cosplay Guild son partes aparte, todavía por rehacer.)
 */
const TIPO: Record<string, string> = { mercader: "Mercader", gremio: "Gremio", gran_gremio: "Gran Gremio" };
const PRECIO: Record<string, number> = { mercader: 299, gremio: 399, gran_gremio: 499 };
const METODO: Record<string, string> = { pago_movil: "Pago Móvil", crypto: "Binance Pay", efectivo: "Efectivo", transferencia: "Transferencia", zelle: "Zelle", otro: "Otro" };
const aMonto = (t: string) => { const n = parseFloat(t.trim().replace(",", ".")); return n > 0 ? n : null; };

type Mesa = { id: number; numero: string; tipo: string; estado: string; reservaId: number | null; x: number | null; y: number | null };
type Reserva = { id: number; standId: number; numero: string; tipo: string; negocio: string; contacto: string; email: string; whatsapp: string; rif?: string | null; precio: number; pagado: number; estado: string; modalidad: string; facturaClave?: string | null; facturaNumero?: number | null };
type Pago = { id: number; reservaId: number; monto: number; metodo: string; referencia: string | null; comprobanteUrl: string | null; estado: string; creadoEn: string };

function Contacto({ r }: { r: Reserva }) {
  const tel = paraWhatsApp(r.whatsapp);
  return (
    <dl className="ped__datos">
      <div><dt>Tienda</dt><dd>{r.negocio}<small>{r.contacto}</small>{r.rif && <small>{r.rif}</small>}</dd></div>
      <div><dt>Contacto</dt><dd>{r.email || <span className="pa-tenue">Sin correo</span>}{tel && <small><a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer">WhatsApp {r.whatsapp}</a></small>}</dd></div>
      <div><dt>Stand</dt><dd>{r.numero} · {TIPO[r.tipo] ?? r.tipo}<small>Pagado {dinero(r.pagado)} de {dinero(r.precio)}</small>
        {r.facturaClave && <small><a href={`/api/factura-stand/${r.facturaClave}`} target="_blank" rel="noreferrer">Factura N.º IWF-{String(r.facturaNumero ?? "").padStart(4, "0")}</a></small>}</dd></div>
    </dl>
  );
}

// ── Stands ───────────────────────────────────────────────────────────────────
type Vista = "revisar" | "cobrar" | "pagados" | "mesas" | "plano";

function Stands() {
  const utils = trpc.useUtils();
  const panel = trpc.stands.panel.useQuery(undefined, { refetchInterval: 30_000 });
  const refrescar = () => { void utils.stands.invalidate(); };
  useStandsSocket(refrescar);   // cada comprobante nuevo aparece sin recargar
  const alFallar = (e: { message: string }) => toast.error(e.message, { duration: 8000 });
  const aprobar = trpc.stands.aprobarPago.useMutation({ onSuccess: r => { toast.success(r.completo ? "Pago aprobado: el stand quedó pagado" : "Pago aprobado: el stand quedó apartado"); refrescar(); }, onError: alFallar });
  const rechazar = trpc.stands.rechazarPago.useMutation({ onSuccess: () => { toast.success("Pago rechazado"); refrescar(); }, onError: alFallar });
  const registrar = trpc.stands.registrarPago.useMutation({ onSuccess: r => { toast.success(r.completo ? "Stand pagado por completo" : "Pago registrado"); refrescar(); }, onError: alFallar });
  const cambiarMesa = trpc.stands.cambiarMesa.useMutation({ onSuccess: () => { toast.success("Mesa cambiada"); refrescar(); }, onError: alFallar });
  const anular = trpc.stands.anular.useMutation({ onSuccess: () => { toast.success("Reserva anulada: la mesa quedó libre"); refrescar(); }, onError: alFallar });
  const bloquear = trpc.stands.bloquear.useMutation({ onSuccess: refrescar, onError: alFallar });

  const [vista, setVista] = useState<Vista>("revisar");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [venta, setVenta] = useState(false);
  const [otroMonto, setOtroMonto] = useState("");
  const [cobro, setCobro] = useState({ monto: "", metodo: "pago_movil", ref: "" });

  const mesas = ((panel.data as any)?.stands ?? []) as Mesa[];
  const reservas = ((panel.data as any)?.reservas ?? []) as Reserva[];
  const pagos = ((panel.data as any)?.pagos ?? []) as Pago[];
  const reserva = useMemo(() => new Map(reservas.map(r => [r.id, r])), [reservas]);
  const porRevisar = pagos.filter(p => p.estado === "pendiente" && reserva.get(p.reservaId) && reserva.get(p.reservaId)!.estado !== "rechazada");
  const deben = reservas.filter(r => r.estado === "apartado");
  const pagados = reservas.filter(r => r.estado === "pagado");
  // Lo que llevan pagado los stands vigentes: la misma cuenta que el Tablero, para que las dos pantallas den la misma cifra
  const cobrado = [...deben, ...pagados].reduce((a, r) => a + r.pagado, 0);
  const saldo = deben.reduce((a, r) => a + Math.max(0, r.precio - r.pagado), 0);
  const libres = (tipo: string) => mesas.filter(m => m.tipo === tipo && m.estado === "libre");
  const abrir = (clave: string, r?: Reserva) => { setAbierto(abierto === clave ? null : clave); setOtroMonto(""); if (r) setCobro({ monto: Math.max(0, r.precio - r.pagado).toFixed(2), metodo: "pago_movil", ref: "" }); };

  const PESTANAS: { id: Vista; texto: string; n: number; hot?: boolean }[] = [
    { id: "revisar", texto: "Pagos por revisar", n: porRevisar.length, hot: true }, { id: "cobrar", texto: "Deben saldo", n: deben.length },
    { id: "pagados", texto: "Pagados", n: pagados.length }, { id: "mesas", texto: "Mesas", n: 0 }, { id: "plano", texto: "Plano", n: 0 },
  ];

  return (
    <Panel title="Stands" action={<button className="btn btn--small" type="button" onClick={() => setVenta(v => !v)}>{venta ? "Cerrar" : "Registrar venta"}</button>}>
      {panel.isLoading ? <p className="empty">Cargando stands…</p> : panel.error ? <p className="notice" role="alert">No pudimos cargar los stands. {panel.error.message}</p> : (
        <>
          <dl className="stats stats--wide">
            {Object.keys(TIPO).map(t => <div key={t}><dt>{TIPO[t]}</dt><dd>{libres(t).length}<small className="fes__de"> libres de {mesas.filter(m => m.tipo === t).length}</small></dd></div>)}
            <div><dt>Cobrado</dt><dd>{dinero(cobrado)}</dd></div>
            <div><dt>Por cobrar</dt><dd>{dinero(saldo)}</dd></div>
          </dl>
          {venta && <VentaDirecta mesas={mesas} alTerminar={() => { setVenta(false); refrescar(); }} />}
          <div className="tabs" role="tablist" aria-label="Stands">
            {PESTANAS.map(p => <button key={p.id} type="button" role="tab" aria-selected={vista === p.id} className={vista === p.id ? "is-active" : undefined} onClick={() => { setVista(p.id); setAbierto(null); }}>{p.texto}{p.n ? <span className={`tabs__n${p.hot ? " tabs__n--hot" : ""}`}>{p.n}</span> : null}</button>)}
          </div>

          {vista === "revisar" && (porRevisar.length === 0 ? <p className="empty">No hay pagos por revisar.</p> : (
            <ul className="ped">
              {porRevisar.map(p => {
                const r = reserva.get(p.reservaId)!;
                const mesa = mesas.find(m => m.id === r.standId);
                const tomada = Boolean(mesa && mesa.estado !== "libre" && mesa.reservaId !== r.id);
                const clave = `p${p.id}`, esta = abierto === clave;
                const otro = aMonto(otroMonto);
                return (
                  <li key={p.id} className={esta ? "is-open" : undefined}>
                    <button type="button" className="ped__fila" aria-expanded={esta} onClick={() => abrir(clave)}>
                      <span className="ped__quien"><strong>{r.negocio}</strong><span className="rows__side">{dinero(p.monto)}</span></span>
                      <span className="ped__pie-fila"><small>Stand {r.numero} · {TIPO[r.tipo] ?? r.tipo} · {r.modalidad === "abono" ? "abono del 30%" : "pago completo"} · {fecha(p.creadoEn)}</small><span className="ped__insignias"><Badge tone="hot">Por revisar</Badge></span></span>
                    </button>
                    {esta && (
                      <div className="ped__ficha">
                        <div className="ped__paso">
                          <h3>Revisa el pago</h3>
                          <p>Reportó {dinero(p.monto)} por {METODO[p.metodo] ?? p.metodo}{p.referencia ? <>, referencia <strong>{p.referencia}</strong></> : null}. El stand cuesta {dinero(r.precio)}.</p>
                          {p.comprobanteUrl ? <a className="ped__comprobante" href={p.comprobanteUrl} target="_blank" rel="noreferrer"><img src={p.comprobanteUrl} alt="Comprobante de pago" loading="lazy" /><span>Abrir comprobante</span></a> : <span className="pa-tenue">Sin comprobante</span>}
                          {tomada && (
                            <label className="pa-select fes__aviso">La mesa {r.numero} ya la tomó otra tienda. Dale otra antes de aprobar:
                              <select defaultValue="" disabled={cambiarMesa.isPending} onChange={e => e.target.value && cambiarMesa.mutate({ reservaId: r.id, standId: Number(e.target.value) })}>
                                <option value="">Elegir mesa libre…</option>{libres(r.tipo).map(m => <option key={m.id} value={m.id}>{m.numero}</option>)}
                              </select></label>
                          )}
                          <div className="eq-acciones">
                            <button className="btn btn--small" type="button" disabled={aprobar.isPending || tomada} onClick={() => aprobar.mutate({ pagoId: p.id })}>Aprobar {dinero(p.monto)}</button>
                            <Confirmar texto="Rechazar" pregunta={`¿Rechazar el pago de ${r.negocio}?`} si="Sí, rechazar" disabled={rechazar.isPending} onSi={() => rechazar.mutate({ pagoId: p.id })} />
                          </div>
                          <form className="form form--inline" onSubmit={e => { e.preventDefault(); if (otro) aprobar.mutate({ pagoId: p.id, monto: otro }); else toast.error("Escribe el monto que llegó"); }}>
                            <label className="field"><span className="field__label">¿Llegó otro monto? (USD)</span><input value={otroMonto} onChange={e => setOtroMonto(e.target.value)} inputMode="decimal" placeholder={String(p.monto)} /></label>
                            <button className="btn btn--ghost btn--small" type="submit" disabled={aprobar.isPending || tomada || !otro}>Aprobar con ese monto</button>
                          </form>
                        </div>
                        <Contacto r={r} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ))}

          {(vista === "cobrar" || vista === "pagados") && ((vista === "cobrar" ? deben : pagados).length === 0 ? <p className="empty">{vista === "cobrar" ? "Ninguna tienda debe saldo." : "Todavía no hay stands pagados."}</p> : (
            <ul className="ped">
              {(vista === "cobrar" ? deben : pagados).map(r => {
                const falta = Math.max(0, r.precio - r.pagado);
                const clave = `r${r.id}`, esta = abierto === clave;
                const monto = aMonto(cobro.monto);
                return (
                  <li key={r.id} className={esta ? "is-open" : undefined}>
                    <button type="button" className="ped__fila" aria-expanded={esta} onClick={() => abrir(clave, r)}>
                      <span className="ped__quien"><strong>{r.negocio}</strong><span className="rows__side">{falta > 0 ? `Debe ${dinero(falta)}` : dinero(r.precio)}</span></span>
                      <span className="ped__pie-fila"><small>Stand {r.numero} · {TIPO[r.tipo] ?? r.tipo} · pagado {dinero(r.pagado)} de {dinero(r.precio)}</small><span className="ped__insignias"><Badge tone={falta > 0 ? "warn" : "ok"}>{falta > 0 ? "Apartado" : "Pagado"}</Badge></span></span>
                    </button>
                    {esta && (
                      <div className="ped__ficha">
                        {falta > 0 && (
                          <div className="ped__paso">
                            <h3>Registrar un pago</h3>
                            <form className="form form--inline" onSubmit={(e: FormEvent) => { e.preventDefault(); if (!monto) { toast.error("Escribe el monto"); return; } registrar.mutate({ reservaId: r.id, monto, metodo: cobro.metodo, referencia: cobro.ref.trim() }); }}>
                              <label className="field"><span className="field__label">Monto (USD)</span><input value={cobro.monto} onChange={e => setCobro({ ...cobro, monto: e.target.value })} inputMode="decimal" /></label>
                              <label className="field"><span className="field__label">Cómo pagó</span><select value={cobro.metodo} onChange={e => setCobro({ ...cobro, metodo: e.target.value })}>{Object.entries(METODO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                              <label className="field"><span className="field__label">Referencia</span><input value={cobro.ref} onChange={e => setCobro({ ...cobro, ref: e.target.value })} placeholder="Opcional" maxLength={120} /></label>
                              <button className="btn btn--small" type="submit" disabled={registrar.isPending}>Registrar pago</button>
                            </form>
                          </div>
                        )}
                        <Contacto r={r} />
                        <div className="ped__otras"><Confirmar texto="Anular la reserva" pregunta={`¿Anular? La mesa ${r.numero} vuelve a estar libre; lo ya pagado queda registrado.`} si="Sí, anular" disabled={anular.isPending} onSi={() => anular.mutate({ reservaId: r.id })} /></div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ))}

          {vista === "mesas" && (
            <div className="fes__mesas">
              <p className="pa-tenue">Una mesa bloqueada no se ofrece en la página de venta. Solo se pueden bloquear las que están libres.</p>
              {Object.keys(TIPO).map(t => (
                <div key={t}>
                  <h3 className="ped__sub">{TIPO[t]} · {dinero(PRECIO[t])}</h3>
                  <ul className="fes__lista">
                    {mesas.filter(m => m.tipo === t).map(m => (
                      <li key={m.id}>
                        <strong>{m.numero}</strong>
                        <Badge tone={m.estado === "pagado" ? "ok" : m.estado === "apartado" ? "warn" : m.estado === "bloqueado" ? "off" : "plain"}>{m.estado === "libre" ? "Libre" : m.estado === "pagado" ? "Pagada" : m.estado === "apartado" ? "Apartada" : "Bloqueada"}</Badge>
                        {(m.estado === "libre" || m.estado === "bloqueado") && <button type="button" className="pa-accion" disabled={bloquear.isPending} onClick={() => bloquear.mutate({ standId: m.id, bloquear: m.estado === "libre" })}>{m.estado === "libre" ? "Bloquear" : "Poner a la venta"}</button>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {vista === "plano" && <Plano mesas={mesas} alCambiar={refrescar} />}
        </>
      )}
    </Panel>
  );
}

/**
 * Dónde va cada mesa en el plano del recinto. Las mesas ubicadas son las que
 * el comprador puede elegir tocando el plano en la página de venta.
 */
function Plano({ mesas, alCambiar }: { mesas: Mesa[]; alCambiar: () => void }) {
  const [tipo, setTipo] = useState("mercader");
  const [elegida, setElegida] = useState<number | null>(null);
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const ubicar = trpc.stands.ubicar.useMutation({ onSuccess: alCambiar, onError: alFallar });
  const bloquear = trpc.stands.bloquear.useMutation({ onSuccess: alCambiar, onError: alFallar });
  const enPlano: MesaPlano[] = mesas.map(m => ({ id: m.id, numero: m.numero, tipo: m.tipo, x: m.x, y: m.y, libre: m.estado === "libre" }));
  const sel = mesas.find(m => m.id === elegida);
  const deTipo = mesas.filter(m => m.tipo === tipo);
  const siguiente = (desde: number) => deTipo.find(m => m.id !== desde && m.x === null)?.id ?? null;
  return (
    <div className="fes__mesas">
      <p className="pa-tenue">Elige una mesa y toca en el plano el lugar donde va. Al ubicarla pasa sola a la siguiente sin ubicar. Tocar una mesa ya puesta en el plano la selecciona para moverla.</p>
      <div className="tabs" role="tablist" aria-label="Tipo de mesa">
        {Object.keys(TIPO).map(t => <button key={t} type="button" role="tab" aria-selected={tipo === t} className={tipo === t ? "is-active" : undefined} onClick={() => { setTipo(t); setElegida(null); }}>{TIPO[t]}<span className="tabs__n">{mesas.filter(m => m.tipo === t && m.x !== null).length} de {mesas.filter(m => m.tipo === t).length}</span></button>)}
      </div>
      <div className="fes__fichas" role="group" aria-label="Mesas de este tipo">
        {deTipo.map(m => <button key={m.id} type="button" aria-pressed={elegida === m.id} className={`fes__ficha${elegida === m.id ? " is-on" : ""}${m.x !== null ? " is-puesta" : ""}`} onClick={() => setElegida(elegida === m.id ? null : m.id)}>{m.numero}</button>)}
      </div>
      {sel ? (
        <div className="ped__paso">
          <h3>Ubicando la mesa {sel.numero}</h3>
          <p>{sel.x !== null ? "Ya está en el plano: toca otro punto para moverla." : "Toca en el plano el lugar donde va."}</p>
          <div className="eq-acciones">
            {sel.x !== null && <button type="button" className="pa-accion" disabled={ubicar.isPending} onClick={() => ubicar.mutate({ standId: sel.id, x: null, y: null })}>Quitarla del plano</button>}
            {(sel.estado === "libre" || sel.estado === "bloqueado") && <button type="button" className="pa-accion" disabled={bloquear.isPending} onClick={() => bloquear.mutate({ standId: sel.id, bloquear: sel.estado === "libre" })}>{sel.estado === "bloqueado" ? "Poner a la venta" : "Bloquear (no se vende)"}</button>}
          </div>
        </div>
      ) : <p className="notice notice--info">Elige una mesa de la lista para ubicarla.</p>}
      <div className="fes__plano">
        <MapaStands mesas={enPlano} seleccionada={elegida} modoAdmin onElegir={m => { setTipo(m.tipo); setElegida(m.id); }}
          onTocarPlano={(x, y) => { if (!sel) { toast.message("Primero elige una mesa de la lista"); return; } ubicar.mutate({ standId: sel.id, x, y }); setElegida(siguiente(sel.id)); }} />
      </div>
    </div>
  );
}

/** Para quien ya pagó (en efectivo, por ejemplo): se registra y la mesa queda tomada al momento */
function VentaDirecta({ mesas, alTerminar }: { mesas: Mesa[]; alTerminar: () => void }) {
  const [f, setF] = useState({ standId: "", negocio: "", contacto: "", whatsapp: "", email: "", monto: "", metodo: "efectivo", referencia: "" });
  const venta = trpc.stands.ventaDirecta.useMutation({ onSuccess: r => { toast.success(r.completo ? "Venta registrada: stand pagado" : "Venta registrada: stand apartado, con saldo pendiente"); alTerminar(); }, onError: e => toast.error(e.message) });
  const mesa = mesas.find(m => String(m.id) === f.standId);
  const precio = mesa ? PRECIO[mesa.tipo] ?? 0 : 0;
  const monto = aMonto(f.monto);
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!mesa || f.negocio.trim().length < 2 || f.contacto.trim().length < 2 || !monto) { toast.error("Elige la mesa y escribe la tienda, el contacto y el monto"); return; }
    venta.mutate({ standId: mesa.id, negocio: f.negocio.trim(), contacto: f.contacto.trim(), whatsapp: f.whatsapp.trim() || undefined, email: f.email.trim(), monto, metodo: f.metodo, referencia: f.referencia.trim() || undefined });
  };
  return (
    <form className="form tie__nuevo" onSubmit={enviar}>
      <p className="pa-tenue">Para una venta que ya cobraste, en efectivo o por otra vía. La mesa queda tomada al momento.</p>
      <div className="form form--inline">
        <label className="field"><span className="field__label">Mesa libre</span>
          <select value={f.standId} onChange={e => { const m = mesas.find(x => String(x.id) === e.target.value); setF({ ...f, standId: e.target.value, monto: m ? String(PRECIO[m.tipo] ?? "") : f.monto }); }} required>
            <option value="">Elegir…</option>
            {Object.keys(TIPO).map(t => <optgroup key={t} label={`${TIPO[t]} · $${PRECIO[t]}`}>{mesas.filter(m => m.tipo === t && m.estado === "libre").map(m => <option key={m.id} value={m.id}>{m.numero}</option>)}</optgroup>)}
          </select></label>
        <label className="field"><span className="field__label">Tienda o marca</span><input value={f.negocio} onChange={e => setF({ ...f, negocio: e.target.value })} required /></label>
        <label className="field"><span className="field__label">Persona de contacto</span><input value={f.contacto} onChange={e => setF({ ...f, contacto: e.target.value })} required /></label>
        <label className="field"><span className="field__label">WhatsApp</span><input value={f.whatsapp} onChange={e => setF({ ...f, whatsapp: e.target.value })} inputMode="tel" /></label>
        <label className="field"><span className="field__label">Correo</span><input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} type="email" placeholder="Le llega la confirmación" /></label>
        <label className="field"><span className="field__label">Monto recibido (USD)</span><input value={f.monto} onChange={e => setF({ ...f, monto: e.target.value })} inputMode="decimal" required /></label>
        <label className="field"><span className="field__label">Cómo pagó</span><select value={f.metodo} onChange={e => setF({ ...f, metodo: e.target.value })}>{Object.entries(METODO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="field"><span className="field__label">{f.metodo === "efectivo" ? "Quién lo recibió" : "Referencia"}</span><input value={f.referencia} onChange={e => setF({ ...f, referencia: e.target.value })} placeholder="Opcional" maxLength={120} /></label>
      </div>
      {precio > 0 && (
        <p className="tie__acciones">
          <button type="button" className="pa-accion" onClick={() => setF({ ...f, monto: (Math.round(precio * 30) / 100).toFixed(2) })}>Poner el 30% ({dinero(precio * 0.3)})</button>
          <button type="button" className="pa-accion" onClick={() => setF({ ...f, monto: String(precio) })}>Poner todo ({dinero(precio)})</button>
          {monto && <span className="pa-tenue">{monto >= precio ? "Queda pagado." : `Queda apartado: debe ${dinero(precio - monto)}.`}</span>}
        </p>
      )}
      <div className="eq-acciones"><button className="btn btn--small" type="submit" disabled={venta.isPending}>{venta.isPending ? "Guardando…" : "Registrar venta y tomar la mesa"}</button></div>
    </form>
  );
}

// ── Patrocinantes ────────────────────────────────────────────────────────────
type Patro = { id: number; nombre: string; imagenUrl: string; enlace: string | null; activo: boolean; vistas?: number; clics?: number };

function Patrocinantes() {
  const utils = trpc.useUtils();
  const todos = trpc.patrocinantes.todos.useQuery();
  const refrescar = () => { void utils.patrocinantes.invalidate(); };
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const guardar = trpc.patrocinantes.guardar.useMutation({ onSuccess: refrescar, onError: alFallar });
  const borrar = trpc.patrocinantes.borrar.useMutation({ onSuccess: () => { toast.success("Patrocinante eliminado"); refrescar(); }, onError: alFallar });
  const ordenar = trpc.patrocinantes.ordenar.useMutation({ onSuccess: refrescar, onError: alFallar });
  const reiniciar = trpc.patrocinantes.reiniciar.useMutation({ onSuccess: () => { toast.success("Contadores en cero"); refrescar(); }, onError: alFallar });
  const subir = useSubirImagen();
  const [f, setF] = useState({ id: 0, nombre: "", enlace: "", imagenUrl: "" });
  const [subiendo, setSubiendo] = useState(false);

  const lista = (todos.data ?? []) as unknown as Patro[];
  const mover = (i: number, d: -1 | 1) => { const ids = lista.map(p => p.id); [ids[i], ids[i + d]] = [ids[i + d], ids[i]]; ordenar.mutate({ ids }); };
  const alElegir = async (a: File | undefined) => {
    if (!a) return;
    setSubiendo(true);
    try { setF(x => ({ ...x, imagenUrl: "" })); const { url } = await subir(a); setF(x => ({ ...x, imagenUrl: url })); }
    catch (e: any) { toast.error(e?.message ?? "No se pudo subir el logo"); } finally { setSubiendo(false); }
  };
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const enlace = f.enlace.trim();
    if (!f.nombre.trim() || !f.imagenUrl) { toast.error("Escribe el nombre y sube el logo"); return; }
    if (enlace && !/^https:\/\//i.test(enlace)) { toast.error("El enlace debe empezar con https://"); return; }
    guardar.mutate({ ...(f.id ? { id: f.id } : {}), nombre: f.nombre.trim(), imagenUrl: f.imagenUrl, enlace }, { onSuccess: () => { toast.success(f.id ? "Patrocinante guardado" : "Patrocinante agregado"); setF({ id: 0, nombre: "", enlace: "", imagenUrl: "" }); } });
  };

  return (
    <Panel title="Patrocinantes" lead="Los logos que salen en la portada del Fest, en este orden. Cada uno cuenta cuántas veces se vio y cuántas se tocó.">
      <form className="form tie__nuevo" onSubmit={enviar}>
        <div className="form form--inline">
          <label className="field"><span className="field__label">{f.id ? "Nombre" : "Nuevo patrocinante"}</span><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} maxLength={120} placeholder="Nombre de la marca" /></label>
          <label className="field"><span className="field__label">Enlace</span><input value={f.enlace} onChange={e => setF({ ...f, enlace: e.target.value })} type="url" placeholder="https://… (opcional)" maxLength={500} /></label>
        </div>
        <div className="tie__acciones">
          {f.imagenUrl && <img className="fes__logo" src={f.imagenUrl} alt="" />}
          <input id="patro-logo" type="file" accept="image/*" hidden onChange={e => { void alElegir(e.target.files?.[0]); e.target.value = ""; }} />
          <label htmlFor="patro-logo" className={`btn btn--ghost btn--small${subiendo ? " is-off" : ""}`}>{subiendo ? "Subiendo…" : f.imagenUrl ? "Cambiar logo" : "Subir logo"}</label>
          <button className="btn btn--small" type="submit" disabled={guardar.isPending || subiendo}>{f.id ? "Guardar" : "Agregar patrocinante"}</button>
          {f.id > 0 && <button type="button" className="pa-accion" onClick={() => setF({ id: 0, nombre: "", enlace: "", imagenUrl: "" })}>Cancelar</button>}
        </div>
      </form>
      {todos.isLoading ? <p className="empty">Cargando…</p> : lista.length === 0 ? <p className="empty">Todavía no hay patrocinantes.</p> : (
        <ul className="ped">
          {lista.map((p, i) => (
            <li key={p.id} className="tie__coleccion">
              <span className="tie__mini fes__mini">{p.imagenUrl ? <img src={p.imagenUrl} alt="" loading="lazy" /> : null}</span>
              <div className="tie__texto">
                <span className="ped__quien"><strong>{p.nombre}</strong><span className="ped__insignias">{p.activo === false && <Badge tone="off">Oculto</Badge>}</span></span>
                <small className="pa-tenue">{p.vistas ?? 0} vistas · {p.clics ?? 0} toques{p.enlace ? ` · ${p.enlace.replace(/^https:\/\//, "")}` : " · sin enlace"}</small>
                <span className="tie__acciones">
                  <button type="button" className="pa-accion" disabled={i === 0 || ordenar.isPending} onClick={() => mover(i, -1)}>Subir</button>
                  <button type="button" className="pa-accion" disabled={i === lista.length - 1 || ordenar.isPending} onClick={() => mover(i, 1)}>Bajar</button>
                  <button type="button" className="pa-accion" disabled={guardar.isPending} onClick={() => guardar.mutate({ id: p.id, nombre: p.nombre, imagenUrl: p.imagenUrl, enlace: p.enlace ?? "", activo: p.activo === false })}>{p.activo === false ? "Mostrar" : "Ocultar"}</button>
                  <button type="button" className="pa-accion" onClick={() => { setF({ id: p.id, nombre: p.nombre, enlace: p.enlace ?? "", imagenUrl: p.imagenUrl }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                  <Confirmar texto="Poner contadores en cero" pregunta="¿Borrar las vistas y toques de este patrocinante?" si="Sí" disabled={reiniciar.isPending} onSi={() => reiniciar.mutate({ id: p.id })} />
                  <Confirmar texto="Eliminar" pregunta="¿Eliminar este patrocinante?" si="Sí, eliminar" disabled={borrar.isPending} onSi={() => borrar.mutate({ id: p.id })} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** El Guardián del Portal: cómo va y reiniciarlo con la vida que se elija */
function JefeRaid() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.raid.adminResumen.useQuery(undefined, { refetchInterval: 15_000 });
  const [vida, setVida] = useState("2000000");
  const reiniciar = trpc.raid.reiniciar.useMutation({
    onSuccess: () => { toast.success("Jefe reiniciado: todos empiezan en cero"); utils.raid.adminResumen.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const n = parseInt(vida, 10) || 0;
  const num = (v: number) => v.toLocaleString("es-VE");
  return (
    <Panel title="Jefe del raid" lead="El Guardián del Portal, el jefe que todos golpean desde la web.">
      {isLoading ? <p className="empty">Cargando…</p> : !data ? <p className="empty">No hay un jefe activo. Reinícialo abajo para crear uno.</p> : (
        <dl className="stats stats--wide">
          <div><dt>Vida</dt><dd>{num(data.vida)} / {num(data.vidaMax)}</dd></div>
          <div><dt>Daño recibido</dt><dd>{num(data.danio)}</dd></div>
          <div><dt>Cazadores</dt><dd>{num(data.cazadores)}</dd></div>
          <div><dt>Estado</dt><dd>{data.derrotado ? "Derrotado" : data.sinLimite ? "Vivo · hoy sin límite" : "Vivo"}</dd></div>
        </dl>
      )}
      <form className="form form--inline" onSubmit={(e: FormEvent) => e.preventDefault()}>
        <label className="field"><span className="field__label">Vida del jefe nuevo</span><input value={vida} onChange={e => setVida(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="2000000" /></label>
      </form>
      <p className="pa-lead">Reiniciar archiva al jefe actual con todo su historial y pone uno nuevo con esa vida. Todos los cazadores empiezan en cero: su daño, la tabla de los 10, el progreso de veterano y la vida completa. Los bonos por invitar se conservan.</p>
      <p className="ped__pie">
        <Confirmar texto="Reiniciar jefe" pregunta={`¿Reiniciar al jefe con ${num(n)} de vida? Los contadores de todos quedan en cero.`} si="Sí, reiniciar" disabled={reiniciar.isPending || n < 1000} onSi={() => reiniciar.mutate({ vidaMax: n })} />
      </p>
    </Panel>
  );
}

type VistaFest = "tablero" | "compras" | "boletos" | "tipos" | "equipo" | "levelpass" | "dia" | "stands" | "patrocinantes" | "jefe";

export default function Fest() {
  const [vista, setVista] = useState<VistaFest>("tablero");
  const { evento, eventos, elegir } = useEvento();
  const tipos = trpc.tickets.tipos.useQuery({ eventId: evento?.id ?? 0 }, { enabled: Boolean(evento) });
  const ordenes = trpc.boletosOnline.ordenes.useQuery(undefined, { refetchInterval: 60_000 });
  const panel = trpc.stands.panel.useQuery(undefined, { refetchInterval: 60_000 });
  const reservas = new Map((((panel.data as any)?.reservas ?? []) as Reserva[]).map(r => [r.id, r]));
  const pagosStands = (((panel.data as any)?.pagos ?? []) as Pago[]).filter(p => p.estado === "pendiente" && reservas.get(p.reservaId) && reservas.get(p.reservaId)!.estado !== "rechazada").length;
  const comprasWeb = ((ordenes.data ?? []) as unknown as Orden[]).filter(o => o.estado === "pendiente").length;
  const listaTipos = (tipos.data ?? []) as unknown as Tipo[];
  const extras = trpc.standTienda.extras.useQuery(undefined, { refetchInterval: 60_000 });
  const misionesPorRevisar = ((extras.data ?? []) as unknown as Extra[]).filter(e => e.estado === "pendiente").length;
  const PESTANAS: { id: VistaFest; texto: string; n?: number }[] = [
    { id: "tablero", texto: "Tablero" }, { id: "compras", texto: "Compras por la web", n: comprasWeb }, { id: "boletos", texto: "Boletos y códigos" },
    { id: "tipos", texto: "Tipos y eventos" }, { id: "equipo", texto: "Equipo", n: misionesPorRevisar }, { id: "levelpass", texto: "Level Pass" }, { id: "dia", texto: "El día del evento" },
    { id: "stands", texto: "Stands", n: pagosStands }, { id: "patrocinantes", texto: "Patrocinantes" }, { id: "jefe", texto: "Jefe del raid" },
  ];
  const sinEvento = <Panel title="Sin evento"><p className="empty">Todavía no hay un evento creado. Créalo en «Tipos y eventos».</p></Panel>;
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Partes del World Fest">
        {PESTANAS.map(p => <button key={p.id} type="button" role="tab" aria-selected={vista === p.id} className={vista === p.id ? "is-active" : undefined} onClick={() => setVista(p.id)}>{p.texto}{p.n ? <span className="tabs__n tabs__n--hot">{p.n}</span> : null}</button>)}
      </div>
      {eventos.length > 1 && evento && ["boletos", "tipos", "levelpass", "dia"].includes(vista) && <label className="pa-select bol__evento">Evento<select value={evento.id} onChange={e => elegir(Number(e.target.value))}>{eventos.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>}
      {vista === "tablero" && <Panel title="Tablero del Fest"><TableroFest alRevisarStands={() => setVista("stands")} /></Panel>}
      {vista === "compras" && <ComprasWeb />}
      {vista === "boletos" && (evento ? <><Boletos evento={evento} tipos={listaTipos} /><Codigos evento={evento} /></> : sinEvento)}
      {vista === "tipos" && <>{evento ? <Tipos evento={evento} tipos={listaTipos} /> : null}<Eventos eventos={eventos} actual={evento} /><PuestaAPunto evento={evento} /></>}
      {vista === "equipo" && <><Equipo /><TiendasConStand /></>}
      {vista === "levelpass" && (evento ? <LevelPass evento={evento} /> : sinEvento)}
      {vista === "dia" && (evento ? <DiaDelEvento evento={evento} /> : sinEvento)}
      {vista === "stands" && <Stands />}
      {vista === "patrocinantes" && <Patrocinantes />}
      {vista === "jefe" && <JefeRaid />}
    </>
  );
}
