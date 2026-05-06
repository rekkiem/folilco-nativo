"use client";

import { useState, useEffect } from "react";

interface ProductoStock {
  id: string;
  nombre: string;
  tipo: string;
  stock_actual: number;
  stock_minimo: number;
  precio_clp: number;
  socio_responsable: string | null;
}

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n);
}

export default function AdminStockClient() {
  const [productos, setProductos] = useState<ProductoStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/admin/stock")
      .then((r) => r.json())
      .then((data) => {
        setProductos(data);
        setLoading(false);
      });
  }, []);

  const guardar = async (id: string) => {
    const nuevoStock = editando[id];
    if (nuevoStock === undefined) return;
    setSaving(id);

    const res = await fetch("/api/admin/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stock_actual: nuevoStock }),
    });

    if (res.ok) {
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock_actual: nuevoStock } : p))
      );
      setSaved((prev) => ({ ...prev, [id]: true }));
      setEditando((prev) => { const n = { ...prev }; delete n[id]; return n; });
      setTimeout(() => setSaved((prev) => ({ ...prev, [id]: false })), 2000);
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 skeleton bg-gray-800 rounded-xl" />)}
      </div>
    );
  }

  const alertas = productos.filter((p) => p.stock_actual !== null && p.stock_actual <= p.stock_minimo);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Control de Stock</h1>
        <p className="text-gray-400 text-sm mt-1">Productos físicos de la cooperativa</p>
      </div>

      {alertas.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 mb-6">
          <div className="font-semibold text-yellow-400 mb-2">⚠️ {alertas.length} producto{alertas.length !== 1 ? "s" : ""} bajo stock mínimo</div>
          <div className="space-y-1">
            {alertas.map((p) => (
              <div key={p.id} className="text-sm text-yellow-300">
                {p.nombre}: {p.stock_actual} unidades (mínimo {p.stock_minimo})
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {productos.map((p) => {
          const enEdicion = editando[p.id] !== undefined;
          const stockActual = enEdicion ? editando[p.id] : p.stock_actual;
          const bajMinimo = stockActual <= p.stock_minimo;

          return (
            <div
              key={p.id}
              className={`bg-gray-900 border rounded-xl p-5 flex items-center gap-6 ${
                bajMinimo ? "border-yellow-700/50" : "border-gray-800"
              }`}
            >
              <div className="flex-1">
                <div className="text-gray-100 font-medium">{p.nombre}</div>
                <div className="text-gray-500 text-sm">
                  {p.socio_responsable ?? "—"} · {formatCLP(p.precio_clp)}/unidad
                </div>
                <div className="text-xs text-gray-600 mt-1">Stock mínimo: {p.stock_minimo} unidades</div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`text-center ${bajMinimo ? "text-yellow-400" : "text-emerald-400"}`}>
                  <div className="text-2xl font-bold">{p.stock_actual}</div>
                  <div className="text-xs text-gray-500">en stock</div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={enEdicion ? editando[p.id] : p.stock_actual}
                    onChange={(e) =>
                      setEditando((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                    }
                    className="w-20 bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => guardar(p.id)}
                    disabled={!enEdicion || saving === p.id}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      saved[p.id]
                        ? "bg-emerald-700 text-white"
                        : enEdicion
                        ? "bg-emerald-700 hover:bg-emerald-600 text-white"
                        : "bg-gray-800 text-gray-600 cursor-not-allowed"
                    }`}
                  >
                    {saving === p.id ? "…" : saved[p.id] ? "✓" : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-500">
        💡 <strong className="text-gray-400">Tip:</strong> Los cambios de stock se sincronizan automáticamente con Google Sheets en la hoja <code className="bg-gray-800 px-1 rounded">stock</code>.
        Cuando un producto llega al stock mínimo, recibirás una alerta por email.
      </div>
    </div>
  );
}
