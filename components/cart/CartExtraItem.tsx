"use client";

import Image from "next/image";
import { useId } from "react";
import { IconChevronDown, IconTrash } from "@/components/ui/ProductoIcons";
import {
  CART_UPSELL,
  EXTRA,
  PRODUCTO_MODELOS,
  PRODUCTO_MODELOS_COPY,
  fmtGs,
  type ModeloId,
} from "@/lib/content";
import { esModeloId, getModelo } from "@/lib/modelos";

/**
 * Fila de la pulsera extra promocional.
 * Sin stepper y sin campo de cantidad: solo el ícono de basurero. La extra
 * existe una sola vez o no existe.
 *
 * Como es una pulsera más, también tiene modelo: nace en Negro y se cambia
 * acá mismo con un select nativo, que es compacto y cómodo en mobile. La
 * miniatura muestra el modelo elegido.
 */
export default function CartExtraItem({
  modelo,
  onCambiarModelo,
  onQuitar,
}: {
  modelo: ModeloId;
  onCambiarModelo: (modelo: ModeloId) => void;
  onQuitar: () => void;
}) {
  const selectId = useId();
  const elegido = getModelo(modelo);

  return (
    <div className="flex gap-3 border-b border-borde-claro pb-[14px] lg:gap-[14px] lg:pb-[18px]">
      <Image
        src={elegido.src}
        alt=""
        width={78}
        height={78}
        sizes="78px"
        className="h-[66px] w-[66px] flex-shrink-0 rounded-image border-hairline border-borde-claro bg-white object-contain lg:h-[78px] lg:w-[78px]"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 font-archivo text-[13.5px] font-bold leading-[1.25] text-tinta lg:text-[14.5px]">
              {EXTRA.nombre}
            </p>
            {/* Fondo tierra-oscura, no tierra: hueso sobre #C2693F da 3.37:1
                y a 8px no califica como texto grande. Sobre #7A3B2B: 7.29:1. */}
            <span className="mt-[6px] inline-flex rounded-pill bg-tierra-oscura px-2 py-[3px] font-mono text-[8px] uppercase tracking-[0.08em] text-hueso lg:text-[8.5px]">
              {EXTRA.descuento}
            </span>

            <div className="mt-2 flex items-center gap-2">
              <label
                htmlFor={selectId}
                className="font-mono text-[9px] uppercase tracking-[0.08em] text-gris-oscuro"
              >
                {PRODUCTO_MODELOS_COPY.modeloExtra}
              </label>
              <span className="relative inline-flex">
                <select
                  id={selectId}
                  value={elegido.id}
                  onChange={(e) => {
                    if (esModeloId(e.target.value)) onCambiarModelo(e.target.value);
                  }}
                  className="min-h-9 appearance-none rounded-pill border-hairline border-borde-claro bg-superficie-input py-1 pl-3 pr-8 text-[12.5px] font-semibold text-tinta transition-[border-color] duration-control hover:border-gris-claro lg:min-h-8"
                >
                  {PRODUCTO_MODELOS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
                <IconChevronDown
                  width={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gris-oscuro"
                />
              </span>
            </div>
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
