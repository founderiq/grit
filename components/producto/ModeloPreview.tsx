"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { PRODUCTO_MODELOS_COPY, type ModeloId } from "@/lib/content";
import { getModelo } from "@/lib/modelos";

/**
 * Vista ampliada de una pulsera de "Tu pack incluye".
 *
 * Sigue las mismas convenciones que el cart drawer: fondo que cierra con un
 * click, Escape cierra, Tab queda atrapado adentro, el scroll del body se
 * bloquea compensando el ancho de la barra (sin salto de layout) y al cerrar
 * el foco vuelve a la tarjeta que lo abrió.
 *
 * Se monta en un portal sobre `body` para que ningún contenedor de la columna
 * de compra pueda recortarlo.
 */
export default function ModeloPreview({
  numero,
  modeloId,
  onCerrar,
}: {
  /** Posición de la pulsera en el pack (1, 2, 3). */
  numero: number;
  modeloId: ModeloId;
  onCerrar: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const tituloId = useId();
  const modelo = getModelo(modeloId);

  // Bloqueo de scroll + foco inicial + devolución del foco al cerrar.
  useEffect(() => {
    const { body } = document;
    const overflowPrevio = body.style.overflow;
    const paddingPrevio = body.style.paddingRight;
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth;
    const disparador = document.activeElement as HTMLElement | null;

    body.style.overflow = "hidden";
    if (anchoBarra > 0) body.style.paddingRight = `${anchoBarra}px`;
    cerrarRef.current?.focus();

    return () => {
      body.style.overflow = overflowPrevio;
      body.style.paddingRight = paddingPrevio;
      if (disparador?.isConnected) disparador.focus();
    };
  }, []);

  // Escape cierra; Tab no sale del diálogo.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCerrar();
        return;
      }
      if (e.key !== "Tab") return;
      const nodos = panelRef.current?.querySelectorAll<HTMLElement>("button");
      if (!nodos || nodos.length === 0) return;
      const primero = nodos[0]!;
      const ultimo = nodos[nodos.length - 1]!;
      const activo = document.activeElement;
      if (e.shiftKey && (activo === primero || !panelRef.current?.contains(activo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCerrar]);

  return createPortal(
    <div className="fixed inset-0 z-overlay flex items-center justify-center p-4 sm:p-8">
      <button
        type="button"
        aria-label={PRODUCTO_MODELOS_COPY.cerrarPreview}
        tabIndex={-1}
        onClick={onCerrar}
        className="absolute inset-0 h-full w-full cursor-default bg-[rgba(20,17,15,0.6)]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        // El ancho también se acota por el alto de la ventana: en un celular
        // apaisado la foto cuadrada nunca queda más alta que la pantalla.
        className="grit-on-light relative w-full max-w-[min(640px,calc(100dvh-120px))] rounded-summary bg-hueso p-3 sm:p-4"
      >
        <div className="flex items-center justify-between gap-3 pb-3 pl-1">
          <p
            id={tituloId}
            className="m-0 min-w-0 truncate font-archivo text-[15px] font-bold uppercase tracking-[-0.01em] text-tinta lg:text-[16px]"
          >
            <span className="font-mono text-[11px] font-normal tracking-[0.1em] text-gris-oscuro">
              #{numero}
            </span>{" "}
            {modelo.nombre}
          </p>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            aria-label={PRODUCTO_MODELOS_COPY.cerrarPreview}
            className="-my-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-pill border-hairline border-borde-claro font-archivo text-[22px] leading-none text-tinta transition-colors duration-control ease-grit hover:bg-superficie-clara"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="relative aspect-square w-full overflow-hidden rounded-image bg-white">
          <Image
            src={modelo.src}
            alt={modelo.alt}
            fill
            sizes="(max-width: 700px) 92vw, 640px"
            className="object-contain"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
