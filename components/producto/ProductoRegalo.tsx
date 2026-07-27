import SectionLabel from "@/components/ui/SectionLabel";
import CrossIcon from "@/components/ui/CrossIcon";
import { PRODUCTO_REGALO } from "@/lib/content";

/**
 * "Un regalo simple, pero con mucho significado." — superficie tinta-2,
 * centrada. Cinco pills de ocasión y un CTA que vuelve al selector de bundles.
 */
export default function ProductoRegalo() {
  return (
    <section className="grit-on-dark bg-tinta-2 text-hueso">
      <div className="mx-auto max-w-contenido px-5 py-14 text-center lg:px-10 lg:py-seccion">
        <SectionLabel
          dot="tierra"
          className="mx-auto mb-[22px] w-fit justify-center"
        >
          {PRODUCTO_REGALO.eyebrow}
        </SectionLabel>

        <h2 className="m-0 mb-4 font-archivo text-[28px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] lg:text-[40px]">
          {PRODUCTO_REGALO.titulo}
        </h2>

        <p className="m-0 mx-auto mb-9 max-w-[520px] text-[14px] leading-[1.6] text-gris-copy lg:text-[15px]">
          {PRODUCTO_REGALO.sub}
        </p>

        <ul className="m-0 flex list-none flex-wrap justify-center gap-[10px] p-0">
          {PRODUCTO_REGALO.ocasiones.map((ocasion) => (
            <li
              key={ocasion}
              className="flex items-center gap-2 rounded-pill border-hairline border-borde px-[18px] py-[11px]"
            >
              <CrossIcon width={12} />
              <span className="text-[13.5px] text-gris-copy">{ocasion}</span>
            </li>
          ))}
        </ul>

        {/* Vuelve al selector de bundles más arriba en la misma página. */}
        <a href="#comprar" className="btn-hueso mt-9 inline-flex">
          {PRODUCTO_REGALO.cta}
        </a>
      </div>
    </section>
  );
}
