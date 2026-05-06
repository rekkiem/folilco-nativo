import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generarICS } from "@/lib/ics";

// GET /api/ics?producto_id=xxx
// Exporta el calendario de reservas en formato iCal (.ics)
// Compatible con Airbnb, Booking.com, Google Calendar

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productoId = searchParams.get("producto_id");

  if (!productoId) {
    return NextResponse.json(
      { error: "producto_id requerido" },
      { status: 400 }
    );
  }

  // Obtener producto
  const { data: producto, error: prodErr } = await supabaseAdmin
    .from("productos")
    .select("id, nombre, tipo")
    .eq("id", productoId)
    .eq("activo", true)
    .single();

  if (prodErr || !producto) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  // Obtener reservas confirmadas (solo futuras y actuales)
  const hoy = new Date().toISOString().split("T")[0];
  const { data: reservas, error: resErr } = await supabaseAdmin
    .from("reservas")
    .select("*")
    .eq("producto_id", productoId)
    .in("estado", ["confirmada", "pendiente"])
    .gte("fecha_fin", hoy)
    .order("fecha_inicio");

  if (resErr) {
    return NextResponse.json({ error: "Error cargando reservas" }, { status: 500 });
  }

  const icsContent = generarICS(reservas ?? [], producto.nombre);

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="folilco-${producto.id}.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
