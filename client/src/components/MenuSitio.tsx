import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { X, ChevronRight, LayoutDashboard, LogOut, Sparkles, Mail } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePortales } from "@/hooks/usePortales";
import { openLoginModal } from "@/const";
import { useLang } from "@/i18n/LangContext";
import { trpc } from "@/lib/trpc";

/**
 * El menú de toda la web: el mismo en la portada del Fest y en el resto de
 * páginas. Arriba la cuenta (entrar/registrarse o tu perfil), luego los
 * destinos principales en letra grande, tus accesos por rol y los enlaces
 * de información.
 *
 * Vive siempre en el DOM y se anima con CSS, así cierra tan suave como abre.
 * En teléfono ocupa la pantalla; en escritorio es un panel lateral.
 * Quien lo usa bloquea el desplazamiento del fondo mientras está abierto.
 */
export default function MenuSitio({ abierto, onCerrar, pie }: { abierto: boolean; onCerrar: () => void; pie?: string }) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const portales = usePortales();
  const { lang, toggleLang } = useLang();
  const en = lang === "en";
  const { data: ajustes } = trpc.settings.getAll.useQuery();
  const logo = ajustes?.["store_logo_url"] ?? null;
  const nombreTienda = ajustes?.["store_name"] ?? "Isekai World";
  const { data: miCosplayer } = trpc.cosplay.getMyProfile.useQuery(undefined, { enabled: isAuthenticated, retry: false });

  useEffect(() => {
    if (!abierto) return;
    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto, onCerrar]);

  const principales = [
    { href: "/", texto: en ? "Home" : "Inicio" },
    { href: "/tienda", texto: en ? "Store" : "Tienda" },
    { href: "/catalog", texto: en ? "Catalog" : "Catálogo" },
    { href: "/collections", texto: en ? "Universes" : "Universos" },
  ];
  const informacion = [
    { href: "/blog", texto: "Blog" },
    { href: "/nosotros", texto: en ? "About us" : "Nosotros" },
    { href: "/faq", texto: en ? "FAQ" : "Preguntas frecuentes" },
    { href: "/politicas", texto: en ? "Policies" : "Políticas" },
  ];

  const tab = abierto ? 0 : -1;
  const nombre = (user?.name ?? "").trim();
  const inicial = (nombre || user?.email || "?").charAt(0).toUpperCase();
  /** Retraso de entrada en cascada */
  const paso = (i: number) => ({ transitionDelay: abierto ? `${60 + i * 35}ms` : "0ms" });
  let orden = 0;

  return (
    <div className={`ms ${abierto ? "ms-on" : ""}`} aria-hidden={!abierto}>
      <button className="ms-velo" onClick={onCerrar} tabIndex={-1} aria-label={en ? "Close menu" : "Cerrar menú"} />
      <aside className="ms-panel" role="dialog" aria-modal="true" aria-label={en ? "Menu" : "Menú"}>
        <div className="ms-cab">
          {logo
            ? <img src={logo} alt={nombreTienda} className="ms-logo" />
            : <span className="ms-marca">{nombreTienda}</span>}
          <div className="ms-cab-acciones">
            <button className="ms-idioma" onClick={toggleLang} tabIndex={tab}
              aria-label={en ? "Cambiar a español" : "Switch to English"}>
              <span className={en ? "" : "ms-idioma-on"}>ES</span>
              <span className={en ? "ms-idioma-on" : ""}>EN</span>
            </button>
            <button className="ms-cerrar" onClick={onCerrar} tabIndex={tab} aria-label={en ? "Close menu" : "Cerrar menú"}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="ms-cuerpo">
          {/* ── Cuenta ── */}
          {isAuthenticated ? (
            <div className="ms-cuenta ms-entra" style={paso(orden++)}>
              <Link href="/account" onClick={onCerrar} tabIndex={tab} className="ms-perfil">
                <span className="ms-avatar">{inicial}</span>
                <span className="ms-perfil-txt">
                  <b>{nombre || (en ? "My account" : "Mi cuenta")}</b>
                  <small>{en ? "Orders, profile and rewards" : "Pedidos, perfil y recompensas"}</small>
                </span>
                <ChevronRight size={18} />
              </Link>
              {(user?.role === "admin" || miCosplayer) && (
                <div className="ms-cuenta-extra">
                  {user?.role === "admin" && (
                    <Link href="/admin" onClick={onCerrar} tabIndex={tab}><LayoutDashboard size={15} /> {en ? "Admin panel" : "Panel de administración"}</Link>
                  )}
                  {miCosplayer && (
                    <Link href="/cosplay/dashboard" onClick={onCerrar} tabIndex={tab}><Sparkles size={15} /> {en ? "My cosplayer panel" : "Mi panel de cosplayer"}</Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="ms-cuenta ms-invitado ms-entra" style={paso(orden++)}>
              <p className="ms-invitado-titulo">{en ? "Join Isekai World" : "Únete a Isekai World"}</p>
              <p className="ms-invitado-txt">
                {en ? "One step with your email, no password. Your account keeps your orders, your Level Pass and your hits on the boss."
                    : "Un solo paso con tu correo, sin contraseña. Tu cuenta guarda tus pedidos, tu Level Pass y tus golpes al jefe."}
              </p>
              <button className="ms-entrar" tabIndex={tab} onClick={() => { onCerrar(); openLoginModal(); }}>
                <Mail size={17} /> {en ? "Sign up or sign in" : "Registrarme o entrar"}
              </button>
            </div>
          )}

          {/* ── Destinos principales ── */}
          <nav className="ms-grande">
            {principales.map(l => (
              <Link key={l.href} href={l.href} onClick={onCerrar} tabIndex={tab}
                className={`ms-entra ${location === l.href ? "ms-activo" : ""}`} style={paso(orden++)}>
                {l.texto}
              </Link>
            ))}
            <Link href="/cosplay" onClick={onCerrar} tabIndex={tab}
              className={`ms-entra ms-guild ${location.startsWith("/cosplay") ? "ms-activo" : ""}`} style={paso(orden++)}>
              Cosplay Guild <Sparkles size={20} />
            </Link>
          </nav>

          {/* ── Accesos: Level Pass y los de tu rol ── */}
          <p className="ms-rotulo ms-entra" style={paso(orden++)}>
            {portales.roles.length ? (en ? "Your access" : "Tus accesos") : "World Fest"}
          </p>
          <div className="ms-accesos">
            {portales.todos.map(p => (
              <Link key={p.clave} href={p.href} onClick={onCerrar} tabIndex={tab}
                className="ms-acceso ms-entra" style={{ ...paso(orden++), ["--c" as string]: p.color }}>
                <span className="ms-acceso-icono"><p.icono size={18} strokeWidth={2} /></span>
                <span className="ms-acceso-txt"><b>{p.texto}</b><small>{p.descripcion}</small></span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>

          {/* ── Información ── */}
          <div className="ms-info ms-entra" style={paso(orden++)}>
            {informacion.map(l => (
              <Link key={l.href} href={l.href} onClick={onCerrar} tabIndex={tab}
                className={location.startsWith(l.href) ? "ms-activo" : ""}>{l.texto}</Link>
            ))}
          </div>

          <div className="ms-pie ms-entra" style={paso(orden++)}>
            {isAuthenticated && (
              <button tabIndex={tab} onClick={() => { onCerrar(); void logout(); }}>
                <LogOut size={14} /> {en ? "Sign out" : "Cerrar sesión"}
              </button>
            )}
            {pie && <span>{pie}</span>}
          </div>
        </div>
      </aside>
    </div>
  );
}
