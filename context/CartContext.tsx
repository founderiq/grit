"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  ESTADO_INICIAL,
  cartReducer,
  estaVacio,
  guardarCarrito,
  leerCarrito,
  progresoEnvio,
  totalesDeEstado,
  type CartState,
  type ProgresoEnvio,
  type Totales,
} from "@/lib/cart";
import type { BundleId } from "@/lib/content";

export type CartApi = {
  estado: CartState;
  totales: Totales;
  progreso: ProgresoEnvio;
  vacio: boolean;
  /** Total de pulseras del carrito — lo que muestra el contador del header. */
  unidades: number;
  /**
   * `false` hasta que se leyó localStorage. Los contadores lo usan para no
   * pintar un 0 en el primer render y saltar al valor real al hidratar.
   */
  hidratado: boolean;

  agregarBundle: (id: BundleId) => void;
  quitarBundle: () => void;
  subirCantidad: () => void;
  bajarCantidad: () => void;
  agregarExtra: () => void;
  quitarExtra: () => void;
  abrir: (disparador?: HTMLElement | null) => void;
  cerrar: () => void;
  /** Elemento que abrió el drawer, para devolverle el foco al cerrar. */
  disparadorRef: React.MutableRefObject<HTMLElement | null>;
};

/**
 * El contexto vale `null` fuera del provider a propósito: el Header es
 * compartido con la landing, donde el carrito no se monta, y así puede
 * llamar a `useCart()` sin condicionar el hook ni romper.
 */
const CartContext = createContext<CartApi | null>(null);

export function useCart(): CartApi | null {
  return useContext(CartContext);
}

/** Igual que useCart pero para los internos del drawer, que sí lo requieren. */
export function useCartRequerido(): CartApi {
  const api = useContext(CartContext);
  if (!api) {
    throw new Error("useCartRequerido debe usarse dentro de <CartProvider>");
  }
  return api;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [estado, dispatch] = useReducer(cartReducer, ESTADO_INICIAL);
  const [hidratado, setHidratado] = useState(false);
  const disparadorRef = useRef<HTMLElement | null>(null);

  // Hidratación en efecto, nunca en el render inicial: el servidor y el
  // primer render del cliente producen el mismo HTML.
  useEffect(() => {
    const guardado = leerCarrito();
    if (guardado) dispatch({ type: "hidratar", estado: guardado });
    setHidratado(true);
  }, []);

  // Persistencia — recién después de hidratar, para no pisar lo guardado
  // con el estado inicial vacío.
  useEffect(() => {
    if (hidratado) guardarCarrito(estado);
  }, [estado, hidratado]);

  const abrir = useCallback((disparador?: HTMLElement | null) => {
    if (disparador) disparadorRef.current = disparador;
    dispatch({ type: "abrir" });
  }, []);

  const agregarBundle = useCallback((id: BundleId) => {
    dispatch({ type: "agregarBundle", id });
  }, []);

  const api = useMemo<CartApi>(() => {
    const totales = totalesDeEstado(estado);
    return {
      estado,
      totales,
      progreso: progresoEnvio(totales.unidades),
      vacio: estaVacio(estado),
      unidades: totales.unidades,
      hidratado,
      agregarBundle,
      quitarBundle: () => dispatch({ type: "quitarBundle" }),
      subirCantidad: () => dispatch({ type: "subirCantidad" }),
      bajarCantidad: () => dispatch({ type: "bajarCantidad" }),
      agregarExtra: () => dispatch({ type: "agregarExtra" }),
      quitarExtra: () => dispatch({ type: "quitarExtra" }),
      abrir,
      cerrar: () => dispatch({ type: "cerrar" }),
      disparadorRef,
    };
  }, [estado, hidratado, abrir, agregarBundle]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}
