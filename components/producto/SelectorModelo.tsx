"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { IconCheck, IconChevronDown } from "@/components/ui/ProductoIcons";
import { PRODUCTO_MODELOS, type ModeloId } from "@/lib/content";
import { getModelo } from "@/lib/modelos";

/** Alto aproximado de la lista abierta, para decidir si abre hacia arriba. */
const ALTO_LISTA = 330;

/**
 * Selector de modelo de una pulsera: un botón con la miniatura y el nombre
 * del modelo elegido que despliega la lista de los seis modelos.
 *
 * Patrón WAI-ARIA "select-only combobox" simplificado a botón + listbox:
 * flechas, Home/End, Enter/Espacio eligen, Escape cierra y devuelve el foco
 * al botón, Tab cierra y sigue el orden normal. El click afuera cierra.
 *
 * Nunca hay un estado "sin elegir": siempre muestra un modelo válido.
 */
export default function SelectorModelo({
  valor,
  onCambio,
  etiquetaId,
}: {
  valor: ModeloId;
  onCambio: (id: ModeloId) => void;
  /** Id del texto "Pulsera N" que nombra al selector. */
  etiquetaId: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [haciaArriba, setHaciaArriba] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const modelo = getModelo(valor);
  const indiceValor = Math.max(
    0,
    PRODUCTO_MODELOS.findIndex((m) => m.id === valor),
  );

  const abrir = (indice = indiceValor) => {
    // Abre hacia arriba solo si abajo no entra y arriba sí.
    const r = botonRef.current?.getBoundingClientRect();
    if (r) {
      const abajo = window.innerHeight - r.bottom;
      setHaciaArriba(abajo < ALTO_LISTA && r.top > abajo);
    }
    setActivo(indice);
    setAbierto(true);
  };

  const cerrar = (devolverFoco: boolean) => {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  };

  const elegir = (i: number) => {
    const m = PRODUCTO_MODELOS[i];
    if (m) onCambio(m.id);
    cerrar(true);
  };

  // Al abrir, el foco pasa a la lista para que el teclado la recorra.
  useEffect(() => {
    if (abierto) listaRef.current?.focus();
  }, [abierto]);

  // Click o toque fuera del selector: cierra sin elegir.
  useEffect(() => {
    if (!abierto) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!raizRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [abierto]);

  const onKeyDownBoton = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      abrir();
    }
  };

  const onKeyDownLista = (e: React.KeyboardEvent) => {
    const total = PRODUCTO_MODELOS.length;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActivo((i) => Math.min(total - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActivo((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActivo(0);
        break;
      case "End":
        e.preventDefault();
        setActivo(total - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        elegir(activo);
        break;
      case "Escape":
        e.preventDefault();
        // Que no cierre también otro diálogo abierto por encima.
        e.stopPropagation();
        cerrar(true);
        break;
      case "Tab":
        cerrar(false);
        break;
    }
  };

  return (
    <div ref={raizRef} className="relative min-w-0">
      <button
        ref={botonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? `${id}-lista` : undefined}
        aria-labelledby={`${etiquetaId} ${id}-valor`}
        onClick={() => (abierto ? cerrar(false) : abrir())}
        onKeyDown={onKeyDownBoton}
        className={`flex min-h-[52px] w-full items-center gap-3 rounded-strip border-hairline bg-superficie-input py-[7px] pl-[7px] pr-3 text-left transition-[border-color] duration-control ease-grit ${
          abierto ? "border-tinta" : "border-borde-claro hover:border-gris-claro"
        }`}
      >
        <span className="relative h-[38px] w-[38px] flex-shrink-0 overflow-hidden rounded-image border-hairline border-borde-claro bg-white">
          <Image
            src={modelo.src}
            alt=""
            fill
            sizes="38px"
            className="object-contain"
          />
        </span>
        <span
          id={`${id}-valor`}
          className="min-w-0 flex-1 truncate font-archivo text-[14px] font-bold text-tinta"
        >
          {modelo.nombre}
        </span>
        <IconChevronDown
          width={16}
          className={`flex-shrink-0 text-gris-oscuro transition-transform duration-control ease-grit ${
            abierto ? "rotate-180" : ""
          }`}
        />
      </button>

      {abierto && (
        <ul
          ref={listaRef}
          id={`${id}-lista`}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={etiquetaId}
          aria-activedescendant={`${id}-op-${activo}`}
          onKeyDown={onKeyDownLista}
          className={`absolute left-0 right-0 z-20 m-0 list-none rounded-card border-hairline border-borde-claro bg-hueso p-[6px] shadow-[0_10px_28px_rgba(20,17,15,0.14)] focus:outline-none ${
            haciaArriba ? "bottom-full mb-[6px]" : "top-full mt-[6px]"
          }`}
        >
          {PRODUCTO_MODELOS.map((m, i) => {
            const elegido = m.id === valor;
            return (
              <li
                key={m.id}
                id={`${id}-op-${i}`}
                role="option"
                aria-selected={elegido}
                onClick={() => elegir(i)}
                onMouseMove={() => activo !== i && setActivo(i)}
                // La opción activa lleva borde tinta además del fondo: es el
                // indicador de foco del teclado dentro de la lista.
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-strip border-hairline px-[6px] py-[5px] ${
                  i === activo ? "border-tinta bg-superficie-clara" : "border-transparent"
                }`}
              >
                <span className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-image border-hairline border-borde-claro bg-white">
                  <Image src={m.src} alt="" fill sizes="40px" className="object-contain" />
                </span>
                <span
                  className={`min-w-0 flex-1 text-[14px] text-tinta ${
                    elegido ? "font-bold" : "font-medium"
                  }`}
                >
                  {m.nombre}
                </span>
                {elegido && <IconCheck width={16} className="flex-shrink-0 text-tinta" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
