"use client";

import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const update = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      if (offline) setShowBanner(true);
    };

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Al reconectar, ocultar el banner después de 3 segundos
  useEffect(() => {
    if (!isOffline && showBanner) {
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, showBanner]);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${
        isOffline
          ? "bg-amber-900/95 border border-amber-700/60 text-amber-100"
          : "bg-emerald-800/95 border border-emerald-600/60 text-emerald-100"
      }`}
      role="alert"
    >
      <span className="text-xl">{isOffline ? "📵" : "✅"}</span>
      <div className="flex-1 text-sm">
        {isOffline ? (
          <>
            <strong>Sin conexión</strong> — Mostrando disponibilidad guardada.
            El pago requiere internet.
          </>
        ) : (
          <>
            <strong>¡Conexión restaurada!</strong> — Actualizando disponibilidad…
          </>
        )}
      </div>
    </div>
  );
}
