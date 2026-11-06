import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured, allowDemoMode } from "@/lib/env";

const DEMO_STOCK = [
  {
    id: "00000000-0000-0000-0000-000000000006",
    nombre: "Miel Artesanal Folilco 500g",
    tipo: "producto",
    stock_actual: 50,
    stock_minimo: 10,
    precio_clp: 9500,
    socio_responsable: "Pedro Flores",
    activo: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    nombre: "Mermelada de Murta 220g",
    tipo: "producto",
    stock_actual: 30,
    stock_minimo: 5,
    precio_clp: 6500,
    socio_responsable: "Ana Pinto",
    activo: true,
  },
];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  if (!isSupabaseConfigured()) {
    if (allowDemoMode()) {
      return NextResponse.json(DEMO_STOCK, {
        headers: { "X-Data-Source": "demo" },
      });
    }
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

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

  if (!isSupabaseConfigured()) {
    if (allowDemoMode()) {
      return NextResponse.json({ ok: true, demo: true });
    }
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

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
