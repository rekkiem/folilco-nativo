import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from("productos")
    .select("id, nombre, tipo, stock_actual, stock_minimo, precio_clp, socio_responsable, activo")
    .eq("tipo", "producto")
    .order("nombre");

  if (error) {
    return NextResponse.json({ error: "Error cargando stock" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { id, stock_actual } = body;

  if (!id || typeof stock_actual !== "number" || stock_actual < 0) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("productos")
    .update({ stock_actual })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Error actualizando stock" }, { status: 500 });
  }

  return NextResponse.json(data);
}
