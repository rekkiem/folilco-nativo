import type { Metadata } from "next";
import BookingFlow from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Reservar",
  description: "Reserva tu estadía o experiencia en Folilco Nativo. Pago seguro con MercadoPago.",
};

// Next.js 15: searchParams es Promise
interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function ReservarPage({ searchParams }: Props) {
  const params = await searchParams;
  const errorMsg =
    params.error === "pago_fallido"
      ? "El pago no pudo procesarse. Por favor intenta nuevamente."
      : null;

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="bg-forest-900 py-10">
        <div className="max-w-4xl mx-auto px-4">
          <a
            href="/"
            className="text-cream-400 hover:text-honey-400 text-sm transition-colors mb-4 inline-flex items-center gap-2"
          >
            ← Volver al inicio
          </a>
          <h1 className="font-display text-3xl md:text-4xl text-cream-50 mt-2">
            Haz tu reserva
          </h1>
          <p className="text-cream-300 mt-2">
            Pago seguro · Confirmación inmediata · WhatsApp automático
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 flex gap-3">
            <span>⚠️</span>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      <BookingFlow />
    </div>
  );
}
