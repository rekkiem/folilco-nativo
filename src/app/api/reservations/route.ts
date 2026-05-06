import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { crearPreferenciaPago } from "@/lib/mercadopago";
import { reservaLimiter, getClientIP } from "@/lib/rate-limit";
import { z } from "zod";
import { parseISO, isBefore } from "date-fns";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";

const schema = z.object({
  producto_id: z.string().uuid(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cantidad_personas: z.number().int().min(1).max(20),
  huesped_nombre: z.string().min(3).max(100),
  huesped_email: z.string().email(),
  huesped_telefono: z.string().min(8).max(20),
  huesped_rut: z.string().optional(),
  huesped_nota: z.string().max(500).optional(),
  extras: z
    .array(
      z.object({
        producto_id: z.string().uuid(),
        cantidad: z.number().int().min(1).max(50),
      })
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIP(req);
  const rl = reservaLimiter(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento antes de intentarlo." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parse.error.flatten() },
      { status: 400 }
    );
  }

  const data = parse.data;

  // Validar fechas
  const inicio = parseISO(data.fecha_inicio);
  const fin = parseISO(data.fecha_fin);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (isBefore(inicio, hoy)) {
    return NextResponse.json({ error: "Fecha de inicio inválida" }, { status: 400 });
  }
  if (!isBefore(inicio, fin)) {
    return NextResponse.json({ error: "Fecha de fin debe ser posterior al inicio" }, { status: 400 });
  }

  try {
    // 1. Obtener producto
    const { data: producto, error: prodErr } = await supabaseAdmin
      .from("productos")
      .select("*")
      .eq("id", data.producto_id)
      .eq("activo", true)
      .single();

    if (prodErr || !producto) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    // 2. Verificar disponibilidad (doble check, el frontend ya lo hizo)
    const { data: conflictos } = await supabaseAdmin
      .from("reservas")
      .select("id")
      .eq("producto_id", data.producto_id)
      .in("estado", ["confirmada", "pendiente"])
      .lt("fecha_inicio", data.fecha_fin)
      .gt("fecha_fin", data.fecha_inicio);

    if (conflictos && conflictos.length > 0) {
      return NextResponse.json(
        { error: "Las fechas seleccionadas ya no están disponibles. Por favor, elige otras." },
        { status: 409 }
      );
    }

    // 3. Calcular precio
    const noches = Math.round(
      (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
    );
    let precioTotal = producto.precio_clp * (producto.tipo === "alojamiento" ? noches : 1) * data.cantidad_personas;

    // Calcular extras
    let extrasData: { producto_id: string; nombre: string; precio: number; cantidad: number }[] = [];
    if (data.extras && data.extras.length > 0) {
      const extraIds = data.extras.map((e) => e.producto_id);
      const { data: extrasProds } = await supabaseAdmin
        .from("productos")
        .select("id, nombre, precio_clp, tipo, activo")
        .in("id", extraIds)
        .eq("activo", true);

      for (const extra of data.extras) {
        const prod = extrasProds?.find((p) => p.id === extra.producto_id);
        if (prod) {
          extrasData.push({
            producto_id: prod.id,
            nombre: prod.nombre,
            precio: prod.precio_clp,
            cantidad: extra.cantidad,
          });
          precioTotal += prod.precio_clp * extra.cantidad;
        }
      }
    }

    // 4. Crear reserva en estado "pendiente"
    const externalRef = randomUUID();

    const { data: reserva, error: reservaErr } = await supabaseAdmin
      .from("reservas")
      .insert({
        huesped_nombre: data.huesped_nombre.trim(),
        huesped_email: data.huesped_email.toLowerCase().trim(),
        huesped_telefono: data.huesped_telefono.trim(),
        huesped_rut: data.huesped_rut?.trim() ?? null,
        huesped_nota: data.huesped_nota?.trim() ?? null,
        producto_id: data.producto_id,
        producto_nombre: producto.nombre,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        cantidad_personas: data.cantidad_personas,
        precio_base_clp: producto.precio_clp,
        precio_total_clp: precioTotal,
        estado: "pendiente",
        mp_external_reference: externalRef,
        origen: "web",
      })
      .select()
      .single();

    if (reservaErr || !reserva) {
      logger.error("[API reservations] Error creando reserva:", reservaErr);
      return NextResponse.json({ error: "Error al crear la reserva" }, { status: 500 });
    }

    // 5. Insertar extras
    if (extrasData.length > 0) {
      await supabaseAdmin.from("reserva_extras").insert(
        extrasData.map((e) => ({
          reserva_id: reserva.id,
          producto_id: e.producto_id,
          producto_nombre: e.nombre,
          cantidad: e.cantidad,
          precio_unitario_clp: e.precio,
          subtotal_clp: e.precio * e.cantidad,
        }))
      );
    }

    // 6. Crear preferencia de pago en MercadoPago
    const mpPref = await crearPreferenciaPago(reserva, producto, externalRef);

    // 7. Guardar preference_id en la reserva
    await supabaseAdmin
      .from("reservas")
      .update({ mp_preference_id: mpPref.preference_id })
      .eq("id", reserva.id);

    return NextResponse.json({
      reserva_id: reserva.id,
      numero: reserva.numero,
      mp_preference_id: mpPref.preference_id,
      mp_init_point: mpPref.init_point,
      precio_total_clp: precioTotal,
      noches,
    });
  } catch (err) {
    logger.error("[API reservations] Error inesperado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// GET: listado de reservas (solo admin, ver /api/admin/reservations)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");

  if (!ref) {
    return NextResponse.json({ error: "Parámetro ref requerido" }, { status: 400 });
  }

  const { data: reserva } = await supabaseAdmin
    .from("reservas")
    .select("numero, estado, huesped_nombre, producto_nombre, fecha_inicio, fecha_fin, precio_total_clp")
    .eq("mp_external_reference", ref)
    .single();

  if (!reserva) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  return NextResponse.json(reserva);
}
