import Image from "next/image";
import SectionLabel from "@/components/ui/SectionLabel";
import { IconCheck } from "@/components/ui/ProductoIcons";
import { PRODUCTO_INCLUYE } from "@/lib/content";

/**
 * "Qué recibís con tu GRIT." — superficie tinta. Foto + checklist de cinco
 * ítems.
 */
export default function ProductoIncluye() {
  return (
    <section className="grit-on-dark bg-tinta text-hueso">
      <div className="mx-auto max-w-contenido px-5 py-14 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10 lg:py-seccion">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-hero bg-tinta-2 lg:aspect-[3/4]">
          <Image
            src="/img/producto-logo.jpg"
            alt="Pulsera GRIT — detalle del logo bordado"
            fill
            sizes="(max-width: 1024px) 100vw, 44vw"
            className="object-cover"
          />
        </div>

        <div className="mt-10 lg:mt-0">
          <SectionLabel dot="tierra" className="mb-[22px]">
            Qué recibís
          </SectionLabel>

          <h2 className="m-0 mb-6 font-archivo text-[28px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] lg:text-[40px]">
            Qué recibís con tu GRIT<span className="text-tierra">.</span>
          </h2>

          <ul className="m-0 flex list-none flex-col border-t border-borde p-0">
            {PRODUCTO_INCLUYE.map((item) => (
              <li
                key={item}
                className="flex items-center gap-[14px] border-b border-borde py-4"
              >
                <IconCheck
                  width={18}
                  className="flex-shrink-0 text-tierra"
                  aria-hidden="true"
                />
                <span className="text-[15px] leading-[1.5] text-gris-copy lg:text-[17px]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
