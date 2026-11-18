import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useStandsSocket } from "@/hooks/useStandsSocket";
import { Panel, Badge, Confirmar, num, dinero, fecha, paraWhatsApp } from "./ui";
import { aPrecio } from "./Tienda";

/**
 * Boletería del evento, primera parte: lo de todos los días.
 *
 *   · Compras por la web que esperan revisión
 *   · Boletos vendidos: buscar a alguien y resolver una incidencia
 *   · Tipos de boleto
 *   · Equipo: quién vende, quién está en la puerta y quién da EXP
 *
 * Las personas se manejan en un solo lugar (Equipo). Antes había que ir a
 * «Tiendas», a «Puerta» y a «Level Pass» para dar o quitar cada función.
 */
type Evento = { id: number; name: string; startDate: string; endDate: string; active: boolean };

function useEvento() {
  const eventos = trpc.tickets.eventos.useQuery();
  const [id, setId] = useState<number | null>(null);
  const lista = (eventos.data ?? []) as unknown as Evento[];
  const porDefecto = useMemo(() => {
    const dia = (d: string) => new Date(d).toISOString().slice(0, 10), hoy = dia(new Date().toISOString());
    return lista.filter(e => e.active !== false && dia(e.endDate) >= hoy).sort((a, b) => dia(a.startDate).localeCompare(dia(b.startDate)))[0] ?? lista[0];
  }, [lista]);
  return { evento: lista.find(e => e.id === id) ?? porDefecto, eventos: lista, elegir: setId, cargando: eventos.isLoading };
}

// ── Compras por la web ───────────────────────────────────────────────────────
const METODO: Record<string, string> = { pago_movil: "Pago Móvil", crypto: "Binance Pay" };
const NOTA: Record<string, string> = {
  binance_no_encontrado: "Binance: ese número de transacción no aparece en la cuenta.", binance_monto_menor: "Binance: el pago es por menos del total.",
  binance_ya_usado: "Binance: ese número ya se usó en otra compra.", binance_moneda: "Binance: el pago no es en USDT.",
  binance_no_es_ingreso: "Binance: esa transacción no es un pago recibido.", binance_formato: "Binance: el número no tiene un formato válido.",
  binance_error: "Binance no respondió: revísalo a mano.", binance_sin_configurar: "La verificación automática de Binance está sin configurar.",
};
type Orden = { id: number; nombre: string; apellido: string; email: string; telefono: string; cantidad: number; tipoNombre: string; metodo: string; referencia: string | null; comprobanteUrl: string | null; monto: string | number; estado: string; verificacion: string | null };

function ComprasWeb() {
  const utils = trpc.useUtils();
  const ordenes = trpc.boletosOnline.ordenes.useQuery(undefined, { refetchInterval: 60_000 });
  const refrescar = () => { void utils.boletosOnline.invalidate(); void utils.tickets.invalidate(); };
  useStandsSocket(refrescar);
  const revisar = trpc.boletosOnline.revisar.useMutation({ onSuccess: (_r, v) => { toast.success(v.aprobar ? "Aprobada: los boletos salieron por correo" : "Compra rechazada"); refrescar(); }, onError: e => toast.error(e.message) });
  const [abierta, setAbierta] = useState<number | null>(null);
  const [historial, setHistorial] = useState(false);
  const lista = (ordenes.data ?? []) as unknown as Orden[];
  const pendientes = lista.filter(o => o.estado === "pendiente"), resto = lista.filter(o => o.estado !== "pendiente");

  return (
    <Panel title="Compras por la web" lead="Las de Binance verificadas se aprueban solas. Aquí quedan las que hay que revisar a mano.">
      {ordenes.isLoading ? <p className="empty">Cargando…</p> : pendientes.length === 0 ? <p className="empty">No hay compras por revisar.</p> : (
        <ul className="ped">
          {pendientes.map(o => {
            const esta = abierta === o.id, tel = paraWhatsApp(o.telefono);
            return (
              <li key={o.id} className={esta ? "is-open" : undefined}>
                <button type="button" className="ped__fila" aria-expanded={esta} onClick={() => setAbierta(esta ? null : o.id)}>
                  <span className="ped__quien"><strong>{o.nombre} {o.apellido}</strong><span className="rows__side">{dinero(o.monto)}</span></span>
                  <span className="ped__pidio">{o.cantidad} × {o.tipoNombre}</span>
                  <span className="ped__pie-fila"><small>{METODO[o.metodo] ?? o.metodo} · ref. {o.referencia || "sin referencia"}</small><span className="ped__insignias"><Badge tone="hot">Por revisar</Badge></span></span>
                </button>
                {esta && (
                  <div className="ped__ficha">
                    <div className="ped__paso">
                      <h3>Revisa el pago</h3>
                      <p>Pagó {dinero(o.monto)} por {METODO[o.metodo] ?? o.metodo}{o.referencia ? <>, referencia <strong>{o.referencia}</strong></> : null}. Al aprobar, sus boletos le llegan por correo.</p>
                      {o.verificacion && NOTA[o.verificacion] && <p className="fes__aviso">{NOTA[o.verificacion]}</p>}
                      {o.comprobanteUrl ? <a className="ped__comprobante" href={o.comprobanteUrl} target="_blank" rel="noreferrer"><img src={o.comprobanteUrl} alt="Comprobante de pago" loading="lazy" /><span>Abrir comprobante</span></a> : <span className="pa-tenue">Sin comprobante</span>}
                      <div className="eq-acciones">
                        <button className="btn btn--small" type="button" disabled={revisar.isPending} onClick={() => revisar.mutate({ id: o.id, aprobar: true })}>Aprobar y enviar boletos</button>
                        <Confirmar texto="Rechazar" pregunta="¿Rechazar esta compra?" si="Sí, rechazar" disabled={revisar.isPending} onSi={() => revisar.mutate({ id: o.id, aprobar: false })} />
                      </div>
                    </div>
                    <dl className="ped__datos"><div><dt>Comprador</dt><dd>{o.nombre} {o.apellido}<small>{o.email}</small>{tel && <small><a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer">WhatsApp {o.telefono}</a></small>}</dd></div></dl>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {resto.length > 0 && (
        <>
          <p className="ped__pie"><button type="button" className="pa-accion" onClick={() => setHistorial(h => !h)}>{historial ? "Ocultar" : "Ver"} las {resto.length} compras ya revisadas</button></p>
          {historial && <ul className="rows">{resto.slice(0, 80).map(o => (
            <li key={o.id}><span className="rows__main"><strong>{o.nombre} {o.apellido} · {o.cantidad} × {o.tipoNombre}</strong><small>{METODO[o.metodo] ?? o.metodo} · {o.verificacion === "binance_ok" ? "verificada sola" : o.estado === "aprobado" ? "aprobada a mano" : "rechazada"}</small></span>
              <span className={`rows__side${o.estado === "aprobado" ? "" : " fes__tachado"}`}>{dinero(o.monto)}</span></li>))}</ul>}
        </>
      )}
    </Panel>
  );
}

// ── Boletos vendidos ─────────────────────────────────────────────────────────
type Tipo = { id: number; name: string; priceUsd: string; days: number; perks: string | null; active: boolean; cupo: number | null; esVip: boolean; entregaKit: string | null; bonos: number; color: string | null; vendidos: number; quedan: number | null };
type Boleto = { id: number; code: string; status: string; buyerName: string | null; buyerLastName: string | null; buyerPhone: string | null; buyerEmail: string | null; ticketTypeId: number | null; tipoNombre: string | null; tiendaNombre: string | null; priceUsd: string | null; soldAt: string | null };

function FichaBoleto({ b, tipos, alCerrar }: { b: Boleto; tipos: Tipo[]; alCerrar: () => void }) {
  const utils = trpc.useUtils();
  const refrescar = () => { void utils.tickets.invalidate(); };
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const extra = trpc.tickets.detalle.useQuery({ id: b.id });
  const corregir = trpc.tickets.corregir.useMutation({ onSuccess: refrescar, onError: alFallar });
  const deshacer = trpc.tickets.deshacerVenta.useMutation({ onSuccess: () => { toast.success("Venta deshecha: el boleto quedó en blanco"); refrescar(); alCerrar(); }, onError: alFallar });
  const reenviar = trpc.tickets.reenviarComprobante.useMutation({ onSuccess: r => toast.success(`Comprobante enviado a ${r.correo}`), onError: alFallar });
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState({ buyerName: b.buyerName ?? "", buyerLastName: b.buyerLastName ?? "", buyerPhone: b.buyerPhone ?? "", buyerEmail: b.buyerEmail ?? "", tipo: b.ticketTypeId ? String(b.ticketTypeId) : "" });
  const anulado = b.status === "void";
  const d = extra.data as any;
  const guardar = (e: FormEvent) => {
    e.preventDefault();
    if (!f.buyerName.trim() || !f.buyerLastName.trim()) { toast.error("El nombre y el apellido son obligatorios"); return; }
    if (f.buyerPhone.replace(/\D/g, "").length < 7) { toast.error("Revisa el teléfono"); return; }
    if (f.buyerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.buyerEmail.trim())) { toast.error("Revisa el correo"); return; }
    corregir.mutate({ id: b.id, buyerName: f.buyerName, buyerLastName: f.buyerLastName, buyerPhone: f.buyerPhone, buyerEmail: f.buyerEmail.trim() || null, ...(f.tipo && Number(f.tipo) !== b.ticketTypeId ? { ticketTypeId: Number(f.tipo) } : {}) },
      { onSuccess: () => { toast.success("Datos corregidos"); setEditando(false); } });
  };
  const tel = paraWhatsApp(b.buyerPhone);
  return (
    <div className="ped__ficha">
      {anulado && <p className="notice" role="status">Este boleto está anulado: no vale en la puerta ni en el Level Pass.</p>}
      {editando ? (
        <form className="form" onSubmit={guardar}>
          <div className="form form--inline">
            <label className="field"><span className="field__label">Nombre</span><input value={f.buyerName} onChange={e => setF({ ...f, buyerName: e.target.value })} maxLength={200} required /></label>
            <label className="field"><span className="field__label">Apellido</span><input value={f.buyerLastName} onChange={e => setF({ ...f, buyerLastName: e.target.value })} maxLength={200} required /></label>
            <label className="field"><span className="field__label">Teléfono</span><input value={f.buyerPhone} onChange={e => setF({ ...f, buyerPhone: e.target.value })} inputMode="tel" maxLength={50} /></label>
            <label className="field"><span className="field__label">Correo (para su Level Pass)</span><input value={f.buyerEmail} onChange={e => setF({ ...f, buyerEmail: e.target.value })} type="email" maxLength={320} /></label>
            <label className="field"><span className="field__label">Tipo de boleto</span><select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}>{!b.ticketTypeId && <option value="">Sin tipo</option>}{tipos.map(t => <option key={t.id} value={t.id}>{t.name} · {dinero(t.priceUsd)}{t.active ? "" : " (no a la venta)"}</option>)}</select></label>
          </div>
          <div className="eq-acciones"><button className="btn btn--small" type="submit" disabled={corregir.isPending}>Guardar</button><button type="button" className="pa-accion" onClick={() => setEditando(false)}>Cancelar</button></div>
        </form>
      ) : (
        <dl className="ped__datos">
          <div><dt>Comprador</dt><dd>{b.buyerName} {b.buyerLastName}<small>{b.buyerEmail || "Sin correo: no puede entrar a su Level Pass"}</small>{tel && <small><a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer">WhatsApp {b.buyerPhone}</a></small>}</dd></div>
          <div><dt>Boleto</dt><dd>{b.tipoNombre ?? "Sin tipo"}<small>{b.code}</small><small>{b.tiendaNombre ?? "Venta por la web"}{b.soldAt ? ` · ${fecha(b.soldAt)}` : ""}</small></dd></div>
          <div><dt>En el evento</dt><dd>{!d ? "…" : d.ingresos?.length ? d.ingresos.map((i: any) => `Día ${i.dia}`).join(" · ") : "Aún no entra"}{d && <small>{d.xp} EXP · {d.actividades} misiones</small>}
            {d?.beneficios?.kit && <small>{d.beneficios.kit}: {d.beneficios.kitEntregado ? "entregado" : "sin entregar"}</small>}
            {d?.beneficios?.bonosTotales > 0 && <small>Bonos: {d.beneficios.bonosUsados} de {d.beneficios.bonosTotales} usados</small>}</dd></div>
        </dl>
      )}
      {!editando && (
        <div className="ped__otras">
          <button type="button" className="pa-accion" onClick={() => setEditando(true)}>Corregir datos o tipo</button>
          <button type="button" className="pa-accion" disabled={reenviar.isPending || anulado || !b.buyerEmail} onClick={() => reenviar.mutate({ id: b.id })}>Reenviar comprobante</button>
          <Confirmar texto={anulado ? "Reactivar" : "Anular"} pregunta={anulado ? "¿Reactivar? Vuelve a valer en la puerta." : "¿Anular? Deja de valer en la puerta y en el Level Pass. Úsalo si se perdió o se reembolsó."} si={anulado ? "Sí, reactivar" : "Sí, anular"} disabled={corregir.isPending}
            onSi={() => corregir.mutate({ id: b.id, status: anulado ? "sold" : "void" }, { onSuccess: () => toast.success(anulado ? "Boleto reactivado" : "Boleto anulado") })} />
          <Confirmar texto="Deshacer venta" pregunta="¿Deshacer la venta? El boleto queda en blanco, se borran los datos del comprador y la tienda puede venderlo otra vez." si="Sí, deshacer" disabled={deshacer.isPending} onSi={() => deshacer.mutate({ id: b.id })} />
        </div>
      )}
    </div>
  );
}

function Boletos({ evento, tipos }: { evento: Evento; tipos: Tipo[] }) {
  const boletos = trpc.tickets.listar.useQuery({ eventId: evento.id, status: "emitidos" }, { refetchInterval: 20_000 });
  const [buscar, setBuscar] = useState("");
  const [tienda, setTienda] = useState("");
  const [abierto, setAbierto] = useState<number | null>(null);
  const [cuantos, setCuantos] = useState(60);
  const lista = (boletos.data ?? []) as unknown as Boleto[];
  const tiendas = useMemo(() => Array.from(new Set(lista.map(b => b.tiendaNombre ?? "Venta por la web"))).sort(), [lista]);
  const q = buscar.trim().toLowerCase();
  const visibles = lista.filter(b => (!tienda || (b.tiendaNombre ?? "Venta por la web") === tienda) && (!q || [`${b.buyerName ?? ""} ${b.buyerLastName ?? ""}`, b.code, b.buyerPhone ?? "", b.buyerEmail ?? ""].some(v => v.toLowerCase().includes(q))));
  const suma = visibles.filter(b => b.status !== "void").reduce((a, b) => a + num(b.priceUsd), 0);
  return (
    <Panel title="Boletos vendidos">
      <div className="form form--inline ped__buscar bol__filtros">
        <label className="field"><span className="field__label">Buscar</span><input value={buscar} onChange={e => { setBuscar(e.target.value); setCuantos(60); }} type="search" placeholder="Nombre, código, teléfono o correo" /></label>
        {tiendas.length > 1 && <label className="field"><span className="field__label">Vendido por</span><select value={tienda} onChange={e => { setTienda(e.target.value); setCuantos(60); }}><option value="">Todas las tiendas</option>{tiendas.map(t => <option key={t} value={t}>{t}</option>)}</select></label>}
      </div>
      {boletos.isLoading ? <p className="empty">Cargando boletos…</p> : visibles.length === 0 ? <p className="empty">{q ? `Ningún boleto coincide con «${buscar.trim()}».` : tienda ? `${tienda} no ha vendido boletos.` : "Todavía no hay boletos vendidos."}</p> : (
        <>
          <p className="pa-tenue bol__cuenta">{visibles.length === 1 ? "1 boleto" : `${visibles.length} boletos`} · {dinero(suma)}</p>
          <ul className="ped">
            {visibles.slice(0, cuantos).map(b => {
              const esta = abierto === b.id;
              return (
                <li key={b.id} className={esta ? "is-open" : undefined}>
                  <button type="button" className="ped__fila" aria-expanded={esta} onClick={() => setAbierto(esta ? null : b.id)}>
                    <span className="ped__quien"><strong>{`${b.buyerName ?? ""} ${b.buyerLastName ?? ""}`.trim() || b.code}</strong><span className="rows__side">{b.priceUsd ? dinero(b.priceUsd) : ""}</span></span>
                    <span className="ped__pie-fila"><small>{b.tipoNombre ?? "Sin tipo"} · {b.tiendaNombre ?? "Venta por la web"} · {b.code}</small><span className="ped__insignias">{b.status === "void" && <Badge tone="off">Anulado</Badge>}</span></span>
                  </button>
                  {esta && <FichaBoleto key={b.id} b={b} tipos={tipos} alCerrar={() => setAbierto(null)} />}
                </li>
              );
            })}
          </ul>
          {visibles.length > cuantos && <p className="ped__pie"><button type="button" className="pa-accion" onClick={() => setCuantos(c => c + 100)}>Ver más ({visibles.length - cuantos} restantes)</button></p>}
        </>
      )}
    </Panel>
  );
}

// ── Tipos de boleto ──────────────────────────────────────────────────────────
type FormTipo = { name: string; price: string; days: string; cupo: string; perks: string; kit: string; bonos: string; vip: boolean; active: boolean };
const TIPO_VACIO: FormTipo = { name: "", price: "", days: "1", cupo: "", perks: "", kit: "", bonos: "0", vip: false, active: true };

function FormularioTipo({ inicial, enviando, texto, alEnviar, alCancelar, conActivo }: { inicial: FormTipo; enviando: boolean; texto: string; alEnviar: (f: FormTipo, precio: string) => void; alCancelar?: () => void; conActivo?: boolean }) {
  const [f, setF] = useState(inicial);
  return (
    <form className="form" onSubmit={e => { e.preventDefault(); const p = aPrecio(f.price); if (!f.name.trim() || p === null) { toast.error("Escribe el nombre y el precio (12 o 12,50)"); return; } alEnviar(f, p); }}>
      <div className="form form--inline">
        <label className="field tie__ancho"><span className="field__label">Nombre</span><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="General, VIP, Full Pass…" maxLength={200} required /></label>
        <label className="field"><span className="field__label">Precio (USD)</span><input value={f.price} onChange={e => setF({ ...f, price: e.target.value })} inputMode="decimal" required /></label>
        <label className="field"><span className="field__label">Días que cubre</span><input value={f.days} onChange={e => setF({ ...f, days: e.target.value })} inputMode="numeric" /></label>
        <label className="field"><span className="field__label">Cupo</span><input value={f.cupo} onChange={e => setF({ ...f, cupo: e.target.value })} inputMode="numeric" placeholder="Sin límite" /></label>
        <label className="field"><span className="field__label">Bonos de consumo</span><input value={f.bonos} onChange={e => setF({ ...f, bonos: e.target.value })} inputMode="numeric" /></label>
        <label className="field tie__ancho"><span className="field__label">Kit que se entrega</span><input value={f.kit} onChange={e => setF({ ...f, kit: e.target.value })} placeholder="Opcional: «Kit VIP»" maxLength={200} /></label>
      </div>
      <label className="field"><span className="field__label">Qué incluye</span><textarea value={f.perks} onChange={e => setF({ ...f, perks: e.target.value })} rows={2} maxLength={1000} placeholder="Lo que ve el comprador" /></label>
      <div className="tie__checks">
        <label className="check"><input type="checkbox" checked={f.vip} onChange={e => setF({ ...f, vip: e.target.checked })} /> Es VIP (entra al sorteo)</label>
        {conActivo && <label className="check"><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} /> A la venta</label>}
      </div>
      <div className="eq-acciones"><button className="btn btn--small" type="submit" disabled={enviando}>{enviando ? "Guardando…" : texto}</button>{alCancelar && <button type="button" className="pa-accion" onClick={alCancelar}>Cancelar</button>}</div>
    </form>
  );
}
const datosTipo = (f: FormTipo, precio: string) => ({ name: f.name.trim(), priceUsd: precio, days: Math.min(7, Math.max(1, parseInt(f.days, 10) || 1)), perks: f.perks, cupo: parseInt(f.cupo, 10) >= 1 ? parseInt(f.cupo, 10) : null, esVip: f.vip, entregaKit: f.kit.trim() || null, bonos: Math.min(50, Math.max(0, parseInt(f.bonos, 10) || 0)) });

function Tipos({ evento, tipos }: { evento: Evento; tipos: Tipo[] }) {
  const utils = trpc.useUtils();
  const refrescar = () => { void utils.tickets.invalidate(); };
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const crear = trpc.tickets.crearTipo.useMutation({ onSuccess: () => { toast.success("Tipo de boleto creado"); setNuevo(false); refrescar(); }, onError: alFallar });
  const editar = trpc.tickets.editarTipo.useMutation({ onSuccess: () => { toast.success("Tipo guardado"); refrescar(); }, onError: alFallar });
  const borrar = trpc.tickets.borrarTipo.useMutation({ onSuccess: () => { toast.success("Tipo eliminado"); refrescar(); }, onError: alFallar });
  const [nuevo, setNuevo] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);
  return (
    <Panel title="Tipos de boleto" lead="Lo que las tiendas y la web pueden vender en este evento." action={<button className="btn btn--small" type="button" onClick={() => setNuevo(n => !n)}>{nuevo ? "Cerrar" : "Nuevo tipo"}</button>}>
      {nuevo && <div className="tie__nuevo"><FormularioTipo inicial={TIPO_VACIO} enviando={crear.isPending} texto="Crear tipo" alEnviar={(f, p) => crear.mutate({ eventId: evento.id, ...datosTipo(f, p), sortOrder: tipos.length })} /></div>}
      {tipos.length === 0 ? <p className="empty">Este evento todavía no tiene tipos de boleto.</p> : (
        <ul className="ped">
          {tipos.map(t => {
            const esta = abierto === t.id;
            return (
              <li key={t.id} className={esta ? "is-open" : undefined}>
                <button type="button" className="ped__fila" aria-expanded={esta} onClick={() => setAbierto(esta ? null : t.id)}>
                  <span className="ped__quien"><strong>{t.name}</strong><span className="rows__side">{dinero(t.priceUsd)}</span></span>
                  <span className="ped__pie-fila"><small>{t.vendidos === 1 ? "1 vendido" : `${t.vendidos} vendidos`}{t.cupo != null ? ` de ${t.cupo} · quedan ${t.quedan}` : ""} · {t.days === 1 ? "1 día" : `${t.days} días`}{t.bonos ? ` · ${t.bonos} bonos` : ""}{t.entregaKit ? ` · ${t.entregaKit}` : ""}</small>
                    <span className="ped__insignias">{t.esVip && <Badge>VIP</Badge>}{!t.active && <Badge tone="off">No a la venta</Badge>}{t.cupo != null && t.quedan === 0 && <Badge tone="warn">Agotado</Badge>}</span></span>
                </button>
                {esta && (
                  <div className="ped__ficha">
                    <FormularioTipo key={t.id} conActivo enviando={editar.isPending} texto="Guardar cambios" inicial={{ name: t.name, price: num(t.priceUsd).toFixed(2), days: String(t.days), cupo: t.cupo != null ? String(t.cupo) : "", perks: t.perks ?? "", kit: t.entregaKit ?? "", bonos: String(t.bonos ?? 0), vip: t.esVip, active: t.active }}
                      alEnviar={(f, p) => editar.mutate({ id: t.id, ...datosTipo(f, p), active: f.active })} />
                    <div className="ped__otras">{t.vendidos > 0 ? <span className="pa-tenue tie__nota">Ya tiene boletos vendidos: para dejar de ofrecerlo, quítale «A la venta».</span>
                      : <Confirmar texto="Eliminar tipo" pregunta="¿Eliminar este tipo de boleto?" si="Sí, eliminar" disabled={borrar.isPending} onSi={() => borrar.mutate({ id: t.id })} />}</div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ── Equipo ───────────────────────────────────────────────────────────────────
type Persona = { email: string; nombre: string; telefono: string | null; tienda: { id: number; nombre: string; activa: boolean; daXp: boolean } | null; portero: { id: number; activo: boolean } | null; xp: { id: number; activo: boolean; puesto: string | null } | null; rueda: boolean; entro: string | null };
type Rol = "tienda" | "portero" | "xp" | "rueda";
const ROL: Record<Rol, { texto: string; hace: string }> = {
  tienda: { texto: "Tienda", hace: "Vende boletos" }, portero: { texto: "Puerta", hace: "Valida la entrada" },
  xp: { texto: "EXP", hace: "Da EXP en una actividad" }, rueda: { texto: "Rueda de negocios", hace: "Marca qué tiendas llegaron" },
};

function Equipo() {
  const utils = trpc.useUtils();
  const lista = trpc.equipo.lista.useQuery();
  const refrescar = () => { void utils.equipo.invalidate(); void utils.tickets.invalidate(); };
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const asignar = trpc.equipo.asignar.useMutation({ onSuccess: refrescar, onError: alFallar });
  const pausar = trpc.equipo.pausar.useMutation({ onSuccess: refrescar, onError: alFallar });
  const quitar = trpc.equipo.quitar.useMutation({ onSuccess: () => { toast.success("Ya no está en el equipo"); refrescar(); }, onError: alFallar });
  const reenviar = trpc.tickets.reenviarAcceso.useMutation({ onSuccess: () => toast.success("Le reenviamos el correo con su acceso"), onError: alFallar });
  const [abierto, setAbierto] = useState<string | null>(null);
  const [buscar, setBuscar] = useState("");
  const [nuevo, setNuevo] = useState({ ver: false, email: "", nombre: "", rol: "tienda" as Rol, tienda: "", telefono: "" });
  const [nombreTienda, setNombreTienda] = useState("");

  const personas = (lista.data ?? []) as unknown as Persona[];
  const q = buscar.trim().toLowerCase();
  const visibles = personas.filter(p => !q || [p.nombre, p.email, p.tienda?.nombre ?? "", p.telefono ?? ""].some(v => v.toLowerCase().includes(q)));
  const estado = (p: Persona, r: Rol) => r === "rueda" ? (p.rueda ? "activo" : null) : r === "tienda" ? (p.tienda ? (p.tienda.activa ? "activo" : "pausa") : null) : r === "portero" ? (p.portero ? (p.portero.activo ? "activo" : "pausa") : null) : (p.xp ? (p.xp.activo ? "activo" : "pausa") : null);
  const alCrear = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(nuevo.email.trim())) { toast.error("Escribe un correo válido: con ese correo entra a la app"); return; }
    if (nuevo.rol === "tienda" && nuevo.tienda.trim().length < 2) { toast.error("Escribe el nombre de la tienda"); return; }
    asignar.mutate({ email: nuevo.email.trim().toLowerCase(), nombre: nuevo.nombre.trim(), rol: nuevo.rol, activo: true, ...(nuevo.rol === "tienda" ? { nombreTienda: nuevo.tienda.trim() } : {}), ...(nuevo.telefono.trim() ? { telefono: nuevo.telefono.trim() } : {}) },
      { onSuccess: () => { toast.success("Agregado al equipo"); setNuevo({ ver: false, email: "", nombre: "", rol: "tienda", tienda: "", telefono: "" }); } });
  };

  return (
    <Panel title="Equipo" lead="Quién vende boletos, quién está en la puerta y quién da EXP. Cada persona entra a la app del Equipo con su correo y ve solo lo suyo."
      action={<button className="btn btn--small" type="button" onClick={() => setNuevo(n => ({ ...n, ver: !n.ver }))}>{nuevo.ver ? "Cerrar" : "Agregar persona"}</button>}>
      {nuevo.ver && (
        <form className="form tie__nuevo" onSubmit={alCrear}>
          <div className="form form--inline">
            <label className="field"><span className="field__label">Correo</span><input value={nuevo.email} onChange={e => setNuevo({ ...nuevo, email: e.target.value })} type="email" placeholder="Con este correo entra" maxLength={320} required autoFocus /></label>
            <label className="field"><span className="field__label">Nombre</span><input value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} maxLength={200} /></label>
            <label className="field"><span className="field__label">Qué hace</span><select value={nuevo.rol} onChange={e => setNuevo({ ...nuevo, rol: e.target.value as Rol })}>{(Object.keys(ROL) as Rol[]).map(r => <option key={r} value={r}>{ROL[r].texto}: {ROL[r].hace.toLowerCase()}</option>)}</select></label>
            {nuevo.rol === "tienda" && <label className="field"><span className="field__label">Nombre de la tienda</span><input value={nuevo.tienda} onChange={e => setNuevo({ ...nuevo, tienda: e.target.value })} maxLength={200} required /></label>}
            <label className="field"><span className="field__label">Teléfono</span><input value={nuevo.telefono} onChange={e => setNuevo({ ...nuevo, telefono: e.target.value })} inputMode="tel" placeholder="Opcional" maxLength={50} /></label>
          </div>
          <div className="eq-acciones"><button className="btn btn--small" type="submit" disabled={asignar.isPending}>{asignar.isPending ? "Agregando…" : "Agregar al equipo"}</button></div>
        </form>
      )}
      <label className="field ped__buscar"><span className="field__label">Buscar</span><input value={buscar} onChange={e => setBuscar(e.target.value)} type="search" placeholder="Nombre, correo o tienda" /></label>
      {lista.isLoading ? <p className="empty">Cargando el equipo…</p> : visibles.length === 0 ? <p className="empty">{q ? `Nadie coincide con «${buscar.trim()}».` : "Todavía no hay nadie en el equipo."}</p> : (
        <ul className="ped">
          {visibles.map(p => {
            const clave = p.email || `${p.nombre}-${p.tienda?.id ?? p.portero?.id ?? p.xp?.id}`;
            const esta = abierto === clave, sinCorreo = !p.email;
            return (
              <li key={clave} className={esta ? "is-open" : undefined}>
                <button type="button" className="ped__fila" aria-expanded={esta} onClick={() => { setAbierto(esta ? null : clave); setNombreTienda(""); }}>
                  <span className="ped__quien"><strong>{p.tienda?.nombre ?? p.nombre}</strong></span>
                  <span className="ped__pie-fila"><small>{p.tienda ? `${p.nombre} · ` : ""}{p.email || "Sin correo"} · {p.entro ? `entró el ${fecha(p.entro)}` : "aún no entra"}</small>
                    <span className="ped__insignias">{(Object.keys(ROL) as Rol[]).map(r => { const e = estado(p, r); return e ? <Badge key={r} tone={e === "activo" ? "ok" : "off"}>{ROL[r].texto}{e === "pausa" ? " en pausa" : ""}</Badge> : null; })}</span></span>
                </button>
                {esta && (
                  <div className="ped__ficha">
                    {sinCorreo && <p className="notice notice--info">Esta persona no tiene correo registrado, así que no puede entrar a la app. Quítala y agrégala de nuevo con su correo.</p>}
                    <ul className="rows">
                      {(Object.keys(ROL) as Rol[]).map(r => {
                        const e = estado(p, r);
                        return (
                          <li key={r} className="tie__variante">
                            <span className="rows__main"><strong>{ROL[r].texto}</strong><small>{ROL[r].hace}{e === "pausa" ? " · en pausa" : e ? "" : " · no lo tiene"}</small></span>
                            <span className="tie__acciones">
                              {!e && r === "tienda" && <input className="bol__mini" value={nombreTienda} onChange={ev => setNombreTienda(ev.target.value)} placeholder="Nombre de la tienda" aria-label="Nombre de la tienda" maxLength={200} />}
                              {!e && <button type="button" className="pa-accion" disabled={asignar.isPending || sinCorreo || (r === "tienda" && nombreTienda.trim().length < 2)} onClick={() => asignar.mutate({ email: p.email, nombre: p.nombre, rol: r, activo: true, ...(r === "tienda" ? { nombreTienda: nombreTienda.trim() } : {}) }, { onSuccess: () => toast.success(`${ROL[r].texto}: asignado`) })}>Dar esta función</button>}
                              {e && r !== "rueda" && <button type="button" className="pa-accion" disabled={pausar.isPending || sinCorreo} onClick={() => pausar.mutate({ email: p.email, rol: r as "tienda" | "portero" | "xp", activo: e !== "activo" })}>{e === "activo" ? "Pausar" : "Reactivar"}</button>}
                              {e && <Confirmar texto="Quitar" pregunta={r === "tienda" ? "¿Quitar? Si ya vendió boletos, la tienda queda desactivada para conservar sus ventas." : `¿Quitarle ${ROL[r].texto}?`} si="Sí, quitar" disabled={asignar.isPending || sinCorreo} onSi={() => asignar.mutate({ email: p.email, nombre: p.nombre, rol: r, activo: false })} />}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {p.tienda && <label className="check"><input type="checkbox" checked={p.tienda.daXp} disabled={asignar.isPending || sinCorreo} onChange={ev => asignar.mutate({ email: p.email, nombre: p.nombre, rol: "tienda", activo: true, daXp: ev.target.checked })} /> Esta tienda también da EXP en su stand</label>}
                    <div className="ped__otras">
                      {p.tienda && p.email && <button type="button" className="pa-accion" disabled={reenviar.isPending} onClick={() => reenviar.mutate({ id: p.tienda!.id })}>Reenviar el correo de acceso</button>}
                      {p.telefono && <a className="pa-accion tie__enlace" href={`https://wa.me/${paraWhatsApp(p.telefono)}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                      {p.email && <Confirmar texto="Quitar del equipo" pregunta={`¿Quitar a ${p.nombre}? Pierde todas sus funciones.`} si="Sí, quitar" disabled={quitar.isPending} onSi={() => quitar.mutate({ email: p.email })} />}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export { useEvento, ComprasWeb, Boletos, Tipos, Equipo };
export type { Tipo, Orden };
