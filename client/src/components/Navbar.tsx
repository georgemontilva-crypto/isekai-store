import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Menu, X, User, Search, Facebook, Twitter, Instagram, Youtube, ChevronLeft, ChevronRight, ArrowRight, ChevronDown, LayoutDashboard, Bell } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { openLoginModal } from "@/const";
import CartDrawer from "./CartDrawer";
import { AnimatePresence, motion } from "framer-motion";
import { useLang } from "@/i18n/LangContext";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/hooks/useSocket";

const collectionImgs = [
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80",
  "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80",
  "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&q=80",
];
const DEFAULT_ALL_HREF = "/catalog";
const dropdownVariants = { hidden:{opacity:0,y:-8,scale:0.98}, visible:{opacity:1,y:0,scale:1}, exit:{opacity:0,y:-6,scale:0.98} };
type ActiveMenu = "collections"|"explore"|null;




/**
 * A dónde lleva cada notificación al tocarla.
 *
 * Para el admin apunta a la sección del panel donde ocurrió; para un cliente,
 * a su cuenta. Antes TODAS iban a /account, así que al admin le parecía que el
 * clic no hacía nada (ya estaba en esa página o no era su destino).
 */
function destinoNotificacion(n: { type: string; body: string; title?: string }, esAdmin: boolean) {
  if (!esAdmin) return { href: "/account", label: "Ver en mi cuenta" };

  switch (n.type) {
    case "new_order": {
      const orden = n.body.match(/[A-Z]{2,4}-[A-Z0-9-]+/i)?.[0];
      return {
        href: orden ? `/admin?tab=orders&orden=${encodeURIComponent(orden)}` : "/admin?tab=orders",
        label: "Ver el pedido",
      };
    }
    case "new_subscriber":
      return { href: "/admin?tab=subscribers", label: "Ver suscriptores" };
    case "new_user": {
      // Las entregas de misiones reutilizan este tipo: se reconocen porque el
      // cuerpo trae el enlace de la publicación.
      const enlace = n.body.match(/https?:\/\/[^\s]+/)?.[0];
      if (enlace) return { href: "/admin?tab=cosplay&sub=evaluations", label: "Revisar entrega" };
      // Comentario del blog: el título lo delata
      if (/comentó en el blog/i.test((n as any).title ?? "")) {
        return { href: "/admin?tab=blog&sub=comments", label: "Moderar comentario" };
      }
      return { href: "/admin?tab=users", label: "Ver usuarios" };
    }
    default:
      return { href: "/admin", label: "Ver en el panel" };
  }
}

/* Panel del menú de teléfono: vive siempre en el DOM y se anima con CSS,
   así el cierre es tan suave como la apertura (patrón de YEYPEE). */
const MOBILE_MENU_CSS = `
  .iw-menu {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: #050507;
    overflow-y: auto;
    padding-top: env(safe-area-inset-top);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-12px);
    transition: opacity .28s ease,
                transform .34s cubic-bezier(.34,1.56,.64,1),
                visibility 0s linear .34s;
  }
  .iw-menu.is-open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    transition: opacity .24s ease,
                transform .36s cubic-bezier(.34,1.56,.64,1),
                visibility 0s linear 0s;
  }
  .iw-menu-item {
    opacity: 0;
    transform: translateY(14px);
    transition: opacity .3s ease, transform .4s cubic-bezier(.34,1.56,.64,1);
  }
  .iw-menu.is-open .iw-menu-item { opacity: 1; transform: translateY(0); }
  .iw-menu-link {
    display: inline-block;
    font-size: 26px;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: #f2f2f7;
    transition: color .2s ease, transform .25s cubic-bezier(.34,1.56,.64,1);
  }
  .iw-menu-link:hover, .iw-menu-link:focus-visible {
    color: #ff45a0;
    transform: translateY(-2px) scale(1.03);
  }
  @media (prefers-reduced-motion: reduce) {
    .iw-menu, .iw-menu.is-open, .iw-menu-item, .iw-menu.is-open .iw-menu-item,
    .iw-menu-link { transition: opacity .15s ease, visibility 0s; transform: none; }
    .iw-menu-link:hover { transform: none; }
  }
`;

/* Brillo del botón World Fest: destello que barre el pill + halo azul del Sistema */
const WORLD_FEST_GLOW = `
  @keyframes wf-sheen {
    0%   { transform: translateX(-130%) skewX(-20deg); }
    55%  { transform: translateX(230%)  skewX(-20deg); }
    100% { transform: translateX(230%)  skewX(-20deg); }
  }
  @keyframes wf-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(93,180,255,0.35), 0 0 14px 0 rgba(93,180,255,0.22); }
    50%      { box-shadow: 0 0 0 4px rgba(93,180,255,0.00), 0 0 24px 4px rgba(125,216,255,0.55); }
  }
  .wf-pill { animation: wf-pulse 2.8s ease-in-out infinite; }
  .wf-pill::after {
    content: "";
    position: absolute;
    top: 0; bottom: 0; left: 0;
    width: 38%;
    background: linear-gradient(90deg, transparent, rgba(190,240,255,0.9), transparent);
    animation: wf-sheen 3.2s ease-in-out infinite;
    pointer-events: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .wf-pill { animation: none; }
    .wf-pill::after { animation: none; opacity: 0; }
  }
`;

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuth();
  console.log("[Navbar] user:", user?.email, "role:", user?.role);
  const { totalItems, openCart } = useCart();
  const { t } = useLang();

  const announcements = t.nav.announcements;

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setAnnouncementIdx(i => (i + 1) % announcements.length), 4000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  useEffect(() => { setActiveMenu(null); }, [location]);

  const isRegularUser = isAuthenticated && user?.role !== "admin";
  const socket = useSocket();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = () => {
      utils.userNotifications.unreadCount.invalidate();
      utils.userNotifications.list.invalidate();
    };
    socket.on("notification:new", handleNewNotification);
    return () => { socket.off("notification:new", handleNewNotification); };
  }, [socket, utils]);

  const { data: notifUnread, refetch: refetchUnread } = trpc.userNotifications.unreadCount.useQuery(
    undefined, { enabled: isRegularUser }
  );
  const { data: notifList } = trpc.userNotifications.list.useQuery(
    undefined, { enabled: isRegularUser && notifOpen }
  );
  const markAllRead = trpc.userNotifications.markAllRead.useMutation({
    onSuccess: () => refetchUnread(),
  });

  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  function handleBellClick() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next && notifUnread && notifUnread > 0) markAllRead.mutate();
  }

  function formatRelative(date: Date | string) {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return "ahora mismo";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return `hace ${Math.floor(diff / 86400)} días`;
  }

  const openMenu = (m: ActiveMenu) => { if (closeTimer.current) clearTimeout(closeTimer.current); setActiveMenu(m); };
  const scheduleClose = () => { closeTimer.current = setTimeout(() => setActiveMenu(null), 120); };
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) { window.location.href = `/catalog?search=${encodeURIComponent(searchQuery.trim())}`; setSearchOpen(false); setSearchQuery(""); }
  };

  const { data: siteSettings } = trpc.settings.getAll.useQuery();
  const logoUrl = siteSettings?.["store_logo_url"] ?? null;
  // Textos de la franja superior: se editan en Configuración, uno por línea
  const topbarTexts = (siteSettings?.["topbar_marquee_texts"] ?? "")
    .split(/\r?\n|\|/)
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 12) || [];
  if (topbarTexts.length === 0) topbarTexts.push(...announcements);
  const storeName = siteSettings?.["store_name"] ?? "Isekai World";
  const logoHeight = parseInt(siteSettings?.["store_logo_height"] ?? "36");

  const { data: dbCategories } = trpc.categories.list.useQuery();
  const featuredCats = (dbCategories ?? []).filter(c => c.featured);
  const menuCategories = (featuredCats.length > 0 ? featuredCats : (dbCategories ?? [])).slice(0, 5);
  const collectionsMenu = menuCategories.map((cat, i) => ({
    label: cat.name,
    desc: "",
    img: cat.imageUrl || collectionImgs[i % collectionImgs.length],
    href: `/catalog?category=${cat.slug}`,
    dark: false,
  }));
  const exploreMenu = [
    { label: t.nav.exploreMenu.about, href: "/nosotros" },
    { label: t.nav.exploreMenu.faq,   href: "/faq" },
    { label: t.nav.exploreMenu.legal, href: "/politicas" },
    { label: "Blog",                   href: "/blog" },
  ];

  // Una sola lista para el menú de teléfono: se juntan la navegación principal
  // y el submenú "Explorar", y se descartan los destinos repetidos.
  const mobileLinks = [...t.nav.mobileMenu, ...exploreMenu].filter(
    (item, i, arr) => arr.findIndex(x => x.href === item.href) === i
  );

  if (location.startsWith("/admin")) return null;

  return (
    <>
      {/* TOP BAR */}
      {siteSettings?.["promo_bar_enabled"] !== "false" && (
      <div className="top-bar bg-[#1a1a1a] text-white overflow-hidden">
        {/* Marquee infinito: la pista se duplica y se desplaza el 50 % de su
            ancho, así el bucle no tiene costura */}
        <div className="iw-topbar-track flex w-max whitespace-nowrap items-center">
          {[0, 1].map(dup => (
            <div key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center py-2">
              {topbarTexts.map((txt, i) => (
                <span key={i} className="flex items-center">
                  <span className="px-7 text-[13px] font-extrabold uppercase tracking-[0.14em]">{txt}</span>
                  <span className="text-[#e5007d] text-[9px]">★</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* MAIN NAVBAR */}
      <header
        className={`sticky top-0 z-50 bg-white transition-all duration-200 relative ${scrolled ? "shadow-[0_1px_0_rgba(0,0,0,0.08)]" : "border-b border-[#ebebeb]"}`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="container flex items-center h-[60px] gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-2 max-w-[160px] md:max-w-none overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} width={120} height={40} style={{ height: logoHeight, width: 'auto' }} className="object-contain" />
            ) : (
              <div className="flex items-end gap-[2px]">
                {[6,10,14,10,6].map((h,i) => <div key={i} className="w-[3px] bg-[#1a1a1a] rounded-full" style={{height:`${h}px`}}/>)}
              </div>
            )}
            {!logoUrl && <span className="font-bold text-xl md:text-[15px] tracking-tight text-[#1a1a1a]">{storeName}</span>}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0 flex-1">
            <Link href="/catalog" className="px-3.5 py-2 text-[13.5px] font-medium text-[#1a1a1a] hover:opacity-50 transition-opacity">{t.nav.shop}</Link>

            <div className="relative" onMouseEnter={() => openMenu("collections")} onMouseLeave={scheduleClose}>
              <Link href="/collections" className={`flex items-center gap-1 px-3.5 py-2 text-[13.5px] font-medium transition-all rounded-full ${activeMenu==="collections"?"bg-[#1a1a1a] text-white":"text-[#1a1a1a] hover:opacity-50"}`}>
                {t.nav.collections}
              </Link>
            </div>

            <div className="relative" onMouseEnter={() => openMenu("explore")} onMouseLeave={scheduleClose}>
              <button className={`flex items-center gap-1 px-3.5 py-2 text-[13.5px] font-medium transition-all rounded-full ${activeMenu==="explore"?"bg-[#1a1a1a] text-white":"text-[#1a1a1a] hover:opacity-50"}`}>
                {t.nav.explore}<ChevronDown size={12} className={`transition-transform duration-200 ${activeMenu==="explore"?"rotate-180":""}`}/>
              </button>
              <AnimatePresence>
                {activeMenu==="explore" && (
                  <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" transition={{duration:0.2,type:"tween"}} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} className="absolute top-[calc(100%+8px)] left-0 z-50 w-52">
                    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-[#f0f0f0] py-2 overflow-hidden">
                      {exploreMenu.map(item => <Link key={item.href} href={item.href} className="block px-5 py-2.5 text-[13px] text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors">{item.label}</Link>)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link href="/catalog" className="px-3.5 py-2 text-[13.5px] font-medium text-[#1a1a1a] hover:opacity-50 transition-opacity">{t.nav.compare}</Link>

            {/* Botón destacado: Cosplay Guild */}
            <Link
              href="/cosplay"
              className="ml-2 inline-flex items-center rounded-full border-2 border-[#e5007d] bg-white px-4 py-1.5 text-[13px] font-bold text-[#e5007d] transition-colors hover:bg-[#e5007d] hover:text-white"
            >
              Cosplay Guild
            </Link>

            {/* Botón destacado: World Fest — mismo pill, con destello */}
            <style>{WORLD_FEST_GLOW}</style>
            <Link
              href="/world-fest"
              className="wf-pill relative ml-2 inline-flex items-center overflow-hidden rounded-full border-2 border-[#2b8fe0] bg-white px-4 py-1.5 text-[13px] font-bold text-[#1a6fbd] transition-colors hover:bg-[#1a6fbd] hover:text-white"
            >
              World Fest
            </Link>
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setSearchOpen(true)} aria-label="Buscar" className="p-2 md:p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors"><Search size={17} strokeWidth={1.8}/></button>
            {isAuthenticated && user?.role === "admin" && (
              <Link href="/admin" className="p-2 md:p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors" aria-label="Panel Admin">
                <LayoutDashboard size={17} strokeWidth={1.8} />
              </Link>
            )}
            {isRegularUser && (
              <div ref={notifRef} className="relative">
                <button onClick={handleBellClick} className="relative p-2 md:p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors" aria-label="Notificaciones">
                  <Bell size={17} strokeWidth={1.8} />
                  {notifUnread != null && notifUnread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notifUnread > 9 ? "9+" : notifUnread}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
                      transition={{ duration: 0.2, type: "tween" }}
                      className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[70px] sm:top-[calc(100%+8px)] z-50 sm:w-80 bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-[#f0f0f0] overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-[#f0f0f0]">
                        <p className="font-semibold text-sm text-[#1a1a1a]">Notificaciones</p>
                      </div>
                      <div className="max-h-[70vh] sm:max-h-80 overflow-y-auto">
                        {!notifList || notifList.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-[#888]">No tienes notificaciones aún</div>
                        ) : (
                          notifList.map(n => {
                            const destino = destinoNotificacion(n as any, user?.role === "admin");
                            return (
                            <button
                              key={n.id}
                              onClick={() => {
                                setNotifOpen(false);
                                navigate(destino.href);
                                // Si el panel YA está montado, cambiar solo los
                                // parámetros no lo vuelve a montar y el efecto de
                                // apertura no correría. El aviso lo cubre.
                                window.dispatchEvent(new CustomEvent("admin:ir-a", { detail: destino.href }));
                              }}
                              className="block w-full text-left px-4 py-3 hover:bg-[#fafafa] border-b border-[#f5f5f5] last:border-0 transition-colors">
                              <p className="font-semibold text-sm text-[#1a1a1a]">{n.title}</p>
                              <p className="text-xs text-[#888] mt-0.5 leading-snug">{n.body}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <p className="text-[10px] text-[#bbb]">{formatRelative(n.createdAt as Date)}</p>
                                <span className="text-[10px] font-bold text-[#e5007d]">· {destino.label}</span>
                              </div>
                            </button>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {isAuthenticated
              ? <Link href="/account" aria-label="Mi cuenta" className="p-2 md:p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors"><User size={17} strokeWidth={1.8}/></Link>
              : <button onClick={openLoginModal} aria-label="Iniciar sesión" className="p-2 md:p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors"><User size={17} strokeWidth={1.8}/></button>
            }
            <button onClick={() => openCart()} aria-label="Abrir carrito" className="relative p-2 md:p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors">
              <ShoppingBag size={17} strokeWidth={1.8}/>
              {totalItems > 0 && <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-[#1a1a1a] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{totalItems>9?"9+":totalItems}</span>}
            </button>
            <button onClick={() => setMobileOpen(true)} aria-label="Abrir menú" className="md:hidden p-2 hover:bg-[#f5f5f5] rounded-full transition-colors ml-0.5"><Menu size={17} strokeWidth={1.8}/></button>
          </div>
        </div>

        {/* Collections mega panel */}
        <AnimatePresence>
          {activeMenu==="collections" && (
            <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" transition={{duration:0.22,type:"tween"}} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} className="hidden lg:block absolute left-0 right-0 top-[60px] z-50 bg-[#f2f2f2] border-b border-[#e0e0e0] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide">
                {collectionsMenu.map(col => (
                  <Link key={col.label} href={col.href} onClick={() => setActiveMenu(null)} className={`group relative flex flex-col overflow-hidden rounded-2xl shrink-0 shadow-sm ${col.dark?"bg-[#1a1a1a]":"bg-white"}`} style={{width:"calc(20% - 10px)",minWidth:"200px"}}>
                    <div className="aspect-[4/3] overflow-hidden"><img src={col.img} alt={col.label} width={400} height={300} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/></div>
                    <div className={`px-4 py-3 flex items-start justify-between gap-2 ${col.dark?"text-white":"text-[#1a1a1a]"}`}>
                      <div>
                        <div className="font-bold text-[13px] leading-tight">{col.label}</div>
                        <div className={`text-[11px] mt-0.5 leading-snug ${col.dark?"text-white/55":"text-[#888]"}`}>{col.desc}</div>
                      </div>
                      <ArrowRight size={14} className="shrink-0 mt-0.5 transition-transform duration-200 group-hover:translate-x-1"/>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-start justify-center pt-20 px-4" onClick={e=>{if(e.target===e.currentTarget)setSearchOpen(false);}}>
            <motion.div initial={{opacity:0,y:-16,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8,scale:0.97}} transition={{duration:0.22,ease:"easeOut"}} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base">{t.nav.searchTitle}</h3>
                <button onClick={() => setSearchOpen(false)} aria-label="Cerrar búsqueda" className="p-1 hover:bg-[#f5f5f5] rounded-full"><X size={16}/></button>
              </div>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input autoFocus type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={t.nav.searchPlaceholder} className="flex-1 border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#1a1a1a] transition-colors"/>
                <button type="submit" className="btn-pill text-sm">{t.nav.search}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Menú de teléfono ────────────────────────────────────────────────
          Al estilo YEYPEE: el panel vive siempre en el DOM y se anima con CSS,
          así cierra tan suave como abre. Los enlaces entran en cascada.
          Las opciones NO se repiten: cada destino aparece una sola vez. */}
      <style>{MOBILE_MENU_CSS}</style>
      <div
        className={`iw-menu md:hidden ${mobileOpen ? "is-open" : ""}`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-between border-b border-[#22222c] px-6 h-[60px]">
          {logoUrl
            ? <img src={logoUrl} alt={storeName} style={{ height: logoHeight, width: 'auto' }} className="object-contain" />
            : <span className="font-bold text-[15px]">{storeName}</span>}
          <button onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" tabIndex={mobileOpen ? 0 : -1} className="p-2 text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col px-6 py-8">
          <form onSubmit={handleSearch} className="iw-menu-item mb-8 flex gap-2" style={{ transitionDelay: mobileOpen ? "60ms" : "0ms" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar productos..."
              tabIndex={mobileOpen ? 0 : -1}
              className="flex-1 rounded-full border border-[#2e2e3a] bg-[#101016] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#7c7c8c] focus:border-[#e5007d]"
            />
            <button type="submit" aria-label="Buscar" tabIndex={mobileOpen ? 0 : -1} className="btn-pill px-4 text-sm"><Search size={15} /></button>
          </form>

          {/* Navegación principal — lista única, sin repetir destinos */}
          <div className="flex flex-col items-start gap-6">
            {mobileLinks.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                tabIndex={mobileOpen ? 0 : -1}
                className="iw-menu-link iw-menu-item"
                style={{ transitionDelay: mobileOpen ? `${100 + i * 55}ms` : "0ms" }}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Destacados */}
          <div className="iw-menu-item mt-9 flex flex-col gap-3" style={{ transitionDelay: mobileOpen ? `${100 + mobileLinks.length * 55}ms` : "0ms" }}>
            <Link
              href="/cosplay"
              onClick={() => setMobileOpen(false)}
              tabIndex={mobileOpen ? 0 : -1}
              className="inline-flex items-center justify-center rounded-full border-2 border-[#e5007d] bg-white px-5 py-3 text-[14px] font-bold text-[#e5007d] transition-colors hover:bg-[#e5007d] hover:text-white"
            >
              Cosplay Guild
            </Link>
            <style>{WORLD_FEST_GLOW}</style>
            <Link
              href="/world-fest"
              onClick={() => setMobileOpen(false)}
              tabIndex={mobileOpen ? 0 : -1}
              className="wf-pill relative inline-flex items-center justify-center overflow-hidden rounded-full border-2 border-[#2b8fe0] bg-white px-5 py-3 text-[14px] font-bold text-[#1a6fbd] transition-colors hover:bg-[#1a6fbd] hover:text-white"
            >
              World Fest
            </Link>
          </div>

          {/* Cuenta */}
          <div className="iw-menu-item mt-9 flex flex-col gap-3 border-t border-[#f0f0f0] pt-7" style={{ transitionDelay: mobileOpen ? `${160 + mobileLinks.length * 55}ms` : "0ms" }}>
            {isRegularUser && (
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                tabIndex={mobileOpen ? 0 : -1}
                className="flex items-center gap-3 text-[15px] font-semibold transition-opacity hover:opacity-60"
              >
                <Bell size={18} strokeWidth={1.8} />
                Notificaciones
                {notifUnread != null && notifUnread > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {notifUnread > 9 ? "9+" : notifUnread}
                  </span>
                )}
              </Link>
            )}
            {isAuthenticated
              ? <Link href={user?.role === "admin" ? "/admin" : "/account"} onClick={() => setMobileOpen(false)} tabIndex={mobileOpen ? 0 : -1} className="btn-pill w-full justify-center">{t.nav.account}</Link>
              : <button onClick={() => { setMobileOpen(false); openLoginModal(); }} tabIndex={mobileOpen ? 0 : -1} className="btn-pill w-full justify-center">{t.nav.signIn}</button>}
          </div>
        </nav>
      </div>

      <CartDrawer />
    </>
  );
}
