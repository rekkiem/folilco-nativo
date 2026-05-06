"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { format } from "date-fns";
import type { Reserva } from "@/types";

// ── Tipos concretos para los datos del dashboard ──────────
interface OcupacionMes {
  mes: string;
  reservas: number;
  ingresos: number;
}

interface TopProducto {
  nombre: string;
  reservas: number;
  ingresos: number;
}

interface StockAlerta {
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
}

interface DashboardResponse {
  periodo: { desde: string; hasta: string };
  resumen: {
    total_reservas: number;
    reservas_confirmadas: number;
    ingresos_clp: number;
    comision_clp: number;
    tasa_ocupacion: number;
  };
  ingresos_por_linea: { alojamiento: number; experiencias: number; productos: number };
  ocupacion_mensual: OcupacionMes[];
  top_productos: TopProducto[];
  stock_alertas: StockAlerta[];
  reservas_recientes: Reserva[];
}

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency", currency: "CLP", minimumFractionDigits: 0,
    notation: n >= 1_000_000 ? "compact" : "standard",
  }).format(n);
}

const ESTADO_COLORS: Record<string, string> = {
  confirmada: "bg-emerald-900/40 text-emerald-400 border-emerald-700/50",
  pendiente: "bg-yellow-900/40 text-yellow-400 border-yellow-700/50",
  cancelada: "bg-red-900/40 text-red-400 border-red-700/50",
  completada: "bg-blue-900/40 text-blue-400 border-blue-700/50",
  no_show: "bg-gray-800 text-gray-400 border-gray-700",
};

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b"];

export default function AdminDashboardClient() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mes, setMes] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/dashboard?mes=${mes}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<DashboardResponse>;
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [mes]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-xl skeleton bg-gray-800" />)}
        </div>
        <div className="h-64 rounded-xl skeleton bg-gray-800" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-gray-400">{error ?? "Error cargando datos"}</p>
        <button
          onClick={() => setMes((m) => m)}
          className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const pieData = [
    { name: "Alojamiento", value: data.ingresos_por_linea.alojamiento },
    { name: "Experiencias", value: data.ingresos_por_linea.experiencias },
    { name: "Productos", value: data.ingresos_por_linea.productos },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-400 text-sm">Cooperativa Folilco Nativo</p>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Reservas", value: data.resumen.total_reservas, sub: `${data.resumen.reservas_confirmadas} confirmadas`, icon: "📋", alert: false },
          { label: "Ingresos", value: formatCLP(data.resumen.ingresos_clp), sub: `Comisión: ${formatCLP(data.resumen.comision_clp)}`, icon: "💰", alert: false },
          { label: "Ocupación", value: `${data.resumen.tasa_ocupacion}%`, sub: "alojamientos del mes", icon: "🏡", alert: false },
          {
            label: "Alertas stock", value: data.stock_alertas.length,
            sub: data.stock_alertas.length > 0 ? "⚠️ Reabastecer" : "✅ Todo OK",
            icon: "📦", alert: data.stock_alertas.length > 0,
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-gray-900 border rounded-xl p-5 ${kpi.alert ? "border-yellow-700/50" : "border-gray-800"}`}>
            <div className="text-2xl mb-2">{kpi.icon}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</div>
            <div className="text-2xl font-bold text-gray-100 mt-1">{kpi.value}</div>
            <div className={`text-xs mt-1 ${kpi.alert ? "text-yellow-400" : "text-gray-500"}`}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">Ingresos últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.ocupacion_mensual} barSize={30}>
              <XAxis dataKey="mes" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#d1d5db" }}
                formatter={(v: number) => [formatCLP(v), "Ingresos"]}
              />
              <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">Por línea</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                    formatter={(v: number) => [formatCLP(v)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-gray-400">{d.name}</span>
                    </div>
                    <span className="text-gray-300 font-medium">{formatCLP(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* Bottom */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">🏆 Top productos</h2>
          {data.top_productos.length > 0 ? (
            <div className="space-y-3">
              {data.top_productos.map((p, i) => (
                <div key={p.nombre} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-900/50 text-emerald-400 flex items-center justify-center text-sm font-bold">{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-200 font-medium truncate">{p.nombre}</div>
                    <div className="text-xs text-gray-500">{p.reservas} reserva{p.reservas !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-400">{formatCLP(p.ingresos)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-600 text-sm">Sin reservas en este período</div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">📦 Alertas de stock</h2>
          {data.stock_alertas.length > 0 ? (
            <div className="space-y-3">
              {data.stock_alertas.map((s) => (
                <div key={s.nombre} className="flex items-center justify-between p-3 bg-yellow-900/20 border border-yellow-700/40 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-200">{s.nombre}</div>
                    <div className="text-xs text-gray-500">Mínimo: {s.stock_minimo}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold">{s.stock_actual}</div>
                    <div className="text-xs text-gray-500">quedan</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span className="text-2xl">✅</span>
              <span>Stock suficiente en todos los productos</span>
            </div>
          )}
        </div>
      </div>

      {/* Reservas recientes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Reservas recientes</h2>
          <a href="/admin/reservations" className="text-xs text-emerald-400 hover:text-emerald-300">Ver todas →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-800">
                <th className="pb-3 pr-4">N°</th>
                <th className="pb-3 pr-4">Huésped</th>
                <th className="pb-3 pr-4">Producto</th>
                <th className="pb-3 pr-4">Llegada</th>
                <th className="pb-3 pr-4">Total</th>
                <th className="pb-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data.reservas_recientes.map((r) => (
                <tr key={r.id} className="hover:bg-gray-800/50">
                  <td className="py-3 pr-4 font-mono text-xs text-gray-400">{r.numero}</td>
                  <td className="py-3 pr-4 text-gray-200">{r.huesped_nombre}</td>
                  <td className="py-3 pr-4 text-gray-400 max-w-[150px] truncate">{r.producto_nombre}</td>
                  <td className="py-3 pr-4 text-gray-400">{r.fecha_inicio}</td>
                  <td className="py-3 pr-4 text-emerald-400 font-medium">{formatCLP(r.precio_total_clp)}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${ESTADO_COLORS[r.estado] ?? ""}`}>
                      {r.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.reservas_recientes.length === 0 && (
            <div className="text-center py-8 text-gray-600 text-sm">Sin reservas en este período</div>
          )}
        </div>
      </div>
    </div>
  );
}
