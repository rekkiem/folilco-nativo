import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { reservaLimiter, getClientIP } from "@/lib/rate-limit";
import { z } from "zod";
import { eachDayOfInterval, parseISO, format, isBefore, addDays } from "date-fns";
import { logger } from "@/lib/logger";

const schema = z.object({
  producto_id: z.string().uuid(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const DEMO_PRODUCTS: Record<string, { precio_clp: number; tipo: string }> = {
  "00000000-0000-0000-0000-000000000001": { precio_clp: 85000, tipo: "alojamiento" },
  "00000000-0000-0000-0000-000000000002": { precio_clp: 120000, tipo: "alojamiento" },
  "00000000-0000-0000-0000-000000000003": { precio_clp: 150000, tipo: "alojamiento" },
  "00000000-0000-0000-0000-000000000004": { precio_clp: 35000, tipo: "experiencia" },
  "00000000-0000-0000-0000-000000000005": { precio_clp: 28000, tipo: "experiencia" },
  "00000000-0000-0000-0000-000000000006": { precio_clp: 9500, tipo: "producto" },
  "00000000-0000-0000-0000-000000000007": { precio_clp: 6500, tipo: "producto" },
};

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://tu-proyecto.supabase.co" &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "tu-service-role-key-privada"
  );
}

function demoAvailability(productoId: string, inicio: Date, fin: Date) {
  const producto = DEMO_PRODUCTS[productoId];
  if (!producto) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const noches = Math.max(
    1,
    Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  );
  const unidades = producto.tipo === "alojamiento" ? noches : 1;

  return NextResponse.json(
    {
      disponible: true,
      noches,
      precio_total_clp: producto.precio_clp * unidades,
      precio_por_noche: producto.precio_clp,
      conflictos: [],
    },
    { headers: { "X-Data-Source": "demo" } }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Rate limit
  const ip = getClientIP(req);
  const rl = reservaLimiter(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta en un momento." },
      { status: 429 }
    );
  }

  // Validar parámetros
  const parse = schema.safeParse({
    producto_id: searchParams.get("producto_id"),
    fecha_inicio: searchParams.get("fecha_inicio"),
    fecha_fin: searchParams.get("fecha_fin"),
  });

  if (!parse.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parse.error.flatten() },
      { status: 400 }
    );
  }

  const { producto_id, fecha_inicio, fecha_fin } = parse.data;

  // Validar lógica de fechas
  const inicio = parseISO(fecha_inicio);
  const fin = parseISO(fecha_fin);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (isBefore(inicio, hoy)) {
    return NextResponse.json(
      { error: "La fecha de inicio no puede ser en el pasado" },
      { status: 400 }
    );
  }
  if (!isBefore(inicio, fin)) {
    return NextResponse.json(
      { error: "La fecha de fin debe ser posterior al inicio" },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured() || DEMO_PRODUCTS[producto_id]) {
    return demoAvailability(producto_id, inicio, fin);
  }

  try {
    // 1. Verificar que el producto existe y está activo
    const { data: producto, error: prodError } = await supabaseAdmin
      .from("productos")
      .select("id, nombre, precio_clp, activo, duracion_noches")
      .eq("id", producto_id)
      .eq("activo", true)
      .single();

    if (prodError || !producto) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // 2. Buscar reservas que se solapen (confirmadas)
    const { data: reservas } = await supabaseAdmin
      .from("reservas")
      .select("fecha_inicio, fecha_fin")
      .eq("producto_id", producto_id)
      .in("estado", ["confirmada", "pendiente"])
      .lt("fecha_inicio", fecha_fin)
      .gt("fecha_fin", fecha_inicio);

    // 3. Buscar bloqueos manuales que se solapen
    const { data: bloqueos } = await supabaseAdmin
      .from("bloqueos")
      .select("fecha_inicio, fecha_fin")
      .eq("producto_id", producto_id)
      .lt("fecha_inicio", fecha_fin)
      .gt("fecha_fin", fecha_inicio);

    const conflictos = [
      ...(reservas ?? []),
      ...(bloqueos ?? []),
    ];

    const disponible = conflictos.length === 0;

    // Calcular precio
    const noches = Math.round(
      (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
    );
    const precio_total_clp = producto.precio_clp * noches;

    return NextResponse.json({
      disponible,
      noches,
      precio_total_clp,
      precio_por_noche: producto.precio_clp,
      conflictos: disponible
        ? []
        : conflictos.map((c) => `${c.fecha_inicio} → ${c.fecha_fin}`),
    });
  } catch (err) {
    logger.error("[API availability] Error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// ============================================================
// GET /api/availability/calendar?producto_id=xxx&mes=2024-12
// Devuelve todas las fechas bloqueadas del mes para el calendario
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { producto_id, mes } = body as { producto_id: string; mes: string };

    if (!producto_id || !mes) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    if (!isSupabaseConfigured() || DEMO_PRODUCTS[producto_id]) {
      return NextResponse.json(
        {
          producto_id,
          mes,
          fechas_bloqueadas: [],
        },
        { headers: { "X-Data-Source": "demo" } }
      );
    }

    // mes = YYYY-MM, calcular rango
    const inicioMes = parseISO(`${mes}-01`);
    const finMes = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 2, 0);
    const finMesStr = format(finMes, "yyyy-MM-dd");

    // Reservas confirmadas
    const { data: reservas } = await supabaseAdmin
      .from("reservas")
      .select("fecha_inicio, fecha_fin")
      .eq("producto_id", producto_id)
      .in("estado", ["confirmada", "pendiente"])
      .lt("fecha_inicio", finMesStr)
      .gte("fecha_fin", `${mes}-01`);

    // Bloqueos manuales
    const { data: bloqueos } = await supabaseAdmin
      .from("bloqueos")
      .select("fecha_inicio, fecha_fin")
      .eq("producto_id", producto_id)
      .lt("fecha_inicio", finMesStr)
      .gte("fecha_fin", `${mes}-01`);

    // Expandir rangos a días individuales
    const fechasBloqueadas = new Set<string>();
    const todos = [...(reservas ?? []), ...(bloqueos ?? [])];

    for (const r of todos) {
      const dias = eachDayOfInterval({
        start: parseISO(r.fecha_inicio),
        end: addDays(parseISO(r.fecha_fin), -1), // fin exclusivo en reservas
      });
      dias.forEach((d) => fechasBloqueadas.add(format(d, "yyyy-MM-dd")));
    }

    return NextResponse.json({
      producto_id,
      mes,
      fechas_bloqueadas: Array.from(fechasBloqueadas).sort(),
    });
  } catch (err) {
    logger.error("[API calendar] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
