"use client";

import { useCallback, useEffect, useRef } from "react";

/** X de cierre: dos trazos de 1,5px en currentColor, como el resto del sistema. */
export function IconCerrar({ width = 15 }: { width?: number }) {
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

export type VarianteCapa = "drawer" | "modal" | "modal-ancho";

/**
 * Capa modal del panel: la misma para el drawer del pedido y para los tres
 * formularios (pedido manual, costos, Ad Spend).
 *
 * QUE ESTÉ EN UN SOLO LUGAR ES EL PUNTO. Todo lo que se espera de una capa
 * —abrir y cerrar al instante, overlay que cierra, X, Escape, foco atrapado
 * adentro, foco devuelto a quien la abrió, scroll del fondo bloqueado y scroll
 * propio adentro— se implementa una vez y lo heredan las cuatro superficies.
 *
 * INSTANTÁNEA POR CONSTRUCCIÓN
 *   Este componente no navega ni espera a nadie: aparece cuando el padre lo
 *   monta y desaparece cuando lo desmonta, así que el clic y el pintado ocurren
 *   en el mismo frame. Los datos llegan después, adentro.
 *
 * `puedeCerrar` permite que un formulario con cambios sin guardar intercepte el
 * cierre (overlay, X o Escape) y pida confirmación, en lugar de perder lo
 * escrito en silencio.
 */
export default function Capa({
  variante = "modal",
  eyebrow,
  titulo,
  etiqueta,
  onCerrar,
  puedeCerrar,
  cerrarEtiqueta = "Cerrar",
  children,
}: {
  variante?: VarianteCapa;
  eyebrow?: string;
  titulo: React.ReactNode;
  /** Nombre accesible del diálogo. Por defecto, el eyebrow más el título. */
  etiqueta?: string;
  onCerrar: () => void;
  puedeCerrar?: () => boolean;
  cerrarEtiqueta?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  // Se guarda en un ref para que Escape y el overlay usen siempre la versión
  // actual sin volver a suscribir el listener en cada render.
  const puedeRef = useRef(puedeCerrar);
  puedeRef.current = puedeCerrar;

  const cerrar = useCallback(() => {
    if (puedeRef.current && !puedeRef.current()) return;
    onCerrar();
  }, [onCerrar]);

  /* --- Scroll del fondo y foco de entrada --------------------------------
     Se bloquea el scroll compensando el ancho de la barra para que la página
     no salte, y el foco entra al panel. Al desmontar, el navegador devolvería
     el foco al <body>; se lo devuelve explícitamente a quien abrió la capa.  */
  useEffect(() => {
    const { body } = document;
    const overflowPrevio = body.style.overflow;
    const paddingPrevio = body.style.paddingRight;
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth;
    const origen = document.activeElement as HTMLElement | null;

    body.style.overflow = "hidden";
    if (anchoBarra > 0) body.style.paddingRight = `${anchoBarra}px`;

    cerrarRef.current?.focus();

    return () => {
      body.style.overflow = overflowPrevio;
      body.style.paddingRight = paddingPrevio;

      // Solo si sigue en el documento: la fila pudo haberse ido de la tabla.
      if (origen && origen.isConnected && typeof origen.focus === "function") {
        origen.focus({ preventScroll: true });
      }
    };
  }, []);

  // Escape cierra; Tab da la vuelta adentro. Los focusables se consultan en
  // cada Tab porque el contenido cambia: llega por fetch y algunos controles se
  // deshabilitan mientras guardan.
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

  const esDrawer = variante === "drawer";

  const caja = esDrawer
    ? "absolute right-0 top-0 h-full w-full max-w-[520px] border-l sm:w-[92%]"
    : `absolute left-1/2 top-1/2 max-h-[calc(100dvh-32px)] w-[calc(100%-24px)] -translate-x-1/2 -translate-y-1/2 rounded-card border-hairline ${
        variante === "modal-ancho" ? "max-w-[760px]" : "max-w-[520px]"
      }`;

  return (
    <div className="fixed inset-0 z-overlay">
      <button
        type="button"
        aria-label={cerrarEtiqueta}
        tabIndex={-1}
        onClick={cerrar}
        className="absolute inset-0 h-full w-full cursor-default bg-[rgba(20,17,15,0.5)]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta ?? [eyebrow, typeof titulo === "string" ? titulo : ""].join(" ").trim()}
        className={`grit-on-light flex flex-col overflow-hidden border-borde-claro bg-hueso text-tinta ${caja}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-borde-claro bg-superficie-input px-5 py-4">
          <div className="min-w-0">
            {eyebrow && (
              <p className="m-0 font-mono text-[9px] uppercase tracking-[0.12em] text-gris-oscuro">
                {eyebrow}
              </p>
            )}
            <p className="m-0 mt-[5px] truncate font-archivo text-[16px] font-bold leading-[1.15] tracking-[-0.01em]">
              {titulo}
            </p>
          </div>

          <button
            ref={cerrarRef}
            type="button"
            onClick={cerrar}
            aria-label={cerrarEtiqueta}
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-tinta transition-colors duration-control ease-grit hover:bg-bone-300"
          >
            <IconCerrar width={15} />
          </button>
        </div>

        {/* El contenido scrollea adentro: la página de atrás nunca se mueve. */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
