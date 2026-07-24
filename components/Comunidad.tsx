import SectionLabel from "./ui/SectionLabel";
import UgcGallery from "./ui/UgcGallery";
import Testimonios from "./ui/Testimonios";
import { UGC_MEDIA, TESTIMONIOS } from "@/lib/content";

/**
 * Comunidad — fondo tinta. Grilla de UGC (medios reales) + testimonios.
 * Ambos bloques solo se renderizan cuando hay contenido real cargado.
 */
export default function Comunidad() {
  return (
    <section className="bg-tinta text-hueso">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10">
        <SectionLabel dot="tierra" className="mb-[22px]">
          Comunidad
        </SectionLabel>

        <h2 className="m-0 mb-[18px] max-w-[720px] font-archivo text-[33px] font-extrabold uppercase leading-[1.04] tracking-[-0.02em] md:text-[42px]">
          No comprás una pulsera. Compartís una forma de vivir.
        </h2>

        <p className="m-0 mb-[34px] max-w-[620px] text-[16px] leading-[1.65] text-gris-copy">
          Cuando reconocés a alguien que la lleva, no pensás «tenemos la misma
          pulsera». Pensás:{" "}
          <span className="text-tierra">compartimos una decisión.</span>
        </p>

        {/* Grilla UGC — solo si hay medios reales */}
        <UgcGallery items={UGC_MEDIA} />

        {/* Testimonios — solo si hay testimonios reales */}
        <Testimonios items={TESTIMONIOS} />

        <div className="mt-[22px] text-center font-mono text-[11px] uppercase tracking-[0.14em] text-gris-medio">
          @grit.py · #FeQueSeUsa
        </div>
      </div>
    </section>
  );
}
