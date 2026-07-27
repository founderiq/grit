import SectionLabel from "@/components/ui/SectionLabel";
import IconBadge from "@/components/ui/IconBadge";
import {
  IconWrist,
  IconTap,
  IconBook,
  type IconComponent,
} from "@/components/ui/ProductoIcons";
import { PRODUCTO_PASOS } from "@/lib/content";

const ICONOS: IconComponent[] = [IconWrist, IconTap, IconBook];

/**
 * "Tres pasos. Un hábito diario." — tercera sección, superficie tinta con
 * tarjetas tinta-2.
 */
export default function ProductoPasos() {
  return (
    <section id="como-funciona" className="grit-on-dark bg-tinta text-hueso">
      <div className="mx-auto max-w-contenido px-5 py-14 lg:px-10 lg:py-seccion">
        <SectionLabel dot="tierra" className="mb-[22px]">
          Cómo funciona
        </SectionLabel>

        <h2 className="m-0 mb-3 font-archivo text-[28px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] lg:text-[40px]">
          Tres pasos. Un hábito diario<span className="text-tierra">.</span>
        </h2>

        <p className="m-0 mb-8 max-w-[520px] text-[14px] leading-[1.6] text-gris-copy lg:text-[15px]">
          GRIT está pensada para que el momento con Dios sea simple, físico y
          cotidiano.
        </p>

        <ol className="m-0 grid list-none gap-3 p-0 lg:grid-cols-3">
          {PRODUCTO_PASOS.map((paso, i) => {
            const Icono = ICONOS[i] ?? IconWrist;
            return (
              <li
                key={paso.numero}
                className="rounded-card border-hairline border-borde bg-tinta-2 px-5 py-[18px] lg:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <IconBadge
                    icon={Icono}
                    size={36}
                    iconSize={18}
                    variant="outline"
                    className="lg:h-[38px] lg:w-[38px]"
                  />
                  {/* gris-oscuro sobre tinta-2 no llega a AA; gris-medio da
                      4.58:1. Misma corrección que el fine print del footer. */}
                  <span className="font-mono text-[11px] tracking-[0.08em] text-gris-medio">
                    {paso.numero}
                  </span>
                </div>
                <h3 className="m-0 mb-2 mt-4 font-archivo text-[15px] font-extrabold uppercase tracking-[-0.01em] text-hueso lg:text-[17px]">
                  {paso.titulo}
                </h3>
                <p className="m-0 text-[13.5px] leading-[1.6] text-gris-copy">
                  {paso.descripcion}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
