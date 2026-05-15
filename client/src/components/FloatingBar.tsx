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
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center">
      <div className="bg-white rounded-3xl shadow-lg border border-[#ebebeb] flex flex-col items-center py-4 px-3 gap-5">

        {/* Social icons */}
        {socialLinks.map(({ icon: Icon, url, label }) => (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#555] hover:text-[#1a1a1a] hover:bg-[#f0f0f0] transition-all duration-150"
          >
            <Icon size={20} strokeWidth={1.8} />
          </a>
        ))}

        {/* Divider */}
        {socialLinks.length > 0 && promoEnabled && (
          <div className="w-6 h-px bg-[#e0e0e0]" />
        )}

        {/* Promo button */}
        {promoEnabled && (
          <Link href="/catalog">
            <button
              className="bg-[#1a1a1a] text-white text-[9px] font-black uppercase tracking-widest rounded-2xl px-3 py-4 hover:bg-[#333] active:scale-95 transition-all leading-none whitespace-nowrap"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {t.floatingBar.promoLabel} {promoText}
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}
