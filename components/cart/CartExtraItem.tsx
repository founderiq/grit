"use client";

import Image from "next/image";
import { IconTrash } from "@/components/ui/ProductoIcons";
import { CART_UPSELL, EXTRA, fmtGs } from "@/lib/content";

/**
 * Fila de la pulsera extra promocional.
 * Sin stepper y sin campo de cantidad: solo el ícono de basurero. La extra
 * existe una sola vez o no existe.
 */
export default function CartExtraItem({ onQuitar }: { onQuitar: () => void }) {
  return (
    <div className="flex gap-3 border-b border-borde-claro pb-[14px] lg:gap-[14px] lg:pb-[18px]">
      <Image
        src={CART_UPSELL.thumb}
        alt=""
        width={78}
        height={78}
        sizes="78px"
        className="h-[66px] w-[66px] flex-shrink-0 rounded-image object-cover lg:h-[78px] lg:w-[78px]"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 font-archivo text-[13.5px] font-bold leading-[1.25] text-tinta lg:text-[14.5px]">
              {EXTRA.nombre}
            </p>
            <span className="mt-[6px] inline-flex rounded-pill bg-tierra px-2 py-[3px] font-mono text-[8px] uppercase tracking-[0.08em] text-hueso lg:text-[8.5px]">
              {EXTRA.descuento}
            </span>
          </div>

          <div className="flex flex-shrink-0 items-start gap-2">
            <div className="text-right">
              <p className="m-0 font-archivo text-[13.5px] font-extrabold text-tinta lg:text-[14.5px]">
                {fmtGs(EXTRA.precio)}
              </p>
              <p className="m-0 text-[11px] text-gris-oscuro line-through">
                {fmtGs(EXTRA.compare)}
              </p>
            </div>

            <button
              type="button"
              onClick={onQuitar}
              aria-label={CART_UPSELL.quitarLabel}
              className="-mr-2 flex h-11 w-11 items-center justify-center text-gris-oscuro transition-colors duration-control hover:text-tierra-oscura lg:h-8 lg:w-8"
            >
              <IconTrash width={15} className="lg:hidden" />
              <IconTrash width={16} className="hidden lg:block" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
