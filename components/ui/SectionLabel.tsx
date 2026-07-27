/**
 * Etiqueta superior de sección: punto de color + nombre en monospace.
 * El punto alterna entre tierra (#C2693F) y tierra oscura (#7A3B2B)
 * según el fondo de la sección.
 *
 * `dot` también determina el color del texto, porque en las 14 secciones del
 * sitio identifica sin ambigüedad la superficie: `tierra` = fondo oscuro,
 * `tierra-oscura` = fondo claro. Sobre claro el gris-medio #8C857A del sistema
 * solo alcanza 3.16:1 (AA pide 4.5:1), así que se sube a gris-oscuro #5C564D
 * → 6.27:1. Es la corrección de contraste #1/#2 de specs/11-accessibility.
 * ⚠️ Cambio visible, marcado para design review.
 */
type SectionLabelProps = {
  children: React.ReactNode;
  /** Color del punto de acento — y, con él, la superficie de la sección. */
  dot?: "tierra" | "tierra-oscura";
  className?: string;
};

export default function SectionLabel({
  children,
  dot = "tierra",
  className = "",
}: SectionLabelProps) {
  const sobreOscuro = dot === "tierra";
  const dotColor = sobreOscuro ? "bg-tierra" : "bg-tierra-oscura";
  // Sobre oscuro se mantiene gris-medio (5.15:1 sobre tinta, AA ✓).
  const textColor = sobreOscuro ? "text-gris-medio" : "text-gris-oscuro";

  return (
    <div className={`grit-label ${textColor} ${className}`}>
      <span
        className={`h-[7px] w-[7px] flex-shrink-0 rounded-full ${dotColor}`}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
