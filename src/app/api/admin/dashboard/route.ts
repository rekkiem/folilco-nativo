import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  // Autenticación
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const mesStr = searchParams.get("mes") ?? format(new Date(), "yyyy-MM");

  try {
    const mesInicio = startOfMonth(new Date(`${mesStr}-01`));
    const mesFin = endOfMonth(mesInicio);
    const mesInicioStr = format(mesInicio, "yyyy-MM-dd");
    const mesFinalStr = format(mesFin, "yyyy-MM-dd");

    // ── Reservas del mes ──────────────────────────────────
    const { data: reservasMes } = await supabaseAdmin
      .from("reservas")
      .select("*, productos(tipo, socio_responsable)")
      .in("estado", ["confirmada", "completada"])
      .gte("fecha_inicio", mesInicioStr)
      .lte("fecha_inicio", mesFinalStr)
      .order("created_at", { ascending: false });

    const reservasMesData = reservasMes ?? [];

    // ── Totales ───────────────────────────────────────────
    const totalIngresos = reservasMesData.reduce(
      (acc, r) => acc + r.precio_total_clp,
      0
    );
    const totalComision = reservasMesData.reduce(
      (acc, r) => acc + (r.comision_cooperativa_clp ?? 0),
      0
    );

    // ── Ingresos por línea ────────────────────────────────
    const ingresosPorLinea = reservasMesData.reduce(
      (acc, r) => {
        const tipo = r.productos?.tipo ?? "alojamiento";
        acc[tipo as keyof typeof acc] = (acc[tipo as keyof typeof acc] ?? 0) + r.precio_total_clp;
        return acc;
      },
      { alojamiento: 0, experiencias: 0, productos: 0 } as Record<string, number>
    );

    // ── Ocupación últimos 6 meses ─────────────────────────
    const ocupacionMensual = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const fecha = subMonths(mesInicio, 5 - i);
        const inicio = format(startOfMonth(fecha), "yyyy-MM-dd");
        const fin = format(endOfMonth(fecha), "yyyy-MM-dd");
        return supabaseAdmin
          .from("reservas")
          .select("precio_total_clp")
          .in("estado", ["confirmada", "completada"])
          .gte("fecha_inicio", inicio)
          .lte("fecha_inicio", fin)
          .then(({ data }) => ({
            mes: format(fecha, "MMM yyyy"),
            reservas: data?.length ?? 0,
            ingresos: data?.reduce((a, r) => a + r.precio_total_clp, 0) ?? 0,
          }));
      })
    );

    // ── Top 3 productos ───────────────────────────────────
    const conteoProductos = reservasMesData.reduce(
      (acc, r) => {
        const key = r.producto_nombre;
        if (!acc[key]) acc[key] = { nombre: key, reservas: 0, ingresos: 0 };
        acc[key].reservas++;
        acc[key].ingresos += r.precio_total_clp;
        return acc;
      },
      {} as Record<string, { nombre: string; reservas: number; ingresos: number }>
    );

    const topProductos = Object.values(conteoProductos)
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 3);

    // ── Stock bajo ────────────────────────────────────────
    const { data: stockAlertas } = await supabaseAdmin
      .from("productos")
      .select("nombre, stock_actual, stock_minimo")
      .eq("tipo", "producto")
      .eq("activo", true)
      .not("stock_actual", "is", null)
      .filter("stock_actual", "lte", "stock_minimo");

    // ── Tasa de ocupación (alojamientos, días del mes) ────
    const diasMes = mesFin.getDate();
    const alojamientos = await supabaseAdmin
      .from("productos")
      .select("id")
      .eq("tipo", "alojamiento")
      .eq("activo", true);
    const totalUnidades = alojamientos.data?.length ?? 1;
    const diasTotalesDisponibles = diasMes * totalUnidades;
    const diasOcupados = reservasMesData
      .filter((r) => r.productos?.tipo === "alojamiento")
      .reduce((acc, r) => acc + (r.noches ?? 0), 0);
    const tasaOcupacion =
      diasTotalesDisponibles > 0
        ? Math.round((diasOcupados / diasTotalesDisponibles) * 100)
        : 0;

    return NextResponse.json({
      periodo: { desde: mesInicioStr, hasta: mesFinalStr },
      resumen: {
        total_reservas: reservasMesData.length,
        reservas_confirmadas: reservasMesData.filter((r) => r.estado === "confirmada").length,
        ingresos_clp: totalIngresos,
        comision_clp: totalComision,
        tasa_ocupacion: tasaOcupacion,
      },
      ingresos_por_linea: ingresosPorLinea,
      ocupacion_mensual: ocupacionMensual,
      top_productos: topProductos,
      stock_alertas: stockAlertas ?? [],
      reservas_recientes: reservasMesData.slice(0, 10),
    });
  } catch (err) {
    logger.error("[Admin Dashboard] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
