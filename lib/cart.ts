/**
 * Lógica de precios de Grit — funciones puras, sin React.
 *
 * Fase 2 usa solo lo que necesita la página de producto (totales de un bundle
 * sin cantidad). Fase 3 extiende este módulo con el estado del carrito
 * (cantidad del pack de 1, pulsera extra, progreso de envío gratis) usando
 * estas mismas funciones, para que producto, carrito y checkout no puedan
 * divergir en un precio.
 */
import {
  ENVIO_GRATIS_DESDE,
  EXTRA,
  PRODUCTO_BUNDLES,
  type BundleId,
  type ProductoBundle,
} from "@/lib/content";

export type Totales = {
  /** Pulseras del pedido — incluye la extra promocional si está. */
  unidades: number;
  subtotal: number;
  /** Precio de comparación. Cae a `precio × cantidad` si el bundle no tiene. */
  compare: number;
  /** compare − subtotal, nunca negativo. Se muestra solo si es > 0. */
  ahorro: number;
  /** Solo alimenta la barra de progreso del carrito. */
  envioGratis: boolean;
};

/** Busca un bundle por id. Cae al pack de 2 si el id no existe. */
export function getBundle(id: BundleId | string | undefined): ProductoBundle {
  return (
    PRODUCTO_BUNDLES.find((b) => b.id === id) ??
    PRODUCTO_BUNDLES.find((b) => b.id === "2")!
  );
}

/**
 * Totales de un pedido.
 *
 * Consecuencia deliberada del catálogo: el pack de 1 **nunca** gana descuento
 * por cantidad. Su `compare` es 0, así que cae a `precio × cantidad`, el
 * ahorro da 0 y no se renderiza la píldora de ahorro. 2 unidades del pack de 1
 * cuestan 230.000, no 199.000.
 *
 * @param cantidad Solo tiene efecto en el pack de 1; los packs fijos la ignoran.
 * @param conExtra Pulsera promocional de 35% OFF (máximo una).
 */
export function calcularTotales(
  bundle: ProductoBundle,
  cantidad = 1,
  conExtra = false,
): Totales {
  const qty = bundle.fijo ? 1 : Math.max(1, cantidad);

  const unidades = bundle.unidades * qty + (conExtra ? 1 : 0);
  const subtotal = bundle.precio * qty + (conExtra ? EXTRA.precio : 0);
  const compare =
    (bundle.compare || bundle.precio * qty) + (conExtra ? EXTRA.compare : 0);

  return {
    unidades,
    subtotal,
    compare,
    ahorro: Math.max(0, compare - subtotal),
    envioGratis: unidades >= ENVIO_GRATIS_DESDE,
  };
}
