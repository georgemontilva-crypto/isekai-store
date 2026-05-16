import { useEffect, useRef } from "react";
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
import NewsletterPopup from "./components/NewsletterPopup";
import AuthDialog from "./components/AuthDialog";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Nosotros from "./pages/Nosotros";
import FAQ from "./pages/FAQ";
import Politicas from "./pages/Politicas";
import { trpc } from "@/lib/trpc";

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/catalog" component={Catalog} />
      <Route path="/product/:slug" component={ProductDetail} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/account" component={Account} />
      <Route path="/admin" component={Admin} />
      <Route path="/nosotros" component={Nosotros} />
      <Route path="/faq" component={FAQ} />
      <Route path="/politicas" component={Politicas} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Layout() {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  return (
    <>
      <WelcomeToastHandler />
      <Navbar />
      <main className="min-h-screen">
        <Router />
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <NewsletterPopup />}
      <AuthDialog />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LangProvider>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <CartProvider>
            <Toaster />
            <Layout />
          </CartProvider>
        </TooltipProvider>
      </ThemeProvider>
      </LangProvider>
    </ErrorBoundary>
  );
}

export default App;
