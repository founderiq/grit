"use client";

import { useEffect } from "react";
import { CART_STORAGE_KEY } from "@/lib/cart";

/**
 * Limpia el carrito una vez que /gracias cargó con un pedido válido.
 *
 * ESTRATEGIA (ver también supabase/README.md)
 *   El carrito NO se borra al enviar el formulario: si el endpoint falla, el
 *   cliente tiene que poder reintentar sin haber perdido nada. En su lugar:
 *
 *   1. Cuando el endpoint responde OK, el checkout escribe una marca en
 *      localStorage con el token del pedido creado.
 *   2. Este componente corre solo en /gracias, y solo cuando el servidor ya
 *      encontró el pedido. Si la marca corresponde a este token, borra el
 *      carrito y quita la marca.
 *   3. Si el endpoint falló, nunca se escribió la marca y el carrito queda
 *      intacto.
 *
 *   Un refresh de /gracias no puede crear otro pedido: la página solo lee. Y
 *   como la marca se borra en la primera limpieza, un refresh posterior no
 *   vuelve a tocar nada.
 */
export const MARCA_LIMPIEZA = "grit:cart:limpiar";

export default function LimpiarCarrito({ token }: { token: string }) {
  useEffect(() => {
    try {
      const marca = window.localStorage.getItem(MARCA_LIMPIEZA);
      if (marca !== token) return;

      window.localStorage.removeItem(CART_STORAGE_KEY);
      window.localStorage.removeItem(MARCA_LIMPIEZA);
    } catch {
      // localStorage bloqueado: no hay nada que limpiar ni que reportar.
    }
  }, [token]);

  return null;
}
