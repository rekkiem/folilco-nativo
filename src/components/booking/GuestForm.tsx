"use client";

import { useState } from "react";

interface GuestData {
  huespedNombre: string;
  huespedEmail: string;
  huespedTelefono: string;
  huespedRut: string;
  huespedNota: string;
}

interface Props {
  nombre: string;
  email: string;
  telefono: string;
  rut: string;
  nota: string;
  onContinue: (datos: GuestData) => void;
  onBack: () => void;
}

export default function GuestForm({ nombre, email, telefono, rut, nota, onContinue, onBack }: Props) {
  const [form, setForm] = useState<GuestData>({
    huespedNombre: nombre,
    huespedEmail: email,
    huespedTelefono: telefono,
    huespedRut: rut,
    huespedNota: nota,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof GuestData, string>>>({});

  const set = (k: keyof GuestData, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validar = () => {
    const errs: Partial<Record<keyof GuestData, string>> = {};
    if (form.huespedNombre.trim().length < 3)
      errs.huespedNombre = "Ingresa tu nombre completo";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.huespedEmail))
      errs.huespedEmail = "Email inválido";
    if (form.huespedTelefono.replace(/\D/g, "").length < 8)
      errs.huespedTelefono = "Teléfono inválido (incluye código de país +56…)";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (validar()) onContinue(form);
  };

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h2 className="font-display text-2xl text-forest-900 mb-1">Tus datos</h2>
        <p className="text-forest-500 text-sm">
          Necesitamos estos datos para enviarte la confirmación y el WhatsApp de llegada.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-forest-700 mb-1.5">
            Nombre completo *
          </label>
          <input
            type="text"
            value={form.huespedNombre}
            onChange={(e) => set("huespedNombre", e.target.value)}
            placeholder="María González"
            className={`input-field ${errors.huespedNombre ? "border-red-400 ring-1 ring-red-400" : ""}`}
            autoComplete="name"
          />
          {errors.huespedNombre && (
            <p className="text-red-500 text-xs mt-1">{errors.huespedNombre}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-forest-700 mb-1.5">
            Email *
          </label>
          <input
            type="email"
            value={form.huespedEmail}
            onChange={(e) => set("huespedEmail", e.target.value)}
            placeholder="maria@ejemplo.com"
            className={`input-field ${errors.huespedEmail ? "border-red-400 ring-1 ring-red-400" : ""}`}
            autoComplete="email"
          />
          {errors.huespedEmail && (
            <p className="text-red-500 text-xs mt-1">{errors.huespedEmail}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-forest-700 mb-1.5">
            WhatsApp / Teléfono *
          </label>
          <input
            type="tel"
            value={form.huespedTelefono}
            onChange={(e) => set("huespedTelefono", e.target.value)}
            placeholder="+56 9 1234 5678"
            className={`input-field ${errors.huespedTelefono ? "border-red-400 ring-1 ring-red-400" : ""}`}
            autoComplete="tel"
          />
          {errors.huespedTelefono && (
            <p className="text-red-500 text-xs mt-1">{errors.huespedTelefono}</p>
          )}
          <p className="text-forest-400 text-xs mt-1">
            📱 Te enviaremos la confirmación e instrucciones de llegada por WhatsApp
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-forest-700 mb-1.5">
            RUT (opcional, para boleta)
          </label>
          <input
            type="text"
            value={form.huespedRut}
            onChange={(e) => set("huespedRut", e.target.value)}
            placeholder="12.345.678-9"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-forest-700 mb-1.5">
            ¿Algún comentario o solicitud especial?
          </label>
          <textarea
            value={form.huespedNota}
            onChange={(e) => set("huespedNota", e.target.value)}
            placeholder="Alergias, llegada tardía, celebración especial…"
            rows={3}
            className="input-field resize-none"
            maxLength={500}
          />
        </div>
      </div>

      {/* Aviso de privacidad */}
      <div className="mt-6 p-4 bg-cream-100 rounded-xl text-xs text-forest-500">
        🔒 Tus datos son usados exclusivamente para gestionar tu reserva. 
        No los compartimos con terceros. El pago se procesa de forma segura a través de MercadoPago.
      </div>

      <div className="flex gap-4 mt-8">
        <button onClick={onBack} className="btn-secondary flex-1">
          ← Atrás
        </button>
        <button onClick={handleSubmit} className="btn-honey flex-1">
          Revisar reserva →
        </button>
      </div>
    </div>
  );
}
