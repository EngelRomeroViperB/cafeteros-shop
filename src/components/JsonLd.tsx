export default function JsonLd() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Cafeteros Shop",
    url: "https://cafeteros.shop",
    description:
      "Tienda online de camisetas de la Selección Colombia 2026, camisetas del mundial, conjuntos deportivos y más.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://cafeteros.shop/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const storeSchema = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: "Cafeteros Shop",
    url: "https://cafeteros.shop",
    description:
      "Compra camisetas de la Selección Colombia para el Mundial 2026. Envíos a toda Colombia. Pago seguro con Wompi.",
    currenciesAccepted: "COP",
    paymentAccepted: "Wompi, Tarjeta de crédito, PSE, Nequi",
    areaServed: {
      "@type": "Country",
      name: "Colombia",
    },
    brand: {
      "@type": "Brand",
      name: "Cafeteros",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+57-324-194-7654",
      contactType: "customer service",
      availableLanguage: "Spanish",
    },
    sameAs: ["https://wa.me/573241947654"],
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Cafeteros Shop",
    url: "https://cafeteros.shop",
    logo: "https://cafeteros.shop/og-image.png",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+57-324-194-7654",
      contactType: "customer support",
      email: "cafeteros101@gmail.com",
      availableLanguage: "Spanish",
      areaServed: "CO",
    },
    sameAs: ["https://wa.me/573241947654"],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: "https://cafeteros.shop",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Camisetas de Colombia",
        item: "https://cafeteros.shop/#destacados",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Colecciones",
        item: "https://cafeteros.shop/#colecciones",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
