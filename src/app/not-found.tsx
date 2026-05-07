import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-forest-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-8xl mb-6">🌲</div>
        <h1 className="font-display text-5xl text-honey-400 mb-2">404</h1>
        <h2 className="font-display text-2xl text-cream-50 mb-4">
          Página no encontrada
        </h2>
        <p className="text-cream-300 mb-8">
          Parece que te perdiste en el bosque. Esta página no existe o fue movida.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-forest-600 hover:bg-forest-500 text-cream-50 font-medium px-6 py-3 rounded-lg transition-colors inline-block"
          >
            🏡 Volver al inicio
          </Link>
          <Link
            href="/reservar"
            className="border border-honey-400 text-honey-400 hover:bg-honey-400 hover:text-forest-900 font-medium px-6 py-3 rounded-lg transition-colors inline-block"
          >
            Reservar ahora
          </Link>
        </div>
      </div>
    </div>
  );
}
