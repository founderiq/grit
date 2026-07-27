import SectionLabel from "@/components/ui/SectionLabel";
import BenefitCard from "@/components/ui/BenefitCard";
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
 * "Por qué vas a usar GRIT todos los días." — superficie clara, seis
 * beneficios en grilla de 3 en desktop y 2 en mobile.
 */
export default function ProductoBeneficios() {
  return (
    <section className="grit-on-light bg-hueso text-tinta">
      <div className="mx-auto max-w-contenido px-5 py-14 lg:px-10 lg:py-seccion">
        <SectionLabel dot="tierra-oscura" className="mb-[22px]">
          Beneficios
        </SectionLabel>

        <h2 className="m-0 mb-8 max-w-[560px] font-archivo text-[28px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] lg:mb-10 lg:text-[40px]">
          Por qué vas a usar GRIT todos los días.
        </h2>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-[10px]">
          {PRODUCTO_BENEFICIOS.map((b, i) => (
            <BenefitCard
              key={b.titulo}
              icon={ICONOS[i] ?? IconTap}
              titulo={b.titulo}
              descripcion={b.descripcion}
              surface="light"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
