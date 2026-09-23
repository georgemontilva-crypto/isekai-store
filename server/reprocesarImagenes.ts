import sharp from "sharp";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { mediaAssets, cosplayers, products, productImages, siteSettings } from "../drizzle/schema";

/**
 * Reprocesa las imágenes que ya estaban subidas.
 *
 * Antes se guardaban al tamaño original: fotos de móvil de varios megas que
 * luego se muestran en tarjetas de trescientos píxeles. Eso hacía que las
 * galerías tardaran en cargar, sobre todo con datos móviles.
 *
 * Esta función las baja, las reduce y las vuelve a subir, actualizando las
 * direcciones allí donde se usan. Trabaja por tandas pequeñas para no
 * bloquear el servidor: se llama varias veces hasta que no quede ninguna.
 */

const LADO_MAXIMO = 1600;
const CALIDAD = 82;
/** Por debajo de esto no compensa tocarla */
const PESO_MINIMO = 350 * 1024;

async function descargar(url: string): Promise<Buffer | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

/** Reduce una imagen si merece la pena; devuelve null si no hay mejora */
async function reducir(original: Buffer): Promise<{ datos: Buffer; ancho: number; alto: number; esPng: boolean } | null> {
  try {
    const img = sharp(original, { failOn: "none" });
    const meta = await img.metadata();
    if (!meta.width || !meta.height) return null;

    // Las animadas se dejan como están: al reducirlas pierden el movimiento
    if (meta.pages && meta.pages > 1) return null;

    const necesitaEscalar = Math.max(meta.width, meta.height) > LADO_MAXIMO;

    // Los PNG se quedan en PNG: pasarlos a JPEG les pega un fondo blanco y
    // arruina los recortes con transparencia.
    const esPng = meta.format === "png" || (meta.hasAlpha ?? false);

    const base = img
      .rotate()
      .resize(necesitaEscalar ? { width: LADO_MAXIMO, height: LADO_MAXIMO, fit: "inside" } : undefined);

    const datos = esPng
      ? await base.png({ compressionLevel: 9, palette: true }).toBuffer()
      : await base.jpeg({ quality: CALIDAD, mozjpeg: true }).toBuffer();

    if (datos.length >= original.length) return null;

    const nueva = await sharp(datos).metadata();
    return { datos, ancho: nueva.width ?? 0, alto: nueva.height ?? 0, esPng };
  } catch {
    return null;
  }
}

/**
 * Procesa una tanda de imágenes de la biblioteca.
 *
 * @param tanda cuántas tocar en esta llamada
 */
export async function reprocesarTanda(tanda = 8) {
  const db = await getDb();
  if (!db) return { revisadas: 0, reducidas: 0, ahorroMb: 0, quedan: 0 };

  const todas = await db.select().from(mediaAssets);

  // Pendientes: imágenes pesadas que todavía no se han tocado
  const pendientes = todas.filter(m =>
    (m.sizeBytes ?? 0) > PESO_MINIMO &&
    !/\.(mp4|webm|gif)$/i.test(m.url ?? "") &&
    !(m.fileName ?? "").includes("-opt"),
  );

  let reducidas = 0;
  let ahorro = 0;

  for (const m of pendientes.slice(0, tanda)) {
    const original = await descargar(m.url);
    if (!original) continue;

    const mejor = await reducir(original);
    if (!mejor) {
      // Se marca para no volver a intentarlo en cada pasada
      await db.update(mediaAssets)
        .set({ fileName: `${m.fileName ?? "imagen"}-opt` })
        .where(eq(mediaAssets.id, m.id));
      continue;
    }

    const ext = mejor.esPng ? "png" : "jpg";
    const nombre = (m.fileName ?? "imagen").replace(/\.[^.]+$/, "") + `-opt.${ext}`;
    const { url } = await storagePut(`media/${nombre}`, mejor.datos, mejor.esPng ? "image/png" : "image/jpeg");

    const urlVieja = m.url;

    await db.update(mediaAssets).set({
      url,
      fileName: nombre,
      sizeBytes: mejor.datos.length,
    }).where(eq(mediaAssets.id, m.id));

    // La dirección cambia, así que hay que actualizarla donde se usaba
    await reemplazarUrl(urlVieja, url);

    ahorro += original.length - mejor.datos.length;
    reducidas++;
  }

  return {
    revisadas: Math.min(tanda, pendientes.length),
    reducidas,
    ahorroMb: Math.round((ahorro / 1024 / 1024) * 10) / 10,
    quedan: Math.max(0, pendientes.length - tanda),
  };
}

/** Sustituye una dirección antigua allí donde estuviera guardada */
async function reemplazarUrl(vieja: string, nueva: string) {
  const db = await getDb();
  if (!db || !vieja) return;

  try {
    // Ajustes del sitio: logos, fondos, banners…
    const todos = await db.select().from(siteSettings);
    for (const a of todos) {
      if (a.value === vieja) {
        await db.update(siteSettings).set({ value: nueva }).where(eq(siteSettings.key, a.key));
      }
    }
  } catch (e) {
    console.warn("[Imágenes] No se pudieron actualizar los ajustes:", e);
  }

  try {
    const perfiles = await db.select().from(cosplayers);
    for (const c of perfiles) {
      const cambios: any = {};
      if (c.photo === vieja) cambios.photo = nueva;
      if (c.bannerImage === vieja) cambios.bannerImage = nueva;
      if (Array.isArray(c.gallery) && (c.gallery as string[]).includes(vieja)) {
        cambios.gallery = (c.gallery as string[]).map(g => (g === vieja ? nueva : g));
      }
      if (Object.keys(cambios).length > 0) {
        await db.update(cosplayers).set(cambios).where(eq(cosplayers.id, c.id));
      }
    }
  } catch (e) {
    console.warn("[Imágenes] No se pudo actualizar cosplayers:", e);
  }

  try {
    await db.update(productImages).set({ url: nueva }).where(eq(productImages.url, vieja));
  } catch (e) {
    console.warn("[Imágenes] No se pudo actualizar productos:", e);
  }
}

/**
 * Imágenes de los perfiles de cosplayer.
 *
 * No pasan por la biblioteca de medios —se suben desde su propio panel—, así
 * que el recorrido anterior no las veía. Son justo las que más pesan, porque
 * las suben desde el teléfono sin reducir.
 */
export async function reprocesarCosplayers(tanda = 4) {
  const db = await getDb();
  if (!db) return { reducidas: 0, ahorroMb: 0, quedan: 0 };

  const perfiles = await db.select().from(cosplayers);

  /** Todas sus imágenes, con dónde está guardada cada una */
  type Pendiente = { id: number; campo: "photo" | "bannerImage"; url: string };
  const lista: Pendiente[] = [];

  for (const c of perfiles) {
    if (c.photo && !c.photo.includes("-opt")) lista.push({ id: c.id, campo: "photo", url: c.photo });
    if (c.bannerImage && !c.bannerImage.includes("-opt")) {
      lista.push({ id: c.id, campo: "bannerImage", url: c.bannerImage });
    }
  }

  let reducidas = 0;
  let ahorro = 0;

  for (const item of lista.slice(0, tanda)) {
    const original = await descargar(item.url);
    if (!original) continue;

    // Las que ya son ligeras se marcan para no volver a mirarlas
    if (original.length < PESO_MINIMO) {
      continue;
    }

    const mejor = await reducir(original);
    if (!mejor) continue;

    const { url } = await storagePut(
      `cosplay/perfil-${item.id}-${item.campo}-opt.${mejor.esPng ? "png" : "jpg"}`,
      mejor.datos,
      mejor.esPng ? "image/png" : "image/jpeg",
    );

    await db.update(cosplayers)
      .set({ [item.campo]: url } as any)
      .where(eq(cosplayers.id, item.id));

    ahorro += original.length - mejor.datos.length;
    reducidas++;
  }

  return {
    reducidas,
    ahorroMb: Math.round((ahorro / 1024 / 1024) * 10) / 10,
    quedan: Math.max(0, lista.length - tanda),
  };
}

/** Cuántas quedan por procesar, sin tocar nada */
export async function pendientesDeReprocesar() {
  const db = await getDb();
  if (!db) return { pendientes: 0, pesoMb: 0 };

  const todas = await db.select().from(mediaAssets);
  const pendientes = todas.filter(m =>
    (m.sizeBytes ?? 0) > PESO_MINIMO &&
    !/\.(mp4|webm|gif)$/i.test(m.url ?? "") &&
    !(m.fileName ?? "").includes("-opt"),
  );

  // Los perfiles de cosplayer no guardan el peso, así que solo se cuentan
  const perfiles = await db.select().from(cosplayers);
  const pendientesCosplay = perfiles.reduce((n, c) => {
    let k = 0;
    if (c.photo && !c.photo.includes("-opt")) k++;
    if (c.bannerImage && !c.bannerImage.includes("-opt")) k++;
    return n + k;
  }, 0);

  return {
    pendientes: pendientes.length,
    pendientesCosplay,
    pesoMb: Math.round((pendientes.reduce((a, m) => a + (m.sizeBytes ?? 0), 0) / 1024 / 1024) * 10) / 10,
  };
}

/**
 * Optimización automática en segundo plano.
 *
 * Procesa unas pocas imágenes cada cierto tiempo, de forma que el trabajo se
 * reparte y nunca compite con las visitas. Con tandas pequeñas y espaciadas,
 * una biblioteca de cien imágenes queda lista en unas horas sin que nadie lo
 * note.
 *
 * Se detiene sola cuando no queda nada pendiente.
 */
export function iniciarOptimizacionImagenes() {
  const CADA = 6 * 60 * 1000;   // cada seis minutos
  const POR_TANDA = 3;          // tres imágenes por vuelta

  let trabajando = false;

  const vuelta = async () => {
    if (trabajando) return;
    trabajando = true;
    try {
      const { pendientes, pendientesCosplay } = await pendientesDeReprocesar();
      if (pendientes === 0 && pendientesCosplay === 0) return;

      const r = await reprocesarTanda(POR_TANDA);
      if (r.reducidas > 0) {
        console.log(
          `[Imágenes] ${r.reducidas} de la biblioteca, ${r.ahorroMb} MB ahorrados, quedan ${r.quedan}`,
        );
      }

      // Los perfiles de cosplayer van aparte: no están en la biblioteca
      const c = await reprocesarCosplayers(2);
      if (c.reducidas > 0) {
        console.log(
          `[Imágenes] ${c.reducidas} de cosplayers, ${c.ahorroMb} MB ahorrados, quedan ${c.quedan}`,
        );
      }
    } catch (e) {
      console.error("[Imágenes] Fallo en la optimización automática:", e);
    } finally {
      trabajando = false;
    }
  };

  // La primera vuelta con margen, para no competir con el arranque
  setTimeout(() => { void vuelta(); }, 90_000);
  setInterval(() => { void vuelta(); }, CADA);

  console.log("[Imágenes] Optimización automática activada (3 cada 6 minutos)");
}
