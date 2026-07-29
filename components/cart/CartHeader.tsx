"use client";

import { forwardRef } from "react";
import { CARRITO } from "@/lib/content";

/**
 * Cabecera del drawer: "TU CARRITO (n)" y botón de cierre.
 * `n` es el total de pulseras — unidades del pack más la extra si está.
 */
type CartHeaderProps = {
  unidades: number;
  onCerrar: () => void;
  tituloId: string;
};

const CartHeader = forwardRef<HTMLButtonElement, CartHeaderProps>(
  function CartHeader({ unidades, onCerrar, tituloId }, ref) {
    return (
      <div className="flex items-center justify-between border-b border-borde-claro px-5 py-4 lg:px-[26px] lg:py-5">
        <h2
          id={tituloId}
          className="m-0 font-archivo text-[17px] font-extrabold uppercase tracking-[-0.01em] text-tinta lg:text-[19px]"
        >
          {CARRITO.titulo}{" "}
          <span className="font-semibold text-gris-oscuro">({unidades})</span>
        </h2>

        <button
          ref={ref}
          type="button"
          onClick={onCerrar}
          aria-label={CARRITO.cerrar}
          className="-mr-2 flex h-11 w-11 items-center justify-center font-archivo text-[20px] leading-none text-gris-oscuro transition-colors duration-control hover:text-tinta lg:text-[22px]"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    );
  },
);

export default CartHeader;
