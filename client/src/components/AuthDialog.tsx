import { useState, useEffect } from "react";
import { X, Mail, ArrowRight, Loader2 } from "lucide-react";

export default function AuthDialog() {
  const [open, setOpen]       = useState(false);
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    const open = () => setOpen(true);
    window.addEventListener("isekai:open-auth-modal", open);
    return () => window.removeEventListener("isekai:open-auth-modal", open);
  }, []);

  function close() {
    setOpen(false);
    setSent(false);
    setEmail("");
    setError("");
    setLoading(false);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Error");
      setSent(true);
    } catch {
      setError("No pudimos enviar el correo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={close}
      />

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative pointer-events-auto">

          <button
            onClick={close}
            aria-label="Cerrar"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>

          {sent ? (
            /* ── Confirmación ───────────────────────────────────────────── */
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={26} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Revisa tu correo</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Enviamos un enlace de acceso a <strong>{email}</strong>.
                <br />Expira en 15 minutos.
              </p>
              <button
                onClick={close}
                className="mt-6 text-sm text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
              >
                Cerrar
              </button>
            </div>
          ) : (
            /* ── Formulario ─────────────────────────────────────────────── */
            <>
              <div className="text-center mb-7">
                <h2 className="text-2xl font-bold text-gray-900">Iniciar sesión</h2>
                <p className="text-gray-500 text-sm mt-1">Elige cómo quieres acceder</p>
              </div>

              {/* Google */}
              <a
                href="/api/auth/google"
                className="flex items-center justify-center gap-3 w-full border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-5"
              >
                <GoogleIcon />
                Continuar con Google
              </a>

              {/* Divider */}
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-400">o con tu correo</span>
                </div>
              </div>

              {/* Magic link */}
              <form onSubmit={sendMagicLink} noValidate>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent mb-3 placeholder:text-gray-400"
                />

                {error && (
                  <p className="text-red-500 text-xs mb-3">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-[#171717] text-white rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      Enviar enlace de acceso
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.1 34.4 29.6 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.8 20-21 0-1.4-.1-2.7-.5-4z"/>
      <path fill="#34A853" d="M7 14.1l7 5.1C15.8 15.4 19.5 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.6 7 14.1z"/>
      <path fill="#FBBC05" d="M24 45c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.4C29.6 36.1 27 37 24 37c-5.6 0-10.1-3.6-11.7-8.6L5 33.9C8.6 40.5 15.8 45 24 45z"/>
      <path fill="#EA4335" d="M44.5 20H24v8.5h11.7c-.7 3.1-2.7 5.7-5.4 7.4l6.6 5.4C40.8 37.2 44 31 44 24c0-1.4-.1-2.7-.5-4z"/>
    </svg>
  );
}
