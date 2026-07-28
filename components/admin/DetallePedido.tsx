"use client";

import {
  ETIQUETA_ORIGEN,
  enlaceWhatsapp,
  fmtFechaCorta,
  fmtFechaHora,
  fmtGs,
  fmtNumero,
  fmtPorcentaje,
  normalizarEntrega,
  normalizarPago,
} from "@/lib/admin-formato";
import { resumenPedido } from "@/lib/admin-mutaciones";
import { ADMIN } from "@/lib/admin-content";
import type { AjusteDetalle, PedidoDetalle } from "@/lib/admin-tipos";
import BotonArchivar from "@/components/admin/BotonArchivar";
import FormularioAjuste from "@/components/admin/FormularioAjuste";
import FormularioGestion from "@/components/admin/FormularioGestion";
import { PildoraEntrega, PildoraPago, PILDORA } from "@/components/admin/Piezas";

/**
 * Contenido del drawer de detalle.
 *
 * Es un componente de cliente y recibe el pedido ya cargado: los datos llegan
 * por `GET /api/admin/pedidos/[id]`, que autoriza en el servidor y lee con la
 * service role. El navegador nunca consulta la base; solo pinta lo que ese
 * endpoint le devolvió.
 *
 * Los formularios escriben mediante Server Actions y, al terminar, piden un
 * refresco del detalle: por eso `onCambio` es obligatorio.
 */
export default function DetallePedido({
  pedido: p,
  onCambio,
}: {
  pedido: PedidoDetalle;
  onCambio: () => void;
}) {
  const archivado = p.archivadoEn !== null;

  return (
    <div className="flex flex-col gap-4">
      {archivado && (
        <div className="rounded-card border-hairline border-borde-claro bg-superficie-input px-4 py-[14px]">
          <p className="m-0 font-archivo text-[14px] font-bold text-tinta">
            {ADMIN.detalle.archivo.archivado}
          </p>
          <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-gris-oscuro">
            {ADMIN.detalle.archivo.archivadoDetalle}
          </p>
        </div>
      )}

      <Bloque titulo={ADMIN.detalle.cliente.titulo}>
        <Dato etiqueta={ADMIN.detalle.cliente.nombre}>{p.cliente.nombre}</Dato>
        <Dato etiqueta={ADMIN.detalle.cliente.whatsapp}>
          <Whatsapp numero={p.cliente.whatsapp} />
        </Dato>
        <Dato etiqueta={ADMIN.detalle.cliente.ciudad}>{p.cliente.ciudad}</Dato>
        <Dato etiqueta={ADMIN.detalle.cliente.direccion}>{p.cliente.direccion}</Dato>
        <Dato etiqueta={ADMIN.detalle.cliente.ubicacion}>
          <Ubicacion url={p.cliente.ubicacion} />
        </Dato>
      </Bloque>

      <Bloque titulo={ADMIN.detalle.pedido.titulo}>
        <Dato etiqueta={ADMIN.detalle.pedido.origen}>
          {ETIQUETA_ORIGEN[p.source] ?? p.source}
        </Dato>
        <Dato etiqueta={ADMIN.detalle.pedido.fecha}>{fmtFechaCorta(p.saleDate)}</Dato>
        <Dato etiqueta={ADMIN.detalle.pedido.metodo}>
          {METODO[p.paymentMethod] ?? p.paymentMethod}
        </Dato>
        <Dato etiqueta={ADMIN.detalle.pedido.zona}>{ZONA[p.shippingZone] ?? p.shippingZone}</Dato>
        <Dato etiqueta={ADMIN.detalle.pedido.envioGratis}>
          {p.clienteEnvioGratis ? "Sí" : "No"}
        </Dato>
        <Dato etiqueta={ADMIN.detalle.pedido.vip}>{p.vip ? "Sí" : "No"}</Dato>
        <Dato etiqueta={ADMIN.detalle.pedido.pago}>
          <PildoraPago estado={p.paymentStatus} />
        </Dato>
        <Dato etiqueta={ADMIN.detalle.pedido.entrega}>
          <PildoraEntrega estado={p.orderStatus} />
        </Dato>

        {/* Los productos salen de order_items: no se asume ningún modelo. */}
        <div className="mt-1 border-t border-borde-claro pt-3">
          <p className="m-0 font-mono text-[9px] uppercase tracking-[0.1em] text-gris-oscuro">
            {ADMIN.detalle.pedido.productos}
          </p>
          <ul className="m-0 mt-2 list-none space-y-[10px] p-0">
            {p.items.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3">
                <span className="text-[13px] leading-[1.35] text-tinta">
                  {i.productName}
                  {i.promocional && (
                    <span
                      className={`${PILDORA} ml-2 border-estado-violeta-borde bg-estado-violeta-fondo align-middle text-estado-violeta-texto`}
                    >
                      {ADMIN.detalle.pedido.extra}
                    </span>
                  )}
                  <span className="mt-[2px] block text-[11.5px] text-gris-oscuro">
                    {fmtNumero(i.quantity)} × {fmtGs(i.unitPrice)}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-tinta">
                  {fmtGs(i.lineTotal)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Bloque>

      <ResumenFinanciero p={p} />

      <Bloque titulo={ADMIN.detalle.gestion.titulo}>
        <FormularioGestion
          // La `key` reinicia los campos cuando cambia el pedido abierto: el
          // drawer no se desmonta al pasar de un pedido a otro.
          key={`gestion-${p.id}`}
          pedidoId={p.id}
          pagoInicial={normalizarPago(p.paymentStatus)}
          entregaInicial={normalizarEntrega(p.orderStatus)}
          notasIniciales={p.notasInternas ?? ""}
          onGuardado={onCambio}
        />
      </Bloque>

      <Bloque titulo={ADMIN.detalle.ajustes.titulo}>
        <FormularioAjuste key={`ajuste-${p.id}`} pedidoId={p.id} onGuardado={onCambio} />
        <HistorialAjustes ajustes={p.ajustes} />
      </Bloque>

      <Bloque titulo={ADMIN.detalle.archivo.titulo}>
        <BotonArchivar
          key={`archivo-${p.id}`}
          pedidoId={p.id}
          archivado={archivado}
          onGuardado={onCambio}
        />
      </Bloque>
    </div>
  );
}

/* ------------------------------------------------------------
   Piezas del detalle
   ------------------------------------------------------------ */

const METODO: Record<string, string> = {
  transferencia: "Transferencia bancaria",
  tarjeta: "Tarjeta",
  efectivo: "Efectivo",
};

const ZONA: Record<string, string> = {
  asuncion: "Asunción / Gran Asunción",
  interior: "Interior / encomienda",
};

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border-hairline border-borde-claro bg-superficie-input px-4 py-4">
      <h3 className="m-0 mb-3 font-mono text-[9px] uppercase tracking-[0.12em] text-gris-oscuro">
        {titulo}
      </h3>
      <div className="flex flex-col gap-[10px]">{children}</div>
    </section>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-[12.5px] text-gris-oscuro">{etiqueta}</span>
      <span className="text-right text-[13px] leading-[1.35] text-tinta">{children}</span>
    </div>
  );
}

function Whatsapp({ numero }: { numero: string }) {
  const enlace = enlaceWhatsapp(numero);
  if (!enlace) return <span className="text-gris-oscuro">{numero || "—"}</span>;

  return (
    <a
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
      className="text-tierra-oscura underline underline-offset-2 transition-colors duration-control ease-grit hover:text-tinta"
    >
      {numero}
    </a>
  );
}

/**
 * La ubicación es una URL que cargó el propio cliente en el checkout. Se abre
 * en otra pestaña con `noopener` y solo si es http(s): no se enlaza un esquema
 * arbitrario venido de un formulario público.
 */
function Ubicacion({ url }: { url: string | null }) {
  const limpia = (url ?? "").trim();
  const valida = /^https?:\/\//i.test(limpia);

  if (!valida) {
    return <span className="text-gris-oscuro">{ADMIN.detalle.cliente.sinUbicacion}</span>;
  }

  return (
    <a
      href={limpia}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-tierra-oscura underline underline-offset-2 transition-colors duration-control ease-grit hover:text-tinta"
    >
      {ADMIN.detalle.cliente.abrirUbicacion}
    </a>
  );
}

function ResumenFinanciero({ p }: { p: PedidoDetalle }) {
  const r = resumenPedido({
    total: p.total,
    extra_revenue_total: p.extraRevenueTotal,
    product_cost_total: p.productCostTotal,
    logistics_cost: p.logisticsCost,
    extra_cost_total: p.extraCostTotal,
  });

  const c = ADMIN.detalle.finanzas;

  return (
    <Bloque titulo={c.titulo}>
      <Subtitulo>{c.ingresos}</Subtitulo>
      <Dato etiqueta={c.subtotal}>{fmtGs(p.subtotal)}</Dato>
      {p.descuento > 0 && <Dato etiqueta={c.descuento}>− {fmtGs(p.descuento)}</Dato>}
      <Dato etiqueta={c.envio}>{fmtGs(p.shippingCost)}</Dato>
      {p.vip && <Dato etiqueta={c.vip}>{fmtGs(p.vipCosto)}</Dato>}
      <Dato etiqueta={c.extras}>{fmtGs(p.extraRevenueTotal)}</Dato>
      <Total etiqueta={c.total}>{fmtGs(r.ingresoActualizado)}</Total>

      <Subtitulo>{c.costos}</Subtitulo>
      <Dato etiqueta={c.producto}>{fmtGs(p.productCostTotal)}</Dato>
      <Dato etiqueta={c.logistica}>{fmtGs(p.logisticsCost)}</Dato>
      <Dato etiqueta={c.costosExtra}>{fmtGs(p.extraCostTotal)}</Dato>
      <Total etiqueta={c.costoTotal}>{fmtGs(r.costoActualizado)}</Total>

      <Subtitulo>{c.resultado}</Subtitulo>
      <Total etiqueta={c.ganancia}>{fmtGs(r.ganancia)}</Total>
      <Total etiqueta={c.margen}>{fmtPorcentaje(r.margen)}</Total>

      <p className="m-0 mt-1 text-[11.5px] leading-[1.5] text-gris-oscuro">{c.nota}</p>
    </Bloque>
  );
}

function Subtitulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 mt-2 border-t border-borde-claro pt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-gris-oscuro first:mt-0 first:border-0 first:pt-0">
      {children}
    </p>
  );
}

function Total({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-[12.5px] font-semibold text-tinta">{etiqueta}</span>
      <span className="text-right text-[13.5px] font-bold tabular-nums text-tinta">{children}</span>
    </div>
  );
}

/**
 * Historial de extras. No se puede editar ni borrar: un ajuste es un hecho que
 * pasó, y la forma de corregirlo es cargar el ajuste contrario, no reescribir
 * el pasado.
 */
function HistorialAjustes({ ajustes }: { ajustes: AjusteDetalle[] }) {
  return (
    <div className="mt-2 border-t border-borde-claro pt-3">
      <p className="m-0 font-mono text-[9px] uppercase tracking-[0.1em] text-gris-oscuro">
        {ADMIN.detalle.ajustes.historial}
      </p>

      {ajustes.length === 0 ? (
        <p className="m-0 mt-2 text-[12.5px] text-gris-oscuro">
          {ADMIN.detalle.ajustes.sinHistorial}
        </p>
      ) : (
        <ul className="m-0 mt-3 list-none space-y-3 p-0">
          {ajustes.map((a) => (
            <li
              key={a.id}
              className="rounded-strip border-hairline border-borde-claro bg-hueso px-3 py-[10px]"
            >
              <p className="m-0 text-[12.5px] leading-[1.4] text-tinta">{a.descripcion ?? "—"}</p>

              <p className="m-0 mt-[6px] text-[11.5px] tabular-nums text-gris-oscuro">
                {ADMIN.detalle.ajustes.venta} {fmtGs(a.revenue)} · {ADMIN.detalle.ajustes.costo}{" "}
                {fmtGs(a.cost)}
              </p>

              <p className="m-0 mt-[3px] text-[11px] text-gris-oscuro">
                {fmtFechaHora(a.createdAt)}
                {a.responsable ? ` · ${a.responsable}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
