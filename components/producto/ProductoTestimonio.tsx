import Image from "next/image";
import { IconStar, IconCheckCircle } from "@/components/ui/ProductoIcons";
import { PRODUCTO_TESTIMONIO } from "@/lib/content";

/**
 * Tarjeta de testimonio de Camila R., debajo de las miniaturas de la galería
 * en desktop y debajo de la fila de confianza en mobile.
 */
export default function ProductoTestimonio({
  className = "",
}: {
  className?: string;
}) {
  const t = PRODUCTO_TESTIMONIO;

  return (
    <figure
      className={`m-0 mt-[14px] rounded-card border-hairline border-borde-claro bg-superficie-clara px-[18px] py-4 sm:px-[22px] sm:py-5 ${className}`}
    >
      <div className="flex items-center gap-[3px] text-tinta" aria-hidden="true">
        {Array.from({ length: t.estrellas }).map((_, i) => (
          <IconStar key={i} width={13} className="sm:hidden" />
        ))}
        {Array.from({ length: t.estrellas }).map((_, i) => (
          <IconStar key={`d${i}`} width={14} className="hidden sm:block" />
        ))}
      </div>

      <blockquote className="m-0">
        <p className="m-0 mt-2 font-archivo text-[14.5px] font-bold text-tinta sm:text-[15.5px]">
          {t.titulo}
        </p>
        <p className="m-0 mt-2 text-[13px] leading-[1.55] text-gris-tinta sm:text-[13.5px]">
          {t.texto}
        </p>
      </blockquote>

      <figcaption className="mt-[14px] flex flex-wrap items-center gap-[9px] sm:gap-[10px]">
        <Image
          src={t.foto}
          alt={t.fotoAlt}
          width={34}
          height={34}
          sizes="34px"
          className="h-[30px] w-[30px] flex-shrink-0 rounded-pill object-cover sm:h-[34px] sm:w-[34px]"
        />
        <span className="text-[13px] font-semibold text-tinta">{t.nombre}</span>
        <span className="flex items-center gap-1 text-tierra-oscura">
          <IconCheckCircle width={14} />
          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]">
            {t.verificada}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
