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
      <div className="bg-white rounded-2xl shadow-lg border border-[#e8e8e8] flex flex-col items-center py-3 px-2 gap-2.5">

        {/* Social icons */}
        {socialLinks.map(({ icon: Icon, url, label }) => (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#666] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-all duration-150"
          >
            <Icon size={15} strokeWidth={1.8} />
          </a>
        ))}

        {/* Divider */}
        {socialLinks.length > 0 && promoEnabled && (
          <div className="w-5 h-px bg-[#e8e8e8] my-0.5" />
        )}

        {/* Promo button */}
        {promoEnabled && (
          <Link href="/catalog">
            <button
              className="bg-[#f5e642] text-[#1a1a1a] text-[9px] font-black uppercase tracking-widest rounded-lg px-2.5 py-3 hover:bg-[#f0dc20] active:scale-95 transition-all leading-none whitespace-nowrap"
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
