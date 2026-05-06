import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { obtenerPago, verificarFirmaWebhook } from "@/lib/mercadopago";
import { enviarWhatsApp } from "@/lib/whatsapp";
import { agregarFilaReserva, marcarAgendaOcupada } from "@/lib/sheets";
import { webhookLimiter, getClientIP } from "@/lib/rate-limit";
import type { MercadoPagoWebhookBody } from "@/types";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIP(req);
  const rl = webhookLimiter(ip);
  if (!rl.allowed) {
    logger.warn(`[Webhook MP] Rate limit excedido desde ${ip}`);
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Verificar firma del webhook
  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";

  let body: MercadoPagoWebhookBody;
  const rawText = await req.text();

  try {
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Extraer ts de la firma
  const sigParts = xSignature.split(",");
  const tsPart = sigParts.find((p) => p.startsWith("ts="));
  const ts = tsPart ? tsPart.split("=")[1] : "";
  const dataId = body?.data?.id ?? "";

  const firmaValida = verificarFirmaWebhook(xSignature, xRequestId, dataId, ts);
  if (!firmaValida) {
    logger.warn("[Webhook MP] Firma inválida – posible intento no autorizado");
    // Retornar 200 igual para no revelar info al atacante
    return NextResponse.json({ received: true });
  }

  // Solo procesar notificaciones de pago
  if (body.type !== "payment") {
    return NextResponse.json({ received: true });
  }

  const paymentId = body.data.id;

  try {
    // 1. Obtener detalles del pago desde MercadoPago
    const pago = await obtenerPago(paymentId);

    logger.info(`[Webhook MP] Pago ${paymentId} – Status: ${pago.status} – ExternalRef: ${pago.external_reference}`);

    if (!pago.external_reference) {
      logger.warn("[Webhook MP] Pago sin external_reference, ignorando");
      return NextResponse.json({ received: true });
    }

    // 2. Buscar la reserva por external_reference
    const { data: reserva, error: reservaErr } = await supabaseAdmin
      .from("reservas")
      .select("*, productos(*)")
      .eq("mp_external_reference", pago.external_reference)
      .single();

    if (reservaErr || !reserva) {
      logger.warn(`[Webhook MP] Reserva no encontrada para ref: ${pago.external_reference}`);
      return NextResponse.json({ received: true });
    }

    // 3. Actualizar estado según el pago
    if (pago.status === "approved") {
      // Evitar procesar duplicados
      if (reserva.estado === "confirmada") {
        logger.info(`[Webhook MP] Reserva ${reserva.numero} ya estaba confirmada, skip`);
        return NextResponse.json({ received: true });
      }

      // Confirmar la reserva
      await supabaseAdmin
        .from("reservas")
        .update({
          estado: "confirmada",
          mp_payment_id: paymentId,
          mp_payment_status: pago.status,
        })
        .eq("id", reserva.id);

      // Re-fetch la reserva actualizada
      const { data: reservaActualizada } = await supabaseAdmin
        .from("reservas")
        .select("*")
        .eq("id", reserva.id)
        .single();

      if (!reservaActualizada) {
        logger.error("[Webhook MP] Error refetching reserva actualizada");
        return NextResponse.json({ received: true });
      }

      const producto = reserva.productos;

      // 4. Disparar efectos secundarios en paralelo
      const [waResult, sheetsResult, agendaResult] = await Promise.allSettled([
        // WhatsApp de confirmación (solo si no se envió antes)
        !reserva.wa_confirmacion_sent
          ? enviarWhatsApp("confirmacion", reservaActualizada, producto).then(
              async (res) => {
                if (res.success) {
                  await supabaseAdmin
                    .from("reservas")
                    .update({
                      wa_confirmacion_sent: true,
                      wa_confirmacion_sent_at: new Date().toISOString(),
                    })
                    .eq("id", reserva.id);
                }
                return res;
              }
            )
          : Promise.resolve({ success: true, skip: true }),

        // Google Sheets: agregar fila de reserva
        !reserva.sheets_synced
          ? agregarFilaReserva(reservaActualizada, producto).then(async (res) => {
              if (res.success) {
                await supabaseAdmin
                  .from("reservas")
                  .update({ sheets_synced: true })
                  .eq("id", reserva.id);
              }
              return res;
            })
          : Promise.resolve({ success: true, skip: true }),

        // Google Sheets: marcar agenda ocupada
        marcarAgendaOcupada(reservaActualizada),
      ]);

      logger.info(`[Webhook MP] Reserva ${reservaActualizada.numero} confirmada`, {
        whatsapp: waResult.status,
        sheets: sheetsResult.status,
        agenda: agendaResult.status,
      });
    } else if (pago.status === "rejected" || pago.status === "cancelled") {
      await supabaseAdmin
        .from("reservas")
        .update({
          estado: "cancelada",
          mp_payment_id: paymentId,
          mp_payment_status: pago.status,
        })
        .eq("id", reserva.id);

      logger.info(`[Webhook MP] Reserva ${reserva.numero} cancelada/rechazada`);
    } else {
      // Pago pendiente: actualizar estado del pago sin cambiar estado de reserva
      await supabaseAdmin
        .from("reservas")
        .update({
          mp_payment_id: paymentId,
          mp_payment_status: pago.status,
        })
        .eq("id", reserva.id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("[Webhook MP] Error procesando webhook:", err);
    // Retornar 200 para que MercadoPago no reintente (los reintentos los manejamos nosotros)
    return NextResponse.json({ received: true });
  }
}
