/**
 * tests/unit/rate-limit.test.ts
 * Pruebas unitarias del rate limiter en memoria.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

describe("rateLimit()", () => {
  it("permite las primeras N peticiones", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 3 });
    expect(limiter("user-1").allowed).toBe(true);
    expect(limiter("user-1").allowed).toBe(true);
    expect(limiter("user-1").allowed).toBe(true);
  });

  it("bloquea la petición N+1", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    limiter("user-2");
    limiter("user-2");
    const result = limiter("user-2");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("usuarios distintos tienen contadores independientes", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    expect(limiter("user-a").allowed).toBe(true);
    expect(limiter("user-b").allowed).toBe(true);
    // user-a ya agotó el límite
    expect(limiter("user-a").allowed).toBe(false);
    // user-b tiene 1 hit, ya agotó también
    expect(limiter("user-b").allowed).toBe(false);
  });

  it("reporta remaining correctamente", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 5 });
    const r1 = limiter("user-r");
    expect(r1.remaining).toBe(4);
    const r2 = limiter("user-r");
    expect(r2.remaining).toBe(3);
  });

  it("resetAt está en el futuro", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 5 });
    const result = limiter("user-reset");
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});

describe("getClientIP()", () => {
  function makeRequest(headers: Record<string, string>): Request {
    return new Request("http://localhost/test", { headers });
  }

  it("extrae IP de x-real-ip", () => {
    const req = makeRequest({ "x-real-ip": "203.0.113.1" });
    expect(getClientIP(req)).toBe("203.0.113.1");
  });

  it("extrae IP de x-forwarded-for (primer valor)", () => {
    const req = makeRequest({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" });
    expect(getClientIP(req)).toBe("203.0.113.1");
  });

  it("retorna 'unknown' sin headers", () => {
    const req = makeRequest({});
    expect(getClientIP(req)).toBe("unknown");
  });
});
