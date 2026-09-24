import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Check, CalendarPlus, Navigation, Ticket, Loader2 } from "lucide-react";
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
    <div className="mx-auto flex max-w-sm justify-center">
      {v.map((n, i) => (
        <div key={i} className={`flex-1 px-2 text-center ${i > 0 ? "border-l border-[#ff4d6d]/20" : ""}`}>
          <div className="rp-serif text-[34px] font-bold leading-none tabular-nums text-[#f6e3e7]">{String(n).padStart(2, "0")}</div>
          <div className="rp-sistema mt-2 text-[9px] uppercase tracking-[0.3em] text-[#ff6b86]/80">{et[i]}</div>
        </div>
      ))}
    </div>
  );
}

/** Separador fino con rombo al centro */
function Separador({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#ff4d6d]/60" />
      <span className="text-[8px] text-[#ff4d6d]">◆</span>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#ff4d6d]/60" />
    </div>
  );
}

const ROMANOS = ["I", "II", "III", "IV"];

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
    { icono: Calendar, etq: t.fechaEtq, arriba: t.fecha1, dato: t.fecha2, abajo: t.fecha3 },
    { icono: Clock, etq: t.horaEtq, arriba: "", dato: t.hora1, abajo: t.hora2 },
    { icono: MapPin, etq: t.lugarEtq, arriba: t.lugar1, dato: t.lugar2, abajo: t.lugar3 },
  ];
  const agenda = [
    { titulo: t.agenda1Titulo, texto: t.agenda1Texto },
    { titulo: t.agenda2Titulo, texto: t.agenda2Texto },
    { titulo: t.agenda3Titulo, texto: t.agenda3Texto },
    { titulo: t.agenda4Titulo, texto: t.agenda4Texto },
  ];
  const aparece = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.8 } };

  return (
    <div className="rp relative min-h-screen overflow-x-clip bg-[#060305] text-white">
      {fondo && <img src={fondo} alt="" className="pointer-events-none absolute inset-x-0 top-0 h-[90vh] w-full object-cover opacity-25" />}
      <div className="rp-velo pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="rp-grano pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-2xl px-4 py-8 sm:py-14">
        {/* ═══ La invitación: un marco fino con esquinas en corchete ═══ */}
        <div className="rp-tarjeta relative px-5 pb-12 pt-12 sm:px-12">
          <span className="rp-esquina rp-esquina-1" /><span className="rp-esquina rp-esquina-2" />
          <span className="rp-esquina rp-esquina-3" /><span className="rp-esquina rp-esquina-4" />

          <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="text-center">
            <div className="rp-sello-chico mx-auto mb-4 h-14 w-14">
              <img src={LOGO_CALAVERA} alt="Isekai World" className="h-full w-full object-contain" />
            </div>
            <p className="rp-sistema mb-8 text-[10px] font-semibold uppercase tracking-[0.5em] text-[#f1c7d0]/80">
              Isekai {t.marca} · 2027
            </p>

            <p className="rp-sistema mb-6 text-[10px] uppercase tracking-[0.45em] text-[#ff6b86]">{t.etiqueta}</p>
            <p className="rp-serif mb-1 text-[44px] font-bold italic leading-none text-[#f6e3e7] sm:text-6xl">{t.titulo1}</p>
            <h1 className="rp-titulo ev-display mb-8 text-[30px] leading-tight tracking-[0.08em] sm:text-5xl">
              {t.titulo2.toUpperCase()}
            </h1>

            <Separador className="mb-8" />

            <p className="rp-serif mx-auto mb-5 max-w-md text-[19px] italic leading-relaxed text-[#f1c7d0] sm:text-[21px]">
              {t.intro}
            </p>
            <p className="mx-auto max-w-md text-[15px] font-light leading-[1.8] text-[#bfaeb5]">{t.texto}</p>
          </motion.header>

          {/* ═══ Panel en V: contorno carmesí y la calavera en la muesca ═══ */}
          <motion.div {...aparece} className="relative mx-auto mt-14 max-w-lg">
            <div className="rp-sello" aria-hidden="true">
              <img src={LOGO_CALAVERA} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="rp-marco">
              <div className="rp-panel px-2 pb-8 pt-[88px] sm:px-6">
                <div className="grid grid-cols-3">
                  {columnas.map((c, i) => (
                    <div key={i} className={`flex flex-col items-center px-1 text-center ${i > 0 ? "border-l border-[#ff4d6d]/20" : ""}`}>
                      <c.icono size={20} strokeWidth={1.3} className="mb-3 text-[#ff6b86]" />
                      <p className="rp-sistema mb-2 text-[9px] uppercase tracking-[0.35em] text-[#f1c7d0]/70">{c.etq}</p>
                      <p className="rp-sistema h-4 text-[11px] uppercase tracking-[0.2em] text-[#f6e3e7]">{c.arriba}</p>
                      <p className={`rp-serif rp-dato my-1 font-bold leading-none ${i === 2 ? "text-[26px] sm:text-4xl" : "text-[40px] sm:text-5xl"}`}>{c.dato}</p>
                      <p className="rp-sistema text-[11px] uppercase tracking-[0.2em] text-[#f6e3e7]">{c.abajo}</p>
                    </div>
                  ))}
                </div>
                <p className="rp-sistema mt-7 text-center text-[9px] uppercase tracking-[0.45em] text-[#f1c7d0]/60">{t.ciudad}</p>
              </div>
            </div>
          </motion.div>

          {/* ═══ Cuenta atrás y confirmación ═══ */}
          <section id="confirmar" className="scroll-mt-20 pt-14 text-center">
            <p className="rp-sistema mb-5 text-[10px] uppercase tracking-[0.45em] text-[#ff6b86]">{t.faltan}</p>
            <div className="mb-12"><CuentaAtras t={t} /></div>

            {!confirmado ? (
              <div>
                <button
                  onClick={() => confirmar.mutate({ clave })}
                  disabled={confirmar.isPending}
                  className="rp-boton rp-sistema ev-notch ev-press inline-flex items-center gap-3 whitespace-nowrap px-8 py-[18px] text-[12px] font-semibold uppercase tracking-[0.26em] text-white sm:px-12 sm:tracking-[0.35em] disabled:opacity-70"
                >
                  {confirmar.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                  {confirmar.isPending ? t.confirmando : t.cta}
                </button>
                {fallo && <p className="mx-auto mt-4 max-w-xs text-sm text-[#ff9aac]">{fallo}</p>}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mx-auto max-w-md">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#ff4d6d]/70">
                  <Check size={24} strokeWidth={1.8} className="text-[#ff6b86]" />
                </div>
                <p className="rp-serif mb-3 text-[30px] font-bold italic leading-tight text-[#f6e3e7]">{t.confirmadoTitulo}</p>
                <p className="mb-8 text-[15px] font-light leading-[1.8] text-[#bfaeb5]">{t.confirmadoTexto}</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    onClick={() => descargarCalendario(`${t.titulo2} — Isekai World Fest 2027`, t.accesoTexto)}
                    className="rp-sistema ev-notch ev-press inline-flex items-center justify-center gap-2 border border-[#ff4d6d]/40 px-6 py-3.5 text-[11px] uppercase tracking-[0.25em] text-[#f6e3e7] hover:bg-[#ff4d6d]/10"
                  >
                    <CalendarPlus size={15} strokeWidth={1.5} /> {t.calendario}
                  </button>
                  <a
                    href={MAPA}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rp-sistema ev-notch ev-press inline-flex items-center justify-center gap-2 border border-[#ff4d6d]/40 px-6 py-3.5 text-[11px] uppercase tracking-[0.25em] text-[#f6e3e7] hover:bg-[#ff4d6d]/10"
                  >
                    <Navigation size={15} strokeWidth={1.5} /> {t.comoLlegar}
                  </a>
                </div>
              </motion.div>
            )}

            {esAdmin && total && (
              <p className="rp-sistema mx-auto mt-8 inline-block border border-[#fbbf24]/30 px-4 py-2 text-[11px] tracking-wider text-[#fde68a]">
                {t.adminTotal.replace("{n}", String(total.total)).replace("{h}", String(total.hoy))}
              </p>
            )}
          </section>

          {/* ═══ Acceso con invitación física ═══ */}
          <motion.section {...aparece} className="mx-auto mt-16 max-w-md border-y border-[#ff4d6d]/25 py-8 text-center">
            <Ticket size={26} strokeWidth={1.2} className="mx-auto mb-4 text-[#ff6b86]" />
            <p className="rp-sistema mb-3 text-[10px] uppercase tracking-[0.45em] text-[#ff6b86]">{t.accesoEtq}</p>
            <p className="rp-serif mb-3 text-[24px] font-bold italic leading-snug text-[#f6e3e7]">{t.accesoTitulo}</p>
            <p className="text-[14px] font-light leading-[1.8] text-[#bfaeb5]">{t.accesoTexto}</p>
          </motion.section>

          {/* ═══ Lo que se revelará ═══ */}
          <section className="mt-16">
            <p className="rp-sistema mb-3 text-center text-[10px] uppercase tracking-[0.45em] text-[#ff6b86]">{t.agendaEtq}</p>
            <h2 className="rp-serif mb-10 text-center text-[28px] font-bold italic leading-tight text-[#f6e3e7] sm:text-4xl">{t.agendaTitulo}</h2>
            <div className="mx-auto max-w-lg">
              {agenda.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className={`flex gap-5 py-6 ${i > 0 ? "border-t border-white/[0.07]" : ""}`}
                >
                  <span className="rp-serif rp-dato w-10 shrink-0 text-[26px] font-bold italic leading-none">{ROMANOS[i]}</span>
                  <div>
                    <p className="mb-1.5 text-[15px] font-semibold tracking-wide text-[#f6e3e7]">{a.titulo}</p>
                    <p className="text-[14px] font-light leading-[1.75] text-[#a9989f]">{a.texto}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ═══ Cierre ═══ */}
          <section className="mt-14 text-center">
            <Separador className="mb-10" />
            <p className="rp-serif mx-auto mb-10 max-w-sm text-[22px] italic leading-relaxed text-[#f1c7d0]">{t.cierre}</p>
            {!confirmado && (
              <button
                onClick={() => { confirmar.mutate({ clave }); document.getElementById("confirmar")?.scrollIntoView({ behavior: "smooth" }); }}
                disabled={confirmar.isPending}
                className="rp-boton rp-sistema ev-notch ev-press inline-flex items-center gap-3 whitespace-nowrap px-8 py-[18px] text-[12px] font-semibold uppercase tracking-[0.26em] text-white sm:px-12 sm:tracking-[0.35em]"
              >
                {t.cta}
              </button>
            )}
          </section>
        </div>

        <p className="rp-sistema mt-8 text-center text-[9px] uppercase tracking-[0.4em] text-white/35">{t.pie}</p>
      </div>
    </div>
  );
}
