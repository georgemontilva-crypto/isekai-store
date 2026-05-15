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
    <div
      className="fixed left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center bg-white/70 backdrop-blur-md border border-gray-300/60 shadow-xl rounded-full"
      style={{ width: 52, padding: "8px 0" }}
    >
      {/* Social icons */}
      {socialLinks.map(({ icon: Icon, url, label }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="w-[60px] h-[60px] flex items-center justify-center text-gray-700 hover:text-black transition-colors"
        >
          <Icon size={20} strokeWidth={1.8} />
        </a>
      ))}

      {/* Discount pill */}
      {promoEnabled && (
        <Link href="/catalog">
          <div
            className="flex items-center justify-center rounded-full cursor-pointer hover:opacity-80 active:scale-95 transition-all mt-1"
            style={{ width: 36, padding: "16px 0", background: "#171717" }}
          >
            <span
              className="block whitespace-nowrap uppercase"
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                fontSize: 10,
                fontFamily: "Inter, sans-serif",
                color: "#ffffff",
                letterSpacing: "0.1em",
                fontWeight: 700,
              }}
            >
              {t.floatingBar.promoLabel} {promoText}
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}
