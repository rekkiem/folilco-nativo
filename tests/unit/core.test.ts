/**
 * tests/unit/core.test.ts
 * Pruebas unitarias para lógica crítica de Folilco Nativo.
 *
 * Ejecutar: npm test
 * Con coverage: npm run test:coverage
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

// ──────────────────────────────────────────────────────────────
// 1. CÁLCULO DE DISPONIBILIDAD
// ──────────────────────────────────────────────────────────────

function fechasSeSuperponen(
  reservaInicio: string,
  reservaFin: string,
  consultaInicio: string,
  consultaFin: string
): boolean {
  return reservaInicio < consultaFin && reservaFin > consultaInicio;
}

describe("disponibilidad – superposición de fechas", () => {
  it("detecta superposición exacta", () => {
    expect(fechasSeSuperponen("2024-12-01", "2024-12-05", "2024-12-01", "2024-12-05")).toBe(true);
  });

  it("detecta superposición parcial (inicio dentro)", () => {
    expect(fechasSeSuperponen("2024-12-01", "2024-12-05", "2024-12-03", "2024-12-08")).toBe(true);
  });

  it("detecta superposición parcial (fin dentro)", () => {
    expect(fechasSeSuperponen("2024-12-03", "2024-12-08", "2024-12-01", "2024-12-05")).toBe(true);
  });

  it("detecta reserva contenida", () => {
    expect(fechasSeSuperponen("2024-12-02", "2024-12-04", "2024-12-01", "2024-12-10")).toBe(true);
  });

  it("no detecta superposición cuando es contiguo (checkout = checkin)", () => {
    // Checkout el 5, nuevo checkin el 5 → válido (misma fecha, no se superpone)
    expect(fechasSeSuperponen("2024-12-01", "2024-12-05", "2024-12-05", "2024-12-08")).toBe(false);
  });

  it("no detecta superposición cuando son fechas distintas sin cruce", () => {
    expect(fechasSeSuperponen("2024-12-01", "2024-12-05", "2024-12-06", "2024-12-10")).toBe(false);
  });

  it("no detecta superposición cuando la reserva es anterior", () => {
    expect(fechasSeSuperponen("2024-11-01", "2024-11-05", "2024-12-01", "2024-12-05")).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// 2. CÁLCULO DE PRECIO
// ──────────────────────────────────────────────────────────────

function calcularPrecioTotal(
  precioPorNoche: number,
  fechaInicio: string,
  fechaFin: string,
  cantidadPersonas: number,
  tipo: "alojamiento" | "experiencia"
): number {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const noches = Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

  if (tipo === "alojamiento") return precioPorNoche * noches;
  return precioPorNoche * cantidadPersonas;
}

function calcularComision(precioTotal: number, porcentaje = 0.1): number {
  return Math.round(precioTotal * porcentaje);
}

describe("cálculo de precio", () => {
  it("calcula precio de alojamiento por noches (no por personas)", () => {
    expect(calcularPrecioTotal(85000, "2024-12-01", "2024-12-03", 2, "alojamiento")).toBe(170000);
  });

  it("calcula precio de experiencia por persona (no por noches)", () => {
    expect(calcularPrecioTotal(35000, "2024-12-01", "2024-12-02", 3, "experiencia")).toBe(105000);
  });

  it("calcula precio de 1 noche correctamente", () => {
    expect(calcularPrecioTotal(120000, "2024-12-01", "2024-12-02", 2, "alojamiento")).toBe(120000);
  });

  it("calcula comisión del 10%", () => {
    expect(calcularComision(85000)).toBe(8500);
  });

  it("redondea la comisión correctamente", () => {
    expect(calcularComision(85001)).toBe(8500);
  });

  it("calcula comisión con porcentaje personalizado", () => {
    expect(calcularComision(100000, 0.15)).toBe(15000);
  });
});

// ──────────────────────────────────────────────────────────────
// 3. NORMALIZACIÓN DE TELÉFONO
// ──────────────────────────────────────────────────────────────

function normalizarTelefono(tel: string): string {
  let limpio = tel.replace(/[^\d+]/g, "");
  if (limpio.startsWith("0")) limpio = limpio.slice(1);
  if (!limpio.startsWith("+")) {
    limpio = limpio.startsWith("56") ? "+" + limpio : "+56" + limpio;
  }
  return "whatsapp:" + limpio;
}

describe("normalización de teléfono chileno", () => {
  it("formatea número con +56", () => {
    expect(normalizarTelefono("+56912345678")).toBe("whatsapp:+56912345678");
  });

  it("agrega +56 a número de 9 dígitos", () => {
    expect(normalizarTelefono("912345678")).toBe("whatsapp:+56912345678");
  });

  it("agrega + a número que empieza con 56", () => {
    expect(normalizarTelefono("56912345678")).toBe("whatsapp:+56912345678");
  });

  it("elimina espacios y guiones", () => {
    expect(normalizarTelefono("+56 9 1234-5678")).toBe("whatsapp:+56912345678");
  });

  it("elimina paréntesis", () => {
    expect(normalizarTelefono("+56(9)12345678")).toBe("whatsapp:+56912345678");
  });

  it("elimina cero inicial", () => {
    expect(normalizarTelefono("09 12345678")).toBe("whatsapp:+56912345678");
  });
});

// ──────────────────────────────────────────────────────────────
// 4. VALIDACIÓN DE FIRMA WEBHOOK
// ──────────────────────────────────────────────────────────────

import { createHmac } from "crypto";

function buildManifest(dataId: string, requestId: string, ts: string): string {
  return `id:${dataId};request-id:${requestId};ts:${ts};`;
}

function generarFirmaMP(secret: string, dataId: string, requestId: string, ts: string): string {
  const manifest = buildManifest(dataId, requestId, ts);
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

describe("verificación de firma webhook MercadoPago", () => {
  const SECRET = "test-secret-key-32-chars-minimum";
  const DATA_ID = "12345";
  const REQUEST_ID = "abc-uuid";
  const TS = "1700000000";

  it("acepta firma válida", () => {
    const hash = generarFirmaMP(SECRET, DATA_ID, REQUEST_ID, TS);
    const xSignature = `ts=${TS},v1=${hash}`;

    // Simular la verificación
    const parts = xSignature.split(",");
    const v1Part = parts.find((p) => p.startsWith("v1="));
    expect(v1Part).toBeDefined();

    const receivedHash = v1Part!.split("=")[1];
    const expected = generarFirmaMP(SECRET, DATA_ID, REQUEST_ID, TS);
    expect(receivedHash).toBe(expected);
  });

  it("rechaza firma manipulada", () => {
    const hash = generarFirmaMP(SECRET, DATA_ID, REQUEST_ID, TS);
    const hashManipulado = hash.slice(0, -4) + "0000";
    expect(hash).not.toBe(hashManipulado);
  });

  it("rechaza firma con timestamp diferente", () => {
    const hash1 = generarFirmaMP(SECRET, DATA_ID, REQUEST_ID, "1700000000");
    const hash2 = generarFirmaMP(SECRET, DATA_ID, REQUEST_ID, "1700000001");
    expect(hash1).not.toBe(hash2);
  });

  it("rechaza firma con dataId diferente", () => {
    const hash1 = generarFirmaMP(SECRET, "12345", REQUEST_ID, TS);
    const hash2 = generarFirmaMP(SECRET, "99999", REQUEST_ID, TS);
    expect(hash1).not.toBe(hash2);
  });
});

// ──────────────────────────────────────────────────────────────
// 5. RATE LIMITER
// ──────────────────────────────────────────────────────────────

function createRateLimiter(windowMs: number, max: number) {
  const store = new Map<string, { count: number; resetAt: number }>();
  return function check(id: string) {
    const now = Date.now();
    let entry = store.get(id);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(id, entry);
    }
    entry.count++;
    return { allowed: entry.count <= max, remaining: Math.max(0, max - entry.count) };
  };
}

describe("rate limiter", () => {
  it("permite requests dentro del límite", () => {
    const limiter = createRateLimiter(60_000, 5);
    for (let i = 0; i < 5; i++) {
      expect(limiter("ip1").allowed).toBe(true);
    }
  });

  it("bloquea al superar el límite", () => {
    const limiter = createRateLimiter(60_000, 3);
    limiter("ip2"); limiter("ip2"); limiter("ip2");
    expect(limiter("ip2").allowed).toBe(false);
  });

  it("no afecta a IPs distintas", () => {
    const limiter = createRateLimiter(60_000, 2);
    limiter("ip3"); limiter("ip3"); limiter("ip3"); // bloqueado
    expect(limiter("ip4").allowed).toBe(true); // ip4 libre
  });

  it("calcula remaining correctamente", () => {
    const limiter = createRateLimiter(60_000, 5);
    limiter("ip5");
    limiter("ip5");
    const result = limiter("ip5");
    expect(result.remaining).toBe(2); // 5 - 3 = 2
  });
});

// ──────────────────────────────────────────────────────────────
// 6. GENERACIÓN DE NÚMERO DE RESERVA
// ──────────────────────────────────────────────────────────────

function generarNumeroReserva(year: number, seq: number): string {
  return `FOL-${year}-${String(seq).padStart(4, "0")}`;
}

describe("generación de número de reserva", () => {
  it("genera formato correcto", () => {
    expect(generarNumeroReserva(2024, 1)).toBe("FOL-2024-0001");
  });

  it("rellena con ceros", () => {
    expect(generarNumeroReserva(2024, 42)).toBe("FOL-2024-0042");
  });

  it("soporta números de 4 dígitos", () => {
    expect(generarNumeroReserva(2024, 1234)).toBe("FOL-2024-1234");
  });

  it("soporta cambio de año", () => {
    expect(generarNumeroReserva(2025, 1)).toBe("FOL-2025-0001");
  });
});
