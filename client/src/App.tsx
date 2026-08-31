import { useEffect, useRef, useState, lazy, Suspense } from "react";
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
import Home from "./pages/Home";
const Catalog = lazy(() => import("./pages/Catalog"));
const WorldFest = lazy(() => import("./pages/WorldFest"));
const QuoteView = lazy(() => import("./pages/QuoteView"));
const Invitacion = lazy(() => import("./pages/Invitacion"));
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

function AdminRoute() {
  const isMobile = useIsMobile();
  return isMobile ? <AdminMobile /> : <Admin />;
}
const Nosotros = lazy(() => import("./pages/Nosotros"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Politicas = lazy(() => import("./pages/Politicas"));
const LinkBio = lazy(() => import("./pages/LinkBio"));
const CosplayLanding = lazy(() => import("./pages/CosplayLanding"));
const CosplayApply = lazy(() => import("./pages/CosplayApply"));
const CosplayGuild = lazy(() => import("./pages/CosplayGuild"));
const CosplayProfile = lazy(() => import("./pages/CosplayProfile"));
const CosplayDashboard = lazy(() => import("./pages/CosplayDashboard"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Collections = lazy(() => import("./pages/Collections"));
import { trpc } from "@/lib/trpc";
import { useSocket } from "./hooks/useSocket";

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

function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/catalog" component={Catalog} />
        <Route path="/product/:slug" component={ProductDetail} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/checkout/success" component={CheckoutSuccess} />
        <Route path="/account" component={Account} />
        <Route path="/admin" component={AdminRoute} />
        <Route path="/nosotros" component={Nosotros} />
        <Route path="/faq" component={FAQ} />
        <Route path="/politicas" component={Politicas} />
        <Route path="/world-fest" component={WorldFest} />
        <Route path="/cotizacion/:token" component={QuoteView} />
        {/* Invitación por QR: intencionalmente fuera del menú y del sitemap */}
        <Route path="/invitacion" component={Invitacion} />
        {/* Portal de tiendas: el QR del boleto apunta a /vender/TOKEN */}
        <Route path="/vender/:token" component={StorePortal} />
        <Route path="/vender" component={StorePortal} />
        {/* Control de acceso: pantalla del portero */}
        <Route path="/acceso" component={GateControl} />
        {/* Buzón de mejoras del Guild */}
        <Route path="/guild/mejoras" component={GuildFeedback} />
        {/* Zona del evento: espacio propio, fuera de la tienda */}
        <Route path="/worldfest/pass" component={WorldFestPass} />
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
    location.startsWith("/invitacion") ||
    location.startsWith("/guild/mejoras") ||
    location.startsWith("/worldfest/pass") ||
    location.startsWith("/vender") ||
    location.startsWith("/acceso");

  /**
   * Pantallas que funcionan como app (paneles con su propia barra inferior):
   * no llevan footer ni burbuja de Instagram, porque estorban a la barra fija
   * y no aportan nada dentro de un panel privado.
   */
  const esPanelApp =
    isAdmin ||
    location.startsWith("/cosplay/dashboard") ||
    location.startsWith("/account") ||
    location.startsWith("/cotizacion/") ||
    location.startsWith("/invitacion") ||
    location.startsWith("/vender") ||
    location.startsWith("/acceso") ||
    location.startsWith("/guild/mejoras") ||
    location.startsWith("/worldfest/pass");

  return (
    <>
      <ScrollToTop />
      <WelcomeToastHandler />
      {!esPaginaSola && <Navbar />}
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

function AppRoot() {
  const [location] = useLocation();
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
