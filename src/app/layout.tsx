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
    default: "Cafeteros Shop | Tienda de Camisetas de la Selección Colombia",
    template: "%s | Cafeteros Shop",
  },
  description:
    "Cafeteros Shop es tu tienda online de camisetas de la Selección Colombia y ropa deportiva oficial. Compra fácil, envíos a toda Colombia y pago seguro.",
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
    "orgullo cafetero",
    "camisetas cafeteras",
    "camisetas de la selección colombia",
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
    canonical: "https://cafeteros.shop",
    languages: { "es-CO": "/" },
  },
  icons: {
    icon: "/icono.svg",
    shortcut: "/icono.svg",
    apple: "/icono.svg",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "https://cafeteros.shop",
    siteName: "Cafeteros Shop",
    title: "Cafeteros Shop | Tienda Oficial de Camisetas de Colombia",
    description:
      "Compra camisetas de la Selección Colombia, conjuntos y ropa deportiva oficial en Cafeteros Shop. Envíos nacionales y pago seguro.",
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
    title: "Cafeteros Shop | Tienda de Camisetas de Colombia",
    description:
      "Tienda online de camisetas de la Selección Colombia y ropa deportiva oficial. Envíos a toda Colombia.",
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
        <link rel="icon" href="/icono.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#003893" />
      </head>
      <body className={`${inter.variable} ${montserrat.variable} antialiased`}>
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
