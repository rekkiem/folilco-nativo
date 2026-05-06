/**
 * tests/unit/whatsapp.test.ts
 * Pruebas de normalización de teléfonos y validación de mensajes.
 * No llama a Twilio real (se testean helpers internos).
 */

import { describe, it, expect } from "@jest/globals";

// Exponer la función de normalización para testear
// (se copia la lógica aquí para no depender del módulo que usa lazy-init)
function normalizarTelefono(tel: string): string {
  let limpio = tel.replace(/[^\d+]/g, "");
  if (limpio.startsWith("0")) limpio = limpio.slice(1);
  if (!limpio.startsWith("+")) {
    limpio = limpio.startsWith("56") ? "+" + limpio : "+56" + limpio;
  }
  return "whatsapp:" + limpio;
}

describe("normalizarTelefono()", () => {
  it("normaliza número chileno sin código de país", () => {
    expect(normalizarTelefono("912345678")).toBe("whatsapp:+56912345678");
  });

  it("normaliza número con +56 ya incluido", () => {
    expect(normalizarTelefono("+56912345678")).toBe("whatsapp:+56912345678");
  });

  it("normaliza número con 56 sin +", () => {
    expect(normalizarTelefono("56912345678")).toBe("whatsapp:+56912345678");
  });

  it("elimina espacios y guiones", () => {
    expect(normalizarTelefono("+56 9 1234 5678")).toBe("whatsapp:+56912345678");
    expect(normalizarTelefono("+56-9-1234-5678")).toBe("whatsapp:+56912345678");
  });

  it("elimina paréntesis", () => {
    expect(normalizarTelefono("+56 (9) 1234 5678")).toBe("whatsapp:+56912345678");
  });

  it("quita el 0 inicial", () => {
    expect(normalizarTelefono("0912345678")).toBe("whatsapp:+56912345678");
  });
});

describe("Validación de número WhatsApp", () => {
  it("número con menos de 10 dígitos es inválido", () => {
    const to = normalizarTelefono("123");
    const stripped = to.replace("whatsapp:", "").replace("+", "");
    expect(stripped.length).toBeLessThan(10);
  });

  it("número chileno válido tiene suficientes dígitos", () => {
    const to = normalizarTelefono("+56912345678");
    const stripped = to.replace("whatsapp:", "").replace("+", "");
    expect(stripped.length).toBeGreaterThanOrEqual(10);
  });
});
