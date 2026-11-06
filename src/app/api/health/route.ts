import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isSupabaseConfigured, allowDemoMode } from "@/lib/env";

export async function GET() {
  const startedAt = Date.now();

  if (!isSupabaseConfigured()) {
    if (allowDemoMode()) {
      return NextResponse.json({
        status: "ok",
        mode: "demo",
        checks: { supabase: "skipped" },
        latency_ms: Date.now() - startedAt,
      });
    }
    return NextResponse.json(
      {
        status: "error",
        mode: "misconfigured",
        checks: { supabase: "missing_env" },
        latency_ms: Date.now() - startedAt,
      },
      { status: 503 }
    );
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
