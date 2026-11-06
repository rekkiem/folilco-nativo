import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generarICS } from "@/lib/ics";
import { timingSafeEqual } from "crypto";

/**
 * GET /api/ics?producto_id=xxx&token=yyy
 * Exporta ocupación (reservas activas + bloqueos) sin PII (F0-05).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productoId = searchParams.get("producto_id");
  const token = searchParams.get("token");

  if (!productoId) {
    return NextResponse.json({ error: "producto_id requerido" }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: "token requerido" }, { status: 401 });
  }

  const { data: producto, error: prodErr } = await supabaseAdmin
    .from("productos")
    .select("id, nombre, tipo, ics_token")
    .eq("id", productoId)
    .eq("activo", true)
    .single();

  if (prodErr || !producto) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const expected = producto.ics_token as string | null;
  if (!expected) {
    return NextResponse.json({ error: "ICS no habilitado para este producto" }, { status: 401 });
  }

  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const hoy = new Date().toISOString().split("T")[0];

  const { data: reservas, error: resErr } = await supabaseAdmin
    .from("reservas")
    .select("id, fecha_inicio, fecha_fin, estado, expira_at")
    .eq("producto_id", productoId)
    .in("estado", ["confirmada", "pendiente"])
    .gte("fecha_fin", hoy)
    .order("fecha_inicio");

  if (resErr) {
    return NextResponse.json({ error: "Error cargando reservas" }, { status: 500 });
  }

  const ahora = new Date();
  const reservasActivas = (reservas ?? []).filter((r) => {
    if (r.estado === "confirmada") return true;
    if (r.estado === "pendiente" && r.expira_at) {
      return new Date(r.expira_at) > ahora;
    }
    return false;
  });

  const { data: bloqueos } = await supabaseAdmin
    .from("bloqueos")
    .select("id, fecha_inicio, fecha_fin, motivo")
    .eq("producto_id", productoId)
    .gte("fecha_fin", hoy);

  const eventos = [
    ...reservasActivas.map((r) => ({
      id: r.id,
      fecha_inicio: r.fecha_inicio,
      fecha_fin: r.fecha_fin,
      estado: r.estado,
    })),
    ...(bloqueos ?? []).map((b) => ({
      id: b.id,
      fecha_inicio: b.fecha_inicio,
      fecha_fin: b.fecha_fin,
      motivo: b.motivo ?? "Mantenimiento",
    })),
  ];

  const icsContent = generarICS(eventos, producto.nombre);

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="folilco-${producto.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
