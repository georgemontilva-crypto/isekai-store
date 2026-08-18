import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { ShoppingBag, Menu, X, User, Search, Facebook, Twitter, Instagram, Youtube, ChevronLeft, ChevronRight, ArrowRight, ChevronDown, LayoutDashboard, Bell, Sun, Moon } from "lucide-react";
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
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
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

  if (location.startsWith("/admin")) return null;

  return (
    <>
      {/* TOP BAR */}
      <div className="top-bar bg-[#1a1a1a] text-white text-[11px]">
        <div className="hidden md:flex container items-center justify-between h-9">
          <div className="hidden md:flex items-center gap-3">
            <a href="#" aria-label="Facebook" className="opacity-60 hover:opacity-100 transition-opacity"><Facebook size={12}/></a>
            <a href="#" aria-label="Twitter"  className="opacity-60 hover:opacity-100 transition-opacity"><Twitter size={12}/></a>
            <a href="#" aria-label="Instagram" className="opacity-60 hover:opacity-100 transition-opacity"><Instagram size={12}/></a>
            <a href="#" aria-label="YouTube"  className="opacity-60 hover:opacity-100 transition-opacity"><Youtube size={12}/></a>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <button onClick={() => setAnnouncementIdx(i => (i - 1 + announcements.length) % announcements.length)} aria-label="Anuncio anterior" className="opacity-50 hover:opacity-100 transition-opacity"><ChevronLeft size={12}/></button>
            <span className="font-medium tracking-wide text-center px-2">{announcements[announcementIdx]}</span>
            <button onClick={() => setAnnouncementIdx(i => (i + 1) % announcements.length)} aria-label="Siguiente anuncio" className="opacity-50 hover:opacity-100 transition-opacity"><ChevronRight size={12}/></button>
          </div>
          <div className="hidden md:flex items-center"></div>
        </div>
      </div>

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
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
              className="p-2 md:p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors"
            >
              {theme === "dark" ? <Sun size={17} strokeWidth={1.8}/> : <Moon size={17} strokeWidth={1.8}/>}
            </button>
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
                          notifList.map(n => (
                            <Link key={n.id} href="/account" onClick={() => setNotifOpen(false)}
                              className="block px-4 py-3 hover:bg-[#fafafa] border-b border-[#f5f5f5] last:border-0 transition-colors">
                              <p className="font-semibold text-sm text-[#1a1a1a]">{n.title}</p>
                              <p className="text-xs text-[#888] mt-0.5 leading-snug">{n.body}</p>
                              <p className="text-[10px] text-[#bbb] mt-1">{formatRelative(n.createdAt as Date)}</p>
                            </Link>
                          ))
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

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{duration:0.3,ease:"easeOut"}} className="fixed inset-0 z-[60] bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center justify-between px-6 h-[60px] border-b border-[#ebebeb]">
              {logoUrl
                ? <img src={logoUrl} alt={storeName} style={{ height: logoHeight, width: 'auto' }} className="object-contain" />
                : <span className="font-bold text-[15px]">{storeName}</span>
              }
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" className="p-2"><X size={18}/></button>
              </div>
            </div>
            <nav className="flex flex-col px-6 py-8 gap-0 overflow-y-auto">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Buscar productos..." className="flex-1 border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#1a1a1a] transition-colors bg-[#f8f8f8]"/>
                <button type="submit" aria-label="Buscar" className="btn-pill text-sm px-4"><Search size={15}/></button>
              </form>
              {t.nav.mobileMenu.map(({href,label}) => (
                <Link key={label} href={href} onClick={() => setMobileOpen(false)} className="py-4 text-base font-semibold border-b border-[#f0f0f0] hover:opacity-50 transition-opacity flex items-center justify-between">
                  {label}<ArrowRight size={14} className="opacity-30"/>
                </Link>
              ))}
              {/* Botón destacado: Cosplay Guild */}
              <Link
                href="/cosplay"
                onClick={() => setMobileOpen(false)}
                className="my-4 inline-flex items-center justify-center rounded-full border-2 border-[#e5007d] bg-white px-5 py-3 text-[14px] font-bold text-[#e5007d] transition-colors hover:bg-[#e5007d] hover:text-white"
              >
                Cosplay Guild
              </Link>
              <style>{WORLD_FEST_GLOW}</style>
              <Link
                href="/world-fest"
                onClick={() => setMobileOpen(false)}
                className="wf-pill relative mb-4 inline-flex items-center justify-center overflow-hidden rounded-full border-2 border-[#2b8fe0] bg-white px-5 py-3 text-[14px] font-bold text-[#1a6fbd] transition-colors hover:bg-[#1a6fbd] hover:text-white"
              >
                World Fest
              </Link>
              {exploreMenu.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="py-3 text-[14px] text-[#555] border-b border-[#f0f0f0] hover:opacity-50 transition-opacity flex items-center justify-between">
                  {item.label}<ArrowRight size={12} className="opacity-20"/>
                </Link>
              ))}
              {isRegularUser && (
                <Link href="/account" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 py-4 border-b border-[#f0f0f0] font-semibold text-[15px] hover:opacity-50 transition-opacity">
                  <Bell size={18} strokeWidth={1.8} />
                  Notificaciones
                  {notifUnread != null && notifUnread > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {notifUnread > 9 ? "9+" : notifUnread}
                    </span>
                  )}
                </Link>
              )}
              <div className="mt-8">
                {isAuthenticated
                  ? <Link href={user?.role==="admin"?"/admin":"/account"} onClick={() => setMobileOpen(false)} className="btn-pill w-full justify-center">{t.nav.account}</Link>
                  : <button onClick={() => { setMobileOpen(false); openLoginModal(); }} className="btn-pill w-full justify-center">{t.nav.signIn}</button>
                }
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer />
    </>
  );
}
