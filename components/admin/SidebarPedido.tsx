"use client";

import { useCallback, useEffect, useRef } from "react";
import { ADMIN } from "@/lib/admin-content";
import { useNavegar } from "@/components/admin/useNavegar";

/** X de cierre: dos trazos de 1,5px en currentColor, como el resto del sistema. */
function IconCerrar({ width = 15 }: { width?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={width}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Sidebar del detalle de pedido.
 *
 * Abre sobre la página, sin navegar a otra ruta, pero el pedido abierto vive en
 * la URL (`?pedido=<uuid>`): así se puede recargar, compartir o volver atrás.
 * El contenido llega como `children` ya renderizado en el servidor; este
 * componente solo se ocupa del comportamiento de la capa.
 *
 * Accesibilidad: `role="dialog"` + `aria-modal`, foco al abrir, Escape cierra,
 * Tab queda atrapado adentro y al cerrar el foco vuelve al documento. Mismo
 * patrón que el carrito del ecommerce.
 */
export default function SidebarPedido({
  numero,
  params,
  children,
}: {
  numero: string;
  params: Record<string, string>;
  children: React.ReactNode;
}) {
  const { ir } = useNavegar(params);
  const panelRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  const cerrar = useCallback(() => ir({ pedido: null }), [ir]);

  // Al abrir: se bloquea el scroll del fondo compensando el ancho de la barra
  // para que la página no salte, y el foco entra al panel.
  useEffect(() => {
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
  }, []);

  // Escape cierra; Tab da la vuelta dentro del panel. Los focusables se
  // consultan en cada Tab porque el contenido cambia: llega por streaming y
  // algunos controles se deshabilitan mientras guardan.
  useEffect(() => {
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
  }, [cerrar]);

  return (
    <div className="fixed inset-0 z-overlay">
      <button
        type="button"
        aria-label={ADMIN.detalle.cerrar}
        tabIndex={-1}
        onClick={cerrar}
        className="absolute inset-0 h-full w-full cursor-default bg-[rgba(20,17,15,0.5)]"
      />

      {/* En móvil ocupa casi toda la pantalla; en escritorio es una columna
          fija a la derecha. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${ADMIN.detalle.eyebrow} ${numero}`}
        className="grit-on-light absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col border-l border-borde-claro bg-hueso text-tinta sm:w-[92%]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-borde-claro bg-superficie-input px-5 py-4">
          <div>
            <p className="m-0 font-mono text-[9px] uppercase tracking-[0.12em] text-gris-oscuro">
              {ADMIN.detalle.eyebrow}
            </p>
            <p className="m-0 mt-[5px] font-archivo text-[16px] font-bold leading-[1.15] tracking-[-0.01em]">
              {numero}
            </p>
          </div>

          <button
            ref={cerrarRef}
            type="button"
            onClick={cerrar}
            aria-label={ADMIN.detalle.cerrar}
            className="-mr-2 -mt-1 flex h-11 w-11 items-center justify-center rounded-pill text-tinta transition-colors duration-control ease-grit hover:bg-bone-300"
          >
            <IconCerrar width={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
