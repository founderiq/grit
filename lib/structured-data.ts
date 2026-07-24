import { FAQS } from "@/lib/content";

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
  name: "Pulsera Grit · Colección Fe",
  image: [`${SITE_URL}/img/producto.jpg`],
  description:
    "Pulsera de tejido elástico premium con cruz bordada y toque a contenido (NFC). Un recordatorio diario de fe, disciplina y propósito.",
  brand: { "@type": "Brand", name: "Grit" },
  category: "Accesorios / Identidad",
  material: "Tejido elástico premium",
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    price: "85000",
    priceCurrency: "PYG",
    url: `${SITE_URL}/producto`,
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
