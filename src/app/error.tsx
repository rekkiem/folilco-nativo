"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Log to monitoring service in production
    logger.error("[GlobalError]", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-screen bg-forest-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl mb-6">🌿</div>
        <h1 className="font-display text-3xl text-cream-50 mb-4">
          Algo salió mal
        </h1>
        <p className="text-cream-300 mb-2">
          Ocurrió un error inesperado. Nuestro equipo ya fue notificado.
        </p>
        {error.digest && (
          <p className="text-cream-500 text-xs mb-6 font-mono">
            Código: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-forest-600 hover:bg-forest-500 text-cream-50 font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="border border-cream-400 text-cream-200 hover:bg-cream-200 hover:text-forest-900 font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
