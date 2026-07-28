"use client";

import { ADMIN } from "@/lib/admin-content";
import { useDetalle } from "@/components/admin/DrawerPedidos";

/**
 * Fila de la tabla que abre el detalle.
 *
 * Las celdas vienen renderizadas desde el servidor: acá solo se agrega el
 * comportamiento. Abrir el detalle es estado del drawer, no una navegación:
 * la capa aparece en el mismo frame del clic y la URL se actualiza después,
 * con `history.pushState`. Ver `components/admin/DrawerPedidos.tsx`.
 *
 * PRECARGA — apuntar con el mouse o llegar con el teclado dispara la consulta
 * del detalle antes del clic. Cuando el clic llega, el contenido casi siempre
 * ya está en memoria y el drawer abre con los datos puestos.
 *
 * ACCESIBILIDAD — el elemento accionable de verdad es el botón del número de
 * pedido (`<BotonDetalle>`), que es lo que alcanza el teclado y lo que anuncia
 * un lector de pantalla. El clic en cualquier parte de la fila es un atajo de
 * mouse: cómodo, pero no la única forma de llegar. Un `<tr>` con role="button"
 * habría roto la semántica de la tabla.
 */
export default function FilaPedido({
  pedidoId,
  numero,
  children,
}: {
  pedidoId: string;
  numero: string;
  children: React.ReactNode;
}) {
  const { abiertoId, abrir, precargar } = useDetalle();
  const seleccionada = abiertoId === pedidoId;

  return (
    <tr
      onClick={(e) => {
        // Si el clic ya lo maneja un control (el botón del número, el enlace de
        // WhatsApp), se deja pasar en lugar de abrir dos veces.
        if ((e.target as HTMLElement).closest("a, button")) return;
        abrir(pedidoId, numero);
      }}
      onMouseEnter={() => precargar(pedidoId)}
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
}: {
  pedidoId: string;
  numero: string;
}) {
  const { abrir, precargar } = useDetalle();

  return (
    <button
      type="button"
      onClick={() => abrir(pedidoId, numero)}
      onFocus={() => precargar(pedidoId)}
      aria-label={ADMIN.detalle.verDetalle(numero)}
      className="rounded-strip text-left font-semibold text-tinta underline-offset-2 transition-colors duration-control ease-grit hover:underline"
    >
      {numero}
    </button>
  );
}
