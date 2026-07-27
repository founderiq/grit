"use client";

import { useRef } from "react";
import Switch from "@/components/ui/Switch";
import OptionRow, { RadioDot } from "./OptionRow";
import { CHECKOUT, ENVIOS, VIP, fmtGs, type ZonaId } from "@/lib/content";

const ZONAS: ZonaId[] = ["asuncion", "interior"];

/**
 * Envío: zonas en un radiogroup y el toggle de Envío Prioritario VIP.
 *
 * Cuando el pedido llega a 3 pulseras el envío estándar es gratis, pero la
 * zona sigue siendo elegible: define el método y el plazo de entrega.
 * El VIP se cobra igual aunque el envío estándar sea gratis.
 */
type ShippingOptionsProps = {
  zona: ZonaId;
  onZona: (z: ZonaId) => void;
  vip: boolean;
  onVip: (v: boolean) => void;
  envioGratis: boolean;
};

export default function ShippingOptions({
  zona,
  onZona,
  vip,
  onVip,
  envioGratis,
}: ShippingOptionsProps) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent) => {
    const teclas = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
    if (!teclas.includes(e.key)) return;
    e.preventDefault();
    const i = ZONAS.indexOf(zona);
    const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    const siguiente = ZONAS[(i + delta + ZONAS.length) % ZONAS.length]!;
    onZona(siguiente);
    refs.current[siguiente]?.focus();
  };

  return (
    <fieldset className="m-0 mt-7 border-0 p-0 lg:mt-[34px]">
      <legend className="mb-3 font-archivo text-[15px] font-bold uppercase tracking-[-0.01em] text-tinta lg:text-[17px]">
        {CHECKOUT.seccionEnvio}
      </legend>

      <div role="radiogroup" aria-label={CHECKOUT.seccionEnvio} className="flex flex-col gap-2">
        {ZONAS.map((id) => {
          const z = ENVIOS[id];
          const sel = id === zona;
          return (
            <OptionRow key={id} seleccionada={sel}>
              <div
                ref={(el) => {
                  refs.current[id] = el;
                }}
                role="radio"
                aria-checked={sel}
                tabIndex={sel ? 0 : -1}
                onClick={() => onZona(id)}
                onKeyDown={onKeyDown}
                className="flex cursor-pointer items-center gap-[11px] px-[14px] py-3 lg:gap-3 lg:px-4 lg:py-[13px]"
              >
                <RadioDot seleccionado={sel} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-tinta lg:text-[14px]">
                    {z.nombre}
                  </span>
                  <span className="mt-[2px] block text-[11.5px] text-gris-oscuro lg:text-[12px]">
                    {z.plazo}
                  </span>
                </span>
                <span className="flex-shrink-0 text-[13.5px] font-semibold text-tinta">
                  {envioGratis ? CHECKOUT.resumen.gratis : fmtGs(z.costo)}
                </span>
              </div>
            </OptionRow>
          );
        })}

        {/* Fuera del radiogroup: es un interruptor independiente. */}
        <OptionRow seleccionada={vip} className="mt-0">
          {/* Toda la fila alterna el VIP: el track del switch mide 34×20px por
              spec, así que el área táctil la aporta la fila completa. */}
          <div
            onClick={() => onVip(!vip)}
            className="flex cursor-pointer items-center gap-[11px] px-[14px] py-3 lg:gap-3 lg:px-4 lg:py-[13px]"
          >
            <Switch checked={vip} onChange={onVip} label={VIP.nombre} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-tinta lg:text-[14px]">
                  {VIP.nombre}
                </span>
                <span className="hidden rounded-pill bg-tierra-oscura px-2 py-[3px] font-mono text-[8.5px] uppercase tracking-[0.08em] text-hueso lg:inline">
                  {VIP.etiqueta}
                </span>
              </span>
              <span className="mt-[2px] block text-[11.5px] text-gris-oscuro lg:text-[12px]">
                {VIP.detalle}
              </span>
            </span>
            <span className="flex-shrink-0 text-[13.5px] font-semibold text-tierra-oscura">
              + {fmtGs(VIP.costo)}
            </span>
          </div>
        </OptionRow>
      </div>
    </fieldset>
  );
}
