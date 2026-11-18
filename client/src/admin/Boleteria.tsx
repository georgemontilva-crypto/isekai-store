import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { urlPublica } from "@/const";
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

// ── Códigos QR: generar e imprimir ───────────────────────────────────────────
/** Abre una hoja lista para imprimir con el QR de cada boleto */
async function imprimirQrs(lista: { token: string; code: string }[], lote: string) {
  const w = window.open("", "_blank");
  if (!w) { toast.error("Permite las ventanas emergentes para imprimir los QR"); return; }
  w.document.write("<p style=\"font:16px system-ui;margin:24px\">Preparando los códigos…</p>");
  const QRCode = (await import("qrcode")).default;
  // Los QR impresos van siempre con www: la dirección que nunca falla
  const tarjetas = await Promise.all(lista.map(async b => `<div class="t"><img src="${await QRCode.toDataURL(`${urlPublica()}/vender/${b.token}`, { width: 320, margin: 1 })}" /><p>${b.code}</p></div>`));
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Boletos ${lote}</title><style>
    body{font-family:system-ui,sans-serif;margin:16px}h1{font-size:15px;margin:0 0 14px}
    .g{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.t{border:1px solid #ddd;border-radius:8px;padding:8px;text-align:center;break-inside:avoid}
    .t img{width:100%;height:auto}.t p{margin:4px 0 0;font:700 11px ui-monospace,monospace;letter-spacing:.5px}@media print{body{margin:8px}}
    </style></head><body><h1>Boletos · lote ${lote} · ${lista.length} unidades</h1><div class="g">${tarjetas.join("")}</div>
    <script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

function Codigos({ evento }: { evento: Evento }) {
  const utils = trpc.useUtils();
  const lotes = trpc.tickets.lotes.useQuery({ eventId: evento.id });
  const [cantidad, setCantidad] = useState("100");
  const [buscar, setBuscar] = useState("");
  const [imprimiendo, setImprimiendo] = useState<string | null>(null);
  const todos = trpc.tickets.listar.useQuery({ eventId: evento.id }, { enabled: buscar.trim().length >= 2 });
  const generar = trpc.tickets.generar.useMutation({
    onSuccess: async (r: any) => { toast.success(`${r.boletos.length} boletos generados`); void utils.tickets.invalidate(); await imprimirQrs(r.boletos, r.lote); },
    onError: e => toast.error(e.message),
  });
  const n = Math.min(1000, Math.max(0, parseInt(cantidad, 10) || 0));
  const reimprimir = async (lote: string) => {
    setImprimiendo(lote);
    try { const lista = await utils.tickets.boletosDeLote.fetch({ eventId: evento.id, lote }); if (!lista.length) toast.error("Ese lote no tiene boletos"); else await imprimirQrs(lista as any, lote); }
    catch (e: any) { toast.error(e?.message ?? "No se pudo abrir el lote"); } finally { setImprimiendo(null); }
  };
  const q = buscar.trim().toLowerCase();
  const hallados = q.length >= 2 ? ((todos.data ?? []) as unknown as Boleto[]).filter(b => [b.code, `${b.buyerName ?? ""} ${b.buyerLastName ?? ""}`].some(v => v.toLowerCase().includes(q))).slice(0, 40) : [];
  // Los lotes «WEB…» son compras por la web: no son boletos de papel, así que aquí no se listan
  const listaLotes = ((lotes.data ?? []) as unknown as { lote: string; total: number; vendidos: number; enBlanco: number }[]).filter(l => !/^WEB/i.test(l.lote));
  return (
    <Panel title="Códigos QR" lead="Los boletos físicos se generan en blanco, se imprimen con su QR y la tienda los llena al venderlos.">
      <form className="form form--inline tie__nuevo" onSubmit={e => { e.preventDefault(); if (n >= 1) generar.mutate({ eventId: evento.id, cantidad: n }); else toast.error("Escribe cuántos boletos generar (de 1 a 1000)"); }}>
        <label className="field"><span className="field__label">Cuántos boletos en blanco</span><input value={cantidad} onChange={e => setCantidad(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="100" /><span className="field__hint">Hasta 1000 por lote.{n >= 500 ? " Con lotes grandes la hoja tarda en abrirse: no cierres la pestaña." : ""}</span></label>
        <button className="btn btn--small" type="submit" disabled={generar.isPending || n < 1}>{generar.isPending ? "Generando…" : `Generar ${n || ""} e imprimir`}</button>
      </form>
      <h3 className="ped__sub">Lotes generados</h3>
      {lotes.isLoading ? <p className="empty">Cargando…</p> : listaLotes.length === 0 ? <p className="empty">Todavía no has generado boletos.</p> : (
        <ul className="rows">
          {listaLotes.map(l => (
            <li key={l.lote} className="tie__variante">
              <span className="rows__main"><strong>{l.lote}</strong><small>{l.total === 1 ? "1 boleto" : `${l.total} boletos`} · {l.vendidos} vendidos · {l.enBlanco} sin vender</small></span>
              <button type="button" className="pa-accion" disabled={imprimiendo !== null} onClick={() => void reimprimir(l.lote)}>{imprimiendo === l.lote ? "Abriendo…" : "Imprimir de nuevo"}</button>
            </li>
          ))}
        </ul>
      )}
      <h3 className="ped__sub">Buscar un código</h3>
      <label className="field ped__buscar"><span className="field__label">Código o comprador</span><input value={buscar} onChange={e => setBuscar(e.target.value)} type="search" placeholder="IW-…" /></label>
      {q.length >= 2 && (todos.isLoading ? <p className="empty">Buscando…</p> : hallados.length === 0 ? <p className="empty">Ningún código coincide con «{buscar.trim()}».</p> : (
        <ul className="rows">{hallados.map(b => (
          <li key={b.id} className="tie__variante"><span className="rows__main"><strong>{b.code}</strong><small>{b.buyerName ? `${b.buyerName} ${b.buyerLastName ?? ""} · ${b.tiendaNombre ?? "Venta por la web"}` : "Sin vender"}</small></span>
            <Badge tone={b.status === "sold" ? "ok" : b.status === "void" ? "off" : "plain"}>{b.status === "sold" ? "Vendido" : b.status === "void" ? "Anulado" : "En blanco"}</Badge></li>))}</ul>
      ))}
    </Panel>
  );
}

// ── Eventos ──────────────────────────────────────────────────────────────────
function Eventos({ eventos, actual }: { eventos: Evento[]; actual?: Evento }) {
  const utils = trpc.useUtils();
  const [ver, setVer] = useState(false);
  const [f, setF] = useState({ name: "", startDate: "", endDate: "", location: "Maracaibo" });
  const crear = trpc.tickets.crearEvento.useMutation({ onSuccess: () => { toast.success("Evento creado"); setVer(false); setF({ name: "", startDate: "", endDate: "", location: "Maracaibo" }); void utils.tickets.invalidate(); }, onError: e => toast.error(e.message) });
  const dia = (d: string) => new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(d));
  return (
    <Panel title="Eventos" action={<button className="btn btn--ghost btn--small" type="button" onClick={() => setVer(v => !v)}>{ver ? "Cerrar" : "Nuevo evento"}</button>}>
      {ver && (
        <form className="form form--inline tie__nuevo" onSubmit={e => { e.preventDefault(); if (!f.name.trim() || !f.startDate || !f.endDate) { toast.error("Escribe el nombre y las dos fechas"); return; } if (f.endDate < f.startDate) { toast.error("El evento no puede terminar antes de empezar"); return; } crear.mutate({ name: f.name.trim(), startDate: f.startDate, endDate: f.endDate, location: f.location.trim() || undefined }); }}>
          <label className="field tie__ancho"><span className="field__label">Nombre</span><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Isekai World Fest 2027" maxLength={200} required /></label>
          <label className="field"><span className="field__label">Empieza</span><input value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} type="date" required /></label>
          <label className="field"><span className="field__label">Termina</span><input value={f.endDate} onChange={e => setF({ ...f, endDate: e.target.value })} type="date" required /></label>
          <label className="field"><span className="field__label">Lugar</span><input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} maxLength={300} /></label>
          <button className="btn btn--small" type="submit" disabled={crear.isPending}>Crear evento</button>
        </form>
      )}
      {eventos.length === 0 ? <p className="empty">Todavía no hay eventos.</p> : (
        <ul className="rows">{eventos.map(e => (
          <li key={e.id} className="tie__variante"><span className="rows__main"><strong>{e.name}</strong><small>{dia(e.startDate)} al {dia(e.endDate)}</small></span>
            <span className="ped__insignias">{actual?.id === e.id && <Badge tone="ok">El que estás viendo</Badge>}{e.active === false && <Badge tone="off">Inactivo</Badge>}</span></li>))}</ul>
      )}
    </Panel>
  );
}

// ── Puesta a punto: plantilla y reinicio ─────────────────────────────────────
/**
 * Dos herramientas para preparar un evento, no para el día a día. El reinicio
 * borra boletos y ventas: por eso pide escribir la palabra BORRAR.
 */
function PuestaAPunto({ evento }: { evento?: Evento }) {
  const utils = trpc.useUtils();
  const refrescar = () => { void utils.tickets.invalidate(); void utils.levelPass.invalidate(); };
  const conteo = trpc.tickets.conteoReinicio.useQuery();
  const plantilla = trpc.tickets.plantilla2027.useMutation({ onSuccess: (r: any) => { toast.success(`Boletos 2027 cargados: ${r.creados} nuevos, ${r.actualizados} actualizados`); refrescar(); }, onError: e => toast.error(e.message) });
  const reiniciar = trpc.tickets.reiniciar2027.useMutation({ onSuccess: () => { toast.success("Listo: quedó solo el Isekai World Fest 2027"); setPalabra(""); setVer(false); refrescar(); }, onError: e => toast.error(e.message) });
  const [ver, setVer] = useState(false);
  const [palabra, setPalabra] = useState("");
  const c = conteo.data as { eventos: number; boletos: number; vendidos: number; tipos: number; actividades: number; misionesTienda: number } | undefined;
  return (
    <Panel title="Puesta a punto del evento" lead="Para preparar un evento nuevo. No hace falta tocarlo durante la venta.">
      <ul className="rows">
        <li className="tie__variante">
          <span className="rows__main"><strong>Cargar los 4 boletos de 2027</strong><small>{evento ? `Los pone en «${evento.name}». Si alguno ya existe con ese nombre, lo actualiza; no borra nada.` : "Primero crea un evento."}</small></span>
          {evento && <Confirmar texto="Cargar" pregunta={`¿Cargar los 4 tipos en «${evento.name}»?`} si="Sí, cargar" disabled={plantilla.isPending} onSi={() => plantilla.mutate({ eventId: evento.id })} />}
        </li>
        <li className="tie__variante">
          <span className="rows__main"><strong>Empezar de cero con el Fest 2027</strong><small>Borra todos los eventos con sus boletos, ventas, ingresos y EXP, y deja solo el Isekai World Fest 2027 con sus 4 boletos. Se conservan las tiendas, el equipo y las misiones de las tiendas.</small></span>
          <button type="button" className="pa-accion" onClick={() => setVer(v => !v)}>{ver ? "Cerrar" : "Ver qué se borra"}</button>
        </li>
      </ul>
      {ver && (
        <div className="ped__paso bol__peligro">
          <h3>Esto no se puede deshacer</h3>
          {c ? <p>Ahora mismo se borrarían <strong>{c.eventos === 1 ? "1 evento" : `${c.eventos} eventos`}</strong>, <strong>{c.boletos} boletos</strong> (de ellos <strong>{c.vendidos} vendidos</strong>), {c.tipos} tipos de boleto y {c.actividades} actividades del Level Pass. Las {c.misionesTienda} misiones de las tiendas pasan al evento nuevo.</p> : <p>Contando lo que hay…</p>}
          <form className="form form--inline" onSubmit={e => { e.preventDefault(); if (palabra === "BORRAR") reiniciar.mutate({ confirmo: "BORRAR" }); }}>
            <label className="field"><span className="field__label">Escribe BORRAR para confirmar</span><input value={palabra} onChange={e => setPalabra(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" maxLength={6} /></label>
            <button className="btn btn--small" type="submit" disabled={palabra !== "BORRAR" || reiniciar.isPending}>{reiniciar.isPending ? "Borrando…" : "Borrar todo y dejar el Fest 2027"}</button>
          </form>
        </div>
      )}
    </Panel>
  );
}

// ── Level Pass ───────────────────────────────────────────────────────────────
function LevelPass({ evento }: { evento: Evento }) {
  const utils = trpc.useUtils();
  const refrescar = () => { void utils.levelPass.invalidate(); void utils.tickets.invalidate(); };
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const resumen = trpc.levelPass.resumen.useQuery({ eventId: evento.id }, { refetchInterval: 20_000 });
  const actividades = trpc.levelPass.actividades.useQuery({ eventId: evento.id });
  const crear = trpc.levelPass.crearActividad.useMutation({ onSuccess: () => { toast.success("Actividad agregada"); setA({ name: "", xp: "", ubicacion: "", repetible: false, max: "3" }); refrescar(); }, onError: alFallar });
  const borrar = trpc.levelPass.borrarActividad.useMutation({ onSuccess: () => { toast.success("Actividad eliminada"); refrescar(); }, onError: alFallar });
  const crearPrueba = trpc.levelPass.crearPrueba.useMutation({ onSuccess: () => { toast.success("Entorno de prueba creado"); refrescar(); }, onError: alFallar });
  const borrarPrueba = trpc.levelPass.borrarPrueba.useMutation({ onSuccess: () => { toast.success("Datos de prueba borrados"); refrescar(); }, onError: alFallar });
  const darXp = trpc.levelPass.darXpPrueba.useMutation({ onSuccess: () => { toast.success("EXP aplicada"); refrescar(); }, onError: alFallar });
  const [a, setA] = useState({ name: "", xp: "", ubicacion: "", repetible: false, max: "3" });
  const [codigo, setCodigo] = useState("");
  const r = resumen.data as any;
  const lista = (actividades.data ?? []) as unknown as { id: number; name: string; xp: number; ubicacion: string | null; repetible: boolean; maxVeces: number; active: boolean }[];
  const tope = Math.max(1, ...((r?.porRango ?? []) as any[]).map(x => x.cantidad));
  return (
    <>
      <Panel title="Level Pass" lead="Cómo va la experiencia del evento. Se actualiza solo.">
        {!r ? <p className="empty">Cargando…</p> : (
          <>
            <dl className="stats stats--wide"><div><dt>Participantes</dt><dd>{r.participantes}</dd></div><div><dt>En rango S</dt><dd>{r.rangoS}</dd></div><div><dt>Boletos vendidos</dt><dd>{r.boletosVendidos}</dd></div><div><dt>Ascensos</dt><dd>{r.ascensos.length}</dd></div></dl>
            {r.participantes > 0 && <><h3 className="ped__sub">Cazadores por rango</h3>
              <ul className="lp__rangos">{(r.porRango as any[]).map(x => <li key={x.rango}><strong>{x.rango}</strong><span className="lp__barra"><i style={{ width: `${(x.cantidad / tope) * 100}%` }} /></span><span>{x.cantidad}</span></li>)}</ul></>}
            {r.ranking.length > 0 && <><h3 className="ped__sub">Ranking</h3>
              <ol className="rows">{(r.ranking as any[]).slice(0, 20).map((x, i) => <li key={x.codigo} className="tie__variante"><span className="rows__main"><strong>{i + 1}. {x.nombre}</strong><small>{x.codigo}</small></span><span className="rows__side">{x.rango} · {x.xpTotal} EXP</span></li>)}</ol></>}
            {r.ascensos.length > 0 && <><h3 className="ped__sub">Ascensos recientes</h3>
              <ul className="rows">{(r.ascensos as any[]).slice(0, 12).map((x, i) => <li key={i} className="tie__variante"><span className="rows__main"><strong>{x.nombre}</strong><small>{fecha(x.createdAt)}</small></span><span className="rows__side">{x.rangoAnterior} → {x.rangoNuevo}</span></li>)}</ul></>}
          </>
        )}
      </Panel>
      <Panel title="Actividades" lead="Lo que se puede completar en el evento y cuánta EXP da. Quién la entrega se decide en Equipo.">
        <form className="form tie__nuevo" onSubmit={e => { e.preventDefault(); if (!a.name.trim()) { toast.error("Escribe el nombre de la actividad"); return; } crear.mutate({ eventId: evento.id, name: a.name.trim(), xp: Math.min(1000, Math.max(1, parseInt(a.xp, 10) || 25)), ubicacion: a.ubicacion.trim() || undefined, repetible: a.repetible, maxVeces: a.repetible ? Math.min(20, Math.max(1, parseInt(a.max, 10) || 1)) : undefined }); }}>
          <div className="form form--inline">
            <label className="field tie__ancho"><span className="field__label">Nueva actividad</span><input value={a.name} onChange={e => setA({ ...a, name: e.target.value })} placeholder="Compra en tienda aliada" maxLength={200} /></label>
            <label className="field"><span className="field__label">EXP que da</span><input value={a.xp} onChange={e => setA({ ...a, xp: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="25" /></label>
            <label className="field"><span className="field__label">Dónde</span><input value={a.ubicacion} onChange={e => setA({ ...a, ubicacion: e.target.value })} placeholder="Opcional" maxLength={200} /></label>
            {a.repetible && <label className="field"><span className="field__label">Cuántas veces</span><input value={a.max} onChange={e => setA({ ...a, max: e.target.value.replace(/\D/g, "") })} inputMode="numeric" /></label>}
          </div>
          <div className="tie__checks"><label className="check"><input type="checkbox" checked={a.repetible} onChange={e => setA({ ...a, repetible: e.target.checked })} /> Se puede repetir</label></div>
          <div className="eq-acciones"><button className="btn btn--small" type="submit" disabled={crear.isPending}>Agregar actividad</button></div>
        </form>
        {lista.length === 0 ? <p className="empty">Todavía no hay actividades.</p> : (
          <ul className="rows">{lista.map(x => (
            <li key={x.id} className="tie__variante"><span className="rows__main"><strong>{x.name}</strong><small>{x.ubicacion ? `${x.ubicacion} · ` : ""}{x.repetible ? `hasta ${x.maxVeces} veces` : "una sola vez"}{x.active ? "" : " · desactivada"}</small></span>
              <span className="tie__acciones"><span className="rows__side">+{x.xp} EXP</span><Confirmar texto="Eliminar" pregunta={`¿Eliminar «${x.name}»?`} si="Sí, eliminar" disabled={borrar.isPending} onSi={() => borrar.mutate({ id: x.id })} /></span></li>))}</ul>
        )}
      </Panel>
      <Panel title="Entorno de prueba" lead="Para ensayar sin tocar los boletos reales: crea un evento con fechas de hoy, cinco actividades y boletos listos (IW-TEST01 a 03 vendidos; IW-LIBRE1 y 2 sin vender).">
        <div className="eq-acciones">
          <button className="btn btn--ghost btn--small" type="button" disabled={crearPrueba.isPending} onClick={() => crearPrueba.mutate()}>{crearPrueba.isPending ? "Creando…" : "Crear entorno de prueba"}</button>
          <Confirmar texto="Borrar los datos de prueba" pregunta="¿Borrar participantes y EXP de prueba? Los boletos reales no se tocan." si="Sí, borrar" disabled={borrarPrueba.isPending} onSi={() => borrarPrueba.mutate()} />
        </div>
        <form className="form form--inline lp__xp" onSubmit={e => e.preventDefault()}>
          <label className="field"><span className="field__label">Dar EXP a un boleto de prueba</span><input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="IW-TEST01" maxLength={64} /></label>
          <span className="tie__acciones">{[40, 80, 200].map(x => <button key={x} type="button" className="pa-accion" disabled={codigo.trim().length < 3 || darXp.isPending} onClick={() => darXp.mutate({ codigo: codigo.trim(), xp: x })}>+{x} EXP</button>)}</span>
        </form>
      </Panel>
    </>
  );
}

// ── El día del evento: asistencia y sorteo VIP ───────────────────────────────
function DiaDelEvento({ evento }: { evento: Evento }) {
  const asistencia = trpc.tickets.asistencia.useQuery({ eventId: evento.id }, { refetchInterval: 20_000 });
  const sorteo = trpc.tickets.sorteo.useQuery({ eventId: evento.id });
  const a = asistencia.data as any;
  const participantes = (sorteo.data ?? []) as unknown as { id: number; nombre: string; codigo: string; telefono: string | null }[];
  const [girando, setGirando] = useState<string | null>(null);
  const [ganador, setGanador] = useState<(typeof participantes)[number] | null>(null);
  const [verLista, setVerLista] = useState(false);
  const sortear = () => {
    setGanador(null);
    const azar = new Uint32Array(1); crypto.getRandomValues(azar);
    const elegido = participantes[azar[0] % participantes.length];
    let n = 0;
    const id = window.setInterval(() => { setGirando(participantes[n++ % participantes.length].nombre); if (n > 24) { window.clearInterval(id); setGirando(null); setGanador(elegido); } }, 90);
  };
  return (
    <>
      <Panel title="Asistencia" lead="Lo que registran los porteros al validar cada boleto. Se actualiza solo. Los porteros se agregan en Equipo.">
        {!a ? <p className="empty">Cargando…</p> : (
          <>
            <dl className="stats stats--wide"><div><dt>Boletos vendidos</dt><dd>{a.vendidos}</dd></div><div><dt>Han ingresado</dt><dd>{a.ingresosTotales}</dd></div><div><dt>Día actual</dt><dd>{a.diaActual ? `Día ${a.diaActual}` : "Fuera de fecha"}</dd></div><div><dt>Validados sin conexión</dt><dd>{a.sincronizadosSinConexion}</dd></div></dl>
            {(a.porDia ?? []).length > 0 ? <ul className="rows">{(a.porDia as any[]).map(d => <li key={d.dia} className="tie__variante"><span className="rows__main"><strong>Día {d.dia}</strong></span><span className="rows__side">{d.cantidad === 1 ? "1 persona" : `${d.cantidad} personas`}</span></li>)}</ul> : <p className="empty">Todavía no ha entrado nadie.</p>}
          </>
        )}
      </Panel>
      <Panel title="Sorteo VIP" lead="Cada boleto VIP vendido entra solo al sorteo de la pieza a tamaño real.">
        {participantes.length === 0 ? <p className="empty">Todavía no hay boletos VIP vendidos.</p> : (
          <>
            {(girando || ganador) && <div className="ped__paso lp__ganador" aria-live="polite">{ganador ? <><h3>{ganador.nombre}</h3><p>{ganador.codigo}{ganador.telefono ? ` · ${ganador.telefono}` : ""}</p></> : <h3>{girando}</h3>}</div>}
            <div className="eq-acciones">
              {ganador ? <Confirmar texto="Sortear de nuevo" pregunta="¿Elegir otro ganador al azar?" si="Sí, sortear" onSi={sortear} /> : <button className="btn btn--small" type="button" disabled={Boolean(girando)} onClick={sortear}>Elegir ganador al azar</button>}
              <button type="button" className="pa-accion" onClick={() => setVerLista(v => !v)}>{verLista ? "Ocultar" : "Ver"} los {participantes.length} participantes</button>
            </div>
            {verLista && <ul className="rows">{participantes.map(p => <li key={p.id} className="tie__variante"><span className="rows__main"><strong>{p.nombre}</strong></span><span className="rows__side">{p.codigo}</span></li>)}</ul>}
          </>
        )}
      </Panel>
    </>
  );
}

// ── Tiendas con stand: cupo de boletos, comisiones y misiones extra ──────────
const METODO_EXTRA: Record<string, string> = { pago_movil: "Pago Móvil", crypto: "Binance Pay", efectivo: "Efectivo" };
type Extra = { id: number; tienda: string; cantidad: number; metodo: string; referencia: string | null; comprobanteUrl: string | null; monto: number; estado: string };

function TiendasConStand() {
  const utils = trpc.useUtils();
  const extras = trpc.standTienda.extras.useQuery(undefined, { refetchInterval: 60_000 });
  const tiendas = trpc.standTienda.comisiones.useQuery(undefined, { refetchInterval: 60_000 });
  const refrescar = () => { void utils.standTienda.invalidate(); };
  useStandsSocket(refrescar);
  const revisar = trpc.standTienda.revisarExtra.useMutation({ onSuccess: (_r, v) => { toast.success(v.aprobar ? "Pago aprobado: misiones activadas" : "Pago rechazado"); refrescar(); }, onError: e => toast.error(e.message) });
  const avisar = trpc.standTienda.reenviarAviso.useMutation({ onSuccess: r => toast.success(`Aviso enviado a ${r.email}`), onError: e => toast.error(e.message) });
  const listaExtras = (extras.data ?? []) as unknown as Extra[];
  const pendientes = listaExtras.filter(e => e.estado === "pendiente");
  const lista = (tiendas.data ?? []) as unknown as { id: number; nombre: string; plan: string; planNombre: string; stand: string | null; activa: boolean; vende: boolean; vendidos: number; cupo: number | null; restantes: number; ganancia: number; recaudadoUsd: number; misiones: number; email: string | null }[];
  const vendidos = lista.reduce((s, t) => s + (t.vende ? t.vendidos : 0), 0), comisiones = lista.reduce((s, t) => s + t.ganancia, 0);
  const cobradoExtras = listaExtras.filter(e => e.estado === "aprobado").reduce((s, e) => s + e.monto, 0);
  return (
    <Panel title="Tiendas con stand" lead="Entran solas cuando su stand queda pagado por completo. Gremio y Gran Gremio venden boletos con cupo y ganan $1 por boleto.">
      {pendientes.map(e => (
        <div className="ped__paso" key={e.id}>
          <h3>{e.tienda} pagó {e.cantidad === 1 ? "1 misión extra" : `${e.cantidad} misiones extra`}</h3>
          <p>{dinero(e.monto)} por {METODO_EXTRA[e.metodo] ?? e.metodo}{e.referencia ? <>, referencia <strong>{e.referencia}</strong></> : null}.</p>
          {e.comprobanteUrl && <a className="ped__comprobante" href={e.comprobanteUrl} target="_blank" rel="noreferrer"><img src={e.comprobanteUrl} alt="Comprobante de pago" loading="lazy" /><span>Abrir comprobante</span></a>}
          <div className="eq-acciones"><button className="btn btn--small" type="button" disabled={revisar.isPending} onClick={() => revisar.mutate({ id: e.id, aprobar: true })}>Aprobar y activar</button>
            <Confirmar texto="Rechazar" pregunta="¿Rechazar este pago?" si="Sí, rechazar" disabled={revisar.isPending} onSi={() => revisar.mutate({ id: e.id, aprobar: false })} /></div>
        </div>
      ))}
      <dl className="stats stats--wide"><div><dt>Boletos vendidos</dt><dd>{vendidos}</dd></div><div><dt>Comisiones</dt><dd>{dinero(comisiones)}</dd></div><div><dt>Misiones extra cobradas</dt><dd>{dinero(cobradoExtras)}</dd></div></dl>
      {tiendas.isLoading ? <p className="empty">Cargando…</p> : lista.length === 0 ? <p className="empty">Todavía no hay stands pagados por completo.</p> : (
        <ul className="rows">{lista.map(t => (
          <li key={t.id} className="tie__variante">
            <span className="rows__main"><strong>{t.nombre}</strong>
              <small>{t.planNombre}{t.stand ? ` · stand ${t.stand}` : ""}{t.activa ? "" : " · suspendida"} · {t.vende ? `${t.vendidos} de ${t.cupo} boletos, le quedan ${t.restantes}${t.restantes === 0 ? " (venta cerrada)" : ""} · recaudó ${dinero(t.recaudadoUsd)}` : "no vende boletos"} · {t.misiones} misiones</small>
              {t.vende && t.cupo ? <span className="lp__barra"><i style={{ width: `${Math.min(100, (t.vendidos / t.cupo) * 100)}%` }} /></span> : null}</span>
            <span className="tie__acciones">{t.vende && <span className="rows__side">{dinero(t.ganancia)}</span>}
              {t.email && t.activa ? <button type="button" className="pa-accion" disabled={avisar.isPending} onClick={() => avisar.mutate({ storeId: t.id })}>Avisarle su acceso</button> : !t.email ? <span className="pa-tenue tie__nota">Sin correo: no puede entrar</span> : null}</span>
          </li>))}</ul>
      )}
    </Panel>
  );
}

export { useEvento, ComprasWeb, Boletos, Tipos, Equipo, Codigos, Eventos, PuestaAPunto, LevelPass, DiaDelEvento, TiendasConStand };
export type { Tipo, Orden, Extra };
