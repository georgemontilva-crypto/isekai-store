import { Link } from "wouter";
import { motion } from "framer-motion";
import { Instagram, Twitter, Youtube, Mail, MapPin, Phone, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="bg-card/50 border-t border-border/30 mt-20">
      {/* Newsletter Banner */}
      <div className="border-b border-border/30 py-12">
        <div className="container">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold mb-2">
                Únete a la <span className="gradient-text">comunidad Isekai</span>
              </h3>
              <p className="text-muted-foreground text-sm">
                Recibe novedades, descuentos exclusivos y contenido especial directo a tu correo.
              </p>
            </div>
            {subscribed ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-medium"
              >
                ✓ ¡Suscrito exitosamente!
              </motion.div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2 w-full lg:w-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="flex-1 lg:w-72 h-11 px-4 rounded-xl bg-muted border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  type="submit"
                  className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors neon-glow-purple flex items-center gap-2"
                >
                  Suscribirse
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container py-14">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/">
              <div className="flex items-center gap-2.5 mb-5 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center neon-glow-purple">
                  <span className="text-primary-foreground font-black font-display">IS</span>
                </div>
                <span className="font-bold text-xl font-display">
                  <span className="gradient-text">Isekai</span>
                  <span className="text-foreground"> Store</span>
                </span>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-xs">
              Tu destino definitivo para productos premium inspirados en anime y gaming. Calidad excepcional para los verdaderos otakus.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {[
                { icon: Instagram, href: "#", label: "Instagram" },
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Youtube, href: "#", label: "YouTube" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl bg-muted border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/10 transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4 uppercase tracking-wider">Tienda</h4>
            <ul className="space-y-3">
              {[
                { href: "/catalog", label: "Todos los productos" },
                { href: "/catalog?featured=true", label: "Destacados" },
                { href: "/catalog?new=true", label: "Novedades" },
                { href: "/catalog", label: "Colecciones" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4 uppercase tracking-wider">Cuenta</h4>
            <ul className="space-y-3">
              {[
                { href: "/account", label: "Mis pedidos" },
                { href: "/account", label: "Mi perfil" },
                { href: "/catalog", label: "Lista de deseos" },
                { href: "/catalog", label: "Reseñas" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>
                    <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4 uppercase tracking-wider">Ayuda</h4>
            <ul className="space-y-3 mb-6">
              {[
                { label: "Centro de ayuda" },
                { label: "Política de envíos" },
                { label: "Devoluciones" },
                { label: "Términos y condiciones" },
              ].map((link) => (
                <li key={link.label}>
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    {link.label}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>hola@isekaistore.com</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>+57 300 000 0000</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Colombia</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/30 py-5">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Isekai Store. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Pago seguro con</span>
            <div className="flex items-center gap-2">
              {["Visa", "MC", "PSE", "Bold"].map((p) => (
                <span key={p} className="px-2 py-0.5 rounded bg-muted border border-border/50 text-xs text-muted-foreground font-medium">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
