import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ShoppingBag, Menu, X, User, Search,
  Facebook, Twitter, Instagram, Youtube,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { getLoginUrl } from "@/const";
import CartDrawer from "./CartDrawer";

const announcements = [
  "Free shipping on orders over $150 · Use code FREESHIP",
  "New arrivals every week — Shop the latest drops",
  "Get 20% off your first order · Sign up now",
];

export default function Navbar() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAuthenticated } = useAuth();
  const { totalItems, openCart } = useCart();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setAnnouncementIdx(i => (i + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/catalog?search=${encodeURIComponent(searchQuery.trim())}`;
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      {/* ── TOP BAR ── */}
      <div className="bg-[#1a1a1a] text-white text-[11px]">
        <div className="container flex items-center justify-between h-9">
          {/* Social icons */}
          <div className="hidden md:flex items-center gap-3">
            <a href="#" className="opacity-60 hover:opacity-100 transition-opacity"><Facebook size={12} /></a>
            <a href="#" className="opacity-60 hover:opacity-100 transition-opacity"><Twitter size={12} /></a>
            <a href="#" className="opacity-60 hover:opacity-100 transition-opacity"><Instagram size={12} /></a>
            <a href="#" className="opacity-60 hover:opacity-100 transition-opacity"><Youtube size={12} /></a>
          </div>

          {/* Announcement ticker */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            <button
              onClick={() => setAnnouncementIdx(i => (i - 1 + announcements.length) % announcements.length)}
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={12} />
            </button>
            <span className="font-medium tracking-wide">{announcements[announcementIdx]}</span>
            <button
              onClick={() => setAnnouncementIdx(i => (i + 1) % announcements.length)}
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={12} />
            </button>
          </div>

          {/* Language / Currency */}
          <div className="hidden md:flex items-center gap-4 opacity-70">
            <span>EN</span>
            <span>USD $</span>
          </div>
        </div>
      </div>

      {/* ── MAIN NAVBAR ── */}
      <header
        className={`sticky top-0 z-50 bg-white transition-all duration-200 ${
          scrolled ? "shadow-[0_1px_0_rgba(0,0,0,0.08)]" : "border-b border-[#ebebeb]"
        }`}
      >
        <div className="container flex items-center h-[60px] gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-2">
            <div className="flex items-end gap-[2px]">
              {[6, 10, 14, 10, 6].map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] bg-[#1a1a1a] rounded-full"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <span className="font-bold text-[15px] tracking-tight text-[#1a1a1a] hidden sm:block">
              Isekai Store
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0 flex-1">
            {[
              { href: "/", label: "Home" },
              { href: "/catalog", label: "Shop" },
              { href: "/catalog", label: "Collections" },
              { href: "/catalog", label: "Explore" },
            ].map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className={`px-3.5 py-2 text-[13.5px] font-medium transition-opacity ${
                  location === href ? "text-[#1a1a1a]" : "text-[#1a1a1a] hover:opacity-50"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-0.5 ml-auto">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors"
              aria-label="Search"
            >
              <Search size={17} strokeWidth={1.8} />
            </button>

            {/* Account */}
            {isAuthenticated ? (
              <Link
                href={user?.role === "admin" ? "/admin" : "/account"}
                className="p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors"
                aria-label="Account"
              >
                <User size={17} strokeWidth={1.8} />
              </Link>
            ) : (
              <a
                href={getLoginUrl()}
                className="p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors"
                aria-label="Login"
              >
                <User size={17} strokeWidth={1.8} />
              </a>
            )}

            {/* Cart */}
            <button
              onClick={() => openCart()}
              className="relative p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={17} strokeWidth={1.8} />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-[#1a1a1a] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2.5 hover:bg-[#f5f5f5] rounded-full transition-colors ml-1"
            >
              <Menu size={17} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      {/* ── SEARCH OVERLAY ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
          onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Search products</h3>
              <button onClick={() => setSearchOpen(false)} className="p-1 hover:bg-[#f5f5f5] rounded-full">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#1a1a1a] transition-colors"
              />
              <button type="submit" className="btn-pill text-sm">
                Search
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MOBILE MENU ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="flex items-center justify-between px-6 h-[60px] border-b border-[#ebebeb]">
            <span className="font-bold text-[15px]">Isekai Store</span>
            <button onClick={() => setMobileOpen(false)} className="p-2">
              <X size={18} />
            </button>
          </div>
          <nav className="flex flex-col px-6 py-8 gap-0">
            {[
              { href: "/", label: "Home" },
              { href: "/catalog", label: "Shop" },
              { href: "/catalog", label: "Collections" },
              { href: "/catalog", label: "Explore" },
            ].map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="py-4 text-base font-semibold border-b border-[#f0f0f0] hover:opacity-50 transition-opacity"
              >
                {label}
              </Link>
            ))}
            <div className="mt-8">
              {isAuthenticated ? (
                <Link
                  href={user?.role === "admin" ? "/admin" : "/account"}
                  onClick={() => setMobileOpen(false)}
                  className="btn-pill w-full justify-center"
                >
                  My Account
                </Link>
              ) : (
                <a href={getLoginUrl()} className="btn-pill w-full justify-center">
                  Sign In
                </a>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* ── CART DRAWER ── */}
      <CartDrawer />
    </>
  );
}
