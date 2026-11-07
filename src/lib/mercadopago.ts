import MercadoPagoConfig, { Preference, Payment } from "mercadopago";
import { createHmac, timingSafeEqual } from "crypto";
import type { Reserva, Producto } from "@/types";
import { logger } from "./logger";

function isPlaceholderToken(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim();
  if (!v) return true;
  return (
    v.includes("tu-") ||
    v.includes("cambiar-") ||
    v === "TEST-token" ||
    v.startsWith("APP_USR-tu-") ||
    v.includes("xxxxxxxx")
  );
}

/** true solo si hay un access token real (no placeholder). */
export function isMercadoPagoConfigured(): boolean {
  return !isPlaceholderToken(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

/**
 * Clientes lazy: no lanzar en tiempo de import/build.
 */
function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (isPlaceholderToken(token)) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado o es placeholder");
  }
  return token!.trim();
}

function getMpClient() {
  return new MercadoPagoConfig({
    accessToken: getAccessToken(),
    options: { timeout: 5000 },
  });
}

function getPreferenceClient() {
  return new Preference(getMpClient());
}

function getPaymentClient() {
  return new Payment(getMpClient());
}

export async function crearPreferenciaPago(
  reserva: Omit<Reserva, "id" | "numero" | "created_at" | "updated_at" | "noches">,
  producto: Producto,
  externalReference: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl || baseUrl.includes("tu-")) {
    throw new Error("NEXT_PUBLIC_BASE_URL no configurado");
  }

  const preferenceClient = getPreferenceClient();
  const preference = await preferenceClient.create({
    body: {
      external_reference: externalReference,
      items: [
        {
          id: producto.id,
          title: producto.nombre,
          description: `Reserva del ${reserva.fecha_inicio} al ${reserva.fecha_fin} – ${reserva.cantidad_personas} persona(s)`,
          category_id: "travels",
          quantity: 1,
          currency_id: "CLP",
          unit_price: reserva.precio_total_clp,
        },
      ],
      payer: {
        name: reserva.huesped_nombre.split(" ")[0],
        surname: reserva.huesped_nombre.split(" ").slice(1).join(" ") || "-",
        email: reserva.huesped_email,
        phone: {
          area_code: "56",
          number: reserva.huesped_telefono.replace(/\D/g, "").slice(-9),
        },
      },
      back_urls: {
        success: `${baseUrl}/gracias?ref=${externalReference}`,
        failure: `${baseUrl}/reservar?error=pago_fallido`,
        pending: `${baseUrl}/gracias?ref=${externalReference}&estado=pendiente`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      statement_descriptor: "FOLILCO NATIVO",
      metadata: {
        reserva_externa: externalReference,
        producto_tipo: producto.tipo,
      },
    },
  });

  return {
    preference_id: preference.id!,
    init_point: preference.init_point!,
    sandbox_init_point: preference.sandbox_init_point,
  };
}

export async function obtenerPago(paymentId: string) {
  return getPaymentClient().get({ id: Number(paymentId) });
}

export function verificarFirmaWebhook(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  ts: string
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || isPlaceholderToken(secret)) {
    if (process.env.NODE_ENV === "production") {
      logger.error("MERCADOPAGO_WEBHOOK_SECRET no configurado – rechazando webhook en producción");
      return false;
    }
    logger.warn("MERCADOPAGO_WEBHOOK_SECRET no configurado – omitiendo verificación en dev");
    return true;
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expectedHash = createHmac("sha256", secret).update(manifest).digest("hex");

  const parts = xSignature.split(",");
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!v1Part) return false;

  const receivedHash = v1Part.split("=")[1];

  try {
    const expectedBuf = Buffer.from(expectedHash, "hex");
    const receivedBuf = Buffer.from(receivedHash, "hex");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

export function formatearPrecioCLP(precio: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(precio);
}
