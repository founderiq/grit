import { FAQS, PRODUCTO_RATING } from "@/lib/content";

/** URL canónica del sitio (usada en metadata y structured data). */
export const SITE_URL = "https://grit.com.py";

/**
 * Datos estructurados (JSON-LD) para SEO enriquecido.
 * Organization + Product + FAQPage.
 */

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Grit",
  url: SITE_URL,
  slogan: "Fe que se usa. Fuerza en cada toque.",
  description:
    "Grit es una marca de identidad. La pulsera es un recordatorio diario de fe, disciplina y propósito.",
  logo: `${SITE_URL}/img/logo-light.svg`,
  areaServed: "PY",
  sameAs: ["https://instagram.com/grit.py"],
};

export const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Pulsera NFC Grit · Colección Fe",
  image: [`${SITE_URL}/img/producto.jpg`],
  description:
    "Pulsera de tejido elástico premium con cruz bordada y toque a contenido (NFC). Un recordatorio diario de fe, disciplina y propósito.",
  brand: { "@type": "Brand", name: "Grit" },
  category: "Accesorios / Identidad",
  material: "Tejido elástico premium",
  // Rango de precios de los tres bundles aprobados (115.000 – 269.000 Gs).
  offers: {
    "@type": "AggregateOffer",
    availability: "https://schema.org/InStock",
    lowPrice: "115000",
    highPrice: "269000",
    offerCount: 3,
    priceCurrency: "PYG",
    url: `${SITE_URL}/producto`,
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: PRODUCTO_RATING.promedio,
    reviewCount: PRODUCTO_RATING.total,
    bestRating: 5,
  },
};

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.pregunta,
    acceptedAnswer: { "@type": "Answer", text: f.respuesta },
  })),
};
