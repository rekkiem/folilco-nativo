import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://tu-proyecto.supabase.co" &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "tu-service-role-key-privada"
  );
}

export async function GET() {
  const startedAt = Date.now();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      status: "ok",
      mode: "demo",
      checks: { supabase: "skipped" },
      latency_ms: Date.now() - startedAt,
    });
  }

  const { error } = await supabaseAdmin.from("productos").select("id").limit(1);

  return NextResponse.json(
    {
      status: error ? "degraded" : "ok",
      mode: "live",
      checks: { supabase: error ? "error" : "ok" },
      latency_ms: Date.now() - startedAt,
    },
    { status: error ? 503 : 200 }
  );
}
