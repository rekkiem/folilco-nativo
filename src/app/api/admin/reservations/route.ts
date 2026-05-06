import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("reservas")
    .select("*, productos(nombre, tipo, socio_responsable)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (estado) query = query.eq("estado", estado);
  if (desde) query = query.gte("fecha_inicio", desde);
  if (hasta) query = query.lte("fecha_inicio", hasta);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: "Error cargando reservas" }, { status: 500 });
  }

  return NextResponse.json({
    reservas: data ?? [],
    total: count ?? 0,
    page,
    pages: Math.ceil((count ?? 0) / limit),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const body = await req.json();
  const camposPermitidos = ["estado", "huesped_nota"];
  const update: Record<string, unknown> = {};
  for (const campo of camposPermitidos) {
    if (body[campo] !== undefined) update[campo] = body[campo];
  }

  const { data, error } = await supabaseAdmin
    .from("reservas")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Error actualizando reserva" }, { status: 500 });
  }

  return NextResponse.json(data);
}
