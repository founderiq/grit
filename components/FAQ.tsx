import SectionLabel from "./ui/SectionLabel";
import FAQItem from "./ui/FAQItem";
import {
  FAQS,
  FAQ_PRODUCTO,
  FAQ_PRODUCTO_NOTA,
  LINKS,
  type FAQ as FAQType,
} from "@/lib/content";

/**
 * Sección de FAQ, compartida por la landing y la página de producto.
 *
 * `variant` elige el set de preguntas y el layout. El default `landing`
 * reproduce exactamente el markup previo a la parametrización, así que `/`
 * no cambia.
 */
type FAQProps = {
  variant?: "landing" | "producto";
  /** Sobrescribe las preguntas de la variante. */
  items?: FAQType[];
};

const VARIANTES = {
  landing: {
    eyebrow: "Preguntas frecuentes",
    titulo: "Lo que querés saber.",
    items: FAQS,
    nota: null as string | null,
  },
  producto: {
    eyebrow: "Preguntas frecuentes",
    titulo: "Preguntas frecuentes.",
    items: FAQ_PRODUCTO,
    nota: FAQ_PRODUCTO_NOTA as string | null,
  },
};

export default function FAQ({ variant = "landing", items }: FAQProps) {
  const cfg = VARIANTES[variant];
  const preguntas = items ?? cfg.items;

  if (variant === "landing") {
    return (
      <section id="faq" className="bg-hueso text-tinta">
        <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10">
          <SectionLabel dot="tierra-oscura" className="mb-[22px]">
            {cfg.eyebrow}
          </SectionLabel>

          <h2 className="m-0 mb-[30px] font-archivo text-[34px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] md:text-[44px]">
            {cfg.titulo}
          </h2>

          <div className="mx-auto max-w-[760px] border-t border-borde-claro">
            {preguntas.map((faq) => (
              <FAQItem
                key={faq.pregunta}
                pregunta={faq.pregunta}
                respuesta={faq.respuesta}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Variante producto: grilla 0.8fr / 1.2fr con la nota de contacto al lado.
  return (
    <section id="preguntas" className="grit-on-light bg-hueso text-tinta">
      <div className="mx-auto max-w-contenido px-5 py-14 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-10 lg:py-seccion">
        <div>
          <SectionLabel dot="tierra-oscura" className="mb-[22px]">
            {cfg.eyebrow}
          </SectionLabel>

          <h2 className="m-0 font-archivo text-[28px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] lg:text-[40px]">
            {cfg.titulo}
          </h2>

          {cfg.nota && (
            <p className="m-0 mt-5 max-w-[320px] text-[13.5px] leading-[1.6] text-gris-oscuro">
              {cfg.nota}{" "}
              <a
                href={LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-tierra-oscura underline underline-offset-2"
              >
                {LINKS.whatsappVisible}
              </a>
            </p>
          )}
        </div>

        <div className="mt-8 border-t border-borde-claro lg:mt-0">
          {preguntas.map((faq) => (
            <FAQItem
              key={faq.pregunta}
              pregunta={faq.pregunta}
              respuesta={faq.respuesta}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
