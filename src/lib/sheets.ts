import { google } from "googleapis";
import type { Reserva, Producto } from "@/types";
import { format, parseISO } from "date-fns";
import { logger } from "./logger";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

function isGoogleConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    SPREADSHEET_ID
  );
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

type SheetResult = { success: boolean; error?: string };

export async function agregarFilaReserva(
  reserva: Reserva,
  producto: Producto
): Promise<SheetResult> {
  if (!isGoogleConfigured()) {
    logger.warn("[Sheets] Google Sheets no configurado – omitiendo sincronización");
    return { success: true }; // No bloquear el flujo de reserva
  }

  try {
    const sheets = await getSheetsClient();
    const now = format(new Date(), "dd/MM/yyyy HH:mm");
    const fechaInicio = format(parseISO(reserva.fecha_inicio), "dd/MM/yyyy");
    const fechaFin = format(parseISO(reserva.fecha_fin), "dd/MM/yyyy");

    const fila = [
      reserva.numero,
      now,
      reserva.huesped_nombre,
      reserva.huesped_email,
      reserva.huesped_telefono,
      reserva.producto_nombre,
      producto.tipo,
      fechaInicio,
      fechaFin,
      reserva.noches ?? 0,
      reserva.cantidad_personas,
      reserva.precio_total_clp,
      reserva.comision_cooperativa_clp ?? Math.round(reserva.precio_total_clp * 0.1),
      producto.socio_responsable ?? "—",
      reserva.estado,
      reserva.mp_payment_id ?? "—",
      reserva.origen,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID!,
      range: "reservas!A:Q",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [fila] },
    });

    logger.info("[Sheets] Reserva agregada", { numero: reserva.numero });
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error("[Sheets] Error agregando reserva", { error, numero: reserva.numero });
    return { success: false, error };
  }
}

export async function marcarAgendaOcupada(reserva: Reserva): Promise<SheetResult> {
  if (!isGoogleConfigured()) return { success: true };

  try {
    const sheets = await getSheetsClient();
    const fechaInicio = format(parseISO(reserva.fecha_inicio), "dd/MM/yyyy");
    const fechaFin = format(parseISO(reserva.fecha_fin), "dd/MM/yyyy");

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID!,
      range: "agenda_compartida!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          reserva.numero,
          reserva.producto_nombre,
          fechaInicio,
          fechaFin,
          reserva.huesped_nombre,
          reserva.cantidad_personas,
          "CONFIRMADO",
        ]],
      },
    });

    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error("[Sheets] Error marcando agenda", { error });
    return { success: false, error };
  }
}

export async function leerStockSheet(): Promise<
  { nombre: string; stock: number; minimo: number }[]
> {
  if (!isGoogleConfigured()) return [];

  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID!,
      range: "stock!A2:D100",
    });

    const rows = res.data.values ?? [];
    return rows
      .filter((row) => row[0]) // Ignorar filas vacías
      .map((row) => ({
        nombre: String(row[0] ?? ""),
        stock: parseInt(String(row[1] ?? "0"), 10),
        minimo: parseInt(String(row[2] ?? "5"), 10),
      }));
  } catch (err) {
    logger.error("[Sheets] Error leyendo stock", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

export async function inicializarHojas(): Promise<void> {
  if (!isGoogleConfigured()) {
    logger.warn("[Sheets] Google Sheets no configurado – skip inicialización");
    return;
  }

  try {
    const sheets = await getSheetsClient();

    const cabeceras = [
      {
        range: "reservas!A1",
        values: [[
          "N° Reserva", "Fecha Creación", "Huésped", "Email", "Teléfono",
          "Producto", "Tipo", "Fecha Inicio", "Fecha Fin", "Noches",
          "Personas", "Total CLP", "Comisión CLP", "Socio", "Estado",
          "MP Payment ID", "Origen",
        ]],
      },
      {
        range: "agenda_compartida!A1",
        values: [["N° Reserva", "Producto", "Fecha Inicio", "Fecha Fin", "Huésped", "Personas", "Estado"]],
      },
      {
        range: "stock!A1",
        values: [["Producto", "Stock Actual", "Stock Mínimo", "Unidad", "Última Actualización"]],
      },
      {
        range: "ingresos_por_socio!A1",
        values: [["Socio", "Mes", "N° Reservas", "Ingresos Brutos CLP", "Comisión CLP", "Neto CLP"]],
      },
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID!,
      requestBody: { valueInputOption: "USER_ENTERED", data: cabeceras },
    });

    logger.info("[Sheets] Hojas inicializadas");
  } catch (err) {
    logger.error("[Sheets] Error inicializando hojas", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
