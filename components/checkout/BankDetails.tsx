"use client";

import { useEffect, useRef, useState } from "react";
import { IconCopy } from "@/components/ui/ProductoIcons";
import { BANCO, CHECKOUT, LINKS } from "@/lib/content";
import { copiarAlPortapapeles, textoDatosBancarios } from "@/lib/checkout";

/**
 * Tarjeta con los datos bancarios y un único botón que copia las seis líneas
 * juntas.
 *
 * No hay botones "Copiar" por campo, por diseño: uno solo, debajo de toda la
 * información.
 */
export default function BankDetails() {
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copiar = async () => {
    const ok = await copiarAlPortapapeles(textoDatosBancarios());
    setError(!ok);
    setCopiado(ok);
    if (ok) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiado(false), 1600);
    }
  };

  return (
    <div className="mt-3">
      <dl className="m-0 flex flex-col gap-3 rounded-card border-hairline border-borde-claro bg-superficie-clara px-4 py-[14px] lg:gap-[14px] lg:px-5 lg:py-[18px]">
        {BANCO.map(({ etiqueta, valor }) => (
          <div key={etiqueta}>
            <dt className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-gris-oscuro lg:text-[9px]">
              {etiqueta}
            </dt>
            <dd className="m-0 mt-1 text-[13.5px] font-semibold text-tinta lg:text-[14.5px]">
              {valor}
            </dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={copiar}
        className="mt-[11px] flex w-full items-center justify-center gap-2 rounded-pill border-hairline border-borde-claro bg-hueso px-4 py-[11px] text-[12.5px] font-semibold text-tinta transition-colors duration-control ease-grit hover:bg-superficie-clara lg:mt-3 lg:px-4 lg:py-3 lg:text-[13.5px]"
      >
        <IconCopy width={13} className="lg:hidden" aria-hidden="true" />
        <IconCopy width={15} className="hidden lg:block" aria-hidden="true" />
        {copiado ? CHECKOUT.pago.copiado : CHECKOUT.pago.copiar}
      </button>

      {/* El resultado de la copia se anuncia de forma no intrusiva. */}
      <p aria-live="polite" className="sr-only">
        {copiado ? CHECKOUT.pago.copiado : ""}
      </p>

      {error && (
        <p className="m-0 mt-2 text-[12px] text-tierra-oscura">
          {CHECKOUT.pago.copiarError}
        </p>
      )}

      <p className="m-0 mt-4 text-[12.5px] leading-[1.6] text-gris-tinta lg:text-[13.5px]">
        <strong className="font-semibold">
          {CHECKOUT.pago.instruccion.inicio}
        </strong>
        {CHECKOUT.pago.instruccion.resto}
        <strong className="font-semibold">{LINKS.whatsappVisible}</strong>
        <span className="hidden lg:inline">
          {CHECKOUT.pago.instruccion.cierre}
        </span>
        <span className="lg:hidden">.</span>
      </p>
    </div>
  );
}
