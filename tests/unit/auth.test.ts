/**
 * tests/unit/auth.test.ts
 * Pruebas unitarias del módulo JWT de autenticación admin.
 */

import { describe, it, expect } from "@jest/globals";
import { firmarToken, verificarToken } from "@/lib/auth";

describe("firmarToken() / verificarToken()", () => {
  const payload = { username: "admin", rol: "admin" as const };

  it("firma y verifica correctamente un token válido", async () => {
    const token = await firmarToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // header.payload.signature

    const verificado = await verificarToken(token);
    expect(verificado).not.toBeNull();
    expect(verificado?.username).toBe("admin");
    expect(verificado?.rol).toBe("admin");
  });

  it("retorna null para token malformado", async () => {
    const result = await verificarToken("esto.no.es.un.jwt.valido");
    expect(result).toBeNull();
  });

  it("retorna null para string vacío", async () => {
    const result = await verificarToken("");
    expect(result).toBeNull();
  });

  it("retorna null para token con firma alterada", async () => {
    const token = await firmarToken(payload);
    const parts = token.split(".");
    parts[2] = "firmaalterada"; // corromper la firma
    const result = await verificarToken(parts.join("."));
    expect(result).toBeNull();
  });

  it("el token incluye los campos del payload", async () => {
    const token = await firmarToken({ username: "socio1", rol: "socio" as const });
    const decoded = await verificarToken(token);
    expect(decoded?.username).toBe("socio1");
    expect(decoded?.rol).toBe("socio");
  });
});
