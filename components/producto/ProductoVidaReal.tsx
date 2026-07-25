import SectionLabel from "@/components/ui/SectionLabel";
import ImageSlot from "@/components/ui/ImageSlot";

/** IDs de los slots de UGC (rellenables por drag & drop, igual que en Comunidad). */
const VIDA_REAL_SLOTS = [1, 2, 3, 4, 5];

/**
 * "Así se ve en la vida real." — fondo tinta, grilla de fotos reales de uso (UGC).
 */
export default function ProductoVidaReal() {
  return (
    <section className="bg-tinta text-hueso">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10">
        <SectionLabel dot="tierra" className="mb-[22px]">
          Más que un objeto
        </SectionLabel>

        <h2 className="m-0 mb-3 font-archivo text-[32px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] md:text-[40px]">
          Así se ve en la vida real.
        </h2>

        <p className="m-0 mb-8 max-w-[520px] text-[15.5px] leading-[1.6] text-gris-copy">
          Personas reales usando GRIT: recordando su fe y viviendo el toque
          NFC en su día a día.
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {VIDA_REAL_SLOTS.map((n) => (
            <ImageSlot
              key={n}
              id={`grit-producto-vida-${n}`}
              radius={8}
              placeholder="UGC"
              className="aspect-[3/4] w-full"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
