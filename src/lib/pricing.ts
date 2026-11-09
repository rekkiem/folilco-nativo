/**
 * Cálculo de precios único y determinista (F0-01 / E-01).
 * Una sola fuente de verdad usada por availability, reservations y tests.
 * CLP siempre entero.
 */

export type TipoProducto = "alojamiento" | "experiencia" | "producto";

export interface ExtraInput {
  producto_id: string;
  tipo: TipoProducto;
  precio_clp: number;
  cantidad: number;
  nombre?: string;
  activo?: boolean;
}

export interface PrecioDesglose {
  base_clp: number;
  extras_clp: number;
  total_clp: number;
  noches: number;
  personas: number;
  desglose: {
    concepto: string;
    cantidad: number;
    unitario_clp: number;
    subtotal_clp: number;
  }[];
}

/**
 * Calcula el precio total según reglas de negocio:
 * - alojamiento: precio_clp × noches  (por unidad/cabaña, NO por persona)
 * - experiencia: precio_clp × personas
 * - producto:    precio_clp × cantidad
 */
export function calcularPrecio(params: {
  tipo: TipoProducto;
  precio_clp: number;
  noches?: number;
  personas?: number;
  cantidad?: number;
  extras?: ExtraInput[];
}): PrecioDesglose {
  const {
    tipo,
    precio_clp,
    noches = 1,
    personas = 1,
    cantidad = 1,
    extras = [],
  } = params;

  if (precio_clp < 0 || !Number.isInteger(precio_clp)) {
    throw new Error("precio_clp debe ser entero no negativo");
  }

  const desglose: PrecioDesglose["desglose"] = [];
  let base = 0;

  if (tipo === "alojamiento") {
    const n = Math.max(1, Math.round(noches));
    base = precio_clp * n;
    desglose.push({
      concepto: "Alojamiento",
      cantidad: n,
      unitario_clp: precio_clp,
      subtotal_clp: base,
    });
  } else if (tipo === "experiencia") {
    const p = Math.max(1, Math.round(personas));
    base = precio_clp * p;
    desglose.push({
      concepto: "Experiencia",
      cantidad: p,
      unitario_clp: precio_clp,
      subtotal_clp: base,
    });
  } else {
    const c = Math.max(1, Math.round(cantidad));
    base = precio_clp * c;
    desglose.push({
      concepto: "Producto",
      cantidad: c,
      unitario_clp: precio_clp,
      subtotal_clp: base,
    });
  }

  let extrasTotal = 0;
  const seen = new Set<string>();

  for (const extra of extras) {
    if (extra.activo === false) continue;
    if (extra.tipo === "alojamiento") continue;
    if (extra.cantidad < 1) continue;
    if (seen.has(extra.producto_id)) continue;
    seen.add(extra.producto_id);

    const sub = extra.precio_clp * extra.cantidad;
    extrasTotal += sub;
    desglose.push({
      concepto: extra.nombre ?? "Extra",
      cantidad: extra.cantidad,
      unitario_clp: extra.precio_clp,
      subtotal_clp: sub,
    });
  }

  const total = base + extrasTotal;

  return {
    base_clp: base,
    extras_clp: extrasTotal,
    total_clp: total,
    noches: tipo === "alojamiento" ? Math.max(1, Math.round(noches)) : 0,
    personas: tipo === "experiencia" ? Math.max(1, Math.round(personas)) : personas,
    desglose,
  };
}

/** Valida capacidad en servidor */
export function validarCapacidad(
  tipo: TipoProducto,
  capacidad: number | null | undefined,
  personas: number
): { ok: true } | { ok: false; mensaje: string } {
  const cap = capacidad ?? 1;
  if (personas > cap) {
    return {
      ok: false,
      mensaje: `La capacidad máxima es ${cap} persona${cap === 1 ? "" : "s"}. Solicitaste ${personas}.`,
    };
  }
  return { ok: true };
}
