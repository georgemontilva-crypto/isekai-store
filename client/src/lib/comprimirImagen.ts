/**
 * Reduce una imagen antes de subirla.
 *
 * Las fotos salen del teléfono a 4000 píxeles y varios megas, y luego se
 * muestran en tarjetas de 300. Descargar ese peso para verlo pequeño es lo
 * que hace que las galerías carguen lentas, sobre todo con datos móviles.
 *
 * Aquí se redibuja la imagen en un tamaño razonable y se guarda como JPEG,
 * que para fotografías pesa mucho menos que PNG sin diferencia visible.
 *
 * Los archivos que no son imagen —videos, por ejemplo— se devuelven intactos.
 */
export async function comprimirImagen(
  file: File,
  opciones: { ladoMaximo?: number; calidad?: number } = {},
): Promise<File> {
  const { ladoMaximo = 1600, calidad = 0.82 } = opciones;

  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;

  /**
   * Los PNG se suben tal cual, sin pasar por el lienzo.
   *
   * Se usan casi siempre para recortes con fondo transparente, y cualquier
   * paso intermedio puede perderlo. Pesan más, pero el servidor los reduce
   * después conservando el formato. Vale más una imagen correcta que una
   * ligera con un fondo blanco pegado.
   */
  if (file.type === "image/png") return file;

  /**
   * Los PNG se mantienen como PNG.
   *
   * Antes se pasaban a JPEG, que no admite transparencia: un recorte sobre
   * fondo transparente salía con un fondo blanco pegado. Se redimensionan
   * igual, pero conservando el formato.
   */
  const esPng = file.type === "image/png";

  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));

    // Si ya es pequeña y ligera, no se toca
    if (escala === 1 && file.size < 600_000) {
      bitmap.close?.();
      return file;
    }

    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;

    const ctx = lienzo.getContext("2d");
    if (!ctx) return file;

    // Solo se rellena el fondo cuando el destino es JPEG, que no admite
    // transparencia. En PNG se deja el lienzo limpio.
    if (!esPng) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, ancho, alto);
    }
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close?.();

    const blob: Blob | null = await new Promise(resolve =>
      esPng ? lienzo.toBlob(resolve, "image/png") : lienzo.toBlob(resolve, "image/jpeg", calidad),
    );
    if (!blob) return file;

    // Si comprimir no mejoró nada, se queda el original
    if (blob.size >= file.size) return file;

    const extension = esPng ? ".png" : ".jpg";
    const tipo = esPng ? "image/png" : "image/jpeg";
    const nombre = file.name.replace(/\.[^.]+$/, "") + extension;
    return new File([blob], nombre, { type: tipo, lastModified: Date.now() });
  } catch {
    // Ante cualquier problema se sube el original: mejor pesado que roto
    return file;
  }
}
