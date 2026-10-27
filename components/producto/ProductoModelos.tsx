"use client";

import Image from "next/image";
import { useCallback, useId, useState } from "react";
import { IconExpand } from "@/components/ui/ProductoIcons";
import { PRODUCTO_MODELOS_COPY as COPY, type ModeloId } from "@/lib/content";
import { getModelo } from "@/lib/modelos";
import SelectorModelo from "./SelectorModelo";
import ModeloPreview from "./ModeloPreview";

/**
 * Elección de modelos de la columna de compra: un selector por pulsera del
 * pack y, debajo, "Tu pack incluye" con una tarjeta por pulsera. Las
 * tarjetas abren la vista ampliada.
 *
 * No tiene estado propio de modelos: lo recibe de <ProductoCompra />, que es
 * quien lo ajusta al cambiar de pack y lo manda al carrito o al checkout.
 */
export default function ProductoModelos({
  modelos,
  onCambio,
}: {
  modelos: ModeloId[];
  onCambio: (indice: number, id: ModeloId) => void;
}) {
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const base = useId();
  const cerrar = useCallback(() => setAmpliada(null), []);

  const modeloAmpliado = ampliada !== null ? modelos[ampliada] : undefined;

  return (
    <div className="mt-[18px] lg:mt-[22px]">
      <h2 className="m-0 font-archivo text-[14px] font-bold uppercase tracking-[-0.01em] text-tinta lg:text-[15px]">
        {modelos.length === 1 ? COPY.tituloUno : COPY.tituloVarios}
      </h2>

      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {modelos.map((modelo, i) => {
          const etiquetaId = `${base}-pulsera-${i}`;
          return (
            <li key={i} className="grid grid-cols-[74px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[84px_minmax(0,1fr)]">
              <span
                id={etiquetaId}
                className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-gris-oscuro"
              >
                {COPY.pulsera(i + 1)}
              </span>
              <SelectorModelo
                valor={modelo}
                onCambio={(id) => onCambio(i, id)}
                etiquetaId={etiquetaId}
              />
            </li>
          );
        })}
      </ul>

      <h2 className="m-0 mt-5 font-archivo text-[14px] font-bold uppercase tracking-[-0.01em] text-tinta lg:text-[15px]">
        {COPY.packIncluye}
      </h2>

      {/* Siempre tres columnas: una tarjeta no cambia de tamaño al pasar de
          un pack a otro, solo aparecen o desaparecen las de al lado. */}
      <ul className="m-0 mt-3 grid list-none grid-cols-3 gap-2 p-0 sm:gap-[10px]">
        {modelos.map((id, i) => {
          const modelo = getModelo(id);
          return (
            <li key={i} className="min-w-0">
              <button
                type="button"
                onClick={() => setAmpliada(i)}
                aria-label={COPY.ampliar(i + 1, modelo.nombre)}
                className="group w-full rounded-card border-hairline border-borde-claro bg-superficie-clara p-2 text-left transition-[border-color] duration-control ease-grit hover:border-gris-claro"
              >
                <span className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.08em] text-gris-oscuro">
                    #{i + 1}
                  </span>
                  <IconExpand
                    width={13}
                    className="text-gris-oscuro transition-colors duration-control group-hover:text-tinta"
                  />
                </span>
                <span className="relative mt-[6px] block aspect-square overflow-hidden rounded-image bg-white">
                  <Image
                    src={modelo.src}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 30vw, 150px"
                    className="object-contain"
                  />
                </span>
                <span className="mt-[7px] block truncate font-archivo text-[13px] font-bold text-tinta lg:text-[13.5px]">
                  {modelo.nombre}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {ampliada !== null && modeloAmpliado && (
        <ModeloPreview numero={ampliada + 1} modeloId={modeloAmpliado} onCerrar={cerrar} />
      )}
    </div>
  );
}
