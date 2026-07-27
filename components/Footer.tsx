import Image from "next/image";
import { LINKS } from "@/lib/content";

/**
 * Footer — fondo tinta. Logo, tagline, enlaces y copyright.
 */
export default function Footer() {
  return (
    <footer className="border-t border-borde bg-tinta text-hueso">
      <div className="mx-auto max-w-contenido px-[26px] pb-[38px] pt-[46px] md:px-10">
        <Image
          src="/img/logo-light.svg"
          alt="Grit"
          width={124}
          height={26}
          className="mb-5 h-[26px] w-auto"
        />

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
            WhatsApp
          </a>
          <a
            href={LINKS.contacto}
            className="transition-colors hover:text-hueso"
          >
            Contacto
          </a>
        </div>

        {/* Corrección de contraste #3 (specs/11): gris-oscuro #5C564D sobre
            tinta da 2.59:1. gris-medio #8C857A sube a 5.15:1, AA ✓. */}
        <div className="mt-[26px] border-t border-borde pt-5 font-mono text-[10.5px] tracking-[0.08em] text-gris-medio">
          © 2026 Grit · Paraguay · Vivir con intención.
        </div>
      </div>
    </footer>
  );
}
