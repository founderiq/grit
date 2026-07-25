import SectionLabel from "@/components/ui/SectionLabel";
import ImageSlot from "@/components/ui/ImageSlot";
import { IconStar } from "@/components/ui/ProductoIcons";
import { PRODUCTO_OPINIONES, PRODUCTO_RATING } from "@/lib/content";

/**
 * "Lo que dicen quienes ya usan GRIT." — fondo hueso, grid de 4 reseñas.
 * Opiniones placeholder: reemplazar por reseñas reales cuando existan.
 */
export default function ProductoOpiniones() {
  return (
    <section className="bg-hueso text-tinta">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10">
        <SectionLabel dot="tierra-oscura" className="mb-[22px]">
          Opiniones
        </SectionLabel>

        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <h2 className="m-0 max-w-[520px] font-archivo text-[32px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] md:text-[40px]">
            Lo que dicen quienes ya usan GRIT.
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-[3px] text-tierra-oscura">
              {Array.from({ length: 5 }).map((_, i) => (
                <IconStar key={i} width={16} />
              ))}
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-gris-medio">
              {PRODUCTO_RATING.promedio} de 5 · {PRODUCTO_RATING.total} opiniones
            </span>
          </div>
        </div>

        <div className="grid gap-[10px] sm:grid-cols-2">
          {PRODUCTO_OPINIONES.map((op, i) => (
            <div
              key={i}
              className="rounded-[10px] border border-borde-claro bg-superficie-clara p-6"
            >
              <div className="mb-3 flex items-center gap-[3px] text-tierra-oscura">
                {Array.from({ length: op.rating }).map((_, j) => (
                  <IconStar key={j} width={14} />
                ))}
              </div>
              <p className="m-0 mb-5 font-archivo text-[16px] font-semibold leading-[1.35] text-tinta">
                «{op.quote}»
              </p>
              <div className="flex items-center gap-3">
                <ImageSlot
                  id={`grit-producto-opinion-${i}`}
                  shape="circle"
                  placeholder=""
                  className="h-9 w-9 flex-shrink-0"
                />
                <div>
                  <div className="text-[13px] font-semibold text-tinta">
                    {op.nombre}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-gris-medio">
                    {op.ubicacion}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
