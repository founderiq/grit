/**
 * <IconBadge /> — chip circular que contiene un ícono del set Grit
 * (specs/06-cards-badges-icons.md).
 *
 * El relleno clay-300 #FFB185 con glifo clay-700 #91401F fue aprobado en
 * revisión de diseño y reemplaza al par tinta/tierra del repo. El glifo sobre
 * el relleno da 4.02:1, por encima del umbral de 3:1 para gráficos.
 *
 * En el bundle de referencia el chip está embebido dentro de BenefitCard; se
 * extrae acá porque la página de producto reutiliza el mismo chip de 40px.
 */
import type { IconComponent } from "@/components/ui/ProductoIcons";

type IconBadgeProps = {
  icon: IconComponent;
  /** Diámetro del chip en px. 40 en tarjetas, 38 en los pasos de producto. */
  size?: number;
  /** Tamaño del glifo en px. Por defecto, ~48% del chip. */
  iconSize?: number;
  /**
   * `solid` = relleno clay (tarjetas sobre claro).
   * `outline` = transparente con hairline (tarjetas sobre oscuro).
   */
  variant?: "solid" | "outline";
  className?: string;
};

export default function IconBadge({
  icon: Icono,
  size = 40,
  iconSize,
  variant = "solid",
  className = "",
}: IconBadgeProps) {
  const glifo = iconSize ?? Math.round(size * 0.48);
  const estilo =
    variant === "solid"
      ? "bg-clay-300 text-clay-700"
      : "border-hairline border-borde text-tierra";

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-pill ${estilo} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icono width={glifo} />
    </span>
  );
}
