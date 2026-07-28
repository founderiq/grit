import Logo from "@/components/Logo";
import { LINKS } from "@/lib/content";

/**
 * Footer — fondo tinta. Logo, tagline, enlaces y copyright.
 *
 * `variant="landing"` (default) reproduce el footer previo a la
 * parametrización. `variant="producto"` usa la línea legal y el enlace de
 * WhatsApp aprobados en el Product Experience handoff.
 */
type FooterProps = { variant?: "landing" | "producto" };

export default function Footer({ variant = "landing" }: FooterProps) {
  const esProducto = variant === "producto";

  return (
    /* El scope de superficie se aplica solo en la variante de ecommerce: la
       landing se conserva exactamente como está hasta que se apruebe su
       retrofit. */
    <footer
      className={`border-t border-borde bg-tinta text-hueso ${
        esProducto ? "grit-on-dark" : ""
      }`}
    >
      <div className="mx-auto max-w-contenido px-[26px] pb-[38px] pt-[46px] md:px-10">
        <Logo variante="footer" sobre="oscuro" className="mb-5" />

        <div className="font-mono text-[11px] uppercase leading-[2] tracking-[0.16em] text-gris-medio">
          <span className="text-tierra">Fe que se usa.</span>
          <br />
          Fuerza en cada toque.
        </div>

        <div className="mt-6 flex gap-[18px] font-mono text-[11px] uppercase tracking-[0.1em] text-gris-copy">
          <a
            href={LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-hueso"
          >
            Instagram
          </a>
          <a
            href={LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-hueso"
          >
            {esProducto ? `WhatsApp · ${LINKS.whatsappVisible}` : "WhatsApp"}
          </a>
          {!esProducto && (
            <a
              href={LINKS.contacto}
              className="transition-colors hover:text-hueso"
            >
              Contacto
            </a>
          )}
        </div>

        {/* Corrección de contraste #3 (specs/11): gris-oscuro #5C564D sobre
            tinta da 2.59:1. gris-medio #8C857A sube a 5.15:1, AA ✓. */}
        <div className="mt-[26px] border-t border-borde pt-5 font-mono text-[10.5px] tracking-[0.08em] text-gris-medio">
          {esProducto
            ? "© 2026 GRIT · Fe que se usa. Fuerza en cada toque."
            : "© 2026 Grit · Paraguay · Vivir con intención."}
        </div>
      </div>
    </footer>
  );
}
