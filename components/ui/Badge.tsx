/**
 * <Badge /> — chip estático de estado (specs/06-cards-badges-icons.md).
 *
 * ⚠️ DERIVADO: no existía en el producto original. El precedente real más
 * cercano es el chip delineado de la tarjeta de brand voice. Se especificó
 * para el ecommerce (etiquetas de stock/estado). PENDIENTE DE SIGN-OFF.
 *
 * Los badges son estáticos: nunca son clickeables. Si algo tiene que ser
 * clickeable, es un <Button variant="ghost" size="sm" />.
 *
 * El copy se escribe en sentence case y lo pasa a mayúsculas el CSS.
 */
export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";
export type BadgeVariant = "outline" | "solid";

type BadgeProps = {
  children: React.ReactNode;
  tone?: BadgeTone;
  variant?: BadgeVariant;
  className?: string;
};

const OUTLINE: Record<BadgeTone, string> = {
  neutral: "text-gris-medio border-borde",
  accent: "text-tierra border-borde",
  success: "text-success border-success",
  // ⚠️ warning da 2.80:1 sobre hueso — no usar como texto sobre claro
  // hasta que diseño confirme el valor oscurecido (~#8F6820).
  warning: "text-warning border-warning",
  danger: "text-danger border-danger",
};

const SOLID: Record<BadgeTone, string> = {
  neutral: "bg-tinta-2 text-gris-copy border-transparent",
  accent: "bg-naranja text-tinta border-transparent",
  success: "bg-success text-hueso border-transparent",
  warning: "bg-warning text-tinta border-transparent",
  danger: "bg-danger text-hueso border-transparent",
};

export default function Badge({
  children,
  tone = "neutral",
  variant = "outline",
  className = "",
}: BadgeProps) {
  const paleta = variant === "solid" ? SOLID[tone] : OUTLINE[tone];

  return (
    <span
      className={`inline-flex items-center rounded-pill border-hairline px-[11px] py-[5px] font-mono text-[10px] uppercase tracking-[0.08em] ${paleta} ${className}`}
    >
      {children}
    </span>
  );
}
