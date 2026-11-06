/**
 * tests/unit/env.test.ts
 * Pruebas de validación de variables de entorno.
 */

import { describe, it, expect } from "@jest/globals";
import { validateEnv, requireEnv } from "@/lib/env";

describe("validateEnv()", () => {
  it("pasa con todas las variables requeridas presentes (setup.ts las define)", () => {
    const { valid, missing } = validateEnv();
    expect(valid).toBe(true);
    expect(missing).toHaveLength(0);
  });

  it("en development/test: variables faltantes van a warnings, no invalidan",
    () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NODE_ENV = "test";

      const { valid, missing, warnings } = validateEnv();
      expect(valid).toBe(true);
      expect(missing).toHaveLength(0);
      expect(warnings.some((w) => w.includes("NEXT_PUBLIC_SUPABASE_URL"))).toBe(
        true
      );

      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.NODE_ENV = originalEnv;
    }
  );

  it("en production: variables faltantes invalidan",
    () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NODE_ENV = "production";

      const { valid, missing } = validateEnv();
      expect(valid).toBe(false);
      expect(missing).toContain("NEXT_PUBLIC_SUPABASE_URL");

      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.NODE_ENV = originalEnv;
    }
  );

  it("emite warnings como array",
    () => {
      const originalGoogle = process.env.GOOGLE_SPREADSHEET_ID;
      delete process.env.GOOGLE_SPREADSHEET_ID;

      const { warnings } = validateEnv();
      expect(Array.isArray(warnings)).toBe(true);

      process.env.GOOGLE_SPREADSHEET_ID = originalGoogle;
    }
  );
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
