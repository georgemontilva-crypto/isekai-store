/**
 * Métodos de pago — ISEKAI WORLD (Venezuela)
 *
 * La tienda opera únicamente en Venezuela y la moneda de la tienda es el DÓLAR (USD).
 * Los precios se muestran y se cobran en USD en todos lados.
 *
 * Para cambiar los datos de cobro (cédula, banco, teléfono, wallet) edita ESTE archivo:
 * es la única fuente de verdad, la usan el checkout y el modal de pago.
 */

export const STORE_COUNTRY = "Venezuela";
export const STORE_CURRENCY = "USD";

/** Identificadores que se guardan en orders.paymentMethod */
export type PaymentMethodId = "pago_movil" | "crypto";

export const PAYMENT_METHODS: PaymentMethodId[] = ["pago_movil", "crypto"];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pago_movil: "Pago Móvil",
  crypto: "Cripto (USDT)",
  // Compatibilidad con órdenes antiguas
  whatsapp: "WhatsApp",
};

/** Datos de Pago Móvil */
export const PAGO_MOVIL = {
  ci: "23858926",
  bank: "Banco de Venezuela",
  phone: "04220386380",
} as const;

/** Datos de pago en cripto */
export const CRYPTO = {
  asset: "USDT",
  network: "Tron (TRC20)",
  address: "TPWp9WEJAzxYJaHu1XGCcW1suTWbSMovHo",
} as const;
