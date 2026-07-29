"use client";

import { useRouter } from "next/navigation";
import { IconShield } from "@/components/ui/ProductoIcons";
import { CARRITO, fmtGs } from "@/lib/content";
import type { Totales } from "@/lib/cart";

/**
 * Pie fijo del drawer: subtotal, ahorro, total, nota de envío y CTA.
 *
 * El envío NO se elige ni se cotiza acá — no hay radios de zona, ni toggle
 * VIP, ni línea de envío en el total. El costo se define en el checkout.
 */
type CartTotalsProps = {
  totales: Totales;
  /** Sobrescribe la navegación por defecto a /checkout. */
  onFinalizar?: () => void;
};

export default function CartTotals({ totales, onFinalizar }: CartTotalsProps) {
  const router = useRouter();

  /**
   * Va al checkout sin query params: el checkout lee el carrito persistido.
   * El carrito no se vacía — el cliente puede volver atrás.
   */
  const finalizar = () => {
    if (onFinalizar) {
      onFinalizar();
      return;
    }
    router.push("/checkout");
  };
  return (
    <div className="border-t border-borde-claro bg-hueso px-5 pb-[18px] pt-[14px] lg:px-[26px] lg:pb-[22px] lg:pt-[18px]">
      <div className="flex flex-col gap-[6px] lg:gap-[7px]">
        <div className="flex items-baseline justify-between text-[12.5px] lg:text-[13.5px]">
          <span className="text-gris-oscuro">{CARRITO.totales.subtotal}</span>
          <span className="font-semibold text-tinta">
            {fmtGs(totales.subtotal)}
          </span>
        </div>

        {totales.ahorro > 0 && (
          <div className="flex items-baseline justify-between text-[12.5px] lg:text-[13.5px]">
            <span className="text-gris-oscuro">{CARRITO.totales.ahorras}</span>
            <span className="font-semibold text-tierra-oscura">
              − {fmtGs(totales.ahorro)}
            </span>
          </div>
        )}

        <div className="mt-[6px] flex items-baseline justify-between border-t border-borde-claro pt-3">
          <span className="font-archivo text-[14px] font-extrabold uppercase tracking-[-0.01em] text-tinta lg:text-[15px]">
            {CARRITO.totales.total}
          </span>
          <span
            className="font-archivo text-[20px] font-black leading-none text-tinta lg:text-[22px]"
            aria-live="polite"
          >
            {fmtGs(totales.subtotal)}
          </span>
        </div>

        <p className="m-0 text-right text-[10.5px] text-gris-oscuro lg:text-[11px]">
          {CARRITO.totales.nota}
        </p>
      </div>

      <button
        type="button"
        onClick={finalizar}
        className="btn-naranja mt-3 lg:mt-[14px]"
      >
        {CARRITO.totales.cta}
      </button>

      <p className="m-0 mt-3 flex items-center justify-center gap-[6px] font-mono text-[8.5px] uppercase tracking-[0.08em] text-gris-oscuro lg:text-[9px]">
        <IconShield width={13} aria-hidden="true" />
        {CARRITO.totales.seguridad}
      </p>
    </div>
  );
}
