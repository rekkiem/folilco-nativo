/**
 * tests/unit/mercadopago.test.ts
 * Pruebas unitarias del módulo de MercadoPago.
 */

import { describe, it, expect } from "@jest/globals";
import { createHmac } from "crypto";
import { verificarFirmaWebhook, formatearPrecioCLP } from "@/lib/mercadopago";

// Helpers para generar firmas válidas en tests
function generarFirmaValida(secret: string, dataId: string, requestId: string, ts: string) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

describe("verificarFirmaWebhook()", () => {
  const secret = "test-webhook-secret-32-chars-long!!";
  const dataId = "123456789";
  const requestId = "req-abc-123";
  const ts = String(Math.floor(Date.now() / 1000));

  it("acepta firma válida", () => {
    const signature = generarFirmaValida(secret, dataId, requestId, ts);
    const result = verificarFirmaWebhook(signature, requestId, dataId, ts);
    expect(result).toBe(true);
  });

  it("rechaza firma con hash incorrecto", () => {
    const signature = `ts=${ts},v1=aaabbbbcccc0000111122223333444455556666777788889999aaaabbbbcccc0000`;
    const result = verificarFirmaWebhook(signature, requestId, dataId, ts);
    expect(result).toBe(false);
  });

  it("rechaza firma sin parte v1=", () => {
    const signature = `ts=${ts}`;
    const result = verificarFirmaWebhook(signature, requestId, dataId, ts);
    expect(result).toBe(false);
  });

  it("rechaza firma vacía", () => {
    const result = verificarFirmaWebhook("", requestId, dataId, ts);
    expect(result).toBe(false);
  });

  it("rechaza cuando dataId fue alterado", () => {
    const signature = generarFirmaValida(secret, dataId, requestId, ts);
    const result = verificarFirmaWebhook(signature, requestId, "999999999", ts);
    expect(result).toBe(false);
  });
});

describe("formatearPrecioCLP()", () => {
  it("formatea precio chileno correctamente", () => {
    expect(formatearPrecioCLP(85000)).toMatch(/85\.000|85,000/); // tolerante a locale
    expect(formatearPrecioCLP(85000)).toContain("$");
  });

  it("maneja precios de 7 dígitos", () => {
    const result = formatearPrecioCLP(1_500_000);
    expect(result).toContain("1");
    expect(result).toContain("500");
  });

  it("maneja precio cero", () => {
    const result = formatearPrecioCLP(0);
    expect(result).toContain("$");
  });
});
