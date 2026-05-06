import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { enviarWhatsApp } from "@/lib/whatsapp";
import { addDays, subDays, format } from "date-fns";
import { logger } from "@/lib/logger";

// ============================================================
// Cron Job: se ejecuta cada hora desde Vercel Cron
// Configurado en vercel.json
// Envía:
//   1. Recordatorio 24h antes del check-in (upsell)
//   2. Solicitud de reseña 24h después del check-out
// ============================================================

export async function GET(req: NextRequest) {
  // Verificar que la llamada viene del cron de Vercel
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const hoy = new Date();
  const resultados: Record<string, unknown> = {};

  try {
    // ============================================================
    // 1. Recordatorios: reservas cuyo check-in es mañana
    // ============================================================
    const manana = addDays(hoy, 1);
    const mananaStr = format(manana, "yyyy-MM-dd");

    const { data: recordatorios } = await supabaseAdmin
      .from("reservas")
      .select("*, productos(*)")
      .eq("estado", "confirmada")
      .eq("fecha_inicio", mananaStr)
      .eq("wa_recordatorio_sent", false);

    let recordatoriosEnviados = 0;
    let recordatoriosErrores = 0;

    for (const reserva of recordatorios ?? []) {
      const res = await enviarWhatsApp("recordatorio", reserva, reserva.productos);
      if (res.success) {
        await supabaseAdmin
          .from("reservas")
          .update({
            wa_recordatorio_sent: true,
            wa_recordatorio_sent_at: new Date().toISOString(),
          })
          .eq("id", reserva.id);
        recordatoriosEnviados++;
      } else {
        recordatoriosErrores++;
        logger.error(`[Cron WA] Error recordatorio reserva ${reserva.numero}:`, res.error);
      }
    }

    resultados.recordatorios = {
      procesados: recordatorios?.length ?? 0,
      enviados: recordatoriosEnviados,
      errores: recordatoriosErrores,
    };

    // ============================================================
    // 2. Reseñas: reservas cuyo check-out fue ayer
    // ============================================================
    const ayer = subDays(hoy, 1);
    const ayerStr = format(ayer, "yyyy-MM-dd");

    const { data: resenas } = await supabaseAdmin
      .from("reservas")
      .select("*, productos(*)")
      .eq("estado", "confirmada")
      .eq("fecha_fin", ayerStr)
      .eq("wa_resena_sent", false);

    let resenasEnviadas = 0;
    let resenasErrores = 0;

    for (const reserva of resenas ?? []) {
      // Marcar como completada antes de enviar
      await supabaseAdmin
        .from("reservas")
        .update({ estado: "completada" })
        .eq("id", reserva.id);

      const res = await enviarWhatsApp("resena", reserva, reserva.productos);
      if (res.success) {
        await supabaseAdmin
          .from("reservas")
          .update({
            wa_resena_sent: true,
            wa_resena_sent_at: new Date().toISOString(),
          })
          .eq("id", reserva.id);
        resenasEnviadas++;
      } else {
        resenasErrores++;
        logger.error(`[Cron WA] Error reseña reserva ${reserva.numero}:`, res.error);
      }
    }

    resultados.resenas = {
      procesados: resenas?.length ?? 0,
      enviadas: resenasEnviadas,
      errores: resenasErrores,
    };

    // ============================================================
    // 3. Verificar stock bajo y enviar alertas por email
    // ============================================================
    const { data: stockBajo } = await supabaseAdmin
      .from("productos")
      .select("nombre, stock_actual, stock_minimo")
      .eq("tipo", "producto")
      .eq("activo", true)
      .not("stock_actual", "is", null)
      .filter("stock_actual", "lte", "stock_minimo");

    resultados.stock_alertas = stockBajo?.length ?? 0;

    if (stockBajo && stockBajo.length > 0) {
      logger.warn("[Cron] Productos con stock bajo:", stockBajo);
      // Aquí se podría enviar email de alerta via SendGrid/Resend
      // Por ahora solo se registra en logs
    }

    logger.info("[Cron WhatsApp] Completado:", resultados);

    return NextResponse.json({
      success: true,
      timestamp: hoy.toISOString(),
      ...resultados,
    });
  } catch (err) {
    logger.error("[Cron WhatsApp] Error:", err);
    return NextResponse.json(
      { error: "Error en el cron job" },
      { status: 500 }
    );
  }
}
