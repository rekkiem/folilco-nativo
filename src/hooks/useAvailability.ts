"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  guardarDisponibilidadCache,
  leerDisponibilidadCache,
  limpiarCacheAntiguo,
} from "@/lib/offline-cache";

interface AvailabilityResult {
  fechasBloqueadas: Set<string>;
  offlineMode: boolean;
  cacheTimestamp: Date | null;
  loadingCalendar: boolean;
}

interface DisponibilidadResult {
  disponible: boolean;
  precio_total_clp: number;
  noches: number;
}

interface CheckResult {
  disponibilidad: DisponibilidadResult | null;
  checking: boolean;
  error: string | null;
}

/**
 * Hook: disponibilidad mensual del calendario.
 * Maneja cache offline y fetch en background.
 */
export function useMonthAvailability(
  productoId: string,
  mes: Date
): AvailabilityResult {
  const [fechasBloqueadas, setFechasBloqueadas] = useState<Set<string>>(new Set());
  const [offlineMode, setOfflineMode] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<Date | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  useEffect(() => {
    if (!productoId) return;
    limpiarCacheAntiguo();
    const mesStr = format(mes, "yyyy-MM");

    const cached = leerDisponibilidadCache(productoId, mesStr);
    if (cached) {
      setFechasBloqueadas(new Set(cached.fechas_bloqueadas));
      setCacheTimestamp(cached.fetched_at);
      if (!cached.stale) return;
    }

    setLoadingCalendar(true);
    fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producto_id: productoId, mes: mesStr }),
    })
      .then((r) => r.json())
      .then((d) => {
        const fechas: string[] = d.fechas_bloqueadas ?? [];
        setFechasBloqueadas(new Set(fechas));
        guardarDisponibilidadCache(productoId, mesStr, fechas);
        setCacheTimestamp(new Date());
        setOfflineMode(false);
      })
      .catch(() => {
        if (!cached) setOfflineMode(true);
      })
      .finally(() => setLoadingCalendar(false));
  }, [productoId, mes]);

  return { fechasBloqueadas, offlineMode, cacheTimestamp, loadingCalendar };
}

/**
 * Hook: verificar disponibilidad para un rango de fechas.
 */
export function useRangeAvailability(
  productoId: string,
  fechaInicio: Date | null,
  fechaFin: Date | null
): CheckResult {
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fechaInicio || !fechaFin || !productoId) {
      setDisponibilidad(null);
      setError(null);
      return;
    }

    setChecking(true);
    setError(null);
    const fi = format(fechaInicio, "yyyy-MM-dd");
    const ff = format(fechaFin, "yyyy-MM-dd");

    fetch(`/api/availability?producto_id=${productoId}&fecha_inicio=${fi}&fecha_fin=${ff}`)
      .then((r) => r.json())
      .then((d) => {
        setDisponibilidad(d);
        if (!d.disponible) setError("Las fechas seleccionadas no están disponibles.");
      })
      .catch(() => setError("Sin conexión. No se pudo verificar disponibilidad."))
      .finally(() => setChecking(false));
  }, [productoId, fechaInicio, fechaFin]);

  return { disponibilidad, checking, error };
}
