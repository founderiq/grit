"use client";

/**
 * Fila seleccionable del checkout: el chrome compartido por las opciones de
 * envío y las de método de pago (specs 03 §3 y §4).
 *
 * Seleccionada: borde 1.5px tinta y fondo superficie-clara.
 * Inactiva: borde 1.5px borde-claro y fondo transparente.
 */
type OptionRowProps = {
  seleccionada: boolean;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<"div">, "children">;

export default function OptionRow({
  seleccionada,
  children,
  className = "",
  ...rest
}: OptionRowProps) {
  return (
    <div
      {...rest}
      className={`rounded-card border-strong transition-[border-color,background-color] duration-control ease-grit ${
        seleccionada
          ? "border-tinta bg-superficie-clara"
          : "border-borde-claro bg-transparent"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Círculo del radio. El punto activo es un borde interior, igual que en el
 * selector de bundles de la página de producto.
 */
export function RadioDot({ seleccionado }: { seleccionado: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`box-border h-[17px] w-[17px] flex-shrink-0 rounded-pill bg-hueso lg:h-[18px] lg:w-[18px] ${
        seleccionado
          ? "border-[5.5px] border-tinta"
          : "border-[1.5px] border-gris-oscuro"
      }`}
    />
  );
}
