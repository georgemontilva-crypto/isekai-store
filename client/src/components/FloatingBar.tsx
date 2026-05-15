import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/i18n/LangContext";

export default function FloatingBar() {
  const { t } = useLang();
  const { data: settings } = trpc.settings.getAll.useQuery();

  const promoText = settings?.["promo_bar_text"] ?? "20% OFF";
  const promoEnabled = settings?.["promo_bar_enabled"] !== "false";

  const socialLinks = [
    { icon: Facebook,  url: settings?.["social_facebook"],  label: "Facebook" },
    { icon: Twitter,   url: settings?.["social_twitter"],   label: "X (Twitter)" },
    { icon: Instagram, url: settings?.["social_instagram"], label: "Instagram" },
    { icon: Youtube,   url: settings?.["social_youtube"],   label: "YouTube" },
  ].filter((s): s is typeof s & { url: string } => Boolean(s.url));

  if (!promoEnabled && socialLinks.length === 0) return null;

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-5 bg-white/70 backdrop-blur-md border border-gray-300/60 shadow-xl rounded-full py-5 px-3">

      {/* Social icons */}
      {socialLinks.map(({ icon: Icon, url, label }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="text-gray-700 hover:text-black transition-colors"
        >
          <Icon size={20} strokeWidth={1.8} />
        </a>
      ))}

      {/* Discount pill */}
      {promoEnabled && (
        <Link href="/catalog">
          <div className="bg-gray-200/80 border border-gray-300 rounded-full px-2 py-4 mt-1 cursor-pointer hover:bg-gray-300/80 transition-colors active:scale-95 transition-transform">
            <span
              className="block whitespace-nowrap text-[10px] font-bold text-gray-700 tracking-widest uppercase"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {t.floatingBar.promoLabel} {promoText}
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}
