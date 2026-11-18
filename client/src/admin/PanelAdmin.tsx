import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";
import { APP } from "@/lib/appActual";
import { Panel } from "./ui";
import Pedidos from "./Pedidos";
import Tienda from "./Tienda";
import Cotizaciones from "./Cotizaciones";
import "@fontsource-variable/saira/wdth.css";
import "@/styles/equipo.css";
import "@/styles/panel.css";

/**
 * Panel de administración, rehecho desde cero con el esqueleto del panel de
 * Arena Panter: barra arriba, pestañas de página y paneles. El mismo código
 * sirve en teléfono y en PC.
 *
 * Se rehace por partes. Lo que ya está nuevo vive aquí; lo que falta abre
 * todavía la pantalla del panel anterior, y se va quitando de esa lista a
 * medida que cada parte queda lista.
 */
type Area = "inicio" | "pedidos" | "tienda" | "cotizaciones" | "fest" | "comunidad" | "web" | "ajustes";
const AREAS: { id: Area; texto: string }[] = [
  { id: "inicio", texto: "Inicio" }, { id: "pedidos", texto: "Pedidos" }, { id: "tienda", texto: "Tienda" },
  { id: "cotizaciones", texto: "Cotizaciones" }, { id: "fest", texto: "World Fest" }, { id: "comunidad", texto: "Comunidad" },
  { id: "web", texto: "Web" }, { id: "ajustes", texto: "Ajustes" },
];

/** Secciones que todavía abren en el panel anterior. «tel» es su nombre en el panel de teléfono (si existía allí) */
type Vieja = { texto: string; detalle: string; pc: string; tel?: string; href?: string };
const POR_REHACER: Partial<Record<Area, Vieja[]>> = {
  pedidos: [{ texto: "Crear un pedido a mano", detalle: "Para ventas por WhatsApp o en persona", pc: "orders", tel: "newOrder" }],
  tienda: [
    { texto: "Imágenes y video", detalle: "Lo que se ve en la portada y las vitrinas", pc: "media", tel: "media" },
    { texto: "Tarjetas de regalo", detalle: "Crear y consultar tarjetas", pc: "giftcards", tel: "giftcards" },
  ],
  fest: [
    { texto: "Tablero del Fest", detalle: "Ventas por tienda, stands disponibles y quién debe saldo", pc: "", href: "/boleteria?v=tablero" },
    { texto: "Boletería", detalle: "Evento, tipos de boleto, códigos, tiendas y puerta", pc: "boleteria", tel: "boleteria" },
    { texto: "Stands", detalle: "Pagos por revisar, saldos y mesas en el plano", pc: "stands", tel: "stands" },
    { texto: "Patrocinantes", detalle: "Marcas que apoyan el evento", pc: "patrocinantes", tel: "patrocinantes" },
    { texto: "Cosplay Guild", detalle: "Solicitudes, evaluaciones y retiros", pc: "cosplay", tel: "cosplay" },
  ],
  comunidad: [
    { texto: "Usuarios", detalle: "Las cuentas registradas", pc: "users", tel: "users" },
    { texto: "Suscriptores", detalle: "Quienes dejaron su correo", pc: "subscribers", tel: "subscribers" },
    { texto: "Campañas", detalle: "Correos a clientes y suscriptores", pc: "campanas", tel: "campanas" },
    { texto: "Sugerencias", detalle: "El buzón de mejoras", pc: "feedback", tel: "feedback" },
  ],
  web: [
    { texto: "Blog", detalle: "Artículos y comentarios", pc: "blog", tel: "blog" },
    { texto: "Preguntas frecuentes", detalle: "Lo que responde la página de ayuda", pc: "faq", tel: "faq" },
    { texto: "Popups", detalle: "Avisos emergentes de la tienda", pc: "popups" },
    { texto: "LinkBio", detalle: "Los enlaces de la bio de Instagram", pc: "linkbio" },
  ],
  ajustes: [
    { texto: "Configuración", detalle: "Tasa del día, datos de la tienda, portada y redes", pc: "settings" },
    { texto: "Pagos y finanzas", detalle: "Movimientos y resumen de lo cobrado", pc: "payments", tel: "finanzas" },
  ],
};

function enlaceViejo(v: Vieja, telefono: boolean) {
  if (v.href) return v.href;
  return telefono && v.tel ? `/admin?clasico=1&tab=${v.tel}` : `/admin?clasico=1&tab=${v.pc}${telefono ? "&pc=1" : ""}`;
}

function PorRehacer({ area, telefono }: { area: Area; telefono: boolean }) {
  const filas = POR_REHACER[area];
  if (!filas?.length) return null;
  return (
    <Panel title={area === "pedidos" ? "Más de pedidos" : area === "tienda" ? "Más de la tienda" : "Secciones"} lead="Esta parte todavía no se rehace: abre la pantalla del panel anterior.">
      <ul className="rows">
        {filas.map(f => (
          <li key={f.texto}>
            <Link href={enlaceViejo(f, telefono)} className="rows__open">
              <span className="rows__main"><strong>{f.texto}</strong><small>{f.detalle}</small></span>
              <ChevronRight size={18} className="rows__side" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Inicio({ ir }: { ir: (a: Area) => void }) {
  const pagos = trpc.orders.pendingPaymentsCount.useQuery(undefined, { refetchInterval: 30_000 });
  const abonos = trpc.orders.abonosPendientes.useQuery(undefined, { refetchInterval: 30_000 });
  const pedidos = trpc.orders.pendingCount.useQuery(undefined, { refetchInterval: 30_000 });
  const cosplay = trpc.cosplay.getApplications.useQuery({ status: "pending" }, { refetchInterval: 60_000 });
  const porRevisar = (pagos.data ?? 0) + ((abonos.data as unknown[] | undefined)?.length ?? 0);
  const solicitudes = (cosplay.data as unknown[] | undefined)?.length ?? 0;
  const nada = !porRevisar && !(pedidos.data ?? 0) && !solicitudes;
  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
  return (
    <>
      <Panel title="Lo que espera por ti">
        {pagos.isLoading ? <p className="empty">Cargando…</p> : nada ? <p className="empty">Todo al día: no hay pagos por revisar ni pedidos sin empezar.</p> : (
          <ul className="rows">
            {porRevisar > 0 && <li><button type="button" className="rows__open" onClick={() => ir("pedidos")}>
              <span className="rows__main"><strong>{plural(porRevisar, "pago por revisar", "pagos por revisar")}</strong><small>Comprobantes y abonos que enviaron los clientes</small></span><ChevronRight size={18} className="rows__side" aria-hidden="true" /></button></li>}
            {(pedidos.data ?? 0) > 0 && <li><button type="button" className="rows__open" onClick={() => ir("pedidos")}>
              <span className="rows__main"><strong>{plural(pedidos.data ?? 0, "pedido recién llegado", "pedidos recién llegados")}</strong><small>Todavía sin empezar a preparar</small></span><ChevronRight size={18} className="rows__side" aria-hidden="true" /></button></li>}
            {solicitudes > 0 && <li><Link href="/admin?clasico=1&tab=cosplay" className="rows__open">
              <span className="rows__main"><strong>{plural(solicitudes, "solicitud del Cosplay Guild", "solicitudes del Cosplay Guild")}</strong><small>Abre en el panel anterior</small></span><ChevronRight size={18} className="rows__side" aria-hidden="true" /></Link></li>}
          </ul>
        )}
      </Panel>
      <Panel title="Panel en construcción" lead="Lo estamos rehaciendo por partes. Ya están nuevos: Pedidos (con sus pagos), Tienda (productos y colecciones) y Cotizaciones. Las demás pestañas abren todavía las pantallas del panel anterior." >
        <p className="pa-tenue">Sigue: World Fest.</p>
      </Panel>
    </>
  );
}

export default function PanelAdmin() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const busqueda = new URLSearchParams(useSearch());
  // Los avisos y los correos enlazan con ?tab=orders&orden=…: eso abre Pedidos con el pedido buscado
  const tabUrl = busqueda.get("tab");
  const [area, setArea] = useState<Area>(tabUrl === "orders" || tabUrl === "payments" ? "pedidos" : tabUrl === "products" || tabUrl === "categories" ? "tienda" : tabUrl === "quotes" ? "cotizaciones" : "inicio");
  const [telefono, setTelefono] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const cambia = () => setTelefono(mq.matches);
    cambia(); mq.addEventListener("change", cambia);
    return () => mq.removeEventListener("change", cambia);
  }, []);
  useEffect(() => { document.title = "Isekai World · Admin"; }, []);
  const esAdmin = isAuthenticated && user?.role === "admin";
  const pagos = trpc.orders.pendingPaymentsCount.useQuery(undefined, { enabled: esAdmin, refetchInterval: 30_000 });
  const pedidos = trpc.orders.pendingCount.useQuery(undefined, { enabled: esAdmin, refetchInterval: 30_000 });
  const pendientes = (pagos.data ?? 0) + (pedidos.data ?? 0);
  const ir = (a: Area) => { setArea(a); window.scrollTo({ top: 0 }); };

  return (
    <div className="eq pa">
      <header className="eq__bar">
        <button type="button" className="eq__brand" onClick={() => ir("inicio")} aria-label="Inicio del panel">
          <img src="/icons/isekai-admin-192.png" alt="" className="pa__marca" />
        </button>
        <span className="eq__title">Panel</span>
        <div className="eq__right">
          {esAdmin && <span className="eq__user">{user?.email}</span>}
          {APP === "web" && <a className="eq__link" href="/">Ver la web</a>}
          {isAuthenticated && <button className="eq__link" type="button" onClick={() => logout()}>Salir</button>}
        </div>
      </header>
      <main className="eq__main pa__main">
        {loading ? <p className="empty">Cargando…</p> : !esAdmin ? (
          <Panel title="Solo para administradores" lead={isAuthenticated ? `Entraste como ${user?.email}, que no es una cuenta de administrador.` : "Entra con tu cuenta de administrador para ver el panel."}>
            {isAuthenticated ? <button className="btn" type="button" onClick={() => logout()}>Salir y usar otra cuenta</button>
              : <button className="btn" type="button" onClick={() => openLoginModal()}>Entrar</button>}
          </Panel>
        ) : (
          <>
            <div className="tabs tabs--page" role="tablist" aria-label="Partes del panel">
              {AREAS.map(a => (
                <button key={a.id} type="button" role="tab" aria-selected={area === a.id} className={area === a.id ? "is-active" : undefined} onClick={() => ir(a.id)}>
                  {a.texto}{a.id === "pedidos" && pendientes > 0 ? <span className="tabs__n tabs__n--hot">{pendientes}</span> : null}
                </button>
              ))}
            </div>
            <div className="pa__cuerpo">
              {area === "inicio" && <Inicio ir={ir} />}
              {area === "pedidos" && <Pedidos buscar={busqueda.get("orden") ?? ""} />}
              {area === "tienda" && <Tienda />}
              {area === "cotizaciones" && <Cotizaciones verPedidos={() => ir("pedidos")} />}
              {area !== "inicio" && <PorRehacer area={area} telefono={telefono} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
