import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://cafeteros-shop.vercel.app"),
  title: {
    default: "La Tricolor Store",
    template: "%s | La Tricolor Store",
  },
  description: "Tienda online de camisetas de la Selección Colombia 2026 con carrito, auth y checkout con Wompi.",
  applicationName: "La Tricolor Store",
  keywords: [
    "camiseta seleccion colombia",
    "camiseta colombia 2026",
    "tienda futbol colombia",
    "wompi",
    "la tricolor",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/",
    siteName: "La Tricolor Store",
    title: "La Tricolor Store",
    description: "Compra la nueva camiseta de la Selección Colombia con una experiencia moderna y segura.",
  },
  twitter: {
    card: "summary_large_image",
    title: "La Tricolor Store",
    description: "Tienda online de camisetas de la Selección Colombia 2026.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${montserrat.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
