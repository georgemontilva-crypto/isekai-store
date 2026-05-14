import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Menu, X, User, LogOut, LayoutDashboard, Package,
  ChevronDown, Search, Zap, Tag, Gift
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";

const navLinks = [
  { href: "/", label: "Inicio" },
  {
    href: "/catalog",
    label: "Tienda",
    children: [
      { href: "/catalog", label: "Todos los productos", icon: Tag },
      { href: "/catalog?featured=true", label: "Destacados", icon: Zap },
      { href: "/catalog?new=true", label: "Novedades", icon: Gift },
    ],
  },
  { href: "/catalog", label: "Colecciones" },
];

const announcements = [
  "🎌 Envío gratis en pedidos mayores a $50",
  "⚡ Nueva colección disponible — ¡Descúbrela ahora!",
  "🎮 Hasta 30% de descuento en productos seleccionados",
];

export default function Navbar() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [megaMenuOpen, setMegaMenuOpen] = useState<string | null>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const { openCart, totalItems } = useCart();
  const { data: categories } = trpc.categories.list.useQuery();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementIdx((i) => (i + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/catalog?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      {/* ─── Announcement Bar ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {announcementVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-50 bg-primary text-primary-foreground text-xs font-medium overflow-hidden"
          >
            <div className="container flex items-center justify-between py-2">
              <div className="flex-1 text-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={announcementIdx}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="block"
                  >
                    {announcements[announcementIdx]}
                  </motion.span>
                </AnimatePresence>
              </div>
              <button
                onClick={() => setAnnouncementVisible(false)}
                className="ml-4 opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Header ──────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className={`sticky top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "glass border-b border-border/50 shadow-lg shadow-black/20" : "bg-background/95 backdrop-blur-md border-b border-border/30"
        }`}
      >
        <div className="container">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link href="/">
              <motion.div
                className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center neon-glow-purple">
                  <span className="text-primary-foreground font-black text-sm font-display">IS</span>
                </div>
                <span className="font-bold text-lg tracking-tight font-display hidden sm:block">
                  <span className="gradient-text">Isekai</span>
                  <span className="text-foreground"> Store</span>
                </span>
              </motion.div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {navLinks.map((link) =>
                link.children ? (
                  <div
                    key={link.href}
                    className="relative"
                    onMouseEnter={() => setMegaMenuOpen(link.label)}
                    onMouseLeave={() => setMegaMenuOpen(null)}
                  >
                    <button
                      className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        location.startsWith(link.href)
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`}
                    >
                      {link.label}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${megaMenuOpen === link.label ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {megaMenuOpen === link.label && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.97 }}
                          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                          className="absolute top-full left-0 mt-1 w-64 rounded-2xl bg-card border border-border/50 shadow-2xl shadow-black/40 overflow-hidden"
                        >
                          <div className="p-2">
                            {link.children.map((child) => (
                              <Link key={child.href} href={child.href}>
                                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <child.icon className="w-4 h-4 text-primary" />
                                  </div>
                                  <span className="text-sm font-medium text-foreground">{child.label}</span>
                                </div>
                              </Link>
                            ))}
                            {categories && categories.length > 0 && (
                              <>
                                <div className="h-px bg-border/50 my-2" />
                                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categorías</p>
                                {categories.slice(0, 5).map((cat) => (
                                  <Link key={cat.id} href={`/catalog?category=${cat.id}`}>
                                    <div className="px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                      {cat.name}
                                    </div>
                                  </Link>
                                ))}
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link key={link.href} href={link.href}>
                    <motion.span
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer block ${
                        location === link.href
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {link.label}
                    </motion.span>
                  </Link>
                )
              )}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5">
              {/* Search */}
              <AnimatePresence mode="wait">
                {searchOpen ? (
                  <motion.form
                    key="search-form"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "200px", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    onSubmit={handleSearch}
                    className="overflow-hidden"
                  >
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                      placeholder="Buscar productos..."
                      className="w-full h-9 px-3 rounded-lg bg-muted border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                  </motion.form>
                ) : (
                  <motion.button
                    key="search-btn"
                    onClick={() => setSearchOpen(true)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Search className="w-5 h-5" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Cart */}
              <motion.button
                onClick={openCart}
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ShoppingCart className="w-5 h-5" />
                <AnimatePresence>
                  {totalItems > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center neon-glow-purple"
                    >
                      {totalItems > 9 ? "9+" : totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Auth */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xs">
                        {(user?.name ?? "U")[0].toUpperCase()}
                      </div>
                      <span className="hidden sm:block text-sm font-medium text-foreground max-w-[80px] truncate">
                        {user?.name?.split(" ")[0] ?? "Usuario"}
                      </span>
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-card border-border rounded-2xl p-1.5">
                    <div className="px-3 py-2 mb-1">
                      <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator className="bg-border/50" />
                    <DropdownMenuItem asChild className="rounded-xl">
                      <Link href="/account">
                        <Package className="w-4 h-4 mr-2" />
                        Mis pedidos
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === "admin" && (
                      <>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem asChild className="rounded-xl text-primary focus:text-primary">
                          <Link href="/admin">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Panel Admin
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator className="bg-border/50" />
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="rounded-xl text-destructive focus:text-destructive"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  size="sm"
                  className="hidden sm:flex bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple rounded-xl"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  Iniciar sesión
                </Button>
              )}

              {/* Mobile menu toggle */}
              <button
                className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="lg:hidden overflow-hidden glass border-t border-border/50"
            >
              <div className="container py-4 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <span
                      className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                        location === link.href
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </span>
                  </Link>
                ))}
                {categories && categories.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <p className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categorías</p>
                    {categories.map((cat) => (
                      <Link key={cat.id} href={`/catalog?category=${cat.id}`}>
                        <span
                          className="block px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                          onClick={() => setMobileOpen(false)}
                        >
                          {cat.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                {!isAuthenticated && (
                  <Button
                    className="mt-3 bg-primary text-primary-foreground rounded-xl"
                    onClick={() => (window.location.href = getLoginUrl())}
                  >
                    Iniciar sesión
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
