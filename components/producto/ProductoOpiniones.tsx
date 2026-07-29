import SectionLabel from "@/components/ui/SectionLabel";
import { IconStar } from "@/components/ui/ProductoIcons";
import { PRODUCTO_OPINIONES, PRODUCTO_RATING } from "@/lib/content";

/**
 * "Lo que dicen quienes ya usan GRIT." — superficie clara.
 * Encabezado con el cluster de rating y cuatro reseñas en grilla 2-up.
 */
export default function ProductoOpiniones() {
  return (
    <section id="opiniones" className="grit-on-light bg-hueso text-tinta">
      <div className="mx-auto max-w-contenido px-5 py-14 lg:px-10 lg:py-seccion">
        <SectionLabel dot="tierra-oscura" className="mb-[22px]">
          Opiniones
        </SectionLabel>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 lg:mb-10">
          <h2 className="m-0 max-w-[520px] font-archivo text-[28px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] lg:text-[40px]">
            Lo que dicen quienes ya usan GRIT.
          </h2>

          <div className="flex items-center gap-3">
            <span className="font-archivo text-[36px] font-black leading-none text-tinta lg:text-[44px]">
              {PRODUCTO_RATING.promedio}
            </span>
            <div>
              <div className="flex items-center gap-[3px] text-tinta" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <IconStar key={i} width={14} />
                ))}
              </div>
              <div className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-gris-oscuro">
                {PRODUCTO_RATING.etiquetaLarga}
              </div>
            </div>
          </div>
        </div>

        <ul className="m-0 grid list-none gap-[10px] p-0 lg:grid-cols-2">
          {PRODUCTO_OPINIONES.map((op) => (
            <li
              key={op.titulo}
              className="rounded-card border-hairline border-borde-claro bg-superficie-clara p-5 lg:p-6"
            >
              <div className="flex items-center gap-[3px] text-tinta" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <IconStar key={i} width={13} />
                ))}
              </div>
              <p className="m-0 mb-2 mt-3 font-archivo text-[15.5px] font-bold leading-[1.3] text-tinta">
                {op.titulo}
              </p>
              <p className="m-0 mb-4 text-[13.5px] leading-[1.55] text-gris-tinta">
                {op.texto}
              </p>
              <p className="m-0 font-mono text-[9.5px] uppercase tracking-[0.1em] text-gris-oscuro">
                {op.firma}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
