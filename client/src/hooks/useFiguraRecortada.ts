import { useEffect, useState } from "react";

/**
 * Recorta el margen transparente de un PNG.
 *
 * Si la figura del hero viene en un lienzo grande (por ejemplo horizontal,
 * con el personaje en el centro), `object-contain` la encoge para que quepa
 * el lienzo entero y el personaje sale diminuto. Aquí se buscan los píxeles
 * visibles, se recorta al contorno del personaje y se devuelve esa versión:
 * así la figura ocupa todo el alto disponible sin importar cómo se exportó.
 *
 * Estados:
 *  - "cargando": aún no se sabe; conviene no mostrar nada todavía.
 *  - "recortada": `src` es la versión recortada (usar object-contain).
 *  - "original": no se pudo leer la imagen; `src` es la original
 *    (usar object-cover para que igual llene el espacio).
 */
export type EstadoFigura = "cargando" | "recortada" | "original";

const UMBRAL_ALFA = 12; // píxeles casi invisibles no cuentan
const MARGEN = 0.01; // 1% de aire alrededor del contorno

export function useFiguraRecortada(src: string) {
  const [estado, setEstado] = useState<EstadoFigura>("cargando");
  const [salida, setSalida] = useState(src);

  useEffect(() => {
    if (!src) return;
    let cancelado = false;
    let urlBlob: string | null = null;
    setEstado("cargando");
    setSalida(src);

    const usarOriginal = () => {
      if (cancelado) return;
      setSalida(src);
      setEstado("original");
    };

    // Si tarda demasiado, se muestra la original y listo.
    const reloj = window.setTimeout(usarOriginal, 5000);

    // Mismo dominio → el canvas no queda contaminado.
    const esAbsoluta = /^https?:\/\//i.test(src);
    const mismoOrigen = !esAbsoluta || src.startsWith(window.location.origin);
    const origen = mismoOrigen ? src : `/api/media-proxy?u=${encodeURIComponent(src)}`;

    const img = new Image();
    img.decoding = "async";
    img.onerror = () => {
      window.clearTimeout(reloj);
      usarOriginal();
    };
    img.onload = () => {
      window.clearTimeout(reloj);
      if (cancelado) return;
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return usarOriginal();

        // Análisis a baja resolución: rápido y suficiente para el contorno.
        const escala = Math.min(1, 480 / Math.max(w, h));
        const aw = Math.max(1, Math.round(w * escala));
        const ah = Math.max(1, Math.round(h * escala));
        const c1 = document.createElement("canvas");
        c1.width = aw;
        c1.height = ah;
        const x1 = c1.getContext("2d", { willReadFrequently: true });
        if (!x1) return usarOriginal();
        x1.drawImage(img, 0, 0, aw, ah);
        const { data } = x1.getImageData(0, 0, aw, ah);

        let minX = aw, minY = ah, maxX = -1, maxY = -1;
        for (let y = 0; y < ah; y++) {
          for (let x = 0; x < aw; x++) {
            if (data[(y * aw + x) * 4 + 3] > UMBRAL_ALFA) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < 0) return usarOriginal(); // imagen vacía

        // A resolución real, con un poco de aire.
        const mx = Math.round(w * MARGEN);
        const my = Math.round(h * MARGEN);
        const sx = Math.max(0, Math.floor(minX / escala) - mx);
        const sy = Math.max(0, Math.floor(minY / escala) - my);
        const ex = Math.min(w, Math.ceil((maxX + 1) / escala) + mx);
        const ey = Math.min(h, Math.ceil((maxY + 1) / escala) + my);
        const cw = ex - sx;
        const ch = ey - sy;

        // Si ya viene ajustada (o no tiene transparencia), no hace falta recortar.
        if (cw >= w * 0.97 && ch >= h * 0.97) {
          setSalida(origen);
          setEstado("recortada");
          return;
        }

        const c2 = document.createElement("canvas");
        c2.width = cw;
        c2.height = ch;
        const x2 = c2.getContext("2d");
        if (!x2) return usarOriginal();
        x2.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);
        c2.toBlob((blob) => {
          if (cancelado) return;
          if (!blob) return usarOriginal();
          urlBlob = URL.createObjectURL(blob);
          setSalida(urlBlob);
          setEstado("recortada");
        }, "image/png");
      } catch {
        usarOriginal();
      }
    };
    img.src = origen;

    return () => {
      cancelado = true;
      window.clearTimeout(reloj);
      if (urlBlob) URL.revokeObjectURL(urlBlob);
    };
  }, [src]);

  return { src: salida, estado };
}
