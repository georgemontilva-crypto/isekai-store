import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAntiSpam } from "@/hooks/useAntiSpam";

/**
 * WORLD FEST — página de expectativa del primer evento de Isekai World.
 *
 * Dirección visual: el lenguaje del Sistema. Ventanas holográficas azules con
 * esquinas en corchete, texto que se escribe solo, rangos de cazador y una
 * puerta abierta sobre Maracaibo. El vocabulario del teaser es de ese mundo:
 * aquí no hay "próximamente", hay una NOTIFICACIÓN.
 *
 * Son elementos de género construidos desde cero para Isekai World: no se
 * reproduce arte, logotipos ni nombres de ninguna obra existente.
 *
 * Textos e imágenes se editan desde el panel admin.
 */

const FALLBACK = {
  kicker: "Maracaibo · Venezuela",
  title: "WORLD FEST",
  subtitle: "Se abrió un portal en Maracaibo. Ubicación desconocida. Del otro lado está el primer festival de Isekai World.",
  dateLabel: "Fecha por revelar",
};

/** Las misiones del festival. El rango sube porque sí es una escalada real. */
const MISIONES = [
  {
    rank: "B",
    locked: false,
    title: "Pasarela de cazadores",
    body: "El Cosplay Guild sale del catálogo y pisa un escenario. Categorías, jurado y premios reales.",
  },
  // Las dos siguientes se revelan más adelante: por ahora solo se sabe que existen
  {
    rank: "?",
    locked: true,
    title: "Misión sin revelar",
    body: "El Sistema todavía no libera esta información.",
  },
  {
    rank: "?",
    locked: true,
    title: "Misión sin revelar",
    body: "El Sistema todavía no libera esta información.",
  },
];

/** Texto de la notificación del hero, escrito carácter a carácter. */
const ALERTA = "Se abrió un portal en Maracaibo. Ubicación desconocida.";

type GateState = "boot" | "ask" | "loading" | "denied" | "open";

export default function WorldFest() {
  const { data: settings } = trpc.settings.getAll.useQuery();
  const [, navigate] = useLocation();

  // Puerta de entrada: la notificación del Sistema. Se pregunta una vez por
  // sesión; si ya aceptó, no se le vuelve a preguntar al navegar de vuelta.
  const [gate, setGate] = useState<GateState>(() => {
    try { return sessionStorage.getItem("wf_gate") === "ok" ? "open" : "boot"; }
    catch { return "boot"; }
  });
  const [progress, setProgress] = useState(0);

  // Un segundo de oscuridad antes de que la notificación "encienda"
  useEffect(() => {
    if (gate !== "boot") return;
    const id = setTimeout(() => setGate("ask"), 1000);
    return () => clearTimeout(id);
  }, [gate]);

  // Carga de 0 a 100 con avance irregular, como un sistema descifrando algo
  useEffect(() => {
    if (gate !== "loading") return;
    let value = 0;
    const id = setInterval(() => {
      value = Math.min(100, value + (Math.random() < 0.18 ? 0 : Math.ceil(Math.random() * 4)));
      setProgress(value);
      if (value >= 100) {
        clearInterval(id);
        setTimeout(() => {
          try { sessionStorage.setItem("wf_gate", "ok"); } catch { /* privado */ }
          setGate("open");
        }, 450);
      }
    }, 55);
    return () => clearInterval(id);
  }, [gate]);

  // Rechazo: mensaje y de vuelta al inicio
  useEffect(() => {
    if (gate !== "denied") return;
    const id = setTimeout(() => navigate("/"), 2800);
    return () => clearTimeout(id);
  }, [gate, navigate]);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [typed, setTyped] = useState("");
  const antiSpam = useAntiSpam();

  // En teléfono el contenedor de la página no siempre cubre hasta abajo: al
  // colapsar la barra del navegador o al rebotar el scroll asoma el fondo del
  // documento, que es blanco. Se pinta el <html> y el <body> mientras esta
  // página esté montada y se restaura al salir.
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.backgroundColor;
    html.style.backgroundColor = "#04060f";
    return () => {
      html.style.backgroundColor = prevHtml;
    };
  }, []);

  // Máquina de escribir de la alerta del Sistema.
  // Arranca cuando la puerta ya se abrió, que es cuando el hero se ve.
  useEffect(() => {
    if (gate !== "open") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(ALERTA);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(ALERTA.slice(0, i));
      if (i >= ALERTA.length) clearInterval(id);
    }, 45);
    return () => clearInterval(id);
  }, [gate]);

  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => { setDone(true); toast.success("Registro aceptado"); },
    onError: () => toast.error("No pudimos guardar tu correo, intenta de nuevo"),
  });

  const heroImage = settings?.["worldfest_hero_image"] ?? "";
  const teaserImage = settings?.["worldfest_teaser_image"] ?? "";
  const bgVideo = settings?.["worldfest_bg_video"] ?? "";
  const kicker = settings?.["worldfest_kicker"] || FALLBACK.kicker;
  const title = settings?.["worldfest_title"] || FALLBACK.title;
  const subtitle = settings?.["worldfest_subtitle"] || FALLBACK.subtitle;
  const dateLabel = settings?.["worldfest_date_label"] || FALLBACK.dateLabel;

  const join = () => {
    const value = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      toast.error("Escribe un correo válido");
      return;
    }
    subscribe.mutate({ email: value, source: "worldfest", ...antiSpam.fields() });
  };

  const corners = (
    <>
      <span className="wf-corner -left-px -top-px border-l-2 border-t-2" />
      <span className="wf-corner -right-px -top-px border-r-2 border-t-2" />
      <span className="wf-corner -bottom-px -left-px border-b-2 border-l-2" />
      <span className="wf-corner -bottom-px -right-px border-b-2 border-r-2" />
    </>
  );

  return (
    <div className="relative min-h-[100dvh] bg-[#04060f] text-[#dceaff]">
      {/* Video de fondo (estática). Va fijo detrás de todo; las capas azules
          de arriba son translúcidas para que se siga viendo el efecto. */}
      {bgVideo && (
        /* El video vive DENTRO de la página, no como capa global: así no puede
           taparse con el fondo de un contenedor padre ni cubrir el footer.
           El `sticky` le da el efecto de fondo fijo sin salirse de la página. */
        <div className="pointer-events-none absolute inset-0">
          <video
            src={bgVideo}
            autoPlay
            muted
            loop
            playsInline
            className="sticky top-0 h-[100dvh] w-full object-cover opacity-70"
          />
          {/* Tinte azul del Sistema por encima del video */}
          <div className="absolute inset-0 bg-[#04102a]/55 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_115%,rgba(18,58,107,0.55)_0%,rgba(10,24,54,0.45)_42%,rgba(4,6,15,0.75)_100%)]" />
        </div>
      )}

      <style>{`
        /* La puerta: un vórtice que respira sobre el horizonte */
        @keyframes wf-gate {
          0%, 100% { transform: scale(1) rotate(0deg);    opacity: 0.55; }
          50%      { transform: scale(1.09) rotate(4deg); opacity: 0.85; }
        }
        /* Barrido de escaneo dentro de las ventanas del Sistema */
        @keyframes wf-scan {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        /* Aparición: como si el Sistema proyectara la ventana */
        @keyframes wf-boot {
          0%   { opacity: 0; transform: translateY(10px) scaleY(0.9); filter: blur(6px); }
          100% { opacity: 1; transform: translateY(0) scaleY(1);      filter: blur(0); }
        }
        @keyframes wf-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }

        .wf-gate  { animation: wf-gate 7s ease-in-out infinite; }
        .wf-boot  { animation: wf-boot 0.55s cubic-bezier(.23,1,.32,1) both; }
        .wf-caret { animation: wf-caret 1s step-end infinite; }
        .wf-scan::before {
          content: "";
          position: absolute; left: 0; right: 0; top: 0; height: 28%;
          background: linear-gradient(180deg, transparent, rgba(125,220,255,0.10), transparent);
          animation: wf-scan 4.5s linear infinite;
          pointer-events: none;
        }
        /* Ventana del Sistema */
        .wf-window {
          position: relative;
          border: 1px solid rgba(93,180,255,0.45);
          background: linear-gradient(180deg, rgba(10,30,60,0.72), rgba(6,16,36,0.72));
          box-shadow: inset 0 0 0 1px rgba(93,180,255,0.10), 0 0 42px rgba(60,150,255,0.18);
          backdrop-filter: blur(3px);
          overflow: hidden;
        }
        .wf-window::after {
          content: "";
          position: absolute; inset: 6px;
          border: 1px solid rgba(93,180,255,0.16);
          pointer-events: none;
        }
        .wf-corner {
          position: absolute; width: 14px; height: 14px;
          border-color: #7dd8ff; pointer-events: none;
        }
        .wf-locked { opacity: 0.72; }
        /* Glitch: cortes horizontales + separación RGB, como señal dañada */
        @keyframes wf-glitch-clip {
          0%   { clip-path: inset(0 0 0 0); transform: translate(0); }
          8%   { clip-path: inset(12% 0 78% 0); transform: translate(-3px, 1px); }
          12%  { clip-path: inset(0 0 0 0); transform: translate(0); }
          34%  { clip-path: inset(64% 0 8% 0);  transform: translate(3px, -1px); }
          38%  { clip-path: inset(0 0 0 0); transform: translate(0); }
          61%  { clip-path: inset(38% 0 42% 0); transform: translate(-2px, 0); }
          65%  { clip-path: inset(0 0 0 0); transform: translate(0); }
          100% { clip-path: inset(0 0 0 0); transform: translate(0); }
        }
        @keyframes wf-rgb {
          0%, 100% { text-shadow: 0 0 14px rgba(125,216,255,0.6); }
          10%      { text-shadow: -2px 0 #ff2d78, 2px 0 #35e0ff, 0 0 18px rgba(125,216,255,0.8); }
          11%      { text-shadow: 0 0 14px rgba(125,216,255,0.6); }
          52%      { text-shadow: 2px 0 #ff2d78, -2px 0 #35e0ff, 0 0 18px rgba(125,216,255,0.8); }
          53%      { text-shadow: 0 0 14px rgba(125,216,255,0.6); }
        }
        @keyframes wf-flicker { 0%,100% { opacity: 1; } 92% { opacity: 1; } 93% { opacity: 0.55; } 94% { opacity: 1; } 97% { opacity: 0.8; } }
        @keyframes wf-reveal {
          0%   { opacity: 0; filter: blur(10px) saturate(2); transform: scale(1.02); }
          40%  { opacity: 1; filter: blur(0) saturate(1.4); }
          46%  { transform: scale(1) translateX(-2px); }
          50%  { transform: translateX(2px); }
          54%  { transform: translateX(0); }
          100% { opacity: 1; filter: none; transform: none; }
        }
        .wf-glitch     { animation: wf-glitch-clip 2.6s steps(1) infinite, wf-rgb 2.6s linear infinite; }
        .wf-flicker    { animation: wf-flicker 3.4s linear infinite; }
        .wf-reveal     { animation: wf-reveal 0.9s cubic-bezier(.23,1,.32,1) both; }
        .wf-gate-layer {
          position: fixed; inset: 0; z-index: 80;
          display: flex; align-items: center; justify-content: center;
          /* Translúcido: el video de fondo se asoma detrás de la puerta */
          background:
            repeating-linear-gradient(0deg, rgba(125,216,255,0.03) 0 1px, transparent 1px 3px),
            radial-gradient(120% 90% at 50% 115%, rgba(14,43,82,0.66) 0%, rgba(8,20,40,0.62) 45%, rgba(4,6,15,0.82) 100%);
          padding: 1.5rem;
        }
        /* Encendido de TV vieja: punto → línea horizontal → pantalla completa,
           con el fogonazo de brillo del tubo al arrancar */
        @keyframes wf-crt-on {
          0%   { opacity: 0; transform: scale(0.01, 0.004); filter: brightness(9) saturate(0); }
          18%  { opacity: 1; transform: scale(0.55, 0.004); filter: brightness(10) saturate(0); }
          42%  { transform: scale(1, 0.004);  filter: brightness(9) saturate(0.2); }
          58%  { transform: scale(1, 0.035);  filter: brightness(6); }
          78%  { transform: scale(1, 1.04);   filter: brightness(1.9); }
          88%  { transform: scale(1, 0.99);   filter: brightness(1.15); }
          100% { opacity: 1; transform: scale(1, 1); filter: brightness(1); }
        }
        .wf-crt-on { animation: wf-crt-on 0.85s cubic-bezier(.19,1,.22,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .wf-gate, .wf-scan::before, .wf-caret { animation: none; }
          .wf-boot { animation: none; opacity: 1; }
          .wf-glitch, .wf-flicker { animation: none; }
          .wf-crt-on { animation: none; opacity: 1; }
          .wf-reveal { animation: none; opacity: 1; }
        }
      `}</style>

      {/* ─── Puerta de entrada: notificación del Sistema ─────────────────── */}
      {gate === "boot" && (
        <div className="wf-gate-layer" style={{ background: "#04060f" }} />
      )}

      {gate === "ask" && (
        <div className="wf-gate-layer">
          <div className="wf-window wf-crt-on wf-scan wf-flicker w-full max-w-md rounded-sm p-6 sm:p-8">
            {corners}
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#7dd8ff] font-black text-[#7dd8ff]">!</span>
              <span className="wf-glitch border border-[#7dd8ff]/60 bg-[#7dd8ff]/10 px-4 py-1.5 font-mono text-sm font-black uppercase tracking-[0.3em] text-white">
                Notificación
              </span>
            </div>
            <p className="font-mono text-sm leading-relaxed text-[#e8f4ff] sm:text-[15px]">
              Estás a punto de entrar en un <span className="font-bold text-[#ff2d78]">universo desconocido</span>.
            </p>
            <p className="mt-2 font-mono text-sm leading-relaxed text-[#e8f4ff] sm:text-[15px]">
              ¿Seguro que quieres entrar?
            </p>
            <div className="mt-7 flex gap-3">
              <button
                onClick={() => { setProgress(0); setGate("loading"); }}
                className="flex-1 border border-[#7dd8ff]/60 bg-[#7dd8ff]/10 py-3 font-mono text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#7dd8ff]/25"
              >
                Sí
              </button>
              <button
                onClick={() => setGate("denied")}
                className="flex-1 border border-[#5db4ff]/30 py-3 font-mono text-sm font-black uppercase tracking-[0.2em] text-[#8fb0d6] transition-colors hover:border-[#ff2d78]/60 hover:text-[#ff2d78]"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {gate === "loading" && (
        <div className="wf-gate-layer">
          <div className="flex flex-col items-center">
            {/* Círculo de carga */}
            <div className="relative h-44 w-44">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(93,180,255,0.15)" strokeWidth="3" />
                <circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke="#7dd8ff" strokeWidth="3" strokeLinecap="butt"
                  strokeDasharray={2 * Math.PI * 54}
                  strokeDashoffset={2 * Math.PI * 54 * (1 - progress / 100)}
                  style={{ transition: "stroke-dashoffset 80ms linear", filter: "drop-shadow(0 0 8px rgba(125,216,255,0.8))" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="wf-glitch font-mono text-4xl font-black text-white">{progress}%</span>
              </div>
            </div>
            <p className="wf-flicker mt-8 font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-[#7dd8ff]">
              Abriendo la puerta…
            </p>
          </div>
        </div>
      )}

      {gate === "denied" && (
        <div className="wf-gate-layer">
          <div className="wf-window wf-boot wf-scan w-full max-w-md rounded-sm p-6 sm:p-8 text-center">
            {corners}
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#5db4ff]">
              [ Acceso denegado ]
            </p>
            <p className="wf-glitch mt-4 font-mono text-base leading-relaxed text-[#e8f4ff]">
              Haces bien en irte.
            </p>
            <p className="mt-1.5 font-mono text-sm text-[#8fb0d6]">
              Significa que no estás preparado.
            </p>
          </div>
        </div>
      )}

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      {gate === "open" && (
      <div className="wf-reveal">
      <section className="relative z-10 flex min-h-[78svh] items-center overflow-hidden">
        <div className="absolute inset-0">
          {heroImage ? (
            <img src={heroImage} alt="" className="h-full w-full object-cover opacity-45" />
          ) : !bgVideo ? (
            <div className="h-full w-full bg-[radial-gradient(120%_90%_at_50%_115%,#123a6b_0%,#0a1836_42%,#04060f_100%)]" />
          ) : null}

          {/* La puerta */}
          <div
            className="wf-gate pointer-events-none absolute left-1/2 top-[62%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(160,240,255,0.30) 0%, rgba(70,150,255,0.24) 26%, rgba(120,60,255,0.20) 48%, transparent 68%)",
              filter: "blur(22px)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#04060f]/90 via-transparent to-[#04060f]/90" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-14 sm:py-16">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7dd8ff]/60 transition-colors hover:text-[#7dd8ff]">
            <ArrowLeft size={13} /> Volver
          </Link>

          {/* Notificación del Sistema */}
          <div className="wf-window wf-boot wf-scan mb-7 max-w-lg rounded-sm px-5 py-4">
            {corners}
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#7dd8ff]">
              [ Notificación del Sistema ]
            </p>
            <p className="mt-2.5 font-mono text-sm text-[#e8f4ff] sm:text-[15px]">
              {typed}
              <span className="wf-caret ml-0.5 text-[#7dd8ff]">▌</span>
            </p>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-5 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-[#5db4ff]"
          >
            <span className="h-px w-10 bg-[#5db4ff]/60" />
            {kicker}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="text-[clamp(3.2rem,14vw,11rem)] font-black uppercase leading-[0.82] tracking-[-0.045em] text-white"
            style={{ textShadow: "0 0 80px rgba(93,180,255,0.45), 0 0 22px rgba(125,216,255,0.25)" }}
          >
            {title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#a8c6ea] sm:text-base"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.95 }}
            className="mt-7 inline-flex items-center gap-3 rounded-sm border border-[#5db4ff]/50 bg-[#5db4ff]/10 px-5 py-2.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7dd8ff] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7dd8ff]" />
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#7dd8ff]">{dateLabel}</span>
          </motion.div>
        </div>
      </section>

      {/* ─── Misiones ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#5db4ff]">
          [ Misiones detectadas ]
        </p>
        <h2 className="max-w-2xl text-[clamp(1.8rem,4.5vw,3rem)] font-black uppercase leading-[0.95] tracking-tight text-white">
          Lo que hay del otro lado
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#8fb0d6]">
          Todavía no revelamos la fecha. Sí podemos decir a qué te vas a enfrentar cuando la puerta se abra del todo.
        </p>

        <div className="mt-9 grid gap-4 sm:grid-cols-3">
          {MISIONES.map((m, i) => (
            <div
              key={i}
              className={`wf-window wf-scan rounded-sm p-6 transition-transform ${m.locked ? "wf-locked" : "hover:-translate-y-1"}`}
            >
              {corners}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#5db4ff]">
                  {m.locked ? "Bloqueada" : "Rango"}
                </span>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-sm border font-black ${
                    m.locked
                      ? "border-[#5db4ff]/25 bg-[#5db4ff]/5 text-[#5db4ff]/60"
                      : "border-[#7dd8ff]/50 bg-[#7dd8ff]/10 text-[#7dd8ff]"
                  }`}
                  style={m.locked ? undefined : { textShadow: "0 0 14px rgba(125,216,255,0.7)" }}
                >
                  {m.rank}
                </span>
              </div>
              <h3 className={`mt-5 text-lg font-black uppercase leading-tight tracking-tight ${m.locked ? "text-white/35" : "text-white"}`}>
                {m.title}
              </h3>
              <p className={`mt-3 text-sm leading-relaxed ${m.locked ? "text-[#8fb0d6]/45" : "text-[#8fb0d6]"}`}>
                {m.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Imagen del festival ──────────────────────────────────────────── */}
      {teaserImage && (
        <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16 sm:pb-20">
          <div className="wf-window relative rounded-sm p-1.5">
            {corners}
            <img src={teaserImage} alt="" className="w-full object-cover" />
          </div>
        </section>
      )}

      {/* ─── Registro ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 overflow-hidden border-t border-[#5db4ff]/15 bg-[#060b1c]/80 py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(70,150,255,0.22)_0%,transparent_65%)]" />
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#5db4ff]">
            [ Registro de cazadores ]
          </p>
          <h2 className="text-[clamp(1.8rem,5vw,3rem)] font-black uppercase leading-[0.95] tracking-tight text-white">
            Entra antes que nadie
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[#8fb0d6]">
            Deja tu correo y recibes la fecha, la sede y el acceso a entradas antes de que se anuncie.
          </p>

          {done ? (
            <div className="mx-auto mt-7 inline-flex items-center gap-2.5 rounded-sm border border-[#7dd8ff]/45 bg-[#7dd8ff]/10 px-6 py-3.5">
              <Check size={16} className="text-[#7dd8ff]" />
              <span className="font-mono text-sm font-bold text-[#7dd8ff]">Registro aceptado</span>
            </div>
          ) : (
            <div className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row">
              <antiSpam.HoneyPot />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") join(); }}
                placeholder="tu@correo.com"
                aria-label="Tu correo"
                className="flex-1 rounded-sm border border-[#5db4ff]/35 bg-[#0a1730] px-5 py-3.5 font-mono text-sm text-white outline-none transition-colors placeholder:text-[#5580b0] focus:border-[#7dd8ff]"
              />
              <button
                onClick={join}
                disabled={subscribe.isPending}
                className="flex items-center justify-center gap-2 rounded-sm bg-[#e5007d] px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#c4006b] disabled:opacity-60"
              >
                {subscribe.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                Registrarme
              </button>
            </div>
          )}

          <p className="mt-6 font-mono text-xs text-[#5580b0]">Sin spam. Solo lo del festival.</p>
        </div>
      </section>
      </div>
      )}
    </div>
  );
}
