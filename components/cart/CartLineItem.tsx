"use client";

import Image from "next/image";
import { IconMinus, IconPlus } from "@/components/ui/ProductoIcons";
import { CARRITO, fmtGs, type ProductoBundle } from "@/lib/content";
import { QTY_MAX, QTY_MIN } from "@/lib/cart";

/**
 * Fila del bundle en el carrito.
 *
 * El stepper aparece solo en el pack de 1: los packs de 2 y 3 tienen cantidad
 * fija. Cuando no hay stepper la fila conserva su altura y "Quitar" se queda
 * alineado a la derecha, sin dejar un hueco de control vacío.
 */
type CartLineItemProps = {
  bundle: ProductoBundle;
  cantidad: number;
  onSubir: () => void;
  onBajar: () => void;
  onQuitar: () => void;
};

export default function CartLineItem({
  bundle,
  cantidad,
  onSubir,
  onBajar,
  onQuitar,
}: CartLineItemProps) {
  const conStepper = !bundle.fijo;
  const precio = bundle.precio * (conStepper ? cantidad : 1);
  const compare = bundle.compare > 0 ? bundle.compare : 0;

  return (
    <div className="flex gap-3 border-b border-borde-claro pb-[14px] lg:gap-[14px] lg:pb-[18px]">
      <Image
        src={CARRITO.thumb}
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
              {bundle.nombreLargo}
            </p>
            <p className="m-0 mt-1 hidden font-mono text-[9.5px] uppercase tracking-[0.08em] text-gris-oscuro lg:block">
              {CARRITO.itemMeta}
            </p>
          </div>

          <div className="flex-shrink-0 text-right">
            <p
              className="m-0 font-archivo text-[13.5px] font-extrabold text-tinta lg:text-[14.5px]"
              aria-live="polite"
            >
              {fmtGs(precio)}
            </p>
            {compare > 0 && (
              <p className="m-0 text-[11px] text-gris-oscuro line-through">
                {fmtGs(compare)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-[9px] flex items-center lg:mt-[10px]">
          {conStepper && (
            <div className="flex items-center overflow-hidden rounded-pill border-hairline border-borde-claro">
              <button
                type="button"
                onClick={onBajar}
                disabled={cantidad <= QTY_MIN}
                aria-label="Quitar una unidad"
                className="flex h-[30px] w-8 items-center justify-center text-tinta transition-colors duration-control hover:bg-superficie-clara disabled:opacity-40 lg:h-7 lg:w-[30px]"
              >
                <IconMinus width={13} />
              </button>
              <span className="min-w-6 text-center text-[13px] font-semibold text-tinta">
                {cantidad}
              </span>
              <button
                type="button"
                onClick={onSubir}
                disabled={cantidad >= QTY_MAX}
                aria-label="Agregar una unidad"
                className="flex h-[30px] w-8 items-center justify-center text-tinta transition-colors duration-control hover:bg-superficie-clara disabled:opacity-40 lg:h-7 lg:w-[30px]"
              >
                <IconPlus width={13} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onQuitar}
            className="ml-auto min-h-11 font-mono text-[8.5px] uppercase tracking-[0.1em] text-gris-oscuro transition-colors duration-control hover:text-tierra-oscura lg:min-h-0 lg:text-[9px]"
          >
            {CARRITO.quitar}
          </button>
        </div>
      </div>
    </div>
  );
}
