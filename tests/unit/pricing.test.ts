import { calcularPrecio, validarCapacidad } from "@/lib/pricing";

describe("calcularPrecio (F0-01)", () => {
  it("alojamiento: precio × noches (NO × personas)", () => {
    const r = calcularPrecio({
      tipo: "alojamiento",
      precio_clp: 85000,
      noches: 1,
      personas: 2,
    });
    expect(r.total_clp).toBe(85000);
    expect(r.base_clp).toBe(85000);
  });

  it("alojamiento 3 noches", () => {
    const r = calcularPrecio({
      tipo: "alojamiento",
      precio_clp: 85000,
      noches: 3,
      personas: 2,
    });
    expect(r.total_clp).toBe(255000);
  });

  it("experiencia: precio × personas", () => {
    const r = calcularPrecio({
      tipo: "experiencia",
      precio_clp: 35000,
      personas: 3,
    });
    expect(r.total_clp).toBe(105000);
  });

  it("producto + extras", () => {
    const r = calcularPrecio({
      tipo: "alojamiento",
      precio_clp: 85000,
      noches: 1,
      extras: [
        {
          producto_id: "m1",
          tipo: "producto",
          precio_clp: 9500,
          cantidad: 2,
          nombre: "Miel",
        },
      ],
    });
    expect(r.total_clp).toBe(85000 + 19000);
    expect(r.extras_clp).toBe(19000);
  });

  it("deduplica extras por producto_id", () => {
    const r = calcularPrecio({
      tipo: "alojamiento",
      precio_clp: 10000,
      noches: 1,
      extras: [
        { producto_id: "a", tipo: "producto", precio_clp: 1000, cantidad: 1 },
        { producto_id: "a", tipo: "producto", precio_clp: 1000, cantidad: 3 },
      ],
    });
    expect(r.extras_clp).toBe(1000);
  });
});

describe("validarCapacidad", () => {
  it("rechaza personas > capacidad", () => {
    const r = validarCapacidad("alojamiento", 2, 3);
    expect(r.ok).toBe(false);
  });
  it("acepta personas = capacidad", () => {
    const r = validarCapacidad("alojamiento", 2, 2);
    expect(r.ok).toBe(true);
  });
});
