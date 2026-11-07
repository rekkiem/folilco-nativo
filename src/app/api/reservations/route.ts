import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { crearPreferenciaPago, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { reservaLimiter, getClientIP } from "@/lib/rate-limit";
import { calcularPrecio, validarCapacidad } from "@/lib/pricing";
import { isSupabaseConfigured, allowDemoMode } from "@/lib/env";
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

const DEMO_PRODUCTS: Record<
  string,
  {
    id: string;
    nombre: string;
    tipo: "alojamiento" | "experiencia" | "producto";
    precio_clp: number;
    capacidad: number;
  }
> = {
  "00000000-0000-0000-0000-000000000001": {
    id: "00000000-0000-0000-0000-000000000001",
    nombre: "Cabaña del Bosque",
    tipo: "alojamiento",
    precio_clp: 85000,
    capacidad: 2,
  },
  "00000000-0000-0000-0000-000000000002": {
    id: "00000000-0000-0000-0000-000000000002",
    nombre: "Domo Patagónico",
    tipo: "alojamiento",
    precio_clp: 120000,
    capacidad: 2,
  },
  "00000000-0000-0000-0000-000000000003": {
    id: "00000000-0000-0000-0000-000000000003",
    nombre: "Cabaña Familiar",
    tipo: "alojamiento",
    precio_clp: 150000,
    capacidad: 5,
  },
  "00000000-0000-0000-0000-000000000004": {
    id: "00000000-0000-0000-0000-000000000004",
    nombre: "Cabalgata al Volcán",
    tipo: "experiencia",
    precio_clp: 35000,
    capacidad: 10,
  },
  "00000000-0000-0000-0000-000000000005": {
    id: "00000000-0000-0000-0000-000000000005",
    nombre: "Día de Campo y Ordeña",
    tipo: "experiencia",
    precio_clp: 28000,
    capacidad: 8,
  },
  "00000000-0000-0000-0000-000000000006": {
    id: "00000000-0000-0000-0000-000000000006",
    nombre: "Miel Artesanal Folilco 500g",
    tipo: "producto",
    precio_clp: 9500,
    capacidad: 1,
  },
  "00000000-0000-0000-0000-000000000007": {
    id: "00000000-0000-0000-0000-000000000007",
    nombre: "Mermelada de Murta 220g",
    tipo: "producto",
    precio_clp: 6500,
    capacidad: 1,
  },
};

export async function POST(req: NextRequest) {
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

  const noches = Math.max(
    1,
    Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (!isSupabaseConfigured() && allowDemoMode()) {
    const demo = DEMO_PRODUCTS[data.producto_id];
    if (!demo) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const cap = validarCapacidad(demo.tipo, demo.capacidad, data.cantidad_personas);
    if (!cap.ok) {
      return NextResponse.json({ error: cap.mensaje }, { status: 400 });
    }

    const precioBase = calcularPrecio({
      tipo: demo.tipo,
      precio_clp: demo.precio_clp,
      noches,
      personas: data.cantidad_personas,
    });

    let precioTotal = precioBase.total_clp;
    for (const extra of data.extras ?? []) {
      const ep = DEMO_PRODUCTS[extra.producto_id];
      if (ep && ep.tipo !== "alojamiento") {
        precioTotal += ep.precio_clp * extra.cantidad;
      }
    }

    const externalRef = randomUUID();
    const numero = `DEMO-${externalRef.slice(0, 8).toUpperCase()}`;

    if (!isMercadoPagoConfigured()) {
      logger.warn("[API reservations] Modo demo sin MercadoPago – reserva simulada");
      return NextResponse.json(
        {
          reserva_id: externalRef,
          numero,
          mp_preference_id: null,
          mp_init_point: null,
          precio_total_clp: precioTotal,
          noches,
          desglose: precioBase.desglose,
          demo: true,
          message:
            "Reserva simulada (modo demo). Configura Supabase + MERCADOPAGO_ACCESS_TOKEN para pago real.",
        },
        { headers: { "X-Data-Source": "demo" } }
      );
    }

    try {
      const reservaFake = {
        id: externalRef,
        numero,
        huesped_nombre: data.huesped_nombre.trim(),
        huesped_email: data.huesped_email.toLowerCase().trim(),
        huesped_telefono: data.huesped_telefono.trim(),
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        cantidad_personas: data.cantidad_personas,
        precio_total_clp: precioTotal,
        estado: "pendiente",
        origen: "web",
      };

      const mpPref = await crearPreferenciaPago(
        reservaFake as never,
        demo as never,
        externalRef
      );

      return NextResponse.json(
        {
          reserva_id: externalRef,
          numero,
          mp_preference_id: mpPref.preference_id,
          mp_init_point: mpPref.init_point ?? mpPref.sandbox_init_point,
          precio_total_clp: precioTotal,
          noches,
          desglose: precioBase.desglose,
          demo: true,
        },
        { headers: { "X-Data-Source": "demo" } }
      );
    } catch (err) {
      logger.error("[API reservations] Error MP en demo:", err);
      return NextResponse.json(
        {
          error:
            "No se pudo crear preferencia MercadoPago. Revisa MERCADOPAGO_ACCESS_TOKEN (sandbox).",
        },
        { status: 502 }
      );
    }
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Servicio de reservas no disponible" },
      { status: 503 }
    );
  }

  try {
    const { data: producto, error: prodErr } = await supabaseAdmin
      .from("productos")
      .select("*")
      .eq("id", data.producto_id)
      .eq("activo", true)
      .single();

    if (prodErr || !producto) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const cap = validarCapacidad(producto.tipo, producto.capacidad, data.cantidad_personas);
    if (!cap.ok) {
      return NextResponse.json({ error: cap.mensaje }, { status: 400 });
    }

    const ahora = new Date().toISOString();
    const { data: conflictos } = await supabaseAdmin
      .from("reservas")
      .select("id, estado, expira_at")
      .eq("producto_id", data.producto_id)
      .in("estado", ["confirmada", "pendiente"])
      .lt("fecha_inicio", data.fecha_fin)
      .gt("fecha_fin", data.fecha_inicio);

    const activos = (conflictos ?? []).filter((r) => {
      if (r.estado === "confirmada") return true;
      if (r.estado === "pendiente" && r.expira_at) {
        return new Date(r.expira_at as string) > new Date(ahora);
      }
      return false;
    });

    if (activos.length > 0) {
      return NextResponse.json(
        { error: "Las fechas seleccionadas ya no están disponibles. Por favor, elige otras." },
        { status: 409 }
      );
    }

    const precioBase = calcularPrecio({
      tipo: producto.tipo,
      precio_clp: producto.precio_clp,
      noches,
      personas: data.cantidad_personas,
    });

    let precioTotal = precioBase.total_clp;

    const extrasData: { producto_id: string; nombre: string; precio: number; cantidad: number }[] =
      [];
    if (data.extras && data.extras.length > 0) {
      const extraIds = data.extras.map((e) => e.producto_id);
      const { data: extrasProds } = await supabaseAdmin
        .from("productos")
        .select("id, nombre, precio_clp, tipo, activo")
        .in("id", extraIds)
        .eq("activo", true);

      for (const extra of data.extras) {
        const prod = extrasProds?.find((p) => p.id === extra.producto_id);
        if (prod && prod.tipo !== "alojamiento") {
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

    const externalRef = randomUUID();

    let reserva: Record<string, unknown> | null = null;
    const { data: rpcReserva, error: rpcErr } = await supabaseAdmin.rpc("crear_reserva", {
      p_producto_id: data.producto_id,
      p_fecha_inicio: data.fecha_inicio,
      p_fecha_fin: data.fecha_fin,
      p_cantidad_personas: data.cantidad_personas,
      p_huesped_nombre: data.huesped_nombre.trim(),
      p_huesped_email: data.huesped_email.toLowerCase().trim(),
      p_huesped_telefono: data.huesped_telefono.trim(),
      p_huesped_rut: data.huesped_rut?.trim() ?? null,
      p_huesped_nota: data.huesped_nota?.trim() ?? null,
      p_precio_base_clp: producto.precio_clp,
      p_precio_total_clp: precioTotal,
      p_origen: "web",
      p_mp_external_reference: externalRef,
      p_hold_minutes: 30,
    });

    if (!rpcErr && rpcReserva) {
      reserva = Array.isArray(rpcReserva) ? rpcReserva[0] : rpcReserva;
    } else {
      if (rpcErr) {
        const msg = rpcErr.message || "";
        if (msg.includes("FECHAS_NO_DISPONIBLES") || msg.includes("FECHAS_BLOQUEADAS")) {
          return NextResponse.json(
            { error: "Las fechas seleccionadas ya no están disponibles." },
            { status: 409 }
          );
        }
        if (msg.includes("CAPACIDAD_EXCEDIDA")) {
          return NextResponse.json({ error: "Capacidad excedida" }, { status: 400 });
        }
        logger.warn("[API reservations] RPC crear_reserva no disponible, fallback insert", rpcErr);
      }

      const { data: inserted, error: reservaErr } = await supabaseAdmin
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
          expira_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          mp_external_reference: externalRef,
          origen: "web",
        })
        .select()
        .single();

      if (reservaErr || !inserted) {
        logger.error("[API reservations] Error creando reserva:", reservaErr);
        return NextResponse.json({ error: "Error al crear la reserva" }, { status: 500 });
      }
      reserva = inserted;
    }

    if (!reserva) {
      return NextResponse.json({ error: "Error al crear la reserva" }, { status: 500 });
    }

    if (extrasData.length > 0) {
      await supabaseAdmin.from("reserva_extras").insert(
        extrasData.map((e) => ({
          reserva_id: reserva!.id,
          producto_id: e.producto_id,
          producto_nombre: e.nombre,
          cantidad: e.cantidad,
          precio_unitario_clp: e.precio,
          subtotal_clp: e.precio * e.cantidad,
        }))
      );
    }

    if (!isMercadoPagoConfigured()) {
      logger.warn("[API reservations] Reserva creada sin preferencia MP (token no configurado)", {
        reserva_id: reserva.id,
        numero: reserva.numero,
      });
      return NextResponse.json({
        reserva_id: reserva.id,
        numero: reserva.numero,
        mp_preference_id: null,
        mp_init_point: null,
        precio_total_clp: precioTotal,
        noches,
        desglose: precioBase.desglose,
        payment_pending_config: true,
        message:
          "Reserva creada. Configura MERCADOPAGO_ACCESS_TOKEN (sandbox) para habilitar el pago online.",
      });
    }

    try {
      const mpPref = await crearPreferenciaPago(reserva as never, producto, externalRef);

      await supabaseAdmin
        .from("reservas")
        .update({ mp_preference_id: mpPref.preference_id })
        .eq("id", reserva.id as string);

      return NextResponse.json({
        reserva_id: reserva.id,
        numero: reserva.numero,
        mp_preference_id: mpPref.preference_id,
        mp_init_point: mpPref.init_point ?? mpPref.sandbox_init_point,
        precio_total_clp: precioTotal,
        noches,
        desglose: precioBase.desglose,
      });
    } catch (mpErr) {
      logger.error("[API reservations] Error MercadoPago tras crear reserva:", mpErr);
      return NextResponse.json(
        {
          reserva_id: reserva.id,
          numero: reserva.numero,
          mp_preference_id: null,
          mp_init_point: null,
          precio_total_clp: precioTotal,
          noches,
          desglose: precioBase.desglose,
          payment_error: true,
          message:
            "Reserva creada, pero MercadoPago rechazó la preferencia. Revisa el Access Token de prueba.",
        },
        { status: 502 }
      );
    }
  } catch (err) {
    logger.error("[API reservations] Error inesperado:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");

  if (!ref) {
    return NextResponse.json({ error: "Parámetro ref requerido" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    if (allowDemoMode()) {
      return NextResponse.json({
        numero: `DEMO-${ref.slice(0, 8)}`,
        estado: "pendiente",
        demo: true,
      });
    }
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const { data: reserva } = await supabaseAdmin
    .from("reservas")
    .select(
      "numero, estado, huesped_nombre, producto_nombre, fecha_inicio, fecha_fin, precio_total_clp"
    )
    .eq("mp_external_reference", ref)
    .single();

  if (!reserva) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  return NextResponse.json(reserva);
}
