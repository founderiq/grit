"use client";

import Image from "next/image";
import Button from "@/components/ui/Button";
import { CART_UPSELL, EXTRA, fmtGs } from "@/lib/content";

/**
 * Tarjeta punteada de la oferta de la pulsera extra.
 * Se muestra solo mientras la extra NO está en el carrito; al agregarla, el
 * drawer la reemplaza por la fila de <CartExtraItem />.
 */
export default function CartUpsell({ onAgregar }: { onAgregar: () => void }) {
  return (
    <div className="rounded-card border-hairline border-dashed border-tierra bg-[rgba(194,105,63,0.06)] px-[14px] py-3 lg:px-4 lg:py-[14px]">
      <div className="flex items-start gap-3 lg:items-center">
        <Image
          src={CART_UPSELL.thumb}
          alt=""
          width={52}
          height={52}
          sizes="52px"
          className="h-11 w-11 flex-shrink-0 rounded-image object-cover lg:h-[52px] lg:w-[52px]"
        />

        <div className="min-w-0 flex-1">
          <p className="m-0 text-[12.5px] font-semibold leading-[1.35] text-tinta lg:text-[13.5px]">
            {CART_UPSELL.titulo}{" "}
            <span className="text-tierra-oscura">{CART_UPSELL.destacado}</span>
          </p>
          <p className="m-0 mt-1 text-[11.5px] leading-[1.45] text-gris-oscuro lg:text-[12px]">
            {CART_UPSELL.sub}
          </p>
          <p className="m-0 mt-2 flex items-baseline gap-2">
            <span className="font-archivo text-[14px] font-extrabold text-tinta">
              {fmtGs(EXTRA.precio)}
            </span>
            <span className="text-[11px] text-gris-oscuro line-through">
              {fmtGs(EXTRA.compare)}
            </span>
          </p>

          {/* En mobile el botón baja debajo del copy, alineado a la derecha. */}
          <div className="mt-3 flex justify-end lg:hidden">
            <Button variant="dark" size="sm" onClick={onAgregar} className="min-h-11">
              {CART_UPSELL.cta}
            </Button>
          </div>
        </div>

        <div className="hidden flex-shrink-0 lg:block">
          <Button variant="dark" size="sm" onClick={onAgregar}>
            {CART_UPSELL.cta}
          </Button>
        </div>
      </div>
    </div>
  );
}
