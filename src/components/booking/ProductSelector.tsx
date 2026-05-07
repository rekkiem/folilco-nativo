"use client";

import { memo, useState } from "react";
import Image from "next/image";
import type { Producto, ProductoTipo } from "@/types";
import { useProducts } from "@/hooks/useProducts";

const TIPO_LABELS: Record<ProductoTipo, string> = {
  alojamiento: "🏡 Alojamiento",
  experiencia: "🐴 Experiencias",
  producto: "🍯 Productos",
};

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(n);
}

interface Props {
  selected: Producto | null;
  onSelect: (p: Producto) => void;
}

type FiltroTipo = ProductoTipo | "todos";

function ProductSelector({ selected, onSelect }: Props) {
  const { productos, loading, error, refetch } = useProducts();
  const [filtro, setFiltro] = useState<FiltroTipo>("todos");

  // productos físicos se agregan como extras en el paso de fechas
  const filtrados =
    filtro === "todos"
      ? productos.filter((p) => p.tipo !== "producto")
      : productos.filter((p) => p.tipo === filtro);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-6" aria-label="Cargando productos">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-0 overflow-hidden" aria-hidden="true">
            <div className="skeleton h-48" />
            <div className="p-5 space-y-3">
              <div className="skeleton h-6 rounded w-2/3" />
              <div className="skeleton h-4 rounded w-full" />
              <div className="skeleton h-10 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-forest-500" role="alert">
        <p className="text-4xl mb-4">🌿</p>
        <p>No pudimos cargar los productos. ¿Tienes conexión a internet?</p>
        <button onClick={refetch} className="btn-primary mt-4">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl text-forest-900 mb-2">
          ¿Qué quieres reservar?
        </h2>
        <p className="text-forest-500 text-sm">
          Selecciona alojamiento o experiencia. Puedes agregar productos artesanales
          en el siguiente paso.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-8 flex-wrap" role="group" aria-label="Filtrar por tipo">
        {([
          { key: "todos", label: "🌿 Todo" },
          { key: "alojamiento", label: "🏡 Alojamiento" },
          { key: "experiencia", label: "🐴 Experiencias" },
        ] as { key: FiltroTipo; label: string }[]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            aria-pressed={filtro === f.key}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              filtro === f.key
                ? "bg-forest-700 text-white border-forest-700"
                : "bg-white text-forest-600 border-cream-300 hover:border-forest-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {filtrados.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            aria-pressed={selected?.id === p.id}
            aria-label={`Seleccionar ${p.nombre}, ${formatCLP(p.precio_clp)} por ${p.tipo === "alojamiento" ? "noche" : "persona"}`}
            className={`card text-left overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-forest-600 ${
              selected?.id === p.id ? "ring-2 ring-forest-600 shadow-lg" : ""
            }`}
          >
            {p.imagen_url && (
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={p.imagen_url}
                  alt={p.nombre}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority={false}
                />
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-forest-900/80 backdrop-blur-sm text-honey-400 text-xs px-2 py-1 rounded-full">
                    {TIPO_LABELS[p.tipo]}
                  </span>
                </div>
                {selected?.id === p.id && (
                  <div className="absolute top-3 right-3 z-10 bg-forest-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">
                    ✓
                  </div>
                )}
              </div>
            )}
            <div className="p-5">
              <h3 className="font-display text-xl text-forest-900 mb-2">{p.nombre}</h3>
              <p className="text-forest-600 text-sm mb-4 line-clamp-2">{p.descripcion}</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-semibold text-honey-600">
                    {formatCLP(p.precio_clp)}
                  </span>
                  <span className="text-forest-500 text-xs ml-1">
                    {p.tipo === "alojamiento" ? "/noche" : "/persona"}
                  </span>
                </div>
                {p.capacidad > 1 && (
                  <span className="text-xs text-forest-500 bg-cream-100 px-2 py-1 rounded-full">
                    hasta {p.capacidad} personas
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(ProductSelector);
