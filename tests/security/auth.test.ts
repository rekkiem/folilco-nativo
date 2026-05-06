/**
 * tests/security/auth.test.ts
 * Pruebas de seguridad básicas.
 * Ejecutar: npm test -- --testPathPattern=security
 */

import { describe, it, expect } from "@jest/globals";
import { timingSafeEqual, createHmac } from "crypto";

describe("Seguridad – API keys en cliente", () => {
  it("SUPABASE_SERVICE_ROLE_KEY no debe ser PUBLIC", () => {
    // Solo las NEXT_PUBLIC_ vars llegan al cliente
    expect(
      Object.keys(process.env)
        .filter((k) => k.startsWith("NEXT_PUBLIC_"))
        .includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")
    ).toBe(false);
  });

  it("MERCADOPAGO_ACCESS_TOKEN no debe ser PUBLIC", () => {
    expect(
      Object.keys(process.env)
        .filter((k) => k.startsWith("NEXT_PUBLIC_"))
        .includes("NEXT_PUBLIC_MERCADOPAGO_ACCESS_TOKEN")
    ).toBe(false);
  });

  it("JWT_SECRET no debe ser PUBLIC", () => {
    expect(
      Object.keys(process.env)
        .filter((k) => k.startsWith("NEXT_PUBLIC_"))
        .includes("NEXT_PUBLIC_JWT_SECRET")
    ).toBe(false);
  });
});

describe("Seguridad – comparación segura de strings", () => {
  it("timingSafeEqual previene timing attacks", () => {
    const a = Buffer.from("secreto123".padEnd(100));
    const b = Buffer.from("secreto123".padEnd(100));
    const c = Buffer.from("otrosecreto".padEnd(100));

    expect(timingSafeEqual(a, b)).toBe(true);
    expect(timingSafeEqual(a, c)).toBe(false);
  });

  it("buffers de diferente tamaño lanzan error (no fuga de info)", () => {
    expect(() => {
      timingSafeEqual(Buffer.from("abc"), Buffer.from("abcdef"));
    }).toThrow();
  });
});

describe("Seguridad – HMAC webhook", () => {
  it("HMAC es diferente con secretos distintos", () => {
    const payload = "id:123;request-id:abc;ts:1000;";
    const h1 = createHmac("sha256", "secret1").update(payload).digest("hex");
    const h2 = createHmac("sha256", "secret2").update(payload).digest("hex");
    expect(h1).not.toBe(h2);
  });

  it("mismo secreto y payload siempre produce mismo HMAC (determinismo)", () => {
    const payload = "id:123;request-id:abc;ts:1000;";
    const h1 = createHmac("sha256", "secret").update(payload).digest("hex");
    const h2 = createHmac("sha256", "secret").update(payload).digest("hex");
    expect(h1).toBe(h2);
  });
});

describe("Seguridad – Validación de inputs", () => {
  function esUUID(s: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
  }

  it("UUID válido pasa la validación", () => {
    expect(esUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("SQL injection no pasa como UUID", () => {
    expect(esUUID("' OR '1'='1")).toBe(false);
    expect(esUUID("1; DROP TABLE reservas--")).toBe(false);
  });

  it("XSS payload no pasa como UUID", () => {
    expect(esUUID("<script>alert(1)</script>")).toBe(false);
  });

  it("fecha válida pasa regex", () => {
    const esDateValida = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
    expect(esDateValida("2024-12-01")).toBe(true);
    expect(esDateValida("2024-13-01")).toBe(true); // Regex solo valida formato
    expect(esDateValida("01/12/2024")).toBe(false);
    expect(esDateValida("'; DROP TABLE--")).toBe(false);
  });
});

describe("Seguridad – Rate limiting", () => {
  function createLimiter(windowMs: number, max: number) {
    const store = new Map<string, { count: number; resetAt: number }>();
    return (id: string) => {
      const now = Date.now();
      let e = store.get(id);
      if (!e || e.resetAt < now) { e = { count: 0, resetAt: now + windowMs }; store.set(id, e); }
      e.count++;
      return { allowed: e.count <= max };
    };
  }

  it("bloquea después de 5 intentos de login", () => {
    const loginLimiter = createLimiter(15 * 60_000, 5);
    for (let i = 0; i < 5; i++) loginLimiter("attacker-ip");
    expect(loginLimiter("attacker-ip").allowed).toBe(false);
  });

  it("permite 30 webhooks por minuto por IP", () => {
    const webhookLimiter = createLimiter(60_000, 30);
    for (let i = 0; i < 30; i++) webhookLimiter("mp-ip");
    expect(webhookLimiter("mp-ip").allowed).toBe(false);
  });

  it("IPs distintas tienen límites independientes", () => {
    const limiter = createLimiter(60_000, 3);
    for (let i = 0; i < 10; i++) limiter("ip-blocked");
    expect(limiter("ip-clean").allowed).toBe(true);
  });
});
