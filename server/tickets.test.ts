import { describe, it, expect } from "vitest";

/**
 * Pruebas de la lógica crítica de boletería.
 *
 * No tocan la base de datos: comprueban las reglas que, si se rompen, causan
 * pérdida de dinero o boletos duplicados. Se replican aquí las funciones puras
 * para poder verificarlas sin levantar el servidor.
 */

// ─── Extracción del token del QR ──────────────────────────────────────────────
function extraerToken(texto: string) {
  let limpio = texto.trim();
  limpio = limpio.split("?")[0].split("#")[0];
  limpio = limpio.replace(/\/+$/, "");
  const partes = limpio.split("/").filter(Boolean);
  return (partes[partes.length - 1] ?? limpio).trim();
}

describe("lectura del QR", () => {
  it("extrae el token de la URL completa", () => {
    expect(extraerToken("https://isekaiworld.co/vender/AbC123")).toBe("AbC123");
  });

  it("tolera la barra final", () => {
    expect(extraerToken("https://isekaiworld.co/vender/AbC123/")).toBe("AbC123");
  });

  it("ignora los parámetros añadidos por algunos lectores", () => {
    expect(extraerToken("https://isekaiworld.co/vender/AbC123?utm_source=x")).toBe("AbC123");
  });

  it("acepta un token suelto", () => {
    expect(extraerToken("AbC123")).toBe("AbC123");
  });

  it("acepta el código impreso", () => {
    expect(extraerToken("IW-A3K9P2")).toBe("IW-A3K9P2");
  });
});

// ─── Normalización del código impreso ─────────────────────────────────────────
function normalizarCodigo(valor: string) {
  const codigo = valor.trim().toUpperCase();
  return codigo.startsWith("IW-") ? codigo : `IW-${codigo}`;
}

describe("código impreso", () => {
  it("añade el prefijo si falta", () => {
    expect(normalizarCodigo("a3k9p2")).toBe("IW-A3K9P2");
  });

  it("no lo duplica si ya lo trae", () => {
    expect(normalizarCodigo("iw-a3k9p2")).toBe("IW-A3K9P2");
  });

  it("ignora espacios sobrantes", () => {
    expect(normalizarCodigo("  IW-A3K9P2  ")).toBe("IW-A3K9P2");
  });
});

// ─── Precio del boleto según la tasa ──────────────────────────────────────────
function calcularPrecios(precioUsd: number, tasa: number) {
  const precioBs = tasa > 0 ? Math.round(precioUsd * tasa * 100) / 100 : null;
  return { precioUsd, precioBs };
}

describe("precio del boleto", () => {
  it("convierte a bolívares con la tasa vigente", () => {
    expect(calcularPrecios(20, 820).precioBs).toBe(16400);
  });

  it("redondea a dos decimales", () => {
    expect(calcularPrecios(18, 36.55).precioBs).toBe(657.9);
  });

  it("deja el precio en bolívares vacío si no hay tasa", () => {
    expect(calcularPrecios(20, 0).precioBs).toBeNull();
  });
});

// ─── Totales por tienda ───────────────────────────────────────────────────────
function totalesPorTienda(boletos: Array<{ storeId: number; priceUsd: string; status: string }>) {
  const vendidos = boletos.filter(b => b.status === "sold");
  const mapa = new Map<number, { cantidad: number; totalUsd: number }>();
  for (const b of vendidos) {
    const actual = mapa.get(b.storeId) ?? { cantidad: 0, totalUsd: 0 };
    actual.cantidad++;
    actual.totalUsd = Math.round((actual.totalUsd + parseFloat(b.priceUsd)) * 100) / 100;
    mapa.set(b.storeId, actual);
  }
  return mapa;
}

describe("totales por tienda", () => {
  const boletos = [
    { storeId: 1, priceUsd: "20.00", status: "sold" },
    { storeId: 1, priceUsd: "35.00", status: "sold" },
    { storeId: 2, priceUsd: "18.00", status: "sold" },
    { storeId: 1, priceUsd: "45.00", status: "blank" }, // no vendido
  ];

  it("suma solo los boletos vendidos", () => {
    expect(totalesPorTienda(boletos).get(1)).toEqual({ cantidad: 2, totalUsd: 55 });
  });

  it("separa correctamente cada tienda", () => {
    expect(totalesPorTienda(boletos).get(2)).toEqual({ cantidad: 1, totalUsd: 18 });
  });

  it("ignora los boletos en blanco", () => {
    const total = Array.from(totalesPorTienda(boletos).values())
      .reduce((a, t) => a + t.totalUsd, 0);
    expect(total).toBe(73);
  });
});

// ─── Reglas de venta ──────────────────────────────────────────────────────────
function puedeVenderse(estado: string) {
  if (estado === "void") return { ok: false, motivo: "anulado" };
  if (estado !== "blank") return { ok: false, motivo: "ya vendido" };
  return { ok: true, motivo: "" };
}

describe("reglas de venta", () => {
  it("permite vender un boleto en blanco", () => {
    expect(puedeVenderse("blank").ok).toBe(true);
  });

  it("rechaza un boleto ya vendido", () => {
    expect(puedeVenderse("sold")).toEqual({ ok: false, motivo: "ya vendido" });
  });

  it("rechaza un boleto anulado", () => {
    expect(puedeVenderse("void")).toEqual({ ok: false, motivo: "anulado" });
  });
});

// ─── Límite de intentos ───────────────────────────────────────────────────────
function crearLimitador() {
  const intentos = new Map<string, number[]>();
  return (clave: string, max: number, ventanaMs: number, ahora = Date.now()) => {
    const previos = (intentos.get(clave) ?? []).filter(t => ahora - t < ventanaMs);
    previos.push(ahora);
    intentos.set(clave, previos);
    return previos.length <= max;
  };
}

describe("límite de intentos", () => {
  it("permite hasta el máximo", () => {
    const limitar = crearLimitador();
    for (let i = 0; i < 5; i++) expect(limitar("u1", 5, 60000)).toBe(true);
  });

  it("bloquea al superarlo", () => {
    const limitar = crearLimitador();
    for (let i = 0; i < 5; i++) limitar("u1", 5, 60000);
    expect(limitar("u1", 5, 60000)).toBe(false);
  });

  it("no mezcla usuarios distintos", () => {
    const limitar = crearLimitador();
    for (let i = 0; i < 5; i++) limitar("u1", 5, 60000);
    expect(limitar("u2", 5, 60000)).toBe(true);
  });

  it("olvida los intentos viejos", () => {
    const limitar = crearLimitador();
    const inicio = 1_000_000;
    for (let i = 0; i < 5; i++) limitar("u1", 5, 60000, inicio);
    expect(limitar("u1", 5, 60000, inicio + 61000)).toBe(true);
  });
});

// ─── Día del evento ───────────────────────────────────────────────────────────
function diaDelEvento(ev: { startDate: string; endDate: string }, fecha: Date) {
  const f = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const hoy = f(fecha), d1 = f(new Date(ev.startDate)), d2 = f(new Date(ev.endDate));
  if (hoy < d1 || hoy > d2) return null;
  return Math.floor((hoy - d1) / 86400000) + 1;
}

describe("día del evento", () => {
  const ev = { startDate: "2027-08-14", endDate: "2027-08-15" };

  it("el primer día es el 1", () => {
    expect(diaDelEvento(ev, new Date("2027-08-14T10:00:00"))).toBe(1);
  });

  it("el segundo día es el 2", () => {
    expect(diaDelEvento(ev, new Date("2027-08-15T23:00:00"))).toBe(2);
  });

  it("antes del evento no hay día", () => {
    expect(diaDelEvento(ev, new Date("2027-08-13T23:59:00"))).toBeNull();
  });

  it("después del evento no hay día", () => {
    expect(diaDelEvento(ev, new Date("2027-08-16T00:01:00"))).toBeNull();
  });
});

// ─── Reglas de acceso ─────────────────────────────────────────────────────────
function puedeEntrar(opts: { dias: number; dia: number | null; diasUsados: number[] }) {
  if (!opts.dia) return { ok: false, motivo: "fuera_de_fecha" };
  if (opts.dia > opts.dias) return { ok: false, motivo: "dia_no_cubierto" };
  if (opts.diasUsados.includes(opts.dia)) return { ok: false, motivo: "ya_entro" };
  return { ok: true, motivo: "ok" };
}

describe("reglas de acceso", () => {
  it("un boleto de 1 día entra el día 1", () => {
    expect(puedeEntrar({ dias: 1, dia: 1, diasUsados: [] })).toEqual({ ok: true, motivo: "ok" });
  });

  it("un boleto de 1 día NO entra el día 2", () => {
    expect(puedeEntrar({ dias: 1, dia: 2, diasUsados: [] }).motivo).toBe("dia_no_cubierto");
  });

  it("un boleto de 2 días entra ambos días", () => {
    expect(puedeEntrar({ dias: 2, dia: 1, diasUsados: [] }).ok).toBe(true);
    expect(puedeEntrar({ dias: 2, dia: 2, diasUsados: [1] }).ok).toBe(true);
  });

  it("no se puede entrar dos veces el mismo día", () => {
    expect(puedeEntrar({ dias: 2, dia: 1, diasUsados: [1] }).motivo).toBe("ya_entro");
  });

  it("fuera de las fechas del evento no entra nadie", () => {
    expect(puedeEntrar({ dias: 2, dia: null, diasUsados: [] }).motivo).toBe("fuera_de_fecha");
  });

  it("una fotocopia del boleto no sirve el mismo día", () => {
    // El original ya entró: el duplicado se rechaza
    expect(puedeEntrar({ dias: 2, dia: 1, diasUsados: [1] }).ok).toBe(false);
  });
});
