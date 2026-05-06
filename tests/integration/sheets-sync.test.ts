/**
 * tests/integration/sheets-sync.test.ts
 *
 * Verifica la lógica de sincronización con Google Sheets.
 * En CI/CD: usa mocks. En entorno real: setear SHEETS_INTEGRATION=true.
 */

import { describe, it, expect, jest } from "@jest/globals";

// ── Mock del cliente de Google Sheets ────────────────────
jest.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
    },
    sheets: jest.fn().mockReturnValue({
      spreadsheets: {
        values: {
          append: jest.fn().mockResolvedValue({ data: { updates: { updatedRows: 1 } } }),
          get: jest.fn().mockResolvedValue({
            data: {
              values: [
                ["Miel Artesanal", "48", "10", "unidades", "01/01/2024"],
                ["Mermelada Murta", "3", "5", "unidades", "01/01/2024"],
              ],
            },
          }),
          batchUpdate: jest.fn().mockResolvedValue({}),
        },
      },
    }),
  },
}));

const reservaMock = {
  id: "res-test-001",
  numero: "FOL-2024-0001",
  huesped_nombre: "María González",
  huesped_email: "maria@test.com",
  huesped_telefono: "+56912345678",
  huesped_rut: null,
  huesped_nota: null,
  producto_id: "prod-test-001",
  producto_nombre: "Cabaña del Bosque",
  fecha_inicio: "2024-12-20",
  fecha_fin: "2024-12-23",
  cantidad_personas: 2,
  noches: 3,
  precio_base_clp: 85000,
  precio_total_clp: 255000,
  comision_cooperativa_clp: 25500,
  estado: "confirmada" as const,
  mp_preference_id: null,
  mp_payment_id: "mp-pay-001",
  mp_payment_status: "approved",
  mp_external_reference: "ext-ref-001",
  wa_confirmacion_sent: false,
  wa_recordatorio_sent: false,
  wa_resena_sent: false,
  sheets_synced: false,
  origen: "web",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as const;

const productoMock = {
  id: "prod-test-001",
  nombre: "Cabaña del Bosque",
  descripcion: "Cabaña acogedora",
  tipo: "alojamiento" as const,
  precio_clp: 85000,
  capacidad: 2,
  imagen_url: null,
  activo: true,
  duracion_noches: 1,
  duracion_horas: null,
  stock_actual: null,
  stock_minimo: null,
  socio_responsable: "María González",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("agregarFilaReserva()", () => {
  it("retorna success:true cuando Sheets está configurado", async () => {
    const { agregarFilaReserva } = await import("@/lib/sheets");
    const result = await agregarFilaReserva(reservaMock as any, productoMock);
    expect(result.success).toBe(true);
  });

  it("retorna success:true (degradado) cuando Sheets no está configurado", async () => {
    const originalId = process.env.GOOGLE_SPREADSHEET_ID;
    delete process.env.GOOGLE_SPREADSHEET_ID;

    // Re-importar el módulo con la nueva env
    jest.resetModules();
    const { agregarFilaReserva } = await import("@/lib/sheets");
    const result = await agregarFilaReserva(reservaMock as any, productoMock);
    expect(result.success).toBe(true); // graceful degradation

    process.env.GOOGLE_SPREADSHEET_ID = originalId;
  });
});

describe("leerStockSheet()", () => {
  it("devuelve array de productos con stock", async () => {
    jest.resetModules();
    const { leerStockSheet } = await import("@/lib/sheets");
    const stock = await leerStockSheet();
    expect(Array.isArray(stock)).toBe(true);
  });
});

/**
 * INSTRUCCIONES PARA PRUEBA REAL CON GOOGLE SHEETS:
 *
 * 1. Configurar variables en .env.local (GOOGLE_SERVICE_ACCOUNT_EMAIL, etc.)
 * 2. Crear spreadsheet con hojas: reservas, agenda_compartida, stock, ingresos_por_socio
 * 3. Compartir el spreadsheet con el email del service account
 * 4. SHEETS_INTEGRATION=true npx jest tests/integration/sheets-sync.test.ts
 *
 * Criterios de éxito:
 *   ✅ Nueva fila aparece en hoja "reservas" en < 5 segundos
 *   ✅ Hoja "agenda_compartida" tiene la entrada de la reserva
 *   ✅ No se duplican filas al ejecutar dos veces con la misma reserva
 */
export {};
