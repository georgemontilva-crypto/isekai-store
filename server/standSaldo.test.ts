import { describe, expect, it } from "vitest";
import { claveDeReserva, reservaDeClave, enlaceDeSaldo, casheaConfig } from "./standSaldo";

describe("enlace personal del saldo de un stand", () => {
  it("la clave de una reserva vuelve a dar esa reserva", () => {
    for (const id of [1, 14, 999, 123456]) expect(reservaDeClave(claveDeReserva(id))).toBe(id);
  });
  it("no acepta claves inventadas ni de otra reserva", () => {
    const [, firma] = claveDeReserva(14).split("-");
    expect(reservaDeClave(`f-${firma}`)).toBeNull();            // firma de la 14 con otro número
    expect(reservaDeClave("e-00000000000000000000")).toBeNull();
    expect(reservaDeClave("")).toBeNull();
    expect(reservaDeClave("e")).toBeNull();
    expect(reservaDeClave("../../admin")).toBeNull();
  });
  it("arma el enlace en el dominio del sitio", () => {
    expect(enlaceDeSaldo(14)).toBe(`https://www.isekaiworld.co/stands/saldo/${claveDeReserva(14)}`);
  });
});

describe("Cashea", () => {
  it("queda apagado mientras falte alguna variable", () => {
    const antes = { ...process.env };
    for (const k of Object.keys(process.env)) if (k.startsWith("CASHEA_")) delete process.env[k];
    expect(casheaConfig().activo).toBe(false);
    Object.assign(process.env, { CASHEA_PUBLIC_API_KEY: "a", CASHEA_PRIVATE_API_KEY: "b", CASHEA_EXTERNAL_CLIENT_ID: "1", CASHEA_STORE_NAME: "x" });
    expect(casheaConfig().activo).toBe(false);                  // falta el número de tienda
    process.env.CASHEA_STORE_ID = "77";
    expect(casheaConfig().activo).toBe(true);
    for (const k of Object.keys(process.env)) if (k.startsWith("CASHEA_")) delete process.env[k];
    Object.assign(process.env, antes);
  });
});
