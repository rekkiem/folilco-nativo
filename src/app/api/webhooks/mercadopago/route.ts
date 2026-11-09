import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { obtenerPago, verificarFirmaWebhook } from "@/lib/mercadopago";
import { enviarTelegram } from "@/lib/telegram";
import { webhookLimiter, getClientIP } from "@/lib/rate-limit";
import type { MercadoPagoWebhookBody } from "@/types";
import { logger } from "@/lib/logger";

/**
 * O0-1: webhook idempotente + confirmación atómica vía confirmar_pago.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = webhookLimiter(ip);
  if (!rl.allowed) {
    logger.warn(`[Webhook MP] Rate limit desde ${ip}`);
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";
  const rawText = await req.text();

  let body: MercadoPagoWebhookBody;
  try {
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const sigParts = xSignature.split(",");
  const tsPart = sigParts.find((p) => p.startsWith("ts="));
  const ts = tsPart ? tsPart.split("=")[1] : "";
  const dataId = String(body?.data?.id ?? "");

  if (!verificarFirmaWebhook(xSignature, xRequestId, dataId, ts)) {
    logger.warn("[Webhook MP] Firma inválida");
    return NextResponse.json({ received: true });
  }

  if (body.type !== "payment" || !dataId) {
    return NextResponse.json({ received: true });
  }

  const paymentId = dataId;

  const { error: insertEvtErr } = await supabaseAdmin.from("webhook_eventos").insert({
    proveedor: "mercadopago",
    evento_id: paymentId,
    tipo: body.type,
    payload: body as unknown as Record<string, unknown>,
    estado: "recibido",
  });

  if (insertEvtErr) {
    if (insertEvtErr.code === "23505") {
      logger.info(`[Webhook MP] Evento ${paymentId} ya registrado – idempotente`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    logger.error("[Webhook MP] Error insert webhook_eventos", insertEvtErr);
  }

  try {
    const pago = await obtenerPago(paymentId);
    const externalRef = pago.external_reference as string | undefined;
    const status = String(pago.status ?? "");
    const amount =
      typeof pago.transaction_amount === "number"
        ? Math.round(pago.transaction_amount)
        : null;
    const currency = String(pago.currency_id ?? "CLP");

    logger.info(`[Webhook MP] Pago ${paymentId} status=${status} ref=${externalRef}`);

    if (!externalRef) {
      await supabaseAdmin
        .from("webhook_eventos")
        .update({ estado: "ignorado", procesado_at: new Date().toISOString() })
        .eq("proveedor", "mercadopago")
        .eq("evento_id", paymentId);
      return NextResponse.json({ received: true });
    }

    if (status === "approved") {
      const { data: conf, error: confErr } = await supabaseAdmin.rpc("confirmar_pago", {
        p_external_reference: externalRef,
        p_payment_id: paymentId,
        p_payment_status: status,
        p_amount_cents: amount,
        p_currency: currency,
      });

      if (confErr) {
        logger.error("[Webhook MP] confirmar_pago error", confErr);
        await supabaseAdmin
          .from("webhook_eventos")
          .update({
            estado: "error",
            error: confErr.message,
            procesado_at: new Date().toISOString(),
          })
          .eq("proveedor", "mercadopago")
          .eq("evento_id", paymentId);
        return NextResponse.json({ received: true });
      }

      const row = Array.isArray(conf) ? conf[0] : conf;
      const resultado = row?.resultado as string;

      if (resultado === "confirmada") {
        await enviarTelegram(
          `✅ Reserva confirmada ${row.numero}\nPago MP: ${paymentId}\nMonto: $${amount} CLP`
        );
        await supabaseAdmin.from("outbox").insert({
          tipo: "reserva_confirmada",
          payload: {
            reserva_id: row.reserva_id,
            numero: row.numero,
            payment_id: paymentId,
          },
        });
      } else if (resultado === "pago_huerfano") {
        await enviarTelegram(
          `⚠️ PAGO HUÉRFANO\nReserva: ${row.numero}\nPago: ${paymentId}\nMonto: $${amount}\nRevisar en MP y admin.`
        );
      } else if (resultado === "monto_invalido" || resultado === "moneda_invalida") {
        await enviarTelegram(
          `⚠️ Pago inconsistente (${resultado})\nRef: ${externalRef}\nPago: ${paymentId}`
        );
      }

      await supabaseAdmin
        .from("webhook_eventos")
        .update({ estado: "procesado", procesado_at: new Date().toISOString() })
        .eq("proveedor", "mercadopago")
        .eq("evento_id", paymentId);

      return NextResponse.json({ received: true, resultado });
    }

    if (["rejected", "cancelled", "refunded", "charged_back"].includes(status)) {
      await supabaseAdmin.rpc("confirmar_pago", {
        p_external_reference: externalRef,
        p_payment_id: paymentId,
        p_payment_status: status,
        p_amount_cents: amount,
        p_currency: currency,
      });
      if (status === "charged_back" || status === "refunded") {
        await enviarTelegram(`🔔 MP ${status}: pago ${paymentId} ref ${externalRef}`);
      }
    } else {
      await supabaseAdmin
        .from("reservas")
        .update({ mp_payment_id: paymentId, mp_payment_status: status })
        .eq("mp_external_reference", externalRef);
    }

    await supabaseAdmin
      .from("webhook_eventos")
      .update({ estado: "procesado", procesado_at: new Date().toISOString() })
      .eq("proveedor", "mercadopago")
      .eq("evento_id", paymentId);

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("[Webhook MP] Error:", err);
    await supabaseAdmin
      .from("webhook_eventos")
      .update({
        estado: "error",
        error: err instanceof Error ? err.message : "unknown",
        procesado_at: new Date().toISOString(),
      })
      .eq("proveedor", "mercadopago")
      .eq("evento_id", paymentId);
    return NextResponse.json({ received: true });
  }
}
