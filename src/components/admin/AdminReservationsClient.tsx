"use client";

import { useState, useEffect, useCallback } from "react";
import type { Reserva } from "@/types";

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n);
}

const ESTADO_COLORS: Record<string, string> = {
  confirmada: "bg-emerald-900/40 text-emerald-400 border-emerald-700/50",
  pendiente: "bg-yellow-900/40 text-yellow-400 border-yellow-700/50",
  cancelada: "bg-red-900/40 text-red-400 border-red-700/50",
  completada: "bg-blue-900/40 text-blue-400 border-blue-700/50",
  no_show: "bg-gray-800 text-gray-400 border-gray-700",
};

export default function AdminReservationsClient() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [search, setSearch] = useState("");

  const fetchReservas = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filtroEstado) params.set("estado", filtroEstado);
    const res = await fetch(`/api/admin/reservations?${params}`);
    const data = await res.json();
    setReservas(data.reservas ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [filtroEstado, page]);

  useEffect(() => { fetchReservas(); }, [fetchReservas]);

  const cambiarEstado = async (id: string, estado: string) => {
    await fetch(`/api/admin/reservations?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    fetchReservas();
  };

  const filtradas = search
    ? reservas.filter((r) =>
        r.huesped_nombre.toLowerCase().includes(search.toLowerCase()) ||
        r.numero.includes(search) ||
        r.huesped_email.includes(search)
      )
    : reservas;

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Reservas</h1>
          <p className="text-gray-400 text-sm">{total} en total</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, email o N°…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
        />
        <select
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todos los estados</option>
          <option value="confirmada">Confirmada</option>
          <option value="pendiente">Pendiente</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
          <option value="no_show">No show</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide bg-gray-800/50">
                <th className="px-4 py-3">N°</th>
                <th className="px-4 py-3">Huésped</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Fechas</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">WA</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="skeleton h-4 rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtradas.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.numero}</td>
                      <td className="px-4 py-3">
                        <div className="text-gray-200 font-medium">{r.huesped_nombre}</div>
                        <div className="text-gray-500 text-xs">{r.huesped_telefono}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-[140px] truncate">{r.producto_nombre}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        <div>{r.fecha_inicio}</div>
                        <div>{r.fecha_fin}</div>
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-semibold">{formatCLP(r.precio_total_clp)}</td>
                      <td className="px-4 py-3 text-center">
                        <span title={r.wa_confirmacion_sent ? "Enviado" : "Pendiente"}>
                          {r.wa_confirmacion_sent ? "✅" : "⏳"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${ESTADO_COLORS[r.estado] ?? ""}`}>
                          {r.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          defaultValue={r.estado}
                          onChange={(e) => cambiarEstado(r.id, e.target.value)}
                          className="bg-gray-800 border border-gray-700 text-gray-300 rounded text-xs px-2 py-1 focus:outline-none"
                        >
                          <option value="confirmada">Confirmar</option>
                          <option value="cancelada">Cancelar</option>
                          <option value="completada">Completar</option>
                          <option value="no_show">No show</option>
                        </select>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30"
            >
              ← Anterior
            </button>
            <span className="text-xs text-gray-500">
              Página {page} de {pages}
            </span>
            <button
              onClick={() => setPage(Math.min(pages, page + 1))}
              disabled={page === pages}
              className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
