import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import JsonLd from "@/components/JsonLd";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://cafeteros.shop"),
  title: {
    default: "Cafeteros Shop | Camisetas de Colombia – Selección Colombia 2026",
    template: "%s | Cafeteros Shop",
  },
  description:
    "Tienda oficial Cafeteros: compra camisetas de la Selección Colombia 2026, camisetas del mundial, conjuntos deportivos y más. Envíos a toda Colombia. Pago seguro con Wompi.",
  applicationName: "Cafeteros Shop",
  keywords: [
    "cafeteros",
    "cafeteros shop",
    "camisetas de colombia",
    "camiseta selección colombia",
    "camiseta colombia 2026",
    "camisetas mundial",
    "camiseta mundial 2026",
    "colombia",
    "selección colombia",
    "camiseta tricolor",
    "tienda camisetas colombia",
    "comprar camiseta colombia",
    "camiseta futbol colombia",
    "conjuntos deportivos colombia",
    "ropa deportiva colombia",
    "camiseta fan colombia",
    "camiseta replica colombia",
    "tienda futbol",
    "camisetas seleccion",
  ],
  alternates: {
    canonical: "/",
    languages: { "es-CO": "/" },
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/",
    siteName: "Cafeteros Shop",
    title: "Cafeteros Shop | Camisetas de la Selección Colombia 2026",
    description:
      "Compra la nueva camiseta de la Selección Colombia para el Mundial 2026. Camisetas originales, conjuntos deportivos y envío a toda Colombia.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cafeteros Shop – Camisetas de Colombia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cafeteros Shop | Camisetas de Colombia 2026",
    description:
      "Tienda online de camisetas de la Selección Colombia para el Mundial 2026. Envíos nacionales. Pago seguro.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "ecommerce",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#003893" />
      </head>
      <body className={`${inter.variable} ${montserrat.variable} antialiased`}>
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
