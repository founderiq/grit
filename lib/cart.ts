/**
 * Lógica de precios y estado del carrito de Grit — funciones puras, sin React.
 *
 * Producto, carrito y (en la fase 4) checkout consumen estas mismas funciones,
 * para que no puedan divergir en un precio.
 */
import {
  CARRITO,
  ENVIO_GRATIS_DESDE,
  EXTRA,
  PRODUCTO_BUNDLES,
  type BundleId,
  type ProductoBundle,
} from "@/lib/content";

/** Rango permitido para la cantidad del pack de 1. */
export const QTY_MIN = 1;
export const QTY_MAX = 9;

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

/* ============================================================
   Estado del carrito
   ============================================================ */

export type CartState = {
  /**
   * Bundle en el carrito. `null` = carrito sin pack, que es el estado al que
   * se llega con "Quitar" y el que muestra el estado vacío del drawer.
   */
  packId: BundleId | null;
  /** 1–9. Solo es editable cuando packId === "1". */
  packQty: number;
  /** Pulsera promocional de 35% OFF. Booleano, nunca un contador. */
  hasExtra: boolean;
  /** Visibilidad del drawer. No se persiste. */
  isOpen: boolean;
};

export const ESTADO_INICIAL: CartState = {
  packId: null,
  packQty: 1,
  hasExtra: false,
  isOpen: false,
};

/** El carrito está vacío cuando no hay ni pack ni pulsera extra. */
export const estaVacio = (s: CartState) => s.packId === null && !s.hasExtra;

/** Totales del carrito a partir del estado. El envío nunca entra acá. */
export function totalesDeEstado(s: CartState): Totales {
  if (s.packId === null) {
    // Solo puede quedar la pulsera extra suelta.
    const subtotal = s.hasExtra ? EXTRA.precio : 0;
    const compare = s.hasExtra ? EXTRA.compare : 0;
    return {
      unidades: s.hasExtra ? 1 : 0,
      subtotal,
      compare,
      ahorro: Math.max(0, compare - subtotal),
      envioGratis: false,
    };
  }
  return calcularTotales(getBundle(s.packId), s.packQty, s.hasExtra);
}

export type ProgresoEnvio = {
  unidades: number;
  /** 0–100, para el ancho de la barra. */
  pct: number;
  alcanzado: boolean;
  mensaje: string;
  contador: string;
};

/**
 * Progreso hacia el envío gratis. Es solo un indicador: el carrito nunca
 * cotiza el envío (`06-state-and-pricing` §3).
 */
export function progresoEnvio(unidades: number): ProgresoEnvio {
  const faltan = ENVIO_GRATIS_DESDE - unidades;
  const alcanzado = faltan <= 0;

  return {
    unidades,
    pct: Math.min(100, Math.round((unidades / ENVIO_GRATIS_DESDE) * 100)),
    alcanzado,
    mensaje: alcanzado
      ? CARRITO.progreso.completo
      : faltan === 1
        ? CARRITO.progreso.falta1
        : CARRITO.progreso.faltaN(faltan),
    contador: CARRITO.progreso.contador(unidades),
  };
}

/* ------------------------------------------------------------
   Reducer — las invariantes viven acá, no en la UI
   ------------------------------------------------------------ */

export type CartAction =
  | { type: "hidratar"; estado: Partial<CartState> }
  | { type: "agregarBundle"; id: BundleId }
  | { type: "quitarBundle" }
  | { type: "subirCantidad" }
  | { type: "bajarCantidad" }
  | { type: "agregarExtra" }
  | { type: "quitarExtra" }
  | { type: "abrir" }
  | { type: "cerrar" };

const clampQty = (n: number) => Math.min(QTY_MAX, Math.max(QTY_MIN, n));

/**
 * Invariante central: `packQty` vuelve a 1 en cuanto el pack no es el de 1.
 * Los packs fijos no tienen stepper y nunca acumulan cantidad, así que el
 * pack de 1 tampoco puede "convertirse" en un pack de 2 o de 3.
 */
export function cartReducer(estado: CartState, accion: CartAction): CartState {
  switch (accion.type) {
    case "hidratar": {
      const packId = accion.estado.packId ?? null;
      const fijo = packId !== null && packId !== "1";
      return {
        ...estado,
        packId,
        packQty: fijo ? 1 : clampQty(accion.estado.packQty ?? 1),
        hasExtra: accion.estado.hasExtra ?? false,
      };
    }

    case "agregarBundle":
      // Agregar siempre reemplaza el pack y reinicia la cantidad, y abre el
      // drawer: es el contrato de "Agregar al carrito".
      return { ...estado, packId: accion.id, packQty: 1, isOpen: true };

    case "quitarBundle":
      return { ...estado, packId: null, packQty: 1 };

    case "subirCantidad":
      if (estado.packId !== "1") return estado;
      return { ...estado, packQty: clampQty(estado.packQty + 1) };

    case "bajarCantidad":
      if (estado.packId !== "1") return estado;
      return { ...estado, packQty: clampQty(estado.packQty - 1) };

    case "agregarExtra":
      // Idempotente por diseño: no existe una segunda pulsera extra.
      return estado.hasExtra ? estado : { ...estado, hasExtra: true };

    case "quitarExtra":
      return { ...estado, hasExtra: false };

    case "abrir":
      return { ...estado, isOpen: true };

    case "cerrar":
      return { ...estado, isOpen: false };

    default:
      return estado;
  }
}

/* ------------------------------------------------------------
   Persistencia
   ------------------------------------------------------------ */

export const CART_STORAGE_KEY = "grit:cart:v1";

type CartPersistido = Pick<CartState, "packId" | "packQty" | "hasExtra">;

/** Lee el carrito guardado. Devuelve null si no hay nada válido. */
export function leerCarrito(): CartPersistido | null {
  if (typeof window === "undefined") return null;
  try {
    const crudo = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!crudo) return null;
    const d = JSON.parse(crudo) as Partial<CartPersistido>;
    const packId =
      d.packId === "1" || d.packId === "2" || d.packId === "3" ? d.packId : null;
    return {
      packId,
      packQty: clampQty(Number(d.packQty) || 1),
      hasExtra: d.hasExtra === true,
    };
  } catch {
    // localStorage bloqueado o JSON corrupto: se arranca con el carrito vacío.
    return null;
  }
}

/** Guarda el carrito. Nunca escribe otras claves. */
export function guardarCarrito(s: CartState): void {
  if (typeof window === "undefined") return;
  try {
    const datos: CartPersistido = {
      packId: s.packId,
      packQty: s.packQty,
      hasExtra: s.hasExtra,
    };
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(datos));
  } catch {
    // Cuota llena o modo privado: el carrito sigue funcionando en memoria.
  }
}
