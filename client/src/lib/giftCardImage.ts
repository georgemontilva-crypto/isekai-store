/**
 * Genera la imagen descargable de una tarjeta de regalo.
 *
 * Se dibuja en un lienzo del navegador sobre la plantilla que subas desde el
 * panel: encima se escribe el código y el monto. Así puedes cambiar el diseño
 * cuando quieras sin tocar el código.
 *
 * Si no hay plantilla cargada, se dibuja una tarjeta con los colores de la
 * marca, para que la función sirva desde el primer día.
 */

export interface DatosTarjeta {
  code: string;
  amount: string;
  currency?: string | null;
  discountType?: string | null;
  discountPercent?: string | null;
  expiresAt?: Date | string | null;
}

const ANCHO = 1200;
const ALTO = 750;

/** Carga una imagen y espera a que esté lista para dibujarla */
function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Necesario para poder exportar el lienzo con una imagen de otro dominio
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la plantilla"));
    img.src = url;
  });
}

/** Fondo por defecto, por si aún no hay plantilla subida */
function fondoPorDefecto(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, ANCHO, ALTO);
  grad.addColorStop(0, "#16050f");
  grad.addColorStop(0.55, "#2a0a1c");
  grad.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // Resplandor magenta
  const glow = ctx.createRadialGradient(ANCHO * 0.78, ALTO * 0.25, 20, ANCHO * 0.78, ALTO * 0.25, 520);
  glow.addColorStop(0, "rgba(229,0,125,0.45)");
  glow.addColorStop(1, "rgba(229,0,125,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, ANCHO - 48, ALTO - 48);
}

/**
 * Dibuja la tarjeta y devuelve la imagen lista para descargar.
 * `plantilla` es la URL de tu diseño; si no se pasa, se usa el fondo propio.
 */
export async function generarImagenTarjeta(
  datos: DatosTarjeta,
  plantilla?: string,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("El navegador no permite generar la imagen");

  // ── Fondo ──
  if (plantilla) {
    try {
      const img = await cargarImagen(plantilla);
      // Se cubre todo el lienzo conservando la proporción de la plantilla
      const escala = Math.max(ANCHO / img.width, ALTO / img.height);
      const w = img.width * escala;
      const h = img.height * escala;
      ctx.drawImage(img, (ANCHO - w) / 2, (ALTO - h) / 2, w, h);
    } catch {
      fondoPorDefecto(ctx);
    }
  } else {
    fondoPorDefecto(ctx);
  }

  // Velo inferior para que el código se lea sobre cualquier plantilla
  const velo = ctx.createLinearGradient(0, ALTO * 0.42, 0, ALTO);
  velo.addColorStop(0, "rgba(0,0,0,0)");
  velo.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = velo;
  ctx.fillRect(0, ALTO * 0.42, ANCHO, ALTO * 0.58);

  // ── Valor de la tarjeta ──
  const esPorcentaje = datos.discountType === "percent";
  const valor = esPorcentaje
    ? `${parseFloat(datos.discountPercent ?? "0").toFixed(0)}% OFF`
    : `$${parseFloat(datos.amount).toFixed(2)}`;

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 34px Inter, system-ui, sans-serif";
  ctx.fillText("TARJETA DE REGALO", 70, ALTO - 268);

  ctx.fillStyle = "#ff45a0";
  ctx.font = "900 118px Inter, system-ui, sans-serif";
  ctx.fillText(valor, 66, ALTO - 160);

  if (!esPorcentaje) {
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "600 30px Inter, system-ui, sans-serif";
    ctx.fillText(datos.currency ?? "USD", 70 + ctx.measureText(valor).width * 0.02 + 250, ALTO - 160);
  }

  // ── Código, en recuadro para que destaque ──
  ctx.font = "800 46px ui-monospace, 'Courier New', monospace";
  const anchoCodigo = ctx.measureText(datos.code).width;

  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 2;
  const cajaX = 66;
  const cajaY = ALTO - 118;
  const cajaW = anchoCodigo + 56;
  const cajaH = 74;
  const r = 14;

  ctx.beginPath();
  ctx.moveTo(cajaX + r, cajaY);
  ctx.lineTo(cajaX + cajaW - r, cajaY);
  ctx.quadraticCurveTo(cajaX + cajaW, cajaY, cajaX + cajaW, cajaY + r);
  ctx.lineTo(cajaX + cajaW, cajaY + cajaH - r);
  ctx.quadraticCurveTo(cajaX + cajaW, cajaY + cajaH, cajaX + cajaW - r, cajaY + cajaH);
  ctx.lineTo(cajaX + r, cajaY + cajaH);
  ctx.quadraticCurveTo(cajaX, cajaY + cajaH, cajaX, cajaY + cajaH - r);
  ctx.lineTo(cajaX, cajaY + r);
  ctx.quadraticCurveTo(cajaX, cajaY, cajaX + r, cajaY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.fillText(datos.code, cajaX + 28, cajaY + 52);

  // ── Vencimiento ──
  if (datos.expiresAt) {
    const f = new Date(datos.expiresAt);
    if (!isNaN(f.getTime())) {
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "600 26px Inter, system-ui, sans-serif";
      ctx.fillText(
        `Válida hasta el ${f.toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" })}`,
        ANCHO - 70,
        ALTO - 62,
      );
    }
  }

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "600 24px Inter, system-ui, sans-serif";
  ctx.fillText("isekaiworld.co", ANCHO - 70, ALTO - 268);

  return canvas.toDataURL("image/png");
}

/** Descarga la tarjeta como PNG */
export async function descargarTarjeta(datos: DatosTarjeta, plantilla?: string) {
  const dataUrl = await generarImagenTarjeta(datos, plantilla);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `tarjeta-${datos.code}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
