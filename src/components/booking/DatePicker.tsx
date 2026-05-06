"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isAfter, isBefore, parseISO,
  differenceInDays, startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import type { Producto } from "@/types";
import { getCachedAvailability, setCachedAvailability } from "@/lib/availability-cache";

interface Extra {
  producto_id: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

interface Props {
  producto: Producto;
  fechaInicio: string;
  fechaFin: string;
  cantidadPersonas: number;
  extras: Extra[];
  onContinue: (fi: string, ff: string, personas: number, precio: number, noches: number, extras: Extra[]) => void;
  onBack: () => void;
}

const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n);
}

export default function DatePicker({ producto, fechaInicio, fechaFin, cantidadPersonas: initPersonas, extras: initExtras, onContinue, onBack }: Props) {
  const [mesActual, setMesActual] = useState(new Date());
  const [fechasBloqueadas, setFechasBloqueadas] = useState<Set<string>>(new Set());
  const [selInicio, setSelInicio] = useState<Date | null>(fechaInicio ? parseISO(fechaInicio) : null);
  const [selFin, setSelFin] = useState<Date | null>(fechaFin ? parseISO(fechaFin) : null);
  const [personas, setPersonas] = useState(initPersonas);
  const [extras, setExtras] = useState<Extra[]>(initExtras);
  const [disponibles, setDisponibles] = useState<Producto[]>([]);
  const [checking, setChecking] = useState(false);
  const [offline, setOffline] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<{ disponible: boolean; precio_total_clp: number; noches: number } | null>(null);
  const [errDisp, setErrDisp] = useState<string | null>(null);
  const checkAbort = useRef<AbortController | null>(null);

  // Detectar estado de red
  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Cargar fechas bloqueadas del mes — con cache local
  useEffect(() => {
    const mes = format(mesActual, "yyyy-MM");
    const cached = getCachedAvailability(producto.id, mes);
    if (cached) {
      setFechasBloqueadas(new Set(cached));
      return;
    }

    if (offline) return; // Sin red y sin cache, no bloquear UX

    fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producto_id: producto.id, mes }),
    })
      .then((r) => r.json())
      .then((d) => {
        const fechas: string[] = d.fechas_bloqueadas ?? [];
        setFechasBloqueadas(new Set(fechas));
        setCachedAvailability(producto.id, mes, fechas);
      })
      .catch(() => {/* red caída: calendario muestra todo disponible */});
  }, [mesActual, producto.id, offline]);

  // Cargar extras disponibles
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Producto[]) => setDisponibles(data.filter((p) => p.id !== producto.id && p.activo)))
      .catch(() => {});
  }, [producto.id]);

  // Verificar disponibilidad con cancelación de requests anteriores
  useEffect(() => {
    if (!selInicio || !selFin) { setDisponibilidad(null); setErrDisp(null); return; }

    // Cancelar request previo si existe
    checkAbort.current?.abort();
    const ctrl = new AbortController();
    checkAbort.current = ctrl;

    setChecking(true);
    setErrDisp(null);

    const fi = format(selInicio, "yyyy-MM-dd");
    const ff = format(selFin, "yyyy-MM-dd");

    fetch(`/api/availability?producto_id=${producto.id}&fecha_inicio=${fi}&fecha_fin=${ff}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        setDisponibilidad(d);
        if (!d.disponible) setErrDisp("Las fechas seleccionadas no están disponibles.");
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setErrDisp(offline ? "Sin conexión. Verifica disponibilidad al reconectarte." : "Error verificando disponibilidad.");
      })
      .finally(() => setChecking(false));

    return () => ctrl.abort();
  }, [selInicio, selFin, producto.id, offline]);

  const esBloqueado = useCallback((date: Date) => fechasBloqueadas.has(format(date, "yyyy-MM-dd")), [fechasBloqueadas]);
  const esPasado = (date: Date) => isBefore(startOfDay(date), startOfDay(new Date()));

  const handleDiaClick = (date: Date) => {
    if (esPasado(date) || esBloqueado(date)) return;

    if (!selInicio || (selInicio && selFin)) {
      setSelInicio(date);
      setSelFin(null);
      setDisponibilidad(null);
      return;
    }

    if (isBefore(date, selInicio)) { setSelInicio(date); setSelFin(null); return; }

    // Verificar que no haya bloqueados en el rango
    const dias = eachDayOfInterval({ start: selInicio, end: date });
    const hayBloqueo = dias.some((d) => esBloqueado(d));
    if (hayBloqueo) { setErrDisp("Hay fechas no disponibles dentro del rango."); return; }
    setSelFin(date);
  };

  const enRango = (date: Date) => selInicio && selFin && isAfter(date, selInicio) && isBefore(date, selFin);

  const primerDia = startOfMonth(mesActual);
  const diasMes = eachDayOfInterval({ start: primerDia, end: endOfMonth(mesActual) });
  const pad = (primerDia.getDay() + 6) % 7;

  const noches = selInicio && selFin ? differenceInDays(selFin, selInicio) : 0;
  const precioBase = disponibilidad?.precio_total_clp ?? 0;
  const precioExtras = extras.reduce((a, e) => a + e.precio * e.cantidad, 0);
  const precioTotal = precioBase + precioExtras;

  const toggleExtra = (prod: Producto) => {
    setExtras((prev) => {
      const exists = prev.find((e) => e.producto_id === prod.id);
      if (exists) return prev.filter((e) => e.producto_id !== prod.id);
      return [...prev, { producto_id: prod.id, nombre: prod.nombre, precio: prod.precio_clp, cantidad: 1 }];
    });
  };

  const puedeContinuar = selInicio && selFin && disponibilidad?.disponible && noches > 0 && !checking;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl text-forest-900 mb-1">Elige tus fechas</h2>
        <p className="text-forest-500 text-sm">{producto.nombre} · {formatCLP(producto.precio_clp)}/noche</p>
      </div>

      {offline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm flex gap-2">
          <span>📶</span>
          <span>Sin conexión. Mostrando disponibilidad desde cache local. Los datos pueden no estar actualizados.</span>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Calendario */}
        <div className="lg:col-span-3 card p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setMesActual(subMonths(mesActual, 1))}
              disabled={isBefore(startOfMonth(subMonths(mesActual, 1)), startOfMonth(new Date()))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-cream-100 disabled:opacity-30 transition-colors"
            >‹</button>
            <span className="font-medium text-forest-900 capitalize">
              {format(mesActual, "MMMM yyyy", { locale: es })}
            </span>
            <button onClick={() => setMesActual(addMonths(mesActual, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-cream-100 transition-colors">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DIAS.map((d) => <div key={d} className="text-center text-xs font-medium text-forest-400 py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: pad }).map((_, i) => <div key={`pad-${i}`} />)}
            {diasMes.map((date) => {
              const bloqueado = esBloqueado(date);
              const pasado = esPasado(date);
              const esInicio = selInicio && isSameDay(date, selInicio);
              const esFin = selFin && isSameDay(date, selFin);
              const dentroRango = enRango(date);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDiaClick(date)}
                  disabled={bloqueado || pasado}
                  aria-label={`${format(date, "d MMM", { locale: es })}${bloqueado ? " – No disponible" : ""}`}
                  className={`relative h-10 text-sm rounded-lg transition-all font-medium
                    ${bloqueado || pasado ? "text-forest-300 cursor-not-allowed bg-cream-100" : esInicio || esFin ? "bg-forest-700 text-white" : dentroRango ? "bg-forest-100 text-forest-800" : "hover:bg-cream-200 text-forest-800"}
                    ${bloqueado ? "line-through" : ""}`}
                >
                  {format(date, "d")}
                </button>
              );
            })}
          </div>

          <div className="flex gap-4 mt-4 text-xs text-forest-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-forest-700 inline-block" /> Seleccionado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-cream-100 border border-cream-300 inline-block" /> No disponible</span>
          </div>

          {errDisp && <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">{errDisp}</div>}
        </div>

        {/* Panel derecho */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-forest-900 mb-3 text-sm uppercase tracking-wide">Tu selección</h3>
            {selInicio ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-forest-600">Llegada</span>
                  <span className="font-medium text-forest-900">{format(selInicio, "dd MMM yyyy", { locale: es })}</span>
                </div>
                {selFin && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-forest-600">Salida</span>
                      <span className="font-medium text-forest-900">{format(selFin, "dd MMM yyyy", { locale: es })}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-forest-600">Noches</span><span className="font-semibold">{noches}</span></div>
                    {checking && <div className="text-xs text-forest-500 animate-pulse">Verificando disponibilidad…</div>}
                    {disponibilidad?.disponible && (
                      <div className="border-t border-cream-200 pt-2 flex justify-between">
                        <span className="text-forest-600">Alojamiento</span>
                        <span className="font-semibold text-honey-600">{formatCLP(disponibilidad.precio_total_clp)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-forest-400 text-sm">Haz click en el calendario para seleccionar tu llegada</p>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-forest-900 mb-3 text-sm uppercase tracking-wide">Personas</h3>
            <div className="flex items-center gap-4">
              <button onClick={() => setPersonas(Math.max(1, personas - 1))} className="w-9 h-9 rounded-full border border-cream-300 flex items-center justify-center text-forest-700 hover:border-forest-600 transition-colors">−</button>
              <span className="font-semibold text-lg w-6 text-center">{personas}</span>
              <button onClick={() => setPersonas(Math.min(producto.capacidad, personas + 1))} className="w-9 h-9 rounded-full border border-cream-300 flex items-center justify-center text-forest-700 hover:border-forest-600 transition-colors">+</button>
              <span className="text-xs text-forest-500">máx. {producto.capacidad}</span>
            </div>
          </div>

          {disponibles.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-forest-900 mb-3 text-sm uppercase tracking-wide">¿Agregar algo más?</h3>
              <div className="space-y-2">
                {disponibles.slice(0, 5).map((prod) => {
                  const selected = extras.some((e) => e.producto_id === prod.id);
                  return (
                    <label key={prod.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${selected ? "border-forest-500 bg-forest-50" : "border-cream-200 hover:border-cream-300"}`}>
                      <input type="checkbox" checked={selected} onChange={() => toggleExtra(prod)} className="accent-forest-600" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-forest-900 truncate">{prod.nombre}</div>
                        <div className="text-xs text-honey-600">{formatCLP(prod.precio_clp)}/persona</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {extras.length > 0 && (
                <div className="mt-3 pt-3 border-t border-cream-200 text-sm flex justify-between">
                  <span className="text-forest-600">Extras</span>
                  <span className="font-semibold text-honey-600">+ {formatCLP(precioExtras)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {disponibilidad?.disponible && (
        <div className="bg-forest-800 rounded-2xl p-6 text-cream-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-cream-300 text-sm">Total a pagar</div>
              <div className="font-display text-3xl text-honey-400">{formatCLP(precioTotal)}</div>
              <div className="text-cream-400 text-xs mt-1">
                {noches} noche{noches !== 1 ? "s" : ""} · {personas} persona{personas !== 1 ? "s" : ""}
                {extras.length > 0 && ` · ${extras.length} extra${extras.length !== 1 ? "s" : ""}`}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onBack} className="btn-secondary border-cream-400 text-cream-200 hover:bg-cream-200 hover:text-forest-900">← Atrás</button>
              <button
                onClick={() => onContinue(format(selInicio!, "yyyy-MM-dd"), format(selFin!, "yyyy-MM-dd"), personas, precioTotal, noches, extras)}
                disabled={!puedeContinuar}
                className="btn-honey"
              >Continuar →</button>
            </div>
          </div>
        </div>
      )}

      {(!selInicio || !selFin) && (
        <div className="flex justify-between">
          <button onClick={onBack} className="btn-secondary">← Atrás</button>
        </div>
      )}
    </div>
  );
}
