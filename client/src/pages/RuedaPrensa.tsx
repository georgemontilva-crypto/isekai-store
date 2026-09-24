import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Check, CalendarPlus, Navigation, Ticket, Mic, Megaphone, Handshake, Users, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/i18n/LangContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";

/**
 * Isekai World Fest 2027 — invitación a la rueda de prensa.
 *
 * Misma estética que la invitación impresa: fondo oscuro con humo rojo,
 * panel rojo en V con la calavera en la muesca y las tres columnas de fecha,
 * hora y ubicación. El botón confirma asistencia sin registro (una vez por
 * navegador) y solo sirve para contar cuántos vendrán. El acceso real es con
 * la invitación física.
 */

/** Sábado 7 de noviembre de 2026, 4:30 p. m. en Venezuela (UTC−4) */
const INICIO = new Date("2026-11-07T16:30:00-04:00");
const FIN = new Date("2026-11-07T19:00:00-04:00");
const LOGO_CALAVERA = "https://pub-c4fd9395c33848c3be4160fe5f9532a4.r2.dev/isekai-world/banner/Favicon-11%20grande-11.png";
const MAPA = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Arena Panter, Centro Comercial Costa Verde, Maracaibo");

/** Clave anónima del navegador (no es un dato personal) */
function claveNavegador(): string {
  const K = "iw_prensa_clave";
  try {
    const v = localStorage.getItem(K);
    if (v && /^[A-Za-z0-9]{12,64}$/.test(v)) return v;
    const nueva = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(K, nueva);
    return nueva;
  } catch {
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
}

/** Archivo .ics para agregar la cita al calendario del teléfono */
function descargarCalendario(titulo: string, descripcion: string) {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Isekai World//Rueda de prensa//ES", "BEGIN:VEVENT",
    "UID:rueda-prensa-2027@isekaiworld.co", `DTSTAMP:${f(new Date())}`, `DTSTART:${f(INICIO)}`, `DTEND:${f(FIN)}`,
    `SUMMARY:${titulo}`, `DESCRIPTION:${descripcion}`,
    "LOCATION:Arena Panter\\, CC Costa Verde\\, Maracaibo", "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "rueda-de-prensa-isekai-world-fest.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function CuentaAtras({ t }: { t: { dias: string; horas: string; minutos: string; segundos: string } }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((INICIO.getTime() - ahora) / 1000));
  const v = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  const et = [t.dias, t.horas, t.minutos, t.segundos];
  return (
    <div className="mx-auto grid max-w-sm grid-cols-4 gap-2">
      {v.map((n, i) => (
        <div key={i} className="rp-caja py-2.5 text-center">
          <div className="ev-display text-2xl tabular-nums text-white">{String(n).padStart(2, "0")}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff5c7a]">{et[i]}</div>
        </div>
      ))}
    </div>
  );
}

export default function RuedaPrensa() {
  const { t: tr } = useLang();
  const t = tr.prensa;
  useSEO({ title: t.seoTitulo, description: t.seoDesc, url: "https://isekaiworld.co/rueda-de-prensa" });

  const { data: settings } = trpc.settings.getAll.useQuery();
  const fondo = settings?.["rp_fondo"] ?? "";

  const clave = useMemo(claveNavegador, []);
  const utils = trpc.useUtils();
  const { data: estado } = trpc.prensa.estado.useQuery({ clave });
  const confirmar = trpc.prensa.confirmar.useMutation({
    onSuccess: r => { if (r.ok) utils.prensa.estado.setData({ clave }, { confirmado: true }); },
  });
  const confirmado = estado?.confirmado === true;
  const fallo = confirmar.data && !confirmar.data.ok
    ? (confirmar.data.motivo === "limite" ? t.limite : t.error)
    : confirmar.isError ? t.error : "";

  // Conteo visible solo para administradores
  const { user } = useAuth();
  const esAdmin = user?.role === "admin";
  const { data: total } = trpc.prensa.total.useQuery(undefined, { enabled: esAdmin, refetchInterval: 30_000 });

  const columnas = [
    // «dato» es el tamaño del texto grande: la ubicación lleva una palabra más larga
    { icono: Calendar, etq: t.fechaEtq, l1: t.fecha1, l2: t.fecha2, l3: t.fecha3, dato: "text-[40px] sm:text-6xl" },
    { icono: Clock, etq: t.horaEtq, l1: "", l2: t.hora1, l3: t.hora2, dato: "text-[32px] sm:text-5xl" },
    { icono: MapPin, etq: t.lugarEtq, l1: t.lugar1, l2: t.lugar2, l3: t.lugar3, dato: "text-[23px] sm:text-4xl" },
  ];
  const agenda = [
    { icono: Mic, titulo: t.agenda1Titulo, texto: t.agenda1Texto },
    { icono: Megaphone, titulo: t.agenda2Titulo, texto: t.agenda2Texto },
    { icono: Handshake, titulo: t.agenda3Titulo, texto: t.agenda3Texto },
    { icono: Users, titulo: t.agenda4Titulo, texto: t.agenda4Texto },
  ];

  return (
    <div className="rp min-h-screen overflow-x-clip bg-[#07030a] text-white">
      {/* ═══ Portada ═══ */}
      <section className="relative overflow-hidden px-5 pb-10 pt-0">
        {fondo && <img src={fondo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
        <div className="rp-humo absolute inset-0" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#07030a]/30 to-[#07030a]" aria-hidden="true" />

        {/* Pestaña roja superior, como en la invitación */}
        <div className="rp-pestana relative mx-auto h-14 w-[62%] max-w-sm" aria-hidden="true" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative mx-auto max-w-2xl pt-10 text-center"
        >
          <p className="rp-marca ev-display mb-1 text-[34px] italic leading-none sm:text-5xl">ISEKAI</p>
          <p className="mb-8 font-mono text-[11px] font-bold uppercase tracking-[0.45em] text-white/85">{t.marca}</p>

          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.35em] text-[#ff5c7a]">{t.etiqueta}</p>
          <h1 className="ev-display mb-6 leading-[0.92]">
            <span className="block text-[44px] text-white sm:text-7xl">{t.titulo1.toUpperCase()}</span>
            <span className="rp-titulo-rojo block text-[42px] sm:text-7xl">{t.titulo2.toUpperCase()}</span>
          </h1>

          <p className="mx-auto mb-4 max-w-lg font-serif text-lg italic leading-relaxed text-[#ffd6de] sm:text-xl">
            {t.intro}
          </p>
          <p className="mx-auto max-w-lg text-[15px] leading-relaxed text-[#cdbfc6] sm:text-base">{t.texto}</p>
        </motion.div>
      </section>

      {/* ═══ Panel en V con fecha, hora y ubicación ═══ */}
      <section className="relative px-4 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative mx-auto max-w-xl"
        >
          <div className="rp-sello" aria-hidden="true">
            <img src={LOGO_CALAVERA} alt="" className="h-full w-full object-contain" />
          </div>
          <div className="rp-panel px-3 pb-8 pt-24 sm:px-6">
            <div className="grid grid-cols-3">
              {columnas.map((c, i) => (
                <div key={i} className={`flex flex-col items-center px-1 text-center ${i > 0 ? "border-l border-white/25" : ""}`}>
                  <c.icono size={30} strokeWidth={1.6} className="mb-3 text-white" />
                  <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white/80">{c.etq}</p>
                  {c.l1 && <p className="ev-display text-lg leading-tight text-white sm:text-xl">{c.l1.toUpperCase()}</p>}
                  <p className={`rp-dato ev-display leading-none ${c.dato}`}>{c.l2.toUpperCase()}</p>
                  <p className="ev-display text-base leading-tight text-white sm:text-xl">{c.l3.toUpperCase()}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-white/85">{t.ciudad}</p>
          </div>
        </motion.div>
      </section>

      {/* ═══ Cuenta atrás y confirmación ═══ */}
      <section id="confirmar" className="scroll-mt-20 px-5 pb-14 pt-8 text-center">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.35em] text-[#ff5c7a]">{t.faltan}</p>
        <div className="mb-9"><CuentaAtras t={t} /></div>

        {!confirmado ? (
          <div>
            <button
              onClick={() => confirmar.mutate({ clave })}
              disabled={confirmar.isPending}
              className="rp-boton ev-notch ev-press inline-flex items-center gap-2.5 px-10 py-5 text-sm font-black uppercase tracking-[0.18em] text-white disabled:opacity-70"
            >
              {confirmar.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
              {confirmar.isPending ? t.confirmando : t.cta}
            </button>
            {fallo && <p className="mx-auto mt-4 max-w-xs text-sm text-[#ff9aac]">{fallo}</p>}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-md"
          >
            <div className="rp-check mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Check size={30} strokeWidth={3} className="text-white" />
            </div>
            <p className="ev-display mb-2 text-2xl text-white">{t.confirmadoTitulo.toUpperCase()}</p>
            <p className="mb-6 text-[15px] leading-relaxed text-[#cdbfc6]">{t.confirmadoTexto}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => descargarCalendario(`${t.titulo2} — Isekai World Fest 2027`, t.accesoTexto)}
                className="ev-notch ev-press inline-flex items-center justify-center gap-2 border border-white/25 bg-white/5 px-6 py-3.5 text-xs font-bold uppercase tracking-widest"
              >
                <CalendarPlus size={16} /> {t.calendario}
              </button>
              <a
                href={MAPA}
                target="_blank"
                rel="noopener noreferrer"
                className="ev-notch ev-press inline-flex items-center justify-center gap-2 border border-white/25 bg-white/5 px-6 py-3.5 text-xs font-bold uppercase tracking-widest"
              >
                <Navigation size={16} /> {t.comoLlegar}
              </a>
            </div>
          </motion.div>
        )}

        {esAdmin && total && (
          <p className="mx-auto mt-6 inline-block border border-[#fbbf24]/40 bg-[#fbbf24]/10 px-4 py-2 font-mono text-xs text-[#fde68a]">
            {t.adminTotal.replace("{n}", String(total.total)).replace("{h}", String(total.hoy))}
          </p>
        )}
      </section>

      {/* ═══ Acceso con invitación física ═══ */}
      <section className="px-5 pb-16">
        <div className="rp-aviso ev-notch mx-auto flex max-w-xl gap-4 p-5 sm:p-6">
          <Ticket size={34} strokeWidth={1.5} className="mt-1 shrink-0 text-[#ff5c7a]" />
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#ff5c7a]">{t.accesoEtq}</p>
            <p className="ev-display mb-2 text-lg leading-tight text-white">{t.accesoTitulo}</p>
            <p className="text-sm leading-relaxed text-[#cdbfc6]">{t.accesoTexto}</p>
          </div>
        </div>
      </section>

      {/* ═══ Lo que se revelará ═══ */}
      <section className="px-5 pb-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-center font-mono text-[11px] uppercase tracking-[0.35em] text-[#ff5c7a]">{t.agendaEtq}</p>
          <h2 className="ev-display mb-8 text-center text-[26px] leading-tight sm:text-4xl">{t.agendaTitulo.toUpperCase()}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {agenda.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rp-item ev-notch p-5"
              >
                <a.icono size={24} strokeWidth={1.6} className="mb-3 text-[#ff5c7a]" />
                <p className="mb-1.5 font-bold text-white">{a.titulo}</p>
                <p className="text-sm leading-relaxed text-[#b9aab2]">{a.texto}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Cierre ═══ */}
      <section className="px-5 pb-20 text-center">
        <p className="mx-auto mb-8 max-w-md font-serif text-xl italic leading-relaxed text-[#ffd6de]">{t.cierre}</p>
        {!confirmado && (
          <button
            onClick={() => { confirmar.mutate({ clave }); document.getElementById("confirmar")?.scrollIntoView({ behavior: "smooth" }); }}
            disabled={confirmar.isPending}
            className="rp-boton ev-notch ev-press inline-flex items-center gap-2.5 px-10 py-5 text-sm font-black uppercase tracking-[0.18em] text-white"
          >
            <Check size={18} strokeWidth={3} /> {t.cta}
          </button>
        )}
        <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">{t.pie}</p>
      </section>
    </div>
  );
}
