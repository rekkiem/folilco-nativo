"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import type { Producto } from "@/types";
import ProductSelector from "./ProductSelector";
import GuestForm from "./GuestForm";
import BookingSummary from "./BookingSummary";

const DatePicker = dynamic(() => import("./DatePicker"), {
  loading: () => (
    <div className="space-y-8" aria-busy="true">
      <div className="h-8 skeleton rounded w-56" />
      <div className="card p-5">
        <div className="skeleton h-80 rounded-xl" />
      </div>
    </div>
  ),
});

export type BookingStep = "producto" | "fechas" | "datos" | "resumen";

export interface BookingState {
  paso: BookingStep;
  producto: Producto | null;
  fechaInicio: string;
  fechaFin: string;
  cantidadPersonas: number;
  extras: { producto_id: string; nombre: string; precio: number; cantidad: number }[];
  huespedNombre: string;
  huespedEmail: string;
  huespedTelefono: string;
  huespedRut: string;
  huespedNota: string;
  precioTotal: number;
  noches: number;
}

const INITIAL: BookingState = {
  paso: "producto",
  producto: null,
  fechaInicio: "",
  fechaFin: "",
  cantidadPersonas: 1,
  extras: [],
  huespedNombre: "",
  huespedEmail: "",
  huespedTelefono: "",
  huespedRut: "",
  huespedNota: "",
  precioTotal: 0,
  noches: 0,
};

const PASOS: { key: BookingStep; label: string; n: number }[] = [
  { key: "producto", label: "Elige", n: 1 },
  { key: "fechas", label: "Fechas", n: 2 },
  { key: "datos", label: "Datos", n: 3 },
  { key: "resumen", label: "Pago", n: 4 },
];

export default function BookingFlow() {
  const [state, setState] = useState<BookingState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback((partial: Partial<BookingState>) => {
    setState((prev) => ({ ...prev, ...partial }));
    setError(null);
  }, []);

  const irA = (paso: BookingStep) => update({ paso });

  const handleConfirmar = async () => {
    if (!state.producto) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: state.producto.id,
          fecha_inicio: state.fechaInicio,
          fecha_fin: state.fechaFin,
          cantidad_personas: state.cantidadPersonas,
          huesped_nombre: state.huespedNombre,
          huesped_email: state.huespedEmail,
          huesped_telefono: state.huespedTelefono,
          huesped_rut: state.huespedRut || undefined,
          huesped_nota: state.huespedNota || undefined,
          extras: state.extras.map((e) => ({
            producto_id: e.producto_id,
            cantidad: e.cantidad,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al crear la reserva. Intenta nuevamente.");
        return;
      }

      // Redirigir al checkout de MercadoPago
      window.location.href = data.mp_init_point;
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const pasoActualIdx = PASOS.findIndex((p) => p.key === state.paso);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Stepper */}
      <div className="flex items-center justify-center mb-10">
        {PASOS.map((p, i) => (
          <div key={p.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  i < pasoActualIdx
                    ? "bg-forest-600 text-white"
                    : i === pasoActualIdx
                    ? "bg-honey-400 text-forest-900"
                    : "bg-cream-200 text-forest-400"
                }`}
              >
                {i < pasoActualIdx ? "✓" : p.n}
              </div>
              <div
                className={`text-xs mt-1.5 font-medium hidden sm:block ${
                  i === pasoActualIdx ? "text-forest-900" : "text-forest-400"
                }`}
              >
                {p.label}
              </div>
            </div>
            {i < PASOS.length - 1 && (
              <div
                className={`w-16 sm:w-24 h-0.5 mx-2 transition-all ${
                  i < pasoActualIdx ? "bg-forest-600" : "bg-cream-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error global */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 flex gap-3">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Steps */}
      {state.paso === "producto" && (
        <ProductSelector
          selected={state.producto}
          onSelect={(p) => {
            update({ producto: p, fechaInicio: "", fechaFin: "" });
            irA("fechas");
          }}
        />
      )}

      {state.paso === "fechas" && state.producto && (
        <DatePicker
          producto={state.producto}
          fechaInicio={state.fechaInicio}
          fechaFin={state.fechaFin}
          cantidadPersonas={state.cantidadPersonas}
          extras={state.extras}
          onContinue={(fi, ff, np, precio, noches, extras) => {
            update({
              fechaInicio: fi,
              fechaFin: ff,
              cantidadPersonas: np,
              precioTotal: precio,
              noches,
              extras,
            });
            irA("datos");
          }}
          onBack={() => irA("producto")}
        />
      )}

      {state.paso === "datos" && (
        <GuestForm
          nombre={state.huespedNombre}
          email={state.huespedEmail}
          telefono={state.huespedTelefono}
          rut={state.huespedRut}
          nota={state.huespedNota}
          onContinue={(datos) => {
            update(datos);
            irA("resumen");
          }}
          onBack={() => irA("fechas")}
        />
      )}

      {state.paso === "resumen" && state.producto && (
        <BookingSummary
          state={state}
          loading={loading}
          onConfirmar={handleConfirmar}
          onBack={() => irA("datos")}
        />
      )}
    </div>
  );
}
