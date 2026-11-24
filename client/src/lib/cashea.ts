/**
 * Monta el botón oficial «Continuar con Cashea» dentro de `caja`.
 * El SDK de Cashea se descarga solo cuando hace falta. Al tocar el botón,
 * Cashea guarda la orden (con la llave pública) y lleva a la tienda a su app.
 */
export async function montarBotonCashea(caja: HTMLElement, publicKey: string, payload: unknown): Promise<void> {
  const modulo: any = await import("cashea-web-checkout-sdk");
  const CheckoutSDK = modulo.default ?? modulo.WebCheckoutSDK ?? modulo;
  caja.replaceChildren();
  new CheckoutSDK({ apiKey: publicKey }).createCheckoutButton({ payload, container: caja });
}

/** Los errores de validación llegan como JSON: al público se le da un texto simple */
export const mensajeDeError = (e: { message?: string } | null | undefined, respaldo: string) => {
  const m = String(e?.message ?? "").trim();
  return !m || m.startsWith("[") ? respaldo : m;
};
