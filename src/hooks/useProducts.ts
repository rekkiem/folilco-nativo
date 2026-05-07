"use client";

import { useState, useEffect } from "react";
import type { Producto } from "@/types";

interface UseProductsResult {
  productos: Producto[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

/**
 * Hook: carga y cachea la lista de productos.
 */
export function useProducts(tipo?: string): UseProductsResult {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const url = tipo ? `/api/products?tipo=${tipo}` : "/api/products";

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setProductos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [tipo, version]);

  return {
    productos,
    loading,
    error,
    refetch: () => setVersion((v) => v + 1),
  };
}
