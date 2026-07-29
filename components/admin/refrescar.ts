"use client";

import type { useRouter } from "next/navigation";

/**
 * Pide a Next que vuelva a renderizar la página, FUERA de la transición que lo
 * llamó.
 *
 * POR QUÉ IMPORTA
 *   Los formularios del panel guardan dentro de un `useTransition` y deshabilitan
 *   sus controles mientras dura. Si `router.refresh()` se llama ahí adentro, la
 *   transición no termina hasta que Next haya vuelto del servidor con la página
 *   entera —y si esa navegación se demora o se queda a mitad de camino, el
 *   formulario queda bloqueado sin forma de reintentar.
 *
 *   Lo que le importa a quien está usando el panel es que el guardado terminó,
 *   no que el listado de atrás ya se haya repintado. Sacando el refresco de la
 *   transición, los controles se rehabilitan en cuanto la escritura respondió y
 *   el dashboard se actualiza cuando puede.
 */
export function refrescarPanel(router: ReturnType<typeof useRouter>) {
  // `setTimeout` saca la llamada del alcance de la transición actual.
  setTimeout(() => router.refresh(), 0);
}
