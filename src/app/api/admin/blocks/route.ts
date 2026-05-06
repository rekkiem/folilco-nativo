import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  producto_id: z.string().uuid(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  motivo: z.string().max(200).optional().default("Mantenimiento"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parse.error.flatten() }, { status: 400 });
  }

  const { producto_id, fecha_inicio, fecha_fin, motivo } = parse.data;

  if (fecha_fin <= fecha_inicio) {
    return NextResponse.json({ error: "Fecha fin debe ser posterior al inicio" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("bloqueos")
    .insert({ producto_id, fecha_inicio, fecha_fin, motivo })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Error creando bloqueo" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const { error } = await supabaseAdmin.from("bloqueos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Error eliminando bloqueo" }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const productoId = searchParams.get("producto_id");

  let query = supabaseAdmin
    .from("bloqueos")
    .select("*")
    .order("fecha_inicio", { ascending: true });

  if (productoId) query = query.eq("producto_id", productoId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Error cargando bloqueos" }, { status: 500 });

  return NextResponse.json(data ?? []);
}
