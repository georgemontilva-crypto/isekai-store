import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

const SERVICES = [
  { name: "Impresión 3D Especializada", desc: "Fabricamos figuras, props y piezas decorativas con tecnología FDM y resina de alta resolución. Cada pieza pasa por un proceso de postprocesado, lijado y pintura para lograr acabados profesionales." },
  { name: "Cosplay Lab",               desc: "Diseñamos y fabricamos accesorios, armaduras, máscaras y piezas especiales para cosplay. Trabajamos con el cosplayer para lograr la mayor fidelidad posible al personaje original." },
  { name: "Diseño y Modelado 3D",      desc: "Creamos modelos digitales desde cero usando software de modelado profesional. Desde referencias en imagen hasta archivos listos para impresión, nos encargamos de todo el proceso de diseño." },
  { name: "Restauración y Adaptación", desc: "Escalamos, modificamos y personalizamos piezas existentes según tus necesidades. También restauramos figuras o coleccionables dañados devolviéndoles su apariencia original." },
  { name: "Ediciones Especiales",      desc: "Producimos series limitadas y colecciones exclusivas de figuras y coleccionables. Piezas numeradas, certificadas y pensadas para el coleccionista más exigente." },
];

const VALUES = [
  { title: "Pasión",        desc: "Todo lo que hacemos nace del amor genuino por el anime y la cultura pop." },
  { title: "Autenticidad",  desc: "Productos cuidadosamente seleccionados. Sin imitaciones, sin compromisos." },
  { title: "Confianza",     desc: "Comprás con seguridad. Envíos rastreables y atención real siempre." },
  { title: "Comunidad",     desc: "Somos fans antes que vendedores. Tu experiencia importa más que la venta." },
  { title: "Innovación",    desc: "Nuevos drops, colaboraciones y ediciones especiales que sorprenden." },
  { title: "Cultura",       desc: "Promovemos el anime y el gaming como formas legítimas de arte y expresión." },
];

export default function Nosotros() {
  const [offsetY, setOffsetY] = useState(0);
  const [hoveredService, setHoveredService] = useState<number | null>(null);
  const { data: siteSettings } = trpc.settings.getAll.useQuery();

  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const heroImage      = siteSettings?.["nosotros_hero_image"]      ?? "";
  const aboutImage     = siteSettings?.["nosotros_about_image"]     ?? "";
  const filosofiaImage = siteSettings?.["nosotros_filosofia_image"] ?? "";
  const misionImage    = siteSettings?.["nosotros_mision_image"]    ?? "";
  const gallery        = [1, 2, 3, 4, 5].map(i => siteSettings?.[`nosotros_gallery_${i}`] ?? "");

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── 1. Hero full-bleed parallax ───────────────────────────────── */}
      <section className="relative h-[90vh] overflow-hidden flex items-end pb-20">
        <div
          className="absolute inset-0 bg-[#111]"
          style={{ transform: `translateY(${offsetY * 0.4}px)`, willChange: "transform" }}
        >
          {heroImage ? (
            <img src={heroImage} className="w-full h-full object-cover opacity-60" alt="" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] via-[#222] to-[#0d0d0d]" />
          )}
        </div>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)" }}
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 px-6 lg:px-20 max-w-5xl"
        >
          <p className="text-xs tracking-[0.35em] uppercase text-[#e5007d] mb-5 font-medium">Isekai World</p>
          <h1 className="text-6xl sm:text-7xl lg:text-[108px] font-black text-white leading-[0.92] tracking-tight">
            Somos fans<br />
            <span className="text-[#e5007d]">creando</span><br />
            para fans.
          </h1>
        </motion.div>
      </section>

      {/* ── 2. Quiénes somos — split sticky ──────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2">
        {/* Imagen izquierda sticky */}
        <div className="lg:sticky lg:top-0 lg:h-screen overflow-hidden bg-[#f0f0f0]">
          {aboutImage ? (
            <img src={aboutImage} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full min-h-[50vh] flex items-center justify-center bg-[#f0f0f0]">
              <span className="text-[#ccc] text-sm select-none">nosotros_about_image</span>
            </div>
          )}
        </div>

        {/* Texto derecha scrolleable */}
        <div className="px-8 lg:px-16 xl:px-24 py-24 lg:py-32 flex flex-col justify-center gap-8">
          <p className="text-xs tracking-[0.3em] uppercase text-[#999] font-medium">Nuestra historia</p>
          <h2 className="text-2xl lg:text-3xl font-light leading-relaxed text-[#111]">
            Isekai World es un estudio creativo especializado en impresión y diseño 3D inspirado en universos cinematográficos, anime y videojuegos donde cada pieza nace para traer un mundo ficticio a la realidad. Con cobertura en Venezuela y Colombia, creamos experiencias de fan para fan.
          </h2>
          <p className="text-[#555] leading-relaxed text-[15px]">
            Nacimos de la pasión genuina por el anime y los videojuegos. Somos fans antes que vendedores, y eso se nota en cada decisión: desde la curaduría de productos hasta el packaging de cada pedido.
          </p>
          <p className="text-[#555] leading-relaxed text-[15px]">
            Más que una tienda, somos una comunidad. Queremos que cada pieza que llegue a tus manos sea una conexión real con el universo que amás.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#e5e5e5]">
            {[["3+", "años de experiencia"], ["500+", "productos curados"], ["10k+", "fans en la comunidad"]].map(([num, label]) => (
              <div key={label}>
                <p className="text-2xl font-black text-[#111]">{num}</p>
                <p className="text-xs text-[#999] mt-0.5 leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Galería marquee ────────────────────────────────────────── */}
      <section className="py-5 overflow-hidden bg-[#f8f8f8] border-y border-[#e5e5e5]">
        <div className="flex gap-4 marquee-track-slow">
          {[...gallery, ...gallery].map((src, idx) => (
            <div key={idx} className="flex-shrink-0 w-[280px] h-[360px] bg-[#e5e5e5] rounded-xl overflow-hidden">
              {src ? (
                <img src={src} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#ebebeb]">
                  <span className="text-[#ccc] text-xs select-none">Foto {(idx % 5) + 1}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Servicios con hover ────────────────────────────────────── */}
      <section className="bg-white">
        <div className="px-6 lg:px-20 pt-20 pb-8">
          <p className="text-xs tracking-[0.3em] uppercase text-[#e5007d] mb-3 font-medium">Lo que ofrecemos</p>
          <h2 className="text-3xl lg:text-5xl font-black text-[#111]">Nuestros servicios</h2>
        </div>
        <div>
          {SERVICES.map((s, i) => (
            <div
              key={i}
              className="group relative border-t border-[#e5e5e5] cursor-default overflow-hidden"
              onMouseEnter={() => setHoveredService(i)}
              onMouseLeave={() => setHoveredService(null)}
            >
              <div
                className="absolute inset-0 bg-[#e5007d] transition-opacity duration-500"
                style={{ opacity: hoveredService === i ? 0.06 : 0 }}
              />
              {/* Móvil: número + título arriba, descripción abajo con indent */}
              <div className="relative lg:hidden py-7 px-6">
                <div className="flex items-center gap-6 mb-2">
                  <span className="text-xs text-[#bbb] font-mono w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-xl font-black group-hover:text-[#e5007d] transition-colors duration-300">
                    {s.name}
                  </span>
                </div>
                <p className="text-sm text-[#555] leading-relaxed pl-12">{s.desc}</p>
              </div>
              {/* Desktop: número + título a la izquierda, descripción a la derecha */}
              <div className="hidden lg:flex items-center justify-between py-7 px-20">
                <div className="flex items-center gap-10">
                  <span className="text-xs text-[#bbb] font-mono w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-4xl font-black group-hover:text-[#e5007d] transition-colors duration-300">
                    {s.name}
                  </span>
                </div>
                <span className="text-sm text-[#777] max-w-[280px] text-right leading-relaxed">{s.desc}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-[#e5e5e5]" />
        </div>
      </section>

      {/* ── 5. Misión / Visión ────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-[#f8f8f8]">
        <div className="px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Columna izquierda — textos */}
          <div className="max-w-xl">
            <p className="text-xs tracking-[0.3em] uppercase text-[#e5007d] mb-16 font-medium">Propósito</p>
            {[
              {
                label: "Misión",
                text: "Acercar la cultura del anime y los videojuegos a Colombia y Latinoamérica con productos premium, auténticos y accesibles. Creemos que cada fan merece tener en sus manos una pieza que represente lo que ama.",
              },
              {
                label: "Visión",
                text: "Ser la tienda de referencia en Latinoamérica para fans del anime y el gaming, reconocida por la calidad de sus productos, la autenticidad de su comunidad y el impacto positivo en la cultura pop de la región.",
              },
            ].map(({ label, text }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group mb-16 pb-16 border-b border-[#e5e5e5] last:border-0 last:mb-0 last:pb-0"
              >
                <p className="text-xs tracking-[0.3em] uppercase text-[#999] mb-5 font-medium">{label}</p>
                <p className="text-2xl lg:text-3xl font-light text-[#111] leading-relaxed mb-6">{text}</p>
                <div className="h-[2px] w-0 group-hover:w-24 bg-[#e5007d] transition-all duration-700 rounded-full" />
              </motion.div>
            ))}
          </div>

          {/* Columna derecha — imagen */}
          <div className="lg:sticky lg:top-24">
            {misionImage ? (
              <motion.img
                src={misionImage}
                alt="Misión y Visión"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <div className="w-full aspect-square bg-[#f0f0f0] rounded-2xl flex items-center justify-center">
                <p className="text-[#bbb] text-sm text-center px-6">
                  Configura la imagen desde<br />Admin → Configuración → Página Nosotros
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 6. Valores — grid asimétrico ─────────────────────────────── */}
      <section className="bg-white">
        <div className="px-6 lg:px-20 py-16 pb-10">
          <p className="text-xs tracking-[0.3em] uppercase text-[#e5007d] font-medium">Lo que nos define</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-[#e5e5e5]">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`bg-white p-8 lg:p-12 group hover:bg-[#fafafa] transition-colors ${i === 0 ? "lg:col-span-2" : ""}`}
            >
              <p className="text-xs tracking-[0.25em] uppercase text-[#e5007d] mb-4 font-mono">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className={`font-black mb-3 text-[#111] ${i === 0 ? "text-2xl lg:text-3xl" : "text-lg lg:text-xl"}`}>
                {v.title}
              </h3>
              <p className="text-[#777] text-sm leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 7. Filosofía full-bleed ───────────────────────────────────── */}
      <section className="relative h-[70vh] overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[#111]">
          {filosofiaImage ? (
            <img src={filosofiaImage} className="w-full h-full object-cover opacity-40" alt="" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#050505]" />
          )}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 text-center px-6 max-w-4xl"
        >
          <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
            "No somos una fábrica masiva.<br />
            <span className="text-[#e5007d]">Somos una comunidad</span><br />
            de apasionados."
          </p>
        </motion.div>
      </section>

      {/* ── 8. Aviso legal ────────────────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5] bg-white py-12">
        <div className="px-6 lg:px-20 max-w-4xl flex gap-5 items-start">
          <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-2">
              Aviso sobre propiedad intelectual
            </p>
            <p className="text-[13px] text-[#aaa] leading-relaxed">
              Los nombres, personajes e imágenes de anime y videojuegos son propiedad de sus respectivos titulares
              (Toei Animation, Bandai Namco, Shueisha, Nintendo, etc.). Isekai World no está afiliada a ninguna de
              estas marcas. Los productos fan-made que comercializamos son creaciones originales inspiradas en estas
              obras y no representan mercancía oficial licenciada, salvo que se indique expresamente. Consultas:{" "}
              <a href="mailto:hola@isekaiworld.co" className="text-[#e5007d] underline underline-offset-2">
                hola@isekaiworld.co
              </a>.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
