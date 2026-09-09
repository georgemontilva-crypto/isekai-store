import { AlertTriangle } from "lucide-react";

/**
 * Aviso de propiedad intelectual.
 *
 * Se muestra en varias páginas —inicio, nosotros y contacto—, así que vive en
 * un solo sitio: si el texto cambia por motivos legales, se corrige una vez y
 * queda igual en todas.
 */
export default function AvisoPropiedadIntelectual() {
  return (
    <section className="border-t border-[#e5e5e5] bg-white py-12">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-6 text-center">
        <AlertTriangle size={18} className="text-yellow-500 shrink-0" strokeWidth={1.5} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#999]">
            Aviso sobre propiedad intelectual
          </p>
          <p className="text-[13px] leading-relaxed text-[#aaa]">
            Los nombres, personajes e imágenes de anime y videojuegos son propiedad de sus
            respectivos titulares (Toei Animation, Bandai Namco, Shueisha, Nintendo, etc.).
            Isekai World no está afiliada a ninguna de estas marcas. Los productos fan-made
            que comercializamos son creaciones originales inspiradas en estas obras y no
            representan mercancía oficial licenciada, salvo que se indique expresamente.
            Consultas:{" "}
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
