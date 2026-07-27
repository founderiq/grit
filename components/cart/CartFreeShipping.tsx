"use client";

import { CARRITO, ENVIO_GRATIS_DESDE } from "@/lib/content";
import type { ProgresoEnvio } from "@/lib/cart";

/**
 * Tarjeta de progreso hacia el envío gratis, siempre visible arriba del
 * cuerpo del drawer.
 *
 * Es solo un indicador: el carrito nunca cotiza ni suma envío. El costo se
 * elige en el checkout.
 */
export default function CartFreeShipping({
  progreso,
}: {
  progreso: ProgresoEnvio;
}) {
  return (
    <div className="rounded-card border-hairline border-borde-claro bg-superficie-clara px-[14px] py-3 lg:px-4 lg:py-[14px]">
      <p className="m-0 text-center text-[12.5px] font-semibold leading-[1.4] text-tinta lg:text-[13px]">
        {progreso.mensaje}
      </p>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={ENVIO_GRATIS_DESDE}
        aria-valuenow={Math.min(progreso.unidades, ENVIO_GRATIS_DESDE)}
        aria-label={progreso.mensaje}
        className="mt-3 h-[6px] w-full overflow-hidden rounded-pill bg-pista"
      >
        <div
          className={`h-full rounded-pill transition-[width] duration-expand ease-grit ${
            progreso.alcanzado ? "bg-verde" : "bg-tierra"
          }`}
          style={{ width: `${progreso.pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.08em] text-gris-oscuro lg:text-[9px]">
        <span>{progreso.contador}</span>
        <span>{CARRITO.progreso.etiqueta}</span>
      </div>
    </div>
  );
}
