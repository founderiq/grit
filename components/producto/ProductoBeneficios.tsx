import SectionLabel from "@/components/ui/SectionLabel";
import {
  IconTap,
  IconWrist,
  IconBattery0,
  IconGift,
  IconLayout,
  IconWifi,
  type IconComponent,
} from "@/components/ui/ProductoIcons";
import { PRODUCTO_BENEFICIOS } from "@/lib/content";

const ICONOS: IconComponent[] = [
  IconTap,
  IconWrist,
  IconBattery0,
  IconGift,
  IconLayout,
  IconWifi,
];

/**
 * "Por qué vas a usar GRIT todos los días." — fondo hueso, grid de 6 beneficios.
 */
export default function ProductoBeneficios() {
  return (
    <section className="bg-hueso text-tinta">
      <div className="mx-auto max-w-contenido px-[26px] py-seccion md:px-10">
        <SectionLabel dot="tierra-oscura" className="mb-[22px]">
          Beneficios
        </SectionLabel>

        <h2 className="m-0 mb-10 max-w-[560px] font-archivo text-[32px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] md:text-[40px]">
          Por qué vas a usar GRIT todos los días.
        </h2>

        <div className="grid gap-[10px] sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTO_BENEFICIOS.map((b, i) => {
            const Icono = ICONOS[i] ?? IconTap;
            return (
              <div
                key={b.titulo}
                className="rounded-[10px] border border-borde-claro bg-superficie-clara p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tinta text-tierra">
                  <Icono width={19} />
                </div>
                <h3 className="m-0 mb-1.5 mt-4 font-archivo text-[15px] font-bold uppercase tracking-[-0.005em] text-tinta">
                  {b.titulo}
                </h3>
                <p className="m-0 text-[13.5px] leading-[1.55] text-gris-oscuro">
                  {b.descripcion}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
