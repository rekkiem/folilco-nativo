import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "¡Reserva Confirmada!" };

// Next.js 15: searchParams es una Promise y debe awaitearse
interface Props {
  searchParams: Promise<{ ref?: string; estado?: string }>;
}

export default async function GraciasPage({ searchParams }: Props) {
  const params = await searchParams;
  const isPendiente = params.estado === "pendiente";

  return (
    <div className="min-h-screen bg-forest-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="text-8xl mb-6">{isPendiente ? "⏳" : "🎉"}</div>

        <h1 className="font-display text-4xl text-cream-50 mb-4">
          {isPendiente ? "Pago en proceso" : "¡Reserva confirmada!"}
        </h1>

        <p className="text-cream-300 text-lg mb-8">
          {isPendiente
            ? "Tu pago está siendo procesado. Te avisaremos en cuanto se confirme."
            : "En pocos minutos recibirás un WhatsApp con las instrucciones de llegada a Folilco Nativo."}
        </p>

        <div className="bg-forest-800/60 border border-forest-700/50 rounded-2xl p-6 mb-8 text-left space-y-3">
          {[
            { icon: "📱", titulo: "WhatsApp de confirmación", desc: "Revisa tu WhatsApp en los próximos minutos." },
            { icon: "📧", titulo: "Confirmación por email", desc: "Revisa también tu carpeta de spam si no lo ves." },
            { icon: "🕐", titulo: "Check-in desde las 15:00 hrs", desc: "Te contactaremos antes de tu llegada." },
          ].map((item) => (
            <div key={item.titulo} className="flex items-start gap-3 text-cream-200 text-sm">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <div className="font-medium text-cream-100">{item.titulo}</div>
                <div className="text-cream-400">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="btn-secondary border-cream-400 text-cream-200 hover:bg-cream-200 hover:text-forest-900">
            Volver al inicio
          </Link>
          <a
            href="https://wa.me/56912345678"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-honey"
          >
            💬 Contactar a la cooperativa
          </a>
        </div>
      </div>
    </div>
  );
}
