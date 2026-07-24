import SectionLabel from "@/components/ui/SectionLabel";
import {
  IconWrist,
  IconTap,
  IconBook,
  type IconComponent,
} from "@/components/ui/ProductoIcons";
import { PRODUCTO_PASOS } from "@/lib/content";

const ICONOS: IconComponent[] = [IconWrist, IconTap, IconBook];

/**
 * "Tres pasos. Un hábito diario." — fondo tinta-2, 3 tarjetas.
 */
export default function ProductoPasos() {
  return (
    <section className="bg-tinta-2 text-hueso">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10">
        <SectionLabel dot="tierra" className="mb-[22px]">
          Cómo funciona
        </SectionLabel>

        <h2 className="m-0 mb-3 font-archivo text-[34px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] md:text-[44px]">
          Tres pasos. Un hábito diario.
        </h2>

        <p className="m-0 mb-10 max-w-[420px] text-[15.5px] leading-[1.6] text-gris-claro">
          GRIT está pensada para que el momento con Dios sea simple, fácil y
          cotidiano.
        </p>

        <div className="grid gap-[14px] md:grid-cols-3">
          {PRODUCTO_PASOS.map((paso, i) => {
            const Icono = ICONOS[i] ?? IconWrist;
            return (
              <div
                key={paso.titulo}
                className="rounded-[10px] border border-borde bg-tinta p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-tinta-2 text-tierra">
                  <Icono width={22} />
                </div>
                <h3 className="m-0 mb-2 mt-5 font-archivo text-[17px] font-bold uppercase tracking-[-0.01em] text-hueso">
                  {paso.titulo}
                </h3>
                <p className="m-0 text-[14px] leading-[1.6] text-gris-copy">
                  {paso.descripcion}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
