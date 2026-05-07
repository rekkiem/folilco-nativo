import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

// ─── SEO Metadata ─────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: "Folilco Nativo – Turismo Rural Cooperativo",
    template: "%s | Folilco Nativo",
  },
  description:
    "Vive el sur de Chile auténtico. Cabañas, domos, cabalgatas y productos artesanales en el corazón del bosque nativo.",
  keywords: [
    "turismo rural",
    "sur de Chile",
    "cooperativa agroturística",
    "cabañas sur Chile",
    "domos patagonia",
    "ecoturismo Chile",
    "Los Ríos turismo",
  ],
  authors: [{ name: "Cooperativa Folilco Nativo" }],
  creator: "Cooperativa Folilco Nativo",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://folilco.com"),
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "/",
    siteName: "Folilco Nativo",
    title: "Folilco Nativo – Turismo Rural Cooperativo",
    description:
      "Vive el sur de Chile auténtico. Cabañas, domos, cabalgatas y productos artesanales.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Folilco Nativo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Folilco Nativo – Turismo Rural Cooperativo",
    description: "Cabañas, domos y experiencias en el sur de Chile.",
    images: ["/og-image.jpg"],
  },
  robots: { index: true, follow: true },
};

// ─── Viewport (Next.js 15: themeColor va aquí, NO en metadata) ─
export const viewport: Viewport = {
  themeColor: "#1a3a27",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
      {/*
        suppressHydrationWarning en <body> es necesario porque extensiones
        del navegador (ej: Scribe, Grammarly, LastPass) inyectan atributos
        como data-scribe-recorder-ready="true" en el DOM después del SSR,
        causando hydration mismatch. Este flag le dice a React que ignore
        diferencias en atributos del <body>.
      */}
      <body
        className="font-body bg-cream-50 text-forest-900 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
