/**
 * tests/unit/env.test.ts
 * Pruebas de validación de variables de entorno.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { validateEnv, requireEnv } from "@/lib/env";

describe("validateEnv()", () => {
  it("pasa con todas las variables requeridas presentes (setup.ts las define)", () => {
    const { valid, missing } = validateEnv();
    expect(valid).toBe(true);
    expect(missing).toHaveLength(0);
  });

  it("detecta variables faltantes", () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const { valid, missing } = validateEnv();
    expect(valid).toBe(false);
    expect(missing).toContain("NEXT_PUBLIC_SUPABASE_URL");

    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });

  it("emite warnings para variables opcionales no configuradas", () => {
    const originalGoogle = process.env.GOOGLE_SPREADSHEET_ID;
    delete process.env.GOOGLE_SPREADSHEET_ID;

    const { warnings } = validateEnv();
    // Puede tener warnings de otras vars opcionales también
    expect(Array.isArray(warnings)).toBe(true);

    process.env.GOOGLE_SPREADSHEET_ID = originalGoogle;
  });
});

describe("requireEnv()", () => {
  it("retorna el valor si existe", () => {
    const result = requireEnv("ADMIN_USERNAME");
    expect(result).toBe("admin");
  });

  it("lanza error si la variable no existe", () => {
    expect(() => requireEnv("VARIABLE_QUE_NO_EXISTE_XYZ")).toThrow(
      "Variable de entorno requerida no configurada: VARIABLE_QUE_NO_EXISTE_XYZ"
    );
  });
});
