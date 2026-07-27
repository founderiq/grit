"use client";

import { useCart } from "@/context/CartContext";

/**
 * Botón de carrito del header, con contador de pulseras.
 *
 * Vive acá y no dentro de <Header /> para que el módulo del carrito no entre
 * en el bundle de la landing: el Header es compartido y solo recibe este
 * botón, ya renderizado, en las rutas que tienen carrito.
 */
export default function CartButton() {
  const cart = useCart();
  if (!cart) return null;

  const { unidades, hidratado } = cart;

  return (
    <button
      type="button"
      onClick={(e) => cart.abrir(e.currentTarget)}
      aria-label={`Abrir carrito, ${unidades} ${
        unidades === 1 ? "pulsera" : "pulseras"
      }`}
      className="relative flex h-11 w-11 items-center justify-center text-tinta transition-colors duration-control hover:text-tierra-oscura"
    >
      <svg
        viewBox="0 0 24 24"
        width={20}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 7h14l-1.2 11.1A2 2 0 0 1 15.8 20H8.2a2 2 0 0 1-2-1.9L5 7Z" />
        <path d="M9 7V5.6A3 3 0 0 1 12 3a3 3 0 0 1 3 2.6V7" />
      </svg>

      {/* El contador espera a la hidratación para no pintar un 0 y saltar al
          valor real un instante después. */}
      {hidratado && unidades > 0 && (
        <span className="absolute right-[5px] top-[5px] flex h-4 min-w-4 items-center justify-center rounded-pill bg-tierra px-1 font-mono text-[9px] leading-none text-hueso">
          {unidades}
        </span>
      )}
    </button>
  );
}
