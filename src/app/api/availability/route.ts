import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { availabilityLimiter, getClientIP, rateLimitHeaders } from "@/lib/rate-limit";
import { calcularPrecio } from "@/lib/pricing";
import { isSupabaseConfigured, allowDemoMode } from "@/lib/env";
import { z } from "zod";
import { eachDayOfInterval, parseISO, format, isBefore, addDays } from "date-fns";
import { logger } from "@/lib/logger";

const schema = z.object({
  producto_id: z.string().uuid(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cantidad_personas: z.coerce.number().int().min(1).max(20).optional(),
});

const DEMO_PRODUCTS: Record<
  string,
  { precio_clp: number; tipo: "alojamiento" | "experiencia" | "producto"; capacidad: number }
> = {
  "00000000-0000-0000-0000-000000000001": { precio_clp: 85000, tipo: "alojamiento", capacidad: 2 },
  "00000000-0000-0000-0000-000000000002": { precio_clp: 120000, tipo: "alojamiento", capacidad: 2 },
  "00000000-0000-0000-0000-000000000003": { precio_clp: 150000, tipo: "alojamiento", capacidad: 5 },
  "00000000-0000-0000-0000-000000000004": { precio_clp: 35000, tipo: "experiencia", capacidad: 10 },
  "00000000-0000-0000-0000-000000000005": { precio_clp: 28000, tipo: "experiencia", capacidad: 8 },
  "00000000-0000-0000-0000-000000000006": { precio_clp: 9500, tipo: "producto", capacidad: 1 },
  "00000000-0000-0000-0000-000000000007": { precio_clp: 6500, tipo: "producto", capacidad: 1 },
};

function demoAvailability(
  productoId: string,
  inicio: Date,
  fin: Date,
  personas: number
) {
  const producto = DEMO_PRODUCTS[productoId];
  if (!producto) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const noches = Math.max(
    1,
    Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  );

  const precio = calcularPrecio({
    tipo: producto.tipo,
    precio_clp: producto.precio_clp,
    noches,
    personas,
  });

  return NextResponse.json(
    {
      disponible: true,
      noches: precio.noches,
      precio_total_clp: precio.total_clp,
      precio_por_noche: producto.precio_clp,
      desglose: precio.desglose,
      conflictos: [],
    },
    { headers: { "X-Data-Source": "demo" } }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const ip = getClientIP(req);
  const rl = availabilityLimiter(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta en un momento." },
      { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetAt) }
    );
  }

  const parse = schema.safeParse({
    producto_id: searchParams.get("producto_id"),
    fecha_inicio: searchParams.get("fecha_inicio"),
    fecha_fin: searchParams.get("fecha_fin"),
    cantidad_personas: searchParams.get("cantidad_personas") ?? "1",
  });

  if (!parse.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parse.error.flatten() },
      { status: 400 }
    );
  }

  const { producto_id, fecha_inicio, fecha_fin, cantidad_personas } = parse.data;
  const personas = cantidad_personas ?? 1;

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

  if (!isSupabaseConfigured()) {
    if (allowDemoMode()) {
      return demoAvailability(producto_id, inicio, fin, personas);
    }
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  if (allowDemoMode() && DEMO_PRODUCTS[producto_id]) {
    return demoAvailability(producto_id, inicio, fin, personas);
  }

  try {
    const { data: producto, error: prodError } = await supabaseAdmin
      .from("productos")
      .select("id, nombre, precio_clp, tipo, capacidad, activo")
      .eq("id", producto_id)
      .eq("activo", true)
      .single();

    if (prodError || !producto) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const ahoraIso = new Date().toISOString();
    const { data: reservas } = await supabaseAdmin
      .from("reservas")
      .select("fecha_inicio, fecha_fin, estado, expira_at")
      .eq("producto_id", producto_id)
      .in("estado", ["confirmada", "pendiente"])
      .lt("fecha_inicio", fecha_fin)
      .gt("fecha_fin", fecha_inicio);

    const activas = (reservas ?? []).filter((r) => {
      if (r.estado === "confirmada") return true;
      if (r.estado === "pendiente" && r.expira_at) {
        return new Date(r.expira_at) > new Date(ahoraIso);
      }
      return false;
    });

    const { data: bloqueos } = await supabaseAdmin
      .from("bloqueos")
      .select("fecha_inicio, fecha_fin")
      .eq("producto_id", producto_id)
      .lt("fecha_inicio", fecha_fin)
      .gt("fecha_fin", fecha_inicio);

    const conflictos = [
      ...activas.map((c) => `${c.fecha_inicio} → ${c.fecha_fin}`),
      ...(bloqueos ?? []).map((c) => `${c.fecha_inicio} → ${c.fecha_fin}`),
    ];

    const disponible = conflictos.length === 0;
    const noches = Math.round(
      (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
    );

    const precio = calcularPrecio({
      tipo: producto.tipo,
      precio_clp: producto.precio_clp,
      noches,
      personas,
    });

    return NextResponse.json({
      disponible,
      noches: precio.noches,
      precio_total_clp: precio.total_clp,
      precio_por_noche: producto.precio_clp,
      desglose: precio.desglose,
      conflictos: disponible ? [] : conflictos,
    });
  } catch (err) {
    logger.error("[API availability] Error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { producto_id, mes } = body as { producto_id: string; mes: string };

    if (!producto_id || !mes) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    if (!isSupabaseConfigured() || (allowDemoMode() && DEMO_PRODUCTS[producto_id])) {
      return NextResponse.json(
        { producto_id, mes, fechas_bloqueadas: [] },
        { headers: { "X-Data-Source": "demo" } }
      );
    }

    const inicioMes = parseISO(`${mes}-01`);
    const finMes = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 2, 0);
    const finMesStr = format(finMes, "yyyy-MM-dd");

    const { data: reservas } = await supabaseAdmin
      .from("reservas")
      .select("fecha_inicio, fecha_fin, estado, expira_at")
      .eq("producto_id", producto_id)
      .in("estado", ["confirmada", "pendiente"])
      .lt("fecha_inicio", finMesStr)
      .gte("fecha_fin", `${mes}-01`);

    const ahora = new Date();
    const activas = (reservas ?? []).filter((r) => {
      if (r.estado === "confirmada") return true;
      if (r.estado === "pendiente" && r.expira_at) {
        return new Date(r.expira_at) > ahora;
      }
      return false;
    });

    const { data: bloqueos } = await supabaseAdmin
      .from("bloqueos")
      .select("fecha_inicio, fecha_fin")
      .eq("producto_id", producto_id)
      .lt("fecha_inicio", finMesStr)
      .gte("fecha_fin", `${mes}-01`);

    const fechasBloqueadas = new Set<string>();
    const todos = [...activas, ...(bloqueos ?? [])];

    for (const r of todos) {
      const dias = eachDayOfInterval({
        start: parseISO(r.fecha_inicio),
        end: addDays(parseISO(r.fecha_fin), -1),
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
