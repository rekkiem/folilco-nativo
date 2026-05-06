import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: {
    default: "Folilco Nativo – Turismo Rural Cooperativo",
    template: "%s | Folilco Nativo",
  },
  description:
    "Vive el sur de Chile auténtico. Cabañas, domos, cabalgatas y productos artesanales en el corazón del bosque nativo.",
  keywords: ["turismo rural", "sur de Chile", "cooperativa", "cabañas", "domos", "ecoturismo"],
  themeColor: "#1a3a27",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-body bg-cream-50 text-forest-900 antialiased">
        {children}
      </body>
    </html>
  );
}
