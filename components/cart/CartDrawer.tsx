"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { useCartRequerido } from "@/context/CartContext";
import { getBundle } from "@/lib/cart";
import CartHeader from "./CartHeader";
import CartFreeShipping from "./CartFreeShipping";
import CartLineItem from "./CartLineItem";
import CartExtraItem from "./CartExtraItem";
import CartUpsell from "./CartUpsell";
import CartTotals from "./CartTotals";
import CartEmpty from "./CartEmpty";

const FOCUSABLES =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Carrito lateral. Se monta una sola vez por ruta que tenga carrito y se
 * superpone a la página.
 *
 * El borde izquierdo es un hairline expresado como `box-shadow: -1px 0 0`
 * (la única excepción sancionada a la regla de sistema plano), no un
 * desenfoque.
 */
export default function CartDrawer() {
  const cart = useCartRequerido();
  const { estado, totales, progreso, vacio, unidades } = cart;

  const panelRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const tituloId = useId();
  const abierto = estado.isOpen;

  const cerrar = useCallback(() => cart.cerrar(), [cart]);

  // Al abrir: bloquea el scroll del body compensando el ancho de la barra
  // para que la página no salte, y lleva el foco al botón de cierre.
  useEffect(() => {
    if (!abierto) return;

    const { body } = document;
    const overflowPrevio = body.style.overflow;
    const paddingPrevio = body.style.paddingRight;
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (anchoBarra > 0) body.style.paddingRight = `${anchoBarra}px`;

    cerrarRef.current?.focus();

    return () => {
      body.style.overflow = overflowPrevio;
      body.style.paddingRight = paddingPrevio;
    };
  }, [abierto]);

  // Escape cierra; Tab queda atrapado dentro del panel.
  useEffect(() => {
    if (!abierto) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrar();
        return;
      }
      if (e.key !== "Tab") return;

      const nodos = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLES);
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
  }, [abierto, cerrar]);

  // Al cerrar, el foco vuelve al control que abrió el carrito.
  useEffect(() => {
    if (abierto) return;
    const disparador = cart.disparadorRef.current;
    if (disparador?.isConnected) disparador.focus();
    // Se corre solo en la transición abierto -> cerrado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  if (!abierto) return null;

  const bundle = estado.packId ? getBundle(estado.packId) : null;

  const verPacks = () => {
    cerrar();
    document.getElementById("comprar")?.scrollIntoView({ block: "start" });
  };

  return (
    <div className="fixed inset-0 z-overlay">
      <button
        type="button"
        aria-label="Cerrar carrito"
        tabIndex={-1}
        onClick={cerrar}
        className="absolute inset-0 h-full w-full cursor-default bg-[rgba(20,17,15,0.5)]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="grit-on-light absolute inset-y-0 right-0 flex w-[calc(100%-16px)] flex-col rounded-l-summary bg-hueso shadow-[-1px_0_0_rgba(20,17,15,0.4)] motion-safe:animate-[grit-drawer_260ms_ease-out] sm:w-[440px] sm:rounded-none sm:shadow-[-1px_0_0_#D8D1C3]"
      >
        <CartHeader
          ref={cerrarRef}
          unidades={unidades}
          onCerrar={cerrar}
          tituloId={tituloId}
        />

        {vacio ? (
          <CartEmpty onVerPacks={verPacks} />
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-[14px] overflow-y-auto px-5 py-4 lg:gap-[18px] lg:px-[26px] lg:py-[22px]">
              <CartFreeShipping progreso={progreso} />

              {bundle && (
                <CartLineItem
                  bundle={bundle}
                  cantidad={estado.packQty}
                  onSubir={cart.subirCantidad}
                  onBajar={cart.bajarCantidad}
                  onQuitar={cart.quitarBundle}
                />
              )}

              {estado.hasExtra ? (
                <CartExtraItem onQuitar={cart.quitarExtra} />
              ) : (
                <CartUpsell onAgregar={cart.agregarExtra} />
              )}
            </div>

            {/* onFinalizar se conecta en la FASE 4 con la ruta /checkout. */}
            <CartTotals totales={totales} />
          </>
        )}
      </div>
    </div>
  );
}
