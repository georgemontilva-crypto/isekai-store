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

  // Los PNG con transparencia se dejan como están: convertirlos a JPEG les
  // pondría un fondo negro.
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;
  if (file.type === "image/png" && file.size < 400_000) return file;

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

    // Fondo blanco: si la imagen tenía transparencia, al pasar a JPEG
    // quedaría negra sin esto.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close?.();

    const blob: Blob | null = await new Promise(resolve =>
      lienzo.toBlob(resolve, "image/jpeg", calidad),
    );
    if (!blob) return file;

    // Si comprimir no mejoró nada, se queda el original
    if (blob.size >= file.size) return file;

    const nombre = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Ante cualquier problema se sube el original: mejor pesado que roto
    return file;
  }
}
