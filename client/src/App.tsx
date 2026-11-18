import { useEffect, useRef, useState, lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LangProvider } from "./i18n/LangContext";
import { CartProvider } from "./contexts/CartContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import AuthDialog from "./components/AuthDialog";
import { InstagramChat } from "./components/InstagramChat";
import { PopupManager } from "./components/PopupManager";
// La tienda se carga al visitarla: la portada es la del evento
const Home = lazy(() => import("./pages/Home"));
const Catalog = lazy(() => import("./pages/Catalog"));
const QuoteView = lazy(() => import("./pages/QuoteView"));
const Invitacion = lazy(() => import("./pages/Invitacion"));
import PantallaCarga from "@/components/PantallaCarga";
import AccesoRapido from "@/components/AccesoRapido";
import InstalarApp from "@/components/InstalarApp";
import InsigniaApp from "@/components/InsigniaApp";
const HomeEvento = lazy(() => import("./pages/HomeEvento"));
const Jefe3DPrueba = lazy(() => import("./pages/Jefe3DPrueba"));
const KoiEnVivo = lazy(() => import("./pages/KoiEnVivo"));
const StorePortal = lazy(() => import("./pages/StorePortal"));
const GateControl = lazy(() => import("./pages/GateControl"));
const GuildFeedback = lazy(() => import("./pages/GuildFeedback"));
const WorldFestPass = lazy(() => import("./pages/WorldFestPass"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Account = lazy(() => import("./pages/Account"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminMobile = lazy(() => import("./pages/AdminMobile"));
const PanelAdmin = lazy(() => import("./admin/PanelAdmin"));
import "@/styles/panel-volver.css";

/** Decide entre el panel de escritorio y el de teléfono.
    Antes se leía window.innerWidth una sola vez, así que al girar el
    teléfono o cambiar el tamaño de la ventana se quedaba en la versión
    equivocada hasta recargar. */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return isMobile;
}

/**
 * El panel de administración se está rehaciendo por partes (PanelAdmin).
 * Lo que aún no se rehace abre la pantalla del panel anterior con
 * «?clasico=1&tab=…»; también los enlaces viejos a secciones que el panel
 * nuevo todavía no tiene. Cuando una parte queda lista, sale de aquí.
 */
const PARTES_NUEVAS = ["orders", "payments", "products", "categories"];
function AdminRoute() {
  const isMobile = useIsMobile();
  const busqueda = useSearch();
  const q = new URLSearchParams(busqueda);
  const tab = q.get("tab");
  const pideClasico = q.get("clasico") === "1" || (tab !== null && !PARTES_NUEVAS.includes(tab));
  // El panel anterior limpia la dirección al abrir: una vez dentro, se queda
  // en él hasta que se toca «Panel nuevo» (que recarga la página)
  const [clasico, setClasico] = useState(pideClasico);
  const [enPc] = useState(q.get("pc") === "1");
  useEffect(() => { if (pideClasico) setClasico(true); }, [pideClasico]);
  if (!clasico && !pideClasico) return <PanelAdmin />;
  return (
    <>
      {isMobile && !enPc ? <AdminMobile /> : <Admin />}
      <a className="pa-volver" href="/admin">Panel nuevo</a>
    </>
  );
}
const Nosotros = lazy(() => import("./pages/Nosotros"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Politicas = lazy(() => import("./pages/Politicas"));
const LinkBio = lazy(() => import("./pages/LinkBio"));
const CosplayLanding = lazy(() => import("./pages/CosplayLanding"));
const RuedaPrensa = lazy(() => import("./pages/RuedaPrensa"));
const Stands = lazy(() => import("./pages/Stands"));
const StaffRueda = lazy(() => import("./pages/StaffRueda"));
const Boleteria = lazy(() => import("./pages/Boleteria"));
const EquipoApp = lazy(() => import("./equipo/EquipoApp"));
const PuertaApp = lazy(() => import("./equipo/Bienvenida"));
const MisionesTienda = lazy(() => import("./pages/MisionesTienda"));
const ComprarBoletos = lazy(() => import("./pages/ComprarBoletos"));
const MiBoleto = lazy(() => import("./pages/MiBoleto"));
const CosplayApply = lazy(() => import("./pages/CosplayApply"));
const CosplayGuild = lazy(() => import("./pages/CosplayGuild"));
const CosplayProfile = lazy(() => import("./pages/CosplayProfile"));
const CosplayDashboard = lazy(() => import("./pages/CosplayDashboard"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Collections = lazy(() => import("./pages/Collections"));
import { trpc } from "@/lib/trpc";
import { useSocket } from "./hooks/useSocket";
import { APP, ES_APP } from "@/lib/appActual";
import { useApps } from "@/lib/appsAparte";
import { useAuth } from "@/_core/hooks/useAuth";

function WelcomeToastHandler() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const handled = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("welcome") !== "1") return;
    navigate("/", { replace: true });
    sessionStorage.setItem("_isekai_welcome", "1");
    utils.auth.me.invalidate();
  }, [search]);

  useEffect(() => {
    if (isLoading) return;
    if (!sessionStorage.getItem("_isekai_welcome")) return;
    if (handled.current) return;
    handled.current = true;
    sessionStorage.removeItem("_isekai_welcome");
    const first = user?.name?.split(" ")[0];
    toast.success(first ? `¡Bienvenido, ${first}!` : "¡Bienvenido de vuelta!");
  }, [isLoading, user]);

  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location]);
  return null;
}

/**
 * En la web, las pantallas de trabajo ya no se abren: cada una vive en su app.
 * La dirección vieja (un enlace guardado, un correo antiguo) lleva a la misma
 * pantalla dentro de la app, donde se entra con el correo.
 *
 * Solo aplica cuando esa app ya responde en su dirección. Mientras no lo haga,
 * la pantalla se abre aquí como siempre, para que nadie se quede sin entrada.
 *
 *   de="equipo"  → app del Equipo
 *   de="admin"   → app de Admin
 *   de="gestion" → pantallas del administrador que también están en la del Equipo
 */
function SoloEnSuApp({ de, publico, children }: { de: "equipo" | "admin" | "gestion"; publico?: boolean; children: ReactNode }) {
  const apps = useApps();
  const destino = de === "admin" ? apps.admin : de === "gestion" ? apps.admin ?? apps.equipo : apps.equipo;

  /* El QR impreso en cada boleto apunta a la web (/vender/CÓDIGO). Si lo abre
     el comprador con su cámara, sigue a su Level Pass aquí mismo; solo quien
     es del equipo pasa a la app. */
  const { isAuthenticated, loading } = useAuth();
  const { data: acceso, isLoading: viendoRol } = trpc.tickets.miAcceso.useQuery(undefined, { enabled: Boolean(publico && destino && isAuthenticated), retry: false });
  const esDelEquipo = Boolean(acceso?.esTienda || acceso?.esStaff || acceso?.rol === "admin");
  const decidiendo = apps.cargando || Boolean(publico && destino && (loading || (isAuthenticated && viendoRol)));
  const mudar = Boolean(destino) && !decidiendo && (!publico || esDelEquipo);

  useEffect(() => {
    if (mudar && destino) window.location.replace(`${destino}${window.location.pathname}${window.location.search}`);
  }, [mudar, destino]);

  if (decidiendo || mudar) return <div className="min-h-screen bg-black" />;
  return <>{children}</>;
}
/** La Boletería en la web: la gestión (?v=) es del administrador, el resto del Equipo */
function BoleteriaEnWeb() {
  const v = new URLSearchParams(useSearch()).get("v");
  const deAdmin = v === "admin" || v === "stands" || v === "tablero";
  return <SoloEnSuApp de={deAdmin ? "gestion" : "equipo"}><Boleteria /></SoloEnSuApp>;
}

function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Switch>
        {/* El evento es la portada; la tienda vive en /tienda. La antigua
            página de World Fest desaparece: su contenido está ahora en la
            portada, así que su dirección lleva allí para no romper enlaces
            ya compartidos. */}
        <Route path="/" component={HomeEvento} />
        <Route path="/evento" component={HomeEvento} />
        {/* Enlace para compartir: abre el home directo en el mapa del evento */}
        <Route path="/mapa" component={HomeEvento} />
        {/* La propuesta ya es la portada: los enlaces viejos llevan allí */}
        <Route path="/propuesta">{() => { window.location.replace("/"); return null; }}</Route>
        {/* La vista previa del rediseño ya es la portada: los enlaces viejos
            a /fest-preview llevan a la portada */}
        <Route path="/fest-preview">{() => { window.location.replace("/"); return null; }}</Route>
        <Route path="/jefe-3d" component={Jefe3DPrueba} />
        <Route path="/koi-live" component={KoiEnVivo} />
        <Route path="/tienda" component={Home} />
        <Route path="/world-fest">{() => { window.location.replace("/"); return null; }}</Route>
        <Route path="/catalog" component={Catalog} />
        <Route path="/product/:slug" component={ProductDetail} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/checkout/success" component={CheckoutSuccess} />
        <Route path="/account" component={Account} />
        {/* El panel vive en admin.isekaiworld.co */}
        <Route path="/admin">{() => <SoloEnSuApp de="admin"><AdminRoute /></SoloEnSuApp>}</Route>
        <Route path="/nosotros" component={Nosotros} />
        <Route path="/faq" component={FAQ} />
        <Route path="/politicas" component={Politicas} />
        <Route path="/cotizacion/:token" component={QuoteView} />
        {/* Invitación por QR: intencionalmente fuera del menú y del sitemap */}
        <Route path="/invitacion" component={Invitacion} />
        {/* Portal de tiendas: el QR del boleto apunta a /vender/TOKEN */}
        <Route path="/vender/:token">{() => <SoloEnSuApp de="equipo" publico><StorePortal /></SoloEnSuApp>}</Route>
        <Route path="/vender">{() => <SoloEnSuApp de="equipo"><StorePortal /></SoloEnSuApp>}</Route>
        {/* Control de acceso: pantalla del portero */}
        <Route path="/acceso">{() => <SoloEnSuApp de="equipo"><GateControl /></SoloEnSuApp>}</Route>
        {/* Buzón de mejoras del Guild */}
        <Route path="/guild/mejoras" component={GuildFeedback} />
        {/* Zona del evento: espacio propio, fuera de la tienda */}
        <Route path="/worldfest/pass" component={WorldFestPass} />
        {/* Invitación a la rueda de negocios del World Fest */}
        <Route path="/rueda-de-negocios" component={RuedaPrensa} />
        <Route path="/stands" component={Stands} />
        <Route path="/boletos" component={ComprarBoletos} />
        <Route path="/boleto/:token" component={MiBoleto} />
        <Route path="/staff/rueda">{() => <SoloEnSuApp de="equipo"><StaffRueda /></SoloEnSuApp>}</Route>
        <Route path="/boleteria/misiones">{() => <SoloEnSuApp de="equipo"><MisionesTienda /></SoloEnSuApp>}</Route>
        <Route path="/boleteria" component={BoleteriaEnWeb} />
        {/* La app del Equipo vive en equipo.isekaiworld.co. Aquí solo se ve
            mientras esa dirección no funcione */}
        <Route path="/equipo">{() => <SoloEnSuApp de="equipo"><EquipoApp /></SoloEnSuApp>}</Route>
        {/* Enlace anterior: las invitaciones ya entregadas lo siguen usando */}
        <Route path="/rueda-de-prensa" component={RuedaPrensa} />
        <Route path="/cosplay" component={CosplayLanding} />
        <Route path="/cosplay/apply" component={CosplayApply} />
        <Route path="/cosplay/guild" component={CosplayGuild} />
        <Route path="/cosplay/guild/:username" component={CosplayProfile} />
        <Route path="/cosplay/dashboard" component={CosplayDashboard} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/collections" component={Collections} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function Layout() {
  useSocket(); // inicializar conexión global al autenticarse
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  /**
   * Página en blanco: la invitación por QR va sola, sin navegación ni pie.
   * Quien llega ahí fue invitado a leer algo concreto, y cualquier elemento
   * del sitio alrededor le resta fuerza y lo saca del momento.
   */
  /** Páginas sin navbar: viven solas, se llega a ellas por enlace directo */
  const esPaginaSola =
    location.startsWith("/jefe-3d") ||
    location.startsWith("/koi-live") ||
    location.startsWith("/invitacion") ||
    location.startsWith("/rueda-de-prensa") ||
    location.startsWith("/rueda-de-negocios") ||
    location.startsWith("/stands") ||
    location.startsWith("/boletos") ||
    location.startsWith("/boleto/") ||
    location.startsWith("/guild/mejoras") ||
    location.startsWith("/worldfest/pass") ||
    location.startsWith("/vender") ||
    location.startsWith("/staff/") ||
    location.startsWith("/equipo") ||
    location.startsWith("/boleteria") ||
    location.startsWith("/acceso");

  const esPortadaFest = location === "/" || location === "/evento" || location === "/mapa";

  /**
   * Pantallas que funcionan como app (paneles con su propia barra inferior):
   * no llevan footer ni burbuja de Instagram, porque estorban a la barra fija
   * y no aportan nada dentro de un panel privado.
   */
  const esPanelApp =
    isAdmin ||
    location.startsWith("/rueda-de-prensa") ||
    location.startsWith("/rueda-de-negocios") ||
    location.startsWith("/stands") ||
    location.startsWith("/boletos") ||
    location.startsWith("/boleto/") ||
    location.startsWith("/cosplay/dashboard") ||
    location.startsWith("/account") ||
    location.startsWith("/cotizacion/") ||
    location.startsWith("/invitacion") ||
    location.startsWith("/vender") ||
    location.startsWith("/acceso") ||
    location.startsWith("/staff/") ||
    location.startsWith("/equipo") ||
    location.startsWith("/boleteria") ||
    location.startsWith("/guild/mejoras") ||
    location.startsWith("/worldfest/pass");

  return (
    <>
      <PantallaCarga />
      <AccesoRapido />
      <InstalarApp />
      <InsigniaApp />
      <ScrollToTop />
      <WelcomeToastHandler />
      {/* La portada del Fest trae su propia cabecera */}
      {!esPaginaSola && !esPortadaFest && <Navbar />}
      <main className="min-h-screen">
        <Router />
      </main>
      {!esPanelApp && <Footer />}
      {!isAdmin && !esPaginaSola && location !== '/links' && <PopupManager />}
      {!esPanelApp && <InstagramChat />}
      <AuthDialog />
    </>
  );
}

/**
 * Apps aparte (equipo.… y admin.…): mismas pantallas y mismo servidor, pero
 * sin la web alrededor. Solo existen las rutas de esa app; cualquier otra
 * dirección vuelve a su inicio, así nadie llega a la tienda ni al home desde
 * aquí.
 */
function VolverAlInicio() {
  const [ubicacion, ir] = useLocation();
  useEffect(() => {
    // El administrador sí necesita ver la web (un producto, una página): se
    // abre en su dirección de siempre. El Equipo vuelve a su inicio.
    if (APP === "admin") window.location.replace(`https://www.isekaiworld.co${ubicacion}${window.location.search}`);
    else ir("/", { replace: true });
  }, [ubicacion, ir]);
  return null;
}
/** En la app del Equipo, /boleteria es su inicio; la gestión (?v=) es del administrador */
function BoleteriaDeApp() {
  const v = new URLSearchParams(useSearch()).get("v");
  return v === "admin" || v === "stands" || v === "tablero" ? <Boleteria /> : <EquipoApp />;
}
function LayoutApp() {
  useSocket();
  const [location] = useLocation();
  useEffect(() => { document.title = APP === "admin" ? "Isekai World · Admin" : "Isekai World · Equipo"; }, [location]);
  const { user } = useAuth();
  // La piel de la app no se le pone al panel de administración (tiene la suya)
  const enAdmin = APP === "admin" && user?.role === "admin" && (location === "/" || location.startsWith("/admin"));
  return (
    <>
      <ScrollToTop />
      <WelcomeToastHandler />
      <InstalarApp />
      <main className={`min-h-screen ${enAdmin ? "" : "eq-piel"}`}>
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
          {/* Nada de la app se ve sin pasar por la puerta: correo con rol y clave, o Face ID / huella */}
          <PuertaApp app={APP === "admin" ? "admin" : "equipo"}>
          <Switch>
            <Route path="/">{() => (APP === "admin" ? <AdminRoute /> : <EquipoApp />)}</Route>
            {APP === "admin" && <Route path="/admin" component={AdminRoute} />}
            <Route path="/equipo" component={EquipoApp} />
            <Route path="/boleteria/misiones" component={MisionesTienda} />
            <Route path="/boleteria" component={BoleteriaDeApp} />
            <Route path="/vender/:token" component={StorePortal} />
            <Route path="/vender" component={StorePortal} />
            <Route path="/acceso" component={GateControl} />
            <Route path="/staff/rueda" component={StaffRueda} />
            <Route component={VolverAlInicio} />
          </Switch>
          </PuertaApp>
        </Suspense>
      </main>
      <AuthDialog />
    </>
  );
}

function AppRoot() {
  const [location] = useLocation();
  if (ES_APP) return <LayoutApp />;
  if (location.startsWith("/links")) return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <LinkBio />
    </Suspense>
  );
  return <Layout />;
}

function App() {
  return (
    <ErrorBoundary>
      <LangProvider>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <CartProvider>
            <Toaster />
            <AppRoot />
          </CartProvider>
        </TooltipProvider>
      </ThemeProvider>
      </LangProvider>
    </ErrorBoundary>
  );
}

export default App;
