import SectionLabel from "@/components/ui/SectionLabel";
import ImageSlot from "@/components/ui/ImageSlot";
import { PRODUCTO_VIDA_REAL } from "@/lib/content";

/** IDs de los slots de UGC. Se conservan los originales para que las fotos
 *  ya cargadas por el cliente sobrevivan al rediseño. */
const SLOTS = [1, 2, 3, 4, 5];

/**
 * "Así se ve en la vida real." — segunda sección, superficie clara.
 * Desktop: grilla de 5 tiles 9:16. Mobile: fila con scroll horizontal.
 */
export default function ProductoVidaReal() {
  return (
    <section className="grit-on-light border-t border-borde-claro bg-hueso text-tinta">
      <div className="mx-auto max-w-contenido px-5 py-14 lg:px-10 lg:py-seccion">
        <SectionLabel dot="tierra-oscura" className="mb-[22px]">
          {PRODUCTO_VIDA_REAL.eyebrow}
        </SectionLabel>

        <h2 className="m-0 mb-3 font-archivo text-[28px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] lg:text-[40px]">
          {PRODUCTO_VIDA_REAL.titulo}
        </h2>

        <p className="m-0 mb-7 max-w-[560px] text-[14px] leading-[1.6] text-gris-tinta lg:text-[15px]">
          {PRODUCTO_VIDA_REAL.sub}
        </p>

        {/* El margen negativo cancela el padding del contenedor para que la
            fila llegue al borde de la pantalla sin desbordar la página. */}
        <ul className="-mx-5 m-0 flex list-none gap-[10px] overflow-x-auto px-5 pb-1 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-3 lg:overflow-x-visible lg:px-0">
          {SLOTS.map((n, i) => (
            <li key={n} className="w-[150px] flex-shrink-0 lg:w-auto">
              <ImageSlot
                id={`grit-producto-vida-${n}`}
                radius={10}
                placeholder="UGC"
                className="h-[267px] w-full lg:aspect-[9/16] lg:h-auto"
              />
              <span className="mt-2 block font-mono text-[9px] uppercase leading-[1.4] tracking-[0.08em] text-gris-oscuro lg:text-[9.5px]">
                {PRODUCTO_VIDA_REAL.captions[i]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
