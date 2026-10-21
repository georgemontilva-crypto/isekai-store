import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Download, Share, SquarePlus, X } from "lucide-react";

/**
 * Invitación a instalar la app en el teléfono.
 *
 * - Android/Chrome: botón «Instalar» que abre el diálogo del sistema.
 * - iPhone/Safari: no hay botón posible, así que se muestran los dos pasos
 *   (Compartir → Agregar a inicio). En iPhone, además, instalarla es lo que
 *   permite recibir notificaciones.
 *
 * Aparece una sola vez cada 14 días, a los pocos segundos de navegar, nunca
 * en computadora, nunca si ya está instalada y nunca en el panel o portales.
 */
type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const CLAVE = "iw_instalar_cerrado";
const DIAS = 14;
const RUTAS_OCULTAS = ["/admin", "/vender", "/acceso", "/rueda-de-negocios", "/rueda-de-prensa", "/checkout", "/invitacion"];
const CON_BARRA_INFERIOR = ["/worldfest/pass", "/account", "/cosplay/dashboard"];

function yaInstalada() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}
function cerradaHacePoco() {
  try {
    const t = Number(localStorage.getItem(CLAVE) || 0);
    return Date.now() - t < DIAS * 86_400_000;
  } catch { return true; }
}
function esIphoneSafari() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Instagram|FBAN|FBAV/.test(ua);
}

export default function InstalarApp() {
  const [location] = useLocation();
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [modo, setModo] = useState<"android" | "ios" | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (yaInstalada() || cerradaHacePoco()) return;
    const telefono = window.matchMedia?.("(pointer: coarse)").matches && window.innerWidth < 900;
    if (!telefono) return;
    const alOfrecer = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar); setModo("android"); };
    window.addEventListener("beforeinstallprompt", alOfrecer);
    if (esIphoneSafari()) setModo("ios");
    const alInstalar = () => { setVisible(false); try { localStorage.setItem(CLAVE, String(Date.now())); } catch { /* */ } };
    window.addEventListener("appinstalled", alInstalar);
    return () => { window.removeEventListener("beforeinstallprompt", alOfrecer); window.removeEventListener("appinstalled", alInstalar); };
  }, []);

  // Se muestra tras un rato navegando (antes en el Level Pass, donde más sirve)
  useEffect(() => {
    if (!modo || visible) return;
    const espera = location.startsWith("/worldfest/pass") ? 6000 : 25000;
    const id = window.setTimeout(() => setVisible(true), espera);
    return () => window.clearTimeout(id);
  }, [modo, location, visible]);

  if (!visible || !modo || RUTAS_OCULTAS.some(r => location.startsWith(r))) return null;

  const cerrar = () => {
    setVisible(false);
    try { localStorage.setItem(CLAVE, String(Date.now())); } catch { /* sin almacenamiento */ }
  };
  const instalar = async () => {
    if (!evento) return;
    await evento.prompt().catch(() => {});
    const r = await evento.userChoice.catch(() => ({ outcome: "dismissed" }));
    setEvento(null);
    if (r.outcome === "accepted") setVisible(false); else cerrar();
  };
  const conBarra = CON_BARRA_INFERIOR.some(r => location.startsWith(r));

  return (
    <div
      className="ia-hoja fixed inset-x-3 z-[90] mx-auto max-w-md"
      style={{ bottom: `calc(env(safe-area-inset-bottom) + ${conBarra ? 78 : 14}px)` }}
      role="region"
      aria-label="Instalar la app"
    >
      <div className="relative flex gap-3.5 rounded-2xl border border-white/10 bg-[#0d0b14]/95 p-4 shadow-[0_18px_50px_-12px_rgba(0,0,0,.8)] backdrop-blur-md">
        <img src="/apple-touch-icon.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-[15px] font-bold leading-tight text-white">Instala Isekai World</p>
          {modo === "android" ? (
            <p className="mt-1 text-[13px] leading-snug text-[#a39cad]">Tu Level Pass, tus boletos y los avisos del evento, a un toque desde tu pantalla.</p>
          ) : (
            <p className="mt-1 text-[13px] leading-snug text-[#a39cad]">
              Toca <Share size={13} className="mx-0.5 inline -translate-y-px text-[#7dd8ff]" /> <strong className="text-white">Compartir</strong> y luego
              {" "}<SquarePlus size={13} className="mx-0.5 inline -translate-y-px text-[#7dd8ff]" /> <strong className="text-white">Agregar a inicio</strong>. Así recibes los avisos del evento.
            </p>
          )}
          {modo === "android" && evento && (
            <button onClick={instalar} className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#e5007d] px-4 text-[13px] font-bold text-white">
              <Download size={14} /> Instalar
            </button>
          )}
        </div>
        <button onClick={cerrar} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-[#8a8494]" aria-label="Ahora no">
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
