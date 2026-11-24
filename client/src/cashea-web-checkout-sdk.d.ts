/** SDK oficial del botón de pago de Cashea (no trae tipos propios) */
declare module "cashea-web-checkout-sdk" {
  export default class CheckoutSDK {
    constructor(opciones: { apiKey: string });
    createCheckoutButton(opciones: { payload: unknown; container: HTMLElement }): void;
  }
}
