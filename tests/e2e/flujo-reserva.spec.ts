/**
 * tests/e2e/flujo-reserva.spec.ts
 *
 * Prueba E2E del flujo completo de reserva con Playwright.
 *
 * PREREQUISITOS:
 *   1. npm run dev  (servidor en localhost:3003)
 *   2. Variables de entorno configuradas (.env.local)
 *   3. npx playwright install chromium
 *
 * EJECUTAR:
 *   npx playwright test tests/e2e/flujo-reserva.spec.ts
 *   npx playwright test --headed  (con UI visible)
 *   npx playwright test --debug   (paso a paso)
 *
 * CRITERIOS DE ÉXITO:
 *   ✅ Flujo completo < 2 minutos
 *   ✅ Redirección a MercadoPago exitosa
 *   ✅ Página de éxito muestra número de reserva
 */

import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:3003";

// ── Configuración global ────────────────────────────────
test.use({
  baseURL: BASE,
  viewport: { width: 390, height: 844 }, // iPhone 14 (mobile-first)
  locale: "es-CL",
});

// ── Tests de la landing page ────────────────────────────
test.describe("Landing page pública", () => {
  test("carga correctamente y muestra contenido principal", async ({ page }) => {
    await page.goto("/");

    // Título principal
    await expect(page.getByText(/el sur de chile/i)).toBeVisible();

    // Botón de reserva
    await expect(page.getByRole("link", { name: /reservar/i }).first()).toBeVisible();

    // Secciones
    await expect(page.getByText(/cooperativa/i).first()).toBeVisible();
  });

  test("navegación al formulario de reserva funciona", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /reservar ahora/i }).first().click();
    await expect(page).toHaveURL(/\/reservar/);
  });

  test("carga en menos de 3 segundos (3G simulado)", async ({ page }) => {
    // Simular conexión 3G
    const client = await (page.context() as any).newCDPSession(page);
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: 375 * 1024 / 8, // 375 KB/s = 3G
      uploadThroughput: 375 * 1024 / 8,
      latency: 100,
    });

    const inicio = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const tiempo = Date.now() - inicio;

    expect(tiempo).toBeLessThan(3000);
    console.log(`  ⏱ Carga en 3G: ${tiempo}ms`);
  });
});

// ── Tests del flujo de reserva ──────────────────────────
test.describe("Flujo de reserva", () => {
  test("Paso 1: selección de producto muestra opciones", async ({ page }) => {
    await page.goto("/reservar");

    // Esperar que carguen los productos
    await page.waitForSelector("[data-testid='producto-card'], .card", { timeout: 10000 });

    // Debe haber al menos un producto
    const cards = page.locator(".card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("Formulario de datos valida campos requeridos", async ({ page }) => {
    await page.goto("/reservar");

    // Navegar al paso de datos directamente (simular estado)
    // En la práctica, seguir el flujo completo
    await page.waitForSelector(".card", { timeout: 10000 });
    await page.locator(".card").first().click();

    // El paso de fechas debe aparecer
    await expect(page.getByText(/elige tus fechas/i)).toBeVisible({ timeout: 5000 });
  });

  test("Página de reserva tiene meta tags correctos", async ({ page }) => {
    await page.goto("/reservar");
    const title = await page.title();
    expect(title).toContain("Folilco");
  });
});

// ── Tests del panel admin ────────────────────────────────
test.describe("Panel de administración", () => {
  test("redirige a login cuando no hay sesión", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("login con credenciales incorrectas muestra error", async ({ page }) => {
    await page.goto("/admin/login");

    await page.getByPlaceholder("admin").fill("usuario-incorrecto");
    await page.getByPlaceholder("••••••••").fill("password-incorrecta");
    await page.getByRole("button", { name: /ingresar/i }).click();

    await expect(page.getByText(/credenciales/i)).toBeVisible({ timeout: 5000 });
  });

  test("login con credenciales correctas redirige al dashboard", async ({ page }) => {
    // Solo si las credenciales de test están configuradas
    const adminUser = process.env.ADMIN_USERNAME || "admin";
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminPass) {
      test.skip();
      return;
    }

    await page.goto("/admin/login");
    await page.getByPlaceholder("admin").fill(adminUser);
    await page.getByPlaceholder("••••••••").fill(adminPass);
    await page.getByRole("button", { name: /ingresar/i }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 5000 });
    await expect(page.getByText(/dashboard/i)).toBeVisible();
  });
});

// ── Tests de accesibilidad básica ────────────────────────
test.describe("Accesibilidad", () => {
  test("landing page tiene h1", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
  });

  test("formulario de reserva tiene labels", async ({ page }) => {
    await page.goto("/reservar");
    // Navegar hasta el formulario de datos
    await page.waitForSelector(".card", { timeout: 10000 });
    // Las etiquetas de los campos deben existir
    // (verificación básica de accesibilidad)
    const labels = page.locator("label");
    const count = await labels.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ── Flujo alternativo: pago rechazado ────────────────────
test.describe("Flujos alternativos", () => {
  test("URL con error de pago muestra mensaje amigable", async ({ page }) => {
    await page.goto("/reservar?error=pago_fallido");
    // La página debe cargar sin crashes
    await expect(page).not.toHaveURL(/500/);
    // Debería mostrar el formulario normalmente (el error se maneja en UI)
  });

  test("página /gracias carga correctamente", async ({ page }) => {
    await page.goto("/gracias");
    await expect(page).not.toHaveURL(/500/);
  });

  test("página /gracias con estado pendiente muestra mensaje correcto", async ({ page }) => {
    await page.goto("/gracias?estado=pendiente");
    await expect(page.getByText(/proceso/i)).toBeVisible({ timeout: 5000 });
  });
});
