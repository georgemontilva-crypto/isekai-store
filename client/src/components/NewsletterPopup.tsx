import { useState, useEffect } from "react";
import { useLang } from "@/i18n/LangContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, CheckCircle2 } from "lucide-react";

const STORAGE_KEY = "isekai_newsletter_dismissed";

export default function NewsletterPopup() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);
  const [imageVisible, setImageVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    // Show popup after 3 seconds
    const popupTimer = setTimeout(() => {
      setVisible(true);
      // Image slides in 1 second after the popup appears
      setTimeout(() => setImageVisible(true), 1000);
    }, 3000);

    return () => clearTimeout(popupTimer);
  }, []);

  function dismiss() {
    setVisible(false);
    sessionStorage.setItem(STORAGE_KEY, "1");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      dismiss();
    }, 2000);
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
                        src="https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&auto=format&fit=crop"
                        alt="Figura coleccionable"
                        className="w-full h-full object-cover"
                        style={{ minHeight: 280 }}
                      />
                      {/* Subtle gradient overlay on right edge to blend with content */}
                      <div
                        className="absolute inset-y-0 right-0 w-8"
                        style={{
                          background:
                            "linear-gradient(to right, transparent, white)",
                        }}
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
                        Sign up and get{" "}
                        <span className="relative inline-block">
                          20% off
                          <span
                            className="absolute bottom-0.5 left-0 right-0 h-[2px] rounded-full"
                            style={{ background: "#f59e0b" }}
                          />
                        </span>{" "}
                        your first order
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
                        />
                        <button
                          type="submit"
                          className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center hover:bg-[#333] transition-colors flex-shrink-0 active:scale-95"
                        >
                          <ArrowRight size={15} className="text-white" />
                        </button>
                      </form>

                      <p className="text-xs text-gray-400 leading-relaxed mb-5">
                        Subscribe to our newsletter and be the first to hear
                        about our new arrivals, special promotions and online
                        exclusives.
                      </p>

                      {/* Social icons */}
                      <div className="flex items-center gap-3">
                        {[
                          {
                            label: "Facebook",
                            svg: (
                              <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-4 h-4"
                              >
                                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                              </svg>
                            ),
                          },
                          {
                            label: "X",
                            svg: (
                              <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-4 h-4"
                              >
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                            ),
                          },
                          {
                            label: "Instagram",
                            svg: (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="w-4 h-4"
                              >
                                <rect
                                  x="2"
                                  y="2"
                                  width="20"
                                  height="20"
                                  rx="5"
                                  ry="5"
                                />
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                              </svg>
                            ),
                          },
                          {
                            label: "YouTube",
                            svg: (
                              <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-4 h-4"
                              >
                                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                                <polygon
                                  fill="white"
                                  points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"
                                />
                              </svg>
                            ),
                          },
                        ].map(({ label, svg }) => (
                          <button
                            key={label}
                            aria-label={label}
                            className="text-[#1a1a1a] hover:text-gray-500 transition-colors"
                          >
                            {svg}
                          </button>
                        ))}
                      </div>
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
