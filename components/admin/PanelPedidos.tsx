import { obtenerPedidos, type PedidoFila } from "@/lib/admin-datos";
import { ETIQUETA_ORIGEN, fmtFechaCorta, fmtGs, fmtNumero } from "@/lib/admin-formato";
import type { FiltrosPedidos } from "@/lib/admin-filtros";
import type { Rango } from "@/lib/admin-rango";
import { ADMIN } from "@/lib/admin-content";
import Paginacion from "@/components/admin/Paginacion";
import {
  EstadoVacio,
  PanelError,
  PildoraArchivado,
  PildoraEntrega,
  PildoraPago,
} from "@/components/admin/Piezas";

/**
 * Listado de pedidos, solo lectura.
 *
 * Los filtros y la página ya vienen aplicados desde SQL: acá no se descarta
 * nada. Todavía no hay acciones — ni detalle, ni edición, ni archivado — así
 * que las filas no son clickeables: un cursor de mano prometería algo que no
 * existe.
 */
export default async function PanelPedidos({
  rango,
  filtros,
  params,
}: {
  rango: Rango;
  filtros: FiltrosPedidos;
  params: Record<string, string>;
}) {
  const res = await obtenerPedidos(rango, filtros);

  if (!res.ok) return <PanelError />;

  const { filas, total, pagina } = res.datos;

  if (filas.length === 0) {
    return (
      <EstadoVacio
        titulo={ADMIN.panel.vacio.pedidos}
        detalle={ADMIN.panel.vacio.pedidosDetalle}
      />
    );
  }

  return (
    <>
      {/* La tabla scrollea dentro de su caja: la página nunca se va de ancho. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-y border-borde-claro">
              {[
                "Pedido",
                "Cliente",
                "Cantidad",
                "Pulseras",
                "Total",
                "Pago",
                "Entrega",
                "Fecha",
              ].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="whitespace-nowrap px-4 py-[10px] font-mono text-[9px] font-normal uppercase tracking-[0.1em] text-gris-oscuro first:pl-5 last:pr-5 lg:first:pl-6 lg:last:pr-6"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filas.map((f) => (
              <Fila key={f.id} pedido={f} mostrarArchivado={filtros.archivo !== "activos"} />
            ))}
          </tbody>
        </table>
      </div>

      <Paginacion pagina={pagina} total={total} params={params} />
    </>
  );
}

function Fila({
  pedido,
  mostrarArchivado,
}: {
  pedido: PedidoFila;
  mostrarArchivado: boolean;
}) {
  const celda =
    "px-4 py-[13px] align-middle text-[13px] text-tinta first:pl-5 last:pr-5 lg:first:pl-6 lg:last:pr-6";

  return (
    <tr className="border-b border-borde-claro last:border-b-0">
      <td className={`${celda} whitespace-nowrap font-semibold`}>
        {pedido.orderNumber}
        {mostrarArchivado && pedido.archivado && (
          <span className="ml-2 align-middle">
            <PildoraArchivado />
          </span>
        )}
      </td>

      <td className={celda}>
        <span className="block font-semibold leading-[1.3]">{pedido.cliente}</span>
        <span className="mt-[2px] block text-[11.5px] leading-[1.3] text-gris-oscuro">
          {pedido.whatsapp}
        </span>
      </td>

      <td className={`${celda} whitespace-nowrap tabular-nums`}>
        {fmtNumero(pedido.pulseras)}
      </td>

      {/* Los nombres salen de order_items: no se asume ningún modelo. */}
      <td className={celda}>
        {pedido.productos.length > 0 ? (
          <span className="block max-w-[260px] leading-[1.35]" title={pedido.productos.join(" · ")}>
            {pedido.productos.join(" · ")}
          </span>
        ) : (
          <span className="text-gris-oscuro">—</span>
        )}
      </td>

      <td className={`${celda} whitespace-nowrap tabular-nums font-semibold`}>
        {fmtGs(pedido.total)}
      </td>

      <td className={celda}>
        <PildoraPago estado={pedido.paymentStatus} />
      </td>

      <td className={celda}>
        <PildoraEntrega estado={pedido.orderStatus} />
      </td>

      <td className={`${celda} whitespace-nowrap`}>
        <span className="block leading-[1.3]">{fmtFechaCorta(pedido.saleDate)}</span>
        <span className="mt-[2px] block font-mono text-[9px] uppercase tracking-[0.1em] text-gris-oscuro">
          {ETIQUETA_ORIGEN[pedido.source] ?? pedido.source}
        </span>
      </td>
    </tr>
  );
}
