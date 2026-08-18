import { Link, useLocation } from "wouter";
import { Facebook, Twitter, Instagram, Youtube, ArrowRight, Headphones, Truck, Users, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LangContext";
import { trpc } from "@/lib/trpc";

/** Cuántas colecciones se listan en el footer antes del enlace "Ver más" */
const FOOTER_COLLECTIONS_LIMIT = 6;

export default function Footer() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const { data: siteSettings } = trpc.settings.getAll.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const storeName = siteSettings?.["store_name"] ?? "Isekai World";
  const logoUrl = siteSettings?.["store_logo_dark_url"] ?? siteSettings?.["store_logo_url"] ?? null;
  const logoHeightFooter = parseInt(siteSettings?.["store_logo_height_footer"] ?? "36");

  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => { toast.success("¡Suscrito! Bienvenido a la comunidad 🎌"); setEmail(""); },
    onError:   () => toast.error("Error al suscribirse, intenta de nuevo"),
  });

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) subscribe.mutate({ email: email.trim() });
  };

  const trustIcons = [Headphones, Truck, Users, Lock];

  // La barra de confianza solo se muestra en la tienda y en el detalle de producto.
  // Fuera de ahí (cosplay guild, perfiles de cosplayer, blog, etc.) no aplica.
  const [location] = useLocation();
  const showTrustBar = location === "/catalog" || location.startsWith("/product/");

  return (
    <footer>
      {/* Trust Bar */}
      {showTrustBar && (
      <div className="border-t border-[#ebebeb] bg-white">
        <div className="container py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
            {t.footer.trust.map(({ title, desc }, i) => {
              const Icon = trustIcons[i];
              return (
                <div key={title} className="flex items-start gap-3">
                  <Icon className="w-5 h-5 shrink-0 mt-0.5 text-[#1a1a1a]" strokeWidth={1.5} />
                  <div>
                    <p className="font-semibold text-[13px] text-[#1a1a1a]">{title}</p>
                    <p className="text-[12px] text-[#888] mt-0.5 leading-snug">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Main Footer */}
      <div className="bg-[#1a1a1a] text-white">
        <div className="container py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                {logoUrl ? (
                  <img src={logoUrl} alt={storeName} style={{ height: logoHeightFooter, width: 'auto' }} className="object-contain" />
                ) : (
                  <>
                    <div className="flex items-end gap-[2px]">
                      {[6,10,14,10,6].map((h,i) => <div key={i} className="w-[3px] bg-white rounded-full" style={{height:`${h}px`}}/>)}
                    </div>
                    <span className="font-bold text-lg md:text-[15px] tracking-tight">{storeName}</span>
                  </>
                )}
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed mb-5">{t.footer.tagline}</p>
              <div className="flex items-center gap-2.5 mb-5">
                {([["Facebook", Facebook], ["Twitter", Twitter], ["Instagram", Instagram], ["YouTube", Youtube]] as const).map(([name, Icon]) => (
                  <a key={name} href="#" aria-label={name} className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/55 hover:text-white hover:border-white/60 transition-all">
                    <Icon size={13}/>
                  </a>
                ))}
              </div>
              <div className="text-[12px] text-white/40 space-y-1">
                <p>hola@isekaiworld.co</p>
              </div>
            </div>

            {/* Collections */}
            <div>
              <h4 className="footer-heading font-semibold text-[13px] mb-5 text-white">{t.footer.collections}</h4>
              <ul className="space-y-3">
                {categories.slice(0, FOOTER_COLLECTIONS_LIMIT).map(cat => (
                  <li key={cat.id}><Link href={`/catalog?category=${cat.slug}`} className="text-[13px] text-white/55 hover:text-white transition-colors">{cat.name}</Link></li>
                ))}
                {categories.length > FOOTER_COLLECTIONS_LIMIT && (
                  <li>
                    <Link href="/collections" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#e5007d] hover:text-white transition-colors">
                      Ver más<ArrowRight size={12} />
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            {/* Info */}
            <div>
              <h4 className="footer-heading font-semibold text-[13px] mb-5 text-white">{t.footer.info}</h4>
              <ul className="space-y-3">
                {t.footer.infoLinks.map(({ label, href }) => (
                  <li key={label}><Link href={href} className="text-[13px] text-white/55 hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              {/* CTA */}
              <h3 className="text-2xl font-black text-[#e5007d] mb-2">
                ¡No te pierdas nada!
              </h3>
              <p className="text-[#aaa] text-sm leading-relaxed mb-5">
                Drops exclusivos, preventa anticipada y descuentos solo para suscriptores.
              </p>
              <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t.footer.newsletterPlaceholder}
                  required
                  disabled={subscribe.isPending}
                  className="w-full sm:flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-[13px] text-white placeholder:text-white/40 outline-none focus:border-white/50 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  aria-label="Suscribirse"
                  disabled={subscribe.isPending}
                  className="w-full sm:w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1a1a1a] hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  <ArrowRight size={15}/>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[12px] text-white/35">© {new Date().getFullYear()} {storeName}. {t.footer.copyright}.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/politicas" className="text-[12px] text-white/35 hover:text-white/60 transition-colors underline underline-offset-2">{t.footer.policies}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
