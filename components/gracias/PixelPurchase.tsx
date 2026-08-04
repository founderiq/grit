"use client";

import { useEffect, useRef } from "react";
import { trackPurchase, type ContenidoPixel } from "@/lib/meta-pixel";

type PixelPurchaseProps = {
  /** Número de pedido. Es la clave única contra duplicados. */
  orderId: string;
  /** Total del pedido tal como quedó guardado, con envío y VIP. */
  valor: number;
  contents: ContenidoPixel[];
  unidades: number;
  contentName?: string;
};

/**
 * Purchase del Meta Pixel.
 *
 * Se monta únicamente en /gracias y sólo cuando el servidor ya encontró el
 * pedido en la base: el evento no puede dispararse por apretar "Confirmar",
 * ni por un doble clic, ni por un pedido que falló, porque este componente
 * ni siquiera llega a renderizarse en esos casos.
 *
 * ANTIDUPLICACIÓN, en tres capas
 *   1. `enviado` (ref) — cubre los re-renders y el doble efecto de StrictMode
 *      dentro de esta misma carga de página.
 *   2. `trackPurchase` recuerda el número de pedido en localStorage — cubre
 *      la recarga de /gracias y volver a abrir el enlace de confirmación más
 *      tarde, incluso días después.
 *   3. El evento viaja con `eventID = purchase-<order_number>` — permite que
 *      Meta deduplique del lado del servidor.
 *
 * No renderiza nada y no manda ningún dato personal: sólo SKUs, cantidades,
 * el importe, la moneda y el número de pedido.
 */
export default function PixelPurchase({
  orderId,
  valor,
  contents,
  unidades,
  contentName,
}: PixelPurchaseProps) {
  const enviado = useRef(false);

  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;

    trackPurchase({ orderId, valor, contents, unidades, contentName });
  }, [orderId, valor, contents, unidades, contentName]);

  return null;
}
