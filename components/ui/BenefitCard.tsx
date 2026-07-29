/**
 * <BenefitCard /> — tarjeta de beneficio (specs/06-cards-badges-icons.md).
 *
 * Chip de ícono arriba, título display y copy. Plana: la profundidad viene del
 * contraste de superficie y de un hairline de 1px, nunca de una sombra.
 *
 * `surface` selecciona la paleta según dónde se monte la tarjeta, en lugar de
 * pasar clases sueltas desde cada sección.
 */
import IconBadge from "@/components/ui/IconBadge";
import type { IconComponent } from "@/components/ui/ProductoIcons";

type BenefitCardProps = {
  icon: IconComponent;
  titulo: string;
  descripcion: string;
  /** Superficie sobre la que se monta la tarjeta. */
  surface?: "light" | "dark";
  className?: string;
};

export default function BenefitCard({
  icon,
  titulo,
  descripcion,
  surface = "light",
  className = "",
}: BenefitCardProps) {
  const sobreClaro = surface === "light";

  const chrome = sobreClaro
    ? "border-borde-claro bg-superficie-clara"
    : "border-borde bg-tinta-2";
  const tituloColor = sobreClaro ? "text-tinta" : "text-hueso";
  // gris-oscuro sobre superficie-clara = 5.99:1 · gris-copy sobre tinta-2 = 9.47:1
  const copyColor = sobreClaro ? "text-gris-oscuro" : "text-gris-copy";

  return (
    <div
      className={`rounded-card border-hairline p-6 ${chrome} ${className}`}
    >
      <IconBadge
        icon={icon}
        size={40}
        iconSize={19}
        variant={sobreClaro ? "solid" : "outline"}
      />
      <h3
        className={`m-0 mb-1.5 mt-4 font-archivo text-[15px] font-bold uppercase tracking-[-0.005em] ${tituloColor}`}
      >
        {titulo}
      </h3>
      <p className={`m-0 text-[13.5px] leading-[1.55] ${copyColor}`}>
        {descripcion}
      </p>
    </div>
  );
}
