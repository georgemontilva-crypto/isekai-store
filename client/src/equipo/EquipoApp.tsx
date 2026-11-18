import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight, Gift, Handshake, Receipt, ScanLine, Settings2, Store, Swords, Ticket, Zap, type LucideIcon } from "lucide-react";
import "@fontsource-variable/saira/wdth.css";
import "@/styles/equipo.css";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePortales } from "@/hooks/usePortales";
import { trpc } from "@/lib/trpc";
import { APP } from "@/lib/appActual";
import EquipoNav, { INICIO_EQUIPO } from "./EquipoNav";

/**
 * App del Equipo: la entrada de las tiendas y del personal del evento.
 * Cada persona ve únicamente lo de su rol:
 *
 *   tienda con stand → su tarjeta con lo ganado, su cupo, sus ventas y misiones
 *   tienda           → vender, canjear bonos y sus ventas
 *   puerta           → escanear y confirmar boletos
 *   estación         → dar EXP
 *
 * Esqueleto y piezas tomados de la cuenta del cliente de Arena Panter, en
 * magenta. No enlaza a la web pública.
 */
const dinero = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const fecha = new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" });

function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && <header className="panel__head">{title && <h2>{title}</h2>}{action}</header>}
      {children}
    </section>
  );
}

/** Marco de la app: barra de arriba con la marca, el título y «Salir» */
export function MarcoEquipo({ titulo = "Equipo", children }: { titulo?: string; children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { data: ajustes } = trpc.settings.getAll.useQuery();
  const logo = ajustes?.["store_logo_url"];
  return (
    <div className="eq">
      <header className="eq__bar">
        <Link href={INICIO_EQUIPO} className="eq__brand" aria-label="Inicio de la app">
          {logo ? <img src={logo} alt="Isekai World" className="eq__logo" /> : <span className="eq__marca">Isekai <b>World</b></span>}
        </Link>
        <span className="eq__title">{titulo}</span>
        <div className="eq__right">
          {isAuthenticated && <span className="eq__user">{user?.email}</span>}
          {isAuthenticated && <button className="eq__link" type="button" onClick={() => logout()}>Salir</button>}
        </div>
      </header>
      <main className="eq__main">{children}</main>
    </div>
  );
}

// ── Entrar: un enlace al correo, sin contraseña ──
function Entrar() {
  const [correo, setCorreo] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "enviado" | "error">("");
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!correo.trim()) return;
    setEstado("enviando");
    try {
      const r = await fetch("/api/auth/magic-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: correo.trim() }) });
      setEstado(r.ok ? "enviado" : "error");
    } catch { setEstado("error"); }
  };
  return (
    <div className="auth">
      <div className="auth__intro">
        <h1>Equipo <b>Isekai</b></h1>
        <p>La app de las tiendas y del personal del Isekai World Fest. Entra con el correo que le diste al organizador y verás solo lo que te toca.</p>
      </div>
      <Panel title="Entrar">
        {estado === "enviado" ? (
          <>
            <p className="notice notice--ok" role="status">Te enviamos un enlace a <strong>{correo.trim()}</strong>. Ábrelo en este mismo teléfono para entrar. Vence en 15 minutos.</p>
            <p className="auth__other"><button className="eq__link" type="button" onClick={() => setEstado("")}>Usar otro correo</button></p>
          </>
        ) : (
          <form className="form" onSubmit={enviar}>
            <label className="field">
              <span className="field__label">Tu correo</span>
              <input value={correo} onChange={e => setCorreo(e.target.value)} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="nombre@correo.com" required />
              <span className="field__hint">Sin contraseña: te llega un enlace para entrar.</span>
            </label>
            {estado === "error" && <p className="notice" role="alert">No pudimos enviar el correo. Revisa tu conexión e intenta otra vez.</p>}
            <button className="btn" type="submit" disabled={estado === "enviando"}>{estado === "enviando" ? "Enviando…" : "Enviarme el enlace"}</button>
          </form>
        )}
      </Panel>
    </div>
  );
}

type Fila = { clave: string; href: string; texto: string; detalle: string; icono: LucideIcon };
function Herramientas({ titulo, filas }: { titulo: string; filas: Fila[] }) {
  if (!filas.length) return null;
  return (
    <Panel title={titulo}>
      <ul className="rows">
        {filas.map(f => (
          <li key={f.clave}>
            <Link href={f.href}>
              <span className="rows__icon"><f.icono strokeWidth={1.7} aria-hidden="true" /></span>
              <span className="rows__main"><strong>{f.texto}</strong><small>{f.detalle}</small></span>
              <ChevronRight size={18} className="rows__side" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Inicio() {
  const { user } = useAuth();
  const { roles, esAdmin, planStand, cargando } = usePortales();
  const tiene = (c: string) => roles.some(r => r.clave === c);
  const vende = tiene("vender"), puerta = tiene("acceso"), exp = tiene("xp"), misiones = tiene("misiones"), rueda = tiene("rueda");
  const { data: ajustes } = trpc.settings.getAll.useQuery();
  const logo = ajustes?.["store_logo_url"];
  const { data: panel } = trpc.standTienda.miPanel.useQuery(undefined, { enabled: Boolean(planStand), refetchInterval: 30_000 });
  const { data: tienda } = trpc.tickets.miTienda.useQuery(undefined, { enabled: vende });
  const { data: eventos = [] } = trpc.tickets.eventosActivos.useQuery(undefined, { enabled: vende });
  const evento = (eventos as any[])[0];
  const { data: ventas } = trpc.tickets.misVentas.useQuery({ eventId: evento?.id ?? 0 }, { enabled: vende && Boolean(evento), refetchInterval: 30_000 });

  if (cargando) return <p className="empty">Cargando tu acceso…</p>;

  const sinNada = !esAdmin && !vende && !puerta && !exp && !misiones && !rueda;
  if (sinNada) {
    return (
      <Panel title="Tu cuenta no tiene acceso">
        <p className="panel__lead">Entraste como <strong style={{ color: "var(--bone)" }}>{user?.email}</strong>, y ese correo no está en el equipo del evento. Pídele al organizador que te agregue con este mismo correo, o sal y entra con el correcto.</p>
      </Panel>
    );
  }

  const c = panel?.cupo, m = panel?.misiones;
  const nombre = m?.tienda || (tienda as any)?.name || (user?.name ?? "").split(" ")[0] || "Equipo";
  const rol = c ? `Stand ${c.planNombre}` : vende ? "Punto de venta" : puerta ? "Control de acceso" : exp ? "Estación de experiencia" : rueda ? "Rueda de negocios" : "Organización";
  const pct = c?.cupo ? Math.min(100, Math.round((c.vendidos / c.cupo) * 100)) : 0;
  const ultimas = ((ventas?.boletos ?? []) as any[]).slice(0, 5);

  const principal = vende && !c?.agotado
    ? { href: "/vender?modo=vender", texto: "Vender un boleto", icono: Ticket }
    : puerta ? { href: "/acceso", texto: "Escanear y confirmar boletos", icono: ScanLine }
    : exp ? { href: "/vender?modo=xp", texto: "Dar EXP", icono: Zap } : null;

  const venta: Fila[] = vende ? [
    { clave: "bonos", href: "/vender?modo=bonos", texto: "Canjear bonos", detalle: "Descuenta los bonos de consumo de un boleto", icono: Gift },
    { clave: "ventas", href: "/vender?modo=ventas", texto: "Mis ventas", detalle: "Todo lo que llevas vendido y cuánto suma", icono: Receipt },
  ] : [];
  const evt: Fila[] = [
    puerta && principal?.href !== "/acceso" && { clave: "acceso", href: "/acceso", texto: "Control de acceso", detalle: "Escanea y confirma la entrada en la puerta", icono: ScanLine },
    exp && principal?.href !== "/vender?modo=xp" && { clave: "xp", href: "/vender?modo=xp", texto: "Dar EXP", detalle: "Escanea boletos en tu estación", icono: Zap },
    misiones && { clave: "misiones", href: "/boleteria/misiones", texto: "Mis misiones", detalle: "Las misiones de tu stand en el Level Pass", icono: Swords },
    rueda && { clave: "rueda", href: "/staff/rueda", texto: "Rueda de negocios", detalle: "Marca qué tiendas llegaron", icono: Handshake },
  ].filter(Boolean) as Fila[];
  const admin: Fila[] = esAdmin ? [
    { clave: "gestion", href: "/boleteria?v=admin", texto: "Gestión de boletería", detalle: "Evento, códigos, ventas, tiendas y puerta", icono: Settings2 },
    { clave: "stands", href: "/boleteria?v=stands", texto: "Stands del Fest", detalle: "Pagos por revisar, saldos y mesas", icono: Store },
  ] : [];

  return (
    <div className="wallet">
      <EquipoNav />
      <div className="wallet__top">
        <div className="wallet__card">
          <div className="mcard">
            <div className="mcard__brand">
              {logo ? <img src={logo} alt="" className="mcard__logo" /> : <span className="mcard__word">Isekai World</span>}
              {c?.vende && (
                <p className="mcard__balance">
                  <span className="mcard__balance-label">Tu ganancia</span>
                  <span className="mcard__balance-value">{c.ganancia} <small>USD</small></span>
                </p>
              )}
            </div>
            <div className="mcard__who">
              <span className="mcard__level">{rol}</span>
              <span className="mcard__name">{nombre}</span>
              <span className="mcard__code">{user?.email}</span>
            </div>
            {vende && ventas && (
              <p className="mcard__dato"><strong>{c?.vende ? c.vendidos : ventas.cantidad}</strong><span>{(c?.vende ? c.vendidos : ventas.cantidad) === 1 ? "boleto vendido" : "boletos vendidos"}</span></p>
            )}
          </div>
          {principal && (
            <Link href={principal.href} className="btn btn--wide"><principal.icono strokeWidth={2} aria-hidden="true" /> {principal.texto}</Link>
          )}
          {c?.agotado && <p className="notice notice--ok" role="status">Vendiste tus {c.cupo} boletos: tu punto de venta ya cerró. ¡Gracias!</p>}
          {principal?.href === "/acceso" && <p className="wallet__hint">Apunta la cámara al QR del boleto. La app te dice si entra o no, y por qué.</p>}
        </div>

        <div className="wallet__side">
          {c?.vende && (
            <Panel className="loyalty">
              <p className="loyalty__count"><strong>{c.restantes}</strong> {c.restantes === 1 ? "boleto te queda" : "boletos te quedan"}</p>
              <div className="loyalty__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Boletos vendidos de tu cupo"><span style={{ width: `${pct}%` }} /></div>
              <p className="loyalty__next">Llevas {c.vendidos} de {c.cupo}. Ganas {dinero(c.comisionPorBoleto)} por cada uno, hasta {dinero(c.gananciaMaxima)}. Al llegar a cero, la venta se cierra sola.</p>
            </Panel>
          )}
          {vende && !c?.vende && ventas && (
            <Panel title="Tus ventas">
              <dl className="stats">
                <div><dt>Boletos</dt><dd>{ventas.cantidad}</dd></div>
                <div><dt>En dólares</dt><dd>{dinero(ventas.totalUsd)}</dd></div>
                {ventas.totalBs > 0 && <div><dt>En bolívares</dt><dd>{ventas.totalBs.toLocaleString("es-VE")}</dd></div>}
              </dl>
            </Panel>
          )}
          {m && (
            <Panel title="Misiones de tu stand" action={<Link href="/boleteria/misiones" className="eq__link">{m.libres > 0 ? "Escribirlas" : "Verlas"}</Link>}>
              <p className="panel__lead">Tienes {m.usadas} de {m.cupo} {m.cupo === 1 ? "misión puesta" : "misiones puestas"} en el Level Pass.{m.libres > 0 ? ` Te falta escribir ${m.libres}. Una vez guardada, no se puede cambiar.` : ""}</p>
            </Panel>
          )}
          {c && !c.vende && (
            <Panel title="Tu plan">
              <p className="panel__lead">Tu stand {c.planNombre} incluye {m?.incluidas ?? 1} misión en el Level Pass. La venta de boletos es para los stands Gremio y Gran Gremio.</p>
            </Panel>
          )}
        </div>
      </div>

      {vende && (
        <Panel title="Últimas ventas" action={ultimas.length > 0 ? <Link href="/vender?modo=ventas" className="eq__link">Ver todas</Link> : undefined}>
          {ultimas.length === 0 ? (
            <p className="empty">Todavía no has vendido boletos. Tu primera venta aparecerá aquí.</p>
          ) : (
            <ul className="moves">
              {ultimas.map((b: any) => (
                <li key={b.id}>
                  <span className="moves__what">
                    {[b.buyerName, b.buyerLastName].filter(Boolean).join(" ") || "Comprador sin nombre"}
                    <small>{b.tipoNombre ?? "Boleto"}{b.soldAt ? `, ${fecha.format(new Date(b.soldAt))}` : ""}{b.cashea ? ", con Cashea" : ""}</small>
                  </span>
                  <span className="moves__amount">{dinero(parseFloat(b.priceUsd ?? "0") || 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Herramientas titulo="Venta" filas={venta} />
      <Herramientas titulo="Durante el evento" filas={evt} />
      <Herramientas titulo="Administración" filas={admin} />
    </div>
  );
}

export default function EquipoApp() {
  const { isAuthenticated, loading } = useAuth();
  return (
    <MarcoEquipo titulo={APP === "admin" ? "Boletería" : "Equipo"}>
      {loading ? <p className="empty">Cargando…</p> : !isAuthenticated ? <Entrar /> : <Inicio />}
    </MarcoEquipo>
  );
}
