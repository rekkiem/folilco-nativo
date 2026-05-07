import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

// Datos de fallback para desarrollo sin Supabase configurado
const DEMO_TIMESTAMP = "2025-01-01T00:00:00.000Z";

const FALLBACK_PRODUCTS = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    nombre: "Cabaña del Bosque",
    descripcion: "Cabaña acogedora para 2 personas rodeada de bosque nativo.",
    tipo: "alojamiento",
    precio_clp: 85000,
    capacidad: 2,
    imagen_url: "https://images.unsplash.com/photo-1482192505345-5852cc56a9b7?w=600&q=80",
    activo: true,
    duracion_noches: 1,
    duracion_horas: null,
    stock_actual: null,
    stock_minimo: null,
    socio_responsable: "María González",
    created_at: DEMO_TIMESTAMP,
    updated_at: DEMO_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    nombre: "Domo Patagónico",
    descripcion: "Domo geodésico con vista al lago y cielo despejado.",
    tipo: "alojamiento",
    precio_clp: 120000,
    capacidad: 2,
    imagen_url: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=600&q=80",
    activo: true,
    duracion_noches: 1,
    duracion_horas: null,
    stock_actual: null,
    stock_minimo: null,
    socio_responsable: "Carlos Muñoz",
    created_at: DEMO_TIMESTAMP,
    updated_at: DEMO_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    nombre: "Cabaña Familiar",
    descripcion: "Espaciosa cabaña para hasta 5 personas con fogón exterior.",
    tipo: "alojamiento",
    precio_clp: 150000,
    capacidad: 5,
    imagen_url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&q=80",
    activo: true,
    duracion_noches: 1,
    duracion_horas: null,
    stock_actual: null,
    stock_minimo: null,
    socio_responsable: "Ana Pinto",
    created_at: DEMO_TIMESTAMP,
    updated_at: DEMO_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    nombre: "Cabalgata al Volcán",
    descripcion: "Excursión a caballo de 4 horas hacia las faldas del volcán.",
    tipo: "experiencia",
    precio_clp: 35000,
    capacidad: 8,
    imagen_url: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=600&q=80",
    activo: true,
    duracion_noches: null,
    duracion_horas: 4,
    stock_actual: null,
    stock_minimo: null,
    socio_responsable: "Roberto Salvo",
    created_at: DEMO_TIMESTAMP,
    updated_at: DEMO_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    nombre: "Día de Campo y Ordeña",
    descripcion: "Vive un día en la granja: ordeña, queso artesanal y almuerzo campestre.",
    tipo: "experiencia",
    precio_clp: 28000,
    capacidad: 10,
    imagen_url: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&q=80",
    activo: true,
    duracion_noches: null,
    duracion_horas: 6,
    stock_actual: null,
    stock_minimo: null,
    socio_responsable: "María González",
    created_at: DEMO_TIMESTAMP,
    updated_at: DEMO_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    nombre: "Miel Artesanal Folilco 500g",
    descripcion: "Miel pura de abeja melífera del bosque nativo del sur.",
    tipo: "producto",
    precio_clp: 9500,
    capacidad: 1,
    imagen_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    activo: true,
    duracion_noches: null,
    duracion_horas: null,
    stock_actual: 50,
    stock_minimo: 10,
    socio_responsable: "Pedro Flores",
    created_at: DEMO_TIMESTAMP,
    updated_at: DEMO_TIMESTAMP,
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    nombre: "Mermelada de Murta 220g",
    descripcion: "Mermelada artesanal de murta silvestre recolectada en temporada.",
    tipo: "producto",
    precio_clp: 6500,
    capacidad: 1,
    imagen_url: "https://images.unsplash.com/photo-1597528373181-c8b2bf7ed7e8?w=600&q=80",
    activo: true,
    duracion_noches: null,
    duracion_horas: null,
    stock_actual: 30,
    stock_minimo: 5,
    socio_responsable: "Ana Pinto",
    created_at: DEMO_TIMESTAMP,
    updated_at: DEMO_TIMESTAMP,
  },
];

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://tu-proyecto.supabase.co" &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "tu-service-role-key-privada"
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");

  // Modo de desarrollo sin Supabase configurado → retornar datos de demo
  if (!isSupabaseConfigured()) {
    logger.warn("[API products] Supabase no configurado – usando datos de demo");
    const filtered = tipo
      ? FALLBACK_PRODUCTS.filter((p) => p.tipo === tipo)
      : FALLBACK_PRODUCTS;

    return NextResponse.json(filtered, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Data-Source": "demo",
      },
    });
  }

  try {
    let query = supabaseAdmin
      .from("productos")
      .select("*")
      .eq("activo", true)
      .order("tipo")
      .order("nombre");

    if (tipo) {
      query = query.eq("tipo", tipo);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("[API products] Supabase error", {
        message: error.message,
        code: error.code,
      });
      return NextResponse.json(
        { error: "Error cargando productos. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? [], {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    logger.error("[API products] Error inesperado", { message });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
