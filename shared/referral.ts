/**
 * Recompensas por venta referida de un cosplayer del Guild.
 *
 * Antes era un 2 % del total. Ahora son MONTOS FIJOS por tramo, que son más
 * fáciles de comunicar ("vendes algo de $30 y ganas $3.50") y más generosos en
 * las ventas pequeñas: en una venta de $5 el 2 % daban 10 centavos; ahora da $1.
 *
 * Fuente única de verdad: cualquier cambio se hace aquí y aplica en todos los
 * puntos donde se acredita (checkout, aprobación de pago, ajustes del admin).
 */

export interface ReferralTier {
  /** Mínimo del tramo, inclusive */
  min: number;
  /** Máximo del tramo, inclusive. null = sin tope */
  max: number | null;
  /** Dólares que gana el cosplayer */
  cash: number;
  /** Tickets que gana el cosplayer */
  tickets: number;
  /** Cómo se muestra el tramo en la web */
  label: string;
}

export const REFERRAL_TIERS: ReferralTier[] = [
  { min: 0,     max: 5,    cash: 1.00, tickets: 100,  label: "$1 – $5" },
  { min: 5.01,  max: 10,   cash: 2.00, tickets: 220,  label: "$5.01 – $10" },
  { min: 10.01, max: 25,   cash: 3.50, tickets: 400,  label: "$10.01 – $25" },
  { min: 25.01, max: 50,   cash: 5.00, tickets: 700,  label: "$25.01 – $50" },
  { min: 50.01, max: null, cash: 7.00, tickets: 1200, label: "$50 en adelante" },
];

/** Devuelve el tramo que le corresponde al total de una orden */
export function getReferralTier(orderTotal: number): ReferralTier {
  const total = Number.isFinite(orderTotal) ? orderTotal : 0;
  for (const tier of REFERRAL_TIERS) {
    if (tier.max === null || total <= tier.max) return tier;
  }
  return REFERRAL_TIERS[REFERRAL_TIERS.length - 1];
}

/** Dólares que gana el cosplayer por una orden */
export function getReferralCash(orderTotal: number): number {
  return getReferralTier(orderTotal).cash;
}

/** Tickets que gana el cosplayer por una orden */
export function getReferralTickets(orderTotal: number): number {
  return getReferralTier(orderTotal).tickets;
}
