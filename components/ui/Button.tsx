/**
 * <Button /> — botón del Design System (specs/05-buttons.md).
 *
 * Todos los botones son píldora completa en todos los tamaños. Sin borde, sin
 * sombra, sin escala en interacción: el hover cambia solo el color de fondo.
 *
 * Los valores de `primary` (#FF8A53 / #E8753F) fueron aprobados en revisión de
 * diseño y reemplazan al #C2693F del repo. Ojo con los dos roles del acento:
 * `clay-400`/naranja es el acento INTERACTIVO (controles) y `clay-600`/tierra
 * el acento de MARCA (punto final de titulares, puntos de sección, números).
 * No intercambiarlos.
 *
 * ⚠️ DERIVADOS pendientes de sign-off de diseño: los estados focus-visible,
 * disabled y loading no existían en el producto original.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "light" | "dark" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
};

const VARIANTES: Record<ButtonVariant, string> = {
  // El texto nunca cambia en hover para las tres variantes rellenas.
  primary: "bg-naranja text-tinta hover:bg-naranja-oscura",
  light: "bg-hueso text-tinta hover:bg-bone-300",
  dark: "bg-tinta text-hueso hover:bg-tinta-2",
  ghost: "bg-transparent text-gris-copy hover:text-hueso",
};

/** `sm` es el único tamaño que usa Inter: es un control de UI, no display. */
const TAMANOS: Record<ButtonSize, string> = {
  sm: "px-[17px] py-[9px] font-inter text-[12px] font-semibold",
  md: "px-[26px] py-[15px] font-archivo text-[15px] font-bold",
  lg: "px-[26px] py-[17px] font-archivo text-[16px] font-bold",
};

/** Ghost ignora el tamaño: Inter 14.5/600, padding 6px, gap de 6px al ícono. */
const GHOST = "gap-[6px] p-[6px] font-inter text-[14.5px] font-semibold";

/**
 * Spinner de carga: arco de 1.5px en currentColor. Es la única rotación
 * permitida en el sistema y solo aplica acá.
 */
function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
      style={{ animationDuration: "700ms" }}
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.25"
      />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const esGhost = variant === "ghost";

  const clases = [
    "inline-flex items-center justify-center rounded-pill text-center leading-none",
    // Se enumeran las propiedades: nunca transition-all.
    "transition-[color,background-color,border-color] duration-control ease-grit",
    // El foco lo aporta la regla global :focus-visible de globals.css, que ya
    // resuelve el color por superficie. No se agrega nada acá a propósito:
    // cualquier utilidad de foco competiría con ella en el mismo layer.
    "disabled:cursor-not-allowed disabled:opacity-40",
    VARIANTES[variant],
    esGhost ? GHOST : TAMANOS[size],
    fullWidth ? "flex w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={clases}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner />
          {/* La etiqueta accesible se mantiene aunque no se vea. */}
          <span className="sr-only">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
