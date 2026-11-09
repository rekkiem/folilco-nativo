import { describe, it, expect, afterEach } from "@jest/globals";
import { firmarToken } from "@/lib/auth";

describe("O0-4 JWT_SECRET obligatorio", () => {
  const original = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = original;
  });

  it("falla si JWT_SECRET es placeholder o corto", async () => {
    process.env.JWT_SECRET = "corto";
    await expect(firmarToken({ username: "a", rol: "admin" })).rejects.toThrow(
      /JWT_SECRET/
    );
  });

  it("falla si JWT_SECRET contiene tu-", async () => {
    process.env.JWT_SECRET = "tu-secreto-placeholder-que-es-largo-32";
    await expect(firmarToken({ username: "a", rol: "admin" })).rejects.toThrow(
      /JWT_SECRET/
    );
  });
});
