import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Menu, X, User, Search, Facebook, Twitter, Instagram, Youtube, ChevronLeft, ChevronRight, ArrowRight, ChevronDown, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { openLoginModal } from "@/const";
import CartDrawer from "./CartDrawer";
import { AnimatePresence, motion } from "framer-motion";
import { useLang } from "@/i18n/LangContext";

const collectionImgs = [
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80",
  "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80",
  "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&q=80",
];
const collectionHrefs = ["/catalog?category=headphones","/catalog?category=earphones","/catalog?category=speakers","/catalog?category=accessories","/catalog"];
const dropdownVariants = { hidden:{opacity:0,y:-8,scale:0.98}, visible:{opacity:1,y:0,scale:1}, exit:{opacity:0,y:-6,scale:0.98} };
type ActiveMenu = "collections"|"explore"|null;

export default function Navbar() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const { user, isAuthenticated } = useAuth();
  console.log("[Navbar] user:", user?.email, "role:", user?.role);
  const { totalItems, openCart } = useCart();
  const { lang, t, toggleLang } = useLang();

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

  const openMenu = (m: ActiveMenu) => { if (closeTimer.current) clearTimeout(closeTimer.current); setActiveMenu(m); };
  const scheduleClose = () => { closeTimer.current = setTimeout(() => setActiveMenu(null), 120); };
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) { window.location.href = `/catalog?search=${encodeURIComponent(searchQuery.trim())}`; setSearchOpen(false); setSearchQuery(""); }
  };

  const collectionsMenu = [
    { ...t.nav.collectionsMenu.headphones, img: collectionImgs[0], href: collectionHrefs[0], dark: false },
    { ...t.nav.collectionsMenu.earphones,  img: collectionImgs[1], href: collectionHrefs[1], dark: false },
    { ...t.nav.collectionsMenu.speakers,   img: collectionImgs[2], href: collectionHrefs[2], dark: false },
    { ...t.nav.collectionsMenu.accessories,img: collectionImgs[3], href: collectionHrefs[3], dark: false },
    { ...t.nav.collectionsMenu.all,        img: collectionImgs[4], href: collectionHrefs[4], dark: true  },
  ];
  const exploreMenu = [
    { label: t.nav.exploreMenu.about, href: "/nosotros" },
    { label: t.nav.exploreMenu.faq,   href: "/faq" },
    { label: t.nav.exploreMenu.legal, href: "/politicas" },
  ];

  const LangToggle = ({ mobile }: { mobile?: boolean }) => (
    <button
      onClick={toggleLang}
      className={mobile
        ? "flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#f0f0f0] text-[11px] font-bold"
        : "flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/20 hover:border-white/60 transition-all text-[11px] font-bold tracking-wide"
      }
      aria-label="Cambiar idioma"
    >
      <span className={lang === "es" ? (mobile ? "text-[#1a1a1a]" : "text-white") : "opacity-40"}>ES</span>
      <span className={mobile ? "text-[#ccc]" : "text-white/30"}>|</span>
      <span className={lang === "en" ? (mobile ? "text-[#1a1a1a]" : "text-white") : "opacity-40"}>EN</span>
    </button>
  );

  return (
    <>
      {/* TOP BAR */}
      <div className="bg-[#1a1a1a] text-white text-[11px]">
        <div className="container flex items-center justify-between h-9">
          <div className="hidden md:flex items-center gap-3">
            <a href="#" aria-label="Facebook" className="opacity-60 hover:opacity-100 transition-opacity"><Facebook size={12}/></a>
            <a href="#" aria-label="Twitter"  className="opacity-60 hover:opacity-100 transition-opacity"><Twitter size={12}/></a>
            <a href="#" aria-label="Instagram" className="opacity-60 hover:opacity-100 transition-opacity"><Instagram size={12}/></a>
            <a href="#" aria-label="YouTube"  className="opacity-60 hover:opacity-100 transition-opacity"><Youtube size={12}/></a>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <button onClick={() => setAnnouncementIdx(i => (i - 1 + announcements.length) % announcements.length)} className="opacity-50 hover:opacity-100 transition-opacity"><ChevronLeft size={12}/></button>
            <span className="font-medium tracking-wide text-center px-2">{announcements[announcementIdx]}</span>
            <button onClick={() => setAnnouncementIdx(i => (i + 1) % announcements.length)} className="opacity-50 hover:opacity-100 transition-opacity"><ChevronRight size={12}/></button>
          </div>
          <div className="hidden md:flex items-center"><LangToggle /></div>
        </div>
      </div>

      {/* MAIN NAVBAR */}
      <header className={`sticky top-0 z-50 bg-white transition-all duration-200 ${scrolled ? "shadow-[0_1px_0_rgba(0,0,0,0.08)]" : "border-b border-[#ebebeb]"}`}>
        <div className="container flex items-center h-[60px] gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-2">
            <div className="flex items-end gap-[2px]">
              {[6,10,14,10,6].map((h,i) => <div key={i} className="w-[3px] bg-[#1a1a1a] rounded-full" style={{height:`${h}px`}}/>)}
            </div>
            <span className="font-bold text-[15px] tracking-tight text-[#1a1a1a] hidden sm:block">Isekai World</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0 flex-1">
            <Link href="/catalog" className="px-3.5 py-2 text-[13.5px] font-medium text-[#1a1a1a] hover:opacity-50 transition-opacity">{t.nav.shop}</Link>

            <div className="relative" onMouseEnter={() => openMenu("collections")} onMouseLeave={scheduleClose}>
              <button className={`flex items-center gap-1 px-3.5 py-2 text-[13.5px] font-medium transition-all rounded-full ${activeMenu==="collections"?"bg-[#1a1a1a] text-white":"text-[#1a1a1a] hover:opacity-50"}`}>
                {t.nav.collections}<ChevronDown size={12} className={`transition-transform duration-200 ${activeMenu==="collections"?"rotate-180":""}`}/>
              </button>
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
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-0.5 ml-auto">
            <div className="md:hidden mr-1"><LangToggle mobile /></div>
            <button onClick={() => setSearchOpen(true)} className="p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors"><Search size={17} strokeWidth={1.8}/></button>
            {isAuthenticated && user?.role === "admin" && (
              <Link href="/admin" className="p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors" aria-label="Panel Admin">
                <LayoutDashboard size={17} strokeWidth={1.8} />
              </Link>
            )}
            {isAuthenticated
              ? <Link href="/account" className="p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors"><User size={17} strokeWidth={1.8}/></Link>
              : <button onClick={openLoginModal} className="p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors"><User size={17} strokeWidth={1.8}/></button>
            }
            <button onClick={() => openCart()} className="relative p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors">
              <ShoppingBag size={17} strokeWidth={1.8}/>
              {totalItems > 0 && <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-[#1a1a1a] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{totalItems>9?"9+":totalItems}</span>}
            </button>
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors ml-1"><Menu size={17} strokeWidth={1.8}/></button>
          </div>
        </div>

        {/* Collections mega panel */}
        <AnimatePresence>
          {activeMenu==="collections" && (
            <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" transition={{duration:0.22,type:"tween"}} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} className="sticky top-[60px] z-40 bg-[#f2f2f2] border-b border-[#e0e0e0] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide">
                {collectionsMenu.map(col => (
                  <Link key={col.label} href={col.href} onClick={() => setActiveMenu(null)} className={`group relative flex flex-col overflow-hidden rounded-2xl shrink-0 shadow-sm ${col.dark?"bg-[#1a1a1a]":"bg-white"}`} style={{width:"calc(20% - 10px)",minWidth:"200px"}}>
                    <div className="aspect-[4/3] overflow-hidden"><img src={col.img} alt={col.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/></div>
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
                <button onClick={() => setSearchOpen(false)} className="p-1 hover:bg-[#f5f5f5] rounded-full"><X size={16}/></button>
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
          <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{duration:0.3,ease:"easeOut"}} className="fixed inset-0 z-[60] bg-white flex flex-col">
            <div className="flex items-center justify-between px-6 h-[60px] border-b border-[#ebebeb]">
              <span className="font-bold text-[15px]">Isekai World</span>
              <div className="flex items-center gap-3">
                <LangToggle mobile />
                <button onClick={() => setMobileOpen(false)} className="p-2"><X size={18}/></button>
              </div>
            </div>
            <nav className="flex flex-col px-6 py-8 gap-0 overflow-y-auto">
              {t.nav.mobileMenu.map(({href,label}) => (
                <Link key={label} href={href} onClick={() => setMobileOpen(false)} className="py-4 text-base font-semibold border-b border-[#f0f0f0] hover:opacity-50 transition-opacity flex items-center justify-between">
                  {label}<ArrowRight size={14} className="opacity-30"/>
                </Link>
              ))}
              {exploreMenu.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="py-3 text-[14px] text-[#555] border-b border-[#f0f0f0] hover:opacity-50 transition-opacity flex items-center justify-between">
                  {item.label}<ArrowRight size={12} className="opacity-20"/>
                </Link>
              ))}
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
