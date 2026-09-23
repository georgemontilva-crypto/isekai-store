import { AlertTriangle } from "lucide-react";
import { useLang } from "@/i18n/LangContext";

/**
 * Aviso de propiedad intelectual.
 *
 * Se muestra en varias páginas —inicio, nosotros y contacto—, así que vive en
 * un solo sitio: si el texto cambia por motivos legales, se corrige una vez y
 * queda igual en todas. Sigue el idioma elegido en la página (ES/EN).
 */
const TEXTOS = {
  es: {
    titulo: "Aviso sobre propiedad intelectual",
    cuerpo:
      "Los nombres, personajes e imágenes de anime y videojuegos son propiedad de sus " +
      "respectivos titulares (Toei Animation, Bandai Namco, Shueisha, Nintendo, etc.). " +
      "Isekai World no está afiliada a ninguna de estas marcas. Los productos fan-made " +
      "que comercializamos son creaciones originales inspiradas en estas obras y no " +
      "representan mercancía oficial licenciada, salvo que se indique expresamente.",
    consultas: "Consultas:",
  },
  en: {
    titulo: "Intellectual property notice",
    cuerpo:
      "The names, characters and images from anime and video games are the property of " +
      "their respective owners (Toei Animation, Bandai Namco, Shueisha, Nintendo, etc.). " +
      "Isekai World is not affiliated with any of these brands. The fan-made products we " +
      "sell are original creations inspired by these works and are not officially licensed " +
      "merchandise, unless expressly stated.",
    consultas: "Inquiries:",
  },
} as const;

export default function AvisoPropiedadIntelectual() {
  const { lang } = useLang();
  const t = TEXTOS[lang === "en" ? "en" : "es"];
  return (
    <section className="border-t border-[#e5e5e5] bg-white py-12">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-6 text-center">
        <AlertTriangle size={18} className="text-yellow-500 shrink-0" strokeWidth={1.5} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#999]">
            {t.titulo}
          </p>
          <p className="text-[13px] leading-relaxed text-[#aaa]">
            {t.cuerpo} {t.consultas}{" "}
            <a href="mailto:hola@isekaiworld.co" className="text-[#e5007d] hover:underline">
              hola@isekaiworld.co
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
