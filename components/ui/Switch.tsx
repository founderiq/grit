"use client";

/**
 * <Switch /> — interruptor del Design System (specs/07-form-controls.md).
 *
 * ⚠️ DERIVADO: no existía en el repo original. Pendiente de sign-off.
 *
 * Es un `role="switch"` con `aria-checked`, siempre acompañado de una etiqueta
 * visible. Se opera con Espacio y Enter como cualquier botón.
 */
type SwitchProps = {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Etiqueta accesible; la visible la aporta la fila que lo contiene. */
  label: string;
  className?: string;
};

export default function Switch({
  checked,
  onChange,
  label,
  className = "",
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        // La fila que lo contiene también alterna: se corta la propagación
        // para que un click sobre el switch no cuente dos veces.
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative h-5 w-[34px] flex-shrink-0 rounded-pill transition-colors duration-control ease-grit ${
        checked ? "bg-tinta" : "bg-gris-copy"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute top-[2px] h-4 w-4 rounded-pill border-hairline border-tinta bg-hueso transition-[left] duration-control ease-grit"
        style={{ left: checked ? 16 : 2 }}
      />
    </button>
  );
}
