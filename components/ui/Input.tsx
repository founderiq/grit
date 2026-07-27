"use client";

import { useId } from "react";

/**
 * <Input /> — campo de texto del Design System (specs/07-form-controls.md).
 *
 * ⚠️ DERIVADO: el repo original no tenía controles de formulario. Pendiente
 * de sign-off de diseño.
 *
 * El error se asocia por `aria-describedby` y se marca con `aria-invalid`,
 * nunca solo por color. El anillo de foco lo aporta la regla global
 * `:focus-visible` con outline — sin `ring-*`, que compila a box-shadow.
 */
type InputProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Mensaje de error. Su presencia marca el campo como inválido. */
  error?: string;
  /** Texto de ayuda debajo del campo. */
  ayuda?: string;
  required?: boolean;
  type?: "text" | "tel" | "url";
  autoComplete?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
};

export default function Input({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  ayuda,
  required = false,
  type = "text",
  autoComplete,
  inputRef,
  className = "",
}: InputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const ayudaId = `${id}-ayuda`;

  const describedBy =
    [error ? errorId : null, ayuda ? ayudaId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-[12px] font-semibold text-tinta lg:text-[12.5px]"
      >
        {label}
        {required && (
          <span className="ml-1 text-tierra-oscura" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-[6px] block w-full rounded-strip border-hairline bg-superficie-input px-[14px] py-3 text-[14px] text-tinta placeholder:text-gris-oscuro ${
          error ? "border-tierra-oscura" : "border-borde-claro"
        }`}
      />

      {ayuda && (
        <p id={ayudaId} className="m-0 mt-[6px] text-[11.5px] text-gris-oscuro lg:text-[12px]">
          {ayuda}
        </p>
      )}

      {error && (
        <p id={errorId} className="m-0 mt-[6px] text-[11.5px] text-tierra-oscura">
          {error}
        </p>
      )}
    </div>
  );
}
