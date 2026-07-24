import Image from "next/image";
import SectionLabel from "@/components/ui/SectionLabel";
import { IconCheckCircle } from "@/components/ui/ProductoIcons";
import { PRODUCTO_RECORDATORIO_PUNTOS } from "@/lib/content";

/**
 * "A veces solo necesitás un recordatorio." — fondo tinta.
 * Foto a la izquierda, copy + checklist a la derecha.
 */
export default function ProductoRecordatorio() {
  return (
    <section className="bg-tinta text-hueso">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[10px] lg:aspect-[3/4]">
          <Image
            src="/img/producto-muneca.jpg"
            alt="Pulsera Grit en la muñeca, uso diario"
            fill
            sizes="(max-width: 1024px) 100vw, 44vw"
            className="object-cover"
          />
        </div>

        <div className="mt-10 lg:mt-0">
          <SectionLabel dot="tierra" className="mb-[22px]">
            Por qué Grit
          </SectionLabel>

          <h2 className="m-0 mb-5 font-archivo text-[32px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] md:text-[40px]">
            A veces solo necesitás un recordatorio.
          </h2>

          <p className="m-0 mb-7 max-w-[420px] text-[15.5px] leading-[1.6] text-gris-claro">
            Entre el trabajo, el ruido y la rutina, es fácil pasar el día sin
            un segundo para vos. GRIT no pretende cambiarte la vida; solo te
            ayuda a volver a lo importante, una vez al día.
          </p>

          <ul className="m-0 flex list-none flex-col gap-[14px] p-0">
            {PRODUCTO_RECORDATORIO_PUNTOS.map((punto) => (
              <li key={punto} className="flex items-start gap-3">
                <IconCheckCircle width={19} className="mt-[1px] flex-shrink-0 text-tierra" />
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
