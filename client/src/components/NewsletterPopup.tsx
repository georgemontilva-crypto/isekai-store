import { useState, useEffect } from "react";
import { useLang } from "@/i18n/LangContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STORAGE_KEY = "isekai_newsletter_dismissed";

export default function NewsletterPopup() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);
  const [imageVisible, setImageVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: settings } = trpc.settings.getAll.useQuery();
  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => { setSubmitted(true); setTimeout(dismiss, 2000); },
    onError: () => toast.error("Error al suscribirse, intenta de nuevo"),
  });

  const popupEnabled = settings?.["popup_enabled"] !== "false";
  const showOnce = settings?.["popup_show_once"] === "true";
  const delayMs = parseInt(settings?.["popup_delay_seconds"] ?? "3", 10) * 1000;
  const popupTitle = settings?.["popup_title"] || "Sign up and get 20% off your first order";
  const popupSubtitle = settings?.["popup_subtitle"] || "Subscribe and be the first to hear about new arrivals, special promotions and online exclusives.";
  const popupImage = settings?.["popup_image"] || "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&auto=format&fit=crop";
  const popupCtaText = settings?.["popup_cta_text"] || "";
  const popupCtaUrl = settings?.["popup_cta_url"] || "";

  useEffect(() => {
    if (!settings) return;
    if (!popupEnabled) return;

    const storage = showOnce ? localStorage : sessionStorage;
    if (storage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => {
      setVisible(true);
      setTimeout(() => setImageVisible(true), 1000);
    }, isNaN(delayMs) ? 3000 : delayMs);

    return () => clearTimeout(timer);
  }, [settings, popupEnabled, showOnce, delayMs]);

  function dismiss() {
    setVisible(false);
    const storage = showOnce ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEY, "1");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    subscribe.mutate({ email: email.trim() });
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[9998] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            className="fixed z-[9999] inset-0 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              className="relative bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
              style={{ width: "min(580px, 92vw)", maxHeight: "90vh" }}
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* Close button */}
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-gray-100 flex items-center justify-center transition-colors shadow-sm"
                aria-label="Cerrar"
              >
                <X size={16} className="text-gray-600" />
              </button>

              <div className="flex">
                {/* Image panel — slides in from right */}
                <AnimatePresence>
                  {imageVisible && (
                    <motion.div
                      key="popup-image"
                      className="relative hidden sm:block flex-shrink-0"
                      style={{ width: 200 }}
                      initial={{ x: 60, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 60, opacity: 0 }}
                      transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
                    >
                      <img
                        src={popupImage}
                        alt="Isekai World"
                        className="w-full h-full object-cover"
                        style={{ minHeight: 280 }}
                      />
                      <div
                        className="absolute inset-y-0 right-0 w-8"
                        style={{ background: "linear-gradient(to right, transparent, white)" }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content panel */}
                <div className="flex flex-col justify-center p-8 flex-1 min-w-0">
                  {submitted ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-4"
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CheckCircle2 className="w-6 h-6 text-green-500" strokeWidth={2} />
                        <p className="text-2xl font-black text-[#1a1a1a]">¡Gracias!</p>
                      </div>
                      <p className="text-sm text-gray-500">
                        Te enviamos tu código de descuento al correo.
                      </p>
                    </motion.div>
                  ) : (
                    <>
                      <p
                        className="text-xs font-bold tracking-[0.18em] uppercase text-gray-400 mb-3"
                        style={{ fontFamily: "'Orbitron', sans-serif" }}
                      >
                        First timer?
                      </p>
                      <h2 className="text-2xl font-black text-[#1a1a1a] leading-tight mb-5">
                        {popupTitle}
                      </h2>

                      <form
                        onSubmit={handleSubmit}
                        className="flex items-center bg-[#f5f5f5] rounded-xl px-4 py-1 mb-4 gap-2"
                      >
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t?.nav?.searchPlaceholder ?? "Tu email"}
                          className="flex-1 bg-transparent text-sm text-[#1a1a1a] placeholder-gray-400 outline-none py-2.5"
                          required
                          disabled={subscribe.isPending}
                        />
                        <button
                          type="submit"
                          disabled={subscribe.isPending}
                          className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center hover:bg-[#333] transition-colors flex-shrink-0 active:scale-95 disabled:opacity-50"
                        >
                          <ArrowRight size={15} className="text-white" />
                        </button>
                      </form>

                      <p className="text-xs text-gray-400 leading-relaxed mb-5">
                        {popupSubtitle}
                      </p>

                      {popupCtaUrl && popupCtaText && (
                        <a
                          href={popupCtaUrl}
                          onClick={dismiss}
                          className="text-xs font-semibold text-[#1a1a1a] underline underline-offset-2 hover:text-gray-600 transition-colors"
                        >
                          {popupCtaText}
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
