import { trpc } from "@/lib/trpc";

/**
 * Textura de fondo del sitio.
 *
 * Se dibuja una sola vez, detrás de todo, y acompaña en cualquier página con
 * fondo oscuro. Va fija a la ventana en lugar de al documento: así se
 * mantiene mientras se recorre la página, sin repetirse ni estirarse.
 *
 * El degradado la hace intensa arriba y la apaga hacia abajo, de modo que el
 * contenido inferior queda sobre negro limpio y no compite con la lectura.
 *
 * Si no hay textura configurada, no se dibuja nada.
 */
export default function TexturaFondo() {
  const { data: settings } = trpc.settings.getAll.useQuery();
  const textura = settings?.["textura_fondo"];
  if (!textura) return null;

  const opacidad = parseFloat(settings?.["textura_fondo_opacidad"] ?? "0.28");

  return (
    <div
      aria-hidden="true"
      className="iw-textura pointer-events-none fixed inset-0"
      style={{
        // Por debajo de todo sin alterar el apilamiento del resto
        zIndex: -1,
        backgroundImage: `url(${textura})`,
        backgroundSize: "cover",
        backgroundPosition: "top center",
        backgroundRepeat: "no-repeat",
        opacity: Number.isFinite(opacidad) ? opacidad : 0.28,
        // Se desvanece hacia abajo: fuerte arriba, nada a media pantalla
        maskImage: "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.6) 35%, transparent 70%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.6) 35%, transparent 70%)",
      }}
    />
  );
}
