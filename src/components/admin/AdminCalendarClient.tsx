"use client";

import { useState, useEffect } from "react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval,
} from "date-fns";
import { es } from "date-fns/locale";
import type { Producto } from "@/types";

export default function AdminCalendarClient() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selProd, setSelProd] = useState<string>("");
  const [mes, setMes] = useState(new Date());
  const [bloqueadas, setBloqueadas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Nuevo bloqueo
  const [bloqueoInicio, setBloqueoInicio] = useState("");
  const [bloqueoFin, setBloqueoFin] = useState("");
  const [bloqueoMotivo, setBloqueoMotivo] = useState("Mantenimiento");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Producto[]) => {
        const aloj = data.filter((p) => p.tipo === "alojamiento");
        setProductos(aloj);
        if (aloj.length > 0) setSelProd(aloj[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selProd) return;
    setLoading(true);
    const mesStr = format(mes, "yyyy-MM");
    fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producto_id: selProd, mes: mesStr }),
    })
      .then((r) => r.json())
      .then((d) => {
        setBloqueadas(new Set(d.fechas_bloqueadas ?? []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selProd, mes]);

  const agregarBloqueo = async () => {
    if (!selProd || !bloqueoInicio || !bloqueoFin) return;
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        producto_id: selProd,
        fecha_inicio: bloqueoInicio,
        fecha_fin: bloqueoFin,
        motivo: bloqueoMotivo,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg({ tipo: "ok", texto: "Bloqueo agregado correctamente" });
      setBloqueoInicio(""); setBloqueoFin("");
      // Refrescar calendar
      setMes((m) => new Date(m));
    } else {
      const d = await res.json();
      setMsg({ tipo: "error", texto: d.error ?? "Error al agregar bloqueo" });
    }
  };

  const primerDia = startOfMonth(mes);
  const ultimoDia = endOfMonth(mes);
  const diasMes = eachDayOfInterval({ start: primerDia, end: ultimoDia });
  const pad = (primerDia.getDay() + 6) % 7;
  const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Calendario de Ocupación</h1>
        <p className="text-gray-400 text-sm mt-1">Visualiza disponibilidad y bloquea fechas manualmente</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Calendario */}
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          {/* Selector de producto */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <select
              value={selProd}
              onChange={(e) => setSelProd(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setMes(subMonths(mes, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
              >‹</button>
              <span className="text-gray-200 font-medium capitalize text-sm">
                {format(mes, "MMMM yyyy", { locale: es })}
              </span>
              <button
                onClick={() => setMes(addMonths(mes, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
              >›</button>
            </div>
          </div>

          {/* Cabecera días */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DIAS.map((d) => (
              <div key={d} className="text-center text-xs text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Días */}
          <div className={`grid grid-cols-7 gap-1 ${loading ? "opacity-50" : ""}`}>
            {Array.from({ length: pad }).map((_, i) => <div key={`p-${i}`} />)}
            {diasMes.map((date) => {
              const str = format(date, "yyyy-MM-dd");
              const bloq = bloqueadas.has(str);
              return (
                <div
                  key={str}
                  title={bloq ? "Ocupado / Bloqueado" : "Disponible"}
                  className={`h-10 rounded-lg flex items-center justify-center text-sm font-medium ${
                    bloq
                      ? "bg-red-900/60 text-red-400 border border-red-700/50"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  {format(date, "d")}
                </div>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="flex gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-900/60 border border-red-700/50 inline-block" />
              Ocupado / Bloqueado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gray-800 inline-block" />
              Disponible
            </span>
          </div>

          {/* Link ICS */}
          {selProd && (
            <div className="mt-5 p-3 bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">URL para Airbnb / Booking:</div>
              <div className="font-mono text-xs text-emerald-400 break-all">
                {typeof window !== "undefined" ? window.location.origin : ""}/api/ics?producto_id={selProd}
              </div>
            </div>
          )}
        </div>

        {/* Panel bloqueo manual */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
            Bloquear fechas
          </h2>

          {msg && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              msg.tipo === "ok"
                ? "bg-emerald-900/30 border border-emerald-700/50 text-emerald-400"
                : "bg-red-900/30 border border-red-700/50 text-red-400"
            }`}>
              {msg.texto}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Desde</label>
              <input
                type="date"
                value={bloqueoInicio}
                onChange={(e) => setBloqueoInicio(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Hasta</label>
              <input
                type="date"
                value={bloqueoFin}
                onChange={(e) => setBloqueoFin(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Motivo</label>
              <select
                value={bloqueoMotivo}
                onChange={(e) => setBloqueoMotivo(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option>Mantenimiento</option>
                <option>Uso personal</option>
                <option>Reserva externa (Airbnb)</option>
                <option>Temporada baja</option>
                <option>Otro</option>
              </select>
            </div>
            <button
              onClick={agregarBloqueo}
              disabled={saving || !bloqueoInicio || !bloqueoFin}
              className="w-full bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? "Guardando…" : "🔒 Bloquear fechas"}
            </button>
          </div>

          <div className="mt-5 p-3 bg-gray-800 rounded-lg text-xs text-gray-500">
            💡 Las fechas bloqueadas no aparecerán disponibles en el formulario de reserva público.
          </div>
        </div>
      </div>
    </div>
  );
}
