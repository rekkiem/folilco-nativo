"use client";

import { memo } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { BookingState } from "./BookingFlow";

interface Props {
  state: BookingState;
  loading: boolean;
  onConfirmar: () => void;
  onBack: () => void;
}

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(n);
}

function BookingSummary({ state, loading, onConfirmar, onBack }: Props) {
  const { producto, fechaInicio, fechaFin, cantidadPersonas, extras, precioTotal, noches } = state;
  if (!producto) return null;

  const precioBase = precioTotal - extras.reduce((a, e) => a + e.precio * e.cantidad, 0);

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="font-display text-2xl text-forest-900 mb-1">Revisa tu reserva</h2>
        <p className="text-forest-500 text-sm">
          Todo listo. Al confirmar serás redirigido al pago seguro con MercadoPago.
        </p>
      </div>

      {/* Detalles principales */}
      <div className="card p-6 mb-5">
        <div className="flex gap-4">
          {producto.imagen_url && (
            <Image
              src={producto.imagen_url}
              alt={producto.nombre}
              width={96}
              height={96}
              sizes="96px"
              className="rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div>
            <h3 className="font-display text-xl text-forest-900">{producto.nombre}</h3>
            <div className="text-sm text-forest-600 mt-1">{producto.descripcion}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-cream-200">
          <div>
            <div className="text-xs text-forest-500 uppercase tracking-wide mb-1">Check-in</div>
            <div className="font-medium text-forest-900">
              {format(parseISO(fechaInicio), "EEEE d MMM yyyy", { locale: es })}
            </div>
          </div>
          <div>
            <div className="text-xs text-forest-500 uppercase tracking-wide mb-1">Check-out</div>
            <div className="font-medium text-forest-900">
              {format(parseISO(fechaFin), "EEEE d MMM yyyy", { locale: es })}
            </div>
          </div>
          <div>
            <div className="text-xs text-forest-500 uppercase tracking-wide mb-1">Duración</div>
            <div className="font-medium">{noches} noche{noches !== 1 ? "s" : ""}</div>
          </div>
          <div>
            <div className="text-xs text-forest-500 uppercase tracking-wide mb-1">Personas</div>
            <div className="font-medium">{cantidadPersonas}</div>
          </div>
        </div>
      </div>

      {/* Datos del huésped */}
      <div className="card p-6 mb-5">
        <h3 className="font-semibold text-forest-900 mb-4 text-sm uppercase tracking-wide">
          Datos del huésped
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-forest-500">Nombre</span>
            <span className="font-medium">{state.huespedNombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-500">Email</span>
            <span className="font-medium">{state.huespedEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-500">WhatsApp</span>
            <span className="font-medium">{state.huespedTelefono}</span>
          </div>
          {state.huespedNota && (
            <div>
              <span className="text-forest-500">Nota</span>
              <p className="text-forest-700 mt-1 bg-cream-50 p-2 rounded text-xs">{state.huespedNota}</p>
            </div>
          )}
        </div>
      </div>

      {/* Desglose de precio */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-forest-900 mb-4 text-sm uppercase tracking-wide">
          Desglose
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-forest-600">
              {producto.nombre} × {noches} noche{noches !== 1 ? "s" : ""}
            </span>
            <span>{formatCLP(precioBase)}</span>
          </div>
          {extras.map((e) => (
            <div key={e.producto_id} className="flex justify-between">
              <span className="text-forest-600">
                {e.nombre} × {e.cantidad}
              </span>
              <span>{formatCLP(e.precio * e.cantidad)}</span>
            </div>
          ))}
          <div className="border-t border-cream-200 pt-3 flex justify-between font-semibold text-base">
            <span>Total</span>
            <span className="text-honey-600">{formatCLP(precioTotal)}</span>
          </div>
        </div>
      </div>

      {/* Info pago */}
      <div className="bg-forest-50 border border-forest-200 rounded-xl p-4 mb-6 text-sm text-forest-700">
        <div className="font-medium mb-2">🔒 Pago seguro con MercadoPago</div>
        <ul className="space-y-1 text-forest-600 text-xs">
          <li>✅ Débito, crédito y transferencia bancaria</li>
          <li>✅ Confirmación instantánea por email y WhatsApp</li>
          <li>✅ El cargo solo se realiza al confirmar el pago</li>
        </ul>
      </div>

      <div className="flex gap-4">
        <button onClick={onBack} className="btn-secondary flex-1" disabled={loading}>
          ← Atrás
        </button>
        <button
          onClick={onConfirmar}
          disabled={loading}
          className="btn-honey flex-1 relative"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Procesando…
            </>
          ) : (
            "💳 Ir a pagar"
          )}
        </button>
      </div>
    </div>
  );
}

export default memo(BookingSummary);
