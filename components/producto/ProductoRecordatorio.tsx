import Image from "next/image";
import SectionLabel from "@/components/ui/SectionLabel";
import { IconCheck } from "@/components/ui/ProductoIcons";
import { PRODUCTO_RECORDATORIO } from "@/lib/content";

/**
 * "A veces solo necesitás un recordatorio." — sección emocional, superficie
 * tinta. Foto a la izquierda, copy + checklist a la derecha.
 */
export default function ProductoRecordatorio() {
  return (
    <section className="grit-on-dark border-t border-borde bg-tinta text-hueso">
      <div className="mx-auto max-w-contenido px-5 py-14 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10 lg:py-seccion">
        <div className="relative h-[300px] w-full overflow-hidden rounded-hero lg:h-[460px]">
          <Image
            src="/img/producto-muneca.jpg"
            alt="Pulsera GRIT en la muñeca, uso diario"
            fill
            sizes="(max-width: 1024px) 100vw, 44vw"
            className="object-cover"
          />
        </div>

        <div className="mt-10 lg:mt-0">
          <SectionLabel dot="tierra" className="mb-[22px]">
            {PRODUCTO_RECORDATORIO.eyebrow}
          </SectionLabel>

          <h2 className="m-0 mb-5 font-archivo text-[28px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] lg:text-[40px]">
            {PRODUCTO_RECORDATORIO.titulo}
            <span className="text-tierra">.</span>
          </h2>

          <p className="m-0 mb-6 max-w-[460px] text-[14px] leading-[1.6] text-gris-copy lg:text-[15px]">
            {PRODUCTO_RECORDATORIO.body}
          </p>

          <ul className="m-0 flex list-none flex-col p-0">
            {PRODUCTO_RECORDATORIO.puntos.map((punto) => (
              <li
                key={punto}
                className="flex items-center gap-3 border-b border-borde py-[13px] last:border-b-0"
              >
                <IconCheck
                  width={18}
                  className="flex-shrink-0 text-tierra"
                  aria-hidden="true"
                />
                <span className="text-[14.5px] leading-[1.5] text-gris-copy">
                  {punto}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
