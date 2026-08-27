import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { products, productVariants, giftCards } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Validación de pedidos del lado del servidor.
 *
 * POR QUÉ EXISTE: antes el pedido se guardaba con el precio y el total que
 * mandaba el navegador. Cualquiera podía abrir las herramientas de desarrollo
 * y enviar un casco de $48 con total "1.00", y el pedido entraba como legítimo.
 *
 * Aquí NADA de lo que dice el cliente se acepta como cierto salvo qué producto
 * quiere y cuántas unidades. El precio, el subtotal, los descuentos y el total
 * se recalculan contra la base de datos.
 */

export interface ItemPedido {
  productId: number;
  variantId?: number | null;
  quantity: number;
}

export interface LineaValidada {
  productId: number;
  variantId?: number;
  productName: string;
  variantName?: string;
  /** Precio REAL de la base de datos, no el del cliente */
  price: string;
  quantity: number;
  imageUrl?: string;
}

export interface PedidoValidado {
  items: LineaValidada[];
  subtotal: string;
  giftCardDiscount: string;
  total: string;
}

const money = (n: number) => n.toFixed(2);

/**
 * Recalcula el pedido completo desde la base de datos y comprueba stock.
 * Lanza TRPCError con mensaje claro si algo no cuadra.
 */
export async function validarPedido(opts: {
  items: ItemPedido[];
  giftCardCode?: string;
  /** Umbral de envío gratis (informativo: el envío hoy no se cobra) */
  shipping?: number;
}): Promise<PedidoValidado> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

  if (!opts.items?.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "El pedido no tiene productos" });
  }

  // Se agrupan las líneas repetidas para que nadie burle el stock enviando
  // el mismo producto en varias líneas.
  const agrupados = new Map<string, ItemPedido>();
  for (const it of opts.items) {
    const clave = `${it.productId}:${it.variantId ?? 0}`;
    const previo = agrupados.get(clave);
    if (previo) previo.quantity += it.quantity;
    else agrupados.set(clave, { ...it });
  }

  const lineas: LineaValidada[] = [];
  let subtotal = 0;

  for (const item of Array.from(agrupados.values())) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cantidad inválida" });
    }

    const [producto] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!producto) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Uno de los productos ya no existe" });
    }
    if (producto.status !== "published") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `"${producto.name}" ya no está a la venta` });
    }

    let precio = parseFloat(producto.price as any);
    let nombreVariante: string | undefined;
    let stockDisponible = producto.stock ?? 0;

    if (item.variantId) {
      const [variante] = await db.select().from(productVariants)
        .where(and(eq(productVariants.id, item.variantId), eq(productVariants.productId, producto.id)))
        .limit(1);
      if (!variante) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `La opción elegida de "${producto.name}" ya no existe` });
      }
      // La variante puede tener su propio precio; si no, hereda el del producto
      if (variante.price != null) precio = parseFloat(variante.price as any);
      nombreVariante = variante.name ?? undefined;
      stockDisponible = variante.stock ?? 0;
    }

    if (!Number.isFinite(precio) || precio < 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Precio inválido en "${producto.name}"` });
    }

    if (stockDisponible < item.quantity) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: stockDisponible === 0
          ? `"${producto.name}" se agotó`
          : `Solo quedan ${stockDisponible} unidades de "${producto.name}"`,
      });
    }

    subtotal += precio * item.quantity;

    lineas.push({
      productId: producto.id,
      variantId: item.variantId ?? undefined,
      productName: producto.name,
      variantName: nombreVariante,
      price: money(precio),
      quantity: item.quantity,
      imageUrl: (producto as any).imageUrl ?? undefined,
    });
  }

  // Tarjeta de regalo: el descuento se calcula aquí, no se acepta del cliente
  let descuento = 0;
  if (opts.giftCardCode) {
    const codigo = opts.giftCardCode.trim().toUpperCase();
    const [tarjeta] = await db.select().from(giftCards).where(eq(giftCards.code, codigo)).limit(1);

    if (!tarjeta) throw new TRPCError({ code: "BAD_REQUEST", message: "Esa tarjeta de regalo no existe" });
    if (tarjeta.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Esa tarjeta de regalo ya no está activa" });
    if (tarjeta.expiresAt && new Date(tarjeta.expiresAt as any).getTime() < Date.now()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Esa tarjeta de regalo venció" });
    }
    if ((tarjeta.currentUses ?? 0) >= (tarjeta.maxUses ?? 1)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Esa tarjeta de regalo ya se usó" });
    }

    // La tarjeta puede ser de monto fijo o de porcentaje
    if (tarjeta.discountType === 'percent') {
      const pct = parseFloat((tarjeta.discountPercent as any) ?? '0');
      descuento = Math.min(subtotal * (pct / 100), subtotal);
    } else {
      descuento = Math.min(parseFloat(tarjeta.amount as any), subtotal);
    }
    descuento = Math.round(descuento * 100) / 100;
  }

  const total = Math.max(0, subtotal - descuento + (opts.shipping ?? 0));

  return {
    items: lineas,
    subtotal: money(subtotal),
    giftCardDiscount: money(descuento),
    total: money(total),
  };
}

/**
 * Descuenta el stock de las líneas ya validadas.
 *
 * Se hace con una condición de stock suficiente en el propio UPDATE: si dos
 * personas compran la última unidad a la vez, solo una de las dos consultas
 * afecta filas y la otra falla. Sin esto, ambas pasaban.
 */
export async function descontarStock(lineas: LineaValidada[]) {
  const db = await getDb();
  if (!db) return;

  for (const l of lineas) {
    // Las líneas sin producto (cotizaciones a medida) no mueven inventario
    if (!l.productId) continue;
    if (l.variantId) {
      const res: any = await db.execute(
        `UPDATE productVariants SET stock = stock - ${l.quantity}
         WHERE id = ${l.variantId} AND stock >= ${l.quantity}` as any
      );
      const afectadas = res?.[0]?.affectedRows ?? res?.affectedRows ?? 1;
      if (!afectadas) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `"${l.productName}" se agotó mientras completabas el pedido` });
      }
    } else {
      const res: any = await db.execute(
        `UPDATE products SET stock = stock - ${l.quantity}
         WHERE id = ${l.productId} AND stock >= ${l.quantity}` as any
      );
      const afectadas = res?.[0]?.affectedRows ?? res?.affectedRows ?? 1;
      if (!afectadas) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `"${l.productName}" se agotó mientras completabas el pedido` });
      }
    }
  }
}

/** Devuelve el stock al cancelar un pedido */
export async function devolverStock(lineas: Array<{ productId: number; variantId?: number | null; quantity: number }>) {
  const db = await getDb();
  if (!db) return;
  for (const l of lineas) {
    // Las líneas sin producto (cotizaciones a medida) no mueven inventario
    if (!l.productId) continue;
    if (l.variantId) {
      await db.execute(`UPDATE productVariants SET stock = stock + ${l.quantity} WHERE id = ${l.variantId}` as any);
    } else {
      await db.execute(`UPDATE products SET stock = stock + ${l.quantity} WHERE id = ${l.productId}` as any);
    }
  }
}
