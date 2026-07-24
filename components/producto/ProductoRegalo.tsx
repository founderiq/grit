import SectionLabel from "@/components/ui/SectionLabel";
import { PRODUCTO_REGALO_ITEMS } from "@/lib/content";

/**
 * "Un regalo simple, pero con mucho significado." — fondo tinta-2.
 */
export default function ProductoRegalo() {
  return (
    <section className="bg-tinta-2 text-hueso">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion text-center md:px-10">
        <SectionLabel
          dot="tierra"
          className="mx-auto mb-[22px] w-fit justify-center"
        >
          Ideal para regalar
        </SectionLabel>

        <h2 className="m-0 mb-4 font-archivo text-[32px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] md:text-[42px]">
          Un regalo simple, pero con mucho significado.
        </h2>

        <p className="mx-auto m-0 mb-12 max-w-[440px] text-[15.5px] leading-[1.6] text-gris-copy">
          GRIT no es otro accesorio más. Es la forma de regalar un recordatorio
          diario de fe y propósito a alguien que te importa.
        </p>

        <div className="mx-auto grid max-w-[760px] gap-[10px] text-left sm:grid-cols-2">
          {PRODUCTO_REGALO_ITEMS.map((item) => (
            <div
              key={item.titulo}
              className="rounded-[10px] border border-borde p-6"
            >
              <h3 className="m-0 mb-1.5 font-archivo text-[14px] font-bold uppercase tracking-[0.01em] text-hueso">
                {item.titulo}
              </h3>
              <p className="m-0 text-[13.5px] leading-[1.6] text-gris-copy">
                {item.descripcion}
              </p>
            </div>
          ))}
        </div>

        <a href="#comprar" className="btn-hueso mt-10 inline-flex">
          Elegí el tuyo
        </a>
      </div>
    </section>
  );
}
