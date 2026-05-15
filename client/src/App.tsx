import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LangProvider } from "./i18n/LangContext";
import { CartProvider } from "./contexts/CartContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import NewsletterPopup from "./components/NewsletterPopup";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Nosotros from "./pages/Nosotros";
import FAQ from "./pages/FAQ";
import Politicas from "./pages/Politicas";

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
      <Navbar />
      <main className="min-h-screen">
        <Router />
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <NewsletterPopup />}
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
