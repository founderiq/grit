"use client";

import { ADMIN } from "@/lib/admin-content";
import { useNavegar } from "@/components/admin/useNavegar";

/**
 * Fila de la tabla que abre el detalle.
 *
 * Las celdas vienen renderizadas desde el servidor: acá solo se agrega el
 * comportamiento. Abrir el detalle es poner `?pedido=<uuid>` en la URL, sin
 * navegar a otra página.
 *
 * ACCESIBILIDAD — el elemento accionable de verdad es el botón del número de
 * pedido (`<BotonDetalle>`), que es lo que alcanza el teclado y lo que anuncia
 * un lector de pantalla. El clic en cualquier parte de la fila es un atajo de
 * mouse: cómodo, pero no la única forma de llegar. Un `<tr>` con role="button"
 * habría roto la semántica de la tabla.
 */
export default function FilaPedido({
  pedidoId,
  params,
  seleccionada,
  children,
}: {
  pedidoId: string;
  params: Record<string, string>;
  seleccionada: boolean;
  children: React.ReactNode;
}) {
  const { ir } = useNavegar(params);

  return (
    <tr
      onClick={(e) => {
        // Si el clic ya lo maneja un control (el botón del número, el enlace de
        // WhatsApp), se deja pasar en lugar de navegar dos veces.
        if ((e.target as HTMLElement).closest("a, button")) return;
        ir({ pedido: pedidoId });
      }}
      className={`cursor-pointer border-b border-borde-claro transition-colors duration-control ease-grit last:border-b-0 hover:bg-hueso ${
        seleccionada ? "bg-hueso" : ""
      }`}
    >
      {children}
    </tr>
  );
}

/** El control accionable de la fila. Lleva el nombre accesible completo. */
export function BotonDetalle({
  pedidoId,
  numero,
  params,
}: {
  pedidoId: string;
  numero: string;
  params: Record<string, string>;
}) {
  const { ir } = useNavegar(params);

  return (
    <button
      type="button"
      onClick={() => ir({ pedido: pedidoId })}
      aria-label={ADMIN.detalle.verDetalle(numero)}
      className="rounded-strip text-left font-semibold text-tinta underline-offset-2 transition-colors duration-control ease-grit hover:underline"
    >
      {numero}
    </button>
  );
}
