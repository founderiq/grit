"use client";

import { useRef } from "react";
import OptionRow, { RadioDot } from "./OptionRow";
import BankDetails from "./BankDetails";
import { CHECKOUT } from "@/lib/content";
import { PAGOS_FLAGS } from "@/lib/feature-flags";
import type { MetodoPago } from "@/lib/checkout";

/**
 * Métodos que se ofrecen. Pago online se apaga desde `PAGOS_FLAGS` — la
 * lógica de `tarjeta` sigue intacta en todo el resto del sistema, solo deja de
 * aparecer acá. Con un solo método en la lista, esta misma fila queda
 * seleccionada y expandida sola: no hace falta ningún caso especial.
 */
const METODOS: MetodoPago[] = PAGOS_FLAGS.onlinePaymentsEnabled
  ? ["transferencia", "tarjeta"]
  : ["transferencia"];

/**
 * Método de pago. Solo una opción se expande a la vez.
 *
 * La opción de tarjeta es únicamente seleccionable: no hay formulario
 * embebido, ni número de tarjeta, ni vencimiento, ni CVC, ni iframe de pago
 * en ninguna parte del proyecto. El cobro ocurre en una página externa.
 */
type PaymentMethodsProps = {
  metodo: MetodoPago;
  onMetodo: (m: MetodoPago) => void;
};

export default function PaymentMethods({
  metodo,
  onMetodo,
}: PaymentMethodsProps) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent) => {
    const teclas = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
    if (!teclas.includes(e.key)) return;
    e.preventDefault();
    const i = METODOS.indexOf(metodo);
    const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    const siguiente = METODOS[(i + delta + METODOS.length) % METODOS.length]!;
    onMetodo(siguiente);
    refs.current[siguiente]?.focus();
  };

  return (
    <fieldset className="m-0 mt-7 border-0 p-0 lg:mt-[34px]">
      <legend className="mb-3 font-archivo text-[15px] font-bold uppercase tracking-[-0.01em] text-tinta lg:text-[17px]">
        {CHECKOUT.seccionPago}
      </legend>

      <div role="radiogroup" aria-label={CHECKOUT.seccionPago} className="flex flex-col gap-2">
        {METODOS.map((id) => {
          const sel = id === metodo;
          const esTransfer = id === "transferencia";
          return (
            <OptionRow key={id} seleccionada={sel} className={sel ? "bg-[#F7F3EB]" : ""}>
              <div
                ref={(el) => {
                  refs.current[id] = el;
                }}
                role="radio"
                aria-checked={sel}
                tabIndex={sel ? 0 : -1}
                onClick={() => onMetodo(id)}
                onKeyDown={onKeyDown}
                className="flex cursor-pointer items-center gap-[11px] px-[14px] py-3 lg:gap-3 lg:px-4 lg:py-[13px]"
              >
                <RadioDot seleccionado={sel} />
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-tinta lg:text-[14.5px]">
                    {esTransfer ? (
                      CHECKOUT.pago.transferencia
                    ) : (
                      <>
                        <span className="lg:hidden">
                          {CHECKOUT.pago.tarjetaCorto}
                        </span>
                        <span className="hidden lg:inline">
                          {CHECKOUT.pago.tarjeta}
                        </span>
                      </>
                    )}
                  </span>

                  {esTransfer ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-gris-oscuro">
                      {CHECKOUT.pago.sinRecargo}
                    </span>
                  ) : (
                    <span className="flex gap-1">
                      <span className="rounded-[4px] border-hairline border-borde-claro px-[5px] py-[2px] font-mono text-[8px] uppercase tracking-[0.06em] text-gris-oscuro">
                        Visa
                      </span>
                      <span className="rounded-[4px] border-hairline border-borde-claro px-[5px] py-[2px] font-mono text-[8px] uppercase tracking-[0.06em] text-gris-oscuro">
                        <span className="lg:hidden">MC</span>
                        <span className="hidden lg:inline">Mastercard</span>
                      </span>
                    </span>
                  )}
                </span>
              </div>

              {sel && (
                <div className="px-[14px] pb-[14px] lg:px-4 lg:pb-4">
                  {esTransfer ? (
                    <BankDetails />
                  ) : (
                    <p className="m-0 text-[12px] leading-[1.6] text-gris-oscuro lg:text-[13px]">
                      {CHECKOUT.pago.tarjetaNota}
                    </p>
                  )}
                </div>
              )}
            </OptionRow>
          );
        })}
      </div>
    </fieldset>
  );
}
