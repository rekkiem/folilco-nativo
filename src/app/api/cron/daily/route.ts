import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { enviarTelegram } from "@/lib/telegram";
import { logger } from "@/lib/logger";

/**
 * O0-7: un solo cron diario (Vercel Hobby).
 * (a) expira holds vencidos
 * (b) concilia pagos inconsistentes / huérfanos (alerta)
 * (c) reintenta outbox pendiente
 * (d) ping BD (evitar pausa Supabase Free)
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!secret || secret.length < 16) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  }

  try {
    const a = Buffer.from(token.padEnd(64));
    const b = Buffer.from(secret.padEnd(64));
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary: Record<string, number | string> = {};

  const { data: expiradas, error: expErr } = await supabaseAdmin
    .from("reservas")
    .update({ estado: "expirada" })
    .eq("estado", "pendiente")
    .lt("expira_at", new Date().toISOString())
    .select("id");

  if (expErr) logger.error("[cron/daily] expira holds", expErr);
  summary.holds_expirados = expiradas?.length ?? 0;

  const { data: huerfanos } = await supabaseAdmin
    .from("reservas")
    .select("numero, mp_payment_id, precio_total_clp")
    .or("pago_huerfano.eq.true,pago_inconsistente.eq.true")
    .gte("updated_at", new Date(Date.now() - 48 * 3600 * 1000).toISOString())
    .limit(20);

  if (huerfanos && huerfanos.length > 0) {
    await enviarTelegram(
      `📋 Cron diario: ${huerfanos.length} pago(s) huérfano/inconsistente\n` +
        huerfanos.map((h) => `• ${h.numero} MP:${h.mp_payment_id}`).join("\n")
    );
  }
  summary.huerfanos = huerfanos?.length ?? 0;

  const { data: outbox } = await supabaseAdmin
    .from("outbox")
    .select("id, tipo, intentos, max_intentos")
    .eq("estado", "pendiente")
    .lte("proximo_intento", new Date().toISOString())
    .limit(50);

  let outboxRetried = 0;
  for (const item of outbox ?? []) {
    const intentos = (item.intentos as number) + 1;
    if (intentos >= (item.max_intentos as number)) {
      await supabaseAdmin
        .from("outbox")
        .update({ estado: "fallido", intentos, updated_at: new Date().toISOString() })
        .eq("id", item.id);
    } else {
      await supabaseAdmin
        .from("outbox")
        .update({
          intentos,
          proximo_intento: new Date(Date.now() + intentos * 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      outboxRetried++;
    }
  }
  summary.outbox_reintentos = outboxRetried;

  const { count } = await supabaseAdmin
    .from("productos")
    .select("id", { count: "exact", head: true });
  summary.productos = count ?? 0;
  summary.ran_at = new Date().toISOString();

  logger.info("[cron/daily] ok", summary);
  return NextResponse.json({ ok: true, summary });
}
