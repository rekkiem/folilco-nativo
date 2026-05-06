import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo"); // alojamiento | experiencia | producto

  let query = supabaseAdmin
    .from("productos")
    .select("*")
    .eq("activo", true)
    .order("tipo")
    .order("nombre");

  if (tipo) {
    query = query.eq("tipo", tipo);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Error cargando productos" }, { status: 500 });
  }

  return NextResponse.json(data ?? [], {
    headers: {
      // Cache público 60 segundos – acelera el calendario en 3G
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
