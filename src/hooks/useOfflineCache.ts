"use client";

import { useState, useEffect, useCallback } from "react";

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutos

function leerCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.ts > TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function escribirCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage lleno o no disponible (SSR)
  }
}

// ── Hook: disponibilidad con cache offline ─────────────────
interface FechasBloqueadasResult {
  fechasBloqueadas: Set<string>;
  loading: boolean;
  offline: boolean;
  fromCache: boolean;
  refetch: () => void;
}

export function useFechasBloqueadas(
  productoId: string,
  mes: string // YYYY-MM
): FechasBloqueadasResult {
  const [fechasBloqueadas, setFechasBloqueadas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const cacheKey = `folilco:disponibilidad:${productoId}:${mes}`;

  const fetchDisponibilidad = useCallback(async () => {
    setLoading(true);
    setOffline(false);
    setFromCache(false);

    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ producto_id: productoId, mes }),
        signal: AbortSignal.timeout(8000), // timeout de 8s para 3G
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as { fechas_bloqueadas: string[] };
      const fechas = new Set(data.fechas_bloqueadas ?? []);
      setFechasBloqueadas(fechas);
      escribirCache(cacheKey, data.fechas_bloqueadas ?? []);
    } catch {
      // Intentar desde cache
      const cached = leerCache<string[]>(cacheKey);
      if (cached) {
        setFechasBloqueadas(new Set(cached));
        setFromCache(true);
      }
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [productoId, mes, cacheKey]);

  useEffect(() => {
    if (!productoId || !mes) return;

    // Intentar cache inmediato para UX rápida
    const cached = leerCache<string[]>(cacheKey);
    if (cached) {
      setFechasBloqueadas(new Set(cached));
      setFromCache(true);
    }

    // Luego fetch en background
    fetchDisponibilidad();
  }, [productoId, mes, fetchDisponibilidad, cacheKey]);

  // Escuchar cambios de conectividad
  useEffect(() => {
    const handleOnline = () => fetchDisponibilidad();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [fetchDisponibilidad]);

  return { fechasBloqueadas, loading, offline, fromCache, refetch: fetchDisponibilidad };
}

// ── Hook: productos con cache ──────────────────────────────
export function useProductosCache<T>(
  url: string,
  _ttlMs: number = TTL_MS
): { data: T | null; loading: boolean; offline: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const cacheKey = `folilco:cache:${url}`;

  useEffect(() => {
    // Cache inmediato
    const cached = leerCache<T>(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    // Fetch en background
    fetch(url, { signal: AbortSignal.timeout(6000) })
      .then((r) => r.json())
      .then((d: T) => {
        setData(d);
        escribirCache(cacheKey, d);
        setOffline(false);
      })
      .catch(() => {
        if (!cached) setOffline(true);
      })
      .finally(() => setLoading(false));
  }, [url, cacheKey]);

  return { data, loading, offline };
}
