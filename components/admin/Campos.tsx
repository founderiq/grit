"use client";

import { useId } from "react";

/**
 * Campos de formulario del panel.
 *
 * Una sola definición para los tres formularios (pedido manual, costos y Ad
 * Spend) y para los del drawer. Reglas del sistema, aplicadas acá una vez:
 *
 *   · La etiqueta SIEMPRE es visible. Nunca un placeholder haciendo de label.
 *   · El error va debajo del campo al que pertenece, con texto, no solo color.
 *   · El campo con error queda vinculado a su mensaje con `aria-describedby` y
 *     marcado con `aria-invalid`, así un lector de pantalla lo anuncia junto.
 *   · Altura mínima de 44px: es el objetivo táctil del sistema.
 */

const BASE =
  "min-h-11 w-full rounded-strip border-hairline bg-superficie-input px-[12px] py-[9px] font-inter text-[13px] text-tinta placeholder:text-gris-oscuro disabled:cursor-not-allowed disabled:opacity-50";

const borde = (error?: string) =>
  error ? "border-estado-rojo-borde" : "border-borde-claro";

function Envoltorio({
  id,
  etiqueta,
  ayuda,
  error,
  children,
  className = "",
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[12px] font-semibold text-tinta">
        {etiqueta}
      </label>
      {children}
      {ayuda && !error && (
        <p className="m-0 mt-[5px] text-[11.5px] leading-[1.45] text-gris-oscuro">{ayuda}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="m-0 mt-[5px] text-[11.5px] leading-[1.45] text-estado-rojo-texto">
          {error}
        </p>
      )}
    </div>
  );
}

export function Campo({
  etiqueta,
  valor,
  onCambio,
  ayuda,
  error,
  tipo = "text",
  modo,
  placeholder,
  deshabilitado,
  className,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  ayuda?: string;
  error?: string;
  tipo?: "text" | "date" | "url";
  modo?: "numeric";
  placeholder?: string;
  deshabilitado?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <Envoltorio id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <input
        id={id}
        type={tipo}
        inputMode={modo}
        value={valor}
        placeholder={placeholder}
        disabled={deshabilitado}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onCambio(e.target.value)}
        className={`mt-[6px] ${BASE} ${borde(error)} ${modo === "numeric" ? "tabular-nums" : ""}`}
      />
    </Envoltorio>
  );
}

export function CampoSelect<T extends string>({
  etiqueta,
  valor,
  opciones,
  onCambio,
  ayuda,
  error,
  deshabilitado,
  className,
}: {
  etiqueta: string;
  valor: T;
  opciones: readonly { id: T; etiqueta: string }[];
  onCambio: (v: T) => void;
  ayuda?: string;
  error?: string;
  deshabilitado?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <Envoltorio id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <select
        id={id}
        value={valor}
        disabled={deshabilitado}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onCambio(e.target.value as T)}
        className={`mt-[6px] ${BASE} ${borde(error)}`}
      >
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </Envoltorio>
  );
}

export function CampoTexto({
  etiqueta,
  valor,
  onCambio,
  filas = 3,
  ayuda,
  error,
  placeholder,
  deshabilitado,
  className,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  filas?: number;
  ayuda?: string;
  error?: string;
  placeholder?: string;
  deshabilitado?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <Envoltorio id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <textarea
        id={id}
        rows={filas}
        value={valor}
        placeholder={placeholder}
        disabled={deshabilitado}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onCambio(e.target.value)}
        className={`mt-[6px] block w-full resize-y rounded-strip border-hairline ${borde(
          error,
        )} bg-superficie-input px-[12px] py-[10px] font-inter text-[13px] leading-[1.5] text-tinta placeholder:text-gris-oscuro disabled:cursor-not-allowed disabled:opacity-50`}
      />
    </Envoltorio>
  );
}

/** Casilla con etiqueta a la derecha y su propio texto de apoyo. */
export function CampoCheck({
  etiqueta,
  ayuda,
  valor,
  onCambio,
  deshabilitado,
  className = "",
}: {
  etiqueta: string;
  ayuda?: string;
  valor: boolean;
  onCambio: (v: boolean) => void;
  deshabilitado?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <div className="flex items-start gap-[10px]">
        <input
          id={id}
          type="checkbox"
          checked={valor}
          disabled={deshabilitado}
          onChange={(e) => onCambio(e.target.checked)}
          className="mt-[2px] h-[17px] w-[17px] shrink-0 accent-tinta disabled:cursor-not-allowed disabled:opacity-50"
        />
        <label htmlFor={id} className="text-[12.5px] leading-[1.45] text-tinta">
          {etiqueta}
          {ayuda && <span className="mt-[2px] block text-[11.5px] text-gris-oscuro">{ayuda}</span>}
        </label>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Botones
   ------------------------------------------------------------ */

const BOTON =
  "min-h-11 rounded-pill px-[22px] py-[11px] font-inter text-[13px] font-semibold transition-[background-color,color] duration-control ease-grit disabled:cursor-not-allowed disabled:opacity-50";

export function BotonPrimario({
  children,
  onClick,
  ocupado,
  deshabilitado,
  className = "",
  tipo = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ocupado?: boolean;
  deshabilitado?: boolean;
  className?: string;
  tipo?: "button" | "submit";
}) {
  return (
    <button
      type={tipo}
      onClick={onClick}
      disabled={deshabilitado || ocupado}
      aria-busy={ocupado || undefined}
      className={`${BOTON} bg-tinta text-hueso hover:bg-tinta-2 ${className}`}
    >
      {children}
    </button>
  );
}

export function BotonSecundario({
  children,
  onClick,
  ocupado,
  deshabilitado,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ocupado?: boolean;
  deshabilitado?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado || ocupado}
      aria-busy={ocupado || undefined}
      className={`${BOTON} border-hairline border-borde-claro bg-superficie-input text-tinta hover:bg-bone-300 ${className}`}
    >
      {children}
    </button>
  );
}

/** Bloque con título dentro de un formulario largo. */
export function Seccion({
  titulo,
  children,
  className = "",
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border-hairline border-borde-claro bg-superficie-input px-4 py-4 ${className}`}
    >
      <h3 className="m-0 mb-3 font-mono text-[9px] uppercase tracking-[0.12em] text-gris-oscuro">
        {titulo}
      </h3>
      {children}
    </section>
  );
}
