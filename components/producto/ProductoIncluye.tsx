import Image from "next/image";
import SectionLabel from "@/components/ui/SectionLabel";
import { IconCheck } from "@/components/ui/ProductoIcons";
import { PRODUCTO_INCLUYE } from "@/lib/content";

/**
 * "Qué recibís con tu GRIT." — fondo hueso. Foto de producto + checklist.
 */
export default function ProductoIncluye() {
  return (
    <section className="bg-hueso text-tinta">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[10px] bg-superficie-clara lg:aspect-[3/4]">
          <Image
            src="/img/producto-logo.jpg"
            alt="Pulsera Grit — detalle del logo bordado"
            fill
            sizes="(max-width: 1024px) 100vw, 44vw"
            className="object-cover"
          />
        </div>

        <div className="mt-10 lg:mt-0">
          <SectionLabel dot="tierra-oscura" className="mb-[22px]">
            Qué recibís
          </SectionLabel>

          <h2 className="m-0 mb-7 font-archivo text-[32px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] md:text-[40px]">
            Qué recibís con tu GRIT.
          </h2>

          <ul className="m-0 flex list-none flex-col gap-4 border-t border-borde-claro p-0 pt-6">
            {PRODUCTO_INCLUYE.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-tinta text-tierra">
                  <IconCheck width={13} />
                </span>
                <span className="text-[15px] text-gris-tinta">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
